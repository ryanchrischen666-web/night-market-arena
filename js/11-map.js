'use strict';

// ============ MAPS & COLLISION ============
const MAP_THEMES = ['ninja', 'market', 'kitchen'];

function hexA(hex, a) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return `rgba(255,216,107,${a})`;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function drawCrescent(angC, R0, R1, col, alpha, half) {
  ctx.beginPath();
  ctx.arc(0, 0, R1, angC - half, angC + half);
  ctx.arc(0, 0, R0, angC + half, angC - half, true);
  ctx.closePath();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function addBlock(arr, x, y, w, h, kind) {
  const m = 14;
  for (const b of arr) {
    if (x < b.x + b.w + m && x + w > b.x - m && y < b.y + b.h + m && y + h > b.y - m) return;
  }
  arr.push({ x, y, w, h, kind });
}

function genBlocks(theme) {
  const blocks = [];
  const kinds = theme === 'ninja' ? ['stone', 'bamboo'] : theme === 'market' ? ['crate', 'barrel'] : ['counter', 'choppingblock'];
  const cx = W / 2, y0 = 160, y1 = H - 160;
  const pick = () => kinds[Math.floor(Math.random() * kinds.length)];
  const pair = (x, y, w, h) => { addBlock(blocks, x, y, w, h, pick()); if (Math.abs((x + w / 2) - cx) > w * 0.5 + 6) addBlock(blocks, W - x - w, y, w, h, pick()); };
  const variant = Math.floor(Math.random() * 3);
  if (variant === 0) { addBlock(blocks, cx - 45, H / 2 - 45, 90, 90, pick()); pair(120, 190, 70, 70); pair(150, 380, 64, 64); }
  else if (variant === 1) { pair(250, 290, 70, 70); pair(90, 230, 60, 120); addBlock(blocks, cx - 35, 180, 70, 70, pick()); addBlock(blocks, cx - 40, 390, 80, 60, pick()); }
  else { pair(110, 200, 80, 80); pair(300, 330, 64, 64); pair(200, 390, 60, 60); }
  for (const b of blocks) { b.x += rand(-10, 10); b.y += rand(-10, 10); b.x = clamp(b.x, 24, W - 24 - b.w); b.y = clamp(b.y, y0, y1 - b.h); }
  return blocks;
}

function ptClear(x, y, pad, blocks) {
  for (const b of blocks) { if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return false; }
  return true;
}

function genProps(theme, blocks) {
  const props = [];
  // 左右兩側一定各有一隻加速鞋（被障礙擋住就上下挪），中間/下方放補血
  const clearSpot = (x, y) => {
    for (const dy of [0, -60, 60, -120, 120, -180, 180]) {
      if (ptClear(x, y + dy, 30, blocks)) return { x, y: y + dy };
    }
    return { x, y };
  };
  const L = clearSpot(110, H / 2), R = clearSpot(W - 110, H / 2);
  props.push({ x: L.x, y: L.y, r: 17, cd: 0, maxCd: 9, type: 'boots' });
  props.push({ x: R.x, y: R.y, r: 17, cd: 0, maxCd: 9, type: 'boots' });
  const healCand = [{ x: W / 2, y: H / 2 }, { x: 170, y: H - 210 }, { x: W - 170, y: H - 210 }, { x: W / 2, y: 210 }];
  for (const c of healCand) {
    if (!ptClear(c.x, c.y, 30, blocks)) continue;
    if (Math.hypot(c.x - W / 2, c.y - (H - 120)) < 80) continue;   // 別壓到下方出生點
    if (Math.hypot(c.x - W / 2, c.y - 120) < 80) continue;         // 別壓到上方出生點（連線）
    props.push({ x: c.x, y: c.y, r: 17, cd: 0, maxCd: 9, heal: 22, type: 'heal' });
    break;
  }
  return props;
}

function buildMap() {
  const theme = MAP_THEMES[Math.floor(Math.random() * MAP_THEMES.length)];
  const blocks = genBlocks(theme);
  const props = genProps(theme, blocks);
  return { theme, blocks, props };
}

function resolveBlocks(c) {
  if (!currentMap) return;
  for (let iter = 0; iter < 2; iter++) {
    for (const b of currentMap.blocks) {
      const closestX = clamp(c.x, b.x, b.x + b.w);
      const closestY = clamp(c.y, b.y, b.y + b.h);
      const dx = c.x - closestX, dy = c.y - closestY;
      const d2 = dx * dx + dy * dy;
      if (d2 < c.r * c.r) {
        if (d2 > 0.0001) { const d = Math.sqrt(d2); const push = c.r - d; c.x += dx / d * push; c.y += dy / d * push; }
        else {
          const left = c.x - b.x, right = b.x + b.w - c.x, top = c.y - b.y, bot = b.y + b.h - c.y;
          const mn = Math.min(left, right, top, bot);
          if (mn === left) c.x = b.x - c.r; else if (mn === right) c.x = b.x + b.w + c.r;
          else if (mn === top) c.y = b.y - c.r; else c.y = b.y + b.h + c.r;
        }
      }
    }
  }
}

// ---- map rendering ----
function cornerGlow(prefix, t) {
  const corners = [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]];
  for (const [x, y] of corners) {
    const glow = 28 + Math.sin(t * 2 + x) * 5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, glow);
    g.addColorStop(0, prefix + '0.3)'); g.addColorStop(1, prefix + '0)');
    ctx.fillStyle = g; ctx.fillRect(x - glow, y - glow, glow * 2, glow * 2);
  }
}

