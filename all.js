
'use strict';

// ============ HEROES (all 8) ============
// Each hero is both player-pickable and enemy-AI-able.
const HEROES = {
  scallion: {
    name: 'Scallion Pancake', cn: '蔥油餅', role: 'Tank', emoji: '🥞',
    color: '#d4a574', hp: 220, speed: 2.4, atkDmg: 14, atkRange: 60, atkCd: 0.5,
    abilities: [
      { key: 'Q', name: 'Five-Spice', cd: 4, cast: castFiveSpice, icon: '辛' },
      { key: 'E', name: 'Oil Slick', cd: 8, cast: castOilSlick, icon: '油' },
      { key: 'R', name: 'Dough Wrap', cd: 12, cast: castDoughWrap, icon: '裹' },
    ],
    aiSpecial: 'cone', aiSpecialCd: 5,
  },
  squid: {
    name: 'Grilled Squid', cn: '烤魷魚', role: 'Ranged', emoji: '🦑',
    color: '#a06b8c', hp: 140, speed: 2.9, atkDmg: 16, atkRange: 280, atkCd: 0.45,
    abilities: [
      { key: 'Q', name: 'Tentacle', cd: 3, cast: castTentacleStrike, icon: '觸' },
      { key: 'E', name: 'Snare', cd: 6, cast: castTentacleSnare, icon: '纏' },
      { key: 'R', name: 'Ink Splash', cd: 11, cast: castInkSplash, icon: '墨' },
    ],
    aiSpecial: 'snare', aiSpecialCd: 6,
  },
  tofu: {
    name: 'Stinky Tofu', cn: '臭豆腐', role: 'Zone', emoji: '🟫',
    color: '#9c7a3b', hp: 210, speed: 2.5, atkDmg: 14, atkRange: 60, atkCd: 0.55,
    abilities: [
      { key: 'Q', name: 'Crispy Dash', cd: 5, cast: castStinkyDash, icon: '突' },
      { key: 'E', name: 'Crust Shield', cd: 10, cast: castCrustyShield, icon: '盾' },
      { key: 'R', name: 'Reek Bomb', cd: 13, cast: castReekingStench, icon: '臭' },
    ],
    aiSpecial: 'stinkBomb', aiSpecialCd: 8,
  },
  bubble: {
    name: 'Bubble Tea', cn: '珍珠奶茶', role: 'DPS', emoji: '🧋',
    color: '#9b6b4d', hp: 140, speed: 3.0, atkDmg: 18, atkRange: 280, atkCd: 0.45,
    abilities: [
      { key: 'Q', name: 'Sugar Boost', cd: 7, cast: castSugarBoost, icon: '糖' },
      { key: 'E', name: 'Ice Toss', cd: 5, cast: castIceToss, icon: '冰' },
      { key: 'R', name: 'Pearl Storm', cd: 11, cast: castPearlBarrage, icon: '珍' },
    ],
    aiSpecial: 'iceShot', aiSpecialCd: 5.5,
  },
  sausage: {
    name: 'Sausage Wrap', cn: '大腸包小腸', role: 'Charger', emoji: '🌭',
    color: '#c46a3a', hp: 160, speed: 3.1, atkDmg: 17, atkRange: 60, atkCd: 0.45,
    abilities: [
      { key: 'Q', name: 'Charcoal', cd: 4, cast: castCharcoalBurn, icon: '炭' },
      { key: 'E', name: 'Rice Trap', cd: 6, cast: castStickyRiceTrap, icon: '糯' },
      { key: 'R', name: 'Bike Charge', cd: 12, cast: castBikeCharge, icon: '衝' },
    ],
    aiSpecial: 'dash', aiSpecialCd: 7,
  },
  hawthorn: {
    name: 'Candied Hawthorn', cn: '糖葫蘆', role: 'Assassin', emoji: '🍡',
    color: '#cc2936', hp: 120, speed: 3.4, atkDmg: 18, atkRange: 70, atkCd: 0.4,
    abilities: [
      { key: 'Q', name: 'Crystal Shards', cd: 4, cast: castCrystalShards, icon: '碎' },
      { key: 'E', name: 'Red Flash', cd: 10, cast: castRedFlash, icon: '隱' },
      { key: 'R', name: 'Sugar Strike', cd: 12, cast: castSugarStrike, icon: '裹' },
    ],
    aiSpecial: 'vanishStrike', aiSpecialCd: 9,
  },
  oyster: {
    name: 'Oyster Omelet', cn: '蚵仔煎', role: 'Bruiser', emoji: '🍳',
    color: '#f4a261', hp: 170, speed: 2.8, atkDmg: 16, atkRange: 200, atkCd: 0.5,
    abilities: [
      { key: 'Q', name: 'Egg Heal', cd: 7, cast: castEggHeal, icon: '蛋' },
      { key: 'E', name: 'Tracker', cd: 4, cast: castOysterTracker, icon: '蚵' },
      { key: 'R', name: 'Slick Zone', cd: 13, cast: castSlipperyShield, icon: '滑' },
    ],
    aiSpecial: 'tracker', aiSpecialCd: 6,
  },
  ribs: {
    name: 'Pork Ribs Soup', cn: '藥燉排骨', role: 'Support', emoji: '🍲',
    color: '#7a4a2a', hp: 175, speed: 2.6, atkDmg: 14, atkRange: 220, atkCd: 0.55,
    abilities: [
      { key: 'Q', name: 'Herbal Smoke', cd: 4, cast: castHerbalSmoke, icon: '煙' },
      { key: 'E', name: 'Boomerang', cd: 6, cast: castBoneBoomerang, icon: '骨' },
      { key: 'R', name: 'Soup Pot', cd: 14, cast: castTenTreasure, icon: '湯' },
    ],
    aiSpecial: 'boomerang', aiSpecialCd: 8,
  },
};

const HERO_ORDER = ['scallion','squid','tofu','bubble','sausage','hawthorn','oyster','ribs'];
const HERO_LORE = {
  scallion: { tCn:'鐵板上的老大哥', tEn:'The Layered Guardian', rCn:'坦克', aCn:['五香','油爆','麵皮裹'] },
  squid:    { tCn:'海風來的長手',     tEn:'The Tide-Reach',      rCn:'遠程', aCn:['觸手鞭','纏絲','潑墨'] },
  tofu:     { tCn:'越臭越驕傲',         tEn:'The Glorious Reek',   rCn:'控場', aCn:['酥脈衝','脆殼盾','臭氣彈'] },
  bubble:   { tCn:'台中來的甜風暴', tEn:'The Pearl Storm',     rCn:'輸出', aCn:['糖衝','冰擲','珍珠風暴'] },
  sausage:  { tCn:'衝鋒的糯米硬漢', tEn:'The Charging Wrap',   rCn:'衝鋒', aCn:['炭火','糯米陷阱','機車衝'] },
  hawthorn: { tCn:'糖衣裡的利刃',     tEn:'The Sugar Blade',     rCn:'刺客', aCn:['糖晶碎','紅閃','糖葡蘆擊'] },
  oyster:   { tCn:'海口的暖心硬漢', tEn:'The Tide-Forged',     rCn:'鬥士', aCn:['蛋補','追蹤','滑溜區'] },
  ribs:     { tCn:'漢方的老師傅',     tEn:'The Herbal Mender',   rCn:'輔助', aCn:['藥煙','飛骨','補湯鍋'] },
};

