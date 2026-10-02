'use strict';

// ============ GAME FEEL / FX LAYER ============
// 所有「看起來爽」但不影響規則的東西集中在這：
//  · 時間縮放（最後一擊慢動作）、全畫面閃光、受傷紅暈、殘血脈動
//  · 死亡殘影（角色被打飛放大淡出）、衝刺殘像、彈道拖尾
//  · 連殺橫幅、開場倒數、勝利彩帶
//  · 地板快取（每場只畫一次靜態地板＋障礙，省下每幀的漸層運算）
//  · 自適應解析度（Retina 清晰；掉幀就自動降回 1x）
const FX = (() => {
  let timeScale = 1, slowT = 0, slowTo = 1;
  let flashA = 0, flashCol = '255,255,255';
  let hurtA = 0;
  let zoom = 0;                      // 擊殺時的鏡頭微推
  const ghosts = [];                 // 死亡殘影
  const afterimages = [];            // 衝刺殘像
  const confetti = [];               // 勝利彩帶
  const banners = [];                // 連殺／提示橫幅（畫在 canvas 上）
  let intro = null;                  // 開場倒數
  let streak = 0, streakT = 0;
  let floorCache = null, floorKey = '';
  let dpr = 1, frameAcc = 0, frameN = 0, slowFrames = 0;
  let reduced = false;
  try { reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- 時間 ----------
  function slowmo(scale, dur) { if (reduced) return; slowTo = scale; slowT = dur; timeScale = scale; }
  function tickTime(rawDt) {
    if (slowT > 0) { slowT -= rawDt; if (slowT <= 0) { slowT = 0; slowTo = 1; } }
    timeScale += (slowTo - timeScale) * (slowTo > timeScale ? 0.12 : 1);
    return rawDt * timeScale;
  }

  // ---------- 全畫面 ----------
  function flash(a = 0.5, col = '255,255,255') { if (reduced) a *= 0.4; if (a > flashA) { flashA = a; flashCol = col; } }
  function hurtFlash(a = 0.5) { hurtA = Math.min(1, Math.max(hurtA, a)); }
  function kick(z = 0.03) { if (!reduced) zoom = Math.max(zoom, z); }

  // ---------- 殘影 ----------
  function ghost(c, ang) {
    if (!c || c.isBoss) return;
    ghosts.push({ id: c.id, x: c.x, y: c.y + c.r * 0.7, r: c.r, fd: c.faceDir || 1, color: c.color,
      vx: Math.cos(ang || 0) * 3.2, vy: Math.sin(ang || 0) * 3.2 - 2.2, rot: 0, vr: (Math.random() - 0.5) * 9,
      life: 0.55, max: 0.55, minion: !!c.isMinion });
  }
  function afterimage(c) {
    if (reduced || !c) return;
    afterimages.push({ id: c.id, x: c.x, y: c.y + c.r * 0.7, r: c.r, fd: c.faceDir || 1, color: c.color, life: 0.28, max: 0.28 });
  }

  // ---------- 連殺 ----------
  const STREAK_TXT = { 2: ['雙殺', 'DOUBLE KILL'], 3: ['三連殺', 'TRIPLE KILL'], 4: ['四連殺', 'RAMPAGE'], 5: ['夜市之王', 'UNSTOPPABLE'] };
  function onKill(x, y) {
    const now = performance.now();
    streak = (now - streakT < 4200) ? streak + 1 : 1;
    streakT = now;
    if (streak >= 2) {
      const k = Math.min(streak, 5), txt = STREAK_TXT[k];
      banner(txt[0], txt[1], k >= 4 ? '#ff5a3c' : '#ffd24a', 1.4, 'streak');
      if (Sound.streak) Sound.streak(streak);
      flash(0.18 + k * 0.04, k >= 4 ? '255,120,80' : '255,220,140');
    }
    return streak;
  }
  function banner(cn, en, col = '#ffd24a', dur = 1.4, kind = '') {
    if (kind) for (let i = banners.length - 1; i >= 0; i--) if (banners[i].kind === kind) banners.splice(i, 1);
    if (banners.length > 2) banners.shift();
    banners.push({ cn, en, col, life: dur, max: dur, kind });
  }
  function resetStreak() { streak = 0; }

  // ---------- 開場倒數 ----------
  // 短：READY (0.75s) → 開打！(0.55s)，小孩不耐煩。倒數期間鎖操作但角色會「跳進場」。
  function startIntro(opts = {}) {
    intro = { t: 0, dur: opts.quick ? 0.6 : 1.25, ready: !opts.quick, fought: false, cn: opts.cn || '', en: opts.en || '' };
    if (Sound.countTick && !opts.quick) Sound.countTick(2);
  }
  function introActive() { return !!intro; }
  function tickIntro(dt) {
    if (!intro) return;
    intro.t += dt;
    if (!intro.fought && intro.t >= intro.dur - 0.55) { intro.fought = true; if (Sound.fight) Sound.fight(); flash(0.35, '255,220,140'); if (typeof addShake === 'function') addShake(6); }
    if (intro.t >= intro.dur) intro = null;
  }

  // ---------- 勝利彩帶 ----------
  function celebrate() {
    if (reduced) return;
    const cols = ['#ffd24a', '#ff5a3c', '#7fd8ff', '#7ddf6b', '#f5e6c8', '#ff8ad8'];
    for (let i = 0; i < 90; i++) {
      confetti.push({ x: Math.random() * W, y: -20 - Math.random() * 160, vx: (Math.random() - 0.5) * 2.2, vy: 1.5 + Math.random() * 2.5,
        w: 5 + Math.random() * 5, h: 7 + Math.random() * 7, col: cols[i % cols.length], rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        ph: Math.random() * 6.28, life: 3.2 + Math.random() * 1.2 });
    }
  }

  // ---------- 每幀更新 ----------
  function update(dt) {
    if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.6);
    if (hurtA > 0) hurtA = Math.max(0, hurtA - dt * 1.6);
    if (zoom > 0) zoom = Math.max(0, zoom - dt * 0.14);
    for (const g of ghosts) { g.x += g.vx; g.y += g.vy; g.vy += 0.22; g.vx *= 0.96; g.rot += g.vr * dt; g.life -= dt; }
    for (let i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].life <= 0) ghosts.splice(i, 1);
    for (const a of afterimages) a.life -= dt;
    for (let i = afterimages.length - 1; i >= 0; i--) if (afterimages[i].life <= 0) afterimages.splice(i, 1);
    for (const b of banners) b.life -= dt;
    for (let i = banners.length - 1; i >= 0; i--) if (banners[i].life <= 0) banners.splice(i, 1);
    for (const c of confetti) { c.ph += dt * 4; c.x += c.vx + Math.sin(c.ph) * 0.8; c.y += c.vy; c.rot += c.vr; c.life -= dt; }
    for (let i = confetti.length - 1; i >= 0; i--) if (confetti[i].life <= 0 || confetti[i].y > H + 30) confetti.splice(i, 1);
    tickIntro(dt);
  }

  // ---------- 繪製：世界層（跟著震動） ----------
  function drawWorldUnder() {    // 角色底下：衝刺殘像
    for (const a of afterimages) {
      const k = a.life / a.max;
      ctx.save(); ctx.globalAlpha = k * 0.38; ctx.translate(a.x, a.y); ctx.scale(a.fd, 1);
      drawHeroArt(ctx, a.id, a.r * 1.5, 0, 0);
      ctx.restore();
    }
  }
  function drawWorldOver() {     // 角色上面：死亡殘影
    for (const g of ghosts) {
      const k = g.life / g.max, s = 1 + (1 - k) * 0.6;
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.4); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.scale(g.fd * s, s);
      if (g.minion) { ctx.fillStyle = g.color; ctx.beginPath(); ctx.ellipse(0, -g.r * 0.5, g.r, g.r * 0.85, 0, 0, Math.PI * 2); ctx.fill(); }
      else drawHeroArt(ctx, g.id, g.r * 1.5, 0, 0);
      if (k < 0.8) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.8 - k) * 0.8; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -g.r, g.r * 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  // ---------- 繪製：螢幕層（不震動） ----------
  function drawScreen() {
    const t = performance.now() / 1000;
    // 受傷紅暈 + 殘血脈動
    let vig = hurtA * 0.55;
    const p1 = (typeof players !== 'undefined') && players[0];
    const lowHp = p1 && !p1.dead && state === 'playing' && p1.hp / p1.maxHp < 0.3;
    if (lowHp) vig = Math.max(vig, 0.22 + Math.sin(t * 5) * 0.12);
    if (vig > 0.01) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.78);
      g.addColorStop(0, 'rgba(214,40,40,0)'); g.addColorStop(1, `rgba(214,40,40,${vig})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (flashA > 0.005) { ctx.fillStyle = `rgba(${flashCol},${flashA})`; ctx.fillRect(0, 0, W, H); }
    // 彩帶
    for (const c of confetti) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.globalAlpha = Math.min(1, c.life);
      ctx.fillStyle = c.col; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.ph)));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 橫幅（連殺）
    banners.forEach((b, i) => {
      const k = 1 - b.life / b.max;                            // 0 → 1
      const inA = Math.min(1, k / 0.12), outA = Math.min(1, (1 - k) / 0.25);
      const a = Math.min(inA, outA);
      const s = 1 + (1 - inA) * 0.6;
      const y = H * 0.3 + i * 40 - (1 - inA) * 20;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y); ctx.scale(s, s);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 44px "Noto Serif TC", serif';
      ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(40,10,20,0.9)'; ctx.strokeText(b.cn, 0, 0);
      ctx.fillStyle = b.col; ctx.fillText(b.cn, 0, 0);
      ctx.font = '14px "Bungee", sans-serif'; ctx.lineWidth = 4; ctx.strokeText(b.en, 0, 34); ctx.fillStyle = '#f5e6c8'; ctx.fillText(b.en, 0, 34);
      ctx.restore();
    });
    // 開場倒數
    if (intro) {
      const fightT = intro.dur - 0.55;
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (intro.t < fightT) {
        if (intro.ready) {
          const k = Math.min(1, intro.t / 0.2), fade = Math.min(1, (fightT - intro.t) / 0.15);
          ctx.globalAlpha = Math.min(k, fade);
          const s = 1.4 - 0.4 * k;
          ctx.translate(W / 2, H * 0.42); ctx.scale(s, s);
          ctx.font = '900 64px "Noto Serif TC", serif'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(40,10,20,0.9)';
          ctx.strokeText('準備', 0, 0); ctx.fillStyle = '#f5e6c8'; ctx.fillText('準備', 0, 0);
          ctx.font = '18px "Bungee", sans-serif'; ctx.lineWidth = 5; ctx.strokeText('READY', 0, 50); ctx.fillStyle = '#ffcc6b'; ctx.fillText('READY', 0, 50);
          if (intro.cn) { ctx.font = '700 15px "Noto Serif TC", serif'; ctx.lineWidth = 4; ctx.strokeText(intro.cn, 0, 84); ctx.fillStyle = 'rgba(245,230,200,0.9)'; ctx.fillText(intro.cn, 0, 84); }
        }
      } else {
        const k = (intro.t - fightT) / 0.55;
        const pop = k < 0.25 ? 1.6 - 0.6 * (k / 0.25) : 1 + (k - 0.25) * 0.15;
        ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        ctx.translate(W / 2, H * 0.42); ctx.scale(pop, pop); ctx.rotate(-0.04);
        ctx.font = '900 84px "Noto Serif TC", serif'; ctx.lineWidth = 12; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(60,10,10,0.95)';
        ctx.strokeText('開打！', 0, 0); ctx.fillStyle = '#ffd24a'; ctx.fillText('開打！', 0, 0);
        ctx.font = '22px "Bungee", sans-serif'; ctx.lineWidth = 6; ctx.strokeText('FIGHT!', 0, 62); ctx.fillStyle = '#ff5a3c'; ctx.fillText('FIGHT!', 0, 62);
      }
      ctx.restore();
    }
  }

  // ---------- 地板快取 ----------
  // 靜態地板（漸層、格線、磁磚）＋障礙物＋陰影，每場畫一次到離屏 canvas。
  // 會動的東西（燈籠搖晃、花瓣、角落燈光）仍每幀畫在上面。
  function floor(map, drawStatic) {
    const key = map ? (map.theme + ':' + map.blocks.map(b => [b.x | 0, b.y | 0, b.w, b.h, b.kind].join(',')).join('|')) : '';
    if (!floorCache || floorKey !== key) {
      floorKey = key;
      floorCache = document.createElement('canvas');
      floorCache.width = W * dpr; floorCache.height = H * dpr;
      const g = floorCache.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const real = ctx;
      try { ctx = g; drawStatic(g); } finally { ctx = real; }
    }
    ctx.drawImage(floorCache, 0, 0, W, H);
  }
  function invalidateFloor() { floorCache = null; floorKey = ''; }

  // ---------- 解析度 ----------
  function setupDpr() {
    const want = Math.min(2, window.devicePixelRatio || 1);
    dpr = want >= 1.25 ? want : 1;
    applyDpr();
  }
  function applyDpr() {
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    invalidateFloor();
  }
  function beginFrame() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  // 連續掉幀就降回 1x（手機省電、低階機救命）
  function perf(ms) {
    frameAcc += ms; frameN++;
    if (frameN >= 90) {
      const avg = frameAcc / frameN; frameAcc = 0; frameN = 0;
      if (avg > 24 && dpr > 1) { slowFrames++; if (slowFrames >= 2) { dpr = 1; applyDpr(); slowFrames = 0; } }
      else slowFrames = 0;
    }
  }
  function zoomAmount() { return zoom; }
  function reset() { ghosts.length = 0; afterimages.length = 0; confetti.length = 0; banners.length = 0; intro = null; flashA = 0; hurtA = 0; zoom = 0; timeScale = 1; slowT = 0; slowTo = 1; streak = 0; }

  return { slowmo, tickTime, flash, hurtFlash, kick, ghost, afterimage, onKill, banner, resetStreak, startIntro, introActive,
    celebrate, update, drawWorldUnder, drawWorldOver, drawScreen, floor, invalidateFloor, setupDpr, beginFrame, perf, zoomAmount, reset,
    get timeScale() { return timeScale; }, get dpr() { return dpr; }, get reduced() { return reduced; } };
})();
FX.setupDpr();
