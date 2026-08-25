'use strict';

// ============ NET MATCH (1v1 連線對戰・里程碑一：移動同步) ============
// 架構：各管各的角色。自己的英雄在本機模擬（零延遲），
// 對方的英雄由網路快照驅動，用 entity interpolation（延後 120ms 內插）畫得滑順。
// 第一階段不同步傷害——先讓兩個人在同一張圖上互相看到對方跑來跑去。

function updateRemote(e, dt) {
  NetMatch._interp(e);
  advanceAnim(e, dt);
  if (e.hitFlash > 0) e.hitFlash -= dt;
  if (e.invisible > 0) e.invisible -= dt;
  const me = players[0];
  // 對方衝鋒（臭豆腐突進、大腸包小腸衝刺）：期間碰到我 → 撞擊傷害
  if (e._netDash) {
    e._netDash.t -= dt;
    if (me && !me.dead && !e._netDash.hit && Math.hypot(me.x - e.x, me.y - e.y) < me.r + e.r + 6) {
      e._netDash.hit = true;
      player = me; damagePlayer(e._netDash.dmg); player = players[0];
      if (e._netDash.stun) me.stunT = Math.max(me.stunT || 0, e._netDash.stun);
      if (e._netDash.slow) { me.slowT = Math.max(me.slowT || 0, e._netDash.slow); me.slowMulP = e._netDash.slowMul || 0.6; }
      spawnParticles(me.x, me.y, 18, e.color, { speed: 5, life: 0.6, size: 4 });
    }
    if (e._netDash.t <= 0) e._netDash = null;
  }
  // 糖葫蘆飛撲：時間到落地重擊
  if (e._netLeap) {
    e._netLeap.t -= dt;
    if (e._netLeap.t <= 0) {
      e._netLeap = null;
      if (me && !me.dead) {
        me.stunT = Math.max(me.stunT || 0, 2);
        player = me; damagePlayer(60); player = players[0];
        spawnParticles(me.x, me.y, 20, '#cc2936', { speed: 5, life: 0.6, size: 5 });
        spawnRing(me.x, me.y, '#ff5a4a', 56); addShake(8); addHitStop(0.08);
        Sound.slam();
      }
    }
  }
}