// ============ MODE TUNING ============
const MODES = {
  '1v1': { count: 1, hpMul: 1.5, dmgMul: 1.15 },
  '1v2': { count: 2, hpMul: 1.0, dmgMul: 0.95 },
  '1v3': { count: 3, hpMul: 0.65, dmgMul: 0.75 },
  'boss': { count: 0, hpMul: 1, dmgMul: 1, boss: true },
};

// ============ GAME STATE ============
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let state = 'title';
let player = null;
let enemies = [];
let projectiles = [];
let particles = [];
let zones = [];
let dmgTexts = [];
let currentMap = null;
let currentMode = '1v1';
let totalKills = 0;
let runStart = 0;
const keys = {};
const mouse = { x: W/2, y: H/2, down: false };
let lastTime = 0;
let selectedHero = null;
let selectedMode = null;
let players = [];
let coop = false;
let coopSel = false;
let selectedHero2 = null;
let pickingP2 = false;
let hitStop = 0;
let shakeMag = 0;
let rings = [];
let touchMode = false;
let mobileMove = { active: false, dx: 0, dy: 0 };

// ============ INPUT ============
const abilityKeyMap = { q: 0, e: 1, r: 2 };
const P2_ABIL = { Comma: 0, Period: 1, Slash: 2 };
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(), code = e.code;
  if (state === 'playing' && (code === 'Space' || code === 'Slash' || (code && code.indexOf('Arrow') === 0))) e.preventDefault();
  const firstK = !keys[k], firstC = code ? !keys[code] : false;
  keys[k] = true; if (code) keys[code] = true;
  if (state !== 'playing') return;
  if (firstK && abilityKeyMap[k] !== undefined && players[0] && !players[0].dead) castFor(players[0], () => tryCast(abilityKeyMap[k]));
  if (firstC && coop && players[1] && !players[1].dead && P2_ABIL[code] !== undefined) castFor(players[1], () => tryCast(P2_ABIL[code]));
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; if (e.code) keys[e.code] = false; });

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top) * (H / r.height);
});
canvas.addEventListener('mousedown', () => { mouse.down = true; });
canvas.addEventListener('mouseup', () => { mouse.down = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function damageEnemy(enemy, dmg, opts = {}) {
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
  if (player.hp <= 0) { player.hp = 0; player.dead = true; spawnRing(player.x, player.y, '#ff4d5e', 52); addShake(9); addHitStop(0.12); if (players.every(pl => pl.dead)) endGame(false); }
  updateHud();
}

// ============ AUDIO ENGINE (synth SFX + music, no asset files) ============
const Sound = (() => {
  let ctx = null, master = null, sfxBus = null, quietBus = null, musicBus = null, defBus = null;
  let noiseBuf = null, sfxOn = true, musicOn = true;
  let musicTimer = null, musicStep = 0, musicTheme = null;
  let lastHit = 0, lastHurt = 0;
  const C2=65.41,F2=87.31,G2=98,A2=110,C3=130.81,E3=164.81,F3=174.61,G3=196,A3=220,
        C4=261.63,D4=293.66,E4=329.63,G4=392,A4=440,C5=523.25,D5=587.33,E5=659.25,G5=783.99,A5=880;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      quietBus = ctx.createGain(); quietBus.gain.value = 0.4; quietBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
      defBus = sfxBus;
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function env(g, t0, vol, a, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function T(freq, opt = {}) {
    const bus = opt.bus || defBus; if (!ctx || !bus) return;
    const t0 = ctx.currentTime + (opt.when || 0);
    const o = ctx.createOscillator(); o.type = opt.type || 'sine'; o.detune.value = opt.detune || 0;
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(1, opt.to), t0 + (opt.toT || opt.dur || 0.15));
    const g = ctx.createGain(); const dur = opt.dur || 0.15; env(g, t0, opt.vol == null ? 0.25 : opt.vol, opt.a || 0.006, dur);
    let last = o;
    if (opt.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.lp; last.connect(f); last = f; }
    last.connect(g); g.connect(bus);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function N(opt = {}) {
    const bus = opt.bus || defBus; if (!ctx || !bus) return;
    const t0 = ctx.currentTime + (opt.when || 0); const dur = opt.dur || 0.18;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = opt.type || 'bandpass';
    f.frequency.setValueAtTime(opt.freq || 1200, t0);
    if (opt.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, opt.to), t0 + dur);
    f.Q.value = opt.q || 1;
    const g = ctx.createGain(); env(g, t0, opt.vol == null ? 0.2 : opt.vol, 0.005, dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  function fx(fn) { if (!ctx || !sfxOn) return; try { fn(); } catch (e) {} }

  // ---- combat ----
  function swing(id, enemy) { fx(() => {
    const b = enemy ? quietBus : sfxBus;
    const heavy = id === 'scallion' || id === 'tofu' || id === 'sausage' || id === 'oyster';
    const quick = id === 'hawthorn';
    if (quick) { N({ type:'bandpass', freq:3000, to:1200, dur:0.09, vol:0.16, q:0.7, bus:b }); T(720, { type:'triangle', dur:0.07, vol:0.1, to:380, bus:b }); }
    else if (heavy) { N({ type:'bandpass', freq:1200, to:300, dur:0.18, vol:0.2, q:0.6, bus:b }); T(170, { type:'sine', dur:0.13, vol:0.13, to:85, bus:b }); }
    else { N({ type:'bandpass', freq:2000, to:600, dur:0.13, vol:0.18, q:0.6, bus:b }); T(300, { type:'sine', dur:0.1, vol:0.1, to:170, bus:b }); }
  }); }
  function shot(id, enemy) { fx(() => {
    const b = enemy ? quietBus : sfxBus;
    if (id === 'squid') { T(520, { type:'sine', dur:0.16, vol:0.2, to:150, lp:900, bus:b }); N({ type:'lowpass', freq:1200, to:300, dur:0.1, vol:0.08, bus:b }); }
    else if (id === 'bubble') { T(820, { type:'square', dur:0.06, vol:0.13, to:520, bus:b }); T(300, { type:'sine', dur:0.09, vol:0.12, to:150, bus:b, when:0.02 }); }
    else if (id === 'oyster') { N({ type:'bandpass', freq:1600, to:700, dur:0.12, vol:0.16, q:1.2, bus:b }); T(260, { type:'triangle', dur:0.1, vol:0.1, to:160, bus:b }); }
    else if (id === 'ribs') { T(340, { type:'triangle', dur:0.14, vol:0.16, to:300, bus:b }); T(510, { type:'triangle', dur:0.1, vol:0.07, to:480, bus:b, when:0.01 }); }
    else { T(900, { type:'sawtooth', dur:0.12, vol:0.14, to:280, lp:1800, bus:b }); }
  }); }
  function hit() { const t = performance.now(); if (t - lastHit < 55) return; lastHit = t; fx(() => {
    T(230, { type:'triangle', dur:0.06, vol:0.16, to:150 }); N({ type:'highpass', freq:2200, dur:0.04, vol:0.07 });
  }); }
  function die() { fx(() => {
    T(440, { type:'triangle', dur:0.1, vol:0.16, to:300 });
    T(300, { type:'triangle', dur:0.12, vol:0.14, to:200, when:0.08 });
    T(210, { type:'sine', dur:0.16, vol:0.12, to:120, when:0.16 });
    N({ type:'lowpass', freq:900, to:300, dur:0.25, vol:0.12, when:0.02 });
  }); }
  function hurt() { const t = performance.now(); if (t - lastHurt < 90) return; lastHurt = t; fx(() => {
    T(300, { type:'square', dur:0.09, vol:0.16, to:180, lp:1400 });
  }); }

  // ---- ability flavours ----
  function dash(id) { fx(() => {
    N({ type:'lowpass', freq:400, to:3000, dur:0.16, vol:0.18 });
    T(200, { type:'sine', dur:0.18, vol:0.12, to:520 });
    if (id === 'tofu') { T(420, { type:'sine', dur:0.14, vol:0.1, to:170 }); N({ type:'bandpass', freq:800, dur:0.16, vol:0.06, q:2 }); }
  }); }
  function shield() { fx(() => { T(300, { type:'triangle', dur:0.18, vol:0.16, to:880 }); T(1200, { type:'sine', dur:0.14, vol:0.08, when:0.06 }); }); }
  function buff() { fx(() => { [600,800,1000,1280].forEach((f,i)=>T(f,{type:'triangle',dur:0.08,vol:0.1,when:i*0.05})); }); }
  function freeze() { fx(() => { [1200,1550,1850].forEach((f,i)=>T(f,{type:'sine',dur:0.18,vol:0.1,when:i*0.03,detune:i*6})); N({type:'highpass',freq:5000,dur:0.16,vol:0.05,when:0.05}); }); }
  function heal() { fx(() => { [659,784,988,1175].forEach((f,i)=>T(f,{type:'triangle',dur:0.14,vol:0.13,when:i*0.06})); T(1568,{type:'sine',dur:0.2,vol:0.06,when:0.22}); }); }
  function poof() { fx(() => { T(420,{type:'triangle',dur:0.22,vol:0.14,to:150}); N({type:'lowpass',freq:1000,to:300,dur:0.26,vol:0.14}); T(300,{type:'sine',dur:0.18,vol:0.08,to:120,when:0.06}); }); }
  function glass() { fx(() => { [1400,1750,2050].forEach((f,i)=>T(f,{type:'triangle',dur:0.1,vol:0.1,when:i*0.04,to:f*0.9})); }); }
  function vanish() { fx(() => { N({type:'highpass',freq:3000,to:6500,dur:0.14,vol:0.12}); T(800,{type:'sine',dur:0.14,vol:0.1,to:1900}); }); }
  function slam() { fx(() => { T(150,{type:'sine',dur:0.16,vol:0.2,to:70}); N({type:'lowpass',freq:1200,to:200,dur:0.2,vol:0.16}); [880,1100].forEach((f,i)=>T(f,{type:'triangle',dur:0.1,vol:0.08,when:0.04+i*0.03})); }); }
  function vroom() { fx(() => { T(120,{type:'sawtooth',dur:0.32,vol:0.16,to:280,lp:1200}); N({type:'lowpass',freq:600,dur:0.28,vol:0.1}); }); }
  function lockon() { fx(() => { T(1000,{type:'square',dur:0.05,vol:0.1}); T(1000,{type:'square',dur:0.05,vol:0.1,when:0.12}); T(420,{type:'sawtooth',dur:0.14,vol:0.12,to:900,when:0.22,lp:2000}); }); }
  function slick() { fx(() => { N({type:'lowpass',freq:1500,to:500,dur:0.26,vol:0.14}); T(220,{type:'sine',dur:0.16,vol:0.1,to:130}); }); }
  function splash() { fx(() => { T(420,{type:'sine',dur:0.2,vol:0.18,to:120,lp:800}); N({type:'lowpass',freq:900,to:300,dur:0.22,vol:0.12}); T(260,{type:'sine',dur:0.14,vol:0.08,to:110,when:0.05}); }); }
  function sizzle() { fx(() => { N({type:'highpass',freq:3000,dur:0.3,vol:0.1,q:0.5}); T(200,{type:'triangle',dur:0.18,vol:0.1,to:120}); }); }
  function sticky() { fx(() => { T(300,{type:'square',dur:0.14,vol:0.12,to:140,lp:900}); N({type:'lowpass',freq:1100,to:400,dur:0.18,vol:0.1}); }); }
  function smoke() { fx(() => { N({type:'lowpass',freq:1000,to:400,dur:0.3,vol:0.12}); [520,660].forEach((f,i)=>T(f,{type:'sine',dur:0.16,vol:0.07,when:i*0.05,to:f*1.1})); }); }
  function whoosh() { fx(() => { N({type:'bandpass',freq:700,to:2200,dur:0.16,vol:0.14,q:0.8}); T(240,{type:'sine',dur:0.16,vol:0.08,to:520}); }); }
  function wrap() { fx(() => { T(520,{type:'triangle',dur:0.12,vol:0.14,to:200}); N({type:'bandpass',freq:1800,to:600,dur:0.12,vol:0.1,q:1}); T(180,{type:'sine',dur:0.14,vol:0.1,to:100,when:0.06}); }); }
  function spice() { fx(() => { N({type:'bandpass',freq:1800,to:500,dur:0.18,vol:0.16,q:0.7}); T(300,{type:'sawtooth',dur:0.14,vol:0.1,to:160,lp:1500}); }); }
  function barrage() { fx(() => { for (let i=0;i<4;i++){ T(800,{type:'square',dur:0.05,vol:0.09,to:520,when:i*0.07}); T(300,{type:'sine',dur:0.07,vol:0.08,to:150,when:i*0.07+0.02}); } }); }
  function blockHit() { fx(() => { T(900,{type:'square',dur:0.04,vol:0.08,to:600}); N({type:'highpass',freq:3000,dur:0.04,vol:0.05}); }); }

  // ---- UI / stingers ----
  function ui() { fx(() => { T(523,{type:'triangle',dur:0.07,vol:0.12}); T(784,{type:'triangle',dur:0.08,vol:0.1,when:0.04}); }); }
  function uiBack() { fx(() => { T(620,{type:'triangle',dur:0.07,vol:0.1}); T(440,{type:'triangle',dur:0.08,vol:0.1,when:0.04}); }); }
  function hover() { fx(() => { T(680,{type:'sine',dur:0.05,vol:0.06}); }); }
  function matchStart() { fx(() => { [523,659,784,1047].forEach((f,i)=>T(f,{type:'triangle',dur:0.12,vol:0.14,when:i*0.09})); N({type:'lowpass',freq:1500,to:400,dur:0.4,vol:0.06}); }); }
  function win() { fx(() => { [523,659,784].forEach((f,i)=>T(f,{type:'triangle',dur:0.12,vol:0.15,when:i*0.1})); [659,988,1319].forEach((f)=>T(f,{type:'triangle',dur:0.5,vol:0.12,when:0.32})); T(784,{type:'square',dur:0.5,vol:0.05,when:0.32}); }); }
  function lose() { fx(() => { [440,392,330,262].forEach((f,i)=>T(f,{type:'triangle',dur:0.3,vol:0.13,when:i*0.16,detune:-4})); T(196,{type:'sine',dur:0.5,vol:0.1,when:0.64}); }); }

  function ability(name) {
    switch (name) {
      case 'Five-Spice': spice(); break;
      case 'Oil Slick': slick(); buff(); break;
      case 'Dough Wrap': wrap(); break;
      case 'Tentacle': case 'Snare': case 'Ink Splash': splash(); break;
      case 'Crispy Dash': dash('tofu'); break;
      case 'Crust Shield': shield(); break;
      case 'Reek Bomb': poof(); break;
      case 'Sugar Boost': buff(); break;
      case 'Ice Toss': freeze(); break;
      case 'Pearl Storm': barrage(); break;
      case 'Charcoal': sizzle(); break;
      case 'Rice Trap': sticky(); break;
      case 'Bike Charge': vroom(); break;
      case 'Crystal Shards': glass(); break;
      case 'Red Flash': vanish(); break;
      case 'Sugar Strike': whoosh(); break;
      case 'Egg Heal': heal(); break;
      case 'Tracker': lockon(); break;
      case 'Slick Zone': slick(); break;
      case 'Herbal Smoke': smoke(); break;
      case 'Boomerang': whoosh(); break;
      case 'Soup Pot': heal(); break;
      default: T(600, { type:'triangle', dur:0.1, vol:0.1 });
    }
  }
  function enemySpecial(kind) {
    const map = { cone: spice, snare: splash, stinkBomb: poof, iceShot: freeze, dash: whoosh, vanishStrike: vanish, tracker: lockon, boomerang: whoosh };
    const f = map[kind]; if (!f) return;
    const prev = defBus; defBus = quietBus; try { f(); } finally { defBus = prev; }
  }

  // ---- background music (per theme) ----
  const MUS = {
    market:  { ms: 300, melType: 'triangle', melVol: 0.12, bassVol: 0.14,
      mel:  [E4,G4,A4,G4,E4,D4,C4,D4,E4,G4,C5,A4,G4,E4,D4,C4],
      bass: [C2,0,0,0,A2,0,0,0,F2,0,0,0,G2,0,0,0] },
    ninja:   { ms: 340, melType: 'triangle', melVol: 0.1, bassVol: 0.12, drone: true,
      mel:  [A4,0,E4,0,G4,0,E4,D4,A4,0,C5,0,G4,E4,D4,0],
      bass: [A2,0,0,0,0,0,0,0,A2,0,0,0,0,0,0,0] },
    kitchen: { ms: 250, melType: 'triangle', melVol: 0.1, bassVol: 0.12, hat: true,
      mel:  [C5,E5,G5,E5,C5,D5,E5,G5,A5,G5,E5,D5,C5,E5,D5,C5],
      bass: [C3,0,G3,0,C3,0,G3,0,A3,0,E3,0,F3,0,G3,0] },
  };
  function tick() {
    const m = MUS[musicTheme]; if (!m) return;
    const i = musicStep % 16;
    if (m.mel[i]) T(m.mel[i], { type: m.melType, dur: m.ms / 1000 * 0.92, vol: m.melVol, bus: musicBus, a: 0.01 });
    if (m.bass[i]) T(m.bass[i], { type: 'sine', dur: m.ms / 1000 * 1.8, vol: m.bassVol, bus: musicBus, a: 0.02 });
    if (m.drone && i === 0) T(55, { type: 'sine', dur: m.ms / 1000 * 16, vol: 0.05, bus: musicBus, a: 0.6 });
    if (m.hat && i % 2 === 0) N({ type: 'highpass', freq: 7000, dur: 0.03, vol: 0.04, bus: musicBus });
    musicStep++;
    musicTimer = setTimeout(tick, m.ms);
  }
  function startMusic(theme) {
    if (!ctx) return; stopMusic();
    musicTheme = (theme === 'market' || theme === 'ninja' || theme === 'kitchen') ? theme : 'market';
    if (!musicOn) return;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(0.32, ctx.currentTime, 0.4);
    musicStep = 0; tick();
  }
  function stopMusic() {
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
    if (ctx && musicBus) { musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setTargetAtTime(0.0, ctx.currentTime, 0.2); }
  }
  function toggleSfx(v) { sfxOn = (v === undefined) ? !sfxOn : v; return sfxOn; }
  function toggleMusic(v) {
    musicOn = (v === undefined) ? !musicOn : v;
    if (musicOn) { if (musicTheme && typeof state !== 'undefined' && state === 'playing') startMusic(musicTheme); }
    else stopMusic();
    return musicOn;
  }

  return { init, resume, swing, shot, hit, die, hurt, dash, shield, buff, freeze, heal, poof, glass,
    vanish, slam, vroom, lockon, slick, splash, sizzle, sticky, smoke, whoosh, wrap, spice, barrage,
    blockHit, ui, uiBack, hover, matchStart, win, lose, ability, enemySpecial, startMusic, stopMusic,
    toggleSfx, toggleMusic, isSfxOn: () => sfxOn, isMusicOn: () => musicOn };
})();

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
  if (!e) return;
  e.stun = Math.max(e.stun || 0, 2.5);
  damageEnemy(e, 25);
  spawnParticles(e.x, e.y, 30, '#f5e6c8', { speed: 5, life: 0.8, size: 5 });
  zones.push({ type: 'wrap', target: e, life: 2.5, maxLife: 2.5 });
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
function castSugarBoost() { player.atkBuff = 5; player.atkBuffMul = 1.6; spawnParticles(player.x, player.y, 12, '#ffcc6b', { speed: 3, life: 0.6, size: 3 }); }
function castIceToss() {
  const ang = angleTo(player, mouse);
  projectiles.push({
    x: player.x, y: player.y, vx: Math.cos(ang)*7, vy: Math.sin(ang)*7,
    r: 8, dmg: 30, life: 0.8, color: '#a8d8ff', team: 'player',
    onHit: (proj) => {
      for (const e of enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - proj.x, e.y - proj.y) < 80) {
          e.frozen = Math.max(e.frozen || 0, 1.2);
          damageEnemy(e, 25);
        }
      }
      zones.push({ type: 'ice', x: proj.x, y: proj.y, r: 80, life: 1.0, maxLife: 1.0 });
      spawnParticles(proj.x, proj.y, 25, '#cfeaff', { speed: 6, life: 0.7, size: 5 });
    },
  });
}
function castPearlBarrage() {
  const ang = angleTo(player, mouse);
  for (let i = 0; i < 11; i++) {
    const a = ang + (i - 5) * 0.09;
    projectiles.push({ x: player.x, y: player.y, vx: Math.cos(a)*9, vy: Math.sin(a)*9, r: 6, dmg: 22, life: 0.7, color: '#3a2a1a', team: 'player' });
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
    projectiles.push({ x: player.x, y: player.y, vx: Math.cos(a)*8, vy: Math.sin(a)*8, r: 5, dmg: 28, life: 0.8, color: '#cc2936', team: 'player' });
  }
}
function castRedFlash() { player.invuln = 1.5; player.stealth = 4; player.atkBuffMul = 2.0; player.atkBuff = 4; spawnParticles(player.x, player.y, 30, '#cc2936', { speed: 6, life: 0.8, size: 5 }); }
function castSugarStrike() {
  const e = nearestEnemy(mouse.x, mouse.y, 999);
  if (!e) return;
  player.dashTo = { x: e.x, y: e.y, target: e, time: 0, dur: 0.25, leap: true };
  player.invuln = 0.3;
}

// Oyster Omelet
function castEggHeal() { player.hp = Math.min(player.maxHp, player.hp + 50); spawnParticles(player.x, player.y, 24, '#ffe27a', { speed: 4, life: 0.8, size: 4 }); dmgText(player.x, player.y - 30, '+50', '#ffe27a'); updateHud(); }
function castOysterTracker() {
  const target = nearestEnemy(mouse.x, mouse.y, 999);
  if (!target) return;
  projectiles.push({ x: player.x, y: player.y, vx: 0, vy: 0, r: 9, dmg: 45, life: 3, color: '#f4a261', team: 'player', homing: target, speed: 5 });
}
function castSlipperyShield() { zones.push({ type: 'slick', x: player.x, y: player.y, r: 110, life: 6, maxLife: 6 }); }

// Pork Ribs Soup
function castHerbalSmoke() {
  // AoE around player
  for (const e of enemies) {
    if (e.dead) continue;
    if (dist(player, e) < 110) { damageEnemy(e, 18); e.slow = Math.max(e.slow || 0, 1.5); e.slowMul = 0.7; }
  }
  zones.push({ type: 'smoke', x: player.x, y: player.y, r: 110, life: 0.8, maxLife: 0.8 });
  spawnParticles(player.x, player.y, 26, '#9c8a6c', { speed: 4, life: 0.7, size: 5 });
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
  player.shield = 7; player.shieldMul = 0.85;
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

// ============ HERO SELECT UI ============
function renderHeroCards() {
  const grid = document.getElementById('heroes-grid');
  grid.innerHTML = '';
  for (const id of HERO_ORDER) {
    const h = HEROES[id];
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.dataset.id = id;
    const L = HERO_LORE[id] || { tCn:'', tEn:'', rCn:'', aCn:[] };
    card.innerHTML = `
      <div class="hero-emoji"><canvas class="hero-cv" width="84" height="84"></canvas></div>
      <div class="hero-name">${h.name}</div>
      <div class="hero-cn">${h.cn}</div>
      <div class="hero-title">${L.tCn} · ${L.tEn}</div>
      <div class="hero-role"><span class="rcn">${L.rCn}</span> ${h.role}</div>
      <div class="hero-stats"><b>HP</b> ${h.hp} · <b>SPD</b> ${h.speed.toFixed(1)} · <b>${h.atkRange < 100 ? '近戰 Melee' : '遠程 Ranged'}</b></div>
      <div class="hero-abilities">
        ${h.abilities.map((a, i) => `<div><span class="key">${a.key}</span>${a.icon} <span class="acn">${(L.aCn && L.aCn[i]) || ''}</span> ${a.name}</div>`).join('')}
      </div>
    `;
    card.addEventListener('click', () => {
      Sound.ui();
      document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      document.getElementById('confirm-hero-btn').classList.remove('hidden');
      if (pickingP2) selectedHero2 = id; else selectedHero = id;
    });
    grid.appendChild(card);
    renderHeroIcon(card.querySelector('.hero-cv'), id);
  }
}

// ============ MODE SELECT UI ============
function setupModeSelect() {
  const cards = document.querySelectorAll('.mode-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      Sound.ui();
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMode = card.dataset.mode;
      document.getElementById('begin-btn').classList.remove('hidden');
      updateVsPreview();
    });
  });
}

