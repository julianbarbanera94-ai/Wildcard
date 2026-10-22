// Run with: node tests/home-maps.test.js — homestead and town checks the core map test can't see: furniture props
// blocking the way, the house at every level on the homestead, the thicket outside deed 1, and shop wiring.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
globalThis.addEventListener = () => {};
const packs = fs.readdirSync(path.join(__dirname, '../js/species')).sort().map(f => 'species/' + f.replace('.js', ''));
const files = ['data', 'economy', ...packs, 'creature', 'gfx', 'terrain', 'mapkit', ...fs.readdirSync(path.join(__dirname, '../js/maps')).sort().map(f => 'maps/' + f.replace('.js', '')), 'world', 'structures', 'shops'];
for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js', f + '.js'), 'utf8'), { filename: f });
const G = globalThis.G, maps = G.MAPS, VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]];
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };
const solidT = c => !c || !G.TILES[c] || G.TILES[c].solid;
const propCells = m => { const s = new Set(); for (const p of m.props || []) if (!p.flat) for (let j = 0; j < (p.h || 1); j++) for (let i = 0; i < (p.w || 1); i++) s.add((p.x + i) + ',' + (p.y + j)); return s; };
// BFS on one map from a start tile. blocked(x, y) -> true for cells you can't stand on.
function reach(m, sx, sy, blocked) {
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of VEC) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen.has(k) || blocked(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
  return seen;
}
const near = (R, x, y) => R.has(x + ',' + y) || VEC.some(([dx, dy]) => R.has((x + dx) + ',' + (y + dy)));

