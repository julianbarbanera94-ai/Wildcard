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
const FXP = {}, LIVE = {}, TOP = {}, pad2 = 8;   // per-kind animation hooks: FXP drawn on top, LIVE replaces the cached art, TOP = swaying second layer
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

// A garden mailbox on a post: red box, rounded top, a little yellow flag.
P.mailbox = (c, W, H, col) => {
  col = col || '#e0503e';
  dropShadow(c, W / 2 - 4, H - 3, 8, 2.4);
  rf(c, W / 2 - 1, H - 11, 2, 10, .5, '#8a5a2c');
  rr(c, W / 2 - 5, H - 19, 10, 8, [4, 4, 1, 1]); c.fillStyle = lg(c, 0, H - 19, 0, H - 11, shade(col, 1.3), shade(col, .85)); c.fill(); c.strokeStyle = shade(col, .55); c.lineWidth = .6; c.stroke();
  c.fillStyle = shade(col, .6); c.fillRect(W / 2 - 4, H - 13.6, 8, .8);
  rf(c, W / 2 + 4.4, H - 22, .9, 7, .3, '#6a6a7a'); rf(c, W / 2 + 4.6, H - 22, 3.2, 2.4, .5, '#ffd24a');
  c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(W / 2 - 3.6, H - 17.6, 3, .7);
};

// ======================================================================================
// Workshop, barn, nursery, clinic, garage, storage and greenhouse props (Interiors).
// Same conventions as above: footprint (0, 0, W, H), may rise to y = -20, painted once per size, animation on top.
// ======================================================================================
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
const rngp = s => G.mulberry((s * 9301 + 49297) | 0);
// Scale a fixed design box (bw x bh, bottom-centred on the footprint) to fit any footprint; returns the transform for animation.
function fitXf(W, H, bw, bh, cap) { const s = Math.max(.25, Math.min(cap || 1.3, W / bw, (H + 20) / bh)); return { s, ox: (W - bw * s) / 2, oy: H - bh * s }; }
function fitDraw(c, W, H, bw, bh, fn, cap) { const f = fitXf(W, H, bw, bh, cap); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s); fn(c, bw, bh); c.restore(); return f; }
function rivet(c, x, y, r, col) { col = col || '#9aa2b4'; el(c, x + .1, y + .15, r, r, shade(col, .55)); el(c, x, y, r * .85, r * .85, col); el(c, x - r * .25, y - r * .3, r * .38, r * .38, 'rgba(255,255,255,.8)'); }
function steel(c, x, y, w, h, r, o) { solid(c, x, y, w, h, r, (o && o.col) || '#aeb6c6', Object.assign({ hi: .35, lt: 1.25, dk: .78, line: '#5e6678' }, o)); }
function woodGrain(c, x, y, w, h, seed, n) {
  const R = rngp(seed); c.save(); rr(c, x, y, w, h, 0); c.clip(); c.lineWidth = .3;
  for (let i = 0; i < n; i++) { const a = x + R() * w, b = y + R() * h; c.strokeStyle = R() < .5 ? 'rgba(90,50,20,.3)' : 'rgba(255,230,190,.28)'; c.beginPath(); c.moveTo(a, b); c.lineTo(a + 2 + R() * 4, b + (R() - .5) * .6); c.stroke(); }
  c.restore();
}
function plankFace(c, x, y, w, h, r, col, vertical, step, seed) {   // a face made of planks with seams and a little grain
  rr(c, x, y, w, h, r); c.fillStyle = lg(c, 0, y, 0, y + h, shade(col, 1.12), col, shade(col, .84)); c.fill();
  c.save(); rr(c, x, y, w, h, r); c.clip();
  c.fillStyle = rgba(shade(col, .55), .55);
  if (vertical) for (let xx = x + step; xx < x + w - .5; xx += step) c.fillRect(xx - .2, y, .4, h);
  else for (let yy = y + step; yy < y + h - .5; yy += step) c.fillRect(x, yy - .2, w, .4);
  c.fillStyle = 'rgba(255,240,210,.3)';
  if (vertical) for (let xx = x + step; xx < x + w - .5; xx += step) c.fillRect(xx + .2, y, .3, h);
  else for (let yy = y + step; yy < y + h - .5; yy += step) c.fillRect(x, yy + .2, w, .3);
  c.restore(); woodGrain(c, x, y, w, h, seed || 3, Math.round(w * h / 14));
  rr(c, x, y, w, h, r); c.strokeStyle = shade(col, .6); c.lineWidth = .55; c.stroke();
}
function strawFloor(c, x, y, w, h, r) {
  rr(c, x, y, w, h, r); c.fillStyle = lg(c, 0, y, 0, y + h, '#edd37f', '#d5ad55'); c.fill();
  c.save(); rr(c, x, y, w, h, r); c.clip();
  const R = rngp((w * 3 + h) | 0); c.lineWidth = .38;
  for (let i = 0; i < w * h / 7; i++) { const a = x + R() * w, b = y + R() * h, l = 1.6 + R() * 2.6, an = (R() - .5) * 1.7; c.strokeStyle = R() < .5 ? 'rgba(255,242,176,.85)' : 'rgba(165,115,38,.45)'; c.beginPath(); c.moveTo(a, b); c.lineTo(a + Math.cos(an) * l, b + Math.sin(an) * l * .5); c.stroke(); }
  c.restore(); rr(c, x, y, w, h, r); c.strokeStyle = '#a77d32'; c.lineWidth = .6; c.stroke();
}
function fenceRun(c, x0, x1, y, hgt, col) {   // a fence seen from the front: posts and two rails, base line at y
  const dk = shade(col, .6), n = Math.max(1, Math.round((x1 - x0) / 10));
  for (const ry of [y - hgt * .76, y - hgt * .34]) { rf(c, x0, ry + .45, x1 - x0, 1.5, .6, dk); rf(c, x0, ry, x1 - x0, 1.5, .6, shade(col, 1.08)); c.fillStyle = 'rgba(255,240,210,.45)'; c.fillRect(x0 + .4, ry + .2, x1 - x0 - .8, .35); }
  for (let i = 0; i <= n; i++) { const px = x0 + (x1 - x0) * i / n; rf(c, px - 1.2 + .3, y - hgt + .6, 2.4, hgt + .4, .9, dk); rf(c, px - 1.2, y - hgt, 2.4, hgt + .2, .9, col); el(c, px, y - hgt + .2, 1.05, .5, shade(col, 1.3)); c.fillStyle = 'rgba(255,240,210,.4)'; c.fillRect(px - .8, y - hgt + .8, .35, hgt - 1.4); }
}
function fenceSide(c, x, y0, y1, hgt, col) {   // a fence running away from the viewer: posts every ~10 and a rail strip
  const dk = shade(col, .6), n = Math.max(1, Math.round((y1 - y0) / 10));
  rf(c, x - .8 + .3, y0 - hgt * .62 + .4, 1.6, y1 - y0, .7, dk); rf(c, x - .8, y0 - hgt * .62, 1.6, y1 - y0, .7, shade(col, 1.08));
  for (let i = 0; i <= n; i++) { const py = y0 + (y1 - y0) * i / n; rf(c, x - 1.15 + .3, py - hgt + .6, 2.3, hgt + .4, .9, dk); rf(c, x - 1.15, py - hgt, 2.3, hgt + .2, .9, col); el(c, x, py - hgt + .2, 1, .5, shade(col, 1.3)); }
}

// ---- Barn ----------------------------------------------------------------------------------
function bale(c, x, by, w, R) {
  const fh = 6.4, th = 2.7, y = by - fh;
  el(c, x + w / 2 + .6, by + .1, w / 2 + .8, 1.1, 'rgba(90,50,10,.22)');
  rr(c, x, y - th, w, th + fh, 1.9); c.fillStyle = '#e0ad42'; c.fill();
  rr(c, x, y - th, w, th + 1.6, [1.9, 1.9, .5, .5]); c.fillStyle = lg(c, x, y - th, x + w * .5, y, '#fff3ac', '#f7d96a'); c.fill();
  rr(c, x, y, w, fh, [.5, .5, 1.9, 1.9]); c.fillStyle = lg(c, 0, y, 0, by, '#f5d166', '#e2b044', '#c68b29'); c.fill();
  c.save(); rr(c, x, y - th, w, th + fh, 1.9); c.clip();
  c.lineWidth = .35;
  for (let i = 0; i < w * 1.3; i++) { const a = x + R() * w, b = y - th + R() * (th + fh), l = 1.2 + R() * 2.2; c.strokeStyle = R() < .5 ? 'rgba(255,240,170,.8)' : 'rgba(150,100,24,.4)'; c.beginPath(); c.moveTo(a, b); c.lineTo(a + l, b + (R() - .5) * .9); c.stroke(); }
  c.fillStyle = 'rgba(150,100,20,.4)'; c.fillRect(x, y - .15, w, .4);
  for (const f of [.27, .73]) { c.fillStyle = '#8c5c2c'; c.fillRect(x + w * f - .45, y - th, .9, th + fh); c.fillStyle = 'rgba(255,230,160,.55)'; c.fillRect(x + w * f - .45, y - th, .28, th + fh); }
  c.restore();
  rr(c, x, y - th, w, th + fh, 1.9); c.strokeStyle = '#a5701d'; c.lineWidth = .55; c.stroke();
}
P.hay = (c, W, H) => {
  const rows = Math.max(1, Math.round(H / 16)), n = Math.max(1, Math.floor((W - 1) / 10.5)), bw = Math.min(13, (W - 1.6) / n), R = rngp(W * 7 + H);
  dropShadow(c, .6, 2, W - 1.2, H - 2.6, .2);
  for (let r = 0; r < rows; r++) {
    const base = (r + 1) * 16 - 1.4, levels = r === rows - 1 ? 2 : 3;
    for (let lv = 0; lv < levels; lv++) {
      const cnt = Math.max(1, n - lv), ox = (W - cnt * bw) / 2;
      for (let k = 0; k < cnt; k++) bale(c, ox + k * bw + (R() - .5) * .5, base - lv * 7.5, bw - .2, R);
    }
  }
  c.lineWidth = .4; for (let i = 0; i < W / 3; i++) { const a = 2 + R() * (W - 4), b = H - 3 + R() * 2.4; c.strokeStyle = R() < .5 ? '#f3d36e' : '#c69030'; c.beginPath(); c.moveTo(a, b); c.lineTo(a + 1.4 + R() * 1.6, b + (R() - .5) * .8); c.stroke(); }
};
P.pen = (c, W, H) => {
  const col = '#d49a5c';
  dropShadow(c, .6, 3, W - 1.2, H - 3.5, .18);
  strawFloor(c, 1.6, 5, W - 3.2, H - 6.4, 3);
  const R = rngp(W + H * 5);
  for (let i = 0; i < 3; i++) { const a = 5 + R() * (W - 10), b = 8 + R() * (H - 14); el(c, a, b, 2.4, 1.1, '#f5dc86'); el(c, a - .6, b - .3, 1.4, .5, '#fff3b0'); }
  fenceRun(c, .6, W - .6, 5.4, 7.6, col);
  fenceSide(c, 1.4, 5.4, H - .6, 7.6, col); fenceSide(c, W - 1.4, 5.4, H - .6, 7.6, col);
  fenceRun(c, .6, W - .6, H - .6, 7.6, col);
};
P.trough = (c, W, H) => {
  const by = H - 1.2, n = W >= 28 ? 2 : 1;
  dropShadow(c, .6, by - 9, W - 1.2, 9.6, .22);
  for (const lx of [1.6, W - 3.6]) rf(c, lx, by - 3, 2, 3.4, .5, '#6a4224');
  rr(c, .6, by - 14, W - 1.2, 8.2, [2.4, 2.4, 1, 1]); c.fillStyle = lg(c, 0, by - 14, 0, by - 5, '#f0c488', '#d29a5a'); c.fill(); c.strokeStyle = '#8a5a30'; c.lineWidth = .6; c.stroke();
  const cw = (W - 3.2) / n;
  for (let i = 0; i < n; i++) {
    const x0 = 1.6 + i * cw, water = n === 2 ? i === 1 : false;
    rr(c, x0, by - 12.8, cw - (i < n - 1 ? 1 : 0), 4.6, 1.5); c.fillStyle = '#5a3a22'; c.fill();
    c.save(); rr(c, x0 + .4, by - 12.3, cw - 1 - (i < n - 1 ? 1 : 0), 3.8, 1.2); c.clip();
    if (water) { c.fillStyle = lg(c, 0, by - 12.3, 0, by - 8.5, '#8ee0f4', '#4aa8d8'); c.fillRect(x0, by - 13, cw, 6); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x0 + 1.6, by - 11.7, cw * .4, .5); c.fillRect(x0 + cw * .55, by - 10.6, cw * .25, .4); }
    else { c.fillStyle = lg(c, 0, by - 12.3, 0, by - 8.5, '#f2d878', '#c89a34'); c.fillRect(x0, by - 13, cw, 6); const R = rngp(i + W); for (let k = 0; k < cw * 1.5; k++) { c.fillStyle = R() < .5 ? '#ffe9a0' : '#9a7020'; c.fillRect(x0 + R() * cw, by - 12.6 + R() * 3.4, .9, .5); } for (let k = 0; k < cw / 3; k++) el(c, x0 + 2 + k * 3, by - 11 + (k % 2) * 1, 1.1, .8, '#d8a640'); }
    c.restore();
  }
  plankFace(c, .6, by - 7.4, W - 1.2, 7.4, [.5, .5, 1.6, 1.6], '#c88a52', false, 3.6, W);
  for (const bx of [3.4, W - 5]) { rf(c, bx, by - 14, 1.6, 14, .4, '#8e96a8'); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(bx + .3, by - 13.4, .4, 12.6); }
};
P.stall = (c, W, H) => {
  const col = '#c88a52';
  dropShadow(c, .4, -4, W - .8, H + 4, .2);
  const fl = Math.max(4, H * .4);
  rr(c, 1.4, -15, W - 2.8, 22, [2, 2, 0, 0]); c.fillStyle = lg(c, 0, -15, 0, 7, '#9a6a40', '#7a4e2c'); c.fill();   // back wall
  c.save(); rr(c, 1.4, -15, W - 2.8, 22, 2); c.clip(); c.fillStyle = 'rgba(40,20,10,.35)'; for (let xx = 4.4; xx < W - 1; xx += 3) c.fillRect(xx, -15, .4, 22); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(1.4, -15, W, 6); c.restore();
  strawFloor(c, 1.8, 5, W - 3.6, H - 6.4, 2);
  // hay rack on the back wall and a horseshoe
  const hx = Math.max(4, W * .3);
  rf(c, hx - 5, -6, 10, 7, [1, 1, .6, .6], '#6a4224'); for (let i = 0; i < 6; i++) { const a = hx - 4 + i * 1.7; line(c, [a, -5.4, a + (i % 2 ? .6 : -.4), -9.4], i % 2 ? '#f4d46a' : '#e0b040', 1); }
  for (let i = 0; i < 4; i++) line(c, [hx - 4 + i * 2.6, -5.4, hx - 4 + i * 2.6, .4], '#a8693a', .5);
  c.strokeStyle = '#d6dae4'; c.lineWidth = 1; c.beginPath(); c.arc(W - Math.max(5, W * .25), -7.5, 2.8, PI * .22, PI * 1.78, true); c.stroke();
  // side partitions with rounded tops
  for (const px of [0, W - 3.4]) { plankFace(c, px, -13, 3.4, H + 11, [1.6, 1.6, .6, .6], col, true, 1.7, px + 5); c.fillStyle = 'rgba(255,240,210,.5)'; c.fillRect(px + .4, -12.4, 2.6, .4); }
  // top beam
  plankFace(c, 0, -17, W, 3.6, 1.2, '#a8693a', false, 9, W + 3);
  // lower half-door
  const dt = Math.max(H - 11, 7.5);
  plankFace(c, 3.4, dt, W - 6.8, H - dt - .6, [.8, .8, 1.2, 1.2], '#d9985c', true, 2.5, 11);
  c.strokeStyle = 'rgba(100,56,24,.6)'; c.lineWidth = .6; c.beginPath(); c.moveTo(4.4, dt + 1); c.lineTo(W - 4.4, H - 1.8); c.moveTo(W - 4.4, dt + 1); c.lineTo(4.4, H - 1.8); c.stroke();
  rf(c, 3.4, dt - 1, W - 6.8, 2, .8, '#a8693a'); c.fillStyle = 'rgba(255,240,210,.5)'; c.fillRect(4, dt - .8, W - 8, .4);
  rf(c, W / 2 - 1.2, dt + 1, 2.4, 1.6, .5, '#6a6e80'); rivet(c, W / 2, dt + 1.8, .4, '#c8ccd8'); rf(c, W - 7.5, dt - 1.2, 3, 1.1, .4, '#5a5e70');
  // little name plate
  rf(c, W / 2 - 4, -12.6, 8, 3.6, .8, '#fff2d0'); c.strokeStyle = '#8a5a30'; c.lineWidth = .4; rr(c, W / 2 - 4, -12.6, 8, 3.6, .8); c.stroke(); c.fillStyle = '#c0503e'; c.fillRect(W / 2 - 2.6, -11.2, 5.2, .6); c.fillRect(W / 2 - 2, -10.2, 4, .5);
};
P.milkcan = (c, W, H) => {
  const n = W >= 28 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const cx = n === 1 ? W / 2 : W * (i + .5) / n, by = H - 1.4 - (i % 2) * .8, bw = 3.9;
    ovalShadow(c, cx + 1, by, 5.6, 1.8, .25);
    // handles
    c.strokeStyle = '#6a7284'; c.lineWidth = .8; c.beginPath(); c.arc(cx - bw - .2, by - 10.4, 1.5, PI * .5, PI * 1.5); c.moveTo(cx + bw + .2, by - 11.9); c.arc(cx + bw + .2, by - 10.4, 1.5, -PI * .5, PI * .5); c.stroke();
    c.beginPath(); c.moveTo(cx - bw, by); c.lineTo(cx - bw, by - 8.4); c.quadraticCurveTo(cx - bw, by - 10.4, cx - 2.6, by - 11.6); c.lineTo(cx - 2.4, by - 14.6); c.lineTo(cx + 2.4, by - 14.6); c.lineTo(cx + 2.6, by - 11.6); c.quadraticCurveTo(cx + bw, by - 10.4, cx + bw, by - 8.4); c.lineTo(cx + bw, by);
    c.quadraticCurveTo(cx + bw, by + 1.3, cx + bw - 1.4, by + 1.3); c.lineTo(cx - bw + 1.4, by + 1.3); c.quadraticCurveTo(cx - bw, by + 1.3, cx - bw, by); c.closePath();
    c.fillStyle = lg(c, cx - bw, 0, cx + bw, 0, '#f4f8ff', '#c4cede', '#8e9ab0'); c.fill(); c.strokeStyle = '#5e6a82'; c.lineWidth = .55; c.stroke();
    rf(c, cx - bw, by - 5.6, bw * 2, 1.7, .4, '#e0503e'); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx - bw + .4, by - 5.4, bw * 2 - .8, .35);
    c.fillStyle = 'rgba(70,84,110,.35)'; c.fillRect(cx - bw, by - 8.6, bw * 2, .4);
    rr(c, cx - 3.2, by - 16.8, 6.4, 2.6, [2.6, 2.6, .5, .5]); c.fillStyle = lg(c, cx - 3, 0, cx + 3, 0, '#ff8a78', '#e0503e', '#b83a2c'); c.fill(); c.strokeStyle = '#8a2a20'; c.lineWidth = .5; c.stroke();
    el(c, cx, by - 17, .9, .55, '#f4f4f8'); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(cx - bw + .8, by - 8, .6, 7);
  }
};

