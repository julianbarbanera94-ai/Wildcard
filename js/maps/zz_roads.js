// Wild roads between neighbouring cities (docs/WORLD.md, "Roads"): where two towns or cities used to open straight into each other, a
// wild stretch now lies between them, so crossing the land takes time and the world feels as big as it is drawn. Each road is a small
// outdoor map (tall grass, trainers, items, a signpost and a traveller to talk to) generated here from a few numbers; the old edge exits
// of the two places are re-pointed at it, so every other system (gates, the map screen, ferries) keeps working: a road belongs to the
// place it leads away from, and the gate rule of the place at its far end still stops you at that end.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, warp, npc, sign, trainer, edgeExit, DOWN, UP, LEFT, RIGHT } = G.mk;
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id, item: name, ball: true }, qty ? { qty } : {}));
const SIDE_ARRIVE = { N: (m, at, k) => [at + k, 1], S: (m, at, k) => [at + k, m.h - 2], W: (m, at, k) => [1, at + k], E: (m, at, k) => [m.w - 2, at + k] };
const SIDE_OPP = { N: 'S', S: 'N', W: 'E', E: 'W' };

// An encounter table borrowed from a neighbouring region: its most common species, at the road's own levels.
function encFrom(src, lo, hi) {
  const m = G.MAPS[src], by = {};
  for (const [id, , , w] of m.enc) by[id] = Math.max(by[id] || 0, w);
  const ids = Object.keys(by).map(Number).sort((a, b) => by[b] - by[a]).slice(0, 8);
  return ids.map((id, i) => [id, lo, i < 6 ? hi - 1 : hi, by[id]]);
}

