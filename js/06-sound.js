'use strict';

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

