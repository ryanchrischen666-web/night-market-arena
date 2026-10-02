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

const PARTICLE_CAP = 720;   // 手機救命線：超過就不再生新粒子
function spawnParticles(x, y, count, color, opts = {}) {
  if (particles.length > PARTICLE_CAP) return;
  const speed = opts.speed || 3;
  const life = opts.life || 0.5;
  const size = opts.size || 3;
  const grav = opts.gravity || 0, glow = !!opts.glow, drag = opts.drag || 0.94;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(speed * 0.3, speed);
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life, maxLife: life, color, size: rand(size*0.5, size), g: grav, glow, drag, shape: opts.shape || 0 });
  }
}

// ===== Game feel: hit-stop, screen shake, impact rings, directional sparks =====
function addHitStop(s) { if (s > hitStop) hitStop = s; }
function addShake(m) { if (m > shakeMag) shakeMag = m; }
function spawnRing(x, y, color, maxR, life = 0.32) { rings.push({ x, y, r: maxR * 0.3, maxR, color, life, maxLife: life }); }
function spawnSparks(x, y, count, color, ang, speed = 4, spread = 1.0) {
  if (particles.length > PARTICLE_CAP) return;
  for (let i = 0; i < count; i++) {
    const a = ang + rand(-spread, spread);
    const s = rand(speed * 0.4, speed);
    const life = rand(0.22, 0.45);
    // 火花＝沿速度方向拉長的亮條，帶一點重力，加法混色
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, maxLife: life, color, size: rand(2, 3.5), g: 0.12, glow: true, drag: 0.93, shape: 1 });
  }
}

