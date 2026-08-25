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
    active = true; started = false; remoteId = rid; remoteHero = null; buf = [];
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
      })
      .on('broadcast', { event: 'bye' }, () => end('對方離開了'))
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
        payload: { x: Math.round(p.x), y: Math.round(p.y), f: p.facing, d: p.faceDir } });
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

  return { start, end, _interp, get active() { return active; } };
})();

// classic script 的 top-level const 不會掛上 window，明確掛上讓 21-online.js 找得到
window.NetMatch = NetMatch;
