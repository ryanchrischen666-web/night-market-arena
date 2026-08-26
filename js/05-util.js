'use strict';

// ============ UTIL ============
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function advanceAnim(c, dt) {
  if (c.px === undefined) { c.px = c.x; c.py = c.y; }
  const moved = Math.hypot(c.x - c.px, c.y - c.py);
  c.px = c.x; c.py = c.y;
  const inst = clamp(moved / Math.max(0.0001, dt * 60) / 3, 0, 1);
  c.moveAmt = (c.moveAmt || 0) + (inst - (c.moveAmt || 0)) * 0.25;
  c.animT = (c.animT || 0) + dt;
  if (c.phase === undefined) c.phase = Math.random() * 6.283;
  if (c.blinkT === undefined) c.blinkT = rand(1.2, 5);
  c.blinkT -= dt;
  if (c.blink > 0) c.blink -= dt;
  if (c.blinkT <= 0) { c.blink = 0.12; c.blinkT = rand(2.5, 6); }
}

function spawnParticles(x, y, count, color, opts = {}) {
  const speed = opts.speed || 3;
  const life = opts.life || 0.5;
  const size = opts.size || 3;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(speed * 0.3, speed);
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life, maxLife: life, color, size: rand(size*0.5, size) });
  }
}

// ===== Game feel: hit-stop, screen shake, impact rings, directional sparks =====
function addHitStop(s) { if (s > hitStop) hitStop = s; }
function addShake(m) { if (m > shakeMag) shakeMag = m; }
function spawnRing(x, y, color, maxR, life = 0.32) { rings.push({ x, y, r: maxR * 0.3, maxR, color, life, maxLife: life }); }
function spawnSparks(x, y, count, color, ang, speed = 4, spread = 1.0) {
  for (let i = 0; i < count; i++) {
    const a = ang + rand(-spread, spread);
    const s = rand(speed * 0.4, speed);
    const life = rand(0.22, 0.45);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, maxLife: life, color, size: rand(2, 4) });
  }
}

function dmgText(x, y, n, color = '#fff', size = 1) {
  dmgTexts.push({ x, y, n: typeof n === 'number' ? Math.round(n) : n, color, life: 0.8, vy: -1.2, size });
}

function nearestEnemy(x, y, maxR = Infinity) {
  let best = null, bd = maxR;
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.remote && !e.hostileNet) continue;   // 隊友不是目標
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function damageEnemy(enemy, dmg, opts = {}) {
  if (enemy.remote) return;   // 連線對手：第一階段先不做傷害同步
  if (enemy.dead) return;
  if (enemy.shieldMul) dmg *= enemy.shieldMul;
  enemy.hp -= dmg;
  enemy.hitFlash = 0.12;
  Sound.hit();
  if (opts.kbX || opts.kbY) { enemy.kbX = (enemy.kbX || 0) + opts.kbX; enemy.kbY = (enemy.kbY || 0) + opts.kbY; }
  const big = dmg >= 24;
  dmgText(enemy.x, enemy.y - 30, dmg, big ? '#ffe14a' : '#ffcc6b', big ? 1.4 : 1);
  const sa = (opts.kbX || opts.kbY) ? Math.atan2(opts.kbY || 0, opts.kbX || 0) : Math.random() * Math.PI * 2;
  spawnSparks(enemy.x, enemy.y, big ? 10 : 5, '#ffe6a0', sa, big ? 5.5 : 3.5, big ? 0.9 : 1.2);
  if (big) { addShake(3); addHitStop(0.05); }
  if (enemy.hp <= 0) {
    enemy.dead = true;
    Sound.die();
    spawnParticles(enemy.x, enemy.y, 24, enemy.color || '#d62828', { speed: 5.5, life: 0.7, size: 4 });
    spawnParticles(enemy.x, enemy.y, 10, '#ffcc6b', { speed: 4, life: 0.6, size: 3 });
    spawnRing(enemy.x, enemy.y, enemy.color || '#ffd24a', 48);
    addShake(7); addHitStop(0.09);
    totalKills++;
  }
}

function damagePlayer(dmg) {
  if (player.dead || player.invuln > 0) return;
  if (player.shieldMul) dmg *= player.shieldMul;
  player.hp -= dmg;
  player.hitFlash = 0.18;
  Sound.hurt();
  const big = dmg >= 18;
  dmgText(player.x, player.y - 30, dmg, '#ff5566', big ? 1.35 : 1);
  spawnSparks(player.x, player.y, big ? 9 : 6, '#ff8a96', Math.random() * Math.PI * 2, 4, Math.PI);
  addShake(big ? 6.5 : 3.5);
  if (big) addHitStop(0.05);
  if (player.hp <= 0) { player.hp = 0; player.dead = true;
    if (window.NetMatch && NetMatch.inMatch) NetMatch.onLocalDeath(); spawnRing(player.x, player.y, '#ff4d5e', 52); addShake(9); addHitStop(0.12); if (players.every(pl => pl.dead) && !(window.NetMatch && NetMatch.inMatch)) endGame(false); }
  updateHud();
}

