'use strict';

// ============ PLAYER ABILITIES (all 24) ============
// Scallion Pancake
function castFiveSpice() {
  const ang = angleTo(player, mouse);
  const range = 130, arc = Math.PI / 2.5;
  for (const e of enemies) {
    if (e.dead) continue;
    if (dist(player, e) > range) continue;
    const ea = angleTo(player, e);
    const diff = Math.abs(((ea - ang + Math.PI*3) % (Math.PI*2)) - Math.PI);
    if (diff < arc/2) damageEnemy(e, 35);
  }
  zones.push({ type: 'cone', x: player.x, y: player.y, ang, range, arc, life: 0.4, maxLife: 0.4 });
  spawnParticles(player.x + Math.cos(ang)*40, player.y + Math.sin(ang)*40, 24, '#f4a93c', { speed: 5, life: 0.5, size: 4 });
}
function castOilSlick() { player.speedBuff = 4; player.speedBuffMul = 1.6; zones.push({ type: 'oil', x: player.x, y: player.y, r: 50, life: 4, maxLife: 4 }); }
function castDoughWrap() {
  const e = nearestEnemy(player.x, player.y, 250);
  if (!e) return false;
  const wrapDur = applyStun(e, 2.5);
  damageEnemy(e, 25);
  if (wrapDur <= 0) return;
  spawnParticles(e.x, e.y, 30, '#f5e6c8', { speed: 5, life: 0.8, size: 5 });
  zones.push({ type: 'wrap', target: e, life: wrapDur, maxLife: wrapDur });
}

// Grilled Squid
function castTentacleStrike() {
  const ang = angleTo(player, mouse);
  projectiles.push({
    x: player.x, y: player.y, vx: Math.cos(ang)*9, vy: Math.sin(ang)*9,
    r: 10, dmg: 38, life: 0.7, color: '#a06b8c', team: 'player', pierce: true,
    onHit: (proj, target) => {
      // knockback
      const a = angleTo(proj, target);
      target.x += Math.cos(a) * 25;
      target.y += Math.sin(a) * 25;
    },
  });
}
function castTentacleSnare() {
  const ang = angleTo(player, mouse);
  projectiles.push({
    x: player.x, y: player.y, vx: Math.cos(ang)*6, vy: Math.sin(ang)*6,
    r: 9, dmg: 20, life: 1.2, color: '#5a3a4a', team: 'player',
    onHit: (proj, target) => { target.slow = Math.max(target.slow || 0, 3); target.slowMul = 0.4; },
  });
}
function castInkSplash() {
  const ang = angleTo(player, mouse);
  // AoE burst at a point in front of player
  const tx = player.x + Math.cos(ang) * 140;
  const ty = player.y + Math.sin(ang) * 140;
  for (const e of enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - tx, e.y - ty) < 100) {
      damageEnemy(e, 50);
      e.slow = Math.max(e.slow || 0, 2); e.slowMul = 0.5;
    }
  }
  zones.push({ type: 'ink', x: tx, y: ty, r: 100, life: 0.8, maxLife: 0.8 });
  spawnParticles(tx, ty, 40, '#1a0e2e', { speed: 6, life: 0.9, size: 6 });
}

// Stinky Tofu
function castGarlicSpray() {
  const ang = angleTo(player, mouse);
  const range = 110, arc = Math.PI / 2.2;
  for (const e of enemies) {
    if (e.dead) continue;
    if (dist(player, e) > range) continue;
    const ea = angleTo(player, e);
    const diff = Math.abs(((ea - ang + Math.PI*3) % (Math.PI*2)) - Math.PI);
    if (diff < arc/2) {
      damageEnemy(e, 22);
      e.slow = Math.max(e.slow || 0, 2); e.slowMul = 0.6;
    }
  }
  zones.push({ type: 'cone', x: player.x, y: player.y, ang, range, arc, life: 0.4, maxLife: 0.4 });
  spawnParticles(player.x + Math.cos(ang)*40, player.y + Math.sin(ang)*40, 22, '#cfe89c', { speed: 4, life: 0.6, size: 3 });
}
function castCrustyShield() { player.shield = 4; player.shieldMul = 0.5; spawnParticles(player.x, player.y, 16, '#9c7a3b', { speed: 3, life: 0.6, size: 4 }); }
function castReekingStench() {
  const tx = mouse.x, ty = mouse.y;
  zones.push({ type: 'stink', x: tx, y: ty, r: 90, life: 5, maxLife: 5, dmgTimer: 0 });
  spawnParticles(tx, ty, 24, '#7a8a3a', { speed: 4, life: 0.8, size: 5 });
}

