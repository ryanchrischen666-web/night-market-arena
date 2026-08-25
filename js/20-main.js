'use strict';

// ============ MAIN LOOP ============
function loop(now) {
  const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
  lastTime = now;
  if (hitStop > 0) {
    hitStop = Math.max(0, hitStop - dt);
  } else if (state === 'playing' || state === 'won') {
    update(dt);
  }
  Tutorial.tick(dt);
  UI.cosmeticTick(dt);
  render();
  requestAnimationFrame(loop);
}

// ============ FLOW ============
function setSelectHeading(t) { const el = document.getElementById('select-title'); if (el) el.textContent = t; }
function resetHeroPick() {
  selectedHero = null;
  document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('confirm-hero-btn').classList.add('hidden');
  setSelectHeading('選擇英雄 \u00b7 Choose Your Hero');
}
function goToModeScreen() {
  Sound.ui();
  document.getElementById('select-screen').classList.add('hidden');
  document.getElementById('mode-screen').classList.remove('hidden');
  selectedMode = null;
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('begin-btn').classList.add('hidden');
  document.getElementById('vs-preview').classList.remove('show');
  const mt = document.querySelector('#mode-screen .select-title');
  if (mt) mt.textContent = '選擇賠注 \u00b7 Pick Your Odds';
}
document.getElementById('start-btn').addEventListener('click', () => {
  Sound.init(); Sound.resume(); Sound.ui();
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('select-screen').classList.remove('hidden');
  resetHeroPick();
  renderHeroCards();
});
document.getElementById('confirm-hero-btn').addEventListener('click', () => {
  if (!selectedHero) return;
  goToModeScreen();
});
document.getElementById('back-to-hero-btn').addEventListener('click', () => {
  Sound.uiBack();
  document.getElementById('mode-screen').classList.add('hidden');
  document.getElementById('select-screen').classList.remove('hidden');
  resetHeroPick();
});
document.getElementById('begin-btn').addEventListener('click', () => {
  if (!selectedHero || !selectedMode) return;
  Sound.resume(); Sound.ui();
  startMatch(selectedHero, selectedMode, {});
});
document.getElementById('restart-btn').addEventListener('click', () => {
  Sound.ui();
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('title-screen').classList.remove('hidden');
  selectedHero = null; selectedMode = null;
  Tutorial.stop();
  UI.renderTitleMeta();
});

// audio: first-gesture unlock + toggle buttons
(function () {
  const unlock = () => { Sound.init(); Sound.resume(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock));
  const sfxBtn = document.getElementById('sfx-toggle'), musBtn = document.getElementById('music-toggle');
  if (sfxBtn) sfxBtn.addEventListener('click', () => { Sound.init(); Sound.resume(); const on = Sound.toggleSfx(); sfxBtn.classList.toggle('off', !on); if (on) Sound.ui(); });
  if (musBtn) musBtn.addEventListener('click', () => { Sound.init(); Sound.resume(); const on = Sound.toggleMusic(); musBtn.classList.toggle('off', !on); });
  window.addEventListener('keydown', (e) => { if (e.key && e.key.toLowerCase() === 'm') { const on = Sound.toggleMusic(); if (musBtn) musBtn.classList.toggle('off', !on); } });
})();

