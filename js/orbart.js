// Capture orbs: ten designs (Terra, Aqua, Flare, Verdant, Void, Frost, Gale, Stone, Pulse, Mythic), drawn procedurally
// in the game's soft, glossy, toy-like style. Each design is painted once into a 128 px cache and reused everywhere:
// the battle throw, items lying on the map, the overworld throw arc, the bag and the touch button.
(function () {
const G = globalThis.G;
const TAU = Math.PI * 2, C = 64, R = 52;

// Item name -> orb style, and each orb's catch rule (see G.orbBonus).
G.ORBS = {
  'Terra Orb':   { style: 'terra',   mult: 1,   desc: 'The standard capture orb. Reliable for most creatures.', tag: 'BALANCED' },
  'Aqua Orb':    { style: 'aqua',    mult: 1,   types: ['Water'], best: 3, desc: 'Catches Water-type creatures far more easily.', tag: 'WATER' },
  'Flare Orb':   { style: 'flare',   mult: 1,   types: ['Fire'], best: 3, desc: 'Catches Fire-type creatures far more easily.', tag: 'FIRE' },
  'Verdant Orb': { style: 'verdant', mult: 1,   types: ['Grass', 'Bug'], best: 3, desc: 'Better on Grass and Bug creatures of field and forest.', tag: 'NATURE' },
  'Void Orb':    { style: 'void',    mult: 1,   types: ['Ghost', 'Dark', 'Psychic'], rare: true, best: 3, desc: 'Better on Ghost, Dark and Psychic creatures, and on rare ones.', tag: 'RARE' },
  'Frost Orb':   { style: 'frost',   mult: 1,   types: ['Ice'], best: 3, desc: 'Catches Ice-type creatures far more easily.', tag: 'ICE' },
  'Gale Orb':    { style: 'gale',    mult: 1,   types: ['Flying'], best: 3, desc: 'Catches Flying-type creatures far more easily.', tag: 'AIR' },
  'Stone Orb':   { style: 'stone',   mult: 1,   types: ['Rock', 'Ground', 'Steel'], best: 3, desc: 'Better on Rock, Ground and Steel creatures.', tag: 'GROUND' },
  'Pulse Orb':   { style: 'pulse',   mult: 1.5, active: true, best: 2.5, desc: 'A strong orb, even better on fast or fierce creatures.', tag: 'AGGRESSIVE' },
  'Mythic Orb':  { style: 'mythic',  mult: 2,   legend: true, best: 4, desc: 'The highest catch rate. Made for legendary creatures.', tag: 'LEGENDARY' },
};
const LEGENDS = new Set([25, 153, 154, 155, 156]);
// Catch-rate multiplier for throwing `item` at wild creature `c`.
G.orbBonus = function (item, c) {
  const o = G.ORBS[item], it = G.ITEMS[item] || {};
  if (!o) return it.mult || 1;
  const sp = G.SPECIES[c.id] || { types: [], base: [0, 0, 0, 0, 0, 0], catchRate: 255 };
  if (o.types && sp.types.some(t => o.types.includes(t))) return o.best;
  if (o.rare && (sp.catchRate || 255) <= 45) return o.best;
  if (o.active && (sp.base[5] >= 80 || sp.base[1] >= 90)) return o.best;
  if (o.legend && (LEGENDS.has(c.id) || (sp.catchRate || 255) <= 30)) return o.best;
  return o.mult;
};
G.orbStyleOf = item => (G.ORBS[item] && G.ORBS[item].style) || 'terra';

// ---- Painting helpers ---------------------------------------------------------------------
function lin(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function rad(x, cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
const ball = x => { x.beginPath(); x.arc(C, C, R, 0, TAU); };
function sphere(x, light, mid, dark) { ball(x); x.fillStyle = rad(x, C - 18, C - 22, 4, R * 1.25, [light, mid, dark]); x.fill(); }
function clipBall(x, fn) { x.save(); ball(x); x.clip(); fn(); x.restore(); }
// Volume pass over the whole ball: a rim shadow bottom-right, a soft rim light, a glossy highlight top-left.
function finish(x, rim) {
  clipBall(x, () => {
    x.fillStyle = rad(x, C - 16, C - 20, R * .55, R * 1.15, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(20,10,40,.38)']); x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 3; x.beginPath(); x.arc(C, C, R - 2, Math.PI * 1.05, Math.PI * 1.55); x.stroke();
  });
  x.save(); x.translate(C - 22, C - 26); x.rotate(-.6);
  x.fillStyle = rad(x, 0, 0, 0, 16, ['rgba(255,255,255,.85)', 'rgba(255,255,255,.25)', 'rgba(255,255,255,0)']); x.beginPath(); x.ellipse(0, 0, 16, 9, 0, 0, TAU); x.fill();
  x.restore();
  x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(C - 26, C - 30, 4, 2.4, -.6, 0, TAU); x.fill();
  ball(x); x.lineWidth = 3.2; x.strokeStyle = rim; x.stroke();
}
// Glowing round emblem in the middle: a rim ring, a lit disc and an icon.
function emblem(x, r, ring, glowA, glowB, icon, iconCol) {
  x.save(); x.shadowColor = glowA; x.shadowBlur = 14;
  x.fillStyle = ring; x.beginPath(); x.arc(C, C, r + 5, 0, TAU); x.fill(); x.restore();
  x.fillStyle = rad(x, C - 3, C - 4, 1, r, [glowA, glowB]); x.beginPath(); x.arc(C, C, r, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 1.5; x.beginPath(); x.arc(C, C, r - 2, Math.PI * 1.1, Math.PI * 1.7); x.stroke();
  if (icon) { x.save(); x.translate(C, C); icon(x, r * .62, iconCol || '#fff'); x.restore(); }
}
const leaf = (x, s, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(-s * .2, s); x.bezierCurveTo(-s * 1.1, s * .1, -s * .5, -s * .9, s * .55, -s); x.bezierCurveTo(s * .7, -s * .1, s * .5, s * .7, -s * .2, s); x.fill(); x.strokeStyle = 'rgba(0,60,0,.35)'; x.lineWidth = s * .12; x.beginPath(); x.moveTo(-s * .15, s * .85); x.quadraticCurveTo(0, 0, s * .45, -s * .85); x.stroke(); };
const flame = (x, s, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, s); x.bezierCurveTo(-s * .95, s * .7, -s * .7, -s * .2, 0, -s); x.bezierCurveTo(s * .1, -s * .3, s * .9, -s * .1, s * .7, s * .4); x.bezierCurveTo(s * .6, s * .8, s * .3, s, 0, s); x.fill(); x.fillStyle = 'rgba(255,240,180,.9)'; x.beginPath(); x.moveTo(0, s * .85); x.bezierCurveTo(-s * .45, s * .5, -s * .2, 0, 0, -s * .25); x.bezierCurveTo(s * .35, s * .2, s * .35, s * .7, 0, s * .85); x.fill(); };
const flake = (x, s, col) => { x.strokeStyle = col; x.lineWidth = s * .18; x.lineCap = 'round'; for (let i = 0; i < 6; i++) { x.save(); x.rotate(i * Math.PI / 3); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -s); x.moveTo(0, -s * .55); x.lineTo(-s * .3, -s * .8); x.moveTo(0, -s * .55); x.lineTo(s * .3, -s * .8); x.stroke(); x.restore(); } };
const mountain = (x, s, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(-s, s * .7); x.lineTo(-s * .25, -s * .6); x.lineTo(s * .1, -s * .05); x.lineTo(s * .4, -s * .45); x.lineTo(s, s * .7); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.moveTo(-s * .25, -s * .6); x.lineTo(-s * .45, -s * .28); x.lineTo(-s * .05, -s * .25); x.closePath(); x.fill(); };
const star = (x, s, col, n) => { n = n || 4; x.fillStyle = col; x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, r = i % 2 ? s * .32 : s; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); };
function swirl(x, cx, cy, r, turns, col, w) { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); for (let i = 0; i <= 60; i++) { const k = i / 60, a = k * TAU * turns, rr = r * (1 - k * .85); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.stroke(); }
// deterministic pseudo-random
const rnd = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
function sparkles(x, n, col, seed, inR) { const r = rnd(seed); for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * (inR || R * .8); x.fillStyle = col; x.globalAlpha = .4 + r() * .6; x.beginPath(); x.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, .6 + r() * 1.6, 0, TAU); x.fill(); } x.globalAlpha = 1; }
// Hex-ish plates (Flare, Stone): a jittered grid of rounded polygons with gaps.
function plates(x, fill, gap, glow, seed) {
  const r = rnd(seed), pts = [];
  for (let j = -1; j < 7; j++) for (let i = -1; i < 7; i++) pts.push([i * 22 + (j % 2) * 11 + (r() - .5) * 6, j * 20 + (r() - .5) * 6]);
  clipBall(x, () => {
    x.fillStyle = gap; x.fillRect(0, 0, 128, 128);
    if (glow) { x.fillStyle = rad(x, C, C, 4, R, ['#ffe08a', gap, glow]); x.fillRect(0, 0, 128, 128); }
    for (const [px, py] of pts) {
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + .3, rr = 11 + r() * 1.2; x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } x.closePath();
      x.fillStyle = typeof fill === 'function' ? fill(px, py, r) : fill; x.fill();
      x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(px - 3, py - 3, 3.5, 0, TAU); x.fill();
    }
  });
}

