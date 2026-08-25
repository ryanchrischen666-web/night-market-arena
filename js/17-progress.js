'use strict';

// ============ PROGRESS：夜市幣 · 等級 · 成就 ============

// ---- 等級曲線：第 N 級需要 80 + 40*(N-1) 點經驗 ----
function xpNeededFor(level) { return 80 + 40 * (level - 1); }
function levelFromXp(xp) {
  let lv = 1, left = xp;
  while (left >= xpNeededFor(lv) && lv < 99) { left -= xpNeededFor(lv); lv++; }
  return { level: lv, into: left, need: xpNeededFor(lv) };
}

// ---- 成就 ----
const ACHIEVEMENTS = [
  { id: 'student',    cn: '出師',       en: 'Graduated',      icon: '書', desc: '完成教學' },
  { id: 'first_win',  cn: '初戰告捷',   en: 'First Blood',    icon: '初', desc: '贏得第一場戰鬥' },
  { id: 'swarm',      cn: '以一敵三',   en: 'Outnumbered',    icon: '圍', desc: '在 1v3 圍攻中獲勝' },
  { id: 'boss_slayer',cn: '屠鍋英雄',   en: 'Cauldron Slayer',icon: '鍋', desc: '打倒滷味鍋大王' },
  { id: 'flawless',   cn: '毫髮無傷',   en: 'Flawless',       icon: '完', desc: '滿血通關一場戰鬥' },
  { id: 'speed',      cn: '速戰速決',   en: 'Lightning',      icon: '快', desc: '60 秒內通關' },
  { id: 'duo',        cn: '雙人同心',   en: 'Better Together',icon: '雙', desc: '和朋友一起通關' },
  { id: 'taster',     cn: '淺嚐三味',   en: 'Three Flavors',  icon: '三', desc: '用 3 位不同英雄各贏一場' },
  { id: 'allrounder', cn: '八味俱全',   en: 'Full Menu',      icon: '八', desc: '用全部 8 位英雄各贏一場' },
  { id: 'kills50',    cn: '夜市殺手',   en: 'Night Hunter',   icon: '50', desc: '累計擊倒 50 位對手' },
  { id: 'kills200',   cn: '鐵板傳說',   en: 'Griddle Legend', icon: '200',desc: '累計擊倒 200 位對手' },
  { id: 'rich',       cn: '小富翁',     en: 'Coin Collector', icon: '幣', desc: '累計賺得 500 夜市幣' },
];

// ---- 夜市攤位商品（造型，純裝飾，用遊戲內幣購買）----
const SHOP_ITEMS = [
  { id: 'trail_lantern', kind: 'trail', cn: '燈籠火',   en: 'Lantern Trail', cost: 120, color: '#f4a93c' },
  { id: 'trail_ink',     kind: 'trail', cn: '墨跡',     en: 'Ink Trail',     cost: 150, color: '#8a7fd0' },
  { id: 'trail_sugar',   kind: 'trail', cn: '糖霜',     en: 'Sugar Trail',   cost: 180, color: '#ff9ec4' },
  { id: 'trail_jade',    kind: 'trail', cn: '青玉',     en: 'Jade Trail',    cost: 200, color: '#4fd1c5' },
  { id: 'title_rookie',  kind: 'title', cn: '新手上路', en: 'Rookie',        cost: 0 },
  { id: 'title_swarm',   kind: 'title', cn: '亂鬥王',   en: 'Brawler',       cost: 220, needAch: 'swarm' },
  { id: 'title_boss',    kind: 'title', cn: '屠鍋者',   en: 'Slayer',        cost: 250, needAch: 'boss_slayer' },
  { id: 'title_master',  kind: 'title', cn: '夜市之王', en: 'Night King',    cost: 400, needLevel: 8 },
];

