// The Aurelis world map: layout data (G.WORLD), the illustrated map painter (G.drawWorldMap), the START > MAP screen,
// the destination picker used by creature flight and the helicopter, and ferries (G.ferry). See docs/WORLD.md section 7.
// Layout coordinates are in the reference picture's pixels (1536x1024, docs/world-reference.png); place positions are
// also exposed normalised to 0..1.
(function () {
const G = globalThis.G;
const TAU = Math.PI * 2;
const RW = 1536, RH = 1024;

// ---- Layout data ---------------------------------------------------------------------------------------------
// [id, kind, x, y, badges needed to enter, options]. Positions follow the reference map (WORLD.md correspondence table).
//   tag: where the name tag sits ('b' below, 't' above, 'r' right); lantern: needs the Lantern relit;
//   arena: badge id; port: a point in the sea where ferries leave from.
const SPEC = [
  ['lanternrest', 'town', 640, 500, 0, { tag: 'b' }],
  ['homestead', 'special', 722, 452, 0, { tag: 'r' }],
  ['sunmeadow', 'route', 520, 428, 0, { tag: 't' }],
  ['sunhaven', 'city', 312, 398, 0, { tag: 'b', arena: 'bloom' }],
  ['evergreen', 'route', 385, 262, 1, { tag: 't' }],
  ['driftwood', 'town', 98, 498, 2, { tag: 'r', arena: 'gale', port: [150, 560] }],
  ['verdant', 'island', 300, 108, 3, { tag: 'b', port: [250, 190] }],
  ['mirewood', 'route', 400, 592, 0, { tag: 'b' }],
  ['shore', 'route', 592, 772, 0, { tag: 'b', port: [650, 850] }],
  ['hollow', 'special', 500, 572, 0, { tag: 't', lantern: true }],
  ['stonebridge', 'town', 792, 640, 0, { tag: 'b', arena: 'keystone' }],
  ['whispering', 'route', 1075, 745, 1, { tag: 'b' }],
  ['tidefall', 'island', 240, 800, 3, { tag: 'b', port: [330, 770] }],
  ['moonlit', 'island', 1000, 900, 8, { tag: 'b', port: [920, 900] }],
  ['lakeside', 'town', 690, 352, 0, { tag: 'b', arena: 'tide' }],
  ['ridge', 'route', 560, 300, 0, { tag: 't' }],
  ['cloudpeak', 'route', 655, 172, 3, { tag: 'b' }],
  ['glacier', 'route', 1030, 205, 5, { tag: 'b' }],
  ['frostmere', 'city', 1078, 130, 5, { tag: 'b', arena: 'rime', port: [1170, 38] }],
  ['aurora', 'island', 1405, 95, 8, { tag: 'b', lantern: true, port: [1330, 70] }],
  ['sandsreach', 'route', 1010, 520, 2, { tag: 'b', arena: 'dune' }],
  ['badlands', 'route', 1330, 440, 4, { tag: 'b' }],
  ['emberfall', 'route', 1290, 262, 6, { tag: 'b', arena: 'magma' }],
  ['cobalt', 'city', 1250, 606, 4, { tag: 'b', arena: 'circuit', port: [1345, 720] }],
];
const CAVES = { ridge: [586, 282], evergreen: [392, 318], cloudpeak: [545, 150], glacier: [905, 165], emberfall: [1163, 232], badlands: [1358, 347], sandsreach: [1085, 382], mirewood: [380, 555], stonebridge: [640, 662], whispering: [1035, 705] };
// Where a ferry boat goes between two ports (sea waypoints), keyed 'a>b'.
const SEA_VIA = { 'shore>moonlit': [[760, 880]], 'cobalt>moonlit': [[1240, 800], [1100, 880]], 'driftwood>verdant': [[60, 380], [100, 230]], 'driftwood>tidefall': [[130, 640], [180, 750]], 'frostmere>aurora': [[1250, 30]] };
const KIND_WORD = { city: 'City', town: 'Town', route: 'Wild area', island: 'Island', special: 'Special place' };
const BLURB = {
  lanternrest: 'The hub village around the Great Lantern, with a windmill and farms.',
  homestead: 'Your own land: build, farm and park your vehicles.',
  ridge: 'A switchback trail up to the mouth of Glimmer Mine.',
  sunmeadow: 'Rolling fields, an orchard and a windmill.',
  mirewood: 'A misty marsh of boardwalks and reeds.',
  shore: 'Dunes, tidepools and a lighthouse.',
  hollow: 'A starlit crystal cavern. Something waits inside.',
  sunhaven: 'A harbour city on the west coast.',
  evergreen: 'Deep old forest with a giant tree.',
  driftwood: 'A fishing port under a tall lighthouse.',
  verdant: 'A lush jungle island.',
  stonebridge: 'A town of stone bridges and waterfalls.',
  whispering: 'Glowing woods around a crystal pond.',
  tidefall: 'Islets joined by rope bridges.',
  moonlit: 'A mystical island of glowing purple trees.',
  lakeside: 'A town of piers on a big lake.',
  cloudpeak: 'High peaks with switchbacks and a castle on the summit.',
  glacier: 'A snowy pass of frozen ponds and ice caves.',
  frostmere: 'An ice city with a crystal palace.',
  aurora: 'Far northern isles under the aurora.',
  sandsreach: 'Dunes, ancient ruins and an oasis village.',
  badlands: 'Red mesas, canyons and caves.',
  emberfall: 'A smoking volcano ringed by lava rivers.',
  cobalt: 'A big modern port city with a long bridge.',
};
const PLACES = SPEC.map(([id, kind, x, y, need, o]) => Object.assign({ id, kind, x, y, nx: x / RW, ny: y / RH, need, blurb: BLURB[id] || '', tag: 'b' }, o));
const BYID = {}; PLACES.forEach(p => BYID[p.id] = p);
const WORLD = G.WORLD = { places: PLACES, byId: BYID, edges: [], ferries: [], parent: {}, caves: CAVES, w: RW, h: RH };
const nameOf = p => { const m = G.MAPS[p.id]; return (m && m.name) || p.id.toUpperCase(); };
PLACES.forEach(p => Object.defineProperty(p, 'name', { get: () => nameOf(p), enumerable: true }));

// Interiors belong to the outdoor map that warps into them (the mine belongs to the ridge).
function buildGraph() {
  const maps = G.MAPS, parent = WORLD.parent = {};
  for (const m of Object.values(maps)) if (m.outdoor && BYID[m.id]) parent[m.id] = m.id;
  parent.mine = 'ridge';
  for (let pass = 0; pass < 4; pass++) for (const m of Object.values(maps)) {
    if (parent[m.id]) continue;
    for (const o of Object.values(maps)) if (parent[o.id] && o.warps.some(w => w.to === m.id)) { parent[m.id] = parent[o.id]; break; }
  }
  for (const m of Object.values(maps)) if (!parent[m.id] && !m.outdoor) { const w = m.warps[0]; if (w && parent[w.to]) parent[m.id] = parent[w.to]; }
  // routes: pairs of places joined by warps between their maps
  const seen = new Set(); WORLD.edges = [];
  for (const m of Object.values(maps)) {
    const a = parent[m.id]; if (!a || !BYID[a]) continue;
    for (const w of m.warps) { const b = parent[w.to]; if (!b || b === a || !BYID[b]) continue; const k = a < b ? a + '|' + b : b + '|' + a; if (!seen.has(k)) { seen.add(k); WORLD.edges.push([a < b ? a : b, a < b ? b : a]); } }
  }
  // ferries
  const F = (G.mk && G.mk.FERRIES) || [];
  WORLD.ferries = F.filter(f => BYID[f[0]] && BYID[f[1]]).map(([a, b, n]) => ({ from: a, to: b, badges: n, lantern: !!BYID[b].lantern }));
  return WORLD;
}
buildGraph();
G.worldRebuild = buildGraph;
// The place on the map that a map id belongs to (interiors map to their outdoor parent).
G.worldPlaceOf = id => { const p = WORLD.parent[id] || (G.MAPS[id] && G.MAPS[id].outdoor && id); return p && BYID[p] ? p : null; };
// Services of a place: detected from the labels on its map and the interiors behind it, plus the contract (every town has them).
G.worldServices = function (id) {
  const p = BYID[id], out = { heal: false, shop: false, arena: null, cave: !!CAVES[id], ferry: false, craft: false };
  if (!p) return out;
  const maps = Object.values(G.MAPS).filter(m => WORLD.parent[m.id] === id);
  for (const m of maps) for (const L of m.labels || []) { if (L.style === 'heal' || /HEAL/.test(L.text)) out.heal = true; else if (L.style === 'shop') out.shop = true; else if (L.style === 'craft') out.craft = true; }
  if (p.kind === 'city' || p.kind === 'town') { if (id !== 'driftwood' || out.heal) out.heal = true; out.shop = true; }
  if (id === 'driftwood') out.heal = out.heal || true;
  if (p.arena) out.arena = p.arena;
  else { const m = G.MAPS[id]; const w = m && m.warps.find(w => /^arena_/.test(w.to)); if (w) { const b = (G.BADGES || []).find(b => b.city === id); out.arena = b ? b.id : 'arena'; } }
  out.ferry = WORLD.ferries.some(f => f.from === id || f.to === id);
  return out;
};
G.worldBadge = id => (G.BADGES || []).find(b => b.id === id) || null;
// Wild level range of a place ([lo, hi] or null).
G.worldLevels = function (id) {
  const m = G.MAPS[id]; if (!m || !m.enc || !m.enc.length) return null;
  return [Math.min(...m.enc.map(e => e[1])), Math.max(...m.enc.map(e => e[2]))];
};
const badges = () => (G.badgeCount ? G.badgeCount() : 0);
const lanternLit = () => !!(G.state && G.state.flags && G.state.flags.lanternLit);
// Why a place can't be entered yet (null when open).
G.worldLockWhy = function (id) {
  const p = BYID[id]; if (!p) return null;
  const bits = [];
  if (p.need > badges()) bits.push(`${p.need} Arena Badge${p.need > 1 ? 's' : ''} (you have ${badges()})`);
  if (p.lantern && !lanternLit()) bits.push('the Great Lantern relit');
  return bits.length ? 'Needs ' + bits.join(' and ') + '.' : null;
};
G.worldVisited = id => !!(G.state && G.state.visited && (G.state.visited[id] || (id === 'ridge' && G.state.visited.mine)));

// ---- Painting helpers ---------------------------------------------------------------------------------------------
const rng = s => G.mulberry(s);
const ell = (c, x, y, rx, ry, col, rot) => { c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot || 0, 0, TAU); c.fillStyle = col; c.fill(); };
const circ = (c, x, y, r, col) => ell(c, x, y, r, r, col);
const poly = (c, pts, col) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (col) { c.fillStyle = col; c.fill(); } };
// smooth closed (or open) curve through points (Catmull-Rom as beziers)
function smooth(c, pts, closed) {
  const n = pts.length; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = closed ? pts[(i - 1 + n) % n] : pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = closed ? pts[(i + 2) % n] : pts[Math.min(i + 2, n - 1)];
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) c.closePath();
}
const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
const rad = (c, x, y, r, stops) => { const g = c.createRadialGradient(x, y, 0, x, y, r); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
const inPoly = (x, y, pts) => { let r = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) r = !r; } return r; };
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };

