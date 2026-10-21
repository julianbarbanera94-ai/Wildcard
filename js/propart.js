// Prop and vehicle art (docs/HOMESTEAD.md section 5): house furniture and rideable vehicles.
// Static parts are painted with vector paths into offscreen caches at K px per logical unit (filled lazily on the first
// draw, never per frame); each frame is a few drawImage calls plus cheap animated touches (flames, steam, screens, rotors).
// Adds to G.homeArt: prop(ctx, kind, x, y, w, h, t, info), vehicle(ctx, id, dir, x, y, t, info), seat(id, dir).
(function () {
const G = globalThis.G;
const HA = G.homeArt = G.homeArt || {};
const K = 4, TAU = Math.PI * 2, PI = Math.PI;

// ---- Cache + drawing helpers -------------------------------------------------------
const store = new Map();
// make(key, x0, y0, w, h, paint): cached sprite covering local box (x0, y0, w, h) in logical units; paint draws in local units.
function make(key, x0, y0, w, h, paint) {
  let s = store.get(key); if (s) return s;
  const r = G.cv(Math.max(1, Math.ceil(w * K)), Math.max(1, Math.ceil(h * K))), c = r[1];
  c.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); c.lineCap = 'round'; c.lineJoin = 'round';
  paint(c);
  s = { cv: r[0], x0, y0, w, h }; store.set(key, s); return s;
}
function blit(ctx, s, x, y) { ctx.drawImage(s.cv, x + s.x0, y + s.y0, s.w, s.h); }
const shade = (c, f) => G.shade(c, f);
function rgba(hex, a) { const v = G.rgbOf(hex); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; }
function rr(c, x, y, w, h, r) {
  let [a, b, d, e] = typeof r === 'number' ? [r, r, r, r] : r;
  const m = Math.min(w, h) / 2; a = Math.min(a, m); b = Math.min(b, m); d = Math.min(d, m); e = Math.min(e, m);
  c.beginPath(); c.moveTo(x + a, y); c.lineTo(x + w - b, y); c.arcTo(x + w, y, x + w, y + b, b); c.lineTo(x + w, y + h - d); c.arcTo(x + w, y + h, x + w - d, y + h, d);
  c.lineTo(x + e, y + h); c.arcTo(x, y + h, x, y + h - e, e); c.lineTo(x, y + a); c.arcTo(x, y, x + a, y, a); c.closePath();
}
function lg(c, x0, y0, x1, y1, ...cols) { const g = c.createLinearGradient(x0, y0, x1, y1); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
function rg(c, x, y, r, ...cols) { const g = c.createRadialGradient(x, y, 0, x, y, r); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
function el(c, x, y, rx, ry, col) { c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU); c.fillStyle = col; c.fill(); }
function rf(c, x, y, w, h, r, col) { rr(c, x, y, w, h, r); c.fillStyle = col; c.fill(); }
// A rounded shape with a soft vertical gradient (light top-left), an outline slightly darker than the fill.
function solid(c, x, y, w, h, r, col, o) {
  o = o || {};
  rr(c, x, y, w, h, r);
  c.fillStyle = o.flat ? col : lg(c, x, y, x + w * .25, y + h, shade(col, o.lt || 1.14), col, shade(col, o.dk || .9)); c.fill();
  if (o.line !== false) { c.strokeStyle = o.line || shade(col, .66); c.lineWidth = o.lw || .6; c.stroke(); }
  if (o.hi) { c.save(); rr(c, x, y, w, h, r); c.clip(); el(c, x + w * .22, y + h * .2, w * .22, h * .14, 'rgba(255,255,255,' + o.hi + ')'); c.restore(); }
}
// Soft drop shadow under a footprint (down/right), built from stacked translucent rounded rects.
function dropShadow(c, x, y, w, h, a) {
  a = a || .22;
  for (let i = 0; i < 4; i++) { const g = 1.6 - i * .5; rf(c, x + 1 - g + .9, y - g + 1, w + g * 2 - .6, h + g * 2 - .5, 2 + g, `rgba(70,40,20,${a / 3})`); }
}
function ovalShadow(c, x, y, rx, ry, a) {
  c.save(); c.translate(x, y); c.scale(rx, ry); c.beginPath(); c.arc(0, 0, 1, 0, TAU);
  c.fillStyle = rg(c, 0, 0, 1, `rgba(40,40,60,${a})`, `rgba(40,40,60,${a * .7})`, 'rgba(40,40,60,0)'); c.fill(); c.restore();
}
// Box with a lighter top face and a front face, one outline around both. Top from y to y+top, front below to y+top+front.
function block(c, x, y, w, top, front, col, o) {
  o = o || {}; const r = o.r === undefined ? 1.6 : o.r, h = top + front;
  rr(c, x, y, w, h, r); c.fillStyle = lg(c, 0, y + top, 0, y + h, shade(col, 1.02), shade(col, .84)); c.fill();
  rr(c, x, y, w, top, [r, r, .6, .6]); c.fillStyle = lg(c, x, y, x + w * .3, y + top, shade(o.topCol || col, 1.4), shade(o.topCol || col, 1.18)); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(x + r * .6, y + top - .1, w - r * 1.2, .45);
  c.fillStyle = rgba(shade(col, .5), .35); c.fillRect(x + .4, y + top + .35, w - .8, .45);
  rr(c, x, y, w, h, r); c.strokeStyle = shade(col, .62); c.lineWidth = .65; c.stroke();
}
function knob(c, x, y, r, col) { el(c, x + .15, y + .25, r, r, 'rgba(40,20,10,.3)'); el(c, x, y, r, r, col || '#f2cf6e'); el(c, x - r * .3, y - r * .3, r * .4, r * .4, 'rgba(255,255,255,.8)'); }
function panel(c, x, y, w, h, col) {   // recessed door panel on a front face
  rr(c, x, y, w, h, .8); c.fillStyle = rgba(shade(col, .6), .28); c.fill();
  rr(c, x + .35, y + .4, w - .6, h - .6, .7); c.fillStyle = lg(c, 0, y, 0, y + h, shade(col, 1.06), shade(col, .94)); c.fill();
}
const WOOD = '#d4955a', WOOD_D = '#a8693a', DARKW = '#8a5432', CREAM = '#fbf3e6', WHITE = '#fbfbff', CHROME = '#c9d3e0';

// ---- Furniture painters ------------------------------------------------------------
// Each paints in local units: footprint is (0, 0, W, H) with W = w*16, H = h*16; it may rise to y = -20 (against the wall).
const P = {};
P.bed = (c, W, H, col, dbl) => {
  col = col || (dbl ? '#ff9eb4' : '#6a9ae8');
  dropShadow(c, .8, -2, W - 1.6, H + .5);
  // headboard
  solid(c, .6, -8, W - 1.2, 9, [3, 3, .6, .6], DARKW, { hi: .25 });
  rf(c, 1.8, -6.6, W - 3.6, 5.6, 2, shade(DARKW, 1.2));
  c.fillStyle = 'rgba(255,230,190,.35)'; c.fillRect(2.4, -6, W - 4.8, .5);
  // frame + mattress
  solid(c, 1, -1.5, W - 2, H - .5, [1.8, 1.8, 2.4, 2.4], WOOD_D);
  rf(c, 1.8, -1, W - 3.6, H - 3, 2, '#fffaf3');
  // pillows
  const np = dbl ? 2 : 1, pw = (W - 5 - (np - 1) * 1.2) / np;
  for (let i = 0; i < np; i++) { const px = 2.5 + i * (pw + 1.2); solid(c, px, -.3, pw, 5, 2.4, '#ffffff', { line: '#d8d4e4', hi: .6 }); c.fillStyle = 'rgba(160,150,190,.35)'; c.fillRect(px + 1.2, 3.4, pw - 2.4, .4); }
  // blanket
  const by = 6;
  rr(c, 1.6, by, W - 3.2, H - by - 2.2, [1.6, 1.6, 2.2, 2.2]); c.fillStyle = lg(c, 0, by, 0, H, shade(col, 1.1), col, shade(col, .82)); c.fill();
  c.strokeStyle = shade(col, .62); c.lineWidth = .6; c.stroke();
  rf(c, 1.6, by, W - 3.2, 2.4, [1.6, 1.6, 0, 0], shade(col, 1.45));   // folded-back sheet
  c.fillStyle = rgba(shade(col, 1.6), .5); for (let yy = by + 5; yy < H - 4; yy += 4.2) for (let xx = 4; xx < W - 3; xx += 4.5) { el(c, xx + (yy % 8 > 4 ? 2 : 0), yy, .8, .55, rgba(shade(col, 1.6), .55)); }
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(2.4, by + 3, W * .3, .5);
  // footboard
  solid(c, .6, H - 4, W - 1.2, 4, [1.2, 1.2, 1.8, 1.8], DARKW);
  c.fillStyle = 'rgba(255,220,170,.45)'; c.fillRect(1.6, H - 3.6, W - 3.2, .5);
};
P.bed2 = (c, W, H, col) => P.bed(c, W, H, col, true);
P.counter = (c, W, H, col, extra) => {
  col = col || '#e9e1d3'; const fy = H - 11;   // front face starts here
  dropShadow(c, .4, -2, W - .8, H + .3);
  block(c, .3, -4, W - .6, fy + 4, 15.6 - (fy + 4) + (H - 16), col, { topCol: '#f4d9a8', r: 1.2 });
  const n = Math.max(1, Math.round(W / 16));
  for (let i = 0; i < n; i++) { const x0 = i * W / n + 1.4, w = W / n - 2.8; panel(c, x0, fy + 1.6, w, H - fy - 3.4, col); knob(c, x0 + w / 2, fy + 3.2, .55, '#b0b8c8'); }
  rf(c, .3, fy - .2, W - .6, .9, .3, '#d6b886');   // worktop lip
  if (!extra) { // a few kitchen bits on the top
    rf(c, W - 6.5, -2.6, 4.6, 3.2, .8, '#f7f7fb'); el(c, W - 4.2, -2.4, 2.1, .7, '#d8dbe6');
    el(c, 4, -.6, 1.6, .9, '#ff9e5e'); el(c, 5.6, -1.1, 1.1, .8, '#ffd84a');
  }
};
P.sink = (c, W, H, col) => {
  P.counter(c, W, H, col, true);
  const cx = W / 2;
  el(c, cx, 1, 5.4, 3.4, '#a8b4c4'); el(c, cx, 1.2, 4.8, 2.9, lgFix(c));
  // faucet
  rf(c, cx - .8, -6.5, 1.6, 4.5, .6, CHROME); rf(c, cx - .8, -6.8, 4, 1.4, .7, '#dde4ee'); el(c, cx + 3, -5.6, .6, .5, '#8e9cb0');
  el(c, cx - 3.2, -3.8, .9, .7, '#ff7a7a'); el(c, cx + 3.2 + 1.2, -3.8, .9, .7, '#6ab0ff');
  c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(cx - .5, -6.2, .4, 3.4);
};
function lgFix(c) { return lg(c, 0, -2, 0, 4, '#7a8a9e', '#cfe3f4'); }
P.stove = (c, W, H) => {
  const col = '#fff6ea';
  dropShadow(c, .4, -2, W - .8, H + .3);
  // back splash with knobs
  solid(c, .6, -9, W - 1.2, 6, [2, 2, 0, 0], '#f0e4d2');
  for (let i = 0; i < 3; i++) knob(c, 4 + i * (W - 8) / 2, -6.4, .8, '#5a5a6e');
  rf(c, W / 2 - 2, -8.2, 4, 1.4, .5, '#3a3a4e'); c.fillStyle = '#8ff0b8'; c.fillRect(W / 2 - 1.4, -7.8, 2.8, .6);
  block(c, .4, -4, W - .8, 9, H - 5.5, col, { topCol: '#4a4a5c', r: 1.4 });
  rf(c, 1, -3.4, W - 2, 7.8, 1, '#3e3e50');
  // burners
  const bs = [[4.2, -1.6], [W - 4.2, -1.6], [4.2, 2.3], [W - 4.2, 2.3]];
  for (const [bx, by] of bs) { el(c, bx, by, 2.6, 1.4, '#2a2a38'); c.strokeStyle = '#6c6c80'; c.lineWidth = .4; c.beginPath(); c.ellipse(bx, by, 2.1, 1.1, 0, 0, TAU); c.stroke(); el(c, bx, by, .7, .4, '#55556a'); }
  // oven door
  solid(c, 2, 6.6, W - 4, H - 8.4, 1.2, '#f3e9da', { line: '#c8b8a0' });
  rf(c, 3.4, 8.6, W - 6.8, H - 12.4, 1, '#3a2c2e'); rf(c, 3.9, 9, W - 7.8, H - 13.4, .8, lg(c, 0, 9, 0, H - 4, '#7a4a3a', '#4a2c2a'));
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(4.4, 9.4, 3, .5);
  rf(c, 3.4, 7.2, W - 6.8, .9, .4, '#c0c6d2');
  // pot (front-left burner) with lid
  const px = 4.2, py = 2.2;
  rr(c, px - 3.2, py - 4.4, 6.4, 4.8, [1, 1, 1.8, 1.8]); c.fillStyle = lg(c, px - 3, 0, px + 3, 0, '#ff8a6a', '#e0503c', '#b83a2c'); c.fill(); c.strokeStyle = '#902c22'; c.lineWidth = .5; c.stroke();
  el(c, px, py - 4.4, 3.2, 1.2, '#ff9e80'); el(c, px, py - 4.6, 2.6, .8, '#ffb8a0'); el(c, px, py - 5.4, .8, .5, '#5a3a32');
  rf(c, px - 4.2, py - 3.8, 1.2, .8, .3, '#902c22'); rf(c, px + 3, py - 3.8, 1.2, .8, .3, '#902c22');
  c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(px - 2.2, py - 3.2, .5, 2.4);
};
P.fridge = (c, W, H, col) => {
  col = col || '#a8e4d8';
  dropShadow(c, .6, -6, W - 1.2, H + 6.3);
  block(c, .8, -19, W - 1.6, 3, H + 15.5, col, { r: 2.4 });
  const fy = -16;
  // door seam + handles
  c.fillStyle = rgba(shade(col, .55), .55); c.fillRect(1.2, fy + 9, W - 2.4, .6);
  rf(c, W - 4, fy + 2.5, 1.2, 5, .6, '#f2f6fb'); rf(c, W - 4, fy + 11.5, 1.2, 7, .6, '#f2f6fb');
  c.fillStyle = 'rgba(80,100,120,.35)'; c.fillRect(W - 2.8, fy + 3, .3, 4); c.fillRect(W - 2.8, fy + 12, .3, 6);
  // magnets + a note
  el(c, 4, fy + 4, 1.1, 1.1, '#ff6a8a'); el(c, 6.6, fy + 5.4, 1, 1, '#ffd23a');
  rr(c, 3, fy + 12, 4.4, 5, .4); c.fillStyle = '#fffbe8'; c.fill(); c.fillStyle = '#b8c4d8'; c.fillRect(3.6, fy + 13.6, 3.2, .35); c.fillRect(3.6, fy + 14.8, 2.6, .35);
  el(c, 5.2, fy + 12, .7, .7, '#58b848');
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(2, fy + 1, .6, 7); c.fillRect(2, fy + 10.6, .6, 10);
  rf(c, 1.6, H - 2, W - 3.2, 1.3, .4, shade(col, .7));
};
P.toilet = (c, W, H) => {
  const cx = W / 2;
  ovalShadow(c, cx + 1, 12.8, 6.6, 3, .2);
  solid(c, cx - 5.4, -6, 10.8, 8, [2.2, 2.2, 1.2, 1.2], WHITE, { line: '#c4c8d8', hi: .7 });
  rf(c, cx - 5.6, -6.4, 11.2, 1.8, 1, '#eef0f8'); el(c, cx + 3, -5.6, .9, .45, CHROME);
  // bowl base
  rr(c, cx - 3.2, 6, 6.4, 7.6, [0, 0, 2, 2]); c.fillStyle = lg(c, 0, 6, 0, 14, '#f4f5fb', '#d8dbe8'); c.fill(); c.strokeStyle = '#c4c8d8'; c.lineWidth = .5; c.stroke();
  // seat ring
  el(c, cx, 6.2, 5.6, 4.8, '#c4c8d8'); el(c, cx, 6, 5.4, 4.6, '#ffffff'); el(c, cx, 6.4, 3.4, 2.9, '#c6eef4'); el(c, cx, 6.6, 2.6, 2.1, '#a6e0ec');
  el(c, cx - 2.2, 4.2, 1.6, .7, 'rgba(255,255,255,.9)');
  // paper roll on the side
  if (W >= 16) { rf(c, W - 2.6, 1, 2.2, 3, .8, '#f7f3ea'); el(c, W - 1.5, 1, 1.1, .6, '#e0d8c8'); }
};
P.shower = (c, W, H) => {
  dropShadow(c, .4, -4, W - .8, H + 4);
  // tiled back wall
  rr(c, .6, -20, W - 1.2, 24, [2, 2, 0, 0]); c.fillStyle = lg(c, 0, -20, 0, 4, '#e6f6fb', '#bfe4ee'); c.fill();
  c.save(); rr(c, .6, -20, W - 1.2, 24, [2, 2, 0, 0]); c.clip(); c.fillStyle = 'rgba(120,180,200,.4)';
  for (let yy = -17; yy < 4; yy += 3.6) c.fillRect(0, yy, W, .35); for (let xx = 3.4; xx < W; xx += 3.6) c.fillRect(xx, -20, .35, 24);
  c.restore(); rr(c, .6, -20, W - 1.2, 24, [2, 2, 0, 0]); c.strokeStyle = '#8ec4d4'; c.lineWidth = .6; c.stroke();
  // tray
  rr(c, .6, 3, W - 1.2, H - 3.4, 1.6); c.fillStyle = lg(c, 0, 3, 0, H, '#ffffff', '#dfe6f0'); c.fill(); c.strokeStyle = '#b8c4d4'; c.lineWidth = .6; c.stroke();
  rr(c, 2.2, 4.2, W - 4.4, H - 7.4, 1.2); c.fillStyle = '#cdeaf2'; c.fill(); el(c, W / 2, H - 6, 1, .6, '#9ab0c0');
  // head + pipe
  rf(c, W / 2 - .5, -17, 1, 4, .4, CHROME); rf(c, W / 2 - 2.6, -14, 5.2, 2, [.6, .6, 1.4, 1.4], '#dde5ef');
  c.fillStyle = '#8fa0b4'; for (let i = -1.6; i <= 1.6; i += 1.1) c.fillRect(W / 2 + i - .15, -12.2, .3, .3);
  rf(c, 3, -6, 2.4, 3, .6, '#ffd84a'); el(c, 4.2, -6.4, .7, .4, '#ff9e5e');   // a rubber duck on the ledge
  // glass door (translucent)
  rr(c, 1.2, -12, W - 2.4, H + 10.6, 1.4); c.fillStyle = 'rgba(200,240,255,.28)'; c.fill(); c.strokeStyle = 'rgba(150,190,210,.9)'; c.lineWidth = .5; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = .7; c.beginPath(); c.moveTo(3, -9); c.lineTo(6.5, -12 + 7); c.moveTo(3.4, -3.6); c.lineTo(5.4, -1.6); c.stroke();
  rf(c, W - 3.6, -2, .9, 4.4, .45, CHROME);
};
P.bath = (c, W, H) => {
  const v = H > W;   // vertical tub
  dropShadow(c, .4, -1, W - .8, H + .3);
  const fy = H - 5.5;
  rr(c, .6, -1.5, W - 1.2, H + .9, 4); c.fillStyle = lg(c, 0, -1.5, 0, H, '#ffffff', '#e9edf6', '#d0d6e4'); c.fill(); c.strokeStyle = '#b4bcd0'; c.lineWidth = .6; c.stroke();
  c.fillStyle = 'rgba(160,170,200,.35)'; c.fillRect(1.6, fy, W - 3.2, .5);
  // water
  rr(c, 2.6, .4, W - 5.2, fy - 1.8, 3); c.fillStyle = '#a4bcd0'; c.fill();
  rr(c, 3, .9, W - 6, fy - 2.6, 2.6); c.fillStyle = lg(c, 0, 0, 0, fy, '#9fe4f0', '#62c4e0'); c.fill();
  // foam
  const fx = v ? W / 2 : W - 8, fyy = v ? H - 10 : 4;
  for (const [a, b, r] of [[0, 0, 2], [2.2, .8, 1.5], [-2, 1, 1.4], [.6, -1.2, 1.2], [3.6, -.6, 1]]) el(c, fx + a, fyy + b, r, r * .75, 'rgba(255,255,255,.92)');
  // faucet at the head end
  if (v) { rf(c, W / 2 - .7, -4.5, 1.4, 4, .5, CHROME); rf(c, W / 2 - .7, -4.5, 1.4, 1.2, .5, '#eef2f8'); }
  else { rf(c, 3, -5, 1.4, 5, .5, CHROME); rf(c, 3, -5, 3.4, 1.4, .6, '#e4eaf2'); el(c, 6.2, -4.3, .5, .4, '#8e9cb0'); }
  // claw feet
  for (const xx of [3, W - 3]) { el(c, xx, H - .3, 1.4, .8, '#d6a640'); el(c, xx - .3, H - .6, .5, .3, '#ffe28a'); }
  el(c, 4, 0, W * .12, .5, 'rgba(255,255,255,.9)');
};
function cushionSet(c, W, col, x0, x1, top, seatY) {
  const n = Math.max(1, Math.round((x1 - x0) / 11)), cw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {   // back cushions
    solid(c, x0 + i * cw + .2, top, cw - .4, seatY - top + 2, [2.6, 2.6, 1, 1], shade(col, 1.06), { hi: .35 });
  }
  for (let i = 0; i < n; i++) {   // seat cushions
    solid(c, x0 + i * cw + .2, seatY, cw - .4, 6, 2, shade(col, 1.12), { lt: 1.25, hi: .3 });
  }
}
P.sofa = (c, W, H, col) => {
  col = col || '#f08a6a'; const b = H - 1;
  dropShadow(c, .4, -4, W - .8, H + .3);
  solid(c, .6, -7, W - 1.2, b + 7, [4, 4, 2, 2], shade(col, .92));   // back + body
  rf(c, 1, b - 6, W - 2, 6, [0, 0, 2, 2], lg(c, 0, b - 6, 0, b, shade(col, .86), shade(col, .74)));
  cushionSet(c, W, col, 3.6, W - 3.6, -5.4, H - 11);
  // arms
  for (const ax of [.6, W - 4.6]) { solid(c, ax, -2, 4, b + 2.2, [2.2, 2.2, 1.6, 1.6], shade(col, 1.02), { hi: .3 }); el(c, ax + 2, -1, 1.6, .8, rgba(shade(col, 1.5), .7)); }
  // feet
  for (const fx of [2.2, W - 2.2]) rf(c, fx - .9, b - .4, 1.8, 1.4, .4, DARKW);
  if (W >= 32) { solid(c, W - 10.6, -4, 5.2, 5.2, 1.8, '#ffe28a', { hi: .5 }); c.fillStyle = 'rgba(200,140,40,.45)'; c.fillRect(W - 9, -1.4, 2.4, .4); }   // throw pillow
};
P.armchair = (c, W, H, col) => P.sofa(c, W, H, col || '#7ac4a0');
P.tv = (c, W, H) => {
  dropShadow(c, .4, 0, W - .8, H + .3);
  block(c, .6, 1, W - 1.2, 5, H - 6.5, WOOD, { topCol: WOOD });
  const n = Math.max(1, Math.round(W / 16));
  for (let i = 0; i < n; i++) { const x0 = i * W / n + 1.8, w = W / n - 3.6; panel(c, x0, 7.6, w, H - 10, WOOD); knob(c, x0 + w / 2, 9.2, .5); }
  // TV set
  const tw = Math.min(W - 2, 14 + (W - 16) * .6), tx = (W - tw) / 2;
  rf(c, W / 2 - 2.2, 1, 4.4, 2.2, .8, '#3a3a4c');
  solid(c, tx, -13, tw, 14.4, 2, '#3c3c52', { line: '#22222e' });
  rf(c, tx + 1.2, -11.8, tw - 2.4, 11.4, 1.2, '#1c2030');
  el(c, tx + tw - 2, .1, .4, .4, '#ff5a6a');
};
function screenFx(ctx, x, y, w, h, t, seed) {   // animated TV picture: shifting colour bands + a scanline
  const ph = Math.floor(t / 24 + seed), cols = [['#7ad8ff', '#ffe28a', '#8ef0a8'], ['#ffb0d0', '#9fd8ff', '#fff2b0'], ['#a8f0c8', '#7ab8ff', '#ffd090']][ph % 3];
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = cols[0]; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.ellipse(x + w * (.35 + .1 * Math.sin(t / 40)), y + h * .78, w * .55, h * .35, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = cols[2]; ctx.beginPath(); ctx.arc(x + w * .72, y + h * .3, h * .18, 0, TAU); ctx.fill();
  const fl = .08 + .07 * Math.sin(t * .9) + ((t % 97) < 3 ? .25 : 0);
  ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x, y + ((t * .35) % h), w, .6);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * .4, y); ctx.lineTo(x, y + h * .6); ctx.fill();
  ctx.restore();
}
function books(c, x0, x1, by, seed) {
  const R = G.mulberry(seed), cols = ['#e85a5a', '#4f8ee6', '#ffd23a', '#58b848', '#c88af0', '#ff9e5e', '#5ac8c8'];
  let xx = x0;
  while (xx < x1 - 1) {
    const w = 1.1 + R() * 1.3, h = 4.2 + R() * 2.2; if (xx + w > x1) break;
    const col = cols[(R() * cols.length) | 0];
    if (R() < .1 && xx + h < x1) { rf(c, xx, by - w, h, w, .3, col); xx += h + .3; continue; }   // a book lying down
    rr(c, xx, by - h, w, h, .3); c.fillStyle = lg(c, xx, 0, xx + w, 0, shade(col, 1.2), col, shade(col, .8)); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(xx + .2, by - h + 1, w - .4, .35);
    xx += w + .2;
  }
}
P.bookshelf = (c, W, H) => {
  dropShadow(c, .5, -8, W - 1, H + 8.3);
  block(c, .5, -19, W - 1, 2.4, H + 16.1, DARKW, { r: 1.6 });
  rf(c, 1.7, -15.4, W - 3.4, H + 13.4, .8, '#5a3420');
  const rows = 4, rh = (H + 12.6) / rows;
  for (let i = 0; i < rows; i++) {
    const by = -15.4 + (i + 1) * rh - .2;
    if (i < rows - 1) books(c, 2.2, W - 2.2, by, W * 7 + i * 13 + H);
    else { for (let k = 0; k < W / 16; k++) { el(c, 6 + k * 16, by - 2, 2.6, 2.2, '#9a6a3c'); el(c, 6 + k * 16, by - 3.6, 2.6, .9, '#c8945c'); } books(c, 10.5, W - 2.2, by, W + 91); }
    rf(c, 1.4, by, W - 2.8, 1.1, .3, '#b07a48'); c.fillStyle = '#d6a06a'; c.fillRect(1.6, by, W - 3.2, .35);
  }
};
P.cupboard = (c, W, H, col) => {
  col = col || '#b8dcc4';
  dropShadow(c, .5, -6, W - 1, H + 6.3);
  block(c, .5, -14, W - 1, 3, H + 10.4, col, { r: 1.6 });
  const n = Math.max(1, Math.round(W / 8)), dw = (W - 3) / n;
  for (let i = 0; i < n; i++) { const x0 = 1.5 + i * dw; panel(c, x0 + .2, -9.6, dw - .4, H + 6.4, col); panel(c, x0 + 1.1, -8, dw - 2.2, 7, col); panel(c, x0 + 1.1, 0, dw - 2.2, H - 6, col); knob(c, i % 2 ? x0 + 1.3 : x0 + dw - 1.3, H - 13, .55); }
  rf(c, .2, -14.6, W - .4, 1.4, .6, shade(col, 1.25));
  rf(c, 1.4, H - 2, W - 2.8, 1.2, .4, shade(col, .6));
};
P.wardrobe = (c, W, H, col) => {
  col = col || '#b98ad8';
  dropShadow(c, .5, -8, W - 1, H + 8.3);
  block(c, .6, -18, W - 1.2, 2.6, H + 15, col, { r: 1.8 });
  rf(c, 0, -19.4, W, 2.2, [1.2, 1.2, .4, .4], shade(col, 1.3)); c.strokeStyle = shade(col, .65); c.lineWidth = .5; rr(c, 0, -19.4, W, 2.2, 1); c.stroke();
  const n = Math.max(2, Math.round(W / 8)), dw = (W - 3) / n;
  for (let i = 0; i < n; i++) {
    const x0 = 1.5 + i * dw; panel(c, x0 + .25, -14.4, dw - .5, H + 9.6, col);
    if (i % 2 === 0 && n >= 2) { rr(c, x0 + 1.2, -12.6, dw - 2.4, 9, 1); c.fillStyle = lg(c, x0, -12, x0 + dw, -3, '#e8f6ff', '#b8d8ec'); c.fill(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = .5; c.beginPath(); c.moveTo(x0 + 2, -10); c.lineTo(x0 + 3.5, -11.6); c.stroke(); }
    else { panel(c, x0 + 1.2, -12.6, dw - 2.4, 9, col); }
    panel(c, x0 + 1.2, -2.2, dw - 2.4, H - 8, col);
    knob(c, i % 2 ? x0 + 1.1 : x0 + dw - 1.1, -3, .55);
  }
  for (const fx of [2.4, W - 2.4]) rf(c, fx - 1, H - 1.6, 2, 1.4, .4, shade(col, .55));
};
P.chest = (c, W, H, col) => {
  col = col || '#c88a4c'; const t0 = H - 13;
  dropShadow(c, 1, t0 + 1, W - 2, H - t0 - .7);
  // body
  rr(c, 1.4, t0 + 5, W - 2.8, H - t0 - 5.6, [.8, .8, 1.4, 1.4]); c.fillStyle = lg(c, 0, t0 + 5, 0, H, shade(col, 1.02), shade(col, .8)); c.fill(); c.strokeStyle = shade(col, .58); c.lineWidth = .6; c.stroke();
  // rounded lid
  rr(c, 1, t0, W - 2, 6.4, [3, 3, .8, .8]); c.fillStyle = lg(c, 0, t0, 0, t0 + 6.4, shade(col, 1.35), shade(col, 1.05)); c.fill(); c.strokeStyle = shade(col, .58); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(3, t0 + 1, W * .4, .5);
  c.fillStyle = 'rgba(90,50,20,.3)'; for (let yy = t0 + 8.2; yy < H - 1; yy += 2.6) c.fillRect(2, yy, W - 4, .3);
  // metal bands + lock
  for (const bx of [3.6, W - 3.6 - 1.6]) { rf(c, bx, t0 - .1, 1.6, H - t0 - .4, .4, '#a0a8b8'); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(bx + .3, t0 + .4, .35, H - t0 - 1.5); }
  rf(c, W / 2 - 1.8, t0 + 4.4, 3.6, 3.6, .8, '#ffd24a'); c.strokeStyle = '#b08a20'; c.lineWidth = .4; rr(c, W / 2 - 1.8, t0 + 4.4, 3.6, 3.6, .8); c.stroke();
  el(c, W / 2, t0 + 6, .5, .5, '#6a4a20'); c.fillStyle = '#6a4a20'; c.fillRect(W / 2 - .2, t0 + 6, .4, 1.2);
};
function tableTop(c, W, H, col, top, bot) {
  // legs
  c.fillStyle = shade(col, .55);
  for (const lx of [2, W - 3.6]) { rf(c, lx, bot - 2, 1.6, H - bot + 1.2, .5, shade(col, .55)); }
  ovalShadow(c, W / 2 + 1, H - 1, W / 2 - 1, 2, .14);
  rr(c, .6, top, W - 1.2, bot - top + 2, 2.2); c.fillStyle = shade(col, .72); c.fill();   // thickness
  rr(c, .6, top, W - 1.2, bot - top, 2.2); c.fillStyle = lg(c, 0, top, W * .3, bot, shade(col, 1.2), col); c.fill();
  rr(c, .6, top, W - 1.2, bot - top + 2, 2.2); c.strokeStyle = shade(col, .58); c.lineWidth = .6; c.stroke();
  c.fillStyle = 'rgba(255,240,210,.45)'; c.fillRect(2.4, top + .7, W - 4.8, .5);
  c.fillStyle = rgba(shade(col, .7), .25); for (let yy = top + 3; yy < bot - 1; yy += 3) c.fillRect(1.4, yy, W - 2.8, .3);
}
P.table = (c, W, H, col) => {
  col = col || '#e0a466';
  const top = H > 16 ? -1 : -2, bot = H - 5;
  tableTop(c, W, H, col, top, bot);
  const cx = W / 2, cy = (top + bot) / 2;
  if (W >= 32 || H >= 32) {   // runner + fruit bowl + vase
    rf(c, cx - 3.4, top + .6, 6.8, bot - top - 1.2, .6, 'rgba(255,250,236,.92)'); c.fillStyle = '#ff9eb0'; c.fillRect(cx - 3.4, top + 1.4, 6.8, .4); c.fillRect(cx - 3.4, bot - 1.8, 6.8, .4);
    el(c, cx, cy + 1, 3, 1.6, '#f4f0e8'); el(c, cx - 1.2, cy, 1.2, 1.1, '#ff5a5a'); el(c, cx + 1, cy - .2, 1.1, 1, '#ffd23a'); el(c, cx, cy - 1, 1, .9, '#8ad050');
    if (W >= 32) for (const px of [6, W - 6]) { el(c, px, cy, 2.4, 1.4, '#ffffff'); el(c, px, cy, 1.6, .8, '#e8eef6'); }
  } else { rf(c, cx - 1.4, cy - 3.6, 2.8, 4, 1, '#6aa7e0'); el(c, cx - .6, cy - 4.2, 1.2, 1.2, '#ff7eab'); el(c, cx + 1, cy - 3.8, 1.1, 1.1, '#ffd84a'); el(c, cx - 1.6, cy - 3.2, .8, .6, '#58b848'); }
};
P.desk = (c, W, H, col) => {
  col = col || '#c98c54'; const top = -3, bot = 5;
  dropShadow(c, .5, top + 2, W - 1, H - top - 1.7);
  // drawer pedestal (right) + modesty panel
  block(c, W - 8, bot - 1, 7.4, 1, H - bot + .4, col, { r: 1 });
  for (let i = 0; i < 3; i++) { panel(c, W - 7.2, bot + .8 + i * 3.4, 5.8, 2.8, col); knob(c, W - 4.3, bot + 2.2 + i * 3.4, .45); }
  rf(c, 1.6, bot, 1.6, H - bot - .8, .5, shade(col, .55));
  rr(c, .4, top, W - .8, bot - top + 2, 1.6); c.fillStyle = shade(col, .74); c.fill();
  rr(c, .4, top, W - .8, bot - top, 1.6); c.fillStyle = lg(c, 0, top, 0, bot, shade(col, 1.25), shade(col, 1.06)); c.fill();
  rr(c, .4, top, W - .8, bot - top + 2, 1.6); c.strokeStyle = shade(col, .58); c.lineWidth = .6; c.stroke();
  // papers, pencil cup, little lamp
  c.save(); c.translate(5, 1); c.rotate(-.12); rf(c, -2.6, -2, 5.2, 3.6, .3, '#ffffff'); c.fillStyle = '#b8c4d8'; c.fillRect(-1.8, -1, 3.6, .3); c.fillRect(-1.8, 0, 2.8, .3); c.restore();
  rf(c, W - 6, -3.6, 2.2, 3, .6, '#6a9ae8'); c.strokeStyle = '#ffd23a'; c.lineWidth = .5; c.beginPath(); c.moveTo(W - 5.4, -3.4); c.lineTo(W - 5.8, -5.6); c.stroke(); c.strokeStyle = '#e85a5a'; c.beginPath(); c.moveTo(W - 4.4, -3.4); c.lineTo(W - 4, -5.4); c.stroke();
  if (W >= 24) { rf(c, W / 2 - 4, -6, 8, 6.2, 1, '#4a4a62'); rf(c, W / 2 - 3.2, -5.3, 6.4, 4.6, .6, lg(c, 0, -5, 0, 0, '#9cffd8', '#3ec6a0')); rf(c, W / 2 - 1, .2, 2, 1, .3, '#4a4a62'); }
  else { c.strokeStyle = '#6a6a7e'; c.lineWidth = .6; c.beginPath(); c.moveTo(W - 10, -1); c.lineTo(W - 10.5, -6); c.lineTo(W - 8.6, -8.4); c.stroke(); el(c, W - 10, -1, 1.6, .6, '#6a6a7e'); c.beginPath(); c.moveTo(W - 10.4, -8.6); c.lineTo(W - 7, -9.6); c.lineTo(W - 6.8, -7); c.closePath(); c.fillStyle = '#ffd23a'; c.fill(); }
};
P.plantPot = (c, W, H) => {
  const cx = W / 2;
  ovalShadow(c, cx + 1, H - 1.2, 5.4, 2, .22);
  rr(c, cx - 4, H - 9, 8, 8.4, [1, 1, 2.4, 2.4]); c.fillStyle = lg(c, cx - 4, 0, cx + 4, 0, '#f2a070', '#d8784a', '#b85e38'); c.fill(); c.strokeStyle = '#94482a'; c.lineWidth = .55; c.stroke();
  rf(c, cx - 4.8, H - 10.2, 9.6, 2.4, 1, '#f0a878'); c.strokeStyle = '#94482a'; rr(c, cx - 4.8, H - 10.2, 9.6, 2.4, 1); c.stroke();
  el(c, cx, H - 9.8, 3.8, .8, '#6a4a30');
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(cx - 3, H - 7.6, .6, 4.6);
};
P.plantLeaves = (c, W, H) => {   // drawn with a gentle sway, origin at the soil
  const L = (a, len, wd, col) => { c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(wd, -len * .5, 0, -len); c.quadraticCurveTo(-wd, -len * .5, 0, 0); c.fillStyle = lg(c, -wd, -len, wd, 0, shade(col, 1.25), col, shade(col, .8)); c.fill(); c.strokeStyle = shade(col, .62); c.lineWidth = .45; c.stroke(); c.strokeStyle = rgba(shade(col, 1.5), .6); c.lineWidth = .3; c.beginPath(); c.moveTo(0, -1); c.lineTo(0, -len * .8); c.stroke(); c.restore(); };
  const s = Math.min(1.25, .85 + (W / 16) * .15);
  [[-1.3, 8.4, 3.6, '#3a9044'], [1.25, 8.6, 3.6, '#3a9044'], [-.8, 11.4, 4.4, '#48a84c'], [.78, 11.8, 4.4, '#48a84c'], [-.3, 13.4, 4.6, '#58bc56'], [.32, 12.6, 4.2, '#62c85e'], [0, 9.6, 3.4, '#7ad874']].forEach(([a, l, w, col]) => L(a, l * s, w * s, col));
  el(c, -1.6, -11 * s, 1.1, .7, 'rgba(255,255,255,.35)');
};
P.lamp = (c, W, H, col) => {
  col = col || '#fff0c8'; const cx = W / 2;
  ovalShadow(c, cx + 1, H - 1.4, 4.4, 1.6, .22);
  el(c, cx, H - 2, 3.4, 1.4, '#7a5a3e'); el(c, cx, H - 2.4, 3, 1.1, '#a8805a');
  rf(c, cx - .5, -9, 1, H - 6.5 + 9, .5, '#8a6a4a'); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx - .3, -8, .3, H - 2);
  c.beginPath(); c.moveTo(cx - 3, -19); c.lineTo(cx + 3, -19); c.lineTo(cx + 5.4, -9.4); c.quadraticCurveTo(cx, -8.4, cx - 5.4, -9.4); c.closePath();
  c.fillStyle = lg(c, cx - 5, 0, cx + 5, 0, shade(col, 1.04), col, shade(col, .82)); c.fill(); c.strokeStyle = shade(col, .7); c.lineWidth = .55; c.stroke();
  el(c, cx, -19, 3, .7, shade(col, .85));
  c.strokeStyle = rgba(shade(col, .7), .5); c.lineWidth = .4; c.beginPath(); c.moveTo(cx - 5, -10.4); c.quadraticCurveTo(cx, -9.4, cx + 5, -10.4); c.stroke();
};
P.trophy = (c, W, H) => {
  dropShadow(c, .5, 0, W - 1, H + .3);
  block(c, .5, 2, W - 1, 3.4, H - 5.8, '#6a7ad0', { topCol: '#8a98e0', r: 1.4 });
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(2, 9, W - 4, .5);
  rf(c, W / 2 - 3.6, 9.6, 7.2, 3, .6, '#ffd84a'); c.fillStyle = '#9a7a20'; c.fillRect(W / 2 - 2.6, 10.8, 5.2, .5);
  const n = Math.max(1, Math.round(W / 10)), sp = W / n;
  for (let i = 0; i < n; i++) {
    const cx = sp * (i + .5), kind = i % 3;
    if (kind === 0) {   // cup
      rf(c, cx - 2.6, 1.6, 5.2, 1.6, .5, '#8a5a32'); rf(c, cx - .7, -1.2, 1.4, 3, .4, '#e0a830');
      c.beginPath(); c.moveTo(cx - 4, -9); c.lineTo(cx + 4, -9); c.quadraticCurveTo(cx + 3.8, -2.4, cx, -1.6); c.quadraticCurveTo(cx - 3.8, -2.4, cx - 4, -9); c.fillStyle = lg(c, cx - 4, 0, cx + 4, 0, '#fff0a0', '#ffcf3a', '#d89a20'); c.fill(); c.strokeStyle = '#a87410'; c.lineWidth = .5; c.stroke();
      c.strokeStyle = '#e8b030'; c.lineWidth = .8; c.beginPath(); c.arc(cx - 4, -6.6, 1.6, PI * .5, PI * 1.5); c.moveTo(cx + 4, -8.2); c.arc(cx + 4, -6.6, 1.6, -PI * .5, PI * .5); c.stroke();
      el(c, cx, -9, 4, .9, '#ffe680'); el(c, cx - 1.6, -6.2, .6, 1.6, 'rgba(255,255,255,.75)');
    } else if (kind === 1) {   // star
      rf(c, cx - 2, 1.4, 4, 1.8, .5, '#8a5a32'); rf(c, cx - .5, -1, 1, 2.6, .3, '#c8ccd8');
      c.beginPath(); for (let k = 0; k < 10; k++) { const a = -PI / 2 + k * PI / 5, r = k % 2 ? 1.6 : 3.6; c.lineTo(cx + Math.cos(a) * r, -4.4 + Math.sin(a) * r); } c.closePath();
      c.fillStyle = lg(c, cx - 3, -8, cx + 3, -1, '#ffffff', '#c8d8f0', '#98a8c8'); c.fill(); c.strokeStyle = '#7888a8'; c.lineWidth = .45; c.stroke();
    } else {   // medal on a stand
      c.strokeStyle = '#e85a5a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - 1.6, -8); c.lineTo(cx, -3.4); c.lineTo(cx + 1.6, -8); c.stroke();
      el(c, cx, -2, 2.6, 2.6, '#c88a3a'); el(c, cx, -2, 2.1, 2.1, '#f0b060'); el(c, cx - .6, -2.6, .7, .7, 'rgba(255,255,255,.7)');
    }
  }
};
P.petbed = (c, W, H, col) => {
  col = col || '#8ab8f0'; const cx = W / 2, cy = H - 7, rx = W / 2 - 1, ry = Math.min(6.2, H / 2 - 1.6);
  ovalShadow(c, cx + 1, cy + 2, rx + 1, ry + 1, .22);
  el(c, cx, cy + .9, rx, ry, shade(col, .66)); el(c, cx, cy, rx, ry, col);
  c.save(); c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.clip(); el(c, cx - rx * .3, cy - ry * .4, rx * .6, ry * .4, rgba(shade(col, 1.4), .7)); c.restore();
  el(c, cx, cy + .6, rx - 2.6, ry - 2.4, shade(col, .8)); el(c, cx, cy + 1, rx - 3, ry - 2.6, '#fff4e4');
  c.fillStyle = 'rgba(220,180,140,.4)'; for (let i = -1; i <= 1; i++) el(c, cx + i * 2.6, cy + 1.2, .6, .5, 'rgba(220,180,140,.45)');
  // bone toy
  c.save(); c.translate(cx + rx - 3, cy + ry - 1); c.rotate(-.4); rf(c, -2, -.5, 4, 1, .4, '#ffffff'); for (const s of [-2, 2]) { el(c, s, -.6, .7, .7, '#ffffff'); el(c, s, .6, .7, .7, '#ffffff'); } c.restore();
};
P.rug = (c, W, H, col) => {
  col = col || '#e0707a'; const x = 1.2, y = 1.2, w = W - 2.4, h = H - 2.4, oval = W === H && W <= 32;
  c.fillStyle = 'rgba(80,50,30,.14)';
  if (oval) {
    el(c, W / 2 + .4, H / 2 + .6, w / 2, h / 2, 'rgba(80,50,30,.14)');
    el(c, W / 2, H / 2, w / 2, h / 2, shade(col, .78)); el(c, W / 2, H / 2, w / 2 - .7, h / 2 - .7, col);
    el(c, W / 2, H / 2, w / 2 - 2, h / 2 - 2, '#fff2d8'); el(c, W / 2, H / 2, w / 2 - 2.8, h / 2 - 2.8, shade(col, 1.12));
    el(c, W / 2, H / 2, w / 4, h / 4, shade(col, 1.45)); el(c, W / 2, H / 2, w / 9, h / 9, '#ffd86a');
    return;
  }
  rf(c, x + .4, y + .6, w, h, 2, 'rgba(80,50,30,.14)');
  // fringe on the short ends
  c.strokeStyle = '#f6ead0'; c.lineWidth = .45;
  const horiz = w >= h;
  if (horiz) for (let yy = y + 1; yy < y + h - .5; yy += 1.1) { c.beginPath(); c.moveTo(x - .9, yy); c.lineTo(x + 1, yy); c.moveTo(x + w - 1, yy); c.lineTo(x + w + .9, yy); c.stroke(); }
  else for (let xx = x + 1; xx < x + w - .5; xx += 1.1) { c.beginPath(); c.moveTo(xx, y - .9); c.lineTo(xx, y + 1); c.moveTo(xx, y + h - 1); c.lineTo(xx, y + h + .9); c.stroke(); }
  rf(c, x, y, w, h, 1.6, shade(col, .78)); rf(c, x + .5, y + .5, w - 1, h - 1, 1.3, col);
  rf(c, x + 1.8, y + 1.8, w - 3.6, h - 3.6, 1, '#fff2d8'); rf(c, x + 2.5, y + 2.5, w - 5, h - 5, .8, shade(col, 1.15));
  // zig-zag border + medallion
  c.strokeStyle = shade(col, .8); c.lineWidth = .5; c.beginPath();
  for (let xx = x + 3.5, k = 0; xx < x + w - 3.4; xx += 1.6, k++) c.lineTo(xx, k % 2 ? y + 3.3 : y + 4.4);
  c.stroke(); c.beginPath();
  for (let xx = x + 3.5, k = 0; xx < x + w - 3.4; xx += 1.6, k++) c.lineTo(xx, k % 2 ? y + h - 3.3 : y + h - 4.4);
  c.stroke();
  const cx = W / 2, cy = H / 2, mr = Math.min(w, h) * .26;
  c.beginPath(); c.moveTo(cx, cy - mr); c.lineTo(cx + mr * 1.4, cy); c.lineTo(cx, cy + mr); c.lineTo(cx - mr * 1.4, cy); c.closePath(); c.fillStyle = shade(col, 1.45); c.fill(); c.strokeStyle = '#fff2d8'; c.lineWidth = .5; c.stroke();
  el(c, cx, cy, mr * .4, mr * .32, '#ffd86a');
  for (const s of [-1, 1]) { el(c, cx + s * (w / 2 - 7), cy, 1.2, 1.2, shade(col, .85)); el(c, cx + s * (w / 2 - 7), cy, .5, .5, '#ffd86a'); }
};
P.painting = (c, W, H) => {
  // Hangs on the wall: footprint is the wall tile (top wall row); the frame sits on the wallpaper band.
  const x = 2, y = 1.2, w = W - 4, h = 8.4;
  rf(c, x + .6, y + .8, w, h, .8, 'rgba(80,50,20,.25)');
  solid(c, x, y, w, h, .8, '#d6a640', { line: '#9a7020' });
  rr(c, x + 1.1, y + 1.1, w - 2.2, h - 2.2, .3); c.fillStyle = lg(c, 0, y, 0, y + h, '#bfe8ff', '#e8f6ff'); c.fill();
  c.save(); rr(c, x + 1.1, y + 1.1, w - 2.2, h - 2.2, .3); c.clip();
  el(c, x + w * .72, y + 3.2, 1.3, 1.3, '#ffe066');
  el(c, x + w * .3, y + h, w * .4, 3.6, '#7ccf5a'); el(c, x + w * .8, y + h + .4, w * .45, 3.2, '#5ab048');
  if (w > 18) { c.beginPath(); c.moveTo(x + w * .45, y + h - 2); c.lineTo(x + w * .55, y + 2.6); c.lineTo(x + w * .66, y + h - 2); c.fillStyle = '#9aa8c8'; c.fill(); c.beginPath(); c.moveTo(x + w * .52, y + 3.6); c.lineTo(x + w * .55, y + 2.6); c.lineTo(x + w * .58, y + 3.6); c.fillStyle = '#ffffff'; c.fill(); }
  el(c, x + w * .25, y + 3, 1.6, .6, '#ffffff'); el(c, x + w * .25 + 1, y + 2.7, 1.1, .5, '#ffffff');
  c.restore();
  el(c, x + 1.6, y + .5, w * .2, .3, 'rgba(255,255,255,.6)');
};
P.fireplace = (c, W, H) => {
  dropShadow(c, .3, -8, W - .6, H + 8.3);
  // chimney breast (stone)
  rr(c, 1.4, -20, W - 2.8, 12, [1.6, 1.6, 0, 0]); c.fillStyle = lg(c, 0, -20, 0, -8, '#d8cfc4', '#c4b8ac'); c.fill(); c.strokeStyle = '#9a8e84'; c.lineWidth = .5; c.stroke();
  c.save(); rr(c, 1.4, -20, W - 2.8, 12, [1.6, 1.6, 0, 0]); c.clip(); for (let r = 0; r < 4; r++) for (let k = -1; k < W / 4; k++) { const xx = k * 4.2 + (r % 2 ? 2.1 : 0) + 1.6, yy = -19.6 + r * 3; rf(c, xx, yy, 3.8, 2.6, .9, r % 2 ? '#e2d9ce' : '#d6ccc0'); } c.restore();
  // mantel
  rf(c, 0, -9.4, W, 2.6, .9, '#a8693a'); rf(c, 0, -9.4, W, .9, [.9, .9, 0, 0], '#d4955a'); rr(c, 0, -9.4, W, 2.6, .9); c.strokeStyle = '#6e4224'; c.lineWidth = .5; c.stroke();
  // mantel decor: candle + small clock
  rf(c, 2.6, -13, 1.4, 3.6, .4, '#fff6e0'); el(c, 3.3, -13.8, .6, .9, '#ffb030');
  el(c, W - 4.4, -11.8, 2.2, 2.2, '#c88a3a'); el(c, W - 4.4, -11.8, 1.6, 1.6, '#fffbe8'); c.strokeStyle = '#5a3a20'; c.lineWidth = .3; c.beginPath(); c.moveTo(W - 4.4, -11.8); c.lineTo(W - 4.4, -12.9); c.moveTo(W - 4.4, -11.8); c.lineTo(W - 3.6, -11.6); c.stroke();
  // brick surround
  rr(c, 1, -6.8, W - 2, H + 5.6, [0, 0, 1, 1]); c.fillStyle = lg(c, 0, -7, 0, H, '#d8705a', '#b85844'); c.fill(); c.strokeStyle = '#8a3a2c'; c.lineWidth = .5; c.stroke();
  c.fillStyle = 'rgba(255,220,200,.35)'; for (let r = 0; r < 7; r++) { const yy = -6.6 + r * 2.6; c.fillRect(1.2, yy, W - 2.4, .3); for (let k = 0; k < W / 4; k++) c.fillRect(1.2 + k * 4 + (r % 2 ? 2 : 0), yy, .3, 2.6); }
  // firebox
  const fx = 3.6, fw = W - 7.2, ft = -3.2, fb = H - 2.4;
  c.beginPath(); c.moveTo(fx, fb); c.lineTo(fx, ft + fw / 2); c.arc(fx + fw / 2, ft + fw / 2, fw / 2, PI, 0); c.lineTo(fx + fw, fb); c.closePath();
  c.fillStyle = lg(c, 0, ft, 0, fb, '#2a1410', '#4a2418'); c.fill(); c.strokeStyle = '#6a2c20'; c.lineWidth = .6; c.stroke();
  // logs
  c.save(); c.translate(W / 2, fb - 1.6); c.rotate(.18); rf(c, -4.4, -1, 8.8, 2, 1, '#8a5432'); el(c, 4.2, 0, 1, 1, '#d4955a'); c.restore();
  c.save(); c.translate(W / 2, fb - 1.4); c.rotate(-.2); rf(c, -4.4, -1, 8.8, 2, 1, '#7a4428'); el(c, -4.2, 0, 1, 1, '#c88a52'); c.restore();
  // hearth
  rf(c, -.4, H - 2.6, W + .8, 2.4, .8, '#9a8e84'); rf(c, -.4, H - 2.6, W + .8, .8, [.8, .8, 0, 0], '#c8beb4');
};
P.piano = (c, W, H) => {
  const col = '#3a3044';
  dropShadow(c, .4, -8, W - .8, H + 8.3);
  block(c, .4, -17, W - .8, 2.6, H + 13.6, col, { r: 1.6 });
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(1.4, -13.8, 1, 10);
  // music stand + sheet
  rf(c, 3, -11, W - 6, 4.6, .6, '#2a2232');
  c.save(); c.translate(W / 2, -9.6); c.rotate(-.05); rf(c, -3.2, -2.6, 6.4, 4.2, .3, '#fffbee'); c.fillStyle = '#6a6a7e'; for (let i = 0; i < 3; i++) c.fillRect(-2.6, -1.8 + i * 1.2, 5.2, .25); el(c, -1, -1.2, .4, .3, '#3a3a4a'); el(c, 1.2, -.1, .4, .3, '#3a3a4a'); c.restore();
  // keyboard ledge
  rf(c, -.2, -3, W + .4, 5.4, 1, '#4a3e56'); rr(c, -.2, -3, W + .4, 5.4, 1); c.strokeStyle = '#1e1826'; c.lineWidth = .5; c.stroke();
  rf(c, .8, -2.2, W - 1.6, 3.4, .5, '#ffffff');
  const nk = Math.floor((W - 1.6) / 1.5), kw = (W - 1.6) / nk;
  c.fillStyle = '#c8c8d8'; for (let i = 1; i < nk; i++) c.fillRect(.8 + i * kw - .1, -2.2, .2, 3.4);
  c.fillStyle = '#1e1826'; for (let i = 1; i < nk; i++) if (i % 7 !== 3 && i % 7 !== 0) c.fillRect(.8 + i * kw - .45, -2.2, .9, 2);
  c.fillStyle = '#e8e2f0'; c.fillRect(.8, -2.2, W - 1.6, .35);
  // legs + pedals
  for (const lx of [1.6, W - 3.2]) rf(c, lx, 2.4, 1.6, 8, .5, '#2a2232');
  for (let i = -1; i <= 1; i++) el(c, W / 2 + i * 1.6, H - 3, .6, .4, '#ffd24a');
  el(c, 3, -15.4, W * .2, .5, 'rgba(255,255,255,.22)');
};

// ---- Animated touches (drawn on top of the cached art every frame) ------------------
function glowSprite() {
  return make('glow', -16, -16, 32, 32, c => { c.fillStyle = rg(c, 0, 0, 16, 'rgba(255,226,140,.55)', 'rgba(255,214,120,.22)', 'rgba(255,210,120,0)'); c.fillRect(-16, -16, 32, 32); });
}
function fxSteam(ctx, x, y, t, px, py) {
  for (let i = 0; i < 3; i++) {
    const ph = ((t / 70) + i / 3) % 1, a = Math.sin(ph * PI) * .65, sx = px + Math.sin(ph * 7 + i * 2) * 1.4, sy = py - ph * 11;
    ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.ellipse(x + sx, y + sy, 1.1 + ph * 1.8, .9 + ph * 1.3, 0, 0, TAU); ctx.fill();
  }
}
function fxFire(ctx, x, y, W, H, t) {
  const cx = x + W / 2, by = y + H - 3.4, fw = W - 7.2;
  const g = glowSprite(); ctx.globalAlpha = .55 + .2 * Math.sin(t / 7) + .1 * Math.sin(t / 3.1);
  ctx.drawImage(g.cv, cx - fw * .9, by - 9 - fw * .4, fw * 1.8, fw * 1.6); ctx.globalAlpha = 1;
  const flame = (ox, h, w, col, ph) => {
    const s = 1 + .16 * Math.sin(t / 4 + ph) + .08 * Math.sin(t / 2.3 + ph * 2), hh = h * s, sway = Math.sin(t / 6 + ph) * .9;
    ctx.beginPath(); ctx.moveTo(cx + ox - w, by); ctx.quadraticCurveTo(cx + ox - w * 1.1, by - hh * .55, cx + ox + sway, by - hh);
    ctx.quadraticCurveTo(cx + ox + w * 1.1, by - hh * .55, cx + ox + w, by); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  const k = fw / 9;
  flame(-2.2 * k, 6.6, 2.2 * k, '#ff6a2a', 0); flame(2.2 * k, 6, 2.1 * k, '#ff6a2a', 2); flame(0, 8.6, 2.8 * k, '#ff9a30', 1);
  flame(-.8 * k, 5.4, 1.6 * k, '#ffd040', 3); flame(1 * k, 4.4, 1.3 * k, '#ffe880', 4);
  for (let i = 0; i < 2; i++) { const ph = ((t / 50) + i * .5) % 1; ctx.fillStyle = `rgba(255,220,120,${1 - ph})`; ctx.fillRect(cx + Math.sin(ph * 9 + i) * 2.5 - .3, by - 5 - ph * 7, .6, .6); }
}
function fxLamp(ctx, x, y, W, H, t) {
  const g = glowSprite(), cx = x + W / 2; ctx.globalAlpha = .75 + .06 * Math.sin(t / 40);
  ctx.drawImage(g.cv, cx - 13, y - 26, 26, 24);
  ctx.globalAlpha = .45; ctx.drawImage(g.cv, cx - 9, y + H - 9, 18, 9); ctx.globalAlpha = 1;
}
function fxSparkle(ctx, x, y, t, seed) {
  const ph = ((t + seed * 37) % 150) / 150; if (ph > .25) return;
  const a = Math.sin(ph / .25 * PI), r = 1.8 * a;
  ctx.fillStyle = `rgba(255,255,240,${a})`; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * .3, y - r * .3); ctx.lineTo(x + r, y); ctx.lineTo(x + r * .3, y + r * .3); ctx.lineTo(x, y + r); ctx.lineTo(x - r * .3, y + r * .3); ctx.lineTo(x - r, y); ctx.lineTo(x - r * .3, y - r * .3); ctx.closePath(); ctx.fill();
}
function fxBath(ctx, x, y, W, H, t) {
  const fy = H - 5.5;
  for (let i = 0; i < 2; i++) { const ph = (t / 60 + i * .5) % 1, a = Math.sin(ph * PI) * .6; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = .5; ctx.beginPath(); ctx.ellipse(x + 6 + i * (W - 14), y + fy * .5, 1 + ph * 2.4, .5 + ph * 1, 0, 0, TAU); ctx.stroke(); }
}

// ---- prop() -------------------------------------------------------------------------
HA.prop = function (ctx, kind, x, y, w, h, t, info) {
  w = w || 1; h = h || 1; t = t || 0; info = info || {};
  const W = w * 16, H = h * 16, col = info.color || '';
  let fn = P[kind];
  if (kind === 'plant') {
    const pot = make('plpot' + w + 'x' + h, -2, H - 14, W + 4, 14, c => P.plantPot(c, W, H)); blit(ctx, pot, x, y);
    const lv = make('plleaf' + w + 'x' + h, -10, -22, 20, 24, c => P.plantLeaves(c, W, H)), sw = Math.sin(t / 45 + x * .07) * .05;
    ctx.save(); ctx.translate(x + W / 2, y + H - 9.6); ctx.transform(1, 0, sw, 1, 0, 0); ctx.drawImage(lv.cv, lv.x0, lv.y0, lv.w, lv.h); ctx.restore();
    return;
  }
  if (!fn) fn = P.chest;
  const pad = 6, s = make('p:' + kind + ':' + w + 'x' + h + ':' + col, -pad, -22, W + pad * 2, H + 22 + 3, c => fn(c, W, H, col));
  blit(ctx, s, x, y);
  switch (kind) {
    case 'tv': { const tw = Math.min(W - 2, 14 + (W - 16) * .6), tx = (W - tw) / 2; screenFx(ctx, x + tx + 1.6, y - 11.4, tw - 3.2, 10.6, t, x * .13); break; }
    case 'fireplace': fxFire(ctx, x, y, W, H, t); break;
    case 'stove': fxSteam(ctx, x, y, t, 4.2, -4); break;
    case 'lamp': fxLamp(ctx, x, y, W, H, t); break;
    case 'bath': fxBath(ctx, x, y, W, H, t); break;
    case 'trophy': { const n = Math.max(1, Math.round(W / 10)), sp = W / n; for (let i = 0; i < n; i++) fxSparkle(ctx, x + sp * (i + .5) + 2, y - 7, t, i + x); break; }
  }
};


// ---- Vehicles -----------------------------------------------------------------------
// Local units: origin = the rider's feet point (tile x+8, y+15). dir 0 down (toward the camera), 1 up, 2 left, 3 right.
// dir 2 is dir 3 mirrored. Wheel spin uses 3 cached frames; everything else animated is drawn on top.
const TIRE = '#363642', TIRE_HI = '#5a5a6a', DARK = '#3c3c4c', SEAT = '#3a3240';
function line(c, pts, col, lw) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
function tube(c, pts, col, lw) { line(c, pts, shade(col, .58), lw + .7); line(c, pts, col, lw); line(c, pts.map((v, i) => i % 2 ? v - lw * .22 : v), rgba(shade(col, 1.5), .7), lw * .3); }
function wheelSide(c, cx, cy, r, fr, o) {
  o = o || {};
  el(c, cx, cy, r + .25, r + .25, shade(TIRE, .7)); el(c, cx, cy, r, r, TIRE);
  c.strokeStyle = TIRE_HI; c.lineWidth = .45; c.beginPath(); c.arc(cx, cy, r - .45, PI * 1.05, PI * 1.6); c.stroke();
  const ri = r * (o.rim || .6);
  el(c, cx, cy, ri, ri, o.rimCol || '#dfe4ee'); el(c, cx + ri * .1, cy + ri * .12, ri * .78, ri * .78, o.rimIn || '#aab4c6');
  c.strokeStyle = o.spoke || '#eef2f8'; c.lineWidth = o.thin ? .3 : .55;
  const n = o.thin ? 6 : 3;
  for (let k = 0; k < n; k++) { const a = fr * PI * 2 / (n * 3) + k * PI * 2 / n; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * ri * .95, cy + Math.sin(a) * ri * .95); c.stroke(); }
  el(c, cx, cy, Math.max(.5, r * .18), Math.max(.5, r * .18), '#7a8498'); el(c, cx - .15, cy - .15, r * .08, r * .08, '#ffffff');
}
function wheelEnd(c, cx, cy, w, h, fr) {   // a wheel seen edge-on (front/back views); tread marks move with fr
  rr(c, cx - w / 2, cy - h / 2, w, h, w / 2); c.fillStyle = TIRE; c.fill(); c.strokeStyle = shade(TIRE, .65); c.lineWidth = .4; c.stroke();
  c.save(); rr(c, cx - w / 2, cy - h / 2, w, h, w / 2); c.clip();
  c.fillStyle = TIRE_HI; for (let yy = cy - h / 2 - 2 + fr * .7; yy < cy + h / 2 + 1; yy += 2.1) c.fillRect(cx - w / 2, yy, w, .45);
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(cx - w / 2 + .3, cy - h / 2, w * .3, h);
  c.restore();
}
function lampGlass(c, x, y, rx, ry, col) { el(c, x, y, rx + .35, ry + .35, shade(col, .6)); el(c, x, y, rx, ry, col); el(c, x - rx * .3, y - ry * .35, rx * .4, ry * .35, 'rgba(255,255,255,.9)'); }
function body(c, path, col, y0, y1, o) {   // painted bodywork: gradient, darker outline, top-left gloss
  o = o || {};
  path(); c.fillStyle = lg(c, 0, y0, 0, y1, shade(col, o.lt || 1.3), col, shade(col, o.dk || .78)); c.fill();
  c.strokeStyle = shade(col, .55); c.lineWidth = o.lw || .6; c.stroke();
  if (o.gloss !== false) { c.save(); path(); c.clip(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(o.gx === undefined ? 0 : o.gx, y0 + (y1 - y0) * .22, o.gw || 3, (y1 - y0) * .16, -.2, 0, TAU); c.fill(); c.restore(); }
}
function headFig(c, x, y, st, back) {   // tiny driver / pilot head seen through glass
  st = st || G.PLAYER_STYLE || { hair: '#4a2f1a', skin: '#f8d0a8', hat: '#f8f8f8' };
  el(c, x, y + 3.6, 2.8, 1.8, st.shirt || '#e04848');
  el(c, x, y, 2.6, 2.6, st.hair || '#4a2f1a');
  if (!back) { el(c, x, y + .5, 2.2, 2, st.skin || '#f8d0a8'); el(c, x - .8, y + .6, .3, .45, '#2a2030'); el(c, x + .8, y + .6, .3, .45, '#2a2030'); }
  if (st.hat) { c.beginPath(); c.ellipse(x, y - .9, 2.8, 2.2, 0, PI, TAU); c.fillStyle = st.hat; c.fill(); c.strokeStyle = 'rgba(80,80,100,.5)'; c.lineWidth = .3; c.stroke(); if (!back) el(c, x, y - 2, .6, .45, st.shirt || '#e04848'); }
}

const V = {};
// Bicycle ------------------------------------------------------------
V.bicycle = { col: '#4aa8e8', box: [-14, -18, 28, 24], paint(c, dir, layer, col, fr) {
  if (dir === 3) {
    if (layer === 'back') {
      ovalShadow(c, 0, -.2, 12.5, 2.2, .3);
      wheelSide(c, -7, -4, 4, fr, { thin: true, rim: .78, rimCol: '#c8ced8', rimIn: '#f2f4f8' });
      wheelSide(c, 7, -4, 4, fr, { thin: true, rim: .78, rimCol: '#c8ced8', rimIn: '#f2f4f8' });
      tube(c, [-7, -4, -1, -4, -2.4, -9.4, -7, -4], col, 1.1);
      tube(c, [-1, -4, 4.4, -9.6, -2.4, -9.4], col, 1.1);
      tube(c, [4.4, -9.6, 7, -4], shade(col, .85), 1);
      el(c, -1, -4, 1.4, 1.4, '#8a94a8'); el(c, -1, -4, .6, .6, '#dfe4ee');
      rf(c, -.2, -2.8, 2.2, .8, .3, DARK);
      rf(c, -4.8, -11, 4.8, 1.6, [.6, 1.2, .6, .6], SEAT); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-4.2, -10.8, 2.4, .35);
      rf(c, -9.6, -8.4, 4.4, 1, .4, shade(col, .8));   // rear fender
    } else {
      tube(c, [4.4, -9.6, 4, -12.2], '#a8b0c0', .7);
      line(c, [4, -12.2, 2.4, -12.6], DARK, 1.3);
      // basket
      rr(c, 5, -12, 5.4, 4, [.6, .6, 1.4, 1.4]); c.fillStyle = lg(c, 0, -12, 0, -8, '#f0c888', '#c89458'); c.fill(); c.strokeStyle = '#9a6a3a'; c.lineWidth = .45; c.stroke();
      c.strokeStyle = 'rgba(140,90,40,.55)'; c.lineWidth = .3; for (let xx = 6; xx < 10.4; xx += 1.2) { c.beginPath(); c.moveTo(xx, -11.6); c.lineTo(xx, -8.4); c.stroke(); }
      c.fillStyle = 'rgba(140,90,40,.55)'; c.fillRect(5.2, -10.2, 5, .3);
      lampGlass(c, 10.6, -10, .8, .9, '#fff2a0');
    }
    return;
  }
  const away = dir === 1;
  if (layer === 'back') {
    ovalShadow(c, 0, -1.5, 4.6, 6.5, .3);
    if (!away) { wheelEnd(c, 0, -6.5, 2.2, 6, fr); rf(c, -1.8, -10.2, 3.6, 1.6, .7, SEAT); }
    else {
      wheelEnd(c, 0, -7.5, 2.2, 6, fr); tube(c, [0, -9, 0, -11.2], col, 1.2);
      tube(c, [-6.4, -11.6, -3, -12.2, 3, -12.2, 6.4, -11.6], '#a8b0c0', .7);
      line(c, [-6.6, -11.4, -5.2, -11.7], DARK, 1.4); line(c, [5.2, -11.7, 6.6, -11.4], DARK, 1.4);
    }
    return;
  }
  if (!away) {
    wheelEnd(c, 0, .8, 2.4, 7.2, fr);
    rf(c, -2.1, -3.6, 4.2, 1.4, .7, shade(col, .85));   // fender
    tube(c, [-1.5, .4, -1.1, -6.5], col, .8); tube(c, [1.5, .4, 1.1, -6.5], col, .8);
    // basket
    rr(c, -3.6, -9.6, 7.2, 4.6, [.8, .8, 1.8, 1.8]); c.fillStyle = lg(c, 0, -9.6, 0, -5, '#f0c888', '#c89458'); c.fill(); c.strokeStyle = '#9a6a3a'; c.lineWidth = .45; c.stroke();
    c.strokeStyle = 'rgba(140,90,40,.55)'; c.lineWidth = .3; for (let xx = -2.4; xx < 3.6; xx += 1.2) { c.beginPath(); c.moveTo(xx, -9.2); c.lineTo(xx, -5.4); c.stroke(); }
    lampGlass(c, 0, -4.4, 1, .8, '#fff2a0');
    tube(c, [-6.4, -10.4, -3, -11, 3, -11, 6.4, -10.4], '#a8b0c0', .7);
    line(c, [-6.7, -10.2, -5.2, -10.5], DARK, 1.4); line(c, [5.2, -10.5, 6.7, -10.2], DARK, 1.4);
  } else {
    wheelEnd(c, 0, .4, 2.4, 7.2, fr);
    rf(c, -2.2, -5.2, 4.4, 2.2, [1.2, 1.2, .4, .4], col); rr(c, -2.2, -5.2, 4.4, 2.2, [1.2, 1.2, .4, .4]); c.strokeStyle = shade(col, .55); c.lineWidth = .45; c.stroke();
    rf(c, -2.6, -7.6, 5.2, 1.2, .5, '#a8b0c0');   // rack
    lampGlass(c, 0, -3.8, 1, .6, '#ff5a5a');
    rf(c, -1.8, -10, 3.6, 1.8, [.4, .4, 1, 1], SEAT);
  }
} };
// Scooter (moped) ------------------------------------------------------
V.scooter = { col: '#ff8fb0', box: [-14, -19, 28, 25], paint(c, dir, layer, col, fr) {
  const cream = '#fff6e8';
  if (dir === 3) {
    if (layer === 'back') {
      ovalShadow(c, 0, -.2, 12.5, 2.4, .32);
      wheelSide(c, -6.6, -2.9, 2.9, fr, { rim: .55 }); wheelSide(c, 6.8, -2.9, 2.9, fr, { rim: .55 });
      rf(c, -2.5, -4.8, 7.5, 1.6, .6, DARK);   // floorboard
      body(c, () => { c.beginPath(); c.moveTo(-11, -4.4); c.quadraticCurveTo(-11.4, -9.4, -7, -9.6); c.lineTo(-1.6, -9.2); c.quadraticCurveTo(-.8, -6, -1.6, -3.4); c.lineTo(-10, -3.2); c.closePath(); }, col, -9.6, -3.2, { gx: -7, gw: 3 });
      rf(c, -10.6, -11.4, 8.6, 2.2, [1.2, 1.4, .6, .6], cream); rr(c, -10.6, -11.4, 8.6, 2.2, [1.2, 1.4, .6, .6]); c.strokeStyle = '#c8b8a0'; c.lineWidth = .4; c.stroke();
      lampGlass(c, -11.2, -7.2, .6, .9, '#ff5a5a');
      rf(c, -12, -10.8, 2.6, .8, .3, '#a8b0c0');
    } else {
      body(c, () => { c.beginPath(); c.moveTo(3.2, -3.4); c.quadraticCurveTo(4, -9, 5, -12.4); c.lineTo(7.4, -12.4); c.quadraticCurveTo(7.2, -7, 9.6, -5.4); c.quadraticCurveTo(9.4, -3.6, 7.4, -3.4); c.closePath(); }, col, -12.4, -3.4, { gx: 5.4, gw: 1.4 });
      body(c, () => { rr(c, 4.6, -6.8, 5.4, 1.8, [1.2, 1.4, .3, .3]); }, col, -6.8, -5, { gloss: false });
      tube(c, [6, -12.4, 5.4, -14], '#a8b0c0', .7);
      line(c, [3.6, -14.2, 7.2, -14], col, 1.3); line(c, [3.2, -14.2, 4.4, -14.2], DARK, 1.3);
      rf(c, 6.4, -15.6, 3.4, 2.6, 1.2, col); lampGlass(c, 9.1, -14.3, .8, 1, '#fff2a0');
      line(c, [5.6, -14.6, 5.2, -16.4], DARK, .35); el(c, 5.2, -16.8, .8, .6, '#c8d8f0');
    }
    return;
  }
  const away = dir === 1;
  if (layer === 'back') {
    ovalShadow(c, 0, -1.6, 5.4, 6.6, .3);
    if (!away) {
      rf(c, -6.2, -10.4, 12.4, 6.6, 3, shade(col, .82)); rr(c, -6.2, -10.4, 12.4, 6.6, 3); c.strokeStyle = shade(col, .55); c.lineWidth = .5; c.stroke();
      rf(c, -4, -11.4, 8, 2.4, 1.2, cream);
    } else {
      wheelEnd(c, 0, -7.6, 2.8, 5, fr);
      line(c, [-6.4, -12.8, 6.4, -12.8], col, 1.4); line(c, [-7, -12.8, -5.4, -12.8], DARK, 1.4); line(c, [5.4, -12.8, 7, -12.8], DARK, 1.4);
      for (const s of [-1, 1]) { line(c, [s * 4.6, -13, s * 5.4, -15.4], DARK, .35); el(c, s * 5.6, -15.8, .9, .7, '#c8d8f0'); }
    }
    return;
  }
  if (!away) {
    wheelEnd(c, 0, 1.4, 2.8, 5.6, fr);
    body(c, () => rr(c, -2.4, -2.6, 4.8, 2.8, [1.6, 1.6, .4, .4]), col, -2.6, .2, { gloss: false });
    body(c, () => { c.beginPath(); c.moveTo(-4.4, -2.4); c.quadraticCurveTo(-5.2, -8, -3.6, -11.4); c.lineTo(3.6, -11.4); c.quadraticCurveTo(5.2, -8, 4.4, -2.4); c.quadraticCurveTo(0, -1.4, -4.4, -2.4); c.closePath(); }, col, -11.4, -2, { gx: -1.6, gw: 1.6 });
    rf(c, -1.6, -6, 3.2, 1.6, .7, shade(col, .7)); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-1.2, -5.6, 2.4, .3);
    line(c, [-6.2, -12.4, 6.2, -12.4], col, 1.6); line(c, [-6.8, -12.4, -5.2, -12.4], DARK, 1.5); line(c, [5.2, -12.4, 6.8, -12.4], DARK, 1.5);
    rf(c, -2.2, -14, 4.4, 2.6, 1.2, col); lampGlass(c, 0, -12.7, 1.3, 1, '#fff2a0');
    for (const s of [-1, 1]) { line(c, [s * 4.6, -12.6, s * 5.4, -15], DARK, .35); el(c, s * 5.6, -15.4, .9, .7, '#c8d8f0'); }
  } else {
    wheelEnd(c, 0, 1.6, 2.8, 4, fr);
    body(c, () => { c.beginPath(); c.moveTo(-5.6, -9.6); c.lineTo(5.6, -9.6); c.quadraticCurveTo(6.6, -3.4, 3.4, -1.4); c.lineTo(-3.4, -1.4); c.quadraticCurveTo(-6.6, -3.4, -5.6, -9.6); c.closePath(); }, col, -9.6, -1.4, { gx: -3, gw: 1.8 });
    rf(c, -4.6, -11, 9.2, 2.2, [1, 1, .4, .4], cream);
    rf(c, -2.4, -5.4, 4.8, 1.4, .6, '#ff5a5a'); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-2, -5.2, 2, .35);
    rf(c, -1.6, -3.4, 3.2, 1.6, .3, '#fffbe8'); c.fillStyle = '#8a94a8'; c.fillRect(-1.1, -2.8, 2.2, .3);
  }
} };
// Quad bike -----------------------------------------------------------------
V.quad = { col: '#ffa030', box: [-15, -18, 30, 25], paint(c, dir, layer, col, fr) {
  if (dir === 3) {
    if (layer === 'back') {
      ovalShadow(c, 0, -1, 13.5, 3.4, .32);
      for (const wx of [-7.2, 7.4]) { c.globalAlpha = .9; wheelSide(c, wx + 1.4, -6.6, 3.4, fr, { rim: .5, rimCol: '#9aa4b4', rimIn: '#7a8494' }); c.globalAlpha = 1; }
      rf(c, -9, -6.6, 18, 2.4, .8, DARK);
      for (const wx of [-7.4]) wheelSide(c, wx, -3.8, 3.9, fr, { rim: .5 });
      body(c, () => { c.beginPath(); c.moveTo(-12.4, -6.6); c.quadraticCurveTo(-12, -10.4, -7.4, -10.2); c.lineTo(-2.6, -9.8); c.lineTo(-3, -7.4); c.quadraticCurveTo(-6, -8.2, -9, -6.4); c.closePath(); }, col, -10.4, -6.4, { gx: -8, gw: 2 });
      rf(c, -6.6, -11.4, 8, 2.4, [1.2, 1.2, .6, .6], SEAT); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-5.8, -11.1, 4, .35);
      line(c, [-12.6, -11.6, -8, -11.6], '#a8b0c0', .6); line(c, [-12.6, -11.6, -12.4, -9.8], '#a8b0c0', .5);
      lampGlass(c, -12.8, -7.4, .5, .7, '#ff5a5a');
    } else {
      wheelSide(c, 7.6, -3.8, 3.9, fr, { rim: .5 });
      body(c, () => { c.beginPath(); c.moveTo(2.6, -7.4); c.lineTo(3.4, -10.2); c.lineTo(9.4, -10.4); c.quadraticCurveTo(12.8, -10, 12.8, -6.8); c.quadraticCurveTo(10.6, -8.4, 7.6, -8.2); c.quadraticCurveTo(4.6, -8, 2.6, -7.4); c.closePath(); }, col, -10.4, -6.8, { gx: 7, gw: 2.4 });
      line(c, [5.6, -11.6, 11.4, -11.6], '#a8b0c0', .6); line(c, [11.4, -11.6, 11.8, -10.2], '#a8b0c0', .5);
      lampGlass(c, 12.6, -8.6, .6, .8, '#fff2a0');
      tube(c, [4.4, -10.2, 4, -12.8], '#7a8494', .8); line(c, [5, -13, 2.2, -13], DARK, 1.5);
    }
    return;
  }
  const away = dir === 1;
  const fender = (cx, cy) => body(c, () => rr(c, cx - 3, cy - 1.6, 6, 3.2, [2, 2, .6, .6]), col, cy - 1.6, cy + 1.6, { gloss: false });
  if (layer === 'back') {
    ovalShadow(c, 0, -2.4, 10.6, 7, .3);
    for (const s of [-1, 1]) { wheelEnd(c, s * 7.6, -7, 3.6, 5.6, fr); fender(s * 7.6, -10); }
    rf(c, -6, -9.6, 12, 2.4, .8, DARK);
    if (!away) rf(c, -3.4, -11.6, 6.8, 3, 1.2, SEAT);
    else { tube(c, [0, -10, 0, -12.4], '#7a8494', .9); line(c, [-7.4, -12.6, 7.4, -12.6], DARK, 1.2); line(c, [-7.8, -12.6, -6, -12.6], '#222', 1.6); line(c, [6, -12.6, 7.8, -12.6], '#222', 1.6); }
    return;
  }
  for (const s of [-1, 1]) { wheelEnd(c, s * 7.6, -.6, 3.9, 6.6, fr); fender(s * 7.6, -4.8); }
  body(c, () => rr(c, -5.2, -8.6, 10.4, 5.6, 2), col, -8.6, -3, { gx: -2, gw: 2 });
  rf(c, -6.4, -3.6, 12.8, 1.5, .7, '#a8b0c0'); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-6, -3.4, 12, .35);
  if (!away) {
    lampGlass(c, -2.6, -6, 1.1, .9, '#fff2a0'); lampGlass(c, 2.6, -6, 1.1, .9, '#fff2a0'); rf(c, -1, -6.8, 2, 1.6, .4, shade(col, .6));
    tube(c, [0, -8.6, 0, -11.4], '#7a8494', .9); line(c, [-7.4, -11.6, 7.4, -11.6], DARK, 1.2); line(c, [-7.8, -11.6, -6, -11.6], '#222', 1.6); line(c, [6, -11.6, 7.8, -11.6], '#222', 1.6);
  } else {
    lampGlass(c, -3.2, -5.8, .9, .7, '#ff5a5a'); lampGlass(c, 3.2, -5.8, .9, .7, '#ff5a5a');
    c.strokeStyle = '#a8b0c0'; c.lineWidth = .5; for (let xx = -3.6; xx <= 3.6; xx += 1.8) { c.beginPath(); c.moveTo(xx, -8.4); c.lineTo(xx, -7.2); c.stroke(); }
    rf(c, -1.6, -9.6, 3.2, 1, .4, SEAT);
  }
} };
// Motorbike -----------------------------------------------------------------
V.motorbike = { col: '#e84848', box: [-15, -20, 30, 27], paint(c, dir, layer, col, fr) {
  if (dir === 3) {
    if (layer === 'back') {
      ovalShadow(c, 0, -.2, 13.5, 2.4, .32);
      wheelSide(c, -8.4, -4.1, 4.1, fr, { rim: .66, rimCol: '#4a4a58', rimIn: '#6a6a7a', spoke: '#b8c0cc' });
      wheelSide(c, 8.6, -4.1, 4.1, fr, { rim: .66, rimCol: '#4a4a58', rimIn: '#6a6a7a', spoke: '#b8c0cc' });
      tube(c, [-8.4, -4.1, -2, -6.4], DARK, 1.2);
      rr(c, -3, -7.8, 6.4, 4.8, 1.2); c.fillStyle = lg(c, 0, -7.8, 0, -3, '#c8ced8', '#7a8494'); c.fill(); c.strokeStyle = '#5a6070'; c.lineWidth = .45; c.stroke();
      c.fillStyle = 'rgba(60,64,80,.5)'; for (let i = 0; i < 3; i++) c.fillRect(-2.4 + i * 1.8, -7.2, .5, 3.6);
      tube(c, [-1.4, -3.2, -4.4, -5.2, -8.6, -8.4], '#d8dee8', .9);
      rr(c, -12.8, -9.8, 5.4, 2.2, 1.1); c.fillStyle = lg(c, 0, -9.8, 0, -7.6, '#f2f4f8', '#9aa4b4'); c.fill(); c.strokeStyle = '#6a7484'; c.lineWidth = .4; c.stroke();
      body(c, () => { c.beginPath(); c.moveTo(-13, -12); c.lineTo(-4.6, -10.4); c.lineTo(-4.8, -8.4); c.lineTo(-11.6, -9.4); c.closePath(); }, col, -12, -8.4, { gloss: false });
      rf(c, -8.4, -11.6, 8, 2, [1, 1, .5, .5], SEAT); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-7.6, -11.3, 4, .35);
      body(c, () => rr(c, -.6, -12.8, 6.4, 4.4, [2.4, 2.4, 1.2, 1.2]), col, -12.8, -8.4, { gx: 1.4, gw: 1.6 });
      c.fillStyle = '#ffffff'; c.fillRect(-.4, -10.8, 6, .7);
      lampGlass(c, -13, -10.4, .6, .7, '#ff5a5a');
    } else {
      tube(c, [6.4, -11, 8.6, -4.1], '#5a5a68', 1);
      body(c, () => { c.beginPath(); c.moveTo(4.6, -13.6); c.quadraticCurveTo(10.4, -13.6, 11.6, -8.6); c.lineTo(9.6, -6.2); c.quadraticCurveTo(6.4, -6.6, 4.4, -8.2); c.closePath(); }, col, -13.6, -6.2, { gx: 7, gw: 2 });
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(5, -10.6); c.lineTo(10.6, -10.2); c.lineTo(10.2, -9.4); c.lineTo(5, -9.8); c.fill();
      rr(c, 5.4, -16.6, 3.6, 3.4, [2, 1, .4, .4]); c.fillStyle = 'rgba(150,210,240,.6)'; c.fill(); c.strokeStyle = 'rgba(80,120,150,.8)'; c.lineWidth = .4; c.stroke();
      lampGlass(c, 11, -9.6, .7, 1, '#fff6c0');
      line(c, [6, -13.4, 3.4, -13.2], DARK, 1.4);
      rf(c, 6.2, -6, 4.8, 1.2, [1, 1, .3, .3], col);
    }
    return;
  }
  const away = dir === 1;
  if (layer === 'back') {
    ovalShadow(c, 0, -1.5, 5, 7.6, .32);
    if (!away) { wheelEnd(c, 0, -7.4, 3, 5.6, fr); body(c, () => rr(c, -3.6, -12, 7.2, 3.6, 1.6), col, -12, -8.4, { gloss: false }); rf(c, -3, -12.6, 6, 2.6, 1.2, SEAT); }
    else {
      wheelEnd(c, 0, -8, 3, 5.6, fr);
      rr(c, -3.4, -18.2, 6.8, 3.6, [2.4, 2.4, .6, .6]); c.fillStyle = 'rgba(150,210,240,.6)'; c.fill(); c.strokeStyle = 'rgba(80,120,150,.8)'; c.lineWidth = .4; c.stroke();
      body(c, () => rr(c, -4.6, -15, 9.2, 3.8, 1.8), col, -15, -11.2, { gloss: false });
      line(c, [-6.6, -12.6, -4.6, -12.8], DARK, 1.4); line(c, [4.6, -12.8, 6.6, -12.6], DARK, 1.4);
      for (const s of [-1, 1]) { line(c, [s * 4.4, -14.6, s * 5.8, -16.4], DARK, .35); el(c, s * 6.2, -16.8, 1, .7, '#2a2a36'); }
    }
    return;
  }
  if (!away) {
    wheelEnd(c, 0, 1.2, 3.2, 6.6, fr);
    tube(c, [-1.9, .4, -1.6, -5], '#5a5a68', .8); tube(c, [1.9, .4, 1.6, -5], '#5a5a68', .8);
    body(c, () => rr(c, -2.4, -2.6, 4.8, 1.8, [1.4, 1.4, .3, .3]), col, -2.6, -.8, { gloss: false });
    body(c, () => { c.beginPath(); c.moveTo(-4.8, -13); c.lineTo(4.8, -13); c.quadraticCurveTo(5.4, -7, 2, -4); c.lineTo(-2, -4); c.quadraticCurveTo(-5.4, -7, -4.8, -13); c.closePath(); }, col, -13, -4, { gx: -2, gw: 1.6 });
    c.fillStyle = '#ffffff'; c.fillRect(-.5, -12.8, 1, 8.6);
    lampGlass(c, 0, -8.4, 2.4, 1.5, '#fff6c0');
    rr(c, -3.4, -14.8, 6.8, 2.6, [2.2, 2.2, .4, .4]); c.fillStyle = 'rgba(150,210,240,.6)'; c.fill(); c.strokeStyle = 'rgba(80,120,150,.85)'; c.lineWidth = .4; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-2.2, -14.2, 1.4, .4);
    line(c, [-6.6, -12, -4.6, -12.4], DARK, 1.5); line(c, [4.6, -12.4, 6.6, -12], DARK, 1.5);
    for (const s of [-1, 1]) { line(c, [s * 4.6, -13.4, s * 6, -15.2], DARK, .35); el(c, s * 6.3, -15.6, 1, .7, '#2a2a36'); }
  } else {
    wheelEnd(c, 0, 1, 3.4, 6, fr);
    rr(c, 3.6, -6.4, 2.6, 4.6, 1.2); c.fillStyle = lg(c, 3.6, 0, 6.2, 0, '#f2f4f8', '#9aa4b4'); c.fill(); c.strokeStyle = '#6a7484'; c.lineWidth = .4; c.stroke(); el(c, 4.9, -2, .8, .5, '#4a5060');
    body(c, () => { c.beginPath(); c.moveTo(-4, -11.4); c.lineTo(4, -11.4); c.quadraticCurveTo(4.4, -6.6, 2.2, -4.6); c.lineTo(-2.2, -4.6); c.quadraticCurveTo(-4.4, -6.6, -4, -11.4); c.closePath(); }, col, -11.4, -4.6, { gx: -1.8, gw: 1.4 });
    rf(c, -2.6, -7.4, 5.2, 1.3, .6, '#ff4a4a'); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-2.2, -7.2, 2.2, .35);
    rf(c, -1.6, -4.4, 3.2, 1.8, .3, '#fffbe8'); c.fillStyle = '#8a94a8'; c.fillRect(-1.1, -3.8, 2.2, .3);
    rf(c, -3.2, -12.4, 6.4, 2.2, [1.2, 1.2, .4, .4], SEAT);
  }
} };
// Car ----------------------------------------------------------------------
const GLASS = ['#d8f4ff', '#8ac8ee', '#5aa0d8'];
V.car = { col: '#ffc83a', box: [-15, -26, 30, 37], hide: true, paint(c, dir, layer, col, fr) {
  if (layer !== 'back') return;
  if (dir === 3) {
    rf(c, -14.6, -13, 30.8, 15.6, 5, 'rgba(40,40,60,.16)'); ovalShadow(c, .6, 1.4, 16, 3.2, .3);
    // far wheels peeking
    for (const wx of [-9.4, 9.4]) rf(c, wx - 2.6, -6.6, 5.2, 3, 1.2, shade(TIRE, .8));
    // lower body (top surface + side face)
    body(c, () => rr(c, -15, -15, 30, 19, [5, 6, 3, 3]), col, -15, 4, { gloss: false, lt: 1.15, dk: .7 });
    rr(c, -14.4, -14.6, 28.8, 10.6, [4.4, 5.6, 1, 1]); c.fillStyle = lg(c, 0, -15, 0, -4, shade(col, 1.42), shade(col, 1.15)); c.fill();
    c.fillStyle = rgba(shade(col, .45), .4); c.fillRect(-14.4, -4.2, 28.8, .5);
    // side details: door seams, handle, sill, lamps
    c.fillStyle = rgba(shade(col, .5), .55); c.fillRect(-1.8, -3.6, .4, 5.4); c.fillRect(-9, -3.6, .35, 4.6);
    rf(c, -.4, -2.4, 2.2, .7, .35, shade(col, .55));
    c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(-14.2, -.6, 28.4, .8);
    rf(c, -13.8, 2.2, 27.6, 1.4, .6, shade(col, .55));
    lampGlass(c, 14.3, -1.8, .8, 1.3, '#fff6c0'); lampGlass(c, -14.4, -1.8, .7, 1.2, '#ff5a5a');
    // cabin: pillars + roof, side glass with the driver
    body(c, () => { c.beginPath(); c.moveTo(-10, -12); c.lineTo(-7.8, -22.2); c.quadraticCurveTo(-7.5, -23.6, -6, -23.6); c.lineTo(2, -23.6); c.quadraticCurveTo(3.6, -23.6, 4.2, -22.2); c.lineTo(9.4, -12); c.closePath(); }, col, -23.6, -12, { gloss: false, lt: 1.2 });
    c.beginPath(); c.moveTo(-8.4, -12.5); c.lineTo(-6.7, -20.6); c.lineTo(2.6, -20.6); c.lineTo(7.4, -12.5); c.closePath(); c.fillStyle = lg(c, 0, -20.6, 0, -12.5, ...GLASS); c.fill();
    c.save(); c.clip(); headFig(c, 1.4, -16.4, null, false); c.fillStyle = 'rgba(150,210,240,.3)'; c.fillRect(-9, -21, 18, 9); c.restore();
    rf(c, -2.4, -20.8, 1.3, 8.6, .3, shade(col, .85));
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = .5; c.beginPath(); c.moveTo(3.6, -19.4); c.lineTo(5.6, -15.4); c.moveTo(-6.2, -19.4); c.lineTo(-5.4, -16.8); c.stroke();
    rf(c, -7.2, -23.6, 10.6, 2.4, [1.4, 1.8, .4, .4], shade(col, 1.45)); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-5.6, -23.1, 5, .4);
    rf(c, 7.6, -14.4, 2.2, 1.8, .7, col);   // mirror
    // wheels
    for (const wx of [-9.4, 9.4]) { el(c, wx, 2.4, 4.6, 4.6, shade(col, .45)); wheelSide(c, wx, 3, 3.8, fr, { rim: .55, rimCol: '#e8ecf2', rimIn: '#b4bccb' }); }
    return;
  }
  const away = dir === 1, top = -22, bot = 8;
  rf(c, -12.4, -19, 25.6, 29, 5, 'rgba(40,40,60,.16)'); ovalShadow(c, .6, 3, 13, 7, .22);
  for (const s of [-1, 1]) for (const wy of [-15, 3.2]) rf(c, s * 11.2 - 1.4, wy - 2.8, 2.8, 5.6, 1.2, TIRE);
  body(c, () => rr(c, -11, top, 22, bot - top, [5, 5, 3, 3]), col, top, bot, { gloss: false, lt: 1.1, dk: .7 });
  rr(c, -10.4, top + .6, 20.8, bot - top - 6.4, [4.4, 4.4, 1.4, 1.4]); c.fillStyle = lg(c, -10, top, 10, bot, shade(col, 1.42), shade(col, 1.12)); c.fill();
  c.fillStyle = rgba(shade(col, .45), .45); c.fillRect(-10.4, bot - 6, 20.8, .5);
  // cabin
  const ct = -17.6, cb = -3.2;
  rr(c, -8.6, ct, 17.2, cb - ct, 3); c.fillStyle = shade(col, .72); c.fill();
  const gT = -11.2, gB = -3;   // glass facing the camera
  c.beginPath(); c.moveTo(-7.6, gT); c.lineTo(7.6, gT); c.lineTo(9, gB); c.lineTo(-9, gB); c.closePath(); c.fillStyle = lg(c, 0, gT, 0, gB, ...GLASS); c.fill();
  c.save(); c.clip(); headFig(c, away ? 3.2 : -3.2, gT + 3.6, null, away); c.fillStyle = 'rgba(150,210,240,.3)'; c.fillRect(-10, gT, 20, gB - gT); c.restore();
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = .5; c.beginPath(); c.moveTo(3, gT + .8); c.lineTo(5.2, gB - .8); c.stroke();
  body(c, () => rr(c, -7.6, away ? ct : ct, 15.2, (away ? gT : gT) - ct + .2, 3), col, ct, gT, { gx: -3, gw: 3.6, lt: 1.5 });
  for (const s of [-1, 1]) { rf(c, s * 10.8 - 1.2, away ? -13 : -5.6, 2.4, 2, .8, col); }   // mirrors
  // front / rear face
  const fy = bot - 5.6;
  if (!away) {
    rf(c, -4.2, fy + 1.2, 8.4, 2.4, .8, '#4a4a5c'); c.fillStyle = '#6a6a7e'; for (let i = 0; i < 3; i++) c.fillRect(-3.6, fy + 1.6 + i * .7, 7.2, .3);
    lampGlass(c, -7.6, fy + 1.8, 1.8, 1.1, '#fff6c0'); lampGlass(c, 7.6, fy + 1.8, 1.8, 1.1, '#fff6c0');
  } else {
    lampGlass(c, -7.6, fy + 1.6, 1.9, .9, '#ff5a5a'); lampGlass(c, 7.6, fy + 1.6, 1.9, .9, '#ff5a5a');
    rf(c, -2.6, fy + .8, 5.2, 2.2, .3, '#fffbe8'); c.fillStyle = '#8a94a8'; c.fillRect(-1.8, fy + 1.6, 3.6, .4);
  }
  rf(c, -11, bot - 1.8, 22, 1.8, [0, 0, 2.4, 2.4], '#c0c8d4'); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-10, bot - 1.6, 20, .35);
} };
V.car.box = [-16, -26, 32, 37];

