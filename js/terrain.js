// Terrain: tile definitions (solid/encounter flags) and how the overworld ground and scenery are drawn.
(function () {
const G = globalThis.G;
const { mulberry, cv } = G;

// ---- Tiles ----------------------------------------------------------------
// solid: blocks movement. enc: wild encounters. warp is handled by map data.
const T = G.TILES = {
  g: { }, G: { enc: true }, p: { }, f: { }, '#': { solid: true }, w: { solid: true }, F: { solid: true }, r: { solid: true },
  s: { solid: true }, R: { solid: true }, Q: { solid: true }, W: { solid: true }, N: { solid: true }, D: { },
  M: { }, c: { }, e: { enc: true }, C: { solid: true },
  T: { }, B: { solid: true }, m: { }, k: { solid: true }, S: { solid: true }, h: { solid: true }, P: { solid: true },
  t: { solid: true }, b: { solid: true }, a: { }, x: { solid: true },
  y: { }, q: { enc: true }, z: { }, l: { solid: true }, i: { solid: true }, O: { solid: true }, L: { solid: true },
  // natural decor
  u: { solid: true }, n: { solid: true }, V: { }, j: { solid: true }, d: { solid: true }, E: { solid: true },
  // player-built structures (stamped onto maps by js/build.js)
  A: { solid: true }, H: { solid: true }, J: { solid: true }, K: { solid: true },
};
const cache = {};
function paint(ch, fr) {
  const [c, x] = cv(16, 16), R = mulberry(ch.charCodeAt(0) * 31 + 7);
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const grass = (base, dark, light) => { px(0, 0, 16, 16, base); for (let i = 0; i < 7; i++) { px(R() * 15 | 0, R() * 15 | 0, 1, 2, dark); } for (let i = 0; i < 4; i++) px(R() * 15 | 0, R() * 15 | 0, 1, 1, light); };
  const floor = (base, line) => { px(0, 0, 16, 16, base); px(0, 15, 16, 1, line); px(7, 0, 1, 16, line); };
  switch (ch) {
    case 'g': case 'f': grass('#68b848', '#4a9a38', '#88d060');
      if (ch === 'f') { [[3, 4, '#f85888'], [10, 3, '#f8e038'], [6, 10, '#fff'], [12, 11, '#f85888']].forEach(([a, b, col]) => { px(a, b, 2, 2, col); px(a, b + 2, 1, 1, '#3a8a30'); }); } break;
    case 'G': px(0, 0, 16, 16, '#4a9a38'); for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
      const bx = i * 4 + (j ? 2 : 0), by = 2 + j * 7; px(bx, by + 2, 3, 5, '#2f7a2a'); px(bx + 1, by, 1, 4, '#78d060'); px(bx - 0, by + 1, 1, 3, '#58b040'); px(bx + 2, by + 1, 1, 3, '#58b040'); } break;
    case 'p': px(0, 0, 16, 16, '#e0c890'); for (let i = 0; i < 9; i++) px(R() * 15 | 0, R() * 15 | 0, 1, 1, i % 2 ? '#c8a870' : '#f0e0b0'); break;
    case '#': grass('#68b848', '#4a9a38', '#88d060'); px(6, 11, 4, 5, '#6b4a2a');
      x.fillStyle = '#2f7a2a'; x.beginPath(); x.arc(8, 7, 7.5, 0, 7); x.fill(); x.fillStyle = '#4a9a38'; x.beginPath(); x.arc(7, 6, 5.5, 0, 7); x.fill(); x.fillStyle = '#6cc050'; x.beginPath(); x.arc(5.5, 4.5, 2.5, 0, 7); x.fill(); break;
    case 'w': px(0, 0, 16, 16, '#4888e8'); for (let i = 0; i < 5; i++) { const o = (i * 7 + fr * 4) % 16; px(o, i * 3 + 1, 5, 1, '#78b0f8'); px((o + 8) % 16, i * 3 + 2, 3, 1, '#3868c8'); } break;
    case 'F': grass('#68b848', '#4a9a38', '#88d060'); px(0, 5, 16, 2, '#c89858'); px(0, 10, 16, 2, '#c89858'); px(1, 3, 3, 11, '#a87838'); px(12, 3, 3, 11, '#a87838'); px(1, 3, 3, 1, '#d8b070'); px(12, 3, 3, 1, '#d8b070'); break;
    case 'r': grass('#68b848', '#4a9a38', '#88d060'); x.fillStyle = '#58585f'; x.beginPath(); x.ellipse(8, 10, 7, 5.5, 0, 0, 7); x.fill(); x.fillStyle = '#90909a'; x.beginPath(); x.ellipse(6.5, 8, 4, 2.5, 0, 0, 7); x.fill(); break;
    case 's': grass('#68b848', '#4a9a38', '#88d060'); px(7, 8, 2, 8, '#6b4a2a'); px(2, 2, 12, 8, '#c89858'); px(2, 2, 12, 1, '#e8c078'); px(4, 4, 8, 1, '#7a5a30'); px(4, 6, 6, 1, '#7a5a30'); break;
    case 'R': case 'Q': { const col = ch === 'R' ? '#d84848' : '#4868c8'; px(0, 0, 16, 16, col); for (let j = 0; j < 4; j++) px(0, j * 4 + 3, 16, 1, G.shade(col, .75)); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) px(i * 4 + (j % 2) * 2, j * 4, 1, 3, G.shade(col, 1.25)); break; }
    case 'W': px(0, 0, 16, 16, '#f0e8d8'); px(0, 14, 16, 2, '#b8a888'); px(0, 0, 16, 1, '#c8b898'); break;
    case 'N': px(0, 0, 16, 16, '#f0e8d8'); px(0, 14, 16, 2, '#b8a888'); px(3, 3, 10, 9, '#704830'); px(4, 4, 8, 7, '#88c8f0'); px(4, 4, 3, 3, '#c8e8ff'); px(7, 4, 1, 7, '#704830'); px(4, 7, 8, 1, '#704830'); break;
    case 'D': px(0, 0, 16, 16, '#f0e8d8'); px(0, 14, 16, 2, '#b8a888'); px(2, 1, 12, 15, '#704830'); px(3, 2, 10, 14, '#a06838'); px(10, 9, 2, 2, '#f8d048'); px(3, 2, 10, 2, '#c08848'); break;
    case 'M': px(0, 0, 16, 16, '#6a6a72'); x.fillStyle = '#18181c'; x.beginPath(); x.ellipse(8, 16, 7, 12, 0, 0, 7); x.fill(); px(0, 0, 16, 3, '#888894'); break;
    case 'c': px(0, 0, 16, 16, '#9a8a78'); for (let i = 0; i < 8; i++) px(R() * 15 | 0, R() * 15 | 0, 2, 1, i % 2 ? '#847462' : '#b0a090'); break;
    case 'e': px(0, 0, 16, 16, '#8a7a68'); for (let i = 0; i < 6; i++) px(R() * 14 | 0, R() * 14 | 0, 2, 1, '#6e5e4c'); for (let i = 0; i < 3; i++) { const a = R() * 12 | 0, b = R() * 12 | 0; px(a, b, 3, 3, '#b8a890'); px(a + 1, b + 1, 1, 1, '#d0c0a8'); } break;
    case 'C': px(0, 0, 16, 16, '#54545c'); for (let i = 0; i < 5; i++) { const a = R() * 12 | 0, b = R() * 12 | 0; px(a, b, 4, 3, '#6c6c76'); px(a, b + 3, 4, 1, '#3c3c44'); } px(0, 15, 16, 1, '#3c3c44'); break;
    case 'T': floor('#e8c888', '#d0a868'); break;
    case 'B': px(0, 0, 16, 16, '#d8c8a8'); px(0, 12, 16, 4, '#8a6848'); px(0, 12, 16, 1, '#a88868'); px(0, 0, 16, 1, '#b8a888'); break;
    case 'm': px(0, 0, 16, 16, '#e8c888'); px(1, 4, 14, 12, '#c85858'); px(2, 5, 12, 10, '#e87878'); break;
    case 'a': floor('#e8c888', '#d0a868'); px(1, 2, 14, 12, '#5878d0'); px(2, 3, 12, 10, '#7898e8'); break;
    case 'k': px(0, 0, 16, 16, '#e8c888'); px(0, 3, 16, 13, '#b87838'); px(0, 3, 16, 3, '#e0a860'); px(0, 14, 16, 2, '#7a4a20'); break;
    case 'S': px(0, 0, 16, 16, '#d8c8a8'); px(0, 0, 16, 16, '#8a5a30'); for (let j = 0; j < 3; j++) { px(0, j * 5 + 4, 16, 1, '#5a3a18'); for (let i = 0; i < 3; i++) px(i * 5 + 1, j * 5 + 1, 3, 3, ['#d84848', '#4868c8', '#f8d048', '#58b848'][(i + j) % 4]); } break;
    case 'h': floor('#e8c888', '#d0a868'); px(1, 2, 14, 12, '#b8b8c8'); px(2, 3, 12, 6, '#e8f0f8'); for (let i = 0; i < 3; i++) px(3 + i * 4, 10, 3, 3, '#d84848'); break;
    case 'P': floor('#e8c888', '#d0a868'); px(2, 1, 12, 13, '#484860'); px(3, 2, 10, 7, '#58f0a8'); px(3, 10, 10, 2, '#8888a0'); break;
    case 't': floor('#e8c888', '#d0a868'); px(1, 4, 14, 10, '#a06838'); px(1, 4, 14, 3, '#c89050'); px(1, 13, 14, 1, '#6a4020'); break;
    case 'b': floor('#e8c888', '#d0a868'); px(1, 1, 14, 14, '#4868c8'); px(1, 1, 14, 5, '#f0f0f0'); px(2, 2, 12, 3, '#fff'); break;
    case 'x': floor('#e8c888', '#d0a868'); px(2, 2, 12, 12, '#7a5a30'); px(3, 3, 10, 10, '#a07840'); break;
    case 'y': px(0, 0, 16, 16, '#ead9a2'); for (let i = 0; i < 10; i++) px(R() * 15 | 0, R() * 15 | 0, 1, 1, i % 2 ? '#d2bf84' : '#f6ecc8'); break;
    case 'q': px(0, 0, 16, 16, '#2f6a52'); for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
      const bx = i * 4 + (j ? 2 : 0), by = 2 + j * 7; px(bx, by + 3, 3, 4, '#23523f'); px(bx + 1, by - 1, 1, 5, '#6cc29a'); px(bx + 2, by + 1, 1, 3, '#4a9c78'); px(bx, by + 2, 1, 3, '#3f8a68'); } break;
    case 'z': px(0, 0, 16, 16, '#a97f4b'); for (let i = 0; i < 4; i++) { px(0, i * 4 + 3, 16, 1, '#7a5630'); px(0, i * 4, 16, 1, '#c79a60'); } px(3, 0, 1, 16, '#8d6a3c'); px(11, 0, 1, 16, '#8d6a3c'); break;
    case 'l': grass('#68b848', '#4a9a38', '#88d060'); px(7, 6, 2, 10, '#40404c'); px(5, 14, 6, 2, '#40404c'); px(4, 1, 8, 6, '#40404c'); px(5, 2, 6, 4, '#ffe680'); px(6, 3, 4, 2, '#fff8c8'); break;
    case 'i': px(0, 0, 16, 16, '#9a8a78'); for (let i = 0; i < 5; i++) px(R() * 15 | 0, R() * 15 | 0, 2, 1, '#847462');
      x.fillStyle = '#4a78c8'; x.beginPath(); x.moveTo(8, 1); x.lineTo(12, 13); x.lineTo(4, 13); x.fill(); x.fillStyle = '#9ad8ff'; x.beginPath(); x.moveTo(8, 1); x.lineTo(8, 13); x.lineTo(4, 13); x.fill();
      x.fillStyle = '#b080e8'; x.beginPath(); x.moveTo(12, 6); x.lineTo(15, 14); x.lineTo(10, 14); x.fill(); px(2, 14, 12, 1, '#5a4a40'); break;
    case 'O': floor('#e8c888', '#d0a868'); px(3, 6, 10, 9, '#8a8a9a'); px(3, 6, 10, 2, '#b4b4c4'); px(4, 3, 8, 4, '#6a6a7c'); px(5, 4, 6, 2, '#2a2a38'); px(3, 14, 10, 1, '#5a5a6a'); break;
    case 'L': floor('#e8c888', '#d0a868'); px(2, 8, 12, 7, '#6a6a7c'); px(2, 8, 12, 2, '#9a9aac'); px(4, 4, 8, 5, '#4a4a58'); px(5, 5, 6, 3, '#2a1a1a'); px(2, 14, 12, 1, '#44444f'); break;
    case 'u': grass('#68b848', '#4a9a38', '#88d060'); x.fillStyle = '#3f8f3a'; x.beginPath(); x.arc(8, 9, 6.5, 0, 7); x.fill(); x.fillStyle = '#5cb050'; x.beginPath(); x.arc(7, 8, 4.5, 0, 7); x.fill(); break;
    case 'n': grass('#68b848', '#4a9a38', '#88d060'); px(7, 12, 2, 4, '#6b4a2a'); x.fillStyle = '#2a6a48'; x.beginPath(); x.moveTo(8, 0); x.lineTo(14, 13); x.lineTo(2, 13); x.fill(); break;
    case 'V': px(0, 0, 16, 16, '#4888e8'); px(1, 0, 14, 16, '#b08850'); for (let i = 0; i < 4; i++) px(1, i * 4 + 3, 14, 1, '#7a5630'); break;
    case 'j': px(0, 0, 16, 16, '#7a5232'); for (let i = 0; i < 3; i++) { px(1, i * 5 + 2, 14, 2, '#5e3e24'); px(3 + i * 4, i * 5, 2, 3, '#58b848'); } break;
    case 'd': grass('#68b848', '#4a9a38', '#88d060'); px(3, 7, 10, 6, '#8a6038'); x.fillStyle = '#c89a60'; x.beginPath(); x.ellipse(8, 7, 5, 2.5, 0, 0, 7); x.fill(); break;
    case 'E': px(0, 0, 16, 16, '#8a7a5a'); px(0, 0, 16, 4, '#68b848'); px(0, 12, 16, 4, '#6a5a40'); break;
    case 'A': { const col = '#2fa39a'; px(0, 0, 16, 16, col); for (let j = 0; j < 4; j++) px(0, j * 4 + 3, 16, 1, G.shade(col, .75)); break; }
    case 'H': px(0, 0, 16, 16, '#68b848'); for (let i = 0; i < 4; i++) px(i * 4, 2, 4, 9, i % 2 ? '#f8f8f8' : '#e85060'); px(0, 10, 16, 2, '#c83848'); break;
    case 'J': px(0, 0, 16, 16, '#68b848'); px(1, 2, 14, 12, '#f0e8e0'); px(6, 4, 4, 8, '#e85060'); px(4, 6, 8, 4, '#e85060'); break;
    case 'K': grass('#68b848', '#4a9a38', '#88d060'); px(0, 0, 16, 16, '#e8d090'); px(0, 0, 16, 2, '#a87838'); px(0, 14, 16, 2, '#a87838'); px(0, 0, 2, 16, '#a87838'); px(14, 0, 2, 16, '#a87838'); break;
    default: px(0, 0, 16, 16, '#000');
  }
  return c;
}
G.tile = function (ch, frame) {
  const f = ch === 'w' ? frame : 0, k = ch + f;
  return cache[k] || (cache[k] = paint(ch, f));
};


