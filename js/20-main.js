'use strict';

// ============ MAIN LOOP ============
function loop(now) {
  const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
  lastTime = now;
  if (paused) { render(); requestAnimationFrame(loop); return; }
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

// ============ PAUSE ============
function setPaused(on) {
  if (on && window.NetMatch && NetMatch.inMatch) { showMatchBanner('連線中無法暫停', '對手不會等你！'); return; }
  if (state !== 'playing' || paused === on) return;
  paused = on;
  const el = document.getElementById('pause-screen');
  if (on) {
    mouse.down = false;              // 免得恢復時立刻揮一刀
    el.classList.remove('hidden');
    Sound.stopMusic(); Sound.uiBack();
  } else {
    el.classList.add('hidden');
    Sound.ui();
    if (currentMap) Sound.startMusic(currentMap.theme);
  }
}

// 放棄這一場：不結算、不發獎勵，直接回標題
function quitMatch() {
  if (window.NetMatch && NetMatch.active) NetMatch.leaveRoom();
  paused = false;
  document.getElementById('pause-screen').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.body.classList.remove('playing');
  Sound.stopMusic(); Sound.uiBack();
  Tutorial.stop();
  state = 'title';
  enemies = []; projectiles = []; particles = []; zones = []; dmgTexts = []; rings = [];
  selectedHero = null; selectedMode = null;
  document.getElementById('title-screen').classList.remove('hidden');
  UI.renderTitleMeta();
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state === 'playing') { e.preventDefault(); setPaused(!paused); }
});

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
  if (window.NetMatch && NetMatch.picking) { Sound.ui(); NetMatch.confirmHero(); return; }
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
  if (window.NetMatch && NetMatch.active) NetMatch.leaveRoom();
  document.getElementById('rematch-btn').classList.add('hidden');
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
  // 2.5 秒內用過右搖桿 → 技能沿著你瞄的方向出，不搶自動鎖定
  if (mobileAim.active || performance.now() - mobileAim.lastT < 2500) {
    const dx = mobileAim.active ? mobileAim.dx : mobileAim.lastDx;
    const dy = mobileAim.active ? mobileAim.dy : mobileAim.lastDy;
    return { x: p.x + dx * 260, y: p.y + dy * 260 };
  }
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
  // 手機不用等第一次觸摸：一載入就知道要顯示轉向提示
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) enableTouch();
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

  // ===== 右搖桿：瞄準 + 射擊 =====
  const azone = document.getElementById('aim-zone');
  const aimEl = document.getElementById('aim');
  const aimKnob = document.getElementById('aim-knob');
  if (azone) {
    let aimId = null, aox = 0, aoy = 0, aimT0 = 0, aimMoved = false;
    const AR = 46;
    azone.addEventListener('touchstart', (e) => {
      e.preventDefault(); if (aimId !== null) return;
      const t = e.changedTouches[0];
      aimId = t.identifier; aox = t.clientX; aoy = t.clientY;
      aimT0 = performance.now(); aimMoved = false;
      aimEl.style.left = aox + 'px'; aimEl.style.top = aoy + 'px';
      aimEl.classList.remove('hidden');
      aimKnob.style.left = '46px'; aimKnob.style.top = '46px';
    }, { passive: false });
    azone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== aimId) continue;
        let dx = t.clientX - aox, dy = t.clientY - aoy;
        const len = Math.hypot(dx, dy);
        if (len > 12) aimMoved = true;
        const cl = Math.min(len, AR);
        const nx = len ? dx / len : 0, ny = len ? dy / len : 0;
        aimKnob.style.left = (46 + nx * cl) + 'px';
        aimKnob.style.top = (46 + ny * cl) + 'px';
        if (len > 12) {
          mobileAim.active = true;
          mobileAim.dx = nx; mobileAim.dy = ny;
          mobileAim.lastDx = nx; mobileAim.lastDy = ny; mobileAim.lastT = performance.now();
        } else mobileAim.active = false;
      }
    }, { passive: false });
    const endAim = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== aimId) continue;
        aimId = null; aimEl.classList.add('hidden');
        if (!aimMoved && performance.now() - aimT0 < 240) {
          mobileAim.lastT = 0;          // 輕點：回到自動鎖定打一下
          mouse.tapAtk = true;
        }
        mobileAim.active = false;
      }
    };
    azone.addEventListener('touchend', endAim, { passive: false });
    azone.addEventListener('touchcancel', endAim, { passive: false });
  }

  const atk = document.getElementById('tb-atk');
  atk.addEventListener('touchstart', (e) => { e.preventDefault(); mouse.down = true; mouse.tapAtk = true; }, { passive: false });
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

