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
  ['hollow', 'special', 612, 612, 0, { tag: 'b', lantern: true }],
  ['stonebridge', 'town', 792, 640, 0, { tag: 'b', arena: 'keystone' }],
  ['whispering', 'route', 1042, 722, 1, { tag: 'b' }],
  ['tidefall', 'island', 240, 800, 3, { tag: 'b', port: [330, 770] }],
  ['moonlit', 'island', 1000, 900, 8, { tag: 'b', port: [920, 900] }],
  ['lakeside', 'town', 690, 352, 0, { tag: 'b', arena: 'tide' }],
  ['ridge', 'route', 560, 300, 0, { tag: 't' }],
  ['cloudpeak', 'route', 655, 172, 3, { tag: 'b' }],
  ['glacier', 'route', 1030, 205, 5, { tag: 'b' }],
  ['frostmere', 'city', 1078, 130, 5, { tag: 'b', arena: 'rime', port: [1170, 38] }],
  ['aurora', 'island', 1405, 95, 7, { tag: 'b', port: [1330, 70] }],
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
  lanternrest: 'The hub village around the Great Lantern.',
  homestead: 'Your own land to build, farm and park on.',
  ridge: 'A switchback trail up to Glimmer Mine.',
  sunmeadow: 'Fields, an orchard and a windmill.',
  mirewood: 'A misty marsh of boardwalks and reeds.',
  shore: 'Dunes, tidepools and a lighthouse.',
  hollow: 'A starlit crystal cavern.',
  sunhaven: 'A harbour city on the west coast.',
  evergreen: 'Deep old forest with a giant tree.',
  driftwood: 'A fishing port under a tall lighthouse.',
  verdant: 'A lush jungle island.',
  stonebridge: 'A town of stone bridges and waterfalls.',
  whispering: 'Glowing woods around a crystal pond.',
  tidefall: 'Islets joined by rope bridges.',
  moonlit: 'A mystical island of purple trees.',
  lakeside: 'A town of piers on a big lake.',
  cloudpeak: 'High peaks, caves and a summit castle.',
  glacier: 'A snowy pass of frozen ponds and ice caves.',
  frostmere: 'An ice city with a crystal palace.',
  aurora: 'Far northern isles under the aurora.',
  sandsreach: 'Dunes, old ruins and an oasis village.',
  badlands: 'Red mesas, canyons and caves.',
  emberfall: 'A smoking volcano ringed by lava rivers.',
  cobalt: 'A modern port city with a long bridge.',
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
// The place a map belongs to. On the open sea (a map made from this very picture) it is the nearest place to the boat.
G.worldPlaceOf = id => {
  if (id === 'aurelis_sea' && G.world && G.world.p) {
    const o = G.MAPS.aurelis_sea.seaOrigin || { x: 0, y: 0 }, px = (G.world.p.x - o.x) * 8 + 4, py = (G.world.p.y - o.y) * 8 + 4; let best = null, bd = 1e9;
    for (const p of PLACES) { const d = Math.hypot(p.x - px, p.y - py); if (d < bd) { bd = d; best = p.id; } }
    return best;
  }
  const p = WORLD.parent[id] || (G.MAPS[id] && G.MAPS[id].outdoor && id); return p && BYID[p] ? p : null;
};
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
  if (G.access) return G.access.why(id);
  const p = BYID[id]; if (!p) return null;
  const bits = [];
  if (p.need > badges()) bits.push(`${p.need} Arena Badge${p.need > 1 ? 's' : ''} (you have ${badges()})`);
  if (p.lantern && !lanternLit()) bits.push('the Great Lantern relit');
  return bits.length ? 'Needs ' + bits.join(' and ') + '.' : null;
};
G.worldLockShort = id => (G.access ? G.access.short(id) : '');
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
const CONT = [[112, 300], [150, 235], [205, 207], [270, 216], [345, 200], [420, 152], [470, 120], [520, 72], [575, 40], [640, 14], [720, 22], [790, 32], [860, 62], [940, 46], [1030, 40], [1110, 50], [1180, 72], [1250, 104], [1276, 156], [1296, 128], [1345, 116], [1405, 134], [1462, 172], [1500, 230], [1508, 280], [1518, 336], [1500, 402], [1516, 462], [1490, 522], [1446, 566], [1400, 592], [1440, 632], [1472, 662], [1442, 688], [1380, 692], [1312, 668], [1242, 692], [1172, 668], [1138, 704], [1142, 752], [1112, 800], [1040, 818], [960, 806], [902, 792], [862, 816], [802, 812], [742, 802], [690, 822], [640, 832], [580, 832], [526, 816], [486, 786], [470, 746], [500, 706], [470, 690], [410, 666], [340, 656], [272, 652], [226, 626], [200, 586], [214, 546], [240, 510], [232, 470], [238, 420], [226, 386], [172, 372], [120, 346]];
const ISLANDS = {
  verdant: [[205, 100], [225, 70], [265, 55], [315, 60], [350, 85], [345, 120], [320, 150], [270, 160], [250, 190], [215, 195], [185, 170], [190, 130]],
  driftwood: [[48, 520], [62, 470], [90, 440], [125, 450], [150, 485], [140, 540], [165, 565], [130, 590], [85, 575], [50, 555]],
  tidefallA: [[160, 770], [190, 740], [235, 735], [270, 760], [280, 805], [245, 840], [190, 840], [160, 810]],
  tidefallB: [[290, 725], [315, 712], [345, 728], [340, 755], [310, 765]],
  tidefallC: [[130, 715], [152, 700], [170, 716], [158, 736], [134, 732]],
  moonlit: [[890, 905], [900, 860], [945, 835], [1010, 830], [1075, 848], [1110, 890], [1085, 940], [1030, 975], [960, 980], [915, 955]],
  aurora: [[1350, 76], [1372, 48], [1410, 40], [1465, 48], [1496, 76], [1478, 108], [1430, 118], [1385, 110]],
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
  hollow: [[568, 574], [632, 566], [672, 604], [652, 648], [596, 650], [558, 614]],
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

// The land geometry, shared with the playable sea map (js/maps/zz_sea.js was generated from it: tools/gen-sea.md).
WORLD.geo = { CONT, ISLANDS, LAKE, BIOMES, RIVERS, FALLS, inPoly, distSeg, biomeAt, RW, RH };

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
    for (const [pts] of [[[[770, 690], [776, 730], [770, 770], [760, 808]]], [[[868, 690], [866, 740], [856, 790]]], [[[900, 345], [925, 352], [934, 392]]]]) {
      c.strokeStyle = '#7e7466'; c.lineWidth = 9; smooth(c, pts, false); c.stroke(); c.strokeStyle = '#a89c8a'; c.lineWidth = 4; smooth(c, pts.map(([x, y]) => [x - 3, y - 4]), false); c.stroke();
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
    for (const [x, y, r, a] of []) { }
    // volcano rocks
    for (let i = 0; i < 30; i++) { const x = 1150 + R() * 340, y = 160 + R() * 180; if (!inPoly(x, y, BIOMES.volcano) || Math.hypot(x - 1330, y - 230) < 80) continue; poly(c, [[x - 10, y + 5], [x - 5, y - 8], [x + 5, y - 10], [x + 11, y + 5]], '#2e2428'); poly(c, [[x - 5, y - 8], [x + 5, y - 10], [x + 2, y - 2], [x - 4, y - 2]], '#54444a'); }
    // moonlit and aurora glows
    for (const [x, y] of [[1000, 895], [945, 880], [1060, 890], [1010, 940]]) { c.save(); c.filter = 'blur(8px)'; circ(c, x, y, 24, 'rgba(190,150,255,.5)'); c.restore(); }
    c.save(); c.filter = 'blur(10px)'; circ(c, 1425, 92, 50, 'rgba(160,120,255,.3)'); c.restore();
    // tidefall: rope bridges
    c.strokeStyle = '#a07a4a'; c.lineWidth = 3; c.setLineDash([5, 3]); c.beginPath(); c.moveTo(282, 765); c.lineTo(300, 750); c.moveTo(165, 735); c.lineTo(160, 745); c.stroke(); c.setLineDash([]);
  });
  for (const [x, y, r, a] of [[1332, 112, 15, .9], [1340, 86, 19, .8], [1352, 60, 22, .65], [1368, 36, 24, .5]]) { c.save(); c.globalAlpha = a; circ(c, x, y, r, '#8a7a82'); circ(c, x - 3, y - 3, r * .7, '#b0a2aa'); c.restore(); }
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
    if (Math.hypot(x - 1100, y - 765) < 36 || inEll(x, y, 440, 575, 36, 24)) return true;
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
  const bendOf = (a, b) => ((a.id.charCodeAt(0) + b.id.charCodeAt(1)) % 5 - 2) * 16 + 8;
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
  for (const [x, y, s] of [[40, 230, 46], [120, 270, 30], [20, 400, 34], [60, 190, 28], [1500, 530, 40], [1470, 590, 30], [1530, 380, 30], [30, 830, 44], [20, 910, 40], [215, 1012, 36], [150, 1000, 30], [830, 1010, 60], [900, 990, 46], [760, 1020, 40], [1080, 1015, 48], [1180, 1005, 30], [1500, 960, 40], [1450, 1000, 50], [480, 20, 30], [40, 10, 28], [980, 0, 26], [1500, 10, 34], [650, 1022, 40]]) cloudPuff(c, x, y, s, .95);
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
  c.letterSpacing = '5px'; c.fillText('AURELIS', w / 2 + 2, 70); c.letterSpacing = '0px';
  c.font = '700 13px "Trebuchet MS", sans-serif'; c.fillStyle = '#cfe0ff'; c.letterSpacing = '6px'; c.fillText('REGION', w / 2 + 3, 88); c.letterSpacing = '0px';
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
  for (const [dx, dy, h] of [[0, 4, 34], [-14, 10, 22], [14, 8, 24], [-5, -6, 18]]) { const x = 612 + dx, y = 612 + dy; poly(c, [[x - 5, y + 6], [x, y - h], [x + 5, y + 6]], '#c8a8ff'); poly(c, [[x, y - h], [x + 5, y + 6], [x + 1, y + 6]], '#9a78e8'); }
  // Whispering pond
  ell(c, 1100, 765, 36, 14, '#8ad8f8'); ell(c, 1100, 764, 26, 9, '#b8f0ff'); for (const [dx, dy] of [[-16, -12], [20, -10], [0, 18]]) poly(c, [[1100 + dx - 4, 765 + dy + 6], [1100 + dx, 765 + dy - 14], [1100 + dx + 4, 765 + dy + 6]], '#c8a8ff');
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

