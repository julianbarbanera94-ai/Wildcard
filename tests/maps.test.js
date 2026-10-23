// Run with: node tests/maps.test.js — checks map data and that everything in the world is reachable on foot.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
globalThis.addEventListener = () => {};
const packs = fs.readdirSync(path.join(__dirname, '../js/species')).sort().map(f => 'species/' + f.replace('.js', ''));
const files = ['data', ...packs, 'creature', 'gfx', 'terrain', 'mapkit', ...fs.readdirSync(path.join(__dirname, '../js/maps')).sort().map(f => 'maps/' + f.replace('.js', '')), 'world'];
for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js', f + '.js'), 'utf8'), { filename: f });
const G = globalThis.G, maps = G.MAPS;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };
const solid = (m, x, y) => { const c = m.t[y] && m.t[y][x]; return !c || G.TILES[c].solid; };
const VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]];

t('every tile char is defined and rows are rectangular', () => {
  for (const m of Object.values(maps)) {
    assert.equal(m.t.length, m.h, m.id); m.t.forEach((r, y) => { assert.equal(r.length, m.w, `${m.id} row ${y}`); for (const c of r) assert(G.TILES[c], `${m.id}: unknown tile '${c}'`); });
  }
});
t('warps start on walkable tiles and land on walkable tiles of existing maps', () => {
  for (const m of Object.values(maps)) for (const w of m.warps) {
    if (w.sea) continue;   // boat gates stand on water (checked by the sea test below)
    assert(!solid(m, w.x, w.y), `${m.id}: warp tile ${w.x},${w.y} is solid`);
    const d = maps[w.to]; assert(d, `${m.id}: warp to unknown map ${w.to}`);
    assert(!solid(d, w.tx, w.ty), `${m.id}->${w.to}: landing ${w.tx},${w.ty} is solid`);
    assert(!d.warps.some(x => x.x === w.tx && x.y === w.ty), `${m.id}->${w.to}: landing tile is itself a warp (would loop)`);
  }
});
t('NPCs, objects and trainers sit on walkable tiles and never overlap', () => {
  for (const m of Object.values(maps)) {
    const seen = new Set();
    for (const e of m.npcs) { assert(!solid(m, e.x, e.y), `${m.id}: NPC at ${e.x},${e.y} on solid tile`); const k = e.x + ',' + e.y; assert(!seen.has(k), `${m.id}: two NPCs at ${k}`); seen.add(k); }
    for (const o of m.objs) if (o.ball) { assert(!solid(m, o.x, o.y), `${m.id}: item at ${o.x},${o.y} on solid tile`); assert(!seen.has(o.x + ',' + o.y), `${m.id}: item under NPC at ${o.x},${o.y}`); }
  }
});
t('wild encounter tables refer to real species and only maps with encounter tiles have tables', () => {
  for (const m of Object.values(maps)) {
    const hasEnc = m.t.some(r => [...r].some(c => G.TILES[c].enc));
    if (m.enc) { assert(hasEnc, `${m.id}: has a table but no encounter tiles`); m.enc.forEach(([id, lo, hi, wt]) => { assert(G.SPECIES[id], `${m.id}: bad species ${id}`); assert(lo <= hi && wt > 0); }); }
    else assert(!hasEnc, `${m.id}: encounter tiles but no table`);
  }
});
t('everything in the world is reachable on foot from the start (trainers treated as beatable)', () => {
  const reached = {}; const queue = [['cottage', 4, 4]];
  const key = (id, x, y) => id + ':' + x + ',' + y;
  const blocked = (m, x, y) => solid(m, x, y) || m.npcs.some(e => e.x === x && e.y === y && !e.trainer) || m.objs.some(o => o.ball && o.x === x && o.y === y);
  const seen = new Set([key('cottage', 4, 4)]);
  while (queue.length) {
    const [id, x, y] = queue.pop(); const m = maps[id]; (reached[id] = reached[id] || new Set()).add(x + ',' + y);
    const w = m.warps.find(w => w.x === x && w.y === y);
    if (w) { const k = key(w.to, w.tx, w.ty); if (!seen.has(k)) { seen.add(k); queue.push([w.to, w.tx, w.ty]); } }
    if (m.dock && m.dock.x === x && m.dock.y === y) for (const [a, b] of G.mk.FERRIES) for (const [f, to] of [[a, b], [b, a]]) if (f === id && maps[to] && maps[to].dock) { const k = key(to, maps[to].dock.x, maps[to].dock.y); if (!seen.has(k)) { seen.add(k); queue.push([to, maps[to].dock.x, maps[to].dock.y]); } }
    for (const [dx, dy] of VEC) { const nx = x + dx, ny = y + dy, k = key(id, nx, ny); if (!seen.has(k) && !blocked(m, nx, ny)) { seen.add(k); queue.push([id, nx, ny]); } }
  }
  for (const m of Object.values(maps)) {
    if (m.sea) continue;   // the open sea is reached by boat (see the sea test)
    assert(reached[m.id], `map ${m.id} is unreachable`);
    const adj = (x, y) => VEC.some(([dx, dy]) => reached[m.id].has((x + dx) + ',' + (y + dy))) || reached[m.id].has(x + ',' + y);
    for (const e of m.npcs) assert(adj(e.x, e.y), `${m.id}: NPC at ${e.x},${e.y} unreachable`);
    for (const o of m.objs) assert(adj(o.x, o.y), `${m.id}: object at ${o.x},${o.y} unreachable`);
    for (const w of m.warps) if (!w.sea) assert(reached[m.id].has(w.x + ',' + w.y), `${m.id}: warp at ${w.x},${w.y} unreachable`);
  }
});
t('the Aurelian Sea: every harbour town opens onto it, boats can sail from each dock to every other harbour, and the gates line up', () => {
  const sea = maps.aurelis_sea; assert(sea && sea.sea && sea.seaGates.length >= 8, 'sea map with harbour gates');
  const wat = (m, x, y) => !!(m.t[y] && m.t[y][x] === 'w');
  const flood = (m, sx, sy) => { const seen = new Set([sx + ',' + sy]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of VEC) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!seen.has(k) && wat(m, nx, ny) && !(m.t[ny][nx] === 'r')) { seen.add(k); q.push([nx, ny]); } } } return seen; };
  const gateWarps = sea.warps.filter(w => w.sea);
  assert.equal(gateWarps.length, sea.seaGates.length * 9, 'a 3x3 gate per harbour');
  // from the first harbour's gate, every other harbour gate is reachable over water
  const g0 = sea.seaGates[0], reach = flood(sea, g0.x, g0.y);
  for (const g of sea.seaGates) assert(reach.has(g.x + ',' + g.y), `the sea route from ${sea.seaGates[0].id} to ${g.id} is blocked`);
  for (const g of sea.seaGates) {
    const town = maps[g.id]; assert(town && town.seaExit, `${g.id} has sea exits`);
    const out = town.warps.filter(w => w.sea && w.to === 'aurelis_sea'); assert(out.length >= 2, `${g.id}: ways out to sea`);
    const into = sea.warps.filter(w => w.sea && w.to === g.id); assert.equal(into.length, 9);
    const arr = into[0]; assert(wat(town, arr.tx, arr.ty), `${g.id}: boat arrives on water`); assert(!town.warps.some(w => w.x === arr.tx && w.y === arr.ty), `${g.id}: arrival isn't a gate`);
    // the boat that arrives can sail to the town's own exits (and the dock's water)
    const inTown = flood(town, arr.tx, arr.ty);
    assert(out.some(w => inTown.has(w.x + ',' + w.y)), `${g.id}: arrival water connects to the sea exits`);
    if (town.dock) assert([...inTown].some(k => { const [x, y] = k.split(',').map(Number); return Math.abs(x - town.dock.x) + Math.abs(y - town.dock.y) <= 3; }), `${g.id}: boat water reaches the dock`);
    // the boat that leaves lands on open sea, not on a gate
    const ex = out[0]; assert(wat(sea, ex.tx, ex.ty) && !sea.warps.some(w => w.x === ex.tx && w.y === ex.ty), `${g.id}: launch tile is open water`);
    assert(reach.has(ex.tx + ',' + ex.ty), `${g.id}: launch tile is connected to the sea`);
  }
  // no encounter tiles on the sea
  assert(!sea.t.some(r => r.some(c => G.TILES[c].enc)));
});
t('story chain exists: starter orbs, no trainer holds a shard, tower pedestals, Joker', () => {
  assert.equal(maps.shrine.objs.filter(o => o.orb).length, 3);
  const shards = Object.values(maps).flatMap(m => m.npcs.filter(e => e.trainer && e.trainer.shard).map(e => e.trainer.shard)).sort();
  assert.deepEqual(shards, [], 'the shards come from guardians and the drowned shrine (js/chapter2.js, js/chapter5.js; tests/e2e-story2.js, e2e-story3.js)');
  assert.deepEqual(maps.tower.objs.filter(o => o.pedestal).map(o => o.pedestal).sort(), ['marsh', 'meadow', 'mine']);
  assert(maps.hollow.npcs.some(e => e.creature === 25));
  for (const m of Object.values(maps)) for (const e of m.npcs) if (e.trainer) for (const [id, l] of e.trainer.team) assert(G.SPECIES[id] && l >= 1, `${e.trainer.id}: bad team entry`);
});
t('regions are connected back to the hub both ways', () => {
  for (const r of ['sunmeadow', 'ridge', 'stonebridge', 'sandsreach']) {
    assert(maps.lanternrest.warps.some(w => w.to === r), `hub has no exit to ${r}`); assert(maps[r].warps.some(w => w.to === 'lanternrest'), `${r} has no way back`);
  }
  assert(maps.ridge.warps.some(w => w.to === 'mine') && maps.mine.warps.some(w => w.to === 'ridge'));
  // every warp between two outdoor maps has a way back
  for (const m of Object.values(maps)) if (m.outdoor) for (const w of m.warps) if (maps[w.to] && maps[w.to].outdoor && w.to !== 'homestead' && m.id !== 'homestead') assert(maps[w.to].warps.some(b => b.to === m.id), `${m.id} -> ${w.to} has no way back`);
});
t('species habitats name real encounter maps, and every species can be obtained', () => {
  assert.deepEqual(G.badHabitats, [], 'habitats pointing at maps without encounter tables');
  const wild = new Set(Object.values(maps).flatMap(m => (m.enc || []).map(e => e[0])));
  const special = new Set([1, 4, 7, 25]);   // starters and the Joker (static encounter)
  for (const m of Object.values(maps)) for (const n of m.npcs) if (n.creature) special.add(n.creature);
  const got = new Set([...wild, ...special]); let grew = true;
  while (grew) { grew = false; for (const s of Object.values(G.SPECIES)) if (got.has(s.id) && s.evo && !got.has(s.evo[1])) { got.add(s.evo[1]); grew = true; } }
  const missing = Object.values(G.SPECIES).filter(s => !got.has(s.id)).map(s => s.name);
  assert.deepEqual(missing, [], 'species that can never be obtained');
});
console.log(`${n} map tests passed`);
