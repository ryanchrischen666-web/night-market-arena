'use strict';

// ============ MATCH START ============
function startMatch(heroId, mode, opts = {}) {
  coop = !!opts.coop;
  const h = HEROES[heroId];
  currentMap = buildMap();
  players = [];
  player = makePlayer(heroId, 0);
  players.push(player);
  if (coop) players.push(makePlayer(opts.hero2 || heroId, 1));
  enemies = []; projectiles = []; particles = []; zones = []; dmgTexts = [];
  totalKills = 0;
  currentMode = mode;
  runStart = performance.now();

  // Spawn opponents
  const opps = coop
    ? shuffle(HERO_ORDER.filter(id => id !== heroId && id !== opts.hero2)).slice(0, MODES[mode].count)
    : (window.__previewedOpps || pickOpponents(heroId, MODES[mode].count));
  const m = MODES[mode];
  const positions = m.count === 1
    ? [{ x: W/2, y: 120 }]
    : m.count === 2
    ? [{ x: W*0.35, y: 100 }, { x: W*0.65, y: 100 }]
    : [{ x: W*0.25, y: 100 }, { x: W*0.5, y: 80 }, { x: W*0.75, y: 100 }];

  for (let i = 0; i < opps.length; i++) {
    spawnEnemyHero(opps[i], positions[i].x, positions[i].y, m);
  }
  boss = null;
  if (mode === 'boss') spawnBoss();
  players.forEach(resolveBlocks);
  enemies.forEach(resolveBlocks);

  state = 'playing';
  document.getElementById('mode-screen').classList.add('hidden');
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('mode-label').textContent = (coop ? '雙人 ' : '') + mode.toUpperCase();
  document.getElementById('controls-hint').innerHTML = coop
    ? 'P1 <b>WASD</b>+<b>滑鼠</b>+<b>Q E R</b>  \u00b7  P2 <b>方向鍵</b>+<b>右Shift</b>+<b>, . /</b>'
    : '<b>WASD</b> 移動 \u00b7 <b>滑鼠</b> 瞑準 \u00b7 <b>點擊</b> 攻擊 \u00b7 <b>Q E R</b> 技能';
  buildAbilityBar();
  if (touchMode) buildMobileButtons();
  document.body.classList.add('playing');
  Sound.init(); Sound.resume(); Sound.matchStart(); Sound.startMusic(currentMap.theme);
  showMatchBanner(mode === 'boss' ? '魔王戰 \u00b7 BOSS' : ((coop ? '雙人 \u00b7 ' : '') + mode.toUpperCase()), mode === 'boss' ? ((coop ? h.cn + ' + ' + HEROES[opts.hero2 || heroId].cn : h.cn) + ' vs 滷味鍋大王') : ((coop ? h.cn + ' + ' + HEROES[opts.hero2 || heroId].cn : h.cn) + ' vs ' + opps.map(id => HEROES[id].cn).join(' + ')));
  updateHud();
}

function spawnEnemyHero(id, x, y, modeMul) {
  const h = HEROES[id];
  enemies.push({
    id, x, y,
    r: 17,
    color: h.color, emoji: h.emoji, name: h.name,
    hp: Math.round(h.hp * modeMul.hpMul),
    maxHp: Math.round(h.hp * modeMul.hpMul),
    speed: h.speed * 0.72, // AI mobility (was 0.55 — too passive)
    dmg: h.atkDmg * 0.85,  // AI does slightly less damage than player baseline
    dmgMul: modeMul.dmgMul,
    atkRange: h.atkRange,
    atkCd: h.atkCd * 1.3,  // AI fires a bit slower than the player
    ranged: h.atkRange > 100,
    atkTimer: rand(0.3, 1.0),
    aiSpecial: h.aiSpecial,
    aiSpecialCd: h.aiSpecialCd,
    aiSpecialTimer: rand(2, 4),
    aimSkill: clamp(0.55 + (modeMul.dmgMul - 0.75) * 0.55, 0.5, 0.85),
    dodgeSkill: clamp(0.45 + (modeMul.dmgMul - 0.75) * 0.6, 0.4, 0.78),
    strafeDir: Math.random() < 0.5 ? 1 : -1, strafeT: rand(0.5, 1.5),
    retreatT: 0, dodgeCd: 0, _dodgeSide: 0, _dodgeAng: 0, lastSeen: null,
    vx: 0, vy: 0,
    stun: 0, frozen: 0, slow: 0, slowMul: 1,
    burning: 0, burnDmg: 0, burnTick: 0,
    hitFlash: 0,
    invisible: 0,
    vanishStrikeTimer: 0,
    dashing: 0, dashAng: 0, dashSpeed: 0,
    shield: 0, shieldMul: 1,
    dead: false,
  });
}

