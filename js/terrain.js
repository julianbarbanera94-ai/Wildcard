// Terrain: tile flags plus all overworld ground and scenery art (see docs/CONTRACT.md).
// Everything is drawn with vector paths into small offscreen caches at 4 px per logical unit, keyed by tile char,
// neighbour mask and animation frame, so a frame is only drawImage calls. Nothing touches the DOM at load time.
(function () {
const G = globalThis.G;
const K = 4, TAU = Math.PI * 2, PI = Math.PI;

// ---- Tiles ----------------------------------------------------------------
// solid: blocks movement. enc: wild encounters. warp is handled by map data.
const TT = G.TILES = {
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
  // homestead: stone path, fence gate, wild thicket (land not yet owned), tiled kitchen/bathroom floor
  Z: { }, Y: { }, X: { solid: true }, v: { },
  // world expansion (docs/WORLD.md section 5): plaza, road, tower, arena roof, lighthouse, waterfall, lava, castle
  '%': { }, '=': { }, '+': { solid: true }, U: { solid: true }, '|': { solid: true }, '@': { solid: true }, '!': { solid: true }, '^': { solid: true },
};
TT.G.tall = TT.q.tall = true;

// ---- Small helpers -----------------------------------------------------------
const store = new Map();
// make(key, w, h, paint): a cached canvas of w x h logical units at K px per unit. paint(ctx) draws in logical units.
function make(key, w, h, paint) {
  let cvs = store.get(key); if (cvs) return cvs;
  const r = G.cv(Math.max(1, Math.ceil(w * K)), Math.max(1, Math.ceil(h * K))); cvs = r[0]; const c = r[1];
  c.imageSmoothingEnabled = true; c.setTransform(K, 0, 0, K, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round';
  paint(c); store.set(key, cvs); return cvs;
}
function hash(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, -2048144777);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
const rng = s => G.mulberry(s * 7919 + 17);
const shade = (c, f) => G.shade(c, f);
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function lg(c, x0, y0, x1, y1, ...cols) { const g = c.createLinearGradient(x0, y0, x1, y1); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
function rgr(c, x, y, r, ...cols) { const g = c.createRadialGradient(x, y, 0, x, y, r); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
function rr(c, x, y, w, h, r) {   // rounded-rect path; r = number or [tl, tr, br, bl]
  const [a, b, d, e] = typeof r === 'number' ? [r, r, r, r] : r;
  c.beginPath(); c.moveTo(x + a, y); c.lineTo(x + w - b, y); c.arcTo(x + w, y, x + w, y + b, b); c.lineTo(x + w, y + h - d); c.arcTo(x + w, y + h, x + w - d, y + h, d);
  c.lineTo(x + e, y + h); c.arcTo(x, y + h, x, y + h - e, e); c.lineTo(x, y + a); c.arcTo(x, y, x + a, y, a); c.closePath();
}
function rf(c, x, y, w, h, r, col) { rr(c, x, y, w, h, r); c.fillStyle = col; c.fill(); }
function el(c, x, y, rx, ry, col) { c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU); c.fillStyle = col; c.fill(); }
function blobPath(c, cs, dx, dy, dr) { c.beginPath(); for (const q of cs) { c.moveTo(q[0] + dx + q[2] + dr, q[1] + dy); c.arc(q[0] + dx, q[1] + dy, q[2] + dr, 0, TAU); } }
function softShadow(c, x, y, rx, ry, a) {
  c.save(); c.translate(x, y); c.scale(rx, ry); c.beginPath(); c.arc(0, 0, 1, 0, TAU);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(24,48,40,${a})`); g.addColorStop(.55, `rgba(24,48,40,${a * .75})`); g.addColorStop(1, 'rgba(24,48,40,0)');
  c.fillStyle = g; c.fill(); c.restore();
}
// Toon-shaded blob (trees, bushes): dark rim, base, darker lower-right, light upper-left, small highlights.
function toonBlob(c, cs, pal) {
  blobPath(c, cs, .4, 1, .7); c.fillStyle = pal[0]; c.fill();
  blobPath(c, cs, 0, 0, 0); c.fillStyle = pal[1]; c.fill();
  c.save(); blobPath(c, cs, 0, 0, 0); c.clip();
  blobPath(c, cs, -1.4, -2, -.6); c.fillStyle = pal[2]; c.fill();
  blobPath(c, cs.map(q => [q[0] - q[2] * .28, q[1] - q[2] * .32, q[2] * .5]), 0, 0, 0); c.fillStyle = pal[3]; c.fill();
  c.restore();
}

// Neighbour order: N E S W NE SE SW NW (bit k = 1 << k)
const DX = [0, 1, 0, -1, 1, 1, -1, -1], DY = [-1, 0, 1, 0, -1, 1, 1, -1];
const at = (m, x, y) => (y >= 0 && y < m.t.length && x >= 0 && x < m.t[y].length) ? m.t[y][x] : '';
function mask(m, x, y, f, oob, n) { let b = 0; for (let k = 0; k < (n || 4); k++) { const ch = at(m, x + DX[k], y + DY[k]); if (ch === '' ? oob : f(ch)) b |= 1 << k; } return b; }
const inSet = s => ch => s.indexOf(ch) >= 0;

// Rounded autotile shape for a layer: insets e from edges whose neighbour differs, rounds convex corners (radius rc)
// and fillets concave corners (radius e) so neighbouring tiles join into one smooth blob.
function shapePath(c, ms, e, rc) {
  const n = ms & 1, ea = ms & 2, s = ms & 4, w = ms & 8, ne = ms & 16, se = ms & 32, sw = ms & 64, nw = ms & 128;
  const l = w ? 0 : e, t = n ? 0 : e, r = ea ? 16 : 16 - e, b = s ? 16 : 16 - e;
  rc = Math.max(0, Math.min(rc, (16 - 2 * e) / 2 - .01));
  c.beginPath(); c.moveTo(8, t);
  if (!n && !ea) c.arcTo(r, t, r, b, rc); else if (n && ea && !ne && e > 0) { c.lineTo(16 - e, 0); c.arc(16, 0, e, PI, PI / 2, true); } else c.lineTo(r, t);
  if (!s && !ea) c.arcTo(r, b, l, b, rc); else if (s && ea && !se && e > 0) { c.lineTo(16, 16 - e); c.arc(16, 16, e, 1.5 * PI, PI, true); } else c.lineTo(r, b);
  if (!s && !w) c.arcTo(l, b, l, t, rc); else if (s && w && !sw && e > 0) { c.lineTo(e, 16); c.arc(0, 16, e, 0, -PI / 2, true); } else c.lineTo(l, b);
  if (!n && !w) c.arcTo(l, t, r, t, rc); else if (n && w && !nw && e > 0) { c.lineTo(0, e); c.arc(0, 0, e, PI / 2, 0, true); } else c.lineTo(l, t);
  c.closePath();
}
function fillShape(c, ms, e, rc, col) { shapePath(c, ms, e, rc); c.fillStyle = col; c.fill(); }

// ---- Ground classes ------------------------------------------------------------
// Each ground tile belongs to a layer class; higher classes are drawn on top of lower ones with rounded edges.
const GR = 0, TG = 1, MA = 2, SA = 3, PA = 4, CV = 5, HY = 6, WA = 7, FL = 8, ST = 9, TI = 10, NCLS = 11;
const DIRECT = { g: GR, f: GR, G: TG, q: MA, y: SA, p: PA, c: CV, e: CV, K: HY, w: WA, V: WA, T: FL, a: FL, m: FL, Z: ST, v: TI };
const INTERIOR = inSet('BkShPtbxOL');
const ROOF = inSet('RQA'), WALL = inSet('WND'), BLD = inSet('RQAWND');
const MASS = inSet('CEM');

function resolveCls(m, x, y, ch) {
  if (ch === 'z') { for (let k = 0; k < 4; k++) { const n = at(m, x + DX[k], y + DY[k]); if (n === 'w' || n === 'V') return WA; } }
  if (ch === 'D' || ch === 'M') { const b = DIRECT[at(m, x, y + 1)]; if (b !== undefined && b !== WA) return b; }
  if (INTERIOR(ch) || m.outdoor === false) return FL;
  const cnt = new Array(NCLS).fill(0);
  let any = false;
  for (let k = 0; k < 8; k++) { const c = DIRECT[at(m, x + DX[k], y + DY[k])]; if (c !== undefined && c !== WA && c !== HY && c !== TG && c !== MA) { cnt[c] += k < 4 ? 2 : 1; any = true; } }
  if (!any) return m.bg === 'cave' ? CV : GR;
  let best = 0; for (let i = 1; i < NCLS; i++) if (cnt[i] > cnt[best]) best = i;
  return best;
}
// Per-map cache, rebuilt whenever m.t is replaced or m.rev changes (player building).
function mapState(m) {
  let s = m._ter;
  if (s && s.t === m.t && s.rev === m.rev) return s;
  const h = m.t.length, w = m.t[0].length;
  s = m._ter = { t: m.t, rev: m.rev, w, h, cls: new Int8Array(w * h), g: new Array(w * h), p: new Array(w * h), amb: 0 };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = m.t[y][x], d = DIRECT[ch]; s.cls[y * w + x] = d !== undefined ? d : resolveCls(m, x, y, ch); }
  let grass = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ('gGfq#nuX'.indexOf(m.t[y][x]) >= 0) grass++;
  s.amb = m.bg === 'cave' ? 2 : m.outdoor === false ? 3 : grass / (w * h) > .35 ? 1 : 0;
  return s;
}

// ---- Ground layer art --------------------------------------------------------------
const LAYER = [
  { rings: [[0, '#7fcc4e']] },
  { rings: [[.3, '#4f9c38'], [1.2, '#5aa83e']], rc: 4 },
  { rings: [[.3, '#3a8664'], [1.2, '#4a9874']], rc: 4 },
  { rings: [[.7, '#e2ca8c'], [1.7, '#f6e6b5']], rc: 5 },
  { rings: [[.7, '#cdaa74'], [1.7, '#ecd4a0']], rc: 5 },
  { rings: [[.7, '#8c7663'], [1.7, '#b49c82']], rc: 5 },
  { rings: [[.5, '#c8973c'], [1.3, '#eecd70']], rc: 3 },
  null,
  { rings: [[0, '#efcf98']] },
  { rings: [[.5, '#7d7790'], [1.3, '#a7a1b6']], rc: 5 },   // ST: stone path (flagstones painted in tex)
  { rings: [[0, '#a9cfca']] },                             // TI: tiled floor
];
function tex(c, L, v, x0, y0) {
  const R = rng(v * 13 + L * 101 + 3);
  const pt = () => 2 + R() * 12;
  if (L === GR) {
    for (let i = 0; i < 2; i++) el(c, pt(), pt(), 2 + R() * 2, 1.2 + R(), 'rgba(170,228,110,.35)');
    c.lineWidth = .55;
    for (let i = 0; i < 7; i++) { const a = pt(), b = pt(); c.strokeStyle = i < 4 ? '#68b640' : '#a2df70'; c.beginPath(); c.moveTo(a - .8, b - 1.5); c.lineTo(a, b); c.lineTo(a + .7, b - 1.7); c.stroke(); }
    if (v === 3) { el(c, 11, 5, .7, .7, '#ffffff'); el(c, 11, 5, .3, .3, '#ffe060'); }
  } else if (L === TG || L === MA) {
    for (let i = 0; i < 4; i++) el(c, pt(), pt(), 1.5 + R() * 1.5, .8 + R() * .6, L === TG ? 'rgba(40,110,40,.35)' : 'rgba(40,120,120,.35)');
  } else if (L === SA) {
    for (let i = 0; i < 9; i++) el(c, pt(), pt(), .35, .3, i % 3 ? '#e4cd93' : '#fff8e0');
    if (v === 2) { const a = pt(), b = pt(); el(c, a, b, 1.3, 1, '#ffd8d0'); c.strokeStyle = '#e8a8a0'; c.lineWidth = .3; c.beginPath(); c.moveTo(a, b + 1); c.lineTo(a - .8, b - .5); c.moveTo(a, b + 1); c.lineTo(a + .8, b - .5); c.stroke(); }
  } else if (L === PA) {
    for (let i = 0; i < 4; i++) { const a = pt(), b = pt(), r = .5 + R() * .7; el(c, a, b + .2, r + .2, r * .7 + .1, '#cfb07c'); el(c, a, b, r, r * .7, '#f6e6c2'); }
    for (let i = 0; i < 5; i++) el(c, pt(), pt(), .3, .3, '#d8bc88');
  } else if (L === CV) {
    for (let i = 0; i < 5; i++) { const a = pt(), b = pt(), r = .5 + R() * .8; el(c, a, b + .25, r, r * .6, '#957e69'); el(c, a, b, r * .8, r * .5, '#c6b098'); }
  } else if (L === HY) {
    c.lineWidth = .5;
    for (let i = 0; i < 14; i++) { const a = pt(), b = pt(), an = R() * PI; c.strokeStyle = i % 2 ? '#d9ad4c' : '#fbe9a2'; c.beginPath(); c.moveTo(a - Math.cos(an) * 1.6, b - Math.sin(an) * 1.6); c.lineTo(a + Math.cos(an) * 1.6, b + Math.sin(an) * 1.6); c.stroke(); }
  } else if (L === FL) {   // warm wooden planks
    for (let r = 0; r < 4; r++) {
      c.fillStyle = r % 2 ? '#ebc98f' : '#f0d29e'; c.fillRect(0, r * 4, 16, 4);
      c.fillStyle = 'rgba(255,245,220,.5)'; c.fillRect(0, r * 4, 16, .5);
      c.fillStyle = '#d2a66c'; c.fillRect(0, r * 4 + 3.6, 16, .4);
      const jx = 2 + ((r * 5 + v * 3 + y0 * 7) % 12); c.fillRect(jx, r * 4, .4, 3.6);
      el(c, (jx + 6) % 16, r * 4 + 2, 1.2, .35, 'rgba(190,140,80,.25)');
    }
  } else if (L === ST) {   // rounded flagstones in two staggered rows, mortar showing between
    const tints = ['#e2dde9', '#e9e0d2', '#d7dde6', '#e4e0d8'];
    const rows = [[.7, 6.9, [[.7, 7.1], [8.1, 15.3]]], [8.3, 7.1, [[-3.4, 4.6], [5.4, 10.8], [11.6, 19.6]]]];
    if (v & 1) rows.reverse(), rows[0][0] = .7, rows[1][0] = 8.3;
    let k = 0;
    for (const [ry, rh, cols] of rows) for (const [a, b] of cols) {
      const tint = tints[(k + v) % 4], dy = (R() - .5) * .5; k++;
      rf(c, a, ry + .6 + dy, b - a, rh, 2, '#7f7992');
      rr(c, a, ry + dy, b - a, rh, 2); c.fillStyle = lg(c, a, ry, a + 3, ry + rh, shade(tint, 1.06), tint, shade(tint, .9)); c.fill();
      el(c, a + 2.2, ry + dy + 1.6, 1.4, .6, 'rgba(255,255,255,.6)');
      if (R() < .35) { c.strokeStyle = 'rgba(110,100,130,.35)'; c.lineWidth = .35; c.beginPath(); const sx = a + 1.5 + R() * (b - a - 3); c.moveTo(sx, ry + dy + 1.5); c.lineTo(sx + .8, ry + dy + rh * .55); c.stroke(); }
    }
    if (v === 2) { el(c, 7.8, 7.7, 1.1, .45, '#7fcc4e'); el(c, 8.4, 7.5, .5, .3, '#a6e274'); }
  } else if (L === TI) {   // glossy two-tone ceramic tiles with grout
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const wht = (i + j) % 2 === 0;
      rf(c, i * 8 + .35, j * 8 + .35, 7.3, 7.3, 1.2, wht ? '#fbfdfb' : '#bfe7df');
      c.fillStyle = wht ? 'rgba(200,225,220,.7)' : 'rgba(130,190,180,.6)'; c.fillRect(i * 8 + .8, j * 8 + 6.7, 6.4, .6);
      el(c, i * 8 + 2.4, j * 8 + 1.9, 1.4, .55, 'rgba(255,255,255,.9)'); el(c, i * 8 + 4.4, j * 8 + 1.9, .4, .35, 'rgba(255,255,255,.7)');
    }
  }
}
function paintLayer(c, L, ms, v, fi, y0) {
  if (L === WA) return paintWater(c, ms, v, fi);
  const d = LAYER[L], rings = d.rings, rc = d.rc || 0;
  for (const [e, col] of rings) fillShape(c, ms, e, rc, col);
  c.save(); shapePath(c, ms, rings[rings.length - 1][0], rc); c.clip(); tex(c, L, v, 0, y0); c.restore();
}
function paintWater(c, ms, v, fi) {
  const ph = fi / 8 * TAU, fw = 1 + .55 * Math.sin(ph);
  fillShape(c, ms, .1, 4, '#e8f3c6');
  fillShape(c, ms, 1.2, 5, 'rgba(255,255,255,.95)');
  fillShape(c, ms, 1.2 + fw, 5, '#a3e8e6');
  fillShape(c, ms, 4.2, 6, '#74d5e3');
  fillShape(c, ms, 7.4, 6, '#5cc6e2');
  c.save(); shapePath(c, ms, 3.4, 5); c.clip();
  const R = rng(v * 31 + 9);
  for (let i = 0; i < 3; i++) {
    const u = 3 + R() * 10, w = 3 + R() * 10, p = R() * TAU, a = .5 + .5 * Math.sin(ph + p);
    c.strokeStyle = `rgba(255,255,255,${.18 + .55 * a})`; c.lineWidth = .8;
    c.beginPath(); c.arc(u + Math.sin(ph + p) * .8, w, 1.6 + a * .7, .2 * PI, .8 * PI); c.stroke();
    el(c, u + 2, w + 2, 2.5, 1, `rgba(255,255,255,${.06 * a})`);
  }
  c.restore();
}

// ---- Ground decorations painted on top of the layers -----------------------------
function paintFlowers(c, v, fi) {
  const R = rng(v * 57 + 5), cols = ['#ff7eab', '#ffd84a', '#ffffff', '#ff9e5e', '#c8a2ff'];
  for (let i = 0; i < 5; i++) {
    const px = 2.5 + R() * 11, py = 2.5 + R() * 10, col = cols[(R() * cols.length) | 0], sw = Math.sin(fi / 4 * TAU + i * 1.7) * .45;
    c.strokeStyle = '#4c9a36'; c.lineWidth = .55; c.beginPath(); c.moveTo(px, py + 2.6); c.quadraticCurveTo(px + sw * .3, py + 1.3, px + sw, py); c.stroke();
    el(c, px - .8, py + 2, .8, .35, '#5cae40');
    const hx = px + sw, hy = py;
    el(c, hx + .2, hy + .4, 1.7, 1.2, 'rgba(40,90,30,.22)');
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - PI / 2; el(c, hx + Math.cos(a) * .95, hy + Math.sin(a) * .85, .8, .75, col); }
    el(c, hx, hy, .55, .55, col === '#ffd84a' ? '#ff9a3a' : '#ffd23a');
  }
}
function paintDeck(c, ms, horiz, overWater) {   // boardwalk / bridge planks; ms = 4-bit same mask
  const n = ms & 1, e = ms & 2, s = ms & 4, w = ms & 8, I = 1.2;
  const l = w ? 0 : I, t = n ? 0 : I, r = e ? 16 : 16 - I, b = s ? 16 : 16 - I;
  if (overWater) { c.fillStyle = 'rgba(20,70,90,.25)'; c.fillRect(l + 1, t + 1.2, r - l, b - t); }
  c.fillStyle = '#9a6a3a'; c.fillRect(l, t, r - l, b - t);
  c.fillStyle = lg(c, 0, 0, 16, 16, '#e7b97c', '#d6a467'); c.fillRect(l, t, r - l, b - t - .8);
  c.fillStyle = '#a8763f';
  if (horiz) { for (let i = 0; i < 4; i++) { c.fillRect(i * 4 + 3.6, t, .5, b - t - .8); c.fillStyle = 'rgba(255,240,200,.45)'; c.fillRect(i * 4 + .1, t, .5, b - t - .8); c.fillStyle = '#a8763f'; } }
  else { for (let i = 0; i < 4; i++) { c.fillRect(l, i * 4 + 3.4, r - l, .5); c.fillStyle = 'rgba(255,240,200,.45)'; c.fillRect(l, i * 4 + .1, r - l, .5); c.fillStyle = '#a8763f'; } }
  c.fillStyle = '#8a5a30';   // side beams
  if (!n) c.fillRect(l, t, r - l, 1); if (!s) c.fillRect(l, b - 1.6, r - l, 1.6);
  if (!w) c.fillRect(l, t, 1, b - t); if (!e) c.fillRect(r - 1, t, 1, b - t);
  const post = (px, py) => { el(c, px, py + .5, 1.3, 1, '#6a4424'); el(c, px, py, 1.1, .9, '#b9864e'); };
  if (!n && !w) post(l + .6, t + .8); if (!n && !e) post(r - .6, t + .8); if (!s && !w) post(l + .6, b - 1); if (!s && !e) post(r - .6, b - 1);
}
const MPAL = {
  C: { rim: '#a69cc2', top: '#857aa2', f: ['#73689a', '#5c527f', '#463e62'], strata: 'rgba(30,20,60,.25)', lip: '#9c92ba', hi: 'rgba(220,210,255,.25)' },
  E: { rim: '#a6e274', top: '#7fcc4e', f: ['#e3b47e', '#c99460', '#a5734a'], strata: 'rgba(120,70,30,.22)', lip: '#5fae3f', hi: 'rgba(255,245,215,.4)' },
};
function paintMass(c, ms, ch, v) {
  const P = MPAL[ch], top = ms | 4 | 32 | 64;
  fillShape(c, top, .4, 3, shade(P.rim, .85)); fillShape(c, top, .9, 3, P.rim); fillShape(c, top, 1.8, 3, P.top);
  c.save(); shapePath(c, top, 1.8, 3); c.clip();
  const R = rng(v * 17 + (ch === 'C' ? 1 : 2));
  if (ch === 'C') for (let i = 0; i < 4; i++) { const a = 2 + R() * 12, b = 2 + R() * 12, r = .8 + R() * 1.4; el(c, a, b + .4, r, r * .6, '#71668f'); el(c, a - .2, b, r * .8, r * .5, '#958ab0'); }
  else tex(c, GR, v, 0, 0);
  c.restore();
  if (ms & 4) return;
  const l = (ms & 8) ? 0 : .6, r = (ms & 2) ? 16 : 15.4, fy = 4.5;
  rr(c, l, fy, r - l, 16 - fy - .2, [0, 0, (ms & 2) ? 0 : 3, (ms & 8) ? 0 : 3]);
  c.fillStyle = lg(c, 0, fy, 0, 16, ...P.f); c.fill();
  c.save(); c.clip();
  c.strokeStyle = P.strata; c.lineWidth = .6;
  for (const yy of [8, 11.5, 14]) { c.beginPath(); c.moveTo(0, yy); for (let xx = 0; xx <= 16; xx += 4) c.quadraticCurveTo(xx + 2, yy + (((xx / 4) + v) % 2 ? .6 : -.6), xx + 4, yy); c.stroke(); }
  c.strokeStyle = P.hi; c.lineWidth = .7;
  for (let i = 0; i < 3; i++) { const a = 2 + R() * 12, b = fy + 2 + R() * 6; c.beginPath(); c.moveTo(a, b); c.lineTo(a + .4, b + 2.2); c.stroke(); }
  c.fillStyle = 'rgba(20,10,30,.18)'; c.fillRect(0, 14.6, 16, 1.4);
  c.restore();
  // lip along the top of the face
  if (ch === 'E') { c.fillStyle = P.lip; c.beginPath(); for (let xx = l + 1; xx < r; xx += 2.6) { c.moveTo(xx + 1.5, fy); c.arc(xx, fy, 1.5, 0, PI); } c.fill(); c.fillRect(l, fy - .9, r - l, 1); }
  else { rf(c, l, fy - .8, r - l, 1.6, .8, P.lip); }
}
function paintMouth(c, ms, a, b, pal, v) {
  paintMass(c, ms & ~4, pal, v);
  const cx = 8 + (b - a) * 8, rx = (a + b) ? 11 : 5.6, top = 5.2;
  const arch = () => { c.beginPath(); c.moveTo(cx - rx, 16.5); c.lineTo(cx - rx, top + 5); c.ellipse(cx, top + 5, rx, 5.5, 0, PI, 0); c.lineTo(cx + rx, 16.5); };
  c.save(); c.translate(.6, .6); arch(); c.fillStyle = 'rgba(0,0,0,.25)'; c.fill(); c.restore();
  arch(); c.fillStyle = rgr(c, cx, 16, rx + 4, '#0c0814', '#1c1428', '#3a2f4c'); c.fill();
  arch(); c.strokeStyle = pal === 'C' ? '#b9b0d0' : '#e8c99a'; c.lineWidth = 1.8; c.stroke();
  arch(); c.strokeStyle = pal === 'C' ? '#7d7398' : '#a87a4c'; c.lineWidth = .5; c.stroke();
}
function paintIWall(c, ms, face, v) {
  if (face) {
    c.fillStyle = lg(c, 0, 0, 0, 10, '#fbecd0', '#f3dfbd'); c.fillRect(0, 0, 16, 10);
    c.fillStyle = 'rgba(220,180,130,.25)'; for (let i = 0; i < 4; i++) c.fillRect(i * 4 + 1.5, 0, 1.2, 10);
    c.fillStyle = '#b5835a'; c.fillRect(0, 0, 16, 1.4);
    c.fillStyle = lg(c, 0, 9, 0, 14, '#d39a63', '#b87c48'); c.fillRect(0, 9.5, 16, 4.5);
    c.fillStyle = '#e7b37c'; c.fillRect(0, 9, 16, 1);
    c.fillStyle = 'rgba(100,60,30,.25)'; for (let i = 0; i < 2; i++) c.fillRect(i * 8 + 7.6, 10, .5, 4);
    c.fillStyle = '#8a5a36'; c.fillRect(0, 14, 16, 2);
    if (v === 0 && (ms & 10) === 10) { rf(c, 4, 2.5, 8, 5.5, 1, '#9a6a40'); c.fillStyle = lg(c, 0, 3, 0, 7.5, '#bfe6ff', '#9fdc8c'); c.fillRect(5, 3.4, 6, 3.8); el(c, 7, 6.4, 2.4, 1, '#6fbf5a'); el(c, 9.6, 4.6, .9, .9, '#fff3a0'); }
    if (v === 2 && (ms & 10) === 10) { rf(c, 5.5, 2.8, 5, 5, 2.5, '#c89a62'); el(c, 8, 5.3, 2, 2, '#f7f0e0'); c.strokeStyle = '#6a4a30'; c.lineWidth = .4; c.beginPath(); c.moveTo(8, 5.3); c.lineTo(8, 4); c.moveTo(8, 5.3); c.lineTo(9, 5.6); c.stroke(); }
  } else {
    c.fillStyle = '#6e4c3a'; c.fillRect(0, 0, 16, 16);
    c.fillStyle = '#80594a'; c.fillRect(1.5, 1.5, 13, 13);
    c.fillStyle = '#a77c5f';
    if (!(ms & 1)) c.fillRect(0, 0, 16, 1.2); if (!(ms & 4)) c.fillRect(0, 14.8, 16, 1.2);
    if (!(ms & 8)) c.fillRect(0, 0, 1.2, 16); if (!(ms & 2)) c.fillRect(14.8, 0, 1.2, 16);
  }
}
function paintSoil(c, ms) {
  fillShape(c, ms, .6, 3, '#7a4c2c'); fillShape(c, ms, 1.3, 3, '#a26c44');
  c.save(); shapePath(c, ms, 1.3, 3); c.clip();
  for (const yy of [4, 9, 14]) { c.fillStyle = '#87552f'; c.fillRect(0, yy, 16, 1.2); c.fillStyle = 'rgba(255,220,170,.25)'; c.fillRect(0, yy - .8, 16, .6); }
  c.restore();
}
function paintRug(c, ms) {
  fillShape(c, ms, .8, 2, '#3c6bb2'); fillShape(c, ms, 1.5, 2, '#5f95dc'); fillShape(c, ms, 2.8, 1.5, '#f3e6c2'); fillShape(c, ms, 3.4, 1.5, '#5f95dc');
  c.save(); shapePath(c, ms, 3.4, 1.5); c.clip();
  c.fillStyle = '#86b4ee'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { c.beginPath(); const px = 4 + i * 8, py = 4 + j * 8; c.moveTo(px, py - 1.6); c.lineTo(px + 1.6, py); c.lineTo(px, py + 1.6); c.lineTo(px - 1.6, py); c.fill(); }
  c.restore();
}
function paintMat(c) {
  rf(c, 1.6, 3.6, 12.8, 10.4, 2, '#a8443a'); rf(c, 2.2, 3, 11.6, 10.2, 2, '#e0644c');
  c.fillStyle = '#f5a070'; c.fillRect(2.2, 6, 11.6, 1); c.fillRect(2.2, 9.5, 11.6, 1);
  c.strokeStyle = '#f7d29a'; c.lineWidth = .4; c.beginPath(); for (let i = 3; i < 14; i += 1.4) { c.moveTo(i, 13.2); c.lineTo(i, 14.4); } c.stroke();
}
// Soft ellipse shadows baked under props, in tile-local units: [cx, cy, rx, ry, alpha]
const PSH = {
  '#': [9.6, 13.8, 8.6, 3.7, .32], n: [9.2, 14.2, 6.8, 2.8, .32], u: [9, 14, 7.6, 2.7, .28], r: [8.8, 14, 7.2, 2.7, .3], d: [8.6, 13.8, 6.4, 2.4, .26],
  i: [8.5, 13.8, 6.4, 2.3, .24], l: [8.8, 14.8, 3.8, 1.4, .26], s: [8.6, 15, 4.6, 1.4, .22], x: [8.8, 15, 7.4, 1.9, .22], O: [8.6, 15.1, 6, 1.7, .24],
  L: [8.6, 15.1, 6.4, 1.7, .24], k: [8.8, 15.2, 8, 1.6, .2], S: [8.6, 15.4, 7.8, 1.4, .2], h: [8.8, 15.2, 7.6, 1.6, .2], P: [8.8, 15.2, 7.6, 1.6, .2],
  t: [8.8, 14.8, 7.6, 2.2, .18], b: [8.8, 15.2, 7.6, 1.6, .18], j: [8.6, 15, 7.6, 1.4, .14],
  X: [8.8, 13.8, 8.6, 3.4, .34], Y: [8.4, 12.4, 6.4, 1.3, .14],
};
const CASTN = inSet('CEBWND'), CASTW = inSet('CEWNDRQAHJ');

// ---- Ground: per-tile info (layers + decoration), cached per map ---------------------
const NC = [0, 0, 0, 0, 0, 0, 0, 0];
function groundInfo(s, m, x, y) {
  const i = y * s.w + x, ch = m.t[y][x], C = s.cls[i];
  let B = C;
  for (let k = 0; k < 8; k++) { const nx = x + DX[k], ny = y + DY[k]; const c = (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h) ? C : s.cls[ny * s.w + nx]; NC[k] = c; if (c < B) B = c; }
  const layers = []; let key = '';
  for (let L = B; L <= C; L++) {
    if (L !== B && L !== C && NC.indexOf(L) < 0) continue;
    let ms = 255; if (L !== B) { ms = 0; for (let k = 0; k < 8; k++) if (NC[k] >= L) ms |= 1 << k; }
    layers.push(L, ms); key += L + '.' + ms + ',';
  }
  const v = (hash(x, y, 1) * 4) | 0;
  let deco = '', n = C === WA ? 8 : 1, dm = 0, a = 0, b = 0;
  switch (ch) {
    case 'f': deco = 'f'; n = 4; break;
    case 'V': { const w = c => c === 'w'; dm = (!w(at(m, x, y - 1)) && at(m, x, y - 1) !== '' || !w(at(m, x, y + 1)) && at(m, x, y + 1) !== '') ? 0 : 1;
      if (dm === 0 && (!w(at(m, x - 1, y)) && at(m, x - 1, y) !== '' && at(m, x - 1, y) !== 'V')) dm = 1;
      deco = 'V' + dm; break; }
    case 'z': { dm = mask(m, x, y, inSet('zV'), true); const hz = (dm & 10) ? 1 : (dm & 5) ? 0 : 1; a = hz; deco = 'z' + dm + hz; break; }
    case 'C': case 'E': dm = mask(m, x, y, ch === 'C' ? inSet('CM') : inSet('EM'), true, 8); deco = ch + dm; break;
    case 'M': { const pal = (at(m, x - 1, y) === 'E' || at(m, x + 1, y) === 'E' || at(m, x, y - 1) === 'E') ? 'E' : 'C';
      dm = mask(m, x, y, inSet(pal + 'M'), true, 8); a = at(m, x - 1, y) === 'M' ? 1 : 0; b = at(m, x + 1, y) === 'M' ? 1 : 0; deco = 'M' + pal + dm + a + b; break; }
    case 'B': dm = mask(m, x, y, inSet('B'), true); a = (dm & 4) ? 0 : 1; deco = 'B' + dm + a; break;
    case 'j': dm = mask(m, x, y, inSet('j'), false, 8); deco = 'j' + dm; break;
    case 'a': dm = mask(m, x, y, inSet('a'), false, 8); deco = 'a' + dm; break;
    case 'm': deco = 'm'; break;
  }
  const nch = at(m, x, y - 1), wch = at(m, x - 1, y);
  const own = BLD(ch) || MASS(ch) || ch === 'B';
  const sh = (!own && nch && CASTN(nch) ? 1 : 0) | (!own && wch && CASTW(wch) && !(CASTN(nch) && nch === wch && false) ? 2 : 0);
  const psh = PSH[ch] ? ch : '';
  const g = { key: key + '|' + deco + '|' + v + '|' + sh + '|' + psh, n, layers, ch, deco: deco ? deco[0] : '', dm, a, b, v, sh, psh, y, fr: [] };
  if (deco === '' && C !== WA) g.n = 1;
  s.g[i] = g; return g;
}
function paintGround(c, g, fi) {
  for (let j = 0; j < g.layers.length; j += 2) paintLayer(c, g.layers[j], g.layers[j + 1], g.v, fi, g.y);
  switch (g.deco) {
    case 'f': paintFlowers(c, g.v, fi); break;
    case 'V': { const h = g.dm === 1; c.fillStyle = 'rgba(20,70,90,.28)'; if (h) c.fillRect(0, 13, 16, 3); else c.fillRect(13.5, 0, 2.5, 16);
      const ms = h ? 10 : 5; paintDeck(c, ms, h, true); if (h) { c.fillStyle = '#7a4c28'; c.fillRect(0, .5, 16, 1); } break; }
    case 'z': paintDeck(c, g.dm, g.a === 1, g.layers[g.layers.length - 2] === WA); break;
    case 'C': case 'E': paintMass(c, g.dm, g.deco, g.v); break;
    case 'M': paintMouth(c, g.dm, g.a, g.b, g.ch === 'M' ? (g.key.indexOf('|ME') >= 0 ? 'E' : 'C') : 'C', g.v); break;
    case 'B': paintIWall(c, g.dm, g.a, g.v); break;
    case 'j': paintSoil(c, g.dm); break;
    case 'a': paintRug(c, g.dm); break;
    case 'm': paintMat(c); break;
  }
  if (g.sh & 1) { c.fillStyle = lg(c, 0, 0, 0, 4.5, 'rgba(30,40,50,.3)', 'rgba(30,40,50,0)'); c.fillRect(0, 0, 16, 4.5); }
  if (g.sh & 2) { c.fillStyle = lg(c, 0, 0, 4, 0, 'rgba(30,40,50,.22)', 'rgba(30,40,50,0)'); c.fillRect(0, 0, 4, 16); }
  if (g.psh) { const q = PSH[g.psh]; softShadow(c, q[0], q[1], q[2], q[3], q[4]); }
}
function groundImg(g, fi) {
  if (g.n === 1) fi = 0;
  return g.fr[fi] || (g.fr[fi] = make(g.key + '#' + fi, 16, 16, c => paintGround(c, g, fi)));
}

// ---- Props (tall scenery, depth-sorted with characters) -----------------------------
// A prop spec: { key, dx, dy, w, h (sprite box relative to tile top-left), yb (sort base in map px), n frames, anim(t,x,y), paint(c, fi), fx, br }
function spr(p, fi) {
  return p.fr[fi] || (p.fr[fi] = make(p.key + '#' + fi, p.w, p.h, c => { c.translate(-p.dx, -p.dy); p.paint(c, fi); }));
}
function spec(key, dx, dy, w, h, paint, o) { return Object.assign({ key, dx, dy, w, h, paint, n: 1, fr: [], fx: null, br: 0, ph: 0, yb: 0 }, o); }

const TREE_PAL = [['#2f7d36', '#4fb043', '#3d9a3c', '#86d65c'], ['#4a8a2a', '#7cc046', '#64a83a', '#b4e46e'], ['#246e4c', '#3fa35c', '#2f8a4e', '#79d08a']];
function paintTree(c, v) {
  c.fillStyle = lg(c, 5.5, 0, 10.5, 0, '#8e5c38', '#b88252', '#7a4b2c'); rr(c, 5.8, 3, 4.4, 12, 1.6); c.fill();
  el(c, 6, 14.7, 1.4, .8, '#7a4b2c'); el(c, 10, 14.7, 1.4, .8, '#7a4b2c');
  const cs = [[8, -4, 9.6], [2.4, -.6, 6], [13.6, -.6, 6], [4.4, -8.6, 6.4], [11.8, -9, 6.4], [8, 1.2, 7]];
  toonBlob(c, cs, TREE_PAL[v % 3]);
  const R = rng(v * 7 + 1);
  c.strokeStyle = 'rgba(255,255,230,.35)'; c.lineWidth = .6;
  for (let i = 0; i < 6; i++) { const a = 1 + R() * 12, b = -12 + R() * 12; c.beginPath(); c.arc(a, b, 1.3, 1.1 * PI, 1.9 * PI); c.stroke(); }
  c.strokeStyle = 'rgba(20,60,30,.3)';
  for (let i = 0; i < 4; i++) { const a = 3 + R() * 10, b = -2 + R() * 6; c.beginPath(); c.arc(a, b, 1.3, .1 * PI, .9 * PI); c.stroke(); }
  if (v === 1) for (let i = 0; i < 4; i++) { const a = 2 + R() * 12, b = -10 + R() * 12; el(c, a, b + .4, 1.1, 1, '#a8282e'); el(c, a, b, 1, 1, '#ef4b4b'); el(c, a - .3, b - .35, .35, .3, '#ffd0c8'); }
  if (v === 2) for (let i = 0; i < 6; i++) { const a = 1 + R() * 14, b = -12 + R() * 13; el(c, a, b, .9, .9, '#ffd0e4'); el(c, a, b, .35, .35, '#ffef9a'); }
}
function paintPine(c, v) {
  c.fillStyle = '#7a4b2c'; rr(c, 6.9, 9, 2.4, 6.4, .8); c.fill();
  const pal = v % 2 ? ['#1f6a4a', '#358f62', '#5ab983'] : ['#245e48', '#2f8358', '#4fae78'];
  const tier = (cy, hw, ht) => { c.beginPath(); c.moveTo(8, cy - ht); c.quadraticCurveTo(8 + hw * .45, cy - ht * .5, 8 + hw, cy - .3); c.quadraticCurveTo(8 + hw * .5, cy + 1.8, 8, cy + .8); c.quadraticCurveTo(8 - hw * .5, cy + 1.8, 8 - hw, cy - .3); c.quadraticCurveTo(8 - hw * .45, cy - ht * .5, 8, cy - ht); c.closePath(); };
  for (const [cy, hw, ht] of [[11, 8, 9.5], [4.5, 6.6, 9], [-2.2, 5, 9]]) {
    c.save(); c.translate(.4, .9); tier(cy, hw + .4, ht); c.fillStyle = pal[0]; c.fill(); c.restore();
    tier(cy, hw, ht); c.fillStyle = pal[1]; c.fill();
    c.save(); tier(cy, hw, ht); c.clip(); c.fillStyle = pal[2]; c.beginPath(); c.moveTo(8, cy - ht - 1); c.lineTo(8 - hw - 1, cy + 1); c.lineTo(8 - hw * .3, cy + 1); c.quadraticCurveTo(7, cy - ht * .4, 8.4, cy - ht); c.fill();
    c.fillStyle = 'rgba(10,40,30,.25)'; c.fillRect(8.8, cy - ht, hw, ht + 3); c.restore();
  }
  el(c, 7, -9, .7, 1, 'rgba(255,255,255,.35)');
}
function paintBush(c, v) {
  const cs = [[4.4, 9.6, 4.8], [11.6, 9.6, 4.8], [8, 6.6, 5.4], [8, 10.4, 5.6]];
  toonBlob(c, cs, v === 2 ? TREE_PAL[2] : TREE_PAL[0]);
  const R = rng(v * 11 + 2);
  if (v === 0) for (let i = 0; i < 5; i++) { const a = 3 + R() * 10, b = 4 + R() * 9; el(c, a, b + .3, .9, .8, '#9a2034'); el(c, a, b, .8, .8, '#ff4f6a'); el(c, a - .25, b - .3, .25, .2, '#fff'); }
  if (v === 1) for (let i = 0; i < 5; i++) { const a = 3 + R() * 10, b = 4 + R() * 9; for (let k = 0; k < 5; k++) { const an = k / 5 * TAU; el(c, a + Math.cos(an) * .7, b + Math.sin(an) * .7, .6, .6, '#fff4fa'); } el(c, a, b, .4, .4, '#ffd23a'); }
  c.strokeStyle = 'rgba(255,255,230,.35)'; c.lineWidth = .55;
  for (let i = 0; i < 3; i++) { const a = 3 + R() * 9, b = 3 + R() * 5; c.beginPath(); c.arc(a, b, 1.1, 1.1 * PI, 1.9 * PI); c.stroke(); }
}
function paintStump(c, v, log) {
  if (log) {
    const { l, r } = log;
    c.fillStyle = lg(c, 0, 5, 0, 14, '#b07a4a', '#8e5c36', '#6e4426'); c.fillRect(l ? 0 : 2, 6, (r ? 16 : 14) - (l ? 0 : 2), 7.5);
    c.strokeStyle = 'rgba(60,30,10,.35)'; c.lineWidth = .5; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * 4 + 1, 7.5 + (i % 2)); c.lineTo(i * 4 + 3.5, 7.5 + (i % 2)); c.stroke(); }
    c.fillStyle = 'rgba(255,230,190,.35)'; c.fillRect(l ? 0 : 2, 6.4, (r ? 16 : 14) - (l ? 0 : 2), .8);
    if (!l) { el(c, 2.2, 9.75, 2, 3.75, '#7a4c2a'); el(c, 2.4, 9.75, 1.6, 3.3, '#e8bf86'); el(c, 2.4, 9.75, .8, 1.6, '#c99a62'); }
    if (!r) { el(c, 14, 9.75, 1.6, 3.75, '#6e4426'); }
    if (v === 1) { el(c, 9, 6, 1.6, .9, '#6fbf5a'); }
    return;
  }
  c.fillStyle = lg(c, 3, 0, 13, 0, '#8a5834', '#b07a4a', '#7a4b2c'); rr(c, 3.4, 5.5, 9.2, 8.4, [0, 0, 3, 3]); c.fill();
  el(c, 3.6, 13.6, 1.6, 1, '#7a4b2c'); el(c, 12.4, 13.6, 1.6, 1, '#7a4b2c'); el(c, 8, 14, 1.4, .8, '#7a4b2c');
  c.strokeStyle = 'rgba(60,30,10,.3)'; c.lineWidth = .5; for (const xx of [5.5, 8.4, 11]) { c.beginPath(); c.moveTo(xx, 7.5); c.lineTo(xx + .3, 12.5); c.stroke(); }
  el(c, 8, 5.6, 4.7, 2.3, '#9a6a3c'); el(c, 8, 5.4, 4.4, 2, '#ebc28a');
  c.strokeStyle = '#c99a62'; c.lineWidth = .4; c.beginPath(); c.ellipse(8, 5.4, 2.8, 1.25, 0, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(8, 5.4, 1.3, .6, 0, 0, TAU); c.stroke();
  if (v === 1) { c.fillStyle = '#f7ecd8'; c.fillRect(12.4, 11.6, .9, 2.2); el(c, 12.85, 11.6, 1.8, 1.2, '#e8423e'); el(c, 12.3, 11.2, .35, .3, '#fff'); el(c, 13.4, 11.5, .3, .25, '#fff'); }
  if (v === 2) { el(c, 5, 4.6, 1.8, .8, '#6fbf5a'); el(c, 5.4, 4.4, .9, .4, '#9ad874'); }
}
function paintRock(c, v) {
  const cs = [[8.4, 9.4, 6.6], [5, 9, 4.4], [12, 10.2, 4]];
  blobPath(c, cs, .2, .9, .6); c.fillStyle = '#6f6b84'; c.fill();
  blobPath(c, cs, 0, 0, 0); c.fillStyle = '#9d99b2'; c.fill();
  c.save(); blobPath(c, cs, 0, 0, 0); c.clip();
  blobPath(c, cs, -1, -1.8, -.5); c.fillStyle = '#bcb8cc'; c.fill();
  el(c, 6, 6, 3.4, 2.2, '#dddbe8'); el(c, 5.2, 5.4, 1.4, .8, '#f4f3fa');
  c.strokeStyle = 'rgba(70,64,96,.45)'; c.lineWidth = .5; c.beginPath(); c.moveTo(10.5, 6); c.lineTo(9.6, 8.6); c.lineTo(10.8, 10.4); c.stroke();
  if (v === 2) { el(c, 9, 3.6, 3, 1.4, '#6fbf5a'); el(c, 8.4, 3.3, 1.6, .7, '#9ad874'); }
  c.restore();
}
const CRY = [['#bfeaff', '#62b8f0', '#3a78c8'], ['#ead8ff', '#a888f0', '#6a4ac0'], ['#ffd8ee', '#f08ac0', '#c04a8a']];
function paintCrystal(c, v) {
  el(c, 8, 13.6, 6, 1.8, '#7d7290');
  const P = CRY[v % 3];
  const prism = (cx, top, w, bot, tilt) => {
    c.save(); c.translate(cx, bot); c.rotate(tilt);
    const h = bot - top;
    c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w / 2, -h + w * .6); c.lineTo(0, -h); c.lineTo(w / 2, -h + w * .6); c.lineTo(w / 2, 0); c.closePath(); c.fillStyle = P[2]; c.fill();
    c.beginPath(); c.moveTo(-w / 2 + .4, -.3); c.lineTo(-w / 2 + .4, -h + w * .6); c.lineTo(0, -h + .5); c.lineTo(0, -.3); c.closePath(); c.fillStyle = P[0]; c.fill();
    c.beginPath(); c.moveTo(0, -.3); c.lineTo(0, -h + .5); c.lineTo(w / 2 - .4, -h + w * .6); c.lineTo(w / 2 - .4, -.3); c.closePath(); c.fillStyle = P[1]; c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-w / 2 + .9, -h + w * .7, .6, h * .5);
    c.restore();
  };
  prism(4.6, 5, 3.4, 13.4, -.3); prism(11.6, 6.5, 3.2, 13.4, .32); prism(8, -3, 4.6, 13.6, 0);
}
function paintLamp(c) {
  el(c, 8, 14.6, 3.4, 1.4, '#5a5a6c'); rf(c, 5.8, 11.8, 4.4, 3, 1, '#77778c'); rf(c, 6.2, 11.6, 3.6, .9, .4, '#9a9ab0');
  c.fillStyle = lg(c, 7, 0, 9, 0, '#3c3c4c', '#6e6e84', '#3c3c4c'); c.fillRect(7.1, -6.5, 1.8, 18.5);
  rf(c, 6.4, -6.8, 3.2, 1.2, .5, '#4a4a5c');
  rf(c, 4.6, -14.4, 6.8, 7.6, 1.6, '#3c3c4c');
  rr(c, 5.4, -13.6, 5.2, 6.2, 1.2); c.fillStyle = lg(c, 0, -13.6, 0, -7.4, '#fffbe0', '#ffe27a', '#ffb94a'); c.fill();
  el(c, 8, -10.4, 1.6, 2.2, '#fffff4');
  c.fillStyle = '#3c3c4c'; c.fillRect(7.6, -13.6, .8, 6.2);
  c.beginPath(); c.moveTo(4, -14.2); c.quadraticCurveTo(8, -18.4, 12, -14.2); c.closePath(); c.fillStyle = '#4a4a5c'; c.fill();
  el(c, 8, -17.3, .9, .9, '#4a4a5c'); el(c, 6.4, -15.6, 1.2, .5, 'rgba(255,255,255,.25)');
}
function paintSign(c) {
  c.fillStyle = lg(c, 7, 0, 9, 0, '#7a4b2c', '#a2703f', '#7a4b2c'); c.fillRect(7, 6, 2, 9.4);
  rf(c, 1.4, -.6, 13.2, 9.4, 2, '#93603a'); rr(c, 2.1, .1, 11.8, 7.6, 1.6); c.fillStyle = lg(c, 0, 0, 0, 8, '#f0c587', '#dca56a'); c.fill();
  c.fillStyle = 'rgba(255,250,230,.45)'; c.fillRect(2.6, .6, 10.8, .7);
  rf(c, 4, 2.6, 8, 1, .5, '#9a6a3c'); rf(c, 4, 4.8, 5.6, 1, .5, '#9a6a3c');
  el(c, 3, 1.1, .4, .4, '#7a4b2c'); el(c, 13, 1.1, .4, .4, '#7a4b2c');
}
function paintFence(c, ms) {
  const rail = (x, y, w, h) => { rf(c, x, y + .6, w, h, .5, '#9a6a3c'); rf(c, x, y, w, h, .5, '#e2b073'); c.fillStyle = 'rgba(255,245,215,.55)'; c.fillRect(x + .3, y + .15, Math.max(0, w - .6), .35); };
  if (ms & 1) rail(7.1, -6, 1.8, 9); if (ms & 4) rail(7.1, 6, 1.8, 10);
  if (ms & 8) { rail(0, 3, 8, 1.5); rail(0, 7.2, 8, 1.5); } if (ms & 2) { rail(8, 3, 8, 1.5); rail(8, 7.2, 8, 1.5); }
  rf(c, 6.2, -1.4, 3.6, 13.4, 1.4, '#9a6a3c'); rr(c, 6.2, -1.8, 3.4, 13, 1.4); c.fillStyle = lg(c, 6.2, 0, 9.6, 0, '#f0c48a', '#d39e64', '#b8844c'); c.fill();
  el(c, 7.9, -1, 1.5, .7, '#f7d8a6');
}
// Fence gate: two capped posts with a picket gate between them (vertical fences get an edge-on gate).
function paintGate(c, ms) {
  const vert = (ms & 5) && !(ms & 10);
  const wood = (x, y, w, h, r, a, b) => { rf(c, x, y + .6, w, h, r, '#9a6a3c'); rr(c, x, y, w, h, r); c.fillStyle = lg(c, x, y, x + w, y + h, a || '#f4cf98', b || '#d7a368'); c.fill(); };
  const post = (px, py, ht) => {
    rf(c, px - 1.9, py - ht + .4, 3.8, ht + .2, 1.4, '#8a5a30'); rr(c, px - 1.8, py - ht, 3.6, ht, 1.4); c.fillStyle = lg(c, px - 1.8, 0, px + 1.8, 0, '#f0c48a', '#d39e64', '#b07a44'); c.fill();
    el(c, px, py - ht + .5, 2.2, 1, '#8a5a30'); el(c, px, py - ht + .2, 2, .85, '#f7d8a6');
  };
  if (vert) {   // gate leaf seen edge-on from above: a framed board panel with rails sticking out either side
    post(8, 2.2, 8);
    rf(c, 4.6, 3.4, 6.8, 11.4, 1, '#8a5a30');
    rr(c, 4.6, 2.8, 6.8, 11.4, 1); c.fillStyle = lg(c, 4.6, 0, 11.4, 0, '#f7d6a4', '#e2b073', '#c8945a'); c.fill();
    c.fillStyle = 'rgba(120,70,30,.4)'; for (const xx of [6.3, 8, 9.7]) c.fillRect(xx, 3.4, .35, 10.4);
    wood(4.2, 4.6, 7.6, 1.4, .5, '#fbe0b2', '#d7a368'); wood(4.2, 10.6, 7.6, 1.4, .5, '#fbe0b2', '#d7a368');
    c.save(); c.beginPath(); c.moveTo(5.4, 10.6); c.lineTo(10.6, 6); c.lineWidth = 1; c.strokeStyle = '#b8844c'; c.stroke(); c.restore();
    rf(c, 7, 13.2, 2, 1.2, .4, '#7c7a92');
    post(8, 16.2, 7);
    return;
  }
  // horizontal: gate leaf between the posts
  wood(3, 2.4, 10, 1.6, .6); wood(3, 7.6, 10, 1.6, .6);
  for (let i = 0; i < 4; i++) {
    const px = 3.7 + i * 2.35;
    c.beginPath(); c.moveTo(px, 11); c.lineTo(px, .4); c.lineTo(px + .85, -.9); c.lineTo(px + 1.7, .4); c.lineTo(px + 1.7, 11); c.closePath();
    c.fillStyle = '#a8743f'; c.save(); c.translate(0, .6); c.fill(); c.restore();
    c.fillStyle = lg(c, px, 0, px + 1.7, 0, '#fbe0b2', '#e2b073'); c.fill();
  }
  c.save(); c.beginPath(); c.moveTo(4, 8.6); c.lineTo(12, 3); c.lineWidth = 1.2; c.strokeStyle = '#b8844c'; c.stroke(); c.lineWidth = .4; c.strokeStyle = 'rgba(255,245,215,.6)'; c.stroke(); c.restore();
  c.fillStyle = 'rgba(255,245,215,.55)'; c.fillRect(3.4, 2.6, 9.2, .35); c.fillRect(3.4, 7.8, 9.2, .35);
  rf(c, 11.6, 4.8, 2.2, 1.1, .4, '#7c7a92'); el(c, 12.9, 5.35, .45, .45, '#c8c6da');   // latch
  rf(c, 2.4, 2.6, 1.6, 1.2, .3, '#6c6a80'); rf(c, 2.4, 7.8, 1.6, 1.2, .3, '#6c6a80');   // hinges
  post(1.9, 12, 13.6); post(14.1, 12, 13.6);
}
// Wild thicket: dark tangled bramble mounds with thorny vines and berries; overlapping neighbours read as one mass.
const THK = ['#173e26', '#2a6236', '#3a7a40', '#68a356'];
function paintThicket(c, v, stake) {
  const R = rng(v * 23 + 11);
  const cs = [[2.6, 9.8, 5.4], [13.4, 9.4, 5.6], [8, 4.4, 6.2], [3.4, 3.2, 4.4], [12.8, 2.6, 4.6], [8, 10.6, 6]];
  toonBlob(c, cs, THK);
  c.save(); blobPath(c, cs, 0, 0, 0); c.clip();
  for (let i = 0; i < 7; i++) { const a = R() * 16, b = -2 + R() * 16; el(c, a, b, 1.6 + R(), 1, 'rgba(10,40,20,.28)'); }
  for (let i = 0; i < 6; i++) { const a = 1 + R() * 14, b = -3 + R() * 14; c.strokeStyle = 'rgba(190,230,150,.32)'; c.lineWidth = .5; c.beginPath(); c.arc(a, b, 1.1, 1.1 * PI, 1.9 * PI); c.stroke(); }
  c.restore();
  // thorny bramble canes arching over the mound
  for (let i = 0; i < 2; i++) {
    const x0 = -1 + R() * 6 + i * 7, y0 = 12 + R() * 3, x1 = x0 + 4 + R() * 6, y1 = 11 + R() * 3, cxp = (x0 + x1) / 2 + (R() - .5) * 4, cyp = -6 + R() * 6;
    c.lineWidth = 1.1; c.strokeStyle = '#4a2a22'; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cxp, cyp, x1, y1); c.stroke();
    c.lineWidth = .45; c.strokeStyle = '#9a5a44'; c.beginPath(); c.moveTo(x0, y0 - .3); c.quadraticCurveTo(cxp, cyp - .3, x1, y1 - .3); c.stroke();
    for (let k = 1; k < 6; k++) {
      const u = k / 6, px = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * cxp + u * u * x1, py = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * cyp + u * u * y1;
      const s = k % 2 ? 1 : -1; c.fillStyle = '#e8d2b8'; c.beginPath(); c.moveTo(px - .35, py); c.lineTo(px + .35 * s * 2, py - 1.1); c.lineTo(px + .35, py); c.fill();
    }
  }
  // dry twigs poking out of the top
  c.strokeStyle = '#6a4a34'; c.lineWidth = .6;
  for (let i = 0; i < 2; i++) { const a = 4 + R() * 8, b = -1 + R() * 2; c.beginPath(); c.moveTo(a, b + 2); c.lineTo(a + (R() - .5) * 3, b - 3); c.lineTo(a + (R() - .5) * 4, b - 4.5); c.stroke(); }
  // dark berries
  for (let i = 0; i < 2; i++) { const a = 2 + R() * 12, b = 1 + R() * 11; el(c, a, b + .3, .9, .8, '#1e1028'); el(c, a, b, .8, .8, '#5a2a6a'); el(c, a - .25, b - .3, .25, .2, 'rgba(255,255,255,.7)'); }
  if (stake) {   // survey stake with a red ribbon: land you can buy later
    c.fillStyle = lg(c, 10, 0, 12, 0, '#c89a62', '#a07040'); c.fillRect(10.4, -7, 1.4, 15);
    c.beginPath(); c.moveTo(10.4, 8); c.lineTo(11.1, 9.4); c.lineTo(11.8, 8); c.fill();
    rf(c, 9.6, -6, 3, 1.4, .5, '#e8423e');
    c.fillStyle = '#e8423e'; c.beginPath(); c.moveTo(12.4, -5.6); c.quadraticCurveTo(14.4, -4.6, 15.6, -2.2); c.lineTo(14.6, -2.4); c.quadraticCurveTo(13.6, -4.4, 12, -4.8); c.fill();
    c.fillStyle = '#ff8a7a'; c.fillRect(9.8, -5.8, 2.6, .4);
  }
}
function paintCrops(c, v, fi) {
  const veg = ['#ff8a3a', '#f4f0e6', '#e8445a', '#ffd23a'][v];
  [[4, 7, 0], [12, 7, 1], [8, 13.4, 2]].forEach(([px, py, i]) => {
    el(c, px, py + .2, 2.4, .9, 'rgba(60,30,10,.3)');
    el(c, px, py - .2, 1.6, 1, veg); el(c, px - .4, py - .5, .6, .3, 'rgba(255,255,255,.5)');
    c.save(); c.translate(px, py - .6); c.rotate(Math.sin(fi / 4 * TAU + i * 2) * .12);
    for (const [a, l] of [[-.7, 4.2], [0, 5.2], [.7, 4.2]]) { c.save(); c.rotate(a); c.beginPath(); c.ellipse(0, -l / 2, 1.1, l / 2, 0, 0, TAU); c.fillStyle = '#3f9a36'; c.fill(); c.beginPath(); c.ellipse(-.3, -l / 2, .5, l / 2.4, 0, 0, TAU); c.fillStyle = '#7fd05a'; c.fill(); c.restore(); }
    c.restore();
  });
}
// Buildings: one piece per tile; pieces join into a single house (roof with ridge and eave overhang, walls, windows, door).
const ROOFC = { R: '#ec5b52', Q: '#4f8ee6', A: '#2fb5a5' };
function paintRoof(c, ch, o) {
  const base = ROOFC[ch], X0 = o.l ? 0 : -2, X1 = o.r ? 16 : 18, Y0 = o.u ? 0 : -2.5;
  const c0 = shade(base, 1.12 - .07 * o.ri), c1 = shade(base, 1.05 - .07 * o.ri);
  rr(c, X0, Y0, X1 - X0, 16 - Y0 + (o.eave ? 1 : 0), [(!o.u && !o.l) ? 3 : 0, (!o.u && !o.r) ? 3 : 0, 0, 0]);
  c.fillStyle = lg(c, 0, Y0, 0, 16, c0, c1); c.fill();
  c.save(); c.clip();
  for (let yy = -4; yy <= 16; yy += 4) {
    const off = ((yy + 16) / 4) % 2 ? 2 : 0;
    c.strokeStyle = 'rgba(80,20,30,.16)'; c.lineWidth = .6; c.beginPath();
    for (let xx = -4; xx <= 20; xx += 4) { c.moveTo(xx + off + 2, yy); c.arc(xx + off, yy, 2, 0, PI); } c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = .5; c.beginPath();
    for (let xx = -4; xx <= 20; xx += 4) { c.moveTo(xx + off + 1.4, yy + 1.2); c.arc(xx + off, yy + 2.4, 1.6, 1.25 * PI, 1.75 * PI); } c.stroke();
  }
  if (!o.l) { c.fillStyle = lg(c, X0, 0, X0 + 3, 0, 'rgba(60,20,30,.22)', 'rgba(60,20,30,0)'); c.fillRect(X0, Y0, 3, 20); }
  if (!o.r) { c.fillStyle = lg(c, X1 - 3, 0, X1, 0, 'rgba(60,20,30,0)', 'rgba(60,20,30,.25)'); c.fillRect(X1 - 3, Y0, 3, 20); }
  c.restore();
  if (o.chim) {
    rf(c, 3, -9, 4.6, 9, .6, '#b8634e'); c.fillStyle = 'rgba(255,220,200,.35)'; c.fillRect(3.4, -8.4, 1, 8);
    c.fillStyle = 'rgba(90,40,30,.35)'; c.fillRect(3, -5.6, 4.6, .4); c.fillRect(3, -2.6, 4.6, .4);
    rf(c, 2.4, -10, 5.8, 1.8, .7, '#7a4a3a');
  }
  if (!o.u) { rf(c, X0 + .3, Y0 - .6, X1 - X0 - .6, 2.6, [(!o.l) ? 1.3 : 0, (!o.r) ? 1.3 : 0, 0, 0], shade(base, .7)); c.fillStyle = shade(base, 1.35); c.fillRect(X0 + (o.l ? 0 : 1), Y0 - .3, X1 - X0 - (o.l ? 0 : 1) - (o.r ? 0 : 1), .6); }
  if (o.eave) {
    rf(c, X0, 14.2, X1 - X0, 4.2, [0, 0, o.r ? 0 : 1.8, o.l ? 0 : 1.8], shade(base, .62));
    c.fillStyle = shade(base, 1.28); c.fillRect(X0, 14.2, X1 - X0, .7);
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(X0, 17.4, X1 - X0, 1);
  }
}
function paintWall(c, ch, o) {
  c.fillStyle = lg(c, 0, 0, 0, 16, '#fff6e4', '#f2e1c2'); c.fillRect(0, 0, 16, 16);
  if (o.roof) { c.fillStyle = lg(c, 0, 0, 0, 6, 'rgba(110,60,40,.38)', 'rgba(110,60,40,0)'); c.fillRect(0, 0, 16, 6); }
  else { c.fillStyle = '#b88456'; c.fillRect(0, 0, 16, 1.6); }
  c.fillStyle = '#c9b597'; c.fillRect(0, 12.8, 16, 3.2); c.fillStyle = '#e9dcc2'; c.fillRect(0, 12.8, 16, .6); c.fillStyle = '#a8957a'; c.fillRect(0, 15.4, 16, .6);
  c.fillStyle = 'rgba(120,100,70,.35)'; c.fillRect(4, 13.4, .4, 2); c.fillRect(11, 13.4, .4, 2);
  if (!o.l) { c.fillStyle = lg(c, 0, 0, 2.4, 0, '#d29a68', '#b07a4a'); c.fillRect(0, 0, 2.2, 13); }
  if (!o.r) { c.fillStyle = lg(c, 13.8, 0, 16, 0, '#c48c5a', '#9a6a3e'); c.fillRect(13.8, 0, 2.2, 13); }
  if (ch === 'N') {
    rf(c, 3, 2.8, 10, 8.4, 2, '#a06d45');
    rr(c, 4, 3.8, 8, 6.4, 1.4); c.fillStyle = lg(c, 0, 3.8, 0, 10.2, '#e2f6ff', '#9fd8f4', '#ffe9a8'); c.fill();
    c.save(); rr(c, 4, 3.8, 8, 6.4, 1.4); c.clip(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(5, 10.2); c.lineTo(8.4, 3.8); c.lineTo(9.8, 3.8); c.lineTo(6.4, 10.2); c.fill(); c.restore();
    c.fillStyle = '#a06d45'; c.fillRect(7.55, 3.8, .9, 6.4); c.fillRect(4, 6.6, 8, .8);
    rf(c, 2.4, 10.6, 11.2, 1.4, .6, '#cf9a66');
    rf(c, 3.4, 11.8, 9.2, 1.6, .5, '#8e5e3a');
    const fc = ['#ff6e8e', '#ffd23a', '#c8a2ff', '#ff9e5e'][o.v];
    for (let i = 0; i < 4; i++) { el(c, 4.6 + i * 2.3, 11.4, .9, .8, '#5cae40'); el(c, 4.4 + i * 2.3, 11, .7, .7, fc); }
  } else if (ch === 'D') {
    rr(c, 2.4, .8, 11.2, 15.2, [5.4, 5.4, 0, 0]); c.fillStyle = '#7e4c2c'; c.fill();
    rr(c, 3.4, 1.8, 9.2, 14.2, [4.5, 4.5, 0, 0]); c.fillStyle = lg(c, 0, 2, 0, 16, '#d8915a', '#b06a3a'); c.fill();
    c.fillStyle = 'rgba(80,40,20,.22)'; c.fillRect(6.3, 2.5, .5, 13.5); c.fillRect(9.3, 2.5, .5, 13.5);
    el(c, 8, 5.4, 1.8, 1.8, '#7e4c2c'); el(c, 8, 5.4, 1.3, 1.3, '#bfe8ff'); el(c, 7.6, 5, .4, .4, '#fff');
    el(c, 10.8, 9.6, .8, .8, '#8a6a1a'); el(c, 10.7, 9.4, .7, .7, '#ffd86a');
    rf(c, 1.6, 15.2, 12.8, 1.8, .8, '#bdb2a0'); c.fillStyle = '#ddd4c4'; c.fillRect(2.2, 15.2, 11.6, .5);
  }
}
function paintAwning(c, o) {
  const X0 = o.l ? 0 : -1, X1 = o.r ? 16 : 17;
  c.save();
  c.beginPath(); c.moveTo(X0, 1.4); c.lineTo(X1, 1.4); c.lineTo(X1, 15);
  for (let xx = X1; xx > X0; xx -= 4) c.arc(xx - 2, 15, 2, 0, PI);
  c.closePath(); c.clip();
  for (let xx = -8; xx < 24; xx += 8) { c.fillStyle = '#ef5862'; c.fillRect(xx, 0, 4, 20); c.fillStyle = '#fff4ea'; c.fillRect(xx + 4, 0, 4, 20); }
  c.fillStyle = lg(c, 0, 1, 0, 17, 'rgba(255,255,255,.25)', 'rgba(255,255,255,0)', 'rgba(120,20,30,.25)'); c.fillRect(-2, 0, 20, 20);
  c.restore();
  rf(c, X0, 0, X1 - X0, 2.6, 1.2, '#c8404a'); c.fillStyle = '#ff8a90'; c.fillRect(X0 + .6, .4, X1 - X0 - 1.2, .5);
}
function paintCounterJ(c, o) {
  c.fillStyle = lg(c, 0, 0, 0, 6, '#c8a0a0', '#e9d4d0'); c.fillRect(0, 0, 16, 6);
  rf(c, o.l ? 0 : .6, 4.6, 16 - (o.l ? 0 : .6) - (o.r ? 0 : .6), 4, 1, '#ffe2df');
  rr(c, o.l ? 0 : .6, 8, 16 - (o.l ? 0 : .6) - (o.r ? 0 : .6), 7.6, [0, 0, o.r ? 0 : 1.2, o.l ? 0 : 1.2]); c.fillStyle = lg(c, 0, 8, 0, 15.6, '#fffaf4', '#efd9cf'); c.fill();
  c.fillStyle = '#f29aa5'; c.fillRect(o.l ? 0 : .6, 13, 16 - (o.l ? 0 : .6) - (o.r ? 0 : .6), 1);
  if (!o.l) rf(c, 0, -3, 1.6, 18.4, .6, '#e3d6d0'); if (!o.r) rf(c, 14.4, -3, 1.6, 18.4, .6, '#cdbfb8');
  if (o.cx !== null) { const x = o.cx; rf(c, x - 1.5, 8.6, 3, 4.4, .6, '#ffffff'); rf(c, x - 1.1, 8.9, 2.2, 3.8, .4, '#ee4a58'); rf(c, x - 2.3, 9.9, 4.6, 1.8, .4, '#ee4a58'); }
  el(c, 4, 5.8, .9, .9, '#ff7080'); el(c, 12, 5.8, .9, .9, '#ff7080');
}
function paintPen(c, ms) {
  const rail = (x, y, w, h) => { rf(c, x, y + .5, w, h, .4, '#9a6a3c'); rf(c, x, y, w, h, .4, '#e2b073'); };
  const post = (x, y) => { rf(c, x - 1.1, y - 3.4, 2.2, 5.4, .8, '#a8743f'); el(c, x, y - 3.2, 1, .5, '#f0c48a'); };
  if (!(ms & 1)) { rail(0, -2, 16, 1.2); rail(0, .6, 16, 1.2); post(8, 2); }
  if (!(ms & 4)) { rail(0, 10.6, 16, 1.2); rail(0, 13.2, 16, 1.2); post(8, 14.6); }
  if (!(ms & 8)) { rail(.4, -1, 1.4, 15.8); post(1.1, 8); }
  if (!(ms & 2)) { rail(14.2, -1, 1.4, 15.8); post(14.9, 8); }
  if (!(ms & 1) && !(ms & 8)) post(1.1, 2); if (!(ms & 1) && !(ms & 2)) post(14.9, 2);
  if (!(ms & 4) && !(ms & 8)) post(1.1, 14.6); if (!(ms & 4) && !(ms & 2)) post(14.9, 14.6);
}
// Interior furniture
function paintCounterK(c, o) {
  const l = o.l ? 0 : .5, r = o.r ? 16 : 15.5;
  rr(c, l, 4.6, r - l, 11.2, [0, 0, o.r ? 0 : 1.2, o.l ? 0 : 1.2]); c.fillStyle = lg(c, 0, 5, 0, 16, '#cf9258', '#a86c3c'); c.fill();
  c.fillStyle = 'rgba(80,40,20,.2)'; c.fillRect(l + 1.5, 7, r - l - 3, .5); if (!o.l) c.fillRect(1.6, 7, .5, 7.5); if (!o.r) c.fillRect(13.9, 7, .5, 7.5);
  rr(c, l - (o.l ? 0 : .3), -3.6, r - l + (o.l ? 0 : .3) + (o.r ? 0 : .3), 8.6, [o.l ? 0 : 1.6, o.r ? 0 : 1.6, 0, 0]); c.fillStyle = lg(c, 0, -3.6, 0, 5, '#f8dcaa', '#ebc58c'); c.fill();
  c.fillStyle = '#f9e6c4'; c.fillRect(l, -3.4, r - l, .6); c.fillStyle = '#b8814c'; c.fillRect(l, 4.4, r - l, .8);
}
function paintShelf(c, v) {
  rf(c, .6, -11, 14.8, 26.6, 1.2, '#8c5a32'); c.fillStyle = '#5e3a20'; c.fillRect(1.8, -9.6, 12.4, 23.6);
  const R = rng(v * 3 + 9), cols = ['#e85a5a', '#4f8ee6', '#ffd23a', '#58b848', '#c88af0', '#ff9e5e'];
  for (let sh = 0; sh < 3; sh++) {
    const y = -9.6 + sh * 8; let xx = 2.2;
    while (xx < 13.4) { const w = 1 + R() * 1.4, h = 4.5 + R() * 2.4; if (xx + w > 13.8) break; const col = cols[(R() * cols.length) | 0]; rf(c, xx, y + 7.4 - h, w, h, .3, col); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(xx + .2, y + 7.4 - h + .4, .3, h - .8); xx += w + .25; }
    c.fillStyle = '#b07a48'; c.fillRect(1.8, y + 7.4, 12.4, 1); c.fillStyle = '#d29a62'; c.fillRect(1.8, y + 7.4, 12.4, .35);
  }
  c.fillStyle = '#b07a48'; c.fillRect(.6, -11, 14.8, 1.4);
}
function paintMachine(c) {
  rr(c, 1, -6, 14, 21.6, 3); c.fillStyle = lg(c, 0, -6, 0, 16, '#ffffff', '#e8e2ee'); c.fill();
  c.fillStyle = '#ff8fa0'; c.fillRect(1, 6, 14, 1.6);
  rr(c, 3, -4.4, 10, 7.6, 2.2); c.fillStyle = lg(c, 0, -4, 0, 3, '#c8f0ff', '#7cc8ea'); c.fill();
  [[5.5, -1.6], [8, -1.6], [10.5, -1.6], [6.7, .9], [9.3, .9]].forEach(([a, b]) => { el(c, a, b, 1.1, 1.1, '#e84a5a'); c.fillStyle = '#fff'; c.beginPath(); c.arc(a, b, 1.1, 0, PI); c.fill(); el(c, a, b, .4, .4, '#3a3a48'); });
  el(c, 5, -3.4, 1.4, .6, 'rgba(255,255,255,.7)');
  rf(c, 4, 9, 8, 4, 1, '#3a3a52'); c.fillStyle = '#6ff0b8'; c.fillRect(5, 10, 3, .6); c.fillRect(5, 11.3, 5, .6);
}
function paintPC(c) {
  rr(c, 1, 4, 14, 11.6, 1.2); c.fillStyle = lg(c, 0, 4, 0, 15.6, '#d0a068', '#a8743f'); c.fill(); c.fillStyle = '#f0c48a'; c.fillRect(1, 4, 14, 1.2);
  rf(c, 3, -6, 10, 8.6, 1.4, '#4a4a62'); rr(c, 4, -5, 8, 6.4, .8); c.fillStyle = lg(c, 0, -5, 0, 1.4, '#9cffd8', '#3ec6a0'); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(5, -4, 4, .5); c.fillRect(5, -2.6, 5, .5); c.fillRect(5, -1.2, 3, .5);
  c.fillStyle = '#4a4a62'; c.fillRect(7.2, 2.6, 1.6, 1.6); rf(c, 4, 6, 8, 2.2, .6, '#e8e8f0');
}
function paintTable(c, o, v) {
  const l = o.l ? 0 : .8, r = o.r ? 16 : 15.2, t = o.u ? -2 : -1.6, b = o.d ? 16 : 10.4;
  c.fillStyle = '#7a4a28'; if (!o.d) { if (!o.l) c.fillRect(1.6, 10, 1.6, 5); if (!o.r) c.fillRect(12.8, 10, 1.6, 5); }
  rr(c, l, t, r - l, b - t + (o.d ? 0 : 1.6), [o.u || o.l ? 0 : 2, o.u || o.r ? 0 : 2, o.d || o.r ? 0 : 2, o.d || o.l ? 0 : 2]); c.fillStyle = '#9a6234'; c.fill();
  rr(c, l, t, r - l, b - t, [o.u || o.l ? 0 : 2, o.u || o.r ? 0 : 2, o.d || o.r ? 0 : 2, o.d || o.l ? 0 : 2]); c.fillStyle = lg(c, 0, t, 0, b, '#e4aa6c', '#cf9156'); c.fill();
  c.fillStyle = 'rgba(255,240,210,.4)'; c.fillRect(l + 1, t + .6, r - l - 2, .5);
  if (!o.l && !o.r && !o.u && !o.d) { if (v % 2) { el(c, 8, 4, 2.6, 1.4, '#f7f3ea'); el(c, 8, 3.8, 1.6, .8, '#ff9e5e'); } else { rf(c, 6.6, 0, 2.8, 4, 1, '#6aa7e0'); el(c, 7.2, -.6, 1.2, 1.2, '#ff7eab'); el(c, 8.8, -.2, 1.1, 1.1, '#ffd84a'); } }
}
function paintBed(c, o) {
  const t = o.u ? -1 : -5, b = o.d ? 17 : 15.2;
  rr(c, .8, t, 14.4, b - t, [o.u ? 0 : 2, o.u ? 0 : 2, o.d ? 0 : 2, o.d ? 0 : 2]); c.fillStyle = '#9a6234'; c.fill();
  if (!o.u) { rf(c, .8, -6, 14.4, 4, [2, 2, 0, 0], '#b8783e'); c.fillStyle = '#e0a868'; c.fillRect(1.4, -5.4, 13.2, .7); }
  rr(c, 1.8, o.u ? -1 : -2, 12.4, (b - .8) - (o.u ? -1 : -2), [o.u ? 0 : 1.6, o.u ? 0 : 1.6, 1.6, 1.6]); c.fillStyle = '#f7f3ec'; c.fill();
  if (!o.u) { rf(c, 3, -1.4, 10, 4, 2, '#ffffff'); c.fillStyle = 'rgba(170,160,190,.4)'; c.fillRect(3.6, 1.8, 8.8, .5); }
  const by = o.u ? -1 : 3.4;
  rr(c, 1.8, by, 12.4, (b - .8) - by, [o.u ? 0 : 1.4, o.u ? 0 : 1.4, 1.6, 1.6]); c.fillStyle = lg(c, 0, by, 0, b, '#6a9ae8', '#4870c8'); c.fill();
  if (!o.u) { c.fillStyle = '#9cc0f4'; c.fillRect(1.8, by, 12.4, 1.2); }
  c.fillStyle = 'rgba(255,255,255,.22)'; for (let yy = by + 3; yy < b - 1; yy += 3.5) c.fillRect(2.4, yy, 11.2, .6);
}
function paintCrate(c) {
  rr(c, 1.6, 2.6, 12.8, 12.8, 1); c.fillStyle = lg(c, 0, 3, 0, 15, '#c08a52', '#9a6838'); c.fill();
  rr(c, 1.6, -3.4, 12.8, 6.4, [1, 1, 0, 0]); c.fillStyle = '#ddaa6e'; c.fill();
  c.fillStyle = '#b07c46'; c.fillRect(1.6, -1.4, 12.8, .4); c.fillRect(1.6, .8, 12.8, .4);
  c.strokeStyle = '#7e5028'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(3, 4); c.lineTo(13, 14); c.moveTo(13, 4); c.lineTo(3, 14); c.stroke();
  c.strokeStyle = '#8a5a30'; c.lineWidth = .8; c.strokeRect(2.2, 3.2, 11.6, 11.6);
}
function paintPedestal(c) {
  rr(c, 2.6, 12, 10.8, 3.6, 1); c.fillStyle = '#8f8aa4'; c.fill();
  rr(c, 4.2, 3, 7.6, 10, .6); c.fillStyle = lg(c, 4.2, 0, 11.8, 0, '#e4e2ee', '#bdb8cf', '#9893ad'); c.fill();
  c.fillStyle = 'rgba(90,80,120,.25)'; c.fillRect(6, 4.5, .5, 7.5); c.fillRect(9.5, 4.5, .5, 7.5);
  el(c, 8, 3.2, 5, 2, '#8f8aa4'); el(c, 8, 2.8, 4.8, 1.8, '#d8d5e4'); el(c, 8, 2.8, 2.4, .8, '#a8a3bc');
}
function paintBrazier(c) {
  rr(c, 3, 12.4, 10, 3.2, 1); c.fillStyle = '#6e6a84'; c.fill();
  c.fillStyle = lg(c, 6, 0, 10, 0, '#8a86a0', '#b4b0c8', '#77738e'); c.fillRect(6.2, 8, 3.6, 5);
  c.beginPath(); c.moveTo(1.4, 4.6); c.quadraticCurveTo(2.2, 10, 8, 10); c.quadraticCurveTo(13.8, 10, 14.6, 4.6); c.closePath(); c.fillStyle = lg(c, 0, 4.6, 0, 10, '#a8a4bc', '#6e6a84'); c.fill();
  el(c, 8, 4.6, 6.6, 1.8, '#5a566e'); el(c, 8, 4.8, 5.4, 1.2, '#2a1a1a');
  c.strokeStyle = '#c8c4da'; c.lineWidth = .5; c.beginPath(); c.ellipse(8, 4.6, 6.6, 1.8, 0, PI, TAU); c.stroke();
}
// Tall-grass tufts (G) and marsh reeds (q): back clumps + front clumps; the front ones alone are reused by grassOver.
const TUFT = {
  G: { base: '#2c7a2a', mid: '#57b640', tip: '#b6ee7a', obase: '#24672a', omid: '#46a034', otip: '#8fd85e', hs: 1, bw: 2.5 },
  q: { base: '#1f5a44', mid: '#3c9a70', tip: '#a4ecc4', obase: '#1a4c3a', omid: '#2f8460', otip: '#7ed2a4', hs: 1.15, bw: 1.9 },
};
function clump(c, P, cx, by, sc, sway, cat) {
  softShadow(c, cx, by - .3, 4.6 * sc, 1.5 * sc, .35);
  const bl = [[-3.4, 7.5, -1], [3.4, 7.5, 1], [-1.8, 10.5, -.6], [1.8, 10.5, .6], [0, 12, 0]];
  for (let i = 0; i < bl.length; i++) {
    const [off, hh, lb] = bl[i], h = hh * sc * P.hs, bx = cx + off * .55 * sc, lean = off * .9 * sc + lb + sway * (h / 12), w = P.bw * sc;
    const outer = i < 2;
    c.fillStyle = lg(c, 0, by, 0, by - h, outer ? P.obase : P.base, outer ? P.omid : P.mid, outer ? P.otip : P.tip);
    c.beginPath(); c.moveTo(bx - w / 2, by); c.quadraticCurveTo(bx - w * .4 + lean * .25, by - h * .55, bx + lean, by - h); c.quadraticCurveTo(bx + w * .4 + lean * .55, by - h * .5, bx + w / 2, by); c.closePath(); c.fill();
    if (cat && i === 4) { c.save(); c.translate(bx + lean * .9, by - h + .6); c.rotate(lean * .06); rf(c, -.9, -1.2, 1.8, 3.6, .9, '#8a5a34'); c.restore(); }
  }
}
function paintTuft(c, ch, v, fi, front) {
  const P = TUFT[ch], th = fi / 8 * TAU;
  if (v & 1) { c.translate(16, 0); c.scale(-1, 1); }
  const sb = Math.sin(th) * 1.5, sf = Math.sin(th - .7) * 1.5;
  if (!front) { clump(c, P, 2.6, 8.2, .95, sb, false); clump(c, P, 13.4, 8.6, .9, sb, ch === 'q' && v === 2); clump(c, P, 8, 7.6, 1, sb, false); }
  clump(c, P, 4.6, 15.6, .86, sf, false); clump(c, P, 11.4, 15.8, .82, sf, ch === 'q' && v === 1);
}
const tuftFrame = (t, x, y) => ((t / 9 + x * 1.7 + y * .9) | 0) & 7;

// Shared effect sprites
const glowSprite = (col, a) => make('glow' + col + a, 32, 32, c => { c.fillStyle = rgr(c, 16, 16, 16, rgba(col, a), rgba(col, a * .45), rgba(col, 0)); c.fillRect(0, 0, 32, 32); });
const starSprite = () => make('star', 8, 8, c => {
  c.fillStyle = rgr(c, 4, 4, 4, 'rgba(255,255,255,.9)', 'rgba(255,255,255,0)'); c.fillRect(0, 0, 8, 8);
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(4.4, 3.6, 8, 4); c.quadraticCurveTo(4.4, 4.4, 4, 8); c.quadraticCurveTo(3.6, 4.4, 0, 4); c.quadraticCurveTo(3.6, 3.6, 4, 0); c.fill();
});
const puffSprite = () => make('puff', 8, 8, c => { c.fillStyle = rgr(c, 4, 4, 4, 'rgba(255,255,255,.8)', 'rgba(240,240,250,.5)', 'rgba(240,240,250,0)'); c.fillRect(0, 0, 8, 8); });
const glintSprite = () => make('glint', 16, 16, c => {
  rr(c, 4, 3.8, 8, 6.4, 1.4); c.clip(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.moveTo(4.6, 10.2); c.lineTo(8, 3.8); c.lineTo(10, 3.8); c.lineTo(6.6, 10.2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(8, 10.2); c.lineTo(11.4, 3.8); c.lineTo(12, 3.8); c.lineTo(8.8, 10.2); c.fill();
});
function fxLamp(ctx, sx, sy, t, p) {
  const a = .6 + .14 * Math.sin(t / 19 + p.ph * TAU) + .05 * Math.sin(t / 5.3 + p.ph * 9);
  ctx.globalAlpha = a; ctx.drawImage(glowSprite('#ffd27a', .5), sx + 8 - 15, sy - 10.4 - 15, 30, 30); ctx.globalAlpha = 1;
}
function fxCrystal(ctx, sx, sy, t, p) {
  ctx.globalAlpha = .35 + .25 * Math.sin(t / 30 + p.ph * TAU); ctx.drawImage(glowSprite(p.gc, .5), sx - 4, sy - 8, 24, 24); ctx.globalAlpha = 1;
  const k = (t + p.ph * 240) % 240; if (k < 24) { const s = Math.sin(k / 24 * PI) * 7; ctx.drawImage(starSprite(), sx + 8 - s / 2 + .5, sy - 3 - s / 2, s, s); }
}
function fxWindow(ctx, sx, sy, t, p) {
  const k = (t + p.ph * 400) % 400; if (k > 40) return;
  ctx.globalAlpha = Math.sin(k / 40 * PI); ctx.drawImage(glintSprite(), sx, sy, 16, 16); ctx.globalAlpha = 1;
}
function fxSmoke(ctx, sx, sy, t, p) {
  const P = puffSprite();
  for (let k = 0; k < 3; k++) {
    const f = ((t / 110 + k / 3 + p.ph) % 1), s = 2.5 + f * 5;
    ctx.globalAlpha = (1 - f) * .55 * Math.min(1, f * 6);
    ctx.drawImage(P, sx + 5.3 + f * 5 + Math.sin(t / 30 + k * 2) * 1.2 - s / 2, sy - 10 - f * 15 - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}
function fxScreen(ctx, sx, sy, t, p) {
  const k = (t / 2) % 7; ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(sx + 4, sy - 5 + k, 8, .6);
}
function fxMachine(ctx, sx, sy, t) {
  if ((t >> 5) & 1) { ctx.fillStyle = 'rgba(120,255,190,.9)'; ctx.beginPath(); ctx.arc(sx + 13, sy + 11, .7, 0, TAU); ctx.fill(); }
}

const isRoofOrWall = ch => BLD(ch);
function propSpec(s, m, x, y) {
  const ch = m.t[y][x], v = (hash(x, y, 1) * 4) | 0, ph = hash(x, y, 2), yb = (y + 1) * 16;
  const sm = (f, oob) => mask(m, x, y, f, oob);
  switch (ch) {
    case '#': return spec('tree' + (v % 3), -5, -17.5, 26, 33.5, c => paintTree(c, v % 3), { yb, br: .014, ph });
    case 'n': return spec('pine' + (v % 2), -2, -13, 20, 29, c => paintPine(c, v % 2), { yb, br: .01, ph });
    case 'u': return spec('bush' + (v % 3), -2, -2.5, 20, 19, c => paintBush(c, v % 3), { yb, br: .02, ph });
    case 'd': { const l = at(m, x - 1, y) === 'd', r = at(m, x + 1, y) === 'd', lg_ = l || r;
      return spec('stump' + v + (lg_ ? 'L' + (+l) + (+r) : ''), 0, 0, 16, 16, c => paintStump(c, v % 3, lg_ ? { l, r } : null), { yb }); }
    case 'r': return spec('rock' + (v % 3), -1, -1, 18, 17, c => paintRock(c, v % 3), { yb });
    case 'i': return spec('cry' + (v % 3), 0, -4, 16, 20, c => paintCrystal(c, v % 3), { yb, ph, fx: fxCrystal, gc: CRY[v % 3][1] });
    case 'l': return spec('lamp', 2, -19, 12, 35, paintLamp, { yb, ph, fx: fxLamp });
    case 's': return spec('sign', 0, -1.5, 16, 17.5, paintSign, { yb });
    case 'F': { const ms = sm(inSet('FY'), false); return spec('fence' + ms, 0, -6, 16, 22.6, c => paintFence(c, ms), { yb }); }
    case 'Y': { const ms = sm(inSet('FY'), false); return spec('gate' + ms, 0, -6, 16, 22.6, c => paintGate(c, ms), { yb }); }
    case 'X': { const stake = hash(x, y, 7) < .04; return spec('thicket' + v + (+stake), -3.5, -10, 23, 26, c => paintThicket(c, v, stake), { yb, br: .008, ph }); }
    case 'j': return spec('crop' + v, 0, -5, 16, 20, (c, fi) => paintCrops(c, v, fi), { yb, n: 4, anim: (t, tx, ty) => ((t / 14 + tx * 1.3 + ty) | 0) & 3 });
    case 'G': case 'q': return spec('tuft' + ch + (v & 3), -4, -6, 24, 23, (c, fi) => paintTuft(c, ch, v & 3, fi, false), { yb: y * 16 + 15.9, n: 8, anim: tuftFrame });
    case 'R': case 'Q': case 'A': {
      const l = ROOF(at(m, x - 1, y)), r = ROOF(at(m, x + 1, y)), u = ROOF(at(m, x, y - 1)), eave = !ROOF(at(m, x, y + 1));
      let ri = 0; while (ri < 3 && ROOF(at(m, x, y - ri - 1))) ri++;
      const chim = !u && l && !ROOF(at(m, x - 2, y)) && r && ROOF(at(m, x + 2, y)) && hash(x, y, 5) < .7;
      let wy = y; while (wy < m.t.length - 1 && ROOF(at(m, x, wy + 1))) wy++; if (WALL(at(m, x, wy + 1))) wy++;
      const X0 = l ? 0 : -2, X1 = r ? 16 : 18, Y0 = u ? 0 : -3.2, top = chim ? -10.4 : Y0, bot = eave ? 18.6 : 16;
      const o = { l, r, u, eave, ri, chim };
      return spec('roof' + ch + (+l) + (+r) + (+u) + (+eave) + ri + (+chim), X0, top, X1 - X0, bot - top, c => paintRoof(c, ch, o), { yb: (wy + 1) * 16 + .05, ph, fx: chim ? fxSmoke : null });
    }
    case 'W': case 'N': case 'D': {
      const l = BLD(at(m, x - 1, y)) && !ROOF(at(m, x - 1, y)), r = BLD(at(m, x + 1, y)) && !ROOF(at(m, x + 1, y)), roof = ROOF(at(m, x, y - 1));
      const o = { l, r, roof, v };
      return spec('wall' + ch + (+l) + (+r) + (+roof) + (ch === 'N' ? v : ''), 0, 0, 16, ch === 'D' ? 17 : 16, c => paintWall(c, ch, o), { yb, ph, fx: ch === 'N' ? fxWindow : null });
    }
    case 'H': { const l = at(m, x - 1, y) === 'H', r = at(m, x + 1, y) === 'H', j = at(m, x, y + 1) === 'J', o = { l, r };
      return spec('awn' + (+l) + (+r), l ? 0 : -1, 0, 16 + (l ? 0 : 1) + (r ? 0 : 1), 17.2, c => paintAwning(c, o), { yb: (y + (j ? 2 : 1)) * 16 + .05 }); }
    case 'J': { const l = at(m, x - 1, y) === 'J', r = at(m, x + 1, y) === 'J';
      let a = 0, b = 0; while (a < 4 && at(m, x - a - 1, y) === 'J') a++; while (b < 4 && at(m, x + b + 1, y) === 'J') b++;
      const cx = Math.abs(b - a) <= 1 ? 8 + (b - a) * 8 : null, o = { l, r, cx };
      return spec('hjc' + (+l) + (+r) + cx, 0, -3, 16, 19, c => paintCounterJ(c, o), { yb }); }
    case 'K': { const ms = sm(inSet('K'), false); return spec('pen' + ms, 0, -6, 16, 22, c => paintPen(c, ms), { yb }); }
    case 'k': { const o = { l: at(m, x - 1, y) === 'k', r: at(m, x + 1, y) === 'k' }; return spec('ctr' + (+o.l) + (+o.r), 0, -4, 16, 20, c => paintCounterK(c, o), { yb }); }
    case 'S': return spec('shelf' + v, 0, -11.5, 16, 27.5, c => paintShelf(c, v), { yb });
    case 'h': return spec('mach', 0, -6.5, 16, 22.5, paintMachine, { yb, fx: fxMachine });
    case 'P': return spec('pc', 0, -6.5, 16, 22.5, paintPC, { yb, fx: fxScreen });
    case 't': { const ms = sm(inSet('t'), false), o = { u: ms & 1, r: ms & 2, d: ms & 4, l: ms & 8 }; return spec('tbl' + ms + (ms ? '' : v % 2), 0, -3, 16, 19.5, c => paintTable(c, o, v), { yb }); }
    case 'b': { const o = { u: at(m, x, y - 1) === 'b', d: at(m, x, y + 1) === 'b' }; return spec('bed' + (+o.u) + (+o.d), 0, -6, 16, 23, c => paintBed(c, o), { yb }); }
    case 'x': return spec('crate', 0, -4, 16, 20, paintCrate, { yb });
    case 'O': return spec('ped', 0, 0, 16, 16, paintPedestal, { yb });
    case 'L': return spec('braz', 0, 2, 16, 14, paintBrazier, { yb });
  }
  return null;
}

// Prop pool: reused { y, draw } objects so collecting props allocates nothing per frame.
const pool = []; let poolN = 0;
function drawPooled(ctx) {
  const p = this.p, t = this.t;
  const img = spr(p, p.n > 1 ? p.anim(t, this.tx, this.ty) : 0);
  if (p.br) {
    const k = 1 + p.br * Math.sin(t / 55 + p.ph * TAU), w = p.w * k, h = p.h * (1 + (1 - k) * .6);
    ctx.drawImage(img, this.sx + p.dx - (w - p.w) / 2, this.sy + p.dy + p.h - h, w, h);
  } else ctx.drawImage(img, this.sx + p.dx, this.sy + p.dy, p.w, p.h);
  if (p.fx) p.fx(ctx, this.sx, this.sy, t, p);
}

// ---- Objects (drawObject) -----------------------------------------------------------
const itemOrb = () => make('itemorb', 12, 12, c => {
  el(c, 6, 6, 5, 5, '#3a3a4c');
  c.save(); c.beginPath(); c.arc(6, 6, 4.4, 0, TAU); c.clip();
  c.fillStyle = rgr(c, 4.4, 3.6, 7, '#ff9a8a', '#f2423e', '#b8202a'); c.fillRect(0, 0, 12, 6);
  c.fillStyle = rgr(c, 4.4, 7, 7, '#ffffff', '#e8e8f0', '#b8b8c8'); c.fillRect(0, 6, 12, 6);
  c.fillStyle = '#3a3a4c'; c.fillRect(0, 5.4, 12, 1.2);
  c.restore();
  el(c, 6, 6, 1.7, 1.7, '#3a3a4c'); el(c, 6, 6, 1.1, 1.1, '#ffffff');
  el(c, 4, 3.4, 1.4, .8, 'rgba(255,255,255,.85)');
});
const eggOrb = col => make('egg' + col, 14, 16, c => {
  c.beginPath(); c.ellipse(7, 8.6, 5.6, 6.8, 0, 0, TAU); c.fillStyle = shade(col, .6); c.fill();
  c.beginPath(); c.ellipse(7, 8.4, 5.2, 6.4, 0, 0, TAU); c.fillStyle = rgr(c, 5.2, 5.4, 9, shade(col, 1.7), shade(col, 1.15), col, shade(col, .75)); c.fill();
  c.strokeStyle = rgba(shade(col, 1.8), .7); c.lineWidth = .7; c.beginPath(); c.arc(7, 9, 2.6, -.5, 2.6); c.stroke();
  el(c, 4.8, 5, 1.6, 2.2, 'rgba(255,255,255,.75)'); el(c, 9, 12, 1, .6, 'rgba(255,255,255,.35)');
});
const gem = on => make('gem' + on, 10, 12, c => {
  const cols = on ? ['#ffd27a', '#ff9a3a', '#c8602a', '#fff4c8'] : ['#9a96ac', '#6e6a84', '#4a4660', '#c4c0d4'];
  c.beginPath(); c.moveTo(5, .6); c.lineTo(9, 4.6); c.lineTo(5, 11.4); c.lineTo(1, 4.6); c.closePath(); c.fillStyle = cols[2]; c.fill();
  c.beginPath(); c.moveTo(5, 1.4); c.lineTo(8.2, 4.6); c.lineTo(5, 10.4); c.closePath(); c.fillStyle = cols[1]; c.fill();
  c.beginPath(); c.moveTo(5, 1.4); c.lineTo(1.8, 4.6); c.lineTo(5, 10.4); c.closePath(); c.fillStyle = cols[0]; c.fill();
  c.beginPath(); c.moveTo(1.8, 4.6); c.lineTo(5, 1.4); c.lineTo(8.2, 4.6); c.lineTo(5, 5.6); c.closePath(); c.fillStyle = cols[3]; c.fill();
});
const flameFrame = fi => make('flame' + fi, 12, 22, c => {
  const ph = fi / 8 * TAU;
  const tongue = (cx, by, w, h, lean, col) => { c.beginPath(); c.moveTo(cx + lean, by - h); c.bezierCurveTo(cx + w * .5 + lean * .3, by - h * .6, cx + w * .62, by - w * .2, cx, by); c.bezierCurveTo(cx - w * .62, by - w * .2, cx - w * .5 + lean * .3, by - h * .6, cx + lean, by - h); c.fillStyle = col; c.fill(); };
  const g1 = lg(c, 0, 20, 0, 2, '#ff5a2a', '#ff8a30', 'rgba(255,170,60,.85)');
  tongue(3.4, 20, 4.4, 9 + Math.sin(ph * 2 + 1) * 2, -1.6 + Math.sin(ph) * .8, g1);
  tongue(8.6, 20, 4.4, 10 + Math.sin(ph * 2 + 3) * 2, 1.6 + Math.sin(ph + 2) * .8, g1);
  tongue(6, 20.4, 9.6, 17 + Math.sin(ph) * 1.6, Math.sin(ph) * 1.4, g1);
  tongue(6, 20.4, 6.6, 12 + Math.sin(ph + 1) * 1.4, Math.sin(ph + .6) * 1, lg(c, 0, 20, 0, 6, '#ffb83a', '#ffe070'));
  tongue(6, 20.4, 3.6, 7 + Math.sin(ph * 2) * 1, Math.sin(ph + 1.2) * .6, '#fff8d0');
});

// ---- Ambient overlay sprites --------------------------------------------------------
const petalFrame = (i, kind) => make('pet' + kind + i, 4, 4, c => {
  c.translate(2, 2); c.rotate(i / 8 * PI); c.scale(1, .45 + .55 * Math.abs(Math.cos(i / 8 * PI * 2)));
  c.beginPath(); c.ellipse(0, 0, 1.5, .9, 0, 0, TAU); c.fillStyle = kind ? '#8fd86a' : '#ffb8d2'; c.fill();
  c.beginPath(); c.ellipse(-.4, -.2, .6, .35, 0, 0, TAU); c.fillStyle = kind ? '#c6f0a0' : '#ffe4ee'; c.fill();
});
const BUTTER = ['#ffffff', '#ffe066', '#ffa8d0', '#a8d8ff'];
const butterFrame = (col, f) => make('bf' + col + f, 8, 6, c => {
  const s = f ? .35 : 1;
  c.fillStyle = col; c.strokeStyle = shade(col, .6); c.lineWidth = .3;
  for (const d of [-1, 1]) { c.beginPath(); c.ellipse(4 + d * 1.8 * s, 2.3, 1.9 * s, 1.6, d * .3, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.ellipse(4 + d * 1.3 * s, 4.1, 1.2 * s, 1, -d * .3, 0, TAU); c.fill(); c.stroke(); }
  c.fillStyle = '#4a3a30'; c.fillRect(3.7, 1.6, .6, 3.4);
});
let vign = null;
const vignette = () => vign || (vign = make('vign', 240, 160, c => {
  const g = c.createRadialGradient(120, 80, 50, 120, 80, 150); g.addColorStop(0, 'rgba(10,6,24,0)'); g.addColorStop(1, 'rgba(10,6,24,.55)'); c.fillStyle = g; c.fillRect(0, 0, 240, 160);
}));
const mod = (a, b) => ((a % b) + b) % b;

let lastCx = 0, lastCy = 0;

// ---- Public API ---------------------------------------------------------------------
G.terrain = {
  drawGround(ctx, m, x0, y0, x1, y1, cx, cy, t) {
    const s = mapState(m); lastCx = cx; lastCy = cy;
    const wf = ((t / 10) | 0) & 7;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * s.w + x, g = s.g[i] || groundInfo(s, m, x, y);
      const fi = g.n === 8 ? wf : g.n === 4 ? (((t / 16) | 0) + x + y * 2) & 3 : 0;
      ctx.drawImage(groundImg(g, fi), x * 16 - cx, y * 16 - cy, 16, 16);
    }
  },
  collectProps(m, x0, y0, x1, y1, cx, cy, t, out) {
    const s = mapState(m); poolN = 0;
    const xa = Math.max(0, x0 - 1), xb = Math.min(s.w - 1, x1 + 1), ya = Math.max(0, y0 - 1), yc = Math.min(s.h - 1, y1);
    for (let y = ya; y <= yc; y++) for (let x = xa; x <= xb; x++) {
      const i = y * s.w + x; let p = s.p[i];
      if (p === undefined) p = s.p[i] = propSpec(s, m, x, y);
      if (!p) continue;
      const sx = x * 16 - cx, sy = y * 16 - cy;
      if (sx + p.dx > G.W || sx + p.dx + p.w < 0 || sy + p.dy > G.H || sy + p.dy + p.h < 0) continue;
      let o = pool[poolN]; if (!o) o = pool[poolN] = { y: 0, draw: drawPooled, p: null, sx: 0, sy: 0, t: 0, tx: 0, ty: 0 };
      poolN++; o.y = p.yb; o.p = p; o.sx = sx; o.sy = sy; o.t = t; o.tx = x; o.ty = y; out.push(o);
    }
  },
  // kind: 'orb' {color} | 'pedestal' {on} | 'brazier' {lit, level 0..3} | 'ball'; (x, y) = tile top-left in logical px
  drawObject(ctx, kind, x, y, t, info) {
    info = info || {};
    if (kind === 'ball') {
      const b = Math.abs(Math.sin(t / 26 + x * .1)) * 1.4;
      ctx.globalAlpha = .3 - b * .08; ctx.drawImage(glowSprite('#1a3020', .9), x + 3.5, y + 11.5, 9, 4); ctx.globalAlpha = 1;
      if (G.drawOrb) G.drawOrb(ctx, info.style || 'terra', x + 8, y + 8.5 - b, 11, 0); else ctx.drawImage(itemOrb(), x + 2.5, y + 3 - b, 11, 11);
      const k = (t + x * 7 + y * 3) % 150; if (k < 26) { const s = Math.sin(k / 26 * PI) * 6; ctx.drawImage(starSprite(), x + 11 - s / 2, y + 4 - b - s / 2, s, s); }
    } else if (kind === 'orb') {
      const col = info.color || '#f0a040', b = Math.sin(t / 22 + x) * 1.2;
      ctx.globalAlpha = .55 + .2 * Math.sin(t / 17 + x); ctx.drawImage(glowSprite(col, .6), x - 4, y - 13 + b, 24, 24); ctx.globalAlpha = 1;
      ctx.drawImage(eggOrb(col), x + 2.5, y - 9 + b, 11, 12.6);
      const k = (t + x * 5) % 120; if (k < 22) { const s = Math.sin(k / 22 * PI) * 5; ctx.drawImage(starSprite(), x + 11 - s / 2, y - 7 + b - s / 2, s, s); }
    } else if (kind === 'pedestal') {
      const on = !!info.on, b = on ? Math.sin(t / 20 + x) * .8 : 0;
      if (on) { ctx.globalAlpha = .6 + .25 * Math.sin(t / 14 + x); ctx.drawImage(glowSprite('#ffc860', .7), x - 6, y - 12, 28, 28); ctx.globalAlpha = 1; }
      ctx.drawImage(gem(on), x + 4, y - 6.5 + b, 8, 9.6);
      if (on) { const k = (t + x * 9) % 90; if (k < 20) { const s = Math.sin(k / 20 * PI) * 5; ctx.drawImage(starSprite(), x + 11 - s / 2, y - 5 - s / 2, s, s); } }
    } else if (kind === 'brazier') {
      const lit = !!info.lit, lv = info.level || 0, sc = lit ? 1.5 : .3 + lv * .24;
      const ga = lit ? .85 + .1 * Math.sin(t / 7) : .45 + .08 * Math.sin(t / 9);
      ctx.globalAlpha = ga; const gr = lit ? 52 : 14 + lv * 9; ctx.drawImage(glowSprite('#ffb84a', lit ? .6 : .45), x + 8 - gr / 2, y + 2 - gr / 2, gr, gr); ctx.globalAlpha = 1;
      const fi = ((t / 4) | 0) & 7, w = 12 * sc, h = 22 * sc;
      ctx.drawImage(flameFrame(fi), x + 8 - w / 2, y + 5.6 - 20.4 / 22 * h, w, h);
      const n = lit ? 7 : lv * 2;
      for (let k = 0; k < n; k++) {
        const f = (t / 50 + k * .37) % 1, ex = x + 8 + Math.sin(k * 2.3 + t / 17) * 4 * f, ey = y + 4 - f * 22 * sc - 2;
        ctx.globalAlpha = 1 - f; ctx.drawImage(glowSprite('#ffd27a', 1), ex - 1.2, ey - 1.2, 2.4, 2.4);
      }
      ctx.globalAlpha = 1;
    }
  },
  grassOver(ctx, ch, x, y, t) {
    if (!TUFT[ch]) return;
    const tx = Math.round((x + lastCx) / 16), ty = Math.round((y + lastCy) / 16), v = (hash(tx, ty, 1) * 4) | 0, fi = tuftFrame(t, tx, ty);
    ctx.drawImage(make('front' + ch + v + '#' + fi, 24, 23, c => { c.translate(4, 6); paintTuft(c, ch, v, fi, true); }), x - 4, y - 6, 24, 23);
  },
  drawOverlay(ctx, m, x0, y0, x1, y1, cx, cy, t) {
    const s = mapState(m), W = G.W, H = G.H;
    if (s.amb === 1) {
      for (let i = 0; i < 14; i++) {
        const a = hash(i, 1, 9), b = hash(i, 2, 9), sp = .18 + hash(i, 3, 9) * .2;
        const px = mod(a * 997 + t * sp - cx, W + 40) - 20, py = mod(b * 613 + t * sp * .45 - cy + Math.sin(t / 47 + i) * 8, H + 30) - 15;
        ctx.drawImage(petalFrame(((t / 9 + i * 3) | 0) & 7, i % 4 === 0 ? 1 : 0), px, py, 4, 4);
      }
      for (let i = 0; i < 4; i++) {
        const a = hash(i, 4, 9), b = hash(i, 5, 9);
        const px = mod(a * 811 + Math.sin(t / 170 + i * 2) * 70 + t * .12 - cx, W + 60) - 30, py = mod(b * 517 + Math.sin(t / 97 + i * 3) * 26 - cy, H + 40) - 20 + Math.sin(t / 11 + i) * 2.5;
        ctx.drawImage(butterFrame(BUTTER[i], ((t / 5 + i) | 0) & 1), px, py, 7, 5.2);
      }
    }
    if (s.amb === 0 || s.amb === 1) {   // sparkles on visible water
      const P = starSprite(); let n = 0;
      for (let y = y0; y <= y1 && n < 24; y++) for (let x = x0; x <= x1 && n < 24; x++) {
        if (m.t[y][x] !== 'w') continue;
        const off = hash(x, y, 3) * 90, cyc = ((t + off) / 90) | 0;
        if (hash(x, y, cyc) > .12) continue;
        const life = ((t + off) % 90) / 90, sz = Math.sin(life * PI) * 4.5;
        if (sz < .3) continue; n++;
        ctx.drawImage(P, x * 16 - cx + 3 + hash(x, cyc, 7) * 10 - sz / 2, y * 16 - cy + 3 + hash(y, cyc, 8) * 10 - sz / 2, sz, sz);
      }
    }
    if (s.amb === 2) {
      ctx.drawImage(vignette(), 0, 0, W, H);
      const cols = ['#c8ff9a', '#9ae8ff', '#ffe08a'];
      for (let i = 0; i < 16; i++) {
        const a = hash(i, 6, 9), b = hash(i, 7, 9);
        const px = mod(a * 911 + Math.sin(t / 140 + i * 1.3) * 40 + t * .05 - cx, W + 40) - 20, py = mod(b * 577 + Math.cos(t / 120 + i * 2.1) * 30 - t * .04 - cy, H + 40) - 20;
        const al = .35 + .65 * Math.max(0, Math.sin(t / 37 + i * 2.4)); if (al < .4) continue;
        ctx.globalAlpha = al; ctx.drawImage(glowSprite(cols[i % 3], .9), px - 3, py - 3, 6, 6);
      }
      ctx.globalAlpha = 1;
    }
    if (s.amb === 3) {   // indoor dust motes in the light
      for (let i = 0; i < 8; i++) {
        const a = hash(i, 8, 9), b = hash(i, 9, 9);
        const px = mod(a * 400 + Math.sin(t / 150 + i) * 20 + t * .03, W), py = mod(b * 300 - t * .05 + Math.sin(t / 90 + i) * 6, H);
        ctx.globalAlpha = .25 + .25 * Math.sin(t / 40 + i * 2); ctx.drawImage(glowSprite('#fff2c8', 1), px - 1.5, py - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
  },
};
})();