// ---- Forge ----------------------------------------------------------------------------------
function anvilShape(c, cx, y0, s) {   // the iron itself; y0 = the standing surface
  s = s || 1; const d = '#454a60';
  c.beginPath(); c.moveTo(cx - 6 * s, y0 - 7.6 * s); c.lineTo(cx + 5 * s, y0 - 7.6 * s); c.quadraticCurveTo(cx + 8 * s, y0 - 7.4 * s, cx + 9.4 * s, y0 - 6 * s); c.quadraticCurveTo(cx + 7 * s, y0 - 4.6 * s, cx + 3.8 * s, y0 - 4.6 * s);
  c.lineTo(cx + 2.4 * s, y0 - 3.8 * s); c.lineTo(cx + 3.6 * s, y0 - 2.2 * s); c.lineTo(cx + 5.2 * s, y0); c.lineTo(cx - 5.2 * s, y0); c.lineTo(cx - 3.6 * s, y0 - 2.2 * s); c.lineTo(cx - 2.4 * s, y0 - 3.8 * s); c.lineTo(cx - 3.8 * s, y0 - 4.6 * s); c.lineTo(cx - 6 * s, y0 - 4.6 * s); c.closePath();
  c.fillStyle = lg(c, 0, y0 - 7.6 * s, 0, y0, '#a0a8bc', '#6a7088', '#454a60'); c.fill(); c.strokeStyle = '#2e3244'; c.lineWidth = .6; c.stroke();
  rr(c, cx - 6 * s, y0 - 7.8 * s, 11 * s, 1.6 * s, .8); c.fillStyle = '#d6dcea'; c.fill();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx - 5 * s, y0 - 7.2 * s, 6 * s, .4); el(c, cx + 2.6 * s, y0 - 5.4 * s, .5, .5, d);
}
P.anvil = (c, W, H) => {
  const cx = W / 2, by = H - 1.2;
  ovalShadow(c, cx + 1.2, by, 7.4, 2.4, .26);
  rr(c, cx - 4.8, by - 6.4, 9.6, 6.6, [1, 1, 2.6, 2.6]); c.fillStyle = lg(c, cx - 5, 0, cx + 5, 0, '#c8905a', '#a8693a', '#7e4c2a'); c.fill(); c.strokeStyle = '#5a361c'; c.lineWidth = .6; c.stroke();
  c.strokeStyle = 'rgba(70,40,16,.4)'; c.lineWidth = .35; for (const a of [-2.4, 0, 2.4]) { c.beginPath(); c.moveTo(cx + a, by - 5); c.lineTo(cx + a, by - .8); c.stroke(); }
  el(c, cx, by - 6.4, 4.8, 1.8, '#5a361c'); el(c, cx, by - 6.6, 4.5, 1.6, '#d6a066'); c.strokeStyle = 'rgba(120,70,30,.5)'; c.lineWidth = .3; c.beginPath(); c.ellipse(cx, by - 6.6, 2.8, .9, 0, 0, TAU); c.stroke();
  anvilShape(c, cx, by - 6.6, 1);
  rf(c, cx - 8, by - 1.4, 3.2, 1.2, .5, '#6a7088');   // hammer on the floor
};
FXP.anvil = (ctx, x, y, W, H, t, info) => {
  if (!info.active) return;
  const cx = x + W / 2, ty = y + H - 1.2 - 6.6 - 7.6;
  ctx.globalAlpha = .6 + .3 * Math.sin(t / 3); ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.ellipse(cx - 1.6, ty + .2, 3.4, .8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd070'; ctx.beginPath(); ctx.ellipse(cx - 1.6, ty, 2, .45, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  for (let k = 0; k < 4; k++) { const f = (t / 22 + k * .27) % 1, a = k * 2.1 + Math.floor(t / 22 + k * .27) * 1.3; ctx.globalAlpha = 1 - f; ctx.fillStyle = k % 2 ? '#ffd27a' : '#ff9a3a'; ctx.fillRect(cx - 1.6 + Math.cos(a) * 6 * f - .5, ty - Math.abs(Math.sin(a)) * 7 * f + f * f * 5 - .5, 1, 1); }
  ctx.globalAlpha = 1;
};
// Furnace: design box 32 x 40
function furnaceDesign(c, bw, bh) {
  const cx = 16;
  dropShadow(c, 1, 16, 30, 24, .2);
  // hood + chimney
  c.beginPath(); c.moveTo(4, 18); c.lineTo(10.6, 5); c.lineTo(12, 5); c.lineTo(12, 0); c.lineTo(20, 0); c.lineTo(20, 5); c.lineTo(21.4, 5); c.lineTo(28, 18); c.closePath();
  c.fillStyle = lg(c, 4, 0, 28, 0, '#7e8498', '#565c72', '#3e4256'); c.fill(); c.strokeStyle = '#2a2e3e'; c.lineWidth = .6; c.stroke();
  rf(c, 11.2, 4.4, 9.6, 1.6, .5, '#6a7088'); rf(c, 10.8, -.6, 10.4, 1.8, .7, '#7a8098'); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(12.4, 1.4, .8, 3.2);
  c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(6, 17); c.lineTo(11.4, 6.6); c.lineTo(12.6, 6.6); c.lineTo(8, 17); c.fill();
  for (const [rx, ry] of [[9.2, 12], [22.8, 12], [7, 16], [25, 16]]) rivet(c, rx, ry, .6, '#9aa2b8');
  rf(c, 14.6, 8, 2.8, 5, .6, '#c88a3a'); el(c, 16, 10.4, .9, .9, '#ffe9b0'); // brass dial
  // body of stone blocks
  rr(c, 0, 17, 32, 23, [2.6, 2.6, 1.4, 1.4]); c.fillStyle = lg(c, 0, 17, 0, 40, '#c8c0cc', '#9a92a6'); c.fill();
  c.save(); rr(c, 0, 17, 32, 23, 2.6); c.clip(); const R = rngp(5);
  for (let yy = 17, row = 0; yy < 40; yy += 5.2, row++) for (let xx = -(row % 2) * 3; xx < 32; xx += 6.4) { rf(c, xx + .3, yy + .3, 5.8, 4.6, 1.2, rgba(shade('#c4bcc8', .88 + R() * .22), .95)); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(xx + .8, yy + .6, 3.2, .4); }
  c.fillStyle = lg(c, 22, 0, 32, 0, 'rgba(40,20,50,0)', 'rgba(40,20,50,.22)'); c.fillRect(22, 17, 10, 23); c.restore();
  rr(c, 0, 17, 32, 23, [2.6, 2.6, 1.4, 1.4]); c.strokeStyle = '#6a6278'; c.lineWidth = .65; c.stroke();
  // arched mouth
  rr(c, 4.2, 20.2, 23.6, 19.4, [11.8, 11.8, 0, 0]); c.fillStyle = '#4a4458'; c.fill();
  rr(c, 5.6, 21.6, 20.8, 18, [10.4, 10.4, 0, 0]); c.fillStyle = rg(c, 16, 38, 20, '#5a2a1c', '#2c1418', '#1a0e14'); c.fill();
  c.fillStyle = '#22141a'; c.fillRect(7, 35, 18, 1.2);
  for (let i = 0; i < 6; i++) { c.fillStyle = '#3a3040'; c.fillRect(8.4 + i * 3.1, 33.4, 1, 5); }   // grate
  el(c, 16, 38.8, 9.4, 1.5, '#5a3a30'); for (let i = 0; i < 5; i++) el(c, 9.4 + i * 3.4, 38.2 - (i % 2) * .5, 1.5, 1, '#2e2230');
  rf(c, -1.4, 38, 34.8, 2.6, 1, '#8a8298'); rf(c, -1.4, 38, 34.8, .9, [1, 1, 0, 0], '#c6c0d2');
};
P.furnace = (c, W, H) => { fitDraw(c, W, H, 32, 40, furnaceDesign); };
FXP.furnace = (ctx, x, y, W, H, t, info) => {
  const f = fitXf(W, H, 32, 40), s = f.s, mx = x + f.ox + 16 * s, my = y + f.oy + 38 * s, act = !!info.active;
  const fl = .7 + .2 * Math.sin(t / 5) + .1 * Math.sin(t / 2.3), g = glowSprite();
  if (!act) {
    ctx.globalAlpha = .5 + .15 * Math.sin(t / 30); ctx.drawImage(g.cv, mx - 9 * s, my - 8 * s, 18 * s, 14 * s); ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,${120 + i * 25},60,${.55 + .3 * Math.sin(t / 14 + i * 2)})`; ctx.fillRect(mx + (i - 1.5) * 4 * s - .6, my - 1.4 * s - (i % 2) * s, 1.3 * s, .9 * s); }
    return;
  }
  ctx.globalAlpha = Math.min(1, fl); ctx.drawImage(g.cv, mx - 16 * s, my - 15 * s, 32 * s, 24 * s); ctx.globalAlpha = .6 * fl; ctx.drawImage(g.cv, mx - 20 * s, my - 4 * s, 40 * s, 18 * s); ctx.globalAlpha = 1;
  const flame = (ox, h, w, col, ph) => {
    const k = 1 + .18 * Math.sin(t / 4 + ph) + .08 * Math.sin(t / 2.3 + ph * 2), hh = h * k * s, sway = Math.sin(t / 6 + ph) * s, bx = mx + ox * s, bw = w * s;
    ctx.beginPath(); ctx.moveTo(bx - bw, my); ctx.quadraticCurveTo(bx - bw * 1.1, my - hh * .55, bx + sway, my - hh); ctx.quadraticCurveTo(bx + bw * 1.1, my - hh * .55, bx + bw, my); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  flame(-5.4, 9, 3.4, '#ff5a22', 0); flame(5.4, 8.4, 3.2, '#ff5a22', 2); flame(0, 13, 4.6, '#ff8a2a', 1); flame(-2.2, 8, 2.8, '#ffc03a', 3); flame(2.4, 7, 2.5, '#ffd85a', 4); flame(0, 4.6, 1.8, '#fff0b0', 5);
  for (let i = 0; i < 5; i++) { const ph = ((t / 36) + i * .21) % 1, a = i * 2.3 + Math.floor(t / 36 + i * .21) * 1.7; ctx.globalAlpha = 1 - ph; ctx.fillStyle = i % 2 ? '#ffd27a' : '#ff9a3a'; ctx.fillRect(mx + Math.cos(a) * 7 * ph * s - .5, my - 10 * s - ph * 13 * s - .5, 1, 1); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) { const ph = ((t / 90) + i / 3) % 1, sz = (2 + ph * 4) * s; ctx.globalAlpha = (1 - ph) * .5 * Math.min(1, ph * 5); ctx.fillStyle = '#d8d4e0'; ctx.beginPath(); ctx.ellipse(x + f.ox + 16 * s + Math.sin(t / 25 + i * 2) * 1.2 + ph * 3, y + f.oy - 1 * s - ph * 16, sz, sz * .8, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
};
function bellowsDraw(c, W, H, gap) {
  const cx = W / 2, by = H - 1.2, hx = cx - 7, nx = cx + 5, bot = by - 2.6, hy = bot, top = bot - gap;
  ovalShadow(c, cx + 1, by, 8.4, 2.2, .24);
  rf(c, cx - 8, by - 2.6, 3.4, 2.8, .7, '#6a4224'); rf(c, cx + 2, by - 2.6, 3.4, 2.8, .7, '#6a4224');
  // lower board
  rr(c, hx - 1, bot - 2.4, 13.4, 2.8, 1.2); c.fillStyle = lg(c, 0, bot - 2.4, 0, bot + .4, '#d29a5c', '#9a6234'); c.fill(); c.strokeStyle = '#5e381c'; c.lineWidth = .55; c.stroke();
  // leather folds
  c.beginPath(); c.moveTo(hx, bot - 2.4); c.lineTo(nx - 1, bot - 2.4); c.lineTo(nx - 1, top + 1.4); c.lineTo(hx, top + 1.4); c.closePath();
  c.fillStyle = lg(c, 0, top, 0, bot, '#c8844a', '#8a4a28'); c.fill(); c.strokeStyle = '#5a2c18'; c.lineWidth = .5; c.stroke();
  c.strokeStyle = 'rgba(40,16,8,.55)'; c.lineWidth = .4; const k = Math.max(2, Math.round(gap / 1.3)); for (let i = 1; i < k; i++) { const yy = bot - 2.4 - (bot - 2.4 - top - 1.4) * i / k; c.beginPath(); c.moveTo(hx, yy); c.lineTo(nx - 1, yy); c.stroke(); }
  // upper board and handle
  rr(c, hx - 1, top - 1, 13.4, 2.8, 1.2); c.fillStyle = lg(c, 0, top - 1, 0, top + 1.8, '#f0c488', '#c08a50'); c.fill(); c.strokeStyle = '#5e381c'; c.stroke();
  line(c, [hx, top, hx - 3.4, top - 4.6], '#7a4a28', 1.8); el(c, hx - 3.6, top - 4.8, 1.4, 1.2, '#c88a52'); el(c, hx - 4, top - 5.1, .5, .4, 'rgba(255,255,255,.7)');
  // nozzle
  c.beginPath(); c.moveTo(nx - 1, bot - gap / 2 - 2.8); c.lineTo(nx + 5, bot - gap / 2 - .7); c.lineTo(nx + 5, bot - gap / 2 + .5); c.lineTo(nx - 1, bot - gap / 2 + 2.4); c.closePath(); c.fillStyle = lg(c, 0, bot - gap / 2 - 3, 0, bot - gap / 2 + 2, '#d8dce8', '#6a7088'); c.fill(); c.strokeStyle = '#3e4256'; c.lineWidth = .5; c.stroke();
  rivet(c, hx + 1.4, top + .4, .45, '#d8dce8'); rivet(c, hx + 1.4, bot - 1, .45, '#d8dce8');
}
P.bellows = (c, W, H) => bellowsDraw(c, W, H, 4.8);
LIVE.bellows = (ctx, x, y, W, H, t, info) => {
  if (!info.active) return false;
  const gap = 4.8 + 2.6 * Math.sin(t / 9);
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; bellowsDraw(ctx, W, H, gap); ctx.restore();
  return true;
};
P.workbench = (c, W, H) => {
  const ty = H - 19, n = Math.max(1, Math.round(W / 16));
  dropShadow(c, .5, ty + 4, W - 1, 13, .22);
  for (const lx of [1.4, W - 4.6]) { rf(c, lx, ty + 8, 3.2, H - ty - 8.6, .6, '#7a4a28'); c.fillStyle = 'rgba(255,230,190,.35)'; c.fillRect(lx + .4, ty + 9, .5, H - ty - 11); }
  rf(c, 4.6, H - 6.4, W - 9.2, 1.8, .5, '#9a6234');   // low shelf
  block(c, .4, ty, W - .8, 5.4, 7.6, '#c88a52', { topCol: '#e6b074', r: 1.4 });
  for (let i = 0; i < n; i++) { const x0 = i * (W - .8) / n + 2.4, w = (W - .8) / n - 4; panel(c, x0, ty + 6.8, w, 5, '#c88a52'); knob(c, x0 + w / 2, ty + 9.4, .5); }
  c.fillStyle = 'rgba(90,50,20,.3)'; for (let xx = 4; xx < W - 3; xx += 6) c.fillRect(xx, ty + 1, 3, .3);
  // tools on top: vice, hammer, saw, nails
  rf(c, 2.4, ty - 4.4, 5.4, 4.6, .8, '#4a5068'); rf(c, 2, ty - 5.4, 6.2, 1.8, .6, '#8a90a8'); line(c, [8.2, ty - 3, 10.6, ty - 3], '#8a90a8', .7); el(c, 10.8, ty - 3, .7, .7, '#c0503e');
  if (W >= 28) {
    c.save(); c.translate(W * .48, ty + 2.4); c.rotate(-.1); rf(c, -4, -.5, 8, 1.1, .5, '#a8693a'); rf(c, 2.6, -1.8, 3.2, 3.4, .6, '#7a8098'); rf(c, 2.6, -1.8, 3.2, 1, .5, '#b8bed0'); c.restore();
    c.save(); c.translate(W - 11, ty + 1.2); poly(c, [-4.4, -1.6, 4.4, -1.6, 4.4, .7, -4.4, 1.8]); c.fillStyle = '#c4c8d8'; c.fill(); c.strokeStyle = '#6a7088'; c.lineWidth = .4; c.stroke(); rf(c, 3.8, -2.6, 3, 3.4, .8, '#c0503e'); c.restore();
    rf(c, W * .3, ty - 2.6, 5, 3, .5, '#e8b878'); c.fillStyle = '#9a6234'; c.fillRect(W * .3 + .5, ty - 1.2, 4, .35);
  } else { c.save(); c.translate(12, ty + 2); rf(c, -3, -.6, 6, 1.2, .5, '#a8693a'); rf(c, 1.8, -2, 3.2, 3.6, .6, '#7a8098'); c.restore(); }
  rf(c, W - 5.4, ty - 4.8, 3.6, 4.8, .8, 'rgba(210,235,250,.85)'); c.strokeStyle = '#7a8aa0'; c.lineWidth = .4; rr(c, W - 5.4, ty - 4.8, 3.6, 4.8, .8); c.stroke(); rf(c, W - 5, ty - 5.6, 2.8, 1, .4, '#c0503e'); for (let i = 0; i < 3; i++) rf(c, W - 4.4 + i * .9, ty - 2.8 - (i % 2), .5, 1.8, .2, '#9aa0b4');
};
const TOOLS = [
  (c, x, y) => { line(c, [x, y + 1, x, y + 11], '#a8693a', 1.3); rf(c, x - 3.2, y - .6, 6.4, 3.2, .8, '#7a8098'); rf(c, x - 3.2, y - .6, 6.4, 1, .6, '#c4c8d8'); },                                    // hammer
  (c, x, y) => { line(c, [x - .4, y, x - 2.6, y + 11.4], '#7a4a28', 1.1); line(c, [x + .4, y, x + 2.6, y + 11.4], '#8a5a30', 1.1); el(c, x, y + .6, 1.1, 1.1, '#8a90a8'); },                       // tongs
  (c, x, y) => { poly(c, [x - 1.6, y + 3.4, x + 1.6, y + 3.4, x + 1.6, y + 11.6, x - 1.6, y + 11.6]); c.fillStyle = '#c8ccd8'; c.fill(); c.strokeStyle = '#6a7088'; c.lineWidth = .4; c.stroke(); rf(c, x - 2, y - .4, 4, 4.4, 1.2, '#c0503e'); for (let i = 0; i < 4; i++) rf(c, x + .8, y + 4.6 + i * 1.8, .8, .8, .2, '#6a7088'); },     // saw
  (c, x, y) => { line(c, [x, y + 2, x, y + 11], '#aeb6c6', 1.4); el(c, x, y + 1.2, 2, 1.7, '#aeb6c6'); el(c, x, y + .8, 1, .9, '#454a60'); },                                                              // wrench
  (c, x, y) => { line(c, [x, y + 3, x, y + 11], '#e8b84a', 1.5); line(c, [x, y, x, y + 4], '#9aa0b4', .6); },                                                                                    // screwdriver
  (c, x, y) => { line(c, [x - .6, y + 3.4, x - 1.8, y + 11], '#d8503e', 1); line(c, [x + .6, y + 3.4, x + 1.8, y + 11], '#d8503e', 1); poly(c, [x - 1.8, y, x + 1.8, y, x + .8, y + 3.6, x - .8, y + 3.6]); c.fillStyle = '#aeb6c6'; c.fill(); }  // pliers
];
P.toolrack = (c, W, H) => {
  dropShadow(c, .8, 0, W - 1.6, H - .5, .16);
  plankFace(c, .6, -3, W - 1.2, H + 2, 1.6, '#d9a066', false, 4, W);   // pegboard back
  c.fillStyle = 'rgba(100,56,24,.28)'; for (let yy = 0; yy < H - 4; yy += 3.2) for (let xx = 2; xx < W - 1; xx += 3.2) c.fillRect(xx, yy, .6, .6);
  rf(c, .6, -3.6, W - 1.2, 2.2, [1.4, 1.4, .4, .4], '#a8693a'); c.fillStyle = 'rgba(255,240,210,.55)'; c.fillRect(1.4, -3.3, W - 2.8, .4);
  const n = Math.max(2, Math.floor((W - 2) / 5.6));
  for (let i = 0; i < n; i++) { const cx = 1.6 + (W - 3.2) * (i + .5) / n; c.save(); c.translate(.35, .45); c.globalAlpha = .22; TOOLS[i % TOOLS.length](c, cx, -1.4); c.restore(); c.globalAlpha = 1; TOOLS[i % TOOLS.length](c, cx, -1.6); el(c, cx, -2, .7, .6, '#3e4256'); }
  rf(c, .2, H - 3.2, W - .4, 3, [.8, .8, 1.2, 1.2], '#8a5a30'); rf(c, .2, H - 3.2, W - .4, 1, [.8, .8, 0, 0], '#d4955a');
  if (W >= 28) { rf(c, W - 9, H - 7, 3.4, 3.8, .6, '#e8b84a'); rf(c, W - 5, H - 6.4, 3, 3.2, .6, '#6aa7e0'); }
};
P.quench = (c, W, H) => {
  const cx = W / 2, by = H - 1.2, rx = 6.2;
  ovalShadow(c, cx + 1.2, by, rx + 1.6, 2.4, .26);
  rr(c, cx - rx, by - 13, rx * 2, 13.4, [2.2, 2.2, 4.6, 4.6]); c.fillStyle = lg(c, cx - rx, 0, cx + rx, 0, '#d29a5c', '#a8693a', '#6e4224'); c.fill(); c.strokeStyle = '#4a2c16'; c.lineWidth = .6; c.stroke();
  c.save(); rr(c, cx - rx, by - 13, rx * 2, 13.4, 3); c.clip(); c.strokeStyle = 'rgba(60,30,12,.4)'; c.lineWidth = .35; for (let a = -rx + 2; a < rx; a += 2.4) { c.beginPath(); c.moveTo(cx + a, by - 12); c.lineTo(cx + a * 1.05, by); c.stroke(); } c.restore();
  for (const [hy, hh] of [[by - 10.6, 1.5], [by - 4.4, 1.5]]) { rf(c, cx - rx - .15, hy, rx * 2 + .3, hh, .5, '#4e5468'); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx - rx + .8, hy + .2, rx * 2 - 4, .35); }
  el(c, cx, by - 13, rx, 2.7, '#6e4224'); el(c, cx, by - 13.1, rx - .6, 2.3, '#d6a066'); el(c, cx, by - 12.9, rx - 1.4, 1.8, '#2a5a7a'); el(c, cx, by - 12.7, rx - 1.6, 1.5, lg(c, 0, by - 14, 0, by - 11, '#7cd0ee', '#3a90c4'));
  el(c, cx - 2.4, by - 13.2, 1.8, .4, 'rgba(255,255,255,.8)');
  // tongs hanging on the rim
  line(c, [cx + rx - .6, by - 13.4, cx + rx + 1.2, by - 6], '#6a7088', .8); line(c, [cx + rx + .4, by - 13.4, cx + rx + 2.6, by - 6.2], '#8a90a8', .8);
};
FXP.quench = (ctx, x, y, W, H, t, info) => {
  const cx = x + W / 2, wy = y + H - 1.2 - 13;
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = .4;
  for (let i = 0; i < 2; i++) { const ph = (t / 70 + i * .5) % 1; ctx.globalAlpha = Math.sin(ph * PI) * .7; ctx.beginPath(); ctx.ellipse(cx + (i ? 1.6 : -1.4), wy + .2, 1 + ph * 3, .4 + ph * 1.1, 0, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (info.active) fxSteam(ctx, x, y, t * 1.6, W / 2 - 1, H - 12);
};

// ---- Refinery ------------------------------------------------------------------------------
function brickRows(c, x, y, w, h, col, seed, rh) {   // a brick pattern over a box (call inside a clip)
  const R = rngp(seed), bh = rh || 2.8, bw = bh * 2.1;
  c.fillStyle = shade(col, .6); c.fillRect(x, y, w, h);
  for (let yy = y, row = 0; yy < y + h; yy += bh, row++) for (let xx = x - (row % 2) * bw / 2; xx < x + w; xx += bw) {
    rf(c, xx + .25, yy + .25, bw - .5, bh - .5, .5, shade(col, .9 + R() * .2)); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(xx + .5, yy + .4, bw - 1.2, .35);
  }
}
// Kiln: design box 32 x 44
function kilnDesign(c, bw, bh) {
  dropShadow(c, 1, 20, 30, 24, .22);
  // chimney
  rr(c, 20, 0, 7.4, 20, .8); c.fillStyle = lg(c, 20, 0, 27, 0, '#d98a70', '#b9604a', '#8e4234'); c.fill(); c.strokeStyle = '#6a2e24'; c.lineWidth = .6; c.stroke();
  c.save(); rr(c, 20, 0, 7.4, 20, .8); c.clip(); c.fillStyle = 'rgba(70,24,16,.35)'; for (let yy = 3; yy < 20; yy += 2.8) c.fillRect(20, yy, 8, .4); c.restore();
  rf(c, 18.8, -1.2, 9.8, 2.8, .9, '#9a4a3a'); c.fillStyle = 'rgba(255,220,200,.6)'; c.fillRect(19.6, -.8, 8, .5); el(c, 23.7, -.2, 3.4, .7, '#2a1814');
  // dome body
  const path = () => { c.beginPath(); c.moveTo(1, 41); c.lineTo(1, 26); c.bezierCurveTo(1, 8, 31, 8, 31, 26); c.lineTo(31, 41); c.closePath(); };
  path(); c.fillStyle = '#6a2e24'; c.save(); c.translate(.4, .6); c.fill(); c.restore();
  c.save(); path(); c.clip(); brickRows(c, 0, 8, 32, 34, '#d2705a', 11, 3);
  c.fillStyle = lg(c, 0, 0, 32, 0, 'rgba(255,255,255,.18)', 'rgba(255,255,255,0)', 'rgba(40,10,20,.3)'); c.fillRect(0, 8, 32, 34);
  el(c, 9, 15, 4.6, 2.4, 'rgba(255,255,255,.28)'); c.restore();
  path(); c.strokeStyle = '#6a2e24'; c.lineWidth = .7; c.stroke();
  for (const [by, ex] of [[22, 3.2], [32, 1.6]]) { c.fillStyle = '#4e5468'; c.fillRect(1, by, 30, 1.8); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(1, by, 30, .5); rivet(c, 3.4, by + .9, .55, '#aab2c6'); rivet(c, 28.6, by + .9, .55, '#aab2c6'); }
  for (const vx of [6, 26]) { el(c, vx, 28, 1.3, 1.1, '#2a1814'); }
  // door
  rr(c, 8, 26, 16, 16, [8, 8, 0, 0]); c.fillStyle = '#3e4256'; c.fill();
  rr(c, 9.4, 27.4, 13.2, 14.6, [6.6, 6.6, 0, 0]); c.fillStyle = lg(c, 9, 27, 23, 41, '#8a90a6', '#5c6278', '#3e4256'); c.fill();
  c.strokeStyle = '#2a2e3e'; c.lineWidth = .5; c.stroke();
  c.fillStyle = 'rgba(30,34,50,.55)'; c.fillRect(9.4, 33, 13.2, .6); c.fillRect(9.4, 37.6, 13.2, .6);
  for (const [rx, ry] of [[11, 29.4], [21, 29.4], [11, 35.4], [21, 35.4], [11, 40], [21, 40]]) rivet(c, rx, ry, .5, '#b8c0d4');
  el(c, 16, 31.4, 2.3, 2.3, '#2a2e3e'); el(c, 16, 31.4, 1.7, 1.7, '#3a1a14');   // peep hole
  rf(c, 18.4, 36.2, 3.2, 1.2, .5, '#d8dce8'); c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(10.4, 40); c.lineTo(11.2, 28.6); c.lineTo(12.4, 28.6); c.lineTo(11.6, 40); c.fill();
  rf(c, -.4, 40, 32.8, 3.6, 1, '#8e889e'); rf(c, -.4, 40, 32.8, 1, [1, 1, 0, 0], '#cfc9dc');
  for (let i = 0; i < 5; i++) { el(c, 3 + i * 6.4, 43.2, 1.3, .6, 'rgba(60,50,80,.4)'); }
}
P.kiln = (c, W, H) => { fitDraw(c, W, H, 32, 44, kilnDesign); };
FXP.kiln = (ctx, x, y, W, H, t, info) => {
  const f = fitXf(W, H, 32, 44), s = f.s, X = d => x + f.ox + d * s, Y = d => y + f.oy + d * s, act = !!info.active, g = glowSprite();
  const fl = .75 + .15 * Math.sin(t / 6) + .1 * Math.sin(t / 2.6);
  if (act) {
    ctx.globalAlpha = fl; ctx.drawImage(g.cv, X(16) - 9 * s, Y(31.4) - 8 * s, 18 * s, 16 * s); ctx.globalAlpha = .8 * fl; ctx.drawImage(g.cv, X(16) - 22 * s, Y(40) - 6 * s, 44 * s, 14 * s); ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,${150 + Math.sin(t / 3) * 40 | 0},50,${.9})`; ctx.beginPath(); ctx.arc(X(16), Y(31.4), 1.5 * s, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.arc(X(16) - .3 * s, Y(31.4) - .3 * s, .7 * s, 0, TAU); ctx.fill();
    for (const vx of [6, 26]) { ctx.globalAlpha = .7 * fl; ctx.drawImage(g.cv, X(vx) - 3 * s, Y(28) - 3 * s, 6 * s, 6 * s); ctx.globalAlpha = 1; }
    for (let i = 0; i < 4; i++) { const ph = ((t / 100) + i / 4) % 1, sz = (2.4 + ph * 5) * s; ctx.globalAlpha = (1 - ph) * .55 * Math.min(1, ph * 5); ctx.fillStyle = '#dad6e2'; ctx.beginPath(); ctx.ellipse(X(23.7) + ph * 5 + Math.sin(t / 28 + i * 2) * 1.3, Y(-1) - ph * 17, sz, sz * .8, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else { ctx.globalAlpha = .35 + .15 * Math.sin(t / 40); ctx.drawImage(g.cv, X(16) - 4 * s, Y(31.4) - 3.6 * s, 8 * s, 7 * s); ctx.globalAlpha = 1; }
};
// Tank: design box 16 x 38
function tankDesign(c, bw, bh) {
  const cx = 8, col = '#e29a58';
  ovalShadow(c, cx + 1.4, 36.4, 9, 2.6, .26);
  for (const lx of [2.6, 12]) rf(c, lx, 31, 1.8, 6, .5, '#6a4a3a');
  const path = () => { c.beginPath(); c.moveTo(1.4, 8); c.quadraticCurveTo(1.4, 1.6, cx, 1.6); c.quadraticCurveTo(14.6, 1.6, 14.6, 8); c.lineTo(14.6, 29); c.quadraticCurveTo(14.6, 33.6, cx, 33.6); c.quadraticCurveTo(1.4, 33.6, 1.4, 29); c.closePath(); };
  path(); c.fillStyle = lg(c, 1.4, 0, 14.6, 0, '#ffd6a0', '#e29a58', '#b86a34', '#8e4a22'); c.fill(); c.strokeStyle = '#6a3414'; c.lineWidth = .65; c.stroke();
  c.save(); path(); c.clip();
  for (const by of [9, 25]) { c.fillStyle = 'rgba(100,46,16,.5)'; c.fillRect(1, by, 14, 1.2); c.fillStyle = 'rgba(255,230,190,.5)'; c.fillRect(1, by + 1.2, 14, .5); for (const rx of [3, 8, 13]) rivet(c, rx, by + .6, .45, '#f0c080'); }
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(3.2, 4, 1.1, 27); c.restore();
  // sight glass with liquid
  rf(c, 11.2, 11, 2.6, 12, 1.1, '#5a3418'); rf(c, 11.6, 11.4, 1.8, 11.2, .8, '#e8f6fc'); rf(c, 11.6, 16.4, 1.8, 6.2, .8, lg(c, 0, 16, 0, 23, '#6ad0f0', '#2a88c8'));
  // gauge
  el(c, cx - 1, 17, 3.6, 3.6, '#5a3418'); el(c, cx - 1, 17, 3.1, 3.1, '#f6f6fa'); c.strokeStyle = '#8a7a6a'; c.lineWidth = .3; for (let a = -2.4; a <= .1; a += .55) { c.beginPath(); c.moveTo(cx - 1 + Math.cos(a) * 2.2, 17 + Math.sin(a) * 2.2); c.lineTo(cx - 1 + Math.cos(a) * 2.8, 17 + Math.sin(a) * 2.8); c.stroke(); }
  c.fillStyle = '#e8423e'; c.beginPath(); c.arc(cx - 1 + Math.cos(-.4) * 2, 17 + Math.sin(-.4) * 2, .5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(cx - 3, 14.4, 1.6, .4);
  // top valve and pipe
  rf(c, cx - 1, -2, 2, 4.4, .6, '#6a3414'); el(c, cx, -2.2, 3, 1.4, '#c0402e'); el(c, cx, -2.6, 2.6, 1, '#ff7a5a'); el(c, cx - .8, -2.9, .9, .4, 'rgba(255,255,255,.8)');
  rf(c, 14, 26.8, 3.6, 2.4, .8, '#8a5a30'); el(c, 17.4, 28, .9, 1.4, '#6a3414');
  // little nameplate
  rf(c, 4, 29.6, 5, 2, .4, '#fff0d0'); c.fillStyle = '#9a5a30'; c.fillRect(4.8, 30.4, 3.4, .4);
}
P.tank = (c, W, H) => { fitDraw(c, W, H, 17, 38, tankDesign); };
FXP.tank = (ctx, x, y, W, H, t, info) => {
  const f = fitXf(W, H, 17, 38), s = f.s, gx = x + f.ox + 7 * s, gy = y + f.oy + 17 * s, a = -1.2 + Math.sin(t / 40) * .25 + (info.active ? Math.sin(t / 5) * .12 : 0);
  ctx.strokeStyle = '#d8402e'; ctx.lineWidth = .5 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * 2.5 * s, gy + Math.sin(a) * 2.5 * s); ctx.stroke();
  ctx.fillStyle = '#4a4a5c'; ctx.beginPath(); ctx.arc(gx, gy, .45 * s, 0, TAU); ctx.fill();
  if (info.active) fxSteam(ctx, x + f.ox, y + f.oy, t, 8 * s, -2 * s);
};
// Boiler: design box 20 x 28
function boilerDesign(c, bw, bh) {
  const cx = 10;
  ovalShadow(c, cx + 1.4, 26.6, 11.4, 3, .26);
  // pipes behind
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (const [pts, w] of [[[14, 6, 14, -.5, 19.2, -.5, 19.2, 6], 2.2], [[2.4, 14, -1.2, 14, -1.2, 22], 1.8]]) {
    c.strokeStyle = '#6a3414'; c.lineWidth = w + .9; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke();
    c.strokeStyle = '#d8914a'; c.lineWidth = w; c.stroke(); c.strokeStyle = 'rgba(255,235,200,.7)'; c.lineWidth = w * .28; c.save(); c.translate(-.4, -.4); c.stroke(); c.restore();
  }
  rf(c, 11.8, 4.6, 4.4, 2, .6, '#c88a3a'); rf(c, 17.4, 5, 3.6, 2, .6, '#c88a3a');
  // body
  const path = () => { c.beginPath(); c.moveTo(1.4, 12); c.quadraticCurveTo(1.4, 4, cx, 4); c.quadraticCurveTo(18.6, 4, 18.6, 12); c.lineTo(18.6, 22); c.quadraticCurveTo(18.6, 26.4, cx, 26.4); c.quadraticCurveTo(1.4, 26.4, 1.4, 22); c.closePath(); };
  path(); c.fillStyle = lg(c, 1.4, 0, 18.6, 0, '#f6d0a4', '#d8914a', '#a85e2a', '#7e421c'); c.fill(); c.strokeStyle = '#5a2c10'; c.lineWidth = .65; c.stroke();
  c.save(); path(); c.clip();
  for (const by of [9, 21]) { c.fillStyle = 'rgba(90,40,14,.45)'; c.fillRect(1, by, 18, 1.2); c.fillStyle = 'rgba(255,225,185,.5)'; c.fillRect(1, by + 1.2, 18, .5); for (let rx = 3; rx < 19; rx += 3.4) rivet(c, rx, by + .6, .4, '#f0c080'); }
  c.fillStyle = 'rgba(255,255,255,.42)'; c.fillRect(3.2, 6, 1, 17); c.restore();
  // pressure gauge + red wheel valve
  el(c, 7, 13.8, 3.2, 3.2, '#5a3418'); el(c, 7, 13.8, 2.7, 2.7, '#f6f6fa'); c.strokeStyle = '#8a7a6a'; c.lineWidth = .28; for (let a = -2.6; a <= .2; a += .6) { c.beginPath(); c.moveTo(7 + Math.cos(a) * 1.9, 13.8 + Math.sin(a) * 1.9); c.lineTo(7 + Math.cos(a) * 2.4, 13.8 + Math.sin(a) * 2.4); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(5.4, 12.4, 1.4, .4);
  rf(c, 12.2, 12.4, 1.2, 3.4, .4, '#6a3414'); el(c, 12.8, 12.2, 2.8, 1.1, '#c0402e'); el(c, 12.8, 11.9, 2.6, .8, '#ff7a5a'); c.strokeStyle = '#8a2a1c'; c.lineWidth = .4; c.beginPath(); c.moveTo(10.2, 12.2); c.lineTo(15.4, 12.2); c.stroke();
  // firebox door
  rr(c, 5.6, 19.4, 8.8, 7, [2, 2, .4, .4]); c.fillStyle = '#4a2814'; c.fill(); rr(c, 6.4, 20.2, 7.2, 5.8, [1.6, 1.6, 0, 0]); c.fillStyle = lg(c, 0, 20, 0, 26, '#6a6e84', '#3e4256'); c.fill();
  rf(c, 7.4, 22, 5.2, 1, .4, '#2a1814'); rf(c, 12, 23.6, 1.2, 1.4, .3, '#d8dce8');
  rf(c, 2.2, 25.2, 4, 2, .5, '#4a4e5c'); rf(c, 13.8, 25.2, 4, 2, .5, '#4a4e5c');
}
P.boiler = (c, W, H) => { fitDraw(c, W, H, 21, 28, boilerDesign); };
FXP.boiler = (ctx, x, y, W, H, t, info) => {
  const f = fitXf(W, H, 21, 28), s = f.s, g = glowSprite();
  ctx.globalAlpha = info.active ? .8 + .15 * Math.sin(t / 5) : .22 + .1 * Math.sin(t / 30); ctx.drawImage(g.cv, x + f.ox + 10 * s - 4.4 * s, y + f.oy + 23.4 * s - 3 * s, 8.8 * s, 6 * s); ctx.globalAlpha = 1;
  if (info.active) for (let i = 0; i < 3; i++) { const ph = ((t / 60) + i / 3) % 1, sz = (1.6 + ph * 3.4) * s; ctx.globalAlpha = (1 - ph) * .6 * Math.min(1, ph * 6); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + f.ox + 19.2 * s + Math.sin(t / 20 + i * 2) * 1.1 + ph * 2, y + f.oy - 1.5 * s - ph * 13, sz, sz * .85, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
};
function beltPattern(w, h) {
  return make('belt:' + w + 'x' + h, 0, 0, w + 8, h, c => { c.fillStyle = '#3a3e4c'; c.fillRect(0, 0, w + 8, h); for (let xx = -4; xx < w + 8; xx += 4) { c.strokeStyle = '#555a6c'; c.lineWidth = .8; c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx + 2, h / 2); c.lineTo(xx, h); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 0, w + 8, h * .22); });
}
function beltPatternV(w, h) {
  return make('beltv:' + w + 'x' + h, 0, 0, w, h + 8, c => { c.fillStyle = '#3a3e4c'; c.fillRect(0, 0, w, h + 8); for (let yy = -4; yy < h + 8; yy += 4) { c.strokeStyle = '#555a6c'; c.lineWidth = .8; c.beginPath(); c.moveTo(0, yy); c.lineTo(w / 2, yy + 2); c.lineTo(w, yy); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 0, w * .22, h + 8); });
}
function miniCrate(c, x, by, s, col) {   // a little crate with a top face, standing on by
  const th = s * .3, fh = s * .7, y = by - fh;
  rr(c, x, y - th, s, th + fh, .8); c.fillStyle = shade(col, .7); c.fill();
  rr(c, x, y - th, s, th + .6, [.8, .8, .2, .2]); c.fillStyle = shade(col, 1.3); c.fill();
  rr(c, x, y, s, fh, [.2, .2, .8, .8]); c.fillStyle = lg(c, 0, y, 0, by, shade(col, 1.06), shade(col, .86)); c.fill();
  c.strokeStyle = shade(col, .55); c.lineWidth = .4; c.strokeRect(x + .6, y + .5, s - 1.2, fh - 1); c.beginPath(); c.moveTo(x + .8, y + .6); c.lineTo(x + s - .8, by - .6); c.stroke();
  rr(c, x, y - th, s, th + fh, .8); c.strokeStyle = shade(col, .5); c.lineWidth = .5; c.stroke();
}
const CRATE_COLS = ['#d29a5c', '#e8b878', '#c88a52', '#74b8e8', '#e8a0b0'];
const crateSprite = (s, col) => make('mcr:' + s + col, -1, -s - 1, s + 2, s + 2.5, c => miniCrate(c, 0, 0, s, col));
P.conveyor = (c, W, H) => {
  const vertical = H > W;
  if (!vertical) {
    const by = H - 1.2, top = by - 11.4;
    dropShadow(c, .5, by - 10, W - 1, 10.6, .22);
    for (const lx of [2, W - 4.6]) rf(c, lx, by - 4, 2.6, 4.6, .5, '#6a7088');
    // frame side, belt top, end rollers
    rr(c, .4, top + 4, W - .8, 6, [.8, .8, 1.6, 1.6]); c.fillStyle = lg(c, 0, top + 4, 0, by - 1, '#c4cadb', '#8a92a8'); c.fill(); c.strokeStyle = '#4e566c'; c.lineWidth = .55; c.stroke();
    c.fillStyle = '#f2c230'; for (let xx = 2; xx < W - 3; xx += 6) { c.fillRect(xx, by - 2.8, 3, .9); }
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(1.4, top + 4.6, W - 2.8, .4);
    rr(c, 1.6, top, W - 3.2, 5.4, 1.4); c.fillStyle = '#2a2e3a'; c.fill();
    c.save(); rr(c, 2, top + .4, W - 4, 4.6, 1.2); c.clip(); const bp = beltPattern(W - 4, 4.6); c.drawImage(bp.cv, 2, top + .4, bp.w, bp.h); c.restore();
    for (const rx of [1.2, W - 1.2]) { el(c, rx, top + 2.8, 2.2, 2.9, '#6a7088'); el(c, rx - .2, top + 2.5, 1.7, 2.4, '#c8cedf'); el(c, rx - .5, top + 1.8, .5, .7, '#fff'); }
    rf(c, .4, top - .2, W - .8, 1.2, .5, '#aab2c6'); rf(c, .4, top + 4.6, W - .8, .9, .4, '#aab2c6');
  } else {
    dropShadow(c, 2, 1, W - 4, H - 2, .22);
    const bx = W / 2 - 5.4, bw = 10.8;
    rr(c, bx - 1.6, 1, bw + 3.2, H - 2, 1.6); c.fillStyle = lg(c, bx, 0, bx + bw, 0, '#c4cadb', '#8a92a8'); c.fill(); c.strokeStyle = '#4e566c'; c.lineWidth = .55; c.stroke();
    rr(c, bx, 2.4, bw, H - 5, 1.2); c.fillStyle = '#2a2e3a'; c.fill();
    c.save(); rr(c, bx + .4, 2.8, bw - .8, H - 5.8, 1); c.clip(); const bp = beltPatternV(bw - .8, H - 5.8); c.drawImage(bp.cv, bx + .4, 2.8, bp.w, bp.h); c.restore();
    for (const ry of [2.4, H - 2.4]) { rf(c, bx - 2, ry - 1.8, bw + 4, 3.6, 1.8, '#6a7088'); rf(c, bx - 1.6, ry - 1.8, bw + 3.2, 1.6, .8, '#c8cedf'); }
    c.fillStyle = '#f2c230'; for (let yy = 4; yy < H - 4; yy += 6) { c.fillRect(bx - 1.2, yy, .8, 3); c.fillRect(bx + bw + .4, yy, .8, 3); }
  }
};
function convLoads(W, H, vertical) { const L = vertical ? H - 6 : W - 6; return Math.max(1, Math.floor(L / 12)); }
FXP.conveyor = (ctx, x, y, W, H, t, info) => {
  const vertical = H > W, act = !!info.active, n = convLoads(W, H, vertical), per = 3.2, off = act ? (t * .22) % 4 : 0;
  if (!vertical) {
    const by = y + H - 1.2, top = by - 11.4, L = W - 8, bp = beltPattern(W - 4, 4.6);
    if (act) { ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + H - 1.2 - 11.4 + .4, W - 4, 4.6); ctx.clip(); ctx.drawImage(bp.cv, x + 2 - off, top + .4, bp.w, bp.h); ctx.drawImage(bp.cv, x + 2 - off + 4, top + .4, bp.w, bp.h); ctx.restore(); }
    const sp = L / n;
    for (let i = 0; i < n; i++) { const pos = act ? ((t * .35 + i * sp) % L) : (i * sp + sp * .35) % L, cs = crateSprite(6 + (i % 2) * 1.6, CRATE_COLS[i % CRATE_COLS.length]); ctx.drawImage(cs.cv, x + 3 + pos + cs.x0, top + 4.8 + cs.y0, cs.w, cs.h); }
  } else {
    const bx = x + W / 2 - 5.4, bw = 10.8, L = H - 14, sp = L / n;
    if (act) { const bpv = beltPatternV(bw - .8, H - 5.8); ctx.save(); ctx.beginPath(); ctx.rect(bx + .4, y + 2.8, bw - .8, H - 5.8); ctx.clip(); ctx.drawImage(bpv.cv, bx + .4, y + 2.8 + off - 4, bpv.w, bpv.h); ctx.drawImage(bpv.cv, bx + .4, y + 2.8 + off, bpv.w, bpv.h); ctx.restore(); }
    for (let i = 0; i < n; i++) { const pos = act ? ((t * .35 + i * sp) % L) : (i * sp + sp * .35) % L, cs = crateSprite(6, CRATE_COLS[i % CRATE_COLS.length]); ctx.drawImage(cs.cv, x + W / 2 - 3 + cs.x0, y + 10 + pos + cs.y0, cs.w, cs.h); }
  }
};
P.pipe = (c, W, H) => {
  const col = '#d98f4a', dk = '#7a3c14', vertical = H > W;
  if (!vertical) {
    const cy = H - 7.6, r = 2.6;
    el(c, W / 2 + 1, H - 2.2, W / 2 - 1, 1.5, 'rgba(60,30,20,.22)');
    for (let tx = 8; tx < W; tx += 16) { rf(c, tx - 2, cy + r - .4, 4, H - cy - r - 1.6, .6, '#4e566c'); rf(c, tx - 3.2, H - 2.2, 6.4, 1.2, .5, '#6a7088'); }
    rr(c, .4, cy - r, W - .8, r * 2, r); c.fillStyle = lg(c, 0, cy - r, 0, cy + r, '#ffe0b4', col, '#a85e2a', dk); c.fill(); c.strokeStyle = '#5a2c10'; c.lineWidth = .6; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(1.6, cy - r + .6, W - 3.2, .6);
    for (let tx = 16; tx < W - 1; tx += 16) { rf(c, tx - 1.4, cy - r - 1.1, 2.8, r * 2 + 2.2, .8, '#b87434'); c.strokeStyle = '#5a2c10'; c.lineWidth = .45; rr(c, tx - 1.4, cy - r - 1.1, 2.8, r * 2 + 2.2, .8); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(tx - .9, cy - r - .6, .5, r * 2 + 1); rivet(c, tx, cy - r - .5, .4, '#ffe0b4'); rivet(c, tx, cy + r + .5, .4, '#ffe0b4'); }
    for (const ex of [1.2, W - 1.2]) { el(c, ex, cy, 1.2, r + .6, '#a85e2a'); el(c, ex - .2, cy - .2, .7, r, '#e8a868'); }
    if (W >= 28) { const vx = W / 2; rf(c, vx - .6, cy - r - 4.6, 1.2, 4.8, .4, '#6a3414'); el(c, vx, cy - r - 4.8, 3.2, 1.2, '#c0402e'); el(c, vx, cy - r - 5.2, 2.8, .9, '#ff7a5a'); c.strokeStyle = '#8a2a1c'; c.lineWidth = .4; c.beginPath(); c.moveTo(vx - 2.8, cy - r - 4.8); c.lineTo(vx + 2.8, cy - r - 4.8); c.stroke(); }
    if (W >= 48) { const gx = W * .25; el(c, gx, cy - r - 4, 2.6, 2.6, '#5a3418'); el(c, gx, cy - r - 4, 2.2, 2.2, '#f6f6fa'); c.fillStyle = '#e8423e'; c.fillRect(gx - .1, cy - r - 5.6, .3, 1.7); rf(c, gx - .5, cy - r - 2, 1, 2, .3, '#6a3414'); }
  } else {
    const cx = W / 2, r = 2.8;
    el(c, cx + 2.2, H / 2 + .5, 2, H / 2 - 2, 'rgba(60,30,20,.2)');
    rr(c, cx - r, 1, r * 2, H - 2, r); c.fillStyle = lg(c, cx - r, 0, cx + r, 0, '#ffe0b4', col, '#a85e2a', dk); c.fill(); c.strokeStyle = '#5a2c10'; c.lineWidth = .6; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(cx - r + .8, 2.4, .6, H - 5);
    for (let ty = 16; ty < H - 1; ty += 16) { rf(c, cx - r - 1.1, ty - 1.4, r * 2 + 2.2, 2.8, .8, '#b87434'); c.strokeStyle = '#5a2c10'; c.lineWidth = .45; rr(c, cx - r - 1.1, ty - 1.4, r * 2 + 2.2, 2.8, .8); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(cx - r - .6, ty - .9, r * 2 + 1.2, .5); }
    for (const ey of [1.4, H - 1.4]) { el(c, cx, ey, r + .6, 1.2, '#a85e2a'); el(c, cx - .2, ey - .2, r, .8, '#e8a868'); }
  }
};
function ctlSpots(W, H) {   // blinking light positions on the control panel
  const n = Math.max(3, Math.round((W - 4) / 3.4)), out = [], cols = ['#ff5a5a', '#7aff8a', '#ffd23a', '#5ad8ff'];
  for (let i = 0; i < n; i++) out.push([2.6 + i * (W - 5.2) / Math.max(1, n - 1), -6.3, cols[i % 4]]);
  return out;
}
P.controlpanel = (c, W, H) => {
  const col = '#8a9ab8';
  dropShadow(c, .5, -2, W - 1, H + 2, .24);
  // tall rear housing
  solid(c, .6, -14, W - 1.2, 11, [2.4, 2.4, .6, .6], '#a8b6d0', { hi: .35 });
  rf(c, 1.8, -12.8, W - 3.6, 5.6, 1, '#1e2a30');
  c.save(); rr(c, 2.2, -12.4, W - 4.4, 4.8, .8); c.clip(); c.fillStyle = lg(c, 0, -12.4, 0, -7.6, '#2c5a50', '#143a34'); c.fillRect(0, -13, W, 6); c.strokeStyle = 'rgba(120,255,200,.4)'; c.lineWidth = .3; for (let xx = 4; xx < W - 2; xx += 3) { c.beginPath(); c.moveTo(xx, -12.4); c.lineTo(xx, -7.6); c.stroke(); } for (let yy = -11; yy < -7.6; yy += 1.6) { c.beginPath(); c.moveTo(2, yy); c.lineTo(W - 2, yy); c.stroke(); }
  c.strokeStyle = '#7affc0'; c.lineWidth = .6; c.beginPath(); c.moveTo(2.4, -10); for (let xx = 2.4; xx < W - 2.4; xx += 1.2) c.lineTo(xx, -10 + Math.sin(xx * .9) * 1.4); c.stroke(); c.restore();
  // sloped control surface
  block(c, .4, -3.4, W - .8, 9, H - 5.6 + 1, col, { topCol: '#c4cfe4', r: 1.6 });
  rr(c, 1.4, -2.6, W - 2.8, 7.6, 1); c.fillStyle = lg(c, 0, -3, 0, 5, '#6a7690', '#4c5670'); c.fill();
  for (const [lx, ly, lc] of ctlSpots(W, H)) { el(c, lx, ly + 3.2, 1.1, 1.1, shade(lc, .45)); el(c, lx, ly + 3.2, .85, .85, shade(lc, .85)); }
  // levers + dial
  const nl = Math.max(1, Math.floor((W - 6) / 9));
  for (let i = 0; i < nl; i++) { const lx = 4.6 + i * (W - 9.2) / Math.max(1, nl - 1 || 1) * (nl > 1 ? 1 : 0) + (nl === 1 ? (W - 9.2) / 2 : 0); rf(c, lx - 1.6, 1.4, 3.2, 2.6, .8, '#2a3040'); line(c, [lx, 2.6, lx + (i % 2 ? 1.4 : -1.4), -.9], '#c8ccd8', .9); el(c, lx + (i % 2 ? 1.4 : -1.4), -1.2, 1.1, 1.1, i % 2 ? '#e0503e' : '#f2c230'); el(c, lx + (i % 2 ? 1.1 : -1.7), -1.5, .4, .4, 'rgba(255,255,255,.8)'); }
  el(c, W - 4.8, 2, 2, 2, '#2a3040'); el(c, W - 4.8, 2, 1.6, 1.6, '#f6f6fa'); c.fillStyle = '#e8423e'; c.fillRect(W - 4.8, .6, .3, 1.5);
  // front kick face + hazard stripe
  rf(c, 1.2, H - 4, W - 2.4, 2.4, .6, '#4c5670'); c.fillStyle = '#f2c230'; for (let xx = 2; xx < W - 3; xx += 4) { poly(c, [xx, H - 3.8, xx + 2, H - 3.8, xx + 1, H - 1.8, xx - 1, H - 1.8]); c.fill(); }
};
FXP.controlpanel = (ctx, x, y, W, H, t, info) => {
  const g = glowSprite(), sp = ctlSpots(W, H), act = info.active !== false;
  for (let i = 0; i < sp.length; i++) {
    const on = (Math.floor(t / (14 + i * 5) + i * 3) % 3) !== 0 || (act && i % 2 === 0);
    if (!on) continue;
    const [lx, ly, lc] = sp[i]; ctx.fillStyle = lc; ctx.beginPath(); ctx.arc(x + lx, y + ly + 3.2, .8, 0, TAU); ctx.fill(); ctx.globalAlpha = .55; ctx.drawImage(g.cv, x + lx - 3, y + ly + .2, 6, 6); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(190,255,220,.5)'; ctx.fillRect(x + 2.4 + ((t * .3) % (W - 5)), y - 12.2, .5, 4.4);
};

// ---- Nursery -----------------------------------------------------------------------------------
function shapeIcon(c, kind, x, y, s, col) {
  c.fillStyle = col;
  if (kind === 0) { c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); }
  else if (kind === 1) { c.fillRect(x - s * .85, y - s * .85, s * 1.7, s * 1.7); }
  else if (kind === 2) { poly(c, [x, y - s, x + s * 1.05, y + s * .8, x - s * 1.05, y + s * .8]); c.fill(); }
  else { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? s * .45 : s * 1.1; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }
}
P.toybox = (c, W, H) => {
  const cx = W / 2, by = H - 1.2, bw = Math.min(W - 2, 15);
  const x0 = cx - bw / 2;
  dropShadow(c, x0 + .4, by - 8, bw - .8, 8.6, .22);
  // propped-open lid at the back
  rr(c, x0 + .6, by - 22, bw - 1.2, 11, [2.4, 2.4, .4, .4]); c.fillStyle = lg(c, x0, by - 22, x0 + bw, by - 11, '#ff9ec0', '#e86a98'); c.fill(); c.strokeStyle = '#a83a68'; c.lineWidth = .6; c.stroke();
  rr(c, x0 + 1.8, by - 20.6, bw - 3.6, 8.2, 1.4); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .5; c.stroke(); shapeIcon(c, 3, cx, by - 16.4, 2.3, '#ffe066'); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x0 + 2.4, by - 21.4, bw * .4, .5);
  // box top rim + inside
  rr(c, x0, by - 12.4, bw, 6, [1.6, 1.6, .5, .5]); c.fillStyle = '#4a86d8'; c.fill();
  rr(c, x0 + 1.2, by - 11.6, bw - 2.4, 3.6, 1); c.fillStyle = '#2a2a5a'; c.fill();
  // toys peeking out
  el(c, cx - 3, by - 10.4, 2.7, 2.7, '#a8693a'); el(c, cx - 3, by - 10.6, 2.4, 2.4, '#d29a5c'); el(c, cx - 4.7, by - 12.4, 1.2, 1.2, '#a8693a'); el(c, cx - 1.3, by - 12.4, 1.2, 1.2, '#a8693a'); el(c, cx - 3, by - 9.7, 1.3, .9, '#f6dcc0'); el(c, cx - 3.8, by - 10.8, .35, .4, '#3a2a2a'); el(c, cx - 2.2, by - 10.8, .35, .4, '#3a2a2a'); el(c, cx - 3, by - 9.8, .5, .35, '#3a2a2a');
  el(c, cx + 3.2, by - 10.2, 2.4, 2.4, '#e8423e'); c.fillStyle = '#fff'; c.fillRect(cx + 1, by - 10.6, 4.4, .7); el(c, cx + 2.4, by - 11.2, .7, .5, 'rgba(255,255,255,.8)');
  rf(c, cx + 4.4, by - 12.6, 3, 3, .5, '#ffd23a'); rf(c, cx - 7, by - 11.8, 2.4, 2.4, .5, '#58c878');
  // front face
  rr(c, x0, by - 7, bw, 7.6, [.4, .4, 1.8, 1.8]); c.fillStyle = lg(c, 0, by - 7, 0, by + .6, '#5a96e8', '#3a6ab8'); c.fill(); c.strokeStyle = '#26488a'; c.lineWidth = .6; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x0 + .8, by - 6.6, bw - 1.6, .4);
  const cols = ['#ffd23a', '#ff6a8a', '#58c878'];
  for (let i = 0; i < 3; i++) shapeIcon(c, i === 1 ? 2 : i === 2 ? 0 : 3, x0 + bw * (i + .5) / 3, by - 3, 1.5, cols[i]);
  rf(c, x0 + 1, by - 1.6, 2.4, 1.6, .4, '#26488a'); rf(c, x0 + bw - 3.4, by - 1.6, 2.4, 1.6, .4, '#26488a');
};
// Slide: design 32 x 30
function slideDesign(c, bw, bh) {
  ovalShadow(c, 18, 28.6, 15, 2.6, .24);
  // far chute rail + chute
  c.lineJoin = 'round';
  const chute = () => { c.beginPath(); c.moveTo(11, 6); c.bezierCurveTo(17, 7, 20, 20, 30.6, 26); c.lineTo(30.6, 29); c.bezierCurveTo(18, 24, 13, 13, 11, 12); c.closePath(); };
  chute(); c.fillStyle = '#c87a10'; c.save(); c.translate(.4, 1); c.fill(); c.restore(); chute(); c.fillStyle = lg(c, 11, 6, 30, 28, '#fff08a', '#ffc83a', '#f09a1a'); c.fill(); c.strokeStyle = '#b87008'; c.lineWidth = .6; c.stroke();
  c.save(); chute(); c.clip(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .9; c.beginPath(); c.moveTo(11, 7.4); c.bezierCurveTo(17, 8.4, 20, 21, 30, 27); c.stroke(); c.restore();
  c.strokeStyle = '#e8503e'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(11, 5.4); c.bezierCurveTo(17, 6.4, 20, 19.4, 30.4, 25.4); c.stroke(); c.strokeStyle = '#ff9a8a'; c.lineWidth = .5; c.beginPath(); c.moveTo(11, 5); c.bezierCurveTo(17, 6, 20, 19, 30, 25); c.stroke();
  // tower
  for (const px of [2.4, 10.6]) { rf(c, px - .9, 4, 1.8, 24.4, .8, '#2a5ab0'); rf(c, px - .9, 4, 1.8, 24.4, .8, lg(c, px - 1, 0, px + 1, 0, '#6aa6f0', '#3a7ad8', '#2a5ab0')); }
  for (let yy = 11; yy < 28; yy += 4) { rf(c, 2.4, yy, 8.2, 1.4, .5, '#7ab0f0'); rf(c, 2.4, yy, 8.2, .6, .3, '#c4e0ff'); }
  rr(c, .6, 3, 12.4, 3.6, 1.2); c.fillStyle = lg(c, 0, 3, 0, 6.6, '#ff8a7a', '#e8503e'); c.fill(); c.strokeStyle = '#a82e22'; c.lineWidth = .55; c.stroke();
  for (const px of [1.6, 12]) { rf(c, px - .5, -3, 1, 6.6, .4, '#2a5ab0'); }
  c.fillStyle = '#5ab848'; poly(c, [1.6, -3, 12, -3, 12, -.4, 1.6, -.4]); c.fill(); c.strokeStyle = '#2a7a28'; c.lineWidth = .45; c.stroke();
  poly(c, [1.2, -.4, 12.4, -.4, 6.8, -4.6]); c.fillStyle = '#ffd23a'; c.fill(); c.strokeStyle = '#b88a10'; c.stroke(); el(c, 6.8, -5.2, .7, .7, '#e8503e');
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(2.6, 3.4, 6, .5);
}
P.slide = (c, W, H) => { fitDraw(c, W, H, 32, 30, slideDesign, 1.5); };
const BALLC = ['#ff5a6a', '#ffd23a', '#5ab8f0', '#58c878', '#ff9ac0', '#c08af0', '#ff9a3a'];
function toyBall(c, x, y, r, col) { el(c, x + .2, y + .35, r, r, shade(col, .6)); el(c, x, y, r, r, lg(c, x - r, y - r, x + r, y + r, shade(col, 1.25), col, shade(col, .82))); el(c, x - r * .36, y - r * .4, r * .36, r * .26, 'rgba(255,255,255,.85)'); }
P.ballpit = (c, W, H) => {
  dropShadow(c, 1, 5, W - 2, H - 6, .22);
  rr(c, .8, 3.4, W - 1.6, H - 3.6, 6); c.fillStyle = lg(c, 0, 3, 0, H, '#ffb0cc', '#e8709c'); c.fill(); c.strokeStyle = '#a83a68'; c.lineWidth = .6; c.stroke();
  rr(c, 3, 5.4, W - 6, H - 11, 4); c.fillStyle = '#5a3a78'; c.fill();
  c.save(); rr(c, 3, 5.4, W - 6, H - 11, 4); c.clip();
  const R = rngp(W * 5 + H);
  for (let yy = 6.6; yy < H - 5; yy += 2.9) for (let xx = 4.4 + ((yy * 3 | 0) % 2) * 1.9; xx < W - 3; xx += 3.8) toyBall(c, xx + (R() - .5) * 1.2, yy + (R() - .5) * .8, 2.15, BALLC[(R() * BALLC.length) | 0]);
  c.restore();
  rr(c, 3, 5.4, W - 6, H - 11, 4); c.strokeStyle = 'rgba(60,20,70,.5)'; c.lineWidth = .5; c.stroke();
  // front padded wall in segments, over the balls
  const segs = Math.max(2, Math.round(W / 10)), sw = (W - 1.6) / segs, sc = ['#5ab8f0', '#ffd23a', '#58c878', '#ff6a8a'];
  for (let i = 0; i < segs; i++) { const sx = .8 + i * sw; rr(c, sx, H - 8.6, sw, 8.6, [i === 0 ? 5 : .8, i === segs - 1 ? 5 : .8, i === segs - 1 ? 5 : 1.8, i === 0 ? 5 : 1.8]); c.fillStyle = lg(c, 0, H - 8.6, 0, H, shade(sc[i % 4], 1.25), sc[i % 4], shade(sc[i % 4], .8)); c.fill(); c.strokeStyle = shade(sc[i % 4], .55); c.lineWidth = .55; c.stroke(); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(sx + 1.2, H - 7.6, sw - 2.4, .5); }
  toyBall(c, W - 3.4, H - 1.8, 2, '#ff5a6a'); toyBall(c, 3, H + .4 - 1.4, 1.6, '#ffd23a');
};
FXP.ballpit = (ctx, x, y, W, H, t, info, w, h) => {
  const n = Math.max(2, Math.round(W / 12)), by = y + H - 10;
  for (let i = 0; i < n; i++) {
    const bx = x + 6 + (W - 12) * (i + .5) / n, f = Math.abs(Math.sin(t / 16 + i * 1.9 + x * .3)), bs = ctxBall(BALLC[(i * 3 + 1) % BALLC.length]);
    ctx.drawImage(bs.cv, bx - 2.4, by - f * 5 - 2.4, 4.8, 4.8);
  }
};
const ctxBall = col => make('tball:' + col, 0, 0, 4.8, 4.8, c => { c.translate(2.4, 2.4); toyBall(c, 0, 0, 2.2, col); });
P.cradle = (c, W, H) => {
  const cx = W / 2, by = H - 1.2;
  ovalShadow(c, cx + 1.4, by, 8, 2.4, .24);
  // mobile arm (back)
  c.strokeStyle = '#8a5a30'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx + 5.4, by - 6); c.lineTo(cx + 5.4, by - 24); c.quadraticCurveTo(cx + 5.4, by - 28, cx, by - 28); c.stroke(); c.strokeStyle = '#d29a5c'; c.lineWidth = .6; c.beginPath(); c.moveTo(cx + 4.9, by - 6); c.lineTo(cx + 4.9, by - 24); c.stroke();
  el(c, cx - .2, by - 28.1, 1.2, 1.2, '#ffd23a');
  // rockers
  c.strokeStyle = '#8a5a30'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx - 8.4, by - 3.4); c.quadraticCurveTo(cx, by + 1.6, cx + 8.4, by - 3.4); c.stroke(); c.strokeStyle = '#d29a5c'; c.lineWidth = .5; c.beginPath(); c.moveTo(cx - 8, by - 3.6); c.quadraticCurveTo(cx, by + 1, cx + 8, by - 3.6); c.stroke();
  // basket
  c.beginPath(); c.moveTo(cx - 8, by - 9.4); c.quadraticCurveTo(cx - 7.6, by - 2, cx - 3, by - 2.6); c.lineTo(cx + 3, by - 2.6); c.quadraticCurveTo(cx + 7.6, by - 2, cx + 8, by - 9.4); c.closePath();
  c.fillStyle = lg(c, cx - 8, 0, cx + 8, 0, '#f6d49a', '#d8a45e', '#a8742e'); c.fill(); c.strokeStyle = '#7a4c1c'; c.lineWidth = .6; c.stroke();
  c.save(); c.clip(); c.strokeStyle = 'rgba(110,64,20,.45)'; c.lineWidth = .35; for (let yy = by - 9; yy < by - 2; yy += 1.5) { c.beginPath(); c.moveTo(cx - 8, yy); c.lineTo(cx + 8, yy); c.stroke(); } for (let xx = cx - 7; xx < cx + 8; xx += 1.7) { c.beginPath(); c.moveTo(xx, by - 10); c.lineTo(xx + .6, by - 2); c.stroke(); } c.restore();
  // blanket + pillow + baby bump
  el(c, cx, by - 9.4, 8, 3.4, '#8a5a30'); el(c, cx, by - 9.6, 7.5, 3, '#fff4e0');
  el(c, cx - 3.4, by - 10.6, 3, 1.9, '#ffffff'); c.strokeStyle = '#e0d4c4'; c.lineWidth = .35; c.beginPath(); c.ellipse(cx - 3.4, by - 10.6, 3, 1.9, 0, 0, TAU); c.stroke();
  el(c, cx - 3.4, by - 11.2, 1.8, 1.5, '#f8d0a8'); el(c, cx - 3.4, by - 12.2, 1.9, 1, '#8a5a30');
  c.beginPath(); c.moveTo(cx - 6.8, by - 9); c.quadraticCurveTo(cx, by - 12.2, cx + 6.8, by - 9); c.quadraticCurveTo(cx + 3, by - 6, cx - 3, by - 6.8); c.closePath(); c.fillStyle = lg(c, 0, by - 12, 0, by - 6, '#ffb0cc', '#ff7aa8'); c.fill(); c.strokeStyle = '#c04a78'; c.lineWidth = .45; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; for (const [hx, hy] of [[1, -9.4], [3.6, -8.6], [-1.4, -8.2]]) el(c, cx + hx, by + hy, .55, .45, 'rgba(255,255,255,.8)');
  el(c, cx - 4.6, by - 9.4, 1.6, .4, 'rgba(255,255,255,.7)');
};
const mobileBit = k => make('mob' + k, -3, -3, 6, 6.5, c => {
  if (k === 0) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 1.2 : 2.7; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = '#ffd23a'; c.fill(); c.strokeStyle = '#c89a10'; c.lineWidth = .4; c.stroke(); }
  else if (k === 1) { c.beginPath(); c.arc(0, 0, 2.5, -PI * .35, PI * 1.35); c.arc(.9, -.2, 2, PI * 1.25, -PI * .25, true); c.closePath(); c.fillStyle = '#c8b0ff'; c.fill(); c.strokeStyle = '#7a5ac8'; c.lineWidth = .4; c.stroke(); }
  else { el(c, -1, .4, 1.5, 1.2, '#9ad8ff'); el(c, 1, 0, 1.7, 1.4, '#bfe8ff'); el(c, 0, .9, 2.4, 1, '#d4f0ff'); c.strokeStyle = '#5a98c8'; c.lineWidth = .35; c.beginPath(); c.ellipse(0, .6, 2.6, 1.6, 0, 0, TAU); c.stroke(); }
});
FXP.cradle = (ctx, x, y, W, H, t) => {
  const cx = x + W / 2, top = y + H - 1.2 - 28;
  for (let i = 0; i < 3; i++) {
    const ang = Math.sin(t / 38 + i * 2.1) * .32, len = 6 + i * 1.4, a = (t / 70 + i * 2.1), hx = cx - 3.6 + i * 3.6 + Math.cos(a) * 1.2, hy = top + 1 + Math.sin(a) * .3, ex = hx + Math.sin(ang) * len, ey = hy + Math.cos(ang) * len;
    ctx.strokeStyle = 'rgba(120,90,70,.7)'; ctx.lineWidth = .3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey - 2.4); ctx.stroke();
    const b = mobileBit(i); ctx.drawImage(b.cv, ex + b.x0, ey + b.y0, b.w, b.h);
  }
};
P.blocks = (c, W, H) => {
  const by = H - 1.4, R = rngp(W * 3 + 7), cols = ['#ff6a5a', '#5ab8f0', '#ffd23a', '#58c878', '#c08af0', '#ff9a3a'], s = 7.4;
  const cube = (x, y, col, k) => {   // y = bottom of the front face
    const fh = s * .72, th = s * .3;
    el(c, x + s / 2 + .5, y + .1, s / 2 + .8, 1, 'rgba(70,40,20,.22)');
    rr(c, x, y - fh - th, s, fh + th, 1); c.fillStyle = shade(col, .66); c.fill();
    rr(c, x, y - fh - th, s, th + 1, [1, 1, .3, .3]); c.fillStyle = lg(c, x, y - fh - th, x + s, y - fh, shade(col, 1.5), shade(col, 1.25)); c.fill();
    rr(c, x, y - fh, s, fh, [.2, .2, 1, 1]); c.fillStyle = lg(c, 0, y - fh, 0, y, shade(col, 1.1), col, shade(col, .84)); c.fill();
    shapeIcon(c, k % 4, x + s / 2, y - fh / 2, 1.45, 'rgba(255,255,255,.9)');
    rr(c, x, y - fh - th, s, fh + th, 1); c.strokeStyle = shade(col, .55); c.lineWidth = .5; c.stroke();
  };
  const n = Math.max(2, Math.min(5, Math.floor((W - 2) / (s + .6)))), tot = n * (s + .6) - .6, ox = (W - tot) / 2;
  let lvl = n, row = 0, ci = 0;
  for (; lvl >= 1; lvl--, row++) { const lw = lvl * (s + .6) - .6, lx = (W - lw) / 2; for (let k = 0; k < lvl; k++) cube(lx + k * (s + .6) + (R() - .5) * .5, by - row * (s * .72 + 1.2), cols[ci++ % cols.length], ci); if (row >= 2) break; }
  // a stray small ball at the foot
  el(c, W - 3, by - .4, 1.7, 1.7, '#ff5a6a'); el(c, W - 3.5, by - 1, .6, .4, 'rgba(255,255,255,.8)');
};

