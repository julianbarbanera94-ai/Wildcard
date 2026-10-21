// All art is generated in code: tiles, characters, creature sprites and UI frames.
(function () {
const G = globalThis.G;
const W = 240, H = 160, S = 3;
G.W = W; G.H = H; G.S = S;

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
G.mulberry = mulberry;
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
G.cv = cv;
function hex(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
G.shade = function (h, f) { // f<1 darkens, f>1 lightens
  const c = hex(h).map(v => f < 1 ? v * f : v + (255 - v) * (f - 1));
  return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
};

// ---- Tiles ----------------------------------------------------------------
// solid: blocks movement. enc: wild encounters. warp is handled by map data.
const T = G.TILES = {
  g: { }, G: { enc: true }, p: { }, f: { }, '#': { solid: true }, w: { solid: true }, F: { solid: true }, r: { solid: true },
  s: { solid: true }, R: { solid: true }, Q: { solid: true }, W: { solid: true }, N: { solid: true }, D: { },
  M: { }, c: { }, e: { enc: true }, C: { solid: true },
  T: { }, B: { solid: true }, m: { }, k: { solid: true }, S: { solid: true }, h: { solid: true }, P: { solid: true },
  t: { solid: true }, b: { solid: true }, a: { }, x: { solid: true },
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
    default: px(0, 0, 16, 16, '#000');
  }
  return c;
}
G.tile = function (ch, frame) {
  const f = ch === 'w' ? frame : 0, k = ch + f;
  return cache[k] || (cache[k] = paint(ch, f));
};

// ---- Characters -----------------------------------------------------------
// Returns canvases indexed [dir][frame]; dir 0=down 1=up 2=left 3=right, frame 0 idle 1/2 stepping.
const charCache = {};
G.charSprite = function (st) {
  const key = JSON.stringify(st);
  if (charCache[key]) return charCache[key];
  const out = [];
  for (let d = 0; d < 4; d++) {
    out[d] = [];
    for (let f = 0; f < 3; f++) {
      const [c, x] = cv(16, 20);
      const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
      const bob = f ? 0 : 0, lf = f === 1 ? -1 : 0, rf = f === 2 ? -1 : 0;
      // shadow
      px(3, 18, 10, 2, 'rgba(0,0,0,.25)');
      // legs
      if (d < 2) { px(5, 15 + lf, 3, 3 - lf, st.pants); px(8, 15 + rf, 3, 3 - rf, st.pants); px(5, 17 + lf, 3, 1, '#303040'); px(8, 17 + rf, 3, 1, '#303040'); }
      else { const sw = f === 0 ? 0 : (f === 1 ? -1 : 1); px(6 + sw, 15, 4, 3, st.pants); px(6 + sw, 17, 4, 1, '#303040'); }
      // body
      px(4, 9 + bob, 8, 7, st.shirt); px(4, 9, 8, 1, G.shade(st.shirt, 1.3));
      // arms
      if (d < 2) { px(3, 10, 1, 5 + (f === 1 ? -1 : 0), st.skin); px(12, 10, 1, 5 + (f === 2 ? -1 : 0), st.skin); }
      else { px(d === 2 ? 5 : 9, 10 + (f ? 1 : 0), 2, 4, st.skin); }
      // head
      px(4, 2, 8, 8, st.skin);
      if (d === 0) { px(4, 2, 8, 3, st.hair); px(4, 4, 1, 2, st.hair); px(11, 4, 1, 2, st.hair); px(6, 7, 1, 2, '#202030'); px(9, 7, 1, 2, '#202030'); }
      else if (d === 1) { px(4, 2, 8, 7, st.hair); }
      else { px(4, 2, 8, 3, st.hair); px(d === 2 ? 8 : 4, 2, 4, 6, st.hair); px(d === 2 ? 5 : 10, 7, 1, 2, '#202030'); }
      if (st.hat) { px(3, 1, 10, 3, st.hat); if (d === 0) px(3, 3, 10, 1, G.shade(st.hat, .8)); if (d === 2) px(2, 3, 4, 1, st.hat); if (d === 3) px(10, 3, 4, 1, st.hat); }
      out[d][f] = c;
    }
  }
  return charCache[key] = out;
};

// ---- Creature sprites -----------------------------------------------------
const spriteCache = {};
function genCreature(spec, back) {
  const N = 32, R = mulberry(spec.id * 7919 + 13), L = spec.look;
  const g = Array.from({ length: N }, () => new Uint8Array(N));
  const ell = (cx, cy, rx, ry, v) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) g[y][x] = v; } };
  const mell = (dx, cy, rx, ry, v) => { ell(16 + dx, cy, rx, ry, v); ell(16 - dx, cy, rx, ry, v); };
  const stage = L.stage || 1;
  let rx = 6 + stage * 1.7, ry = rx * .9;
  if (L.form === 'tall') { rx *= .85; ry = rx * 1.35; } else if (L.form === 'wide') { rx *= 1.2; ry = rx * .72; }
  ry = Math.min(ry, 9.2); rx = Math.min(rx, 13.5);
  const cy = 28 - ry - 1.5 - (L.feat.includes('legs') ? 2 : 0), top = cy - ry, feat = f => L.feat.includes(f);
  if (feat('tail')) for (let i = 0; i < 6; i++) ell(16 + rx - 1 + i * 1.6, cy + 2 - i * 1.9 + (i > 3 ? 1.5 : 0), 2.4 - i * .18, 2.4 - i * .18, 2);
  if (feat('bolt')) for (let i = 0; i < 6; i++) ell(16 + rx + (i % 2 ? 4 : 1), cy + 3 - i * 2.4, 1.8, 1.8, 2);
  if (feat('wings')) mell(rx + 1.5, cy - 1, 3.5 + stage, 5 + stage, 2);
  if (feat('legs')) mell(rx * .5, 27, 2.6, 2.4, 1);
  if (feat('arms')) mell(rx - .5, cy + 1, 2, 3.2, 1);
  ell(16, cy, rx, ry, 1);
  if (feat('ears')) { mell(rx * .6, top + 1, 2.4, 4.2, 1); mell(rx * .6, top + 2, 1.1, 2.4, 4); }
  if (feat('horns')) mell(rx * .45, top - .5, 1.4, 4, 2);
  if (feat('antenna')) { mell(3, top - 1, .9, 4.2, 2); mell(3.5, top - 4.5, 1.6, 1.6, 2); }
  if (feat('fin')) { ell(16, top - 1, 1.8, 5, 2); ell(16, top + 2, 1.3, 4, 2); }
  if (feat('spikes')) for (let i = -2; i <= 2; i++) ell(16 + i * rx * .38, top + Math.abs(i) * 1.4 + 1, 1.5, 2.6, 2);
  if (feat('leaf')) { mell(3.4, top - 1.5, 2, 4.5, 5); }
  if (feat('flame')) { ell(16, top - 2, 3, 4.4, 6); ell(16, top - 1, 1.6, 2.8, 7); }
  if (!back) ell(16, cy + ry * .35, rx * .55, ry * .55, 3);
  const [c, x] = cv(N, N);
  const types = spec.types, main = G.TYPE_COL[types[0]], acc = types[1] ? G.TYPE_COL[types[1]] : G.shade(main, .72);
  const pal = { 1: main, 2: acc, 3: G.shade(main, 1.55), 4: G.shade(main, .6), 5: '#58c840', 6: '#f87028', 7: '#f8e038' };
  if (L.feat.includes('flame')) { pal[6] = '#f87028'; pal[7] = '#f8e038'; }
  const line = G.shade(main, .3), at = (X, Y) => (X < 0 || Y < 0 || X >= N || Y >= N) ? 0 : g[Y][X];
  for (let y = 0; y < N; y++) for (let X = 0; X < N; X++) {
    const v = g[y][X];
    if (!v) { if (at(X - 1, y) || at(X + 1, y) || at(X, y - 1) || at(X, y + 1)) { x.fillStyle = line; x.fillRect(X, y, 1, 1); } continue; }
    let col = pal[v];
    if (v === 1 || v === 2 || v === 3) {
      if (!at(X - 1, y) || !at(X, y - 1)) col = G.shade(col, 1.25); else if (!at(X + 1, y) || !at(X, y + 1) || !at(X + 1, y + 1)) col = G.shade(col, .78);
    }
    x.fillStyle = col; x.fillRect(X, y, 1, 1);
  }
  if (!back) { // face
    const ey = Math.round(cy - ry * .2), ex = Math.max(2, Math.round(rx * .38));
    [16 - ex, 16 + ex - 1].forEach(e => { x.fillStyle = '#fff'; x.fillRect(e, ey, 2, 3); x.fillStyle = '#181820'; x.fillRect(e + (e < 16 ? 1 : 0), ey + 1, 1, 2); });
    x.fillStyle = line; x.fillRect(15, ey + 5, 2, 1);
    if (feat('fangs')) { x.fillStyle = '#fff'; x.fillRect(14, ey + 5, 1, 2); x.fillRect(17, ey + 5, 1, 2); }
  }
  return c;
}
G.creatureSprite = function (id, back) {
  const k = id + (back ? 'b' : 'f');
  return spriteCache[k] || (spriteCache[k] = genCreature(G.SPECIES[id], back));
};
const tints = new WeakMap();
G.tint = function (img, color) { // solid-colour silhouette of a sprite (cached per sprite and colour)
  let m = tints.get(img); if (!m) tints.set(img, m = {});
  if (m[color]) return m[color];
  const [c, x] = cv(img.width, img.height); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return m[color] = c;
};