const Progress = (() => {
  const d = () => Save.d;

  function level() { return levelFromXp(d().xp); }
  function has(achId) { return !!d().ach[achId]; }
  function owns(itemId) { return d().owned.indexOf(itemId) >= 0; }

  // 商品是否已達解鎖條件（等級／成就）
  function unlockedFor(item) {
    if (item.needAch && !has(item.needAch)) return false;
    if (item.needLevel && level().level < item.needLevel) return false;
    return true;
  }

  function grant(achId, out) {
    if (has(achId)) return;
    d().ach[achId] = Date.now();
    const a = ACHIEVEMENTS.find(x => x.id === achId);
    if (a && out) out.push(a);
  }

  // 一場戰鬥結束後結算：回傳這場賺到的東西
  function finishMatch(c) {
    const s = d();
    const unlocked = [];
    let newRecord = false;
    const lvBefore = level().level;

    s.matches++;
    s.kills += c.kills;

    // --- 夜市幣 ---
    let coins = 20 + c.kills * 8;
    if (c.victory) {
      coins += 50;
      if (c.mode === 'boss') coins += 150;
      else if (c.mode === '1v3') coins += 30;
      else if (c.mode === '1v2') coins += 15;
    }
    // --- 經驗 ---
    let xp = (c.victory ? 60 : 20) + c.kills * 5;
    if (c.victory && c.mode === 'boss') xp += 100;

    s.coins += coins;
    s.xp += xp;

    if (c.victory) {
      s.wins++;
      s.heroWins[c.heroId] = (s.heroWins[c.heroId] || 0) + 1;
      if (c.coop && c.hero2) s.heroWins[c.hero2] = (s.heroWins[c.hero2] || 0) + 1;
      s.modeWins[c.mode] = (s.modeWins[c.mode] || 0) + 1;

      const key = c.heroId + '|' + c.mode;
      const prev = s.best[key];
      newRecord = (prev === undefined || c.seconds < prev);
      if (newRecord) s.best[key] = c.seconds;

      grant('first_win', unlocked);
      if (c.mode === 'boss') grant('boss_slayer', unlocked);
      if (c.mode === '1v3') grant('swarm', unlocked);
      if (c.coop) grant('duo', unlocked);
      if (c.hpLeft >= c.maxHp) grant('flawless', unlocked);
      if (c.seconds <= 60) grant('speed', unlocked);
      const distinct = Object.keys(s.heroWins).length;
      if (distinct >= 3) grant('taster', unlocked);
      if (distinct >= HERO_ORDER.length) grant('allrounder', unlocked);
    }

    if (s.kills >= 50) grant('kills50', unlocked);
    if (s.kills >= 200) grant('kills200', unlocked);
    if (s.coins >= 500) grant('rich', unlocked);

    Save.save();
    const lvAfter = level().level;
    return { coins, xp, unlocked, levelUp: lvAfter > lvBefore, level: lvAfter,
             newRecord: c.victory && newRecord, seconds: c.seconds };
  }

  function buy(itemId) {
    const s = d();
    const item = SHOP_ITEMS.find(x => x.id === itemId);
    if (!item || owns(itemId) || !unlockedFor(item)) return false;
    if (s.coins < item.cost) return false;
    s.coins -= item.cost;
    s.owned.push(itemId);
    Save.save();
    return true;
  }

  function equip(itemId) {
    const item = SHOP_ITEMS.find(x => x.id === itemId);
    if (!item || !owns(itemId)) return false;
    d().equipped[item.kind] = (d().equipped[item.kind] === itemId) ? null : itemId;
    Save.save();
    return true;
  }

  function equippedItem(kind) {
    const id = d().equipped[kind];
    return id ? SHOP_ITEMS.find(x => x.id === id) : null;
  }

  function bestTime(heroId, mode) { return d().best[heroId + '|' + mode]; }
  function heroWins(heroId) { return d().heroWins[heroId] || 0; }

  function completeTutorial() {
    if (d().tutorialDone) return [];
    d().tutorialDone = true;
    const out = [];
    grant('student', out);
    Save.save();
    return out;
  }

  return { level, has, owns, unlockedFor, finishMatch, buy, equip,
           equippedItem, bestTime, heroWins, completeTutorial,
           get coins() { return d().coins; } };
})();
