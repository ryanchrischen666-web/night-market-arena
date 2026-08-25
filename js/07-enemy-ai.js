'use strict';

// ============ ENEMY SPECIALS ============
// Each special triggers periodically when enemy has line of sight.
function enemyDoSpecial(e) {
  switch (e.aiSpecial) {
    case 'cone': {
      const ang = angleTo(e, player);
      const range = 120, arc = Math.PI / 2.5;
      const ed = Math.hypot(player.x - e.x, player.y - e.y);
      const ea = angleTo(e, player);
      const diff = Math.abs(((ea - ang + Math.PI*3) % (Math.PI*2)) - Math.PI);
      if (ed < range && diff < arc/2) damagePlayer(20 * e.dmgMul);
      zones.push({ type: 'cone', x: e.x, y: e.y, ang, range, arc, life: 0.4, maxLife: 0.4, hostile: true });
      spawnParticles(e.x + Math.cos(ang)*40, e.y + Math.sin(ang)*40, 16, '#f4a93c', { speed: 4, life: 0.5, size: 3 });
      break;
    }
    case 'snare': {
      const ang = leadAim(e, player, 5, e.aimSkill);
      projectiles.push({ x: e.x, y: e.y, vx: Math.cos(ang)*5, vy: Math.sin(ang)*5, r: 9, dmg: 14 * e.dmgMul, life: 1.4, color: '#5a3a4a', team: 'enemy', snareOnHit: 2 });
      break;
    }
    case 'stinkBomb': {
      zones.push({ type: 'stink', x: player.x, y: player.y, r: 80, life: 4, maxLife: 4, dmgTimer: 0, hostile: true, hostileDmg: 5 * e.dmgMul });
      spawnParticles(player.x, player.y, 18, '#7a8a3a', { speed: 3, life: 0.6, size: 4 });
      break;
    }
    case 'iceShot': {
      const ang = leadAim(e, player, 5.5, e.aimSkill);
      projectiles.push({ x: e.x, y: e.y, vx: Math.cos(ang)*5.5, vy: Math.sin(ang)*5.5, r: 9, dmg: 18 * e.dmgMul, life: 1.5, color: '#a8d8ff', team: 'enemy', freezeOnHit: 0.7 });
      break;
    }
    case 'dash': {
      const ang = angleTo(e, player);
      e.dashAng = ang;
      e.dashing = 0.35;
      e.dashSpeed = 9;
      break;
    }
    case 'vanishStrike': {
      e.invisible = 1.4;
      e.vanishStrikeTimer = 1.4;
      break;
    }
    case 'tracker': {
      projectiles.push({ x: e.x, y: e.y, vx: 0, vy: 0, r: 8, dmg: 22 * e.dmgMul, life: 3, color: '#f4a261', team: 'enemy', homing: player, speed: 4.2 });
      break;
    }
    case 'boomerang': {
      const ang = leadAim(e, player, 7, e.aimSkill);
      projectiles.push({ x: e.x, y: e.y, vx: Math.cos(ang)*7, vy: Math.sin(ang)*7, r: 7, dmg: 16 * e.dmgMul, life: 1.5, color: '#f5e6c8', team: 'enemy', pierce: true, boomerang: true, age: 0, owner: e });
      break;
    }
  }
}

