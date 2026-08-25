'use strict';

// ============ RENDER ============
function drawArena() {
  ctx.fillStyle = '#1a0e2e';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(244, 169, 60, 0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const corners = [[40,40],[W-40,40],[40,H-40],[W-40,H-40]];
  for (const [x, y] of corners) {
    const t = performance.now() / 1000;
    const glow = 30 + Math.sin(t * 2 + x) * 5;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, glow);
    grd.addColorStop(0, 'rgba(244, 169, 60, 0.3)');
    grd.addColorStop(1, 'rgba(244, 169, 60, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - glow, y - glow, glow * 2, glow * 2);
    ctx.fillStyle = '#d62828';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc6b';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawZones() {
  for (const z of zones) {
    const a = z.life / z.maxLife;
    if (z.type === 'cone') {
      ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(z.ang);
      ctx.fillStyle = z.hostile ? `rgba(214, 40, 40, ${0.4 * a})` : `rgba(244, 169, 60, ${0.4 * a})`;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,z.range,-z.arc/2,z.arc/2); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (z.type === 'oil') {
      ctx.fillStyle = `rgba(58, 42, 26, ${0.5 * a})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(244, 169, 60, ${0.4 * a})`; ctx.lineWidth = 2; ctx.stroke();
    } else if (z.type === 'ice') {
      ctx.fillStyle = `rgba(168, 216, 255, ${0.35 * a})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(207, 234, 255, ${0.7 * a})`; ctx.lineWidth = 2; ctx.stroke();
    } else if (z.type === 'slick') {
      ctx.fillStyle = `rgba(168, 216, 255, ${0.2 * a})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(244, 169, 60, ${0.5 * a})`;
      ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    } else if (z.type === 'wrap' && z.target && !z.target.dead) {
      ctx.strokeStyle = `rgba(245, 230, 200, ${0.8 * a})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(z.target.x, z.target.y, 28, 0, Math.PI*2); ctx.stroke();
    } else if (z.type === 'swing') {
      ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(z.ang);
      const pr = 1 - a, span = z.span || Math.PI/2.3, half = z.half || 0.3, col = z.color || '#ffcc6b';
      const R0 = z.range * 0.46, R1 = z.range * 1.02;
      const sweep = -span + pr * 2 * span;
      for (let i = 1; i <= 4; i++) { const gp = pr - i * 0.11; if (gp < 0) continue; drawCrescent(-span + gp * 2 * span, R0, R1, col, a * 0.3 * (1 - i / 5), half * 0.9); }
      drawCrescent(sweep, R0, R1, col, a * 0.85, half * 1.15);
      drawCrescent(sweep, R0 * 1.12, R1 * 0.98, '#ffffff', a * 0.9, half * 0.5);
      const tx = Math.cos(sweep) * R1, ty = Math.sin(sweep) * R1;
      ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx, ty, 2 + 3 * a, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      if (z.heavy && pr > 0.55) { const sw = (pr - 0.55) / 0.45; ctx.strokeStyle = `rgba(255,255,255,${(1 - sw) * 0.45})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, z.range * (0.5 + sw * 0.7), -span, span); ctx.stroke(); }
      ctx.restore();
    } else if (z.type === 'stink') {
      ctx.fillStyle = z.hostile ? `rgba(120, 80, 50, ${0.4 * Math.min(a*2, 1)})` : `rgba(122, 138, 58, ${0.4 * Math.min(a*2, 1)})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(122, 138, 58, ${0.7 * a})`; ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]);
    } else if (z.type === 'ink') {
      ctx.fillStyle = `rgba(20, 8, 30, ${0.7 * a})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 - a*0.3), 0, Math.PI*2); ctx.fill();
    } else if (z.type === 'rice') {
      ctx.fillStyle = `rgba(245, 230, 200, ${0.3 * a})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(245, 230, 200, ${0.6 * a})`;
      ctx.setLineDash([2, 4]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    } else if (z.type === 'smoke') {
      ctx.fillStyle = `rgba(156, 138, 108, ${0.4 * a})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 + (1-a)*0.3), 0, Math.PI*2); ctx.fill();
    } else if (z.type === 'soup') {
      ctx.fillStyle = `rgba(255, 226, 122, ${0.18 * a})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(255, 226, 122, ${0.6 * a})`;
      ctx.setLineDash([8, 4]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    }
  }
}

function drawProjectiles() {
  const t = performance.now() / 1000;
  for (const p of projectiles) {
    const sp = Math.hypot(p.vx, p.vy) || 1;
    const ang = Math.atan2(p.vy, p.vx);
    const col = p.color && p.color[0] === '#' ? p.color : '#ffd86b';
    ctx.save();
    ctx.translate(p.x, p.y);
    const gr = p.r + 7;
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
    rg.addColorStop(0, hexA(col, 0.55));
    rg.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, gr, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(ang);
    if (p.style === 'ink') {
      for (let i = 1; i <= 3; i++) { ctx.fillStyle = hexA(col, 0.5 / i); ctx.beginPath(); ctx.arc(-i * p.r * 1.25, Math.sin(t * 20 + i) * p.r * 0.3, p.r * (1 - 0.18 * i), 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = col; ctx.beginPath();
      const lobes = 8;
      for (let i = 0; i <= lobes; i++) { const a2 = i / lobes * Math.PI * 2; const rr = p.r * (1.05 + Math.sin(a2 * 3 + t * 18) * 0.13); const x = Math.cos(a2) * rr, y = Math.sin(a2) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.32, 0, Math.PI * 2); ctx.fill();
    } else if (p.style === 'pearl') {
      for (let i = 1; i <= 3; i++) { ctx.fillStyle = hexA('#e7c89e', 0.4 / i); ctx.beginPath(); ctx.arc(-i * p.r * 1.2, Math.sin(t * 16 + i) * p.r * 0.2, p.r * (1 - 0.2 * i), 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#e7c89e'; ctx.beginPath(); ctx.arc(0, 0, p.r * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1c12'; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.66, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-p.r * 0.35, -p.r * 0.35, p.r * 0.22, 0, Math.PI * 2); ctx.fill();
    } else {
      const len = Math.min(28, 9 + sp * 2.3);
      const tg = ctx.createLinearGradient(-len, 0, 0, 0);
      tg.addColorStop(0, hexA(col, 0)); tg.addColorStop(1, hexA(col, 0.85));
      ctx.fillStyle = tg; ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.quadraticCurveTo(-len * 0.4, -p.r * 0.9, 0, -p.r);
      ctx.lineTo(0, p.r);
      ctx.quadraticCurveTo(-len * 0.4, p.r * 0.9, -len, 0);
      ctx.closePath(); ctx.fill();
      const puls = 1 + Math.sin(t * 22 + p.x * 0.1) * 0.08;
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(p.r * 0.15, 0, p.r * 0.95 * puls, p.r * 0.72 * puls, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(p.r * 0.3, 0, p.r * 0.5 * puls, p.r * 0.4 * puls, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

