'use strict';

// ============ TUTORIAL：五步驟互動教學 ============
// 練習對手 dmgMul = 0，打不死玩家，小孩可以安心亂按。
const Tutorial = (() => {
  let active = false;
  let step = 0;
  let moved = 0;           // 累計移動距離
  let last = null;         // 上一幀玩家座標
  let castSeen = {};       // 放過哪幾個技能
  let attacked = false;
  let killed = false;
  let sawEnemy = false;   // 敵人死後會被移出陣列，需先記錄看過
  let holdT = 0;           // 步驟完成後的停留時間

  const touchy = () => touchMode;

  const STEPS = [
    { cn: () => touchy() ? '用左邊的搖桿走動' : '用 W A S D 走動',
      en: () => touchy() ? 'Drag the joystick to move' : 'Use W A S D to move',
      tip: '先熟悉走位，這是最重要的技巧',
      ok: () => moved > 180 },
    { cn: () => touchy() ? '點右下角的 ⚔ 攻擊' : '滑鼠對準對手，按左鍵攻擊',
      en: () => touchy() ? 'Tap ⚔ to attack' : 'Aim with the mouse, click to attack',
      tip: '滑鼠指到哪就打到哪',
      ok: () => attacked },
    { cn: () => touchy() ? '點技能鈕放出第一個技能' : '按 Q 放出第一個技能',
      en: () => touchy() ? 'Tap an ability button' : 'Press Q for your first ability',
      tip: '技能有冷卻時間，用完要等一下',
      ok: () => castSeen[0] },
    { cn: () => touchy() ? '把另外兩個技能也放一次' : '再按 E 和 R 試試另外兩個技能',
      en: () => touchy() ? 'Try the other two abilities' : 'Now try E and R',
      tip: '每位英雄的三個技能都不一樣',
      ok: () => castSeen[1] && castSeen[2] },
    { cn: () => '打倒練習對手！',
      en: () => 'Defeat the practice partner!',
      tip: '牠不會傷害你，放心打',
      ok: () => killed },
  ];

  function panel() { return document.getElementById('tut-panel'); }

  function render() {
    const el = panel();
    if (!el) return;
    if (!active) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const s = STEPS[step];
    if (!s) return;
    el.innerHTML =
      `<div class="tut-step">步驟 ${step + 1} / ${STEPS.length}</div>` +
      `<div class="tut-cn">${s.cn()}</div>` +
      `<div class="tut-en">${s.en()}</div>` +
      `<div class="tut-tip">${s.tip}</div>` +
      `<div class="tut-dots">${STEPS.map((_, i) =>
        `<span class="${i < step ? 'done' : i === step ? 'now' : ''}"></span>`).join('')}</div>`;
  }

  function start() {
    active = true; step = 0; moved = 0; last = null;
    castSeen = {}; attacked = false; killed = false; sawEnemy = false; holdT = 0;
    window.__previewedOpps = ['scallion'];   // 蔥油餅：慢、肉、好打的練習對象
    startMatch('bubble', 'tutorial', {});
    render();
  }

  function stop() { active = false; render(); }

  function tick(dt) {
    if (!active || state !== 'playing' || !player) return;

    if (last) moved += Math.hypot(player.x - last.x, player.y - last.y);
    last = { x: player.x, y: player.y };
    if (enemies.length) sawEnemy = true;
    else if (sawEnemy) killed = true;

    const s = STEPS[step];
    if (!s) return;
    if (s.ok()) {
      holdT += dt;
      if (holdT > 0.7) {                    // 停一下讓小孩看到「做對了」
        holdT = 0;
        step++;
        Sound.ui();
        if (step >= STEPS.length) return finish();
        render();
      }
    }
  }

  function finish() {
    active = false;
    state = 'ended';
    document.body.classList.remove('playing');
    Sound.stopMusic(); Sound.win();
    document.getElementById('hud').classList.add('hidden');
    render();
    const unlocked = Progress.completeTutorial();
    UI.showTutorialDone(unlocked);
  }

  // --- 由遊戲主體呼叫的鉤子 ---
  function onAttack() { if (active) attacked = true; }
  function onCast(i) { if (active) castSeen[i] = true; }

  return { start, stop, tick, onAttack, onCast, render,
           get active() { return active; },
           get _dbg() { return { step, moved, attacked, castSeen, killed, sawEnemy, holdT }; } };
})();
