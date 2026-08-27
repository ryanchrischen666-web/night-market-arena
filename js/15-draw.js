'use strict';

function drawPlayer() {
  for (const pl of players) {
    if (pl.dead) continue;
    const op = player; player = pl;
    if (pl.stealth > 0) ctx.globalAlpha = 0.4;
    drawCharacter(pl, true);
    ctx.globalAlpha = 1;
    player = op;
    const ang = Math.atan2(mouse.y - pl.y, mouse.x - pl.x);
    ctx.strokeStyle = 'rgba(244, 169, 60, 0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pl.x + Math.cos(ang) * (pl.r + 4), pl.y + Math.sin(ang) * (pl.r + 4));
    ctx.lineTo(pl.x + Math.cos(ang) * (pl.r + 16), pl.y + Math.sin(ang) * (pl.r + 16));
    ctx.stroke();
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDmgTexts() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of dmgTexts) {
    const sz = Math.round(14 * (t.size || 1));
    ctx.font = 'bold ' + sz + 'px "Bungee", sans-serif';
    ctx.globalAlpha = clamp(t.life / 0.8, 0, 1);
    ctx.fillStyle = '#000';
    ctx.fillText(t.n, t.x + 1, t.y + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.n, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawRings() {
  for (const r of rings) {
    const a = clamp(r.life / r.maxLife, 0, 1);
    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = r.color; ctx.lineWidth = 3 * a + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// 雞排放題光束：外層金暈 + 內芯白光，末端喇叭口，隨時間微微脈動
function drawFeastBeam(x, y, ang, seed) {
  const t = performance.now() / 1000;
  const LEN = 360, pulse = 1 + Math.sin(t * 18 + (seed || 0)) * 0.12;
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
  ctx.restore();
}

function drawFeastBeams() {
  for (const pl of players) if (!pl.dead && pl.feastT > 0) drawFeastBeam(pl.x, pl.y, pl.feastAng != null ? pl.feastAng : pl.facing, 0);
  for (const e of enemies) if (!e.dead && e.remote && e._feastT > 0) drawFeastBeam(e.x, e.y, e._feastAng || 0, 3);
}

function render() {
  ctx.fillStyle = '#0c0716';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shakeMag > 0.1) ctx.translate((Math.random() * 2 - 1) * shakeMag, (Math.random() * 2 - 1) * shakeMag);
  drawMap();
  drawZones();
  drawProjectiles();
  drawFeastBeams();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawRings();
  drawDmgTexts();
  ctx.restore();
  if (shakeMag > 0) { shakeMag *= 0.86; if (shakeMag < 0.1) shakeMag = 0; }
}

