// Turn-based battles: wild encounters, trainer fights, capturing, EXP, levelling and evolution.
(function () {
const G = globalThis.G;
let b = null;
const STRUGGLE = { name: 'Struggle', type: 'Normal', pow: 50, acc: 100, pp: 1, recoil: true };
const STAGE_TXT = { atk: 'ATTACK', def: 'DEFENSE', spa: 'SP. ATK', spd: 'SP. DEF', spe: 'SPEED' };
const rnd = n => G.rand(n);

function mkF(c) {
  return { c, stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, dispHp: c.hp, dispExp: null, ox: 0, oy: 0, alpha: 1, scale: 1, tint: null, hidden: true, participants: new Set(), sleep: 0 };
}
// The 3D actor for a fighter (js/c3d.js), or null for a 2D sprite. Side is fixed by which slot the fighter is in.
const act = f => { if (!f || !b || !G.c3d) return null; if (f.actor === undefined) { f.actor = G.c3d.actor(f.c.id, f === b.me ? 'back' : 'front'); if (f.actor) G.c3d.watch(f.actor); } return f.actor; };
const nm = f => f === b.me ? G.name(f.c) : (b.wild ? 'Wild ' : 'Foe ') + G.name(f.c);
const msg = (t, auto) => G.say(t, { auto: auto === undefined ? 36 : auto, style: 'dark' });
const mark = (id, k) => { G.state.dex[id] = Math.max(G.state.dex[id] || 0, k); }; // 1 seen, 2 caught
const expRatio = c => (c.exp - G.expFor(c.lvl)) / (G.expFor(c.lvl + 1) - G.expFor(c.lvl));
const speed = f => f.c.stats.spe * G.stageMult(f.stages.spe) * (f.c.status === 'par' ? .5 : 1);
const center = f => f === b.me ? [61, 74] : [182, 42];

// ---- Drawing --------------------------------------------------------------
// Backdrops, platforms, orb and particles are pre-rendered (G.kit.cache); per frame we blit them and
// animate drifting clouds, glows, idle bobbing, hit flashes, screen shake and type-coloured particles.
const K = G.kit;
function ell(ctx, x, y, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
function blob(x, cx, cy, r, col) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
const bgArt = {
  grass: () => K.cache('bbg-grass', 240, 160, x => {
    const R = G.mulberry(21), TAU = Math.PI * 2;
    const poly = (pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fillStyle = fill; x.fill(); };
    const ridge = (y0, amp, f, ph, fill, bottom) => { x.beginPath(); x.moveTo(0, bottom); for (let i = 0; i <= 240; i += 3) x.lineTo(i, y0 - Math.sin(i / f + ph) * amp - Math.sin(i / (f * .37) + ph * 2) * amp * .3); x.lineTo(240, bottom); x.closePath(); x.fillStyle = fill; x.fill(); };
    // sky, sun, soft rays
    x.fillStyle = K.lin(x, 0, 0, 0, 78, ['#3f96ee', '#7cc4ff', '#c4e8ff', '#fff2d2']); x.fillRect(0, 0, 240, 80);
    const sun = x.createRadialGradient(168, 6, 0, 168, 6, 90); sun.addColorStop(0, 'rgba(255,248,214,.95)'); sun.addColorStop(.18, 'rgba(255,240,190,.5)'); sun.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = sun; x.fillRect(0, 0, 240, 90);
    for (let i = 0; i < 7; i++) { const a0 = 1.9 + i * .13; x.fillStyle = 'rgba(255,250,220,.07)'; x.beginPath(); x.moveTo(168, 4); x.lineTo(168 + Math.cos(a0) * 200, 4 + Math.sin(a0) * 200); x.lineTo(168 + Math.cos(a0 + .05) * 200, 4 + Math.sin(a0 + .05) * 200); x.fill(); }
    // far blue mountains with haze
    ridge(50, 9, 26, 1, '#9db9e0', 80); ridge(56, 7, 19, 4, '#86a8d6', 80);
    // natural arch in the distance
    x.fillStyle = '#7f98c4'; x.beginPath(); x.moveTo(92, 66); x.lineTo(92, 40); x.quadraticCurveTo(100, 30, 112, 33); x.quadraticCurveTo(126, 36, 128, 46); x.lineTo(129, 66); x.lineTo(121, 66); x.lineTo(121, 50); x.quadraticCurveTo(116, 43, 108, 46); x.quadraticCurveTo(102, 49, 100, 56); x.lineTo(100, 66); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(92, 40, 36, 3);
    // tall cliff towers left and right, with moss tops, trees and a waterfall
    const tower = (cx, w, top, base, col, lit, dark) => {
      x.fillStyle = col; x.beginPath(); x.moveTo(cx - w / 2, base); x.lineTo(cx - w / 2 + 1, top + 5); x.quadraticCurveTo(cx - w / 2 + 3, top, cx - w / 5, top - 1); x.lineTo(cx + w / 4, top + 1); x.quadraticCurveTo(cx + w / 2, top + 2, cx + w / 2 - 1, top + 8); x.lineTo(cx + w / 2, base); x.closePath(); x.fill();
      x.fillStyle = lit; x.beginPath(); x.moveTo(cx - w / 2, base); x.lineTo(cx - w / 2 + 1, top + 5); x.quadraticCurveTo(cx - w / 2 + 3, top, cx - w / 5, top - 1); x.lineTo(cx - w / 10, top); x.lineTo(cx - w / 5, base); x.closePath(); x.fill();
      for (let k = 0; k < 14; k++) { const vx = cx - w / 2 + 1 + R() * (w - 2); x.strokeStyle = R() < .5 ? 'rgba(40,30,20,.22)' : 'rgba(255,240,210,.2)'; x.lineWidth = .4 + R() * .8; x.beginPath(); x.moveTo(vx, top + 4); x.lineTo(vx + (R() - .5) * 2, base); x.stroke(); }
      x.strokeStyle = dark; x.lineWidth = .5; for (let k = 0; k < 7; k++) { const yy = top + 8 + k * (base - top - 8) / 7 + R() * 3; x.beginPath(); x.moveTo(cx - w / 2 + 1, yy); x.lineTo(cx + w / 2 - 1, yy + R() * 2 - 1); x.stroke(); }
      x.fillStyle = '#4f9a3f'; x.beginPath(); x.ellipse(cx - w / 12, top + 1, w / 2.2, 3, 0, 0, TAU); x.fill(); x.fillStyle = '#6cc04e'; x.beginPath(); x.ellipse(cx - w / 8, top, w / 3, 1.8, 0, 0, TAU); x.fill();
      for (let k = 0; k < 4; k++) { const tx = cx - w / 2.6 + R() * w * .75, r = 2.5 + R() * 2; x.fillStyle = '#3a8a3c'; x.beginPath(); x.arc(tx, top - r * .4, r, 0, TAU); x.fill(); x.fillStyle = '#58b050'; x.beginPath(); x.arc(tx - r * .3, top - r * .7, r * .6, 0, TAU); x.fill(); }
    };
    tower(10, 38, 18, 74, '#9a8468', '#c4ad8a', '#5c4a38'); tower(44, 20, 34, 74, '#8c7a62', '#b6a182', '#5c4a38');
    tower(214, 42, 12, 76, '#a08a6c', '#cbb592', '#5c4a38'); tower(184, 24, 30, 76, '#907c62', '#baa684', '#5c4a38'); tower(236, 22, 26, 76, '#98836a', '#c2ac8a', '#5c4a38');
    // waterfall with mist
    for (const [wx, wt, wb] of [[36, 36, 72], [222, 20, 76]]) { x.fillStyle = K.lin(x, 0, wt, 0, wb, ['rgba(255,255,255,.95)', 'rgba(210,235,255,.8)']); x.fillRect(wx - 1.6, wt, 3.2, wb - wt); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(wx - .5, wt, 1, wb - wt); const m = x.createRadialGradient(wx, wb, 0, wx, wb, 12); m.addColorStop(0, 'rgba(255,255,255,.8)'); m.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = m; x.fillRect(wx - 12, wb - 12, 24, 20); }
    // lake band with sparkles
    x.fillStyle = K.lin(x, 0, 66, 0, 78, ['#7fd0f0', '#4fb0e0']); x.fillRect(0, 66, 240, 12);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${.25 + R() * .4})`; x.fillRect(R() * 240, 67 + R() * 10, 1 + R() * 3, .5); }
    // far tree line and rolling hills
    ridge(72, 3, 17, 0, '#4f9a4c', 84);
    for (let i = 0; i < 46; i++) { const tx = R() * 240, ty = 70 + R() * 6, r = 2 + R() * 3.2; x.fillStyle = ['#2f7a3c', '#3f9446', '#52a850'][i % 3]; x.beginPath(); x.arc(tx, ty - r * .5, r, 0, TAU); x.fill(); x.fillStyle = 'rgba(190,240,150,.35)'; x.beginPath(); x.arc(tx - r * .3, ty - r * .9, r * .5, 0, TAU); x.fill(); }
    ridge(80, 3, 23, 2, K.lin(x, 0, 74, 0, 90, ['#79c85a', '#5cb04a']), 96);
    // bigger mid trees
    for (let i = 0; i < 12; i++) { const tx = 6 + R() * 228, ty = 82 + R() * 6, r = 5 + R() * 4; x.fillStyle = 'rgba(30,80,30,.25)'; x.beginPath(); x.ellipse(tx + 2, ty + 1, r, r * .3, 0, 0, TAU); x.fill(); x.fillStyle = '#6a4a2c'; x.fillRect(tx - .8, ty - r * .6, 1.6, r * .7); for (const [dx, dy, rr, c] of [[0, -r, r, '#2f8a3c'], [-r * .3, -r * 1.25, r * .75, '#47a84a'], [-r * .5, -r * 1.5, r * .4, '#8bd870']]) { x.fillStyle = c; x.beginPath(); x.arc(tx + dx, ty + dy, rr, 0, TAU); x.fill(); } }
    // meadow, patches of light, a winding trail
    x.fillStyle = K.lin(x, 0, 84, 0, 160, ['#7fd052', '#5fba42', '#3f9c34', '#2c7e2c']); x.fillRect(0, 84, 240, 76);
    for (let i = 0; i < 16; i++) { x.fillStyle = 'rgba(255,250,170,.13)'; x.beginPath(); x.ellipse(R() * 240, 90 + R() * 62, 24 + R() * 34, 2.5 + R() * 4, 0, 0, TAU); x.fill(); }
    x.beginPath(); x.moveTo(104, 84); x.bezierCurveTo(112, 96, 150, 100, 168, 116); x.bezierCurveTo(184, 130, 168, 146, 190, 160); x.lineTo(226, 160); x.bezierCurveTo(200, 140, 214, 124, 190, 110); x.bezierCurveTo(166, 94, 128, 90, 116, 84); x.closePath(); x.fillStyle = '#d6b982'; x.fill();
    x.strokeStyle = 'rgba(120,86,50,.35)'; x.lineWidth = .8; x.stroke(); x.fillStyle = 'rgba(255,240,200,.22)'; x.beginPath(); x.moveTo(110, 85); x.bezierCurveTo(130, 94, 160, 98, 176, 118); x.lineTo(172, 118); x.bezierCurveTo(156, 100, 128, 96, 108, 86); x.fill();
    // grass tufts, flowers, rocks
    for (let i = 0; i < 260; i++) { const gx = R() * 240, gy = 86 + Math.pow(R(), .75) * 74, s2 = .5 + (gy - 84) / 55; x.strokeStyle = R() < .5 ? '#3f9a36' : '#a4e873'; x.lineWidth = .5 * s2; x.beginPath(); x.moveTo(gx, gy); x.quadraticCurveTo(gx + s2 * .6, gy - s2 * 1.6, gx + s2 * (R() - .5) * 2, gy - s2 * 2.8); x.stroke(); }
    const FL = ['#ffffff', '#ffe066', '#ff9ec7', '#9fc8ff', '#ffb35c'];
    for (let i = 0; i < 70; i++) { const fx = R() * 240, fy = 90 + R() * 66, r = .6 + (fy - 84) / 80; x.fillStyle = FL[i % 5]; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(fx + Math.cos(k * 1.26) * r, fy + Math.sin(k * 1.26) * r * .7, r * .6, 0, TAU); x.fill(); } x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(fx, fy, r * .4, 0, TAU); x.fill(); }
    for (const [rx, ry, rw, rh] of [[-6, 128, 34, 32], [206, 138, 40, 26], [8, 150, 26, 14]]) { x.fillStyle = '#4d4a48'; x.beginPath(); x.ellipse(rx + rw / 2, ry + rh / 2, rw / 2, rh / 2, 0, 0, TAU); x.fill(); x.fillStyle = '#6e6a66'; x.beginPath(); x.ellipse(rx + rw / 2 - 2, ry + rh / 2 - 3, rw / 2.4, rh / 2.7, 0, 0, TAU); x.fill(); x.fillStyle = '#4f9a3f'; x.beginPath(); x.ellipse(rx + rw / 2, ry + 2, rw / 3, 2.2, 0, 0, TAU); x.fill(); }
    // soft blurred foreground grass (depth of field)
    x.save(); x.filter = 'blur(1.1px)'; for (let i = 0; i < 70; i++) { const gx = R() * 240, gy = 150 + R() * 14, h = 7 + R() * 9; x.strokeStyle = R() < .5 ? '#2c8a30' : '#4fb040'; x.lineWidth = 1 + R() * .8; x.beginPath(); x.moveTo(gx, gy + 4); x.quadraticCurveTo(gx + (R() - .5) * 4, gy - h * .5, gx + (R() - .5) * 8, gy - h); x.stroke(); } x.restore();
    // warm light and vignette
    x.fillStyle = K.lin(x, 0, 0, 240, 160, ['rgba(255,236,170,.14)', 'rgba(255,236,170,0)']); x.fillRect(0, 0, 240, 160);
    const vg = x.createRadialGradient(120, 80, 70, 120, 80, 160); vg.addColorStop(0, 'rgba(10,30,50,0)'); vg.addColorStop(1, 'rgba(10,30,50,.34)'); x.fillStyle = vg; x.fillRect(0, 0, 240, 160);
  }, { pad: 0, qmax: 6 }),
  cave: () => K.cache('bbg-cave', 240, 160, x => {
    const R = G.mulberry(11);
    x.fillStyle = K.lin(x, 0, 0, 0, 76, ['#1c1438', '#2c2056', '#3e2f6e']); x.fillRect(0, 0, 240, 78);
    // back wall rock bands
    for (let k = 0; k < 3; k++) { x.fillStyle = ['#2a1f50', '#33275f', '#3b2d6a'][k]; x.beginPath(); x.moveTo(0, 78); for (let i = 0; i <= 240; i += 6) x.lineTo(i, 30 + k * 14 + Math.sin(i / (18 + k * 6) + k) * 6 + R() * 2); x.lineTo(240, 78); x.fill(); }
    // stalactites
    for (let i = 0; i < 22; i++) { const sx = R() * 240, l = 6 + R() * 16, w = 3 + R() * 4; x.fillStyle = R() < .5 ? '#160f2e' : '#221a44'; x.beginPath(); x.moveTo(sx - w, 0); x.quadraticCurveTo(sx - w * .3, l * .6, sx, l); x.quadraticCurveTo(sx + w * .3, l * .6, sx + w, 0); x.fill(); }
    // crystal clusters on the back wall
    const CR = ['#7ef0ff', '#ff8ee0', '#b28bff'];
    for (let i = 0; i < 9; i++) {
      const cx = 10 + R() * 220, cy = 52 + R() * 20, col = CR[i % 3], s = 3 + R() * 4;
      const g = x.createRadialGradient(cx, cy - s, 0, cx, cy - s, s * 4); g.addColorStop(0, col + '66'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fillRect(cx - s * 4, cy - s * 5, s * 8, s * 8);
      for (let k = -1; k <= 1; k++) { const h = s * (k ? 1.5 : 2.4), w = s * .55, bx = cx + k * s * .8; x.save(); x.translate(bx, cy); x.rotate(k * .35); x.fillStyle = G.shade(col, .7); x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w, -h * .7); x.lineTo(0, -h); x.lineTo(w, -h * .7); x.lineTo(w, 0); x.fill(); x.fillStyle = G.shade(col, 1.25); x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w, -h * .7); x.lineTo(0, -h); x.lineTo(0, 0); x.fill(); x.restore(); }
    }
    // floor
    x.fillStyle = K.lin(x, 0, 70, 0, 160, ['#5d4a8a', '#4a3a74', '#3a2d5e']); x.fillRect(0, 70, 240, 90);
    x.fillStyle = 'rgba(150,120,220,.18)'; x.fillRect(0, 70, 240, 1.5);
    for (let i = 0; i < 40; i++) { x.fillStyle = R() < .5 ? 'rgba(30,20,60,.35)' : 'rgba(170,140,230,.16)'; x.beginPath(); x.ellipse(R() * 240, 76 + R() * 84, 3 + R() * 10, 1 + R() * 2, 0, 0, 7); x.fill(); }
  }, { pad: 0, qmax: 6 }),
};
// Glows that pulse in the cave (positions match the seeded crystals only roughly; it is ambience).
const CAVE_GLOW = [[24, 58, '#7ef0ff'], [76, 66, '#ff8ee0'], [120, 54, '#b28bff'], [170, 62, '#7ef0ff'], [214, 58, '#ff8ee0']];
const cloudArt = (k) => K.cache('bcloud' + k, 40, 16, x => {
  const R = G.mulberry(30 + k);
  x.fillStyle = 'rgba(160,200,230,.5)'; x.beginPath(); x.ellipse(20, 13, 18, 3, 0, 0, 7); x.fill();
  const bl = [[8, 10, 6], [16, 7, 8], [26, 8, 7], [33, 11, 5]].map(([a, b2, r]) => [a, b2, r * (.85 + R() * .3)]);
  bl.forEach(([a, b2, r]) => blob(x, a, b2 + 1, r, '#d6ecfb')); bl.forEach(([a, b2, r]) => blob(x, a, b2, r, '#ffffff'));
  blob(x, 14, 5, 3, 'rgba(255,255,255,.9)');
}, { pad: 1, qmax: 4 });
const platArt = (cave, rx, ry) => K.cache('bplat' + (cave ? 'c' : 'g') + rx, rx * 2 + 8, ry * 2 + 10, x => {
  const cx = rx + 4, cy = ry + 3;
  x.fillStyle = 'rgba(20,40,20,.28)'; x.beginPath(); x.ellipse(cx + 3, cy + 6, rx + 2, ry + 1.5, 0, 0, 7); x.fill();
  if (cave) {
    x.fillStyle = '#2e2450'; x.beginPath(); x.ellipse(cx, cy + 3, rx, ry, 0, 0, 7); x.fill();
    x.fillStyle = K.lin(x, 0, cy - ry, 0, cy + ry, ['#a497d6', '#7d6fb8', '#5e5196']); x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.ellipse(cx - rx * .2, cy - ry * .35, rx * .6, ry * .35, 0, 0, 7); x.fill();
    const R = G.mulberry(rx); for (let i = 0; i < 8; i++) { const a = R() * 6.28; x.fillStyle = 'rgba(40,30,80,.35)'; x.beginPath(); x.ellipse(cx + Math.cos(a) * rx * .6, cy + Math.sin(a) * ry * .5, 2 + R() * 3, .8, 0, 0, 7); x.fill(); }
    [[-.8, '#7ef0ff'], [.78, '#ff8ee0']].forEach(([f, col]) => { const px = cx + rx * f, py = cy + 1; x.fillStyle = G.shade(col, .75); x.beginPath(); x.moveTo(px - 2, py); x.lineTo(px - 1.5, py - 6); x.lineTo(px, py - 8); x.lineTo(px + 1.6, py - 6); x.lineTo(px + 2, py); x.fill(); x.fillStyle = G.shade(col, 1.3); x.beginPath(); x.moveTo(px - 2, py); x.lineTo(px - 1.5, py - 6); x.lineTo(px, py - 8); x.lineTo(px, py); x.fill(); });
    return;
  }
  x.fillStyle = K.lin(x, 0, cy, 0, cy + ry + 4, ['#5fb046', '#3f8f36']); x.beginPath(); x.ellipse(cx, cy + 3.5, rx, ry, 0, 0, 7); x.fill();
  x.fillStyle = '#8a5f3c'; x.beginPath(); x.ellipse(cx, cy + 3.6, rx * .96, ry * .86, 0, .15, Math.PI - .15); x.fill(); // soil lip
  const g = x.createRadialGradient(cx - rx * .25, cy - ry * .4, 1, cx, cy, rx); g.addColorStop(0, '#f0ffc0'); g.addColorStop(.55, '#c4f08a'); g.addColorStop(1, '#9ade66');
  x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill();
  x.strokeStyle = '#4f9e3c'; x.lineWidth = 1.1; x.beginPath(); x.ellipse(cx, cy, rx - .5, ry - .4, 0, 0, 7); x.stroke();
  const R = G.mulberry(rx * 3);
  x.strokeStyle = '#5fb046'; x.lineWidth = .7;
  for (let i = 0; i < 60; i++) { const a = R() * 6.28, rr = .75 + R() * .25, px = cx + Math.cos(a) * rx * rr, py = cy + Math.sin(a) * ry * rr; if (py < cy - ry * .2 && R() < .5) continue; x.beginPath(); x.moveTo(px, py + 1); x.lineTo(px + (R() - .5) * 2, py - 1.8); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .8; x.beginPath(); x.ellipse(cx, cy, rx - 1, ry - .8, 0, Math.PI * 1.1, Math.PI * 1.75); x.stroke();
  for (let i = 0; i < 6; i++) { const a = R() * 6.28, px = cx + Math.cos(a) * rx * .7, py = cy + Math.sin(a) * ry * .6; blob(x, px, py, .9, ['#fff', '#ffe066', '#ff9ec7'][i % 3]); }
});
const orbArt = () => K.cache('borb', 14, 14, x => {
  x.save(); x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 1.5 * x.getTransform().a; x.shadowOffsetY = .8 * x.getTransform().a;
  blob(x, 7, 7, 6.6, '#3d3352'); x.restore();
  x.fillStyle = K.lin(x, 0, 1, 0, 7, ['#ff9a8a', '#ff4d5e', '#e0304a']); x.beginPath(); x.arc(7, 7, 5.6, Math.PI, 0); x.fill();
  x.fillStyle = K.lin(x, 0, 7, 0, 13, ['#ffffff', '#eef0f8', '#c8cce0']); x.beginPath(); x.arc(7, 7, 5.6, 0, Math.PI); x.fill();
  x.fillStyle = '#3d3352'; x.fillRect(1.4, 6.3, 11.2, 1.4);
  blob(x, 7, 7, 2.4, '#3d3352'); blob(x, 7, 7, 1.6, '#ffffff'); blob(x, 6.6, 6.6, .6, 'rgba(255,255,255,.9)');
  x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(4.6, 3.8, 2, 1.1, -.6, 0, 7); x.fill();
  blob(x, 9.6, 3.4, .55, 'rgba(255,255,255,.8)');
}, { pad: 2 });

function drawFighter(ctx, f, back, bx, by, base) {
  base = base || 64; const u = base / 64;
  if (f.hidden || f.alpha <= 0) return;
  const a = act(f); let img = a ? a.frame() : null;
  if (!img) img = G.creatureSprite(f.c.id, back);
  if (f.tint) img = a ? G.c3d.tint(img, f.tint) : G.tint(img, f.tint);
  const t = G.frameNo + (back ? 40 : 0), idle = f.scale === 1 && !f.tint && !a;   // 3D actors breathe on their own
  const bob = idle ? Math.sin(t / 18) : 0, sq = idle ? Math.sin(t / 9) * .018 : 0;
  const size = base * f.scale, sw = size * (1 + sq), sh = size * (1 - sq);
  // contact shadow on the platform
  const fx = bx + base / 2 + f.ox, fy = by + base * .95;
  ctx.globalAlpha = f.alpha * .3 * Math.max(0, 1 - Math.abs(f.oy) / 40); ell(ctx, fx, fy, (18 * f.scale - bob * .6) * u, 4 * f.scale * u, '#10240e'); ctx.globalAlpha = f.alpha;
  const dx = bx + f.ox + (base - sw) / 2, dy = by + f.oy + (base - sh) - Math.max(0, bob) * 1.6;
  if (f.glow) { ctx.globalCompositeOperation = 'lighter'; K.drawGlow(ctx, '#ffe066', fx, by + base * .53, (40 + Math.sin(t / 4) * 3) * u, Math.min(1, f.glow / 30) * .8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = f.alpha; }
  ctx.drawImage(img, dx, dy, sw, sh);
  if (f.flash > 0 && G.flashOK()) { ctx.globalAlpha = f.alpha * Math.min(1, f.flash / 4); ctx.drawImage(a ? G.c3d.tint(a.canvas, '#ffffff') : G.tint(G.creatureSprite(f.c.id, back), '#ffffff'), dx, dy, sw, sh); }
  ctx.globalAlpha = 1;
}
function infoBox(ctx, f, x, y, w, mine) {
  G.battleUI.statusPanel(ctx, f, x, y, w, mine, f.dispExp === null ? expRatio(f.c) : f.dispExp);
}
function drawOrb(ctx, x, y, rot, s, style) {
  if (G.drawOrb) G.drawOrb(ctx, style || 'terra', x, y, 15 * (s || 1), rot);
  else { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s || 1, s || 1); const e = orbArt(); ctx.drawImage(e.c, -7 - e.pad, -7 - e.pad, 14 + e.pad * 2, 14 + e.pad * 2); ctx.restore(); }
  if ((s || 1) > 1.05) K.star(ctx, x + 6, y - 6, 2.5, '#fff8c0');
}
// ---- Particles ------------------------------------------------------------
const PSTYLE = {
  Fire: { cols: ['#ffe066', '#ffa23d', '#ff5a3d'], shape: 'flame', g: -.06, glow: '#ff8a3d' },
  Water: { cols: ['#ffffff', '#8fd8ff', '#4aa8ff'], shape: 'drop', g: .1, glow: '#6fc6ff' },
  Grass: { cols: ['#c8f77a', '#78d850', '#3fae4a'], shape: 'leaf', g: .02 },
  Electric: { cols: ['#fffbd0', '#ffe94a', '#ffc21a'], shape: 'spark', g: 0, glow: '#ffe94a' },
  Psychic: { cols: ['#ffd0e8', '#ff8ac4', '#e85bb0'], shape: 'ring', g: -.02, glow: '#ff8ac4' },
  Ghost: { cols: ['#d6c8ff', '#9a7ee0', '#6a4fb0'], shape: 'wisp', g: -.04, glow: '#9a7ee0' },
  Dark: { cols: ['#b8a8c8', '#6a5878', '#3d3352'], shape: 'wisp', g: -.02 },
  Poison: { cols: ['#e8b8ff', '#b05cd0', '#7a3a9a'], shape: 'bubble', g: -.05 },
  Rock: { cols: ['#e8d49a', '#b8a038', '#8a7428'], shape: 'rock', g: .16 },
  Ground: { cols: ['#f2dca0', '#d8b860', '#a8884a'], shape: 'rock', g: .14 },
  Flying: { cols: ['#ffffff', '#d8ccff', '#a890f0'], shape: 'leaf', g: .01 },
  Bug: { cols: ['#e8f080', '#b8c830', '#8a9a18'], shape: 'dot', g: .04 },
  Normal: { cols: ['#ffffff', '#fff0b0', '#ffd860'], shape: 'star', g: .03 },
  Sparkle: { cols: ['#ffffff', '#fff6a8', '#ffd0f0'], shape: 'star', g: -.015, glow: '#fff6a8' },
  Dust: { cols: ['#ffffff', '#e8e4f0', '#c8c0d8'], shape: 'dot', g: -.01 },
};
function burst(type, x, y, n, o) {
  o = o || {}; const st = PSTYLE[type] || PSTYLE[G.TYPE_COL[type] ? 'Normal' : 'Sparkle'];
  if (G.pref('battle.reduceAnims') || !G.motionOK()) n = Math.ceil(n / 3);   // fewer particles (settings)
  for (let i = 0; i < n; i++) {
    const a = o.up ? -Math.PI / 2 + (Math.random() - .5) * 2 : Math.random() * 6.28, sp = (o.speed || 1.6) * (.4 + Math.random());
    b.parts.push({ x: x + (Math.random() - .5) * (o.spread || 6), y: y + (Math.random() - .5) * (o.spread || 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: st.g, life: 0, max: (o.life || 30) * (.6 + Math.random() * .6), col: st.cols[i % 3], shape: st.shape, glow: st.glow, r: (o.size || 3) * (.7 + Math.random() * .6), rot: Math.random() * 6, vr: (Math.random() - .5) * .3 });
  }
}
function drawPart(ctx, p) {
  const k = p.life / p.max, a = k < .15 ? k / .15 : 1 - (k - .15) / .85, r = p.r * (p.shape === 'ring' ? .6 + k * 1.6 : 1 - k * .4);
  ctx.globalAlpha = Math.max(0, a);
  if (p.glow) { ctx.globalCompositeOperation = 'lighter'; K.drawGlow(ctx, p.glow, p.x, p.y, r * 3.2, a * .5); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.max(0, a); }
  ctx.fillStyle = p.col; ctx.strokeStyle = p.col;
  switch (p.shape) {
    case 'star': K.star(ctx, p.x, p.y, r * 1.3, p.col); break;
    case 'flame': ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 1.8); ctx.quadraticCurveTo(p.x + r, p.y - r * .2, p.x, p.y + r); ctx.quadraticCurveTo(p.x - r, p.y - r * .2, p.x, p.y - r * 1.8); ctx.fill(); break;
    case 'drop': ctx.beginPath(); ctx.arc(p.x, p.y, r * .8, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(p.x - r * .3, p.y - r * .3, r * .25, 0, 7); ctx.fill(); break;
    case 'leaf': ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.2, r * .5, p.rot, 0, 7); ctx.fill(); break;
    case 'spark': ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x + r * .2, p.y - r * .1); ctx.lineTo(p.x - r * .2, p.y + r * .1); ctx.lineTo(p.x + r, p.y + r); ctx.stroke(); break;
    case 'ring': ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke(); break;
    case 'bubble': ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(p.x, p.y, r * .8, 0, 7); ctx.stroke(); ctx.globalAlpha *= .35; ctx.fill(); break;
    case 'rock': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-r * .7, -r * .6, r * 1.4, r * 1.2); ctx.restore(); break;
    default: ctx.beginPath(); ctx.arc(p.x, p.y, r * .7, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function stepVisuals() {
  if (!b) return;
  if (b.parts) for (let i = b.parts.length - 1; i >= 0; i--) { const p = b.parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .96; p.rot += p.vr; if (++p.life >= p.max) b.parts.splice(i, 1); }
  if (b.shake > 0) b.shake--;
  if (b.floats) for (let i = b.floats.length - 1; i >= 0; i--) if (++b.floats[i].t > 50) b.floats.splice(i, 1);
  for (const f of [b.me, b.foe]) if (f) {
    act(f);
    if (f.flash > 0) f.flash--;
    if (f.glow > 0) { f.glow--; if (f.glow % 5 === 0 && !f.hidden) { const [cx, cy] = center(f); burst('Sparkle', cx + (Math.random() - .5) * 40, cy + 14, 1, { up: true, speed: .8, life: 40, spread: 4 }); } }
  }
}
function drawBackdrop(ctx, cave) {
  const t = G.frameNo;
  K.blit(ctx, (cave ? bgArt.cave : bgArt.grass)(), 0, 0);
  if (cave) {
    ctx.globalCompositeOperation = 'lighter';
    CAVE_GLOW.forEach(([gx, gy, col], i) => K.drawGlow(ctx, col, gx, gy, 22, .22 + .14 * Math.sin(t / 40 + i * 1.7)));
    for (let i = 0; i < 12; i++) { const px = (i * 53 + t * .15 * (1 + i % 3)) % 250 - 5, py = 20 + (i * 37) % 60 + Math.sin(t / 50 + i) * 6; K.drawGlow(ctx, i % 2 ? '#7ef0ff' : '#ff8ee0', px, py, 2.5, .5 + .4 * Math.sin(t / 15 + i)); }
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.globalAlpha = .5; [[0, 3, .05], [1, 12, .035], [2, 6, .07]].forEach(([k, cy, sp], i) => { const e = cloudArt(k), w = 34 + i * 4; const cx = ((i * 83 + t * sp) % (240 + w + 20)) - w - 10; ctx.drawImage(e.c, cx - e.pad, cy - e.pad, w + e.pad * 2, w * .4 + e.pad * 2); }); ctx.globalAlpha = 1;
  }
  if (cave) { K.blit(ctx, platArt(cave, 44, 9), 182 - 48, 72 - 12); K.blit(ctx, platArt(cave, 50, 10), 62 - 54, 104 - 13); }
}
function draw(ctx) {
  const cave = b.bg === 'cave';
  if (!b.parts) b.parts = [];
  ctx.save();
  if (b.shake > 0 && G.shakeOK()) { const s = b.shake * .5; ctx.translate(Math.sin(b.shake * 2.1) * s, Math.cos(b.shake * 1.7) * s * .5); }
  drawBackdrop(ctx, cave);
  if (b.target && !b.foe.hidden) G.battleUI.targetRing(ctx, 182, 74, G.frameNo);
  drawFighter(ctx, b.foe, false, 146, 8, 72);
  if (b.target && !b.foe.hidden) G.battleUI.targetMarker(ctx, 182, 4, G.frameNo);
  drawFighter(ctx, b.me, true, 22, 36, 88);
  for (const t of [b.tFoe, b.tMe]) if (t) {
    ctx.globalAlpha = (t.alpha === undefined ? 1 : t.alpha) * .3; ell(ctx, t.x + t.ox + 24, t.y + 58, 16, 3.5, '#1a2a14');
    ctx.globalAlpha = t.alpha === undefined ? 1 : t.alpha; ctx.drawImage(t.img, t.x + t.ox, t.y, 48, 60); ctx.globalAlpha = 1;
  }
  if (b.beam) { const k = b.beam.t; ctx.globalCompositeOperation = 'lighter'; K.drawGlow(ctx, '#ff9ad0', b.beam.x, b.beam.y, 10 + k * 1.6, Math.min(1, 1.2 - k / 14)); ctx.globalCompositeOperation = 'source-over'; }
  if (b.proj) { ctx.globalCompositeOperation = 'lighter'; K.drawGlow(ctx, b.proj.col, b.proj.x, b.proj.y, 12, .9); ctx.globalCompositeOperation = 'source-over'; ell(ctx, b.proj.x, b.proj.y, 3.4, 3.4, '#ffffff'); }
  if (b.orb) drawOrb(ctx, b.orb.x, b.orb.y, b.orb.rot, b.orb.s, b.orb.style);
  if (b.fx) drawFx(ctx, b.fx);
  for (const p of b.parts) drawPart(ctx, p);
  if (b.floats && G.pref('battle.damageNumbers')) for (const d of b.floats) { const k = d.t / 50; ctx.globalAlpha = Math.max(0, 1 - k * k); const pop = G.motionOK() ? 1 + Math.max(0, .5 - k * 4) : 1; ctx.save(); ctx.translate(d.x, d.y - (G.motionOK() ? k * 14 : 0)); ctx.scale(pop, pop); ctx.font = '900 12px ' + G.FONT_FAM; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,20,32,.85)'; ctx.strokeText(d.text.replace('-', ''), 0, 0); ctx.fillStyle = d.col; ctx.fillText(d.text.replace('-', ''), 0, 0); ctx.restore(); ctx.globalAlpha = 1; }
  ctx.restore();
  // info boxes slide in when first shown
  b.fT = b.showFoe ? (b.fT || 0) + 1 : 0; b.mT = b.showMe ? (b.mT || 0) + 1 : 0;
  const ease = n => n >= 14 ? 0 : Math.pow(1 - n / 14, 3);
  if (b.showFoe) infoBox(ctx, b.foe, 6 - ease(b.fT) * 130, 6, 104, false);
  if (b.showMe) infoBox(ctx, b.me, 124 + ease(b.mT) * 130, 74, 112, true);
}
function drawFx(ctx, fx) {
  const t = fx.t / fx.dur, [x, y] = [fx.x, fx.y];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  K.drawGlow(ctx, fx.color, x, y, 14 + t * 22, (1 - t) * .9);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4 * (1 - t) + .4; ctx.beginPath(); ctx.arc(x, y, 4 + t * 24, 0, 7); ctx.stroke();
  ctx.strokeStyle = fx.color; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 2 + t * 16, 0, 7); ctx.stroke();
  if (fx.kind === 'impact') {   // chunky comic star + slash streaks
    const r = 12 * (t < .3 ? t / .3 : 1 - (t - .3) * .9);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + .2, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.fillStyle = fx.color; ctx.globalAlpha *= .8; ctx.beginPath(); ctx.arc(x, y, r * .35, 0, 7); ctx.fill();
    ctx.globalAlpha = Math.max(0, 1 - t * 1.4); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { const o = (i - 1) * 7; ctx.beginPath(); ctx.moveTo(x - 14 + o, y - 14 + t * 8); ctx.lineTo(x + 6 + o + t * 6, y + 12); ctx.stroke(); }
  }
  ctx.restore();
}
const scene = { update: stepVisuals, draw, battle: true };   // battle: true lets Fast battle speed run two ticks a frame (engine)

// ---- Animations -----------------------------------------------------------
async function slide(o, key, from, to, frames) { for (let i = 0; i <= frames; i++) { const k = i / frames, e = 1 - Math.pow(1 - k, 3); o[key] = from + (to - from) * e; await G.nextFrame(); } }
async function popIn(f) {
  f.hidden = false; f.tint = '#ffffff'; f.alpha = 1;
  const a = act(f); if (a) { a.reset(); a.play('enter'); }
  const [cx, cy] = center(f); burst('Sparkle', cx, cy + 6, 12, { speed: 1.8, life: 26 });
  for (let i = 1; i <= 16; i++) { const k = i / 16; f.scale = k < .7 ? k / .7 * 1.12 : 1.12 - (k - .7) / .3 * .12; await G.nextFrame(); }
  f.tint = null; f.scale = 1; f.ox = 0; f.oy = 0; f.flash = 6;
}
async function popOut(f) { f.tint = '#ffffff'; for (let i = 13; i >= 0; i--) { f.scale = Math.max(.05, i / 14); await G.nextFrame(); } f.hidden = true; f.scale = 1; f.tint = null; }
async function animAttack(att, def, move, eff) {
  const dir = att === b.me ? 1 : -1, [x, y] = center(def), special = !G.PHYS.has(move.type), col = G.TYPE_COL[move.type];
  const aA = act(att), aD = act(def);
  if (aA) {   // 3D: anticipation, then the species' own attack (physical) or cast (special) up to its impact moment
    await aA.play('anticipate');
    await aA.play(special ? 'cast' : 'attack').at('impact');
  }
  if (special) {   // charge up, then fire a glowing shot
    const [ax, ay] = center(att);
    if (!aA) for (let i = 0; i < 6; i++) { att.oy = -Math.sin(i / 6 * Math.PI) * 4; if (i % 2 === 0) burst(move.type, ax, ay, 1, { speed: .6, life: 14 }); await G.nextFrame(); }
    att.oy = 0; b.proj = { x: ax, y: ay, col };
    for (let i = 1; i <= 8; i++) { const k = i / 8; b.proj.x = ax + (x - ax) * k; b.proj.y = ay + (y - ay) * k - Math.sin(k * Math.PI) * 10; if (i % 2) burst(move.type, b.proj.x, b.proj.y, 1, { speed: .4, life: 12, size: 1.8 }); await G.nextFrame(); }
    b.proj = null;
  } else if (!aA) {   // 2D: wind up and lunge
    for (let i = 0; i < 4; i++) { att.ox -= dir * 1.2; att.oy += dir * .4; await G.nextFrame(); }
    for (let i = 0; i < 6; i++) { att.ox += dir * 4.4; att.oy -= dir * 1.6; await G.nextFrame(); }
  }
  b.fx = { kind: special ? 'burst' : 'impact', x, y, color: col, t: 0, dur: 18 };
  burst(move.type, x, y, eff > 1 ? 26 : 16, { speed: eff > 1 ? 2.4 : 1.8, life: 30 });
  def.flash = 10; b.shake = eff > 1 ? 12 : eff < 1 ? 4 : 8;
  if (aD) aD.play(eff > 1 ? 'hitHeavy' : 'hit');
  G.audio.sfx(eff > 1 ? 'super' : eff < 1 ? 'weak' : 'hit');
  for (let i = 0; i < 16; i++) {
    b.fx.t = Math.min(b.fx.dur, b.fx.t + 1.2);
    if (!aD) def.ox = (i < 12 ? (i % 2 ? 1 : -1) * (3 - i / 4) : 0) * -dir;
    if (i < 8) { att.ox *= .7; att.oy *= .7; }
    if (i === 4) def.flash = 6;
    await G.nextFrame();
  }
  def.alpha = 1; def.ox = 0; b.fx = null; att.ox = 0; att.oy = 0;
}
async function drain(f) {
  const target = f.c.hp, step = Math.max(.35, f.c.stats.hp / 100);
  while (Math.abs(f.dispHp - target) > .01) { f.dispHp += Math.sign(target - f.dispHp) * Math.min(step, Math.abs(target - f.dispHp)); await G.nextFrame(); }
  f.dispHp = target;
}
async function shake(f) { f.flash = 8; const a = act(f); if (a) { await a.play('hit'); return; } for (let i = 0; i < 8; i++) { f.ox = (i % 2 ? 3 : -3) * (1 - i / 10); await G.nextFrame(); await G.nextFrame(); } f.ox = 0; }
async function animExp(f, to, frames) {
  let from = f.dispExp === null ? expRatio(f.c) : f.dispExp; f.dispExp = from;
  for (let i = 1; i <= frames; i++) { f.dispExp = from + (to - from) * i / frames; await G.nextFrame(); }
  f.dispExp = to;
}

// ---- Status & stat effects ------------------------------------------------
const STATUS_MSG = { slp: 'fell asleep!', par: 'is paralyzed! It may be unable to move!', psn: 'was poisoned!', brn: 'was burned!' };
async function inflict(f, status) {
  if (f.c.status || f.c.hp <= 0 || (G.cheat('god') && G.state.party.includes(f.c))) return false;
  const ty = G.SPECIES[f.c.id].types;
  if ((status === 'psn' && ty.includes('Poison')) || (status === 'brn' && ty.includes('Fire')) || (status === 'par' && ty.includes('Electric'))) return false;
  f.c.status = status; if (status === 'slp') f.sleep = 1 + rnd(3);
  G.audio.sfx('weak'); await msg(`${nm(f)} ${STATUS_MSG[status]}`); return true;
}
async function changeStage(f, stat, d) {
  const s = f.stages[stat];
  if ((d > 0 && s >= 6) || (d < 0 && s <= -6)) { await msg(`${nm(f)}'s ${STAGE_TXT[stat]} won't go any ${d > 0 ? 'higher' : 'lower'}!`); return; }
  f.stages[stat] = Math.max(-6, Math.min(6, s + d));
  if (d < 0) await shake(f);
  await msg(`${nm(f)}'s ${STAGE_TXT[stat]} ${d > 0 ? 'rose' : 'fell'}!`);
}

// ---- Moves ----------------------------------------------------------------
// Returns false if the user could not act. Handles all messaging.
async function useMove(att, def, move) {
  if (att.c.status === 'slp') {
    if (--att.sleep > 0) { await msg(`${nm(att)} is fast asleep.`); return; }
    att.c.status = null; await msg(`${nm(att)} woke up!`);
  }
  if (att.c.status === 'par' && rnd(4) === 0) { await msg(`${nm(att)} is fully paralyzed!\nIt can't move!`); return; }
  await msg(`${nm(att)} used ${move.name}!`, 22);
  const slot = att.c.moves.find(m => m.id === move.name); if (slot && !G.cheat('pp')) slot.pp--;
  if (move.acc < 100 && rnd(100) >= move.acc) { await msg(`${nm(att)}'s attack missed!`); return; }
  if (move.pow > 0) {
    const crit = rnd(16) === 0, r = G.calcDamage(att, def, move, { crit, roll: .85 + Math.random() * .15 });
    if (r.eff === 0) { await msg(`It doesn't affect ${nm(def)}...`); return; }
    await animAttack(att, def, move, r.eff);
    if (G.cheat('god') && G.state.party.includes(def.c)) r.dmg = 0;
    def.c.hp = Math.max(0, def.c.hp - r.dmg);
    if (r.dmg > 0) { const [fx, fy] = center(def); (b.floats = b.floats || []).push({ x: fx, y: fy - 18, text: '-' + r.dmg, t: 0, col: r.eff > 1 ? '#ffd23a' : '#ffffff' }); }
    await drain(def);
    if (crit) await msg('A critical hit!');
    if (G.pref('battle.effectMsgs')) { if (r.eff > 1) await msg("It's super effective!"); else if (r.eff < 1) await msg("It's not very effective..."); }
    if (move.recoil) { att.c.hp = Math.max(0, att.c.hp - Math.max(1, Math.floor(r.dmg / 4))); await drain(att); await msg(`${nm(att)} is hit with recoil!`); }
    if (def.c.hp > 0 && move.status && rnd(100) < move.chance) await inflict(def, move.status);
  } else {
    { const a = act(att); if (a) await a.play(a.spec.clips.status ? 'status' : 'cast').at('impact'); }   // 3D: growl, howl, glare...
    if (move.stat) { const t = move.self ? att : def; await changeStage(t, move.stat[0], move.stat[1]); }
    else if (move.status) { if (!(await inflict(def, move.status))) await msg('But it failed!'); }
  }
}
function pickMove(f, other) {
  const usable = f.c.moves.filter(m => m.pp > 0);
  if (!usable.length) return STRUGGLE;
  const ws = usable.map(m => { const mv = G.MOVES[m.id]; if (mv.pow) { const e = G.typeMult(mv.type, G.SPECIES[other.c.id].types); return e === 0 ? .1 : e > 1 ? 3 : e < 1 ? .6 : 2; } return (mv.status && other.c.status) ? .1 : 1; });
  let r = Math.random() * ws.reduce((a, c) => a + c, 0), i = 0;
  while ((r -= ws[i]) > 0) i++;
  return G.MOVES[usable[Math.min(i, usable.length - 1)].id];
}

// ---- Fainting, EXP & level ups -------------------------------------------
async function showGains(c, gains) {
  const layer = { draw(ctx) {
    G.frame(ctx, 128, 4, 108, 74, 'light');
    G.STATS.forEach((s, i) => { G.text(ctx, G.STAT_NAME[s], 138, 11 + i * 10); G.text(ctx, '+' + gains[s], 202, 11 + i * 10, { align: 'right' }); G.text(ctx, String(c.stats[s]), 228, 11 + i * 10, { align: 'right' }); });
  } };
  G.ui.layers.push(layer); await G.waitA(); G.ui.layers.splice(G.ui.layers.indexOf(layer), 1);
}
async function learnMoves(c, lvl) {
  for (const name of G.movesAt(c, lvl)) {
    if (c.moves.some(m => m.id === name)) continue;
    const mvd = G.MOVES[name];
    if (c.moves.length < 4) { c.moves.push({ id: name, pp: mvd.pp }); G.audio.sfx('select'); await msg(`${G.name(c)} learned ${name}!`); continue; }
    for (;;) {
      await msg(`${G.name(c)} wants to learn ${name}.\nBut it already knows four moves. Forget a move?`, 0);
      if (!(await G.yesNo({ style: 'dark' }))) { await msg(`${G.name(c)} did not learn ${name}.`); break; }
      const i = await G.choose(c.moves.map(m => m.id), { x: 4, y: 4, style: 'dark', cancel: true });
      if (i < 0) continue;
      const old = c.moves[i].id; c.moves[i] = { id: name, pp: mvd.pp };
      await msg(`1, 2 and... Poof!\n${G.name(c)} forgot ${old}.\nAnd... ${G.name(c)} learned ${name}!`); break;
    }
  }
}
async function awardExp(foe) {
  const party = G.state.party, parts = [...foe.participants].filter(c => c.hp > 0 && party.includes(c));
  if (!parts.length) return;
  const sp = G.SPECIES[foe.c.id];
  const gain = Math.max(1, Math.floor(Math.floor(sp.expYield * foe.c.lvl / 7) * (b.wild ? 1 : 1.5) / parts.length));
  for (const c of parts) {
    await msg(`${G.name(c)} gained ${gain} EXP. Points!`);
    c.exp += gain;
    const active = c === b.me.c;
    while (c.lvl < 100 && c.exp >= G.expFor(c.lvl + 1)) {
      if (active) await animExp(b.me, 1, 14);
      const gains = G.levelUp(c); G.audio.sfx('levelup');
      if (active) { b.me.dispHp = c.hp; b.me.dispExp = 0; b.me.glow = 90; b.me.flash = 8; const [lx, ly] = center(b.me); burst('Sparkle', lx, ly, 18, { speed: 2, life: 34 }); }
      await msg(`${G.name(c)} grew to LV. ${c.lvl}!`, 0);
      await showGains(c, gains);
      await learnMoves(c, c.lvl);
      const evo = G.SPECIES[c.id].evo; if (evo && c.lvl >= evo[0]) c.evolveReady = true;
    }
    if (active) { await animExp(b.me, expRatio(c), 20); b.me.dispExp = null; }
  }
}
async function faint(f) {
  G.audio.sfx('faint');
  const [fx, fy] = center(f); f.flash = 8; const a = act(f);
  if (a) { await a.play('faint'); burst('Dust', fx, fy + 22, 10, { speed: 1, life: 24, spread: 30, size: 3 }); for (let i = 0; i < 20; i++) { f.alpha = 1 - i / 20; await G.nextFrame(); } f.hidden = true; f.alpha = 1; await msg(`${nm(f)} fainted!`); return; }
  for (let i = 0; i < 6; i++) { f.oy = -Math.sin(i / 6 * Math.PI) * 3; await G.nextFrame(); }
  burst('Dust', fx, fy + 22, 14, { speed: 1.2, life: 28, spread: 30, size: 3 });
  for (let i = 0; i < 20; i++) { f.oy += 3 + i * .15; f.alpha = 1 - i / 20; await G.nextFrame(); }
  f.hidden = true; f.oy = 0; f.alpha = 1;
  await msg(`${nm(f)} fainted!`);
}

// ---- Sending out ----------------------------------------------------------
async function sendOutMe(c, first) {
  b.me = mkF(c); b.me.participants = new Set(); b.foe.participants.add(c); b.me.dispHp = c.hp; b.me.dispExp = null; mark(c.id, 2);
  await msg(`Go! ${G.name(c)}!`, 20);
  b.showMe = true; await popIn(b.me);
}
async function sendOutFoe(c) {
  b.foe = mkF(c); b.foe.participants = new Set([b.me.c]); mark(c.id, Math.max(1, G.state.dex[c.id] || 0));
  b.showFoe = true; await popIn(b.foe);
}

// ---- Player menus ---------------------------------------------------------
const prompt = lines => { G.ui.text = { lines, shown: 999, arrow: false, style: 'dark', cmd: true }; };
// Battle memory (settings): the last action (FIGHT/BAG/PARTY/RUN) is kept in the save (S.battleMem), and each creature keeps
// its own last move (c.lastMove), so both survive between turns, switches, battles and reloads. They only preselect the
// cursor; nothing is chosen for you. A remembered move that has no PP or was forgotten falls back to the first usable move.
G.battleMemory = {
  action: () => { const M = G.state.battleMem; return G.pref('battle.rememberAction') && M && M.action >= 0 && M.action < 4 ? M.action : 0; },
  move: c => { const mvs = c.moves; if (!G.pref('battle.rememberMove')) return 0; const i = mvs.findIndex(m => m.id === c.lastMove && m.pp > 0); return i >= 0 ? i : Math.max(0, mvs.findIndex(m => m.pp > 0)); },
  // single battles: the target is the foe in front of you; remembered by species, and anything else falls back to that foe
  target: () => { const M = G.state.battleMem; return b && b.foe && b.foe.c.hp > 0 && M && M.target === b.foe.c.id ? b.foe : b && b.foe; },
};
async function chooseAction() {
  const M = G.state.battleMem = G.state.battleMem || {};
  let last = G.battleMemory.action();
  for (;;) {
    prompt(['What will', G.name(b.me.c) + ' do?']);
    const ch = await G.choose(['FIGHT', 'BAG', 'PARTY', 'RUN'], { cols: 4, style: 'dark', cancel: false, index: last, draw: G.battleUI.commandBar(`What will ${G.name(b.me.c)} do?`) });
    last = ch; M.action = ch;
    if (ch === 0) {
      const mvs = b.me.c.moves;
      if (!mvs.some(m => m.pp > 0)) { G.ui.text = null; b.target = false; return { t: 'move', move: STRUGGLE }; }
      G.ui.text = null; b.target = true;
      const i = await G.choose(mvs.map(m => m.id), { cols: mvs.length, style: 'dark', cancel: true, index: G.battleMemory.move(b.me.c), draw: G.battleUI.abilityCards(mvs) });
      b.target = false;
      if (i < 0) continue;
      if (mvs[i].pp <= 0) { await msg('There\'s no PP left for this move!', 0); continue; }
      b.me.c.lastMove = mvs[i].id; M.target = b.foe.c.id;
      return { t: 'move', move: G.MOVES[mvs[i].id] };
    }
    if (ch === 1) {
      G.ui.text = null;
      const r = await G.bagScreen('battle');
      if (!r) continue;
      if (G.pref('battle.confirmValuable') && G.isValuable(r.item)) { await G.say(`Use your ${r.item.toUpperCase()}? It is valuable.`, { auto: 1, style: 'dark' }); const ok = await G.yesNo({ style: 'dark' }); G.closeText(); if (!ok) continue; }
      if (G.ITEMS[r.item].kind === 'orb') {
        if (!b.wild) { await msg("The trainer blocked the ORB!\nDon't be a thief!"); continue; }
        return { t: 'orb', item: r.item };
      }
      return { t: 'item', item: r.item, idx: r.idx };
    }
    if (ch === 2) {
      G.ui.text = null;
      const i = await G.partyScreen({ mode: 'switch', current: G.state.party.indexOf(b.me.c) });
      if (i >= 0) return { t: 'switch', idx: i };
      continue;
    }
    if (ch === 3) {
      if (!b.wild) { await msg("No! There's no running from a trainer battle!"); continue; }
      return { t: 'run' };
    }
  }
}
async function forcedSwitch() {
  for (;;) {
    G.ui.text = null;
    const i = await G.partyScreen({ mode: 'switch', forced: true, current: -1, start: Math.max(0, G.state.party.findIndex(c => c.hp > 0)) });
    if (i >= 0) return i;
  }
}
async function doSwitch(idx, forced) {
  const c = G.state.party[idx];
  if (!forced && !b.me.hidden) { await msg(`${G.name(b.me.c)}, come back!`, 18); await popOut(b.me); }
  await sendOutMe(c);
}

// ---- Catching -------------------------------------------------------------
async function throwOrb(item) {
  const bonus = G.orbBonus ? G.orbBonus(item, b.foe.c) : G.ITEMS[item].mult;
  if (!G.cheat('items')) { G.state.bag[item]--; if (!G.state.bag[item]) delete G.state.bag[item]; }
  await msg(`${G.state.name} used the ${item.toUpperCase()}!`, 14);
  const res = G.cheat('catch') ? { shakes: 3, caught: true } : G.catchCheck(b.foe.c, bonus), [fx, fy] = center(b.foe);
  G.audio.sfx('throw');
  b.orb = { x: 40, y: 70, rot: 0, s: 1, style: G.orbStyleOf ? G.orbStyleOf(item) : 'terra' };
  for (let i = 0; i <= 26; i++) { const t = i / 26; b.orb.x = 40 + (fx - 40) * t; b.orb.y = 70 + (fy - 70) * t - Math.sin(t * Math.PI) * 50; b.orb.rot = t * 12; await G.nextFrame(); }
  b.foe.tint = '#ffffff'; b.beam = { x: b.orb.x, y: b.orb.y, t: 0 }; burst('Sparkle', b.orb.x, b.orb.y, 14, { speed: 2.2, life: 24 }); b.shake = 4;
  for (let i = 10; i >= 0; i--) { b.foe.scale = Math.max(.04, i / 10); b.beam.t++; if (i % 2) burst('Psychic', fx, fy, 1, { speed: .5, life: 12 }); await G.nextFrame(); }
  b.beam = null;
  b.foe.hidden = true; b.foe.scale = 1; b.foe.tint = null;
  const ground = fy + 24;
  for (let i = 0; i <= 18; i++) { const k = i / 18; b.orb.y = fy + (ground - fy) * (k < .7 ? Math.pow(k / .7, 2) : 1 - Math.sin((k - .7) / .3 * Math.PI) * .18); b.orb.rot = 0; await G.nextFrame(); }
  b.orb.y = ground;
  for (let k = 0; k < 3; k++) {
    if (k > res.shakes) break;
    await G.wait(20); G.audio.sfx('wobble');
    for (let i = 0; i <= 16; i++) { b.orb.rot = Math.sin(i / 16 * Math.PI * 2) * .5; await G.nextFrame(); }
    b.orb.rot = 0;
    if (k === res.shakes && !res.caught) break;
  }
  await G.wait(20);
  if (res.caught) {
    G.audio.sfx('caught');
    burst('Sparkle', b.orb.x, b.orb.y - 4, 22, { speed: 2.2, life: 40, up: true, size: 3 });
    for (let i = 0; i < 12; i++) { b.orb.s = 1 + Math.sin(i / 12 * Math.PI) * .25; await G.nextFrame(); }
    b.orb.s = 1.08;
    await msg(`Gotcha! ${G.name(b.foe.c)} was caught!`, 50);
    b.orb = null; b.showFoe = false;
    mark(b.foe.c.id, 2);
    const c = b.foe.c; c.stats = G.calcStats(c);
    if (G.state.party.length < 6) { G.state.party.push(c); await msg(`${G.name(c)} has been added to your party.`); }
    else { G.state.box.push(c); await msg(`${G.name(c)} was sent to the PC.`); }
    return 'caught';
  }
  b.orb = null; b.foe.hidden = false; await popIn(b.foe);
  await msg(['Oh no! The creature broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!', 'Shoot! It was so close, too!'][res.shakes]);
  return null;
}

// ---- Items in battle ------------------------------------------------------
async function useItem(a) {
  const c = G.state.party[a.idx], r = G.applyItem(c, a.item);
  if (!G.cheat('items')) { G.state.bag[a.item]--; if (!G.state.bag[a.item]) delete G.state.bag[a.item]; }
  if (c === b.me.c) { G.audio.sfx('heal'); await drain(b.me); }
  await msg(`${G.state.name} used the ${a.item.toUpperCase()}!\n${r.msg}`);
}

// ---- Turn flow ------------------------------------------------------------
async function endOfTurn(f) {
  if (f.c.hp <= 0) return;
  if ((f.c.status === 'psn' || f.c.status === 'brn') && !(G.cheat('god') && G.state.party.includes(f.c))) {
    f.c.hp = Math.max(0, f.c.hp - Math.max(1, Math.floor(f.c.stats.hp / 8)));
    await shake(f); await drain(f);
    await msg(`${nm(f)} is hurt by its ${f.c.status === 'psn' ? 'poison' : 'burn'}!`);
  }
}
// Resolves a faint; returns 'win' | 'lose' | null.
async function afterFaint() {
  if (b.foe.c.hp <= 0 && !b.foe.hidden) {
    await faint(b.foe); b.showFoe = false;
    await awardExp(b.foe);
    if (!b.wild && b.trainer.team.some(c => c.hp > 0)) {
      const next = b.trainer.team.find(c => c.hp > 0);
      await msg(`${b.trainer.cls} ${b.trainer.name} is about to send out ${G.name(next)}!`);
      await sendOutFoe(next);
    } else return 'win';
  }
  if (b.me.c.hp <= 0 && !b.me.hidden) {
    await faint(b.me); b.showMe = false;
    if (!G.state.party.some(c => c.hp > 0)) return 'lose';
    await doSwitch(await forcedSwitch(), true);
  }
  return null;
}
async function turn() {
  const my = await chooseAction();
  G.ui.text = null;
  const foeMove = pickMove(b.foe, b.me);
  if (my.t === 'run') {
    b.escapes = (b.escapes || 0) + 1;
    const odds = Math.floor(speed(b.me) * 128 / Math.max(1, speed(b.foe))) + 30 * b.escapes;
    if (odds > 255 || rnd(256) < odds) { await msg('Got away safely!'); return 'ran'; }
    await msg("Can't escape!");
  } else if (my.t === 'orb') { if (await throwOrb(my.item) === 'caught') return 'caught'; }
  else if (my.t === 'item') await useItem(my);
  else if (my.t === 'switch') await doSwitch(my.idx);
  let order = [];
  if (my.t === 'move') order.push([b.me, b.foe, my.move]);
  order.push([b.foe, b.me, foeMove]);
  if (my.t === 'move') {
    const pm = (my.move.pri || 0) - (foeMove.pri || 0);
    if (pm < 0 || (pm === 0 && (speed(b.foe) > speed(b.me) || (speed(b.foe) === speed(b.me) && rnd(2))))) order.reverse();
  }
  for (const [att, def, mv] of order) {
    if (att.c.hp <= 0 || att.hidden || (att === b.me && b.me.c !== G.state.party[G.state.party.indexOf(att.c)])) continue;
    await useMove(att, def, mv);
    const r = await afterFaint(); if (r) return r;
    if (att === b.foe && b.foe.c.hp <= 0) break;
  }
  for (const f of [b.me, b.foe]) { await endOfTurn(f); const r = await afterFaint(); if (r) return r; }
  return null;
}

// ---- Entry point ----------------------------------------------------------
// opts: { wild: creature, bg } or { trainer: { name, cls, team: [creatures], style, prize, win, lose }, bg }
G.startBattle = async function (opts) {
  const prev = G.scene, party = G.state.party;
  G.audio.music('battle');
  for (let i = 0; i < 3; i++) { await G.fadeTo(.9, 3, '#ffffff'); await G.fadeTo(0, 3); }
  for (let i = 0; i <= 22; i++) { G.ui.wipe = i / 22; await G.nextFrame(); }
  const lead = party.find(c => c.hp > 0);
  b = { wild: !!opts.wild, trainer: opts.trainer, bg: opts.bg || 'grass', showFoe: false, showMe: false, fx: null, orb: null, escapes: 0 };
  b.me = mkF(lead); b.foe = mkF(opts.wild || opts.trainer.team.find(c => c.hp > 0));
  const mine = G.charSprite(G.state.style)[1][0], big = img => img;   // portraits are already high resolution; drawn into a 48x60 box
  b.tMe = { img: big(mine), x: 20, y: 50, ox: 0 };
  G.ui.style = 'dark'; G.scene = scene; G.ui.fade.a = 0;
  if (!b.wild) b.tFoe = { img: big(G.charSprite(opts.trainer.style)[0][0]), x: 160, y: 10, ox: 0 };
  G.ui.wipe = 0; await G.wait(8);
  // intro
  if (b.wild) {
    mark(b.foe.c.id, Math.max(1, G.state.dex[b.foe.c.id] || 0));
    b.foe.hidden = false; b.showFoe = true; { const a = act(b.foe); if (a) { a.reset(); a.play('walk'); } } await slide(b.foe, 'ox', 110, 0, 24);
    await msg(`A wild ${G.name(b.foe.c)} appeared!`, 40);
  } else {
    const seen = G.state.seenIntro = G.state.seenIntro || {}, key = opts.trainer.cls + ':' + opts.trainer.name, skip = G.pref('battle.skipSeenIntros') && seen[key];
    b.tFoe.ox = 110; await slide(b.tFoe, 'ox', 110, 0, skip ? 8 : 24);
    if (!skip) await msg(`${opts.trainer.cls} ${opts.trainer.name}\nwould like to battle!`, 50);
    seen[key] = true;
    await msg(`${opts.trainer.name} sent out ${G.name(b.foe.c)}!`, 24);
    await slide(b.tFoe, 'ox', 0, 110, 18); b.tFoe = null;
    b.showFoe = true; mark(b.foe.c.id, Math.max(1, G.state.dex[b.foe.c.id] || 0)); await popIn(b.foe);
  }
  b.foe.participants.add(lead);
  let result = null;
  // An orb thrown at a roaming creature on the map opens the battle with that capture attempt.
  if (opts.throwFirst && b.wild && G.state.bag[opts.throwFirst] > 0) { if (await throwOrb(opts.throwFirst) === 'caught') result = 'caught'; }
  if (!result) {
    await msg(opts.throwFirst ? `It broke free! Go! ${G.name(lead)}!` : `Go! ${G.name(lead)}!`, 16);
    await slide(b.tMe, 'ox', 0, -90, 16); b.tMe = null;
    b.showMe = true; mark(lead.id, 2); await popIn(b.me);
  }
  // battle loop
  while (!result) result = await turn();
  // wrap-up: the winner celebrates (3D actors)
  { const w = result === 'win' ? b.me : result === 'lose' ? b.foe : null, a = w && !w.hidden && act(w); if (a) await a.play('victory'); }
  if (result === 'win' && !b.wild) {
    const t = b.trainer, last = t.team[t.team.length - 1];
    b.tFoe = { img: big(G.charSprite(t.style)[0][0]), x: 160, y: 10, ox: 110 }; await slide(b.tFoe, 'ox', 110, 0, 18);
    await msg(`${G.state.name} defeated\n${t.cls} ${t.name}!`, 40);
    if (t.win) await msg(t.win, 0);
    const prize = last.lvl * (t.prize || 40); G.state.money += prize;
    await msg(`${G.state.name} got $${prize} for winning!`);
    b.tFoe = null;
  }
  if (result === 'lose') { G.ui.layers.length = 0; await msg(`${G.state.name} is out of usable creatures!`); await msg(`${G.state.name} whited out!`); }
  party.forEach(c => { if (c.status === 'slp') c.status = null; });
  G.closeText(); G.ui.style = 'light';
  await G.fadeTo(1, 14, '#000000');
  G.scene = prev; b = null; if (G.c3d && G.c3d.live) G.c3d.live.clear();
  return result;
};

// ---- Evolution ------------------------------------------------------------
G.runEvolutions = async function () {
  for (const c of G.state.party) {
    if (!c.evolveReady) continue; c.evolveReady = false;
    const evo = G.SPECIES[c.id].evo; if (!evo || c.lvl < evo[0]) continue;
    const prev = G.scene, from = c.id, to = evo[1];
    let t = 0, show = from, flash = 0;
    G.scene = { update() { t++; }, draw(ctx) {
      K.blit(ctx, K.cache('evo-bg', 240, 160, x => {
        const g = x.createRadialGradient(120, 52, 4, 120, 60, 170); g.addColorStop(0, '#5a4aa8'); g.addColorStop(.45, '#2a2460'); g.addColorStop(1, '#120f2e');
        x.fillStyle = g; x.fillRect(0, 0, 240, 160);
        for (let i = 0; i < 16; i++) { x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.moveTo(120, 52); const a0 = i / 16 * Math.PI * 2; x.arc(120, 52, 220, a0, a0 + .14); x.fill(); }
      }, { pad: 0, qmax: 6 }), 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      K.drawGlow(ctx, flash ? '#ffffff' : '#ffe066', 120, 52, 46 + Math.sin(t / 6) * 6, flash ? 1 : .55);
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + t / 40, r = 34 + Math.sin(t / 10 + i) * 8; K.drawGlow(ctx, i % 2 ? '#ffe066' : '#8ff5ea', 120 + Math.cos(a) * r, 52 + Math.sin(a) * r * .8, 3, .9); }
      ctx.globalCompositeOperation = 'source-over';
      const img = G.creatureSprite(show), im = flash ? G.tint(img, '#ffffff') : img, bob = Math.sin(t / 14) * 1.5;
      ctx.drawImage(im, 88, 20 + bob, 64, 64);
    } };
    G.ui.style = 'dark'; G.audio.music(null);
    await G.fadeTo(0, 14, '#000');
    await msg(`What? ${G.name(c)} is evolving!`, 40);
    for (let i = 0; i < 60; i++) { if (i % 6 === 0) { show = show === from ? to : from; flash = i > 24 && G.flashOK() ? 1 : 0; } else if (i % 6 === 3) flash = 0; await G.nextFrame(); }
    show = to; flash = 0; c.id = to; c.stats = G.calcStats(c);
    G.audio.sfx('levelup'); G.state.dex[to] = 2;
    c.hp = Math.min(c.stats.hp, c.hp + 5);
    await msg(`Congratulations! Your ${G.SPECIES[from].name.toUpperCase()} evolved into ${G.name(c)}!`, 0);
    for (const m of G.movesAt(c, c.lvl)) if (!c.moves.some(x => x.id === m) && c.moves.length < 4) c.moves.push({ id: m, pp: G.MOVES[m].pp });
    G.closeText(); G.ui.style = 'light'; await G.fadeTo(1, 12, '#000'); G.scene = prev;
  }
};
})();