function castStinkyDash() {
  const ang = angleTo(player, mouse);
  const distDash = 240, sx = player.x, sy = player.y;
  player.dashTo = { x: sx + Math.cos(ang)*distDash, y: sy + Math.sin(ang)*distDash, time: 0, dur: 0.24, charge: true, dmg: 22, stunDur: 0.3, slow: 2, slowMul: 0.6, fx: '#9c7a3b' };
  player.invuln = Math.max(player.invuln, 0.24);
  for (let i = 0; i <= 4; i++) {
    const px = sx + Math.cos(ang)*distDash*(i/4), py = sy + Math.sin(ang)*distDash*(i/4);
    zones.push({ type: 'stink', x: px, y: py, r: 34, life: 2.4, maxLife: 2.4, dmgTimer: i * 0.08 });
  }
  spawnParticles(sx, sy, 20, '#9c7a3b', { speed: 4, life: 0.5, size: 4 });
}

// Bubble Tea
function castSugarBoost() { player.atkBuff = 4; player.atkBuffMul = 1.4; spawnParticles(player.x, player.y, 12, '#ffcc6b', { speed: 3, life: 0.6, size: 3 }); }
function castIceToss() {
  const ang = angleTo(player, mouse);
  projectiles.push({
    x: player.x, y: player.y, vx: Math.cos(ang)*7, vy: Math.sin(ang)*7,
    r: 8, dmg: 22, life: 0.8, color: '#a8d8ff', team: 'player',
    onHit: (proj) => {
      for (const e of enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - proj.x, e.y - proj.y) < 80) {
          applyFreeze(e, 1.2);
          damageEnemy(e, 16);
        }
      }
      zones.push({ type: 'ice', x: proj.x, y: proj.y, r: 80, life: 1.0, maxLife: 1.0 });
      spawnParticles(proj.x, proj.y, 25, '#cfeaff', { speed: 6, life: 0.7, size: 5 });
    },
  });
}
function castPearlBarrage() {
  const ang = angleTo(player, mouse);
  for (let i = 0; i < 9; i++) {
    const a = ang + (i - 4) * 0.11;
    projectiles.push({ x: player.x, y: player.y, vx: Math.cos(a)*9, vy: Math.sin(a)*9, r: 6, dmg: 16, life: 0.7, color: '#3a2a1a', team: 'player' });
  }
}

// Sausage Wrap
function castCharcoalBurn() { player.burnNext = 1; spawnParticles(player.x, player.y, 12, '#ff7733', { speed: 3, life: 0.5, size: 3 }); }
function castStickyRiceTrap() {
  const tx = mouse.x, ty = mouse.y;
  zones.push({ type: 'rice', x: tx, y: ty, r: 80, life: 3, maxLife: 3 });
  spawnParticles(tx, ty, 16, '#f5e6c8', { speed: 3, life: 0.6, size: 4 });
}
function castBikeCharge() {
  const ang = angleTo(player, mouse);
  // dash through enemies
  player.dashTo = { x: player.x + Math.cos(ang)*240, y: player.y + Math.sin(ang)*240, time: 0, dur: 0.3, charge: true };
  player.invuln = 0.4;
  spawnParticles(player.x, player.y, 18, '#c46a3a', { speed: 4, life: 0.5, size: 4 });
}

// Candied Hawthorn
function castCrystalShards() {
  const ang = angleTo(player, mouse);
  for (let i = -1; i <= 1; i++) {
    const a = ang + i * 0.18;
    projectiles.push({ x: player.x, y: player.y, vx: Math.cos(a)*8, vy: Math.sin(a)*8, r: 5, dmg: 18, life: 0.8, color: '#cc2936', team: 'player' });
  }
}
function castRedFlash() { player.invuln = 0.8; player.stealth = 2.5; player.atkBuffMul = 1.45; player.atkBuff = 3.5; spawnParticles(player.x, player.y, 30, '#cc2936', { speed: 6, life: 0.8, size: 5 }); }
const SUGAR_STRIKE_RANGE = 320;
function castSugarStrike() {
  const e = nearestEnemy(mouse.x, mouse.y, 999);
  if (!e || dist(player, e) > SUGAR_STRIKE_RANGE) {
    dmgText(player.x, player.y - 46, '\u592a\u9060', '#cc2936');
    return false;
  }
  player.dashTo = { x: e.x, y: e.y, target: e, time: 0, dur: 0.25, leap: true };
  player.invuln = 0.3;
}