const ORDER = ['bicycle', 'scooter', 'quad', 'motorbike', 'car', 'hoverboard', 'helicopter'];
function vSprite(id, dir, layer, col, fr) {
  const d = V[id], b = d.box, mir = dir === 2, dd = mir ? 3 : dir;
  return make('v:' + id + ':' + dir + ':' + layer + ':' + col + ':' + fr, b[0], b[1], b[2], b[3], c => {
    if (mir) { c.translate(0, 0); c.scale(-1, 1); }
    d.paint(c, dd, layer, col, fr);
  });
}
function dust(ctx, ax, ay, dir, t, big) {
  const bx = dir === 3 ? -10 : dir === 2 ? 10 : 0, by = dir === 1 ? 3 : dir === 0 ? -9 : -1;
  if (dir === 0) return;   // behind the rider, out of sight
  for (let i = 0; i < 2; i++) {
    const ph = ((t / 22) + i * .5) % 1, a = (1 - ph) * .5, r = (big ? 1.6 : 1.1) + ph * 2;
    const ox = dir === 3 ? -ph * 5 : dir === 2 ? ph * 5 : (i ? 2 : -2) * (1 + ph), oy = dir === 1 ? ph * 3 : -ph * 1.5;
    ctx.fillStyle = `rgba(250,244,226,${a})`; ctx.beginPath(); ctx.ellipse(ax + bx + ox, ay + by + oy, r, r * .7, 0, 0, TAU); ctx.fill();
  }
}

