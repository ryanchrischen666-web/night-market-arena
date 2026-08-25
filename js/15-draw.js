'use strict';

function drawPlayer() {
  for (const pl of players) {
    if (pl.dead) continue;
    const op = player; player = pl;
    if (pl.stealth > 0) ctx.globalAlpha = 0.4;
    drawCharacter(pl, true);
    ctx.globalAlpha = 1;
    player = op;
    if (coop) {
      const col = pl.idx === 0 ? '#ffd86b' : '#6fd6ff';
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 11px "Bungee", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(pl.idx === 0 ? 'P1' : 'P2', pl.x, pl.y - pl.r - 13);
    }
    const aimx = (pl.controls && pl.controls.mouse) ? mouse.x : pl.x + Math.cos(pl.face) * 240;
    const aimy = (pl.controls && pl.controls.mouse) ? mouse.y : pl.y + Math.sin(pl.face) * 240;
    const ang = Math.atan2(aimy - pl.y, aimx - pl.x);
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

function render() {
  ctx.fillStyle = '#0c0716';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shakeMag > 0.1) ctx.translate((Math.random() * 2 - 1) * shakeMag, (Math.random() * 2 - 1) * shakeMag);
  drawMap();
  drawZones();
  drawProjectiles();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawRings();
  drawDmgTexts();
  ctx.restore();
  if (shakeMag > 0) { shakeMag *= 0.86; if (shakeMag < 0.1) shakeMag = 0; }
}

