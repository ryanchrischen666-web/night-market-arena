'use strict';

// ============ BOSS: 滷味鍋大王 / The Cauldron King ============
let boss = null;

function spawnBoss() {
  const hp = 1700;
  boss = {
    isBoss: true, id: 'boss', x: W / 2, y: 150, r: 56,
    color: '#6b4a2a', name: '滷味鍋大王', nameEn: 'The Cauldron King',
    hp, maxHp: hp, dmgMul: 1.0,
    hitFlash: 0, dead: false, faceDir: 1,
    phase: 1, enraged: false,
    moveT: 0, mvx: 0, mvy: 0,
    atkT: 2.4, pattern: 0, tele: null,
    bobSeed: Math.random() * 99,
  };
  enemies.push(boss);
}

function bossBrothRing(e, count, speed) {
  const base = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const a = base + (i / count) * Math.PI * 2;
    projectiles.push({
      x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r: 7, dmg: 10 * e.dmgMul, life: 2.4, color: '#d18b3a', team: 'enemy', style: 'bolt',
    });
  }
  if (Sound.shot) Sound.shot('bubble', true);
}

function spawnMinion(x, y) {
  enemies.push({
    isMinion: true, id: 'minion', x: clamp(x, 20, W - 20), y: clamp(y, 20, H - 20), r: 13,
    color: '#d8c49a', hp: 30, maxHp: 30, dead: false,
    hitFlash: 0, faceDir: 1, spin: Math.random() * 6, touchCd: 0, dmgMul: 1.0, speed: 1.75,
  });
}

function updateMinion(e, dt) {
  if (e.hitFlash > 0) e.hitFlash -= dt;
  const target = nearestPlayer(e);
  const a = angleTo(e, target);
  e.x += Math.cos(a) * e.speed * 60 * dt;
  e.y += Math.sin(a) * e.speed * 60 * dt;
  e.x = clamp(e.x, e.r, W - e.r); e.y = clamp(e.y, e.r, H - e.r);
  e.faceDir = (target.x >= e.x) ? 1 : -1;
  e.spin += dt * 9 * e.faceDir;
  e.touchCd = (e.touchCd || 0) - dt;
  if (e.touchCd <= 0 && Math.hypot(target.x - e.x, target.y - e.y) < target.r + e.r) {
    player = target; damagePlayer(8 * e.dmgMul); player = players[0];
    e.touchCd = 0.8;
    spawnParticles(e.x, e.y, 6, '#e8dcc0', { speed: 3, life: 0.4, size: 3 });
  }
}

function startBossAttack(e, kind) {
  const target = nearestPlayer(e);
  if (kind === 'ring') {
    e.tele = { type: 'ring', t: 0.6 };
  } else if (kind === 'puddles') {
    const n = e.enraged ? 5 : 4, spots = [];
    for (let i = 0; i < n; i++) spots.push({ x: clamp(target.x + rand(-150, 150), 44, W - 44), y: clamp(target.y + rand(-150, 150), 44, H - 44) });
    e.tele = { type: 'puddles', t: 0.95, spots };
  } else if (kind === 'sweep') {
    e.tele = { type: 'sweep', t: 0.55, ang: angleTo(e, target) };
  } else if (kind === 'minions') {
    e.tele = { type: 'minions', t: 0.7 };
  }
  if (Sound.enemySpecial) Sound.enemySpecial('cone');
}