function updateVsPreview() {
  const preview = document.getElementById('vs-preview');
  if (!selectedHero || !selectedMode) return;
  if (selectedMode === 'boss') {
    const youHero = HEROES[selectedHero];
    preview.innerHTML = `<span class="you"><canvas class="vs-cv" width="44" height="44" data-id="${selectedHero}"></canvas>${youHero.cn}</span><span class="vs">VS</span><span class="vs-foe vs-boss">🍲 滷味鍋大王</span>`;
    preview.querySelectorAll('.vs-cv').forEach(cv => renderHeroIcon(cv, cv.dataset.id));
    preview.classList.add('show');
    window.__previewedOpps = [];
    return;
  }
  const opps = pickOpponents(selectedHero, MODES[selectedMode].count);
  const youHero = HEROES[selectedHero];
  preview.innerHTML = `<span class="you"><canvas class="vs-cv" width="44" height="44" data-id="${selectedHero}"></canvas>${youHero.cn}</span><span class="vs">VS</span>` + opps.map(id => `<span class="vs-foe"><canvas class="vs-cv" width="44" height="44" data-id="${id}"></canvas>${HEROES[id].cn}</span>`).join('<span class="vs-dot">·</span>');
  preview.querySelectorAll('.vs-cv').forEach(cv => renderHeroIcon(cv, cv.dataset.id));
  preview.classList.add('show');
  // Stash so begin uses same opponents
  window.__previewedOpps = opps;
}

