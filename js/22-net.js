'use strict';

// ============ NET MATCH (1v1 連線對戰・里程碑一：移動同步) ============
// 架構：各管各的角色。自己的英雄在本機模擬（零延遲），
// 對方的英雄由網路快照驅動，用 entity interpolation（延後 120ms 內插）畫得滑順。
// 第一階段不同步傷害——先讓兩個人在同一張圖上互相看到對方跑來跑去。

function updateRemote(e, dt) {
  NetMatch._interp(e);
  advanceAnim(e, dt);
  if (e.hitFlash > 0) e.hitFlash -= dt;
}

const NetMatch = (() => {
  const SEND_MS = 66;       // 每秒約 15 次
  const DELAY_MS = 120;     // 內插緩衝：畫「120ms 前的對方」
  let ch = null, active = false, started = false;
  let remoteId = null, remoteHero = null, myHero = null;
  let buf = [];             // 位置快照 {t, x, y, f, d}
  let remoteHp = null;      // 對方回報的血量（被打的人自己算，我只負責顯示）
  let matchOver = false;
  let sendTimer = null, helloTimer = null;

  // 除錯：把配對進度顯示在面板最下面那行，並印到 console
  function note(msg) {
    console.log('[NET]', msg);
    const el = document.querySelector('#online-panel .om');
    if (el) el.textContent = '[配對] ' + msg;
  }

  function start(room, rid) {
    note('start 被呼叫 room=' + room.slice(0, 12) + '…');
    if (active) { note('已在對戰中，略過'); return; }
    if (!Online.client) { note('錯誤：Supabase client 不存在'); return; }
    active = true; started = false; remoteId = rid; remoteHero = null; buf = []; remoteHp = null; matchOver = false;
    myHero = (typeof selectedHero !== 'undefined' && selectedHero) || 'scallion';

    ch = Online.client.channel('game:' + room, {
      config: { broadcast: { self: false }, presence: { key: Online.id } }
    });
    ch.on('broadcast', { event: 'hello' }, ({ payload }) => {
        if (!remoteHero) { note('收到對方 hello：' + payload.hero); remoteHero = payload.hero; maybeBegin(); }
      })
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        buf.push({ t: performance.now(), x: payload.x, y: payload.y, f: payload.f, d: payload.d });
        if (buf.length > 40) buf.shift();
        if (payload.h != null) remoteHp = payload.h;
      })
      .on('broadcast', { event: 'atk' }, ({ payload }) => replayAttack(payload.a))
      .on('broadcast', { event: 'dead' }, () => winByRemoteDeath())
      .on('broadcast', { event: 'bye' }, () => end(matchOver ? null : '對方離開了'))
      .on('presence', { event: 'leave' }, ({ key }) => { if (key === remoteId && started) end('對方斷線了'); })
      .subscribe(async (s) => {
        note('房間狀態：' + s);
        if (s === 'SUBSCRIBED') {
          await ch.track({});
          sayHello();
          // 對方可能比我晚進房，每秒重送直到開打
          helloTimer = setInterval(() => { if (started) clearInterval(helloTimer); else sayHello(); }, 1000);
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          note('房間連線失敗（' + s + '）');
          end('連線房間失敗');
        }
      });
  }

  function sayHello() {
    try { ch.send({ type: 'broadcast', event: 'hello', payload: { hero: myHero } }); } catch (e) {}
  }

  function maybeBegin() {
    if (started || !remoteHero) return;
    started = true;
    beginMatch();
  }

  function beginMatch() {
    note('雙方到齊，開打！');
    window.__previewedOpps = [];                 // 不生 AI 對手
    startMatch(myHero, 'net');
    delete window.__previewedOpps;

    spawnEnemyHero(remoteHero, W / 2, 120, { hpMul: 1, dmgMul: 1 });
    const e = enemies[enemies.length - 1];
    e.remote = true;
    e.speed = HEROES[remoteHero].speed;          // 還原玩家速度（AI 版有打折）

    showMatchBanner('連線對戰 · ONLINE',
      HEROES[myHero].cn + ' vs ' + HEROES[remoteHero].cn);
    if (window.Online) Online.setActivity('playing', myHero);

    sendTimer = setInterval(tick, SEND_MS);
  }

  function tick() {
    if (!active) return;
    if (state !== 'playing') { end(null); return; }   // 有人按了退出
    const p = players[0];
    if (!p) return;
    try {
      ch.send({ type: 'broadcast', event: 'pos',
        payload: { x: Math.round(p.x), y: Math.round(p.y), f: p.facing, d: p.faceDir, h: Math.round(p.hp) } });
    } catch (e) {}
  }

  // entity interpolation：找出「目標時刻」前後兩筆快照做線性內插
  function _interp(e) {
    if (!buf.length) return;
    const target = performance.now() - DELAY_MS;
    let a = buf[0], b = null;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i].t <= target) a = buf[i];
      else { b = buf[i]; break; }
    }
    if (b && b.t > a.t) {
      const k = (target - a.t) / (b.t - a.t);
      e.x = a.x + (b.x - a.x) * k;
      e.y = a.y + (b.y - a.y) * k;
    } else {
      e.x = a.x; e.y = a.y;   // 沒有更新就停在最後位置
    }
    const s = b || a;
    e.facing = s.f; e.faceDir = s.d;
    if (remoteHp != null) e.hp = Math.min(e.maxHp, remoteHp);
    if (remoteHp != null && remoteHp <= 0) winByRemoteDeath();
  }

  // 對方死了：標記屍體、進勝利結算
  function winByRemoteDeath() {
    if (matchOver || !started) return;
    matchOver = true;
    const e = enemies.find(x => x.remote);
    if (e) { e.hp = 0; e.dead = true; totalKills++; spawnRing(e.x, e.y, '#ffd166', 60); }
    if (state === 'playing') { state = 'won'; setTimeout(() => endGame(true), 800); }
  }

  // 我的攻擊 → 廣播角度（fireBasicAttack 裡呼叫）
  function sendAttack(ang) {
    if (!active || !started) return;
    try { ch.send({ type: 'broadcast', event: 'atk', payload: { a: ang } }); } catch (e) {}
  }

  // 我死了 → 立刻通知（damagePlayer 裡呼叫）
  function sendDead() {
    if (!active || !started || matchOver) return;
    matchOver = true;
    try { ch.send({ type: 'broadcast', event: 'dead', payload: {} }); } catch (e) {}
  }

  // 在我的畫面重播「對方的攻擊」：從 remote 實體的位置、朝他傳來的角度打出去。
  // 傷害採「被打的人自己判定」——只有這裡會扣我的血，我的攻擊在我畫面上不扣對方的血。
  function replayAttack(ang) {
    if (state !== 'playing' || matchOver) return;
    const e = enemies.find(x => x.remote);
    if (!e || e.dead) return;
    const h = HEROES[e.id];
    if (h.atkRange < 100) {
      const range = h.atkRange, p = players[0];
      if (p && !p.dead) {
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d <= range + p.r) {
          const ea = Math.atan2(p.y - e.y, p.x - e.x);
          const diff = Math.abs(((ea - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (diff < Math.PI / 2.5) { player = p; damagePlayer(h.atkDmg); player = players[0]; }
        }
      }
      const heavy = (e.id === 'scallion' || e.id === 'tofu' || e.id === 'sausage');
      const quick = (e.id === 'hawthorn');
      const span = quick ? Math.PI/2.6 : heavy ? Math.PI/2.0 : Math.PI/2.3;
      const half = quick ? 0.20 : heavy ? 0.42 : 0.30;
      const slife = quick ? 0.12 : heavy ? 0.2 : 0.16;
      zones.push({ type: 'swing', x: e.x, y: e.y, ang, range, color: e.color, span, half, heavy, life: slife, maxLife: slife });
      Sound.swing(e.id);
    } else {
      const st = ({ squid: 'ink', bubble: 'pearl' })[e.id] || 'bolt';
      const mx = e.x + Math.cos(ang) * (e.r + 6), my = e.y + Math.sin(ang) * (e.r + 6);
      projectiles.push({ x: mx, y: my, vx: Math.cos(ang) * 11, vy: Math.sin(ang) * 11, r: 6,
        dmg: h.atkDmg, life: 1.3, color: e.color, team: 'enemy', style: st });
      spawnParticles(mx, my, 7, e.color, { speed: 3, life: 0.25, size: 2 });
      Sound.shot(e.id);
    }
  }

  function end(msg) {
    if (!active) return;
    active = false; started = false;
    if (sendTimer) clearInterval(sendTimer);
    if (helloTimer) clearInterval(helloTimer);
    try { ch.send({ type: 'broadcast', event: 'bye', payload: {} }); } catch (e) {}
    try { Online.client.removeChannel(ch); } catch (e) {}
    ch = null; buf = [];
    if (msg && (state === 'playing' || !started)) {
      if (state === 'playing') {
        showMatchBanner(msg);
        setTimeout(quitMatch, 1400);
      }
    }
  }

  return { start, end, _interp, sendAttack, sendDead, get active() { return active; } };
})();

// classic script 的 top-level const 不會掛上 window，明確掛上讓 21-online.js 找得到
window.NetMatch = NetMatch;