// ---- Overworld drawing API used by world.js ----------------------------------
// drawGround: flat ground for tiles x0..x1, y0..y1 (cx, cy = camera offset in logical px, t = frame counter).
// collectProps: pushes { y, draw(ctx) } for tall scenery so world.js can depth-sort it with characters (y = base line in px).
// drawOverlay: ambient effects drawn above everything in the world (particles, light).
// grassOver: tall-grass blades drawn over the lower half of something standing in grass at logical px (x, y).
G.terrain = {
  drawGround(ctx, m, x0, y0, x1, y1, cx, cy, t) {
    const fr = (t >> 5) & 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.drawImage(G.tile(m.t[y][x], fr), x * 16 - cx, y * 16 - cy, 16, 16);
  },
  collectProps(m, x0, y0, x1, y1, cx, cy, t, out) { },
  drawOverlay(ctx, m, x0, y0, x1, y1, cx, cy, t) { },
  // kind: 'orb' {color} | 'pedestal' {on} | 'brazier' {lit, level 0..3} | 'ball'; (x, y) = tile top-left in logical px
  drawObject(ctx, kind, x, y, t, info) {
    if (kind === 'orb') { ctx.fillStyle = info.color; ctx.beginPath(); ctx.arc(x + 8, y + 7, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y + 7, 8, 1); ctx.beginPath(); ctx.arc(x + 8, y + 7, 1.8, 0, 7); ctx.fill(); }
    if (kind === 'pedestal') { const on = info.on; ctx.fillStyle = on ? '#ffb040' : '#4a4a5a'; ctx.beginPath(); ctx.moveTo(x + 8, y + 1); ctx.lineTo(x + 12, y + 5); ctx.lineTo(x + 8, y + 9); ctx.lineTo(x + 4, y + 5); ctx.fill(); if (on) { ctx.fillStyle = 'rgba(255,220,120,.35)'; ctx.beginPath(); ctx.arc(x + 8, y + 5, 8 + Math.sin(t / 14), 0, 7); ctx.fill(); } }
    if (kind === 'brazier') { const lit = info.lit, fl = lit ? 7 : 1 + info.level * 1.5; ctx.fillStyle = lit ? 'rgba(255,200,90,.3)' : 'rgba(255,140,60,.15)'; ctx.beginPath(); ctx.arc(x + 8, y + 3, fl * 2.2, 0, 7); ctx.fill(); ctx.fillStyle = lit ? '#ffd860' : '#f06a30'; ctx.beginPath(); ctx.ellipse(x + 8, y + 5 - fl / 2 + Math.sin(t / 6), 2 + fl / 3, fl, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff4b0'; ctx.beginPath(); ctx.ellipse(x + 8, y + 6 - fl / 3, 1 + fl / 6, fl / 2, 0, 0, 7); ctx.fill(); }
    if (kind === 'ball') { ctx.fillStyle = '#383840'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#f04848'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 3.6, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 3.6, 0, Math.PI); ctx.fill(); }
  },
  grassOver(ctx, ch, x, y, t) { ctx.drawImage(G.tile(ch), 0, 8, 16, 8, x, y + 8, 16, 8); },
};
})();