// ---- Healing station ----------------------------------------------------------------------------
function healerDesign(c, bw, bh) {
  const cx = 16;
  dropShadow(c, 1.4, 14, 29, 26, .22);
  // arched back frame
  rr(c, 3, 2, 26, 32, [13, 13, 2, 2]); c.fillStyle = lg(c, 3, 2, 29, 2, '#ffc4d6', '#ff8fb0', '#e0628a'); c.fill(); c.strokeStyle = '#a83a68'; c.lineWidth = .7; c.stroke();
  // glowing pod interior (static base glow; animated on top)
  rr(c, 7.4, 6.4, 17.2, 26, [8.6, 8.6, 1.6, 1.6]); c.fillStyle = lg(c, 0, 6, 0, 33, '#1c3a58', '#3a8ab0', '#7ad8e8'); c.fill();
  c.save(); rr(c, 7.4, 6.4, 17.2, 26, [8.6, 8.6, 1.6, 1.6]); c.clip(); c.fillStyle = rg(c, 16, 24, 11, 'rgba(255,255,255,.55)', 'rgba(190,240,255,.25)', 'rgba(190,240,255,0)'); c.fillRect(7, 6, 18, 28); c.restore();
  // pad
  el(c, cx, 31, 9.4, 3.2, '#a83a68'); el(c, cx, 30.6, 9, 2.9, '#fff0f4'); el(c, cx, 30.6, 6.4, 2, '#ffc4d6');
  c.fillStyle = '#ff5c8a'; c.fillRect(cx - 1.2, 29.6, 2.4, 2); c.fillRect(cx - 2.4, 30.4, 4.8, .6);
  // glass: shine and rim
  rr(c, 7.4, 6.4, 17.2, 26, [8.6, 8.6, 1.6, 1.6]); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = .8; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.32)'; c.beginPath(); c.moveTo(9.4, 12); c.quadraticCurveTo(9.4, 8, 14, 7.6); c.lineTo(15.4, 7.8); c.quadraticCurveTo(11, 9, 11.2, 14); c.closePath(); c.fill(); c.fillRect(9.6, 15, 1, 10);
  // top emblem
  el(c, cx, 2.6, 4.2, 4.2, '#a83a68'); el(c, cx, 2.4, 3.7, 3.7, '#ffffff'); rf(c, cx - 1, .2, 2, 4.4, .6, '#ff5c8a'); rf(c, cx - 2.2, 1.4, 4.4, 2, .6, '#ff5c8a');
  // side pillars + lights
  for (const px of [1.4, 26.6]) { rr(c, px, 12, 4, 24, 1.6); c.fillStyle = lg(c, px, 0, px + 4, 0, '#fff', '#e8d4de', '#b898a8'); c.fill(); c.strokeStyle = '#8a6a7a'; c.lineWidth = .5; c.stroke(); }
  // console
  rr(c, .6, 33, 30.8, 7.4, [2.4, 2.4, 1.2, 1.2]); c.fillStyle = lg(c, 0, 33, 0, 40.4, '#ffffff', '#f0dfe6', '#d0b4c4'); c.fill(); c.strokeStyle = '#a8849a'; c.lineWidth = .6; c.stroke();
  rf(c, 3, 34.6, 8, 3.6, .8, '#1c3a40'); c.fillStyle = '#7affc0'; c.fillRect(4, 36.2, 6, .4); rf(c, 21, 34.6, 8, 3.6, .8, '#fff0f4');
  for (const [bx, bc] of [[14, '#ff5c8a'], [17.4, '#58d878'], [20.2, '#ffd23a']]) { el(c, bx, 36.4, 1.1, 1.1, shade(bc, .6)); el(c, bx - .1, 36.2, .9, .9, bc); }
  c.strokeStyle = '#ff7aa0'; c.lineWidth = .5; c.beginPath(); c.moveTo(22, 36.6); c.lineTo(24, 36.6); c.lineTo(24.8, 35.4); c.lineTo(26, 38); c.lineTo(27, 36.6); c.lineTo(28, 36.6); c.stroke();
  rf(c, -.4, 39.4, 32.8, 1.6, .8, '#8a6a7a');
}
P.healer = (c, W, H) => { fitDraw(c, W, H, 32, 41, healerDesign); };
FXP.healer = (ctx, x, y, W, H, t, info) => {
  const f = fitXf(W, H, 32, 41), s = f.s, X = d => x + f.ox + d * s, Y = d => y + f.oy + d * s, act = !!info.active, g = glowSprite();
  const pulse = act ? .55 + .4 * Math.sin(t / 5) : .22 + .12 * Math.sin(t / 30);
  ctx.save(); ctx.beginPath(); ctx.rect(X(7.4), Y(6.4), 17.2 * s, 26 * s); ctx.clip();
  ctx.globalAlpha = pulse; ctx.fillStyle = act ? '#ffe4f0' : '#c8f4ff'; ctx.beginPath(); ctx.ellipse(X(16), Y(21), 8.2 * s, 13 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  const n = act ? 7 : 3;
  for (let i = 0; i < n; i++) { const ph = ((t / (act ? 40 : 90)) + i / n) % 1, sx = X(16 + Math.sin(i * 2.7 + t / 50) * 5), sy = Y(30 - ph * 22); ctx.globalAlpha = Math.sin(ph * PI) * (act ? .95 : .6); ctx.drawImage(starSpr().cv, sx - 1.8 * s, sy - 1.8 * s, 3.6 * s, 3.6 * s); }
  ctx.globalAlpha = 1; ctx.restore();
  ctx.globalAlpha = act ? .7 + .25 * Math.sin(t / 5) : .35; ctx.drawImage(g.cv, X(16) - 20 * s, Y(22) - 16 * s, 40 * s, 32 * s); ctx.globalAlpha = 1;
  if (act) { const r = ((t / 24) % 1); ctx.strokeStyle = `rgba(255,255,255,${1 - r})`; ctx.lineWidth = .6 * s; ctx.beginPath(); ctx.ellipse(X(16), Y(30.6), (4 + r * 6) * s, (1.4 + r * 2.2) * s, 0, 0, TAU); ctx.stroke(); }
  // little status light
  ctx.fillStyle = act ? '#ff5c8a' : '#58d878'; ctx.beginPath(); ctx.arc(X(14), Y(36.4), .9 * s, 0, TAU); ctx.fill();
};
const starSpr = () => make('hstar', -4, -4, 8, 8, c => { c.fillStyle = rg(c, 0, 0, 4, 'rgba(255,255,255,.95)', 'rgba(255,255,255,0)'); c.fillRect(-4, -4, 8, 8); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -3.6); c.quadraticCurveTo(.4, -.4, 3.6, 0); c.quadraticCurveTo(.4, .4, 0, 3.6); c.quadraticCurveTo(-.4, .4, -3.6, 0); c.quadraticCurveTo(-.4, -.4, 0, -3.6); c.fill(); });
function medCross(c, x, y, s, col) { rf(c, x - s * .3, y - s, s * .6, s * 2, s * .15, col); rf(c, x - s, y - s * .3, s * 2, s * .6, s * .15, col); }
P.medbed = (c, W, H) => {
  const pink = '#ff8fb0';
  if (H >= W) {
    dropShadow(c, .8, -1, W - 1.6, H + .5, .22);
    solid(c, .8, -8, W - 1.6, 8, [3, 3, .6, .6], '#f6f8ff', { line: '#9aa4bc', hi: .4 });   // head rail
    for (let xx = 3; xx < W - 2; xx += 2.6) { c.fillStyle = 'rgba(160,172,196,.7)'; c.fillRect(xx, -6.6, .5, 6); }
    solid(c, 1.4, -1, W - 2.8, H - 3, [1.6, 1.6, 2.4, 2.4], '#d8e0f0', { line: '#8a94ae' });
    rf(c, 2.2, -.4, W - 4.4, H - 4.4, 1.6, '#fffafc');
    solid(c, 3.4, .6, W - 6.8, 5.6, 2.6, '#ffffff', { line: '#d4d8e8', hi: .6 }); c.fillStyle = 'rgba(160,160,200,.35)'; c.fillRect(4.6, 4.8, W - 9.2, .4);
    const by = 8;
    rr(c, 2, by, W - 4, H - by - 3.4, [1.6, 1.6, 2.4, 2.4]); c.fillStyle = lg(c, 0, by, 0, H, shade(pink, 1.1), pink, shade(pink, .82)); c.fill(); c.strokeStyle = shade(pink, .6); c.lineWidth = .6; c.stroke();
    rf(c, 2, by, W - 4, 2.6, [1.6, 1.6, 0, 0], '#ffffff'); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(3, by + 4, W * .3, .5);
    el(c, W / 2, by + 10, 4.6, 4.6, '#ffffff'); medCross(c, W / 2, by + 10, 3, '#ff5c8a');
    solid(c, .8, H - 3.8, W - 1.6, 3, [1.2, 1.2, 1.4, 1.4], '#f6f8ff', { line: '#9aa4bc' });
    for (const lx of [2.6, W - 2.6]) { el(c, lx, H - .2, 1.5, 1.1, '#3a3e4c'); el(c, lx - .3, H - .5, .6, .4, '#9aa0b4'); }
  } else {
    dropShadow(c, .5, H - 14, W - 1, 15, .22);
    const by = H - 2;
    for (const lx of [3, W - 3]) { rf(c, lx - .7, by - 4, 1.4, 4, .4, '#9aa4bc'); el(c, lx, by + .5, 1.6, 1, '#3a3e4c'); }
    solid(c, .8, by - 20, 3.2, 17, [2, 2, .6, .6], '#f6f8ff', { line: '#9aa4bc' });   // head rail
    solid(c, W - 3, by - 10, 2.4, 8, [1.2, 1.2, .6, .6], '#f6f8ff', { line: '#9aa4bc' });
    solid(c, 2.4, by - 9.4, W - 5, 5.4, 1.4, '#d8e0f0', { line: '#8a94ae' });
    rr(c, 3, by - 11.6, W - 6, 4.4, [1.4, 1.4, .6, .6]); c.fillStyle = '#fffafc'; c.fill();
    solid(c, 3.8, by - 13.6, 7.6, 4.8, 2.4, '#ffffff', { line: '#d4d8e8', hi: .6 });
    rr(c, 11, by - 12, W - 14.4, 7.8, [.8, 2.6, 2.6, .8]); c.fillStyle = lg(c, 0, by - 12, 0, by - 4, shade(pink, 1.1), pink, shade(pink, .82)); c.fill(); c.strokeStyle = shade(pink, .6); c.lineWidth = .6; c.stroke();
    rf(c, 11, by - 12, 2.4, 7.8, [.8, 0, 0, .8], '#ffffff'); if (W >= 28) { el(c, 11 + (W - 14.4) / 2 + 2, by - 8.2, 3, 3, '#ffffff'); medCross(c, 11 + (W - 14.4) / 2 + 2, by - 8.2, 2, '#ff5c8a'); }
  }
};
P.medcabinet = (c, W, H) => {
  dropShadow(c, .5, -6, W - 1, H + 6.3, .22);
  block(c, .6, -17, W - 1.2, 2.8, H + 16.8, '#f4f8ff', { r: 1.8 });
  rf(c, 0, -18.4, W, 2.4, [1.4, 1.4, .4, .4], '#ffffff'); c.strokeStyle = '#9aa4bc'; c.lineWidth = .5; rr(c, 0, -18.4, W, 2.4, 1); c.stroke();
  el(c, W / 2, -11.4, 3.6, 3.6, '#e8547a'); el(c, W / 2, -11.4, 3.1, 3.1, '#fff'); medCross(c, W / 2, -11.4, 2.2, '#ff5c8a');
  const n = Math.max(1, Math.round(W / 14)), dw = (W - 3) / n;
  for (let i = 0; i < n; i++) {
    const x0 = 1.5 + i * dw;
    rr(c, x0 + .4, -7, dw - .8, 11, 1); c.fillStyle = lg(c, 0, -7, 0, 4, '#d4ecf8', '#a8d4ec'); c.fill(); c.strokeStyle = '#8aa4bc'; c.lineWidth = .5; c.stroke();
    c.save(); rr(c, x0 + .4, -7, dw - .8, 11, 1); c.clip();
    const bc = ['#ff6a8a', '#58c878', '#ffd23a', '#5ab8f0'];
    for (let k = 0; k < 3; k++) { const bx = x0 + 1.6 + k * ((dw - 3.4) / 3); rf(c, bx, -2.6 + (k % 2) * 4 - 4.4, 2.2, 4.4, .6, bc[(i + k) % 4]); rf(c, bx + .4, -3.4 + (k % 2) * 4 - 4.4, 1.4, 1, .3, '#f4f4fa'); rf(c, bx, 1.4 - 2.2, 2.2, 4.6 - 2, .6, bc[(i + k + 2) % 4]); }
    rf(c, x0 + .4, -2.8, dw - .8, .6, 0, '#c8d4e4');
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(x0 + 1, 3.6); c.lineTo(x0 + 3.4, -7); c.lineTo(x0 + 4.6, -7); c.lineTo(x0 + 2.2, 3.6); c.fill(); c.restore();
    panel(c, x0 + .4, 5, dw - .8, H - 8.4, '#f4f8ff'); knob(c, i % 2 ? x0 + 1.5 : x0 + dw - 1.5, 5 + (H - 8.4) / 2 - 1, .5, '#b0b8c8');
    rf(c, x0 + dw - 2.2, -2.6, .8, 2, .3, '#9aa4bc');
  }
  rf(c, 1.4, H - 2, W - 2.8, 1.3, .4, '#b8c4d8');
};
P.monitor = (c, W, H) => {
  const cx = W / 2, by = H - 1.2;
  ovalShadow(c, cx + 1, by, 7.4, 2.2, .22);
  // wheeled stand
  for (const [dx, dy] of [[-5.6, 0], [5.6, 0], [-2.6, 1.1], [2.6, 1.1]]) line(c, [cx, by - 2.6, cx + dx, by - 1 + dy], '#8a94ae', 1.1);
  for (const dx of [-5.6, 5.6, -2.6, 2.6]) { el(c, cx + dx, by - .4 + (Math.abs(dx) < 4 ? 1.1 : 0), 1.1, 1.1, '#3a3e4c'); }
  rf(c, cx - 1, by - 14, 2, 12, .8, '#aab4cc'); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(cx - .6, by - 13.4, .5, 10);
  // monitor head
  solid(c, cx - 7.6, by - 26, 15.2, 12.4, 2.2, '#f2f6ff', { line: '#8a94ae', hi: .45 });
  rf(c, cx - 6.2, by - 24.6, 12.4, 8.6, 1, '#10222a');
  c.save(); rr(c, cx - 6.2, by - 24.6, 12.4, 8.6, 1); c.clip(); c.strokeStyle = 'rgba(100,255,190,.22)'; c.lineWidth = .3; for (let xx = cx - 6; xx < cx + 6.4; xx += 2) { c.beginPath(); c.moveTo(xx, by - 24.6); c.lineTo(xx, by - 16); c.stroke(); } for (let yy = by - 23; yy < by - 16; yy += 2) { c.beginPath(); c.moveTo(cx - 6.2, yy); c.lineTo(cx + 6.2, yy); c.stroke(); } c.restore();
  el(c, cx - 4, by - 14.7, .6, .6, '#58d878'); el(c, cx - 2.4, by - 14.7, .6, .6, '#ffd23a'); rf(c, cx + 2, by - 15.2, 4, 1, .4, '#cfd6e6');
  rf(c, cx - 3, by - 28, 6, 2.4, 1, '#ff7aa0'); medCross(c, cx, by - 26.8, 1.1, '#fff');
  c.strokeStyle = '#4a4e5c'; c.lineWidth = .5; c.beginPath(); c.moveTo(cx + 7.4, by - 20); c.quadraticCurveTo(cx + 11, by - 14, cx + 6, by - 8); c.stroke();
};
FXP.monitor = (ctx, x, y, W, H, t) => {
  const cx = x + W / 2, by = y + H - 1.2, sx = cx - 6, sw = 12, sy = by - 20.4;
  ctx.save(); ctx.beginPath(); ctx.rect(cx - 6.2, by - 24.6, 12.4, 8.6); ctx.clip();
  const beat = (t % 56) / 56;
  ctx.strokeStyle = '#7affc0'; ctx.lineWidth = .7; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, ph = ((u * 1.2 - beat + 1.2) % 1.2), pulse = ph < .12 ? (ph < .04 ? -ph * 30 : ph < .08 ? -1.2 + (ph - .04) * 90 : 2.4 - (ph - .08) * 85) : 0;
    const yy = sy - Math.max(-3.4, Math.min(3.4, pulse)) * 1.1 + (ph > .3 && ph < .4 ? -Math.sin((ph - .3) / .1 * PI) * .5 : 0);
    if (i === 0) ctx.moveTo(sx, yy); else ctx.lineTo(sx + u * sw, yy);
  }
  ctx.stroke(); ctx.strokeStyle = 'rgba(122,255,192,.35)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#7affc0'; ctx.fillRect(cx - 5, by - 23.8, 2.2, .6); ctx.restore();
  if (beat < .16) { ctx.fillStyle = `rgba(255,90,120,${1 - beat / .16})`; ctx.beginPath(); ctx.arc(cx + 4.8, by - 23, .8, 0, TAU); ctx.fill(); }
};

