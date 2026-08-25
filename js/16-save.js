'use strict';

// ============ SAVE (localStorage, 本機、不上傳、無帳號) ============
// 存檔失敗時（無痕模式、file:// 被鎖）自動退回記憶體模式，遊戲照常能玩。
const Save = (() => {
  const KEY = 'nma_save_v1';
  const FRESH = () => ({
    v: 1,
    coins: 0, xp: 0,
    matches: 0, wins: 0, kills: 0,
    heroWins: {},   // heroId -> 勝場數
    modeWins: {},   // mode   -> 勝場數
    best: {},       // "hero|mode" -> 最佳秒數
    ach: {},        // achId  -> 解鎖時間戳
    owned: [],      // 已購買的造型 id
    equipped: { trail: null, title: null },
    seenHowTo: false, tutorialDone: false,
  });

  let mem = FRESH();
  let usable = true;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.v === 1) mem = Object.assign(FRESH(), d);
      }
    } catch (e) { usable = false; }   // 無痕/被鎖 -> 記憶體模式
    return mem;
  }

  let pending = null;
  function flush() {
    pending = null;
    if (!usable) return;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); }
    catch (e) { usable = false; }
  }
  function save() {                    // 合併多次寫入，避免每幀都碰 localStorage
    if (pending) return;
    pending = setTimeout(flush, 200);
  }

  function reset() { mem = FRESH(); flush(); }

  return {
    load, save, reset,
    get d() { return mem; },
    get persistent() { return usable; },
  };
})();

Save.load();
