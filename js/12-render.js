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
      // 冰晶：六道放射尖刺，炸開瞬間最大再縮回
      const grow = Math.min(1, (1 - a) * 4);
      ctx.save(); ctx.translate(z.x, z.y); ctx.strokeStyle = `rgba(230,246,255,${0.8 * a})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 + 0.3; const L = z.r * 0.75 * grow; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * L, Math.sin(an) * L); ctx.moveTo(Math.cos(an) * L * 0.6, Math.sin(an) * L * 0.6); ctx.lineTo(Math.cos(an + 0.4) * L * 0.75, Math.sin(an + 0.4) * L * 0.75); ctx.stroke(); }
      ctx.restore();
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
      const tt = performance.now() / 1000, vis = Math.min(a * 2, 1);
      ctx.fillStyle = z.hostile ? `rgba(120, 80, 50, ${0.4 * vis})` : `rgba(122, 138, 58, ${0.4 * vis})`;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(122, 138, 58, ${0.7 * a})`; ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]);
      // 冒泡泡／熱氣：往上飄的小圈
      const nb = Math.max(3, Math.round(z.r / 18));
      for (let i = 0; i < nb; i++) {
        const ph = (tt * 0.6 + i * 0.37 + z.x * 0.01) % 1;
        const bx = z.x + Math.sin(i * 2.4 + z.y) * z.r * 0.6, by = z.y + z.r * 0.3 - ph * z.r * 1.1;
        ctx.strokeStyle = z.hostile ? `rgba(255,170,90,${(1 - ph) * 0.6 * vis})` : `rgba(190,220,120,${(1 - ph) * 0.6 * vis})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(bx, by, 3 + ph * 4, 0, Math.PI * 2); ctx.stroke();
      }
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
      const tt = performance.now() / 1000;
      const sg = ctx.createRadialGradient(z.x, z.y, z.r * 0.2, z.x, z.y, z.r);
      sg.addColorStop(0, `rgba(255, 226, 122, ${0.05 * a})`); sg.addColorStop(1, `rgba(255, 226, 122, ${0.22 * a})`);
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(tt * 0.4);
      ctx.strokeStyle = `rgba(255, 226, 122, ${0.6 * a})`;
      ctx.setLineDash([8, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      // 治癒光點往上飄
      for (let i = 0; i < 6; i++) { const ph = (tt * 0.5 + i * 0.17) % 1; const px = z.x + Math.cos(i * 1.05 + tt * 0.2) * z.r * 0.7, py = z.y + z.r * 0.5 - ph * z.r; ctx.fillStyle = `rgba(255,240,170,${(1 - ph) * 0.7 * a})`; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}

function drawProjectiles() {
  const t = performance.now() / 1000;
  for (const p of projectiles) {
    const sp = Math.hypot(p.vx, p.vy) || 1;
    const ang = Math.atan2(p.vy, p.vx);
    const col = p.color && p.color[0] === '#' ? p.color : '#ffd86b';
    // 拖尾：最近幾幀的位置，由細到粗、由淡到濃
    if (p.trail && p.trail.length >= 4 && p.style !== 'wave') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const n = p.trail.length / 2;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        ctx.strokeStyle = hexA(col, 0.05 + k * 0.3); ctx.lineWidth = p.r * 1.6 * k;
        ctx.beginPath(); ctx.moveTo(p.trail[(i - 1) * 2], p.trail[(i - 1) * 2 + 1]); ctx.lineTo(p.trail[i * 2], p.trail[i * 2 + 1]); ctx.stroke();
      }
      ctx.restore();
    }
    if (p.style === 'wave') {   // 雞排酥浪：寬幅弧形衝擊波
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
      const k = Math.max(0, Math.min(1, p.life));
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const rr = p.r * (1.2 - i * 0.28);
        ctx.strokeStyle = hexA(i === 1 ? '#ffffff' : col, (0.85 - i * 0.22) * (0.4 + k * 0.6));
        ctx.lineWidth = 5 - i * 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-rr * 0.9 - i * 6, 0, rr, -1.1, 1.1); ctx.stroke();
      }
      const wg = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 1.4);
      wg.addColorStop(0, hexA(col, 0.35)); wg.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(0, 0, p.r * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      continue;
    }
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

