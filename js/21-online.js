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
  }

  const enabled = () => !!(ONLINE_CFG.url && ONLINE_CFG.anonKey);

  async function connect() {
    if (!enabled() || channel) return;
    status = 'connecting'; render();
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      sb = createClient(ONLINE_CFG.url, ONLINE_CFG.anonKey);
    } catch (e) {
      status = 'error'; render(); return;
    }

    const id = myId();
    me = { name: myName() || ('玩家' + id.slice(0, 4)), activity: 'title', hero: null };

    channel = sb.channel(ONLINE_CFG.room, { config: { presence: { key: id } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const st = channel.presenceState();
        peers = Object.entries(st)
          .filter(([k]) => k !== id)
          .map(([k, metas]) => Object.assign({ id: k }, metas[0]));
        render();
      })
      .subscribe(async (s) => {
        if (s === 'SUBSCRIBED') { status = 'online'; await push(); render(); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { status = 'error'; render(); }
      });
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
#online-panel button:hover{background:rgba(255,190,90,.12)}`;
    document.head.appendChild(s);
  }

  function ensurePanel() {
    injectStyle();
    let p = document.getElementById('online-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'online-panel';
      p.innerHTML = '<h4><span class="dot off"></span><span class="ttl">線上 ONLINE</span></h4>'
                  + '<ul id="online-list"></ul><div class="om"></div>'
                  + '<button id="online-name-btn">改名字</button>';
      (document.getElementById('stage') || document.body).appendChild(p);
      p.querySelector('#online-name-btn').addEventListener('click', () => {
        const n = prompt('你的名字？', myName() || '');
        if (n && n.trim()) { setName(n.trim().slice(0, 16)); render(); }
      });
    }
    return p;
  }

  const ACT = { title: '在大廳', select: '選英雄', mode: '挑賠注', playing: '對戰中', boss: '打魔王', ended: '結算中' };

  // 自動偵測遊戲狀態，不必去改 09-match.js / 20-main.js
  function autoActivity() {
    if (!me) return;
    let a = 'title';
    if (typeof state !== 'undefined') {
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
    // 只在選單畫面顯示，打鬥時收起來
    p.classList.toggle('hidden', typeof state !== 'undefined' && state === 'playing');
    const dot = p.querySelector('.dot');
    dot.className = 'dot ' + (status === 'online' ? 'on' : status === 'error' ? 'err' : 'off');
    p.querySelector('.ttl').textContent = status === 'online'
      ? `線上 ${peers.length + 1}`
      : status === 'connecting' ? '連線中…' : status === 'error' ? '連不上' : '離線';

    const ul = p.querySelector('#online-list');
    const rows = [];
    if (me) rows.push(`<li><b>${esc(me.name)}（你）</b><span class="act">${ACT[me.activity] || ''}</span></li>`);
    peers.forEach(x => rows.push(`<li>${esc(x.name || '?')}<span class="act">${ACT[x.activity] || ''}</span></li>`));
    ul.innerHTML = rows.join('') || '<li style="opacity:.5">還沒有人…</li>';
    p.querySelector('.om').textContent = peers.length ? '' : '把網址傳給朋友，他一開就會出現在這裡。';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  if (enabled()) {
    connect();
    setInterval(() => { autoActivity(); render(); }, 1000);
    window.addEventListener('beforeunload', disconnect);
  }

  return { connect, disconnect, setActivity, setName, render, get peers() { return peers; }, get status() { return status; }, enabled };
})();