function drawFloorMarket(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1f1230'); g.addColorStop(1, '#150b22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(244,169,60,0.05)'; ctx.lineWidth = 1;
  for (let y = 40; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    const off = ((y / 40) % 2) * 20;
    for (let x = off; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.stroke(); }
  }
  for (let i = 0; i < 6; i++) {
    const lx = (i + 0.5) * (W / 6), sway = Math.sin(t * 1.5 + i) * 4;
    ctx.strokeStyle = 'rgba(120,90,40,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + sway, 26); ctx.stroke();
    const lg = ctx.createRadialGradient(lx + sway, 30, 2, lx + sway, 30, 22); lg.addColorStop(0, 'rgba(244,169,60,0.5)'); lg.addColorStop(1, 'rgba(244,169,60,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx + sway, 30, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d62828'; ctx.beginPath(); ctx.ellipse(lx + sway, 30, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc6b'; ctx.fillRect(lx + sway - 7, 29, 14, 2);
  }
  cornerGlow('rgba(244,169,60,', t);
}

function drawFloorNinja(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#10172a'); g.addColorStop(1, '#0a0f1e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const mw = 150, mh = H / 4;
  for (let r = 0; r < 4; r++) for (let c = 0; c < Math.ceil(W / mw); c++) {
    const x = c * mw, y = r * mh;
    ctx.fillStyle = ((r + c) % 2) ? 'rgba(40,60,70,0.18)' : 'rgba(30,46,56,0.18)'; ctx.fillRect(x, y, mw, mh);
    ctx.strokeStyle = 'rgba(70,120,120,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, mw - 2, mh - 2);
  }
  for (let i = 0; i < 10; i++) {
    const px = ((i * 97 + t * 22 * ((i % 2) ? 1 : -1)) % W + W) % W;
    const py = ((i * 61 + t * 16) % H + H) % H;
    ctx.fillStyle = 'rgba(225,150,180,0.22)'; ctx.beginPath(); ctx.ellipse(px, py, 3, 1.6, i, 0, Math.PI * 2); ctx.fill();
  }
  cornerGlow('rgba(79,209,197,', t);
  const corners = [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]];
  for (const [x, y] of corners) { ctx.fillStyle = '#1b2740'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4fd1c5'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
}

function drawFloorKitchen(t) {
  const ts = 48;
  for (let r = 0; r * ts < H; r++) for (let c = 0; c * ts < W; c++) { ctx.fillStyle = ((r + c) % 2) ? '#d7dde3' : '#bcc5cd'; ctx.fillRect(c * ts, r * ts, ts, ts); }
  ctx.strokeStyle = 'rgba(120,130,140,0.4)'; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += ts) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += ts) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const bg = ctx.createLinearGradient(0, 0, 0, 46); bg.addColorStop(0, '#aeb7bf'); bg.addColorStop(1, '#cfd6dc');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, 6, W, 3);
  ctx.strokeStyle = '#8b939b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(W, 40); ctx.stroke();
  const lg = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, 260); lg.addColorStop(0, 'rgba(255,240,200,0.35)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, 260);
  const vg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 520); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,20,30,0.25)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

