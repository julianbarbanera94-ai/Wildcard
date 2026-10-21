// Run with: node tests/maps.test.js — checks map data and that everything in the world is reachable on foot.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
globalThis.addEventListener = () => {};
const files = ['data', 'creature', 'gfx', 'terrain', 'mapkit', ...fs.readdirSync(path.join(__dirname, '../js/maps')).sort().map(f => 'maps/' + f.replace('.js', '')), 'world'];
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
    for (const [dx, dy] of VEC) { const nx = x + dx, ny = y + dy, k = key(id, nx, ny); if (!seen.has(k) && !blocked(m, nx, ny)) { seen.add(k); queue.push([id, nx, ny]); } }
  }
  for (const m of Object.values(maps)) {
    assert(reached[m.id], `map ${m.id} is unreachable`);
    const adj = (x, y) => VEC.some(([dx, dy]) => reached[m.id].has((x + dx) + ',' + (y + dy))) || reached[m.id].has(x + ',' + y);
    for (const e of m.npcs) assert(adj(e.x, e.y), `${m.id}: NPC at ${e.x},${e.y} unreachable`);
    for (const o of m.objs) assert(adj(o.x, o.y), `${m.id}: object at ${o.x},${o.y} unreachable`);
    for (const w of m.warps) assert(reached[m.id].has(w.x + ',' + w.y), `${m.id}: warp at ${w.x},${w.y} unreachable`);
  }
});
t('story chain exists: starter orbs, three shard holders, tower pedestals, Joker', () => {
  assert.equal(maps.shrine.objs.filter(o => o.orb).length, 3);
  const shards = Object.values(maps).flatMap(m => m.npcs.filter(e => e.trainer && e.trainer.shard).map(e => e.trainer.shard)).sort();
  assert.deepEqual(shards, ['marsh', 'meadow', 'mine']);
  assert.deepEqual(maps.tower.objs.filter(o => o.pedestal).map(o => o.pedestal).sort(), ['marsh', 'meadow', 'mine']);
  assert(maps.hollow.npcs.some(e => e.creature === 25));
  for (const m of Object.values(maps)) for (const e of m.npcs) if (e.trainer) for (const [id, l] of e.trainer.team) assert(G.SPECIES[id] && l >= 1, `${e.trainer.id}: bad team entry`);
});
t('regions are connected back to the hub both ways', () => {
  for (const r of ['sunmeadow', 'mirewood', 'ridge', 'shore']) {
    assert(maps.lanternrest.warps.some(w => w.to === r), `hub has no exit to ${r}`); assert(maps[r].warps.some(w => w.to === 'lanternrest'), `${r} has no way back`);
  }
  assert(maps.ridge.warps.some(w => w.to === 'mine') && maps.mine.warps.some(w => w.to === 'ridge'));
});
console.log(`${n} map tests passed`);