t('furniture props sit inside the room on floor (paintings on the top wall), never overlap, and each has an object', () => {
  for (const m of Object.values(maps)) {
    if (!m.props) continue;
    const seen = new Set();
    for (const p of m.props) {
      for (let j = 0; j < (p.h || 1); j++) for (let i = 0; i < (p.w || 1); i++) {
        const x = p.x + i, y = p.y + j, c = m.t[y] && m.t[y][x];
        assert(c, `${m.id}: ${p.kind} at ${x},${y} is off the map`);
        if (p.kind === 'painting') assert.equal(c, 'B', `${m.id}: painting at ${x},${y} should hang on a wall`);
        else assert(!solidT(c), `${m.id}: ${p.kind} at ${x},${y} stands on solid '${c}'`);
        if (p.flat) continue;
        assert(!seen.has(x + ',' + y), `${m.id}: two props at ${x},${y}`); seen.add(x + ',' + y);
        if (m.id !== 'homestead' || p.kind !== 'mailbox') assert(m.objs.some(o => o.x === x && o.y === y), `${m.id}: ${p.kind} at ${x},${y} has no object`);
        assert(!m.warps.some(w => w.x === x && w.y === y && !w._b), `${m.id}: prop on a warp at ${x},${y}`);
        assert(!m.npcs.some(e => e.x === x && e.y === y), `${m.id}: prop under an NPC at ${x},${y}`);
      }
    }
  }
});
t('house interiors: every piece of furniture, the exit and every room are reachable with props in the way', () => {
  for (const id of ['home1', 'home2', 'home3', 'home4']) {
    const m = maps[id], P = propCells(m), ex = m.warps.find(w => w.to === 'homestead');
    assert(ex, `${id}: no exit to the homestead`); assert.equal(m.t[ex.y][ex.x], 'm');
    const sx = ex.x, sy = ex.y - 1;   // the lead's interiorEntry: the tile above the exit mat
    assert(!solidT(m.t[sy][sx]) && !P.has(sx + ',' + sy), `${id}: arrival tile ${sx},${sy} is blocked`);
    const R = reach(m, sx, sy, (x, y) => solidT(m.t[y][x]) || P.has(x + ',' + y) || m.npcs.some(e => e.x === x && e.y === y));
    const groups = new Map(); for (const o of m.objs) { const g = groups.get(o.fn) || []; g.push(o); groups.set(o.fn, g); }   // a multi-tile piece shares one fn
    for (const g of groups.values()) assert(g.some(o => near(R, o.x, o.y)), `${id}: ${g[0].furn || 'object'} at ${g[0].x},${g[0].y} can't be reached`);
    for (const r of m.rooms || []) { let ok = false; for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) if (R.has((r.x + i) + ',' + (r.y + j))) ok = true; assert(ok, `${id}: room ${r.name} can't be entered`); }
    const v = G.TILES.v ? 'v' : 'T'; assert(m.t.some(r => r.includes(v)) || id === 'home1', `${id}: no tiled kitchen/bath floor`);
  }
  // rooms grow with the house level, matching the perks in js/structures.js
  const lv = G.STRUCTURES.house.levels;
  lv.forEach((l, i) => { const m = maps[l.perks.interior]; assert(m, 'interior ' + l.perks.interior); assert(m.rooms.length >= l.perks.rooms.length, `${m.id}: ${m.rooms.length} rooms < ${l.perks.rooms.length}`); if (i) assert(m.w * m.h > maps[lv[i - 1].perks.interior].w * maps[lv[i - 1].perks.interior].h, `${m.id} is not bigger`); });
  const kinds = l => new Set(maps[l].props.map(p => p.kind));
  assert(kinds('home1').has('bed') && !kinds('home1').has('stove'));
  for (const k of ['stove', 'fridge', 'sink', 'toilet', 'shower']) assert(kinds('home2').has(k), 'home2 has ' + k);
  for (const k of ['sofa', 'tv']) assert(kinds('home3').has(k), 'home3 has ' + k);
  for (const k of ['bath', 'trophy', 'petbed']) assert(kinds('home4').has(k), 'home4 has ' + k);
});
t('homestead: map basics, a clear 7x5 house spot, nested deeds and a walkable landing', () => {
  const m = maps.homestead, H = m.homeSpot;
  assert.equal(m.name, 'YOUR HOMESTEAD'); assert(!m.enc); assert.equal(m.music, 'town'); assert(m.w >= 50 && m.h >= 40);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) {
    const x = H.x + i, y = H.y + j; assert('gfy'.includes(m.t[y][x]), `house spot ${x},${y} is '${m.t[y][x]}'`);
    assert(!m.objs.some(o => o.x === x && o.y === y) && !m.npcs.some(e => Math.abs(e.x - x) + Math.abs(e.y - y) <= (e.roam || 0)) && !propCells(m).has(x + ',' + y), `house spot ${x},${y} is occupied`);
  }
  const [z1, z2, z3, z4, z5] = [1, 2, 3, 4, 5].map(d => m.zones.find(z => z.deed === d));
  const inside = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
  assert(inside(z1, z2) && inside(z2, z3) && inside(z3, z4) && inside(z4, z5), 'deeds nest'); assert(inside({ x: H.x, y: H.y, w: 7, h: 6 }, z1), 'house spot inside deed 1');
  assert(z1.w * z1.h >= 250 && z1.w * z1.h < 400 && z5.w * z5.h > z4.w * z4.h && z4.w * z4.h > z3.w * z3.h && z3.w * z3.h > z2.w * z2.h && z2.w * z2.h > z1.w * z1.h, 'five parcels, the first one small');
  assert(!solidT(m.t[m.landing.y][m.landing.x]), 'landing walkable');
  assert(m.objs.some(o => o.prompt === 'Land Office') && m.objs.some(o => o.prompt === 'Mailbox') && m.npcs.length >= 1);
  assert(m.warps.some(w => w.to === 'lanternrest' && !w._b) && maps.lanternrest.warps.some(w => w.to === 'homestead' && w.need));
  assert(!m.t.some(r => r.includes('X')), 'no thicket in the raw map');
});
t('homestead at deed 1 with the house at every level: thicket applied, everything still reachable from the road', () => {
  const m = maps.homestead, H = m.homeSpot, arrive = maps.lanternrest.warps.find(w => w.to === 'homestead');
  for (let deed = 1; deed <= 5; deed++) for (const [li, l] of G.STRUCTURES.house.levels.entries()) {
    const own = m.zones.filter(z => z.deed <= deed), owned = (x, y) => own.some(z => x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h);
    const tile = (x, y) => { const c = m.t[y][x]; return !owned(x, y) && 'gGfy'.includes(c) && !m.warps.some(w => w.x === x && w.y === y && !w._b) ? 'X' : c; };
    const door = [H.x + l.door[0], H.y + l.door[1]], foot = new Set(); for (let j = 0; j < l.h; j++) for (let i = 0; i < l.w; i++) foot.add((H.x + i) + ',' + (H.y + j));
    const P = propCells(m);
    const R = reach(m, arrive.tx, arrive.ty, (x, y) => solidT(tile(x, y)) || P.has(x + ',' + y) || (foot.has(x + ',' + y) && !(x === door[0] && y === door[1])) || m.npcs.some(e => e.x === x && e.y === y));
    const tag = `deed ${deed}, house Lv${li + 1}`;
    assert(R.has(door[0] + ',' + (door[1] + 1)), `${tag}: no open ground in front of the door`);
    assert(R.has(door.join(',')), `${tag}: the door can't be walked into`);
    for (const o of m.objs) assert(near(R, o.x, o.y), `${tag}: object at ${o.x},${o.y} unreachable`);
    for (const e of m.npcs) assert(near(R, e.x, e.y), `${tag}: NPC at ${e.x},${e.y} unreachable`);
    for (const w of m.warps.filter(w => !w._b)) assert(R.has(w.x + ',' + w.y), `${tag}: exit ${w.x},${w.y} unreachable`);
    assert(R.has(m.landing.x + ',' + m.landing.y), `${tag}: landing unreachable`);
    const water = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.t[y][x] === 'w' && near(R, x, y)) water.push(x);
    assert(water.length, `${tag}: no water to refill a watering can`);
    const gather = new Set(); for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if ('#nudr'.includes(m.t[y][x]) && near(R, x, y) && owned(x, y)) gather.add(m.t[y][x]);
    assert(['#', 'u', 'd', 'r'].every(c => gather.has(c)), `${tag}: something to gather of every kind (${[...gather]})`);
    let open = 0; R.forEach(k => { const [x, y] = k.split(',').map(Number); if (m.t[y][x] === 'g' && owned(x, y) && !foot.has(k)) open++; });
    assert(open >= 60 + 90 * (deed - 1), `${tag}: only ${open} open grass tiles to build on`);
  }
});
t('every shop counter and healing post points at a real shop, every shop has stock, a name plate marks it', () => {
  const used = new Set();
  for (const m of Object.values(maps)) for (const o of m.objs) { const s = String(o.fn); const r = /openShop\('(\w+)'\)/.exec(s); if (r) used.add(r[1]); }
  for (const id of ['general', 'builder', 'seeds', 'apothecary', 'forge', 'motors', 'market']) {
    const s = G.SHOPS[id]; assert(s && s.name && s.greet && s.stock.length, 'shop ' + id);
    for (const e of s.stock) assert(e.vehicle || G.ITEMS[e.item], `${id}: unknown item ${e.item}`);
    if (id !== 'general') assert(used.has(id), `no counter opens ${id}`);
  }
  assert(G.SHOPS.motors.special === 'vehicles');
  const plate = (map, re) => assert((maps[map].labels || []).some(l => re.test(l.text)), `${map}: no plate ${re}`);
  plate('lanternrest', /WARDEN LODGE/); plate('lanternrest', /GENERAL STORE/); plate('lanternrest', /BUILDER/); plate('lanternrest', /SHRINE/);
  plate('sunmeadow', /MEADOWBROOK/); plate('mirewood', /BOGROOT/); plate('ridge', /FORGE/); plate('ridge', /HEALING/); plate('shore', /MOTORS/); plate('shore', /MARKET/); plate('shore', /HEALING/);
  assert(maps.lanternrest.labels.find(l => /LODGE/.test(l.text)).style === 'heal');
  const heal = Object.values(maps).filter(m => m.objs.some(o => /healUI/.test(String(o.fn)))).map(m => m.id).sort();
  assert.deepEqual(heal, ['ridgeheal', 'shoreheal']);
  assert(maps.ridge.objs.some(o => o.prompt === 'Old quad bike' && o.hide && o.ball === false));
  assert(maps.lanternrest.npcs.some(e => /courier/.test(String(e.talk))));
});
console.log(`${n} homestead/town map tests passed`);
