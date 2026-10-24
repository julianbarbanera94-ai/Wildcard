// Sprites: creature and character art, drawn procedurally as smooth vector shapes (soft gradients, outlines a
// little darker than the fill, a top-left highlight), cached into canvases at first use, plus the overworld helpers.
(function () {
const G = globalThis.G;
const { cv } = G;
const TAU = Math.PI * 2;

// ---- Colour helpers ----------------------------------------------------------
function hslOf(hex) {
  const [r, g, b] = G.rgbOf(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  return [h, s, l];
}
function hsl(h, s, l) {
  h = ((h % 1) + 1) % 1; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return '#' + [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
// adj: shift lightness by dl, multiply saturation by sm, rotate hue by dh (turns). Darkening also warms/saturates a bit.
function adj(c, dl, sm = 1, dh = 0) { const [h, s, l] = hslOf(c); return hsl(h + dh, s * sm * (dl < 0 ? 1.08 : 1), l + dl); }
const lineOf = c => { const [h, s, l] = hslOf(c); return hsl(h, Math.min(1, s * 1.1 + .08), l * .56); };
const vivid = c => { const [h, s, l] = hslOf(c); return hsl(h, Math.min(1, s * 1.18 + .05), Math.min(.72, l + .05)); };
const okCol = v => typeof v === 'string' && /^(#[0-9a-f]{3}|#[0-9a-f]{6}([0-9a-f]{2})?|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+.*\))$/i.test(v.trim());
function rgba(c, a) { const [r, g, b] = G.rgbOf(c); return `rgba(${r},${g},${b},${a})`; }

// ---- Painting primitives (all in design units) --------------------------------
let LW = 1.6;
function paint(x, path, base, cx, cy, r, o = {}) {
  x.beginPath(); path(x);
  if (o.flat) x.fillStyle = base;
  else {
    const g = x.createRadialGradient(cx - r * .38, cy - r * .45, r * .05, cx - r * .12, cy - r * .12, r * 1.3);
    g.addColorStop(0, adj(base, o.hi === undefined ? .15 : o.hi)); g.addColorStop(.55, base); g.addColorStop(1, adj(base, -(o.lo === undefined ? .15 : o.lo)));
    x.fillStyle = g;
  }
  x.fill();
  if (o.line !== false) { x.lineWidth = o.lw || LW; x.strokeStyle = o.line || lineOf(base); x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(); }
}
const ellP = (cx, cy, rx, ry, rot) => p => p.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU);
function E(x, cx, cy, rx, ry, base, o = {}) { paint(x, ellP(cx, cy, rx, ry, o.rot), base, cx, cy, Math.max(rx, ry), o); }
function shine(x, cx, cy, rx, ry, a = .7) {
  x.save(); x.translate(cx, cy); x.scale(1, ry / rx);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.45, `rgba(255,255,255,${a * .5})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill(); x.restore();
}
function stroke(x, path, col, w) { x.beginPath(); path(x); x.lineWidth = w; x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); }
// Smooth closed curve through points (midpoint quadratic smoothing).
function smoothPath(pts) {
  return p => {
    const n = pts.length, m = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
    const s = m(n - 1); p.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const e = m(i); p.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); }
    p.closePath();
  };
}
// Scalloped (fluffy) ellipse outline.
function fluffPath(cx, cy, rx, ry, n, bump, from = 0, to = TAU) {
  return p => {
    for (let i = 0; i <= n; i++) {
      const a = from + (to - from) * i / n, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (i === 0) { p.moveTo(x, y); continue; }
      const am = from + (to - from) * (i - .5) / n;
      p.quadraticCurveTo(cx + Math.cos(am) * (rx + bump), cy + Math.sin(am) * (ry + bump), x, y);
    }
    p.closePath();
  };
}
// Flame: teardrop with a curling tip, base centre (cx, by).
function flameP(cx, by, w, h, lean) {
  return p => {
    p.moveTo(cx - w / 2, by - h * .18);
    p.bezierCurveTo(cx - w * .55, by - h * .62, cx + lean * .2 - w * .15, by - h * .7, cx + lean, by - h);
    p.bezierCurveTo(cx + lean * .2 + w * .2, by - h * .72, cx + w * .62, by - h * .55, cx + w / 2, by - h * .18);
    p.bezierCurveTo(cx + w * .45, by + h * .05, cx - w * .45, by + h * .05, cx - w / 2, by - h * .18);
    p.closePath();
  };
}
function flame(x, cx, by, w, h, lean, o = {}) {
  const cols = o.cols || ['#ff5a2c', '#ff9a2a', '#ffe36a'];
  if (o.glow !== false) { const g = x.createRadialGradient(cx, by - h * .45, 0, cx, by - h * .45, h * .85); g.addColorStop(0, rgba(cols[1], .45)); g.addColorStop(1, rgba(cols[1], 0)); x.fillStyle = g; x.beginPath(); x.arc(cx, by - h * .45, h * .85, 0, TAU); x.fill(); }
  paint(x, flameP(cx, by, w, h, lean), cols[0], cx, by - h / 2, h / 2, { hi: .1, lo: .08 });
  paint(x, flameP(cx + lean * .05, by - h * .02, w * .66, h * .72, lean * .6), cols[1], cx, by - h / 3, h / 3, { line: false, hi: .1 });
  paint(x, flameP(cx + lean * .05, by - h * .03, w * .36, h * .42, lean * .3), cols[2], cx, by - h / 4, h / 4, { line: false, flat: true });
}
function leafP(bx, by, len, wid, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), T = (u, v) => [bx + c * u - s * v, by + s * u + c * v];
  return p => {
    const a = T(0, 0), b = T(len, 0), l1 = T(len * .45, -wid), l2 = T(len * .45, wid);
    p.moveTo(a[0], a[1]); p.quadraticCurveTo(l1[0], l1[1], b[0], b[1]); p.quadraticCurveTo(l2[0], l2[1], a[0], a[1]); p.closePath();
  };
}
function leaf(x, bx, by, len, wid, ang, col) {
  const c = Math.cos(ang), s = Math.sin(ang);
  paint(x, leafP(bx, by, len, wid, ang), col, bx + c * len * .45, by + s * len * .45, len * .5);
  stroke(x, p => { p.moveTo(bx + c * len * .12, by + s * len * .12); p.lineTo(bx + c * len * .78, by + s * len * .78); }, rgba(adj(col, .3), .8), LW * .7);
}
// Ear / spike / horn: a curved rounded cone from base centre (bx, by), pointing at angle ang.
function coneP(bx, by, len, w, ang, bend = 0) {
  const c = Math.cos(ang), s = Math.sin(ang), T = (u, v) => [bx + c * u - s * v, by + s * u + c * v];
  return p => {
    const a = T(0, -w / 2), b = T(0, w / 2), tip = T(len, bend * len), m1 = T(len * .55, -w * .42 + bend * len * .45), m2 = T(len * .55, w * .42 + bend * len * .45);
    p.moveTo(a[0], a[1]); p.quadraticCurveTo(m1[0], m1[1], tip[0], tip[1]); p.quadraticCurveTo(m2[0], m2[1], b[0], b[1]); p.closePath();
  };
}
function cone(x, bx, by, len, w, ang, col, bend, o) {
  paint(x, coneP(bx, by, len, w, ang, bend), col, bx + Math.cos(ang) * len * .4, by + Math.sin(ang) * len * .4, len * .55, o);
}
const onEll = (e, a, k = 1) => [e.cx + Math.cos(a) * e.rx * k, e.cy + Math.sin(a) * e.ry * k];
function bolt(x, bx, by, sc, col, flip = 1) {
  const pts = [[0, 0], [5, -6], [2, -7], [9, -15], [5, -16], [13, -27], [1, -15], [5, -14], [-3, -7], [1, -6]].map(([u, v]) => [bx + u * sc * flip, by + v * sc]);
  paint(x, p => { pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); }, col, bx + 5 * sc * flip, by - 13 * sc, 14 * sc);
}
function star(x, cx, cy, r, col, o) {
  paint(x, p => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; i ? p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } p.closePath(); }, col, cx, cy, r, o);
}
function sparkle(x, cx, cy, r, col) {
  x.fillStyle = col; x.beginPath();
  x.moveTo(cx, cy - r); x.quadraticCurveTo(cx, cy, cx + r, cy); x.quadraticCurveTo(cx, cy, cx, cy + r); x.quadraticCurveTo(cx, cy, cx - r, cy); x.quadraticCurveTo(cx, cy, cx, cy - r); x.fill();
}
// Cubic Bezier sampled into points (for tubes: tails, tentacles, necks, antlers).
function bezPts(p0, p1, p2, p3, n = 20) {
  const o = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); }
  return o;
}
// Closed outline of a tube along pts, width tapering w0 -> w1, rounded tip.
function tubeP(pts, w0, w1) {
  const n = pts.length, L = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); Rt.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  return p => {
    p.moveTo(L[0][0], L[0][1]); for (let i = 1; i < n; i++) p.lineTo(L[i][0], L[i][1]);
    const e = pts[n - 1], aL = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
    p.arc(e[0], e[1], Math.max(.2, w1 / 2), aL, aL - Math.PI, true);
    for (let i = n - 1; i >= 0; i--) p.lineTo(Rt[i][0], Rt[i][1]);
    p.closePath();
  };
}
function tube(x, pts, w0, w1, col, o) { const m = pts[pts.length >> 1]; paint(x, tubeP(pts, w0, w1), col, m[0], m[1], Math.max(w0, 6), o); }
// Spiral points around (cx, cy) from radius r0 to r1 over `turns`, starting at angle a0, direction dir (+1/-1).
function spiralPts(cx, cy, r0, r1, a0, turns, dir, n = 28) {
  const o = []; for (let i = 0; i <= n; i++) { const t = i / n, r = r0 + (r1 - r0) * t, a = a0 + dir * t * turns * TAU; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o;
}
function polyP(pts) { return p => { pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); }; }
function cogP(cx, cy, r, n) {
  return p => {
    const s = Math.PI / n;
    for (let i = 0; i < n; i++) {
      const a = i * 2 * s, pts = [[a - s * .55, r * .78], [a - s * .32, r], [a + s * .32, r], [a + s * .55, r * .78]];
      pts.forEach(([aa, rr], j) => { const px = cx + Math.cos(aa) * rr, py = cy + Math.sin(aa) * rr; i || j ? p.lineTo(px, py) : p.moveTo(px, py); });
    }
    p.closePath();
  };
}
function bubble(x, cx, cy, r, col) {
  const g = x.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(.75, rgba(col, .22)); g.addColorStop(1, rgba(col, .55));
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  x.lineWidth = Math.max(.7, r * .12); x.strokeStyle = rgba(lineOf(col), .55); x.stroke();
  shine(x, cx - r * .38, cy - r * .4, r * .32, r * .24, .95);
}
function gemShape(x, cx, cy, r, col) {
  const pts = [[cx, cy - r], [cx + r * .85, cy - r * .25], [cx + r * .55, cy + r * .8], [cx - r * .55, cy + r * .8], [cx - r * .85, cy - r * .25]];
  paint(x, polyP(pts), col, cx, cy, r, { hi: .3, lw: LW * .8 });
  x.fillStyle = rgba('#ffffff', .45); x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx - r * .85, cy - r * .25); x.lineTo(cx - r * .2, cy - r * .05); x.closePath(); x.fill();
  stroke(x, polyP([[cx - r * .45, cy - r * .1], [cx + r * .45, cy - r * .1], [cx + r * .2, cy + r * .5], [cx - r * .2, cy + r * .5]]), rgba('#ffffff', .5), LW * .5);
}
function flower5(x, cx, cy, r, col, mid) {
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; E(x, cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55, r * .48, r * .48, col, { lw: LW * .6, hi: .12 }); }
  E(x, cx, cy, r * .36, r * .36, mid || '#ffd84a', { lw: LW * .55 });
}

// ---- Faces -------------------------------------------------------------------
const INK = '#2a2036';
const EAR_ANG = { frill: 1.05, nub: .78, bunny: .3, bear: .72, fin: 1.3, leaf: .8, droopy: 1.0 };
const MOUTHS = new Set(['smile', 'cat', 'cheeky', 'open', 'fang', 'beak', 'grin', 'wisp', 'teeth', 'none']);
function eye(x, ex, ey, rx, ry, side, o) {
  const style = o.eye || 'normal';
  if (style === 'happy') { stroke(x, p => { p.moveTo(ex - rx * 1.05, ey + ry * .3); p.quadraticCurveTo(ex, ey - ry * .85, ex + rx * 1.05, ey + ry * .3); }, INK, rx * .55); return; }
  if (o.closed) { stroke(x, p => { p.moveTo(ex - rx * 1.05, ey + ry * .05); p.quadraticCurveTo(ex, ey + ry * .75, ex + rx * 1.05, ey + ry * .05); }, INK, rx * .55); return; }
  x.save();
  if (style === 'fierce' || style === 'sleepy') {
    const outer = ex + side * rx * 1.6, inner = ex - side * rx * 1.6;
    const oy = style === 'fierce' ? ey - ry * 1.25 : ey - ry * .05, iy = style === 'fierce' ? ey - ry * .3 : ey - ry * .05;
    x.beginPath(); x.moveTo(outer, oy); x.lineTo(inner, iy); x.lineTo(inner, ey + ry * 2); x.lineTo(outer, ey + ry * 2); x.closePath(); x.clip();
  }
  const g = x.createLinearGradient(0, ey - ry, 0, ey + ry);
  if (style === 'glow') { g.addColorStop(0, '#fffbe0'); g.addColorStop(1, o.iris || '#ffd84a'); }
  else { g.addColorStop(0, '#1b1426'); g.addColorStop(.5, '#2a2140'); g.addColorStop(1, o.iris || '#6a5aa8'); }
  x.fillStyle = g; x.beginPath(); x.ellipse(ex, ey, rx, ry, 0, 0, TAU); x.fill();
  if (style === 'glow') { x.fillStyle = rgba('#3a1a5a', .9); x.beginPath(); x.ellipse(ex + side * rx * .1, ey + ry * .1, rx * .35, ry * .55, 0, 0, TAU); x.fill(); }
  if (style === 'star') {
    x.fillStyle = rgba(o.iris || '#6a5aa8', .55); x.beginPath(); x.ellipse(ex, ey + ry * .15, rx * .72, ry * .62, 0, 0, TAU); x.fill();
    star(x, ex, ey + ry * .05, rx * .62, '#ffffff', { flat: true, line: false });
    sparkle(x, ex - rx * .42, ey - ry * .52, rx * .3, '#ffffff');
    x.restore(); return;
  }
  x.fillStyle = '#fff';
  x.beginPath(); x.ellipse(ex - rx * .3, ey - ry * .36, rx * .42, ry * .32, -.3, 0, TAU); x.fill();
  x.beginPath(); x.arc(ex + rx * .32, ey + ry * .42, rx * .19, 0, TAU); x.fill();
  if (style === 'round') { x.beginPath(); x.arc(ex + rx * .05, ey - ry * .05, rx * .1, 0, TAU); x.fill(); }
  x.restore();
  if (style === 'fierce') stroke(x, p => { p.moveTo(ex + side * rx * 1.35, ey - ry * 1.1); p.lineTo(ex - side * rx * 1.2, ey - ry * .38); }, o.brow || INK, rx * .5);
  if (style === 'sleepy') stroke(x, p => { p.moveTo(ex - rx * 1.1, ey - ry * .02); p.quadraticCurveTo(ex, ey + ry * .2, ex + rx * 1.1, ey - ry * .02); }, INK, rx * .4);
}
function face(x, h, o) {
  const rnd = o.eye === 'round';
  const ey = h.cy + h.ry * (o.eyeY || .08), sp = h.rx * (o.eyeSp || .42), rx = h.rx * (o.eyeR || (rnd ? .175 : .155)), ry = rx * (o.eyeAsp || (rnd ? 1.08 : 1.38));
  if (o.cheeks !== false) for (const s of [-1, 1]) E(x, h.cx + s * (sp + rx * .7), ey + ry * 1.25, rx * .95, ry * .4, o.cheek || '#ff8ab0', { flat: true, line: false });
  x.globalAlpha = 1;
  for (const s of [-1, 1]) eye(x, h.cx + s * sp, ey, rx, ry, s, o);
  const my = ey + ry * 1.45 + h.ry * (o.mouthY || 0), m = h.rx * .1, mc = o.mouthCol || lineOf(o.skin || '#c08060');
  let mouth = o.mouth || 'smile';
  if (!MOUTHS.has(mouth)) mouth = 'smile'; // unknown values fall back gracefully ('none' draws nothing)
  if (mouth === 'smile') stroke(x, p => { p.moveTo(h.cx - m, my); p.quadraticCurveTo(h.cx, my + m * 1.1, h.cx + m, my); }, mc, LW * .95);
  else if (mouth === 'cat') stroke(x, p => { p.moveTo(h.cx - m * 1.3, my); p.quadraticCurveTo(h.cx - m * .65, my + m * .9, h.cx, my); p.quadraticCurveTo(h.cx + m * .65, my + m * .9, h.cx + m * 1.3, my); }, mc, LW * .9);
  else if (mouth === 'cheeky') {
    paint(x, p => { p.moveTo(h.cx - m * 1.3, my - m * .2); p.quadraticCurveTo(h.cx, my + m * 1.9, h.cx + m * 1.3, my - m * .2); p.closePath(); }, '#9a3044', h.cx, my, m, { flat: true, line: mc, lw: LW * .8 });
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(h.cx + m * .3, my - m * .1); x.lineTo(h.cx + m * .95, my - m * .15); x.lineTo(h.cx + m * .62, my + m * .6); x.fill();
  } else if (mouth === 'open' || mouth === 'fang') {
    const w = m * (mouth === 'fang' ? 1.5 : 1.2);
    paint(x, p => { p.moveTo(h.cx - w, my - m * .25); p.quadraticCurveTo(h.cx, my - m * .05, h.cx + w, my - m * .25); p.quadraticCurveTo(h.cx + w * .8, my + m * 1.7, h.cx, my + m * 1.7); p.quadraticCurveTo(h.cx - w * .8, my + m * 1.7, h.cx - w, my - m * .25); p.closePath(); }, '#8a2a40', h.cx, my, m * 1.5, { flat: true, line: mc, lw: LW * .8 });
    E(x, h.cx, my + m * 1.1, w * .5, m * .45, '#ff8aa0', { flat: true, line: false });
    if (mouth === 'fang') { x.fillStyle = '#fff'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(h.cx + s * w * .78, my - m * .22); x.lineTo(h.cx + s * w * .3, my - m * .15); x.lineTo(h.cx + s * w * .56, my + m * .75); x.closePath(); x.fill(); } }
  } else if (mouth === 'beak') {
    const bw = h.rx * .17, by = ey + ry * .9;
    paint(x, p => { p.moveTo(h.cx - bw, by); p.quadraticCurveTo(h.cx, by - bw * .55, h.cx + bw, by); p.quadraticCurveTo(h.cx + bw * .4, by + bw * (o.hook ? 1.7 : 1.3), h.cx, by + bw * (o.hook ? 1.9 : 1.4)); p.quadraticCurveTo(h.cx - bw * .4, by + bw * (o.hook ? 1.7 : 1.3), h.cx - bw, by); p.closePath(); }, '#ffb43a', h.cx, by, bw * 1.4);
  } else if (mouth === 'grin') {
    const w = h.rx * .36;
    paint(x, p => { p.moveTo(h.cx - w, my - m * .6); p.quadraticCurveTo(h.cx, my + m * .2, h.cx + w, my - m * .6); p.quadraticCurveTo(h.cx, my + m * 2.4, h.cx - w, my - m * .6); p.closePath(); }, '#5a1a40', h.cx, my, w, { flat: true, line: mc, lw: LW * .8 });
    x.save(); x.clip(); x.fillStyle = '#fff'; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(h.cx + i * w * .26 - w * .11, my - m * .6); x.lineTo(h.cx + i * w * .26 + w * .11, my - m * .6); x.lineTo(h.cx + i * w * .26, my + m * .45); x.fill(); } x.restore();
  } else if (mouth === 'wisp') {
    const w = m * 1.6;
    paint(x, p => { p.moveTo(h.cx - w, my); p.quadraticCurveTo(h.cx - w * .5, my - m * .4, h.cx, my); p.quadraticCurveTo(h.cx + w * .5, my - m * .4, h.cx + w, my); p.quadraticCurveTo(h.cx, my + m * 2, h.cx - w, my); p.closePath(); }, '#3a1550', h.cx, my, w, { flat: true, line: false });
    x.fillStyle = '#fff'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(h.cx + s * w * .62, my - m * .05); x.lineTo(h.cx + s * w * .22, my - m * .1); x.lineTo(h.cx + s * w * .45, my + m * .7); x.fill(); }
  } else if (mouth === 'teeth') {
    stroke(x, p => { p.moveTo(h.cx - m * 1.1, my); p.quadraticCurveTo(h.cx, my + m * .6, h.cx + m * 1.1, my); }, mc, LW * .9);
    paint(x, p => { p.rect(h.cx - m * .7, my + m * .2, m * 1.4, m * 1.1); }, '#fffaf0', h.cx, my, m, { flat: true, line: mc, lw: LW * .6 });
    stroke(x, p => { p.moveTo(h.cx, my + m * .25); p.lineTo(h.cx, my + m * 1.25); }, mc, LW * .5);
  }
}

// ---- Species configuration ---------------------------------------------------
// Each entry tweaks the generic generator: palette, body shape, styles of the look features, face and extras.
const C = {
  1: { main: '#ff8a3d', belly: '#ffe6a8', ear: 'frill', mouth: 'cheeky', stubTail: true, iris: '#d0602a' },
  2: { main: '#ff7a35', belly: '#ffe0a0', ear: 'frill', tail: 'lizard', tailFlame: true, mouth: 'fang', iris: '#c84a20', claws: true },
  3: { main: '#f2602e', belly: '#ffd48a', acc: '#4a3550', horn: 'dark', tail: 'lizard', tailFlame: true, mouth: 'fang', eye: 'fierce', mane: true, claws: true, iris: '#ffb040', stripes: true },
  4: { main: '#4fa8ff', belly: '#c8eeff', body: 'drop', fin: 'side', mouth: 'open', iris: '#3a70c8' },
  5: { main: '#4a9cf5', belly: '#d8f2ff', acc: '#2e6fc0', shell: true, nozzles: true, fin: 'head', mouth: 'smile', flipper: true },
  6: { main: '#3f8ff0', belly: '#e0f4ff', acc: '#d8b05a', shell: true, shellSpikes: true, fin: 'crest', mouth: 'fang', eye: 'fierce', flipper: true },
  7: { main: '#78d65e', belly: '#fff3c0', leaf: 'sprout', mouth: 'open', iris: '#3a8a3a' },
  8: { main: '#5cc45a', belly: '#f4f0b8', leaf: 'hood', thorns: true, mouth: 'smile', iris: '#2a7a3a', vineArms: true },
  9: { main: '#56b850', belly: '#efe7b0', acc: '#a99a80', leaf: 'tree', rockBack: true, horn: 'rock', mouth: 'fang', eye: 'fierce', iris: '#2a6a2a' },
  10: { main: '#f0be82', belly: '#fff6e6', body: 'fluff', ear: 'fox', tail: 'fluff', mouth: 'cat', iris: '#8a5a30' },
  11: { main: '#eaa868', belly: '#fff4e4', body: 'fluff', ear: 'fox', tail: 'fluff', mouth: 'cat', ruff: true, iris: '#7a4a20', eyeAsp: 1.25 },
  12: { main: '#ffd43a', belly: '#fff3b8', ear: 'mouse', tail: 'bolt', mouth: 'cat', cheek: '#ff9a5a', iris: '#8a6020', backStripes: true },
  13: { main: '#ffcc2a', belly: '#fff1b0', ear: 'spark', tail: 'bolt', boltCol: '#5a9cff', mouth: 'smile', cheek: '#ffb04a', eye: 'fierce', iris: '#8a5a10', tuft: true, backStripes: true },
  14: { main: '#b9ab8e', belly: null, body: 'rock', legLift: 1.5, crystals: true, mouth: 'smile', iris: '#6a5a4a', cheek: '#ff9aa0' },
  15: { main: '#a89a7c', belly: null, acc: '#d4b468', body: 'rock', horn: 'rock', mouth: 'fang', eye: 'fierce', fists: true, crystals: true, iris: '#8a6a3a' },
  16: { main: '#9fb4ff', belly: '#fff6e8', wing: 'bird', tail: 'feather', mouth: 'beak', tuft3: true, iris: '#4a5aa8', birdFeet: true },
  17: { main: '#8f86e8', belly: '#fff4e0', acc: '#f4e8cc', wing: 'big', tail: 'feather', horn: 'crest', mouth: 'beak', hook: true, eye: 'fierce', iris: '#c88a20', birdFeet: true },
  18: { main: '#a8d838', belly: '#f2f8b0', body: 'cater', mouth: 'open', iris: '#4a7a20', spots: '#ffe040' },
  19: { main: '#6fae3a', belly: '#e8f0a0', acc: '#3f7a5a', body: 'beetle', horn: 'rhino', mouth: 'smile', eye: 'normal', iris: '#2a5a3a' },
  20: { main: '#b6cc3a', belly: '#f0f4b8', acc: '#a050c0', tail: 'stinger', mouth: 'fang', bugStripes: true, iris: '#7a2a9a' },
  21: { main: '#c99a62', belly: '#f4dcb4', ear: 'nub', mouth: 'teeth', paws: true, goggles: true, nose: true, eyeR: .12, iris: '#5a3a20' },
  22: { main: '#6a5a8a', belly: '#f4ead0', acc: '#ffcf4a', wing: 'moth', antenna: 'feather', mouth: 'fang', collar: true, float: true, iris: '#ffcf4a' },
  23: { main: '#8a62d8', belly: null, body: 'wisp', mouth: 'wisp', eye: 'glow', float: true, tail: 'none', cheeks: false },
  24: { main: '#ff86b6', belly: '#fff0f6', ear: 'cat', horn: 'moon', eye: 'sleepy', mouth: 'cat', tail: 'puff', stars: true, iris: '#a04a9a', float: true, cloud: true },
  25: { main: '#7a48d0', belly: null, acc: '#ff4fa6', face: '#f6eeff', horn: 'jester', wing: 'bat', tail: 'spade', spikes: 'collar', mouth: 'grin', eye: 'normal', iris: '#ff3f9a', joker: true, cheeks: false },
};

// ---- Body plan -----------------------------------------------------------------
function plan(sp, c) {
  const L = sp.look || {}, feat = Array.isArray(L.feat) ? L.feat : [], f = n => feat.includes(n), st = Math.max(1, Math.min(3, L.stage | 0 || 1)), form = L.form || 'round';
  if (NEWB.has(c.body)) return planNew(c, f, st, form);
  const legs = f('legs'), lift = legs ? (c.legLift === undefined ? 6 : c.legLift) : 0;
  let body, head, merged = false;
  if ((form === 'round' && st === 1) || c.body === 'rock' && st === 1 || c.body === 'drop') {
    merged = true; body = { rx: 28, ry: 25.5 }; body.cy = 92 - body.ry - lift; head = body;
  } else if (form === 'round') {
    body = { rx: 20, ry: 17 }; body.cy = 92 - body.ry - lift; head = { rx: 26, ry: 23 }; head.cy = body.cy - body.ry - head.ry * .42;
  } else if (form === 'tall') {
    const s = st >= 3 ? 1.12 : 1; body = { rx: 15.5 * s, ry: 19 * s }; body.cy = 92 - body.ry - lift; head = { rx: 22 * s, ry: 20 * s }; head.cy = body.cy - body.ry - head.ry * .42;
  } else {
    const s = st >= 3 ? 1.16 : st === 2 ? 1 : .9; body = { rx: 34 * s, ry: 18 * s }; body.cy = 92 - body.ry - lift; head = { rx: 21 * s, ry: 19 * s }; head.cy = body.cy - body.ry * .5 - head.ry * .62;
  }
  body.cx = 50; head.cx = 50;
  return { body, head, merged, st, f, legs, lift, form };
}
// Body plans for the newer body shapes. k grows the creature with its stage.
const NEWB = new Set(['fish', 'serpent', 'jelly', 'golem', 'shroom', 'crystal', 'dragon', 'blob', 'bird', 'flower', 'cloud', 'shell']);
const LEGLESS = new Set(['fish', 'serpent', 'jelly', 'blob', 'cloud', 'shell']);
function planNew(c, f, st, form) {
  const k = st >= 3 ? 1.16 : st === 2 ? 1.07 : 1, t = c.body;
  let legs = !LEGLESS.has(t) && (f('legs') || t === 'golem' || t === 'dragon');
  let lift = legs ? (c.legLift === undefined ? (t === 'golem' ? 7 : 6) : c.legLift) : 0;
  let body, head, merged = true, coil = null;
  const M = (rx, ry, gap) => { body = { rx: rx * k, ry: ry * k }; body.cy = 92 - body.ry - lift - (gap || 0); head = body; };
  if (t === 'fish') M(27, 21, 6);
  else if (t === 'jelly') { body = { rx: 27 * k, ry: 21 * k }; body.cy = 89 - 22 * k - body.ry * .45; head = body; }
  else if (t === 'shroom') M(21, 20);
  else if (t === 'crystal') M(24, 27);
  else if (t === 'blob') M(30, 22);
  else if (t === 'bird') M(25, 26, legs ? 0 : 3);
  else if (t === 'cloud') M(31, 20, 8);
  else {
    merged = false;
    if (t === 'serpent') {
      coil = { cx: 50, rx: 30 * k, ry: 10.5 * k }; coil.cy = 92 - coil.ry;
      body = { rx: 22 * k, ry: 9.5 * k }; body.cy = coil.cy - coil.ry * 1.1;
      head = { rx: 22 * k, ry: 19.5 * k }; head.cy = body.cy - body.ry - head.ry * .8 - 5 * k;
    } else if (t === 'shell') {
      body = { rx: 31 * k, ry: 8.5 * k }; body.cy = 92 - body.ry;
      head = { rx: 21 * k, ry: 19 * k }; head.cy = body.cy - head.ry * .9;
    } else if (t === 'golem') {
      body = { rx: 27 * k, ry: 20 * k }; body.cy = 92 - body.ry - lift;
      head = { rx: 19 * k, ry: 16 * k }; head.cy = body.cy - body.ry - head.ry * .3;
    } else if (t === 'flower') {
      body = { rx: 15 * k, ry: 15 * k }; body.cy = 92 - body.ry - lift;
      head = { rx: 22 * k, ry: 20 * k }; head.cy = body.cy - body.ry - head.ry * .45;
    } else { // dragon: always a separate head (with a snout) and legs
      if (form === 'wide') { body = { rx: 31 * k, ry: 17 * k }; body.cy = 92 - body.ry - lift; head = { rx: 20 * k, ry: 18 * k }; head.cy = body.cy - body.ry * .5 - head.ry * .7; }
      else if (form === 'tall') { body = { rx: 16 * k, ry: 20 * k }; body.cy = 92 - body.ry - lift; head = { rx: 21 * k, ry: 19 * k }; head.cy = body.cy - body.ry - head.ry * .42; }
      else { body = { rx: 19 * k, ry: 16 * k }; body.cy = 92 - body.ry - lift; head = { rx: 23 * k, ry: 21 * k }; head.cy = body.cy - body.ry - head.ry * .42; }
    }
  }
  body.cx = 50; head.cx = 50;
  return { body, head, merged, st, f, legs, lift, form, k, coil, nb: t };
}
// Defaults implied by a body shape (only for keys the config leaves unset).
const BODY_DEF = {
  fish: { tail: 'fish', float: true }, serpent: { float: true }, jelly: { float: true, tentacles: true, tail: 'none' }, golem: { fists: true },
  shroom: { mushroomSpots: true }, crystal: {}, dragon: { tail: 'lizard', claws: true }, blob: { float: true, tail: 'none' },
  bird: { mouth: 'beak', wing: 'bird', tail: 'feather', birdFeet: true }, flower: { petals: true }, cloud: { float: true, tail: 'none' }, shell: { float: true, tail: 'none' },
};
// Pleasant fallback art for a species with no config at all, derived from its types and look.
const TYPE_ART = {
  Normal: { ear: 'bear', tail: 'puff' }, Fire: { ear: 'fox', tail: 'flame' }, Water: { body: 'fish' }, Grass: { leaf: 'sprout', ear: 'leaf' },
  Electric: { ear: 'spark', tail: 'bolt' }, Bug: { antenna: 'ball', bugStripes: true }, Flying: { body: 'bird' }, Rock: { body: 'rock' },
  Ground: { ear: 'nub', tail: 'club' }, Poison: { body: 'blob', bubbles: true }, Ghost: { body: 'cloud', eye: 'glow', mouth: 'wisp' },
  Psychic: { gem: true, eye: 'star', float: true, ear: 'cat' }, Dark: { eye: 'fierce', ear: 'cat', mouth: 'fang', tail: 'spade' },
  Ice: { snowcap: true, icicles: true, ear: 'bear' }, Fighting: { fists: true, eye: 'fierce', scarf: true, ear: 'nub' },
  Steel: { body: 'golem', gears: true }, Dragon: { body: 'dragon', horn: 'twin' }, Fairy: { wing: 'fairy', bow: true, eye: 'round', ear: 'bunny' },
};
function defaultArt(sp) {
  const types = Array.isArray(sp.types) && sp.types.length ? sp.types : ['Normal'], st = (sp.look && sp.look.stage) || 1;
  const c = Object.assign({}, TYPE_ART[types[0]] || TYPE_ART.Normal);
  const R = G.mulberry((sp.id | 0) * 92821 + 3);
  if (types[1] === 'Flying' && !c.wing && c.body !== 'bird') c.wing = 'bird';
  if (types[1] === 'Fire' && !c.tail) c.tail = 'flame';
  if (types[1] === 'Ice') c.snowcap = true;
  if (types[1] === 'Fairy') c.sparkles = true;
  if (types[1] === 'Steel') c.armor = true;
  if (!c.mouth) c.mouth = ['smile', 'cat', 'open', 'cheeky'][Math.floor(R() * 4)];
  if (st >= 3) { c.sparkles = true; if (!c.eye) c.eye = 'fierce'; }
  return c;
}

// ---- Creature generator -------------------------------------------------------
function buildParts(sp) {
  let c = C[sp.id] || (G.CREATURE_ART || {})[sp.id];
  if (!c || typeof c !== 'object') c = defaultArt(sp);
  for (const kk in c) if (/(^(main|belly|acc|face|iris|cheek|spots|brow)$|Col$)/.test(kk) && c[kk] != null && !okCol(c[kk])) { if (c === C[sp.id] || c === G.CREATURE_ART[sp.id]) c = Object.assign({}, c); delete c[kk]; }
  if (NEWB.has(c.body)) { const d = BODY_DEF[c.body], o = Object.assign({}, c); for (const kk in d) if (o[kk] === undefined) o[kk] = d[kk]; c = o; }
  const B = plan(sp, c), { body, head, f, st } = B, nb = B.nb || null;
  const R = G.mulberry(sp.id * 7919 + 13), R2 = G.mulberry((sp.id | 0) * 104729 + 71);
  const tc = (Array.isArray(sp.types) && sp.types.length ? sp.types : ['Normal']).map(t => vivid(G.TYPE_COL[t] || '#c8a878'));
  const main = c.main || tc[0], acc = c.acc || (tc[1] || adj(main, -.12)), belly = c.belly === undefined ? adj(main, .25, .7) : c.belly;
  const skin = c.face || main, belly2 = belly || adj(main, .25, .7), leafG = c.leafCol || '#6cc850';
  const SC = st >= 3 ? 1.25 : st === 2 ? 1.1 : 1;
  const parts = [], add = (z, zb, fn) => parts.push({ z, zb, fn });
  let headPath = null; // set by new head shapes so the back-view shading clips to them

  // Body shapes ----------------------------------------------------------------
  let bodyFn;
  if (c.body === 'drop') {
    const { cx, cy, rx, ry } = body, top = cy - ry * 1.75;
    bodyFn = x => {
      paint(x, p => { p.moveTo(cx, top); p.bezierCurveTo(cx + rx * .3, top + ry * .55, cx + rx * 1.02, cy - ry * .45, cx + rx * 1.02, cy + ry * .15); p.bezierCurveTo(cx + rx * 1.02, cy + ry * .8, cx + rx * .55, cy + ry, cx, cy + ry); p.bezierCurveTo(cx - rx * .55, cy + ry, cx - rx * 1.02, cy + ry * .8, cx - rx * 1.02, cy + ry * .15); p.bezierCurveTo(cx - rx * 1.02, cy - ry * .45, cx - rx * .3, top + ry * .55, cx, top); p.closePath(); }, main, cx, cy - ry * .2, ry * 1.2);
      shine(x, cx - rx * .42, cy - ry * .45, rx * .3, ry * .38, .8); shine(x, cx - rx * .02, top + ry * .45, rx * .1, ry * .14, .7);
    };
  } else if (c.body === 'rock') {
    const pts = [], n = 10;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * TAU / n + (R() - .5) * .25, k = .92 + R() * .16; pts.push([body.cx + Math.cos(a) * body.rx * k * 1.05, body.cy + Math.sin(a) * body.ry * k * (Math.sin(a) > .5 ? .95 : 1.05)]); }
    bodyFn = x => {
      paint(x, smoothPath(pts), main, body.cx, body.cy, Math.max(body.rx, body.ry));
      x.save(); x.beginPath(); smoothPath(pts)(x); x.clip();
      // facets: lighter top-left plane, darker lower-right plane, a few cracks and speckles
      x.fillStyle = rgba(adj(main, .2), .55); x.beginPath(); x.moveTo(body.cx - body.rx * 1.1, body.cy - body.ry * .1); x.lineTo(body.cx - body.rx * .2, body.cy - body.ry * 1.2); x.lineTo(body.cx + body.rx * .1, body.cy - body.ry * .55); x.lineTo(body.cx - body.rx * .55, body.cy + body.ry * .1); x.fill();
      x.fillStyle = rgba(adj(main, -.18), .35); x.beginPath(); x.moveTo(body.cx + body.rx * 1.1, body.cy - body.ry * .2); x.lineTo(body.cx + body.rx * .45, body.cy + body.ry * .4); x.lineTo(body.cx + body.rx * .2, body.cy + body.ry * 1.2); x.lineTo(body.cx + body.rx * 1.1, body.cy + body.ry); x.fill();
      for (let i = 0; i < 9; i++) { x.fillStyle = rgba(adj(main, R() > .5 ? .18 : -.15), .5); x.beginPath(); x.arc(body.cx + (R() - .5) * body.rx * 1.6, body.cy + (R() - .5) * body.ry * 1.6, .8 + R() * 1.4, 0, TAU); x.fill(); }
      x.restore();
      stroke(x, p => { p.moveTo(body.cx + body.rx * .55, body.cy - body.ry * .75); p.lineTo(body.cx + body.rx * .42, body.cy - body.ry * .45); p.lineTo(body.cx + body.rx * .6, body.cy - body.ry * .3); }, lineOf(main), LW * .8);
      shine(x, body.cx - body.rx * .45, body.cy - body.ry * .5, body.rx * .25, body.ry * .22, .6);
    };
  } else if (c.body === 'fluff') {
    bodyFn = x => { paint(x, fluffPath(body.cx, body.cy, body.rx, body.ry, 14, 2.6), main, body.cx, body.cy, Math.max(body.rx, body.ry)); shine(x, body.cx - body.rx * .4, body.cy - body.ry * .45, body.rx * .3, body.ry * .3, .55); };
  } else if (nb) {
    bodyFn = newBody(nb);
  } else {
    bodyFn = x => { E(x, body.cx, body.cy, body.rx, body.ry, main); shine(x, body.cx - body.rx * .42, body.cy - body.ry * .45, body.rx * .3, body.ry * .3, .6); };
  }
  // The newer body shapes: each returns the body painter and adds its own extra parts (fins, cap, coils...).
  function newBody(t) {
    const { cx, cy, rx, ry } = body, k = B.k;
    if (t === 'fish') {
      headPath = ellP(cx, cy, rx, ry);
      // dorsal fin behind, pectoral fins in front, then the body with a pale belly and soft scales
      add(-.2, -.2, x => { paint(x, p => { p.moveTo(cx - rx * .45, cy - ry * .78); p.quadraticCurveTo(cx - rx * .1, cy - ry * 1.55 * (st >= 2 ? 1.12 : 1), cx + rx * .5, cy - ry * 1.42 * (st >= 2 ? 1.12 : 1)); p.quadraticCurveTo(cx + rx * .2, cy - ry * 1.05, cx + rx * .45, cy - ry * .72); p.closePath(); }, acc, cx, cy - ry, rx * .5); stroke(x, p => { p.moveTo(cx - rx * .2, cy - ry * .85); p.quadraticCurveTo(cx, cy - ry * 1.2, cx + rx * .3, cy - ry * 1.3); }, rgba('#ffffff', .45), 1.3); });
      const pect = x => { for (const s of [-1, 1]) { const bx = cx + s * rx * .72, by = cy + ry * .38; paint(x, p => { p.moveTo(bx, by - 5 * k); p.quadraticCurveTo(bx + s * 12 * k, by - 3 * k, bx + s * 14 * k, by + 7 * k); p.quadraticCurveTo(bx + s * 6 * k, by + 4 * k, bx, by + 4 * k); p.closePath(); }, acc, bx + s * 5, by, 8 * k); } };
      add(.6, .6, pect);
      return x => {
        E(x, cx, cy, rx, ry, main);
        x.save(); x.beginPath(); ellP(cx, cy, rx, ry)(x); x.clip();
        if (belly) E(x, cx, cy + ry * .75, rx * .9, ry * .55, belly, { line: false, lo: .04 });
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) stroke(x, p => { const px = cx + rx * (.25 + i * .22), py = cy - ry * (.35 - j * .38); p.arc(px, py, 4 * k, Math.PI * .6, Math.PI * 1.4); }, rgba(lineOf(main), .35), 1.1);
        x.restore();
        x.beginPath(); ellP(cx, cy, rx, ry)(x); x.lineWidth = LW; x.strokeStyle = lineOf(main); x.stroke();
        shine(x, cx - rx * .42, cy - ry * .48, rx * .28, ry * .26, .7);
      };
    }
    if (t === 'jelly') {
      const rim = cy + ry * .45, n = 6 + st;
      const bell = p => { p.moveTo(cx - rx, rim); p.bezierCurveTo(cx - rx * 1.02, cy - ry * 1.35, cx + rx * 1.02, cy - ry * 1.35, cx + rx, rim); for (let i = 0; i < n; i++) { const x0 = cx + rx - i * 2 * rx / n, x1 = cx + rx - (i + 1) * 2 * rx / n; p.quadraticCurveTo((x0 + x1) / 2, rim + 6 * k, x1, rim); } p.closePath(); };
      headPath = bell;
      return x => {
        const g = x.createRadialGradient(cx, cy - ry * .2, 2, cx, cy, rx * 1.6); g.addColorStop(0, rgba(main, .35)); g.addColorStop(1, rgba(main, 0)); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rx * 1.6, 0, TAU); x.fill();
        x.globalAlpha = .93; paint(x, bell, main, cx, cy - ry * .3, rx * 1.05, { hi: .22 }); x.globalAlpha = 1;
        x.save(); x.beginPath(); bell(x); x.clip();
        E(x, cx, rim + 1, rx * .92, ry * .32, belly2, { line: false, lo: .02 });
        E(x, cx, cy - ry * .45, rx * .55, ry * .38, adj(main, .18), { line: false, flat: true });
        x.restore();
        shine(x, cx - rx * .45, cy - ry * .55, rx * .26, ry * .2, .85); shine(x, cx + rx * .3, cy - ry * .7, rx * .1, ry * .08, .6);
      };
    }
    if (t === 'golem') {
      const bp = p => p.roundRect(cx - rx, cy - ry, 2 * rx, 2 * ry, rx * .42);
      return x => {
        paint(x, bp, main, cx, cy, Math.max(rx, ry));
        x.save(); x.beginPath(); bp(x); x.clip();
        x.fillStyle = rgba(adj(main, .16), .5); x.fillRect(cx - rx, cy - ry, rx * .55, ry * 2);
        x.fillStyle = rgba(adj(main, -.16), .35); x.fillRect(cx + rx * .55, cy - ry, rx * .5, ry * 2);
        if (belly) paint(x, p => p.roundRect(cx - rx * .5, cy - ry * .35, rx, ry * 1.1, rx * .3), belly, cx, cy + ry * .2, rx * .6, { line: rgba(lineOf(main), .5), lw: 1.1 });
        x.restore();
        stroke(x, p => { p.moveTo(cx - rx * .7, cy - ry * .7); p.lineTo(cx - rx * .55, cy - ry * .4); p.lineTo(cx - rx * .7, cy - ry * .15); }, lineOf(main), LW * .8);
        // glowing rune in the accent colour
        stroke(x, p => { p.moveTo(cx + rx * .62, cy - ry * .55); p.lineTo(cx + rx * .62, cy - ry * .05); p.moveTo(cx + rx * .48, cy - ry * .32); p.lineTo(cx + rx * .76, cy - ry * .32); }, rgba(adj(acc, .2), .9), 2.2);
        shine(x, cx - rx * .55, cy - ry * .55, rx * .22, ry * .2, .55);
      };
    }
    if (t === 'shroom') {
      const capY = cy - ry * .3, CR = rx * 1.6 * (st >= 3 ? 1.08 : 1), capH = ry * 1.25 * (st >= 2 ? 1.08 : 1);
      const cap = p => { p.moveTo(cx - CR, capY); p.bezierCurveTo(cx - CR * 1.02, capY - capH * 1.33, cx + CR * 1.02, capY - capH * 1.33, cx + CR, capY); p.quadraticCurveTo(cx + CR * .55, capY + 9 * k, cx, capY + 6 * k); p.quadraticCurveTo(cx - CR * .55, capY + 9 * k, cx - CR, capY); p.closePath(); };
      B.cap = { cx, cy: capY - capH * .5, rx: CR, ry: capH * .75, top: capY - capH, path: cap };
      const capFn = x => {
        paint(x, cap, main, cx, capY - capH * .5, CR, { hi: .2 });
        x.save(); x.beginPath(); cap(x); x.clip();
        if (c.mushroomSpots) { const sc = c.spots || '#fff6e8'; for (const [u, v, r] of [[-.62, -.35, .2], [0, -.75, .24], [.6, -.4, .18], [-.25, -.15, .12], [.3, -.05, .11], [-.9, .02, .1], [.88, .0, .1]]) E(x, cx + u * CR, capY + v * capH, r * CR * .9, r * CR * .78, sc, { line: false, hi: .05 }); }
        E(x, cx, capY + 7 * k, CR * .9, 4.5 * k, adj(belly2, -.06), { line: false, flat: true });
        x.restore();
        x.beginPath(); cap(x); x.lineWidth = LW; x.strokeStyle = lineOf(main); x.stroke();
        shine(x, cx - CR * .45, capY - capH * .6, CR * .2, capH * .16, .75);
      };
      add(2.5, 2.5, capFn);
      return x => { paint(x, p => { p.moveTo(cx - rx * .78, capY); p.bezierCurveTo(cx - rx * 1.1, cy + ry * .2, cx - rx * 1.05, cy + ry, cx, cy + ry); p.bezierCurveTo(cx + rx * 1.05, cy + ry, cx + rx * 1.1, cy + ry * .2, cx + rx * .78, capY); p.closePath(); }, skin === main ? belly2 : skin, cx, cy + ry * .2, rx); shine(x, cx - rx * .5, cy + ry * .05, rx * .2, ry * .2, .5); };
    }
    if (t === 'crystal') {
      const pts = [[cx, cy - ry * 1.08], [cx + rx * .95, cy - ry * .45], [cx + rx * .88, cy + ry * .6], [cx + rx * .4, cy + ry], [cx - rx * .4, cy + ry], [cx - rx * .88, cy + ry * .6], [cx - rx * .95, cy - ry * .45]];
      headPath = polyP(pts);
      add(-.4, 3.3, x => { for (const [s, a, l] of [[-1, -2.3, 15], [1, -.75, 18], [1, -.35, 11]]) { const bx = cx + s * rx * .7, by = cy - ry * .2; cone(x, bx, by, l * k, 8 * k, a, adj(main, .12), 0, { hi: .3 }); } });
      return x => {
        paint(x, polyP(pts), main, cx, cy, Math.max(rx, ry), { hi: .22 });
        x.save(); x.beginPath(); polyP(pts)(x); x.clip();
        x.fillStyle = rgba('#ffffff', .28); x.beginPath(); x.moveTo(cx, cy - ry * 1.08); x.lineTo(cx - rx * .95, cy - ry * .45); x.lineTo(cx - rx * .88, cy + ry * .6); x.lineTo(cx - rx * .45, cy + ry * .1); x.closePath(); x.fill();
        x.fillStyle = rgba(adj(main, -.2), .3); x.beginPath(); x.moveTo(cx, cy - ry * 1.08); x.lineTo(cx + rx * .95, cy - ry * .45); x.lineTo(cx + rx * .88, cy + ry * .6); x.lineTo(cx + rx * .45, cy + ry * .1); x.closePath(); x.fill();
        if (belly) E(x, cx, cy + ry * .62, rx * .5, ry * .3, belly, { line: false, lo: .04 });
        x.restore();
        stroke(x, polyP([[cx - rx * .45, cy + ry * .1], [cx, cy - ry * 1.08], [cx + rx * .45, cy + ry * .1]]), rgba('#ffffff', .4), 1.1);
        shine(x, cx - rx * .5, cy - ry * .45, rx * .16, ry * .2, .8); sparkle(x, cx + rx * .5, cy - ry * .55, 2.8 * k, '#ffffff');
      };
    }
    if (t === 'blob') {
      const by = cy + ry;
      const bp = p => { p.moveTo(cx - rx, by); p.bezierCurveTo(cx - rx * 1.12, cy - ry * .2, cx - rx * .7, cy - ry * 1.15, cx, cy - ry * 1.1); p.bezierCurveTo(cx + rx * .7, cy - ry * 1.15, cx + rx * 1.12, cy - ry * .2, cx + rx, by); p.quadraticCurveTo(cx + rx * .5, by + 2.5, cx, by); p.quadraticCurveTo(cx - rx * .5, by + 2.5, cx - rx, by); p.closePath(); };
      headPath = bp;
      return x => {
        E(x, cx, by - 1, rx * 1.12, 4 * k, adj(main, -.06), { lo: .05 });
        paint(x, bp, main, cx, cy, Math.max(rx, ry), { hi: .2 });
        for (const [u, v, r] of [[-.82, .3, 3.2], [.86, .45, 2.6], [.5, .82, 2.2]]) { paint(x, p => { const px = cx + u * rx, py = cy + v * ry; p.moveTo(px - r, py); p.quadraticCurveTo(px - r, py + r * 2.4, px, py + r * 2.6); p.quadraticCurveTo(px + r, py + r * 2.4, px + r, py); p.closePath(); }, main, cx + u * rx, cy + v * ry, r * 2, { lw: 1.1 }); }
        x.save(); x.beginPath(); bp(x); x.clip();
        if (belly) E(x, cx, by, rx * .7, ry * .45, belly, { line: false, lo: .03 });
        for (const [u, v, r] of [[.45, -.2, 2.4], [.62, .2, 1.6], [-.55, .45, 1.8]]) E(x, cx + u * rx, cy + v * ry, r * k, r * k, adj(main, .2), { line: rgba('#ffffff', .4), lw: .7, flat: true });
        x.restore();
        shine(x, cx - rx * .45, cy - ry * .6, rx * .28, ry * .25, .85); shine(x, cx - rx * .12, cy - ry * .9, rx * .08, ry * .07, .8);
      };
    }
    if (t === 'bird') {
      headPath = ellP(cx, cy, rx, ry);
      return x => {
        E(x, cx, cy, rx, ry, main);
        x.save(); x.beginPath(); ellP(cx, cy, rx, ry)(x); x.clip();
        if (belly) E(x, cx, cy + ry * .55, rx * .66, ry * .55, belly, { line: false, lo: .04 });
        for (const s of [-1, 1]) leaf(x, cx + s * rx * .1, cy - ry * 1.02, 8 * k, 2.6, -Math.PI / 2 + s * .9, adj(main, .1));
        x.restore();
        x.beginPath(); ellP(cx, cy, rx, ry)(x); x.lineWidth = LW; x.strokeStyle = lineOf(main); x.stroke();
        shine(x, cx - rx * .42, cy - ry * .5, rx * .28, ry * .25, .65);
      };
    }
    if (t === 'cloud') {
      const cp = fluffPath(cx, cy, rx, ry, 12, 4.2 * k);
      headPath = cp;
      add(-.3, -.3, x => { for (const s of [-1, 1]) { paint(x, fluffPath(cx + s * rx * .95, cy + ry * .55, 10 * k, 7 * k, 7, 2.4), adj(main, -.04), cx + s * rx, cy + ry * .5, 10 * k, { hi: .08 }); } });
      return x => {
        paint(x, cp, main, cx, cy, Math.max(rx, ry), { hi: .1, lo: .12 });
        x.save(); x.beginPath(); cp(x); x.clip(); E(x, cx, cy + ry * 1.05, rx * 1.1, ry * .55, adj(belly2, -.04), { line: false, flat: true }); x.restore();
        shine(x, cx - rx * .4, cy - ry * .55, rx * .28, ry * .28, .7);
      };
    }
    if (t === 'serpent') {
      const cl = B.coil, hh = head;
      const coils = back => x => {
        // tail tip peeking out of the lower coil
        if (!tailStyle || tailStyle === 'none') tube(x, bezPts([cl.cx + cl.rx * (back ? -.7 : .7), cl.cy + 2], [cl.cx + cl.rx * (back ? -1.15 : 1.15), cl.cy + 4], [cl.cx + cl.rx * (back ? -1.3 : 1.3), cl.cy - 6 * k], [cl.cx + cl.rx * (back ? -1.12 : 1.12), cl.cy - 12 * k]), 9 * k, 2, adj(main, -.04));
        E(x, cl.cx, cl.cy, cl.rx, cl.ry, adj(main, -.05));
        stroke(x, p => p.ellipse(cl.cx, cl.cy - cl.ry * .3, cl.rx * .7, cl.ry * .45, 0, Math.PI * 1.1, Math.PI * 1.9), rgba(lineOf(main), .6), 1.2);
        if (!back && belly) { x.save(); x.beginPath(); ellP(cl.cx, cl.cy, cl.rx, cl.ry)(x); x.clip(); E(x, cl.cx, cl.cy + cl.ry * .9, cl.rx * .8, cl.ry * .5, belly, { line: false }); x.restore(); }
        const nk = bezPts([50, body.cy], [50 + 5 * k, body.cy - 8 * k], [50 - 4 * k, hh.cy + hh.ry * .6], [50, hh.cy]);
        tube(x, nk, 15 * k, 13 * k, main);
        if (!back && belly) tube(x, nk.slice(0, 16), 8 * k, 7 * k, belly, { line: false, lo: .05 });
        E(x, body.cx, body.cy, body.rx, body.ry, main);
        stroke(x, p => p.ellipse(body.cx, body.cy - body.ry * .3, body.rx * .65, body.ry * .45, 0, Math.PI * 1.1, Math.PI * 1.9), rgba(lineOf(main), .6), 1.2);
        if (!back && belly) { x.save(); x.beginPath(); ellP(body.cx, body.cy, body.rx, body.ry)(x); x.clip(); E(x, body.cx, body.cy + body.ry * .9, body.rx * .7, body.ry * .5, belly, { line: false }); x.restore(); }
        shine(x, cl.cx - cl.rx * .5, cl.cy - cl.ry * .4, cl.rx * .18, cl.ry * .2, .5); shine(x, body.cx - body.rx * .5, body.cy - body.ry * .4, body.rx * .18, body.ry * .22, .55);
      };
      add(0, 0, null); parts[parts.length - 1].fn = coils(false); parts[parts.length - 1].fnb = coils(true);
      return null;
    }
    if (t === 'shell') {
      const R0 = 24 * k, scx = cx + 9 * k, scy = head.cy - 8 * k;
      const shellFn = x => {
        E(x, scx, scy, R0, R0 * .96, acc, { hi: .2 });
        const sp = spiralPts(scx + 1, scy + 1, R0 * .82, 1.5, Math.PI * .1, 2.1, -1);
        stroke(x, p => sp.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])), lineOf(acc), 3.2);
        stroke(x, p => sp.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])), adj(acc, .2), 1.4);
        shine(x, scx - R0 * .45, scy - R0 * .5, R0 * .22, R0 * .18, .7);
      };
      add(-.5, 2.6, shellFn);
      return x => {
        paint(x, p => { p.moveTo(cx - rx, cy + ry * .6); p.bezierCurveTo(cx - rx * 1.05, cy - ry * 1.1, cx + rx * .6, cy - ry * 1.3, cx + rx * 1.05, cy + ry * .1); p.quadraticCurveTo(cx + rx * .9, cy + ry, cx, cy + ry); p.quadraticCurveTo(cx - rx * .8, cy + ry, cx - rx, cy + ry * .6); p.closePath(); }, adj(main, -.04), cx, cy, rx);
        if (belly) E(x, cx, cy + ry * .55, rx * .8, ry * .35, belly, { line: false, flat: true });
        shine(x, cx - rx * .55, cy - ry * .2, rx * .15, ry * .3, .5);
      };
    }
    if (t === 'flower') {
      if (!B.f('arms')) add(-.1, -.1, x => { for (const s of [-1, 1]) leaf(x, cx + s * rx * .7, cy + ry * .1, 15 * k, 6 * k, Math.PI / 2 + s * -1.15, leafG); });
      return x => { E(x, cx, cy, rx, ry, main); if (belly) { x.save(); x.beginPath(); ellP(cx, cy, rx, ry)(x); x.clip(); E(x, cx, cy + ry * .5, rx * .7, ry * .6, belly, { line: false }); x.restore(); } shine(x, cx - rx * .42, cy - ry * .45, rx * .3, ry * .3, .6); };
    }
    // dragon (and anything else): rounded body with belly scales
    return x => {
      E(x, cx, cy, rx, ry, main);
      if (belly) { x.save(); x.beginPath(); ellP(cx, cy + ry * .22, rx * .62, ry * .7)(x); x.clip(); E(x, cx, cy + ry * .22, rx * .62, ry * .7, belly, { lo: .06, line: false }); for (let i = 0; i < 4; i++) stroke(x, p => { const yy = cy - ry * .25 + i * ry * .3; p.moveTo(cx - rx * .6, yy); p.quadraticCurveTo(cx, yy + 3, cx + rx * .6, yy); }, rgba(lineOf(belly), .45), 1); x.restore(); E(x, cx, cy + ry * .22, rx * .62, ry * .7, 'rgba(0,0,0,0)', { flat: true, line: rgba(lineOf(main), .5), lw: 1.1 }); }
      shine(x, cx - rx * .42, cy - ry * .45, rx * .3, ry * .3, .6);
    };
  }

  // Ground contact: legs or little feet ------------------------------------------
  if (c.body === 'cater') {
    // Caterpillar: segments curl back and up to the right, head in front.
    head.cx = 42; head.rx = 22; head.ry = 20; head.cy = 64; body.rx = 0;
    const segs = [[62, 80, 13.5], [77, 76, 12], [87, 64, 10], [90, 52, 8]];
    add(-2, 4, x => {
      for (let i = segs.length - 1; i >= 0; i--) {
        const [sx, sy, r] = segs[i];
        E(x, sx - 4, sy + r * .85, 3.5, 2.6, adj(main, -.15));
        E(x, sx, sy, r, r * .95, main); shine(x, sx - r * .4, sy - r * .45, r * .3, r * .26, .55);
        E(x, sx + r * .1, sy - r * .15, r * .28, r * .26, c.spots || acc, { line: false });
      }
      E(x, 40, 88, 4, 3, adj(main, -.15)); E(x, 52, 89, 4, 3, adj(main, -.15));
    });
    bodyFn = null;
  } else if (B.legs && nb === 'golem') {
    add(-1, -1, x => {
      for (const s of [-1, 1]) {
        const lx = body.cx + s * body.rx * .52, w = 8 * B.k, col = adj(main, -.08);
        paint(x, p => p.roundRect(lx - w, body.cy + body.ry * .4, 2 * w, 91 - body.cy - body.ry * .4, [3, 3, 4, 4]), col, lx, 84, w * 1.4);
        E(x, lx, 89.5, w * 1.15, 3.2, adj(main, -.14), { lo: .08 });
        shine(x, lx - w * .45, body.cy + body.ry * .7, w * .25, 3, .4);
      }
    });
  } else if (B.legs) {
    const d = (B.form === 'wide' ? body.rx * .56 : body.rx * .5);
    add(-1, -1, x => {
      for (const s of [-1, 1]) {
        const lx = body.cx + s * d, col = adj(main, -.06);
        paint(x, p => { p.moveTo(lx - 6, body.cy + body.ry * .5); p.lineTo(lx - 6.5, 88); p.quadraticCurveTo(lx, 91, lx + 6.5, 88); p.lineTo(lx + 6, body.cy + body.ry * .5); p.closePath(); }, col, lx, 85, 7);
        if (c.birdFeet) { for (const k of [-1, 0, 1]) cone(x, lx, 89.5, 6, 2.6, Math.PI / 2 + k * .55, '#ffb43a'); }
        else { E(x, lx + s * 1, 90, 8.5, 4.6, adj(main, -.1)); E(x, lx + s * 1, 89, 5, 2, rgba('#ffffff', .25), { flat: true, line: false }); }
        if (c.claws) for (const k of [-1, 0, 1]) cone(x, lx + s * 1 + k * 3.6, 92, 3, 2.2, Math.PI / 2, '#fff4dc', 0, { lw: 1 });
      }
    });
  } else if (!c.float && c.body !== 'wisp') {
    add(-1, -1, x => {
      for (const s of [-1, 1]) {
        if (c.birdFeet) { for (const k of [-1, 0, 1]) cone(x, body.cx + s * 9, 89, 6, 2.4, Math.PI / 2 + k * .55, '#ffb43a'); continue; }
        E(x, body.cx + s * body.rx * .5, 91, 8, 4.4, adj(main, -.1));
      }
    });
  }
  if (c.cloud) add(-0.5, -0.5, x => paint(x, fluffPath(50, 88, 26, 6, 9, 3.2), '#ffffff', 50, 86, 26, { line: '#d8c8f0', hi: .02, lo: .08 }));

  // Body ---------------------------------------------------------------------------
  if (c.body === 'wisp') bodyFn = null;
  if (bodyFn) add(0, 0, bodyFn);
  if (belly && !B.merged && bodyFn && c.body !== 'rock' && !nb)
    add(.5, null, x => { E(x, body.cx, body.cy + body.ry * .22, body.rx * .6, body.ry * .66, belly, { lo: .06, line: rgba(lineOf(main), .5), lw: 1.1 }); });
  if (belly && B.merged && c.body !== 'rock' && c.body !== 'drop' && !nb)
    add(.5, null, x => { E(x, body.cx, body.cy + body.ry * .5, body.rx * .55, body.ry * .4, belly, { lo: .05, line: false }); });
  if (belly && c.body === 'drop') add(.5, null, x => E(x, body.cx, body.cy + body.ry * .52, body.rx * .5, body.ry * .36, belly, { lo: .04, line: false }));
  if (c.stripes) add(.4, .4, x => { x.save(); x.beginPath(); ellP(body.cx, body.cy, body.rx, body.ry)(x); x.clip(); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { x.fillStyle = acc; x.beginPath(); x.ellipse(body.cx + s * body.rx * 1.02, body.cy - body.ry * .45 + i * body.ry * .42, body.rx * .32, 2.2, 0, 0, TAU); x.fill(); } x.restore(); });
  if (c.bugStripes) add(.6, .6, x => { x.save(); x.beginPath(); ellP(body.cx, body.cy, body.rx, body.ry)(x); x.clip(); for (let i = 0; i < 3; i++) { x.fillStyle = rgba(acc, .9); x.beginPath(); x.ellipse(body.cx, body.cy - body.ry * .25 + i * body.ry * .45, body.rx * 1.2, 2.3, 0, 0, TAU); x.fill(); } x.restore(); });
  if (c.backStripes) add(null, .6, x => { x.save(); x.beginPath(); (B.merged ? ellP(head.cx, head.cy, head.rx, head.ry) : ellP(body.cx, body.cy, body.rx, body.ry))(x); x.clip(); const e = B.merged ? head : body; for (let i = 0; i < 2; i++) { x.fillStyle = '#c87a1a'; x.beginPath(); x.ellipse(e.cx, e.cy - e.ry * .1 + i * e.ry * .4, e.rx * .45, 2.4, 0, 0, TAU); x.fill(); } x.restore(); });

  // Shell (turtle line) ---------------------------------------------------------------
  if (c.shell) {
    const sh = { cx: 50, cy: body.cy - body.ry * .15, rx: body.rx * 1.06, ry: body.ry * 1.1 };
    const shellFn = back => x => {
      E(x, sh.cx, sh.cy, sh.rx, sh.ry, acc);
      x.save(); x.beginPath(); ellP(sh.cx, sh.cy, sh.rx, sh.ry)(x); x.clip();
      const pc = adj(acc, back ? .12 : .08);
      for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) { const px = sh.cx + i * sh.rx * .42 + (j & 1) * sh.rx * .21, py = sh.cy + j * sh.ry * .62; paint(x, smoothPath([[px - 6, py], [px - 3, py - 5], [px + 3, py - 5], [px + 6, py], [px + 3, py + 5], [px - 3, py + 5]]), pc, px, py, 6, { line: rgba(lineOf(acc), .7), lw: 1.1, hi: .12 }); }
      x.restore();
      if (c.shellSpikes) for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * .42, [px, py] = onEll(sh, a, .92); cone(x, px, py, 9, 6, a, back ? adj('#efe0b0', 0) : '#efe0b0'); }
      E(x, sh.cx, sh.cy + sh.ry * .82, sh.rx * .95, 3.2, c.shellSpikes ? '#d8b05a' : adj(acc, .25), { lo: .05 });
      if (c.nozzles) for (const s of [-1, 1]) { const [px, py] = onEll(sh, -Math.PI / 2 + s * .5, .95); E(x, px, py - 2, 3.4, 4.5, '#a8d8ff'); E(x, px, py - 5, 2.2, 1.2, '#2a4a8a', { flat: true, line: false }); }
      shine(x, sh.cx - sh.rx * .45, sh.cy - sh.ry * .5, sh.rx * .22, sh.ry * .22, .55);
    };
    add(-.5, 3.4, null); parts[parts.length - 1].fn = shellFn(false); parts[parts.length - 1].fnb = shellFn(true);
    // front view: shell sits behind, the belly plate in front is drawn by the body/belly
  }
  if (c.rockBack) {
    const rb = back => x => {
      const top = body.cy - body.ry * .55;
      for (let i = -2; i <= 2; i++) { const px = 50 + i * body.rx * .36, py = top - (2 - Math.abs(i)) * 3 + (back ? 6 : 0); paint(x, smoothPath([[px - 8, py + 6], [px - 6, py - 5], [px + 1, py - 9], [px + 7, py - 3], [px + 8, py + 6]]), acc, px, py, 8); }
      for (let i = -1; i <= 1; i++) { const px = 50 + i * body.rx * .5 + 4, py = top - 10 - (i ? 0 : 6) + (back ? 6 : 0); paint(x, fluffPath(px, py, 9, 7, 8, 2), '#4ea84a', px, py, 9); shine(x, px - 3, py - 3, 3, 2.4, .5); }
      if (back) for (let i = 0; i < 3; i++) cone(x, 50, body.cy - 4 + i * 8, 7, 7, -Math.PI / 2, adj(acc, .1));
    };
    add(-2, 3.4, null); parts[parts.length - 1].fn = rb(false); parts[parts.length - 1].fnb = rb(true);
  }
  if (c.body === 'beetle') {
    // Shell dome behind and above the head; the head peeks out in front.
    head.cy = body.cy - 6; head.rx *= .95; head.ry *= .9;
    const sh = { cx: 50, cy: body.cy - 10, rx: body.rx * .98, ry: body.ry * 1.35 };
    const shellFn = back => x => {
      E(x, sh.cx, sh.cy, sh.rx, sh.ry, acc, { hi: .22 });
      stroke(x, p => { p.moveTo(50, sh.cy - sh.ry); p.lineTo(50, sh.cy + sh.ry); }, lineOf(acc), LW);
      shine(x, sh.cx - sh.rx * .5, sh.cy - sh.ry * .45, sh.rx * .2, sh.ry * .28, .8);
      shine(x, sh.cx + sh.rx * .38, sh.cy - sh.ry * .5, sh.rx * .12, sh.ry * .18, .6);
      if (back) for (const s of [-1, 1]) E(x, 50 + s * sh.rx * .5, sh.cy + sh.ry * .2, 4, 3, '#d8f070', { line: false });
    };
    add(-.8, 3.4, null); parts[parts.length - 1].fn = shellFn(false); parts[parts.length - 1].fnb = shellFn(true);
    add(-1.2, -1.2, x => { for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + s * (.5 + i * .35); cone(x, 50 + s * (12 + i * 9), body.cy + 6, 9, 3.6, a, adj(acc, -.1), s * .1); } });
  }

  // Arms -------------------------------------------------------------------------------
  if ((f('arms') || nb === 'golem') && c.body !== 'beetle' && nb !== 'fish' && nb !== 'jelly' && nb !== 'shell') {
    const armFn = x => {
      for (const s of [-1, 1]) {
        const ax = body.cx + s * body.rx * .9, ay = body.cy - body.ry * .15;
        if (c.flipper) { E(x, ax + s * 3, ay + 4, 5.5, 10, adj(main, -.04), { rot: s * -.6 }); continue; }
        if (c.paws) { E(x, ax + s * 2, ay + 4, 8, 7, '#f4c8a8', { rot: s * .3 }); for (let k = -1; k <= 1; k++) cone(x, ax + s * 4 + k * 3.6, ay + 9, 5.5, 2.6, Math.PI / 2 + s * .4, '#fffaf0', 0, { lw: 1.1 }); continue; }
        if (c.fists) { E(x, ax + s * 6, ay + 2, 9, 10, adj(main, -.03)); stroke(x, p => { p.moveTo(ax + s * 2, ay + 4); p.lineTo(ax + s * 9, ay + 4); }, lineOf(main), LW * .8); continue; }
        if (c.vineArms) { stroke(x, p => { p.moveTo(ax, ay); p.quadraticCurveTo(ax + s * 9, ay + 2, ax + s * 7, ay + 12); }, lineOf('#3a9a3a'), 5.2); stroke(x, p => { p.moveTo(ax, ay); p.quadraticCurveTo(ax + s * 9, ay + 2, ax + s * 7, ay + 12); }, '#4aae44', 3.4); leaf(x, ax + s * 7, ay + 12, 7, 3, Math.PI / 2 + s * .5, '#7ad65e'); continue; }
        E(x, ax + s * 2.5, ay + 5, 5.2, 8, adj(main, -.03), { rot: s * -.45 });
        if (c.claws) for (const k of [-1, 1]) cone(x, ax + s * 4 + k * 2.4, ay + 12, 3, 2, Math.PI / 2 + s * .3, '#fff4dc', 0, { lw: 1 });
        if (c.joker) E(x, ax + s * 4.5, ay + 11, 4.4, 4, '#ffffff');
      }
    };
    add(1, 1, armFn);
  }
  if (c.ruff) add(1.6, 1.6, x => paint(x, fluffPath(50, body.cy - body.ry * .72, body.rx * 1.02, 7, 10, 2.6), belly2, 50, body.cy - body.ry * .8, body.rx, { hi: .05, lo: .1 }));
  if (c.collar) add(1.6, 1.6, x => paint(x, fluffPath(50, head.cy + head.ry * .82, head.rx * .85, 7, 11, 2.8), belly2, 50, head.cy + head.ry * .8, head.rx, { hi: .04, lo: .12 }));
  if (c.thorns) add(1.6, 1.6, x => { const y0 = body.cy - body.ry * .75; stroke(x, p => { p.moveTo(50 - body.rx, y0 + 2); p.quadraticCurveTo(50, y0 + 8, 50 + body.rx, y0 + 2); }, lineOf('#2f8a3a'), 6); stroke(x, p => { p.moveTo(50 - body.rx, y0 + 2); p.quadraticCurveTo(50, y0 + 8, 50 + body.rx, y0 + 2); }, '#3e9a44', 4); for (let i = -2; i <= 2; i++) cone(x, 50 + i * body.rx * .42, y0 + 4.5 - Math.abs(i) * .8 + 1.5, 5, 3.2, Math.PI / 2 + i * .2, '#e8f0a0', 0, { lw: 1 }); });

  // Tail -------------------------------------------------------------------------------
  const tailStyle = c.tail || (f('tail') ? 'lizard' : f('bolt') ? 'bolt' : null);
  const tb = B.merged ? { x: body.cx + body.rx * .8, y: body.cy + body.ry * .45 } : { x: body.cx + body.rx * .75, y: body.cy + body.ry * .4 };
  if (nb === 'fish') { tb.x = body.cx + body.rx * .86; tb.y = body.cy + body.ry * .08; }
  else if (nb === 'serpent') { tb.x = 50 + B.coil.rx * .82; tb.y = B.coil.cy + 1; }
  else if (nb === 'shell') { tb.x = body.cx + body.rx * .8; tb.y = body.cy; }
  const tailFn = back => x => {
    const fl = back ? -1 : 1, bx = 50 + (tb.x - 50) * fl, sc = st >= 3 ? 1.25 : st === 2 ? 1.1 : 1;
    if (tailStyle === 'lizard') {
      const ex = bx + fl * 22 * sc, ey = tb.y - 22 * sc;
      paint(x, p => { p.moveTo(bx - fl * 2, tb.y - 6); p.quadraticCurveTo(bx + fl * 20 * sc, tb.y + 6, ex, ey); p.quadraticCurveTo(bx + fl * 14 * sc, tb.y + 1, bx - fl * 2, tb.y + 7); p.closePath(); }, adj(main, -.03), bx + fl * 10, tb.y, 14);
      if (c.tailFlame) flame(x, ex, ey + 3, 10 * sc, 18 * sc, fl * 3);
    } else if (tailStyle === 'fluff') {
      const big = st >= 2 ? 1.3 : 1, tx = bx + fl * 9 * big, ty = tb.y - 13 * big;
      x.save(); x.translate(tx, ty); x.rotate(fl * .55);
      const tp = fluffPath(0, 0, 9.5 * big, 17 * big, 12, 2.4);
      paint(x, tp, main, 0, 0, 17 * big);
      x.save(); x.beginPath(); tp(x); x.clip(); E(x, 0, -15 * big, 13 * big, 8.5 * big, belly2, { line: false }); x.restore();
      x.beginPath(); tp(x); x.lineWidth = LW; x.strokeStyle = lineOf(main); x.stroke();
      shine(x, -3, -4, 3 * big, 6 * big, .45); x.restore();
    } else if (tailStyle === 'bolt') {
      bolt(x, bx - fl * 2, tb.y + 2, (st >= 2 ? 1.25 : 1) * 1.05, c.boltCol || adj(main, -.02, 1, -.015), fl);
    } else if (tailStyle === 'feather') {
      for (const k of [-1, 0, 1]) { const a = (back ? Math.PI : 0) + fl * (-.5 + k * .38) + (back ? 0 : 0); leaf(x, bx - fl * 3, tb.y + 2, 15 * sc, 4.5 * sc, back ? Math.PI + .5 - k * .38 : -.5 + k * .38, k ? adj(main, -.08) : acc === main ? main : adj(main, .05)); void a; }
    } else if (tailStyle === 'stinger') {
      let px = bx - fl * 2, py = tb.y;
      for (let i = 0; i < 4; i++) { const a = -.3 - i * .45; px += fl * Math.cos(a) * 7; py += Math.sin(a) * 7; E(x, px, py, 5 - i * .4, 5 - i * .4, i % 2 ? acc : main); }
      cone(x, px + fl * 1, py - 3, 10, 6, -Math.PI / 2 - fl * .5, acc, 0); E(x, px + fl * 3, py - 12, 1.6, 2.2, '#d8f070', { line: false });
    } else if (tailStyle === 'puff') {
      paint(x, fluffPath(bx + fl * 6, tb.y - 3, 7, 7, 8, 2), belly2, bx + fl * 6, tb.y - 3, 8);
    } else if (tailStyle === 'spade') {
      const ex = bx + fl * 22, ey = tb.y - 26;
      stroke(x, p => { p.moveTo(bx - fl * 4, tb.y + 2); p.bezierCurveTo(bx + fl * 24, tb.y + 8, bx + fl * 8, tb.y - 22, ex, ey); }, lineOf(main), 5.2);
      stroke(x, p => { p.moveTo(bx - fl * 4, tb.y + 2); p.bezierCurveTo(bx + fl * 24, tb.y + 8, bx + fl * 8, tb.y - 22, ex, ey); }, main, 3.2);
      paint(x, p => { p.moveTo(ex, ey - 9); p.bezierCurveTo(ex + 9, ey - 2, ex + 7, ey + 5, ex + 1.5, ey + 3); p.lineTo(ex + 2.5, ey + 7); p.lineTo(ex - 2.5, ey + 7); p.lineTo(ex - 1.5, ey + 3); p.bezierCurveTo(ex - 7, ey + 5, ex - 9, ey - 2, ex, ey - 9); p.closePath(); }, '#ffd24a', ex, ey, 8);
    }
    else if (tailStyle === 'fish') {
      const L = 19 * sc, ty = tb.y;
      paint(x, p => { p.moveTo(bx - fl * 3, ty - 5 * sc); p.quadraticCurveTo(bx + fl * L * .55, ty - 3, bx + fl * L, ty - L * .8); p.quadraticCurveTo(bx + fl * L * .62, ty, bx + fl * L * 1.02, ty + L * .62); p.quadraticCurveTo(bx + fl * L * .5, ty + 4, bx - fl * 3, ty + 5 * sc); p.closePath(); }, acc, bx + fl * L * .5, ty, L * .6);
      for (const v of [-.45, 0, .38]) stroke(x, p => { p.moveTo(bx + fl * 3, ty + v * 3); p.lineTo(bx + fl * L * .78, ty + v * L * .8); }, rgba('#ffffff', .42), 1.1);
    } else if (tailStyle === 'ringed') {
      const pts = bezPts([bx - fl * 3, tb.y], [bx + fl * 22 * sc, tb.y + 6], [bx + fl * 28 * sc, tb.y - 16 * sc], [bx + fl * 15 * sc, tb.y - 30 * sc]);
      tube(x, pts, 11 * sc, 6 * sc, main);
      x.save(); x.beginPath(); tubeP(pts, 11 * sc, 6 * sc)(x); x.clip();
      for (const i of [5, 9, 13, 17, 20]) { const a = pts[i - 1], b = pts[i + 1 > 20 ? 20 : i + 1], q = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; stroke(x, p => { p.moveTo(q[0] - dy / d * 9, q[1] + dx / d * 9); p.lineTo(q[0] + dy / d * 9, q[1] - dx / d * 9); }, acc, 3.4 * sc); }
      x.restore();
      x.beginPath(); tubeP(pts, 11 * sc, 6 * sc)(x); x.lineWidth = LW; x.strokeStyle = lineOf(main); x.stroke();
    } else if (tailStyle === 'leaf') {
      const ex = bx + fl * 14 * sc, ey = tb.y - 12 * sc;
      stroke(x, p => { p.moveTo(bx - fl * 2, tb.y + 2); p.quadraticCurveTo(bx + fl * 13 * sc, tb.y + 2, ex, ey); }, lineOf('#4aa83a'), 4.2); stroke(x, p => { p.moveTo(bx - fl * 2, tb.y + 2); p.quadraticCurveTo(bx + fl * 13 * sc, tb.y + 2, ex, ey); }, '#58b844', 2.4);
      leaf(x, ex, ey, 20 * sc, 8 * sc, back ? -Math.PI / 2 - .7 : -Math.PI / 2 + .7, leafG);
      if (st >= 2) leaf(x, bx + fl * 8 * sc, tb.y - 1, 11 * sc, 4.5 * sc, back ? Math.PI + .3 : -.3, adj(leafG, -.06));
    } else if (tailStyle === 'curl') {
      const cxs = bx + fl * 13 * sc, cys = tb.y - 10 * sc;
      const sp2 = spiralPts(cxs, cys, 11 * sc, 3.5 * sc, fl > 0 ? Math.PI * .75 : Math.PI * .25, 1.1, fl > 0 ? -1 : 1, 30);
      tube(x, [[bx - fl * 3, tb.y + 1]].concat(sp2), 8 * sc, 4 * sc, main);
    } else if (tailStyle === 'club') {
      const ex = bx + fl * 24 * sc, ey = tb.y - 9 * sc;
      tube(x, bezPts([bx - fl * 3, tb.y], [bx + fl * 12 * sc, tb.y + 5], [bx + fl * 18 * sc, ey + 2], [ex, ey]), 10 * sc, 5 * sc, adj(main, -.03));
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .3; cone(x, ex + Math.cos(a) * 6 * sc, ey + Math.sin(a) * 6 * sc, 5 * sc, 4.4 * sc, a, adj(acc, .2), 0, { lw: 1.1 }); }
      E(x, ex, ey, 8 * sc, 7.2 * sc, acc, { hi: .2 }); shine(x, ex - 3 * sc, ey - 3 * sc, 2.4 * sc, 1.8 * sc, .6);
    } else if (tailStyle === 'flame') {
      const fc = c.flameCol;
      stroke(x, p => { p.moveTo(bx - fl * 3, tb.y + 2); p.quadraticCurveTo(bx + fl * 10 * sc, tb.y + 3, bx + fl * 12 * sc, tb.y - 4); }, lineOf(main), 6.4); stroke(x, p => { p.moveTo(bx - fl * 3, tb.y + 2); p.quadraticCurveTo(bx + fl * 10 * sc, tb.y + 3, bx + fl * 12 * sc, tb.y - 4); }, main, 4.2);
      flame(x, bx + fl * 13 * sc, tb.y - 1, 13 * sc, 25 * sc, fl * 6, fc ? { cols: [adj(fc, -.1), fc, adj(fc, .3)] } : {});
    }
    if (c.stubTail) paint(x, p => { p.moveTo(bx - fl * 2, tb.y - 4); p.quadraticCurveTo(bx + fl * 12, tb.y, bx + fl * 15, tb.y - 8); p.quadraticCurveTo(bx + fl * 11, tb.y + 6, bx - fl * 2, tb.y + 5); p.closePath(); }, adj(main, -.04), bx + fl * 6, tb.y, 9);
  };
  if (tailStyle && tailStyle !== 'none' || c.stubTail) { parts.push({ z: -3, zb: 4.5, fn: tailFn(false), fnb: tailFn(true) }); }

  // Wings ------------------------------------------------------------------------------
  const wingStyle = c.wing || (f('wings') ? 'bird' : null);
  if (wingStyle) {
    const wb = B.merged ? body : body;
    const wingFn = back => x => {
      for (const s of [-1, 1]) {
        if (wingStyle === 'bird') {
          const wx = wb.cx + s * wb.rx * .92, wy = wb.cy;
          paint(x, p => { p.moveTo(wx - s * 3, wy - 8); p.quadraticCurveTo(wx + s * 16, wy - 10, wx + s * 14, wy + 6); p.quadraticCurveTo(wx + s * 8, wy + 4, wx + s * 6, wy + 9); p.quadraticCurveTo(wx, wy + 6, wx - s * 3, wy + 7); p.closePath(); }, adj(main, -.06), wx + s * 5, wy, 11);
          shine(x, wx + s * 4, wy - 4, 4, 2.5, .4);
        } else if (wingStyle === 'big') {
          const wx = 50 + s * body.rx * .6, wy = body.cy - body.ry * .6;
          paint(x, p => { p.moveTo(wx, wy + 6); p.quadraticCurveTo(wx + s * 18, wy - 30, wx + s * 44, wy - 22); p.quadraticCurveTo(wx + s * 40, wy - 12, wx + s * 44, wy - 6); p.quadraticCurveTo(wx + s * 36, wy - 2, wx + s * 38, wy + 6); p.quadraticCurveTo(wx + s * 28, wy + 6, wx + s * 28, wy + 14); p.quadraticCurveTo(wx + s * 14, wy + 12, wx, wy + 16); p.closePath(); }, adj(main, back ? .02 : -.04), wx + s * 18, wy - 6, 26);
          stroke(x, p => { p.moveTo(wx + s * 4, wy + 8); p.quadraticCurveTo(wx + s * 20, wy - 16, wx + s * 40, wy - 18); }, rgba(adj(main, .3), .8), 2);
          E(x, wx + s * 26, wy + 8, 6, 3, c.acc || acc, { rot: s * -.3, line: rgba(lineOf(main), .8), lw: 1.1 });
        } else if (wingStyle === 'moth') {
          const wx = 50, wy = head.cy + head.ry * .7;
          E(x, wx + s * 26, wy - 16, 22, 19, main, { rot: s * .35 });
          E(x, wx + s * 22, wy + 14, 14, 12, adj(main, -.05), { rot: s * -.3 });
          E(x, wx + s * 30, wy - 20, 8, 7, c.acc || acc, { line: rgba(lineOf(c.acc || acc), .9) }); E(x, wx + s * 30, wy - 20, 4, 3.6, back ? '#fff6c0' : '#3a2a4a', { line: false });
          E(x, wx + s * 24, wy + 16, 4.5, 4, '#f4ead0', { line: false });
          shine(x, wx + s * 20 - 6, wy - 26, 6, 4, .35);
        } else if (wingStyle === 'bat') {
          const wx = 50 + s * body.rx * .5, wy = body.cy - body.ry * .9;
          paint(x, p => { p.moveTo(wx, wy); p.quadraticCurveTo(wx + s * 18, wy - 24, wx + s * 38, wy - 18); p.quadraticCurveTo(wx + s * 34, wy - 8, wx + s * 37, wy + 2); p.quadraticCurveTo(wx + s * 28, wy - 2, wx + s * 26, wy + 8); p.quadraticCurveTo(wx + s * 18, wy + 2, wx + s * 13, wy + 12); p.quadraticCurveTo(wx + s * 8, wy + 6, wx, wy + 12); p.closePath(); }, s < 0 ? '#5a2f9a' : '#c23a86', wx + s * 16, wy - 4, 22, { hi: .12 });
          stroke(x, p => { p.moveTo(wx + s * 2, wy + 2); p.quadraticCurveTo(wx + s * 18, wy - 18, wx + s * 36, wy - 16); }, rgba('#ffffff', .35), 1.6);
        } else if (wingStyle === 'fairy') {
          const wx = 50 + s * body.rx * .45, wy = body.cy - body.ry * .55, k = SC, wc = c.wingCol || adj(acc, .3, .8);
          x.globalAlpha = .82;
          E(x, wx + s * 15 * k, wy - 12 * k, 15 * k, 10 * k, wc, { rot: s * -.55, hi: .25, line: rgba(lineOf(wc), .8), lw: 1.2 });
          E(x, wx + s * 12 * k, wy + 7 * k, 10 * k, 6.5 * k, adj(wc, .05), { rot: s * .5, hi: .25, line: rgba(lineOf(wc), .8), lw: 1.2 });
          x.globalAlpha = 1;
          stroke(x, p => { p.moveTo(wx, wy); p.quadraticCurveTo(wx + s * 12 * k, wy - 8 * k, wx + s * 25 * k, wy - 17 * k); p.moveTo(wx, wy + 1); p.quadraticCurveTo(wx + s * 9 * k, wy + 5 * k, wx + s * 18 * k, wy + 9 * k); }, rgba('#ffffff', .65), 1.1);
          sparkle(x, wx + s * 20 * k, wy - 15 * k, 2.6 * k, '#ffffff');
        } else if (wingStyle === 'dragon') {
          const wx = 50 + s * body.rx * .55, wy = body.cy - body.ry * .8, k = SC, mc = c.wingCol || adj(main, -.1), tips = [[40, -26], [44, -6], [34, 8], [22, 14]];
          paint(x, p => { p.moveTo(wx, wy + 4); p.quadraticCurveTo(wx + s * 14 * k, wy - 30 * k, wx + s * 40 * k, wy - 26 * k); for (let i = 1; i < tips.length; i++) { const [u0, v0] = tips[i - 1], [u1, v1] = tips[i]; p.quadraticCurveTo(wx + s * (u0 + u1) / 2 * k * .82, wy + (v0 + v1) / 2 * k * .7, wx + s * u1 * k, wy + v1 * k); } p.quadraticCurveTo(wx + s * 10 * k, wy + 10 * k, wx, wy + 12); p.closePath(); }, mc, wx + s * 20 * k, wy - 6 * k, 26 * k, { hi: .1 });
          for (const [u, v] of tips) stroke(x, p => { p.moveTo(wx + s * 3, wy + 1); p.quadraticCurveTo(wx + s * u * k * .45, wy + v * k * .2 - 8 * k, wx + s * u * k, wy + v * k); }, lineOf(mc), 2);
          cone(x, wx + s * 40 * k, wy - 26 * k, 5 * k, 3.4, -Math.PI / 2 + s * .4, '#fff4dc', 0, { lw: 1 });
        } else if (wingStyle === 'leaf') {
          const wx = 50 + s * body.rx * .72, wy = body.cy - body.ry * .05, k = SC;
          leaf(x, wx, wy, 30 * k, 10 * k, s > 0 ? -.45 : Math.PI + .45, adj(leafG, -.04));
          leaf(x, wx, wy + 4, 22 * k, 7.5 * k, s > 0 ? .25 : Math.PI - .25, leafG);
        } else if (wingStyle === 'ice') {
          const wx = 50 + s * body.rx * .5, wy = body.cy - body.ry * .6, k = SC, ic = c.wingCol || '#bfeeff';
          x.globalAlpha = .9;
          for (const [len, ang, w] of [[34, -.75, 11], [27, -.25, 9], [19, .2, 7]]) {
            const a = s > 0 ? ang : Math.PI - ang, cs = Math.cos(a), sn = Math.sin(a), T = (u, v) => [wx + cs * u * k - sn * v * k, wy + sn * u * k + cs * v * k];
            const q = [T(0, -w * .3), T(len * .55, -w * .5), T(len, 0), T(len * .55, w * .5), T(0, w * .3)];
            paint(x, polyP(q), ic, (q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, len * k * .5, { hi: .3, line: '#7ab8d8', lw: 1.2 });
            stroke(x, p => { p.moveTo(q[0][0], q[0][1]); p.lineTo(q[2][0], q[2][1]); }, rgba('#ffffff', .7), 1);
          }
          x.globalAlpha = 1;
          sparkle(x, wx + s * 26 * k, wy - 22 * k, 2.8 * k, '#ffffff');
        }
      }
    };
    const front = wingStyle === 'bird' ? 1.2 : -3;
    parts.push({ z: front, zb: wingStyle === 'bird' ? 1.2 : 4, fn: wingFn(false), fnb: wingFn(true) });
  }

  // Head ---------------------------------------------------------------------------------
  if (!B.merged) {
    if (c.body === 'wisp') {
      const h = head;
      add(-.2, -.2, x => {
        const g = x.createRadialGradient(50, h.cy + 8, 4, 50, h.cy + 8, 40); g.addColorStop(0, rgba('#b48aff', .5)); g.addColorStop(.6, rgba('#b48aff', .18)); g.addColorStop(1, rgba('#b48aff', 0)); x.fillStyle = g; x.beginPath(); x.arc(50, h.cy + 8, 40, 0, TAU); x.fill();
        // wispy tail curling down
        const tail = k => p => { p.moveTo(h.cx - h.rx * .78 * k, h.cy + h.ry * .4); p.bezierCurveTo(h.cx - h.rx * .8 * k, h.cy + h.ry * 1.5, h.cx - h.rx * .1, h.cy + h.ry * 1.35, h.cx + h.rx * .2, 91 - (1 - k) * 8); p.bezierCurveTo(h.cx + h.rx * .45, 93 - (1 - k) * 8, h.cx + h.rx * .9, 88 - (1 - k) * 8, h.cx + h.rx * .78, 82 - (1 - k) * 6); p.bezierCurveTo(h.cx + h.rx * .5, 86, h.cx + h.rx * .28, h.cy + h.ry * 1.2, h.cx + h.rx * .78 * k, h.cy + h.ry * .4); p.closePath(); };
        paint(x, tail(1), adj(main, .02), h.cx, h.cy + h.ry, h.ry * 1.2);
        paint(x, tail(.55), '#c8a8ff', h.cx, h.cy + h.ry, h.ry, { line: false, hi: .1 });
      });
      add(1.8, 1.8, x => { for (const [dx, hh, lean, w] of [[-13, 22, -6, 13], [13, 22, 6, 13], [0, 32, 2, 17]]) flame(x, 50 + dx, h.cy - h.ry * .45, w, hh, lean, { cols: ['#7a4ad8', '#a888ff', '#e8dcff'], glow: false }); });
    }
    const headFn = x => {
      const h = head;
      if (c.body === 'fluff') paint(x, fluffPath(h.cx, h.cy, h.rx, h.ry, 16, 2.2, 0, TAU), skin, h.cx, h.cy, Math.max(h.rx, h.ry));
      else if (c.body === 'rock') paint(x, smoothPath([[h.cx - h.rx, h.cy + 2], [h.cx - h.rx * .8, h.cy - h.ry * .9], [h.cx + h.rx * .1, h.cy - h.ry * 1.08], [h.cx + h.rx * .95, h.cy - h.ry * .7], [h.cx + h.rx * 1.02, h.cy + h.ry * .5], [h.cx + h.rx * .3, h.cy + h.ry * 1.02], [h.cx - h.rx * .6, h.cy + h.ry * .95]]), skin, h.cx, h.cy, Math.max(h.rx, h.ry));
      else if (nb === 'golem') { paint(x, headPath, skin, h.cx, h.cy, Math.max(h.rx, h.ry)); x.save(); x.beginPath(); headPath(x); x.clip(); x.fillStyle = rgba(adj(skin, -.16), .3); x.fillRect(h.cx + h.rx * .55, h.cy - h.ry, h.rx, h.ry * 2); x.restore(); }
      else E(x, h.cx, h.cy, h.rx, h.ry, skin);
      shine(x, h.cx - h.rx * .42, h.cy - h.ry * .48, h.rx * .3, h.ry * .26, .7);
    };
    if (nb === 'golem') headPath = p => p.roundRect(head.cx - head.rx, head.cy - head.ry, head.rx * 2, head.ry * 2, head.rx * .45);
    add(2, 2, headFn);
    if (nb === 'dragon') {
      const h = head;
      add(2.2, null, x => { const sy = h.cy + h.ry * .42; E(x, h.cx, sy, h.rx * .56, h.ry * .4, belly ? belly : adj(skin, .12), { lo: .08 }); for (const s of [-1, 1]) E(x, h.cx + s * h.rx * .17, sy - h.ry * .16, 1.3, 1, lineOf(skin), { flat: true, line: false }); shine(x, h.cx - h.rx * .25, sy - h.ry * .18, h.rx * .12, h.ry * .07, .6); });
      // back view: a ridge of spines down the head and back
      add(null, 2.45, x => { for (let i = 0; i < 5; i++) { const y = h.cy - h.ry * .7 + i * (body.cy - h.cy + h.ry * .5) / 4; cone(x, 50, y, 8 * B.k, 7 * B.k, -Math.PI / 2, adj(acc, .05), 0); } });
    }
  }
  // Joker: two-tone harlequin body and a pale mask face
  if (c.joker) {
    add(.3, .3, x => { x.save(); x.beginPath(); ellP(body.cx, body.cy, body.rx, body.ry)(x); x.clip(); x.fillStyle = rgba(acc, .95); for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if ((i + j) & 1) { const px = 50 + i * 9, py = body.cy + j * 11; x.beginPath(); x.moveTo(px, py - 5.5); x.lineTo(px + 4.5, py); x.lineTo(px, py + 5.5); x.lineTo(px - 4.5, py); x.fill(); } x.restore(); shine(x, body.cx - body.rx * .4, body.cy - body.ry * .45, body.rx * .3, body.ry * .3, .45); });
  }

  // Head features ------------------------------------------------------------------------
  const hd = head;
  const earStyle = c.ear || (f('ears') ? 'pointy' : null);
  if (earStyle) {
    const earFn = back => x => {
      for (const s of [-1, 1]) {
        const a = -Math.PI / 2 + s * (EAR_ANG[earStyle] || .62);
        const [bx, by] = onEll(hd, a, .86), out = a + s * (earStyle === 'fox' ? -.05 : 0);
        if (earStyle === 'fox') { cone(x, bx, by, 21 * (st >= 2 ? 1.12 : 1), 17, out, skin, -s * .06); if (!back) { cone(x, bx, by + 1, 14, 9, out, '#ffc4c4', -s * .06, { line: false, hi: .08 }); } cone(x, ...tipOf(bx, by, 21 * (st >= 2 ? 1.12 : 1), out, .72), 6, 6, out, adj(main, -.3), 0, { line: false }); }
        else if (earStyle === 'mouse') { E(x, bx + s * 2, by - 6, 11, 11, skin); if (!back) E(x, bx + s * 2, by - 5, 6.5, 6.5, '#ffb070', { line: false, lo: .05 }); }
        else if (earStyle === 'spark') { cone(x, bx, by, 25, 13, out, skin, s * .15); cone(x, ...tipOf(bx, by, 25, out, .62), 10, 7, out + s * .15, '#4a8cff', 0, { line: false }); if (!back) cone(x, bx, by + 1, 14, 6, out, '#ffb070', s * .1, { line: false }); }
        else if (earStyle === 'cat') { cone(x, bx, by, 16, 15, out, skin, -s * .05); if (!back) cone(x, bx, by + 1, 10, 8, out, '#ffd0e4', -s * .05, { line: false }); }
        else if (earStyle === 'frill') { for (let k = 0; k < (st >= 2 ? 3 : 2); k++) cone(x, bx - s * k * 1.5, by + k * 5.5, 10 - k * 1.8, 6.5, a + s * (.2 + k * .25), k ? adj(main, .05) : c.belly || main); }
        else if (earStyle === 'nub') { E(x, bx, by + 2, 5.4, 4.6, adj(main, -.08)); if (!back) E(x, bx, by + 2.4, 2.6, 2.2, '#e8a888', { line: false }); }
        else if (earStyle === 'bunny') { const L = 27 * SC, ang = out - s * .12, ccx = bx + Math.cos(ang) * L * .45, ccy = by + Math.sin(ang) * L * .45; E(x, ccx, ccy, L * .55, 6.8 * SC, skin, { rot: ang }); if (!back) E(x, ccx + Math.cos(ang) * 1.5, ccy + Math.sin(ang) * 1.5, L * .4, 3.6 * SC, '#ffc4d6', { rot: ang, line: false, hi: .08 }); }
        else if (earStyle === 'bear') { const r = 8.5 * (st >= 2 ? 1.1 : 1); E(x, bx, by, r, r * .94, skin); if (!back) E(x, bx + s * .5, by + .5, r * .55, r * .5, c.belly || '#f4c0b0', { line: false, lo: .05 }); }
        else if (earStyle === 'fin') { const fc = c.finCol || acc, ang = a + s * .45, cs = Math.cos(ang), sn = Math.sin(ang), T = (u, v) => [bx + cs * u - sn * v, by + sn * u + cs * v], L = 18 * SC; paint(x, p => { const q0 = T(0, -6), q1 = T(L, -s * 9), q2 = T(L * .8, 0), q3 = T(L * .95, s * 6), q4 = T(0, 6); p.moveTo(q0[0], q0[1]); p.quadraticCurveTo(T(L * .5, -s * 8)[0], T(L * .5, -s * 8)[1], q1[0], q1[1]); p.quadraticCurveTo(q2[0], q2[1], q3[0], q3[1]); p.quadraticCurveTo(T(L * .5, s * 6)[0], T(L * .5, s * 6)[1], q4[0], q4[1]); p.closePath(); }, fc, bx, by, L * .6); for (const v of [-4, 0, 3.5]) stroke(x, p => { const u0 = T(2, v * .4), u1 = T(L * .75, v); p.moveTo(u0[0], u0[1]); p.lineTo(u1[0], u1[1]); }, rgba('#ffffff', .45), 1); }
        else if (earStyle === 'leaf') leaf(x, bx, by + 1, 20 * SC, 7.5 * SC, out, leafG);
        else if (earStyle === 'droopy') { const L = 22 * SC, ec = c.earCol || adj(skin, -.1); tube(x, bezPts([bx, by], [bx + s * 9 * SC, by - 2], [bx + s * 12 * SC, by + L * .5], [bx + s * 8 * SC, by + L]), 12 * SC, 10 * SC, ec); }
        else { cone(x, bx, by, 16, 12, out, skin); if (!back) cone(x, bx, by + 1, 10, 6, out, adj(main, .22), 0, { line: false }); }
      }
    };
    parts.push({ z: earStyle === 'droopy' ? 2.1 : 1.8, zb: 2.5, fn: earFn(false), fnb: earFn(true) });
  }
  const hornStyle = c.horn || (f('horns') ? 'curl' : null);
  if (hornStyle === 'curl' || hornStyle === 'dark' || hornStyle === 'rock' || hornStyle === 'rhino' || hornStyle === 'crest') {
    add(c.mane ? 1.75 : 1.7, 2.4, x => {
      if (hornStyle === 'rhino') { cone(x, 50, hd.cy - hd.ry * .75, 22, 11, -Math.PI / 2 - .18, adj(acc, .02), .12); return; }
      for (const s of [-1, 1]) {
        if (hornStyle === 'crest') { for (let k = 0; k < 3; k++) cone(x, 50 + s * 3, hd.cy - hd.ry * .8, 18 - k * 3, 6, -Math.PI / 2 + s * (.45 + k * .38), k ? acc : adj(main, -.06), -s * .18); continue; }
        const a = -Math.PI / 2 + s * .38, [bx, by] = onEll(hd, a, .9);
        const col = hornStyle === 'dark' ? '#3a2a40' : hornStyle === 'rock' ? acc : '#fff0cc';
        cone(x, bx, by, hornStyle === 'rock' ? 13 : 17, hornStyle === 'rock' ? 10 : 8, a + s * .25, col, -s * .25);
      }
    });
  }
  if (hornStyle === 'moon') {
    add(3.4, null, x => paint(x, p => { p.arc(50, hd.cy - hd.ry * .62, 6.5, .35 * Math.PI, 1.65 * Math.PI, false); p.arc(52.6, hd.cy - hd.ry * .66, 5.2, 1.6 * Math.PI, .42 * Math.PI, true); p.closePath(); }, '#ffe46a', 50, hd.cy - hd.ry * .62, 6.5));
  }
  if (hornStyle === 'jester') {
    add(2.6, 2.6, x => {
      const hy = hd.cy - hd.ry * .42, w = hd.rx * 1.02;
      // centre point (behind), then the two floppy side points, each with a gold bell
      const pt = (bx0, bx1, cx1, cy1, tx, ty, col) => paint(x, p => { p.moveTo(bx0, hy + 2); p.quadraticCurveTo(cx1, cy1, tx, ty); p.quadraticCurveTo((cx1 + bx1) / 2 + (tx > 50 ? -4 : tx < 50 ? 4 : 0), (cy1 + hy) / 2 + 6, bx1, hy + 2); p.closePath(); }, col, (bx0 + tx) / 2, (hy + ty) / 2, 16);
      pt(50 - w * .45, 50 + w * .45, 46, hy - 40, 60, hy - 38, '#ffd24a');
      pt(50 - w, 50 + w * .1, 50 - w * .9, hy - 34, 50 - w * 1.55, hy - 8, '#6a3fc0');
      pt(50 - w * .1, 50 + w, 50 + w * .9, hy - 34, 50 + w * 1.55, hy - 8, '#ff4fa6');
      for (const [bx, by] of [[50 - w * 1.55, hy - 6], [50 + w * 1.55, hy - 6], [61, hy - 37]]) { E(x, bx, by + 1.5, 4.4, 4.4, '#ffd24a'); stroke(x, p => { p.moveTo(bx - 2, by + 3); p.lineTo(bx + 2, by + 3); }, lineOf('#ffd24a'), 1); shine(x, bx - 1.4, by, 1.6, 1.3, .9); }
      paint(x, p => { p.ellipse(50, hy + 2.5, w, 5.5, 0, Math.PI, TAU); p.ellipse(50, hy + 2.5, w, 2.6, 0, 0, Math.PI); }, '#2e1f5a', 50, hy + 2, w);
      for (let i = -2; i <= 2; i++) E(x, 50 + i * w * .4, hy + 1.8, 1.7, 1.7, '#ffd24a', { line: false });
    });
  }
  if (hornStyle === 'unicorn' || hornStyle === 'antler' || hornStyle === 'crystal' || hornStyle === 'ram' || hornStyle === 'twin') {
    const hornFn = back => x => {
      const hc = c.hornCol;
      if (hornStyle === 'unicorn') {
        const [bx, by] = onEll(hd, -Math.PI / 2, .86), L = 22 * SC, col = hc || '#ffe9a8';
        cone(x, bx, by, L, 8.5 * SC, -Math.PI / 2, col, 0, { hi: .25 });
        for (let i = 1; i <= 3; i++) { const y = by - L * i * .22, w = 4.2 * SC * (1 - i * .22); stroke(x, p => { p.moveTo(bx - w, y + 1.4); p.quadraticCurveTo(bx, y - .6, bx + w, y - 1.6); }, lineOf(col), 1.1); }
        if (!back) sparkle(x, bx + 6 * SC, by - L * .85, 2.6, '#ffffff');
        return;
      }
      if (hornStyle === 'crystal') {
        const col = hc || c.acc || '#b8e8f8';
        for (const [a, l, w] of [[-.42, 12, 6.5], [0, 19, 8], [.42, 13, 6.5]].concat(st >= 3 ? [[-.8, 9, 5], [.8, 9, 5]] : [])) {
          const [px, py] = onEll(hd, -Math.PI / 2 + a, .84);
          cone(x, px, py, l * SC, w * SC, -Math.PI / 2 + a * 1.3, col, 0, { hi: .3 });
          stroke(x, p => { p.moveTo(px, py); p.lineTo(px + Math.cos(-Math.PI / 2 + a * 1.3) * l * SC * .8, py + Math.sin(-Math.PI / 2 + a * 1.3) * l * SC * .8); }, rgba('#ffffff', .6), 1);
        }
        return;
      }
      for (const s of [-1, 1]) {
        if (hornStyle === 'antler') {
          const [bx, by] = onEll(hd, -Math.PI / 2 + s * .48, .88), col = hc || '#b88a5c', L = 20 * SC;
          const beam = bezPts([bx, by], [bx + s * 4 * SC, by - L * .5], [bx + s * L * .7, by - L * .8], [bx + s * L * .85, by - L * 1.1], 14);
          const tines = [[.45, -.5, 9], [.75, -.1, 8]].concat(st >= 2 ? [[.3, .55, 7]] : []).concat(st >= 3 ? [[.92, .5, 6]] : []);
          const draw = (col2, w) => { stroke(x, p => beam.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])), col2, w); for (const [t, d, l] of tines) { const q = beam[Math.round(t * 14)]; stroke(x, p => { p.moveTo(q[0], q[1]); p.lineTo(q[0] + s * d * l * SC, q[1] - l * SC * .9); }, col2, w * .85); } };
          draw(lineOf(col), 5.4); draw(col, 3.4);
          continue;
        }
        if (hornStyle === 'ram') {
          const [bx, by] = onEll(hd, -Math.PI / 2 + s * 1.0, .8), col = hc || '#eadcb4', r = 9 * SC, ccx = bx + s * 6 * SC, ccy = by + 2;
          const pts = [[bx - s * 2, by - 3]].concat(spiralPts(ccx, ccy, r, 2.8 * SC, s > 0 ? -Math.PI * .85 : -Math.PI * .15, 1.05, s, 26));
          tube(x, pts, 9 * SC, 4 * SC, col, { hi: .2 });
          for (let i = 4; i < 22; i += 4) { const q = pts[i]; E(x, q[0], q[1], .9, .9, rgba(lineOf(col), .6), { flat: true, line: false }); }
          continue;
        }
        // twin: two long, slightly swept horns
        const a = -Math.PI / 2 + s * .32, [bx, by] = onEll(hd, a, .9), col = hc || '#fff0cc';
        cone(x, bx, by, 21 * SC, 8.5 * SC, a + s * .12, col, -s * .18, { hi: .2 });
        stroke(x, p => { p.moveTo(bx + Math.cos(a) * 6, by + Math.sin(a) * 6 - 1); p.lineTo(bx + Math.cos(a + s * .1) * 9 - s, by + Math.sin(a + s * .1) * 9 - 1); }, rgba(lineOf(col), .6), 1.1);
      }
    };
    parts.push({ z: 1.7, zb: 2.4, fn: hornFn(false), fnb: hornFn(true) });
  }
  if (c.spikes === 'collar') add(1.7, 1.7, x => { const y0 = hd.cy + hd.ry * .78; for (let i = -4; i <= 4; i++) { const a = Math.PI / 2 + i * .32; cone(x, 50 + i * 3.4, y0, 11, 7.5, a, i & 1 ? '#ffffff' : '#ff4fa6', 0); } });
  else if (f('spikes') && !c.shell && !c.rockBack && !c.thorns && !c.crystals) {
    const spk = back => x => { const e = B.merged ? body : hd; for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * .45, [px, py] = onEll(e, a, .82); cone(x, px, py, 12, 9, a, adj(acc, .05)); } if (back && !B.merged) for (let i = 0; i < 3; i++) cone(x, 50, body.cy - body.ry * .5 + i * 9, 7, 7, -Math.PI / 2, adj(acc, .05)); };
    parts.push({ z: -2, zb: 4, fn: spk(false), fnb: spk(true) });
  }
  if (c.crystals) {
    const e = B.merged ? body : hd;
    add(-.5, -.5, x => { for (const [a, l, w] of [[-1.9, 14, 7], [-1.45, 20, 8], [-1.05, 12, 6.5]]) { const [px, py] = onEll(e, a, .82); cone(x, px, py, l, w, a, '#b8e8f8', 0, { line: '#5a9ab8', hi: .25 }); } });
  }
  if (f('flame') && !c.mane) {
    const sc = st >= 2 ? 1.35 : 1;
    add(1.7, 1.7, x => flame(x, 50 + 2, hd.cy - hd.ry * .7, 13 * sc, 24 * sc, 4));
  }
  if (c.mane) add(1.7, 1.7, x => { for (const [dx, h, lean, w] of [[-14, 22, -8, 13], [14, 22, 8, 13], [-6, 30, -3, 15], [6, 30, 4, 15], [0, 36, 1, 16]]) flame(x, 50 + dx, hd.cy - hd.ry * .55, w, h, lean, { glow: dx === 0 }); });
  if (c.leaf === 'sprout') add(1.7, 1.7, x => { const y0 = hd.cy - hd.ry * .9; stroke(x, p => { p.moveTo(50, y0 + 4); p.quadraticCurveTo(49, y0 - 5, 52, y0 - 10); }, lineOf('#4aa83a'), 4); stroke(x, p => { p.moveTo(50, y0 + 4); p.quadraticCurveTo(49, y0 - 5, 52, y0 - 10); }, '#58b844', 2.4); leaf(x, 52, y0 - 9, 17, 6.5, -.25, '#8ae06a'); leaf(x, 51, y0 - 8, 14, 5.5, Math.PI + .45, '#6ccc50'); });
  if (c.leaf === 'hood') add(1.7, 2.5, x => { const y0 = hd.cy - hd.ry * .75; leaf(x, 48, y0 + 4, 30, 10, -Math.PI / 2 - .55, '#3eaa4a'); leaf(x, 52, y0 + 4, 30, 10, -Math.PI / 2 + .55, '#4abc50'); leaf(x, 50, y0 + 2, 22, 7, -Math.PI / 2, '#7ad65e'); });
  if (c.leaf === 'tree') add(-2.2, -2.2, x => { const y0 = body.cy - body.ry * 1.25; stroke(x, p => { p.moveTo(64, body.cy - 4); p.lineTo(66, y0 - 6); }, '#8a5a3a', 4); paint(x, fluffPath(66, y0 - 14, 15, 12, 10, 3), '#4ab84a', 66, y0 - 14, 15); shine(x, 61, y0 - 19, 5, 4, .5); for (let i = 0; i < 3; i++) E(x, 60 + i * 6, y0 - 12 + (i % 2) * 4, 1.8, 1.8, '#ffe0f0', { line: false }); });
  if (f('fin') && c.fin) {
    add(1.7, 2.4, x => {
      if (c.fin === 'side') { for (const s of [-1, 1]) paint(x, p => { const bx = 50 + s * body.rx * .96, by = body.cy + body.ry * .05; p.moveTo(bx, by - 5); p.quadraticCurveTo(bx + s * 11, by - 6, bx + s * 13, by - 12); p.quadraticCurveTo(bx + s * 12, by + 2, bx, by + 5); p.closePath(); }, '#8ad0ff', 50 + s * body.rx, body.cy, 8); return; }
      const big = c.fin === 'crest' ? 1.5 : 1, y0 = hd.cy - hd.ry * .8;
      paint(x, p => { p.moveTo(42, y0 + 6); p.quadraticCurveTo(44, y0 - 14 * big, 54 + 8 * big, y0 - 16 * big); p.quadraticCurveTo(54, y0 - 4, 58, y0 + 6); p.closePath(); }, '#8ad0ff', 50, y0 - 6, 12 * big);
      stroke(x, p => { p.moveTo(47, y0 + 3); p.quadraticCurveTo(50, y0 - 8 * big, 56 + 4 * big, y0 - 12 * big); }, rgba('#ffffff', .6), 1.4);
    });
  }
  const antStyle = c.antenna || (f('antenna') ? 'ball' : null);
  if (antStyle) add(1.75, 2.4, x => {
    for (const s of [-1, 1]) {
      const [bx, by] = onEll(hd, -Math.PI / 2 + s * .35, .9), tx = bx + s * 10, ty = by - 18;
      if (antStyle === 'feather') { stroke(x, p => { p.moveTo(bx, by); p.quadraticCurveTo(bx + s * 2, ty + 6, tx, ty); }, lineOf(main), 2.2); for (let k = 1; k <= 4; k++) { const px = bx + (tx - bx) * k / 4.5, py = by + (ty - by) * k / 4.5; leaf(x, px, py, 7, 2.2, -Math.PI / 2 + s * 1.2, c.acc || acc); } continue; }
      stroke(x, p => { p.moveTo(bx, by); p.quadraticCurveTo(bx + s * 1, ty + 4, tx, ty); }, lineOf(main), 3.4); stroke(x, p => { p.moveTo(bx, by); p.quadraticCurveTo(bx + s * 1, ty + 4, tx, ty); }, adj(main, -.05), 1.8);
      E(x, tx, ty, 4, 4, sp.id === 20 ? acc : '#ffe04a');
    }
  });
  if (c.tuft) add(1.7, 2.4, x => { for (let k = -1; k <= 1; k++) cone(x, 50 + k * 5, hd.cy - hd.ry * .8, 15 - Math.abs(k) * 3, 9, -Math.PI / 2 + k * .5, main, k * .15); });
  if (c.tuft3) add(1.7, 2.4, x => { for (let k = -1; k <= 1; k++) leaf(x, 50, hd.cy - hd.ry * .82, 13 - Math.abs(k) * 2, 3.2, -Math.PI / 2 + k * .45, k ? adj(main, -.05) : main); });
  if (c.goggles) add(3.5, 2.6, x => { const y = hd.cy - hd.ry * .56; stroke(x, p => { p.ellipse(50, y + 2, hd.rx * .98, 3.4, 0, Math.PI, TAU); }, '#6a4a3a', 2.4); for (const s of [-1, 1]) { E(x, 50 + s * 6.8, y, 6.2, 5, '#9a7a6a'); E(x, 50 + s * 6.8, y, 4.3, 3.4, '#9ae0ff', { hi: .3 }); shine(x, 50 + s * 6.8 - 1.5, y - 1.3, 1.8, 1.3, .9); } });
  if (c.stars) add(5, 5, x => { star(x, 18, 30, 5, '#ffe46a'); star(x, 84, 22, 4, '#fff0a0'); sparkle(x, 80, 46, 3.5, '#ffffff'); sparkle(x, 16, 52, 2.6, '#fff6c0'); });
  if (c.joker) add(5, 5, x => { sparkle(x, 12, 24, 4, '#ffe46a'); sparkle(x, 88, 60, 3.2, '#ff9ad0'); });

  // Face ---------------------------------------------------------------------------------
  const fo = { eye: c.eye, mouth: c.mouth, iris: c.iris, cheek: c.cheek, cheeks: c.cheeks, skin, hook: c.hook, eyeR: c.eyeR, eyeAsp: c.eyeAsp };
  if (c.body === 'drop') fo.eyeY = .2;
  if (c.body === 'cater') fo.eyeY = .02;
  if (B.merged && c.body !== 'drop') fo.eyeY = -.08;
  if (c.joker) fo.brow = '#5a1a60';
  const EYEY = { fish: -.05, jelly: -.14, shroom: .3, crystal: .02, blob: .05, bird: -.06, cloud: .02, dragon: -.12 };
  if (nb && EYEY[nb] !== undefined && c.eyeY === undefined) fo.eyeY = EYEY[nb];
  if (nb === 'dragon') fo.mouthY = .2;
  if (c.eyeY !== undefined) fo.eyeY = c.eyeY;
  addFlags(fo);
  const faceFn = closed => x => {
    if (c.joker) { star(x, hd.cx - hd.rx * .42, hd.cy + hd.ry * .08, hd.rx * .3, '#ff4fa6', { line: false, flat: true }); paint(x, p => { const px = hd.cx + hd.rx * .42, py = hd.cy + hd.ry * .52; p.moveTo(px, py - 3.5); p.lineTo(px + 2.2, py); p.lineTo(px, py + 3.5); p.lineTo(px - 2.2, py); p.closePath(); }, '#6a3fc0', hd.cx, hd.cy, 3, { line: false, flat: true }); }
    face(x, hd, Object.assign({}, fo, { closed: closed && c.eye !== 'sleepy' ? true : false }));
    if (closed && c.eye === 'sleepy') face(x, hd, Object.assign({}, fo, { closed: true, cheeks: false, mouth: 'none' }));
    if (c.nose) { E(x, 50, hd.cy + hd.ry * .35, 4.6, 3.6, '#ff8aa8'); shine(x, 48.6, hd.cy + hd.ry * .3, 1.6, 1.1, .9); }
  };
  parts.push({ z: 3, zb: null, fn: faceFn(false), fnc: faceFn(true) });
  // Back view: a soft darker cap over the back of the head reads as "seen from behind".
  add(null, 2.3, x => { x.save(); x.beginPath(); (headPath || ellP(hd.cx, hd.cy, hd.rx, hd.ry))(x); x.clip(); const g = x.createLinearGradient(0, hd.cy - hd.ry, 0, hd.cy + hd.ry); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(lineOf(skin), .22)); x.fillStyle = g; x.fillRect(0, 0, 100, 100); x.restore(); });

  return parts;

  // ---- Extra flags (accessories and effects) -------------------------------------------------
  function addFlags(fo) {
    const M = B.merged, k = SC, big = Math.max(body.rx || 0, hd.rx);
    const ey = hd.cy + hd.ry * (fo.eyeY || .08), rnd = fo.eye === 'round';
    const erx = hd.rx * (fo.eyeR || (rnd ? .175 : .155)), ery = erx * (fo.eyeAsp || (rnd ? 1.08 : 1.38)), esp = hd.rx * (fo.eyeSp || .42);
    const my = ey + ery * 1.45 + hd.ry * (fo.mouthY || 0);
    const nY = M ? body.cy + body.ry * .5 : hd.cy + hd.ry * .86, nW = M ? body.rx * .84 : hd.rx * .62;
    const both = (z, fnf, zb) => parts.push({ z, zb: zb === undefined ? z : zb, fn: fnf(false), fnb: fnf(true) });
    const mx = (back, v) => back ? 100 - v : v;
    if (c.petals) {
      const pc = c.petalCol || acc, n = st >= 3 ? 10 : st === 2 ? 9 : 8, z = M ? -.6 : 1.9;
      add(z, z, x => {
        for (const layer of st >= 2 ? [1, 0] : [0]) for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i + layer * .5) * TAU / n, [px, py] = onEll(hd, a, 1.02 + layer * .14);
          E(x, px, py, hd.rx * (.36 + layer * .04), hd.rx * .21, layer ? adj(pc, -.07) : pc, { rot: a, hi: .14 });
        }
      });
    }
    if (c.icicles) {
      const y0 = M ? body.cy + body.ry * .55 : hd.cy + hd.ry * .8, w = M ? body.rx * .72 : hd.rx * .7, n = st >= 3 ? 7 : st === 2 ? 6 : 5;
      add(2.15, 2.15, x => {
        const band = p => { p.moveTo(50 - w, y0); p.quadraticCurveTo(50, y0 + 5, 50 + w, y0); };
        stroke(x, band, '#7ab8d8', 4.6); stroke(x, band, '#e8faff', 2.8);
        for (let i = 0; i < n; i++) { const u = -1 + 2 * (i + .5) / n, px = 50 + u * w * .95, py = y0 + 2.4 * (1 - u * u); cone(x, px, py, (i % 2 ? 6 : 9) * k, 4.4, Math.PI / 2, '#d4f4ff', 0, { line: '#7ab8d8', hi: .3, lw: 1 }); }
      });
    }
    if (c.armor) {
      const ac = c.armorCol || (c.acc ? acc : '#b8c4d6');
      const pl = M ? { y: body.cy + body.ry * .45, w: body.rx * .5, h: body.ry * .48 } : { y: body.cy - body.ry * .45, w: body.rx * .62, h: body.ry * 1.2 };
      const shield = p => { p.moveTo(50 - pl.w, pl.y); p.quadraticCurveTo(50, pl.y - 3, 50 + pl.w, pl.y); p.quadraticCurveTo(50 + pl.w, pl.y + pl.h * .7, 50, pl.y + pl.h); p.quadraticCurveTo(50 - pl.w, pl.y + pl.h * .7, 50 - pl.w, pl.y); p.closePath(); };
      add(.7, null, x => { paint(x, shield, ac, 50, pl.y + pl.h * .4, pl.w, { hi: .3 }); stroke(x, p => { p.moveTo(50, pl.y + 1); p.lineTo(50, pl.y + pl.h - 2); }, rgba('#ffffff', .45), 1.2); for (const s of [-1, 1]) E(x, 50 + s * pl.w * .62, pl.y + 2.6, 1.3, 1.3, adj(ac, .25), { lw: .7 }); });
      add(null, .7, x => { const bw = body.rx * .82, by0 = body.cy - body.ry * .7; paint(x, p => p.roundRect(50 - bw, by0, bw * 2, body.ry * 1.25, bw * .45), ac, 50, body.cy, bw, { hi: .25 }); for (let i = -1; i <= 1; i++) stroke(x, p => { p.moveTo(50 - bw * .8, by0 + body.ry * (.3 + (i + 1) * .3)); p.lineTo(50 + bw * .8, by0 + body.ry * (.3 + (i + 1) * .3)); }, rgba(lineOf(ac), .5), 1.1); });
      const pads = x => { for (const s of [-1, 1]) { const px = 50 + s * body.rx * (M ? .9 : .88), py = M ? body.cy + body.ry * .1 : body.cy - body.ry * .55; E(x, px, py, 7.5 * k, 5.6 * k, ac, { hi: .3, rot: s * .3 }); shine(x, px - 2, py - 2, 2.4, 1.4, .7); } };
      add(1.2, 1.2, pads);
      if (st >= 3) add(2.55, 2.55, x => { const [bx, by] = onEll(hd, -Math.PI / 2, .9); paint(x, p => { p.ellipse(hd.cx, hd.cy - hd.ry * .35, hd.rx * 1.02, hd.ry * .7, 0, Math.PI * 1.08, Math.PI * 1.92); p.quadraticCurveTo(hd.cx, hd.cy - hd.ry * .55, hd.cx - hd.rx * .95, hd.cy - hd.ry * .52); p.closePath(); }, ac, hd.cx, hd.cy - hd.ry * .7, hd.rx, { hi: .3 }); cone(x, bx, by - 2, 9 * k, 6 * k, -Math.PI / 2, adj(ac, .1), 0); });
    }
    if (c.scarf) {
      const scC = c.scarfCol || acc, w = nW, y0 = nY;
      both(2.15, back => x => {
        const tl = (x0, x1, y1) => { tube(x, bezPts([x0, y0 + 1], [x0 + (x1 - x0) * .3, y0 + 6], [x1, y1 - 6], [x1, y1]), 7 * k, 6 * k, adj(scC, -.04)); };
        if (back) { tl(48, 45, y0 + 15 * k); tl(52, 57, y0 + 13 * k); }
        paint(x, p => { p.moveTo(50 - w, y0 - 3); p.quadraticCurveTo(50, y0 + 4, 50 + w, y0 - 3); p.lineTo(50 + w, y0 + 2.5); p.quadraticCurveTo(50, y0 + 10, 50 - w, y0 + 2.5); p.closePath(); }, scC, 50, y0, w, { hi: .2 });
        stroke(x, p => { p.moveTo(50 - w * .9, y0 + .5); p.quadraticCurveTo(50, y0 + 7, 50 + w * .9, y0 + .5); }, rgba('#ffffff', .4), 1.2);
        if (!back) { const kx = 50 + w * .48; tl(kx, kx + 4 * k, y0 + 16 * k); E(x, kx, y0 + 3, 3.6 * k, 3.2 * k, adj(scC, .04)); }
      });
    }
    if (c.halo) {
      add(5, 5, x => { const hy = hd.cy - hd.ry - 7 * k, rx = hd.rx * .55, ry = 3.4 * k; const r = p => p.ellipse(50, hy, rx, ry, 0, 0, TAU); stroke(x, r, rgba('#ffe46a', .35), 6); stroke(x, r, '#c8961e', 3.4); stroke(x, r, '#ffe46a', 1.9); sparkle(x, 50 + rx, hy - 1, 2.4, '#ffffff'); });
    }
    if (c.gears) {
      const gc = c.gearCol || (c.acc ? acc : '#b0b8c8');
      const gear = (x, cx, cy, r, n) => { paint(x, cogP(cx, cy, r, n), gc, cx, cy, r, { hi: .22 }); E(x, cx, cy, r * .45, r * .45, adj(gc, -.1)); E(x, cx, cy, r * .17, r * .17, lineOf(gc), { flat: true, line: false }); };
      const G0 = [[50 + body.rx * .85, body.cy - body.ry * .55, 10 * k, 8], [50 + body.rx * .85 + 12 * k, body.cy - body.ry * .55 - 9 * k, 6 * k, 6]].concat(st >= 2 ? [[50 - body.rx * .82, body.cy - body.ry * .8, 7.5 * k, 7]] : []);
      both(-.8, back => x => { for (const [gx, gy, r, n] of G0) gear(x, mx(back, gx), gy, r, n); }, 3.5);
    }
    if (c.bow) {
      const bc = c.bowCol || (c.acc ? acc : '#ff6fa8'), [bx0, by] = onEll(hd, -Math.PI / 2 + .75, .92), r = 6.5 * k;
      both(2.6, back => x => {
        const bx = mx(back, bx0);
        for (const s of [-1, 1]) tube(x, [[bx, by], [bx + s * 2.5, by + 4 * k], [bx + s * 3.5, by + 8 * k]], 3.4 * k, 3 * k, adj(bc, -.06));
        for (const s of [-1, 1]) paint(x, p => { p.moveTo(bx, by); p.bezierCurveTo(bx + s * r * 1.7, by - r * 1.4, bx + s * r * 1.9, by + r * .9, bx, by); p.closePath(); }, bc, bx + s * r * .8, by - r * .2, r, { hi: .25 });
        E(x, bx, by, r * .42, r * .4, adj(bc, .05));
      });
    }
    if (c.crown) {
      const cc = c.crownCol || '#ffd24a', w = hd.rx * .5 * (st >= 3 ? 1.15 : 1), h = 10 * k, by = hd.cy - hd.ry * .82;
      both(2.7, back => x => {
        const pts = [[50 - w, by], [50 - w * 1.12, by - h], [50 - w * .5, by - h * .5], [50, by - h * 1.18], [50 + w * .5, by - h * .5], [50 + w * 1.12, by - h], [50 + w, by]];
        paint(x, p => { pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.quadraticCurveTo(50, by + 3, 50 - w, by); p.closePath(); }, cc, 50, by - h * .5, w, { hi: .25 });
        for (const i of [1, 3, 5]) E(x, pts[i][0], pts[i][1], 1.9 * k, 1.9 * k, adj(cc, .1), { lw: .8 });
        if (!back) gemShape(x, 50, by - h * .38, 2.8 * k, c.gemCol || '#ff4f8a');
      });
    }
    if (c.tentacles) {
      const n = st >= 3 ? 6 : st === 2 ? 5 : 4, J = nb === 'jelly', tcol = c.tentCol || (J ? adj(main, .08) : adj(main, -.03));
      const by = body.cy + body.ry * (J ? .35 : .55);
      add(-.4, -.4, x => {
        if (J) x.globalAlpha = .9;
        for (let i = 0; i < n; i++) {
          const u = -1 + 2 * (i + .5) / n, bx = 50 + u * body.rx * (J ? .72 : .62), wv = (i % 2 ? 1 : -1) * 4 * k;
          const ex = J ? bx + wv * .5 : 50 + u * body.rx * 1.3, ey = J ? 89 - Math.abs(u) * 4 : 90;
          const pts = J ? bezPts([bx, by], [bx + wv, by + (ey - by) * .35], [bx - wv, by + (ey - by) * .7], [ex, ey]) : bezPts([bx, by], [bx + u * 4, by + 10], [ex - u * 6, ey + 1], [ex + u * 3, ey - 3]);
          tube(x, pts, (J ? 5 : 7) * k, (J ? 1.6 : 3) * k, tcol);
          if (!J) for (let j = 6; j < 18; j += 4) E(x, pts[j][0], pts[j][1] + 1, 1.1, 1, belly2, { flat: true, line: false });
        }
        x.globalAlpha = 1;
      });
    }
    if (c.snowcap) {
      const e = B.cap || hd, th = M ? .62 : .55, n = 5;
      add(B.cap ? 2.56 : 2.5, B.cap ? 2.56 : 2.5, x => {
        const xl = e.cx - e.rx * 1.04 * Math.cos(th), xr = e.cx + e.rx * 1.04 * Math.cos(th), yy = e.cy - e.ry * 1.04 * Math.sin(th);
        paint(x, p => { p.ellipse(e.cx, e.cy, e.rx * 1.04, e.ry * 1.04, 0, Math.PI + th, TAU - th); for (let i = 1; i <= n; i++) { const xa = xr + (xl - xr) * (i - .5) / n, xb = xr + (xl - xr) * i / n; p.quadraticCurveTo(xa, yy + (i % 2 ? 6 : 3.5) * k, xb, yy + (i === n ? 0 : 1)); } p.closePath(); }, '#ffffff', e.cx, e.cy - e.ry * .8, e.rx, { line: '#a8c8e8', hi: .02, lo: .1 });
        sparkle(x, e.cx - e.rx * .35, e.cy - e.ry * .9, 2.2, '#bfe8ff');
      });
    }
    if (c.leafSkirt) {
      const y0 = body.cy + body.ry * (M ? .35 : .2), w = body.rx * (M ? .9 : .95), n = st >= 3 ? 9 : 7;
      add(.55, .55, x => {
        for (const pass of [0, 1]) for (let i = pass; i < n; i += 2) {
          const u = -1 + 2 * i / (n - 1), px = 50 + u * w * .92, py = y0 + (1 - u * u) * 3, a = Math.PI / 2 - u * .95;
          const len = Math.min((12 + (i % 2) * 3) * k, (91.5 - py) / Math.max(.3, Math.sin(a)));
          leaf(x, px, py - 2, len, 5 * k, a, i % 2 ? adj(leafG, -.08) : leafG);
        }
      });
    }
    if (c.flowerCrown) {
      const cols = [c.flowerCol || acc, '#fff4f8', '#ffc0dc'], js = st >= 2 ? [-3, -2, -1, 0, 1, 2, 3] : [-2, -1, 0, 1, 2], step = st >= 2 ? .34 : .42;
      add(2.6, 2.6, x => {
        for (const j of js) { if (j === js[js.length - 1]) continue; const [lx, ly] = onEll(hd, -Math.PI / 2 + (j + .5) * step, .93); leaf(x, lx, ly, 6 * k, 2.4 * k, -Math.PI / 2 + (j + .5) * step, leafG); }
        for (const j of js) { const [px, py] = onEll(hd, -Math.PI / 2 + j * step, .92); flower5(x, px, py, 5 * k, cols[(j + 9) % 3]); }
      });
    }
    if (c.mushroomSpots && nb !== 'shroom') {
      const e = hd, sc = c.spots || '#fff6e8', path = headPath || ellP(e.cx, e.cy, e.rx, e.ry);
      add(M ? .45 : 2.05, M ? .45 : 2.05, x => { x.save(); x.beginPath(); path(x); x.clip(); for (const [u, v, r] of [[-.6, -.62, .17], [.08, -.86, .2], [.66, -.55, .15], [-.9, .1, .13], [.9, .2, .12]]) E(x, e.cx + u * e.rx, e.cy + v * e.ry, r * e.rx, r * e.rx * .85, sc, { line: rgba(lineOf(main), .3), lw: .8 }); x.restore(); });
    }
    if (c.gem) {
      const gc = c.gemCol || (c.acc ? acc : '#5ad8ff'), gy = hd.cy - hd.ry * (M ? .56 : .52);
      add(3.2, null, x => gemShape(x, 50, gy, 4.6 * k, gc));
    }
    if (c.sparkles) {
      const top = Math.min(hd.cy - hd.ry, body.cy - body.ry), L = 50 - big - 5, Rr = 50 + big + 5, scol = c.sparkleCol || '#ffd84a';
      const S = [[L, top + 8, 4], [Rr, top + 3, 3.4], [Rr + 1, body.cy + 2, 2.6], [L - 1, body.cy + body.ry * .3, 2.6], [50 + hd.rx * .65, top - 5, 2.4]].concat(st >= 3 ? [[50 - hd.rx * .7, top - 3, 2.2]] : []);
      both(5, back => x => S.forEach(([sx, sy, r], i) => sparkle(x, mx(back, sx + (R2() - .5) * 0), sy, r * (st >= 2 ? 1.15 : 1), i % 2 ? '#ffffff' : scol)));
    }
    if (c.smoke) {
      const smc = c.smokeCol || '#bdb6c8', sx = 50 + hd.rx * .55, sy = hd.cy - hd.ry * .8;
      both(-2.5, back => x => { for (let i = st >= 2 ? 3 : 2; i >= 0; i--) { x.globalAlpha = .9 - i * .17; const r = (3.6 + i * 1.7) * k, px = mx(back, sx + i * 5 * k), py = sy - 4 - i * 8 * k; paint(x, fluffPath(px, py, r, r * .88, 7, 1.3), smc, px, py, r, { hi: .12, line: adj(smc, -.12) }); } x.globalAlpha = 1; });
    }
    if (c.bubbles) {
      const bc = c.bubbleCol || '#9fd8ff', top = hd.cy - hd.ry;
      const S = [[50 - big - 6, hd.cy - 2, 4], [50 + big + 5, hd.cy - hd.ry * .6, 3], [50 + big + 3, body.cy + 4, 2.2], [50 - big - 2, top - 2, 2.4]].concat(st >= 2 ? [[50 + hd.rx * .3, top - 7, 2.8]] : []);
      both(5, back => x => S.forEach(([bx, by, r]) => bubble(x, mx(back, bx), by, r * k, bc)));
    }
    if (c.whiskers) {
      const wc = rgba(lineOf(skin), .85), wy = ey + ery * 1.1;
      const lines = (x, x0) => { for (const s of [-1, 1]) for (const d of [-1, 0, 1]) stroke(x, p => { p.moveTo(hd.cx + s * x0, wy + d * 1.6); p.quadraticCurveTo(hd.cx + s * (hd.rx + 2), wy + d * 2.6 - 1, hd.cx + s * (hd.rx + 9 * k), wy + d * 4.4); }, wc, 1.1); };
      add(3.1, null, x => lines(x, esp + erx * 1.5));
      add(null, 1.9, x => lines(x, hd.rx * .6));
    }
    if (c.tusks) add(3.1, null, x => { for (const s of [-1, 1]) cone(x, hd.cx + s * hd.rx * .3, my + 3, 12 * k, 5.4 * k, -Math.PI / 2 + s * .45, '#fffaf0', -s * .35, { lw: 1.2, hi: .1 }); });
  }
}

// Renders the parts for one view into ctx (already transformed into design units).
function drawParts(x, parts, mode) {
  const list = [];
  for (const p of parts) {
    const z = mode === 'b' ? p.zb : p.z; if (z === null || z === undefined) continue;
    const fn = mode === 'b' ? (p.fnb || p.fn) : mode === 'k' ? (p.fnc || p.fn) : p.fn; if (fn) list.push([z, fn]);
  }
  list.sort((a, b) => a[0] - b[0]);
  for (const [, fn] of list) { x.save(); try { fn(x); } catch (e) { if (!drawParts.warned) { drawParts.warned = true; console.warn('creature part failed', e); } } x.restore(); }
}
const tipOf = (bx, by, len, ang, k) => [bx + Math.cos(ang) * len * k, by + Math.sin(ang) * len * k];

// Measure the drawn extent (in design units) so every sprite is scaled to fit, centred, feet at 95%.
const MS = 2, MOFF = 40, MW = 180;
function measure(parts, mode) {
  const [c, x] = cv(MW * MS, MW * MS);
  x.setTransform(MS, 0, 0, MS, MOFF * MS, MOFF * MS); drawParts(x, parts, mode);
  const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width;
  let x0 = W, y0 = W, x1 = -1, y1 = -1;
  for (let y = 0; y < W; y++) for (let i = 0; i < W; i++) if (d[(y * W + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0 / MS - MOFF, y0 / MS - MOFF, (x1 + 1) / MS - MOFF, (y1 + 1) / MS - MOFF];
}

const SPR = 256, spriteCache = {};
function genCreature(id) {
  const sp = G.SPECIES[id] || { id: id | 0, types: ['Normal'], look: { stage: 1, form: 'round', feat: [] } };
  if (G.c3d && G.c3d.has(id)) try {   // 3D species (js/c3d.js): a still of the model, redrawn once its textures have decoded
    const f = G.c3d.still(id, false), b = G.c3d.still(id, true), out = { f, b, k: f };
    G.c3d.whenReady(() => { for (const [c, back] of [[f, false], [b, true]]) { const n = G.c3d.still(id, back); const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(n, 0, 0); tints.delete(c); } });
    return out;
  } catch (e) { console.warn('3D still failed for', id, e); }
  if (G.CREATURE_IMG && G.CREATURE_IMG[id]) return painted(G.CREATURE_IMG[id]);
  let parts;
  try { parts = buildParts(sp); } catch (e) { console.warn('creature art fallback for', id, e); parts = buildParts(Object.assign({}, sp, { id: -1 - (id | 0) })); }
  const a = measure(parts, 'f'), b = measure(parts, 'b');
  const bx0 = Math.min(a[0], b[0]), by0 = Math.min(a[1], b[1]), bx1 = Math.max(a[2], b[2]), by1 = Math.max(a[3], b[3]);
  const s = Math.min(1, 92 / (by1 - by0), 95 / (bx1 - bx0)), U = SPR / 100;
  const out = {};
  for (const mode of ['f', 'b', 'k']) {
    const [c, x] = cv(SPR, SPR); x.imageSmoothingEnabled = true;
    x.setTransform(U * s, 0, 0, U * s, U * (50 - (bx0 + bx1) / 2 * s), U * (95.5 - by1 * s));
    drawParts(x, parts, mode); out[mode] = c;
  }
  return out;
}
// Painted species (js/creatureimg.js, from the reference art): front and back images fitted like generated sprites (centred,
// feet at 95%) on a larger canvas so the detail stays sharp; every caller draws sprites at an explicit size. The images are
// embedded data, so they decode almost at once; until then the canvas is blank, and the tint cache is cleared once drawn.
const PSPR = 512;
function painted(src) {
  const out = {}, put = (keys, url, flip) => {
    const cs = keys.map(k => out[k] = cv(PSPR, PSPR)[0]), im = new Image();
    im.onload = () => { const s = Math.min(PSPR * .92 / im.height, PSPR * .95 / im.width), w = im.width * s, h = im.height * s;
      for (const c of cs) { const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.save(); if (flip) { x.translate(PSPR, 0); x.scale(-1, 1); } x.drawImage(im, (PSPR - w) / 2, PSPR * .955 - h, w, h); x.restore(); tints.delete(c); } };
    im.src = url;
  };
  put(['f', 'k'], src.f); put(['b'], src.b || src.f, !src.b);
  return out;
}
function sprites(id) { return spriteCache[id] || (spriteCache[id] = genCreature(id)); }
G.creatureSprite = function (id, back) { return sprites(id)[back ? 'b' : 'f']; };
const tints = new WeakMap();
G.tint = function (img, color) { // solid-colour silhouette of a sprite (cached per sprite and colour)
  let m = tints.get(img); if (!m) tints.set(img, m = {});
  if (m[color]) return m[color];
  const [c, x] = cv(img.width, img.height); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return m[color] = c;
};

// ---- Characters ------------------------------------------------------------------
// Chibi people in a 40x50 design box, feet at y 48. dir 0 down 1 up 2 left 3 right; frame 0 idle, 1/2 stepping.
const HAIR = { boy: 'spiky', girl: 'long', old: 'bald', nurse: 'bun', clerk: 'neat', prof: 'messy', mom: 'bun', hiker: 'short', bug: 'short', lass: 'pony', camper: 'short', kade: 'swept', elder: 'beard', kid: 'spiky', player: 'short' };
const HAT = { nurse: 'nurse', hiker: 'wide', elder: 'hood', kade: 'beanie' };
function styleName(st) {
  if (st === G.PLAYER_STYLE) return 'player';
  const ST = (G.mk && G.mk.ST) || {}, js = JSON.stringify(st);
  for (const k in ST) if (ST[k] === st || JSON.stringify(ST[k]) === js) return k;
  if (G.PLAYER_STYLE && JSON.stringify(G.PLAYER_STYLE) === js) return 'player';
  return 'short';
}
function drawPerson(x, st, dir, frame, shadow) {
  const name = styleName(st), hairT = HAIR[name] || 'short', hatT = st.hat ? (HAT[name] || 'cap') : null;
  const side = dir >= 2, up = dir === 1;
  if (dir === 2) { x.translate(40, 0); x.scale(-1, 1); } // left = mirrored right
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0, bob = step ? -.9 : 0;
  const hx = 20 + (side ? 1 : 0), hy = 18.5 + bob, R = 12.2;
  const skinL = lineOf(st.skin), shoe = '#5a4448';
  LW = 1.15;
  if (shadow) { x.fillStyle = 'rgba(40,40,70,.22)'; x.beginPath(); x.ellipse(20, 47.6, 9.5, 2.3, 0, 0, TAU); x.fill(); }
  const long = hairT === 'long' || hairT === 'swept';
  // long hair behind the head and shoulders
  if (long && !up) paint(x, p => { p.moveTo(hx - R - .5, hy); p.lineTo(hx - R + 1, hy + 13); p.quadraticCurveTo(hx, hy + 16, hx + R - 1, hy + 13); p.lineTo(hx + R + .5, hy); p.closePath(); }, adj(st.hair, -.05), hx, hy + 6, R);
  // legs
  const leg = (lx, lift, col) => { paint(x, p => { p.moveTo(lx - 2.8, 37); p.lineTo(lx - 2.6, 45.5 - lift); p.lineTo(lx + 2.6, 45.5 - lift); p.lineTo(lx + 2.8, 37); p.closePath(); }, col, lx, 41, 4); E(x, lx + (side ? 1 : 0), 46 - lift, side ? 3.6 : 3.1, 2.2, shoe, { hi: .2 }); };
  if (!side) { leg(16.6, step === 1 ? 1.6 : 0, st.pants); leg(23.4, step === -1 ? 1.6 : 0, st.pants); }
  else { leg(20 - step * 3, 0, adj(st.pants, -.08)); leg(20 + step * 3, step ? .8 : 0, st.pants); }
  // far arm (side view)
  const arm = (ax, ay, ang, col) => { x.save(); x.translate(ax, ay); x.rotate(ang); paint(x, p => p.roundRect(-2.2, -1, 4.4, 9, 2.2), col, 0, 3, 5); E(x, 0, 8.6, 2.3, 2.2, st.skin); x.restore(); };
  if (side) arm(20 - step * .5, 30 + bob, step * .5, adj(st.shirt, -.1));
  // torso
  paint(x, p => p.roundRect(12.5, 27 + bob, 15, 13, [5, 5, 4, 4]), st.shirt, 20, 32 + bob, 9);
  shine(x, 16, 30 + bob, 3, 2.4, .45);
  if (name === 'prof') { stroke(x, p => { p.moveTo(20, 28 + bob); p.lineTo(20, 40 + bob); }, lineOf(st.shirt), .9); }
  if (!side) { arm(12.4, 29 + bob, .25 + step * .35, st.shirt); arm(27.6, 29 + bob, -.25 + step * .35, st.shirt); }
  else arm(20 + step * .5, 30 + bob, -step * .5, st.shirt);
  // head
  E(x, hx, hy, R, R * .96, st.skin, { hi: .08, lo: .1 });
  if (side) E(x, hx - 4.5, hy + 1.2, 2.2, 2.8, adj(st.skin, -.04), { lo: .05 }); // ear
  const hairC = st.hair, hairL = lineOf(hairC);
  const hp = (path, cx, cy) => paint(x, path, hairC, cx, cy, R, { hi: .2 });
  if (up) {
    // back of the head: hair covers nearly everything
    if (hairT === 'bald' || hairT === 'beard') hp(p => { p.arc(hx, hy, R + .4, .1 * Math.PI, .9 * Math.PI); p.closePath(); }, hx, hy + 4);
    else hp(p => { p.arc(hx, hy, R + .7, Math.PI * .82, Math.PI * 2.18); p.quadraticCurveTo(hx, hy + R * .9 + (long ? 6 : 0), hx + Math.cos(Math.PI * .82) * (R + .7), hy + Math.sin(Math.PI * .82) * (R + .7)); p.closePath(); }, hx, hy);
    if (long) hp(p => p.roundRect(hx - R + 1, hy + 4, 2 * R - 2, 13, 6), hx, hy + 8);
    if (hairT === 'pony') hp(p => p.ellipse(hx, hy + 12, 3.4, 6, 0, 0, TAU), hx, hy + 12);
    if (hairT === 'bun') hp(p => p.arc(hx, hy - 3, 5, 0, TAU), hx, hy - 3);
  } else if (!side) {
    if (hairT === 'bald' || hairT === 'beard') {
      for (const s of [-1, 1]) hp(p => p.ellipse(hx + s * (R - 1.5), hy - 1, 3.4, 5, s * .3, 0, TAU), hx + s * R, hy);
    } else {
      hp(p => {
        p.moveTo(hx + R + .7, hy + 3); p.arc(hx, hy, R + .7, .1, Math.PI - .1, true);
        p.lineTo(hx - R + .5, hy + 3);
        const n = hairT === 'neat' ? 2 : 4, y0 = hy - 3.5, w = (2 * R - 2) / n;
        p.quadraticCurveTo(hx - R + 1.5, y0 - 1, hx - R + 1, y0 - 2);
        for (let i = 0; i < n; i++) { const xa = hx - R + 1 + i * w; p.quadraticCurveTo(xa + w * .5, y0 + (hairT === 'messy' ? 3 : 2.4), xa + w, y0 - 2); }
        p.quadraticCurveTo(hx + R - 1.5, y0 - 1, hx + R - .5, hy + 3); p.closePath();
      }, hx, hy - 4);
      if (hairT === 'spiky' && !hatT) for (const k of [-1, 0, 1]) cone(x, hx + k * 5, hy - R + 2.5, 5.5, 5, -Math.PI / 2 + k * .5, hairC, 0, { hi: .2 });
      if (long || hairT === 'pony') for (const s of [-1, 1]) hp(p => p.ellipse(hx + s * (R - .6), hy + 4, 2.6, 7, 0, 0, TAU), hx + s * R, hy + 4);
      if (hairT === 'pony') hp(p => p.ellipse(hx + R + 1.5, hy + 3, 2.6, 6, -.3, 0, TAU), hx + R, hy);
    }
    if (hairT === 'bun' && hatT !== 'nurse') hp(p => p.arc(hx, hy - R + .5, 4.5, 0, TAU), hx, hy - R);
    // face
    const ey = hy + 2.4;
    for (const s of [-1, 1]) {
      E(x, hx + s * 7.2, hy + 6, 2.3, 1.2, 'rgba(255,130,150,.5)', { flat: true, line: false });
      if (hairT === 'bald' || hairT === 'beard') stroke(x, p => { p.moveTo(hx + s * 4.2 - 1.6, ey + .6); p.quadraticCurveTo(hx + s * 4.2, ey - 1, hx + s * 4.2 + 1.6, ey + .6); }, INK, 1);
      else { x.fillStyle = INK; x.beginPath(); x.ellipse(hx + s * 4.2, ey, 1.55, 2.25, 0, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(hx + s * 4.2 - .5, ey - .9, .62, 0, TAU); x.fill(); }
    }
    stroke(x, p => { p.moveTo(hx - 1.4, hy + 6.6); p.quadraticCurveTo(hx, hy + 7.6, hx + 1.4, hy + 6.6); }, skinL, .9);
    if (hairT === 'beard') paint(x, p => { p.moveTo(hx - 6, hy + 6); p.quadraticCurveTo(hx, hy + 18, hx + 6, hy + 6); p.quadraticCurveTo(hx, hy + 9, hx - 6, hy + 6); p.closePath(); }, hairC, hx, hy + 10, 6, { hi: .1 });
  } else {
    // facing right: hair over the top and back, face on the right
    if (hairT === 'bald' || hairT === 'beard') hp(p => p.ellipse(hx - R + 3, hy, 3.6, 5.5, 0, 0, TAU), hx - R, hy);
    else hp(p => {
      p.moveTo(hx + R * .9, hy - 2.5); p.arc(hx, hy, R + .7, -.25, Math.PI * .86, true);
      p.quadraticCurveTo(hx - R * .5, hy + (long ? 13 : 4), hx - 3, hy - 1); p.quadraticCurveTo(hx + 2, hy - 4.5, hx + R * .9, hy - 2.5); p.closePath();
    }, hx - 2, hy - 3);
    if (hairT === 'spiky' && !hatT) for (const k of [0, 1]) cone(x, hx - 2 - k * 5, hy - R + 2.5, 5.5, 5, -Math.PI / 2 - .4 - k * .4, hairC, 0, { hi: .2 });
    if (hairT === 'pony') hp(p => p.ellipse(hx - R - .5, hy + 3, 2.8, 6.5, .4, 0, TAU), hx - R, hy);
    if (hairT === 'bun' && hatT !== 'nurse') hp(p => p.arc(hx - 4, hy - R + 1, 4.5, 0, TAU), hx - 4, hy - R);
    x.fillStyle = INK;
    if (hairT === 'bald' || hairT === 'beard') stroke(x, p => { p.moveTo(hx + 4.6, hy + 3); p.quadraticCurveTo(hx + 6.2, hy + 1.4, hx + 7.8, hy + 3); }, INK, 1);
    else { x.beginPath(); x.ellipse(hx + 6.2, hy + 2.4, 1.45, 2.2, 0, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(hx + 5.8, hy + 1.5, .6, 0, TAU); x.fill(); }
    E(x, hx + 6.5, hy + 6, 1.8, 1.1, 'rgba(255,130,150,.5)', { flat: true, line: false });
    if (hairT === 'beard') paint(x, p => { p.moveTo(hx + 1, hy + 5); p.quadraticCurveTo(hx + 4, hy + 17, hx + 9, hy + 6); p.closePath(); }, hairC, hx + 5, hy + 9, 6, { hi: .1 });
  }
  // hats
  if (hatT) {
    const hc = st.hat, top = hy - R - 1;
    if (hatT === 'cap') {
      paint(x, p => { p.moveTo(hx - R - .6, hy - 3); p.arc(hx, hy - 2.6, R + .6, Math.PI, TAU); p.closePath(); }, hc, hx, hy - 7, R, { hi: .12 });
      if (!up) { if (side) paint(x, p => p.ellipse(hx + R * .75, hy - 3.2, 7, 2.1, .05, 0, TAU), adj(hc, -.08), hx + 8, hy - 3, 7); else paint(x, p => { p.ellipse(hx, hy - 2.6, R + .4, 3.2, 0, 0, Math.PI); p.closePath(); }, adj(hc, -.1), hx, hy - 2, R); }
      if (!up) E(x, side ? hx + 1 : hx, hy - 7.5, 3.2, 2.4, st.shirt, { hi: .2 }); // badge in the shirt colour
    } else if (hatT === 'wide') {
      paint(x, p => p.ellipse(hx + (side ? 1.5 : 0), hy - 4.5, R + 4.5, 3.6, 0, 0, TAU), adj(hc, -.06), hx, hy - 4.5, R + 4);
      paint(x, p => { p.moveTo(hx - R * .75, hy - 4.5); p.quadraticCurveTo(hx - R * .7, top - 4, hx, top - 4); p.quadraticCurveTo(hx + R * .7, top - 4, hx + R * .75, hy - 4.5); p.closePath(); }, hc, hx, hy - 9, R, { hi: .15 });
      stroke(x, p => { p.moveTo(hx - R * .74, hy - 6); p.quadraticCurveTo(hx, hy - 4.6, hx + R * .74, hy - 6); }, adj(hc, -.3), 1.6);
    } else if (hatT === 'nurse') {
      paint(x, p => p.roundRect(hx - 7, top - 2, 14, 6.5, [3, 3, 1, 1]), hc, hx, top + 1, 7, { hi: .05 });
      if (!up) { x.fillStyle = '#ff6a8a'; x.fillRect(hx - .9 + (side ? 1 : 0), top - .4, 1.8, 4.2); x.fillRect(hx - 2.1 + (side ? 1 : 0), top + .8, 4.2, 1.8); }
    } else if (hatT === 'beanie') {
      paint(x, p => { p.moveTo(hx - R - .8, hy - 1.5); p.quadraticCurveTo(hx - R, top - 4, hx + 2, top - 3); p.quadraticCurveTo(hx + R + 1, top - 2, hx + R + .8, hy - 1.5); p.closePath(); }, hc, hx, hy - 7, R, { hi: .15 });
      paint(x, p => p.roundRect(hx - R - 1, hy - 4, 2 * R + 2, 3.4, 1.7), adj(hc, .12), hx, hy - 3, R);
    } else if (hatT === 'hood') {
      paint(x, p => { p.moveTo(hx - R - 1.2, hy + 2); p.quadraticCurveTo(hx - R - 1, top - 3, hx + 1, top - 9); p.quadraticCurveTo(hx + R + 1, top - 2, hx + R + 1.2, hy + 2); p.quadraticCurveTo(hx, hy - 6, hx - R - 1.2, hy + 2); p.closePath(); }, hc, hx, hy - 6, R + 2, { hi: .15 });
      star(x, hx + 1, top - 7.5, 2.4, '#ffe46a', { lw: .8 });
    }
  }
  LW = 1.6;
}
const CW = 128, CH = 160, charCache = {}, charBare = new WeakMap();
function charFrame(st, d, f, shadow) { const [c, x] = cv(CW, CH); x.imageSmoothingEnabled = true; x.setTransform(CW / 40, 0, 0, CH / 50, 0, 0); drawPerson(x, st, d, f, shadow); return c; }
function makeChar(st, shadow) {
  const out = [];
  for (let d = 0; d < 4; d++) { out[d] = []; for (let f = 0; f < 3; f++) out[d][f] = charFrame(st, d, f, shadow); }
  return out;
}
// ---- Painted people (js/peopleimg.js) ----------------------------------------------------------------------------------
// A look whose colours match a known character is drawn from that character's painted views instead of the generated chibi:
// down = front, up = back, left = side, right = side mirrored. Looks without art (and images that have not decoded yet) fall
// back to the generated sprite. The player keeps his painting whatever shirt the wardrobe picked (the colours are painted in).
const PEOPLE_LOOKS = {
  tam: { hair: '#2a8a8a', skin: '#f0c8a0', shirt: '#f0a030', pants: '#3a3a50', hat: '#2a8a8a' },
  vesper: { hair: '#e8e8f0', skin: '#e8c8b0', shirt: '#2a2a3a', pants: '#1a1a24', hat: '#6a2a4a' },
  ashen: { hair: '#3a3440', skin: '#e8c0a0', shirt: '#4a4450', pants: '#2a2630', hat: '#8a3a3a' },
  wren: { hair: '#e8e8f4', skin: '#e8c098', shirt: '#3a5a3a', pants: '#403060', hat: '#6a4a9a' },
  sable: { hair: '#1a1418', skin: '#ecc8b0', shirt: '#3a3440', pants: '#2a2630', hat: '#a02a2a' },
  mordant: { hair: '#1a1a20', skin: '#e0b898', shirt: '#2a2630', pants: '#1a1820', hat: '#b02a2a' },
  mason: { hair: '#4a3a30', skin: '#e0b088', shirt: '#9a7a55', pants: '#4a4048', hat: '#c8a050' },
  ferna: { hair: '#3a7a3a', skin: '#f8d0a8', shirt: '#6cc060', pants: '#8a6a40', hat: '#f0a8c8' },
  marlo: { hair: '#2a5aa0', skin: '#f0c8a0', shirt: '#3a9cf0', pants: '#284870', hat: '#f8f8f8' },
  zephyra: { hair: '#f0e0a0', skin: '#f8d0a8', shirt: '#9ad0f8', pants: '#e8e8f4', hat: '#e8f4ff' },
  osha: { hair: '#2a2018', skin: '#c89868', shirt: '#e0b050', pants: '#8a5a30', hat: '#e8d0a0' },
  rayne: { hair: '#f0d030', skin: '#f8d0a8', shirt: '#2a2a40', pants: '#ffd830', hat: '#ffd830' },
  isolde: { hair: '#e8f4ff', skin: '#f4e0d8', shirt: '#7fb8e8', pants: '#e8f4ff', hat: '#cfeeff' },
  pyrra: { hair: '#d03a20', skin: '#e8b890', shirt: '#e8502a', pants: '#3a2a30', hat: '#ffb040' },
  rook: { hair: '#1a1a24', skin: '#d8a880', shirt: '#c82a3a', pants: '#2a2a3a', hat: '#1a1a24' },
  oswin: { hair: '#4a3a30', skin: '#e0b088', shirt: '#9a3a5a', pants: '#3a3040', hat: '#c8a050' },
  pell: { hair: '#c86a3a', skin: '#f8d0a8', shirt: '#3a9a8a', pants: '#3a3040', hat: '#f0e0a0' },
  bram: { hair: '#8a5a2a', skin: '#e8b890', shirt: '#6a9a3a', pants: '#6a4a2a', hat: '#e8c060' },
  grizz: { hair: '#2a2018', skin: '#c89868', shirt: '#6a4a3a', pants: '#2a2630', hat: '#3a3440' },
  sparks: { hair: '#2a2a30', skin: '#e0b088', shirt: '#f8f8f8', pants: '#1a1a24', hat: '#f8d030' },
  mechanic: { hair: '#2a2a30', skin: '#e8b890', shirt: '#e07830', pants: '#3a4a6a', hat: '#e07830' },
  courier: { hair: '#2a1a10', skin: '#e8b890', shirt: '#ff8a3a', pants: '#3a5a8a', hat: '#ffd23a' },
  smith: { hair: '#8a3a20', skin: '#e8b890', shirt: '#7a7a8a', pants: '#4a3a30' },
  storeclerk: { hair: '#202838', skin: '#f0c8a0', shirt: '#3a8ad8', pants: '#2a3048', hat: '#ff5a3a' },
  gullwing: { hair: '#c8c8d0', skin: '#e8c098', shirt: '#3a9ac8', pants: '#2a3048', hat: '#f4f4f4' },
};
// Other colour variants of the same painted person (the ferry captains of each port share one painting).
const PEOPLE_ALIAS = { captain: [
  { hair: '#d8d8d8', skin: '#e8c098', shirt: '#2a4a8a', pants: '#202c4a', hat: '#f4f4f4' },
  { hair: '#9a6a3a', skin: '#c89868', shirt: '#2aa89a', pants: '#304868', hat: '#f4f0e0' },
  { hair: '#d8d8d8', skin: '#e8c098', shirt: '#2a6ab0', pants: '#304060', hat: '#f0f0f0' },
  { hair: '#e8e8e8', skin: '#e0b088', shirt: '#2a5a9a', pants: '#3a3a50', hat: '#f8f8f8' },
  { hair: '#e8e8f0', skin: '#e8b890', shirt: '#2a4a8a', pants: '#2a3048', hat: '#f8f8f8' }] };
const PEOPLE_ST = { boy: 'boy', girl: 'girl', old: 'oldman', mom: 'mum', clerk: 'clerk', hiker: 'hiker', camper: 'camper', bug: 'bug', kade: 'kade', lass: 'lass', kid: 'kid', elder: 'elder', nurse: 'nurse', prof: 'prof' };   // generic looks (G.mk.ST) -> painted art
const lookKey = st => [st.hair, st.skin, st.shirt, st.pants, st.hat || ''].join('|');
let peopleMap = null; const peopleImg = {};
function peopleSlug(st) {
  if (!G.PEOPLE_IMG || !st) return null;
  if (!peopleMap) {
    peopleMap = {}; const ST = (G.mk && G.mk.ST) || {};
    for (const k in PEOPLE_ST) if (ST[k]) peopleMap[lookKey(ST[k])] = PEOPLE_ST[k];
    for (const k in PEOPLE_LOOKS) peopleMap[lookKey(PEOPLE_LOOKS[k])] = k;
    for (const k in PEOPLE_ALIAS) for (const st of PEOPLE_ALIAS[k]) peopleMap[lookKey(st)] = k;
  }
  const P = G.PLAYER_STYLE; if (P && st.hair === P.hair && st.skin === P.skin && st.pants === P.pants) return G.PEOPLE_IMG['player-a'] ? 'player-a' : null;
  const slug = peopleMap[lookKey(st)]; return slug && G.PEOPLE_IMG[slug] ? slug : null;
}
G.WREN_LOOK = PEOPLE_LOOKS.wren; G.SABLE_LOOK = PEOPLE_LOOKS.sable; G.MORDANT_LOOK = PEOPLE_LOOKS.mordant;
// The decoded image for a slug and screen direction (0 down, 1 up, 2 left, 3 right), or null while it is still loading.
function peopleView(slug, dir, frame) {
  const view = (dir === 0 ? 'front' : dir === 1 ? 'back' : 'side') + (frame ? '-walk' + frame : ''), k = slug + ':' + view; let e = peopleImg[k];
  if (e === undefined) { const src = G.PEOPLE_IMG[slug] && G.PEOPLE_IMG[slug][view]; if (src) { e = new Image(); e.src = src; } else e = null; peopleImg[k] = e; }
  return e && e.complete && e.naturalWidth ? e : null;
}
// Draw size in logical px: every view of a character shares the front view's scale so turning does not change his height.
function peopleFit(slug, img, H) {
  const f = peopleView(slug, 0) || img, s = Math.min(H / f.naturalHeight, (H * 1.05) / Math.max(f.naturalWidth, img.naturalWidth));
  return [img.naturalWidth * s, img.naturalHeight * s];
}
function paintedChar(slug) {   // [dir][frame] canvases for portraits (battle intros, start menu), filled in as the images decode
  const out = [];
  for (let d = 0; d < 4; d++) {
    out[d] = []; const [c, x] = cv(256, 320);
    const draw = () => { const img = peopleView(slug, d); if (!img) { setTimeout(draw, 60); return; } const [w, h] = peopleFit(slug, img, 300); x.clearRect(0, 0, 256, 320); x.imageSmoothingQuality = 'high'; x.save(); x.translate(128, 0); if (d === 3) x.scale(-1, 1); x.drawImage(img, -w / 2, 307 - h, w, h); x.restore(); };
    draw(); for (let f = 0; f < 3; f++) out[d][f] = c;
  }
  return out;
}
G.charSprite = function (st) { const k = JSON.stringify(st); const slug = peopleSlug(st); return charCache[k] || (charCache[k] = slug ? paintedChar(slug) : makeChar(st, true)); };

// ---- Overworld drawing API used by world.js ----------------------------------------------
// drawChar: a person whose tile's top-left is (x, y) in logical px; feet at (x+8, y+15).
// noShadow: skip the foot shadow (a rider sitting on a vehicle).
G.drawChar = function (ctx, style, dir, frame, x, y, t, noShadow) {
  const slug = peopleSlug(style), walkImg = slug && frame ? peopleView(slug, dir, frame) : null, pimg = walkImg || (slug && peopleView(slug, dir));
  if (pimg) {   // painted person: real walking frames when the character has them, otherwise a bob and a little lean
    const bob = walkImg ? .5 : frame ? Math.abs(Math.sin((t || 0) / 3.2)) * 1.1 : Math.sin((t || 0) / 26) * .3, lean = !walkImg && frame ? (frame === 1 ? -.05 : .05) : 0, [w, h] = peopleFit(slug, pimg, 26);
    if (!noShadow) { ctx.fillStyle = 'rgba(30,40,60,.2)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 15, 6.2 - bob * .4, 1.9, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(x + 8, y + 15.4 - bob); ctx.rotate(lean); if (dir === 3) ctx.scale(-1, 1); ctx.drawImage(pimg, -w / 2, -h, w, h); ctx.restore();
    return;
  }
  let a = charBare.get(style); if (!a) charBare.set(style, a = []);
  const i = dir * 3 + frame, fr = a[i] || (a[i] = charFrame(style, dir, frame, false));
  const breathe = frame ? 0 : Math.sin((t || 0) / 26) * .35, bob = frame ? .8 : 0;
  if (!noShadow) { ctx.fillStyle = 'rgba(30,40,60,.2)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 15, 6.2 - bob * .6, 1.9, 0, 0, TAU); ctx.fill(); }
  const w = 20, h = 25 + breathe; // 4:5, feet (design y 48 of 50) on y+15
  ctx.drawImage(fr, x + 8 - w / 2, y + 15 - h * .96 - bob, w, h);
};
// drawCreatureMini: a small creature (follower / roaming wild / the Joker) whose tile top-left is (x, y); size is its drawn height.
// How a species gets around on the map (decided from its types and art):
//   fly    winged creatures hover above the ground and flap       float  ghosts, clouds and jellies drift
//   hop    bunnies, frogs, slimes, mushrooms and fish bounce       slither  serpents and worms weave along
//   walk   everything else steps along (and runs when hurrying)
const FLY_WINGS = new Set(['bird', 'big', 'moth', 'bat', 'fairy', 'dragon', 'ice', 'leaf']);
const HOP_IDS = new Set([49, 50, 59, 60, 70, 71, 72, 85, 86, 87]);   // bunnies, frogs, kangaroos
const locoCache = {};
G.locomotion = function (id) {
  if (locoCache[id]) return locoCache[id];
  const sp = G.SPECIES[id], a = C[id] || (G.CREATURE_ART && G.CREATURE_ART[id]) || {}, types = sp ? sp.types : [];
  let m = 'walk';
  if (types.includes('Flying') || FLY_WINGS.has(a.wing) || a.body === 'bird') m = 'fly';
  else if (a.float || a.body === 'wisp' || a.body === 'cloud' || a.body === 'jelly' || types.includes('Ghost')) m = 'float';
  else if (a.body === 'serpent') m = 'slither';
  else if (HOP_IDS.has(id) || a.ear === 'bunny' || a.body === 'drop' || a.body === 'blob' || a.body === 'shroom' || a.body === 'fish') m = 'hop';
  return locoCache[id] = m;
};
// A small creature on the map whose tile top-left is (x, y); size is its drawn height.
// opts (all optional): { run: hurrying, dir: 0 down 1 up 2 left 3 right }. `hop` is kept for old callers and ignored.
G.drawCreatureMini = function (ctx, id, x, y, size, t, moving, hop, opts) {
  t = t || 0; opts = opts || {};
  const S = sprites(id), loco = G.locomotion(id), run = !!opts.run, dir = opts.dir === undefined ? 0 : opts.dir;
  const blink = !moving && loco !== 'fly' && ((t + id * 53) % 210) < 7, img = blink ? S.k : S.f;
  const lean = dir === 3 ? 1 : dir === 2 ? -1 : 0;
  let lift = 0, rot = 0, sx = 1, sy = 1, dx = 0, dust = false;
  if (loco === 'fly') {   // always airborne: hover, flap, lean into the flight
    lift = 3.6 + Math.sin(t / 15 + id) * 1.4 + (moving ? 1.2 : 0);
    const f = Math.sin(t * (moving ? (run ? .8 : .6) : .3) + id);
    sx = 1 + f * .05; sy = 1 - f * .035; rot = moving ? lean * (run ? .16 : .1) : Math.sin(t / 40 + id) * .03;
  } else if (loco === 'float') {
    lift = 2.4 + Math.sin(t / 22 + id) * 1.3; rot = (moving ? lean * .09 : 0) + Math.sin(t / 32 + id) * .035; sy = 1 + Math.sin(t / 26 + id) * .025; sx = 1 - (sy - 1) * .7;
  } else if (loco === 'hop') {
    if (moving) { const p = ((t * (run ? .05 : .033) + id * .17) % 1), s = Math.sin(p * Math.PI); lift = s * (run ? 5.4 : 3.8); sy = .86 + s * .2; sx = 1.12 - s * .16; rot = lean * s * .08; }
    else { const b = Math.sin(t / 20 + id) * .03; sy = 1 + b; sx = 1 - b * .7; }
  } else if (moving) {   // walk, run or slither: two steps per tile, a rocking body, a little dust when hurrying
    const ph = t * (run ? .66 : .42) + id, st = Math.sin(ph), slither = loco === 'slither';
    lift = Math.abs(st) * (run ? 1.7 : 1.05) * (slither ? .4 : 1);
    rot = st * (slither ? .13 : run ? .09 : .06) + lean * (run ? .1 : .035);
    sx = 1 + Math.cos(ph * 2) * .025; sy = 1 - Math.cos(ph * 2) * .02; if (slither) dx = Math.sin(ph) * 1.6;
    dust = run && Math.abs(st) < .25;
  } else { const b = Math.sin(t / 20 + id) * .025; sy = 1 + b; sx = 1 - b * .7; }
  const sh = Math.max(.55, 1 - lift * .07), gx = x + 8 + dx, gy = y + 15;
  ctx.fillStyle = `rgba(30,40,60,${.22 * sh})`; ctx.beginPath(); ctx.ellipse(gx, gy, size * .3 * sh, size * .085 * sh + .6, 0, 0, TAU); ctx.fill();
  if (dust) { ctx.fillStyle = 'rgba(255,250,240,.55)'; const bx = gx - (dir === 3 ? 4 : dir === 2 ? -4 : 0), by = gy - (dir === 1 ? 4 : dir === 0 ? -1 : 0); for (const [ox, oy, r] of [[-2, 0, 1.6], [1.5, -1.2, 1.2], [3, .4, 1]]) { ctx.beginPath(); ctx.arc(bx + ox, by + oy, r, 0, TAU); ctx.fill(); } }
  const w = size * sx, h = size * sy;
  ctx.save(); ctx.translate(gx, gy + .4 - lift); if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h * .955, w, h);
  ctx.restore();
};
})();
