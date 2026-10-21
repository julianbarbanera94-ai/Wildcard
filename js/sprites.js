// Sprites: player/NPC characters and creature art, plus the overworld drawing helpers for them.
(function () {
const G = globalThis.G;
const { mulberry, cv } = G;

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


// ---- Overworld drawing API used by world.js ----------------------------------
// drawChar: a person whose tile's top-left is (x, y) in logical px; frame 0 idle, 1/2 stepping; dir 0 down 1 up 2 left 3 right.
G.drawChar = function (ctx, style, dir, frame, x, y, t) { ctx.drawImage(G.charSprite(style)[dir][frame], Math.round(x), Math.round(y - 4), 16, 20); };
// drawCreatureMini: a small creature (follower / roaming wild) whose tile top-left is (x, y); size is the drawn height in logical px.
G.drawCreatureMini = function (ctx, id, x, y, size, t, moving, hop) {
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 14, size / 3, 2, 0, 0, 7); ctx.fill();
  ctx.drawImage(G.creatureSprite(id), 0, 0, 32, 32, Math.round(x + 8 - size / 2), Math.round(y + 17 - size * 31 / 32 - (hop || 0)), size, size);
};
})();
