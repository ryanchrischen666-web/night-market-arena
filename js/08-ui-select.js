'use strict';

// ============ HERO SELECT UI ============
function ownedHero(id) {
  const h = HEROES[id];
  return !h.premium || (Save.d.heroesOwned || []).includes(id);
}

let heroGridMode = 'select';   // select＝挑角出戰；browse＝角色介紹（標題頁進來）

function renderHeroCards(mode) {
  if (mode) heroGridMode = mode;
  const grid = document.getElementById('heroes-grid');
  grid.innerHTML = '';
  for (const id of HERO_ORDER) {
    const h = HEROES[id];
    const locked = !ownedHero(id);
    const wins = Progress.heroWins(id);
    const card = document.createElement('div');
    card.className = 'hero-card hc-simple' + (locked ? ' locked' : '');
    card.dataset.id = id;
    card.innerHTML = `
      ${wins ? `<div class="hero-badge">★ ${wins}</div>` : ''}
      ${locked ? `<div class="hero-lock">🔒 NT$${h.priceNTD}</div>` : ''}
      ${h.premium && !locked ? `<div class="hero-lock owned-tag">已擁有</div>` : ''}
      <div class="hero-emoji"><canvas class="hero-cv" width="96" height="96"></canvas></div>
      <div class="hero-cn">${h.cn}</div>
      <div class="hero-name">${h.name}</div>
    `;
    card.addEventListener('click', () => { Sound.ui(); openHeroDetail(id); });
    grid.appendChild(card);
    renderHeroIcon(card.querySelector('.hero-cv'), id);
  }
}

// ---------- 英雄詳情 ----------
let hdCurrent = null;
function openHeroDetail(id) {
  hdCurrent = id;
  const h = HEROES[id];
  const L = HERO_LORE[id] || { tCn: '', tEn: '', rCn: '', aCn: [] };
  document.getElementById('select-screen').classList.add('hidden');
  const scr = document.getElementById('hero-detail-screen');
  scr.classList.remove('hidden');
  renderHeroIcon(document.getElementById('hd-art'), id);
  document.getElementById('hd-cn').textContent = h.cn;
  document.getElementById('hd-en').textContent = h.name;
  document.getElementById('hd-title').textContent = L.tCn + ' · ' + L.tEn;
  document.getElementById('hd-role').textContent = L.rCn + ' ' + h.role;
  document.getElementById('hd-range').textContent = h.atkRange < 100 ? '近戰 Melee' : (id === 'chicken' ? '穿透波 Pierce' : '遠程 Ranged');
  const mx = { hp: 0, sp: 0, dm: 0 };
  for (const k of HERO_ORDER) { const x = HEROES[k]; mx.hp = Math.max(mx.hp, x.hp); mx.sp = Math.max(mx.sp, x.speed); mx.dm = Math.max(mx.dm, x.atkDmg); }
  document.getElementById('hd-bars').innerHTML = `
    <div class="hb"><i>血量</i><span><b style="width:${Math.round(100 * h.hp / mx.hp)}%"></b></span><em>${h.hp}</em></div>
    <div class="hb"><i>速度</i><span><b style="width:${Math.round(100 * h.speed / mx.sp)}%"></b></span><em>${h.speed.toFixed(1)}</em></div>
    <div class="hb"><i>攻擊</i><span><b style="width:${Math.round(100 * h.atkDmg / mx.dm)}%"></b></span><em>${h.atkDmg}</em></div>`;
  document.getElementById('hd-abilities').innerHTML = h.abilities.map((a, i) => `
    <div class="hd-ab"><span class="hd-key">${a.key}</span><span class="hd-ic">${a.icon}</span>
    <div><b>${(L.aCn && L.aCn[i]) || a.name}</b><small>${a.name} · 冷卻 ${a.cd}s</small></div></div>`).join('');
  const locked = !ownedHero(id);
  const cf = document.getElementById('hd-confirm'), buy = document.getElementById('hd-buy');
  buy.classList.toggle('hidden', !locked);
  cf.classList.toggle('hidden', locked || heroGridMode !== 'select');
}
function closeHeroDetail() {
  document.getElementById('hero-detail-screen').classList.add('hidden');
  document.getElementById('select-screen').classList.remove('hidden');
}

