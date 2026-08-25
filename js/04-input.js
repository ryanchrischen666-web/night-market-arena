'use strict';

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

