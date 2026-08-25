'use strict';

// ============ HERO SELECT UI ============
function renderHeroCards() {
  const grid = document.getElementById('heroes-grid');
  grid.innerHTML = '';
  for (const id of HERO_ORDER) {
    const h = HEROES[id];
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.dataset.id = id;
    const L = HERO_LORE[id] || { tCn:'', tEn:'', rCn:'', aCn:[] };
    const wins = Progress.heroWins(id);
    const badge = wins ? `<div class="hero-badge" title="通關 ${wins} 場">\u2605 ${wins}</div>` : '';
    card.innerHTML = `
      ${badge}
      <div class="hero-emoji"><canvas class="hero-cv" width="84" height="84"></canvas></div>
      <div class="hero-name">${h.name}</div>
      <div class="hero-cn">${h.cn}</div>
      <div class="hero-title">${L.tCn} · ${L.tEn}</div>
      <div class="hero-role"><span class="rcn">${L.rCn}</span> ${h.role}</div>
      <div class="hero-stats"><b>HP</b> ${h.hp} · <b>SPD</b> ${h.speed.toFixed(1)} · <b>${h.atkRange < 100 ? '近戰 Melee' : '遠程 Ranged'}</b></div>
      <div class="hero-abilities">
        ${h.abilities.map((a, i) => `<div><span class="key">${a.key}</span>${a.icon} <span class="acn">${(L.aCn && L.aCn[i]) || ''}</span> ${a.name}</div>`).join('')}
      </div>
    `;
    card.addEventListener('click', () => {
      Sound.ui();
      document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      document.getElementById('confirm-hero-btn').classList.remove('hidden');
      selectedHero = id;
    });
    grid.appendChild(card);
    renderHeroIcon(card.querySelector('.hero-cv'), id);
  }
}

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

