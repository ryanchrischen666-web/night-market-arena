'use strict';

// ============ CHARACTER ART (chunky, cel-shaded, Brawl-style) ============
const ART_OUTLINE = '#2a1320';
function _lj(g) { g.lineJoin = 'round'; g.lineCap = 'round'; }
function _ol(g, w) { _lj(g); g.lineWidth = w; g.strokeStyle = ART_OUTLINE; g.stroke(); }
function _vg(g, yTop, yBot, c0, c1, c2) {
  const grd = g.createLinearGradient(0, yTop, 0, yBot);
  grd.addColorStop(0, c0); grd.addColorStop(0.52, c1); grd.addColorStop(1, c2);
  return grd;
}
function _gloss(g, x, y, rx, ry, a) {
  g.save(); g.globalAlpha = (a === undefined ? 0.5 : a); g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(x, y, rx, ry, -0.6, 0, Math.PI * 2); g.fill(); g.restore();
}
function _roundRectPath(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
const _BROW = {
  fierce: { o: -0.05, i: 0.42 }, tough: { o: -0.05, i: 0.32 }, happy: { o: 0.18, i: -0.22 },
  excited: { o: 0.22, i: -0.3 }, calm: { o: 0.02, i: 0.04 }, wise: { o: 0.06, i: 0.12 },
  grumpy: { o: 0.28, i: 0.26 }, sly: { o: -0.12, i: -0.36 },
};
function _eyes(g, cx, cy, er, sep, look, blink, mood) {
  const narrow = (mood === 'sly' || mood === 'grumpy' || mood === 'wise') ? 0.62 : 1;
  const open = Math.max(0.10, 1 - (blink || 0) / 0.12);
  for (const s of [-1, 1]) {
    const x = cx + s * sep;
    g.beginPath(); g.ellipse(x, cy, er, er * narrow * open, 0, 0, Math.PI * 2);
    g.fillStyle = '#fff'; g.fill(); _ol(g, er * 0.32);
    if (open > 0.45) {
      const px = x + look * er * 0.45, py = cy + er * 0.16 * narrow;
      g.beginPath(); g.ellipse(px, py, er * 0.5, er * 0.6 * narrow, 0, 0, Math.PI * 2);
      g.fillStyle = '#231016'; g.fill();
      g.beginPath(); g.arc(px - er * 0.16, py - er * 0.2, er * 0.18, 0, Math.PI * 2);
      g.fillStyle = '#fff'; g.fill();
    }
  }
  const b = _BROW[mood] || _BROW.calm, by = cy - er * 1.25;
  g.strokeStyle = ART_OUTLINE; g.lineCap = 'round'; g.lineWidth = er * 0.4;
  for (const s of [-1, 1]) {
    const x = cx + s * sep;
    g.beginPath();
    g.moveTo(x + s * er * 0.75, by + er * b.o);
    g.lineTo(x - s * er * 0.45, by + er * b.i);
    g.stroke();
  }
}
function _mouth(g, cx, cy, w, type) {
  g.strokeStyle = ART_OUTLINE; g.fillStyle = ART_OUTLINE; g.lineCap = 'round'; g.lineWidth = w * 0.22;
  if (type === 'smile') { g.beginPath(); g.arc(cx, cy - w * 0.3, w * 0.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  else if (type === 'grin') {
    g.beginPath(); g.moveTo(cx - w * 0.5, cy); g.quadraticCurveTo(cx, cy + w * 0.65, cx + w * 0.5, cy);
    g.quadraticCurveTo(cx, cy + w * 0.12, cx - w * 0.5, cy); g.fill();
    g.fillStyle = '#fff'; g.fillRect(cx - w * 0.4, cy + w * 0.02, w * 0.8, w * 0.14);
  }
  else if (type === 'smirk') { g.beginPath(); g.moveTo(cx - w * 0.4, cy); g.quadraticCurveTo(cx + w * 0.2, cy + w * 0.12, cx + w * 0.5, cy - w * 0.22); g.stroke(); }
  else if (type === 'oh') { g.beginPath(); g.ellipse(cx, cy, w * 0.22, w * 0.3, 0, 0, Math.PI * 2); g.fill(); }
  else if (type === 'flat') { g.beginPath(); g.moveTo(cx - w * 0.4, cy); g.lineTo(cx + w * 0.4, cy); g.stroke(); }
  else if (type === 'fang') {
    g.beginPath(); g.moveTo(cx - w * 0.45, cy); g.lineTo(cx + w * 0.45, cy); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - w * 0.18, cy); g.lineTo(cx + w * 0.06, cy); g.lineTo(cx - w * 0.06, cy + w * 0.24); g.closePath(); g.fill();
  }
}

function drawHeroArt(g, id, R, t, blink) {
  const look = 0.5;
  switch (id) {
    case 'chicken': {
      const cy = -R * 1.05;
      // 蒸氣（隨時間搖曳）
      g.save();
      g.strokeStyle = 'rgba(255,240,210,0.5)'; g.lineWidth = R * 0.09; g.lineCap = 'round';
      for (const sx of [-0.45, 0.05, 0.5]) {
        const ph = t * 3 + sx * 5;
        g.beginPath();
        g.moveTo(sx * R, cy - R * 1.05);
        g.quadraticCurveTo(sx * R + Math.sin(ph) * R * 0.22, cy - R * 1.45, sx * R + Math.sin(ph + 1.2) * R * 0.15, cy - R * 1.8);
        g.stroke();
      }
      g.restore();
      // 本體：大片雞排（圓角梯形），酥脆鋸齒邊
      const w = R * 1.15, h = R * 1.0;
      g.beginPath();
      const bumps = 16;
      for (let i = 0; i <= bumps; i++) {
        const a = (Math.PI * 2 * i) / bumps;
        const wob = 1 + 0.085 * Math.sin(a * 5 + 1.3) + 0.05 * Math.cos(a * 3);
        const px = Math.cos(a) * w * wob, py = cy + Math.sin(a) * h * wob * (a < Math.PI ? 1.06 : 0.94);
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.closePath();
      g.fillStyle = _vg(g, cy - h, cy + h, '#ffd97a', '#f0a832', '#b06b1a');
      g.fill(); _ol(g, R * 0.16);
      // 咬一口的缺角（露出白肉）
      g.save();
      g.beginPath(); g.arc(w * 0.62, cy - h * 0.62, R * 0.34, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#fff3e0'; g.fillRect(w * 0.2, cy - h * 1.2, R, R);
      g.strokeStyle = 'rgba(140,80,20,0.6)'; g.lineWidth = R * 0.05;
      g.beginPath(); g.arc(w * 0.62, cy - h * 0.62, R * 0.3, 0, Math.PI * 2); g.stroke();
      g.restore();
      // 酥皮質感：小凸粒
      g.fillStyle = 'rgba(140,80,15,0.35)';
      for (const sp of [[-0.55,-0.25,0.09],[-0.15,-0.5,0.07],[0.3,0.1,0.08],[-0.35,0.3,0.07],[0.15,0.5,0.09],[0.55,0.35,0.06],[-0.7,0.1,0.06]]) {
        g.beginPath(); g.arc(sp[0] * w, cy + sp[1] * h, sp[2] * R, 0, Math.PI * 2); g.fill();
      }
      // 芝麻與辣椒粉
      for (const sm of [[-0.4,-0.05],[0.05,-0.3],[0.42,-0.18],[-0.1,0.28],[0.3,0.42]]) {
        g.save(); g.translate(sm[0] * w, cy + sm[1] * h); g.rotate(sm[0] * 3);
        g.fillStyle = '#fff8e8'; g.beginPath(); g.ellipse(0, 0, R * 0.075, R * 0.045, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.fillStyle = 'rgba(214,40,40,0.75)';
      for (const cp of [[-0.25,-0.35],[0.18,0.05],[-0.5,0.42],[0.48,-0.42]]) {
        g.fillRect(cp[0] * w, cy + cp[1] * h, R * 0.06, R * 0.06);
      }
      _gloss(g, -w * 0.35, cy - h * 0.55, R * 0.55, R * 0.22, 0.35);
      // 得意的表情
      _eyes(g, 0, cy - R * 0.02, R * 0.2, R * 0.34, look, blink, 'tough');
      _mouth(g, 0, cy + R * 0.42, R * 0.5, 'smirk');
      // 底下的紙袋（夜市感）
      g.fillStyle = '#e8d5b5';
      g.beginPath(); g.moveTo(-R * 0.72, cy + h * 0.55); g.lineTo(R * 0.72, cy + h * 0.55);
      g.lineTo(R * 0.6, cy + h * 1.12); g.lineTo(-R * 0.6, cy + h * 1.12); g.closePath(); g.fill(); _ol(g, R * 0.1);
      g.fillStyle = '#d62828'; g.font = 'bold ' + (R * 0.34) + 'px "Noto Serif TC", serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('排', 0, cy + h * 0.85);
      break;
    }
    case 'scallion': {
      const cy = -R * 0.95;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * R * 1.0, -R * 0.5, R * 0.3, 0, Math.PI * 2); g.fillStyle = '#e2b06f'; g.fill(); _ol(g, R * 0.13); }
      g.beginPath(); g.ellipse(0, cy, R * 1.06, R * 0.92, 0, 0, Math.PI * 2);
      g.fillStyle = _vg(g, cy - R * 0.92, cy + R * 0.92, '#f6d8a2', '#e3b06f', '#b07c41'); g.fill(); _ol(g, R * 0.16);
      g.strokeStyle = 'rgba(150,95,40,0.5)'; g.lineWidth = R * 0.05;
      for (const yy of [-0.3, 0.1, 0.45]) { g.beginPath(); g.ellipse(0, cy + R * yy, R * 0.95 * (1 - Math.abs(yy) * 0.2), R * 0.12, 0, 0.15, Math.PI - 0.15); g.stroke(); }
      g.fillStyle = 'rgba(150,90,35,0.42)';
      for (const sp of [[-0.5, -0.42, 0.13], [0.55, -0.1, 0.1], [-0.2, 0.45, 0.11], [0.4, 0.4, 0.08]]) { g.beginPath(); g.arc(sp[0] * R, cy + sp[1] * R, sp[2] * R, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#6cab51';
      for (const sc of [[-0.35, -0.15], [0.2, -0.32], [0.45, 0.2], [-0.55, 0.25], [0.0, 0.15]]) { g.save(); g.translate(sc[0] * R, cy + sc[1] * R); g.rotate(sc[0]); g.fillRect(-R * 0.12, -R * 0.045, R * 0.24, R * 0.09); g.restore(); }
      _gloss(g, -R * 0.35, cy - R * 0.5, R * 0.5, R * 0.2, 0.4);
      _eyes(g, 0, cy - R * 0.05, R * 0.2, R * 0.34, look, blink, 'tough');
      _mouth(g, 0, cy + R * 0.45, R * 0.5, 'grin');
      break;
    }
    case 'squid': {
      const topY = -R * 2.2, baseY = -R * 0.5;
      for (let i = 0; i < 5; i++) {
        const tx = (i - 2) * R * 0.32;
        const sway = Math.sin(t * 4 + i) * R * 0.18;
        g.beginPath(); g.moveTo(tx, baseY - R * 0.1);
        g.quadraticCurveTo(tx + sway, baseY + R * 0.5, tx + sway * 1.5, baseY + R * 1.0);
        _lj(g); g.lineWidth = R * 0.26; g.strokeStyle = ART_OUTLINE; g.stroke();
        g.lineWidth = R * 0.16; g.strokeStyle = '#b9709a'; g.stroke();
      }
      g.beginPath();
      g.moveTo(-R * 0.85, baseY);
      g.quadraticCurveTo(-R * 0.95, topY + R * 0.4, 0, topY);
      g.quadraticCurveTo(R * 0.95, topY + R * 0.4, R * 0.85, baseY);
      g.quadraticCurveTo(0, baseY + R * 0.4, -R * 0.85, baseY);
      g.closePath();
      g.fillStyle = _vg(g, topY, baseY, '#e7adc6', '#c77fa0', '#8f5474'); g.fill(); _ol(g, R * 0.16);
      g.fillStyle = '#c77fa0';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * R * 0.7, topY + R * 0.55); g.lineTo(s * R * 1.15, topY + R * 0.3); g.lineTo(s * R * 0.78, topY + R * 0.98); g.closePath(); g.fill(); _ol(g, R * 0.1); }
      g.strokeStyle = 'rgba(60,30,45,0.4)'; g.lineWidth = R * 0.08;
      for (const yy of [topY + R * 0.7, topY + R * 1.1, topY + R * 1.5]) { g.beginPath(); g.moveTo(-R * 0.6, yy); g.lineTo(R * 0.6, yy + R * 0.1); g.stroke(); }
      g.strokeStyle = '#caa869'; g.lineWidth = R * 0.12; g.beginPath(); g.moveTo(R * 0.12, topY - R * 0.35); g.lineTo(-R * 0.05, topY + R * 0.5); g.stroke();
      _gloss(g, -R * 0.3, topY + R * 0.6, R * 0.32, R * 0.5, 0.4);
      _eyes(g, 0, baseY - R * 0.55, R * 0.24, R * 0.36, look, blink, 'excited');
      _mouth(g, 0, baseY - R * 0.1, R * 0.4, 'oh');
      break;
    }
    case 'tofu': {
      const cy = -R * 1.0, hw = R * 0.92, hh = R * 0.92;
      g.beginPath(); _roundRectPath(g, -hw, cy - hh, hw * 2, hh * 2, R * 0.22);
      g.fillStyle = _vg(g, cy - hh, cy + hh, '#d8b074', '#b5894e', '#7d5a2e'); g.fill(); _ol(g, R * 0.16);
      g.save(); g.beginPath(); _roundRectPath(g, -hw, cy - hh, hw * 2, hh * 2, R * 0.22); g.clip();
      g.fillStyle = 'rgba(245,220,160,0.5)'; g.fillRect(-hw, cy - hh, hw * 2, hh * 0.5);
      g.fillStyle = 'rgba(70,45,20,0.32)'; g.fillRect(hw - hh * 0.5, cy - hh, hh * 0.5, hh * 2);
      g.fillStyle = 'rgba(90,60,25,0.4)';
      for (const p of [[-0.4, -0.3], [0.3, -0.45], [-0.2, 0.3], [0.45, 0.25], [0.0, -0.05], [-0.5, 0.0]]) { g.beginPath(); g.arc(p[0] * R, cy + p[1] * R, R * 0.08, 0, Math.PI * 2); g.fill(); }
      g.restore();
      g.fillStyle = '#9bbb50';
      for (const cx2 of [-0.25, 0.0, 0.28]) { g.beginPath(); g.ellipse(cx2 * R, cy - hh - R * 0.02, R * 0.2, R * 0.12, cx2, 0, Math.PI * 2); g.fill(); _ol(g, R * 0.05); }
      g.strokeStyle = 'rgba(150,180,90,0.45)'; g.lineWidth = R * 0.06;
      for (const s2 of [-1, 0, 1]) { const bx = s2 * R * 0.5; g.beginPath(); for (let k = 0; k <= 6; k++) { const yy = cy - hh - R * 0.25 - k * R * 0.18; const xx = bx + Math.sin(t * 4 + k * 0.9 + s2) * R * 0.12; if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.stroke(); }
      _eyes(g, 0, cy - R * 0.1, R * 0.2, R * 0.32, look, blink, 'grumpy');
      _mouth(g, 0, cy + R * 0.4, R * 0.5, 'flat');
      break;
    }
    case 'bubble': {
      const top = -R * 1.95, bot = -R * 0.05, tw = R * 0.82, bw = R * 0.62;
      g.beginPath();
      g.moveTo(-bw, bot); g.lineTo(-tw, top + R * 0.2);
      g.quadraticCurveTo(-tw, top, -tw + R * 0.1, top);
      g.lineTo(tw - R * 0.1, top); g.quadraticCurveTo(tw, top, tw, top + R * 0.2);
      g.lineTo(bw, bot); g.quadraticCurveTo(0, bot + R * 0.25, -bw, bot); g.closePath();
      g.fillStyle = _vg(g, top, bot, '#e7c89e', '#c79a6b', '#9c7048'); g.fill(); _ol(g, R * 0.16);
      g.save(); g.beginPath();
      g.moveTo(-bw, bot); g.lineTo(-tw, top + R * 0.2); g.lineTo(tw, top + R * 0.2); g.lineTo(bw, bot); g.quadraticCurveTo(0, bot + R * 0.25, -bw, bot); g.closePath(); g.clip();
      g.fillStyle = '#2a1c12';
      const jig = Math.sin(t * 5) * R * 0.03;
      for (const p of [[-0.4, -0.18], [-0.05, -0.1], [0.32, -0.22], [0.15, -0.4], [-0.25, -0.45], [0.42, -0.05]]) { g.beginPath(); g.arc(p[0] * R, bot + p[1] * R + jig, R * 0.15, 0, Math.PI * 2); g.fill(); }
      g.restore();
      _gloss(g, -R * 0.35, top + R * 0.8, R * 0.16, R * 0.7, 0.45);
      g.beginPath(); g.ellipse(0, top, tw + R * 0.06, R * 0.22, 0, 0, Math.PI * 2);
      g.fillStyle = '#e8d3ac'; g.fill(); _ol(g, R * 0.12);
      g.save(); g.strokeStyle = ART_OUTLINE; g.lineCap = 'round'; g.lineWidth = R * 0.3;
      g.beginPath(); g.moveTo(R * 0.18, top + R * 0.1); g.lineTo(R * 0.55, top - R * 0.95); g.stroke();
      g.strokeStyle = '#d65a7a'; g.lineWidth = R * 0.18; g.beginPath(); g.moveTo(R * 0.18, top + R * 0.1); g.lineTo(R * 0.55, top - R * 0.95); g.stroke();
      g.restore();
      _eyes(g, 0, top + R * 0.95, R * 0.22, R * 0.32, look, blink, 'excited');
      _mouth(g, 0, top + R * 1.35, R * 0.5, 'smile');
      break;
    }
    case 'sausage': {
      const top = -R * 2.0, bot = -R * 0.1, hw = R * 0.78;
      g.strokeStyle = ART_OUTLINE; g.lineCap = 'round'; g.lineWidth = R * 0.2;
      const step = Math.sin(t * 16) * R * 0.16;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * R * 0.32, bot - R * 0.1); g.lineTo(s * R * 0.32 + (s > 0 ? step : -step), bot + R * 0.38); g.stroke(); }
      g.beginPath(); _roundRectPath(g, -hw, top, hw * 2, bot - top, hw);
      g.fillStyle = _vg(g, top, bot, '#fff6df', '#efe3c4', '#cbbd97'); g.fill(); _ol(g, R * 0.16);
      g.save(); g.beginPath(); _roundRectPath(g, -hw, top, hw * 2, bot - top, hw); g.clip();
      g.beginPath(); _roundRectPath(g, -R * 0.3, top + R * 0.18, R * 0.6, (bot - top) - R * 0.36, R * 0.3);
      g.fillStyle = _vg(g, top, bot, '#e07a55', '#c0492f', '#8d2f1c'); g.fill();
      g.lineWidth = R * 0.1; g.strokeStyle = '#8d2f1c'; g.stroke();
      g.strokeStyle = 'rgba(70,25,15,0.5)'; g.lineWidth = R * 0.06;
      for (const yy of [0.45, 0.85, 1.25, 1.65]) { g.beginPath(); g.moveTo(-R * 0.28, top + R * yy); g.lineTo(R * 0.28, top + R * yy); g.stroke(); }
      g.strokeStyle = 'rgba(180,150,90,0.5)'; g.lineWidth = R * 0.05;
      for (const yy of [0.5, 1.0, 1.5]) { g.beginPath(); g.moveTo(-hw * 0.8, top + R * yy); g.lineTo(-R * 0.35, top + R * yy); g.moveTo(R * 0.35, top + R * yy); g.lineTo(hw * 0.8, top + R * yy); g.stroke(); }
      g.restore();
      _gloss(g, -R * 0.45, top + R * 0.6, R * 0.16, R * 0.5, 0.4);
      _eyes(g, 0, top + R * 0.62, R * 0.2, R * 0.3, look, blink, 'fierce');
      _mouth(g, 0, top + R * 1.02, R * 0.45, 'fang');
      break;
    }
    case 'hawthorn': {
      const r = R * 0.66;
      const cys = [-R * 0.7, -R * 1.4, -R * 2.05];
      g.strokeStyle = '#caa869'; g.lineCap = 'round'; g.lineWidth = R * 0.14;
      g.beginPath(); g.moveTo(0, -R * 0.2); g.lineTo(0, -R * 2.62); g.stroke();
      g.lineWidth = R * 0.05; g.strokeStyle = 'rgba(120,90,40,0.5)'; g.stroke();
      for (let i = 0; i < cys.length; i++) {
        const cy = cys[i];
        g.beginPath(); g.arc(0, cy, r, 0, Math.PI * 2);
        g.fillStyle = _vg(g, cy - r, cy + r, '#ff7a78', '#d62a39', '#98182a'); g.fill(); _ol(g, R * 0.14);
        _gloss(g, -r * 0.35, cy - r * 0.4, r * 0.4, r * 0.55, 0.6);
        g.save(); g.globalAlpha = 0.3; g.strokeStyle = '#fff'; g.lineWidth = R * 0.04;
        g.beginPath(); g.arc(0, cy, r * 0.78, Math.PI * 0.15, Math.PI * 0.55); g.stroke(); g.restore();
      }
      _eyes(g, 0, cys[2] - r * 0.05, r * 0.32, r * 0.4, look, blink, 'sly');
      _mouth(g, 0, cys[2] + r * 0.45, r * 0.7, 'smirk');
      break;
    }
    case 'oyster': {
      const cy = -R * 0.95, N = 14, rx = R * 1.05, ry = R * 0.9;
      g.beginPath();
      for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; const wob = 1 + Math.sin(a * 5) * 0.06; const x = Math.cos(a) * rx * wob; const y = cy + Math.sin(a) * ry * wob; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.closePath();
      g.fillStyle = _vg(g, cy - ry, cy + ry, '#fffdf2', '#fdeccb', '#e3cda0'); g.fill();
      _lj(g); g.lineWidth = R * 0.18; g.strokeStyle = '#e0993f'; g.stroke();
      g.lineWidth = R * 0.1; g.strokeStyle = ART_OUTLINE; g.stroke();
      g.beginPath(); g.arc(0, cy + R * 0.1, R * 0.5, 0, Math.PI * 2);
      g.fillStyle = _vg(g, cy - R * 0.4, cy + R * 0.6, '#ffd66e', '#ffb43a', '#d98a14'); g.fill(); _ol(g, R * 0.12);
      _gloss(g, -R * 0.18, cy - R * 0.1, R * 0.2, R * 0.16, 0.55);
      g.beginPath(); g.ellipse(-R * 0.55, cy - R * 0.35, R * 0.26, R * 0.2, -0.4, 0, Math.PI * 2);
      g.fillStyle = '#c8bfa8'; g.fill(); _ol(g, R * 0.08);
      g.fillStyle = '#6cab51';
      for (const sc of [[0.5, -0.45], [0.6, 0.1], [-0.1, 0.5]]) { g.save(); g.translate(sc[0] * R, cy + sc[1] * R); g.rotate(sc[0]); g.fillRect(-R * 0.1, -R * 0.04, R * 0.2, R * 0.08); g.restore(); }
      _eyes(g, 0, cy - R * 0.45, R * 0.18, R * 0.3, look, blink, 'tough');
      _mouth(g, 0, cy + R * 0.18, R * 0.4, 'smile');
      break;
    }
    case 'ribs': {
      const top = -R * 1.5, bot = -R * 0.05, tw = R * 1.0, bw = R * 0.7;
      g.strokeStyle = '#efe3c8'; g.lineCap = 'round'; g.lineWidth = R * 0.18;
      g.beginPath(); g.moveTo(R * 0.1, top - R * 0.1); g.lineTo(R * 0.6, top - R * 0.95); g.stroke();
      g.fillStyle = '#efe3c8'; g.beginPath(); g.arc(R * 0.6, top - R * 1.0, R * 0.16, 0, Math.PI * 2); g.fill(); _ol(g, R * 0.06);
      g.fillStyle = '#c0492f'; g.beginPath(); g.arc(R * 0.12, top - R * 0.05, R * 0.14, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(-tw, top + R * 0.1);
      g.quadraticCurveTo(-bw * 1.25, bot, -bw * 0.6, bot);
      g.lineTo(bw * 0.6, bot);
      g.quadraticCurveTo(bw * 1.25, bot, tw, top + R * 0.1);
      g.closePath();
      g.fillStyle = _vg(g, top, bot, '#95623c', '#6e4327', '#42230f'); g.fill(); _ol(g, R * 0.16);
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * tw, top + R * 0.45, R * 0.2, -Math.PI * 0.5, Math.PI * 0.5, s < 0); _lj(g); g.lineWidth = R * 0.14; g.strokeStyle = ART_OUTLINE; g.stroke(); g.lineWidth = R * 0.08; g.strokeStyle = '#6e4327'; g.stroke(); }
      g.beginPath(); g.ellipse(0, top + R * 0.12, tw * 0.92, R * 0.26, 0, 0, Math.PI * 2);
      g.fillStyle = _vg(g, top - R * 0.1, top + R * 0.4, '#9a3f28', '#7a3322', '#5a2418'); g.fill(); _ol(g, R * 0.1);
      g.fillStyle = '#d23b2a'; for (const p of [[-0.4, 0.05], [0.3, 0.18], [0.05, -0.02]]) { g.beginPath(); g.arc(p[0] * tw, top + R * 0.12 + p[1] * R, R * 0.1, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#7a1f1f'; g.beginPath(); g.ellipse(-R * 0.1, top + R * 0.2, R * 0.16, R * 0.1, 0.3, 0, Math.PI * 2); g.fill();
      _gloss(g, -R * 0.3, top + R * 0.08, R * 0.3, R * 0.08, 0.4);
      g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = R * 0.07;
      for (const s2 of [-1, 1]) { const bx = s2 * R * 0.35; g.beginPath(); for (let k = 0; k <= 6; k++) { const yy = top - R * 0.1 - k * R * 0.22; const xx = bx + Math.sin(t * 3 + k * 0.8 + s2) * R * 0.14; if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.stroke(); }
      _eyes(g, 0, top + R * 0.7, R * 0.18, R * 0.3, look, blink, 'wise');
      _mouth(g, 0, top + R * 1.05, R * 0.4, 'smile');
      break;
    }
    default: {
      g.beginPath(); g.arc(0, -R, R, 0, Math.PI * 2); g.fillStyle = '#d4a574'; g.fill(); _ol(g, R * 0.15);
      _eyes(g, 0, -R * 1.1, R * 0.2, R * 0.3, look, blink, 'calm');
      _mouth(g, 0, -R * 0.6, R * 0.4, 'smile');
    }
  }
}

function drawStar(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const a = i / 10 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
function drawStunGlyph(x, y, t) { for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.094; drawStar(ctx, x + Math.cos(a) * 11, y + Math.sin(a) * 4, 3.2, '#ffd86b'); } }
function drawFreezeGlyph(x, y) { ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7); ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); ctx.stroke(); } }
function drawBurnGlyph(x, y, t) { const f = Math.sin(t * 12) * 0.1; ctx.fillStyle = '#ff7a33'; ctx.beginPath(); ctx.moveTo(x, y - 8 - f * 8); ctx.quadraticCurveTo(x + 5, y - 2, x + 3, y + 3); ctx.quadraticCurveTo(x, y + 5, x - 3, y + 3); ctx.quadraticCurveTo(x - 5, y - 2, x, y - 8 - f * 8); ctx.fill(); ctx.fillStyle = '#ffd86b'; ctx.beginPath(); ctx.arc(x, y + 1, 2.2, 0, Math.PI * 2); ctx.fill(); }

function drawCharacter(c, isPlayer) {
  const t = performance.now() / 1000;
  const R = c.r * 1.5;
  const fd = c.faceDir || 1;
  const mv = c.moveAmt || 0;
  const ph = c.phase || 0;
  const at = c.animT || t;
  if ((c.invisible || 0) > 0) ctx.globalAlpha = 0.32;

  const breathe = Math.sin(at * 4 + ph);
  const bounce = Math.abs(Math.sin(at * 15 + ph));
  let sx = 1 + breathe * 0.035;
  let sy = 1 - breathe * 0.045;
  const bobY = -breathe * R * 0.05 - mv * bounce * R * 0.12;
  const rot = Math.sin(at * 15 + ph) * 0.06 * mv;
  if ((c.hitFlash || 0) > 0) { const k = c.hitFlash / 0.15; sx *= 1 + 0.18 * k; sy *= 1 - 0.18 * k; }

  // ground glow (team color) + shadow
  const ringCol = isPlayer ? 'rgba(255,204,107,' : 'rgba(214,40,40,';
  const fy = c.y + c.r * 0.7;
  const rg = ctx.createRadialGradient(c.x, fy, 2, c.x, fy, c.r * 1.7);
  rg.addColorStop(0, ringCol + '0)');
  rg.addColorStop(0.7, ringCol + '0.26)');
  rg.addColorStop(1, ringCol + '0)');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.ellipse(c.x, fy, c.r * 1.7, c.r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath(); ctx.ellipse(c.x, fy + c.r * 0.02, c.r * 0.95 * sx, c.r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ringCol + '0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(c.x, fy + c.r * 0.02, c.r * 1.2, c.r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();

  // body (anchored at feet)
  ctx.save();
  ctx.translate(c.x, fy);
  ctx.translate(0, bobY);
  ctx.rotate(rot);
  ctx.scale(fd * sx, sy);
  drawHeroArt(ctx, c.id, R, at, c.blink || 0);
  if ((c.frozen || 0) > 0) { ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.ellipse(0, -R * 1.0, R * 1.1, R * 1.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  if ((c.hitFlash || 0) > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (c.hitFlash / 0.15) * 0.7; const fg = ctx.createRadialGradient(0, -R, 2, 0, -R, R * 1.5); fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, -R, R * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.restore();

  // buff auras (player)
  if (isPlayer) {
    if (c.atkBuff > 0) { ctx.strokeStyle = `rgba(255,204,107,${0.5 + Math.sin(t * 8) * 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 6, 0, Math.PI * 2); ctx.stroke(); }
    if (c.speedBuff > 0) { ctx.strokeStyle = `rgba(168,216,255,${0.5 + Math.sin(t * 8) * 0.3})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 10, 0, Math.PI * 2); ctx.stroke(); }
    if (c.shield > 0) { ctx.strokeStyle = `rgba(156,122,59,${0.6 + Math.sin(t * 6) * 0.2})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 8, 0, Math.PI * 2); ctx.stroke(); }
  }

  // HP bar + name (enemies)
  const topY = c.y - c.r * 3.4;
  if (!isPlayer) {
    const w = c.r * 2.6;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(c.x - w / 2, topY, w, 5);
    ctx.fillStyle = c.hp / c.maxHp > 0.4 ? '#7ddf6b' : '#ff5566';
    ctx.fillRect(c.x - w / 2, topY, w * Math.max(0, c.hp / c.maxHp), 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(c.x - w / 2, topY, w, 5);
    ctx.font = '10px "Bungee", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(245,230,200,0.92)';
    ctx.fillText(c.name, c.x, topY - 6);
  }

  // status glyphs
  const sgy = isPlayer ? (c.y - c.r * 3.0) : (topY - 16);
  let sgx = c.x - 6;
  if ((c.stun || 0) > 0) drawStunGlyph(c.x, sgy, t);
  if ((c.frozen || 0) > 0) { drawFreezeGlyph(sgx, sgy); sgx += 16; }
  if ((c.burning || 0) > 0) drawBurnGlyph(sgx, sgy, t);

  ctx.globalAlpha = 1;
}

// Render a hero into a small UI canvas (menus / preview)
function renderHeroIcon(cv, id) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  const R = cv.height * 0.30;
  g.save();
  g.translate(cv.width / 2, cv.height * 0.82);
  drawHeroArt(g, id, R, 0.7, 0);
  g.restore();
}