function dmgText(x, y, n, color = '#fff', size = 1) {
  if (dmgTexts.length > 60) dmgTexts.shift();
  const isNum = typeof n === 'number';
  dmgTexts.push({ x: x + (isNum ? rand(-8, 8) : 0), y, n: isNum ? Math.round(n) : n, color, life: 0.8, maxLife: 0.8, vy: isNum ? -1.6 : -1.1, vx: isNum ? rand(-0.5, 0.5) : 0, size, age: 0 });
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

// ===== Crowd-control fairness =====
// Every stun / freeze goes through here so nobody can be chain-locked to death.
// Each application on the same unit inside CC_DR_WINDOW lands shorter than the
// last, and the 4th one inside that window is ignored entirely.
const CC_MAX_DURATION = 1.4;   // hard cap on any single stun/freeze
const CC_DR_WINDOW = 6;        // CC-free seconds before diminishing returns reset
const CC_DR_SCALE = [1, 0.5, 0.25, 0];

function applyCC(unit, prop, dur) {
  if (!unit || unit.dead) return 0;
  if ((unit.ccDrTimer || 0) <= 0) unit.ccDr = 0;
  const tier = Math.min(unit.ccDr || 0, CC_DR_SCALE.length - 1);
  const scaled = Math.min(dur, CC_MAX_DURATION) * CC_DR_SCALE[tier];
  unit.ccDr = (unit.ccDr || 0) + 1;
  unit.ccDrTimer = CC_DR_WINDOW;
  if (scaled <= 0) { dmgText(unit.x, unit.y - 46, '\u514d\u75ab', '#9fd7ff'); return 0; }
  unit[prop] = Math.max(unit[prop] || 0, scaled);
  return scaled;
}

function applyStun(unit, dur) { return applyCC(unit, 'stun', dur); }
// Players carry CC on stunT/frozenT rather than stun/frozen (netcode naming).
function applyStunP(unit, dur) { return applyCC(unit, 'stunT', dur); }
function applyFreezeP(unit, dur) { return applyCC(unit, 'frozenT', dur); }
function applyFreeze(unit, dur) { return applyCC(unit, 'frozen', dur); }

// 光束射程：從 (x,y) 沿 ang 方向最多 maxLen，撞到第一面攤位牆就截斷
function beamReach(x, y, ang, maxLen) {
  let best = maxLen;
  if (!currentMap) return best;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (const b of currentMap.blocks) {
    let tmin = 0, tmax = best;
    let okBlock = true;
    if (Math.abs(dx) < 1e-8) { if (x < b.x || x > b.x + b.w) okBlock = false; }
    else {
      let t1 = (b.x - x) / dx, t2 = (b.x + b.w - x) / dx;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    }
    if (okBlock && Math.abs(dy) < 1e-8) { if (y < b.y || y > b.y + b.h) okBlock = false; }
    else if (okBlock) {
      let t1 = (b.y - y) / dy, t2 = (b.y + b.h - y) / dy;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    }
    if (okBlock && tmin <= tmax && tmin >= 0 && tmin < best) best = tmin;
  }
  return best;
}

function damageEnemy(enemy, dmg, opts = {}) {
  if (enemy.remote) return;   // 連線對手：第一階段先不做傷害同步
  if (enemy.dead) return;
  if (enemy.shieldMul) dmg *= enemy.shieldMul;
  matchStats.dmgDealt += Math.max(0, Math.min(dmg, enemy.hp));
  enemy.hp -= dmg;
  enemy.hitFlash = 0.12;
  const big = dmg >= 24;
  Sound.hit(enemy.x, big);
  if (opts.kbX || opts.kbY) { enemy.kbX = (enemy.kbX || 0) + opts.kbX; enemy.kbY = (enemy.kbY || 0) + opts.kbY; }
  dmgText(enemy.x, enemy.y - 30, dmg, big ? '#ffe14a' : '#ffcc6b', big ? 1.4 : 1);
  const sa = (opts.kbX || opts.kbY) ? Math.atan2(opts.kbY || 0, opts.kbX || 0) : Math.random() * Math.PI * 2;
  spawnSparks(enemy.x, enemy.y, big ? 12 : 6, '#ffe6a0', sa, big ? 6 : 3.8, big ? 0.9 : 1.2);
  if (big) { addShake(3); addHitStop(0.05); spawnRing(enemy.x, enemy.y, '#fff', enemy.r * 1.6, 0.18); }
  if (enemy.hp <= 0) {
    enemy.dead = true;
    if (enemy.isBoss) {
      Sound.bossDie(); Sound.duck(0.7, 1.6);
      for (let i = 0; i < 4; i++) setTimeout(() => { if (state === 'title') return; spawnRing(enemy.x + rand(-40, 40), enemy.y + rand(-30, 30), i % 2 ? '#ff5a3c' : '#ffd24a', 90 + i * 20, 0.5); spawnParticles(enemy.x, enemy.y, 30, i % 2 ? '#ff8a3a' : '#caa46a', { speed: 7, life: 0.9, size: 5, glow: true, gravity: 0.1 }); addShake(8); }, i * 180);
      spawnParticles(enemy.x, enemy.y, 60, '#ffd24a', { speed: 8, life: 1.1, size: 5, glow: true, gravity: 0.08 });
      FX.flash(0.8, '255,230,180'); FX.slowmo(0.25, 1.1); FX.kick(0.08); addShake(14); addHitStop(0.14);
      FX.banner('擊破！', 'BOSS DOWN', '#ff5a3c', 2.2); FX.celebrate();
    } else {
      Sound.die(enemy.x);
      spawnParticles(enemy.x, enemy.y, 26, enemy.color || '#d62828', { speed: 5.5, life: 0.7, size: 4, gravity: 0.1 });
      spawnParticles(enemy.x, enemy.y, 14, '#ffcc6b', { speed: 4.5, life: 0.6, size: 3, glow: true });
      spawnSparks(enemy.x, enemy.y, 10, '#ffffff', sa, 7, 0.7);
      spawnRing(enemy.x, enemy.y, enemy.color || '#ffd24a', 48);
      spawnRing(enemy.x, enemy.y, '#ffffff', 70, 0.26);
      FX.ghost(enemy, sa);
      addShake(7); addHitStop(0.09); FX.kick(0.035); FX.flash(0.12, '255,240,200');
      const left = enemies.filter(e => !e.dead && !(e.remote && !e.hostileNet)).length;
      const lastOne = left === 0 && currentMode !== 'tutorial' && !(window.NetMatch && NetMatch.inMatch);
      if (lastOne) { FX.slowmo(0.28, 0.8); FX.flash(0.45, '255,230,180'); Sound.duck(0.6, 1.2); addShake(10); FX.celebrate(); }
      if (!enemy.isMinion) FX.onKill(enemy.x, enemy.y);
    }
    totalKills++;
  }
}

function damagePlayer(dmg, srcU) {
  if (player.dead || player.invuln > 0) return;
  if (player.shieldMul) dmg *= player.shieldMul;
  const real = Math.max(0, Math.min(dmg, player.hp));
  if (player === players[0]) {
    matchStats.dmgTaken += real;
    if (srcU) matchStats.dmgFrom[srcU] = (matchStats.dmgFrom[srcU] || 0) + real;
  }
  player.hp -= dmg;
  player.hitFlash = 0.18;
  const big = dmg >= 18;
  Sound.hurt(big);
  dmgText(player.x, player.y - 30, dmg, '#ff5566', big ? 1.35 : 1);
  spawnSparks(player.x, player.y, big ? 9 : 6, '#ff8a96', Math.random() * Math.PI * 2, 4, Math.PI);
  addShake(big ? 6.5 : 3.5);
  if (big) addHitStop(0.05);
  if (player === players[0]) {
    FX.hurtFlash(big ? 0.7 : 0.4);
    const bar = document.getElementById('hp-bar');
    if (bar) { bar.classList.remove('hit'); void bar.offsetWidth; bar.classList.add('hit'); }
    if (player.hp > 0 && player.hp / player.maxHp < 0.3) Sound.heartbeat();
  }
  if (player.hp <= 0) { player.hp = 0; player.dead = true;
    if (window.NetMatch && NetMatch.inMatch) NetMatch.onLocalDeath();
    spawnRing(player.x, player.y, '#ff4d5e', 52); spawnRing(player.x, player.y, '#ffffff', 80, 0.3);
    spawnParticles(player.x, player.y, 30, player.color || '#ff5566', { speed: 6, life: 0.8, size: 4, gravity: 0.1 });
    FX.ghost(player, Math.random() * Math.PI * 2);
    addShake(9); addHitStop(0.12);
    if (players.every(pl => pl.dead) && !(window.NetMatch && NetMatch.inMatch)) { FX.slowmo(0.3, 0.9); FX.flash(0.5, '214,40,40'); Sound.duck(0.8, 1.5); state = 'lost'; setTimeout(() => endGame(false), 1000); }
  }
  updateHud();
}
