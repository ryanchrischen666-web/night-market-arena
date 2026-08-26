'use strict';

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
// 這場的統計：結束畫面用。dmgFrom 記「誰打了我多少」，連線時廣播出去，
// 對手讀 dmgFrom[自己的 id] 就是他這場打出的真實傷害。
let matchStats = { dmgDealt: 0, dmgTaken: 0, dmgFrom: {} };
function resetMatchStats() { matchStats = { dmgDealt: 0, dmgTaken: 0, dmgFrom: {} }; }
const keys = {};
const mouse = { x: W/2, y: H/2, down: false, tapAtk: false };
let lastTime = 0;
let selectedHero = null;
let selectedMode = null;
let players = [];
let hitStop = 0;
let shakeMag = 0;
let rings = [];
let paused = false;
let touchMode = false;
let mobileMove = { active: false, dx: 0, dy: 0 };
let mobileAim = { active: false, dx: 0, dy: 0, lastDx: 0, lastDy: -1, lastT: 0 };