// ---- Geography (reference pixels) ----------------------------------------------------------------------------------------
const CONT = [[112, 300], [150, 235], [205, 207], [270, 216], [345, 200], [420, 152], [470, 120], [520, 72], [575, 40], [640, 14], [720, 22], [790, 32], [860, 62], [940, 46], [1030, 40], [1110, 50], [1180, 72], [1250, 104], [1275, 160], [1268, 212], [1312, 236], [1385, 206], [1450, 216], [1496, 266], [1516, 332], [1500, 402], [1516, 462], [1490, 522], [1446, 566], [1400, 592], [1440, 632], [1472, 662], [1442, 688], [1380, 692], [1312, 668], [1242, 692], [1172, 668], [1132, 702], [1126, 736], [1076, 766], [1012, 796], [950, 802], [902, 792], [862, 816], [802, 812], [742, 802], [690, 822], [640, 832], [580, 832], [526, 816], [486, 786], [470, 746], [500, 706], [470, 690], [410, 666], [340, 656], [272, 652], [226, 626], [200, 586], [214, 546], [240, 510], [232, 470], [238, 420], [226, 386], [172, 372], [120, 346]];
const ISLANDS = {
  verdant: [[205, 100], [225, 70], [265, 55], [315, 60], [350, 85], [345, 120], [320, 150], [270, 160], [250, 190], [215, 195], [185, 170], [190, 130]],
  driftwood: [[48, 520], [62, 470], [90, 440], [125, 450], [150, 485], [140, 540], [165, 565], [130, 590], [85, 575], [50, 555]],
  tidefallA: [[160, 770], [190, 740], [235, 735], [270, 760], [280, 805], [245, 840], [190, 840], [160, 810]],
  tidefallB: [[290, 725], [315, 712], [345, 728], [340, 755], [310, 765]],
  tidefallC: [[130, 715], [152, 700], [170, 716], [158, 736], [134, 732]],
  moonlit: [[890, 905], [900, 860], [945, 835], [1010, 830], [1075, 848], [1110, 890], [1085, 940], [1030, 975], [960, 980], [915, 955]],
  aurora: [[1345, 80], [1365, 50], [1405, 40], [1470, 50], [1500, 85], [1480, 125], [1430, 138], [1375, 128]],
  cobaltIsle: [[1425, 646], [1450, 630], [1478, 640], [1488, 668], [1462, 686], [1435, 676]],
  s1: [[40, 310], [58, 295], [75, 312], [60, 330]], s2: [[100, 600], [125, 590], [140, 612], [115, 632]], s3: [[375, 855], [405, 840], [440, 860], [425, 895], [390, 892]],
  s4: [[480, 870], [515, 850], [550, 872], [535, 910], [495, 905]], s5: [[580, 930], [610, 915], [630, 940], [605, 960]], s6: [[610, 985], [632, 975], [640, 1000], [615, 1008]],
  s7: [[1190, 800], [1215, 785], [1235, 805], [1212, 825]], s8: [[1480, 740], [1510, 720], [1528, 745], [1505, 770]], s9: [[1405, 570], [1425, 560], [1435, 580], [1415, 590]],
  s10: [[1180, 960], [1205, 945], [1220, 970], [1195, 985]], s11: [[1395, 320], [1415, 310], [1425, 335], [1405, 345]], s12: [[1250, 18], [1285, 8], [1300, 30], [1268, 40]],
  s13: [[780, 930], [810, 915], [830, 945], [800, 965]], s14: [[215, 995], [250, 980], [270, 1010], [235, 1020]],
};
const LAKE = [[560, 335], [600, 312], [650, 318], [700, 308], [760, 322], [800, 350], [785, 385], [740, 402], [700, 390], [650, 398], [600, 388], [565, 365]];
const BIOMES = {
  snow: [[835, 60], [1000, 38], [1130, 50], [1255, 100], [1280, 200], [1232, 262], [1130, 268], [1050, 255], [935, 262], [880, 205], [850, 130]],
  volcano: [[1135, 170], [1225, 150], [1310, 138], [1420, 168], [1505, 260], [1478, 342], [1330, 352], [1210, 332], [1146, 262]],
  badlands: [[1168, 338], [1300, 350], [1485, 338], [1514, 425], [1495, 525], [1445, 565], [1340, 545], [1230, 522], [1168, 470]],
  desert: [[908, 425], [1010, 408], [1100, 432], [1172, 470], [1232, 522], [1205, 592], [1130, 615], [1040, 612], [962, 572], [910, 500]],
  swamp: [[228, 540], [330, 518], [450, 520], [530, 558], [552, 620], [500, 672], [400, 652], [300, 662], [228, 622]],
  mountain: [[470, 150], [530, 70], [600, 28], [700, 22], [800, 50], [850, 110], [840, 190], [790, 245], [720, 262], [630, 250], [545, 255], [480, 215]],
  hollow: [[455, 535], [520, 530], [560, 570], [535, 612], [480, 610], [445, 575]],
};
// rivers: [width, points], from the mountains through Lakeside and Stonebridge to the sea
const RIVERS = [
  [13, [[722, 222], [738, 262], [744, 300], [722, 322]]],
  [14, [[792, 352], [840, 338], [888, 326], [914, 352], [906, 392], [880, 430], [858, 470], [846, 520], [838, 565], [850, 610], [836, 655], [820, 700], [802, 742], [796, 800], [792, 830]]],
  [8, [[565, 650], [610, 668], [660, 655], [720, 668], [770, 660], [816, 666]]],
  [7, [[480, 392], [520, 400], [560, 372]]],
  [7, [[880, 430], [930, 450], [960, 470]]],
];
const FALLS = [[744, 290, 18], [906, 366, 20], [803, 728, 26], [836, 662, 10]];
const MOUNTS = (() => {   // Cloudpeak peaks: [x, baseY, w, h, snow]
  const R = rng(5), out = [];
  for (let i = 0; i < 70; i++) { const x = 480 + R() * 380, y = 70 + R() * 190; if (!inPoly(x, y, BIOMES.mountain)) continue; const edge = Math.min(1, Math.hypot((x - 660) / 190, (y - 150) / 120)); out.push([x, y + 36, 56 + R() * 36, 58 + R() * 62 * (1.15 - edge * .5), y < 200 || R() < .3]); }
  out.push([640, 112, 100, 120, true], [722, 120, 90, 100, true], [575, 135, 80, 90, true], [790, 120, 70, 70, true]);
  return out.sort((a, b) => a[1] - b[1]);
})();
const DESERT_RUINS = [[1000, 470], [1030, 545], [1085, 480], [1140, 520], [1095, 585]];
// terrain at a point, for scattering trees
function biomeAt(x, y) {
  if (inPoly(x, y, BIOMES.volcano)) return 'volcano';
  if (inPoly(x, y, BIOMES.snow)) return 'snow';
  if (inPoly(x, y, BIOMES.mountain)) return 'mountain';
  if (inPoly(x, y, BIOMES.badlands)) return 'badlands';
  if (inPoly(x, y, BIOMES.desert)) return 'desert';
  if (inPoly(x, y, BIOMES.swamp)) return 'swamp';
  if (inPoly(x, y, BIOMES.hollow)) return 'hollow';
  return 'grass';
}

