
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
    color: '#9b6b4d', hp: 140, speed: 3.0, atkDmg: 18, atkRange: 235, atkCd: 0.45,
    abilities: [
      { key: 'Q', name: 'Sugar Boost', cd: 9, cast: castSugarBoost, icon: '糖' },
      { key: 'E', name: 'Ice Toss', cd: 7, cast: castIceToss, icon: '冰' },
      { key: 'R', name: 'Pearl Storm', cd: 12, cast: castPearlBarrage, icon: '珍' },
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
      { key: 'Q', name: 'Crystal Shards', cd: 4.5, cast: castCrystalShards, icon: '碎' },
      { key: 'E', name: 'Red Flash', cd: 12, cast: castRedFlash, icon: '隱' },
      { key: 'R', name: 'Sugar Strike', cd: 14, cast: castSugarStrike, icon: '裹' },
    ],
    aiSpecial: 'vanishStrike', aiSpecialCd: 9,
  },
  oyster: {
    name: 'Oyster Omelet', cn: '蚵仔煎', role: 'Bruiser', emoji: '🍳',
    color: '#f4a261', hp: 170, speed: 2.8, atkDmg: 16, atkRange: 200, atkCd: 0.5,
    abilities: [
      { key: 'Q', name: 'Egg Heal', cd: 7, cast: castEggHeal, icon: '蛋' },
      { key: 'E', name: 'Tracker', cd: 5, cast: castOysterTracker, icon: '蚵' },
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
  chicken: {
    name: 'Golden Chicken Cutlet', cn: '金黃雞排', role: 'Area', emoji: '🍗',
    color: '#f0b429', hp: 150, speed: 2.7, atkDmg: 12, atkRange: 240, atkCd: 0.6,
    premium: true, priceNTD: 33,
    abilities: [
      { key: 'Q', name: 'Pepper Wave', cd: 6, cast: castPepperWave, icon: '椒' },
      { key: 'E', name: 'Crispy Coat', cd: 10, cast: castCrispyCoat, icon: '酥' },
      { key: 'R', name: 'Cutlet Feast', cd: 13, cast: castCutletFeast, icon: '排' },
    ],
    aiSpecial: 'cone', aiSpecialCd: 6,
  },
};

const HERO_ORDER = ['scallion','squid','tofu','bubble','sausage','hawthorn','oyster','ribs','chicken'];
const HERO_LORE = {
  chicken:  { tCn:'排隊三小時的傳說', tEn:'The Golden Legend', rCn:'範圍', aCn:['椒鹽衝擊波','金黃酥皮','雞排放題'] },
  scallion: { tCn:'鐵板上的老大哥', tEn:'The Layered Guardian', rCn:'坦克', aCn:['五香','油爆','麵皮裹'] },
  squid:    { tCn:'海風來的長手',     tEn:'The Tide-Reach',      rCn:'遠程', aCn:['觸手鞭','纏絲','潑墨'] },
  tofu:     { tCn:'越臭越驕傲',         tEn:'The Glorious Reek',   rCn:'控場', aCn:['酥脈衝','脆殼盾','臭氣彈'] },
  bubble:   { tCn:'台中來的甜風暴', tEn:'The Pearl Storm',     rCn:'輸出', aCn:['糖衝','冰擲','珍珠風暴'] },
  sausage:  { tCn:'衝鋒的糯米硬漢', tEn:'The Charging Wrap',   rCn:'衝鋒', aCn:['炭火','糯米陷阱','機車衝'] },
  hawthorn: { tCn:'糖衣裡的利刃',     tEn:'The Sugar Blade',     rCn:'刺客', aCn:['糖晶碎','紅閃','糖葡蘆擊'] },
  oyster:   { tCn:'海口的暖心硬漢', tEn:'The Tide-Forged',     rCn:'鬥士', aCn:['蛋補','追蹤','滑溜區'] },
  ribs:     { tCn:'漢方的老師傅',     tEn:'The Herbal Mender',   rCn:'輔助', aCn:['藥煙','飛骨','補湯鍋'] },
};