/*@@NEXT@@*/

// ---- prop() -------------------------------------------------------------------------
HA.prop = function (ctx, kind, x, y, w, h, t, info) {
  w = +w > 0 ? Math.min(24, +w) : 1; h = +h > 0 ? Math.min(24, +h) : 1; t = t || 0; info = info || {};
  const W = w * 16, H = h * 16, col = info.color || '';
  let fn = P[kind];
  if (kind === 'plant') {
    const pot = make('plpot' + w + 'x' + h, -2, H - 14, W + 4, 14, c => P.plantPot(c, W, H)); blit(ctx, pot, x, y);
    const lv = make('plleaf' + w + 'x' + h, -10, -22, 20, 24, c => P.plantLeaves(c, W, H)), sw = Math.sin(t / 45 + x * .07) * .05;
    ctx.save(); ctx.translate(x + W / 2, y + H - 9.6); ctx.transform(1, 0, sw, 1, 0, 0); ctx.drawImage(lv.cv, lv.x0, lv.y0, lv.w, lv.h); ctx.restore();
    return;
  }
  if (!fn) fn = P.chest;
  const live = LIVE[kind];
  if (!(live && live(ctx, x, y, W, H, t, info, w, h, col))) {
    const pad = 6, s = make('p:' + kind + ':' + w + 'x' + h + ':' + col, -pad, -22, W + pad * 2, H + 22 + 3, c => fn(c, W, H, col));
    blit(ctx, s, x, y);
  }
  const top = TOP[kind];
  if (top) {   // a second cached layer that sways gently (foliage, cloth)
    const s2 = make('p2:' + kind + ':' + w + 'x' + h + ':' + col, -pad2, -22, W + pad2 * 2, H + 22 + 3, c => top.paint(c, W, H, col)), a = top.pivot(W, H);
    ctx.save(); ctx.translate(x + a[0], y + a[1]); ctx.transform(1, 0, Math.sin(t / (top.rate || 45) + x * .07 + y * .05) * (top.amp || .04), 1, 0, 0);
    ctx.drawImage(s2.cv, x + s2.x0 - x - a[0], y + s2.y0 - y - a[1], s2.w, s2.h); ctx.restore();
  }
  const fx = FXP[kind]; if (fx) fx(ctx, x, y, W, H, t, info, w, h);
  switch (kind) {
    case 'tv': { const tw = Math.min(W - 2, 14 + (W - 16) * .6), tx = (W - tw) / 2; screenFx(ctx, x + tx + 1.6, y - 11.4, tw - 3.2, 10.6, t, x * .13); break; }
    case 'fireplace': fxFire(ctx, x, y, W, H, t); break;
    case 'stove': fxSteam(ctx, x, y, t, 4.2, -4); break;
    case 'lamp': fxLamp(ctx, x, y, W, H, t); break;
    case 'bath': fxBath(ctx, x, y, W, H, t); break;
    case 'trophy': { const n = Math.max(1, Math.round(W / 10)), sp = W / n; for (let i = 0; i < n; i++) fxSparkle(ctx, x + sp * (i + .5) + 2, y - 7, t, i + x); break; }
  }
};

HA.propKinds = () => Object.keys(P).filter(k => !/^(plantPot|plantLeaves)$/.test(k));

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