// Oyster Omelet
function castEggHeal() { player.hp = Math.min(player.maxHp, player.hp + 50); spawnParticles(player.x, player.y, 24, '#ffe27a', { speed: 4, life: 0.8, size: 4 }); dmgText(player.x, player.y - 30, '+50', '#ffe27a'); updateHud(); }
function castOysterTracker() {
  const target = nearestEnemy(mouse.x, mouse.y, 999);
  if (!target) return false;
  projectiles.push({ x: player.x, y: player.y, vx: 0, vy: 0, r: 9, dmg: 32, life: 3, color: '#f4a261', team: 'player', homing: target, speed: 5 });
}
function castSlipperyShield() { zones.push({ type: 'slick', x: player.x, y: player.y, r: 110, life: 6, maxLife: 6 }); }

// Pork Ribs Soup
const HERBAL_SMOKE_RANGE = 200;
function castHerbalSmoke() {
  // Lobbed at the cursor, clamped to cast range - this hero fights from 220 out,
  // so a blast centred on itself was unusable.
  const ang = angleTo(player, mouse);
  const d = Math.min(dist(player, mouse), HERBAL_SMOKE_RANGE);
  const tx = player.x + Math.cos(ang) * d, ty = player.y + Math.sin(ang) * d;
  for (const e of enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - tx, e.y - ty) < 110) { damageEnemy(e, 18); e.slow = Math.max(e.slow || 0, 1.5); e.slowMul = 0.7; }
  }
  zones.push({ type: 'smoke', x: tx, y: ty, r: 110, life: 0.8, maxLife: 0.8 });
  spawnParticles(tx, ty, 26, '#9c8a6c', { speed: 4, life: 0.7, size: 5 });
}
function castBoneBoomerang() {
  const ang = angleTo(player, mouse);
  projectiles.push({
    x: player.x, y: player.y, vx: Math.cos(ang)*8, vy: Math.sin(ang)*8,
    r: 7, dmg: 22, life: 1.4, color: '#f5e6c8', team: 'player', pierce: true,
    boomerang: true, age: 0, owner: player,
  });
}
function castTenTreasure() {
  zones.push({ type: 'soup', x: player.x, y: player.y, r: 120, life: 7, maxLife: 7, healTimer: 0 });
  player.shield = 7; player.shieldMul = 0.7;
}

// Golden Chicken Cutlet（範圍型：寬幅酥浪，參考波可式的貫穿聲波）
function castPepperWave() {
  const ang = angleTo(player, mouse);
  projectiles.push({
    x: player.x + Math.cos(ang) * (player.r + 6), y: player.y + Math.sin(ang) * (player.r + 6),
    vx: Math.cos(ang) * 8, vy: Math.sin(ang) * 8,
    r: 26, dmg: 30, life: 1.1, color: '#f0b429', team: 'player', pierce: true, style: 'wave',
    onHit: (proj, target) => { target.slow = Math.max(target.slow || 0, 1.5); target.slowMul = 0.65; },
  });
  spawnParticles(player.x + Math.cos(ang) * 30, player.y + Math.sin(ang) * 30, 16, '#ffd166', { speed: 4, life: 0.5, size: 4 });
}
function castCrispyCoat() {
  player.shield = 3; player.shieldMul = 0.55;
  player.speedBuff = 1.5; player.speedBuffMul = 1.25;
  spawnParticles(player.x, player.y, 20, '#f0b429', { speed: 4, life: 0.7, size: 4 });
  spawnRing(player.x, player.y, '#ffd166', 46);
}
function castCutletFeast() {
  // 雞排放題：持續 3 秒朝準星連發酥浪，每道浪打中就吸多少血；再按一次 R 提前收攤
  player.feastT = 3; player.feastTick = 0;
  spawnRing(player.x, player.y, '#ffd166', 70);
  spawnParticles(player.x, player.y, 18, '#ffd166', { speed: 4, life: 0.6, size: 4 });
}

// Predict where to aim so a shot of `projSpeed` intercepts a moving target.
// skill 0 = aim at current pos, 1 = full lead; adds a little spread.
function leadAim(e, target, projSpeed, skill = 0.7) {
  const tvx = target.vx || 0, tvy = target.vy || 0;
  let ax = target.x, ay = target.y;
  for (let i = 0; i < 2; i++) {
    const t = Math.hypot(ax - e.x, ay - e.y) / projSpeed;
    ax = target.x + tvx * t; ay = target.y + tvy * t;
  }
  const bx = target.x + (ax - target.x) * skill;
  const by = target.y + (ay - target.y) * skill;
  return Math.atan2(by - e.y, bx - e.x) + rand(-0.05, 0.05) * (1.2 - skill);
}

