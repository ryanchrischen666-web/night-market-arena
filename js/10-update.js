'use strict';

// ============ UPDATE LOOP ============
const P1_CTRL = { up: 'w', down: 's', left: 'a', right: 'd', q: 'q', e: 'e', r: 'r', mouse: true };
const P2_CTRL = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', q: 'Comma', e: 'Period', r: 'Slash', attack: 'ShiftRight', mouse: false };

function castFor(p, fn) {
  if (!p) return;
  const op = player, sx = mouse.x, sy = mouse.y, sd = mouse.down;
  player = p;
  if (p.controls && !p.controls.mouse) { mouse.x = p.aim.x; mouse.y = p.aim.y; }
  try { fn(); } finally { player = op; mouse.x = sx; mouse.y = sy; mouse.down = sd; }
}

function nearestPlayer(e) {
  let best = null, bd = Infinity;
  for (const p of players) { if (p.dead) continue; const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < bd) { bd = d; best = p; } }
  return best || players[0];
}

function makePlayer(heroId, idx) {
  const h = HEROES[heroId];
  const px = !coop ? W/2 : (idx === 0 ? W * 0.38 : W * 0.62);
  return {
    x: px, y: H - 120,
    r: 18, idx, id: heroId, color: h.color, emoji: h.emoji,
    hp: h.hp, maxHp: h.hp,
    speed: h.speed, baseSpeed: h.speed,
    atkDmg: h.atkDmg, atkRange: h.atkRange, atkCd: h.atkCd,
    atkTimer: 0,
    abilities: h.abilities.map(a => ({ ...a, timer: 0 })),
    speedBuff: 0, speedBuffMul: 1,
    atkBuff: 0, atkBuffMul: 1,
    stealth: 0, invuln: 0,
    shield: 0, shieldMul: 1,
    burnNext: 0,
    hitFlash: 0,
    facing: -Math.PI / 2, face: -Math.PI / 2,
    dead: false,
    dashTo: null,
    isPlayer: true,
    aim: { x: px, y: 0 },
    controls: idx === 0 ? P1_CTRL : P2_CTRL,
  };
}

// Run the shared per-player update for one player by repointing the global
// `player` (and, for P2, virtualizing arrow/right-shift input into the
// canonical WASD/mouse slots) so the existing core logic Just Works.
function updatePlayer(p, dt) {
  player = p;
  const _vpx = p.x, _vpy = p.y;
  const C = p.controls;
  if (C.mouse) {
    if (touchMode && p.idx === 0) { const ap = autoAimPoint(p); mouse.x = ap.x; mouse.y = ap.y; }
    p.aim.x = mouse.x; p.aim.y = mouse.y;
  }
  else { p.aim.x = p.x + Math.cos(p.face) * 240; p.aim.y = p.y + Math.sin(p.face) * 240; }
  let sv = null;
  if (!C.mouse) {
    sv = { w: keys['w'], a: keys['a'], s: keys['s'], d: keys['d'], md: mouse.down, mx: mouse.x, my: mouse.y };
    keys['w'] = keys[C.up]; keys['s'] = keys[C.down]; keys['a'] = keys[C.left]; keys['d'] = keys[C.right];
    mouse.down = !!keys[C.attack]; mouse.x = p.aim.x; mouse.y = p.aim.y;
  }
  updatePlayerCore(dt);
  if (sv) { keys['w'] = sv.w; keys['a'] = sv.a; keys['s'] = sv.s; keys['d'] = sv.d; mouse.down = sv.md; mouse.x = sv.mx; mouse.y = sv.my; }
  if (!C.mouse) p.face = p.facing;
  p.vx = (p.vx || 0) * 0.5 + (p.x - _vpx) * 0.5;
  p.vy = (p.vy || 0) * 0.5 + (p.y - _vpy) * 0.5;
  player = players[0];
}