function drawStoneBlock(x, y, w, h) {
  ctx.beginPath(); _roundRectPath(ctx, x, y, w, h, 8);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#6b7280'); g.addColorStop(1, '#3b424d');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#272c34'; ctx.stroke();
  ctx.beginPath(); _roundRectPath(ctx, x + 4, y + 4, w - 8, h * 0.4, 5); ctx.fillStyle = 'rgba(190,200,210,0.32)'; ctx.fill();
  ctx.strokeStyle = 'rgba(20,24,30,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.3); ctx.lineTo(x + w * 0.45, y + h * 0.6); ctx.lineTo(x + w * 0.35, y + h * 0.85); ctx.stroke();
  ctx.fillStyle = 'rgba(90,150,110,0.5)';
  for (const m of [[0.2, 0.15], [0.8, 0.25], [0.6, 0.9]]) { ctx.beginPath(); ctx.ellipse(x + w * m[0], y + h * m[1], 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
}

function drawBambooBlock(x, y, w, h) {
  const n = Math.max(3, Math.round(w / 18)), pw = w / n;
  for (let i = 0; i < n; i++) {
    const px = x + i * pw;
    const g = ctx.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, '#5a7d3a'); g.addColorStop(0.5, '#86a84f'); g.addColorStop(1, '#5a7d3a');
    ctx.fillStyle = g; ctx.beginPath(); _roundRectPath(ctx, px + 1, y, pw - 2, h, pw * 0.4); ctx.fill();
    ctx.strokeStyle = '#3c5326'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,60,25,0.7)'; ctx.lineWidth = 2;
    for (const ny of [0.3, 0.62]) { ctx.beginPath(); ctx.moveTo(px + 1, y + h * ny); ctx.lineTo(px + pw - 1, y + h * ny); ctx.stroke(); }
  }
  ctx.strokeStyle = '#caa869'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + h * 0.5); ctx.lineTo(x + w, y + h * 0.5); ctx.stroke();
}

function drawCrateBlock(x, y, w, h) {
  ctx.beginPath(); _roundRectPath(ctx, x, y, w, h, 6);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#b07a3f'); g.addColorStop(1, '#7c5226');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#5b3a18'; ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = '#8a5a2b'; ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + w - 6, y + h - 6); ctx.moveTo(x + w - 6, y + 6); ctx.lineTo(x + 6, y + h - 6); ctx.stroke();
  ctx.fillStyle = 'rgba(255,220,160,0.18)'; ctx.fillRect(x + 5, y + 5, w - 10, h * 0.28);
}