function pickOpponents(playerId, count) {
  const pool = HERO_ORDER.filter(id => id !== playerId);
  return shuffle(pool).slice(0, count);
}

// ============ MATCH START ============
function startMatch(heroId, mode, opts = {}) {
  coop = !!opts.coop;
  const h = HEROES[heroId];
  currentMap = buildMap();
  players = [];
  player = makePlayer(heroId, 0);
  players.push(player);
  if (coop) players.push(makePlayer(opts.hero2 || heroId, 1));
  enemies = []; projectiles = []; particles = []; zones = []; dmgTexts = [];
  totalKills = 0;
  currentMode = mode;
  runStart = performance.now();

  // Spawn opponents
  const opps = coop
    ? shuffle(HERO_ORDER.filter(id => id !== heroId && id !== opts.hero2)).slice(0, MODES[mode].count)
    : (window.__previewedOpps || pickOpponents(heroId, MODES[mode].count));
  const m = MODES[mode];
  const positions = m.count === 1
    ? [{ x: W/2, y: 120 }]
    : m.count === 2
    ? [{ x: W*0.35, y: 100 }, { x: W*0.65, y: 100 }]
    : [{ x: W*0.25, y: 100 }, { x: W*0.5, y: 80 }, { x: W*0.75, y: 100 }];

  for (let i = 0; i < opps.length; i++) {
    spawnEnemyHero(opps[i], positions[i].x, positions[i].y, m);
  }
  boss = null;
  if (mode === 'boss') spawnBoss();
  players.forEach(resolveBlocks);
  enemies.forEach(resolveBlocks);

  state = 'playing';
  document.getElementById('mode-screen').classList.add('hidden');
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('mode-label').textContent = (coop ? '雙人 ' : '') + mode.toUpperCase();
  document.getElementById('controls-hint').innerHTML = coop
    ? 'P1 <b>WASD</b>+<b>滑鼠</b>+<b>Q E R</b>  \u00b7  P2 <b>方向鍵</b>+<b>右Shift</b>+<b>, . /</b>'
    : '<b>WASD</b> 移動 \u00b7 <b>滑鼠</b> 瞑準 \u00b7 <b>點擊</b> 攻擊 \u00b7 <b>Q E R</b> 技能';
  buildAbilityBar();
  if (touchMode) buildMobileButtons();
  document.body.classList.add('playing');
  Sound.init(); Sound.resume(); Sound.matchStart(); Sound.startMusic(currentMap.theme);
  showMatchBanner(mode === 'boss' ? '魔王戰 \u00b7 BOSS' : ((coop ? '雙人 \u00b7 ' : '') + mode.toUpperCase()), mode === 'boss' ? ((coop ? h.cn + ' + ' + HEROES[opts.hero2 || heroId].cn : h.cn) + ' vs 滷味鍋大王') : ((coop ? h.cn + ' + ' + HEROES[opts.hero2 || heroId].cn : h.cn) + ' vs ' + opps.map(id => HEROES[id].cn).join(' + ')));
  updateHud();
}

