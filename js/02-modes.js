'use strict';

// ============ MODE TUNING ============
const MODES = {
  '1v1': { count: 1, hpMul: 1.5, dmgMul: 1.15 },
  '1v2': { count: 2, hpMul: 1.0, dmgMul: 0.95 },
  '1v3': { count: 3, hpMul: 0.65, dmgMul: 0.75 },
  'boss': { count: 0, hpMul: 1, dmgMul: 1, boss: true },
};