// ===== 安裝成 App（PWA）=====
(function () {
  const btn = document.getElementById('install-btn');
  if (!btn) return;
  let deferred = null;
  const standalone = matchMedia('(display-mode: standalone)').matches ||
                     matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    if (!standalone) btn.classList.remove('hidden');
  });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !standalone) btn.classList.remove('hidden');
  btn.addEventListener('click', async () => {
    Sound.ui();
    if (deferred) { deferred.prompt(); deferred = null; return; }
    let tip = document.getElementById('ios-install-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'ios-install-tip';
      tip.innerHTML = '<b>安裝到主畫面：</b><br>用 Safari 開啟本頁 → 點下方「分享」<span style="font-size:18px">⬆️</span> → 「加入主畫面」<div style="margin-top:8px;opacity:.7">（點一下關閉）</div>';
      tip.addEventListener('click', () => tip.remove());
      document.body.appendChild(tip);
    }
  });
  window.addEventListener('appinstalled', () => btn.classList.add('hidden'));
})();

// ===== 玩家名字（S5：跟線上面板共用同一份，重開瀏覽器還記得）=====
const PlayerName = (() => {
  const KEY = 'nma_online_name';
  function get() { try { return (localStorage.getItem(KEY) || '').trim(); } catch (e) { return ''; } }
  function set(n) {
    n = (n || '').trim().slice(0, 16);
    if (window.Online && Online.enabled && Online.enabled()) Online.setName(n);
    else { try { localStorage.setItem(KEY, n); } catch (e) {} }
  }
  const input = document.getElementById('player-name-input');
  if (input) {
    input.value = get();
    input.addEventListener('change', () => set(input.value));
    input.addEventListener('blur', () => set(input.value));
    // 打字時不要觸發遊戲的鍵盤操作
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') input.blur(); });
    // 點輸入框以外的任何地方 → 收起鍵盤、離開打字模式
    document.addEventListener('pointerdown', (e) => {
      if (document.activeElement === input && e.target !== input) input.blur();
    }, true);
  }
  return { get, set };
})();
window.PlayerName = PlayerName;   // top-level const 不會自動掛上 window

// ===== 介紹 / 教學 / 成就 / 攤位 =====
(function () {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('howto-btn',    () => { Sound.ui(); UI.openScreen('howto-screen'); UI.renderHowTo(); });
  on('ach-btn',      () => { Sound.ui(); UI.openScreen('ach-screen');   UI.renderAch(); });
  on('shop-btn',     () => { Sound.ui(); UI.openScreen('shop-screen');  UI.renderShop(); });
  on('tutorial-btn', () => { Sound.init(); Sound.resume(); Sound.ui(); Tutorial.start(); });
  on('pause-btn',    () => setPaused(true));
  on('mob-menu-btn', () => { Sound.ui(); document.getElementById('audio-controls').classList.toggle('open'); });
  on('select-home-btn', () => {
    if (window.NetMatch && NetMatch.active) NetMatch.leaveRoom();
    Sound.uiBack(); resetHeroPick();
    document.getElementById('select-screen').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
    UI.renderTitleMeta();
  });
  on('resume-btn',   () => setPaused(false));
  on('quit-btn',     quitMatch);
  ['howto-back', 'ach-back', 'shop-back'].forEach(id => on(id, () => { Sound.uiBack(); UI.backToTitle(); }));
})();

requestAnimationFrame(loop);
setupModeSelect();
UI.renderTitleMeta();