function updatePlayerCore(dt) {
  advanceAnim(player, dt);
  player.faceDir = (mouse.x >= player.x) ? 1 : -1;

  // === Player movement ===
  let mx = 0, my = 0;
  if (player.idx === 0 && mobileMove.active) {
    mx = mobileMove.dx; my = mobileMove.dy;
  } else {
    if (keys['w']) my -= 1;
    if (keys['s']) my += 1;
    if (keys['a']) mx -= 1;
    if (keys['d']) mx += 1;
  }
  if (mx || my) {
    const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
    const sp = player.speed * (player.speedBuff > 0 ? player.speedBuffMul : 1);
    player.x += mx * sp * 60 * dt;
    player.y += my * sp * 60 * dt;
    player.facing = Math.atan2(my, mx);
  }

  // Player dash (sugar strike, bike charge)
  if (player.dashTo) {
    player.dashTo.time += dt;
    const t = clamp(player.dashTo.time / player.dashTo.dur, 0, 1);
    player.x += (player.dashTo.x - player.x) * 0.3;
    player.y += (player.dashTo.y - player.y) * 0.3;
    if (player.dashTo.charge) {
      // Bike charge: damage enemies in path
      for (const e of enemies) {
        if (e.dead || e._chargedHit) continue;
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r + 4) {
          damageEnemy(e, player.dashTo.dmg || 50);
          e.stun = Math.max(e.stun || 0, player.dashTo.stunDur != null ? player.dashTo.stunDur : 1);
          if (player.dashTo.slow) { e.slow = Math.max(e.slow || 0, player.dashTo.slow); e.slowMul = player.dashTo.slowMul || 0.5; }
          e._chargedHit = true;
          spawnParticles(e.x, e.y, 18, player.dashTo.fx || '#c46a3a', { speed: 5, life: 0.6, size: 4 });
        }
      }
    }
    if (t >= 1) {
      if (player.dashTo.leap) {
        const target = player.dashTo.target;
        if (target && !target.dead) {
          target.stun = Math.max(target.stun || 0, 2);
          damageEnemy(target, 60);
          spawnParticles(target.x, target.y, 20, '#cc2936', { speed: 5, life: 0.6, size: 5 });
          spawnRing(target.x, target.y, '#ff5a4a', 56); addShake(8); addHitStop(0.08);
          Sound.slam();
        }
      }
      // clear charge marks
      enemies.forEach(e => { delete e._chargedHit; });
      player.dashTo = null;
    }
  }
  player.x = clamp(player.x, 20, W - 20);
  player.y = clamp(player.y, 20, H - 20);
  resolveBlocks(player);
  player.x = clamp(player.x, 20, W - 20);
  player.y = clamp(player.y, 20, H - 20);

  // === Player buffs / cooldowns ===
  player.abilities.forEach(a => { if (a.timer > 0) a.timer = Math.max(0, a.timer - dt); });
  if (player.speedBuff > 0) player.speedBuff -= dt;
  if (player.atkBuff > 0) player.atkBuff -= dt;
  if (player.stealth > 0) player.stealth -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.hitFlash > 0) player.hitFlash -= dt;
  if (player.atkTimer > 0) player.atkTimer -= dt;
  if (player.shield > 0) { player.shield -= dt; if (player.shield <= 0) player.shieldMul = 1; }

  // === Healing props ===
  if (currentMap) for (const hp of currentMap.props) {
    if (hp.cd > 0) hp.cd -= dt;
    if (hp.cd <= 0 && player.hp < player.maxHp && Math.hypot(hp.x - player.x, hp.y - player.y) < hp.r + player.r) {
      player.hp = Math.min(player.maxHp, player.hp + hp.heal);
      hp.cd = hp.maxCd;
      dmgText(player.x, player.y - 34, '+' + hp.heal, '#7ddf6b');
      spawnParticles(hp.x, hp.y, 16, '#7ddf6b', { speed: 3, life: 0.6, size: 3 });
      Sound.heal();
      updateHud();
    }
  }


  // Basic attack
  if (mouse.down && player.atkTimer <= 0) {
    fireBasicAttack();
    player.atkTimer = player.atkCd;
  }
}