function spawnEnemyHero(id, x, y, modeMul) {
  const h = HEROES[id];
  enemies.push({
    id, x, y,
    r: 17,
    color: h.color, emoji: h.emoji, name: h.name,
    hp: Math.round(h.hp * modeMul.hpMul),
    maxHp: Math.round(h.hp * modeMul.hpMul),
    speed: h.speed * 0.72, // AI mobility (was 0.55 — too passive)
    dmg: h.atkDmg * 0.85,  // AI does slightly less damage than player baseline
    dmgMul: modeMul.dmgMul,
    atkRange: h.atkRange,
    atkCd: h.atkCd * 1.3,  // AI fires a bit slower than the player
    ranged: h.atkRange > 100,
    atkTimer: rand(0.3, 1.0),
    aiSpecial: h.aiSpecial,
    aiSpecialCd: h.aiSpecialCd,
    aiSpecialTimer: rand(2, 4),
    aimSkill: clamp(0.55 + (modeMul.dmgMul - 0.75) * 0.55, 0.5, 0.85),
    dodgeSkill: clamp(0.45 + (modeMul.dmgMul - 0.75) * 0.6, 0.4, 0.78),
    strafeDir: Math.random() < 0.5 ? 1 : -1, strafeT: rand(0.5, 1.5),
    retreatT: 0, dodgeCd: 0, _dodgeSide: 0, _dodgeAng: 0, lastSeen: null,
    vx: 0, vy: 0,
    stun: 0, frozen: 0, slow: 0, slowMul: 1,
    burning: 0, burnDmg: 0, burnTick: 0,
    hitFlash: 0,
    invisible: 0,
    vanishStrikeTimer: 0,
    dashing: 0, dashAng: 0, dashSpeed: 0,
    shield: 0, shieldMul: 1,
    dead: false,
  });
}

