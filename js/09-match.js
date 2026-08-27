'use strict';

// ============ MATCH START ============
function startMatch(heroId, mode, opts = {}) {
  const h = HEROES[heroId];
  currentMap = buildMap();
  players = [];
  player = makePlayer(heroId, 0);
  players.push(player);
  enemies = []; projectiles = []; particles = []; zones = []; dmgTexts = [];
  totalKills = 0;
  resetMatchStats();
  if (window.NetMatch && NetMatch.resetPeerDamage) NetMatch.resetPeerDamage();
  currentMode = mode;
  runStart = performance.now();

  // Spawn opponents
  const opps = window.__previewedOpps || pickOpponents(heroId, MODES[mode].count);
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
  // 關掉所有選單畫面（教學可從標題直接開打，不只從模式畫面進來）
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('mode-label').textContent = mode === 'tutorial' ? '教學 TUTORIAL' : mode.toUpperCase();
  document.getElementById('controls-hint').innerHTML = '<b>WASD</b> 移動 \u00b7 <b>滑鼠</b> 瞄準 \u00b7 <b>點擊</b> 攻擊 \u00b7 <b>Q E R</b> 技能';
  buildAbilityBar();
  const _nm = (window.PlayerName && PlayerName.get()) || '';
  const _nmEl = document.getElementById('hp-name');
  if (_nmEl) { _nmEl.textContent = _nm; _nmEl.classList.toggle('hidden', !_nm); }
  if (touchMode) buildMobileButtons();
  document.body.classList.add('playing');
  Sound.init(); Sound.resume(); Sound.matchStart(); Sound.startMusic(currentMap.theme);
  showMatchBanner(mode === 'boss' ? '魔王戰 \u00b7 BOSS' : mode.toUpperCase(),
    mode === 'boss' ? h.cn + ' vs 滷味鍋大王' : h.cn + ' vs ' + opps.map(id => HEROES[id].cn).join(' + '));
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
    ccDr: 0, ccDrTimer: 0,
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
  if (player === players[0] && player.id === 'chicken' && i === 2 && player.feastT > 0) {
    player.feastT = 0; Sound.uiBack(); return;   // 再按一次：提前收攤
  }
  if (!ab || ab.timer > 0) return;
  if (player === players[0] && (player.stunT > 0 || player.frozenT > 0)) return;
  // A cast that returns false fizzled (no valid target) and costs no cooldown.
  if (ab.cast() === false) return;
  if (window.NetMatch && NetMatch.active && player === players[0]) NetMatch.sendCast(i, mouse.x, mouse.y);
  Sound.ability(ab.name);
  ab.timer = ab.cd;
  Tutorial.onCast(i);
}

