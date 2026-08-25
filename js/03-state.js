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
const keys = {};
const mouse = { x: W/2, y: H/2, down: false };
let lastTime = 0;
let selectedHero = null;
let selectedMode = null;
let players = [];
let hitStop = 0;
let shakeMag = 0;
let rings = [];
let touchMode = false;
let mobileMove = { active: false, dx: 0, dy: 0 };

