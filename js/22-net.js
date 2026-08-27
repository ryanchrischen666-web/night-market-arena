'use strict';

// ============ NET MATCH v2：房間制（最多 3v3） ============
// 流程：開房間拿 4 位數代號 → 朋友輸入代號加入 → 各自選隊伍、選英雄、按準備
//      → 房主按開始 → 所有人同場開打。
// 同步原則不變：自己的角色本機模擬；別人的角色吃位置快照做 entity interpolation；
// 傷害由被打的一方判定再回報血量；地圖用房號做種子，兩邊長一樣。

function updateRemote(e, dt) {
  NetMatch._tickRemote(e, dt);
}

const NetMatch = (() => {
  const SEND_MS = 80;        // 每秒 12.5 次（多人房間省一點流量）
  const DELAY_MS = 120;      // 內插緩衝
  const TEAM_ICON = ['🔴', '🔵'];
  const TEAM_NAME = ['紅隊 RED', '藍隊 BLUE'];

  let ch = null;
  let code = '';             // 4 位數房號
  let iAmHost = false;
  let members = [];          // presence 快照 [{id,name,host,team,hero,ready}]
  let me = { team: null, hero: null, ready: false };
  let lobbyOpen = false;
  let inMatch = false, matchOver = false, matchNo = 0;
  let roster = [];           // 開打瞬間的名單
  let bufs = {}, hps = {};   // per-id 位置快照 / 最新血量
  let lastSeen = {};         // per-id 最後收到封包的時間（斷線偵測）
  let peerState = {};        // per-id 大廳即時狀態（廣播比 presence 快很多）
  let lastMemberCount = 0;
  let sendTimer = null;

  const myId = () => Online.id;

  function note(msg) {
    console.log('[NET]', msg);
    const el = document.querySelector('#online-panel .om');
    if (el) el.textContent = msg ? '[房間] ' + msg : '';
  }

  // ---------- 房間建立 / 加入 ----------
  function createRoom() {
    if (ch) return;
    code = String(1000 + Math.floor(Math.random() * 9000));
    iAmHost = true;
    connect();
  }
  function joinRoom(c) {
    if (ch) return;
    c = String(c || '').trim();
    if (!/^\d{4}$/.test(c)) { note('代號要是 4 位數字'); return; }
    code = c; iAmHost = false;
    connect();
  }

  function connect() {
    me = { team: null, hero: null, ready: false };
    matchNo = 0; inMatch = false; matchOver = false;
    ch = Online.client.channel('room:' + code, {
      config: { broadcast: { self: false }, presence: { key: myId() } }
    });
    ch.on('presence', { event: 'sync' }, onPresence)
      .on('presence', { event: 'leave' }, ({ key }) => onLeave(key))
      .on('broadcast', { event: 'lobby' }, ({ payload }) => {
        if (payload.u === myId()) return;
        peerState[payload.u] = { team: payload.team, hero: payload.hero, ready: payload.ready, name: payload.name, host: !!payload.host };
        if (lobbyOpen) renderLobby();
      })
      .on('broadcast', { event: 'knock' }, ({ payload }) => {
        if (payload.u !== myId()) sendLobby();   // 有人敲門，立刻自我介紹（不等 presence）
      })
      .on('broadcast', { event: 'start' }, ({ payload }) => beginFromRoster(payload.roster, payload.m))
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        const b = bufs[payload.u] || (bufs[payload.u] = []);
        lastSeen[payload.u] = performance.now();
        b.push({ t: performance.now(), x: payload.x, y: payload.y, f: payload.f, d: payload.d });
        if (b.length > 40) b.shift();
        if (payload.h != null) hps[payload.u] = payload.h;
        if (payload.fa != null) { const fe = enemies.find(x => x.remote && x.netId === payload.u); if (fe) fe._feastAng = payload.fa; }
        if (payload.df) dmgFromPeers[payload.u] = payload.df;
      })
      .on('broadcast', { event: 'atk' }, ({ payload }) => replayAttack(payload))
      .on('broadcast', { event: 'cast' }, ({ payload }) => replayCast(payload))
      .on('broadcast', { event: 'dead' }, ({ payload }) => { markDead(payload.u); })
      .on('broadcast', { event: 'prop' }, ({ payload }) => {
        const pr = currentMap && currentMap.props[payload.k];
        if (pr && !pr.gone) { pr.gone = true; spawnParticles(pr.x, pr.y, 14, '#bbbbbb', { speed: 3, life: 0.5, size: 3 }); }
      })
      .subscribe(async (s) => {
        note('房間連線：' + s);
        if (s === 'SUBSCRIBED') {
          await track();
          if (iAmHost) openLobby();
          else {
            try { ch.send({ type: 'broadcast', event: 'knock', payload: { u: myId() } }); } catch (e) {}
            let waited = 0;
            const poll = setInterval(() => {
              waited += 300;
              if (!ch) { clearInterval(poll); return; }
              if (hostSeen()) {
                clearInterval(poll);
                if (roomHeadcount() > 6) { note('房間已滿（6 人）'); leaveRoom(); }
                else openLobby();
              } else if (waited >= 5000) {
                clearInterval(poll);
                note('找不到房間 ' + code + '（房主不在）'); leaveRoom();
              }
            }, 300);
          }
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          note('房間連線失敗'); cleanup();
        }
      });
    if (!sendTimer) sendTimer = setInterval(tick, SEND_MS);
  }

  async function track(retried) {
    if (!ch) return;
    try {
      sendLobby();   // 廣播先走（~100ms 到），presence 慢慢追上
      const st = await ch.track({ name: Online.myName || '?', host: iAmHost, team: me.team, hero: me.hero, ready: me.ready });
      console.log('[NET] track →', st, JSON.stringify(me));
      if (st !== 'ok' && !retried) setTimeout(() => track(true), 600);   // 失敗自動重試一次
    } catch (e) {
      console.log('[NET] track 例外', e);
      if (!retried) setTimeout(() => track(true), 600);
    }
  }

  function sendLobby() {
    if (!ch) return;
    try { ch.send({ type: 'broadcast', event: 'lobby',
      payload: { u: myId(), team: me.team, hero: me.hero, ready: me.ready, name: Online.myName || '?', host: iAmHost } }); } catch (e) {}
  }

  // 同步看門狗：按了選隊/選角後 3 秒，presence 還沒跟上就再推一次
  let watchdog = null;
  function armWatchdog() {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      const mine = members.find(m => m.id === myId());
      if (lobbyOpen && mine && (mine.team !== me.team || mine.hero !== me.hero || !!mine.ready !== !!me.ready)) {
        console.log('[NET] presence 沒跟上，重推', JSON.stringify(me), '↔', JSON.stringify(mine));
        note('同步慢，重試中…');
        track();
        armWatchdog();
      }
    }, 3000);
  }

  function hostSeen() {
    return members.some(m => m.host) || Object.values(peerState).some(p => p.host);
  }
  function roomHeadcount() {
    const ids = new Set(members.map(m => m.id));
    for (const k in peerState) ids.add(k);
    ids.add(myId());
    return ids.size;
  }

  function onPresence() {
    if (!ch) return;
    const st = ch.presenceState();
    members = Object.entries(st).map(([id, metas]) => Object.assign({ id }, metas[0]))
      .sort((a, b) => a.id < b.id ? -1 : 1);
    if (members.length > lastMemberCount) setTimeout(sendLobby, 250);   // 迎新
    lastMemberCount = members.length;
    if (lobbyOpen) {
      if (!iAmHost && !hostSeen()) { note('房主離開了，房間解散'); leaveRoom(); return; }
      if (!iAmHost && members.length > 6) {
        const noHost = members.filter(m => !m.host).map(m => m.id).sort();
        const overflow = noHost.slice(5);            // 房主 + 5 人 = 6，超過的踢
        if (overflow.includes(myId())) { note('房間已滿（6 人）'); leaveRoom(); return; }
      }
      renderLobby();
    }
  }

  function onLeave(key) {
    delete peerState[key];
    if (lobbyOpen) { onPresence(); }   // 重跑房主在否檢查＋重繪（presence sync 可能比這步早到）
    if (inMatch) {
      const e = enemies.find(x => x.remote && x.netId === key);
      if (e && !e.dead) {
        e.dead = true; spawnParticles(e.x, e.y, 16, '#999', { speed: 3, life: 0.5, size: 3 });
        showMatchBanner('有人離線', (e.name || '').replace(/^../, ''));
        winCheck();
      }
    }
  }

  function leaveRoom() {
    cleanup();
    document.getElementById('room-screen').classList.add('hidden');
    if (state !== 'playing') {
      document.getElementById('title-screen').classList.remove('hidden');
      UI.renderTitleMeta();
    }
    if (window.Online) Online.render();
  }
  function cleanup() {
    if (sendTimer) { clearInterval(sendTimer); sendTimer = null; }
    if (ch) { try { Online.client.removeChannel(ch); } catch (e) {} }
    ch = null; lobbyOpen = false; inMatch = false; matchOver = false;
    members = []; bufs = {}; hps = {}; code = ''; iAmHost = false; peerState = {}; lastMemberCount = 0;
  }

  // ---------- 大廳 UI ----------
  function openLobby() {
    lobbyOpen = true;
    me.ready = false; track();
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById('hud').classList.add('hidden');
    document.body.classList.remove('playing');
    document.getElementById('room-screen').classList.remove('hidden');
    wireLobby();
    renderLobby();
    note(iAmHost ? '把代號 ' + code + ' 告訴朋友' : '已加入房間 ' + code);
  }

  let wired = false;
  function wireLobby() {
    if (wired) return; wired = true;
    document.querySelectorAll('.room-join-team').forEach(b => b.addEventListener('click', () => {
      const t = +b.dataset.team;
      console.log('[NET] 點選隊', t);
      if (localMembers().filter(m => m.id !== myId() && m.team === t).length >= 3) { note('這隊滿了'); return; }
      Sound.ui(); me.team = t; track(); armWatchdog(); renderLobby();
    }));
    document.getElementById('room-leave-btn').addEventListener('click', () => { Sound.uiBack(); leaveRoom(); });
    const copyBtn = document.getElementById('room-copy-btn');
    copyBtn.addEventListener('click', async () => {
      Sound.ui();
      const link = location.origin + location.pathname + '?room=' + code;
      let ok = false;
      try { await navigator.clipboard.writeText(link); ok = true; } catch (e) {
        try {   // 舊瀏覽器備援
          const ta = document.createElement('textarea');
          ta.value = link; document.body.appendChild(ta); ta.select();
          ok = document.execCommand('copy'); ta.remove();
        } catch (e2) {}
      }
      copyBtn.textContent = ok ? '✅ 已複製！傳給朋友吧' : link;   // 複製失敗就直接顯示連結
      setTimeout(() => { copyBtn.textContent = '📋 複製邀請連結'; }, 2600);
    });
    document.getElementById('room-ready-btn').addEventListener('click', () => {
      if (me.team == null || !me.hero) { note('先選隊伍和英雄'); return; }
      console.log('[NET] 準備切換');
      Sound.ui(); me.ready = !me.ready; track(); armWatchdog(); renderLobby();
    });
    document.getElementById('room-start-btn').addEventListener('click', () => {
      if (!iAmHost || !canStart()) return;
      Sound.ui();
      const r = localMembers().filter(m => m.team != null && m.hero).map(m => ({ id: m.id, name: m.name, team: m.team, hero: m.hero }));
      matchNo++;
      try { ch.send({ type: 'broadcast', event: 'start', payload: { roster: r, m: matchNo } }); } catch (e) {}
      beginFromRoster(r, matchNo);
    });
    // 迷你英雄選單
    const pick = document.getElementById('room-picker');
    pick.innerHTML = HERO_ORDER.map(id => {
      const locked = HEROES[id].premium && !(Save.d.heroesOwned || []).includes(id);
      return `<button class="room-hero${locked ? ' rh-locked' : ''}" data-id="${id}" ${locked ? 'disabled' : ''}>` +
        `<span>${locked ? '🔒' : HEROES[id].emoji}</span>${HEROES[id].cn}</button>`;
    }).join('');
    pick.addEventListener('click', (ev) => {
      const b = ev.target.closest('.room-hero');
      if (!b || b.disabled) return;
      console.log('[NET] 點選角', b.dataset.id);
      Sound.ui(); me.hero = b.dataset.id; track(); armWatchdog(); renderLobby();
    });
  }

  function canStart() {
    const ms = localMembers();
    const teamed = ms.filter(m => m.team != null);
    const t0 = teamed.filter(m => m.team === 0), t1 = teamed.filter(m => m.team === 1);
    if (!t0.length || !t1.length) return false;
    if (teamed.some(m => !m.hero)) return false;
    if (ms.some(m => m.team == null)) return false;                   // 有人還沒選隊
    if (teamed.some(m => !m.host && !m.ready)) return false;          // 非房主都要準備
    return true;
  }

  function localMembers() {
    const out = members.map(m => {
      if (m.id === myId()) return Object.assign({}, m, { team: me.team, hero: me.hero, ready: me.ready, name: Online.myName || m.name });
      const p = peerState[m.id];
      return p ? Object.assign({}, m, p) : m;
    });
    for (const k in peerState) {
      if (k !== myId() && !out.some(m => m.id === k))
        out.push(Object.assign({ id: k }, peerState[k]));
    }
    if (!out.some(m => m.id === myId()))
      out.push({ id: myId(), name: Online.myName || '?', host: iAmHost, team: me.team, hero: me.hero, ready: me.ready });
    return out;
  }

  function renderLobby() {
    if (!lobbyOpen) return;
    document.getElementById('room-code-big').textContent = code;
    const members_ = localMembers();
    const mine = { team: me.team };
    for (const t of [0, 1]) {
      const ul = document.getElementById('team' + t + '-list');
      const rows = members_.filter(m => m.team === t).map(m => {
        const h = m.hero ? HEROES[m.hero] : null;
        return `<li class="${m.id === myId() ? 'me' : ''}">${m.host ? '👑' : ''}${h ? h.emoji : '❔'} ${esc(m.name || '?')}` +
          `<span>${m.host ? '房主' : (m.ready ? '✅ 已準備' : '…')}</span></li>`;
      });
      for (let k = rows.length; k < 3; k++) rows.push('<li class="empty">－ 空位 －</li>');
      ul.innerHTML = rows.join('');
      const jb = document.querySelector(`.room-join-team[data-team="${t}"]`);
      jb.classList.toggle('hidden', mine.team === t || members_.filter(m => m.team === t).length >= 3);
    }
    const idle = members_.filter(m => m.team == null);
    note((idle.length ? '未選隊：' + idle.map(m => esc(m.name)).join('、') + ' · ' : '') + '房號 ' + code);
    // 我的英雄高亮
    document.querySelectorAll('.room-hero').forEach(b => b.classList.toggle('selected', b.dataset.id === me.hero));
    // 按鈕狀態
    const rb = document.getElementById('room-ready-btn'), sb = document.getElementById('room-start-btn');
    rb.classList.toggle('hidden', iAmHost);
    rb.textContent = me.ready ? '取消準備 · Unready' : '準備 · Ready';
    sb.classList.toggle('hidden', !iAmHost);
    sb.disabled = !canStart();
    sb.style.opacity = canStart() ? 1 : 0.45;
    sb.textContent = canStart() ? '開始遊戲 · Start' : '等大家選好並準備…';
  }
  function esc(x) { return String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // ---------- 開打 ----------
  function beginFromRoster(r, mn) {
    roster = r; matchNo = mn;
    const my = roster.find(x => x.id === myId());
    if (!my) { note('這場沒有你，等下一場'); return; }
    lobbyOpen = false; inMatch = true; matchOver = false; bufs = {}; hps = {};
    lastSeen = {};
    const _t0 = performance.now();
    for (const m of r) if (m.id !== myId()) lastSeen[m.id] = _t0;

    // 種子地圖：房號 + 場次
    let seed = 2166136261 ^ mn;
    for (let k = 0; k < code.length; k++) { seed ^= code.charCodeAt(k); seed = Math.imul(seed, 16777619); }
    const orig = Math.random; let s0 = seed >>> 0;
    Math.random = () => { s0 = (Math.imul(s0, 1664525) + 1013904223) >>> 0; return s0 / 4294967296; };
    window.__previewedOpps = [];
    try { startMatch(my.hero, 'net'); } finally { Math.random = orig; }
    delete window.__previewedOpps;

    // 佈陣：隊0在下、隊1在上，同隊橫向排開
    const slot = (m) => {
      const mates = roster.filter(x => x.team === m.team);
      const i = mates.findIndex(x => x.id === m.id);
      return { x: W / 2 + (i - (mates.length - 1) / 2) * 140, y: m.team === 0 ? H - 120 : 120 };
    };
    const ms = slot(my);
    players[0].x = ms.x; players[0].y = ms.y;
    resolveBlocks(players[0]);

    for (const m of roster) {
      if (m.id === myId()) continue;
      const sp = slot(m);
      spawnEnemyHero(m.hero, sp.x, sp.y, { hpMul: 1, dmgMul: 1 });
      const e = enemies[enemies.length - 1];
      e.remote = true; e.netId = m.id; e.team = m.team;
      e.hostileNet = (m.team !== my.team);
      e.speed = HEROES[m.hero].speed;
      e.name = TEAM_ICON[m.team] + ' ' + (m.name || HEROES[m.hero].name);
      resolveBlocks(e);
    }
    showMatchBanner('團隊戰 · ' + roster.filter(x=>x.team===0).length + ' vs ' + roster.filter(x=>x.team===1).length,
      TEAM_ICON[my.team] + ' 你在' + TEAM_NAME[my.team]);
    updateHud();
  }

  function tick() {
    if (!ch || !inMatch || state !== 'playing') return;
    // 斷線偵測：8 秒沒動靜就當作離線陣亡（presence leave 有時來得很慢）
    const nowT = performance.now();
    for (const m of roster) {
      if (m.id === myId() || isDeadId(m.id)) continue;
      if (lastSeen[m.id] && nowT - lastSeen[m.id] > 8000) {
        const e2 = enemies.find(x => x.remote && x.netId === m.id);
        showMatchBanner('有人斷線', m.name || '');
        if (e2) { e2.dead = true; spawnParticles(e2.x, e2.y, 16, '#999', { speed: 3, life: 0.5, size: 3 }); }
        lastSeen[m.id] = 0;
        winCheck(); updateHud();
      }
    }
    const p = players[0];
    if (!p) return;
    try {
      ch.send({ type: 'broadcast', event: 'pos',
        payload: { u: myId(), x: Math.round(p.x), y: Math.round(p.y), f: p.facing, d: p.faceDir, h: Math.round(p.hp), df: roundedDmgFrom() } });
    } catch (e) {}
  }

  function _tickRemote(e, dt) {
    advanceAnim(e, dt);
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.invisible > 0) e.invisible -= dt;
    const b = bufs[e.netId];
    if (b && b.length) {
      const target = performance.now() - DELAY_MS;
      let a = b[0], nx = null;
      for (let i = 0; i < b.length; i++) { if (b[i].t <= target) a = b[i]; else { nx = b[i]; break; } }
      if (nx && nx.t > a.t) {
        const k = (target - a.t) / (nx.t - a.t);
        e.x = a.x + (nx.x - a.x) * k; e.y = a.y + (nx.y - a.y) * k;
      } else { e.x = a.x; e.y = a.y; }
      const sN = nx || a; e.facing = sN.f; e.faceDir = sN.d;
    }
    const hp = hps[e.netId];
    if (hp != null && !e.dead) {
      e.hp = Math.min(e.maxHp, hp);
      if (hp <= 0) markDead(e.netId);
    }
    const me0 = players[0];
    if (e._netDash) {
      e._netDash.t -= dt;
      if (e.hostileNet && me0 && !me0.dead && !e._netDash.hit && Math.hypot(me0.x - e.x, me0.y - e.y) < me0.r + e.r + 6) {
        e._netDash.hit = true;
        player = me0; damagePlayer(e._netDash.dmg, e.netId); player = players[0];
        if (e._netDash.stun) applyStunP(me0, e._netDash.stun);
        if (e._netDash.slow) { me0.slowT = Math.max(me0.slowT || 0, e._netDash.slow); me0.slowMulP = e._netDash.slowMul || 0.6; }
        spawnParticles(me0.x, me0.y, 18, e.color, { speed: 5, life: 0.6, size: 4 });
      }
      if (e._netDash.t <= 0) e._netDash = null;
    }
    if (e._feastT > 0) {
      e._feastT -= dt;
      e._feastTick = (e._feastTick || 0) - dt;
      if (e._feastTick <= 0 && e.hostileNet && me0 && !me0.dead) {
        e._feastTick = 0.2;
        const fa = e._feastAng || 0;
        const LEN = beamReach(e.x, e.y, fa, 360), HW = 26;
        const rx = me0.x - e.x, ry = me0.y - e.y;
        const along = rx * Math.cos(fa) + ry * Math.sin(fa);
        if (along >= 0 && along <= LEN && Math.abs(-Math.sin(fa) * rx + Math.cos(fa) * ry) < HW + me0.r) {
          player = me0; damagePlayer(8, e.netId); player = players[0];
        }
      }
    }
    if (e._netLeap) {
      e._netLeap.t -= dt;
      if (e._netLeap.t <= 0) {
        e._netLeap = null;
        if (e.hostileNet && me0 && !me0.dead) {
          applyStunP(me0, 0.9);
          player = me0; damagePlayer(45, e.netId); player = players[0];
          spawnParticles(me0.x, me0.y, 20, '#cc2936', { speed: 5, life: 0.6, size: 5 });
          spawnRing(me0.x, me0.y, '#ff5a4a', 56); addShake(8); addHitStop(0.08);
          Sound.slam();
        }
      }
    }
  }

  function markDead(id) {
    const e = enemies.find(x => x.remote && x.netId === id);
    if (e && !e.dead) {
      e.dead = true; e.hp = 0;
      spawnRing(e.x, e.y, '#ffd166', 60);
      if (e.hostileNet) totalKills++;
      winCheck();
      updateHud();
    }
  }

  function isDeadId(id) {
    if (id === myId()) return players[0] ? players[0].dead : false;
    const e = enemies.find(x => x.remote && x.netId === id);
    if (e) return !!e.dead;
    return true;   // 實體不在了（死亡清場或斷線移除）
  }

  function winCheck() {
    if (matchOver || !inMatch) return;
    const my = roster.find(x => x.id === myId());
    if (!my) return;
    const foeAlive = roster.some(m => m.team !== my.team && !isDeadId(m.id));
    const usAlive = roster.some(m => m.team === my.team && !isDeadId(m.id));
    if (!foeAlive) {
      matchOver = true;
      if (state === 'playing') { state = 'won'; setTimeout(() => endGame(true), 800); }
      setTimeout(showBackBtn, 1000);
    } else if (!usAlive) {
      matchOver = true;
      if (state === 'playing') endGame(false);
      setTimeout(showBackBtn, 1000);
    }
  }

  // 我掛了（05-util 呼叫）：全隊沒了才算輸，否則觀戰
  function onLocalDeath() {
    sendDead();
    winCheck();
    if (!matchOver) showMatchBanner('你倒下了', '觀戰中 · Spectating');
  }

  function showBackBtn() {
    if (!ch) return;
    const b = document.getElementById('rematch-btn');
    if (!b) return;
    b.textContent = '回到房間 · Back to Room';
    b.classList.remove('hidden');
    b.disabled = false; b.style.opacity = 1;
    if (!b._wired2) {
      b._wired2 = true;
      b.addEventListener('click', () => {
        if (!ch) return;
        Sound.ui();
        document.getElementById('rematch-btn').classList.add('hidden');
        document.getElementById('end-screen').classList.add('hidden');
        state = 'title';
        inMatch = false; matchOver = false;
        enemies = []; projectiles = []; particles = []; zones = []; dmgTexts = []; rings = [];
        openLobby();
      });
    }
  }

  // ---------- 戰鬥事件 ----------
  function sendAttack(ang, mul, burn, rw) {
    if (!ch || !inMatch) return;
    try { ch.send({ type: 'broadcast', event: 'atk', payload: { u: myId(), a: ang, m: mul, b: burn ? 1 : 0, rw: rw ? 1 : 0 } }); } catch (e) {}
  }
  function sendCast(i, mx, my) {
    if (!ch || !inMatch) return;
    try { ch.send({ type: 'broadcast', event: 'cast', payload: { u: myId(), i, mx: Math.round(mx), my: Math.round(my) } }); } catch (e) {}
  }
  function sendProp(k) {
    if (!ch || !inMatch) return;
    try { ch.send({ type: 'broadcast', event: 'prop', payload: { u: myId(), k } }); } catch (e) {}
  }
  let deadSent = false;
  function sendDead() {
    if (!ch || !inMatch) return;
    try { ch.send({ type: 'broadcast', event: 'dead', payload: { u: myId() } }); } catch (e) {}
  }

  function senderEntity(u) { return enemies.find(x => x.remote && x.netId === u); }

  // 每個人回報「誰打了我多少」；把所有人回報中屬於我的那份加起來，
  // 就是我這場打出的真實傷害（1v1 與 3v3 都準）。
  const dmgFromPeers = {};
  function resetPeerDamage() { for (const k in dmgFromPeers) delete dmgFromPeers[k]; }
  function roundedDmgFrom() {
    const out = {};
    for (const k in matchStats.dmgFrom) out[k] = Math.round(matchStats.dmgFrom[k]);
    return out;
  }
  function myDamageDealt() {
    let sum = 0;
    for (const u in dmgFromPeers) sum += dmgFromPeers[u][myId()] || 0;
    return sum;
  }

  function replayAttack(pl) {
    if (state !== 'playing' || !inMatch) return;
    const e = senderEntity(pl.u);
    if (!e || e.dead) return;
    const hostile = e.hostileNet;
    const ang = pl.a, _mul = pl.m || 1, _burn = !!pl.b;
    const h = HEROES[e.id];
    if (h.atkRange < 100) {
      const range = h.atkRange, p = players[0];
      if (hostile && p && !p.dead) {
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d <= range + p.r) {
          const ea = Math.atan2(p.y - e.y, p.x - e.x);
          const diff = Math.abs(((ea - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (diff < Math.PI / 2.5) {
            player = p; damagePlayer(h.atkDmg * _mul, pl.u); player = players[0];
            if (_burn) { p.burnT = 3; p.burnDmgP = 6; p.burnSrc = pl.u; }
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
    } else if (e.id === 'chicken') {
      const mx = e.x + Math.cos(ang) * (e.r + 6), my2 = e.y + Math.sin(ang) * (e.r + 6);
      projectiles.push({ x: mx, y: my2, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, r: 18,
        dmg: h.atkDmg * _mul, life: 1.0, color: '#f0b429', team: hostile ? 'enemy' : 'fx', style: 'wave', pierce: true, srcU: pl.u,
        onHitP: (hostile && _burn) ? ((proj, pv) => { pv.burnT = 3; pv.burnDmgP = 6; }) : null });
      spawnParticles(mx, my2, 8, '#ffd166', { speed: 3, life: 0.3, size: 3 });
      Sound.shot(e.id);
    } else {
      const st = ({ squid: 'ink', bubble: 'pearl' })[e.id] || 'bolt';
      const mx = e.x + Math.cos(ang) * (e.r + 6), my2 = e.y + Math.sin(ang) * (e.r + 6);
      projectiles.push({ x: mx, y: my2, vx: Math.cos(ang) * 11, vy: Math.sin(ang) * 11, r: 6,
        dmg: h.atkDmg * _mul, life: 1.3, color: e.color, team: hostile ? 'enemy' : 'fx', srcU: pl.u, style: st,
        onHitP: (hostile && _burn) ? ((proj, pv) => { pv.burnT = 3; pv.burnDmgP = 6; pv.burnSrc = pl.u; }) : null });
      spawnParticles(mx, my2, 7, e.color, { speed: 3, life: 0.25, size: 2 });
      Sound.shot(e.id);
    }
  }

  function replayCast(plo) {
    if (state !== 'playing' || !inMatch) return;
    const e = senderEntity(plo.u);
    if (!e || e.dead) return;
    const hostile = e.hostileNet;
    const i = plo.i, mx = plo.mx, my = plo.my;
    const me0 = players[0];
    if (!me0) return;
    const ang = Math.atan2(my - e.y, mx - e.x);
    const hurt = (d) => { if (hostile && !me0.dead) { player = me0; damagePlayer(d, plo.u); player = players[0]; } };
    const cc = (fn) => { if (hostile && !me0.dead) fn(); };
    const inCone = (range, arc) => {
      if (Math.hypot(me0.x - e.x, me0.y - e.y) > range + me0.r) return false;
      const ea = Math.atan2(me0.y - e.y, me0.x - e.x);
      return Math.abs(((ea - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < arc / 2;
    };
    const P = (o) => projectiles.push(Object.assign({ team: hostile ? 'enemy' : 'fx', srcU: plo.u }, o));
    const fx = (x, y, n, c, o) => spawnParticles(x, y, n, c, o || { speed: 4, life: 0.6, size: 4 });
    const T = {
      scallion: [
        () => { if (inCone(130, Math.PI / 2.5)) hurt(35);
          zones.push({ type: 'cone', x: e.x, y: e.y, ang, range: 130, arc: Math.PI / 2.5, life: 0.4, maxLife: 0.4 });
          fx(e.x + Math.cos(ang) * 40, e.y + Math.sin(ang) * 40, 24, '#f4a93c', { speed: 5, life: 0.5, size: 4 }); },
        () => { zones.push({ type: 'oil', x: e.x, y: e.y, r: 50, life: 4, maxLife: 4 }); },
        () => { if (hostile && Math.hypot(me0.x - e.x, me0.y - e.y) < 300) {
            let wrapDur = 0; cc(() => { wrapDur = applyStunP(me0, 2.5); }); hurt(25);
            fx(me0.x, me0.y, 30, '#f5e6c8', { speed: 5, life: 0.8, size: 5 });
            if (wrapDur > 0) zones.push({ type: 'wrap', target: me0, life: wrapDur, maxLife: wrapDur }); } },
      ],
      squid: [
        () => P({ x: e.x, y: e.y, vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9, r: 10, dmg: 38, life: 0.7, color: '#a06b8c', pierce: true, kb: 25 }),
        () => P({ x: e.x, y: e.y, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6, r: 9, dmg: 20, life: 1.2, color: '#5a3a4a', snareOnHit: 3 }),
        () => { const tx = e.x + Math.cos(ang) * 140, ty = e.y + Math.sin(ang) * 140;
          if (hostile && Math.hypot(me0.x - tx, me0.y - ty) < 100 + me0.r) { hurt(50); cc(() => { me0.slowT = Math.max(me0.slowT, 2); me0.slowMulP = 0.5; }); }
          zones.push({ type: 'ink', x: tx, y: ty, r: 100, life: 0.8, maxLife: 0.8 });
          fx(tx, ty, 40, '#1a0e2e', { speed: 6, life: 0.9, size: 6 }); },
      ],
      tofu: [
        () => { e._netDash = { t: 0.28, dmg: 22, stun: 0.3, slow: 2, slowMul: 0.6, hit: false };
          for (let k = 0; k <= 4; k++) {
            const px = e.x + Math.cos(ang) * 240 * (k / 4), py = e.y + Math.sin(ang) * 240 * (k / 4);
            zones.push({ type: 'stink', x: px, y: py, r: 34, life: 2.4, maxLife: 2.4, dmgTimer: k * 0.08, hostile, hostileDmg: 6, srcU: plo.u });
          } fx(e.x, e.y, 20, '#9c7a3b', { speed: 4, life: 0.5, size: 4 }); },
        () => { e.shield = 4; fx(e.x, e.y, 16, '#9c7a3b', { speed: 3, life: 0.6, size: 4 }); },
        () => { zones.push({ type: 'stink', x: mx, y: my, r: 90, life: 5, maxLife: 5, dmgTimer: 0, hostile, hostileDmg: 6, srcU: plo.u });
          fx(mx, my, 24, '#7a8a3a', { speed: 4, life: 0.8, size: 5 }); },
      ],
      bubble: [
        () => { fx(e.x, e.y, 12, '#ffcc6b', { speed: 3, life: 0.6, size: 3 }); },
        () => P({ x: e.x, y: e.y, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7, r: 8, dmg: 22, life: 0.8, color: '#a8d8ff',
          onHitP: (proj, pv) => { if (Math.hypot(pv.x - proj.x, pv.y - proj.y) < 80) { applyFreezeP(pv, 1.2); player = pv; damagePlayer(16, proj.srcU); player = players[0]; }
            zones.push({ type: 'ice', x: proj.x, y: proj.y, r: 80, life: 1.0, maxLife: 1.0 });
            spawnParticles(proj.x, proj.y, 25, '#cfeaff', { speed: 6, life: 0.7, size: 5 }); } }),
        () => { for (let k = 0; k < 9; k++) { const a = ang + (k - 4) * 0.11;
            P({ x: e.x, y: e.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, r: 6, dmg: 16, life: 0.7, color: '#3a2a1a' }); } },
      ],
      sausage: [
        () => { fx(e.x, e.y, 12, '#ff7733', { speed: 3, life: 0.5, size: 3 }); },
        () => { zones.push({ type: 'rice', x: mx, y: my, r: 80, life: 3, maxLife: 3, hostile });
          fx(mx, my, 16, '#f5e6c8', { speed: 3, life: 0.6, size: 4 }); },
        () => { e._netDash = { t: 0.34, dmg: 50, stun: 1, hit: false }; fx(e.x, e.y, 18, '#c46a3a', { speed: 4, life: 0.5, size: 4 }); },
      ],
      hawthorn: [
        () => { for (let k = -1; k <= 1; k++) { const a = ang + k * 0.18;
            P({ x: e.x, y: e.y, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, r: 5, dmg: 18, life: 0.8, color: '#cc2936' }); } },
        () => { e.invisible = 2.5; fx(e.x, e.y, 30, '#cc2936', { speed: 6, life: 0.8, size: 5 }); },
        () => { if (hostile) e._netLeap = { t: 0.25 }; },
      ],
      oyster: [
        () => { fx(e.x, e.y, 24, '#ffe27a', { speed: 4, life: 0.8, size: 4 }); dmgText(e.x, e.y - 30, '+50', '#ffe27a'); },
        () => { if (hostile) P({ x: e.x, y: e.y, vx: 0, vy: 0, r: 9, dmg: 32, life: 3, color: '#f4a261', homing: me0, speed: 5 }); },
        () => { zones.push({ type: 'slick', x: e.x, y: e.y, r: 110, life: 6, maxLife: 6, hostile }); },
      ],
      chicken: [
        () => P({ x: e.x + Math.cos(ang) * (e.r + 6), y: e.y + Math.sin(ang) * (e.r + 6),
          vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, r: 26, dmg: 30, life: 1.1,
          color: '#f0b429', pierce: true, style: 'wave', srcU: plo.u, slowOnHit: 1.5, slowMulOnHit: 0.65 }),
        () => { e.shield = 3; fx(e.x, e.y, 20, '#f0b429', { speed: 4, life: 0.7, size: 4 }); spawnRing(e.x, e.y, '#ffd166', 46); },
        () => {
          if (e._feastT > 0) { e._feastT = 0; return; }   // 對面提前收攤
          e._feastT = 3; e._feastTick = 0;
          e._feastAng = Math.atan2(my - e.y, mx - e.x);
          spawnRing(e.x, e.y, '#ffd166', 70); fx(e.x, e.y, 18, '#ffd166', { speed: 4, life: 0.6, size: 4 });
        },
      ],
      ribs: [
        () => { const sd = Math.min(Math.hypot(mx - e.x, my - e.y), 200);
          const sx = e.x + Math.cos(ang) * sd, sy = e.y + Math.sin(ang) * sd;
          if (hostile && Math.hypot(me0.x - sx, me0.y - sy) < 110 + me0.r) { hurt(18); cc(() => { me0.slowT = Math.max(me0.slowT, 1.5); me0.slowMulP = 0.7; }); }
          zones.push({ type: 'smoke', x: sx, y: sy, r: 110, life: 0.8, maxLife: 0.8 });
          fx(sx, sy, 26, '#9c8a6c', { speed: 4, life: 0.7, size: 5 }); },
        () => P({ x: e.x, y: e.y, vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8, r: 7, dmg: 22, life: 1.4, color: '#f5e6c8', pierce: true, boomerang: true, age: 0, owner: e }),
        () => { zones.push({ type: 'soup', x: e.x, y: e.y, r: 120, life: 7, maxLife: 7, healTimer: 0, cosmetic: true }); e.shield = 7; },
      ],
    };
    const fns = T[e.id];
    if (fns && fns[i]) { fns[i](); const abName = (HEROES[e.id].abilities[i] || {}).name; if (abName) Sound.ability(abName); }
  }

  // 頁面關閉時通知
  window.addEventListener('beforeunload', () => { if (ch) { try { ch.untrack(); } catch (e) {} } });

  // 手機鎖屏/切APP會凍結連線；切回來時重新報到並重繪
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ch) {
      console.log('[NET] 回到前景，重新報到');
      setTimeout(() => { track(); if (lobbyOpen) renderLobby(); }, 800);
    }
  });

  function refreshName() { track(); if (lobbyOpen) renderLobby(); }

  return {
    createRoom, joinRoom, leaveRoom, refreshName,
    sendAttack, sendCast, sendProp, sendDead, onLocalDeath,
    myDamageDealt, resetPeerDamage,
    _tickRemote,
    get active() { return !!ch; },
    get inMatch() { return inMatch; },
    get picking() { return false; },
    get code() { return code; },
  };
})();

window.NetMatch = NetMatch;
