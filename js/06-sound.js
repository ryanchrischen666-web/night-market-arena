'use strict';

// ============ AUDIO ENGINE v2 (synth SFX + layered music, no asset files) ============
// 全部用 Web Audio 即時合成：零素材、零載入。
//  · 母線：master → 壓縮器 → 喇叭；另有合成殘響（卷積）做空間感
//  · 音樂：前瞻排程器（lookahead scheduler）取代 setTimeout，拍點不飄
//  · 每個主題 4 小節、鼓／貝斯／和弦／主旋律／琶音分層，依「強度」漸進加層
//  · 音效支援左右聲像（依場上 x 座標）、隨機音高、連擊升調
const Sound = (() => {
  let ctx = null, master = null, comp = null, sfxBus = null, quietBus = null, musicBus = null, musicLP = null, defBus = null;
  let reverb = null, revBus = null, noiseBuf = null;
  let sfxOn = true, musicOn = true;
  let lastHit = 0, lastHurt = 0, lastReady = 0, lastBeat = 0;
  let hitCombo = 0, hitComboT = 0;
  const hasPan = typeof window !== 'undefined' && !!(window.StereoPannerNode);

  // ---- 音高工具 ----
  const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const _nf = {};
  function nf(name) {            // 'A4' → 440
    if (!name) return 0;
    if (typeof name === 'number') return name;
    if (_nf[name]) return _nf[name];
    const m = /^([A-G][#b]?)(-?\d)$/.exec(name); if (!m) return 0;
    const midi = NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return (_nf[name] = 440 * Math.pow(2, (midi - 69) / 12));
  }
  const panOf = (x) => (typeof W === 'number' && x != null) ? Math.max(-1, Math.min(1, (x - W / 2) / (W / 2))) * 0.55 : 0;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
      comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0.85; master.connect(comp);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      quietBus = ctx.createGain(); quietBus.gain.value = 0.4; quietBus.connect(master);
      musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 20000; musicLP.Q.value = 0.5; musicLP.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(musicLP);
      defBus = sfxBus;
      // 白噪音 buffer（鼓、風聲、碎裂都靠它）
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // 合成殘響：1.8 秒指數衰減的立體噪音脈衝
      const rl = Math.floor(ctx.sampleRate * 1.8);
      const ir = ctx.createBuffer(2, rl, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const ch = ir.getChannelData(c);
        for (let i = 0; i < rl; i++) { const k = i / rl; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.6) * (i < 400 ? i / 400 : 1); }
      }
      reverb = ctx.createConvolver(); reverb.buffer = ir;
      revBus = ctx.createGain(); revBus.gain.value = 0.32; revBus.connect(reverb); reverb.connect(master);
    } catch (e) { ctx = null; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  // ---- 基本聲源 ----
  function env(g, t0, vol, a, dur, rel) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a);
    if (rel) { g.gain.setValueAtTime(Math.max(0.0002, vol), t0 + Math.max(a, dur - rel)); }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function out(g, bus, opt, t0, dur) {
    let last = g;
    if (hasPan && opt.pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, opt.pan)); last.connect(p); last = p; }
    last.connect(bus);
    if (revBus && opt.rev) { const rs = ctx.createGain(); rs.gain.value = opt.rev; last.connect(rs); rs.connect(revBus); }
  }
  // 單音：freq → opt { type, dur, vol, to, toT, a, lp, detune, bus, when|at, pan, rev, vib }
  function T(freq, opt = {}) {
    const bus = opt.bus || defBus; if (!ctx || !bus || !(freq > 0)) return;
    const t0 = opt.at != null ? opt.at : ctx.currentTime + (opt.when || 0);
    const dur = opt.dur || 0.15;
    const o = ctx.createOscillator(); o.type = opt.type || 'sine'; o.detune.value = opt.detune || 0;
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(1, opt.to), t0 + (opt.toT || dur));
    if (opt.vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = freq * 0.012; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05); }
    const g = ctx.createGain(); env(g, t0, opt.vol == null ? 0.25 : opt.vol, opt.a || 0.006, dur, opt.rel);
    let last = o;
    if (opt.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(opt.lp, t0); if (opt.lpTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, opt.lpTo), t0 + dur); f.Q.value = opt.q || 0.8; last.connect(f); last = f; }
    last.connect(g); out(g, bus, opt, t0, dur);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // 噪音：opt { type(filter), freq, to, q, dur, vol, bus, when|at, pan, rev }
  function N(opt = {}) {
    const bus = opt.bus || defBus; if (!ctx || !bus) return;
    const t0 = opt.at != null ? opt.at : ctx.currentTime + (opt.when || 0); const dur = opt.dur || 0.18;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.loopStart = Math.random() * 0.5;
    const f = ctx.createBiquadFilter(); f.type = opt.type || 'bandpass';
    f.frequency.setValueAtTime(opt.freq || 1200, t0);
    if (opt.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, opt.to), t0 + dur);
    f.Q.value = opt.q || 1;
    const g = ctx.createGain(); env(g, t0, opt.vol == null ? 0.2 : opt.vol, opt.a || 0.005, dur);
    src.connect(f); f.connect(g); out(g, bus, opt, t0, dur);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  function fx(fn) { if (!ctx || !sfxOn) return; try { fn(); } catch (e) {} }
  const jit = (v, k = 0.06) => v * (1 + (Math.random() * 2 - 1) * k);

  // ============ 戰鬥音效 ============
  function swing(id, enemy, x) { fx(() => {
    const b = enemy ? quietBus : sfxBus, pan = panOf(x);
    const heavy = id === 'scallion' || id === 'tofu' || id === 'sausage' || id === 'oyster';
    const quick = id === 'hawthorn';
    if (quick) { N({ type:'bandpass', freq:jit(3200), to:1200, dur:0.09, vol:0.16, q:0.7, bus:b, pan }); T(jit(760), { type:'triangle', dur:0.07, vol:0.1, to:380, bus:b, pan }); }
    else if (heavy) { N({ type:'bandpass', freq:jit(1200), to:300, dur:0.2, vol:0.2, q:0.6, bus:b, pan }); T(jit(170), { type:'sine', dur:0.14, vol:0.14, to:80, bus:b, pan }); }
    else { N({ type:'bandpass', freq:jit(2000), to:600, dur:0.13, vol:0.18, q:0.6, bus:b, pan }); T(jit(300), { type:'sine', dur:0.1, vol:0.1, to:170, bus:b, pan }); }
  }); }
  function shot(id, enemy, x) { fx(() => {
    const b = enemy ? quietBus : sfxBus, pan = panOf(x);
    if (id === 'squid') { T(jit(520), { type:'sine', dur:0.16, vol:0.2, to:150, lp:900, bus:b, pan }); N({ type:'lowpass', freq:1200, to:300, dur:0.1, vol:0.08, bus:b, pan }); }
    else if (id === 'bubble') { T(jit(820), { type:'square', dur:0.06, vol:0.12, to:520, bus:b, pan }); T(300, { type:'sine', dur:0.09, vol:0.12, to:150, bus:b, when:0.02, pan }); }
    else if (id === 'oyster') { N({ type:'bandpass', freq:jit(1600), to:700, dur:0.12, vol:0.16, q:1.2, bus:b, pan }); T(260, { type:'triangle', dur:0.1, vol:0.1, to:160, bus:b, pan }); }
    else if (id === 'ribs') { T(jit(340), { type:'triangle', dur:0.14, vol:0.16, to:300, bus:b, pan }); T(510, { type:'triangle', dur:0.1, vol:0.07, to:480, bus:b, when:0.01, pan }); }
    else if (id === 'chicken') { N({ type:'bandpass', freq:jit(2400), to:900, dur:0.18, vol:0.16, q:0.9, bus:b, pan, rev:0.2 }); T(jit(640), { type:'sawtooth', dur:0.16, vol:0.1, to:220, lp:1600, bus:b, pan }); }
    else { T(jit(900), { type:'sawtooth', dur:0.12, vol:0.14, to:280, lp:1800, bus:b, pan }); }
  }); }
  // 命中：連續命中會慢慢升調，打出節奏感
  function hit(x, big) {
    const t = performance.now(); if (t - lastHit < 50) return;
    if (t - hitComboT > 900) hitCombo = 0; hitCombo = Math.min(hitCombo + 1, 10); hitComboT = t; lastHit = t;
    fx(() => {
      const pan = panOf(x), k = Math.pow(1.045, hitCombo);
      T(230 * k, { type:'triangle', dur:0.06, vol:big ? 0.22 : 0.16, to:150 * k, pan });
      N({ type:'highpass', freq:2200, dur:0.04, vol:0.07, pan });
      if (big) { T(110, { type:'sine', dur:0.12, vol:0.2, to:55, pan }); N({ type:'bandpass', freq:900, to:300, dur:0.14, vol:0.12, pan, rev:0.25 }); }
    });
  }
  function die(x) { fx(() => {
    const pan = panOf(x);
    T(440, { type:'triangle', dur:0.1, vol:0.16, to:300, pan });
    T(300, { type:'triangle', dur:0.12, vol:0.14, to:200, when:0.08, pan });
    T(210, { type:'sine', dur:0.16, vol:0.12, to:120, when:0.16, pan });
    T(90, { type:'sine', dur:0.3, vol:0.22, to:40, pan });
    N({ type:'lowpass', freq:1200, to:200, dur:0.35, vol:0.16, when:0.02, pan, rev:0.4 });
    N({ type:'highpass', freq:3000, dur:0.12, vol:0.06, pan });
  }); }
  function hurt(big) { const t = performance.now(); if (t - lastHurt < 90) return; lastHurt = t; fx(() => {
    T(jit(300), { type:'square', dur:0.09, vol:0.16, to:180, lp:1400 });
    if (big) { T(140, { type:'sine', dur:0.16, vol:0.18, to:60 }); N({ type:'lowpass', freq:800, to:200, dur:0.16, vol:0.1 }); }
  }); }
  // 血量過低：悶悶的心跳（遊戲端節流）
  function heartbeat() { const t = performance.now(); if (t - lastBeat < 700) return; lastBeat = t; fx(() => {
    T(62, { type:'sine', dur:0.14, vol:0.28, to:40, a:0.01 }); T(58, { type:'sine', dur:0.16, vol:0.22, to:38, when:0.17, a:0.01 });
  }); }

  // ============ 技能音色 ============
  function dash(id) { fx(() => {
    N({ type:'lowpass', freq:400, to:3200, dur:0.18, vol:0.18 });
    T(200, { type:'sine', dur:0.18, vol:0.12, to:560 });
    if (id === 'tofu') { T(420, { type:'sine', dur:0.14, vol:0.1, to:170 }); N({ type:'bandpass', freq:800, dur:0.16, vol:0.06, q:2 }); }
  }); }
  function shield() { fx(() => { T(300, { type:'triangle', dur:0.2, vol:0.16, to:880, rev:0.3 }); T(1200, { type:'sine', dur:0.16, vol:0.08, when:0.06, rev:0.3 }); T(1800, { type:'sine', dur:0.3, vol:0.04, when:0.1, rev:0.5 }); }); }
  function buff() { fx(() => { ['E5','G5','B5','E6'].forEach((n,i)=>T(nf(n),{type:'triangle',dur:0.1,vol:0.1,when:i*0.05,rev:0.3})); }); }
  function freeze() { fx(() => { [1200,1550,1850,2400].forEach((f,i)=>T(f,{type:'sine',dur:0.2,vol:0.09,when:i*0.03,detune:i*6,rev:0.4})); N({type:'highpass',freq:5000,dur:0.18,vol:0.05,when:0.05,rev:0.3}); }); }
  function heal() { fx(() => { ['E5','G5','B5','D6'].forEach((n,i)=>T(nf(n),{type:'triangle',dur:0.16,vol:0.13,when:i*0.06,rev:0.35})); T(nf('G6'),{type:'sine',dur:0.24,vol:0.06,when:0.22,rev:0.4}); }); }
  function poof() { fx(() => { T(420,{type:'triangle',dur:0.22,vol:0.14,to:150}); N({type:'lowpass',freq:1000,to:300,dur:0.28,vol:0.14,rev:0.25}); T(300,{type:'sine',dur:0.18,vol:0.08,to:120,when:0.06}); }); }
  function glass() { fx(() => { [1400,1750,2050,2600].forEach((f,i)=>T(f,{type:'triangle',dur:0.1,vol:0.09,when:i*0.04,to:f*0.9,rev:0.3})); }); }
  function vanish() { fx(() => { N({type:'highpass',freq:3000,to:7000,dur:0.16,vol:0.12,rev:0.3}); T(800,{type:'sine',dur:0.16,vol:0.1,to:2200}); }); }
  function slam() { fx(() => { T(150,{type:'sine',dur:0.18,vol:0.24,to:60}); N({type:'lowpass',freq:1200,to:200,dur:0.22,vol:0.18,rev:0.3}); [880,1100].forEach((f,i)=>T(f,{type:'triangle',dur:0.1,vol:0.08,when:0.04+i*0.03})); }); }
  function vroom() { fx(() => { T(110,{type:'sawtooth',dur:0.36,vol:0.16,to:320,lp:1200,lpTo:2600}); N({type:'lowpass',freq:600,dur:0.3,vol:0.1}); T(55,{type:'square',dur:0.3,vol:0.08,to:140,lp:500}); }); }
  function lockon() { fx(() => { T(1000,{type:'square',dur:0.05,vol:0.1}); T(1000,{type:'square',dur:0.05,vol:0.1,when:0.12}); T(420,{type:'sawtooth',dur:0.16,vol:0.12,to:1000,when:0.22,lp:2000}); }); }
  function slick() { fx(() => { N({type:'lowpass',freq:1500,to:500,dur:0.26,vol:0.14}); T(220,{type:'sine',dur:0.16,vol:0.1,to:130}); }); }
  function splash() { fx(() => { T(420,{type:'sine',dur:0.2,vol:0.18,to:120,lp:800}); N({type:'lowpass',freq:900,to:300,dur:0.24,vol:0.12,rev:0.3}); T(260,{type:'sine',dur:0.14,vol:0.08,to:110,when:0.05}); }); }
  function sizzle() { fx(() => { N({type:'highpass',freq:3000,dur:0.34,vol:0.1,q:0.5}); T(200,{type:'triangle',dur:0.18,vol:0.1,to:120}); N({type:'bandpass',freq:5000,dur:0.5,vol:0.04,q:0.3,when:0.1}); }); }
  function sticky() { fx(() => { T(300,{type:'square',dur:0.14,vol:0.12,to:140,lp:900}); N({type:'lowpass',freq:1100,to:400,dur:0.18,vol:0.1}); }); }
  function smoke() { fx(() => { N({type:'lowpass',freq:1000,to:400,dur:0.32,vol:0.12,rev:0.3}); [520,660].forEach((f,i)=>T(f,{type:'sine',dur:0.16,vol:0.07,when:i*0.05,to:f*1.1})); }); }
  function whoosh() { fx(() => { N({type:'bandpass',freq:700,to:2400,dur:0.18,vol:0.14,q:0.8}); T(240,{type:'sine',dur:0.16,vol:0.08,to:560}); }); }
  function wrap() { fx(() => { T(520,{type:'triangle',dur:0.12,vol:0.14,to:200}); N({type:'bandpass',freq:1800,to:600,dur:0.12,vol:0.1,q:1}); T(180,{type:'sine',dur:0.14,vol:0.1,to:100,when:0.06}); }); }
  function spice() { fx(() => { N({type:'bandpass',freq:1800,to:500,dur:0.2,vol:0.16,q:0.7}); T(300,{type:'sawtooth',dur:0.14,vol:0.1,to:160,lp:1500}); }); }
  function barrage() { fx(() => { for (let i=0;i<5;i++){ T(800+i*40,{type:'square',dur:0.05,vol:0.09,to:520,when:i*0.065}); T(300,{type:'sine',dur:0.07,vol:0.08,to:150,when:i*0.065+0.02}); } }); }
  function blockHit(x) { fx(() => { const pan = panOf(x); T(900,{type:'square',dur:0.04,vol:0.08,to:600,pan}); N({type:'highpass',freq:3000,dur:0.04,vol:0.05,pan}); }); }
  function beam() { fx(() => { T(180,{type:'sawtooth',dur:0.5,vol:0.1,to:420,lp:1200,lpTo:3200,rev:0.3}); N({type:'bandpass',freq:1800,to:4200,dur:0.45,vol:0.1,q:1.2}); T(nf('A5'),{type:'triangle',dur:0.4,vol:0.08,when:0.1,rev:0.4}); }); }

  // ============ 介面 / 過場 ============
  function ui() { fx(() => { T(523,{type:'triangle',dur:0.07,vol:0.12}); T(784,{type:'triangle',dur:0.08,vol:0.1,when:0.04}); }); }
  function uiBack() { fx(() => { T(620,{type:'triangle',dur:0.07,vol:0.1}); T(440,{type:'triangle',dur:0.08,vol:0.1,when:0.04}); }); }
  function hover() { fx(() => { T(680,{type:'sine',dur:0.05,vol:0.06}); }); }
  function ready() { const t = performance.now(); if (t - lastReady < 120) return; lastReady = t; fx(() => { T(nf('B5'),{type:'sine',dur:0.08,vol:0.07,rev:0.3}); T(nf('E6'),{type:'sine',dur:0.14,vol:0.07,when:0.06,rev:0.4}); }); }
  function pickup(kind) { fx(() => {
    if (kind === 'boots') { N({type:'bandpass',freq:600,to:3000,dur:0.22,vol:0.12,q:0.7}); ['G5','B5','D6'].forEach((n,i)=>T(nf(n),{type:'square',dur:0.07,vol:0.06,when:i*0.05,lp:3000})); }
    else heal();
  }); }
  // 開場倒數：3 · 2 · 1 → 開打！
  function countTick(n) { fx(() => { const f = n <= 1 ? 880 : 660; T(f,{type:'square',dur:0.09,vol:0.1,lp:2400}); T(f*2,{type:'sine',dur:0.12,vol:0.05,rev:0.3}); }); }
  function fight() { fx(() => {
    T(90,{type:'sine',dur:0.4,vol:0.3,to:45}); N({type:'lowpass',freq:2000,to:300,dur:0.45,vol:0.2,rev:0.4});
    ['C5','E5','G5','C6'].forEach((n,i)=>T(nf(n),{type:'triangle',dur:0.22,vol:0.14,when:i*0.03,rev:0.35}));
    T(nf('C6'),{type:'square',dur:0.4,vol:0.05,when:0.1,lp:3000,rev:0.4});
  }); }
  function matchStart() { fx(() => { ['C5','E5','G5','C6'].forEach((n,i)=>T(nf(n),{type:'triangle',dur:0.12,vol:0.14,when:i*0.09,rev:0.3})); N({type:'lowpass',freq:1500,to:400,dur:0.4,vol:0.06}); }); }
  // 連殺：每升一級就更華麗
  function streak(n) { fx(() => {
    const base = Math.min(n, 5);
    const seq = base >= 4 ? ['C5','E5','G5','C6','E6'] : base === 3 ? ['D5','F#5','A5','D6'] : ['E5','G5','B5'];
    seq.forEach((s,i)=>T(nf(s),{type:'triangle',dur:0.14,vol:0.12,when:i*0.06,rev:0.4}));
    T(110,{type:'sine',dur:0.3,vol:0.2,to:50}); N({type:'bandpass',freq:2500,to:600,dur:0.3,vol:0.08,rev:0.4});
  }); }
  // 魔王
  function bossRoar() { fx(() => {
    T(70,{type:'sawtooth',dur:1.1,vol:0.26,to:45,lp:500,lpTo:200,vib:true,rev:0.5});
    T(105,{type:'square',dur:0.9,vol:0.1,to:60,lp:400,rev:0.5});
    N({type:'lowpass',freq:900,to:150,dur:1.0,vol:0.2,rev:0.5});
    N({type:'bandpass',freq:300,to:120,dur:0.8,vol:0.14,q:2});
  }); }
  function bossTele(kind) { fx(() => {
    if (kind === 'ring') { T(300,{type:'sawtooth',dur:0.55,vol:0.1,to:1200,lp:2000,lpTo:4000,rev:0.3}); N({type:'bandpass',freq:800,to:3000,dur:0.5,vol:0.08,q:1}); }
    else if (kind === 'puddles') { for (let i=0;i<6;i++) T(jit(240+i*30,0.2),{type:'sine',dur:0.12,vol:0.1,to:500,when:i*0.12,rev:0.3}); N({type:'lowpass',freq:700,dur:0.8,vol:0.08}); }
    else if (kind === 'sweep') { N({type:'bandpass',freq:300,to:1800,dur:0.5,vol:0.16,q:0.8,rev:0.3}); T(120,{type:'sine',dur:0.5,vol:0.14,to:260}); }
    else if (kind === 'minions') { [0,0.12,0.26].forEach((w,i)=>{ T(420-i*60,{type:'sine',dur:0.14,vol:0.12,to:160,when:w}); N({type:'lowpass',freq:1200,to:400,dur:0.14,vol:0.08,when:w}); }); }
    else spice();
  }); }
  function bossDie() { fx(() => {
    for (let i = 0; i < 5; i++) { T(70,{type:'sine',dur:0.5,vol:0.26,to:35,when:i*0.22}); N({type:'lowpass',freq:1500,to:200,dur:0.5,vol:0.2,when:i*0.22,rev:0.5}); }
    T(nf('D3'),{type:'sawtooth',dur:1.6,vol:0.12,to:nf('D2'),lp:900,lpTo:200,when:0.3,rev:0.6});
    N({type:'highpass',freq:2500,dur:1.4,vol:0.08,when:0.6,rev:0.6});
  }); }
  function win() { fx(() => {
    const seq = ['C5','E5','G5','C6','G5','C6','E6'];
    seq.forEach((n,i)=>T(nf(n),{type:'triangle',dur:i===seq.length-1?0.9:0.14,vol:0.15,when:i*0.1,rev:0.45}));
    [['C4','E4','G4'],['F4','A4','C5'],['G4','B4','D5'],['C5','E5','G5']].forEach((ch,i)=>ch.forEach(n=>T(nf(n),{type:'triangle',dur:0.5,vol:0.07,when:0.7+i*0.18,rev:0.5,a:0.02})));
    for (let i = 0; i < 8; i++) N({type:'bandpass',freq:1800,dur:0.05,vol:0.05,when:i*0.07,q:1.5});
    T(nf('C3'),{type:'sine',dur:1.2,vol:0.14,when:0.72});
    N({type:'highpass',freq:4000,dur:1.0,vol:0.05,when:0.75,rev:0.6});
  }); }
  function lose() { fx(() => {
    ['A4','G4','E4','C4'].forEach((n,i)=>T(nf(n),{type:'triangle',dur:0.34,vol:0.13,when:i*0.18,detune:-6,rev:0.5}));
    T(nf('A2'),{type:'sine',dur:1.2,vol:0.14,when:0.72,rev:0.5});
    T(nf('C3'),{type:'triangle',dur:1.2,vol:0.06,when:0.74,rev:0.5});
    N({type:'lowpass',freq:600,to:150,dur:1.2,vol:0.08,when:0.7,rev:0.5});
  }); }
  function levelUp() { fx(() => { ['G5','C6','E6','G6'].forEach((n,i)=>T(nf(n),{type:'triangle',dur:0.3,vol:0.12,when:i*0.08,rev:0.5})); T(nf('C7'),{type:'sine',dur:0.6,vol:0.05,when:0.3,rev:0.6}); }); }

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
      case 'Pepper Wave': spice(); whoosh(); break;
      case 'Crispy Coat': shield(); sizzle(); break;
      case 'Cutlet Feast': beam(); break;
      default: T(600, { type:'triangle', dur:0.1, vol:0.1 });
    }
  }
  function enemySpecial(kind) {
    const map = { cone: spice, snare: splash, stinkBomb: poof, iceShot: freeze, dash: whoosh, vanishStrike: vanish, tracker: lockon, boomerang: whoosh };
    const f = map[kind]; if (!f) return;
    const prev = defBus; defBus = quietBus; try { f(); } finally { defBus = prev; }
  }

  // ============ 背景音樂：分層排程器 ============
  // 每個主題 = 4 小節 × 16 分音符（64 步）。層 (layer) 以 min 強度門檻漸進疊加：
  //   0 寧靜（選單／開場）  1 戰鬥  2 緊張（殘血／魔王暴怒）
  const _ = 0;
  const bar = (a) => a;
  const K = (...s) => { const r = new Array(16).fill(0); s.forEach(i => r[i] = 1); return r; };
  const rep4 = (b) => [...b, ...b, ...b, ...b];
  const MUS = {
    menu: { bpm: 94, swing: 0.12, vol: 0.22,
      kick:  rep4(K(0, 8)), kickMin: 0,
      rim:   rep4(K(4, 12)), rimMin: 1,
      hat:   rep4(K(2, 6, 10, 14)), hatMin: 0, hatVol: 0.03,
      chords: [['C3','E4','G4','B4'], ['A2','E4','G4','C5'], ['F2','A3','C4','E4'], ['G2','B3','D4','F4']], padMin: 0,
      bass:  [...bar(['C2',_,_,_,_,_,'C2',_,_,_,'G2',_,_,_,_,_]), ...bar(['A1',_,_,_,_,_,'A1',_,_,_,'E2',_,_,_,_,_]),
              ...bar(['F1',_,_,_,_,_,'F1',_,_,_,'C2',_,_,_,_,_]), ...bar(['G1',_,_,_,_,_,'G1',_,_,_,'D2',_,_,_,_,_])], bassMin: 0, bassType: 'sine',
      mel:   [...bar(['E5',_,_,_,'G5',_,_,_,'A5',_,_,_,'G5',_,'E5',_]), ...bar(['D5',_,_,_,_,_,_,_,'C5',_,_,_,_,_,_,_]),
              ...bar(['A4',_,_,_,'C5',_,_,_,'D5',_,_,_,'E5',_,'D5',_]), ...bar(['C5',_,_,_,_,_,_,_,_,_,'G5',_,'E5',_,'D5',_])], melMin: 0, melType: 'triangle', melVol: 0.085,
      arp:   [...bar(new Array(16).fill(0)), ...bar(new Array(16).fill(0)), ...bar(new Array(16).fill(0)), ...bar(['C6',_,'E6',_,'G6',_,'E6',_,'C6',_,'G5',_,'E5',_,_,_])], arpMin: 0, arpVol: 0.035 },
    market: { bpm: 126, swing: 0.08, vol: 0.3,
      kick:  rep4(K(0, 4, 8, 12)), kickMin: 0,
      snare: rep4(K(4, 12)), snareMin: 1,
      hat:   rep4(K(0, 2, 4, 6, 8, 10, 12, 14)), hatMin: 0, hatVol: 0.035,
      hat2:  rep4(K(1, 3, 5, 7, 9, 11, 13, 15)), hat2Min: 2,
      chords: [['C3','E4','G4'], ['A2','C4','E4'], ['F2','A3','C4'], ['G2','B3','D4']], stabMin: 1, stabSteps: [0, 6, 10], padMin: 0,
      bass:  [...bar(['C2',_,'C3',_,'C2',_,'C3','C2',_,'C2','G2',_,'C2',_,'C3',_]), ...bar(['A1',_,'A2',_,'A1',_,'A2','A1',_,'A1','E2',_,'A1',_,'A2',_]),
              ...bar(['F1',_,'F2',_,'F1',_,'F2','F1',_,'F1','C2',_,'F1',_,'F2',_]), ...bar(['G1',_,'G2',_,'G1',_,'G2','G1',_,'G1','D2',_,'G1',_,'B1',_])], bassMin: 0, bassType: 'triangle',
      mel:   [...bar(['E5',_,'G5',_,'A5',_,'G5','E5',_,'D5',_,'E5',_,_,_,_]), ...bar(['C5',_,'D5',_,'E5',_,'D5','C5',_,'A4',_,'G4',_,_,_,_]),
              ...bar(['A4',_,'C5',_,'D5',_,'E5',_,'G5',_,'E5',_,'D5',_,_,_]), ...bar(['D5',_,'E5',_,'G5','E5','D5',_,'C5',_,_,_,'G5',_,'A5',_])], melMin: 1, melType: 'square', melVol: 0.06, melLp: 2600,
      arp:   [...bar(['C6',_,'E6',_,'G6',_,'E6',_,'C6',_,'E6',_,'G6',_,'E6',_]), ...bar(['A5',_,'C6',_,'E6',_,'C6',_,'A5',_,'C6',_,'E6',_,'C6',_]),
              ...bar(['F5',_,'A5',_,'C6',_,'A5',_,'F5',_,'A5',_,'C6',_,'A5',_]), ...bar(['G5',_,'B5',_,'D6',_,'B5',_,'G5',_,'B5',_,'D6',_,'B5',_])], arpMin: 2, arpVol: 0.035 },
    ninja: { bpm: 108, swing: 0, vol: 0.3, drone: 'A1',
      kick:  rep4(K(0, 10)), kickMin: 0,
      snare: rep4(K(8)), snareMin: 1,
      hat:   rep4(K(4, 12, 14)), hatMin: 1, hatVol: 0.03,
      hat2:  rep4(K(2, 6, 10)), hat2Min: 2,
      chords: [['A2','C4','E4'], ['A2','C4','E4'], ['F2','A3','C4'], ['G2','B3','D4']], padMin: 0, stabMin: 2, stabSteps: [0, 10],
      bass:  [...bar(['A1',_,_,'A1',_,_,'A1',_,'G1',_,_,_,'A1',_,'C2',_]), ...bar(['A1',_,_,'A1',_,_,'A1',_,'G1',_,_,_,'E2',_,'D2',_]),
              ...bar(['F1',_,_,'F1',_,_,'F1',_,'E1',_,_,_,'F1',_,'A1',_]), ...bar(['G1',_,_,'G1',_,_,'G1',_,'F1',_,_,_,'G1',_,'B1',_])], bassMin: 0, bassType: 'sawtooth', bassLp: 500,
      mel:   [...bar(['A4',_,_,_,'C5',_,'D5',_,_,_,'E5',_,_,_,'D5',_]), ...bar(['C5',_,_,_,_,_,'A4',_,_,_,_,_,'G4',_,'A4',_]),
              ...bar(['E5',_,_,_,'G5',_,'E5',_,_,_,'D5',_,'C5',_,_,_]), ...bar(['D5',_,_,_,_,_,'C5',_,'A4',_,_,_,_,_,_,_])], melMin: 1, melType: 'triangle', melVol: 0.1, melVib: true,
      arp:   [...bar(['A5',_,'C6',_,'E6',_,'C6',_,'A5',_,'C6',_,'E6',_,'C6',_]), ...bar(['A5',_,'C6',_,'E6',_,'C6',_,'A5',_,'C6',_,'E6',_,'C6',_]),
              ...bar(['F5',_,'A5',_,'C6',_,'A5',_,'F5',_,'A5',_,'C6',_,'A5',_]), ...bar(['G5',_,'B5',_,'D6',_,'B5',_,'G5',_,'B5',_,'D6',_,'B5',_])], arpMin: 2, arpVol: 0.03 },
    kitchen: { bpm: 140, swing: 0.1, vol: 0.3,
      kick:  rep4(K(0, 6, 8)), kickMin: 0,
      snare: rep4(K(4, 12)), snareMin: 1,
      hat:   rep4(K(0, 2, 4, 6, 8, 10, 12, 14)), hatMin: 0, hatVol: 0.04,
      hat2:  rep4(K(3, 7, 11, 15)), hat2Min: 1,
      chords: [['G2','B3','D4'], ['E2','G3','B3'], ['C3','E4','G4'], ['D3','F#4','A4']], stabMin: 1, stabSteps: [2, 6, 11], padMin: 0,
      bass:  [...bar(['G1',_,'G1','B1','D2',_,'D2',_,'G1',_,'G1',_,'F#1',_,'E1',_]), ...bar(['E1',_,'E1','G1','B1',_,'B1',_,'E1',_,'E1',_,'D1',_,'C1',_]),
              ...bar(['C2',_,'C2','E2','G2',_,'G2',_,'C2',_,'C2',_,'B1',_,'A1',_]), ...bar(['D2',_,'D2','F#2','A2',_,'A2',_,'D2',_,'D2',_,'C2',_,'B1',_])], bassMin: 0, bassType: 'square', bassLp: 700,
      mel:   [...bar(['G5','G5',_,'A5','B5',_,'A5','G5',_,'E5',_,'D5',_,_,_,_]), ...bar(['E5','E5',_,'G5','A5',_,'G5','E5',_,'D5',_,'B4',_,_,_,_]),
              ...bar(['G5',_,'B5',_,'D6',_,'B5','A5',_,'G5',_,'E5',_,'D5',_,_]), ...bar(['E5',_,'D5',_,'B4','D5','E5',_,'G5',_,_,_,'A5',_,'B5',_])], melMin: 1, melType: 'square', melVol: 0.055, melLp: 3000,
      arp:   [...bar(['G6',_,'D6',_,'B5',_,'D6',_,'G6',_,'D6',_,'B5',_,'D6',_]), ...bar(['E6',_,'B5',_,'G5',_,'B5',_,'E6',_,'B5',_,'G5',_,'B5',_]),
              ...bar(['G6',_,'E6',_,'C6',_,'E6',_,'G6',_,'E6',_,'C6',_,'E6',_]), ...bar(['A6',_,'F#6',_,'D6',_,'F#6',_,'A6',_,'F#6',_,'D6',_,'F#6',_])], arpMin: 2, arpVol: 0.03 },
    boss: { bpm: 148, swing: 0, vol: 0.34, drone: 'D1',
      kick:  rep4(K(0, 3, 6, 8, 10, 14)), kickMin: 0,
      snare: rep4(K(4, 12)), snareMin: 0,
      hat:   rep4(K(0, 2, 4, 6, 8, 10, 12, 14)), hatMin: 1, hatVol: 0.035,
      hat2:  rep4(K(1, 3, 5, 7, 9, 11, 13, 15)), hat2Min: 2,
      tom:   rep4(K(7, 13, 15)), tomMin: 2,
      chords: [['D3','F4','A4'], ['D3','F4','A4'], ['Bb2','D4','F4'], ['C3','E4','G4']], stabMin: 1, stabSteps: [0, 3, 6, 10], padMin: 0,
      bass:  [...bar(['D1','D1',_,'D1',_,'D1','F1',_,'D1','D1',_,'D1',_,'C1',_,'D1']), ...bar(['D1','D1',_,'D1',_,'D1','F1',_,'D1','D1',_,'A1',_,'G1',_,'F1']),
              ...bar(['Bb0','Bb0',_,'Bb0',_,'Bb0','D1',_,'Bb0','Bb0',_,'Bb0',_,'A0',_,'Bb0']), ...bar(['C1','C1',_,'C1',_,'C1','E1',_,'C1','C1',_,'G1',_,'A1',_,'C2'])], bassMin: 0, bassType: 'sawtooth', bassLp: 600,
      mel:   [...bar(['D5',_,_,'F5',_,_,'E5',_,'D5',_,_,'A4',_,_,_,_]), ...bar(['D5',_,_,'F5',_,_,'G5',_,'A5',_,_,_,_,_,_,_]),
              ...bar(['Bb5',_,_,'A5',_,_,'G5',_,'F5',_,_,'E5',_,_,_,_]), ...bar(['D5',_,'E5',_,'F5',_,'E5',_,'D5',_,_,_,'A4',_,'D5',_])], melMin: 1, melType: 'sawtooth', melVol: 0.07, melLp: 2200,
      arp:   [...bar(['D6',_,'A5',_,'F5',_,'A5',_,'D6',_,'A5',_,'F5',_,'A5',_]), ...bar(['D6',_,'A5',_,'F5',_,'A5',_,'D6',_,'A5',_,'F5',_,'A5',_]),
              ...bar(['D6',_,'Bb5',_,'F5',_,'Bb5',_,'D6',_,'Bb5',_,'F5',_,'Bb5',_]), ...bar(['E6',_,'C6',_,'G5',_,'C6',_,'E6',_,'C6',_,'G5',_,'C6',_])], arpMin: 2, arpVol: 0.04 },
  };

  let mus = { theme: null, step: 0, next: 0, timer: null, intensity: 1, want: 1 };
  const MB = () => musicBus;

  // ---- 鼓組 ----
  function kick(at, vol = 0.5) {
    T(150, { type:'sine', dur:0.28, vol, to:38, toT:0.12, a:0.002, bus:MB(), at });
    N({ type:'lowpass', freq:900, to:200, dur:0.05, vol:vol*0.35, bus:MB(), at });
  }
  function snare(at, vol = 0.32) {
    N({ type:'bandpass', freq:1800, q:0.6, dur:0.16, vol, bus:MB(), at, rev:0.35 });
    N({ type:'highpass', freq:5000, dur:0.1, vol:vol*0.5, bus:MB(), at });
    T(190, { type:'triangle', dur:0.09, vol:vol*0.6, to:120, a:0.002, bus:MB(), at });
  }
  function rim(at, vol = 0.18) { T(900, { type:'square', dur:0.03, vol, to:600, bus:MB(), at }); N({ type:'bandpass', freq:3000, q:2, dur:0.03, vol:vol*0.5, bus:MB(), at }); }
  function hat(at, vol = 0.04, open) { N({ type:'highpass', freq:7500, dur:open ? 0.16 : 0.035, vol, bus:MB(), at, pan: 0.25 }); }
  function tom(at, vol = 0.3) { T(110, { type:'sine', dur:0.26, vol, to:60, a:0.002, bus:MB(), at, pan:-0.3, rev:0.3 }); }

  function tick() {
    const m = MUS[mus.theme]; if (!m || !ctx) return;
    const LOOK = 0.14;
    while (mus.next < ctx.currentTime + LOOK) {
      const i = mus.step % 64, b = i % 16, barI = Math.floor(i / 16) % 4;
      const inten = mus.intensity;
      const stepDur = 60 / (m.bpm * (inten >= 2 && mus.theme === 'boss' ? 1.06 : 1)) / 4;
      const sw = (b % 2 === 1) ? stepDur * (m.swing || 0) : 0;
      const at = mus.next + sw;
      // 強度切換：只在小節開頭生效，不會中途斷層
      if (b === 0 && mus.want !== mus.intensity) mus.intensity = mus.want;
      // 鼓
      if (m.kick && m.kick[i] && inten >= (m.kickMin || 0)) kick(at, inten >= 1 ? 0.5 : 0.36);
      if (m.snare && m.snare[i] && inten >= (m.snareMin || 0)) snare(at, inten >= 2 ? 0.36 : 0.3);
      if (m.rim && m.rim[i] && inten >= (m.rimMin || 0)) rim(at);
      if (m.hat && m.hat[i] && inten >= (m.hatMin || 0)) hat(at, (m.hatVol || 0.04) * (b % 4 === 0 ? 1.3 : 1), b === 14 && inten >= 1);
      if (m.hat2 && m.hat2[i] && inten >= (m.hat2Min || 0)) hat(at, (m.hatVol || 0.04) * 0.6);
      if (m.tom && m.tom[i] && inten >= (m.tomMin || 0)) tom(at);
      // 貝斯
      if (m.bass && m.bass[i] && inten >= (m.bassMin || 0)) T(nf(m.bass[i]), { type:m.bassType || 'triangle', dur:stepDur * 1.7, vol:0.17, lp:m.bassLp || 900, a:0.008, bus:MB(), at });
      // 持續低頻（忍者／魔王）
      if (m.drone && b === 0 && barI === 0) T(nf(m.drone), { type:'sine', dur:stepDur * 64, vol:0.06, a:0.5, bus:MB(), at });
      // 和弦：寧靜時長音鋪底，戰鬥時改成切分重音
      if (m.chords && b === 0 && inten >= (m.padMin || 0) && !(m.stabMin != null && inten >= m.stabMin)) {
        m.chords[barI].forEach((n, k) => T(nf(n), { type:'triangle', dur:stepDur * 16, vol:0.045, a:0.25, rel:0.3, detune:(k - 1) * 5, lp:1800, bus:MB(), at, rev:0.4, pan:(k - 1) * 0.3 }));
      }
      if (m.chords && m.stabMin != null && inten >= m.stabMin && m.stabSteps && m.stabSteps.indexOf(b) >= 0) {
        m.chords[barI].forEach((n, k) => T(nf(n) * (k === 0 ? 2 : 1), { type:'square', dur:stepDur * 1.6, vol:0.04, a:0.004, lp:2200, detune:(k - 1) * 4, bus:MB(), at, rev:0.25, pan:(k - 1) * 0.25 }));
      }
      // 主旋律
      if (m.mel && m.mel[i] && inten >= (m.melMin || 0)) {
        let len = 1; while (i + len < 64 && !m.mel[i + len] && len < 4) len++;
        T(nf(m.mel[i]), { type:m.melType || 'triangle', dur:stepDur * len * 0.95, vol:m.melVol || 0.08, a:0.01, lp:m.melLp, vib:m.melVib, bus:MB(), at, rev:0.45, pan:0.1 });
        if (mus.theme === 'menu' || mus.theme === 'ninja') T(nf(m.mel[i]) * 2, { type:'sine', dur:stepDur * len * 0.9, vol:(m.melVol || 0.08) * 0.25, a:0.02, bus:MB(), at, rev:0.6 });
      }
      // 琶音（高強度才進）
      if (m.arp && m.arp[i] && inten >= (m.arpMin || 0)) T(nf(m.arp[i]), { type:'triangle', dur:stepDur * 0.9, vol:m.arpVol || 0.035, a:0.004, bus:MB(), at, rev:0.5, pan:-0.35 + (b % 4) * 0.25 });
      mus.step++;
      mus.next += stepDur;
    }
  }
  function startMusic(theme) {
    if (!ctx) return;
    const name = MUS[theme] ? theme : 'market';
    if (mus.timer && mus.theme === name) { fadeMusicTo(MUS[name].vol); return; }
    stopMusic(true);
    mus.theme = name;
    if (!musicOn) return;
    mus.step = 0; mus.next = ctx.currentTime + 0.05;
    mus.intensity = mus.want;
    fadeMusicTo(MUS[name].vol);
    tick();
    mus.timer = setInterval(tick, 40);
  }
  function fadeMusicTo(v, tc = 0.4) {
    if (!ctx || !musicBus) return;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(v, ctx.currentTime, tc);
  }
  function stopMusic(keepTheme) {
    if (mus.timer) { clearInterval(mus.timer); mus.timer = null; }
    if (!keepTheme) mus.theme = null;
    if (ctx && musicBus) fadeMusicTo(0.0, 0.25);
  }
  // 強度 0 / 1 / 2：下個小節開頭生效
  function setIntensity(n) { mus.want = Math.max(0, Math.min(2, n | 0)); }
  // 暫停：音樂悶掉（低通 + 變小）而不是停掉，恢復時立刻回來
  function setMuffled(on) {
    if (!ctx || !musicLP) return;
    const t = ctx.currentTime;
    musicLP.frequency.cancelScheduledValues(t);
    musicLP.frequency.setTargetAtTime(on ? 420 : 20000, t, on ? 0.15 : 0.25);
    if (mus.theme && MUS[mus.theme]) fadeMusicTo(on ? MUS[mus.theme].vol * 0.45 : MUS[mus.theme].vol, 0.2);
  }
  function duck(amount = 0.4, dur = 0.6) {   // 大事件（擊殺／暴怒）瞬間把音樂壓低再回來
    if (!ctx || !mus.theme || !MUS[mus.theme]) return;
    const v = MUS[mus.theme].vol, t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(v * (1 - amount), t + 0.05);
    musicBus.gain.setTargetAtTime(v, t + dur * 0.4, dur * 0.4);
  }
  function toggleSfx(v) { sfxOn = (v === undefined) ? !sfxOn : v; return sfxOn; }
  function toggleMusic(v) {
    musicOn = (v === undefined) ? !musicOn : v;
    if (musicOn) { const th = mus.theme || 'menu'; mus.theme = null; startMusic(th); }
    else stopMusic(true);
    return musicOn;
  }
  function currentTheme() { return mus.theme; }

  return { init, resume, swing, shot, hit, die, hurt, heartbeat, dash, shield, buff, freeze, heal, poof, glass,
    vanish, slam, vroom, lockon, slick, splash, sizzle, sticky, smoke, whoosh, wrap, spice, barrage, beam,
    blockHit, ui, uiBack, hover, ready, pickup, countTick, fight, matchStart, streak, bossRoar, bossTele, bossDie,
    win, lose, levelUp, ability, enemySpecial,
    startMusic, stopMusic, setIntensity, setMuffled, duck, currentTheme,
    toggleSfx, toggleMusic, isSfxOn: () => sfxOn, isMusicOn: () => musicOn, nf };
})();