function update(dt) {
  if (state !== 'playing' || !players.length) return;

  for (const p of players) { if (!p.dead) updatePlayer(p, dt); }
  player = players[0];
  updateAbilityBar();

  // === Standing in zones (player) ===
  for (const z of zones) {
    if (z.type === 'soup' && z.life > 0) {
      // Heal any player standing in the soup
      z.healTimer = (z.healTimer || 0) + dt;
      if (z.healTimer > 0.5) {
        let healed = false;
        for (const pl of players) {
          if (!pl.dead && pl.hp < pl.maxHp && Math.hypot(z.x - pl.x, z.y - pl.y) < z.r) {
            pl.hp = Math.min(pl.maxHp, pl.hp + 8);
            dmgText(pl.x, pl.y - 30, '+8', '#ffe27a');
            healed = true;
          }
        }
        if (healed) { z.healTimer = 0; updateHud(); }
      }
    }
    if (z.type === 'stink' && z.hostile) {
      z.dmgTimer = (z.dmgTimer || 0) + dt;
      if (z.dmgTimer > 0.4) {
        let hit = false;
        for (const pl of players) {
          if (!pl.dead && Math.hypot(z.x - pl.x, z.y - pl.y) < z.r) { player = pl; damagePlayer(z.hostileDmg || 5); hit = true; }
        }
        player = players[0];
        if (hit) z.dmgTimer = 0;
      }
    }
    if (z.type === 'stink' && !z.hostile) {
      // Player's own stink - hurts enemies
      z.dmgTimer = (z.dmgTimer || 0) + dt;
      if (z.dmgTimer > 0.4) {
        for (const e of enemies) {
          if (e.dead) continue;
          if (Math.hypot(z.x - e.x, z.y - e.y) < z.r) {
            damageEnemy(e, 6);
          }
        }
        z.dmgTimer = 0;
      }
    }
    if (z.type === 'rice') {
      // Slow enemies inside
      for (const e of enemies) {
        if (e.dead) continue;
        if (Math.hypot(z.x - e.x, z.y - e.y) < z.r) {
          e.slow = Math.max(e.slow || 0, 0.3); e.slowMul = 0.4;
        }
      }
    }
    if (z.type === 'slick') {
      // (handled in enemy block)
    }
  }

  // === Enemies ===
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.isBoss) { updateBoss(e, dt); continue; }
    if (e.isMinion) { updateMinion(e, dt); continue; }
    player = nearestPlayer(e);
    advanceAnim(e, dt);
    e.faceDir = (player.x >= e.x) ? 1 : -1;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.kbX || e.kbY) {
      e.x += e.kbX * 60 * dt; e.y += e.kbY * 60 * dt;
      e.kbX *= 0.82; e.kbY *= 0.82;
      if (Math.abs(e.kbX) < 0.15) e.kbX = 0;
      if (Math.abs(e.kbY) < 0.15) e.kbY = 0;
      e.x = clamp(e.x, 20, W - 20); e.y = clamp(e.y, 20, H - 20);
      resolveBlocks(e);
    }
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    if (e.invisible > 0) e.invisible -= dt;

    // Vanish-strike: after invisible expires, teleport to player and attack
    if (e.vanishStrikeTimer > 0) {
      e.vanishStrikeTimer -= dt;
      if (e.vanishStrikeTimer <= 0) {
        const ang = angleTo(player, { x: player.x + 50, y: player.y });
        e.x = player.x + rand(-50, 50);
        e.y = player.y + rand(-50, 50);
        spawnParticles(e.x, e.y, 24, '#cc2936', { speed: 6, life: 0.7, size: 5 });
        damagePlayer(28 * e.dmgMul);
      }
    }

    // Dashing (sausage AI)
    if (e.dashing > 0) {
      e.dashing -= dt;
      e.x += Math.cos(e.dashAng) * e.dashSpeed * 60 * dt;
      e.y += Math.sin(e.dashAng) * e.dashSpeed * 60 * dt;
      if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r + 4 && !e._chargedPlayer) {
        damagePlayer(22 * e.dmgMul);
        e._chargedPlayer = true;
      }
      if (e.dashing <= 0) e._chargedPlayer = false;
    } else {
      // Slow modifier from rice trap, slick zone, debuffs
      let speedMul = 1;
      if (e.slow > 0) { e.slow -= dt; if (e.slow > 0) speedMul *= e.slowMul; }
      for (const z of zones) {
        if (z.type === 'slick' && Math.hypot(z.x - e.x, z.y - e.y) < z.r) speedMul *= 0.5;
      }
      // Burn DoT
      if (e.burning > 0) {
        e.burning -= dt;
        e.burnTick = (e.burnTick || 0) + dt;
        if (e.burnTick > 0.5) {
          damageEnemy(e, e.burnDmg);
          e.burnTick = 0;
        }
      }
      if (e.shield > 0) { e.shield -= dt; if (e.shield <= 0) e.shieldMul = 1; }

      const targetVisible = !(player.stealth > 0);
      if (targetVisible) {
        const d = dist(e, player);
        const toP = angleTo(e, player);
        e.lastSeen = { x: player.x, y: player.y };

        // --- reactive dodge: sidestep incoming player shots ---
        let dodgeX = 0, dodgeY = 0, dodging = false;
        e.dodgeCd = (e.dodgeCd || 0) - dt;
        if (e.dodgeCd <= 0) {
          for (const pr of projectiles) {
            if (pr.team === 'enemy') continue;
            const pdx = e.x - pr.x, pdy = e.y - pr.y, pd = Math.hypot(pdx, pdy);
            if (pd > 165 || pd < 1) continue;
            const prAng = Math.atan2(pr.vy, pr.vx), toEAng = Math.atan2(pdy, pdx);
            const diff = Math.abs(((prAng - toEAng + Math.PI*3) % (Math.PI*2)) - Math.PI);
            if (diff < 0.45 && Math.random() < (e.dodgeSkill || 0.6)) {
              if (!e._dodgeSide) e._dodgeSide = Math.random() < 0.5 ? 1 : -1;
              dodgeX = Math.cos(prAng + Math.PI/2 * e._dodgeSide);
              dodgeY = Math.sin(prAng + Math.PI/2 * e._dodgeSide);
              e.dodgeCd = 0.55; e._dodgeAng = Math.atan2(dodgeY, dodgeX); dodging = true; break;
            }
          }
          if (!dodging) e._dodgeSide = 0;
        } else { dodging = true; dodgeX = Math.cos(e._dodgeAng); dodgeY = Math.sin(e._dodgeAng); }

        // --- separation: spread out instead of stacking ---
        let sepX = 0, sepY = 0;
        for (const o of enemies) {
          if (o === e || o.dead) continue;
          const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy);
          if (od < 72 && od > 0.1) { sepX += ox / od; sepY += oy / od; }
        }

        // --- role-based movement intent ---
        let mvX = 0, mvY = 0;
        if (e.strafeT === undefined || (e.strafeT -= dt) <= 0) { e.strafeDir = Math.random() < 0.5 ? 1 : -1; e.strafeT = rand(0.7, 1.7); }
        if (e.ranged) {
          const ideal = e.atkRange * 0.78, tooClose = e.atkRange * 0.5;
          if (d > ideal + 25) { mvX += Math.cos(toP); mvY += Math.sin(toP); }
          else if (d < tooClose) { mvX -= Math.cos(toP) * 1.3; mvY -= Math.sin(toP) * 1.3; }
          const strafe = toP + Math.PI/2 * e.strafeDir, sAmt = (d < ideal + 35) ? 0.95 : 0.45;
          mvX += Math.cos(strafe) * sAmt; mvY += Math.sin(strafe) * sAmt;
        } else {
          if (e.retreatT > 0) { e.retreatT -= dt; mvX -= Math.cos(toP) * 0.9; mvY -= Math.sin(toP) * 0.9; }
          else if (d > e.atkRange - 8) { mvX += Math.cos(toP); mvY += Math.sin(toP); }
          const weave = toP + Math.PI/2 * e.strafeDir;
          mvX += Math.cos(weave) * 0.5; mvY += Math.sin(weave) * 0.5;
        }
        // peel off the walls
        if (e.x < 70 || e.x > W - 70 || e.y < 70 || e.y > H - 70) {
          const ca = Math.atan2(H/2 - e.y, W/2 - e.x);
          mvX += Math.cos(ca) * 0.6; mvY += Math.sin(ca) * 0.6;
        }
        mvX += dodgeX * 1.7 + sepX * 0.55; mvY += dodgeY * 1.7 + sepY * 0.55;
        const ml = Math.hypot(mvX, mvY);
        if (ml > 0.01) {
          mvX /= ml; mvY /= ml;
          let sp = e.speed * speedMul * 60 * dt; if (dodging) sp *= 1.35;
          e.x += mvX * sp; e.y += mvY * sp;
        }

        // --- predictive basic attack ---
        if (e.atkTimer <= 0 && d <= e.atkRange * 1.05) {
          if (e.ranged) {
            const pSpeed = 6.6, ang = leadAim(e, player, pSpeed, e.aimSkill);
            const _emx = e.x + Math.cos(ang)*(e.r+5), _emy = e.y + Math.sin(ang)*(e.r+5);
            projectiles.push({ x: _emx, y: _emy, vx: Math.cos(ang)*pSpeed, vy: Math.sin(ang)*pSpeed, r: 6, dmg: e.dmg * e.dmgMul, life: 1.5, color: e.color, team: 'enemy', style: ({squid:'ink',bubble:'pearl'})[e.id] || 'bolt' });
            spawnParticles(_emx, _emy, 5, e.color, { speed: 3, life: 0.22, size: 2 });
            Sound.shot(e.id, true);
          } else {
            damagePlayer(e.dmg * e.dmgMul);
            spawnParticles(player.x, player.y, 8, '#ff5566', { speed: 4, life: 0.4, size: 4 });
            zones.push({ type: 'swing', x: e.x, y: e.y, ang: toP, range: e.atkRange, color: e.color, span: Math.PI/2.3, half: 0.3, life: 0.16, maxLife: 0.16 });
            Sound.swing(e.id, true);
            e.retreatT = rand(0.25, 0.5);
          }
          e.atkTimer = e.atkCd;
        }

        // --- situational special ---
        if (e.aiSpecialTimer <= 0) {
          let ok = true;
          if (e.aiSpecial === 'dash') ok = d > 90 && d < 380;
          else if (e.aiSpecial === 'cone') ok = d < 150;
          else if (e.aiSpecial === 'stinkBomb') ok = d < 220;
          else if (e.aiSpecial === 'vanishStrike') ok = d < 260;
          if (ok) { enemyDoSpecial(e); Sound.enemySpecial(e.aiSpecial); e.aiSpecialTimer = e.aiSpecialCd; }
          else e.aiSpecialTimer = 0.4;
        }
      } else {
        // player stealthed: push toward last-seen position
        if (e.lastSeen && dist(e, e.lastSeen) > 28) {
          const a = angleTo(e, e.lastSeen);
          e.x += Math.cos(a) * e.speed * 0.55 * 60 * dt;
          e.y += Math.sin(a) * e.speed * 0.55 * 60 * dt;
        } else { e.x += Math.cos(performance.now()/600 + e.r) * 0.4; }
      }
    }

    if (e.atkTimer > 0) e.atkTimer -= dt;
    if (e.aiSpecialTimer > 0) e.aiSpecialTimer -= dt;
    e.x = clamp(e.x, 20, W - 20);
    e.y = clamp(e.y, 20, H - 20);
    resolveBlocks(e);
    e.x = clamp(e.x, 20, W - 20);
    e.y = clamp(e.y, 20, H - 20);
  }

  // Cleanup dead, check victory
  player = players[0];
  enemies = enemies.filter(e => !e.dead);
  if (state === 'playing') {
    if (currentMode === 'boss') {
      if (!enemies.some(e => e.isBoss)) { enemies = []; state = 'won'; setTimeout(() => endGame(true), 800); }
    } else if (enemies.length === 0) {
      state = 'won';
      setTimeout(() => endGame(true), 800);
    }
  }

  // === Projectiles ===
  for (const p of projectiles) {
    if (p.boomerang) {
      p.age = (p.age || 0) + dt;
      if (p.age > 0.7 && p.owner && !p.owner.dead) {
        const ang = angleTo(p, p.owner);
        p.vx = Math.cos(ang) * 8;
        p.vy = Math.sin(ang) * 8;
      }
      // Despawn when it returns
      if (p.owner && p.age > 0.4 && Math.hypot(p.x - p.owner.x, p.y - p.owner.y) < 20) p.life = 0;
    }
    if (p.homing) {
      if (p.homing.dead) p.homing = null;
      else {
        const ang = angleTo(p, p.homing);
        p.vx = Math.cos(ang) * p.speed;
        p.vy = Math.sin(ang) * p.speed;
      }
    }
    p.x += p.vx * 60 * dt;
    p.y += p.vy * 60 * dt;
    p.life -= dt;

    if (currentMap && p.life > 0) {
      for (const b of currentMap.blocks) {
        if (p.x > b.x - p.r && p.x < b.x + b.w + p.r && p.y > b.y - p.r && p.y < b.y + b.h + p.r) {
          p.life = 0;
          spawnParticles(p.x, p.y, 6, p.color || '#fff', { speed: 3, life: 0.3, size: 2 });
          Sound.blockHit();
          break;
        }
      }
    }

    if (p.team === 'player') {
      for (const e of enemies) {
        if (e.dead) continue;
        if (p._hits && p._hits.has(e)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
          let dmg = p.dmg;
          if (p.owner && p.owner.atkBuff > 0) dmg *= p.owner.atkBuffMul;
          const _pm = Math.hypot(p.vx, p.vy) || 1, _kbf = Math.min(6.5, 1.6 + dmg * 0.06);
          damageEnemy(e, dmg, { kbX: (p.vx / _pm) * _kbf, kbY: (p.vy / _pm) * _kbf });
          if (p.onHit) p.onHit(p, e);
          if (p.pierce) { p._hits = p._hits || new Set(); p._hits.add(e); }
          else { p.life = 0; break; }
        }
      }
    } else {
      // Enemy projectile vs players
      for (const pl of players) {
        if (pl.dead) continue;
        if (Math.hypot(pl.x - p.x, pl.y - p.y) < pl.r + p.r) {
          player = pl; damagePlayer(p.dmg); player = players[0];
          p.life = 0; break;
        }
      }
    }
  }
  projectiles = projectiles.filter(p => p.life > 0 && p.x > -50 && p.x < W+50 && p.y > -50 && p.y < H+50);

  // Particles
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  for (const r of rings) { r.r += (r.maxR - r.r) * 0.18; r.life -= dt; }
  rings = rings.filter(r => r.life > 0);

  // Damage texts
  for (const t of dmgTexts) { t.y += t.vy; t.vy *= 0.9; t.life -= dt; }
  dmgTexts = dmgTexts.filter(t => t.life > 0);

  // Zones tick
  for (const z of zones) z.life -= dt;
  zones = zones.filter(z => z.life > 0);

  updateHud();
}

