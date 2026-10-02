'use strict';

function drawPlayer() {
  const t = performance.now() / 1000;
  for (const pl of players) {
    if (pl.dead) continue;
    const op = player; player = pl;
    if (pl.stealth > 0) ctx.globalAlpha = 0.4;
    drawCharacter(pl, true);
    ctx.globalAlpha = 1;
    player = op;
    const ax = pl.aim ? pl.aim.x : mouse.x, ay = pl.aim ? pl.aim.y : mouse.y;
    const ang = Math.atan2(ay - pl.y, ax - pl.x);
    // 面向指示：短箭頭
    ctx.strokeStyle = 'rgba(244, 169, 60, 0.7)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pl.x + Math.cos(ang) * (pl.r + 4), pl.y + Math.sin(ang) * (pl.r + 4));
    ctx.lineTo(pl.x + Math.cos(ang) * (pl.r + 16), pl.y + Math.sin(ang) * (pl.r + 16));
    ctx.stroke();
    // 無敵／隱身：閃爍描邊
    if (pl.invuln > 0) { ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 30) * 0.3})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r + 4, 0, Math.PI * 2); ctx.stroke(); }
  }
  // 準星（只給滑鼠玩家）：隨時間緩轉的四角框，鎖到敵人上會收緊變紅
  if (!touchMode && state === 'playing' && players[0] && !players[0].dead) {
    const near = nearestEnemy(mouse.x, mouse.y, 34);
    const cx = near ? near.x : mouse.x, cy = near ? near.y : mouse.y;
    const R = near ? near.r + 6 : 11, rot = near ? 0 : t * 1.5;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.strokeStyle = near ? 'rgba(255,90,90,0.9)' : 'rgba(255,220,150,0.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.arc(0, 0, R, a + 0.35, a + Math.PI / 2 - 0.35); ctx.stroke(); }
    ctx.fillStyle = near ? 'rgba(255,90,90,0.9)' : 'rgba(255,220,150,0.8)'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  // 一般粒子：普通混色；火花／發光粒子：加法混色（會真的「亮」起來）
  let lighter = false;
  for (const p of particles) {
    const a = p.life / p.maxLife;
    if (p.glow !== lighter) { lighter = p.glow; ctx.globalCompositeOperation = lighter ? 'lighter' : 'source-over'; }
    ctx.globalAlpha = a;
    if (p.shape === 1) {   // 拉長火花
      const sp = Math.hypot(p.vx, p.vy), len = Math.min(16, 3 + sp * 2.2);
      const nx = sp ? p.vx / sp : 1, ny = sp ? p.vy / sp : 0;
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size * a + 0.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x - nx * len, p.y - ny * len); ctx.lineTo(p.x, p.y); ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function drawDmgTexts() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const t of dmgTexts) {
    // 彈出：前 0.12 秒從 1.6 倍縮回 1 倍，再慢慢飄起淡出
    const pop = t.age < 0.12 ? 1.6 - 0.6 * (t.age / 0.12) : 1;
    const sz = Math.round(15 * (t.size || 1) * pop);
    ctx.font = '900 ' + sz + 'px "Bungee", sans-serif';
    ctx.globalAlpha = clamp(t.life / 0.5, 0, 1);
    ctx.lineWidth = Math.max(3, sz * 0.22); ctx.strokeStyle = 'rgba(30,8,20,0.9)';
    ctx.strokeText(t.n, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.n, t.x, t.y);
    if ((t.size || 1) > 1.2) { ctx.globalAlpha *= 0.5; ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(sz * 0.9) + 'px "Bungee", sans-serif'; ctx.fillText(t.n, t.x, t.y - 1); }
  }
  ctx.globalAlpha = 1;
}

function drawRings() {
  ctx.globalCompositeOperation = 'lighter';
  for (const r of rings) {
    const a = clamp(r.life / r.maxLife, 0, 1);
    ctx.globalAlpha = a * 0.85;
    ctx.strokeStyle = r.color; ctx.lineWidth = 4 * a + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a * 0.25; ctx.lineWidth = 10 * a + 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.92, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// 雞排放題光束：外層金暈 + 內芯白光，末端喇叭口，隨時間微微脈動
function drawFeastBeam(x, y, ang, seed) {
  const t = performance.now() / 1000;
  const LEN = beamReach(x, y, ang, 360), pulse = 1 + Math.sin(t * 18 + (seed || 0)) * 0.12;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  const grad = ctx.createLinearGradient(0, 0, LEN, 0);
  grad.addColorStop(0, 'rgba(255,209,102,0.85)');
  grad.addColorStop(0.7, 'rgba(240,168,50,0.55)');
  grad.addColorStop(1, 'rgba(240,168,50,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(14, -10 * pulse);
  ctx.lineTo(LEN, -30 * pulse);
  ctx.lineTo(LEN, 30 * pulse);
  ctx.lineTo(14, 10 * pulse);
  ctx.closePath(); ctx.fill();
  const core = ctx.createLinearGradient(0, 0, LEN, 0);
  core.addColorStop(0, 'rgba(255,250,230,0.95)');
  core.addColorStop(1, 'rgba(255,250,230,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(14, -3.5 * pulse); ctx.lineTo(LEN * 0.96, -9 * pulse);
  ctx.lineTo(LEN * 0.96, 9 * pulse); ctx.lineTo(14, 3.5 * pulse);
  ctx.closePath(); ctx.fill();
  // 沿途火花
  for (let k = 0; k < 3; k++) {
    const px = ((t * 300 + k * 120 + (seed || 0) * 50) % LEN);
    ctx.fillStyle = 'rgba(255,240,190,' + (0.7 - px / LEN * 0.6) + ')';
    ctx.beginPath(); ctx.arc(px, Math.sin(t * 10 + k * 2) * 12, 4, 0, Math.PI * 2); ctx.fill();
  }
  // 撞牆光斑
  if (LEN < 359) {
    const fg = ctx.createRadialGradient(LEN, 0, 0, LEN, 0, 30 * pulse);
    fg.addColorStop(0, 'rgba(255,250,220,0.9)');
    fg.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(LEN, 0, 30 * pulse, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawFeastBeams() {
  for (const pl of players) if (!pl.dead && pl.feastT > 0) drawFeastBeam(pl.x, pl.y, pl.feastAng != null ? pl.feastAng : pl.facing, 0);
  for (const e of enemies) if (!e.dead && e.remote && e._feastT > 0) drawFeastBeam(e.x, e.y, e._feastAng || 0, 3);
}

function render() {
  FX.beginFrame();
  ctx.fillStyle = '#0c0716';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  const z = FX.zoomAmount();
  if (z > 0.001) { ctx.translate(W / 2, H / 2); ctx.scale(1 + z, 1 + z); ctx.translate(-W / 2, -H / 2); }   // 擊殺鏡頭微推
  if (shakeMag > 0.1 && !FX.reduced) ctx.translate((Math.random() * 2 - 1) * shakeMag, (Math.random() * 2 - 1) * shakeMag);
  drawMap();
  drawZones();
  FX.drawWorldUnder();
  drawProjectiles();
  drawFeastBeams();
  drawEnemies();
  drawPlayer();
  FX.drawWorldOver();
  drawParticles();
  drawRings();
  drawDmgTexts();
  ctx.restore();
  FX.drawScreen();
  if (shakeMag > 0) { shakeMag *= 0.86; if (shakeMag < 0.1) shakeMag = 0; }
}