// ---- Art pieces -------------------------------------------------------------------------------------------------------------
function tree(c, x, y, r, pal) {
  pal = pal || ['#2f8f3c', '#47ad47', '#76cc5a'];
  ell(c, x + r * .15, y + r * .85, r * 1.05, r * .38, 'rgba(20,50,30,.28)');
  c.fillStyle = '#6a4a2c'; c.fillRect(x - r * .13, y + r * .35, r * .26, r * .55);
  circ(c, x, y, r, pal[0]); circ(c, x - r * .12, y - r * .14, r * .84, pal[1]); circ(c, x - r * .3, y - r * .38, r * .42, pal[2]);
}
function pine(c, x, y, r, pal) {
  pal = pal || ['#1f6a3c', '#2f8a4c', '#e8f4ff'];
  ell(c, x + r * .2, y + r * 1.0, r * .8, r * .3, 'rgba(20,40,50,.25)');
  c.fillStyle = '#5a3c26'; c.fillRect(x - r * .1, y + r * .5, r * .2, r * .5);
  for (let k = 0; k < 3; k++) { const yy = y + r * .5 - k * r * .62, w = r * (.95 - k * .22);
    poly(c, [[x - w, yy], [x, yy - r * .95], [x + w, yy]], k % 2 ? pal[1] : pal[0]);
    poly(c, [[x - w, yy], [x, yy - r * .95], [x - w * .1, yy]], 'rgba(255,255,255,.16)');
    if (pal[2]) poly(c, [[x - w * .62, yy - r * .38], [x, yy - r * .95], [x + w * .62, yy - r * .38], [x + w * .3, yy - r * .3], [x, yy - r * .46], [x - w * .3, yy - r * .3]], pal[2]);
  }
}
function palm(c, x, y, r) {
  ell(c, x + 3, y + 2, r * .7, r * .22, 'rgba(20,50,30,.22)');
  c.strokeStyle = '#8a6a40'; c.lineWidth = r * .22; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + r * .2, y - r * .6, x + r * .1, y - r * 1.1); c.stroke();
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; c.strokeStyle = k % 2 ? '#2f9a50' : '#46b862'; c.lineWidth = r * .22; c.beginPath(); c.moveTo(x + r * .1, y - r * 1.1); c.quadraticCurveTo(x + r * .1 + Math.cos(a) * r * .6, y - r * 1.4 + Math.sin(a) * r * .15, x + r * .1 + Math.cos(a) * r * 1.05, y - r * 1.1 + Math.sin(a) * r * .5); c.stroke(); }
}
function deadTree(c, x, y, r, col) {
  c.strokeStyle = col || '#3a2c2c'; c.lineWidth = Math.max(1.2, r * .2); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y + r * .6); c.lineTo(x, y - r * .5); c.moveTo(x, y - r * .1); c.lineTo(x - r * .5, y - r * .6); c.moveTo(x, y - r * .25); c.lineTo(x + r * .45, y - r * .7); c.stroke();
}
function peak(c, x, by, w, h, snow, pal) {
  pal = pal || ['#8c8478', '#6a6258', '#a8a094'];
  ell(c, x + w * .1, by + 2, w * .55, w * .1, 'rgba(30,30,40,.25)');
  poly(c, [[x - w / 2, by], [x - w * .12, by - h * .55], [x + w * .02, by - h], [x + w * .2, by - h * .62], [x + w / 2, by]], pal[1]);
  poly(c, [[x - w / 2, by], [x - w * .12, by - h * .55], [x + w * .02, by - h], [x + w * .06, by - h * .5], [x - w * .06, by - h * .1], [x - w * .1, by]], pal[2]);
  c.strokeStyle = 'rgba(40,36,34,.35)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x + w * .02, by - h); c.lineTo(x + w * .08, by - h * .45); c.lineTo(x + w * .02, by); c.moveTo(x - w * .12, by - h * .55); c.lineTo(x - w * .22, by - h * .1); c.stroke();
  if (snow) {
    poly(c, [[x + w * .02, by - h], [x - w * .12, by - h * .55], [x - w * .06, by - h * .62], [x - w * .02, by - h * .5], [x + w * .06, by - h * .6], [x + w * .1, by - h * .5], [x + w * .2, by - h * .62]], '#ffffff');
    poly(c, [[x + w * .02, by - h], [x + w * .2, by - h * .62], [x + w * .1, by - h * .5], [x + w * .06, by - h * .6]], '#dbe8f6');
  }
}
function house(c, x, y, s, roof, wall) {
  wall = wall || '#f8efde';
  ell(c, x + s * .3, y + s * .15, s * .9, s * .25, 'rgba(20,30,40,.22)');
  c.fillStyle = wall; c.fillRect(x - s * .5, y - s * .5, s, s * .62); c.fillStyle = 'rgba(0,0,0,.13)'; c.fillRect(x + s * .12, y - s * .5, s * .38, s * .62);
  poly(c, [[x - s * .66, y - s * .46], [x, y - s * 1.12], [x + s * .66, y - s * .46]], roof); poly(c, [[x, y - s * 1.12], [x + s * .66, y - s * .46], [x + s * .1, y - s * .46]], G.shade(roof, .78));
  c.fillStyle = '#7a5a40'; c.fillRect(x - s * .1, y - s * .1, s * .2, s * .22); c.fillStyle = '#9fd8ff'; c.fillRect(x - s * .38, y - s * .34, s * .18, s * .16);
}
function tower(c, x, y, w, h, col, glass) {
  ell(c, x + w * .3, y + 2, w * .9, w * .25, 'rgba(20,30,40,.25)');
  c.fillStyle = col; c.fillRect(x - w / 2, y - h, w, h); c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(x, y - h, w / 2, h);
  poly(c, [[x - w / 2, y - h], [x - w * .3, y - h - w * .25], [x + w * .5, y - h - w * .25], [x + w / 2, y - h]], G.shade(col, 1.25));
  c.fillStyle = glass || '#bfe6ff'; for (let j = 0; j < h / 5 - 1; j++) for (let i = 0; i < 2; i++) c.fillRect(x - w * .36 + i * w * .42, y - h + 3 + j * 5, w * .22, 2.4);
}
function lighthouse(c, x, y, s) {
  ell(c, x + 3, y + 2, s * .8, s * .22, 'rgba(20,30,40,.3)');
  poly(c, [[x - s * .32, y], [x - s * .2, y - s * 1.7], [x + s * .2, y - s * 1.7], [x + s * .32, y]], '#fbf6ec');
  poly(c, [[x - s * .27, y - s * .55], [x - s * .23, y - s * .95], [x + s * .23, y - s * .95], [x + s * .27, y - s * .55]], '#e0504a');
  c.fillStyle = '#4a4a5a'; c.fillRect(x - s * .3, y - s * 1.82, s * .6, s * .14); c.fillStyle = '#ffe680'; c.fillRect(x - s * .17, y - s * 2.08, s * .34, s * .26);
  poly(c, [[x - s * .26, y - s * 2.08], [x, y - s * 2.45], [x + s * .26, y - s * 2.08]], '#e0504a');
}
function cave(c, x, y, s) {
  ell(c, x, y + s * .35, s * .8, s * .25, 'rgba(30,30,40,.25)');
  c.beginPath(); c.moveTo(x - s * .62, y + s * .35); c.quadraticCurveTo(x - s * .7, y - s * .75, x, y - s * .75); c.quadraticCurveTo(x + s * .7, y - s * .75, x + s * .62, y + s * .35); c.closePath(); c.fillStyle = '#7a7268'; c.fill();
  c.beginPath(); c.moveTo(x - s * .38, y + s * .35); c.quadraticCurveTo(x - s * .42, y - s * .45, x, y - s * .45); c.quadraticCurveTo(x + s * .42, y - s * .45, x + s * .38, y + s * .35); c.closePath(); c.fillStyle = '#2c2430'; c.fill();
}
function cloudPuff(c, x, y, s, a) {
  c.save(); c.globalAlpha = a === undefined ? 1 : a;
  ell(c, x, y + s * .5, s * 1.5, s * .3, 'rgba(60,110,170,.22)');
  for (const [dx, dy, r] of [[-.9, .15, .55], [-.35, -.2, .78], [.35, -.28, .9], [1, .05, .62], [.1, .2, .7], [-.5, .3, .5], [.7, .32, .5]]) circ(c, x + dx * s, y + dy * s, r * s, '#ffffff');
  for (const [dx, dy, r] of [[-.2, .42, .6], [.5, .45, .5], [-.8, .4, .4]]) circ(c, x + dx * s, y + dy * s, r * s, 'rgba(206,226,246,.8)');
  c.restore();
}
function drawCloudSprite(k) {   // cached cloud sprite for animated clouds
  return G.kit.cache('wm-cloud' + k, 80, 36, x => { x.translate(0, 0); cloudPuff(x, 40, 16, 13 + k * 2); }, { pad: 2, qmax: 4 });
}