function fireBasicAttack() {
  const ang = angleTo(player, mouse);
  if (player.atkRange < 100) {
    const range = player.atkRange;
    let dmg = player.atkDmg * (player.atkBuff > 0 ? player.atkBuffMul : 1);
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist(player, e);
      if (d > range) continue;
      const ea = angleTo(player, e);
      const diff = Math.abs(((ea - ang + Math.PI*3) % (Math.PI*2)) - Math.PI);
      if (diff < Math.PI / 2.5) {
        const _kbf = (player.id === 'scallion' || player.id === 'tofu' || player.id === 'sausage') ? 7 : 5;
        damageEnemy(e, dmg, { kbX: Math.cos(ea) * _kbf, kbY: Math.sin(ea) * _kbf });
        if (player.burnNext > 0) {
          e.burning = 3; e.burnDmg = 6; player.burnNext = 0;
        }
      }
    }
    const heavy = (player.id === 'scallion' || player.id === 'tofu' || player.id === 'sausage');
    const quick = (player.id === 'hawthorn');
    const span = quick ? Math.PI/2.6 : heavy ? Math.PI/2.0 : Math.PI/2.3;
    const half = quick ? 0.20 : heavy ? 0.42 : 0.30;
    const slife = quick ? 0.12 : heavy ? 0.2 : 0.16;
    zones.push({ type: 'swing', x: player.x, y: player.y, ang, range, color: player.color, span, half, heavy, life: slife, maxLife: slife });
    spawnParticles(player.x + Math.cos(ang)*range*0.7, player.y + Math.sin(ang)*range*0.7, 8, '#ffffff', { speed: 4, life: 0.25, size: 2 });
    Sound.swing(player.id);
  } else {
    const _st = ({squid:'ink',bubble:'pearl'})[player.id] || 'bolt';
    const _mx = player.x + Math.cos(ang)*(player.r+6), _my = player.y + Math.sin(ang)*(player.r+6);
    projectiles.push({ x: _mx, y: _my, vx: Math.cos(ang)*11, vy: Math.sin(ang)*11, r: 6, dmg: player.atkDmg, life: 1.3, color: player.color, team: 'player', owner: player, style: _st, burnNext: player.burnNext > 0,
      onHit: (proj, target) => { if (proj.burnNext) { target.burning = 3; target.burnDmg = 6; player.burnNext = 0; } }
    });
    spawnParticles(_mx, _my, 7, player.color, { speed: 3, life: 0.25, size: 2 });
    Sound.shot(player.id);
  }
}