function road(spec) {
  const [e1, e2] = spec.ends, m = newMap(spec.id, spec.name, spec.w, spec.h, spec.fill || 'g', { music: 'route', biome: spec.biome, enc: encFrom(spec.enc[0], spec.enc[1], spec.enc[2]) });
  const W = m.w, H = m.h, R = (x, y, s) => hash(x, y, spec.seed + (s || 0));
  // 1. border: two deep, ragged
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e === 0 || (e === 1 && R(x, y) < .6) || (e === 2 && R(x, y, 3) < .25)) set(m, x, y, spec.border(R(y, x, 5))); }
  // 2. the road: a winding two-wide path from one end to the other
  const P = new Set(), mark = (x, y) => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { set(m, x + i, y + j, 'p'); P.add((x + i) + ',' + (y + j)); } };
  const seg = (x0, y0, x1, y1) => { let x = x0, y = y0; mark(x, y); while (x !== x1) { x += Math.sign(x1 - x); mark(x, y); } while (y !== y1) { y += Math.sign(y1 - y); mark(x, y); } };
  const inner = e => { const [ax, ay] = SIDE_ARRIVE[e.side](m, e.at, 0); return [e.side === 'W' ? 0 : e.side === 'E' ? W - 2 : ax, e.side === 'N' ? 0 : e.side === 'S' ? H - 2 : ay]; };
  const [sx, sy] = inner(e1), [tx, ty] = inner(e2); let way = [[sx, sy]];
  if (SIDE_OPP[e1.side] === e2.side) {   // straight through, jogging sideways now and then
    const vert = e1.side === 'N' || e1.side === 'S', len = vert ? H : W, wid = vert ? W : H, dirn = e1.side === 'N' || e1.side === 'W' ? 1 : -1;
    for (let k = 1; k <= 4; k++) { const along = Math.round((vert ? sy : sx) + dirn * (len - 2) * k / 5), across = 8 + Math.floor(R(k, 9) * (wid - 16)); way.push(vert ? [across, along] : [along, across]); }
  } else {   // a bend: out of one side, across to the other
    const vert1 = e1.side === 'N' || e1.side === 'S'; way.push(vert1 ? [sx, ty] : [tx, sy]);
  }
  way.push([tx, ty]); for (let i = 0; i < way.length - 1; i++) seg(...way[i], ...way[i + 1]);
  // distance from the road (4-neighbour BFS, capped), used to place things sensibly
  const dist = Array.from({ length: H }, () => Array(W).fill(9)); let q = [];
  for (const k of P) { const [x, y] = k.split(',').map(Number); dist[y][x] = 0; q.push([x, y]); }
  while (q.length) { const nx = []; for (const [x, y] of q) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a, Y = y + b; if (X > 0 && Y > 0 && X < W - 1 && Y < H - 1 && dist[Y][X] > dist[y][x] + 1) { dist[Y][X] = dist[y][x] + 1; nx.push([X, Y]); } } q = nx; }
  const free = (x, y, d) => x > 2 && y > 2 && x < W - 3 && y < H - 3 && dist[y][x] >= d && m.t[y][x] === spec.fill && !P.has(x + ',' + y);
  // 3. tall grass patches beside the road (the encounters)
  for (let n = 0, tries = 0; n < spec.patches && tries < 400; tries++) {
    const cx = 4 + Math.floor(R(tries, 11) * (W - 8)), cy = 4 + Math.floor(R(tries, 12) * (H - 8)), rx = 2.5 + R(tries, 13) * 2.5, ry = 1.8 + R(tries, 14) * 1.8;
    if (dist[cy][cx] < 2 || dist[cy][cx] > 6) continue; n++;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + (R(x, y, 15) - .5) * .4 && free(x, y, 1)) set(m, x, y, 'G');
  }
  // 4. scenery
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    if (!free(x, y, 2)) continue; const r = R(x, y, 20);
    for (const [lo, hi, ch] of spec.scenery) if (r >= lo && r < hi) { set(m, x, y, typeof ch === 'function' ? ch(R(y, x, 21)) : ch); break; }
  }
  for (const [x, y, w, h, ch] of spec.features || []) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!P.has((x + i) + ',' + (y + j)) && m.t[y + j][x + i] !== 'G') set(m, x + i, y + j, ch);
  // 5. things to find and people to meet, placed by walking along the road
  const route = []; for (const k of P) { const [x, y] = k.split(',').map(Number); route.push([x, y]); }
  route.sort((a, b) => (SIDE_OPP[e1.side] === e2.side ? ((e1.side === 'N' || e1.side === 'S') ? (a[1] - b[1]) * (e1.side === 'N' ? 1 : -1) : (a[0] - b[0]) * (e1.side === 'W' ? 1 : -1)) : (Math.hypot(a[0] - sx, a[1] - sy) - Math.hypot(b[0] - sx, b[1] - sy))) || a[0] - b[0]);
  const spot = (frac, side, d0, d1) => {   // a free tile roughly `frac` of the way along, d0..d1 tiles off the road
    const base = route[Math.min(route.length - 1, Math.floor(route.length * frac))];
    for (let r = d0; r <= d1 + 8; r++) for (const [a, b] of side > 0 ? [[r, 0], [0, r], [-r, 0], [0, -r]] : [[-r, 0], [0, -r], [r, 0], [0, r]]) {
      const x = base[0] + a, y = base[1] + b; if (x > 2 && y > 2 && x < W - 3 && y < H - 3 && dist[y][x] >= d0 && dist[y][x] <= d1 + 2 && !P.has(x + ',' + y) && ['g', 'y', 'f'].includes(m.t[y][x]) && !m.objs.some(o => o.x === x && o.y === y) && !m.npcs.some(n => n.x === x && n.y === y)) return [x, y];
    }
    return null;
  };
  const facing = (x, y) => { let best = DOWN, bd = 99; for (const [d, a, b] of [[DOWN, 0, 1], [UP, 0, -1], [LEFT, -1, 0], [RIGHT, 1, 0]]) for (let k = 1; k <= 4; k++) if (P.has((x + a * k) + ',' + (y + b * k)) && k < bd) { bd = k; best = d; } return best; };
  spec.items.forEach(([frac, id, name, qty], i) => { const s = spot(frac, i % 2 ? 1 : -1, 3, 8); if (s) item(m, s[0], s[1], spec.id + '_' + id, name, qty); });
  spec.trainers.forEach(([frac, key, style, t], i) => { const s = spot(frac, i % 2 ? -1 : 1, 2, 4); if (s) trainer(m, spec.id + '_' + key, s[0], s[1], facing(s[0], s[1]), style, Object.assign({ sight: 4 }, t)); });
  spec.signs.forEach(([frac, text], i) => { const s = spot(frac, i % 2 ? -1 : 1, 2, 4); if (s) sign(m, s[0], s[1], text); });
  { const s = spot(spec.talk[0], 1, 2, 3); if (s) npc(m, s[0], s[1], facing(s[0], s[1]), spec.talk[1], spec.talk[2], { still: true }); }
  // 6. the two ends: warps to the places this road joins, and a fixed landing spot
  for (const e of spec.ends) edgeExit(m, e.side, e.at, e.to, e.ax, e.ay, null, e.along);
  // the gate rule at each end is judged as if you came from the place at the other end (js/access.js reads `gateFrom`)
  for (const w of m.warps) w.gateFrom = spec.ends.find(e => e.to !== w.to).to;
  m.landing = { x: W >> 1, y: H >> 1 }; m.road = true;
  return m;
}

