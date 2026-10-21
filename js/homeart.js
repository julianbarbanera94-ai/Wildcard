// Building art: homestead structures, crops and soil (see docs/HOMESTEAD.md section 5 and docs/CONTRACT.md).
// Every structure is painted once per (type, level, size, rotation, door) into an offscreen canvas at 4 px per logical
// unit; a frame is one drawImage per structure plus a few cheap animated touches (smoke, sparks, glows, spray, sway).
(function () {
const G = globalThis.G;
const K = 4, TAU = Math.PI * 2, PI = Math.PI;
const RISE = 26;   // art may rise this far above the footprint

// ---- Helpers --------------------------------------------------------------------------------
const store = new Map();
// make(key, x0, y0, w, h, paint): a cached canvas for the logical box [x0, x0+w] x [y0, y0+h].
function make(key, x0, y0, w, h, paint) {
  let cvs = store.get(key); if (cvs) return cvs;
  const r = G.cv(Math.max(1, Math.ceil(w * K)), Math.max(1, Math.ceil(h * K))); cvs = r[0]; const c = r[1];
  c.imageSmoothingEnabled = true; c.setTransform(K, 0, 0, K, -x0 * K, -y0 * K); c.lineCap = 'round'; c.lineJoin = 'round';
  paint(c); store.set(key, cvs); return cvs;
}
const shade = (c, f) => G.shade(c, f);
const rng = s => G.mulberry(s * 7919 + 17);
function rgba(hex, a) { const [r, g, b] = G.rgbOf(hex); return `rgba(${r},${g},${b},${a})`; }
function mix(a, b, f) { const p = G.rgbOf(a), q = G.rgbOf(b); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * f).toString(16).padStart(2, '0')).join(''); }
function lg(c, x0, y0, x1, y1, ...cols) { const g = c.createLinearGradient(x0, y0, x1, y1); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
function rgr(c, x, y, r, ...cols) { const g = c.createRadialGradient(x, y, 0, x, y, r); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
function rr(c, x, y, w, h, r) {
  const [a, b, d, e] = (typeof r === 'number' ? [r, r, r, r] : r).map(v => Math.max(0, Math.min(v, w / 2, h / 2)));
  c.beginPath(); c.moveTo(x + a, y); c.lineTo(x + w - b, y); c.arcTo(x + w, y, x + w, y + b, b); c.lineTo(x + w, y + h - d); c.arcTo(x + w, y + h, x + w - d, y + h, d);
  c.lineTo(x + e, y + h); c.arcTo(x, y + h, x, y + h - e, e); c.lineTo(x, y + a); c.arcTo(x, y, x + a, y, a); c.closePath();
}
function rf(c, x, y, w, h, r, col) { rr(c, x, y, w, h, r); c.fillStyle = col; c.fill(); }
function el(c, x, y, rx, ry, col) { c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU); c.fillStyle = col; c.fill(); }
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
function line(c, x0, y0, x1, y1, w, col) { c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
function softShadow(c, x, y, rx, ry, a) {
  c.save(); c.translate(x, y); c.scale(rx, ry); c.beginPath(); c.arc(0, 0, 1, 0, TAU);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(24,48,40,${a})`); g.addColorStop(.6, `rgba(24,48,40,${a * .7})`); g.addColorStop(1, 'rgba(24,48,40,0)');
  c.fillStyle = g; c.fill(); c.restore();
}
// A soft drop shadow under a building's footprint, offset down/right (kept inside the footprint's bottom edge).
function baseShadow(c, x0, x1, base, a) {
  const w = x1 - x0;
  c.save(); rr(c, x0 + 2, base - 9, w + 1, 9, 4); c.fillStyle = lg(c, 0, base - 9, 0, base, 'rgba(24,48,40,0)', `rgba(24,48,40,${(a || .3) * .9})`); c.fill(); c.restore();
  softShadow(c, (x0 + x1) / 2 + 2.5, base - 1.5, w / 2 + 3, 3.4, a || .3);
}
function blobPath(c, cs, dx, dy, dr) { c.beginPath(); for (const q of cs) { c.moveTo(q[0] + dx + q[2] + dr, q[1] + dy); c.arc(q[0] + dx, q[1] + dy, Math.max(.1, q[2] + dr), 0, TAU); } }
function toonBlob(c, cs, pal) {
  blobPath(c, cs, .3, .8, .5); c.fillStyle = pal[0]; c.fill();
  blobPath(c, cs, 0, 0, 0); c.fillStyle = pal[1]; c.fill();
  c.save(); blobPath(c, cs, 0, 0, 0); c.clip();
  blobPath(c, cs, -1, -1.5, -.5); c.fillStyle = pal[2]; c.fill();
  blobPath(c, cs.map(q => [q[0] - q[2] * .3, q[1] - q[2] * .34, q[2] * .45]), 0, 0, 0); c.fillStyle = pal[3]; c.fill();
  c.restore();
}
const LEAF = ['#2f7d36', '#4fb043', '#5fbe4a', '#9ae070'];
function hedge(c, x0, x1, y, h, flowers) {
  const cs = []; const n = Math.max(1, Math.round((x1 - x0) / (h * .9)));
  for (let i = 0; i < n; i++) cs.push([x0 + h / 2 + (x1 - x0 - h) * (n > 1 ? i / (n - 1) : .5), y - h / 2, h / 2 + .4]);
  toonBlob(c, cs, LEAF);
  if (flowers) { const R = rng(x0 * 3 + y); for (let i = 0; i < n * 2; i++) { const a = x0 + 1.5 + R() * (x1 - x0 - 3), b = y - h + 1.5 + R() * (h - 3); el(c, a, b, .8, .8, flowers[i % flowers.length]); el(c, a, b, .3, .3, '#fff6c0'); } }
}

// ---- Shared effect sprites --------------------------------------------------------------------
const glowSprite = (col, a) => make('glow' + col + a, 0, 0, 32, 32, c => { c.fillStyle = rgr(c, 16, 16, 16, rgba(col, a), rgba(col, a * .45), rgba(col, 0)); c.fillRect(0, 0, 32, 32); });
const starSprite = () => make('star', 0, 0, 8, 8, c => {
  c.fillStyle = rgr(c, 4, 4, 4, 'rgba(255,255,255,.9)', 'rgba(255,255,255,0)'); c.fillRect(0, 0, 8, 8);
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(4.4, 3.6, 8, 4); c.quadraticCurveTo(4.4, 4.4, 4, 8); c.quadraticCurveTo(3.6, 4.4, 0, 4); c.quadraticCurveTo(3.6, 3.6, 4, 0); c.fill();
});
const puffSprite = col => make('puff' + col, 0, 0, 8, 8, c => { c.fillStyle = rgr(c, 4, 4, 4, rgba(col, .85), rgba(col, .5), rgba(col, 0)); c.fillRect(0, 0, 8, 8); });
const dropSprite = () => make('drop', 0, 0, 4, 4, c => { el(c, 2, 2.2, 1.2, 1.5, 'rgba(120,200,255,.9)'); el(c, 1.6, 1.6, .45, .5, '#ffffff'); });
function smoke(ctx, sx, sy, t, ph, col, n, sz, rise) {
  const P = puffSprite(col || '#f4f2f8'); n = n || 3; sz = sz || 1; rise = rise || 16;
  for (let k = 0; k < n; k++) {
    const f = (t / 110 + k / n + ph) % 1, s = (2.5 + f * 5) * sz;
    ctx.globalAlpha = (1 - f) * .6 * Math.min(1, f * 6);
    ctx.drawImage(P, sx + f * 4 + Math.sin(t / 30 + k * 2) * 1.2 - s / 2, sy - f * rise - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}
function glow(ctx, x, y, r, col, a) { ctx.globalAlpha = a; ctx.drawImage(glowSprite(col, .6), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
function twinkle(ctx, x, y, t, period, size, ph) {
  const k = (t + (ph || 0)) % period; if (k >= 24) return;
  const s = Math.sin(k / 24 * PI) * size; ctx.drawImage(starSprite(), x - s / 2, y - s / 2, s, s);
}
function sparks(ctx, x, y, t, n, spread) {
  for (let k = 0; k < n; k++) {
    const f = (t / 26 + k * .37) % 1, a = k * 2.4 + Math.floor(t / 26 + k * .37) * 1.7;
    const dx = Math.cos(a) * spread * f, dy = -Math.abs(Math.sin(a)) * spread * f * 1.2 + f * f * 6;
    ctx.globalAlpha = 1 - f; ctx.drawImage(glowSprite('#ffd27a', 1), x + dx - 1.2, y + dy - 1.2, 2.4, 2.4);
  }
  ctx.globalAlpha = 1;
}

// ---- Building parts (all in logical units, origin = footprint top-left) -----------------------
function wall(c, x0, y0, x1, y1, kind, col, o) {
  o = o || {}; const w = x1 - x0, h = y1 - y0, R = rng((x0 * 7 + y0 * 13 + w) | 0);
  rf(c, x0 - .5, y0, w + 1, h + .5, 1.2, shade(col, .58));
  rr(c, x0, y0, w, h, 1); c.fillStyle = lg(c, 0, y0, 0, y1, shade(col, 1.06), shade(col, .94)); c.fill();
  c.save(); rr(c, x0, y0, w, h, 1); c.clip();
  if (kind === 'log') {
    for (let yy = y0 + .2; yy < y1; yy += 4) {
      rr(c, x0 - 2, yy + .3, w + 4, 3.8, 1.9); c.fillStyle = shade(col, .62); c.fill();
      rr(c, x0 - 2, yy, w + 4, 3.6, 1.8); c.fillStyle = lg(c, 0, yy, 0, yy + 3.6, shade(col, 1.25), col, shade(col, .78)); c.fill();
      c.fillStyle = 'rgba(255,240,210,.35)'; c.fillRect(x0, yy + .8, w, .4);
      c.strokeStyle = rgba(shade(col, .55), .35); c.lineWidth = .35;
      for (let i = 0; i < w / 9; i++) { const a = x0 + R() * w; c.beginPath(); c.moveTo(a, yy + 1.9); c.lineTo(a + 2 + R() * 3, yy + 1.9); c.stroke(); }
    }
  } else if (kind === 'plank' || kind === 'hplank') {
    c.lineWidth = .4;
    if (kind === 'plank') for (let xx = x0 + 3.5; xx < x1; xx += 3.5) { line(c, xx, y0, xx, y1, .4, rgba(shade(col, .55), .5)); line(c, xx + .5, y0, xx + .5, y1, .3, rgba('#ffffff', .22)); }
    else for (let yy = y0 + 3; yy < y1; yy += 3.2) { c.fillStyle = rgba(shade(col, .6), .45); c.fillRect(x0, yy, w, .45); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x0, yy + .45, w, .4); }
  } else if (kind === 'plaster') {
    for (let i = 0; i < w * h / 40; i++) el(c, x0 + R() * w, y0 + R() * h, .5 + R() * .7, .3 + R() * .3, rgba(shade(col, .85), .35));
  } else if (kind === 'stone') {
    for (let yy = y0, row = 0; yy < y1; yy += 4.6, row++) {
      let xx = x0 - (row % 2 ? 2.5 : 0);
      while (xx < x1) {
        const sw = 4 + R() * 3.5, tint = shade(col, .9 + R() * .2);
        rf(c, xx + .3, yy + .5, sw - .6, 4.2, 1.4, shade(col, .6));
        rr(c, xx + .3, yy + .2, sw - .6, 4, 1.4); c.fillStyle = lg(c, 0, yy, 0, yy + 4, shade(tint, 1.12), tint); c.fill();
        el(c, xx + 1.6, yy + 1.2, .9, .4, 'rgba(255,255,255,.4)');
        xx += sw;
      }
    }
  } else if (kind === 'brick') {
    for (let yy = y0, row = 0; yy < y1; yy += 2.6, row++) for (let xx = x0 - (row % 2 ? 2.6 : 0); xx < x1; xx += 5.2) {
      const tint = shade(col, .92 + R() * .16);
      rf(c, xx + .25, yy + .25, 4.7, 2.1, .5, tint); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(xx + .5, yy + .4, 4.2, .4);
    }
  } else if (kind === 'metal') {
    for (let xx = x0 + 1.2; xx < x1; xx += 2.4) { line(c, xx, y0, xx, y1, .5, rgba(shade(col, .7), .55)); line(c, xx + .7, y0, xx + .7, y1, .4, 'rgba(255,255,255,.35)'); }
  }
  c.fillStyle = lg(c, 0, y0, 0, y0 + 5, 'rgba(60,30,30,.32)', 'rgba(60,30,30,0)'); c.fillRect(x0, y0, w, 5);
  c.fillStyle = lg(c, x1 - 6, 0, x1, 0, 'rgba(40,20,30,0)', 'rgba(40,20,30,.16)'); c.fillRect(x1 - 6, y0, 6, h);
  c.fillStyle = lg(c, x0, 0, x0 + 4, 0, 'rgba(255,255,255,.18)', 'rgba(255,255,255,0)'); c.fillRect(x0, y0, 4, h);
  c.restore();
  if (kind === 'log') for (let yy = y0 + .2; yy < y1 - 1; yy += 4) for (const ex of [x0 - .4, x1 + .4]) { el(c, ex, yy + 1.9, 1.9, 1.85, shade(col, .6)); el(c, ex, yy + 1.8, 1.6, 1.55, '#e8c08a'); el(c, ex, yy + 1.8, .7, .7, '#c99a62'); }
  if (o.trim) { rf(c, x0 - .6, y0, 2.4, h, .6, o.trim); rf(c, x1 - 1.8, y0, 2.4, h, .6, shade(o.trim, .85)); }
  if (!o.noBase) { rf(c, x0 - 1, y1 - 2.8, w + 2, 3, 1, '#8e889e'); c.fillStyle = '#c4bfd0'; c.fillRect(x0 - .4, y1 - 2.8, w + .8, .7); }
}
// A 3/4-view roof plane: ridge at `top`, eave at `eave`, overhanging the wall by `ov`, hipped in by `ins` at the ridge.
function roof(c, x0, x1, top, eave, col, o) {
  o = o || {}; const ov = o.ov !== undefined ? o.ov : 3, ins = o.ins !== undefined ? o.ins : 5, st = o.style || 'tile';
  const L = x0 - ov, Rr = x1 + ov, l2 = x0 + ins, r2 = x1 - ins;
  const path = () => { c.beginPath(); c.moveTo(l2 + 2, top); c.lineTo(r2 - 2, top); c.quadraticCurveTo(r2, top, r2 + .8, top + 2); c.lineTo(Rr, eave - 2.5); c.quadraticCurveTo(Rr + .3, eave, Rr - 2.5, eave); c.lineTo(L + 2.5, eave); c.quadraticCurveTo(L - .3, eave, L, eave - 2.5); c.lineTo(l2 - .8, top + 2); c.quadraticCurveTo(l2, top, l2 + 2, top); c.closePath(); };
  c.save(); c.translate(.3, 1); path(); c.fillStyle = shade(col, .55); c.fill(); c.restore();
  path(); c.fillStyle = lg(c, 0, top, 0, eave, shade(col, 1.14), col, shade(col, .9)); c.fill();
  c.save(); path(); c.clip();
  const R = rng((x0 * 3 + top * 7 + x1) | 0), dk = rgba(shade(col, .55), .4), lt = rgba(shade(col, 1.5), .45);
  if (st === 'tile') {
    for (let yy = top + 3, row = 0; yy < eave + 4; yy += 3.6, row++) {
      const off = row % 2 ? 2 : 0;
      c.strokeStyle = dk; c.lineWidth = .55; c.beginPath(); for (let xx = L - 4; xx <= Rr + 4; xx += 4) { c.moveTo(xx + off + 2, yy); c.arc(xx + off, yy, 2, 0, PI); } c.stroke();
      c.strokeStyle = lt; c.lineWidth = .45; c.beginPath(); for (let xx = L - 4; xx <= Rr + 4; xx += 4) { c.moveTo(xx + off + 1.3, yy + 1.1); c.arc(xx + off, yy + 2.3, 1.5, 1.25 * PI, 1.75 * PI); } c.stroke();
    }
  } else if (st === 'shake' || st === 'slate') {
    const rh = st === 'slate' ? 3 : 3.6;
    for (let yy = top + 2.4, row = 0; yy < eave + 4; yy += rh, row++) {
      c.fillStyle = dk; c.fillRect(L, yy, Rr - L, .5); c.fillStyle = lt; c.fillRect(L, yy + .5, Rr - L, .35);
      let xx = L - R() * 3;
      while (xx < Rr) { const sw = st === 'slate' ? 3.4 : 2.6 + R() * 2.6; c.fillStyle = dk; c.fillRect(xx, yy - rh + .5, .45, rh - .5); if (R() < .3) { c.fillStyle = rgba(shade(col, R() < .5 ? .85 : 1.12), .5); c.fillRect(xx + .45, yy - rh + .5, sw - .45, rh - .5); } xx += sw; }
    }
  } else if (st === 'metal') {
    for (let xx = L + 1.5; xx < Rr; xx += 3) { c.fillStyle = dk; c.fillRect(xx, top, .6, eave - top); c.fillStyle = lt; c.fillRect(xx + .6, top, .5, eave - top); }
  } else if (st === 'glass') {
    c.fillStyle = 'rgba(255,255,255,.18)'; for (let xx = L - 10; xx < Rr; xx += 14) { c.beginPath(); c.moveTo(xx, eave); c.lineTo(xx + 8, top); c.lineTo(xx + 12, top); c.lineTo(xx + 4, eave); c.fill(); }
    c.strokeStyle = '#ffffff'; c.lineWidth = .9;
    for (let i = 0; i <= 6; i++) { const u = i / 6, xa = L + (Rr - L) * u, xb = l2 + (r2 - l2) * u; c.beginPath(); c.moveTo(xa, eave); c.lineTo(xb, top); c.stroke(); }
    for (const v of [.5]) { c.beginPath(); c.moveTo(L + (l2 - L) * (1 - v), top + (eave - top) * v); c.lineTo(Rr - (Rr - r2) * (1 - v), top + (eave - top) * v); c.stroke(); }
  }
  if (o.moss) for (let i = 0; i < 5; i++) { const a = l2 + R() * (r2 - l2), b = top + 4 + R() * (eave - top - 8); el(c, a, b, 2.2 + R() * 1.6, 1.1, 'rgba(110,170,70,.55)'); el(c, a - .5, b - .3, 1.2, .5, 'rgba(170,220,110,.5)'); }
  c.fillStyle = lg(c, L, 0, L + 6, 0, 'rgba(255,255,255,.16)', 'rgba(255,255,255,0)'); c.fillRect(L, top, 6, eave - top);
  c.fillStyle = lg(c, Rr - 7, 0, Rr, 0, 'rgba(40,10,30,0)', 'rgba(40,10,30,.22)'); c.fillRect(Rr - 7, top, 7, eave - top);
  c.restore();
  if (st !== 'glass') { rf(c, l2 - 1, top - 1.4, r2 - l2 + 2, 2.8, 1.4, shade(col, .66)); c.fillStyle = rgba(shade(col, 1.45), .8); c.fillRect(l2 + .5, top - .9, r2 - l2 - 1, .6); }
  else { rf(c, l2 - 1, top - 1.2, r2 - l2 + 2, 2.4, 1.2, '#f4f8fb'); }
  rf(c, L, eave - 2.3, Rr - L, 2.6, [0, 0, 1.4, 1.4], st === 'glass' ? '#e4ecf2' : shade(col, .62));
  c.fillStyle = st === 'glass' ? '#ffffff' : rgba(shade(col, 1.35), .9); c.fillRect(L + 1, eave - 2.3, Rr - L - 2, .55);
}
// Triangular front gable (a pediment sitting on the eave line).
function gable(c, cx, hw, top, base, wallCol, trimCol, o) {
  o = o || {};
  poly(c, [cx, top, cx + hw, base, cx - hw, base]); c.fillStyle = lg(c, 0, top, 0, base, shade(wallCol, 1.04), shade(wallCol, .92)); c.fill();
  c.save(); poly(c, [cx, top, cx + hw, base, cx - hw, base]); c.clip();
  if (o.plank) for (let xx = cx - hw; xx < cx + hw; xx += 3) line(c, xx, top, xx, base, .35, rgba(shade(wallCol, .6), .4));
  c.fillStyle = lg(c, 0, base - 4, 0, base, 'rgba(60,30,30,0)', 'rgba(60,30,30,.14)'); c.fillRect(cx - hw, base - 4, hw * 2, 4);
  c.restore();
  const bw = 2.2;
  c.lineCap = 'round';
  c.lineWidth = bw + .8; c.strokeStyle = shade(trimCol, .6); c.beginPath(); c.moveTo(cx - hw - 1.2, base + .6); c.lineTo(cx, top - .4); c.lineTo(cx + hw + 1.2, base + .6); c.stroke();
  c.lineWidth = bw; c.strokeStyle = trimCol; c.beginPath(); c.moveTo(cx - hw - 1.2, base); c.lineTo(cx, top - 1); c.lineTo(cx + hw + 1.2, base); c.stroke();
  c.lineWidth = .5; c.strokeStyle = rgba(shade(trimCol, 1.5), .8); c.beginPath(); c.moveTo(cx - hw - .6, base - .8); c.lineTo(cx, top - 1.6); c.stroke();
}
function windowAt(c, x, y, w, h, fc, o) {
  o = o || {};
  const arch = o.arch ? [w / 2 + .5, w / 2 + .5, .8, .8] : 1.2;
  rr(c, x - 1.1, y - 1, w + 2.2, h + 2.6, arch); c.fillStyle = shade(fc, .62); c.fill();
  rr(c, x - 1.1, y - 1.1, w + 2.2, h + 2.2, arch); c.fillStyle = fc; c.fill();
  rr(c, x, y, w, h, o.arch ? [w / 2, w / 2, .5, .5] : .7); c.fillStyle = o.lit ? lg(c, 0, y, 0, y + h, '#fff6d0', '#ffd98a', '#ffc070') : lg(c, 0, y, 0, y + h, '#e6f8ff', '#a2daf4', '#ffe7a8'); c.fill();
  c.save(); rr(c, x, y, w, h, .7); c.clip(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(x + w * .15, y + h); c.lineTo(x + w * .55, y); c.lineTo(x + w * .75, y); c.lineTo(x + w * .35, y + h); c.fill(); c.restore();
  if (o.cross !== false) { c.fillStyle = fc; c.fillRect(x + w / 2 - .45, y, .9, h); if (h > 6) c.fillRect(x, y + h * .5 - .4, w, .8); }
  rf(c, x - 1.8, y + h + .6, w + 3.6, 1.5, .6, shade(fc, 1.12));
  if (o.shut) { rf(c, x - 4.2, y - .6, 3, h + 1.6, .6, o.shut); rf(c, x + w + 1.2, y - .6, 3, h + 1.6, .6, shade(o.shut, .88)); c.fillStyle = 'rgba(0,0,0,.15)'; for (const sx of [x - 2.7, x + w + 2.7]) for (let yy = y + 1; yy < y + h; yy += 1.6) c.fillRect(sx - 1, yy, 2, .35); }
  if (o.box) {
    rf(c, x - 1, y + h + 2, w + 2, 2.6, [0, 0, .8, .8], '#9a6234'); c.fillStyle = '#c88a50'; c.fillRect(x - 1, y + h + 2, w + 2, .5);
    const cols = o.box === true ? ['#ff6e8e', '#ffd23a', '#c8a2ff', '#ff9e5e'] : o.box;
    for (let i = 0; i < Math.max(2, (w / 2.4) | 0); i++) { const fx = x + .6 + i * 2.4; el(c, fx + .5, y + h + 1.8, 1, .8, '#5cae40'); el(c, fx, y + h + 1.2, .85, .8, cols[i % cols.length]); el(c, fx, y + h + 1.2, .3, .3, '#fff6c0'); }
  }
}
function doorAt(c, cx, base, w, h, col, o) {
  o = o || {}; const x = cx - w / 2, y = base - h, ar = o.arch ? w / 2 : 1.4;
  rr(c, x - 1.2, y - 1.2, w + 2.4, h + 1.2, [ar + 1, ar + 1, 0, 0]); c.fillStyle = shade(col, .5); c.fill();
  rr(c, x, y, w, h, [ar, ar, 0, 0]); c.fillStyle = lg(c, 0, y, 0, base, shade(col, 1.15), shade(col, .85)); c.fill();
  if (o.double) { line(c, cx, y + 1, cx, base, .6, shade(col, .55)); }
  else for (let xx = x + w / 3; xx < x + w - .5; xx += w / 3) line(c, xx, y + 1.5, xx, base, .35, rgba(shade(col, .55), .6));
  if (o.glass) { rr(c, x + 1.3, y + 1.3, w - 2.6, h * .45, [ar - 1, ar - 1, .5, .5]); c.fillStyle = lg(c, 0, y, 0, y + h * .5, '#e6f8ff', '#a2daf4'); c.fill(); }
  else { el(c, cx, y + Math.min(4, h * .25), 1.6, 1.6, shade(col, .5)); el(c, cx, y + Math.min(4, h * .25), 1.15, 1.15, '#bfe8ff'); el(c, cx - .4, y + Math.min(4, h * .25) - .4, .35, .35, '#fff'); }
  if (o.double) { el(c, cx - 1.4, y + h * .58, .55, .55, '#ffd86a'); el(c, cx + 1.4, y + h * .58, .55, .55, '#ffd86a'); }
  else { el(c, x + w - 1.8, y + h * .58, .75, .75, '#8a6a1a'); el(c, x + w - 1.9, y + h * .58 - .2, .6, .6, '#ffd86a'); }
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x + .8, y + ar * .5 + .5, .6, h - ar * .5 - 1);
}
function step(c, cx, base, w) { rf(c, cx - w / 2, base - 1.6, w, 1.8, .8, '#a39cb0'); c.fillStyle = '#dcd6e4'; c.fillRect(cx - w / 2 + .5, base - 1.6, w - 1, .5); }
function chimney(c, x, top, bot, col) {
  col = col || '#b8634e';
  rf(c, x + .4, top + .6, 6, bot - top, .6, shade(col, .55));
  rr(c, x, top, 6, bot - top, .6); c.fillStyle = lg(c, x, 0, x + 6, 0, shade(col, 1.15), col, shade(col, .8)); c.fill();
  c.fillStyle = rgba(shade(col, .5), .4); for (let yy = top + 3; yy < bot; yy += 2.6) c.fillRect(x, yy, 6, .35);
  rf(c, x - .8, top - 1, 7.6, 2, .7, shade(col, .62)); c.fillStyle = shade(col, 1.3); c.fillRect(x - .4, top - 1, 6.8, .5);
  el(c, x + 3, top - .4, 2.2, .5, '#3a2a28');
}
function lantern(c, x, y) {   // small wall lantern; glow added by fx
  line(c, x, y - 2, x + 2, y - 2, .6, '#4a4a5c');
  rf(c, x + 1, y - 1.6, 3, 4, .8, '#3c3c4c'); rf(c, x + 1.5, y - 1, 2, 2.8, .5, '#ffe27a'); el(c, x + 2.5, y - .2, .6, .8, '#fffff0');
}
function lampPost(c, x, base, h) {
  el(c, x, base - .8, 2.4, 1, '#5a5a6c');
  c.fillStyle = lg(c, x - .8, 0, x + .8, 0, '#3c3c4c', '#6e6e84', '#3c3c4c'); c.fillRect(x - .7, base - h, 1.4, h);
  rf(c, x - 2.4, base - h - 5.6, 4.8, 5.6, 1.2, '#3c3c4c'); rr(c, x - 1.7, base - h - 5, 3.4, 4.4, .8); c.fillStyle = lg(c, 0, base - h - 5, 0, base - h, '#fffbe0', '#ffe27a', '#ffb94a'); c.fill();
  c.beginPath(); c.moveTo(x - 3, base - h - 5.4); c.quadraticCurveTo(x, base - h - 8.6, x + 3, base - h - 5.4); c.closePath(); c.fillStyle = '#4a4a5c'; c.fill();
}
function fenceRun(c, x0, x1, y, col, picket) {   // horizontal fence: rails at y (bottom), posts every ~8
  const dk = shade(col, .62);
  if (picket) {
    rf(c, x0, y - 4.2, x1 - x0, 1.2, .5, dk); rf(c, x0, y - 4.6, x1 - x0, 1.1, .5, col);
    for (let xx = x0 + .4; xx < x1 - 1; xx += 2.4) { poly(c, [xx, y + .4, xx, y - 6, xx + .8, y - 7.2, xx + 1.6, y - 6, xx + 1.6, y + .4]); c.fillStyle = dk; c.save(); c.translate(.3, .5); c.fill(); c.restore(); c.fillStyle = lg(c, xx, 0, xx + 1.6, 0, shade(col, 1.08), shade(col, .92)); c.fill(); }
    return;
  }
  for (const ry of [y - 6, y - 2.6]) { rf(c, x0, ry + .5, x1 - x0, 1.4, .5, dk); rf(c, x0, ry, x1 - x0, 1.4, .5, col); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0 + .3, ry + .2, x1 - x0 - .6, .35); }
  const n = Math.max(1, Math.round((x1 - x0) / 9));
  for (let i = 0; i <= n; i++) { const px = x0 + (x1 - x0) * i / n; rf(c, px - 1.1, y - 8 + .5, 2.2, 8.5, .8, dk); rf(c, px - 1.1, y - 8, 2.2, 8.2, .8, shade(col, 1.04)); el(c, px, y - 7.7, .9, .45, shade(col, 1.3)); }
}
function fenceSide(c, x, y0, y1, col, picket) {   // vertical fence seen from above: a post line
  const dk = shade(col, .62);
  rf(c, x - .9, y0, 1.8, y1 - y0, .8, dk); rf(c, x - .9, y0 - .6, 1.8, y1 - y0, .8, col);
  const n = Math.max(1, Math.round((y1 - y0) / 7));
  for (let i = 0; i <= n; i++) { const py = y0 + (y1 - y0) * i / n; rf(c, x - 1.2, py - 5, 2.4, 5.6, .8, dk); rf(c, x - 1.2, py - 5.4, 2.4, 5.2, .8, shade(col, 1.04)); el(c, x, py - 5.1, 1, .45, shade(col, 1.3)); if (picket) { poly(c, [x - 1.2, py - 5.4, x, py - 6.6, x + 1.2, py - 5.4]); c.fillStyle = col; c.fill(); } }
}
function pinkCross(c, cx, cy, s, bg) {
  el(c, cx + .3, cy + .6, s + .6, s + .6, 'rgba(120,40,70,.3)');
  el(c, cx, cy, s + .6, s + .6, '#e8547a'); el(c, cx, cy, s, s, bg || '#ffffff');
  const a = s * .32, b = s * .72;
  rf(c, cx - a, cy - b, a * 2, b * 2, a * .5, '#ff5c8a'); rf(c, cx - b, cy - a, b * 2, a * 2, a * .5, '#ff5c8a');
  c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(cx - a + .3, cy - b + .4, .5, b - .4);
}
function awning(c, x0, x1, y, h, c1, c2) {   // striped scalloped canopy
  c.save();
  c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.lineTo(x1 + 1, y + h);
  const n = Math.max(2, Math.round((x1 - x0 + 2) / 4)), sw = (x1 - x0 + 2) / n;
  for (let i = n - 1; i >= 0; i--) { const xa = x0 - 1 + i * sw; c.arc(xa + sw / 2, y + h, sw / 2, 0, PI); }
  c.closePath(); c.fillStyle = shade(c1, .6); c.save(); c.translate(0, .7); c.fill(); c.restore(); c.clip();
  for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? c2 : c1; c.fillRect(x0 - 1 + i * sw, y - 1, sw, h + sw); }
  c.fillStyle = lg(c, 0, y, 0, y + h + 2, 'rgba(255,255,255,.3)', 'rgba(255,255,255,0)', 'rgba(80,20,40,.2)'); c.fillRect(x0 - 2, y, x1 - x0 + 4, h + 3);
  c.restore();
  rf(c, x0 - .6, y - 1, x1 - x0 + 1.2, 2, 1, shade(c1, .8)); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x0, y - .7, x1 - x0, .4);
}
function rollerDoor(c, x0, x1, y0, base, col) {
  rf(c, x0 - 1.4, y0 - 1.6, x1 - x0 + 2.8, base - y0 + 1.6, [1.2, 1.2, 0, 0], '#5a6070');
  rr(c, x0, y0, x1 - x0, base - y0, .4); c.fillStyle = lg(c, 0, y0, 0, base, shade(col, 1.1), shade(col, .9)); c.fill();
  for (let yy = y0 + 2; yy < base; yy += 2.2) { c.fillStyle = rgba(shade(col, .55), .55); c.fillRect(x0, yy, x1 - x0, .45); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x0, yy + .45, x1 - x0, .35); }
  rf(c, (x0 + x1) / 2 - 2.5, base - 3.4, 5, 1.2, .5, '#4a4e5c');
  rf(c, x0 - 1.8, y0 - 3.2, x1 - x0 + 3.6, 2.4, 1, '#6a7080'); c.fillStyle = '#9aa0b0'; c.fillRect(x0 - 1.4, y0 - 3.2, x1 - x0 + 2.8, .5);
}
function hayBale(c, x, y, w, h) {
  rf(c, x, y + .6, w, h, 1.4, '#b88a2a'); rr(c, x, y, w, h, 1.4); c.fillStyle = lg(c, 0, y, 0, y + h, '#ffe27a', '#e8b84a'); c.fill();
  c.strokeStyle = 'rgba(160,110,30,.5)'; c.lineWidth = .35; for (let i = 0; i < 6; i++) { const a = x + 1 + i * (w - 2) / 5; c.beginPath(); c.moveTo(a, y + 1); c.lineTo(a + .6, y + h - 1); c.stroke(); }
  c.fillStyle = '#9a6a3a'; c.fillRect(x + w * .3, y, .6, h); c.fillRect(x + w * .7, y, .6, h);
}
function barrel(c, x, y, w, h, col) {
  col = col || '#a8743f';
  rf(c, x + .3, y + .6, w, h, w * .35, shade(col, .55)); rr(c, x, y, w, h, w * .35); c.fillStyle = lg(c, x, 0, x + w, 0, shade(col, 1.2), col, shade(col, .75)); c.fill();
  c.fillStyle = '#6a6a7c'; c.fillRect(x, y + h * .25, w, .7); c.fillRect(x, y + h * .7, w, .7);
  el(c, x + w / 2, y + .8, w / 2 - .3, 1, shade(col, .65));
}
function crate(c, x, y, s, col) {
  col = col || '#c08a52';
  rf(c, x + .3, y + .6, s, s, .6, shade(col, .55)); rf(c, x, y, s, s, .6, col);
  c.strokeStyle = shade(col, .65); c.lineWidth = .6; c.strokeRect(x + .7, y + .7, s - 1.4, s - 1.4); c.beginPath(); c.moveTo(x + 1, y + 1); c.lineTo(x + s - 1, y + s - 1); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x + .5, y + .4, s - 1, .4);
}
function anvil(c, cx, base, s) {
  s = s || 1;
  rf(c, cx - 3.4 * s, base - 4.6 * s, 6.8 * s, 4.6 * s, .8, '#7a4a28'); c.fillStyle = '#a06a3a'; c.fillRect(cx - 3.4 * s, base - 4.6 * s, 6.8 * s, .7);   // stump
  const y = base - 4.6 * s;
  c.beginPath(); c.moveTo(cx - 5.2 * s, y - 4 * s); c.lineTo(cx + 3.6 * s, y - 4 * s); c.quadraticCurveTo(cx + 6.4 * s, y - 3.8 * s, cx + 6.8 * s, y - 2.6 * s); c.lineTo(cx + 2.6 * s, y - 2.4 * s);
  c.lineTo(cx + 1.6 * s, y - .6 * s); c.lineTo(cx + 3 * s, y); c.lineTo(cx - 3 * s, y); c.lineTo(cx - 1.6 * s, y - .6 * s); c.lineTo(cx - 2.6 * s, y - 2.4 * s); c.lineTo(cx - 5.2 * s, y - 2.6 * s); c.closePath();
  c.fillStyle = '#3c3c4e'; c.save(); c.translate(.3, .5); c.fill(); c.restore(); c.fillStyle = lg(c, 0, y - 4 * s, 0, y, '#8a8aa2', '#5a5a70'); c.fill();
  c.fillStyle = '#b8b8cc'; c.fillRect(cx - 5 * s, y - 4 * s, 8.4 * s, .6);
}

// ---- Structures ---------------------------------------------------------------------------------
const P = {}, FX = {};
const dcx = (o, W) => o.door ? (o.door[0] + .5) * 16 : W / 2;

// House: cabin (logs), cottage (painted, chimney), family home (two storeys, porch), grand homestead (stone + timber, balcony, lights).
P.house = (c, lvl, W, H, o) => {
  const B = H - 1.5, dx = dcx(o, W);
  baseShadow(c, 3, W - 3, H, .32);
  if (lvl === 1) {
    wall(c, 5, 16, W - 5, B, 'log', '#b8794a', { noBase: true });
    rf(c, 4, B - 2.4, W - 8, 2.6, 1, '#8e889e');
    roof(c, 5, W - 5, -15, 21, '#a0663f', { style: 'shake', ov: 4, ins: 7, moss: true });
    windowAt(c, W - 22, 26, 11, 8, '#7a4a2c', { shut: '#5fa048' });
    doorAt(c, dx, B, 10, 16, '#9a5a32');
    step(c, dx, H, 13);
    lantern(c, dx + 6.5, 27);
    // little log pile and an axe in a stump
    for (const [lx, ly] of [[W - 9, B - 5], [W - 5.4, B - 5], [W - 7.2, B - 8.2]]) { el(c, lx, ly + 1.8, 1.9, 1.9, '#7a4c2a'); el(c, lx, ly + 1.7, 1.6, 1.6, '#e8bf86'); el(c, lx, ly + 1.7, .7, .7, '#c99a62'); }
  } else if (lvl === 2) {
    wall(c, 5, 26, W - 5, B, 'plaster', '#fff4dc', { trim: '#c9875a' });
    chimney(c, 13, -20, 2, '#c4705a');
    roof(c, 5, W - 5, -18, 31, '#ec6252', { style: 'tile', ov: 4, ins: 7 });
    gable(c, dx, 16, -2, 30, '#fff4dc', '#ffffff', {});
    el(c, dx, 16, 4.4, 4.4, '#c9875a'); el(c, dx, 16, 3.4, 3.4, '#a2daf4'); line(c, dx - 3.4, 16, dx + 3.4, 16, .7, '#c9875a'); line(c, dx, 12.6, dx, 19.4, .7, '#c9875a'); el(c, dx - 1.3, 14.6, .8, .6, 'rgba(255,255,255,.7)');
    windowAt(c, 11, 37, 13, 10, '#5b8fd6', { box: true });
    windowAt(c, W - 24, 37, 13, 10, '#5b8fd6', { box: true });
    doorAt(c, dx, B, 11, 19, '#5b8fd6', { arch: true });
    step(c, dx, H, 15);
    hedge(c, 4, 12, B + .5, 5, ['#ff7eab']); hedge(c, W - 12, W - 4, B + .5, 5, ['#ffd84a']);
  } else if (lvl === 3) {
    wall(c, 10, 2, W - 10, 30, 'hplank', '#fbeccc', { noBase: true });
    chimney(c, W - 26, -24, -6, '#c4705a');
    roof(c, 10, W - 10, -22, 6, '#4f8ee6', { style: 'tile', ov: 4, ins: 8 });
    for (const wx of [20, W / 2 - 6, W - 32]) windowAt(c, wx, 11, 11, 10, '#ffffff', { shut: '#4f8ee6' });
    roof(c, 4, W - 4, 22, 34, '#4f8ee6', { style: 'tile', ov: 3, ins: 3 });
    wall(c, 5, 33, W - 5, B, 'hplank', '#fbeccc', { trim: '#e8d6b0' });
    windowAt(c, 10, 40, 12, 10, '#ffffff', { box: ['#ff7eab', '#ffffff'] });
    windowAt(c, W - 36, 40, 11, 10, '#ffffff', { box: ['#ffd84a', '#ff9e5e'] });
    windowAt(c, W - 20, 40, 11, 10, '#ffffff', { box: ['#c8a2ff', '#ff7eab'] });
    // porch: deck, posts and a little gable roof over the door
    rf(c, dx - 16, B - 4, 32, 4.4, 1, '#9a6234'); c.fillStyle = '#e0a868'; c.fillRect(dx - 15.4, B - 4, 30.8, 1);
    doorAt(c, dx, B - 3.4, 11, 18, '#c0503e');
    for (const px of [dx - 14, dx + 14]) { rf(c, px - 1.4, 30, 2.8, B - 33, .8, '#d8c8b0'); rf(c, px - 1.2, 30, 2.4, B - 33, .8, '#ffffff'); }
    roof(c, dx - 13, dx + 13, 24, 32, '#3f7ed4', { style: 'tile', ov: 3, ins: 3 });
    gable(c, dx, 15, 16, 31.5, '#fbeccc', '#ffffff', { plank: true });
    pinkHeart(c, dx, 25.5);
    step(c, dx, H, 16);
    lantern(c, dx - 12, 37);
    hedge(c, W - 38, W - 6, B + .5, 4.4, ['#ff7eab', '#ffd84a', '#ffffff']);
  } else {
    // Grand homestead: stone ground floor, timber upper floor with a balcony, slate roof with dormers, lamp posts.
    wall(c, 11, 6, W - 11, 42, 'plaster', '#fdf3e0', { noBase: true });
    c.save(); rr(c, 11, 6, W - 22, 36, 1); c.clip();
    c.fillStyle = '#7a4a2e';
    for (let xx = 11; xx <= W - 11; xx += 16) c.fillRect(xx - 1, 6, 2, 36);
    c.fillRect(11, 24, W - 22, 1.6);
    c.strokeStyle = '#7a4a2e'; c.lineWidth = 1.4; for (let xx = 11; xx < W - 11; xx += 16) { c.beginPath(); c.moveTo(xx, 24); c.lineTo(xx + 8, 8); c.moveTo(xx + 16, 24); c.lineTo(xx + 8, 8); c.stroke(); }
    c.restore();
    chimney(c, 20, -25, -6, '#9a8c9c'); chimney(c, W - 27, -25, -6, '#9a8c9c');
    roof(c, 11, W - 11, -22, 12, '#4a6fa8', { style: 'slate', ov: 4, ins: 9 });
    for (const dxr of [30, W - 30]) {   // dormers
      rf(c, dxr - 6, -12, 12, 12, [1, 1, 0, 0], '#fdf3e0'); windowAt(c, dxr - 3.5, -9, 7, 7, '#ffffff', { arch: true });
      roof(c, dxr - 6, dxr + 6, -17, -10, '#3e5f94', { style: 'slate', ov: 1.5, ins: 2 });
    }
    gable(c, dx, 18, -14, 11, '#fdf3e0', '#7a4a2e', {});
    el(c, dx, 1, 4, 4, '#7a4a2e'); el(c, dx, 1, 3, 3, '#a2daf4'); el(c, dx - 1, 0, .8, .6, '#fff');
    for (const wx of [17, 33, W - 43, W - 27]) windowAt(c, wx, 27, 9, 9, '#ffffff', { shut: '#4a6fa8' });
    wall(c, 6, 42, W - 6, B, 'stone', '#d8cfc0');
    roof(c, 4, W - 4, 38, 46, '#4a6fa8', { style: 'slate', ov: 2, ins: 2 });
    // balcony over the door
    rf(c, dx - 19, 24, 38, 14, 1, '#fdf3e0');
    windowAt(c, dx - 8, 16, 16, 18, '#7a4a2e', { arch: true });
    rf(c, dx - 21, 36, 42, 3.6, 1, '#8a5a36'); c.fillStyle = '#c99060'; c.fillRect(dx - 20.4, 36, 40.8, 1);
    for (let px = dx - 20; px <= dx + 20; px += 2.5) rf(c, px - .5, 29, 1.1, 7.2, .5, '#ffffff');
    rf(c, dx - 21, 28, 42, 1.8, .8, '#ffffff'); c.fillStyle = '#d8dce6'; c.fillRect(dx - 21, 29.4, 42, .4);
    // ground floor: arched windows and a double door
    for (const wx of [13, 28, W - 39, W - 24]) windowAt(c, wx, 52, 10, 13, '#7a4a2e', { arch: true, lit: wx === 28 });
    rf(c, dx - 10, B - 25, 20, 25, [10, 10, 0, 0], '#b8ae9e');
    doorAt(c, dx, B, 15, 22, '#8a4a2a', { arch: true, double: true });
    step(c, dx, H, 22); rf(c, dx - 13, H - 3.4, 26, 1.8, .8, '#bdb6c8');
    hedge(c, 7, dx - 13, B + .5, 5, ['#ff7eab', '#ffffff', '#ffd84a']); hedge(c, dx + 13, W - 7, B + .5, 5, ['#c8a2ff', '#ffffff', '#ff7eab']);
    lampPost(c, 3.4, B + 1, 20); lampPost(c, W - 3.4, B + 1, 20);
  }
};
function pinkHeart(c, x, y) { c.fillStyle = '#ff7e9e'; c.beginPath(); c.moveTo(x, y + 2); c.bezierCurveTo(x - 3, y - .2, x - 1.6, y - 2.6, x, y - 1); c.bezierCurveTo(x + 1.6, y - 2.6, x + 3, y - .2, x, y + 2); c.fill(); }
FX.house = (ctx, lvl, x, y, W, H, t, o, ph) => {
  const dx = dcx(o, W);
  if (lvl === 1) glow(ctx, x + dx + 9, y + 26.8, 6 + Math.sin(t / 19 + ph) * .6, '#ffd27a', .7);
  if (lvl === 2) smoke(ctx, x + 16, y - 21, t, ph);
  if (lvl === 3) { smoke(ctx, x + W - 23, y - 25, t, ph); glow(ctx, x + dx - 9.5, y + 36.8, 6, '#ffd27a', .65 + .1 * Math.sin(t / 19)); }
  if (lvl === 4) {
    smoke(ctx, x + 23, y - 26, t, ph); smoke(ctx, x + W - 24, y - 26, t, ph + .5);
    const a = .75 + .1 * Math.sin(t / 19 + ph) + .04 * Math.sin(t / 5.3);
    glow(ctx, x + 3.4, y + H - 1.5 - 22.4, 9, '#ffd27a', a); glow(ctx, x + W - 3.4, y + H - 1.5 - 22.4, 9, '#ffd27a', a);
  }
};

// Storage shed: a small green plank shed, then a bigger barn-roofed shed with crates.
P.shed = (c, lvl, W, H, o) => {
  const B = H - 1.5;
  baseShadow(c, 3, W - 3, H, .28);
  if (lvl === 1) {
    wall(c, 4, 10, W - 4, B, 'plank', '#6fb35a');
    roof(c, 4, W - 4, -10, 13, '#c0704a', { style: 'shake', ov: 3, ins: 3 });
    rf(c, W / 2 - 9, 14, 18, B - 14, [1, 1, 0, 0], '#4f8a40');
    for (const sx of [W / 2 - 8, W / 2 + .5]) { rf(c, sx, 15, 7.5, B - 16, .6, '#fff4dc'); rf(c, sx + 1, 16, 5.5, B - 18, .4, '#7cc064'); line(c, sx + 1.2, 16.2, sx + 6.3, B - 2.2, .9, '#fff4dc'); }
    el(c, W / 2 - 1, 23, .5, .5, '#5a5a6c'); el(c, W / 2 + 1, 23, .5, .5, '#5a5a6c');
    // a rake leaning on the wall
    line(c, W - 7, B - 1, W - 4.5, 13, .8, '#b0804a'); line(c, W - 6, 12.6, W - 3, 13.4, 1, '#7a7a8c');
  } else {
    wall(c, 4, 14, W - 4, B, 'plank', '#6fb35a');
    roof(c, 4, W - 4, -18, 17, '#c0704a', { style: 'shake', ov: 4, ins: 5 });
    gable(c, W / 2 - 6, 13, -2, 16, '#6fb35a', '#fff4dc', { plank: true });
    el(c, W / 2 - 6, 8, 3, 3, '#fff4dc'); el(c, W / 2 - 6, 8, 2.2, 2.2, '#3a5a34'); line(c, W / 2 - 8, 8, W / 2 - 4, 8, .5, '#fff4dc');
    const dx = W / 2 - 6;
    rf(c, dx - 11, 20, 22, B - 20, [1.2, 1.2, 0, 0], '#4f8a40');
    for (const sx of [dx - 10, dx + .5]) { rf(c, sx, 21, 9.5, B - 22, .6, '#fff4dc'); rf(c, sx + 1, 22, 7.5, B - 24, .4, '#7cc064'); line(c, sx + 1.2, 22.2, sx + 8.3, B - 2.2, .9, '#fff4dc'); line(c, sx + 8.3, 22.2, sx + 1.2, B - 2.2, .9, '#fff4dc'); }
    windowAt(c, W - 16, 24, 8, 7, '#fff4dc');
    crate(c, W - 17, B - 9, 7); crate(c, W - 10, B - 9, 7, '#d09a60'); crate(c, W - 13.5, B - 15.6, 6.6, '#b8834a');
    barrel(c, 5, B - 10, 6, 9);
  }
};

// Nursery: a fenced play pen with toys that grows into a play garden.
P.nursery = (c, lvl, W, H, o) => {
  const B = H - 1;
  softShadow(c, W / 2 + 2, B - 1, W / 2 + 1, 3, .22);
  const grass = lvl === 3 ? '#8ad85a' : '#86d457';
  rf(c, 2, 1, W - 4, B - 1.5, 3, shade(grass, .8)); rf(c, 2.5, 1, W - 5, B - 2.5, 3, grass);
  const R = rng(lvl * 31 + W);
  for (let i = 0; i < W * H / 60; i++) { const a = 4 + R() * (W - 8), b = 3 + R() * (B - 6); line(c, a - .6, b, a, b - 1.4, .45, '#5fae3f'); line(c, a, b - 1.4, a + .6, b, .45, '#5fae3f'); }
  for (let i = 0; i < W * H / 220; i++) { const a = 4 + R() * (W - 8), b = 3 + R() * (B - 6); el(c, a, b, .8, .8, ['#ffffff', '#ffd84a', '#ff9ec0'][i % 3]); el(c, a, b, .3, .3, '#ffd23a'); }
  const fc = lvl === 1 ? '#e2b073' : lvl === 2 ? '#ffb8cf' : '#ffffff', pk = lvl === 3;
  fenceRun(c, 2, W - 2, 3, fc, pk);
  // back-row toys
  if (lvl === 1) kennel(c, 4, 12, '#e8604f');
  if (lvl === 2) { kennel(c, 4, 12, '#5b8fd6'); slide(c, W - 18, 14); }
  if (lvl === 3) {
    tent(c, 4, 16, 18);
    slide(c, W - 34, 16);
    el(c, W - 13, B - 9, 9.5, 5.4, '#4f9ad0'); el(c, W - 13, B - 9.4, 8.6, 4.6, '#7ad8ea'); el(c, W - 15.5, B - 11, 3, 1, 'rgba(255,255,255,.7)');   // paddling pond
    el(c, W - 9.5, B - 8.6, 2.2, 1.6, '#ffe066'); el(c, W - 8.1, B - 10.2, 1.2, 1.1, '#ffe066'); el(c, W - 7.4, B - 10, .5, .3, '#ff9a3a');   // rubber duck
    hedge(c, 3, 13, B - .5, 5, ['#ff7eab', '#ffd84a']);
  }
  ball(c, lvl === 1 ? W - 11 : lvl === 2 ? 24 : 30, B - 7, '#ff5a5a');
  if (lvl >= 2) blocks(c, lvl === 2 ? W - 30 : 26, B - 4.5);
  if (lvl === 3) ball(c, W - 30, B - 5, '#5bbcf0');
  fenceSide(c, 2.6, 3, B - 1, fc, pk); fenceSide(c, W - 2.6, 3, B - 1, fc, pk);
  fenceRun(c, 2, W - 2, B, fc, pk);
};
function kennel(c, x, y, roofCol) {
  rf(c, x + .4, y + .6, 12, 9, 1, '#8a5a30'); rf(c, x, y, 12, 9, 1, '#e2b073');
  c.fillStyle = 'rgba(120,70,30,.35)'; for (let yy = y + 2.5; yy < y + 9; yy += 2.5) c.fillRect(x, yy, 12, .4);
  rr(c, x + 3.6, y + 3, 4.8, 6, [2.4, 2.4, 0, 0]); c.fillStyle = '#4a2e1e'; c.fill();
  poly(c, [x - 1.2, y + .8, x + 6, y - 6, x + 13.2, y + .8]); c.fillStyle = shade(roofCol, .7); c.fill();
  poly(c, [x - .6, y, x + 6, y - 6.4, x + 12.6, y]); c.fillStyle = roofCol; c.fill();
  line(c, x + 1.2, y - .6, x + 6, y - 5.2, .5, 'rgba(255,255,255,.4)');
  rf(c, x + 3.4, y - 3.4, 5.2, 2, .6, '#fff4dc'); pinkHeart(c, x + 6, y - 2.4);
}
function slide(c, x, y) {
  poly(c, [x + 3, y - 10, x + 7, y - 10, x + 15, y + 2, x + 11, y + 2]); c.fillStyle = '#e8a020'; c.fill();
  poly(c, [x + 3.6, y - 9.6, x + 6.6, y - 9.6, x + 14, y + 1.4, x + 11.6, y + 1.4]); c.fillStyle = lg(c, x, y - 10, x + 14, y + 2, '#ffe066', '#ffc83a'); c.fill();
  line(c, x + 1, y + 2, x + 2, y - 11, 1, '#5b8fd6'); line(c, x + 5, y + 2, x + 6, y - 11, 1, '#5b8fd6');
  for (let yy = y - 8; yy < y + 2; yy += 2.6) line(c, x + 1.3, yy, x + 5.3, yy, .7, '#7ab0f0');
  rf(c, x + 1, y - 12, 6, 2, .8, '#ff6b5a');
}
function tent(c, x, y, w) {
  poly(c, [x, y, x + w / 2, y - 14, x + w, y]); c.fillStyle = '#d04a6a'; c.fill();
  c.save(); poly(c, [x + .4, y - .4, x + w / 2, y - 13.6, x + w - .4, y - .4]); c.clip();
  for (let i = -2; i < 6; i++) { c.fillStyle = i % 2 ? '#ff8ab0' : '#fff4f8'; poly(c, [x + w / 2, y - 14, x + i * w / 4, y, x + (i + 1) * w / 4, y]); c.fill(); }
  c.restore();
  poly(c, [x + w / 2 - 2.6, y, x + w / 2, y - 6, x + w / 2 + 2.6, y]); c.fillStyle = '#6a2a40'; c.fill();
  line(c, x + w / 2, y - 14, x + w / 2, y - 17, .5, '#8a6a4a'); poly(c, [x + w / 2, y - 17, x + w / 2 + 3, y - 16.2, x + w / 2, y - 15.4]); c.fillStyle = '#ffd23a'; c.fill();
}
function ball(c, x, y, col) {
  softShadow(c, x + .6, y + 2.4, 2.8, .9, .3);
  el(c, x, y, 2.5, 2.5, shade(col, .65)); el(c, x - .1, y - .1, 2.3, 2.3, col);
  c.save(); c.beginPath(); c.arc(x - .1, y - .1, 2.3, 0, TAU); c.clip(); c.fillStyle = '#ffffff'; c.fillRect(x - 3, y - .6, 6, 1); c.restore();
  el(c, x - .9, y - 1, .7, .45, 'rgba(255,255,255,.8)');
}
function blocks(c, x, y) {
  const b = (bx, by, col, ch) => { rf(c, bx + .3, by + .5, 4, 4, .6, shade(col, .6)); rf(c, bx, by, 4, 4, .6, col); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(bx + 1.6, by + 1, .8, 2); c.fillRect(bx + 1, by + 1.6, 2, .8); };
  b(x, y - 4, '#ff7a5a'); b(x + 4.4, y - 4, '#5bbcf0'); b(x + 2.2, y - 8.2, '#ffd23a');
}
FX.nursery = (ctx, lvl, x, y, W, H, t, o, ph) => {
  if (lvl !== 3) return;
  const cols = ['#ff6e8e', '#ffd23a', '#7ab0f0'];
  for (let k = 0; k < 3; k++) {
    const bx = x + 4 + k * 2.6 + Math.sin(t / 40 + k * 2) * 1.2, by = y - 12 - k * 2.2 + Math.sin(t / 33 + k) * 1.2;
    ctx.strokeStyle = 'rgba(90,80,90,.6)'; ctx.lineWidth = .3; ctx.beginPath(); ctx.moveTo(x + 2.6, y + 1); ctx.quadraticCurveTo(bx - 1, by + 6, bx, by + 3); ctx.stroke();
    ctx.drawImage(balloonImg(cols[k]), bx - 2.4, by - 3, 4.8, 6.4);
  }
};
const balloonImg = col => make('balloon' + col, 0, 0, 4.8, 6.4, c => { el(c, 2.4, 2.8, 2.2, 2.7, shade(col, .75)); el(c, 2.3, 2.6, 2.05, 2.5, col); el(c, 1.6, 1.7, .6, .8, 'rgba(255,255,255,.7)'); poly(c, [1.9, 5.3, 2.9, 5.3, 2.4, 6]); c.fillStyle = shade(col, .75); c.fill(); });

// Barn: red with white trim and a hayloft; grows a lean-to, then a silo and cupola.
function barnBody(c, x0, x1, top, base, sc) {
  const w = x1 - x0, cx = (x0 + x1) / 2, sh = top + (base - top) * .3, kn = top + (base - top) * .08;
  const outline = [x0, base, x0, sh, x0 + w * .2, kn, cx, top, x1 - w * .2, kn, x1, sh, x1, base];
  c.save(); c.translate(.5, 1); poly(c, outline); c.fillStyle = '#7a2420'; c.fill(); c.restore();
  poly(c, outline); c.fillStyle = lg(c, 0, top, 0, base, '#ee5a4e', '#d8443a'); c.fill();
  c.save(); poly(c, outline); c.clip();
  for (let xx = x0 + 3; xx < x1; xx += 3.4) { line(c, xx, top, xx, base, .45, 'rgba(110,20,20,.4)'); line(c, xx + .5, top, xx + .5, base, .3, 'rgba(255,200,190,.3)'); }
  c.fillStyle = lg(c, x1 - 8, 0, x1, 0, 'rgba(60,0,10,0)', 'rgba(60,0,10,.2)'); c.fillRect(x1 - 8, top, 8, base - top);
  c.fillStyle = lg(c, x0, 0, x0 + 5, 0, 'rgba(255,255,255,.18)', 'rgba(255,255,255,0)'); c.fillRect(x0, top, 5, base - top);
  c.restore();
  // roof edge (dark shingles) with a white trim line inside
  c.lineJoin = 'round';
  const edge = [x0 - 2, sh + 2, x0 + w * .2 - 1, kn - 1, cx, top - 2, x1 - w * .2 + 1, kn - 1, x1 + 2, sh + 2];
  const pl = () => { c.beginPath(); c.moveTo(edge[0], edge[1]); for (let i = 2; i < edge.length; i += 2) c.lineTo(edge[i], edge[i + 1]); };
  c.lineWidth = 5.2 * sc; c.strokeStyle = '#3e3a4e'; pl(); c.stroke();
  c.lineWidth = 4 * sc; c.strokeStyle = '#6a6278'; pl(); c.stroke();
  c.lineWidth = .7; c.strokeStyle = '#9a92aa'; c.save(); c.translate(0, -1.2); pl(); c.stroke(); c.restore();
  c.lineWidth = 1.6; c.strokeStyle = '#ffffff'; c.beginPath(); c.moveTo(x0 + 1.2, sh + 3.6); c.lineTo(x0 + w * .2 + .4, kn + 2.6); c.lineTo(cx, top + 2.4); c.lineTo(x1 - w * .2 - .4, kn + 2.6); c.lineTo(x1 - 1.2, sh + 3.6); c.stroke();
  rf(c, x0, sh + 3.4, 1.6, base - sh - 3.4, .5, '#ffffff'); rf(c, x1 - 1.6, sh + 3.4, 1.6, base - sh - 3.4, .5, '#f0eaf0');
  rf(c, x0 - .6, base - 2.4, w + 1.2, 2.6, .8, '#8e889e');
  // hayloft
  const hw = w * .2, hy = top + (base - top) * .2, hh = (base - top) * .2;
  rf(c, cx - hw / 2 - 1.2, hy - 1.2, hw + 2.4, hh + 2.4, .8, '#ffffff'); rf(c, cx - hw / 2, hy, hw, hh, .4, '#4a2018');
  for (let i = 0; i < 7; i++) { const a = cx - hw / 2 + 1 + i * (hw - 2) / 6; line(c, a, hy + hh - .5, a + (i % 2 ? 1 : -1), hy + hh * .35, .8, i % 2 ? '#ffe066' : '#e8b84a'); }
  line(c, cx, hy - 1.2, cx, hy - 3.8, 1, '#5a5a6c'); el(c, cx, hy - 3.6, 1.2, .6, '#5a5a6c');
  // big X doors
  const dw = w * .46, dy = base - (base - top) * .42;
  rf(c, cx - dw / 2 - 1.2, dy - 1.2, dw + 2.4, base - dy + 1, [1, 1, 0, 0], '#ffffff');
  rr(c, cx - dw / 2, dy, dw, base - dy - .2, .4); c.fillStyle = '#c23a32'; c.fill();
  for (const s of [-1, 1]) {
    const ax = cx + (s < 0 ? -dw / 2 : 0), aw = dw / 2;
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.3; c.strokeRect(ax + .9, dy + .9, aw - 1.8, base - dy - 2);
    c.beginPath(); c.moveTo(ax + 1, dy + 1); c.lineTo(ax + aw - 1, base - 1.2); c.moveTo(ax + aw - 1, dy + 1); c.lineTo(ax + 1, base - 1.2); c.stroke();
  }
  line(c, cx, dy, cx, base, .6, '#7a2420');
}
P.barn = (c, lvl, W, H, o) => {
  const B = H - 1.5;
  baseShadow(c, 3, W - 3, H, .3);
  if (lvl === 1) { barnBody(c, 6, W - 6, -16, B, 1); hayBale(c, W - 12, B - 6, 8, 5.6); }
  else if (lvl === 2) {
    // lean-to on the right
    wall(c, W - 24, 14, W - 4, B, 'plank', '#d8443a');
    roof(c, W - 24, W - 4, 6, 17, '#6a6278', { style: 'shake', ov: 2, ins: 0 });
    windowAt(c, W - 16, 23, 7, 6, '#ffffff');
    barnBody(c, 4, W - 22, -20, B, 1.1);
    // weather vane
    const vx = (4 + W - 22) / 2; line(c, vx, -22, vx, -26, .7, '#4a4a5c'); poly(c, [vx - 3.6, -25.6, vx + 3, -25.6, vx + 3.6, -24.6, vx - 2.8, -24.8]); c.fillStyle = '#4a4a5c'; c.fill();
    hayBale(c, W - 13, B - 6, 8, 5.6); hayBale(c, W - 9.6, B - 10.8, 6.4, 5);
  } else {
    // silo on the right
    const sx = W - 21, sw = 17;
    rr(c, sx + .4, -10, sw, B + 10.5, 1.4); c.fillStyle = '#5a6278'; c.fill();
    rr(c, sx, -10, sw, B + 10, 1.4); c.fillStyle = lg(c, sx, 0, sx + sw, 0, '#d8dce8', '#b4bccc', '#8a92a8'); c.fill();
    for (let yy = -6; yy < B; yy += 4) { c.fillStyle = 'rgba(70,80,100,.35)'; c.fillRect(sx, yy, sw, .5); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(sx, yy + .5, sw, .35); }
    c.beginPath(); c.moveTo(sx - 1, -9.6); c.quadraticCurveTo(sx + sw / 2, -27, sx + sw + 1, -9.6); c.closePath(); c.fillStyle = '#b0302a'; c.fill();
    c.beginPath(); c.moveTo(sx - .4, -10); c.quadraticCurveTo(sx + sw / 2, -26, sx + sw + .4, -10); c.closePath(); c.fillStyle = lg(c, sx, -20, sx + sw, -10, '#ff7a6a', '#d8443a'); c.fill();
    rf(c, sx - 1, -11, sw + 2, 2, .8, '#ffffff');
    for (let yy = -6; yy < B - 4; yy += 2.4) line(c, sx + sw - 3, yy, sx + sw - 1, yy, .5, '#5a6278');
    barnBody(c, 3, W - 20, -22, B, 1.2);
    // cupola
    const cx = (3 + W - 20) / 2;
    rf(c, cx - 4, -27, 8, 6, [.6, .6, 0, 0], '#ffffff'); rf(c, cx - 2.6, -25.6, 5.2, 3.6, .3, '#4a2018'); line(c, cx, -25.6, cx, -22, .5, '#ffffff');
    poly(c, [cx - 5.4, -26.4, cx, -30, cx + 5.4, -26.4]); c.fillStyle = '#6a6278'; c.fill();
    hayBale(c, 2, B - 6, 8, 5.6); hayBale(c, W - 30, B - 6, 8, 5.6); hayBale(c, W - 27, B - 10.8, 6.4, 5);
  }
};

// Healing station: a pink-canopy booth, then a clinic, then a spa with a hot spring.
P.station = (c, lvl, W, H, o) => {
  const B = H - 1.5;
  baseShadow(c, 2, W - 2, H, .26);
  if (lvl === 1) {
    rf(c, 3, -2, 2, B - 2, .8, '#e4d6dc'); rf(c, W - 5, -2, 2, B - 2, .8, '#d6c6ce');
    rf(c, 5, 2, W - 10, 14, .8, '#fff0f4');
    awning(c, 2, W - 2, -3, 6, '#ff6b8a', '#ffffff');
    pinkCross(c, W / 2, -13, 5.4);
    rr(c, 3, 14, W - 6, B - 14, [1.2, 1.2, .8, .8]); c.fillStyle = lg(c, 0, 14, 0, B, '#ffffff', '#f0dfe6'); c.fill();
    rf(c, 2.4, 12.6, W - 4.8, 3, 1.2, '#ffd6e2'); c.fillStyle = '#ffffff'; c.fillRect(3, 12.8, W - 6, .6);
    c.fillStyle = '#ff8aa8'; c.fillRect(3, B - 6, W - 6, 1.2);
    pinkCross(c, W / 2, B - 9.5, 2.6, '#fff0f4');
    for (const [bx, col] of [[8, '#ff6b8a'], [11.5, '#7ad8ea'], [W - 10, '#ffd23a']]) { rf(c, bx - 1.1, 8.6, 2.2, 4.2, .6, col); rf(c, bx - .6, 7.6, 1.2, 1.2, .2, '#e8e8f0'); el(c, bx - .4, 10, .3, 1, 'rgba(255,255,255,.7)'); }
  } else if (lvl === 2) {
    wall(c, 4, 8, W - 4, B, 'plaster', '#fff6f8', { trim: '#ffc6d6' });
    roof(c, 4, W - 4, -14, 11, '#ff7e9e', { style: 'tile', ov: 3, ins: 5 });
    pinkCross(c, W / 2, -6, 5);
    awning(c, W / 2 - 9, W / 2 + 9, 13, 4.4, '#ff6b8a', '#ffffff');
    doorAt(c, W / 2, B, 10, 13, '#9ad8f0', { glass: true, double: true });
    windowAt(c, 7, 19, 7, 7, '#ffffff'); windowAt(c, W - 14, 19, 7, 7, '#ffffff');
    hedge(c, 4, 10, B + .4, 4, ['#ff9ec0']); hedge(c, W - 10, W - 4, B + .4, 4, ['#ffffff']);
  } else {
    wall(c, 4, 4, W - 4, 30, 'plaster', '#fff6f8', { trim: '#ffc6d6' });
    // dome roof
    c.beginPath(); c.moveTo(2, 8); c.bezierCurveTo(2, -20, W - 2, -20, W - 2, 8); c.closePath(); c.fillStyle = '#c84a6e'; c.save(); c.translate(.3, .8); c.fill(); c.restore();
    c.fillStyle = lg(c, 0, -14, 0, 8, '#ffb0c6', '#ff7e9e', '#e85a80'); c.fill();
    c.save(); c.clip(); for (let xx = 6; xx < W; xx += 6) line(c, xx, 8, W / 2 + (xx - W / 2) * .3, -16, .5, 'rgba(160,40,80,.3)'); el(c, 14, -6, 5, 3, 'rgba(255,255,255,.35)'); c.restore();
    rf(c, 1.4, 6, W - 2.8, 2.6, 1.2, '#e85a80'); c.fillStyle = '#ffd0dc'; c.fillRect(2, 6.2, W - 4, .5);
    pinkCross(c, W / 2, -5, 5.6);
    doorAt(c, W / 2, 30, 9, 11, '#9ad8f0', { glass: true, double: true, arch: true });
    windowAt(c, 7, 14, 6, 8, '#ffffff', { arch: true }); windowAt(c, W - 13, 14, 6, 8, '#ffffff', { arch: true });
    // hot spring pool in front
    rr(c, 3, 31, W - 6, B - 31, 6); c.fillStyle = '#9a94a8'; c.fill();
    rr(c, 4, 31.4, W - 8, B - 32.4, 5.4); c.fillStyle = '#dcd6e4'; c.fill();
    rr(c, 6, 33.2, W - 12, B - 35.6, 4); c.fillStyle = lg(c, 0, 33, 0, B - 2, '#5cc6e2', '#9ae6ec'); c.fill();
    el(c, 14, 36, 4, .9, 'rgba(255,255,255,.6)'); el(c, W - 16, 40, 3, .7, 'rgba(255,255,255,.5)');
    for (const [rx, ry] of [[5, 32.5], [W - 6, 33], [W / 2, B - 1.6]]) { el(c, rx, ry, 1.8, 1.2, '#b0aac0'); el(c, rx - .3, ry - .3, 1.3, .8, '#e8e4f0'); }
  }
};
FX.station = (ctx, lvl, x, y, W, H, t, o, ph) => {
  const cy = lvl === 1 ? -13 : lvl === 2 ? -6 : -5;
  glow(ctx, x + W / 2, y + cy, 9, '#ff9ab8', .35 + .15 * Math.sin(t / 25 + ph));
  if (lvl === 3) for (let k = 0; k < 4; k++) {
    const f = (t / 140 + k / 4 + ph) % 1, s = 4 + f * 6;
    ctx.globalAlpha = (1 - f) * .45 * Math.min(1, f * 5);
    ctx.drawImage(puffSprite('#ffffff'), x + 10 + k * 7.5 + Math.sin(t / 40 + k * 2) * 2 - s / 2, y + H - 9 - f * 14 - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
};

// Refinery: a stone kiln with a chimney and pipes; Mk II adds a brick chamber, Mk III is a little brick works.
function kiln(c, cx, base, r, h) {
  const top = base - h;
  c.beginPath(); c.moveTo(cx - r, base); c.lineTo(cx - r, top + r * .8); c.quadraticCurveTo(cx - r, top, cx, top); c.quadraticCurveTo(cx + r, top, cx + r, top + r * .8); c.lineTo(cx + r, base); c.closePath();
  c.fillStyle = '#5e566c'; c.save(); c.translate(.5, .8); c.fill(); c.restore();
  c.fillStyle = lg(c, cx - r, 0, cx + r, 0, '#d4ccc0', '#bab0a4', '#8e8478'); c.fill();
  c.save(); c.clip();
  const R = rng(r * 13 + h);
  for (let yy = top + 2, row = 0; yy < base; yy += 4.2, row++) for (let xx = cx - r - (row % 2) * 2.5; xx < cx + r; xx += 5) { rr(c, xx + .3, yy + .3, 4.4, 3.6, 1.4); c.fillStyle = rgba(shade('#cfc6b8', .9 + R() * .2), .9); c.fill(); c.fillStyle = 'rgba(80,60,60,.25)'; c.fillRect(xx + .3, yy + 3.6, 4.4, .5); }
  c.fillStyle = lg(c, cx + r * .3, 0, cx + r, 0, 'rgba(40,20,30,0)', 'rgba(40,20,30,.22)'); c.fillRect(cx, top, r, h);
  el(c, cx - r * .45, top + r * .55, r * .3, r * .2, 'rgba(255,255,255,.3)');
  c.restore();
  // furnace mouth
  const mw = r * .9, mh = h * .38;
  rr(c, cx - mw / 2 - 1.4, base - mh - 1.4, mw + 2.8, mh + 1.4, [mw / 2 + 1.4, mw / 2 + 1.4, 0, 0]); c.fillStyle = '#8a5a4a'; c.fill();
  rr(c, cx - mw / 2, base - mh, mw, mh, [mw / 2, mw / 2, 0, 0]); c.fillStyle = rgr(c, cx, base, mh * 1.2, '#5a2a1a', '#2a1418', '#1a1018'); c.fill();
  for (let i = 0; i < 4; i++) el(c, cx - mw / 3 + i * mw / 4.5, base - 1.2, 1.3, .8, '#4a3a3a');
}
function pipe(c, pts, col, wdt) {
  col = col || '#d08a4a'; wdt = wdt || 2.2;
  const pl = () => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); };
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.lineWidth = wdt + .8; c.strokeStyle = shade(col, .5); pl(); c.stroke();
  c.lineWidth = wdt; c.strokeStyle = col; pl(); c.stroke();
  c.lineWidth = wdt * .3; c.strokeStyle = rgba(shade(col, 1.5), .8); c.save(); c.translate(-wdt * .2, -wdt * .2); pl(); c.stroke(); c.restore();
  for (let i = 2; i < pts.length - 2; i += 2) el(c, pts[i], pts[i + 1], wdt * .75, wdt * .75, shade(col, .8));
}
function tank(c, x, y, w, h, col) {
  rr(c, x + .4, y + .6, w, h, w * .4); c.fillStyle = shade(col, .5); c.fill();
  rr(c, x, y, w, h, w * .4); c.fillStyle = lg(c, x, 0, x + w, 0, shade(col, 1.3), col, shade(col, .7)); c.fill();
  c.fillStyle = rgba(shade(col, .6), .6); c.fillRect(x, y + h * .3, w, .6); c.fillRect(x, y + h * .72, w, .6);
  el(c, x + w / 2, y + h * .5, 2, 2, '#4a4a5c'); el(c, x + w / 2, y + h * .5, 1.5, 1.5, '#f4f4f8'); line(c, x + w / 2, y + h * .5, x + w / 2 + .9, y + h * .5 - .9, .4, '#e8423e');
}
function coal(c, x, y, w) { for (let i = 0; i < 7; i++) { const a = x + (i % 4) * w / 4 + (i > 3 ? w / 8 : 0), b = y - (i > 3 ? 1.6 : 0); el(c, a + 1, b, 1.5, 1.2, '#2a2a36'); el(c, a + .7, b - .4, .6, .4, '#6a6a80'); } }
P.refinery = (c, lvl, W, H, o) => {
  const B = H - 1.5;
  baseShadow(c, 3, W - 3, H, .3);
  if (lvl === 1) {
    chimney(c, W - 15, -24, B - 10, '#b8634e');
    pipe(c, [W - 18, 14, W - 15, 14]);
    kiln(c, 18, B, 15, 34);
    coal(c, W - 14, B - 2, 10);
    rf(c, W - 15, B - 12, 10, 6, 1, '#9a6234'); for (let i = 0; i < 3; i++) { el(c, W - 13 + i * 3, B - 13, 1.4, 1.4, '#7a4c2a'); el(c, W - 13 + i * 3, B - 13.2, 1.1, 1.1, '#e8bf86'); }
  } else if (lvl === 2) {
    chimney(c, 30, -24, 12, '#a8584a');
    wall(c, W - 30, 6, W - 4, B, 'brick', '#d0745a');
    roof(c, W - 30, W - 4, -2, 9, '#6a7080', { style: 'metal', ov: 2, ins: 1 });
    rr(c, W - 24, 18, 14, 10, 1); c.fillStyle = '#3a2a2a'; c.fill(); rr(c, W - 22.6, 19.4, 11.2, 7.2, .6); c.fillStyle = rgr(c, W - 17, 26, 8, '#6a2a1a', '#2a1418'); c.fill();
    pipe(c, [24, 6, 30, 6, 30, 2]); pipe(c, [W - 30, 22, W - 34, 22, W - 34, 10, 34, 10], '#d08a4a', 1.8);
    kiln(c, 16, B, 13, 32);
    tank(c, W - 10, 24, 6, B - 25, '#e0a050');
    coal(c, W - 28, B - 2, 10);
  } else {
    chimney(c, W - 20, -25, 4, '#a8584a'); rf(c, W - 21, -14, 8, 1.6, .5, '#ffffff'); rf(c, W - 21, -7, 8, 1.6, .5, '#e8423e');
    wall(c, 4, 12, W - 4, B, 'brick', '#d0745a');
    roof(c, 4, W - 4, -6, 15, '#5e6878', { style: 'metal', ov: 3, ins: 4 });
    for (const sx of [14, 30]) { rf(c, sx, -3, 8, 6, .6, '#a8d8f0'); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(sx + 1, -2.4, 2, 4.8); }   // skylights
    // furnace row
    for (let i = 0; i < 3; i++) { const fx = 10 + i * 13; rr(c, fx - 1, 24, 11, 9, [4, 4, 0, 0]); c.fillStyle = '#3a2a2a'; c.fill(); rr(c, fx, 25, 9, 8, [3.4, 3.4, 0, 0]); c.fillStyle = rgr(c, fx + 4.5, 33, 7, '#6a2a1a', '#2a1418'); c.fill(); }
    tank(c, 6, 36, 9, B - 37, '#e0a050'); tank(c, 17, 38, 8, B - 39, '#c87a40');
    pipe(c, [10.5, 36, 10.5, 34, 40, 34, W - 13, 34, W - 13, 4], '#d08a4a', 1.8);
    // conveyor with a crate and a plank stack
    rf(c, 28, B - 6, W - 32, 4, 1.4, '#4a4e5c'); for (let xx = 30; xx < W - 5; xx += 3) el(c, xx, B - 4, 1.1, 1.1, '#8a90a0');
    crate(c, 31, B - 12.6, 6.6);
    for (let i = 0; i < 3; i++) { rf(c, 43, B - 8 - i * 2.4, 14, 2.4, .5, i % 2 ? '#e8b878' : '#d8a060'); }
  }
};
FX.refinery = (ctx, lvl, x, y, W, H, t, o, ph) => {
  const B = H - 1.5, act = !!o.active;
  const mouths = lvl === 1 ? [[18, B - 5, 9]] : lvl === 2 ? [[16, B - 5, 8], [W - 17, 23, 8]] : [[14.5, 29, 6], [27.5, 29, 6], [40.5, 29, 6]];
  const fl = .7 + .2 * Math.sin(t / 6 + ph) + .1 * Math.sin(t / 2.7);
  for (const [mx, my, r] of mouths) {
    if (act) { glow(ctx, x + mx, y + my, r * 1.4, '#ff8a3a', fl); glow(ctx, x + mx, y + my + 1, r * .7, '#ffe070', fl * .9); }
    else glow(ctx, x + mx, y + my + 1.5, r * .7, '#ff6a2a', .25);
  }
  const chx = lvl === 1 ? W - 12 : lvl === 2 ? 33 : W - 17;
  if (act) { smoke(ctx, x + chx, y - 25, t * 1.4, ph, '#d8d4e0', 4, 1.3, 20); sparks(ctx, x + mouths[0][0], y + mouths[0][1], t, 3, 5); }
};

// Forge: a workbench, then a forge shed with a hearth and bellows, then a stone master forge with crystals.
P.forge = (c, lvl, W, H, o) => {
  const B = H - 1.5;
  baseShadow(c, 3, W - 3, H, .26);
  if (lvl === 1) {
    // pegboard with tools, on two posts
    for (const px of [5, 27]) { rf(c, px, -8, 2.2, B - 6, .6, '#6a4224'); }
    rf(c, 4, -14, 26, 16, 1.2, '#8a5a32'); rf(c, 5, -13, 24, 14, .8, '#d8a868');
    for (let yy = -11; yy < 0; yy += 3) for (let xx = 7; xx < 28; xx += 3) el(c, xx, yy, .3, .3, '#9a6a3c');
    line(c, 8, -11, 8, -3, 1, '#7a4a28'); rf(c, 6, -12, 4, 2, .5, '#6a6a80');   // hammer
    poly(c, [13, -11, 19, -11, 19, -7, 13, -5]); c.fillStyle = '#c4c8d4'; c.fill(); rf(c, 12, -11.6, 2.2, 4, .6, '#c0503e');   // saw
    line(c, 23, -11, 23, -3, 1, '#8a8aa2'); el(c, 23, -11.4, 1.6, 1.2, '#8a8aa2'); el(c, 23, -11.8, .8, .6, '#d8a868');   // wrench
    line(c, 27, -10, 27, -4, .8, '#e8b84a');
    // bench
    rf(c, 5, 6, 2.4, B - 6, .6, '#7a4a28'); rf(c, 26, 6, 2.4, B - 6, .6, '#7a4a28'); rf(c, 6, B - 6, 22, 1.6, .5, '#8a5a32');
    rr(c, 2, 0, 31, 8, 1.4); c.fillStyle = '#8a5a32'; c.fill(); rr(c, 2, -1, 31, 7, 1.4); c.fillStyle = lg(c, 0, -1, 0, 6, '#f0c48a', '#d8a060'); c.fill();
    c.fillStyle = 'rgba(120,70,30,.3)'; c.fillRect(2, 2, 31, .4);
    rf(c, 4, -4, 5, 4, .6, '#5a6070'); rf(c, 3, -5, 7, 1.4, .5, '#8a90a0');   // vice
    for (let i = 0; i < 3; i++) rf(c, 14 + i * 1.6, 1, 1.2, 3, .3, '#b8b8c8');   // nails
    rf(c, 20, 0, 8, 2.4, .6, '#e8b878');
    anvil(c, W - 7, B, .85);
  } else if (lvl === 2) {
    wall(c, 4, -4, W - 4, B - 10, 'brick', '#c8705a', { noBase: true });
    roof(c, 4, W - 4, -16, 2, '#7a5a4a', { style: 'shake', ov: 3, ins: 2 });
    chimney(c, 11, -25, -8, '#a8584a');
    rf(c, 3, B - 12, W - 6, 12, 1, '#8e889e'); rf(c, 3.5, B - 12, W - 7, 11.4, 1, '#bcb6c8');   // stone floor
    for (const px of [5, W - 5]) { rf(c, px - 1.6, -2, 3.2, B - 1, .8, '#7a4a28'); c.fillStyle = '#b07a48'; c.fillRect(px - 1.2, -2, .8, B - 2); }
    // hearth
    rr(c, 7, 6, 20, B - 8, [3, 3, 1, 1]); c.fillStyle = '#7a3a2e'; c.fill();
    rr(c, 8, 7, 18, B - 10, [2.6, 2.6, .8, .8]); c.fillStyle = lg(c, 0, 7, 0, B, '#d0745a', '#a8584a'); c.fill();
    rr(c, 11, 14, 12, 12, [6, 6, 0, 0]); c.fillStyle = '#2a1418'; c.fill(); coal(c, 11.5, 25.5, 11);
    // bellows
    poly(c, [27, 26, 36, 22, 36, 30]); c.fillStyle = '#8a4a2a'; c.fill(); poly(c, [27.6, 26, 35.4, 22.8, 35.4, 29.2]); c.fillStyle = '#c87a4a'; c.fill();
    line(c, 36, 22, 40, 20, 1, '#7a4a28'); line(c, 27, 26, 25, 26, 1.2, '#6a6a80');
    anvil(c, 46, B - 1, 1);
    barrel(c, W - 13, B - 13, 7, 11, '#8a6a4a'); el(c, W - 9.5, B - 12.2, 2.6, .7, '#5cc6e2');
    for (let i = 0; i < 3; i++) line(c, 40 + i * 4, 4, 40 + i * 4, 12, 1, ['#8a8aa2', '#7a4a28', '#c4c8d4'][i]);   // tools on wall
  } else {
    wall(c, 4, -6, W - 4, B - 10, 'stone', '#b8b4c8', { noBase: true });
    roof(c, 4, W - 4, -18, 0, '#4a4a6a', { style: 'slate', ov: 3, ins: 3 });
    chimney(c, W / 2 - 3, -26, -10, '#8a8aa2');
    rf(c, 3, B - 12, W - 6, 12, 1, '#7a7490'); rf(c, 3.5, B - 12, W - 7, 11.4, 1, '#a8a2bc');
    for (const px of [5, W - 5]) { rf(c, px - 1.8, -4, 3.6, B + 1, .8, '#5a5a74'); c.fillStyle = '#8a8aa8'; c.fillRect(px - 1.4, -4, .8, B); }
    // great hearth, crystal-lined
    const cx = W / 2;
    rr(c, cx - 14, 2, 28, B - 4, [6, 6, 1, 1]); c.fillStyle = '#4a4458'; c.fill();
    rr(c, cx - 13, 3, 26, B - 6, [5, 5, .8, .8]); c.fillStyle = lg(c, 0, 3, 0, B, '#a8a2bc', '#7a7490'); c.fill();
    rr(c, cx - 8, 11, 16, 15, [8, 8, 0, 0]); c.fillStyle = '#1e1428'; c.fill(); coal(c, cx - 7, 25.5, 14);
    for (const s of [-1, 1]) { const gx = cx + s * 11; poly(c, [gx - 2, 12, gx, 6, gx + 2, 12, gx, 16]); c.fillStyle = '#a888f0'; c.fill(); poly(c, [gx - 1.2, 12, gx, 7.4, gx, 15]); c.fillStyle = '#e4d8ff'; c.fill(); }
    // banner
    rf(c, 8, 2, 8, 12, .6, '#5a4ab0'); poly(c, [8, 14, 12, 11.6, 16, 14, 16, 16, 8, 16]); c.fillStyle = '#5a4ab0'; c.fill(); el(c, 12, 7.4, 2, 2, '#ffd23a'); anvilIcon(c, 12, 7.4);
    anvil(c, 14, B - 1, .95); anvil(c, W - 16, B - 1, 1.1);
    rf(c, W - 12, -2, 7, 14, .6, '#4a4458'); for (let i = 0; i < 3; i++) { line(c, W - 10.5 + i * 2.2, 0, W - 10.5 + i * 2.2, 9, .8, ['#c4c8d4', '#e8b84a', '#a888f0'][i]); }
  }
};
function anvilIcon(c, x, y) { c.fillStyle = '#5a4ab0'; c.fillRect(x - 1.2, y - .6, 2.4, .6); c.fillRect(x - .5, y, 1, .8); }
FX.forge = (ctx, lvl, x, y, W, H, t, o, ph) => {
  const B = H - 1.5, act = !!o.active;
  const fl = .7 + .2 * Math.sin(t / 5 + ph) + .1 * Math.sin(t / 2.3);
  if (lvl === 1) { if (act) { sparks(ctx, x + W - 7, y + B - 10, t, 5, 6); glow(ctx, x + W - 7, y + B - 10, 4, '#ffd27a', .5 + .3 * Math.sin(t / 3)); } return; }
  const hx = lvl === 2 ? 17 : W / 2, hy = lvl === 2 ? 22 : 21;
  glow(ctx, x + hx, y + hy, act ? 11 : 6, '#ff8a3a', act ? fl : .3);
  if (act) glow(ctx, x + hx, y + hy + 2, 5, '#ffe070', fl);
  if (lvl === 3) for (const s of [-1, 1]) glow(ctx, x + W / 2 + s * 11, y + 11, 5, '#b89aff', .35 + .2 * Math.sin(t / 20 + s + ph));
  if (act) {
    const ax = lvl === 2 ? 46 : W - 16;
    sparks(ctx, x + ax, y + B - 10, t, 5, 7);
    smoke(ctx, x + (lvl === 2 ? 14 : W / 2), y - (lvl === 2 ? 26 : 27), t * 1.3, ph, '#d8d4e0', 4, 1.2, 18);
  }
};

// Garage: roller doors (one, two, three) on a growing motor hall.
P.garage = (c, lvl, W, H, o) => {
  const B = H - 1.5;
  baseShadow(c, 3, W - 3, H, .3);
  const top = lvl === 3 ? 2 : 4, n = lvl, col = '#e4e8f0';
  rf(c, 4, B - 8, W - 8, 8, 0, '#a8acb8');   // apron
  wall(c, 4, top, W - 4, B, 'hplank', col, { trim: '#4f8ee6' });
  // flat roof with a parapet seen from above
  rr(c, 2.6, top - 18, W - 5.2, 19, 1.4); c.fillStyle = '#6a7080'; c.fill();
  rr(c, 3.6, top - 17, W - 7.2, 16.6, 1); c.fillStyle = lg(c, 0, top - 17, 0, top, '#9aa2b4', '#848c9e'); c.fill();
  c.fillStyle = 'rgba(60,64,80,.25)'; for (let xx = 10; xx < W - 6; xx += 8) c.fillRect(xx, top - 16.4, .5, 15.6);
  if (lvl >= 2) { rf(c, 10, top - 14, 8, 5, .6, '#c8ccd8'); rf(c, 11, top - 13, 6, 3, .4, '#7a8090'); }   // vent unit
  if (lvl === 3) for (const sx of [W / 2 - 14, W / 2 + 4]) { rf(c, sx, top - 14, 10, 9, .8, '#5a6070'); rf(c, sx + .8, top - 13.2, 8.4, 7.4, .6, '#a8d8f0'); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(sx + 1.6, top - 12.6, 2.2, 6.2); }
  rf(c, 2.6, top - 1.6, W - 5.2, 2.6, [0, 0, 1, 1], '#5a6070'); c.fillStyle = '#4f8ee6'; c.fillRect(3, top + 1, W - 6, 1.6);
  // doors
  const span = W - 12, dw = (span - (n - 1) * 3) / n, dTop = lvl === 3 ? 22 : 16;
  for (let i = 0; i < n; i++) { const dx0 = 6 + i * (dw + 3); rollerDoor(c, dx0 + 1, dx0 + dw - 1, dTop, B, i === 1 ? '#c8ccd8' : '#d4d8e2'); }
  if (lvl === 3) { // upper windows and a checker band
    for (let xx = 10; xx < W - 14; xx += 14) windowAt(c, xx, 7, 9, 6, '#5a6070', { cross: false });
    for (let xx = 5; xx < W - 5; xx += 2) { c.fillStyle = ((xx / 2) | 0) % 2 ? '#2a2a36' : '#ffffff'; c.fillRect(xx, 15.2, 2, 1.2); c.fillStyle = ((xx / 2) | 0) % 2 ? '#ffffff' : '#2a2a36'; c.fillRect(xx, 16.4, 2, 1.2); }
  } else lantern(c, W - 9, dTop - 6 + (lvl === 1 ? 0 : 0));
  if (lvl >= 2) { for (let i = 0; i < 3; i++) { el(c, W - 3.6, B - 2 - i * 2.4, 2.4, 1.4, '#2a2a36'); el(c, W - 3.6, B - 2.4 - i * 2.4, 1.1, .6, '#6a6a80'); } }
  if (lvl === 3) { rf(c, 1, B - 13, 5, 12, 1.2, '#e8423e'); rf(c, 1.8, B - 11.6, 3.4, 3, .5, '#ffffff'); line(c, 6, B - 10, 7.4, B - 6, .6, '#2a2a36'); }   // fuel pump
};
FX.garage = (ctx, lvl, x, y, W, H, t, o, ph) => { if (lvl < 3) glow(ctx, x + W - 6.5, y + 9.8, 5, '#ffd27a', .55 + .1 * Math.sin(t / 19 + ph)); };

// Helipad: a raised concrete pad with a painted H in a circle and blinking corner lights.
P.helipad = (c, lvl, W, H, o) => {
  softShadow(c, W / 2 + 2, H - 4, W / 2, 5, .25);
  rf(c, 2, 4, W - 4, H - 5, 4, '#6a6e7c');
  rr(c, 2, 2, W - 4, H - 6, 4); c.fillStyle = lg(c, 0, 2, W, H, '#c8ccd6', '#aeb2c0'); c.fill();
  c.strokeStyle = 'rgba(120,124,140,.4)'; c.lineWidth = .4; for (let i = 1; i < 3; i++) { line(c, 2 + i * (W - 4) / 3, 2, 2 + i * (W - 4) / 3, H - 4, .4, 'rgba(120,124,140,.4)'); line(c, 2, 2 + i * (H - 6) / 3, W - 2, 2 + i * (H - 6) / 3, .4, 'rgba(120,124,140,.4)'); }
  const cx = W / 2, cy = (H - 2) / 2, r = Math.min(W, H) / 2 - 6;
  c.lineWidth = 2.4; c.strokeStyle = '#f4c430'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
  c.lineWidth = .5; c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(cx, cy, r - .8, PI * 1.05, PI * 1.6); c.stroke();
  c.fillStyle = '#ffffff'; const s = r * .55; c.fillRect(cx - s, cy - s, s * .45, s * 2); c.fillRect(cx + s * .55, cy - s, s * .45, s * 2); c.fillRect(cx - s, cy - s * .2, s * 2, s * .4);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(2.6, 2.6, W - 5.2, .6);
  // windsock
  line(c, W - 4.5, 3, W - 4.5, -14, .8, '#8a8aa2');
  poly(c, [W - 4.5, -14, W - 13, -12.4, W - 12.6, -10.4, W - 4.5, -10.6]); c.fillStyle = '#ff6a3a'; c.fill();
  c.fillStyle = '#ffffff'; poly(c, [W - 7.2, -13.6, W - 9.6, -13, W - 9.4, -10.6, W - 7.2, -10.6]); c.fill();
  for (const [lx, ly] of [[5, 5], [W - 5, 5], [5, H - 7], [W - 5, H - 7]]) { el(c, lx, ly + .4, 1.4, 1, '#4a4a5c'); el(c, lx, ly, 1.2, .9, '#8a8aa2'); }
};
FX.helipad = (ctx, lvl, x, y, W, H, t, o, ph) => {
  const on = ((t + ph * 60) % 80) < 40;
  for (const [lx, ly, col] of [[5, 5, '#ff5a5a'], [W - 5, 5, '#5aff8a'], [5, H - 7, '#5aff8a'], [W - 5, H - 7, '#ff5a5a']]) { if (on) glow(ctx, x + lx, y + ly, 3.5, col, .9); }
};

// Garden plot: tilled soil, rich soil in a wooden frame, a raised brick planter box.
function soilPaint(c, wet, rich) {
  const base = rich ? (wet ? '#4e3022' : '#6a4230') : (wet ? '#7a4c30' : '#a26c44'), rim = shade(base, .7);
  rf(c, 1, 1.4, 14, 13.8, 3, rim); rf(c, 1.2, 1, 13.6, 13.6, 3, base);
  c.save(); rr(c, 1.2, 1, 13.6, 13.6, 3); c.clip();
  for (const yy of [3.6, 8, 12.4]) { el(c, 8, yy + .7, 7.4, 1.4, rgba(shade(base, .7), .9)); el(c, 8, yy, 7, 1.2, shade(base, 1.18)); el(c, 6, yy - .4, 3.6, .4, rgba('#fff0d8', wet ? .35 : .22)); }
  const R = rng(rich ? 5 : 3);
  for (let i = 0; i < 8; i++) el(c, 2 + R() * 12, 2 + R() * 12, .35, .3, rgba(shade(base, .55), .8));
  if (wet) for (let i = 0; i < 3; i++) el(c, 3 + R() * 10, 3 + R() * 9, 1.4, .4, 'rgba(200,230,255,.35)');
  c.restore();
}
P.plot = (c, lvl, W, H, o) => {
  const wet = !!o.wet;
  if (lvl === 1) { softShadow(c, 8.6, 13.6, 7.4, 2, .15); soilPaint(c, wet, false); return; }
  if (lvl === 2) {
    rf(c, .2, .8, 15.6, 15, 1.6, '#6a4224');
    rf(c, .2, .2, 15.6, 15, 1.6, '#c08a52');
    c.fillStyle = '#e2b073'; c.fillRect(.8, .5, 14.4, .6);
    c.save(); c.translate(1.6, 1.6); c.scale(12.8 / 16, 11.8 / 16); soilPaint(c, wet, true); c.restore();
    for (const [nx, ny] of [[1.2, 1], [14.8, 1], [1.2, 14.2], [14.8, 14.2]]) el(c, nx, ny, .45, .45, '#7a7a8c');
    return;
  }
  // raised brick planter (self-watering): brick front face, soil on top, a copper tap
  softShadow(c, 9, 14.6, 7.6, 1.6, .25);
  rf(c, .4, -2, 15.2, 17.6, 1.6, '#7a3a2e');
  rr(c, .6, 7.8, 14.8, 7.4, [0, 0, 1.4, 1.4]); c.fillStyle = '#c8644e'; c.fill();
  c.save(); rr(c, .6, 7.8, 14.8, 7.4, [0, 0, 1.4, 1.4]); c.clip();
  for (let yy = 7.8, row = 0; yy < 15.2; yy += 2.4, row++) for (let xx = .6 - (row % 2) * 2; xx < 15.4; xx += 4) { rf(c, xx + .2, yy + .2, 3.6, 2, .4, row % 2 ? '#d8745a' : '#e0805e'); }
  c.restore();
  rf(c, .2, -2.4, 15.6, 3, 1.2, '#e0d4cc'); rf(c, .2, 5.6, 15.6, 2.6, .8, '#d8ccc4'); rf(c, .2, -2.4, 2.4, 10.6, .8, '#d8ccc4'); rf(c, 13.4, -2.4, 2.4, 10.6, .8, '#c8bcb4');
  c.fillStyle = '#f4ece6'; c.fillRect(.6, -2.2, 14.8, .5);
  rr(c, 2.6, .6, 10.8, 5, 1); c.fillStyle = '#4e3022'; c.fill();
  c.save(); rr(c, 2.6, .6, 10.8, 5, 1); c.clip(); for (const yy of [1.8, 4]) { el(c, 8, yy, 5.2, .7, '#6a4230'); } c.fillStyle = 'rgba(200,230,255,.3)'; c.fillRect(3, 1, 4, .4); c.restore();
  rf(c, 13.8, 9, 1.8, 3.4, .6, '#c87a40'); el(c, 14.7, 9.2, 1.2, .6, '#e0a050'); el(c, 14.7, 13, .5, .6, '#7ad0f0');
};
FX.plot = null;

// Sprinkler: a small metal riser; the super sprinkler is brass with a spinning arm.
P.sprinkler = (c, lvl, W, H, o) => {
  softShadow(c, 8.6, 13.4, 5, 1.6, .25);
  el(c, 8, 12.4, 5, 2.2, '#5a5a6c'); el(c, 8, 12, 4.6, 1.9, lvl === 1 ? '#9a9ab0' : '#b0884a'); el(c, 7, 11.5, 2, .6, 'rgba(255,255,255,.4)');
  const col = lvl === 1 ? '#a8acbc' : '#e0a850', dk = shade(col, .55);
  rf(c, 7, lvl === 1 ? 2 : -2, 2, lvl === 1 ? 10 : 14, .8, dk); c.fillStyle = lg(c, 7, 0, 9, 0, shade(col, 1.2), col, shade(col, .7)); c.fillRect(7.1, lvl === 1 ? 2 : -2, 1.8, lvl === 1 ? 9.6 : 13.6);
  if (lvl === 1) { rf(c, 5.4, .6, 5.2, 2.6, 1.2, '#6a6e80'); rf(c, 5.6, .3, 4.8, 2.2, 1.1, '#c8ccd8'); for (let i = 0; i < 3; i++) el(c, 6.6 + i * 1.4, 1.4, .3, .3, '#3a3a48'); }
  else { el(c, 8, -2.6, 3, 1.6, '#8a5a2a'); el(c, 8, -2.9, 2.6, 1.3, '#f0c060'); el(c, 7.2, -3.3, .9, .4, 'rgba(255,255,255,.7)'); rf(c, 6.2, 6, 3.6, 1.4, .5, '#5a90d0'); }
};
FX.sprinkler = (ctx, lvl, x, y, W, H, t, o, ph) => {
  if (lvl === 2) { const a = t / 18 + ph; ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = .9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 8 - Math.cos(a) * 4, y - 3 - Math.sin(a) * 1.6); ctx.lineTo(x + 8 + Math.cos(a) * 4, y - 3 + Math.sin(a) * 1.6); ctx.stroke(); el(ctx, x + 8 + Math.cos(a) * 4, y - 3 + Math.sin(a) * 1.6, .7, .5, '#f0c060'); }
  const cyc = (t + ph * 300) % 360; if (cyc > 90) return;
  const D = dropSprite(), hy = lvl === 1 ? 1 : -3, rad = lvl === 1 ? 7 : 10;
  for (let k = 0; k < 8; k++) {
    const f = ((cyc / 30) + k / 8) % 1, an = k / 8 * TAU + cyc / 40, d = f * rad;
    ctx.globalAlpha = Math.sin(f * PI) * .9;
    ctx.drawImage(D, x + 8 + Math.cos(an) * d - 1, y + hy + Math.sin(an) * d * .5 - Math.sin(f * PI) * 5 - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
};

// Well: a round stone well with a little shingle roof, rope and bucket.
P.well = (c, lvl, W, H, o) => {
  const cx = W / 2, B = H - 2;
  softShadow(c, cx + 2, B - 1, 13, 3.2, .3);
  for (const px of [cx - 11.5, cx + 9.5]) { rf(c, px + .3, -11, 2.4, 25, .6, '#6a4224'); rf(c, px, -11, 2.2, 24.6, .6, '#a8743f'); c.fillStyle = '#d8a060'; c.fillRect(px + .3, -11, .6, 24); }
  // stone cylinder
  rr(c, cx - 13, 12, 26, B - 12, [0, 0, 6, 6]); c.fillStyle = '#6a6480'; c.fill();
  c.save(); rr(c, cx - 12.4, 12, 24.8, B - 12.6, [0, 0, 5.4, 5.4]); c.clip();
  c.fillStyle = lg(c, cx - 13, 0, cx + 13, 0, '#d8d4e4', '#b8b2c8', '#8e88a4'); c.fillRect(cx - 13, 12, 26, B);
  const R = rng(9);
  for (let yy = 13, row = 0; yy < B; yy += 4.4, row++) for (let xx = cx - 14 - (row % 2) * 3; xx < cx + 13; xx += 6) { rr(c, xx + .3, yy + .3, 5.4, 3.8, 1.6); c.fillStyle = rgba(shade('#d0ccdc', .88 + R() * .2), .95); c.fill(); el(c, xx + 1.8, yy + 1.2, 1, .4, 'rgba(255,255,255,.45)'); }
  c.restore();
  el(c, cx, 12, 13, 5, '#8e88a4'); el(c, cx, 11.6, 12.6, 4.6, '#dcd8e8'); el(c, cx, 12, 9.6, 3.2, '#3a5a7a'); el(c, cx, 12.4, 8.6, 2.6, '#4a90c0'); el(c, cx - 3, 11.6, 3, .6, 'rgba(255,255,255,.5)');
  // crank, rope and bucket
  line(c, cx - 10, -4, cx + 10, -4, 1.4, '#7a4a28'); rf(c, cx - 3, -5.4, 6, 2.8, 1.2, '#a8743f');
  line(c, cx + 10, -4, cx + 12.6, -4, .9, '#6a6a80'); line(c, cx + 12.6, -4, cx + 12.6, -1.4, .9, '#6a6a80');
  line(c, cx, -3, cx, 3, .5, '#d8c090');
  rr(c, cx - 2.4, 3, 4.8, 4, [0, 0, 1.4, 1.4]); c.fillStyle = '#7a4a28'; c.fill(); rr(c, cx - 2, 3.2, 4, 3.4, [0, 0, 1.2, 1.2]); c.fillStyle = '#c08a52'; c.fill(); c.fillStyle = '#6a6a80'; c.fillRect(cx - 2.2, 4.4, 4.4, .5);
  roof(c, cx - 12, cx + 12, -21, -9, '#d8604f', { style: 'shake', ov: 2.6, ins: 3 });
};
FX.well = (ctx, lvl, x, y, W, H, t, o, ph) => {
  const k = (t + ph * 200) % 200; if (k > 50) return;
  ctx.globalAlpha = Math.sin(k / 50 * PI) * .7; ctx.drawImage(starSprite(), x + W / 2 + 2 - 2, y + 11 - 2, 4, 4); ctx.globalAlpha = 1;
};

// Greenhouse: white-framed glass walls and a glass roof with plants inside.
P.greenhouse = (c, lvl, W, H, o) => {
  const B = H - 1.5;
  baseShadow(c, 3, W - 3, H, .25);
  // interior seen through the glass
  rf(c, 5, 10, W - 10, B - 16, 0, '#d8f0e8');
  const R = rng(77);
  for (let i = 0; i < 9; i++) { const px = 10 + i * (W - 20) / 8, py = 30 + (i % 2) * 6; toonBlob(c, [[px, py, 3.6 + R() * 1.6], [px + 2, py + 1.6, 3]], LEAF); if (i % 3 === 0) for (let k = 0; k < 3; k++) el(c, px - 2 + k * 2, py - 1 + (k % 2), .9, .9, '#ff5a4a'); if (i % 3 === 1) el(c, px, py - 2, 1, 1, '#ffd23a'); }
  for (let i = 0; i < 5; i++) { const px = 12 + i * (W - 24) / 4; toonBlob(c, [[px, 17, 3.4], [px + 2.4, 16, 2.6]], ['#2a7040', '#3f9a50', '#5ab868', '#a4e48a']); }
  rf(c, 6, 40, W - 12, 4, 1, '#9a6234');   // planting bench
  // glass walls
  rr(c, 4, 8, W - 8, B - 8, 1); c.fillStyle = 'rgba(200,240,255,.35)'; c.fill();
  c.save(); rr(c, 4, 8, W - 8, B - 8, 1); c.clip();
  c.fillStyle = 'rgba(255,255,255,.35)'; for (let xx = -10; xx < W; xx += 16) { c.beginPath(); c.moveTo(xx, B); c.lineTo(xx + 14, 8); c.lineTo(xx + 19, 8); c.lineTo(xx + 5, B); c.fill(); }
  c.restore();
  c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
  for (let xx = 4; xx <= W - 4; xx += (W - 8) / 6) line(c, xx, 8, xx, B, 1.1, '#f4f8fb');
  line(c, 4, 28, W - 4, 28, 1, '#f4f8fb');
  rr(c, 4, 8, W - 8, B - 8, 1); c.strokeStyle = '#c8d4dc'; c.lineWidth = 1.4; c.stroke();
  // low brick base
  wall(c, 3, B - 8, W - 3, B, 'brick', '#d0745a', { noBase: true });
  // door
  rf(c, W / 2 - 7, 22, 14, B - 22, [1, 1, 0, 0], '#f4f8fb'); rr(c, W / 2 - 5.6, 23.4, 11.2, B - 23.4, .6); c.fillStyle = 'rgba(180,230,250,.6)'; c.fill(); line(c, W / 2, 23.4, W / 2, B, 1, '#f4f8fb');
  el(c, W / 2 - 1.6, 36, .5, .5, '#c8a040'); el(c, W / 2 + 1.6, 36, .5, .5, '#c8a040');
  roof(c, 4, W - 4, -18, 10, '#bfe8f4', { style: 'glass', ov: 2.6, ins: 6 });
  // potted plant by the door
  rf(c, W - 12, B - 7, 6, 6, [0, 0, 1.6, 1.6], '#d0745a'); toonBlob(c, [[W - 9, B - 9, 3.4]], LEAF); el(c, W - 9.6, B - 11, .9, .9, '#ff7eab');
};
FX.greenhouse = (ctx, lvl, x, y, W, H, t, o, ph) => {
  const k = (t + ph * 300) % 300; if (k > 60) return;
  const f = k / 60; ctx.save(); ctx.globalAlpha = Math.sin(f * PI) * .5; ctx.fillStyle = '#ffffff';
  const sx = x + 4 + f * (W - 8); ctx.beginPath(); ctx.moveTo(sx, y + H - 10); ctx.lineTo(sx + 8, y - 14); ctx.lineTo(sx + 11, y - 14); ctx.lineTo(sx + 3, y + H - 10); ctx.fill(); ctx.restore();
};

// Creature statue: a carved partner creature on a plinth.
P.statue = (c, lvl, W, H, o) => {
  softShadow(c, 9, 14.6, 7, 1.6, .3);
  rf(c, 1.6, 6, 12.8, 9.6, 1, '#6a6480');
  rr(c, 2, 5, 12, 10, 1); c.fillStyle = lg(c, 2, 0, 14, 0, '#e4e0ee', '#c4bed4', '#9a94b0'); c.fill();
  rf(c, 1, 3.6, 14, 2.6, 1, '#8e88a4'); rf(c, 1, 3.2, 14, 2.4, 1, '#e8e4f2');
  c.fillStyle = 'rgba(90,80,120,.3)'; c.fillRect(4, 8, 8, .5); c.fillRect(4, 10, 8, .5);
  el(c, 8, 11.6, 2, 1.1, '#c8a040'); el(c, 8, 11.4, 1.6, .8, '#ffe070');
  // carved creature: round body, big ears, curled tail
  const st = ['#6a6480', '#b4aec6', '#d8d4e4', '#f4f2fa'];
  c.lineWidth = 2.6; c.strokeStyle = st[0]; c.beginPath(); c.arc(12.6, -2.6, 3, PI * .6, PI * 1.9); c.stroke();
  c.lineWidth = 1.8; c.strokeStyle = st[1]; c.beginPath(); c.arc(12.6, -2.6, 3, PI * .6, PI * 1.9); c.stroke();
  toonBlob(c, [[8, -.8, 4.6]], st);
  poly(c, [4.2, -11, 3, -18.6, 7.4, -13]); c.fillStyle = st[0]; c.fill(); poly(c, [4.6, -11.4, 3.6, -17.6, 6.8, -13]); c.fillStyle = st[2]; c.fill();
  poly(c, [11.8, -11, 13, -18.6, 8.6, -13]); c.fillStyle = st[0]; c.fill(); poly(c, [11.4, -11.4, 12.4, -17.6, 9.2, -13]); c.fillStyle = st[1]; c.fill();
  toonBlob(c, [[8, -8.6, 4.4]], st);
  el(c, 6.4, -8.8, .55, .8, '#5a5470'); el(c, 9.6, -8.8, .55, .8, '#5a5470');
  c.strokeStyle = '#7a7490'; c.lineWidth = .4; c.beginPath(); c.arc(8, -7.2, .9, .2, PI - .2); c.stroke();
  el(c, 5.6, 2.6, 1.6, .9, st[1]); el(c, 10.4, 2.6, 1.6, .9, st[1]);
};
FX.statue = (ctx, lvl, x, y, W, H, t, o, ph) => twinkle(ctx, x + 11, y - 12, t, 260, 5, ph * 200);

// Bench: rot 0 faces down (2x1); rot 1 is a vertical bench seen from the side (1x2).
P.bench = (c, lvl, W, H, o) => {
  const wood = '#d8a060', dk = '#8a5a30';
  if (W >= H) {
    softShadow(c, W / 2 + 1.5, 14.4, W / 2 - 2, 1.8, .26);
    for (const lx of [4, W - 6]) { rf(c, lx, 7, 2, 7.4, .5, '#4a4a5c'); }
    for (let i = 0; i < 2; i++) { rf(c, 2, -6 + i * 3.4, W - 4, 2.8, 1, dk); rf(c, 2, -6.4 + i * 3.4, W - 4, 2.6, 1, wood); c.fillStyle = 'rgba(255,240,200,.5)'; c.fillRect(2.6, -6.2 + i * 3.4, W - 5.2, .4); }
    for (const px of [4.4, W - 5.4]) rf(c, px, -6, 1.6, 12, .5, '#4a4a5c');
    rf(c, 1.4, 4.4, W - 2.8, 4, 1.2, dk); rf(c, 1.4, 3.6, W - 2.8, 3.8, 1.2, wood); c.fillStyle = 'rgba(255,240,200,.5)'; c.fillRect(2, 3.9, W - 4, .5);
    line(c, 2, 5.6, W - 2, 5.6, .35, 'rgba(120,70,30,.4)');
    for (const ax of [2.2, W - 2.2]) { c.strokeStyle = '#3c3c4e'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax, 4); c.quadraticCurveTo(ax + (ax < W / 2 ? -1 : 1), 1, ax, -.6); c.stroke(); }
  } else {
    softShadow(c, 9, H - 2, 6, 3, .22);
    for (const ly of [5, H - 3]) rf(c, 4.4, ly, 7.2, 2, .6, '#4a4a5c');
    rf(c, 4, 1.4, 8.4, H - 4, 1.4, dk); rf(c, 4, 1, 8, H - 4.4, 1.4, wood);
    for (let yy = 3; yy < H - 4; yy += 3) line(c, 4.4, yy, 11.6, yy, .35, 'rgba(120,70,30,.4)');
    c.fillStyle = 'rgba(255,240,200,.5)'; c.fillRect(4.6, 1.4, .5, H - 5.4);
    rf(c, 1, -6, 3.6, H + 2, 1.2, dk); rf(c, 1, -6.6, 3.2, H + 1.8, 1.2, '#e8b070'); c.fillStyle = 'rgba(255,240,200,.6)'; c.fillRect(1.6, -6, .6, H);
    for (const py of [-2, H - 8]) rf(c, 2, py, 1.6, 6, .5, '#4a4a5c');
  }
};

// Flower box: a long wooden planter; flowers sway (drawn as a separate cached layer).
P.flowerbox = (c, lvl, W, H, o) => {
  if (W >= H) {
    softShadow(c, W / 2 + 1.5, 14.6, W / 2 - 1, 1.6, .26);
    rf(c, 1, 5, W - 2, 10.4, 1.4, '#7a4a28'); rr(c, 1, 4.6, W - 2, 10.4, 1.4); c.fillStyle = lg(c, 0, 5, 0, 15, '#d8a060', '#b07a44'); c.fill();
    for (let xx = 1 + (W - 2) / 4; xx < W - 1.5; xx += (W - 2) / 4) line(c, xx, 6.4, xx, 14.4, .4, 'rgba(110,60,20,.45)');
    rf(c, .4, 3.6, W - .8, 2.8, 1, '#e8b878'); c.fillStyle = '#fff0d0'; c.fillRect(1, 3.8, W - 2, .5);
    el(c, W / 2, 4.6, W / 2 - 2.6, 1.2, '#5a3a24');
  } else {
    softShadow(c, 9.4, H - 2, 6, 3, .24);
    rf(c, 2.6, 1.4, 10.8, H - 2.2, 1.4, '#7a4a28'); rr(c, 2.6, 1, 10.8, H - 2.6, 1.4); c.fillStyle = '#e8b878'; c.fill();
    rr(c, 4, 2.4, 8, H - 9.4, 1); c.fillStyle = '#5a3a24'; c.fill();
    rr(c, 2.6, H - 7.4, 10.8, 6.2, [0, 0, 1.4, 1.4]); c.fillStyle = lg(c, 0, H - 7, 0, H, '#d8a060', '#b07a44'); c.fill();
    c.fillStyle = '#fff0d0'; c.fillRect(3, 1.4, 10, .5);
  }
};
const FLOWER_COLS = ['#ff6e8e', '#ffd23a', '#c8a2ff', '#ffffff', '#ff9e5e'];
function flowerLayer(W, H) {
  const horiz = W >= H;
  return make('fbfl' + W + 'x' + H, -2, -10, W + 4, H + 10, c => {
    const R = rng(W * 3 + H);
    const pts = []; if (horiz) for (let i = 0; i < W / 3.6; i++) pts.push([3 + i * 3.6 + (R() - .5), 3.6 - R() * 5]);
    else for (let i = 0; i < H / 3.4; i++) pts.push([5 + (i % 2) * 5.6 + (R() - .5), 4 + i * 3.4 - 4]);
    for (const [px, py] of pts) { el(c, px, py + 2.4, 1.6, 1, '#4a9a36'); el(c, px + 1, py + 1.6, 1.2, .7, '#6fbf4a'); }
    pts.forEach(([px, py], i) => {
      const col = FLOWER_COLS[(i + (R() * 2 | 0)) % FLOWER_COLS.length];
      line(c, px, py + 3, px, py, .5, '#4a9a36');
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - PI / 2; el(c, px + Math.cos(a) * .95, py + Math.sin(a) * .85, .85, .8, col); }
      el(c, px, py, .55, .55, col === '#ffd23a' ? '#ff9a3a' : '#ffd23a');
    });
  });
}

// ---- Structure entry point ------------------------------------------------------------------------
function structImg(type, lvl, w, h, o) {
  const W = w * 16, H = h * 16, door = o.door ? o.door[0] + ',' + o.door[1] : '';
  const key = 'S' + type + lvl + '|' + w + 'x' + h + '|' + door + '|' + (o.wet ? 1 : 0);
  return make(key, -8, -RISE, W + 16, H + RISE, c => { c.save(); c.beginPath(); c.rect(-8, -RISE, W + 16, H + RISE); c.clip(); P[type](c, lvl, W, H, o); c.restore(); });
}
const rot1 = { bench: 1, flowerbox: 1 };

// ---- Crops ------------------------------------------------------------------------------------------
const CROP_PAL = { leaf: ['#2a7a30', '#47a83c', '#7fd05a'], wither: ['#6a4a2a', '#9a7444', '#c49a62'] };
const browned = col => mix(col, '#8a6a44', .72);
function leafShape(c, x, y, len, wid, ang, pal) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(wid, -len * .5, 0, -len); c.quadraticCurveTo(-wid, -len * .5, 0, 0); c.fillStyle = pal[0]; c.fill();
  c.beginPath(); c.moveTo(0, -.2); c.quadraticCurveTo(wid * .85, -len * .5, 0, -len + .3); c.quadraticCurveTo(-wid * .55, -len * .5, 0, -.2); c.fillStyle = pal[1]; c.fill();
  c.beginPath(); c.moveTo(-.1, -len * .2); c.quadraticCurveTo(-wid * .45, -len * .5, -.1, -len * .8); c.quadraticCurveTo(wid * .1, -len * .5, -.1, -len * .2); c.fillStyle = pal[2]; c.fill();
  c.restore();
}
function frond(c, x, y, len, ang, pal) {   // feathery carrot leaf
  c.save(); c.translate(x, y); c.rotate(ang);
  line(c, 0, 0, 0, -len, .45, pal[0]);
  for (let i = 1; i < 5; i++) { const yy = -len * i / 5; el(c, -.9, yy, .9, .45, pal[1]); el(c, .9, yy - .3, .9, .45, pal[1]); }
  el(c, 0, -len, .7, .9, pal[2]);
  c.restore();
}
function mushroom(c, x, y, s, cap, glowy) {
  rf(c, x - .8 * s, y - 3 * s, 1.6 * s, 3 * s, .7 * s, '#f4f0e0');
  c.beginPath(); c.moveTo(x - 3 * s, y - 2.6 * s); c.quadraticCurveTo(x - 3 * s, y - 6 * s, x, y - 6 * s); c.quadraticCurveTo(x + 3 * s, y - 6 * s, x + 3 * s, y - 2.6 * s); c.closePath();
  c.fillStyle = shade(cap, .6); c.save(); c.translate(.2, .4); c.fill(); c.restore(); c.fillStyle = lg(c, 0, y - 6 * s, 0, y - 2.6 * s, shade(cap, 1.35), cap); c.fill();
  for (const [a, b] of [[-1.4, -4.4], [.9, -4.9], [1.8, -3.4]]) el(c, x + a * s, y + b * s, .5 * s, .4 * s, glowy ? '#f4ffff' : rgba('#ffffff', .7));
}
function plant(c, id, stage, W) {
  const L = W ? CROP_PAL.wither : CROP_PAL.leaf, col = s => W ? browned(s) : s;
  const bx = 8, by = 12;
  if (W) { c.translate(bx, by); c.rotate(.12); c.scale(1, .82); c.translate(-bx, -by); }
  el(c, bx, by + .4, 3.2, 1.1, W ? '#6a4a30' : '#7a4c2c'); el(c, bx, by, 2.6, .8, W ? '#8a6a48' : '#a26c44');   // little mound at the stem
  if (stage === 1) {
    if (id === 'wheat') { for (const a of [-.35, 0, .35]) leafShape(c, bx, by, 6, .7, a, L); return; }
    if (id === 'glowcap') { mushroom(c, bx - 1.6, by, .45, col('#4ad8e0'), !W); mushroom(c, bx + 1.6, by + .4, .35, col('#4ad8e0'), !W); return; }
    if (id === 'carrot') { for (const a of [-.4, 0, .4]) frond(c, bx, by, 5, a, L); return; }
    if (id === 'pumpkin' || id === 'starmelon') { line(c, bx, by, bx, by - 3, .6, L[0]); el(c, bx - 2, by - 3.4, 2.2, 1.4, L[1]); el(c, bx + 2, by - 3.4, 2.2, 1.4, L[1]); el(c, bx - 2.4, by - 3.8, 1, .5, L[2]); if (id === 'starmelon' && !W) el(c, bx, by - 3.2, .6, .6, '#ffe070'); return; }
    line(c, bx, by, bx, by - 3.6, .6, L[0]); leafShape(c, bx, by - 2.8, 4, 1.6, -1, L); leafShape(c, bx, by - 2.8, 4, 1.6, 1, L); return;
  }
  const big = stage === 3;
  switch (id) {
    case 'turnip': {
      if (big) { el(c, bx, by - 1.4, 4, 3.4, col('#d8c8e0')); el(c, bx, by - 1.6, 3.7, 3.1, col('#fbf6f0')); c.save(); c.beginPath(); c.ellipse(bx, by - 1.6, 3.7, 3.1, 0, 0, TAU); c.clip(); el(c, bx, by - 4, 4.4, 2.4, col('#b45ad0')); c.restore(); el(c, bx - 1.4, by - 2.6, .9, .6, 'rgba(255,255,255,.7)'); }
      const n = big ? 5 : 4; for (let i = 0; i < n; i++) leafShape(c, bx, by - (big ? 4 : 1), big ? 8 : 6, 2.4, -.9 + i * 1.8 / (n - 1), L);
      if (!big) { el(c, bx, by - .4, 2, 1.2, col('#fbf6f0')); el(c, bx, by - 1, 1.6, .6, col('#c47ad8')); }
      break;
    }
    case 'carrot': {
      const n = big ? 7 : 5; for (let i = 0; i < n; i++) frond(c, bx, by - 1, big ? 9 : 7, -.8 + i * 1.6 / (n - 1), L);
      if (big) { el(c, bx, by - .6, 2.8, 1.8, col('#d85a1a')); el(c, bx, by - .9, 2.5, 1.5, col('#ff8a3a')); line(c, bx - 1.6, by - .8, bx + 1.6, by - .8, .35, rgba(col('#c04a10'), .6)); el(c, bx - 1, by - 1.6, .7, .4, 'rgba(255,255,255,.5)'); }
      break;
    }
    case 'wheat': {
      const stalk = big ? col('#d8a838') : L[1], ear = big ? col('#f4c84a') : L[2];
      for (let i = 0; i < 7; i++) {
        const sx = bx - 4.5 + i * 1.5, top = by - (big ? 15 : 11) + (i % 2) * 2, lean = (i - 3) * .45;
        c.lineWidth = .55; c.strokeStyle = stalk; c.beginPath(); c.moveTo(sx * .3 + bx * .7, by); c.quadraticCurveTo(sx, by - 5, sx + lean, top); c.stroke();
        for (let k = 0; k < 4; k++) { el(c, sx + lean - .55, top + k * 1.2, .6, .8, ear); el(c, sx + lean + .55, top + k * 1.2 + .5, .6, .8, ear); }
        el(c, sx + lean, top - .6, .45, .8, ear);
        if (big) line(c, sx + lean, top - 1, sx + lean + .3, top - 3, .25, col('#f8e08a'));
      }
      leafShape(c, bx, by, 5, .9, -.7, L); leafShape(c, bx, by, 5, .9, .7, L);
      break;
    }
    case 'tomato': case 'pepper': {
      if (id === 'tomato') { rf(c, bx + 2.6, by - (big ? 15 : 12), 1, big ? 16 : 13, .4, '#a8743f'); line(c, bx + 2.4, by - 7, bx + .4, by - 7, .4, '#e8d8a0'); }
      const h = big ? 12 : 9;
      line(c, bx, by, bx, by - h, .8, L[0]);
      for (let i = 0; i < 4; i++) { const yy = by - 2 - i * h / 4.5; leafShape(c, bx, yy, 4.6, 2, -1.2 + (i % 2) * .3, L); leafShape(c, bx, yy - 1, 4.6, 2, 1.2 - (i % 2) * .3, L); }
      leafShape(c, bx, by - h + 1, 4, 1.8, 0, L);
      if (id === 'tomato') {
        const fr = big ? [[bx - 3, by - 5, 2.1], [bx + 1.6, by - 8, 1.9], [bx - 2, by - 10, 1.7], [bx + 2.4, by - 3.6, 1.8]] : [[bx - 2.6, by - 5, 1.2], [bx + 1.8, by - 7.6, 1.1]];
        for (const [fx, fy, r] of fr) { el(c, fx, fy + .3, r + .2, r, col(big ? '#a8202a' : '#4a8a2a')); el(c, fx, fy, r, r * .92, col(big ? '#f2423e' : '#8ac850')); el(c, fx - r * .35, fy - r * .4, r * .3, r * .22, 'rgba(255,255,255,.75)'); el(c, fx, fy - r * .9, .7, .35, L[0]); }
        if (!big) { el(c, bx + 2, by - 10, .7, .7, col('#ffd23a')); }
      } else {
        const fr = big ? [[bx - 2.8, by - 5, '#e8302a'], [bx + 2.6, by - 7, '#ff9a1a'], [bx - 1.6, by - 9.6, '#ffd02a'], [bx + 2, by - 3.4, '#e8302a']] : [[bx - 2.6, by - 5, '#5aa83a'], [bx + 2.2, by - 7, '#5aa83a']];
        for (const [fx, fy, cc] of fr) { const s = big ? 1 : .7; rr(c, fx - 1.1 * s, fy - .6, 2.2 * s, 4.6 * s, [1 * s, 1 * s, 1.1 * s, 1.1 * s]); c.fillStyle = shade(col(cc), .7); c.fill(); rr(c, fx - .9 * s, fy - .6, 1.8 * s, 4.2 * s, [.9 * s, .9 * s, 1 * s, 1 * s]); c.fillStyle = col(cc); c.fill(); el(c, fx - .3, fy + .8, .3, 1, 'rgba(255,255,255,.6)'); line(c, fx, fy - .6, fx + .4, fy - 1.6, .6, L[0]); }
        if (!big) { el(c, bx - 1, by - 9.6, .7, .7, col('#ffffff')); el(c, bx + 1.4, by - 8.2, .6, .6, col('#ffffff')); }
      }
      break;
    }
    case 'glowcap': {
      const cap = col('#3ad0e0');
      if (big) { mushroom(c, bx - 3.4, by + .4, .7, cap, !W); mushroom(c, bx + 3.2, by + .2, .8, col('#5ab8f0'), !W); mushroom(c, bx, by - .6, 1.15, cap, !W); }
      else { mushroom(c, bx - 2, by, .6, cap, !W); mushroom(c, bx + 2, by + .3, .5, cap, !W); }
      for (let i = 0; i < 3; i++) el(c, bx - 4 + i * 4, by + .4, .9, .4, L[1]);
      break;
    }
    case 'pumpkin': case 'starmelon': {
      // vine with lobed leaves
      c.lineWidth = .6; c.strokeStyle = L[0]; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - 6, by - 3, bx - 6.6, by - 6); c.moveTo(bx, by); c.quadraticCurveTo(bx + 5, by - 1, bx + 6.4, by - 4); c.stroke();
      for (const [lx, ly, s] of [[bx - 5, by - 6, 1], [bx + 5.2, by - 5.6, .9], [bx - .6, by - 7.6, big ? 1.1 : .8]]) { toonBlob(c, [[lx, ly, 2.4 * s], [lx - 1.6 * s, ly + .8 * s, 1.6 * s], [lx + 1.6 * s, ly + .8 * s, 1.6 * s]], [L[0], L[1], L[1], L[2]]); line(c, lx, ly + 1.8 * s, lx, ly - 1.6 * s, .3, rgba(L[0], .8)); }
      c.lineWidth = .4; c.strokeStyle = L[1]; c.beginPath(); c.arc(bx + 6.6, by - 6.4, 1.2, 0, PI * 1.6); c.stroke();
      if (id === 'pumpkin') {
        if (big) {
          const pc = col('#ff8a1a');
          el(c, bx + .4, by - 1.6, 6.6, 4.6, shade(pc, .6));
          for (const [ox, r] of [[-3.6, 3], [3.6, 3], [-1.6, 3.6], [1.6, 3.6], [0, 3.8]]) { el(c, bx + ox, by - 2, r * .95, 4.3, shade(pc, ox === 0 ? 1.08 : .9)); }
          el(c, bx - 2.4, by - 4, 1.3, .8, 'rgba(255,255,255,.45)');
          rf(c, bx - .6, by - 7.6, 1.4, 2.8, .5, W ? '#6a4a2a' : '#6a8a2a');
        } else { el(c, bx + 1.4, by - 1.2, 2.4, 1.8, col('#6ab83a')); el(c, bx + .8, by - 1.8, .8, .5, 'rgba(255,255,255,.4)'); el(c, bx - 3, by - 3, 1, 1, col('#ffd23a')); }
      } else {
        if (big) {
          const mc = col('#5a4ac8');
          el(c, bx + .6, by - 1.4, 6.2, 4.6, shade(mc, .55)); el(c, bx, by - 1.8, 5.9, 4.3, mc);
          c.save(); c.beginPath(); c.ellipse(bx, by - 1.8, 5.9, 4.3, 0, 0, TAU); c.clip();
          for (const ox of [-3.4, 0, 3.4]) { c.lineWidth = .8; c.strokeStyle = rgba(col('#8a7af0'), .8); c.beginPath(); c.ellipse(bx + ox * .6, by - 1.8, Math.abs(ox) * .5 + .8, 4.3, 0, 0, TAU); c.stroke(); }
          el(c, bx - 2.4, by - 4, 2, 1.2, 'rgba(255,255,255,.35)');
          c.restore();
          if (!W) for (const [sx, sy, s] of [[bx - 2.6, by - 1.6, 1.1], [bx + 2.2, by - 3.2, .9], [bx + 1, by + .6, .8]]) star5(c, sx, sy, s, '#ffe070');
          rf(c, bx - .5, by - 7, 1.2, 2.4, .5, L[0]);
        } else { el(c, bx + 1.4, by - 1.2, 2.4, 1.9, col('#6a5ad8')); star5(c, bx + 1.4, by - 1.2, .6, col('#ffe070')); }
      }
      break;
    }
  }
}
function star5(c, x, y, s, col) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - PI / 2, r = i % 2 ? s * .45 : s; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fillStyle = col; c.fill(); }
const cropImg = (id, stage, W) => make('crop' + id + stage + (W ? 'w' : ''), -4, -16, 24, 32, c => plant(c, id, stage, W));
const moundImg = (id, W) => make('mound' + id + (W ? 'w' : ''), 0, 0, 16, 16, c => {
  softShadow(c, 8.6, 11.6, 4.6, 1.4, .25);
  el(c, 8, 10.4, 4.4, 2.4, W ? '#5a3c26' : '#6a4024'); el(c, 8, 9.8, 4, 2, W ? '#8a6a48' : '#a8744a'); el(c, 6.8, 9.2, 1.8, .6, 'rgba(255,230,190,.35)');
  const seed = { turnip: '#f4e8d8', carrot: '#ff9a4a', wheat: '#e8c060', tomato: '#ffd8a0', pepper: '#f0e090', glowcap: '#6ae8f0', pumpkin: '#fff0c0', starmelon: '#ffe070' }[id] || '#f0e0c0';
  for (const [a, b] of [[6.6, 9.6], [8.6, 9.2], [9.6, 10.4]]) el(c, a, b, .55, .4, W ? browned(seed) : seed);
  line(c, 5.4, 10.6, 10.6, 10.6, .35, 'rgba(70,40,20,.35)');
});
const wetImg = () => make('wetpatch', 0, 0, 16, 16, c => {
  rr(c, 1.6, 1.6, 12.8, 12.8, 3); c.fillStyle = rgr(c, 8, 8, 8.5, 'rgba(50,25,10,.36)', 'rgba(50,25,10,.3)', 'rgba(50,25,10,.08)'); c.fill();
  el(c, 5, 5, 1.6, .5, 'rgba(210,235,255,.4)'); el(c, 11, 10.6, 1.2, .4, 'rgba(210,235,255,.35)');
});
const soilImg = wet => make('soil' + (wet ? 'w' : ''), 0, 0, 16, 16, c => { softShadow(c, 8.6, 13.6, 7.4, 2, .15); soilPaint(c, wet, false); });

// ---- Public API -------------------------------------------------------------------------------------
const H = G.homeArt = G.homeArt || {};
H.structure = function (ctx, type, lvl, x, y, w, h, t, info) {
  info = info || {};
  if (!P[type]) return false;
  lvl = Math.max(1, lvl | 0 || 1);
  const o = { door: type === 'house' ? info.door || null : null, wet: !!(info.wet || (type === 'plot' && info.build && info.build.crop && info.build.crop.wet)), rot: info.rot | 0 };
  if (rot1[type] && o.rot === 1 && w > h) { const s = w; w = h; h = s; }
  if (type === 'plot') lvl = Math.min(lvl, 3);
  const W = w * 16, Hh = h * 16, img = structImg(type, lvl, w, h, o);
  ctx.drawImage(img, x - 8, y - RISE, W + 16, Hh + RISE);
  const ph = ((info.build && (info.build.x * 7 + info.build.y * 13)) || 0) % 97 / 97;
  if (type === 'flowerbox') {
    const k = Math.sin(t / 45 + ph * TAU) * .05, fl = flowerLayer(W, Hh), by = W >= Hh ? y + 5 : y + Hh - 8;
    ctx.save(); ctx.translate(0, by); ctx.transform(1, 0, k, 1, 0, 0); ctx.drawImage(fl, x - 2, y - 10 - by, W + 4, Hh + 10); ctx.restore();
  }
  const fx = FX[type]; if (fx) fx(ctx, lvl, x, y, W, Hh, t, Object.assign(o, { active: !!info.active }), ph);
  return true;
};
H.crop = function (ctx, cropId, stage, x, y, t, info) {
  info = info || {}; stage = Math.max(0, Math.min(3, stage | 0)); const W = !!info.withered;
  if (info.wet && !W) ctx.drawImage(wetImg(), x, y, 16, 16);
  if (stage === 0) { ctx.drawImage(moundImg(cropId, W), x, y, 16, 16); return; }
  const heavy = stage === 3 && (cropId === 'pumpkin' || cropId === 'starmelon');
  const k = W ? .01 * Math.sin(t / 70 + x * .3) : Math.sin(t / 38 + x * .21 + y * .13) * (heavy ? .025 : stage === 1 ? .05 : .08);
  ctx.save(); ctx.translate(x + 8, y + 12); ctx.transform(1, 0, k, 1, 0, 0);
  ctx.drawImage(cropImg(cropId, stage, W), -12, -28, 24, 32);
  ctx.restore();
  if (stage === 3 && !W) {
    const ph = (x * 13 + y * 7) & 255;
    if (cropId === 'glowcap') { glow(ctx, x + 8, y + 8, 8, '#6af0ff', .45 + .2 * Math.sin(t / 22 + ph)); }
    if (cropId === 'starmelon') { glow(ctx, x + 8, y + 10, 7, '#c8b8ff', .25 + .15 * Math.sin(t / 30 + ph)); twinkle(ctx, x + 4, y + 7, t, 70, 4.5, ph); twinkle(ctx, x + 12, y + 9, t, 90, 3.5, ph + 40); }
    const top = { wheat: -4, tomato: -1, pepper: 0, carrot: 2, turnip: 6, glowcap: 3, pumpkin: 5, starmelon: 5 }[cropId] || 2;
    twinkle(ctx, x + 12, y + top, t, 150, 5, ph * 3);
  }
};
H.soil = function (ctx, x, y, t, info) { ctx.drawImage(soilImg(!!(info && info.wet)), x, y, 16, 16); };
H.types = Object.keys(P);
})();