function buildAbilityBar() {
  const bar = document.getElementById('abilities-bar');
  bar.innerHTML = '';
  player.abilities.forEach((a, i) => {
    const el = document.createElement('div');
    el.className = 'ability ready';
    el.innerHTML = `<div class="ability-key">${a.key}</div><div>${a.icon}</div><div class="ability-name">${a.name}</div><div class="cd-overlay" style="display:none"></div>`;
    bar.appendChild(el);
  });
}

function updateAbilityBar() {
  const bar = document.getElementById('abilities-bar');
  player.abilities.forEach((a, i) => {
    const el = bar.children[i];
    const cdEl = el.querySelector('.cd-overlay');
    if (a.timer > 0) { cdEl.style.display = 'flex'; cdEl.textContent = a.timer.toFixed(1); el.classList.remove('ready'); }
    else { cdEl.style.display = 'none'; el.classList.add('ready'); }
  });
}

function tryCast(i) {
  const ab = player.abilities[i];
  if (!ab || ab.timer > 0) return;
  ab.cast();
  Sound.ability(ab.name);
  ab.timer = ab.cd;
}

function updateHud() {
  const p1 = players[0];
  if (p1) {
    document.getElementById('hp-fill').style.width = (100 * Math.max(0, p1.hp) / p1.maxHp) + '%';
    document.getElementById('hp-text').textContent = `${Math.max(0, Math.round(p1.hp))} / ${p1.maxHp}`;
  }
  document.getElementById('enemies-left').textContent = enemies.filter(e => !e.dead).length;
  const _bb = document.getElementById('boss-bar');
  if (_bb) {
    if (currentMode === 'boss' && boss && !boss.dead) {
      _bb.classList.remove('hidden');
      document.getElementById('boss-bar-fill').style.width = (100 * Math.max(0, boss.hp) / boss.maxHp) + '%';
      _bb.classList.toggle('enraged', !!boss.enraged);
    } else { _bb.classList.add('hidden'); }
  }
  const p2el = document.getElementById('hud-p2');
  if (p2el) {
    if (coop && players[1]) {
      const p2 = players[1];
      p2el.classList.remove('hidden');
      p2el.classList.toggle('down', !!p2.dead);
      document.getElementById('hp2-name').textContent = HEROES[p2.id].cn;
      document.getElementById('hp2-fill').style.width = (100 * Math.max(0, p2.hp) / p2.maxHp) + '%';
      document.getElementById('hp2-text').textContent = `${Math.max(0, Math.round(p2.hp))} / ${p2.maxHp}`;
      const pips = document.getElementById('p2-cds');
      if (pips) p2.abilities.forEach((a, idx) => { const pip = pips.children[idx]; if (pip) { pip.textContent = a.icon; pip.classList.toggle('cooling', a.timer > 0); } });
    } else {
      p2el.classList.add('hidden');
    }
  }
  if (touchMode && players[0]) {
    const _ab = players[0].abilities, _tb = ['tb-q', 'tb-e', 'tb-r'];
    for (let i = 0; i < 3; i++) { const b = document.getElementById(_tb[i]); if (b && _ab[i]) b.classList.toggle('cooling', _ab[i].timer > 0); }
  }
}

function showMatchBanner(text, sub = '') {
  const b = document.getElementById('match-banner');
  b.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  b.classList.add('show');
  setTimeout(() => b.classList.remove('show'), 1800);
}