function drawBarrelBlock(x, y, w, h) {
  ctx.beginPath(); _roundRectPath(ctx, x, y, w, h, Math.min(w, h) * 0.45);
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#6b4423'); g.addColorStop(0.5, '#9c6a36'); g.addColorStop(1, '#6b4423');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#4a2f17'; ctx.stroke();
  ctx.strokeStyle = '#caa869'; ctx.lineWidth = 4;
  for (const ny of [0.18, 0.5, 0.82]) { ctx.beginPath(); ctx.moveTo(x + 2, y + h * ny); ctx.lineTo(x + w - 2, y + h * ny); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(40,25,12,0.4)'; ctx.lineWidth = 1.5;
  for (const nx of [0.35, 0.5, 0.65]) { ctx.beginPath(); ctx.moveTo(x + w * nx, y + 3); ctx.lineTo(x + w * nx, y + h - 3); ctx.stroke(); }
}

function drawCounterBlock(x, y, w, h) {
  ctx.beginPath(); _roundRectPath(ctx, x, y, w, h, 5);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#cdd4da'); g.addColorStop(0.5, '#9aa4ad'); g.addColorStop(1, '#727c85');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5a626b'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x + 4, y + 5, w - 8, 5);
  const bw = w * 0.7, bh = h * 0.5, bx = x + (w - bw) / 2, by = y + h * 0.22;
  ctx.beginPath(); _roundRectPath(ctx, bx, by, bw, bh, 5);
  const g2 = ctx.createLinearGradient(0, by, 0, by + bh); g2.addColorStop(0, '#d6a86a'); g2.addColorStop(1, '#b07e44');
  ctx.fillStyle = g2; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#7c5226'; ctx.stroke();
  ctx.fillStyle = '#cc4444'; for (const vx of [0.3, 0.5, 0.7]) { ctx.beginPath(); ctx.arc(bx + bw * vx, by + bh * 0.5, 3, 0, Math.PI * 2); ctx.fill(); }
}

function drawChopBlock(x, y, w, h) {
  ctx.beginPath(); _roundRectPath(ctx, x, y, w, h, 6);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#caa063'); g.addColorStop(1, '#9a6f38');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#6e4a22'; ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,25,0.4)'; ctx.lineWidth = 1.5;
  for (const ny of [0.3, 0.5, 0.7]) { ctx.beginPath(); ctx.moveTo(x + 4, y + h * ny); ctx.lineTo(x + w - 4, y + h * ny); ctx.stroke(); }
  ctx.save(); ctx.translate(x + w * 0.5, y + h * 0.25); ctx.rotate(-0.5);
  ctx.fillStyle = '#d9dde2'; ctx.beginPath(); _roundRectPath(ctx, -3, -2, w * 0.5, 8, 3); ctx.fill(); ctx.strokeStyle = '#7a828b'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-14, -2, 12, 7);
  ctx.restore();
}

