'use strict';

// ============ ONLINE PRESENCE (Supabase Realtime) ============
// 只做一件事：看誰在線上。不影響任何單機邏輯，設定留空就整個關閉。
//
// 1) 到 supabase.com 開專案 → Settings → API
// 2) 把 Project URL 和 anon public key 貼到下面
// 3) 用本機伺服器開遊戲（file:// 不能載 CDN 模組）：
//      python3 -m http.server 8000   → http://localhost:8000
const ONLINE_CFG = {
  url: 'https://rgxxcfsxpwihitcvjmsf.supabase.co',
  anonKey: 'sb_publishable_IaCGUdAyY3BAYkI6HaKwUA_2x_Qu4kO',
  room: 'night-market-lobby',
};

const Online = (() => {
  const NAME_KEY = 'nma_online_name';
  const ID_KEY   = 'nma_online_id';
  let sb = null, channel = null, me = null, peers = [];
  let status = 'off';   // off | connecting | online | error

  function myId() {
    // 用 sessionStorage：每個分頁一個身分，重新整理不變。
    // （放 localStorage 會讓同瀏覽器的分頁共用身分，自己測試時互相看不到）
    let id = null;
    try { id = sessionStorage.getItem(ID_KEY); } catch (e) {}
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : 'u' + Math.random().toString(36).slice(2));
      try { sessionStorage.setItem(ID_KEY, id); } catch (e) {}
    }
    return id;
  }
  function myName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  }
  function setName(n) {
    try { localStorage.setItem(NAME_KEY, n); } catch (e) {}
    if (me) { me.name = n; push(); }
    if (window.NetMatch && NetMatch.active && NetMatch.refreshName) NetMatch.refreshName();
  }

  const enabled = () => !!(ONLINE_CFG.url && ONLINE_CFG.anonKey);

  // Supabase 函式庫：GitHub Pages 上要從 CDN 抓。任何一個 CDN 被擋或掛掉就換下一個。
  const LIB_URLS = [
    'https://esm.sh/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
  ];
  let lastError = '', retryTimer = null, retryDelay = 4000, waiters = [];
  async function loadLib() {
    let err = null;
    for (const u of LIB_URLS) {
      try { const m = await import(u); if (m && m.createClient) return m; }
      catch (e) { err = e; console.warn('[ONLINE] 載入失敗', u, e && e.message); }
    }
    throw err || new Error('no supabase lib');
  }
  function settle(ok) {
    const ws = waiters; waiters = [];
    ws.forEach(w => { clearTimeout(w.t); ok ? w.res() : w.rej(new Error(lastError || '連不上伺服器')); });
  }
  function fail(reason) {
    lastError = reason; status = 'error';
    if (channel && sb) { try { sb.removeChannel(channel); } catch (e) {} }
    channel = null;
    render(); settle(false);
    // 自動重試（4s → 8s → … 最多 30s）
    if (!retryTimer) retryTimer = setTimeout(() => { retryTimer = null; connect(); }, retryDelay);
    retryDelay = Math.min(30000, retryDelay * 2);
  }
  // 開房間前呼叫：已經連上就馬上好；否則（重新）連線並等最多 ms 毫秒
  function ready(ms = 9000) {
    if (status === 'online' && sb) return Promise.resolve();
    return new Promise((res, rej) => {
      const w = { res, rej, t: setTimeout(() => { waiters = waiters.filter(x => x !== w); rej(new Error(lastError || '連線逾時')); }, ms) };
      waiters.push(w);
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      if (status !== 'connecting') connect();
    });
  }

  async function connect() {
    if (!enabled() || channel || status === 'connecting') return;
    status = 'connecting'; render();
    if (!sb) {
      try {
        const { createClient } = await loadLib();
        sb = createClient(ONLINE_CFG.url, ONLINE_CFG.anonKey);
      } catch (e) {
        fail('載入連線元件失敗（網路擋住了 CDN？）'); return;
      }
    }

    const id = myId();
    if (!me) me = { name: myName() || ('玩家' + id.slice(0, 4)), activity: 'title', hero: null };

    // 10 秒還沒連上就當失敗（Supabase 專案被暫停時會一直卡著）
    const subTimeout = setTimeout(() => { if (status === 'connecting') fail('伺服器沒有回應（Supabase 專案可能已暫停）'); }, 10000);
    channel = sb.channel(ONLINE_CFG.room, { config: { presence: { key: id } } });
    const myChannel = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const st = channel.presenceState();
        peers = Object.entries(st)
          .filter(([k]) => k !== id)
          .map(([k, metas]) => Object.assign({ id: k }, metas[0]));
        render();
      })
      .subscribe(async (s) => {
        if (channel !== myChannel) return;   // 已經被重試換掉的舊連線
        if (s === 'SUBSCRIBED') {
          clearTimeout(subTimeout);
          status = 'online'; lastError = ''; retryDelay = 4000; settle(true);
          await push(); render();
          // ?room=1234 邀請連結：連上線就自動進房
          if (!window.__roomLinkUsed) {
            window.__roomLinkUsed = true;
            const m = location.search.match(/[?&]room=(\d{4})/);
            if (m && window.NetMatch && !NetMatch.active) setTimeout(() => NetMatch.joinRoom(m[1]), 300);
          }
        }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || (s === 'CLOSED' && status === 'connecting')) {
          clearTimeout(subTimeout);
          fail(s === 'TIMED_OUT' ? '伺服器沒有回應（Supabase 專案可能已暫停）' : '連不上伺服器（' + s + '）');
        }
      });
  }

  // ---------- 給房間系統用的醒目訊息（不會被面板每秒重繪洗掉）----------
  let flashMsg = '', flashUntil = 0;
  function flash(msg, ms = 6000, kind) {
    flashMsg = msg || ''; flashUntil = performance.now() + ms;
    render();
    if (kind === 'error' || kind === 'info') toast(msg, kind);
  }
  function toast(msg, kind) {
    let t = document.getElementById('net-toast');
    if (!t) { t = document.createElement('div'); t.id = 'net-toast'; (document.getElementById('stage') || document.body).appendChild(t); }
    t.textContent = msg; t.className = 'show ' + (kind || '');
    clearTimeout(t._h); t._h = setTimeout(() => { t.className = ''; }, kind === 'error' ? 6000 : 3000);
  }

  async function push() {
    if (channel && status !== 'off') {
      try { await channel.track(Object.assign({ at: new Date().toISOString() }, me)); } catch (e) {}
    }
  }

  // 遊戲各處呼叫這個更新狀態，例如 Online.setActivity('playing', 'boss')
  function setActivity(activity, hero) {
    if (!me) return;
    me.activity = activity; me.hero = hero || null; push();
  }

  function disconnect() {
    if (channel && sb) { try { sb.removeChannel(channel); } catch (e) {} }
    channel = null; peers = []; status = 'off'; render();
  }

  // ---------- UI ----------
  function injectStyle() {
    if (document.getElementById('online-style')) return;
    const s = document.createElement('style');
    s.id = 'online-style';
    s.textContent = `
#online-panel{position:absolute;right:14px;bottom:14px;width:210px;background:rgba(12,8,16,.82);
  border:1px solid rgba(255,190,90,.35);border-radius:10px;padding:10px 12px;color:#f6e6cf;
  font-family:'Space Mono',monospace;font-size:12px;z-index:40;backdrop-filter:blur(4px)}
#online-panel.hidden{display:none}
#online-panel h4{margin:0 0 6px;font-size:11px;letter-spacing:.12em;color:#ffbe5a;text-transform:uppercase}
#online-panel .dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:middle}
.dot.on{background:#5ce08a;box-shadow:0 0 6px #5ce08a}.dot.off{background:#666}.dot.err{background:#e0645c}
#online-list{list-style:none;margin:0;padding:0;max-height:120px;overflow:auto}
#online-list li{padding:3px 0;border-bottom:1px dashed rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:6px}
#online-list li span.act{opacity:.55;font-size:10px}
#online-panel .om{opacity:.5;font-size:10px;margin-top:6px;line-height:1.5}
#online-panel button{margin-top:8px;width:100%;background:transparent;border:1px solid rgba(255,190,90,.4);
  color:#ffbe5a;border-radius:6px;padding:4px;font-family:inherit;font-size:11px;cursor:pointer}
#online-panel button:hover{background:rgba(255,190,90,.12)}
#online-list button{width:auto;margin:0 0 0 4px;padding:1px 7px;font-size:10px}
#online-list .invite-row{color:#ffe27a}
#online-panel button:disabled{opacity:.5;cursor:wait}
#online-panel .om.err{color:#ff8a7a;opacity:1}
#online-panel .om.flash{color:#ffe27a;opacity:1}
#net-toast{position:absolute;left:50%;top:18%;transform:translate(-50%,-10px);z-index:120;max-width:min(460px,86%);
  padding:12px 18px;border-radius:12px;background:rgba(20,10,24,.95);border:2px solid #ffbe5a;color:#f6e6cf;
  font-family:'Noto Serif TC',serif;font-size:15px;line-height:1.5;text-align:center;pointer-events:none;opacity:0;
  transition:opacity .2s ease,transform .25s cubic-bezier(.2,1.4,.4,1);box-shadow:0 8px 30px rgba(0,0,0,.5)}
#net-toast.show{opacity:1;transform:translate(-50%,0)}
#net-toast.error{border-color:#ff6a5a;color:#ffd6cf}`;
    document.head.appendChild(s);
  }

  const VER = (() => { const s = document.querySelector('script[src*="21-online.js"]'); const m = s && /\?v(\d+)/.exec(s.getAttribute('src')); return m ? 'v' + m[1] : ''; })();
  function ensurePanel() {
    injectStyle();
    let p = document.getElementById('online-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'online-panel';
      p.innerHTML = '<h4><span class="dot off"></span><span class="ttl">線上 ONLINE</span><span style="float:right;opacity:.45">' + VER + '</span></h4>'
                  + '<ul id="online-list"></ul><div class="om"></div>'
                  + '<div style="display:flex;gap:6px"><button id="online-mkroom-btn">開房間</button>'
                  + '<button id="online-joroom-btn">加入房間</button></div>';
      (document.getElementById('stage') || document.body).appendChild(p);
      p.querySelector('h4').addEventListener('click', () => { p.classList.toggle('expanded'); });
      p.querySelector('#online-mkroom-btn').addEventListener('click', () => {
        if (!window.NetMatch) return;
        Sound.init(); Sound.resume(); Sound.ui();
        if (NetMatch.active) NetMatch.reopen(); else NetMatch.createRoom();
      });
      p.querySelector('#online-joroom-btn').addEventListener('click', () => {
        const c = prompt('輸入 4 位數房間代號：');
        if (c && window.NetMatch) { Sound.init(); Sound.resume(); Sound.ui(); NetMatch.joinRoom(c); }
      });
    }
    return p;
  }

  const ACT = { title: '在大廳', select: '選英雄', mode: '挑賠注', playing: '對戰中', boss: '打魔王', ended: '結算中', room: '房間中' };

  // 自動偵測遊戲狀態，不必去改 09-match.js / 20-main.js
  function autoActivity() {
    if (!me) return;
    let a = 'title';
    if (window.NetMatch && NetMatch.active && !NetMatch.inMatch) a = 'room';
    else if (typeof state !== 'undefined') {
      if (state === 'playing') a = (typeof selectedMode !== 'undefined' && selectedMode === 'boss') ? 'boss' : 'playing';
      else if (state === 'ended') a = 'ended';
      else if (!document.getElementById('mode-screen').classList.contains('hidden')) a = 'mode';
      else if (!document.getElementById('select-screen').classList.contains('hidden')) a = 'select';
    }
    const h = (typeof selectedHero !== 'undefined') ? selectedHero : null;
    if (a !== me.activity || h !== me.hero) { me.activity = a; me.hero = h; push(); }
  }

  function render() {
    if (!enabled()) return;
    const p = ensurePanel();
    // 只在標題／房間／結算畫面顯示（選角詳情頁會被它擋住「確認出戰」）
    const vis = (id) => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); };
    const showPanel = (typeof state === 'undefined' || state !== 'playing') && (vis('title-screen') || vis('room-screen') || vis('end-screen'));
    p.classList.toggle('hidden', !showPanel);
    const busy = window.NetMatch && NetMatch.busy;
    const mk = p.querySelector('#online-mkroom-btn'), jo = p.querySelector('#online-joroom-btn');
    if (mk) { mk.disabled = !!busy; mk.textContent = busy ? '連線中…' : (window.NetMatch && NetMatch.active ? '回到房間' : '開房間'); }
    if (jo) { jo.disabled = !!busy; jo.classList.toggle('hidden', !!(window.NetMatch && NetMatch.active)); }
    const dot = p.querySelector('.dot');
    dot.className = 'dot ' + (status === 'online' ? 'on' : status === 'error' ? 'err' : 'off');
    p.querySelector('.ttl').textContent = status === 'online'
      ? `線上 ${peers.length + 1}`
      : status === 'connecting' ? '連線中…' : status === 'error' ? '連不上' : '離線';

    const ul = p.querySelector('#online-list');
    const rows = [];
    if (me) rows.push(`<li><b>${esc(me.name)}（你）</b><span class="act">${ACT[me.activity] || ''}</span></li>`);
    peers.forEach(x => {
      rows.push(`<li>${esc(x.name || '?')}<span class="act">${ACT[x.activity] || ''}</span></li>`);
    });
    ul.innerHTML = rows.join('') || '<li style="opacity:.5">還沒有人…</li>';
    const om = p.querySelector('.om');
    om.className = 'om';
    if (performance.now() < flashUntil && flashMsg) { om.textContent = flashMsg; om.classList.add('flash'); }
    else if (status === 'error') { om.textContent = '⚠ ' + (lastError || '連不上伺服器') + ' · 自動重試中，或直接按「開房間」再試'; om.classList.add('err'); }
    else if (status === 'connecting') om.textContent = '連線中…';
    else om.textContent = peers.length ? '' : '把網址傳給朋友，他一開就會出現在這裡。';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && channel) setTimeout(push, 800);
  });

  if (enabled()) {
    connect();
    setInterval(() => { autoActivity(); render(); }, 1000);
    window.addEventListener('beforeunload', disconnect);
  }

  function send(event, payload) {
    if (channel) { try { channel.send({ type: 'broadcast', event, payload }); } catch (e) {} }
  }

  return { connect, disconnect, setActivity, setName, render, send, ready, flash, toast,
    get lastError() { return lastError; },
    get client() { return sb; }, get id() { return myId(); },
    get myName() { return me ? me.name : myName(); },
    get peers() { return peers; }, get status() { return status; }, enabled };
})();

window.Online = Online;   // top-level const 不會自動掛上 window（第三次踩這坑了）