function buildAbilityBar() {
  const bar = document.getElementById('abilities-bar');
  bar.innerHTML = '';
  player.abilities.forEach((a, i) => {
    const el = document.createElement('div');
    el.className = 'ability ready';
    el.innerHTML = `<div class="ability-key">${a.key}</div><div>${a.icon}</div><div class="ability-name">${a.name}</div><div class="cd-overlay" style="display:none"></div>`;
    bar.appendChild(el);
  });
}

function updateAbilityBar() {
  const bar = document.getElementById('abilities-bar');
  player.abilities.forEach((a, i) => {
    const el = bar.children[i];
    const cdEl = el.querySelector('.cd-overlay');
    if (a.timer > 0) { cdEl.style.display = 'flex'; cdEl.textContent = a.timer.toFixed(1); el.classList.remove('ready'); }
    else { cdEl.style.display = 'none'; el.classList.add('ready'); }
  });
}

function tryCast(i) {
  const ab = player.abilities[i];
  if (!ab || ab.timer > 0) return;
  ab.cast();
  Sound.ability(ab.name);
  ab.timer = ab.cd;
}

function updateHud() {
  const p1 = players[0];
  if (p1) {
    document.getElementById('hp-fill').style.width = (100 * Math.max(0, p1.hp) / p1.maxHp) + '%';
    document.getElementById('hp-text').textContent = `${Math.max(0, Math.round(p1.hp))} / ${p1.maxHp}`;
  }
  document.getElementById('enemies-left').textContent = enemies.filter(e => !e.dead).length;
  const _bb = document.getElementById('boss-bar');
  if (_bb) {
    if (currentMode === 'boss' && boss && !boss.dead) {
      _bb.classList.remove('hidden');
      document.getElementById('boss-bar-fill').style.width = (100 * Math.max(0, boss.hp) / boss.maxHp) + '%';
      _bb.classList.toggle('enraged', !!boss.enraged);
    } else { _bb.classList.add('hidden'); }
  }
  const p2el = document.getElementById('hud-p2');
  if (p2el) {
    if (coop && players[1]) {
      const p2 = players[1];
      p2el.classList.remove('hidden');
      p2el.classList.toggle('down', !!p2.dead);
      document.getElementById('hp2-name').textContent = HEROES[p2.id].cn;
      document.getElementById('hp2-fill').style.width = (100 * Math.max(0, p2.hp) / p2.maxHp) + '%';
      document.getElementById('hp2-text').textContent = `${Math.max(0, Math.round(p2.hp))} / ${p2.maxHp}`;
      const pips = document.getElementById('p2-cds');
      if (pips) p2.abilities.forEach((a, idx) => { const pip = pips.children[idx]; if (pip) { pip.textContent = a.icon; pip.classList.toggle('cooling', a.timer > 0); } });
    } else {
      p2el.classList.add('hidden');
    }
  }
  if (touchMode && players[0]) {
    const _ab = players[0].abilities, _tb = ['tb-q', 'tb-e', 'tb-r'];
    for (let i = 0; i < 3; i++) { const b = document.getElementById(_tb[i]); if (b && _ab[i]) b.classList.toggle('cooling', _ab[i].timer > 0); }
  }
}

function showMatchBanner(text, sub = '') {
  const b = document.getElementById('match-banner');
  b.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  b.classList.add('show');
  setTimeout(() => b.classList.remove('show'), 1800);
}

function endGame(victory) {
  state = 'ended';
  document.body.classList.remove('playing');
  Sound.stopMusic(); if (victory) Sound.win(); else Sound.lose();
  document.getElementById('hud').classList.add('hidden');
  const screen = document.getElementById('end-screen');
  screen.classList.remove('hidden');
  const titleEl = document.getElementById('end-title');
  titleEl.innerHTML = victory ? '勝利<span class="end-en">VICTORY</span>' : '敗北<span class="end-en">DEFEAT</span>';
  titleEl.className = 'end-title ' + (victory ? 'win' : 'lose');
  const time = ((performance.now() - runStart) / 1000).toFixed(1);
  document.getElementById('end-stats').innerHTML = victory
    ? (coop
        ? `P1 <span>${HEROES[players[0].id].cn}</span> + P2 <span>${HEROES[players[1].id].cn}</span> 通關 <span>${currentMode.toUpperCase()}</span>！<br>時間 Time <span>${time}s</span> · 擊倒 Kills <span>${totalKills}</span>`
        : `以 <span>${HEROES[selectedHero].cn}</span> 在 <span>${currentMode.toUpperCase()}</span> 稱霸夜市！<br>時間 Time <span>${time}s</span> · 剩血 HP <span>${Math.round(player.hp)}/${player.maxHp}</span>`)
    : (coop
        ? `兩位英雄都在鐵板混戰中倒下<br>模式 Mode <span>${currentMode.toUpperCase()}</span> · 擊倒 Kills <span>${totalKills}</span>`
        : `<span>${HEROES[selectedHero].cn}</span> 在鐵板混戰中倒下了<br>模式 Mode <span>${currentMode.toUpperCase()}</span> · 擊倒 Kills <span>${totalKills}</span>`);
}