// ---- The ten designs ------------------------------------------------------------------------
const PAINT = {
  terra(x) {
    sphere(x, '#c9935a', '#8a5a2c', '#4a2c14');
    clipBall(x, () => {   // wood grain, a pale stone band and leafy vines
      x.strokeStyle = 'rgba(60,30,10,.35)'; x.lineWidth = 2; for (let i = -3; i < 6; i++) { x.beginPath(); x.moveTo(0, 20 + i * 14); x.bezierCurveTo(40, 8 + i * 14, 80, 36 + i * 14, 128, 18 + i * 14); x.stroke(); }
      x.fillStyle = lin(x, 0, 0, 128, 128, ['#efe2b8', '#cbb98a']); x.beginPath(); x.moveTo(0, 74); x.bezierCurveTo(30, 60, 50, 92, 128, 64); x.lineTo(128, 82); x.bezierCurveTo(60, 104, 34, 78, 0, 92); x.fill();
      x.strokeStyle = 'rgba(120,100,60,.5)'; x.lineWidth = 1.5; x.stroke();
    });
    [[96, 30, .5, 11], [104, 46, 1.3, 9], [84, 20, -.3, 9], [30, 100, 2.6, 9], [22, 86, 3.3, 7]].forEach(([lx, ly, a, s]) => { x.save(); x.translate(lx, ly); x.rotate(a); leaf(x, s, '#6cc84a'); x.restore(); });
    emblem(x, 17, '#3d5a26', '#e8ffb0', '#5cc834', leaf, '#3a8a1e');
    finish(x, '#3a2410');
  },
  aqua(x) {
    sphere(x, '#f4f8ff', '#b8c6da', '#6a7a96');
    clipBall(x, () => {   // a blue glass core seen through the silver shell, with a swirl
      x.save(); x.beginPath(); x.ellipse(C + 4, C + 2, 40, 44, -.4, 0, TAU); x.clip();
      x.fillStyle = rad(x, C, C, 4, 46, ['#bff4ff', '#2aa8f0', '#0a4aa8']); x.fillRect(0, 0, 128, 128);
      swirl(x, C + 2, C, 34, 1.6, 'rgba(220,250,255,.95)', 6); swirl(x, C + 2, C, 26, 1.4, 'rgba(120,220,255,.7)', 3);
      sparkles(x, 16, '#ffffff', 7, 36); x.restore();
      x.strokeStyle = '#8a9ab4'; x.lineWidth = 7; x.beginPath(); x.ellipse(C + 4, C + 2, 40, 44, -.4, 0, TAU); x.stroke();
      x.strokeStyle = '#f2f6ff'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(C + 4, C + 2, 42, 46, -.4, Math.PI * 1.1, Math.PI * 1.8); x.stroke();
    });
    finish(x, '#4a5a78');
  },
  flare(x) {
    sphere(x, '#6a5048', '#3a2a26', '#1a1210');
    plates(x, (px, py, r) => ['#4a3a34', '#3c2e2a', '#58463e'][Math.floor(r() * 3)], '#ff7a1a', '#ff4a0a', 11);
    emblem(x, 17, '#2a1a12', '#fff0a0', '#ff6a14', flame, '#ffb020');
    finish(x, '#140a06');
  },
  verdant(x) {
    sphere(x, '#c8ff9a', '#4cc04a', '#1a6a2a');
    clipBall(x, () => {   // crystal facets
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9; x.beginPath(); x.moveTo(C, C); x.lineTo(C + Math.cos(a) * 80, C + Math.sin(a) * 80); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 9; i += 2) { const a = i * TAU / 9; x.beginPath(); x.moveTo(C, C); x.lineTo(C + Math.cos(a) * 80, C + Math.sin(a) * 80); x.lineTo(C + Math.cos(a + TAU / 9) * 80, C + Math.sin(a + TAU / 9) * 80); x.fill(); }
    });
    x.save(); x.beginPath(); x.arc(C, C, R + 4, 0, TAU); x.clip();
    x.strokeStyle = '#7a4a22'; x.lineCap = 'round';   // a cage of roots
    [[6, 30, 64, 4, 122, 34], [8, 96, 60, 124, 120, 90], [20, 20, 30, 80, 46, 122], [108, 20, 96, 70, 84, 122]].forEach(([a, b, c, d, e, f]) => { x.lineWidth = 6; x.strokeStyle = '#6a3e1a'; x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(c, d, e, f); x.stroke(); x.lineWidth = 2; x.strokeStyle = '#b07a44'; x.stroke(); });
    x.restore();
    [[100, 14, .6, 11], [26, 14, -.6, 10], [112, 70, 1.6, 8]].forEach(([lx, ly, a, s]) => { x.save(); x.translate(lx, ly); x.rotate(a); leaf(x, s, '#8af05a'); x.restore(); });
    emblem(x, 17, '#1e5a22', '#f0ffc0', '#58d040', leaf, '#2a8a2a');
    finish(x, '#124a1a');
  },
  void(x) {
    sphere(x, '#b06aff', '#4a1a8a', '#120628');
    clipBall(x, () => {   // a galaxy swirl
      x.fillStyle = rad(x, C, C, 2, 40, ['rgba(255,220,255,.95)', 'rgba(200,110,255,.6)', 'rgba(80,20,160,0)']); x.fillRect(0, 0, 128, 128);
      swirl(x, C, C, 44, 1.8, 'rgba(230,170,255,.8)', 5); swirl(x, C, C, 38, 1.5, 'rgba(150,80,255,.7)', 3);
      sparkles(x, 40, '#ffffff', 23);
    });
    x.fillStyle = lin(x, 0, 0, 0, 128, ['#f0f2fa', '#8a90a8']);   // silver claws
    for (const s of [-1, 1]) { x.save(); x.translate(C, C); x.scale(s, 1); x.beginPath(); x.arc(0, 0, R + 1, -1.1, 1.1); x.arc(-8, 0, R - 6, 1.0, -1.0, true); x.closePath(); x.fill(); x.strokeStyle = '#5a6078'; x.lineWidth = 1.5; x.stroke(); x.restore(); }
    finish(x, '#0e0420');
  },
  frost(x) {
    sphere(x, '#f4ffff', '#8ad4f4', '#2a78c0');
    clipBall(x, () => {   // ice facets
      const r = rnd(5); for (let i = 0; i < 26; i++) { const px = r() * 128, py = r() * 128, s = 12 + r() * 16; x.fillStyle = `rgba(255,255,255,${.08 + r() * .2})`; x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + s * .8, py + s * .5); x.lineTo(px - s * .8, py + s * .5); x.closePath(); x.fill(); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.stroke(); }
    });
    x.save(); x.translate(C, C);   // hexagon emblem
    const hex = rr => { x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); };
    x.shadowColor = '#bff4ff'; x.shadowBlur = 12; hex(24); x.fillStyle = lin(x, 0, -24, 0, 24, ['#a8b8d0', '#4a5a7a']); x.fill(); x.shadowBlur = 0;
    hex(18); x.fillStyle = rad(x, -3, -4, 1, 20, ['#e8ffff', '#3ab4f4', '#145aa8']); x.fill();
    flake(x, 11, '#ffffff'); x.restore();
    finish(x, '#1a4a8a');
  },
  gale(x) {
    sphere(x, '#ffffff', '#e4e6ee', '#9aa0b4');
    clipBall(x, () => {
      x.fillStyle = rad(x, C, C, 2, 30, ['#ffffff', '#c8dcff', 'rgba(160,190,240,.2)']); x.beginPath(); x.arc(C, C, 30, 0, TAU); x.fill();
      swirl(x, C, C, 26, 1.5, 'rgba(110,150,240,.85)', 4);
      x.strokeStyle = '#d8a83a'; x.lineCap = 'round';   // gold swirl bands
      for (const [a, w] of [[0, 7], [Math.PI, 7], [Math.PI / 2, 4]]) { x.save(); x.translate(C, C); x.rotate(a); x.lineWidth = w; x.beginPath(); x.arc(-6, 6, 50, -2.2, -.6); x.stroke(); x.lineWidth = w * .35; x.strokeStyle = '#fff2b0'; x.stroke(); x.strokeStyle = '#d8a83a'; x.restore(); }
    });
    finish(x, '#7a8098');
  },
  stone(x) {
    sphere(x, '#9a948c', '#5a544e', '#2a2622');
    plates(x, (px, py, r) => ['#8a847c', '#6e6862', '#a29c92'][Math.floor(r() * 3)], '#24201c', null, 31);
    emblem(x, 17, '#4a3a20', '#fff2b0', '#e0a02a', mountain, '#6a4a10');
    finish(x, '#1a1612');
  },
  pulse(x) {
    sphere(x, '#ffffff', '#d2d8e4', '#7a8498');
    clipBall(x, () => {   // tech panel seams
      x.strokeStyle = 'rgba(70,90,120,.45)'; x.lineWidth = 1.6;
      [[0, 40, 128, 52], [0, 86, 128, 80], [44, 0, 36, 128], [92, 0, 98, 128]].forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); });
      x.fillStyle = 'rgba(50,70,100,.18)'; x.fillRect(96, 40, 40, 46);
    });
    const ring = (cx, cy, r, w) => { x.save(); x.shadowColor = '#3af0ff'; x.shadowBlur = 12; x.strokeStyle = '#2ad8ff'; x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.stroke(); x.restore(); };
    x.fillStyle = '#2a3448'; x.beginPath(); x.arc(C - 6, C, 24, 0, TAU); x.fill();          // main lens
    ring(C - 6, C, 19, 5); x.fillStyle = rad(x, C - 9, C - 3, 1, 14, ['#e8ffff', '#3ae0ff', '#0a6a9a']); x.beginPath(); x.arc(C - 6, C, 12, 0, TAU); x.fill();
    x.fillStyle = '#2a3448'; x.beginPath(); x.arc(C + 40, C + 2, 11, 0, TAU); x.fill(); ring(C + 40, C + 2, 7, 3);   // side port
    finish(x, '#4a5468');
  },
  mythic(x) {
    sphere(x, '#ffe68a', '#d49a2a', '#7a4a10');
    clipBall(x, () => {
      x.fillStyle = rad(x, C, C, 2, 40, ['#ffd0ff', '#a050ff', '#3a1080']); x.beginPath(); x.arc(C, C, 40, 0, TAU); x.fill();
      swirl(x, C, C, 36, 1.4, 'rgba(255,160,240,.6)', 4); sparkles(x, 30, '#ffffff', 41, 36);
      x.strokeStyle = '#ffe9a0'; x.lineWidth = 5; x.beginPath(); x.arc(C, C, 41, 0, TAU); x.stroke();
      x.strokeStyle = '#a06a14'; x.lineWidth = 1.5; x.beginPath(); x.arc(C, C, 44, 0, TAU); x.stroke();
    });
    for (const [gx, gy] of [[C, 12], [C, 116], [12, C], [116, C]]) { x.save(); x.translate(gx, gy); x.rotate(Math.PI / 4); x.fillStyle = lin(x, -6, -6, 6, 6, ['#f0b0ff', '#8a2ad8']); x.fillRect(-6, -6, 12, 12); x.strokeStyle = '#ffe9a0'; x.lineWidth = 2; x.strokeRect(-6, -6, 12, 12); x.restore(); }
    x.save(); x.translate(C, C); x.shadowColor = '#fff2b0'; x.shadowBlur = 14; star(x, 24, '#ffe28a'); x.shadowBlur = 0; star(x, 15, '#fffbe0'); x.restore();
    finish(x, '#5a3408');
  },
};

// ---- Cache and draw ---------------------------------------------------------------------------
const cache = {};
G.orbImage = function (style) {
  style = PAINT[style] ? style : 'terra';
  if (!cache[style]) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); if (x && x.arc) PAINT[style](x); cache[style] = c; }
  return cache[style];
};
// Draw an orb of `style` centred on (cx, cy), `d` logical px across, rotated by `rot`, with a soft contact shadow if `shadow`.
G.drawOrb = function (ctx, style, cx, cy, d, rot, shadow) {
  if (shadow) { ctx.fillStyle = 'rgba(20,20,40,.22)'; ctx.beginPath(); ctx.ellipse(cx + d * .05, cy + d * .48, d * .38, d * .12, 0, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot);
  ctx.drawImage(G.orbImage(style), -d / 2, -d / 2, d, d);
  ctx.restore();
};
})();