function endGame(victory) {
  state = 'ended';
  document.body.classList.remove('playing');
  Sound.stopMusic(); if (victory) Sound.win(); else Sound.lose();
  document.getElementById('hud').classList.add('hidden');
  const screen = document.getElementById('end-screen');
  screen.classList.remove('hidden');
  const titleEl = document.getElementById('end-title');
  titleEl.innerHTML = victory ? '勝利<span class="end-en">VICTORY</span>' : '敗北<span class="end-en">DEFEAT</span>';
  titleEl.className = 'end-title ' + (victory ? 'win' : 'lose');
  const time = ((performance.now() - runStart) / 1000).toFixed(1);
  document.getElementById('end-stats').innerHTML = victory
    ? (coop
        ? `P1 <span>${HEROES[players[0].id].cn}</span> + P2 <span>${HEROES[players[1].id].cn}</span> 通關 <span>${currentMode.toUpperCase()}</span>！<br>時間 Time <span>${time}s</span> · 擊倒 Kills <span>${totalKills}</span>`
        : `以 <span>${HEROES[selectedHero].cn}</span> 在 <span>${currentMode.toUpperCase()}</span> 稱霸夜市！<br>時間 Time <span>${time}s</span> · 剩血 HP <span>${Math.round(player.hp)}/${player.maxHp}</span>`)
    : (coop
        ? `兩位英雄都在鐵板混戰中倒下<br>模式 Mode <span>${currentMode.toUpperCase()}</span> · 擊倒 Kills <span>${totalKills}</span>`
        : `<span>${HEROES[selectedHero].cn}</span> 在鐵板混戰中倒下了<br>模式 Mode <span>${currentMode.toUpperCase()}</span> · 擊倒 Kills <span>${totalKills}</span>`);
}

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
  const cand = [{ x: 110, y: H / 2 }, { x: W - 110, y: H / 2 }, { x: W / 2, y: H / 2 }, { x: 170, y: H - 210 }, { x: W - 170, y: H - 210 }];
  for (const c of cand) {
    if (props.length >= 3) break;
    if (!ptClear(c.x, c.y, 30, blocks)) continue;
    if (Math.hypot(c.x - W / 2, c.y - (H - 120)) < 80) continue;
    props.push({ x: c.x, y: c.y, r: 17, cd: 0, maxCd: 9, heal: 22 });
  }
  if (props.length < 2) props.push({ x: 90, y: H / 2 - 40, r: 17, cd: 0, maxCd: 9, heal: 22 });
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
  const charged = hp.cd <= 0, x = hp.x, y = hp.y;
  ctx.save();
  if (charged) {
    const pulse = 0.5 + Math.sin(t * 3) * 0.2;
    const g = ctx.createRadialGradient(x, y + 8, 2, x, y + 8, 34);
    g.addColorStop(0, `rgba(125,223,107,${0.35 * pulse})`); g.addColorStop(1, 'rgba(125,223,107,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + 10, 32, 14, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 14, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = charged ? 1 : 0.55;
  if (theme === 'ninja') drawBasin(x, y, t, charged);
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

function drawMap() {
  if (!currentMap) { drawArena(); return; }
  const t = performance.now() / 1000;
  if (currentMap.theme === 'ninja') drawFloorNinja(t);
  else if (currentMap.theme === 'kitchen') drawFloorKitchen(t);
  else drawFloorMarket(t);
  for (const b of currentMap.blocks) drawBlock(b, currentMap.theme, t);
  for (const hp of currentMap.props) drawHealProp(hp, currentMap.theme, t);
}

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


// ============ BOSS: 滷味鍋大王 / The Cauldron King ============
let boss = null;

function spawnBoss() {
  const hp = coop ? 2700 : 1700;
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


function drawPlayer() {
  for (const pl of players) {
    if (pl.dead) continue;
    const op = player; player = pl;
    if (pl.stealth > 0) ctx.globalAlpha = 0.4;
    drawCharacter(pl, true);
    ctx.globalAlpha = 1;
    player = op;
    if (coop) {
      const col = pl.idx === 0 ? '#ffd86b' : '#6fd6ff';
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 11px "Bungee", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(pl.idx === 0 ? 'P1' : 'P2', pl.x, pl.y - pl.r - 13);
    }
    const aimx = (pl.controls && pl.controls.mouse) ? mouse.x : pl.x + Math.cos(pl.face) * 240;
    const aimy = (pl.controls && pl.controls.mouse) ? mouse.y : pl.y + Math.sin(pl.face) * 240;
    const ang = Math.atan2(aimy - pl.y, aimx - pl.x);
    ctx.strokeStyle = 'rgba(244, 169, 60, 0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pl.x + Math.cos(ang) * (pl.r + 4), pl.y + Math.sin(ang) * (pl.r + 4));
    ctx.lineTo(pl.x + Math.cos(ang) * (pl.r + 16), pl.y + Math.sin(ang) * (pl.r + 16));
    ctx.stroke();
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDmgTexts() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of dmgTexts) {
    const sz = Math.round(14 * (t.size || 1));
    ctx.font = 'bold ' + sz + 'px "Bungee", sans-serif';
    ctx.globalAlpha = clamp(t.life / 0.8, 0, 1);
    ctx.fillStyle = '#000';
    ctx.fillText(t.n, t.x + 1, t.y + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.n, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawRings() {
  for (const r of rings) {
    const a = clamp(r.life / r.maxLife, 0, 1);
    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = r.color; ctx.lineWidth = 3 * a + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.fillStyle = '#0c0716';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shakeMag > 0.1) ctx.translate((Math.random() * 2 - 1) * shakeMag, (Math.random() * 2 - 1) * shakeMag);
  drawMap();
  drawZones();
  drawProjectiles();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawRings();
  drawDmgTexts();
  ctx.restore();
  if (shakeMag > 0) { shakeMag *= 0.86; if (shakeMag < 0.1) shakeMag = 0; }
}

// ============ MAIN LOOP ============
function loop(now) {
  const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
  lastTime = now;
  if (hitStop > 0) {
    hitStop = Math.max(0, hitStop - dt);
  } else if (state === 'playing' || state === 'won') {
    update(dt);
  }
  render();
  requestAnimationFrame(loop);
}

// ============ FLOW ============
function setSelectHeading(t) { const el = document.getElementById('select-title'); if (el) el.textContent = t; }
function p1Heading() { return coopSel ? '玩家 1 \u00b7 選擇你的英雄' : '選擇英雄 \u00b7 Choose Your Hero'; }
function resetHeroPick() {
  pickingP2 = false; selectedHero = null; selectedHero2 = null;
  document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('confirm-hero-btn').classList.add('hidden');
  setSelectHeading(p1Heading());
}
function goToModeScreen() {
  Sound.ui();
  document.getElementById('select-screen').classList.add('hidden');
  document.getElementById('mode-screen').classList.remove('hidden');
  selectedMode = null;
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('begin-btn').classList.add('hidden');
  document.getElementById('vs-preview').classList.remove('show');
  const mt = document.querySelector('#mode-screen .select-title');
  if (mt) mt.textContent = coopSel ? '選擇敵群 \u00b7 Choose the Swarm' : '選擇賠注 \u00b7 Pick Your Odds';
}
document.getElementById('start-btn').addEventListener('click', () => {
  Sound.init(); Sound.resume(); Sound.ui();
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('select-screen').classList.remove('hidden');
  resetHeroPick();
  renderHeroCards();
});
document.getElementById('coop-toggle').addEventListener('click', () => {
  coopSel = !coopSel; Sound.ui();
  const ct = document.getElementById('coop-toggle');
  ct.textContent = coopSel ? '雙人 2P：ON' : '雙人 2P：OFF';
  ct.classList.toggle('on', coopSel);
  resetHeroPick();
});
document.getElementById('confirm-hero-btn').addEventListener('click', () => {
  if (!pickingP2) {
    if (!selectedHero) return;
    if (coopSel) {
      Sound.ui();
      pickingP2 = true; selectedHero2 = null;
      document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
      document.getElementById('confirm-hero-btn').classList.add('hidden');
      setSelectHeading('玩家 2 \u00b7 選擇你的英雄');
      return;
    }
    goToModeScreen();
  } else {
    if (!selectedHero2) return;
    pickingP2 = false;
    goToModeScreen();
  }
});
document.getElementById('back-to-hero-btn').addEventListener('click', () => {
  Sound.uiBack();
  document.getElementById('mode-screen').classList.add('hidden');
  document.getElementById('select-screen').classList.remove('hidden');
  resetHeroPick();
});
document.getElementById('begin-btn').addEventListener('click', () => {
  if (!selectedHero || !selectedMode) return;
  if (coopSel && !selectedHero2) return;
  Sound.resume(); Sound.ui();
  startMatch(selectedHero, selectedMode, { coop: coopSel, hero2: selectedHero2 });
});
document.getElementById('restart-btn').addEventListener('click', () => {
  Sound.ui();
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('title-screen').classList.remove('hidden');
  selectedHero = null; selectedMode = null; selectedHero2 = null; pickingP2 = false;
});

// audio: first-gesture unlock + toggle buttons
(function () {
  const unlock = () => { Sound.init(); Sound.resume(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock));
  const sfxBtn = document.getElementById('sfx-toggle'), musBtn = document.getElementById('music-toggle');
  if (sfxBtn) sfxBtn.addEventListener('click', () => { Sound.init(); Sound.resume(); const on = Sound.toggleSfx(); sfxBtn.classList.toggle('off', !on); if (on) Sound.ui(); });
  if (musBtn) musBtn.addEventListener('click', () => { Sound.init(); Sound.resume(); const on = Sound.toggleMusic(); musBtn.classList.toggle('off', !on); });
  window.addEventListener('keydown', (e) => { if (e.key && e.key.toLowerCase() === 'm') { const on = Sound.toggleMusic(); if (musBtn) musBtn.classList.toggle('off', !on); } });
})();

// ===== Mobile touch controls =====
function autoAimPoint(p) {
  const e = nearestEnemy(p.x, p.y);
  if (e) return { x: e.x, y: e.y };
  return { x: p.x + Math.cos(p.facing) * 240, y: p.y + Math.sin(p.facing) * 240 };
}
function mobileCast(i) {
  if (state !== 'playing' || !players[0] || players[0].dead) return;
  const p = players[0]; player = p;
  const ap = autoAimPoint(p); mouse.x = ap.x; mouse.y = ap.y;
  tryCast(i);
}
function buildMobileButtons() {
  if (!players[0]) return;
  const ab = players[0].abilities;
  ['tb-q', 'tb-e', 'tb-r'].forEach((id, i) => {
    const ic = document.querySelector('#' + id + ' .tb-ic');
    if (ic && ab[i]) ic.textContent = ab[i].icon;
  });
}
function initTouch() {
  const zone = document.getElementById('joy-zone');
  const joy = document.getElementById('joy');
  const knob = document.getElementById('joy-knob');
  if (!zone) return;
  function checkOrient() { document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth); }
  function enableTouch() {
    if (touchMode) return;
    touchMode = true;
    document.body.classList.add('touch');
    const ct = document.getElementById('coop-toggle'); if (ct) ct.style.display = 'none';
    checkOrient();
  }
  window.addEventListener('touchstart', enableTouch, { passive: true });
  window.addEventListener('resize', checkOrient);
  window.addEventListener('orientationchange', () => setTimeout(checkOrient, 200));

  let joyId = null, ox = 0, oy = 0; const R = 52;
  zone.addEventListener('touchstart', (e) => {
    e.preventDefault(); if (joyId !== null) return;
    const t = e.changedTouches[0];
    joyId = t.identifier; ox = t.clientX; oy = t.clientY;
    joy.style.left = ox + 'px'; joy.style.top = oy + 'px';
    joy.classList.remove('hidden');
    knob.style.left = '62px'; knob.style.top = '62px';
    mobileMove.active = true; mobileMove.dx = 0; mobileMove.dy = 0;
  }, { passive: false });
  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      const dx = t.clientX - ox, dy = t.clientY - oy;
      const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), cl = Math.min(len, R);
      knob.style.left = (62 + Math.cos(ang) * cl) + 'px';
      knob.style.top = (62 + Math.sin(ang) * cl) + 'px';
      mobileMove.dx = Math.cos(ang) * (cl / R);
      mobileMove.dy = Math.sin(ang) * (cl / R);
      mobileMove.active = len > 6;
    }
  }, { passive: false });
  function endJoy(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      joyId = null; joy.classList.add('hidden');
      mobileMove.active = false; mobileMove.dx = 0; mobileMove.dy = 0;
    }
  }
  zone.addEventListener('touchend', endJoy, { passive: false });
  zone.addEventListener('touchcancel', endJoy, { passive: false });

  const atk = document.getElementById('tb-atk');
  atk.addEventListener('touchstart', (e) => { e.preventDefault(); mouse.down = true; }, { passive: false });
  atk.addEventListener('touchend', (e) => { e.preventDefault(); mouse.down = false; }, { passive: false });
  atk.addEventListener('touchcancel', () => { mouse.down = false; });
  [['tb-q', 0], ['tb-e', 1], ['tb-r', 2]].forEach(([id, i]) => {
    const b = document.getElementById(id);
    b.addEventListener('touchstart', (e) => { e.preventDefault(); mobileCast(i); }, { passive: false });
  });
  // lock page scroll / synthesized mouse during gameplay (menus stay scrollable)
  document.addEventListener('touchmove', (e) => { if (touchMode && state === 'playing') e.preventDefault(); }, { passive: false });
  const cv = document.getElementById('game');
  if (cv) cv.addEventListener('touchstart', (e) => { if (state === 'playing') e.preventDefault(); }, { passive: false });
}
initTouch();

requestAnimationFrame(loop);
setupModeSelect();