// Re-point the old edge exits between two places at the road. `at` is the road's end position; the road's exits take over the old arrival tiles.
function between(a, b, spec) {
  const A = G.MAPS[a], B = G.MAPS[b]; if (!A || !B) return;
  const toB = A.warps.filter(w => w.to === b), toA = B.warps.filter(w => w.to === a); if (toB.length !== 2 || toA.length !== 2) return;
  const along = ws => ws[1].tx !== ws[0].tx ? 'x' : 'y';
  const m = road(Object.assign({}, spec, { ends: [Object.assign({}, spec.ends[0], { to: a, ax: toA[0].tx, ay: toA[0].ty, along: along(toA) }), Object.assign({}, spec.ends[1], { to: b, ax: toB[0].tx, ay: toB[0].ty, along: along(toB) })] }));
  const retarget = (ws, e) => ws.forEach((w, k) => { const [tx, ty] = SIDE_ARRIVE[e.side](m, e.at, k); w.to = m.id; w.tx = tx; w.ty = ty; delete w.need; delete w.offer; });   // the gate moves to the road's far end (js/access.js wires it there)
  retarget(toB.sort((p, q) => p.x - q.x || p.y - q.y), spec.ends[0]);   // A -> road (arrive at the road's first end)
  retarget(toA.sort((p, q) => p.x - q.x || p.y - q.y), spec.ends[1]);   // B -> road (arrive at its second end)
}

const grass = { fill: 'g', border: r => r < .35 ? 'n' : '#', scenery: [[0, .05, '#'], [.05, .08, 'n'], [.08, .15, 'f'], [.15, .19, 'u'], [.19, .21, 'r'], [.21, .23, 'd']] };
const shore = { fill: 'g', border: r => r < .4 ? 'n' : '#', scenery: [[0, .03, '#'], [.03, .12, 'y'], [.12, .17, 'f'], [.17, .21, 'u'], [.21, .24, 'r']] };
const desert = { fill: 'y', border: r => r < .6 ? 'E' : 'r', scenery: [[0, .05, 'r'], [.05, .08, 'E'], [.08, .13, 'u'], [.13, .17, 'd']] };
const snow = { fill: 'g', border: r => r < .6 ? 'n' : 'E', scenery: [[0, .08, 'n'], [.08, .12, 'r'], [.12, .16, 'u'], [.16, .19, 'E']] };
const T = (cls, team, pre, win, post, prize) => ({ cls, team, pre, win, post, prize });