// ===== Mobile touch controls =====
function autoAimPoint(p) {
  const e = nearestEnemy(p.x, p.y);
  if (e) return { x: e.x, y: e.y };
  return { x: p.x + Math.cos(p.facing) * 240, y: p.y + Math.sin(p.facing) * 240 };
}
function mobileCast(i) {
  if (state !== 'playing' || !players[0] || players[0].dead) return;
  const p = players[0]; player = p;
  const ap = autoAimPoint(p); mouse.x = ap.x; mouse.y = ap.y;
  tryCast(i);
}
function buildMobileButtons() {
  if (!players[0]) return;
  const ab = players[0].abilities;
  ['tb-q', 'tb-e', 'tb-r'].forEach((id, i) => {
    const ic = document.querySelector('#' + id + ' .tb-ic');
    if (ic && ab[i]) ic.textContent = ab[i].icon;
  });
}
function initTouch() {
  const zone = document.getElementById('joy-zone');
  const joy = document.getElementById('joy');
  const knob = document.getElementById('joy-knob');
  if (!zone) return;
  function checkOrient() { document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth); }
  function enableTouch() {
    if (touchMode) return;
    touchMode = true;
    document.body.classList.add('touch');
    checkOrient();
  }
  window.addEventListener('touchstart', enableTouch, { passive: true });
  window.addEventListener('resize', checkOrient);
  window.addEventListener('orientationchange', () => setTimeout(checkOrient, 200));

  let joyId = null, ox = 0, oy = 0; const R = 52;
  zone.addEventListener('touchstart', (e) => {
    e.preventDefault(); if (joyId !== null) return;
    const t = e.changedTouches[0];
    joyId = t.identifier; ox = t.clientX; oy = t.clientY;
    joy.style.left = ox + 'px'; joy.style.top = oy + 'px';
    joy.classList.remove('hidden');
    knob.style.left = '62px'; knob.style.top = '62px';
    mobileMove.active = true; mobileMove.dx = 0; mobileMove.dy = 0;
  }, { passive: false });
  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      const dx = t.clientX - ox, dy = t.clientY - oy;
      const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), cl = Math.min(len, R);
      knob.style.left = (62 + Math.cos(ang) * cl) + 'px';
      knob.style.top = (62 + Math.sin(ang) * cl) + 'px';
      mobileMove.dx = Math.cos(ang) * (cl / R);
      mobileMove.dy = Math.sin(ang) * (cl / R);
      mobileMove.active = len > 6;
    }
  }, { passive: false });
  function endJoy(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      joyId = null; joy.classList.add('hidden');
      mobileMove.active = false; mobileMove.dx = 0; mobileMove.dy = 0;
    }
  }
  zone.addEventListener('touchend', endJoy, { passive: false });
  zone.addEventListener('touchcancel', endJoy, { passive: false });

  const atk = document.getElementById('tb-atk');
  atk.addEventListener('touchstart', (e) => { e.preventDefault(); mouse.down = true; }, { passive: false });
  atk.addEventListener('touchend', (e) => { e.preventDefault(); mouse.down = false; }, { passive: false });
  atk.addEventListener('touchcancel', () => { mouse.down = false; });
  [['tb-q', 0], ['tb-e', 1], ['tb-r', 2]].forEach(([id, i]) => {
    const b = document.getElementById(id);
    b.addEventListener('touchstart', (e) => { e.preventDefault(); mobileCast(i); }, { passive: false });
  });
  // lock page scroll / synthesized mouse during gameplay (menus stay scrollable)
  document.addEventListener('touchmove', (e) => { if (touchMode && state === 'playing') e.preventDefault(); }, { passive: false });
  const cv = document.getElementById('game');
  if (cv) cv.addEventListener('touchstart', (e) => { if (state === 'playing') e.preventDefault(); }, { passive: false });
}
initTouch();

// ===== 介紹 / 教學 / 成就 / 攤位 =====
(function () {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('howto-btn',    () => { Sound.ui(); UI.openScreen('howto-screen'); UI.renderHowTo(); });
  on('ach-btn',      () => { Sound.ui(); UI.openScreen('ach-screen');   UI.renderAch(); });
  on('shop-btn',     () => { Sound.ui(); UI.openScreen('shop-screen');  UI.renderShop(); });
  on('tutorial-btn', () => { Sound.init(); Sound.resume(); Sound.ui(); Tutorial.start(); });
  ['howto-back', 'ach-back', 'shop-back'].forEach(id => on(id, () => { Sound.uiBack(); UI.backToTitle(); }));
})();

requestAnimationFrame(loop);
setupModeSelect();
UI.renderTitleMeta();