function updateHud() {
  const p1 = players[0];
  if (p1) {
    document.getElementById('hp-fill').style.width = (100 * Math.max(0, p1.hp) / p1.maxHp) + '%';
    document.getElementById('hp-text').textContent = `${Math.max(0, Math.round(p1.hp))} / ${p1.maxHp}`;
  }
  document.getElementById('enemies-left').textContent = (window.NetMatch && NetMatch.inMatch)
    ? enemies.filter(e => !e.dead && e.hostileNet).length
    : enemies.filter(e => !e.dead).length;
  const _bb = document.getElementById('boss-bar');
  if (_bb) {
    if (currentMode === 'boss' && boss && !boss.dead) {
      _bb.classList.remove('hidden');
      document.getElementById('boss-bar-fill').style.width = (100 * Math.max(0, boss.hp) / boss.maxHp) + '%';
      _bb.classList.toggle('enraged', !!boss.enraged);
    } else { _bb.classList.add('hidden'); }
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
  if (state === 'ended') return;   // 防止重複結算（獎勵發兩次）
  state = 'ended';
  document.body.classList.remove('playing');
  Sound.stopMusic(); if (victory) Sound.win(); else Sound.lose();
  document.getElementById('hud').classList.add('hidden');

  const seconds = (performance.now() - runStart) / 1000;
  const heroId = players[0] ? players[0].id : selectedHero;
  const online = !!(window.NetMatch && NetMatch.inMatch);
  renderEndScreen({ victory, heroId, seconds, online });

  // 結算獎勵：夜市幣 · 經驗 · 成就 · 最佳紀錄
  UI.showRewards(Progress.finishMatch({
    victory, mode: currentMode,
    heroId,
    kills: totalKills, seconds: parseFloat(seconds.toFixed(1)),
    hpLeft: player ? player.hp : 0, maxHp: player ? player.maxHp : 1,
  }));
}

// 連線時「我打出的傷害」= 對手回報的 dmgFrom[我的 id]；單機直接用本地累計。
function damageDealtThisMatch(online) {
  if (online && window.NetMatch && NetMatch.myDamageDealt) return NetMatch.myDamageDealt();
  return matchStats.dmgDealt;
}

// 敗北時給一句具體的下一步；線上對戰不給（叫人「改玩 1v1」對真人沒意義）
function defeatAdvice({ heroId, seconds, dealt, taken, online }) {
  if (online) return '';
  const h = HEROES[heroId];
  if (seconds < 15) return '這場結束得有點快 —— 先玩 1v1 模式，熟悉節奏再挑戰多打一。';
  if (h && h.hp <= 140) return `${h.cn}很脆，一被抓住就沒了。試試血比較厚的蔥油餅或臭豆腐。`;
  if (taken > dealt * 2) return '你挨的傷害是打出去的兩倍以上 —— 多用場上的攤位擋視線，別站在空地對拼。';
  if (currentMode === '1v3' && totalKills > 0) return '1v3 場面太擠了，你已經拿到擊殺，先回 1v2 練走位。';
  return '再來一次，你已經很接近了。';
}

const END_ROW_STAGGER = 120;   // ms，與 --end-row-stagger 對齊

function renderEndScreen({ victory, heroId, seconds, online }) {
  const screen = document.getElementById('end-screen');
  const titleEl = document.getElementById('end-title');
  titleEl.innerHTML = victory ? '勝利<span class="end-en">VICTORY</span>' : '敗北<span class="end-en">DEFEAT</span>';
  titleEl.className = 'end-title ' + (victory ? 'win' : 'lose');
  const _ep = document.getElementById('end-player');
  const _epn = (window.PlayerName && PlayerName.get()) || '';
  if (_ep) { _ep.textContent = _epn ? _epn + ' 的戰績' : ''; _ep.classList.toggle('hidden', !_epn); }

  const dealt = Math.round(damageDealtThisMatch(online));
  const taken = Math.round(matchStats.dmgTaken);
  const rows = [
    ['擊殺數', String(totalKills)],
    ['總傷害', dealt.toLocaleString('en-US')],
    ['承受傷害', taken.toLocaleString('en-US')],
    ['存活時間', seconds.toFixed(1) + 's'],
  ];
  const list = document.getElementById('end-stat-rows');
  list.innerHTML = '';
  rows.forEach(([label, value], i) => {
    const li = document.createElement('li');
    li.style.setProperty('--row-delay', (700 + i * END_ROW_STAGGER) + 'ms');
    li.innerHTML = `<span class="label"></span><span class="dots"></span><span class="value"></span>`;
    li.querySelector('.label').textContent = label;
    li.querySelector('.value').textContent = value;
    list.appendChild(li);
  });

  const adviceEl = document.getElementById('end-advice');
  const advice = victory ? '' : defeatAdvice({ heroId, seconds, dealt, taken, online });
  adviceEl.textContent = advice;
  adviceEl.classList.toggle('hidden', !advice);

  const tail = 700 + rows.length * END_ROW_STAGGER + 260;
  screen.style.setProperty('--tail-delay', tail + 'ms');
  screen.classList.remove('hidden', 'settled');
  void screen.offsetWidth;          // restart the animation on a rematch
  screen.classList.add('animate');
  armEndSkip(screen);
}

// 點一下或按任意鍵就直接跳到最終畫面
function armEndSkip(screen) {
  const settle = () => {
    screen.classList.add('settled');
    screen.removeEventListener('pointerdown', settle);
    window.removeEventListener('keydown', settle);
  };
  screen.addEventListener('pointerdown', settle);
  window.addEventListener('keydown', settle);
}

// 除錯用：在 console 打 previewEnd(true) / previewEnd(false) 直接看整段動畫
function previewEnd(victory = true, opts = {}) {
  totalKills = opts.kills != null ? opts.kills : 3;
  matchStats.dmgDealt = opts.dealt != null ? opts.dealt : 1240;
  matchStats.dmgTaken = opts.taken != null ? opts.taken : 980;
  currentMode = opts.mode || currentMode || '1v1';
  document.getElementById('hud').classList.add('hidden');
  renderEndScreen({ victory, heroId: opts.heroId || selectedHero || 'hawthorn', seconds: opts.seconds != null ? opts.seconds : 47.2, online: false });
}