// ---------- 模擬付款 ----------
function openPayModal() {
  const m = document.getElementById('pay-modal');
  m.classList.remove('hidden');
  m.querySelectorAll('input').forEach(i => { i.value = ''; });
  document.getElementById('pay-submit').disabled = true;
}
(function wireHeroUI() {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('hd-back', () => { Sound.uiBack(); closeHeroDetail(); });
  on('hd-confirm', () => {
    if (!hdCurrent || !ownedHero(hdCurrent)) return;
    Sound.ui(); selectedHero = hdCurrent;
    document.getElementById('hero-detail-screen').classList.add('hidden');
    goToModeScreen();
  });
  on('hd-buy', () => { Sound.ui(); openPayModal(); });
  on('pay-cancel', () => { Sound.uiBack(); document.getElementById('pay-modal').classList.add('hidden'); });
  const inputs = ['pay-card', 'pay-exp', 'pay-cvc', 'pay-name', 'pay-email'];
  const check = () => {
    document.getElementById('pay-submit').disabled =
      !inputs.every(i => document.getElementById(i).value.trim().length > 0);
  };
  inputs.forEach(i => {
    const el = document.getElementById(i);
    el.addEventListener('input', check);
    el.addEventListener('keydown', (e) => e.stopPropagation());
  });
  on('pay-submit', () => {
    if (document.getElementById('pay-submit').disabled) return;
    Save.d.heroesOwned = Save.d.heroesOwned || [];
    if (!Save.d.heroesOwned.includes('chicken')) Save.d.heroesOwned.push('chicken');
    Save.save();
    document.getElementById('pay-modal').classList.add('hidden');
    Sound.win();
    if (typeof UI !== 'undefined' && UI.renderTitleMeta) UI.renderTitleMeta();
    renderHeroCards();
    if (hdCurrent) openHeroDetail(hdCurrent);   // 重新整理按鈕狀態
  });
})();

// ============ MODE SELECT UI ============
function setupModeSelect() {
  const cards = document.querySelectorAll('.mode-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      Sound.ui();
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMode = card.dataset.mode;
      document.getElementById('begin-btn').classList.remove('hidden');
      updateVsPreview();
    });
  });
}

function updateVsPreview() {
  const preview = document.getElementById('vs-preview');
  if (!selectedHero || !selectedMode) return;
  if (selectedMode === 'boss') {
    const youHero = HEROES[selectedHero];
    preview.innerHTML = `<span class="you"><canvas class="vs-cv" width="44" height="44" data-id="${selectedHero}"></canvas>${youHero.cn}</span><span class="vs">VS</span><span class="vs-foe vs-boss">🍲 滷味鍋大王</span>`;
    preview.querySelectorAll('.vs-cv').forEach(cv => renderHeroIcon(cv, cv.dataset.id));
    preview.classList.add('show');
    window.__previewedOpps = [];
    return;
  }
  const opps = pickOpponents(selectedHero, MODES[selectedMode].count);
  const youHero = HEROES[selectedHero];
  preview.innerHTML = `<span class="you"><canvas class="vs-cv" width="44" height="44" data-id="${selectedHero}"></canvas>${youHero.cn}</span><span class="vs">VS</span>` + opps.map(id => `<span class="vs-foe"><canvas class="vs-cv" width="44" height="44" data-id="${id}"></canvas>${HEROES[id].cn}</span>`).join('<span class="vs-dot">·</span>');
  preview.querySelectorAll('.vs-cv').forEach(cv => renderHeroIcon(cv, cv.dataset.id));
  preview.classList.add('show');
  // Stash so begin uses same opponents
  window.__previewedOpps = opps;
}

function pickOpponents(playerId, count) {
  const pool = HERO_ORDER.filter(id => id !== playerId);
  return shuffle(pool).slice(0, count);
}