function drawBlock(b, theme, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(b.x + b.w / 2 + 4, b.y + b.h + 6, b.w * 0.55, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (theme === 'ninja') { if (b.kind === 'bamboo') drawBambooBlock(b.x, b.y, b.w, b.h); else drawStoneBlock(b.x, b.y, b.w, b.h); }
  else if (theme === 'kitchen') { if (b.kind === 'choppingblock') drawChopBlock(b.x, b.y, b.w, b.h); else drawCounterBlock(b.x, b.y, b.w, b.h); }
  else { if (b.kind === 'barrel') drawBarrelBlock(b.x, b.y, b.w, b.h); else drawCrateBlock(b.x, b.y, b.w, b.h); }
}

function drawHeart(cx, cy, s, col) {
  ctx.save(); ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.8);
  ctx.bezierCurveTo(cx + s, cy, cx + s * 0.6, cy - s, cx, cy - s * 0.3);
  ctx.bezierCurveTo(cx - s * 0.6, cy - s, cx - s, cy, cx, cy + s * 0.8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function drawBasin(x, y, t, charged) {
  ctx.beginPath(); _roundRectPath(ctx, x - 16, y - 4, 32, 20, 6);
  const g = ctx.createLinearGradient(0, y - 4, 0, y + 16); g.addColorStop(0, '#6b7280'); g.addColorStop(1, '#3b424d');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#272c34'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y - 2, 12, 5, 0, 0, Math.PI * 2); ctx.fillStyle = charged ? '#4fd1c5' : '#3a6b66'; ctx.fill();
  if (charged) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(x - 4 + Math.sin(t * 2) * 2, y - 3, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
}

function drawSoupStand(x, y, t, charged) {
  ctx.beginPath(); _roundRectPath(ctx, x - 15, y - 6, 30, 22, 7);
  const g = ctx.createLinearGradient(0, y - 6, 0, y + 16); g.addColorStop(0, '#8a5a2b'); g.addColorStop(1, '#4a2f17');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#3a230f'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y - 4, 12, 4, 0, 0, Math.PI * 2); ctx.fillStyle = charged ? '#d8632a' : '#7a3322'; ctx.fill();
  ctx.strokeStyle = '#caa869'; ctx.lineWidth = 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * 16, y + 4, 4, -Math.PI / 2, Math.PI / 2, s < 0); ctx.stroke(); }
  if (charged) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; for (const s of [-1, 1]) { const bx = x + s * 5; ctx.beginPath(); for (let k = 0; k <= 4; k++) { const yy = y - 6 - k * 5, xx = bx + Math.sin(t * 3 + k + s) * 3; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } }
}

function drawFruitBowl(x, y, charged) {
  const apple = (ax, ay) => { ctx.fillStyle = charged ? '#e0433a' : '#7a3a36'; ctx.beginPath(); ctx.arc(ax, ay, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke(); if (charged) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(ax - 2, ay - 2, 1.6, 0, Math.PI * 2); ctx.fill(); } };
  apple(x - 6, y - 6); apple(x + 6, y - 6); apple(x, y - 10);
  ctx.beginPath(); ctx.moveTo(x - 17, y - 4); ctx.quadraticCurveTo(x, y + 18, x + 17, y - 4); ctx.closePath();
  const g = ctx.createLinearGradient(0, y - 4, 0, y + 14); g.addColorStop(0, '#dfe6ec'); g.addColorStop(1, '#aab3bb');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#6a727b'; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 13, y - 2); ctx.quadraticCurveTo(x, y + 10, x + 13, y - 2); ctx.stroke();
}

function drawHealProp(hp, theme, t) {
  if (hp.gone) return;
  const charged = hp.cd <= 0, x = hp.x, y = hp.y;
  const boots = hp.type === 'boots';
  const glow = boots ? '127,216,255' : '125,223,107';
  ctx.save();
  if (charged) {
    const pulse = 0.5 + Math.sin(t * 3) * 0.2;
    const g = ctx.createRadialGradient(x, y + 8, 2, x, y + 8, 34);
    g.addColorStop(0, `rgba(${glow},${0.35 * pulse})`); g.addColorStop(1, `rgba(${glow},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + 10, 32, 14, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 14, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = charged ? 1 : 0.55;
  if (boots) drawBoots(x, y, t, charged);
  else if (theme === 'ninja') drawBasin(x, y, t, charged);
  else if (theme === 'kitchen') drawFruitBowl(x, y, charged);
  else drawSoupStand(x, y, t, charged);
  ctx.restore();
  if (!charged) {
    const fr = 1 - hp.cd / hp.maxCd;
    ctx.strokeStyle = 'rgba(245,230,200,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 2, 16, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2); ctx.stroke();
  }
  const hy = y - 32 + (charged ? Math.sin(t * 3) * 3 : 0);
  drawHeart(x, hy, 7, charged ? '#7ddf6b' : 'rgba(150,160,150,0.6)');
}

// 加速鞋：彈跳的球鞋 + 速度線
function drawBoots(x, y, t, charged) {
  const bob = charged ? Math.sin(t * 4) * 4 : 0;
  ctx.save();
  ctx.translate(x, y - 6 + bob);
  if (charged) {
    ctx.strokeStyle = 'rgba(127,216,255,0.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const off = ((t * 90 + i * 14) % 34) - 8;
      ctx.beginPath(); ctx.moveTo(-24 + off, -4 + i * 6); ctx.lineTo(-14 + off, -4 + i * 6); ctx.stroke();
    }
  }
  ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('\ud83d\udc5f', 0, 0);   // 👟
  ctx.restore();
}

function drawMap() {
  if (!currentMap) { drawArena(); return; }
  const t = performance.now() / 1000;
  if (currentMap.theme === 'ninja') drawFloorNinja(t);
  else if (currentMap.theme === 'kitchen') drawFloorKitchen(t);
  else drawFloorMarket(t);
  for (const b of currentMap.blocks) drawBlock(b, currentMap.theme, t);
  for (const hp of currentMap.props) drawHealProp(hp, currentMap.theme, t);
}