// ---- Dynamic overlays: fog, locks, pins, tags, service icons ----------------------------------------------------------------
const SHORT = { homestead: 'HOMESTEAD', verdant: 'VERDANT ISLE', shore: 'TIDEPOOL SHORE', hollow: 'STARLIT HOLLOW', whispering: 'WHISPERING WOODS', moonlit: 'MOONLIT ISLE', ridge: 'THE RIDGE', glacier: 'GLACIER PASS', aurora: 'AURORA ISLES', cobalt: 'COBALT CITY', badlands: 'CRIMSON BADLANDS', cloudpeak: 'CLOUDPEAK', tidefall: 'TIDEFALL', sunhaven: 'SUNHAVEN', sandsreach: 'SANDSREACH', emberfall: 'EMBERFALL', frostmere: 'FROSTMERE', stonebridge: 'STONEBRIDGE', lakeside: 'LAKESIDE', lanternrest: 'LANTERNREST', driftwood: 'DRIFTWOOD', evergreen: 'EVERGREEN', mirewood: 'MIREWOOD', sunmeadow: 'SUNMEADOW' };
G.worldShort = id => SHORT[id] || (BYID[id] ? BYID[id].name : id);
const KIND_COL = { city: '#e8504a', town: '#3a9ae8', route: '#f6f0dc', island: '#2cc0b8', special: '#9a5ae0' };
const FOG_R = { city: 78, town: 64, route: 58, island: 62, special: 46 };
function fogSprite(r) {
  return G.kit.cache('wm-fog' + r, 40, 40, x => {
    x.fillStyle = rad(x, 20, 20, 20, ['rgba(236,244,252,.96)', 'rgba(228,240,252,.9)', 'rgba(220,234,250,0)']); x.fillRect(0, 0, 40, 40);
    for (const [dx, dy, rr] of [[-5, -3, 8], [4, -5, 9], [7, 3, 7], [-2, 5, 8], [-8, 4, 6]]) { x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(20 + dx, 20 + dy, rr, 0, TAU); x.fill(); }
  }, { pad: 0, qmax: 4 });
}
function iconCross(c, x, y, r) { r = r || 3.2; circ2(c, x, y, r, '#ffffff'); circ2(c, x, y, r * .8, '#ff6b8a'); c.fillStyle = '#ffffff'; c.fillRect(x - r * .5, y - r * .15, r, r * .3); c.fillRect(x - r * .15, y - r * .5, r * .3, r); }
function iconCoin(c, x, y, r) { r = r || 3.2; circ2(c, x, y, r, '#ffffff'); circ2(c, x, y, r * .8, '#f0b030'); circ2(c, x, y, r * .53, '#ffd860'); c.fillStyle = '#b07a10'; c.fillRect(x - r * .11, y - r * .38, r * .22, r * .76); }
function iconArena(c, x, y, got, r) { r = r || 3.4; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .8, y); c.lineTo(x, y + r); c.lineTo(x - r * .8, y); c.closePath(); c.fillStyle = got ? '#ffd23a' : '#fff4c8'; c.fill(); c.strokeStyle = got ? '#c88a10' : '#c8a850'; c.lineWidth = .7; c.stroke(); if (got) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - r * .1, y - r * .65); c.lineTo(x + r * .25, y - r * .1); c.lineTo(x - r * .1, y + r * .1); c.closePath(); c.fill(); } }
function iconAnchor(c, x, y, r) { r = r || 3.2; circ2(c, x, y, r, '#ffffff'); c.strokeStyle = '#2a6ab8'; c.lineWidth = .8; c.beginPath(); c.moveTo(x, y - r * .55); c.lineTo(x, y + r * .5); c.moveTo(x - r * .4, y - r * .2); c.lineTo(x + r * .4, y - r * .2); c.arc(x, y + .1, r * .6, .2, Math.PI - .2); c.stroke(); circ2(c, x, y - r * .62, r * .2, '#2a6ab8'); }
function iconCave(c, x, y, r) { r = r || 3.2; circ2(c, x, y, r, '#ffffff'); c.fillStyle = '#4a4254'; c.beginPath(); c.moveTo(x - r * .6, y + r * .5); c.quadraticCurveTo(x - r * .6, y - r * .6, x, y - r * .6); c.quadraticCurveTo(x + r * .6, y - r * .6, x + r * .6, y + r * .5); c.closePath(); c.fill(); }
function iconLock(c, x, y, r) { r = r || 2.6; circ2(c, x, y, r + .5, 'rgba(40,30,60,.35)'); circ2(c, x, y - .1, r, '#ffffff'); circ2(c, x, y - .1, r * .82, '#7a6a9a'); c.strokeStyle = '#ffffff'; c.lineWidth = .65; c.beginPath(); c.arc(x, y - r * .22, r * .34, Math.PI, TAU); c.stroke(); c.fillStyle = '#ffffff'; c.fillRect(x - r * .46, y - r * .22, r * .92, r * .7); }
function circ2(c, x, y, r, col) { c.beginPath(); c.arc(x, y, Math.max(.01, r), 0, TAU); c.fillStyle = col; c.fill(); }
G.worldIcons = { cross: iconCross, coin: iconCoin, arena: iconArena, anchor: iconAnchor, cave: iconCave, lock: iconLock };
function drawPin(c, p, x, y, r, st) {
  const col = st.fog ? '#aebbd0' : st.dim ? '#a2a8b6' : KIND_COL[p.kind];
  if (p.kind === 'route') r *= .82;
  circ2(c, x, y + .9, r + .3, 'rgba(30,40,80,.4)'); circ2(c, x, y, r, '#ffffff');
  if (p.kind === 'special') { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .36 : r * .8; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = col; c.fill(); }
  else { circ2(c, x, y, r * .74, col); if (p.kind === 'city') { circ2(c, x, y, r * .4, '#ffffff'); circ2(c, x, y, r * .22, col); } else if (p.kind === 'town') circ2(c, x, y, r * .28, '#ffffff'); else if (p.kind === 'island') { c.fillStyle = '#fff'; c.fillRect(x - r * .09, y - r * .38, r * .18, r * .62); c.fillRect(x - r * .38, y - r * .22, r * .76, r * .14); } }
  if (st.fog) G.text(c, '?', x, y - 3, { align: 'center', font: G.FONT_S, color: '#fff', shadow: false });
}
function tagStyle(p, st) { return st.here ? 'shop' : st.locked ? 'craft' : p.kind === 'city' || p.kind === 'town' ? 'town' : p.kind === 'special' ? 'arena' : 'home'; }
function drawTag(c, p, x, y, r, st, t) {
  const text = G.worldShort(p.id) + (st.locked && !st.fog ? '' : '');
  c.save(); c.font = G.FONT_S || G.FONT; const tw = Math.ceil(c.measureText(text).width) + 10; c.restore();
  const style = tagStyle(p, st);
  if (p.tag === 't') G.drawSignPlate(c, text, x, y - r - .5, t, style);
  else if (p.tag === 'r') G.drawSignPlate(c, text, x + r + 2 + tw / 2, y + 6.5, t, style);
  else G.drawSignPlate(c, text, x, y + r + 13, t, style);
}
function placeState(p, o) {
  const S = G.state, visited = G.worldVisited(p.id), why = G.worldLockWhy(p.id);
  const fog = o.fog !== false && !visited && p.id !== o.here;
  return { fog, locked: !!why && o.locks !== false, here: p.id === o.here, sel: p.id === o.cursor, dim: o.dim ? !!o.dim(p.id) : false, ok: o.ok ? !!o.ok(p.id) : false, visited };
}
let SEA = null;
function seaColor() { if (!SEA) { const c = baseMap().getContext('2d').getImageData(4, RH >> 1, 1, 1).data; SEA = `rgb(${c[0]},${c[1]},${c[2]})`; } return SEA; }
// The part of the base map that is visible: view { cx, cy, z } in normalised coordinates, z >= 1.
function viewRect(o, w, h) {
  w = w || RW; h = h || RH;
  const z = o && o.view ? Math.max(1, o.view.z) : 1, sc = Math.min(w / RW, h / RH) * z, sw = w / sc, sh = h / sc;
  const fit = (c, len, vis) => vis >= len ? (len - vis) / 2 : Math.max(0, Math.min(len - vis, c * len - vis / 2));
  return { sx: fit(o && o.view ? o.view.cx : .5, RW, sw), sy: fit(o && o.view ? o.view.cy : .5, RH, sh), sw, sh, z, s: sc };
}
// Screen position of a place (or a point { x, y } in reference pixels) inside the rectangle the map is drawn into.
G.worldMapXY = function (idOrPt, x, y, w, h, o) {
  const v = viewRect(o, w, h), p = typeof idOrPt === 'string' ? BYID[idOrPt] : idOrPt; if (!p) return null;
  return [x + (p.x - v.sx) * v.s, y + (p.y - v.sy) * v.s];
};
// Draws the illustrated map into (x, y, w, h). opts: t, view, here, cursor, fog, locks, names ('known' | 'all' | 'none'),
// icons ('all' | 'sel' | 'none'), ferries, clouds, dim(id), ok(id), draw(ctx, P, k) for extra art (boats, planes) above the map.
G.drawWorldMap = function (ctx, x, y, w, h, o) {
  o = o || {}; const t = o.t || 0, v = viewRect(o, w, h), kx = v.s, ky = v.s, zs = .85 + .15 * v.z;
  const P = (px, py) => [x + (px - v.sx) * kx, y + (py - v.sy) * ky], hs = h / 160;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (v.sw > RW || v.sh > RH) { ctx.fillStyle = seaColor(); ctx.fillRect(x, y, w, h); }   // the screen is bigger than the map: open sea around it
  const i0 = Math.max(0, v.sx), j0 = Math.max(0, v.sy), i1 = Math.min(RW, v.sx + v.sw), j1 = Math.min(RH, v.sy + v.sh);
  ctx.drawImage(baseMap(), i0, j0, i1 - i0, j1 - j0, x + (i0 - v.sx) * kx, y + (j0 - v.sy) * ky, (i1 - i0) * kx, (j1 - j0) * ky);
  { // where the screen is bigger than the map, fade its edges into the open sea
    const fade = (x0, y0, x1, y1, gx, gy) => { const g = ctx.createLinearGradient(gx[0], gx[1], gy[0], gy[1]), c = seaColor(); g.addColorStop(0, c); g.addColorStop(1, c.replace('rgb', 'rgba').replace(')', ',0)')); ctx.fillStyle = g; ctx.fillRect(x0, y0, x1, y1); };
    const f = 12 * kx / (w / RW) * .2 + 6, top = y + (0 - v.sy) * ky, bot = y + (RH - v.sy) * ky, lef = x + (0 - v.sx) * kx, rig = x + (RW - v.sx) * kx;
    if (v.sy < 0) fade(x, top, w, f, [0, top], [0, top + f]); if (v.sy + v.sh > RH) fade(x, bot - f, w, f, [0, bot], [0, bot - f]);
    if (v.sx < 0) fade(lef, y, f, h, [lef, 0], [lef + f, 0]); if (v.sx + v.sw > RW) fade(rig - f, y, f, h, [rig, 0], [rig - f, 0]);
  }
  if (o.clouds !== false) for (let i = 0; i < 5; i++) { const e = drawCloudSprite(i % 3), cw = (50 + (i % 3) * 14) * zs, px = ((i * 71 + t * .06 * (1 + i % 2)) % (w + 90)) - 45, py = [6, 50, 118, 142, 28][i] * hs; ctx.globalAlpha = .5; ctx.drawImage(e.c, x + px - e.pad, y + py - e.pad, cw + e.pad * 2, cw * 36 / 80 + e.pad * 2); ctx.globalAlpha = 1; }
  const sts = {};
  const vis = p => p.x > v.sx - 90 && p.x < v.sx + v.sw + 90 && p.y > v.sy - 90 && p.y < v.sy + v.sh + 90;
  // fog banks
  for (const p of PLACES) { const st = sts[p.id] = placeState(p, o); if (st.fog && vis(p)) { const [px, py] = P(p.x, p.y), r = FOG_R[p.kind] * kx * (1 + Math.sin(t / 60 + p.x) * .03), e = fogSprite(p.kind); ctx.globalAlpha = o.fogAlpha === undefined ? .86 : o.fogAlpha; ctx.drawImage(e.c, px - r, py - r * (ky / kx), r * 2, r * 2 * (ky / kx)); ctx.globalAlpha = 1; } }
  if (o.ferries) for (const f of WORLD.ferries) for (const id of [f.from, f.to]) { const p = BYID[id]; if (p.port && vis(p)) { const [px, py] = P(p.port[0], p.port[1]); iconAnchor(ctx, px, py, 3 * zs); } }
  if (o.draw) o.draw(ctx, P, kx);
  const showNames = o.names || 'known', showIcons = o.icons || 'sel';
  // pins, tags, icons (selected and here last so they sit on top)
  const order = PLACES.filter(vis).sort((a, b) => (sts[a.id].sel || sts[a.id].here ? 1 : 0) - (sts[b.id].sel || sts[b.id].here ? 1 : 0) || a.y - b.y);
  for (const p of order) {
    const st = sts[p.id], [px, py] = P(p.x, p.y), r = (p.kind === 'city' ? 3.5 : 3.1) * zs;
    if (st.sel) { ctx.strokeStyle = `rgba(70,120,255,${.65 + Math.sin(t / 6) * .3})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(px, py, r + 3 + Math.sin(t / 6), 0, TAU); ctx.stroke(); }
    if (st.ok && !st.sel) { G.kit.drawGlow(ctx, '#fff6a0', px, py, r + 5 + Math.sin(t / 12 + p.x) * 1.2, .8); }
    if (st.here) { const rr = r + 1 + (t % 50) / 50 * 9; ctx.strokeStyle = `rgba(255,120,60,${1 - (t % 50) / 50})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.stroke(); }
    drawPin(ctx, p, px, py, r, st);
    if (st.locked && showNames !== 'none-locks') iconLock(ctx, px + r * .95, py - r * .95, 2.3 * zs);
    const qm = o.markers && o.markers[p.id];   // journal markers: gold for the story lead, blue for other quests
    if (qm) { const mx = px - r * 1.1, my = py - r * 1.2 + Math.sin(t / 9 + p.x) * .8, mr = 2.6 * zs; circ2(ctx, mx, my, mr + .6, '#ffffff'); circ2(ctx, mx, my, mr, qm === 'main' ? '#f7a33f' : '#3a9ae8'); ctx.fillStyle = '#fff'; ctx.fillRect(mx - mr * .14, my - mr * .6, mr * .28, mr * .75); ctx.fillRect(mx - mr * .14, my + mr * .3, mr * .28, mr * .28); }
    const known = !st.fog;
    if (showNames !== 'none' && (st.sel || st.here || (known && (showNames === 'all' || (showNames === 'known' && st.visited))))) drawTag(ctx, p, px, py, r, st, t);
    if (showIcons !== 'none' && known && (showIcons === 'all' || st.sel || st.here)) {
      const sv = G.worldServices(p.id), icons = [];
      if (sv.heal) icons.push(c => iconCross(c, 0, 0, 2.6)); if (sv.shop) icons.push(c => iconCoin(c, 0, 0, 2.6));
      if (sv.arena) icons.push(c => iconArena(c, 0, 0, !!(G.state && G.state.flags['badge_' + sv.arena]), 2.8)); if (sv.ferry) icons.push(c => iconAnchor(c, 0, 0, 2.6)); if (sv.cave) icons.push(c => iconCave(c, 0, 0, 2.6));
      const above = p.tag !== 't', iy = above ? py - r - 4.5 : py + r + 4.5;
      icons.forEach((f, i) => { ctx.save(); ctx.translate(px + (i - (icons.length - 1) / 2) * 6.6, iy); f(ctx); ctx.restore(); });
    }
    if (st.here) { const by = py - r - (showIcons !== 'none' && p.tag !== 't' ? 12 : 4) + Math.sin(t / 7) * 1.4; ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(px, by - 2.5, 2.6, 0, TAU); ctx.moveTo(px - 2.2, by - 1.2); ctx.lineTo(px, by + 2); ctx.lineTo(px + 2.2, by - 1.2); ctx.fill(); circ2(ctx, px, by - 2.5, 1, '#ffffff'); }
    if (st.sel) { const by = py - r - (showIcons !== 'none' && p.tag !== 't' ? 13 : 5) - 6 + Math.sin(t / 5) * 1.5; if (!st.here) { ctx.fillStyle = '#3a78ff'; ctx.beginPath(); ctx.moveTo(px - 3, by - 3); ctx.lineTo(px + 3, by - 3); ctx.lineTo(px, by + 1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = .7; ctx.stroke(); } }
  }
  ctx.restore();
};

// ---- Place info (shared by the map screen) ----------------------------------------------------------------------------------
G.worldInfo = function (id) {
  const p = BYID[id]; if (!p) return null;
  const sv = G.worldServices(id), lv = G.worldLevels(id), S = G.state, why = G.worldLockWhy(id);
  const bd = sv.arena ? G.worldBadge(sv.arena) : null, got = !!(bd && S && S.flags['badge_' + bd.id]);
  const bits = []; if (sv.heal) bits.push('healing'); if (sv.shop) bits.push('a shop'); if (sv.arena) bits.push('an Arena'); if (sv.ferry) bits.push('a ferry'); if (sv.cave) bits.push('a cave');
  const visited = G.worldVisited(id);
  return { id, name: p.name, kind: p.kind, kindWord: KIND_WORD[p.kind], services: sv, badge: bd, badgeGot: got, levels: lv, locked: why, visited, blurb: p.blurb,
    desc: p.blurb + (bits.length ? ' Has ' + bits.join(', ') + '.' : '') + (visited ? '' : " You haven't been here yet.") + (why ? ' ' + why : '') };
};
// The place whose D-pad direction best matches (nearest in that direction), or the same one.
function navPick(list, sel, k) {
  const dir = k.up ? [0, -1] : k.down ? [0, 1] : k.left ? [-1, 0] : k.right ? [1, 0] : null; if (!dir) return sel;
  const cur = list[sel]; let best = sel, score = 1e9;
  list.forEach((n, i) => { if (i === sel) return; const dx = n.x - cur.x, dy = n.y - cur.y, along = dx * dir[0] + dy * dir[1], perp = Math.abs(dx * dir[1] - dy * dir[0]); if (along <= 0) return; const sc = along + perp * 3.5; if (sc < score) { score = sc; best = i; } });
  return best;
}
G.worldNav = navPick;

// ---- Shared map viewer: zoom, touch panning and picking, used by START > MAP and the flight picker ------------------------------
// The caller keeps `sel` (index into nodes); nav animates the view, draws nothing itself.
G.mapNav = function (nodes) {
  const nav = { zoom: false, z: 1, cx: .5, cy: .5, tcx: .5, tcy: .5, last: -1, W: 240, H: 160 };
  const focus = n => { const p = BYID[n.id]; nav.tcx = p.nx; nav.tcy = p.ny; };
  nav.setZoom = (on, sel) => { nav.zoom = on; if (on) focus(nodes[sel]); else { nav.tcx = .5; nav.tcy = .5; } };
  nav.update = sel => {
    if (sel !== nav.last) { nav.last = sel; if (nav.zoom) focus(nodes[sel]); }
    nav.z += ((nav.zoom ? 2.4 : 1) - nav.z) * .16; nav.cx += (nav.tcx - nav.cx) * .16; nav.cy += (nav.tcy - nav.cy) * .16;
  };
  nav.snap = () => { nav.zoom = false; nav.z = 1; nav.cx = nav.cy = nav.tcx = nav.tcy = .5; };
  nav.view = () => ({ cx: nav.cx, cy: nav.cy, z: nav.z });
  nav.xy = id => G.worldMapXY(id, 0, 0, nav.W, nav.H, { view: nav.view() });
  // Registers the full-screen touch layer: drag pans (when zoomed in), a tap picks the nearest place. Call before any panels.
  nav.touch = pick => {
    const W = nav.W = G.W, H = nav.H = G.H;
    G.tapZone(0, 0, W, H, (x, y) => {
      let best = -1, bd = 11; nodes.forEach((n, i) => { const q = nav.xy(n.id); if (!q) return; const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) pick(best);
    }, (dx, dy) => {
      if (!nav.zoom) return;
      const v = viewRect({ view: nav.view() }, W, H), hx = v.sw / 2 / RW, hy = v.sh / 2 / RH;
      nav.cx = Math.max(Math.min(hx, .5), Math.min(Math.max(1 - hx, .5), nav.cx - dx / v.s / RW)); nav.cy = Math.max(Math.min(hy, .5), Math.min(Math.max(1 - hy, .5), nav.cy - dy / v.s / RH));
      nav.tcx = nav.cx; nav.tcy = nav.cy;
    });
  };
  return nav;
};

// ---- START > MAP ------------------------------------------------------------------------------------------------------------------
G.worldMapScreen = async function () {
  buildGraph();
  const S = G.state, back = G.scene, here = G.worldPlaceOf(G.world.mapId) || 'lanternrest';
  const nodes = PLACES.map(p => ({ id: p.id, name: p.name, x: p.nx * 240, y: p.ny * 160 }));
  let sel = Math.max(0, nodes.findIndex(n => n.id === here)), close = false, tapped = -1, t = 0;
  const nav = G.mapNav(nodes);
  const api = { here, nodes, desc: '', get sel() { return sel; }, set sel(v) { sel = v; }, get zoomed() { return nav.zoom; }, get zoom() { return nav.z; }, nav, info: null, lines: [] };
  const toggle = () => nav.setZoom(!nav.zoom, sel);
  const scene = {
    wide: true, raw: true,
    update() { t++; nav.update(sel); },
    draw(ctx) {
      const W = G.W, H = G.H, zoom = nav.zoom, id = nodes[sel].id, I = api.info = G.worldInfo(id);
      G.drawWorldMap(ctx, 0, 0, W, H, { t, here, cursor: id, view: nav.view(), names: zoom ? 'known' : 'sel', icons: zoom ? 'all' : 'sel', ferries: zoom, markers: G.quest ? G.quest.markers() : null });
      nav.touch(i => { tapped = i; });
      // info panel (flips to the top when the cursor is in the lower half)
      const cyp = nav.xy(id)[1], top = cyp > H * .55, pw = Math.min(W - 8, 232), x0 = (W - pw) / 2, ph = 44, py0 = top ? 3 : H - ph - 3;
      G.frame(ctx, x0, py0, pw, ph, 'light'); G.tapZone(x0, py0, pw, ph, () => {});
      const F = G.FONT_B || G.FONT; ctx.font = F; const nw = ctx.measureText(I.name).width, L = x0 + 8;
      G.text(ctx, I.name, L, py0 + 5, { font: F });
      const pill = (txt, col, x) => { ctx.font = '900 5.5px ' + G.FONT_FAM; const w = ctx.measureText(txt).width + 9; G.kit.pill(ctx, x, py0 + 5.5, w, 8.5, col, txt); return w; };
      let px2 = L + nw + 5; px2 += pill(I.kindWord.toUpperCase(), KIND_COL[I.kind] === '#f6f0dc' ? '#8aa86a' : KIND_COL[I.kind], px2) + 3; if (id === here) pill('YOU ARE HERE', '#ff8a3c', px2);
      const sm = { font: G.FONT_S, color: '#5a4a66', shadow: false };
      const l1 = !I.visited ? "You haven't been here yet." : I.blurb; api.desc = I.desc;
      G.wrap(l1, pw - 70).slice(0, 1).forEach(l => G.text(ctx, l, L, py0 + 14.5, sm));
      // services row
      let sx = L; const sy = py0 + 24;
      const svc = (f, label) => { f(ctx, sx + 3, sy + 3); G.text(ctx, label, sx + 8, sy, sm); ctx.font = G.FONT_S; sx += 12 + ctx.measureText(label).width; };
      if (I.services.heal) svc((c, x, y) => iconCross(c, x, y, 2.8), 'HEAL'); if (I.services.shop) svc((c, x, y) => iconCoin(c, x, y, 2.8), 'SHOP');
      if (I.services.arena) svc((c, x, y) => iconArena(c, x, y, I.badgeGot, 3), I.badge ? (I.badgeGot ? I.badge.name.toUpperCase() + ' (WON)' : I.badge.name.toUpperCase()) : 'ARENA');
      if (I.services.ferry) svc((c, x, y) => iconAnchor(c, x, y, 2.8), 'FERRY'); if (I.services.cave) svc((c, x, y) => iconCave(c, x, y, 2.8), 'CAVE');
      const wl = I.levels ? `WILD LV ${I.levels[0]}-${I.levels[1]}` : I.kind === 'city' || I.kind === 'town' ? 'NO WILD CREATURES' : '';
      const dg = G.access && I.levels ? G.access.danger(id) : null;   // soft gate: how tough the wild creatures are for your team
      if (wl) G.text(ctx, wl + (dg === 'high' ? ' (TOUGH!)' : dg === 'some' ? ' (HARD)' : ''), x0 + pw - 2, py0 + 33, { font: G.FONT_S, color: dg === 'high' ? '#c03030' : dg ? '#c07010' : '#2a7a4a', shadow: false, align: 'right' });
      if (I.locked) { iconLock(ctx, L + 3, py0 + 36, 2.4); G.text(ctx, G.worldLockShort(id), L + 9, py0 + 33, { font: G.FONT_S, color: '#b03a3a', shadow: false }); }
      else G.text(ctx, I.visited ? 'Open to you.' : 'Open to you, not visited yet.', L, py0 + 33, { font: G.FONT_S, color: '#2a7a4a', shadow: false });
      const qs = G.quest ? G.quest.all().map(q => [q, G.quest.step(q.id)]).filter(([, s]) => s && s.at === id) : [];
      if (qs.length && S.journal && S.journal.markers !== false) { const [q, s] = qs[0]; G.text(ctx, '! ' + s.text, L, py0 + ph + 1, { font: G.FONT_S, color: '#fff', shadow: '#000' }); }
      // buttons
      const bx = x0 + pw - 54;
      G.kit.pill(ctx, bx, py0 + 5.5, 52, 9, '#3a9ae8', G.touch ? (zoom ? 'TAP: ZOOM OUT' : 'TAP: ZOOM') : zoom ? 'A: ZOOM OUT' : 'A: ZOOM');
      G.tapZone(bx, py0 + 4, 52, 11, toggle);
      G.kit.pill(ctx, bx, py0 + 17, 52, 9, '#9a8ea8', G.touch ? 'TAP: CLOSE' : 'B: CLOSE');
      G.tapZone(bx, py0 + 16, 52, 11, () => { close = true; });
      if (zoom && G.touch) G.text(ctx, 'DRAG TO LOOK AROUND', W / 2, top ? py0 + ph + 3 : py0 - 11, { font: G.FONT_S, color: '#fff', shadow: '#000', align: 'center' });
    },
  };
  api.scene = scene; G.worldMap = api; if (G.vehicles) G.vehicles._map = api;
  G.audio.sfx('select'); await G.fadeTo(1, 8, '#000'); G.scene = scene; await G.fadeTo(0, 8);
  for (;;) {
    await G.nextFrame();
    const k = G.input.pressed;
    if (tapped >= 0) { if (tapped === sel) toggle(); else G.audio.sfx('select'); sel = tapped; tapped = -1; continue; }
    if (close || k.b) break;
    if (k.a) { toggle(); G.audio.sfx('select'); }
    const nx = navPick(nodes, sel, k); if (nx !== sel) { sel = nx; G.audio.sfx('select'); }
  }
  G.audio.sfx('select'); await G.fadeTo(1, 8, '#000'); G.scene = back || G.world.scene; G.worldMap = null; if (G.vehicles) G.vehicles._map = null; await G.fadeTo(0, 8);
};


// ---- Ferries ------------------------------------------------------------------------------------------------------------------------
const says = l => G.worldApi.says(l);
const dollars = n => '$' + n.toLocaleString('en-US');
// Ticket price from the distance on the map: $200 to $800, in steps of $50.
G.ferryPrice = function (a, b) {
  const A = BYID[a], B = BYID[b]; if (!A || !B) return 200;
  const d = Math.hypot(A.nx - B.nx, (A.ny - B.ny) / 1.5);
  return Math.max(200, Math.min(800, Math.round((200 + d / .55 * 600) / 50) * 50));
};
// The crossings that leave a place (both directions of every ferry route): { to, price, badges, lantern, why }.
G.ferryRoutes = function (fromId) {
  buildGraph();
  const here = G.worldPlaceOf(fromId) || fromId, out = [];
  for (const f of WORLD.ferries) {
    const fwd = f.from === here, rev = f.to === here; if (!fwd && !rev) continue;
    const to = fwd ? f.to : f.from, need = fwd ? f.badges : 0, lantern = fwd ? f.lantern : false;
    out.push({ to, name: BYID[to].name, price: G.ferryPrice(here, to), badges: need, lantern, why: G.access && fwd ? ferryAccess(to, here) : ferryWhy(need, lantern) });
  }
  return out;
};
// The ferry follows the same access rules as the roads (the story, then badges or reputation), with the Lantern for the northern waters.
function ferryAccess(to, here) { return G.access.why(to, here); }
function ferryWhy(need, lantern) {
  if (need > badges()) return `The ferry only takes Wardens with ${need} Arena Badges. You have ${badges()}.`;
  if (lantern && !lanternLit()) return 'The northern waters are sealed. The ferry can\'t sail until the Great Lantern burns again.';
  return null;
}
function boatArt(c, t, ang) {
  c.save(); c.rotate(ang); const bob = Math.sin(t / 8) * .5;
  c.fillStyle = 'rgba(20,40,80,.28)'; c.beginPath(); c.ellipse(1, 3.5, 11, 3, 0, 0, TAU); c.fill();
  c.translate(0, bob);
  c.fillStyle = '#7a4a2c'; c.beginPath(); c.moveTo(-10, -1); c.lineTo(11, -1); c.quadraticCurveTo(10, 4.5, 6, 5); c.lineTo(-7, 5); c.quadraticCurveTo(-10, 4, -10, -1); c.fill();
  c.fillStyle = '#e8504a'; c.fillRect(-9.5, -1.6, 20, 1.8); c.fillStyle = '#fff'; c.fillRect(-9.5, -.3, 20, .8);
  c.fillStyle = '#d8c8a0'; c.fillRect(-5, -6, 8, 5); c.fillStyle = '#6a4a30'; c.fillRect(-5, -7, 8, 1.4); c.fillStyle = '#9fd8ff'; c.fillRect(-3.8, -4.6, 2.2, 2); c.fillRect(-.8, -4.6, 2.2, 2);
  c.strokeStyle = '#5a4030'; c.lineWidth = .8; c.beginPath(); c.moveTo(4.5, -1); c.lineTo(4.5, -12); c.stroke();
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(5, -11.5); c.quadraticCurveTo(12, -7, 10, -2); c.lineTo(5, -2); c.closePath(); c.fill();
  c.fillStyle = '#e8504a'; c.beginPath(); c.moveTo(4.2, -12); c.lineTo(-.6, -10.8); c.lineTo(4.2, -9.6); c.fill();
  c.restore();
}
function pathAt(pts, k) {   // point along a polyline at fraction k, with its heading
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  let d = k * tot, i = 0; while (i < L.length - 1 && d > L[i]) { d -= L[i]; i++; }
  const f = L[i] ? Math.min(1, d / L[i]) : 0, a = pts[i], b = pts[i + 1];
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), len: tot };
}
// Smooth the sea path so the boat turns gently.
function seaPath(pts) { const out = []; const n = 60; for (let i = 0; i <= n; i++) { const k = i / n, p = pathAt(pts, k); out.push([p.x, p.y]); } return out; }
let sailBoat = false;
const byBoatNow = () => sailBoat;
async function sail(from, to, boat) {
  sailBoat = !!boat;
  const pts = ferryPath(from, to), A = BYID[from], B = BYID[to], len = pathAt(pts, 0).len, T = Math.max(480, Math.min(900, Math.round(len / 1.1)));
  const trail = []; let t = 0, k = 0, vcx = A.port ? A.port[0] / RW : A.nx, vcy = A.port ? A.port[1] / RH : A.ny;
  const scene = {
    wide: true, raw: true,
    update() { t++; },
    draw(ctx) {
      const W = G.W, H = G.H, pw = Math.min(W - 8, 232), x0 = (W - pw) / 2;
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, pp = pathAt(pts, Math.max(0, Math.min(1, k)));
      vcx += (pp.x / RW - vcx) * .12; vcy += (pp.y / RH - vcy) * .12;
      G.drawWorldMap(ctx, 0, 0, W, H, { t, view: { cx: vcx, cy: vcy, z: 2.1 }, here: null, names: 'none', icons: 'none', fog: false, locks: false, clouds: false,
        draw(c, P, kx) {
          // wake
          for (let i = 0; i < trail.length; i++) { const [tx, ty, ta] = trail[i], [sx, sy] = P(tx, ty), a = i / trail.length; c.fillStyle = `rgba(255,255,255,${a * .5})`; c.beginPath(); c.ellipse(sx - Math.cos(pp.ang) * 2, sy - Math.sin(pp.ang) * 2, 1.2 + (1 - a) * 3.4, .8 + (1 - a) * 1.6, pp.ang, 0, TAU); c.fill(); }
          const [bx, by] = P(pp.x, pp.y); c.save(); c.translate(bx, by); const flip = Math.cos(pp.ang) < 0; c.scale(flip ? -1 : 1, 1); boatArt(c, t, Math.sin(flip ? Math.PI - pp.ang : pp.ang) * .3); c.restore();
          for (const q of [A, B]) { const [qx, qy] = P(q.x, q.y); G.drawSignPlate(c, G.worldShort(q.id), qx, qy - 6, t, q.id === to ? 'shop' : 'home'); }
        } });
      // caption + progress
      G.frame(ctx, x0, 4, pw, 20, 'dark');
      G.text(ctx, `${byBoatNow() ? 'BOAT' : 'FERRY'}: ${G.worldShort(from)} to ${G.worldShort(to)}`, x0 + 8, 8, { font: G.FONT_B || G.FONT, color: '#ffffff', shadow: '#0c2a40' });
      ctx.fillStyle = 'rgba(0,20,40,.5)'; G.kit.rr(ctx, x0 + 8, 18, pw - 16, 3, 1.5); ctx.fill(); ctx.fillStyle = '#7ae8ff'; G.kit.rr(ctx, x0 + 8, 18, Math.max(2, (pw - 16) * k), 3, 1.5); ctx.fill();
    },
  };
  G.worldSail = { scene, get k() { return k; }, from, to };
  G.scene = scene; G.fadeTo(0, 12);
  for (let i = 0; i <= T; i++) {
    k = i / T; const pp = pathAt(pts, k); if (i % 3 === 0) { trail.push([pp.x, pp.y, pp.ang]); if (trail.length > 26) trail.shift(); }
    if (i === T - 14) G.fadeTo(1, 14, '#000');
    await G.nextFrame();
  }
  G.worldSail = null;
}
// A walkable arrival tile: the destination's dock, else its landing spot, else the nearest open ground.
function arrivalSpot(m) {
  const W = G.worldApi, ok = (x, y) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && W.canWalk(x, y) && !W.tileWarp(x, y) && !W.objAt(x, y);
  const want = m.dock || m.landing || { x: m.w >> 1, y: m.h >> 1 };
  for (let r = 0; r <= 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (ok(want.x + dx, want.y + dy)) return { x: want.x + dx, y: want.y + dy }; }
  return want;
}
// The ticket desk and the crossing. Called by ferry captain NPCs (inside the world's busy loop).
G.ferry = async function (fromId) {
  const S = G.state, back = G.world.scene, here = G.worldPlaceOf(fromId) || fromId, routes = G.ferryRoutes(fromId);
  if (!routes.length) { await says('The ferry is not running yet.'); return false; }
  await says('FERRY CAPTAIN: Ahoy! Fancy a crossing? Have a look at the ticket board.');
  let sel = 0, t = 0, result = null, tapped = -1, cancel = false;
  const scene = {
    wide: true, raw: true,
    update() { t++; },
    draw(ctx) {
      const W = G.W, H = G.H, pw = Math.min(W - 8, 232), x0 = (W - pw) / 2;
      const R = routes[sel], path = ferryPath(here, R.to), A = BYID[here], B = BYID[R.to];
      const cx = (A.x + B.x) / 2 / RW, cy = (A.y + B.y) / 2 / RH;
      G.drawWorldMap(ctx, 0, 0, W, H, { t, here, cursor: R.to, view: { cx, cy: cy + .08, z: 1.25 }, names: 'sel', icons: 'none', fog: false, locks: true, ferries: true,
        draw(c, P) { c.save(); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 1.6; c.setLineDash([3, 3]); c.beginPath(); path.forEach((q, i) => { const [x, y] = P(q[0], q[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.restore(); } });
      // the ticket desk
      const h = 24 + routes.length * 16, y0 = H - h - 3;
      G.frame(ctx, x0, y0, pw, h, 'light');
      G.text(ctx, 'FERRY TICKET DESK', x0 + 8, y0 + 5, { font: G.FONT_B || G.FONT });
      G.text(ctx, `Your money: ${dollars(S.money)}   Badges: ${badges()}`, x0 + pw - 2, y0 + 6, { font: G.FONT_S, color: '#5a4a66', shadow: false, align: 'right' });
      routes.forEach((r, i) => {
        const yy = y0 + 16 + i * 16, on = i === sel;
        if (on) { ctx.fillStyle = 'rgba(255,200,90,.35)'; G.kit.rr(ctx, x0 + 5, yy - 1.5, pw - 10, 15, 3); ctx.fill(); }
        G.tapZone(x0 + 5, yy - 1.5, pw - 10, 15, () => { tapped = i; });
        iconAnchor(ctx, x0 + 11, yy + 3.5, 3);
        G.text(ctx, G.worldShort(r.to), x0 + 18, yy, { font: on ? (G.FONT_B || G.FONT) : G.FONT, color: '#3a2a48' });
        G.text(ctx, dollars(r.price), x0 + pw - 4, yy, { font: G.FONT_B || G.FONT, color: S.money >= r.price ? '#2a7a4a' : '#b03a3a', shadow: false, align: 'right' });
        const req = []; if (r.badges) req.push(`${r.badges} BADGES`); if (r.lantern) req.push('LANTERN RELIT');
        const txt = req.length ? `Needs ${req.join(' + ')}` : 'Open to all';
        G.text(ctx, txt, x0 + 18, yy + 7.5, { font: G.FONT_S, color: r.why ? '#b03a3a' : '#2a7a4a', shadow: false });
        if (r.why) iconLock(ctx, x0 + 18 + ctx.measureText(txt).width + 6, yy + 10.5, 2);
      });
      G.text(ctx, G.touch ? 'TAP: BUY   TAP MAP: BACK' : (G.vehicles && G.vehicles.ownsBoat && G.vehicles.ownsBoat() ? 'A: TICKET OR YOUR BOAT   B: BACK' : 'A: BUY TICKET   B: BACK'), x0 + 8, y0 + h - 8.5, { font: G.FONT_S, color: '#8a7a90', shadow: false });
      G.tapZone(-999, -999, 2400, 2400, () => { cancel = true; });
    },
  };
  G.ferryDesk = { scene, routes, get sel() { return sel; }, set sel(v) { sel = v; }, here };
  G.audio.sfx('select'); await G.fadeTo(1, 8, '#000'); G.scene = scene; await G.fadeTo(0, 8);
  let dest = null, byBoat = false;
  for (;;) {
    await G.nextFrame(); const k = G.input.pressed;
    if (tapped >= 0) { if (tapped === sel) k.a = true; else { sel = tapped; G.audio.sfx('select'); } tapped = -1; }
    if (cancel || k.b) break;
    if (k.up) { sel = (sel + routes.length - 1) % routes.length; G.audio.sfx('select'); } if (k.down) { sel = (sel + 1) % routes.length; G.audio.sfx('select'); }
    if (!k.a) continue;
    const r = routes[sel];
    if (r.why) { G.audio.sfx('bump'); await says('FERRY CAPTAIN: ' + r.why); continue; }
    const boat = !!(G.vehicles && G.vehicles.ownsBoat && G.vehicles.ownsBoat());
    if (boat) {   // owners of a boat may sail it across for free (same destinations and requirements)
      const c = await G.choose([`BUY TICKET ${dollars(r.price)}`, 'SAIL YOUR BOAT', 'CANCEL'], { right: 236, y: 4, minW: 70, rowH: 13 }); G.closeText();
      if (c === 1) { G.audio.sfx('select'); dest = r; byBoat = true; break; }
      if (c !== 0) continue;
    }
    if (S.money < r.price) { G.audio.sfx('bump'); await says(`FERRY CAPTAIN: A ticket to ${G.worldShort(r.to)} is ${dollars(r.price)}, and you only have ${dollars(S.money)}.`); continue; }
    if (!boat) { await G.say(`Buy a ticket to ${G.worldShort(r.to)} for ${dollars(r.price)}?`, { auto: 1 }); const yes = await G.yesNo(); G.closeText(); if (!yes) continue; }
    S.money -= r.price; G.audio.sfx('buy'); dest = r; break;
  }
  G.ferryDesk = null;
  if (!dest) { await G.fadeTo(1, 8, '#000'); G.scene = back; await G.fadeTo(0, 8); await says('FERRY CAPTAIN: Come back whenever you need to cross!'); return false; }
  await says(byBoat ? `You cast off in your own boat, bound for ${BYID[dest.to].name}.` : `FERRY CAPTAIN: All aboard! Next stop, ${BYID[dest.to].name}.`);
  G.audio.sfx('warp'); await G.fadeTo(1, 10, '#000');
  await sail(here, dest.to, byBoat);
  G.ui.fade.a = 1;
  S.visited = S.visited || {}; S.visited[dest.to] = true;
  G.loadMap(dest.to);
  const m = G.world.map, sp = arrivalSpot(m); G.placePlayer(sp.x, sp.y, 0);
  G.scene = G.world.scene; await G.wait(4); await G.fadeTo(0, 18);
  G.audio.sfx('select');
  await says(`The ferry docked at ${m.name}.`);
  return true;
};

// @@MORE@@
})();