// ---- The static base map -------------------------------------------------------------------------------------------------------
function paintBase(c) {
  const R = rng(2024);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // sea
  c.fillStyle = lin(c, 0, 0, 0, RH, ['#2a86cc', '#1f6cb8', '#1a58a6']); c.fillRect(0, 0, RW, RH);
  c.fillStyle = rad(c, 760, 500, 900, ['rgba(70,190,230,.28)', 'rgba(70,190,230,0)']); c.fillRect(0, 0, RW, RH);
  for (let i = 0; i < 420; i++) { const x = R() * RW, y = R() * RH; c.strokeStyle = `rgba(255,255,255,${.06 + R() * .1})`; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y - 4, x + 16, y); c.stroke(); }
  const lands = [CONT, ...Object.values(ISLANDS)];
  const outline = pts => smooth(c, pts, true);
  // shallows (turquoise rings), then foam
  for (const [w, col] of [[120, 'rgba(60,200,225,.16)'], [84, 'rgba(70,215,232,.2)'], [52, 'rgba(100,228,238,.3)'], [26, 'rgba(150,240,244,.42)']]) {
    c.strokeStyle = col; c.lineWidth = w; for (const L of lands) { outline(L); c.stroke(); }
  }
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 9; for (const L of lands) { outline(L); c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 20; for (const L of lands) { outline(L); c.stroke(); }
  // land
  for (const L of lands) { outline(L); c.fillStyle = '#7bc95a'; c.fill(); }
  // everything else is clipped to land
  const clipLand = fn => { c.save(); c.beginPath(); for (const L of lands) { const n = L.length; c.moveTo(L[0][0], L[0][1]); for (let i = 0; i < n; i++) { const p0 = L[(i - 1 + n) % n], p1 = L[i], p2 = L[(i + 1) % n], p3 = L[(i + 2) % n]; c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); } c.closePath(); } c.clip(); fn(); c.restore(); };
  clipLand(() => {
    c.fillStyle = lin(c, 0, 0, 0, RH, ['#8cd464', '#78c654', '#68b84c']); c.fillRect(0, 0, RW, RH);
    // meadow texture
    for (let i = 0; i < 900; i++) { const x = R() * RW, y = R() * RH; c.fillStyle = R() < .5 ? 'rgba(255,255,200,.08)' : 'rgba(30,110,40,.07)'; c.beginPath(); c.ellipse(x, y, 14 + R() * 26, 6 + R() * 12, R() * 3, 0, TAU); c.fill(); }
    // biome tints, feathered
    const tint = (pts, col, blur) => { c.save(); c.filter = `blur(${blur}px)`; smooth(c, pts, true); c.fillStyle = col; c.fill(); c.restore(); };
    tint(BIOMES.snow, '#e9f4fb', 14); tint(BIOMES.snow.map(([x, y]) => [x * .02 + 1065 * .98 + (x - 1065) * .8, y * .02 + 165 * .98 + (y - 165) * .8]), '#f8fcff', 16);
    tint(BIOMES.mountain, '#9a9288', 18); tint(BIOMES.mountain.map(([x, y]) => [650 + (x - 650) * .8, 150 + (y - 150) * .78]), '#b0a89c', 14);
    tint(BIOMES.volcano, '#4c3c40', 14); tint(BIOMES.volcano.map(([x, y]) => [1320 + (x - 1320) * .72, 245 + (y - 245) * .7]), '#2e2428', 14);
    tint(BIOMES.badlands, '#b8603c', 14); tint(BIOMES.badlands.map(([x, y]) => [1330 + (x - 1330) * .75, 440 + (y - 440) * .7]), '#c8704a', 14);
    tint(BIOMES.desert, '#ebcd86', 14); tint(BIOMES.desert.map(([x, y]) => [1050 + (x - 1050) * .75, 515 + (y - 515) * .7]), '#f4dc9c', 14);
    tint(BIOMES.swamp, '#7a5aa6', 14); tint(BIOMES.swamp.map(([x, y]) => [390 + (x - 390) * .7, 595 + (y - 595) * .7]), '#6a4a98', 12);
    tint(BIOMES.hollow, '#5c64c4', 12);
    // dark forest floors
    for (const [x, y, rx, ry] of [[330, 270, 160, 90], [450, 330, 70, 60], [250, 330, 70, 50], [560, 195, 70, 50], [1060, 700, 150, 100], [980, 760, 60, 40], [700, 580, 90, 55], [900, 330, 80, 50], [740, 760, 60, 30]]) { c.save(); c.filter = 'blur(16px)'; ell(c, x, y, rx, ry, 'rgba(30,110,50,.35)'); c.restore(); }
    // island biomes
    const tint2 = (pts, col, blur) => tint(pts, col, blur);
    tint2(ISLANDS.moonlit, '#6a4aa8', 14); tint2(ISLANDS.aurora, '#4a3a8a', 12); tint2(ISLANDS.verdant, '#58b848', 10); tint2(ISLANDS.tidefallA, '#f4e6aa', 8);
    // beaches: sand along the coast
    c.strokeStyle = 'rgba(245,226,160,.95)'; c.lineWidth = 22; for (const L of lands) { outline(L); c.stroke(); }
    c.strokeStyle = 'rgba(255,244,200,.8)'; c.lineWidth = 9; for (const L of lands) { outline(L); c.stroke(); }
    // cliffs on the south-west and south coast
    c.strokeStyle = 'rgba(110,96,84,.9)'; c.lineWidth = 12; smooth(c, [[470, 700], [510, 690], [560, 700], [600, 690]], false); c.stroke();
    // rivers
    for (const [w, pts] of RIVERS) {
      c.strokeStyle = 'rgba(40,110,160,.5)'; c.lineWidth = w + 6; smooth(c, pts, false); c.stroke();
      c.strokeStyle = '#46b8e8'; c.lineWidth = w; smooth(c, pts, false); c.stroke();
      c.strokeStyle = 'rgba(190,240,255,.8)'; c.lineWidth = w * .3; smooth(c, pts.map(([x, y]) => [x - 1, y - 2]), false); c.stroke();
    }
    // the lake
    smooth(c, LAKE, true); c.fillStyle = '#d8c28a'; c.lineWidth = 16; c.strokeStyle = '#e7d7a0'; c.stroke(); c.fill();
    smooth(c, LAKE, true); c.fillStyle = lin(c, 0, 305, 0, 405, ['#62d4ee', '#2aa0d8']); c.fill();
    c.save(); smooth(c, LAKE, true); c.clip(); for (let i = 0; i < 40; i++) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; const x = 560 + R() * 240, y = 310 + R() * 90; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y - 3, x + 12, y); c.stroke(); } c.restore();
    // lake islet
    smooth(c, [[705, 308], [722, 296], [748, 300], [756, 318], [738, 330], [714, 326]], true); c.fillStyle = '#7bc95a'; c.fill(); c.strokeStyle = '#f2e2a0'; c.lineWidth = 4; c.stroke();
    // waterfalls
    for (const [x, y, h] of FALLS) { c.fillStyle = 'rgba(70,90,110,.55)'; c.fillRect(x - 11, y - 3, 22, h + 6); c.fillStyle = '#e8fbff'; c.fillRect(x - 7, y - 2, 14, h); c.fillStyle = '#9fe0f6'; for (let i = 0; i < 4; i++) c.fillRect(x - 6 + i * 3.4, y, 1.6, h - 2); ell(c, x, y + h + 2, 14, 6, 'rgba(255,255,255,.9)'); }
  });
  // grey cliffs along the fall edges beside the river (south-centre)
  clipLand(() => {
    for (const [pts] of [[[[760, 600], [775, 640], [770, 700], [780, 770], [760, 810]]], [[[880, 430], [905, 470], [890, 560], [880, 640], [870, 740], [850, 810]]], [[[900, 340], [925, 345], [940, 395], [930, 425]]], [[[480, 700], [560, 715], [640, 700], [700, 720], [760, 740]]], [[[705, 215], [690, 250], [700, 290]]]]) {
      c.strokeStyle = '#7e7466'; c.lineWidth = 14; smooth(c, pts, false); c.stroke(); c.strokeStyle = '#a89c8a'; c.lineWidth = 7; smooth(c, pts.map(([x, y]) => [x - 3, y - 4]), false); c.stroke();
    }
  });
  clipLand(() => {
    // desert dunes
    for (let i = 0; i < 90; i++) { const x = 920 + R() * 290, y = 420 + R() * 190; if (!inPoly(x, y, BIOMES.desert)) continue; c.strokeStyle = 'rgba(190,140,70,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 14, y - 8, x + 30, y); c.stroke(); c.strokeStyle = 'rgba(255,245,200,.5)'; c.beginPath(); c.moveTo(x, y - 3); c.quadraticCurveTo(x + 14, y - 11, x + 30, y - 3); c.stroke(); }
    // ruins and rocks in the desert
    for (const [x, y] of DESERT_RUINS) {
      ell(c, x + 6, y + 8, 22, 6, 'rgba(120,80,40,.3)');
      c.fillStyle = '#d6b078'; c.fillRect(x - 14, y - 22, 9, 28); c.fillRect(x + 5, y - 30, 9, 36); c.fillStyle = '#b08a56'; c.fillRect(x - 5, y - 6, 10, 12); c.fillRect(x - 14, y - 22, 3, 28); c.fillRect(x + 5, y - 30, 3, 36);
      c.fillStyle = '#e8c890'; c.fillRect(x - 17, y - 25, 15, 4); c.fillRect(x + 2, y - 33, 15, 4);
    }
    // badlands mesas
    const mesa = (x, y, w, h) => { ell(c, x + 6, y + 6, w * .6, w * .15, 'rgba(60,20,10,.35)'); poly(c, [[x - w / 2, y], [x - w * .42, y - h], [x + w * .4, y - h], [x + w / 2, y]], '#9a4a2c'); poly(c, [[x - w * .42, y - h], [x + w * .4, y - h], [x + w * .36, y - h - 8], [x - w * .38, y - h - 8]], '#d88a58'); c.fillStyle = 'rgba(255,200,150,.2)'; for (let i = 0; i < 3; i++) c.fillRect(x - w * .4 + i * w * .28, y - h, 4, h); c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(x, y - h, w * .4, h); };
    for (let i = 0; i < 60; i++) { const x = 1180 + R() * 320, y = 360 + R() * 190; if (!inPoly(x, y, BIOMES.badlands) || Math.hypot(x - 1330, y - 440) < 40) continue; mesa(x, y, 36 + R() * 40, 18 + R() * 34); }
    // crimson canyon cracks
    c.strokeStyle = 'rgba(80,20,10,.45)'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const x = 1200 + R() * 280, y = 380 + R() * 150; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 20, y + 10, x + 10, y + 30, x + 35, y + 40); c.stroke(); }
    // swamp pools and fountain
    for (let i = 0; i < 16; i++) { const x = 250 + R() * 280, y = 540 + R() * 120; if (!inPoly(x, y, BIOMES.swamp)) continue; ell(c, x, y, 14 + R() * 14, 6 + R() * 6, '#5aa0b8'); ell(c, x - 2, y - 1, 8, 2.5, 'rgba(255,255,255,.35)'); }
    // crystal fountain in the swamp
    ell(c, 430, 575, 22, 9, '#8ad0f0'); poly(c, [[422, 575], [430, 535], [438, 575]], '#c8a8ff'); poly(c, [[430, 535], [438, 575], [432, 575]], '#9a7ae0'); ell(c, 430, 531, 18, 6, 'rgba(160,230,255,.6)');
    // snow field: drifts and frozen ponds
    for (let i = 0; i < 10; i++) { const x = 880 + R() * 380, y = 80 + R() * 170; if (!inPoly(x, y, BIOMES.snow) || inEll(x, y, 1075, 130, 60, 40)) continue; ell(c, x, y, 18 + R() * 12, 8 + R() * 5, '#bfe8fa'); ell(c, x - 3, y - 2, 10, 3, 'rgba(255,255,255,.7)'); }
    // volcano: ash, lava rivers and the cone
    const lava = (pts, w) => { c.strokeStyle = 'rgba(255,120,30,.35)'; c.lineWidth = w + 10; smooth(c, pts, false); c.stroke(); c.strokeStyle = '#ff6a1a'; c.lineWidth = w; smooth(c, pts, false); c.stroke(); c.strokeStyle = '#ffd24a'; c.lineWidth = w * .4; smooth(c, pts, false); c.stroke(); };
    lava([[1320, 175], [1300, 210], [1330, 245], [1290, 280], [1300, 320]], 7); lava([[1330, 175], [1370, 215], [1355, 260], [1400, 295]], 6); lava([[1160, 250], [1190, 290], [1235, 300], [1270, 330]], 6); lava([[1300, 210], [1250, 230], [1215, 215], [1170, 240]], 5); lava([[1370, 215], [1430, 235], [1470, 290]], 5);
    poly(c, [[1235, 285], [1285, 180], [1315, 140], [1345, 140], [1385, 190], [1435, 285]], '#3a2c2e'); poly(c, [[1315, 140], [1345, 140], [1385, 190], [1350, 200], [1330, 160]], '#2a2022'); poly(c, [[1235, 285], [1285, 180], [1300, 190], [1290, 285]], '#5c484a');
    ell(c, 1330, 142, 20, 7, '#1c1416'); ell(c, 1330, 143, 14, 4.5, '#ff8a2a'); ell(c, 1330, 143, 8, 2.5, '#ffe070');
    c.strokeStyle = '#ff7a20'; c.lineWidth = 3; c.beginPath(); c.moveTo(1322, 148); c.lineTo(1306, 190); c.lineTo(1318, 230); c.moveTo(1338, 148); c.lineTo(1356, 195); c.stroke();
    // smoke plume
    for (const [x, y, r, a] of [[1328, 120, 16, .9], [1338, 95, 20, .8], [1350, 68, 24, .65], [1362, 42, 26, .5]]) { c.save(); c.globalAlpha = a; circ(c, x, y, r, '#8a7a82'); circ(c, x - 3, y - 3, r * .7, '#b0a2aa'); c.restore(); }
    // volcano rocks
    for (let i = 0; i < 30; i++) { const x = 1150 + R() * 340, y = 160 + R() * 180; if (!inPoly(x, y, BIOMES.volcano) || Math.hypot(x - 1330, y - 230) < 80) continue; poly(c, [[x - 10, y + 5], [x - 5, y - 8], [x + 5, y - 10], [x + 11, y + 5]], '#2e2428'); poly(c, [[x - 5, y - 8], [x + 5, y - 10], [x + 2, y - 2], [x - 4, y - 2]], '#54444a'); }
    // moonlit and aurora glows
    for (const [x, y] of [[1000, 895], [945, 880], [1060, 890], [1010, 940]]) { c.save(); c.filter = 'blur(8px)'; circ(c, x, y, 24, 'rgba(190,150,255,.5)'); c.restore(); }
    c.save(); c.filter = 'blur(10px)'; circ(c, 1425, 92, 50, 'rgba(160,120,255,.3)'); c.restore();
    // tidefall: rope bridges
    c.strokeStyle = '#a07a4a'; c.lineWidth = 3; c.setLineDash([5, 3]); c.beginPath(); c.moveTo(282, 765); c.lineTo(300, 750); c.moveTo(165, 735); c.lineTo(160, 745); c.stroke(); c.setLineDash([]);
  });
  // bridges over the river
  for (const [x, y, a] of [[832, 490, 0], [868, 330, .1], [800, 662, 0]]) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#6a5848'; c.fillRect(-26, -7, 52, 14); c.fillStyle = '#d8c8a8'; c.fillRect(-26, -5, 52, 10); c.fillStyle = '#b0a080'; for (let i = -24; i < 24; i += 6) c.fillRect(i, -5, 1.5, 10); c.restore(); }
  // the tidefall bridge between islets
  c.strokeStyle = '#8a6a3a'; c.lineWidth = 5; c.beginPath(); c.moveTo(275, 765); c.quadraticCurveTo(300, 752, 318, 744); c.stroke();

  // ---- trees (forests), depth-sorted ----
  const trees = [];
  const dens = (x, y) => { let d = .12; for (const [cx, cy, rx, ry, s] of [[330, 270, 190, 100, .9], [250, 330, 110, 70, .8], [470, 250, 130, 80, .8], [160, 420, 70, 70, .6], [580, 450, 120, 70, .5], [1060, 700, 170, 100, .95], [720, 600, 130, 60, .6], [970, 330, 90, 60, .6], [540, 215, 70, 45, .9], [700, 750, 70, 40, .6], [380, 460, 80, 40, .5], [905, 480, 40, 100, .4], [1000, 640, 110, 40, .55], [880, 200, 60, 50, .6]]) d += s * Math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)); return Math.min(.95, d); };
  const keepOut = (x, y) => {
    if (inPoly(x, y, LAKE.map(([a, b]) => [a + (a - 680) * .12, b + (b - 355) * .3]))) return true;
    for (const [w, pts] of RIVERS) for (let i = 1; i < pts.length; i++) if (distSeg(x, y, ...pts[i - 1], ...pts[i]) < w * .9 + 10) return true;
    for (const p of PLACES) if (Math.hypot(x - p.x, y - p.y) < (p.kind === 'city' ? 52 : p.kind === 'town' ? 40 : p.kind === 'island' ? 30 : 22)) return true;
    if (Math.hypot(x - 610, y - 455) < 30 || inEll(x, y, 700, 465, 56, 28)) return true;
    if (Math.hypot(x - 1075, y - 745) < 30 || inEll(x, y, 440, 575, 36, 24)) return true;
    return false;
  };
  const landOK = (x, y) => { c.save(); let ok = false; for (const L of lands) { if (inPoly(x, y, L)) { ok = true; break; } } c.restore(); return ok; };
  const edgeDist = (x, y) => { let m = 1e9; for (let i = 0; i < CONT.length; i++) { const a = CONT[i], b = CONT[(i + 1) % CONT.length]; m = Math.min(m, distSeg(x, y, a[0], a[1], b[0], b[1])); } return m; };
  for (let gy = 18; gy < RH - 10; gy += 17) for (let gx = 18; gx < RW - 10; gx += 17) {
    const x = gx + (R() - .5) * 16, y = gy + (R() - .5) * 14;
    if (!landOK(x, y) || keepOut(x, y)) continue;
    const b = biomeAt(x, y); let p = dens(x, y);
    if (b === 'desert') p = .018; else if (b === 'badlands') p = .02; else if (b === 'volcano') p = .02; else if (b === 'snow') p *= .55; else if (b === 'mountain') p = .12; else if (b === 'swamp') p = .5; else if (b === 'hollow') p = .6;
    if (inPoly(x, y, CONT) && edgeDist(x, y) < 22) p *= .25;
    if (R() > p) continue;
    trees.push([x, y, b, 6 + R() * 5]);
  }
  for (const [id, pts] of Object.entries(ISLANDS)) {   // island trees
    const isl = id.startsWith('s') && id !== 'aurora' ? 6 : 16; const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const b0 = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    for (let i = 0; i < (id.startsWith('s') ? 5 : 70); i++) { const x = b0[0] + R() * (b0[2] - b0[0]), y = b0[1] + R() * (b0[3] - b0[1]);
      if (!inPoly(x, y, pts) || Math.hypot(x - (BYID[id] ? BYID[id].x : 0), y - (BYID[id] ? BYID[id].y : 0)) < 34) continue;
      if (id === 'cobaltIsle') continue; trees.push([x, y, id === 'moonlit' ? 'mystic' : id === 'aurora' ? 'aurora' : (id === 'tidefallA' || id === 'tidefallB' || id === 'tidefallC' || id === 'verdant' || id.startsWith('s')) ? 'tropic' : 'grass', 5 + R() * 4]); }
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, b, r] of trees) {
    if (b === 'snow') pine(c, x, y, r * .95, R() < .5 ? ['#1f6a4c', '#3a9a68', '#f4fbff'] : ['#2a7a56', '#4aa878', '#ffffff']);
    else if (b === 'volcano') deadTree(c, x, y, r * .9, '#2a2024');
    else if (b === 'badlands') deadTree(c, x, y, r * .9, '#5a3a30');
    else if (b === 'desert') { if (R() < .5) palm(c, x, y, r * 1.1); else { c.fillStyle = '#4aa050'; c.fillRect(x - 1.5, y - r * .8, 3, r * 1.2); c.fillRect(x - 5, y - r * .5, 4, 2); c.fillRect(x - 5, y - r * .8, 2, 3); c.fillRect(x + 2, y - r * .3, 4, 2); } }
    else if (b === 'swamp') tree(c, x, y, r, ['#4a3a7a', '#6a52a0', '#9a82cc']);
    else if (b === 'hollow' || b === 'mystic') tree(c, x, y, r, ['#5a3aa0', '#7a58c8', '#b69af0']);
    else if (b === 'aurora') pine(c, x, y, r, ['#3a3a8a', '#5a5ab0', '#d8e0ff']);
    else if (b === 'tropic') { if (R() < .55) palm(c, x, y, r * 1.1); else tree(c, x, y, r, ['#2f9a4c', '#4cbc5c', '#86dc6a']); }
    else if (b === 'mountain') pine(c, x, y, r * .9, ['#2a7a42', '#3a9a52', null]);
    else if (R() < .22) pine(c, x, y, r * .95); else tree(c, x, y, r, R() < .3 ? ['#3a9c3c', '#58bc4c', '#90dc66'] : null);
  }
  // snowy pines on the foothills of Cloudpeak
  // mountains
  for (const [x, by, w, h, snow] of MOUNTS) peak(c, x, by, w, h, snow);
  // pines at the foot of the range
  const R2 = rng(77); for (let i = 0; i < 70; i++) { const x = 470 + R2() * 390, y = 170 + R2() * 120; if (!inPoly(x, y, BIOMES.mountain) || keepOut(x, y) || R2() > .6) continue; pine(c, x, y, 6 + R2() * 3, ['#2a7a42', '#3a9a52', null]); }
  // Cloudpeak castle on the summit
  const castle = (x, y, s) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    ell(c, 2, 4, 30, 6, 'rgba(30,30,50,.3)');
    for (const [dx, h, w, col] of [[-22, 30, 12, '#e8e6f0'], [22, 34, 12, '#e8e6f0'], [0, 46, 16, '#f6f4fa'], [-9, 22, 11, '#d6d4e4'], [10, 24, 11, '#d6d4e4']]) {
      c.fillStyle = col; c.fillRect(dx - w / 2, -h, w, h); c.fillStyle = 'rgba(60,60,110,.15)'; c.fillRect(dx, -h, w / 2, h);
      poly(c, [[dx - w / 2 - 2, -h], [dx, -h - w * .95], [dx + w / 2 + 2, -h]], '#6a74c8'); poly(c, [[dx, -h - w * .95], [dx + w / 2 + 2, -h], [dx + 1, -h]], '#4c56a8'); c.fillStyle = '#5a6ab8'; c.fillRect(dx - 1, -h + 6, 2, 5);
    }
    c.fillStyle = '#4a3a6a'; c.fillRect(-3, -9, 6, 9); c.restore();
  };
  castle(628, 52, 1);
  // caves
  for (const [id, [x, y]] of Object.entries(CAVES)) cave(c, x, y, 17);
  // a path of towns: roads
  const roadPts = (a, b, bend) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return [[a.x, a.y], [mx - dy / l * bend, my + dx / l * bend], [b.x, b.y]]; };
  const bendOf = (a, b) => ((a.id.charCodeAt(0) + b.id.charCodeAt(1)) % 5 - 2) * 9;
  WORLD.roads = WORLD.edges.map(([a, b]) => roadPts(BYID[a], BYID[b], bendOf(BYID[a], BYID[b])));
  for (const pts of WORLD.roads) {
    c.save(); c.strokeStyle = 'rgba(70,50,20,.35)'; c.lineWidth = 6.5; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); c.stroke();
    c.strokeStyle = '#f6efd6'; c.lineWidth = 4; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); c.stroke();
    c.strokeStyle = 'rgba(160,120,70,.55)'; c.lineWidth = 1.2; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); c.stroke(); c.restore();
  }
  // ferry lines across the sea (dashed white)
  for (const f of WORLD.ferries) { const pts = ferryPath(f.from, f.to); c.save(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.setLineDash([4, 7]); smooth(c, pts, false); c.stroke(); c.restore(); }
  // ---- settlements ----
  settlements(c, R);
  // ---- clouds in the corners, compass, title ----
  for (const [x, y, s] of [[40, 230, 46], [120, 270, 30], [20, 400, 34], [60, 190, 28], [1500, 530, 40], [1470, 590, 30], [1530, 380, 30], [60, 900, 50], [130, 960, 44], [20, 850, 40], [210, 1010, 36], [830, 1010, 60], [900, 990, 46], [760, 1020, 40], [1080, 1015, 48], [1180, 1005, 30], [1500, 960, 40], [1450, 1000, 50], [480, 20, 30], [40, 10, 28], [980, 0, 26], [1500, 10, 34], [650, 1022, 40]]) cloudPuff(c, x, y, s, .95);
  compass(c, 90, 960, 42); scaleBar(c, 210, 985); title(c, 20, 28);
  // gentle vignette
  c.fillStyle = rad(c, RW / 2, RH / 2, 1000, ['rgba(10,30,70,0)', 'rgba(10,30,70,.28)']); c.fillRect(0, 0, RW, RH);
}
function ferryPath(a, b) {
  const A = BYID[a], B = BYID[b], pa = A.port || [A.x, A.y], pb = B.port || [B.x, B.y];
  const via = SEA_VIA[a + '>' + b] || (SEA_VIA[b + '>' + a] || []).slice().reverse();
  return [pa, ...via, pb];
}
WORLD.ferryPath = (a, b) => ferryPath(a, b);
function compass(c, x, y, r) {
  c.save(); c.translate(x, y); circ(c, 0, 0, r + 8, 'rgba(20,50,100,.45)'); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); poly(c, [[-7, 0], [0, -r * 1.05], [7, 0]], i === 0 ? '#e8504a' : '#f4f0e0'); poly(c, [[0, -r * 1.05], [7, 0], [0, 0]], i === 0 ? '#b83a36' : '#c8c2b0'); c.restore(); }
  for (let i = 0; i < 4; i++) { c.save(); c.rotate(Math.PI / 4 + i * Math.PI / 2); poly(c, [[-4, 0], [0, -r * .62], [4, 0]], '#9ab0d8'); c.restore(); }
  circ(c, 0, 0, 5, '#fff6d0'); circ(c, 0, 0, 2.4, '#3a5a9a');
  c.fillStyle = '#fff'; c.font = '900 17px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('N', 0, -r - 18); c.fillText('S', 0, r + 18); c.fillText('W', -r - 19, 1); c.fillText('E', r + 19, 1); c.restore();
}
function scaleBar(c, x, y) {
  c.save(); c.translate(x, y); c.fillStyle = 'rgba(20,50,100,.5)'; c.beginPath(); c.roundRect ? c.roundRect(-10, -16, 240, 34, 10) : c.rect(-10, -16, 240, 34); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 6); c.lineTo(220, 6); c.stroke(); for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 55, 0); c.lineTo(i * 55, 12); c.stroke(); }
  c.fillStyle = '#fff'; c.font = '800 12px "Trebuchet MS", sans-serif'; c.textBaseline = 'alphabetic'; c.fillText('0', -3, -3); c.fillText('10', 98, -3); c.fillText('20 KM', 190, -3); c.restore();
}
function title(c, x, y) {
  c.save(); c.translate(x, y);
  const w = 215, h = 98;
  c.fillStyle = 'rgba(10,30,70,.45)'; c.beginPath(); c.roundRect ? c.roundRect(4, 6, w, h, 22) : c.rect(4, 6, w, h); c.fill();
  c.fillStyle = '#16346a'; c.beginPath(); c.roundRect ? c.roundRect(0, 0, w, h, 22) : c.rect(0, 0, w, h); c.fill();
  c.strokeStyle = '#d8e8ff'; c.lineWidth = 3; c.beginPath(); c.roundRect ? c.roundRect(4, 4, w - 8, h - 8, 19) : c.rect(4, 4, w - 8, h - 8); c.stroke();
  c.strokeStyle = '#ffffff'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.beginPath(); c.moveTo(w / 2 - 44, 40); c.lineTo(w / 2 - 20, 14); c.lineTo(w / 2 - 6, 30); c.lineTo(w / 2 + 10, 8); c.lineTo(w / 2 + 44, 40); c.stroke();
  c.fillStyle = '#fff'; c.font = '900 31px "Trebuchet MS", "Segoe UI", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.save(); c.translate(w / 2, 70); c.scale(1, 1); for (let i = 0, s = 'AURELIS', cw = 27; i < s.length; i++) c.fillText(s[i], (i - 3) * cw, 0); c.restore();
  c.font = '700 13px "Trebuchet MS", sans-serif'; c.fillStyle = '#cfe0ff'; c.fillText('R E G I O N', w / 2, 88);
  c.restore();
}
// Little buildings at every place on the map.
function settlements(c, R) {
  const cluster = (cx, cy, list) => list.forEach(([dx, dy, s, roof, wall]) => house(c, cx + dx, cy + dy, s, roof, wall));
  const REDS = ['#d8554a', '#e8a040', '#c04a4a', '#5a7ae0', '#e8664a'];
  // Lanternrest: the hub with its windmill and farm fields
  const lr = BYID.lanternrest;
  c.save(); for (let i = 0; i < 12; i++) { const fx = 660 + (i % 4) * 26, fy = 440 + Math.floor(i / 4) * 20, cols = ['#d9e888', '#b8dc70', '#e8e0a0', '#8acc5c', '#f0e6a8', '#a0d468']; c.save(); c.translate(fx + 12, fy + 8); c.rotate(-.1); c.fillStyle = cols[i % cols.length]; c.fillRect(-12, -8, 24, 16); c.strokeStyle = 'rgba(100,130,50,.45)'; c.lineWidth = 1; for (let k = -10; k <= 10; k += 4) { c.beginPath(); c.moveTo(k, -7); c.lineTo(k, 7); c.stroke(); } c.restore(); } c.restore();
  ell(c, lr.x, lr.y + 6, 44, 26, '#e9dcb0'); ell(c, lr.x, lr.y + 4, 36, 20, '#f4ead0');
  cluster(lr.x, lr.y, [[-26, -8, 15, REDS[0]], [24, -10, 15, REDS[1]], [-20, 16, 14, REDS[3]], [22, 18, 15, REDS[2]], [0, -20, 13, REDS[4]]]);
  // windmill
  c.save(); c.translate(612, 466); ell(c, 4, 4, 18, 5, 'rgba(20,30,40,.3)'); poly(c, [[-11, 0], [-7, -34], [7, -34], [11, 0]], '#f2ece0'); poly(c, [[0, -34], [7, -34], [11, 0], [2, 0]], '#d8d0c0'); poly(c, [[-9, -34], [0, -46], [9, -34]], '#c05a40');
  c.strokeStyle = '#8a6a50'; c.lineWidth = 2.5; for (let k = 0; k < 4; k++) { const a = .5 + k * Math.PI / 2; c.beginPath(); c.moveTo(0, -36); c.lineTo(Math.cos(a) * 30, -36 + Math.sin(a) * 30); c.stroke(); c.fillStyle = 'rgba(250,246,236,.95)'; c.save(); c.translate(0, -36); c.rotate(a); c.fillRect(6, -4, 22, 8); c.restore(); }
  circ(c, 0, -36, 3.2, '#6a4a30'); c.restore();
  // homestead cabin on its fenced field
  c.fillStyle = '#b8e08a'; c.fillRect(706, 436, 36, 28); c.strokeStyle = '#a07a50'; c.lineWidth = 2; c.strokeRect(706, 436, 36, 28); house(c, 727, 456, 14, '#b24a3a', '#d8a870');
  // Sunhaven: harbour city, red roofs, docks
  const sh = BYID.sunhaven;
  c.fillStyle = '#e9dcb0'; c.beginPath(); c.ellipse(sh.x, sh.y + 8, 62, 34, 0, 0, TAU); c.fill(); c.fillStyle = '#f4ead0'; c.beginPath(); c.ellipse(sh.x, sh.y + 6, 52, 26, 0, 0, TAU); c.fill();
  cluster(sh.x, sh.y, [[-42, 4, 17, REDS[0]], [-20, -14, 16, REDS[1]], [8, -18, 19, REDS[2]], [34, -6, 16, REDS[0]], [48, 14, 15, REDS[3]], [-30, 22, 16, REDS[4]], [-6, 14, 17, REDS[1]], [22, 24, 16, REDS[2]]]);
  c.fillStyle = '#9a7a52'; c.fillRect(sh.x - 70, sh.y + 22, 40, 5); c.fillRect(sh.x - 62, sh.y + 22, 4, 22); c.fillRect(sh.x - 46, sh.y + 22, 4, 28);
  // Sunhaven's dock boat
  poly(c, [[sh.x - 68, sh.y + 48], [sh.x - 40, sh.y + 48], [sh.x - 46, sh.y + 56], [sh.x - 62, sh.y + 56]], '#d84a3a'); c.fillStyle = '#fff'; c.fillRect(sh.x - 56, sh.y + 40, 2, 8);
  // Driftwood: lighthouse and piers
  const dw = BYID.driftwood; lighthouse(c, 78, 487, 30);
  cluster(dw.x, dw.y, [[20, 22, 14, REDS[1]], [38, 8, 13, REDS[0]], [8, 40, 13, REDS[3]]]);
  c.fillStyle = '#9a7a52'; c.fillRect(120, 530, 50, 5); c.fillRect(135, 530, 4, 24); c.fillRect(155, 530, 4, 30);
  poly(c, [[150, 580], [180, 580], [174, 590], [156, 590]], '#f4f0e4'); c.fillStyle = '#e0504a'; c.fillRect(165, 566, 2, 14); poly(c, [[167, 566], [178, 574], [167, 576]], '#fff');
  // Stonebridge: stone town on both banks
  const sb = BYID.stonebridge;
  cluster(sb.x, sb.y, [[-40, -6, 17, '#7a8cc8', '#e8e0d0'], [-18, -22, 18, '#c05a4a', '#e8e0d0'], [20, -16, 18, '#6a7ab8', '#e8e0d0'], [46, 0, 16, '#c05a4a', '#e8e0d0'], [-36, 18, 16, '#c05a4a', '#e8e0d0'], [-8, 8, 19, '#8a7ac8', '#e8e0d0'], [30, 22, 17, '#c05a4a', '#e8e0d0']]);
  // Lakeside: piers on the lake, houses on the shore
  const ls = BYID.lakeside;
  cluster(ls.x, ls.y + 28, [[-50, 4, 14, REDS[2]], [-30, 8, 14, REDS[4]], [30, 6, 14, REDS[0]], [52, 2, 15, REDS[3]], [-6, 14, 15, REDS[1]]]);
  c.fillStyle = '#9a7a52'; c.fillRect(ls.x - 40, ls.y + 14, 8, 22); c.fillRect(ls.x + 20, ls.y + 14, 8, 22); c.fillRect(ls.x - 16, ls.y + 10, 6, 16);
  poly(c, [[ls.x + 44, ls.y - 6], [ls.x + 64, ls.y - 6], [ls.x + 58, ls.y + 2], [ls.x + 48, ls.y + 2]], '#f4f0e4'); c.fillStyle = '#4a7ad8'; c.fillRect(ls.x + 53, ls.y - 18, 2, 12); poly(c, [[ls.x + 55, ls.y - 18], [ls.x + 65, ls.y - 12], [ls.x + 55, ls.y - 10]], '#fff');
  // lake islet cabin
  house(c, 730, 316, 11, '#5a7ae0');
  // Sandsreach: oasis village among ruins
  const sr = BYID.sandsreach; ell(c, sr.x, sr.y + 4, 40, 17, '#7ad0e0'); ell(c, sr.x, sr.y + 3, 30, 11, '#a0e8f0'); palm(c, sr.x - 28, sr.y, 12); palm(c, sr.x + 26, sr.y - 2, 13);
  cluster(sr.x, sr.y - 18, [[-22, -4, 14, '#c8864a', '#ecd9ac'], [0, -10, 15, '#d89a58', '#ecd9ac'], [24, -3, 14, '#c8864a', '#ecd9ac']]);
  // Frostmere: ice city with crystal palace
  const fm = BYID.frostmere; ell(c, fm.x, fm.y + 12, 60, 26, '#d8f0fc'); ell(c, fm.x, fm.y + 10, 50, 20, '#eef9ff');
  cluster(fm.x, fm.y + 8, [[-40, 6, 15, '#5a9ad8', '#f4fbff'], [-22, 18, 14, '#7ab0e8', '#f4fbff'], [26, 16, 15, '#5a9ad8', '#f4fbff'], [44, 4, 14, '#7ab0e8', '#f4fbff']]);
  for (const [dx, h, w, col] of [[-22, 56, 15, '#bfe6ff'], [-4, 82, 20, '#d8f2ff'], [16, 64, 16, '#a8dcff'], [32, 44, 13, '#cdeaff']]) { const x = fm.x + dx, y = fm.y + 4; ell(c, x + 4, y + 2, w, w * .25, 'rgba(30,60,100,.25)'); poly(c, [[x - w / 2, y], [x - w / 3, y - h * .8], [x, y - h], [x + w / 3, y - h * .8], [x + w / 2, y]], col); poly(c, [[x, y - h], [x + w / 3, y - h * .8], [x + w / 2, y], [x + 1, y]], 'rgba(90,150,220,.45)'); poly(c, [[x - w / 4, y - 4], [x, y - h * .9], [x + w / 10, y - 4]], 'rgba(255,255,255,.7)'); }
  // Cobalt: towers, harbour and the bridge to the lighthouse island
  const cb = BYID.cobalt; ell(c, cb.x, cb.y + 14, 66, 30, '#d9dce6'); ell(c, cb.x, cb.y + 12, 56, 24, '#e8ebf2');
  c.strokeStyle = '#c8ccd8'; c.lineWidth = 11; c.beginPath(); c.moveTo(cb.x + 40, cb.y + 36); c.quadraticCurveTo(1380, 650, 1440, 668); c.stroke(); c.strokeStyle = '#f0f2f8'; c.lineWidth = 6; c.beginPath(); c.moveTo(cb.x + 40, cb.y + 36); c.quadraticCurveTo(1380, 650, 1440, 668); c.stroke();
  for (const [dx, dy, w, h, col] of [[-36, 16, 14, 40, '#6aa8e8'], [-18, 6, 16, 62, '#4a88d8'], [2, 12, 14, 48, '#8ac0f0'], [20, -2, 18, 82, '#3a78c8'], [40, 14, 15, 50, '#6aa8e8'], [-52, 26, 12, 28, '#8ac0f0'], [8, 30, 14, 34, '#5a98e0']]) tower(c, cb.x + dx, cb.y + dy + 8, w, h, col);
  c.fillStyle = '#9a7a52'; c.fillRect(cb.x - 70, cb.y + 36, 60, 5); c.fillRect(cb.x - 60, cb.y + 36, 4, 22); c.fillRect(cb.x - 40, cb.y + 36, 4, 26); c.fillStyle = '#e0504a'; c.fillRect(cb.x - 58, cb.y + 46, 12, 8); c.fillStyle = '#3a78c8'; c.fillRect(cb.x - 38, cb.y + 52, 12, 8);
  lighthouse(c, 1456, 668, 24); house(c, 1442, 678, 9, '#d8554a');
  // Mirewood hut on stilts, Shore town and boardwalk
  const sh2 = BYID.shore; cluster(sh2.x, sh2.y - 8, [[-26, 6, 14, '#e8664a'], [-4, -4, 15, '#5a7ae0'], [22, 8, 14, '#e8a040']]); palm(c, sh2.x - 44, sh2.y + 8, 13); palm(c, sh2.x + 42, sh2.y + 10, 14); palm(c, sh2.x + 54, sh2.y - 6, 12);
  lighthouse(c, 540, 770, 22);
  c.fillStyle = '#9a7a52'; c.fillRect(sh2.x - 20, sh2.y + 26, 4, 36); c.fillRect(sh2.x - 20, sh2.y + 56, 38, 4); poly(c, [[sh2.x + 30, sh2.y + 52], [sh2.x + 60, sh2.y + 52], [sh2.x + 54, sh2.y + 62], [sh2.x + 36, sh2.y + 62]], '#e8664a');
  const mw = BYID.mirewood; house(c, mw.x - 20, mw.y + 8, 12, '#7a5a40', '#c8a878'); house(c, mw.x + 18, mw.y + 2, 11, '#6a4a30', '#c8a878'); c.fillStyle = '#9a8a60'; c.fillRect(mw.x - 28, mw.y + 20, 56, 3);
  // islands
  const vd = BYID.verdant; cluster(vd.x, vd.y + 8, [[-14, 6, 12, '#e8664a'], [10, 0, 12, '#e8a040']]); palm(c, vd.x + 30, vd.y + 12, 13); palm(c, vd.x - 34, vd.y + 4, 12);
  const tf = BYID.tidefall; cluster(tf.x, tf.y - 4, [[-12, 4, 12, '#3a9ae0'], [12, 0, 12, '#e8664a']]); palm(c, tf.x - 36, tf.y + 10, 13); palm(c, tf.x + 34, tf.y + 12, 12); house(c, 330, 746, 9, '#e8a040');
  // Moonlit: glowing crystal and shrine
  const ml = BYID.moonlit; for (const [dx, dy, h] of [[0, 0, 44], [-16, 10, 28], [16, 8, 32], [-6, -8, 22]]) { const x = ml.x + dx, y = ml.y + dy; poly(c, [[x - 6, y + 8], [x, y - h], [x + 6, y + 8]], '#d8c0ff'); poly(c, [[x, y - h], [x + 6, y + 8], [x + 1, y + 8]], '#a888f0'); poly(c, [[x - 2, y + 4], [x, y - h * .8], [x + .5, y + 4]], 'rgba(255,255,255,.8)'); }
  const au = BYID.aurora; for (const [dx, dy, h] of [[0, 4, 40], [-18, 12, 26], [18, 10, 28]]) { const x = au.x + dx, y = au.y + dy; poly(c, [[x - 6, y + 6], [x, y - h], [x + 6, y + 6]], '#c8d8ff'); poly(c, [[x, y - h], [x + 6, y + 6], [x + 1, y + 6]], '#8a9ae8'); }
  // aurora ribbons in the sky
  c.save(); c.filter = 'blur(5px)'; for (const [x, col] of [[1360, 'rgba(120,255,200,.45)'], [1400, 'rgba(160,140,255,.5)'], [1440, 'rgba(255,140,220,.4)']]) { const g = lin(c, x, 0, x, 70, [col.replace(/[\d.]+\)$/, '0)'), col, col.replace(/[\d.]+\)$/, '0)')]); c.fillStyle = g; c.beginPath(); c.moveTo(x - 10, 70); c.bezierCurveTo(x - 20, 40, x + 20, 20, x + 10, -5); c.lineTo(x + 40, -5); c.bezierCurveTo(x + 50, 20, x + 10, 40, x + 25, 70); c.closePath(); c.fill(); } c.restore();
  // Hollow: crystal outcrop
  for (const [dx, dy, h] of [[0, 4, 34], [-14, 10, 22], [14, 8, 24], [-5, -6, 18]]) { const x = 500 + dx, y = 575 + dy; poly(c, [[x - 5, y + 6], [x, y - h], [x + 5, y + 6]], '#c8a8ff'); poly(c, [[x, y - h], [x + 5, y + 6], [x + 1, y + 6]], '#9a78e8'); }
  // Whispering pond
  ell(c, 1085, 745, 36, 14, '#8ad8f8'); ell(c, 1085, 744, 26, 9, '#b8f0ff'); for (const [dx, dy] of [[-16, -12], [20, -10], [0, 18]]) poly(c, [[1085 + dx - 4, 745 + dy + 6], [1085 + dx, 745 + dy - 14], [1085 + dx + 4, 745 + dy + 6]], '#c8a8ff');
  // Ridge: switchback trail up to the foothills; Evergreen's great tree
  tree(c, 400, 235, 26, ['#1f7a3c', '#3a9c4a', '#6ac05a']); tree(c, 420, 243, 15, ['#2f8f3c', '#47ad47', '#76cc5a']);
  // cloudpeak's flag
  c.strokeStyle = '#6a5a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(640, 20); c.lineTo(640, 4); c.stroke(); poly(c, [[640, 4], [654, 9], [640, 14]], '#e8504a');
}

let baseCache = null;
function baseMap() {
  if (baseCache) return baseCache;
  const [cn, cx] = G.cv(RW, RH);
  paintBase(cx);
  return baseCache = cn;
}
G.worldBase = baseMap;

// @@MORE@@
})();