const NetMatch = (() => {
  const SEND_MS = 66;       // 每秒約 15 次
  const DELAY_MS = 120;     // 內插緩衝：畫「120ms 前的對方」
  let ch = null, active = false, started = false, picking = false, myConfirmed = false;
  let remoteId = null, remoteHero = null, myHero = null, roomKey = '';
  let buf = [];             // 位置快照 {t, x, y, f, d}
  let remoteHp = null;      // 對方回報的血量（被打的人自己算，我只負責顯示）
  let matchOver = false;
  let rematchMine = false, rematchTheirs = false, remoteLeft = false;
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
    active = true; started = false; remoteId = rid; remoteHero = null; buf = []; roomKey = room;
    remoteHp = null; matchOver = false; rematchMine = rematchTheirs = false; remoteLeft = false;
    picking = false; myConfirmed = false; myHero = null;

    ch = Online.client.channel('game:' + room, {
      config: { broadcast: { self: false }, presence: { key: Online.id } }
    });
    ch.on('broadcast', { event: 'hello' }, ({ payload }) => {
        if (!remoteHero) {
          note('對方選了 ' + (HEROES[payload.hero] ? HEROES[payload.hero].cn : payload.hero));
          remoteHero = payload.hero;
          if (picking && !myConfirmed) setSelectHeading('對方選好了！挑你的英雄 · Your turn');
          maybeBegin();
        }
      })
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        buf.push({ t: performance.now(), x: payload.x, y: payload.y, f: payload.f, d: payload.d });
        if (buf.length > 40) buf.shift();
        if (payload.h != null) remoteHp = payload.h;
      })
      .on('broadcast', { event: 'atk' }, ({ payload }) => replayAttack(payload.a, payload.m || 1, !!payload.b))
      .on('broadcast', { event: 'cast' }, ({ payload }) => replayCast(payload.i, payload.mx, payload.my))
      .on('broadcast', { event: 'dead' }, () => winByRemoteDeath())
      .on('broadcast', { event: 'prop' }, ({ payload }) => {
        const pr = currentMap && currentMap.props[payload.k];
        if (pr && !pr.gone) { pr.gone = true; spawnParticles(pr.x, pr.y, 14, '#bbbbbb', { speed: 3, life: 0.5, size: 3 }); }
      })
      .on('broadcast', { event: 'rematch' }, () => { rematchTheirs = true; maybeRematch(); })
      .on('broadcast', { event: 'bye' }, () => {
        if (matchOver) { remoteLeft = true; setRematchBtn('對方已離開房間', true); end(null); }
        else end('對方離開了');
      })
      .on('presence', { event: 'leave' }, ({ key }) => { if (key === remoteId && started) end('對方斷線了'); })
      .subscribe(async (s) => {
        note('房間狀態：' + s);
        if (s === 'SUBSCRIBED') {
          await ch.track({});
          openHeroPick();
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          note('房間連線失敗（' + s + '）');
          end('連線房間失敗');
        }
      });
  }

  function sayHello() {
    if (!myHero) return;
    try { ch.send({ type: 'broadcast', event: 'hello', payload: { hero: myHero } }); } catch (e) {}
  }

  function maybeBegin() {
    if (started || !remoteHero || !myConfirmed) return;
    started = true; picking = false;
    if (helloTimer) clearInterval(helloTimer);
    beginMatch();
  }

  // ---------- 連線選角 ----------
  function openHeroPick() {
    picking = true; myConfirmed = false; myHero = null;
    selectedHero = null;
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById('select-screen').classList.remove('hidden');
    resetHeroPick();
    renderHeroCards();
    setSelectHeading('連線對戰：選擇英雄 · Pick Your Hero');
    note('選好英雄按「下一步」');
  }

  // confirm-hero-btn 在連線時改走這裡（20-main.js 分流）
  function confirmHero() {
    if (!picking || !selectedHero || myConfirmed) return;
    myConfirmed = true; myHero = selectedHero;
    setSelectHeading(remoteHero ? '對方已選好，馬上開打！' : '等待對方選角… Waiting…');
    document.getElementById('confirm-hero-btn').classList.add('hidden');
    sayHello();
    if (helloTimer) clearInterval(helloTimer);
    helloTimer = setInterval(() => { if (started) clearInterval(helloTimer); else sayHello(); }, 1000);
    maybeBegin();
  }

  let rematchNo = 0;
  function beginMatch() {
    note('雙方到齊，開打！');
    // 兩邊的 buildMap() 各自 Math.random 會長出不同障礙物 → 用房間號做種子讓地圖一致
    let seed = 2166136261 ^ rematchNo;
    for (let k = 0; k < roomKey.length; k++) { seed ^= roomKey.charCodeAt(k); seed = Math.imul(seed, 16777619); }
    rematchNo++;
    const origRandom = Math.random;
    let s0 = seed >>> 0;
    Math.random = () => { s0 = (Math.imul(s0, 1664525) + 1013904223) >>> 0; return s0 / 4294967296; };
    window.__previewedOpps = [];                 // 不生 AI 對手
    try { startMatch(myHero, 'net'); } finally { Math.random = origRandom; }
    delete window.__previewedOpps;

    spawnEnemyHero(remoteHero, W / 2, 120, { hpMul: 1, dmgMul: 1 });
    const e = enemies[enemies.length - 1];
    e.remote = true;
    e.speed = HEROES[remoteHero].speed;          // 還原玩家速度（AI 版有打折）

    // 面對面出生：id 字串小的在下、大的在上（兩邊算出來一致）
    const meP = players[0];
    if (String(Online.id) > String(remoteId)) {
      meP.x = W / 2; meP.y = 120;
      e.x = W / 2; e.y = H - 120;
    }
    resolveBlocks(meP); resolveBlocks(e);

    showMatchBanner('連線對戰 · ONLINE',
      HEROES[myHero].cn + ' vs ' + HEROES[remoteHero].cn);
    if (window.Online) Online.setActivity('playing', myHero);

    sendTimer = setInterval(tick, SEND_MS);
  }

  function tick() {
    if (!active) return;
    if (state === 'title' || state === 'select' ) { end(null); return; }  // 離開對戰流程
    if (state !== 'playing') return;                  // 結算畫面：房間保留給「再來一場」
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
    setTimeout(showRematchUI, 1000);
  }

  // ---------- 再來一場 ----------
  function setRematchBtn(text, disabled) {
    const b = document.getElementById('rematch-btn');
    if (!b) return;
    b.textContent = text; b.disabled = !!disabled;
    b.style.opacity = disabled ? 0.5 : 1;
  }
  function showRematchUI() {
    if (!active) return;
    const b = document.getElementById('rematch-btn');
    if (!b) return;
    b.classList.remove('hidden');
    setRematchBtn(rematchTheirs ? '對方想再來一場！點擊開始' : '再來一場 · Rematch', false);
    if (!b._wired) {
      b._wired = true;
      b.addEventListener('click', () => {
        if (!active || remoteLeft || rematchMine) return;
        rematchMine = true;
        try { ch.send({ type: 'broadcast', event: 'rematch', payload: {} }); } catch (e) {}
        setRematchBtn('等待對方…', true);
        maybeRematch();
      });
    }
  }
  function maybeRematch() {
    if (!active || remoteLeft) return;
    if (rematchMine && rematchTheirs) {
      rematchMine = rematchTheirs = false;
      matchOver = false; remoteHp = null; buf = [];
      started = false; remoteHero = null;
      document.getElementById('rematch-btn').classList.add('hidden');
      document.getElementById('end-screen').classList.add('hidden');
      document.body.classList.remove('playing');
      document.getElementById('hud').classList.add('hidden');
      openHeroPick();
    } else if (rematchTheirs && matchOver) {
      setRematchBtn('對方想再來一場！點擊開始', false);
    }
  }
  function leaveRoom() { picking = false; end(null); }

  // 我的攻擊 → 廣播角度（fireBasicAttack 裡呼叫）
  function sendAttack(ang, mul, burn) {
    if (!active || !started) return;
    try { ch.send({ type: 'broadcast', event: 'atk', payload: { a: ang, m: mul, b: burn ? 1 : 0 } }); } catch (e) {}
  }

  function sendProp(k) {
    if (!active || !started) return;
    try { ch.send({ type: 'broadcast', event: 'prop', payload: { k } }); } catch (e) {}
  }

  function sendCast(i, mx, my) {
    if (!active || !started) return;
    try { ch.send({ type: 'broadcast', event: 'cast', payload: { i, mx: Math.round(mx), my: Math.round(my) } }); } catch (e) {}
  }

  // 我死了 → 立刻通知（damagePlayer 裡呼叫）
  function sendDead() {
    if (!active || !started || matchOver) return;
    matchOver = true;
    try { ch.send({ type: 'broadcast', event: 'dead', payload: {} }); } catch (e) {}
    setTimeout(showRematchUI, 1000);
  }

  // 在我的畫面重播「對方的攻擊」：從 remote 實體的位置、朝他傳來的角度打出去。
  // 傷害採「被打的人自己判定」——只有這裡會扣我的血，我的攻擊在我畫面上不扣對方的血。
  function replayAttack(ang, _mul, _burn) {
    _mul = _mul || 1;
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
          if (diff < Math.PI / 2.5) {
            player = p; damagePlayer(h.atkDmg * _mul); player = players[0];
            if (_burn) { p.burnT = 3; p.burnDmgP = 6; }
          }
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
        dmg: h.atkDmg * _mul, life: 1.3, color: e.color, team: 'enemy', style: st,
        onHitP: _burn ? ((proj, pl) => { pl.burnT = 3; pl.burnDmgP = 6; }) : null });
      spawnParticles(mx, my, 7, e.color, { speed: 3, life: 0.25, size: 2 });
      Sound.shot(e.id);
    }
  }

  // ---------- 技能重播：在我的畫面把「對方的技能」以敵方形式打出來 ----------
  // 傷害一律打在我身上（被打的人自己判定）；對方的自我增益只做視覺。
  function replayCast(i, mx, my) {
    if (state !== 'playing' || matchOver) return;
    const e = enemies.find(x => x.remote);
    if (!e || e.dead) return;
    const me = players[0];
    if (!me || me.dead) return;
    const ang = Math.atan2(my - e.y, mx - e.x);
    const hurt = (d) => { player = me; damagePlayer(d); player = players[0]; };
    const inCone = (range, arc) => {
      if (Math.hypot(me.x - e.x, me.y - e.y) > range + me.r) return false;
      const ea = Math.atan2(me.y - e.y, me.x - e.x);
      return Math.abs(((ea - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < arc / 2;
    };
    const P = (o) => projectiles.push(Object.assign({ team: 'enemy' }, o));
    const fx = (x, y, n, c, o) => spawnParticles(x, y, n, c, o || { speed: 4, life: 0.6, size: 4 });
    const T = {
      scallion: [
        () => { if (inCone(130, Math.PI / 2.5)) hurt(35);
          zones.push({ type: 'cone', x: e.x, y: e.y, ang, range: 130, arc: Math.PI / 2.5, life: 0.4, maxLife: 0.4 });
          fx(e.x + Math.cos(ang) * 40, e.y + Math.sin(ang) * 40, 24, '#f4a93c', { speed: 5, life: 0.5, size: 4 }); },
        () => { zones.push({ type: 'oil', x: e.x, y: e.y, r: 50, life: 4, maxLife: 4 }); },
        () => { if (Math.hypot(me.x - e.x, me.y - e.y) < 300) {
            me.stunT = Math.max(me.stunT, 2.5); hurt(25);
            fx(me.x, me.y, 30, '#f5e6c8', { speed: 5, life: 0.8, size: 5 });
            zones.push({ type: 'wrap', target: me, life: 2.5, maxLife: 2.5 }); } },
      ],
      squid: [
        () => P({ x: e.x, y: e.y, vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9, r: 10, dmg: 38, life: 0.7, color: '#a06b8c', pierce: true, kb: 25 }),
        () => P({ x: e.x, y: e.y, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, r: 9, dmg: 20, life: 1.2, color: '#5a3a4a', snareOnHit: 3 }),
        () => { const tx = e.x + Math.cos(ang) * 140, ty = e.y + Math.sin(ang) * 140;
          if (Math.hypot(me.x - tx, me.y - ty) < 100 + me.r) { hurt(50); me.slowT = Math.max(me.slowT, 2); me.slowMulP = 0.5; }
          zones.push({ type: 'ink', x: tx, y: ty, r: 100, life: 0.8, maxLife: 0.8 });
          fx(tx, ty, 40, '#1a0e2e', { speed: 6, life: 0.9, size: 6 }); },
      ],
      tofu: [
        () => { e._netDash = { t: 0.28, dmg: 22, stun: 0.3, slow: 2, slowMul: 0.6, hit: false };
          for (let k = 0; k <= 4; k++) {
            const px = e.x + Math.cos(ang) * 240 * (k / 4), py = e.y + Math.sin(ang) * 240 * (k / 4);
            zones.push({ type: 'stink', x: px, y: py, r: 34, life: 2.4, maxLife: 2.4, dmgTimer: k * 0.08, hostile: true, hostileDmg: 6 });
          } fx(e.x, e.y, 20, '#9c7a3b', { speed: 4, life: 0.5, size: 4 }); },
        () => { e.shield = 4; fx(e.x, e.y, 16, '#9c7a3b', { speed: 3, life: 0.6, size: 4 }); },
        () => { zones.push({ type: 'stink', x: mx, y: my, r: 90, life: 5, maxLife: 5, dmgTimer: 0, hostile: true, hostileDmg: 6 });
          fx(mx, my, 24, '#7a8a3a', { speed: 4, life: 0.8, size: 5 }); },
      ],
      bubble: [
        () => { fx(e.x, e.y, 12, '#ffcc6b', { speed: 3, life: 0.6, size: 3 }); },
        () => P({ x: e.x, y: e.y, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, r: 8, dmg: 30, life: 0.8, color: '#a8d8ff',
          onHitP: (proj, pl) => { if (Math.hypot(pl.x - proj.x, pl.y - proj.y) < 80) { pl.frozenT = Math.max(pl.frozenT, 1.2); player = pl; damagePlayer(25); player = players[0]; }
            zones.push({ type: 'ice', x: proj.x, y: proj.y, r: 80, life: 1.0, maxLife: 1.0 });
            spawnParticles(proj.x, proj.y, 25, '#cfeaff', { speed: 6, life: 0.7, size: 5 }); } }),
        () => { for (let k = 0; k < 11; k++) { const a = ang + (k - 5) * 0.09;
            P({ x: e.x, y: e.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, r: 6, dmg: 22, life: 0.7, color: '#3a2a1a' }); } },
      ],
      sausage: [
        () => { fx(e.x, e.y, 12, '#ff7733', { speed: 3, life: 0.5, size: 3 }); },
        () => { zones.push({ type: 'rice', x: mx, y: my, r: 80, life: 3, maxLife: 3, hostile: true });
          fx(mx, my, 16, '#f5e6c8', { speed: 3, life: 0.6, size: 4 }); },
        () => { e._netDash = { t: 0.34, dmg: 50, stun: 1, hit: false }; fx(e.x, e.y, 18, '#c46a3a', { speed: 4, life: 0.5, size: 4 }); },
      ],
      hawthorn: [
        () => { for (let k = -1; k <= 1; k++) { const a = ang + k * 0.18;
            P({ x: e.x, y: e.y, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, r: 5, dmg: 28, life: 0.8, color: '#cc2936' }); } },
        () => { e.invisible = 4; fx(e.x, e.y, 30, '#cc2936', { speed: 6, life: 0.8, size: 5 }); },
        () => { e._netLeap = { t: 0.25 }; },
      ],
      oyster: [
        () => { fx(e.x, e.y, 24, '#ffe27a', { speed: 4, life: 0.8, size: 4 }); dmgText(e.x, e.y - 30, '+50', '#ffe27a'); },
        () => P({ x: e.x, y: e.y, vx: 0, vy: 0, r: 9, dmg: 45, life: 3, color: '#f4a261', homing: me, speed: 5 }),
        () => { zones.push({ type: 'slick', x: e.x, y: e.y, r: 110, life: 6, maxLife: 6, hostile: true }); },
      ],
      ribs: [
        () => { if (Math.hypot(me.x - e.x, me.y - e.y) < 110 + me.r) { hurt(18); me.slowT = Math.max(me.slowT, 1.5); me.slowMulP = 0.7; }
          zones.push({ type: 'smoke', x: e.x, y: e.y, r: 110, life: 0.8, maxLife: 0.8 });
          fx(e.x, e.y, 26, '#9c8a6c', { speed: 4, life: 0.7, size: 5 }); },
        () => P({ x: e.x, y: e.y, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, r: 7, dmg: 22, life: 1.4, color: '#f5e6c8', pierce: true, boomerang: true, age: 0, owner: e }),
        () => { zones.push({ type: 'soup', x: e.x, y: e.y, r: 120, life: 7, maxLife: 7, healTimer: 0, cosmetic: true }); e.shield = 7; },
      ],
    };
    const fns = T[e.id];
    if (fns && fns[i]) { fns[i](); const abName = (HEROES[e.id].abilities[i] || {}).name; if (abName) Sound.ability(abName); }
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

  return { start, end, _interp, sendAttack, sendCast, sendProp, sendDead, leaveRoom, confirmHero,
    get picking() { return picking; }, get active() { return active; } };
})();

// classic script 的 top-level const 不會掛上 window，明確掛上讓 21-online.js 找得到
window.NetMatch = NetMatch;