// Hoverboard -------------------------------------------------------------------
const HOVER_COL = '#8a72f0';
function hoverBob(t) { return Math.sin((t || 0) / 16) * .9; }
function hoverDeck(c, dir, col) {
  const glowE = '#7ef6ff';
  if (dir === 3) {
    rr(c, -10, -1.6, 20, 3.4, 1.7); c.fillStyle = shade(col, .55); c.fill();
    body(c, () => { c.beginPath(); c.moveTo(-9.6, -3.2); c.lineTo(8, -3.2); c.quadraticCurveTo(11.6, -3.4, 11.4, -5.4); c.quadraticCurveTo(12.2, -1.4, 8.4, -.6); c.lineTo(-9.6, -.6); c.quadraticCurveTo(-11.2, -1.9, -9.6, -3.2); c.closePath(); }, col, -5.4, -.6, { gx: -4, gw: 4 });
    rf(c, -8.4, .6, 16.8, .8, .4, glowE); for (const px of [-5.6, 5.6]) el(c, px, 1.4, 1.8, .6, '#d8ffff');
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-6, -2.6, 8, .35);
    return;
  }
  const L = dir === 0 ? 1 : -1;   // the nose points toward the camera (down) for dir 0
  const y0 = L > 0 ? -7 : -9;
  rr(c, -5, y0 + 1.6, 10, 13.4, 4.6); c.fillStyle = shade(col, .55); c.fill();
  body(c, () => rr(c, -5, y0, 10, 13.4, 4.6), col, y0, y0 + 13.4, { gx: -2, gw: 1.6 });
  rf(c, -3.2, L > 0 ? y0 + 10.4 : y0 + 1.2, 6.4, 1.5, .75, rgba(shade(col, 1.6), .85));
  rr(c, -5, y0, 10, 13.4, 4.6); c.strokeStyle = glowE; c.lineWidth = .4; c.stroke();
  rf(c, -3.8, y0 + 14.2, 7.6, .9, .45, glowE);
}
function hoverboard(ctx, dir, x, y, t, info) {
  if (info.layer !== 'back') return;
  const ax = x + 8, ay = y + 15, col = info.color || HOVER_COL, lift = 3.2 - hoverBob(t);
  const sh = make('hvsh', -12, -6, 24, 12, c => ovalShadow(c, 0, 0, 10, 4, .34));
  const k = 1 - (lift - 2.3) * .08, sw = dir > 1 ? 1 : .6, sx = sw * k;
  ctx.drawImage(sh.cv, ax - 12 * sx, ay - 1 - 6 * k, 24 * sx, 12 * k);
  const g = make('hvglow', -12, -12, 24, 24, c => { c.fillStyle = rg(c, 0, 0, 12, 'rgba(140,250,255,.75)', 'rgba(120,220,255,.3)', 'rgba(120,200,255,0)'); c.fillRect(-12, -12, 24, 24); });
  ctx.globalAlpha = .55 + .2 * Math.sin(t / 5); ctx.drawImage(g.cv, ax - (dir > 1 ? 11 : 7), ay - 3.5, dir > 1 ? 22 : 14, 7); ctx.globalAlpha = 1;
  if (info.moving) for (let i = 0; i < 3; i++) {
    const ph = ((t / 18) + i / 3) % 1, a = (1 - ph) * .8;
    const ox = dir === 3 ? -9 - ph * 6 : dir === 2 ? 9 + ph * 6 : (i - 1) * 3, oy = dir === 1 ? 3 + ph * 5 : dir === 0 ? -6 - ph * 3 : 0;
    ctx.fillStyle = `rgba(190,255,255,${a})`; ctx.fillRect(ax + ox - .5, ay - 1 + oy - .5, 1, 1);
  }
  const d = make('hv:' + dir + ':' + col, -13, -12, 26, 20, c => { if (dir === 2) c.scale(-1, 1); hoverDeck(c, dir === 2 ? 3 : dir, col); });
  ctx.drawImage(d.cv, ax + d.x0, ay + d.y0 - lift + 3, d.w, d.h);
}