function resolveBossAttack(e, tele) {
  if (tele.type === 'ring') {
    bossBrothRing(e, e.enraged ? 18 : 12, e.enraged ? 4.3 : 3.8);
    addShake(4);
  } else if (tele.type === 'puddles') {
    for (const s of tele.spots) {
      zones.push({ type: 'stink', x: s.x, y: s.y, r: 56, life: 2.2, maxLife: 2.2, dmgTimer: 0, hostile: true, hostileDmg: 7 * e.dmgMul });
      spawnParticles(s.x, s.y, 14, '#b5832f', { speed: 4, life: 0.6, size: 4 });
    }
    addShake(5);
  } else if (tele.type === 'sweep') {
    const target = nearestPlayer(e);
    const reach = 150 + e.r, arc = Math.PI * 0.9;
    const ed = dist(e, target);
    const diff = Math.abs(((angleTo(e, target) - tele.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (ed < reach && diff < arc / 2) { player = target; damagePlayer(18 * e.dmgMul); player = players[0]; }
    zones.push({ type: 'swing', x: e.x, y: e.y, ang: tele.ang, range: reach, color: '#e0a85a', span: arc, half: 0.35, life: 0.24, maxLife: 0.24 });
    spawnParticles(e.x + Math.cos(tele.ang) * 70, e.y + Math.sin(tele.ang) * 70, 16, '#e0a85a', { speed: 5, life: 0.5, size: 3 });
    addShake(5);
  } else if (tele.type === 'minions') {
    const n = e.enraged ? 3 : 2;
    for (let i = 0; i < n; i++) spawnMinion(e.x + rand(-40, 40), e.y + rand(24, 54));
    spawnParticles(e.x, e.y, 18, '#caa46a', { speed: 4, life: 0.6, size: 3 });
  }
}

function updateBoss(e, dt) {
  if (e.hitFlash > 0) e.hitFlash -= dt;
  const target = nearestPlayer(e);
  e.faceDir = (target.x >= e.x) ? 1 : -1;

  // Phase 2 enrage at 50% HP
  if (!e.enraged && e.hp <= e.maxHp * 0.5) {
    e.enraged = true; e.phase = 2;
    addShake(11); addHitStop(0.1);
    bossBrothRing(e, 20, 4.2);
    spawnParticles(e.x, e.y, 32, '#caa46a', { speed: 5, life: 0.85, size: 4 });
    showMatchBanner('暴怒 \u00b7 ENRAGED', '滷味鍋大王沸騰了！The cauldron boils over!');
  }

  // Lumbering drift: keep a preferred mid distance from the target
  e.moveT -= dt;
  if (e.moveT <= 0) {
    e.moveT = rand(1.4, 2.6);
    const a = angleTo(e, target), want = 230;
    const tx = clamp(target.x - Math.cos(a) * want, 90, W - 90);
    const ty = clamp(target.y - Math.sin(a) * want, 90, H - 90);
    let dx = tx - e.x, dy = ty - e.y; const ml = Math.hypot(dx, dy) || 1;
    e.mvx = dx / ml; e.mvy = dy / ml;
  }
  const spd = (e.enraged ? 0.55 : 0.4) * 60 * dt;
  e.x += e.mvx * spd; e.y += e.mvy * spd;
  e.x = clamp(e.x, e.r, W - e.r); e.y = clamp(e.y, e.r, H - e.r);

  // Resolve a pending telegraphed attack
  if (e.tele) {
    e.tele.t -= dt;
    if (e.tele.t <= 0) { resolveBossAttack(e, e.tele); e.tele = null; e.atkT = e.enraged ? rand(1.0, 1.6) : rand(1.8, 2.6); }
    return;
  }

  // Start next attack on the cycle
  e.atkT -= dt;
  if (e.atkT <= 0) {
    const patterns = e.enraged ? ['ring', 'puddles', 'sweep', 'minions', 'puddles', 'ring'] : ['ring', 'puddles', 'sweep', 'minions'];
    const kind = patterns[e.pattern % patterns.length];
    e.pattern++;
    startBossAttack(e, kind);
  }
}

// ---- Boss rendering: a giant bubbling braised-hotpot, NOT a hero ----
function drawBoss(e) {
  const t = performance.now() / 1000;
  const x = e.x, r = e.r, enraged = e.enraged;
  const cy = e.y + Math.sin(t * 2 + e.bobSeed) * 3;
  const bw = r * 1.15, bh = r * 0.95;

  // telegraph: boiling-pool warning rings on the ground
  if (e.tele && e.tele.type === 'puddles') {
    for (const s of e.tele.spots) {
      ctx.beginPath(); ctx.arc(s.x, s.y, 56, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,90,60,${0.35 + 0.4 * Math.abs(Math.sin(t * 16))})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(180,60,30,0.16)'; ctx.fill();
    }
  }

  // ground shadow
  ctx.beginPath(); ctx.ellipse(x, e.y + r * 0.92, r * 1.3, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();

  // flames under the pot
  const fn = enraged ? 9 : 7;
  for (let i = 0; i < fn; i++) {
    const fx = x - r * 0.9 + (i / (fn - 1)) * r * 1.8;
    const fh = (enraged ? 26 : 18) + Math.sin(t * 16 + i * 1.3) * 8;
    const g = ctx.createLinearGradient(fx, cy + bh, fx, cy + bh - fh);
    g.addColorStop(0, '#ff3a1a'); g.addColorStop(0.5, '#ff8a1a'); g.addColorStop(1, 'rgba(255,210,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(fx - 7, cy + bh); ctx.quadraticCurveTo(fx, cy + bh - fh, fx + 7, cy + bh); ctx.closePath(); ctx.fill();
  }

  // pot body (rounded trapezoid)
  const bg = ctx.createLinearGradient(x, cy - bh, x, cy + bh);
  bg.addColorStop(0, enraged ? '#7a3326' : '#5a4030');
  bg.addColorStop(1, enraged ? '#3a1410' : '#2c1d12');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(x - bw, cy - bh * 0.5);
  ctx.lineTo(x + bw, cy - bh * 0.5);
  ctx.quadraticCurveTo(x + bw * 1.05, cy + bh * 0.7, x + bw * 0.7, cy + bh);
  ctx.lineTo(x - bw * 0.7, cy + bh);
  ctx.quadraticCurveTo(x - bw * 1.05, cy + bh * 0.7, x - bw, cy - bh * 0.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = enraged ? '#d99' : '#8a6a4a'; ctx.lineWidth = 3; ctx.stroke();

  // handles
  ctx.strokeStyle = enraged ? '#c97' : '#7a5a3a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x - bw - 2, cy - bh * 0.15, 9, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + bw + 2, cy - bh * 0.15, 9, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();

  // broth surface
  const surfY = cy - bh * 0.5;
  ctx.beginPath(); ctx.ellipse(x, surfY, bw * 0.96, r * 0.34, 0, 0, Math.PI * 2);
  const brg = ctx.createRadialGradient(x, surfY, 4, x, surfY, bw);
  brg.addColorStop(0, enraged ? '#b5402a' : '#a06a30');
  brg.addColorStop(1, enraged ? '#7a2818' : '#6a3f1a');
  ctx.fillStyle = brg; ctx.fill();
  ctx.strokeStyle = enraged ? '#e07a4a' : '#c89048'; ctx.lineWidth = 2; ctx.stroke();

  // rising bubbles
  for (let i = 0; i < 7; i++) {
    const ph = (t * 1.4 + i * 1.7) % 1;
    const bx = x + Math.sin(i * 2.3 + t * 0.5) * bw * 0.6;
    const by = surfY - 2 + Math.cos(i * 1.7) * r * 0.12;
    const br = (1 - ph) * (4 + (i % 3));
    ctx.beginPath(); ctx.arc(bx, by, Math.max(0.5, br), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,${enraged ? 160 : 220},${enraged ? 120 : 170},${0.5 * (1 - ph)})`; ctx.fill();
  }
  // floating ingredients
  ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.ellipse(x - bw * 0.4, surfY + 1, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#caa050'; ctx.fillRect(x + bw * 0.22, surfY - 4, 8, 8);

  // steam wisps
  for (let i = 0; i < 3; i++) {
    const sx = x - bw * 0.4 + i * bw * 0.4;
    ctx.beginPath(); ctx.moveTo(sx, surfY - 4);
    for (let s = 1; s <= 4; s++) { ctx.lineTo(sx + Math.sin(t * 3 + i + s * 0.8) * 7, surfY - 4 - s * 12); }
    ctx.strokeStyle = `rgba(255,245,230,${enraged ? 0.12 : 0.18})`; ctx.lineWidth = 4; ctx.stroke();
  }

  // face
  const eyeY = cy + bh * 0.2, eyeDx = bw * 0.4, look = e.faceDir * 2;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - eyeDx, eyeY, 7, 0, Math.PI * 2); ctx.arc(x + eyeDx, eyeY, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a0e08';
  ctx.beginPath(); ctx.arc(x - eyeDx + look, eyeY, 3.4, 0, Math.PI * 2); ctx.arc(x + eyeDx + look, eyeY, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 3.5; ctx.strokeStyle = enraged ? '#ff6a3a' : '#3a2418';
  if (enraged) {
    ctx.beginPath(); ctx.moveTo(x - eyeDx - 7, eyeY - 9); ctx.lineTo(x - eyeDx + 6, eyeY - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + eyeDx + 7, eyeY - 9); ctx.lineTo(x + eyeDx - 6, eyeY - 4); ctx.stroke();
    ctx.strokeStyle = '#1a0e08'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 12, cy + bh * 0.58); ctx.lineTo(x + 12, cy + bh * 0.58); ctx.stroke();
  } else {
    ctx.strokeStyle = '#1a0e08'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, cy + bh * 0.52, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }

  // telegraph: ring wind-up glow
  if (e.tele && e.tele.type === 'ring') {
    const k = 1 - e.tele.t / 0.6;
    ctx.beginPath(); ctx.arc(x, cy, r + 8 + k * 12, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,140,60,${0.3 + 0.4 * k})`; ctx.lineWidth = 4 + k * 4; ctx.stroke();
  }
  // telegraph: sweep arc preview
  if (e.tele && e.tele.type === 'sweep') {
    const k = 1 - e.tele.t / 0.55;
    ctx.beginPath(); ctx.moveTo(x, cy);
    ctx.arc(x, cy, r + 150, e.tele.ang - 0.45 * Math.PI, e.tele.ang + 0.45 * Math.PI); ctx.closePath();
    ctx.fillStyle = `rgba(255,120,50,${0.08 + 0.12 * k})`; ctx.fill();
  }

  // hit flash
  if (e.hitFlash > 0) {
    ctx.globalAlpha = (e.hitFlash / 0.12) * 0.5;
    ctx.beginPath(); ctx.ellipse(x, cy, bw * 1.05, bh * 1.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1;
  }
}

function drawMinion(e) {
  const x = e.x, y = e.y, r = e.r;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(e.spin || 0);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
  g.addColorStop(0, '#dccaa0'); g.addColorStop(1, '#9c7a4a'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(80,50,25,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(-r * 0.1, -r * 0.3); ctx.lineTo(r * 0.3, r * 0.1); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#1a0e08';
  ctx.beginPath(); ctx.arc(x - 4 + e.faceDir * 1.5, y - 2, 2, 0, Math.PI * 2); ctx.arc(x + 4 + e.faceDir * 1.5, y - 2, 2, 0, Math.PI * 2); ctx.fill();
  if (e.hitFlash > 0) { ctx.globalAlpha = (e.hitFlash / 0.12) * 0.6; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; }
}

function drawEnemies() { for (const e of enemies) { if (e.dead) continue; if (e.isBoss) drawBoss(e); else if (e.isMinion) drawMinion(e); else drawCharacter(e, false); } }