// ---- Text & frames --------------------------------------------------------
G.FONT = 'bold 8px "Courier New", "DejaVu Sans Mono", monospace';
G.text = function (ctx, s, x, y, o) {
  o = o || {};
  ctx.font = o.font || G.FONT; ctx.textBaseline = 'top'; ctx.textAlign = o.align || 'left';
  if (o.shadow !== false) { ctx.fillStyle = o.shadow || '#a8a8b8'; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = o.color || '#383840'; ctx.fillText(s, x, y);
};
G.textW = (ctx, s) => { ctx.font = G.FONT; return ctx.measureText(s).width; };
G.frame = function (ctx, x, y, w, h, kind) {
  if (kind === 'dark') { ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#304860'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); ctx.fillStyle = '#e8d8a0'; ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillStyle = '#183040'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); ctx.fillStyle = '#285068'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8); return; }
  ctx.fillStyle = '#586878'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = '#d04848'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
};
G.hpColor = r => r > .5 ? '#48d048' : r > .2 ? '#f8c830' : '#f05838';
G.hpBar = function (ctx, x, y, w, ratio) {
  ctx.fillStyle = '#383840'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = G.hpColor(ratio); ctx.fillRect(x, y, Math.ceil(w * Math.max(0, ratio)), 3);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, Math.ceil(w * Math.max(0, ratio)), 1);
};
G.typeBadge = function (ctx, t, x, y) {
  ctx.fillStyle = G.shade(G.TYPE_COL[t], .7); ctx.fillRect(x, y, 34, 9);
  ctx.fillStyle = G.TYPE_COL[t]; ctx.fillRect(x + 1, y + 1, 32, 7);
  G.text(ctx, t.toUpperCase().slice(0, 6), x + 17, y + 1, { align: 'center', color: '#fff', shadow: G.shade(G.TYPE_COL[t], .55), font: 'bold 6px "Courier New", monospace' });
};
// Draws a small party icon for a creature.
G.icon = function (ctx, id, x, y, size) { ctx.imageSmoothingEnabled = true; ctx.drawImage(G.creatureSprite(id), 2, 2, 28, 28, x, y, size, size); ctx.imageSmoothingEnabled = false; };
})();