// Helicopter ------------------------------------------------------------------
const HELI_COL = '#3a9ae8';
function heliBody(c, dir, col) {
  const skid = '#5a6070', glassP = () => {};
  if (dir === 3) {
    // far skid, struts
    line(c, [-6, -3.4, 10, -3.4], shade(skid, 1.3), 1); line(c, [-3, -3.4, -2, -7], shade(skid, 1.3), .8); line(c, [6, -3.4, 5, -7], shade(skid, 1.3), .8);
    // tail boom + fin + tail rotor hub
    body(c, () => { c.beginPath(); c.moveTo(-4, -12.6); c.lineTo(-17.6, -11.4); c.lineTo(-17.6, -9.6); c.lineTo(-4, -8); c.closePath(); }, col, -12.6, -8, { gloss: false });
    body(c, () => { c.beginPath(); c.moveTo(-15, -11); c.lineTo(-18, -17); c.lineTo(-20.2, -17); c.lineTo(-19.4, -9.6); c.closePath(); }, shade(col, .9), -17, -9.6, { gloss: false });
    c.fillStyle = '#ffffff'; c.fillRect(-13.4, -11.2, 5, .8);
    // cabin
    body(c, () => { c.beginPath(); c.ellipse(2.6, -10, 9.4, 7.4, 0, 0, TAU); }, col, -17.4, -2.6, { gx: -1, gw: 4 });
    c.save(); c.beginPath(); c.moveTo(4, -16.6); c.quadraticCurveTo(12.6, -15, 11.8, -8.4); c.lineTo(4, -8.6); c.closePath(); c.fillStyle = lg(c, 4, -16, 12, -8, ...GLASS); c.fill(); c.clip(); headFig(c, 6.4, -12, null, false); c.fillStyle = 'rgba(150,210,240,.35)'; c.fillRect(3, -17, 10, 9); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = .5; c.beginPath(); c.moveTo(8.4, -15.4); c.quadraticCurveTo(10.6, -13.6, 10.8, -11.4); c.stroke();
    c.strokeStyle = shade(col, .55); c.lineWidth = .4; c.beginPath(); c.moveTo(-2, -15.6); c.lineTo(-2, -5.4); c.stroke();
    rf(c, -1.2, -12, 3.6, 3.2, .8, rgba(GLASS[1], .9));
    c.fillStyle = '#ffffff'; c.fillRect(-6.6, -7.4, 18, .9);
    rf(c, -3.4, -19.6, 8, 3.4, [1.6, 1.6, .4, .4], '#8a94a8'); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-2.6, -19.2, 4, .4);
    rf(c, .1, -21.6, 1.4, 2.4, .4, '#5a6070');
    // near skid
    line(c, [-3, 1, -2.4, -4.4], skid, 1); line(c, [7, 1, 6, -4.4], skid, 1);
    line(c, [-7, 1.2, 11, 1.2], skid, 1.3); line(c, [11, 1.2, 12.4, -.4], skid, 1.3);
    return;
  }
  const away = dir === 1;
  // skids
  for (const s of [-1, 1]) { line(c, [s * 9, -14, s * 9, 3], skid, 1.3); line(c, [s * 9, -10, s * 6.4, -9], skid, .9); line(c, [s * 9, -1, s * 6.4, -2], skid, .9); }
  if (!away) {   // tail goes up, behind the cabin
    body(c, () => rr(c, -1.8, -26, 3.6, 14, 1.4), col, -26, -12, { gloss: false });
    body(c, () => rr(c, -.9, -29.4, 1.8, 6.4, .8), shade(col, .9), -29.4, -23, { gloss: false });
    c.fillStyle = '#ffffff'; c.fillRect(-1.8, -21, 3.6, .8);
  }
  body(c, () => { c.beginPath(); c.ellipse(0, -8.6, 9.6, 8.6, 0, 0, TAU); }, col, -17.2, 0, { gx: -3, gw: 3.6 });
  c.fillStyle = '#ffffff'; c.fillRect(-9.4, -6.6, 18.8, .9);
  if (!away) {
    c.save(); c.beginPath(); c.ellipse(0, -7, 7.4, 5.8, 0, 0, TAU); c.fillStyle = lg(c, 0, -12, 0, -1, ...GLASS); c.fill(); c.clip(); headFig(c, -2.4, -7.6, null, false); c.fillStyle = 'rgba(150,210,240,.35)'; c.fillRect(-8, -13, 16, 12); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = .55; c.beginPath(); c.ellipse(0, -7, 6.2, 4.6, 0, PI * 1.1, PI * 1.45); c.stroke();
    c.strokeStyle = shade(col, .55); c.lineWidth = .45; c.beginPath(); c.moveTo(0, -12.8); c.lineTo(0, -1.4); c.stroke();
  } else {
    rf(c, -4.6, -14, 9.2, 5, 1.8, rgba(GLASS[1], .85)); c.save(); rr(c, -4.6, -14, 9.2, 5, 1.8); c.clip(); headFig(c, -2, -11.4, null, true); c.fillStyle = 'rgba(150,210,240,.3)'; c.fillRect(-5, -14, 10, 5); c.restore();
    body(c, () => rr(c, -1.8, -6, 3.6, 12.6, 1.4), col, -6, 6.6, { gloss: false });   // tail toward the camera
    body(c, () => rr(c, -.9, 2.6, 1.8, 6.4, .8), shade(col, .9), 2.6, 9, { gloss: false });
    c.fillStyle = '#ffffff'; c.fillRect(-1.8, 1, 3.6, .8);
  }
  rf(c, -4, -19, 8, 3.6, [1.6, 1.6, .4, .4], '#8a94a8'); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-3, -18.6, 4, .4);
  rf(c, -.7, -21.2, 1.4, 2.6, .4, '#5a6070');
}
function helicopter(ctx, dir, x, y, t, info) {
  if (info.layer === 'front') return;
  const ax = x + 8, ay = y + 15, col = info.color || HELI_COL, moving = !!info.moving;
  const lift = moving ? 4 + Math.sin(t / 10) * 1 : 0;
  const sh = make('hlsh', -18, -10, 36, 20, c => ovalShadow(c, 0, 0, 14, 6, .3));
  const k = 1 - lift * .04; ctx.drawImage(sh.cv, ax - 18 * k + (dir === 3 ? -2 : dir === 2 ? 2 : 0), ay - 7 - 10 * k + 4, 36 * k, 20 * k);
  const b = make('hl:' + dir + ':' + col, -26, -36, 52, 50, c => { if (dir === 2) c.scale(-1, 1); heliBody(c, dir === 2 ? 3 : dir, col); });
  ctx.drawImage(b.cv, ax + b.x0, ay + b.y0 - lift, b.w, b.h);
  // tail rotor (side views) and main rotor
  const side = dir > 1, sgn = dir === 2 ? -1 : 1, hubX = ax + (side ? 3.4 * sgn : 0) - (side ? 2.6 * sgn : 0), hubY = ay - 21.4 - lift;
  if (side) {
    const tx = ax - 19.4 * sgn, ty = ay - 13.2 - lift;
    if (moving) { ctx.fillStyle = 'rgba(230,240,250,.45)'; ctx.beginPath(); ctx.arc(tx, ty, 3.6, 0, TAU); ctx.fill(); }
    else { ctx.strokeStyle = '#5a6070'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(tx - 2.6, ty - 2.6); ctx.lineTo(tx + 2.6, ty + 2.6); ctx.moveTo(tx - 2.6, ty + 2.6); ctx.lineTo(tx + 2.6, ty - 2.6); ctx.stroke(); }
  } else if (dir === 0) {
    const tx = ax + 1.8, ty = ay - 26.6 - lift;
    if (moving) { ctx.fillStyle = 'rgba(230,240,250,.45)'; ctx.beginPath(); ctx.ellipse(tx, ty, 1, 3.4, 0, 0, TAU); ctx.fill(); } else { ctx.fillStyle = '#5a6070'; ctx.fillRect(tx - .4, ty - 3, .8, 6); }
  } else {
    const tx = ax + 1.8, ty = ay + 5.6 - lift;
    if (moving) { ctx.fillStyle = 'rgba(230,240,250,.45)'; ctx.beginPath(); ctx.ellipse(tx, ty, 1, 3.4, 0, 0, TAU); ctx.fill(); } else { ctx.fillStyle = '#5a6070'; ctx.fillRect(tx - .4, ty - 3, .8, 6); }
  }
  const blade = make('hlblade', -22, -1.4, 44, 2.8, c => { rf(c, -21.6, -1, 43.2, 2, 1, '#3e4452'); rf(c, -21, -.8, 42, .7, .35, '#8a94a8'); });
  ctx.save(); ctx.translate(hubX, hubY); ctx.scale(1, .42);
  if (moving) {
    const disc = make('hldisc', -24, -24, 48, 48, c => { c.fillStyle = rg(c, 0, 0, 23, 'rgba(255,255,255,.06)', 'rgba(240,248,255,.16)', 'rgba(240,248,255,.32)', 'rgba(240,248,255,.08)'); c.beginPath(); c.arc(0, 0, 22.5, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = .8; c.stroke(); });
    ctx.drawImage(disc.cv, -24, -24, 48, 48);
    const a = t * .9; ctx.globalAlpha = .35;
    for (let i = 0; i < 2; i++) { ctx.save(); ctx.rotate(a + i * PI / 2); ctx.drawImage(blade.cv, blade.x0, blade.y0, blade.w, blade.h); ctx.restore(); }
    ctx.globalAlpha = 1;
  } else {
    for (const a0 of [.45, .45 + PI / 2]) { ctx.save(); ctx.rotate(a0); ctx.drawImage(blade.cv, blade.x0, blade.y0, blade.w, blade.h); ctx.restore(); }
  }
  ctx.restore();
  ctx.fillStyle = '#4a5060'; ctx.beginPath(); ctx.ellipse(hubX, hubY, 1.6, .9, 0, 0, TAU); ctx.fill();
}

// ---- vehicle() / seat() -------------------------------------------------------------
HA.vehicle = function (ctx, id, dir, x, y, t, info) {
  info = info || {}; t = t || 0; dir = dir | 0; if (dir < 0 || dir > 3) dir = 0;
  if (id === 'hoverboard') return hoverboard(ctx, dir, x, y, t, info);
  if (id === 'helicopter') return helicopter(ctx, dir, x, y, t, info);
  const d = V[id] || V.bicycle, layer = info.layer === 'front' ? 'front' : 'back', col = info.color || d.col;
  const fr = info.moving ? Math.floor(t / 4) % 3 : 0;
  const ax = x + 8, ay = y + 15;
  if (layer === 'back' && info.moving) dust(ctx, ax, ay, dir, t, id === 'quad' || id === 'car');
  if (layer === 'front' && d.hide) return;
  blit(ctx, vSprite(id === 'car' || V[id] ? id : 'bicycle', dir, layer, col, fr), ax, ay);
};
// Rider offset from the standing pose. Side views shift the rider back onto the seat.
const SEATS = { bicycle: [-3, 1.2], scooter: [-3, 2.6], quad: [-4, 1.4], motorbike: [-4, 2.6] };
HA.seat = function (id, dir) {
  if (id === 'car' || id === 'helicopter') return { dx: 0, dy: 0, hide: true };
  if (id === 'hoverboard') return { dx: 0, dy: Math.round((-3.2 + hoverBob(G.frameNo || 0)) * 4) / 4 - 1, hide: false };
  const s = SEATS[id] || SEATS.bicycle, side = dir === 3 ? -1 : dir === 2 ? 1 : 0;
  return { dx: side * s[1], dy: s[0], hide: false };
};
HA.vehicleIds = ORDER.slice();

})();