// Stonebridge Road: Lanternrest to Stonebridge, the first stretch of country a new Warden walks. Levels sit with Mirewood and Sunmeadow.
between('lanternrest', 'stonebridge', Object.assign({}, grass, {
  id: 'road_stonebridge', name: 'STONEBRIDGE ROAD', w: 40, h: 56, seed: 41, patches: 11, enc: ['mirewood', 7, 11],
  ends: [{ side: 'N', at: 18 }, { side: 'S', at: 21 }],
  items: [[.2, 'potion', 'Potion', 2], [.45, 'orb', 'Terra Orb', 2], [.7, 'heal', 'Full Heal'], [.85, 'super', 'Super Potion']],
  trainers: [[.28, 'wynn', 'kid', { name: 'WYNN', ...T('KID', [[18, 8], [16, 8]], 'Is this your first trip to Stonebridge? Let me test you!', 'You are quick!', 'The road gets rougher past the bend.', 30) }],
    [.52, 'tess', 'lass', { name: 'TESS', ...T('PICNICKER', [[10, 8], [12, 9]], 'Lunch break is over, battle time!', 'My sandwich and my pride. Gone.', 'Stay on the road after dark.', 32) }],
    [.76, 'dale', 'hiker', { name: 'DALE', ...T('HIKER', [[16, 9], [18, 9], [14, 10]], 'Fresh legs! Fresh Bondlings! Let us see them.', 'Ha! You will make it to the bridge.', 'The bridge folk will want to meet you.', 36) }]],
  signs: [[.1, 'STONEBRIDGE ROAD\nLanternrest is back north. Stonebridge is south, past the river bend.'], [.9, 'STONEBRIDGE ROAD\nWelcome to Stonebridge. The old bridge is just ahead.']],
  talk: [.4, 'old', ['The first Wardens walked this road with lanterns. That is why the stones are so smooth.', 'Past the bridge a guardian sleeps by the river, they say. A gentle soul, if you ask nicely.']],
}));
// Coast Road: Sunhaven to Driftwood Port, sand and sea grass above the harbour. Levels sit just under Driftwood's.
between('sunhaven', 'driftwood', Object.assign({}, shore, {
  id: 'road_coast', name: 'COAST ROAD', w: 40, h: 56, seed: 52, biome: 'coast', patches: 11, enc: ['driftwood', 16, 21],
  ends: [{ side: 'N', at: 18 }, { side: 'S', at: 19 }],
  items: [[.18, 'potion', 'Super Potion', 2], [.4, 'orb', 'Terra Orb', 3], [.62, 'revive', 'Revive'], [.82, 'pulse', 'Pulse Orb']],
  trainers: [[.25, 'cora', 'lass', { name: 'CORA', ...T('BEACHCOMBER', [[68, 17], [47, 17]], 'Found anything good on the sand? Neither did I. Battle!', 'The tide beat me too.', 'Shells wash up near the rocks at low tide.', 52) }],
    [.5, 'finch', 'camper', { name: 'FINCH', ...T('FISHER', [[141, 18], [99, 18], [10, 18]], 'Fishing is slow. Battling is not!', 'You reeled me in.', 'The ferry to the islands leaves from Driftwood.', 56) }],
    [.75, 'marlo', 'boy', { name: 'MARLO', ...T('SAILOR', [[70, 19], [49, 19], [112, 20]], 'Sea legs on dry land, watch this!', 'Man overboard...', 'Driftwood Port is just over the dunes.', 60) }]],
  signs: [[.1, 'COAST ROAD\nSunhaven is back north. Driftwood Port lies south along the shore.'], [.9, 'COAST ROAD\nDriftwood Port ahead. Mind the harbour traffic.']],
  talk: [.45, 'lass', ['Driftwood is full of sailors now that the ferries run again.', 'Folk say strangers in dark coats were asking about the island shard. Keep your eyes open out there.']],
}));
// Cobalt Flats: out of Cobalt City's north gate, bending west into the desert. Levels sit with Sandsreach.
between('cobalt', 'sandsreach', Object.assign({}, desert, {
  id: 'road_cobalt', name: 'COBALT FLATS', w: 52, h: 52, seed: 63, biome: 'desert', patches: 12, enc: ['sandsreach', 21, 26],
  ends: [{ side: 'S', at: 30 }, { side: 'E', at: 20 }],
  items: [[.2, 'potion', 'Super Potion', 2], [.45, 'orb', 'Pulse Orb', 2], [.7, 'heal', 'Full Heal'], [.88, 'rev', 'Revive']],
  trainers: [[.3, 'sera', 'lass', { name: 'SERA', ...T('DRIVER', [[123, 22], [18, 23]], 'Dust in my eyes, fire in my team!', 'You blew past me.', 'Cobalt is back south of here.', 66) }],
    [.55, 'abel', 'hiker', { name: 'ABEL', ...T('RANGER', [[141, 23], [120, 23], [117, 24]], 'The flats are mine to guard. Prove you belong.', 'Fair enough, pass.', 'Sandsreach is a long walk west, bring water.', 70) }],
    [.8, 'noor', 'camper', { name: 'NOOR', ...T('NOMAD', [[151, 24], [143, 24], [20, 25]], 'You walked right into my camp!', 'The dunes favour you.', 'Sandsreach has more than sand, they say.', 72) }]],
  signs: [[.1, 'COBALT FLATS\nCobalt City is back south. Sandsreach Desert lies west.'], [.9, 'COBALT FLATS\nSandsreach Desert ahead. Watch for sand pits.']],
  talk: [.5, 'hiker', ['At night you can see Cobalt from here, the brightest lights in the vale.', 'The wind picks up in the flats. Pull your cloak tight and keep to the road.']],
}));
// Frostmere Approach: Frostmere City to Glacier Pass, a snowy road above the bay. Levels sit with Glacier.
between('frostmere', 'glacier', Object.assign({}, snow, {
  id: 'road_frostmere', name: 'FROSTMERE APPROACH', w: 56, h: 40, seed: 74, biome: 'snow', patches: 11, enc: ['glacier', 30, 35],
  ends: [{ side: 'E', at: 18 }, { side: 'W', at: 18 }],
  items: [[.2, 'potion', 'Super Potion', 3], [.42, 'orb', 'Pulse Orb', 3], [.66, 'heal', 'Full Heal', 2], [.86, 'rev', 'Revive', 2]],
  trainers: [[.28, 'ines', 'lass', { name: 'INES', ...T('SKIER', [[47, 31], [149, 31]], 'Fresh powder, fresh battle!', 'You carved me up.', 'Frostmere is warm once you are inside.', 90) }],
    [.52, 'borg', 'hiker', { name: 'BORG', ...T('CLIMBER', [[99, 32], [112, 32], [57, 33]], 'The cold sharpens a fighter. Show me.', 'You are made of ice and iron.', 'Glacier Pass is steep. Take it slow.', 96) }],
    [.78, 'yuki', 'old', { name: 'YUKI', ...T('ICE FISHER', [[70, 33], [41, 33], [88, 34]], 'Quiet! You will scare the fish. ...Battle, then.', 'Hmph. No fish and no win.', 'The bay never freezes where the lighthouse shines.', 100) }]],
  signs: [[.1, 'FROSTMERE APPROACH\nFrostmere City is east. Glacier Pass lies west.'], [.9, 'FROSTMERE APPROACH\nGlacier Pass ahead. Wrap up warm.']],
  talk: [.5, 'elder', ['The ferry to the Aurora Isles leaves from Frostmere once you carry seven badges.', 'Aurora is a place of light. Not everyone returns unchanged.']],
}));
})();
