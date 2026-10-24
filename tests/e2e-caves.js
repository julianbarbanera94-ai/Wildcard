// The Stage B caves (docs/CAVES.md), end to end in headless Chromium: node tests/e2e-caves.js
// Walks into Glimmer Mine and the four new caves through their overworld mouths and back out, plays each cave's puzzle with
// the keyboard (Frostmere's ice switch, the Hollow Ruins' rune stones, the Living Grotto's spores and shrine), checks the
// puzzle tiles follow the save, and that the hidden LIGHT nooks are in place. Screenshots of every cave go to OUT.
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const hold = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); await page.waitForTimeout(60); };
  const key = (k, ms = 70) => hold(k, ms);
  const step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/caves-${n}.png` });
  const until = async (fn, ms, msg, arg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn, arg)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout: ' + msg); };
  const settle = () => until(() => !G.world.busy && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 8000, 'idle');
  // press A on what is in front, then A through the text until the world is free again
  const talk = async () => { await key('z', 120); for (let i = 0; i < 60 && await ev(() => G.world.busy || !!G.ui.text || G.ui.layers.length); i++) await key('z', 90); await settle(); };
  const walk = async (k, cond, msg, arg) => { await page.keyboard.down(k); try { await until(cond, 8000, msg, arg); } finally { await page.keyboard.up(k); } await page.waitForTimeout(120); };
  const at = (map, x, y, dir) => ev(([map, x, y, dir]) => { G.loadMap(map); G.placePlayer(x, y, dir); const m = G.world.map; m.roamers = []; m._spawn = false; G.scene = G.world.scene; G.world.busy = false; G.world.banner = null; }, [map, x, y, dir]);
  const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;

  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  const fresh = () => ev(() => {
    G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.length = 0; S.party.push(G.makeCreature(1, 60));
    for (const k of ['mn_kade', 'mn_rhea', 'mn_flint', 'ce_brand', 'cf_skye', 'cr_vale', 'cl_moss']) S.flags[k] = true;   // trainers beaten: the walks are not interrupted
    S.energy = 999; G.scene = G.world.scene;
  });
  await fresh();

  // 1) every cave is entered on foot from its mouth, arrives on the entrance tunnel, and walks back out to the same spot
  const caves = await ev(() => ['mine'].concat(G.CAVES_STAGE_B).map(id => {
    const into = []; for (const m of Object.values(G.MAPS)) for (const w of m.warps) if (w.to === id) into.push({ map: m.id, x: w.x, y: w.y, tx: w.tx, ty: w.ty });
    const c = G.MAPS[id]; return { id, name: c.name, size: c.w + 'x' + c.h, into, out: c.warps.map(w => ({ x: w.x, y: w.y, to: w.to, tx: w.tx, ty: w.ty })) };
  }));
  for (const c of caves) {
    assert(c.into.length >= 1, c.id + ' has no entrance'); assert.equal(c.size, '40x32', c.id + ' size');
    const d = c.into[0], back = c.out[0];
    assert(c.out.every(w => w.to === d.map), c.id + ' exits lead back to ' + d.map);
    await at(d.map, d.x, d.y + 1, UP); await settle();
    await walk('ArrowUp', id => G.world.mapId === id, 'enter ' + c.id, c.id);
    await settle();
    const p = await ev(() => [G.world.p.x, G.world.p.y]);
    assert(p[1] === 30 && (p[0] === 19 || p[0] === 20), `${c.id}: arrived on the entrance tunnel, at ${p}`);
    await shot(c.id);
    await walk('ArrowDown', m => G.world.mapId === m, 'leave ' + c.id, d.map);
    await settle();
    const q = await ev(() => [G.world.p.x, G.world.p.y]);
    assert.deepEqual(q, [back.tx, back.ty], `${c.id}: back out at the mouth`);
  }
  step('Glimmer Mine and the four new caves (' + caves.slice(1).map(c => c.name).join(', ') + ') are entered on foot and left again');

  // 2) the retired mouth rooms are kept (a save made inside one still loads and walks out), but nothing leads into them
  const retired = await ev(() => Object.values(G.MAPS).filter(m => m.retired).map(m => ({ id: m.id, into: Object.values(G.MAPS).some(o => o.warps.some(w => w.to === m.id)), out: m.warps.length })));
  assert(retired.length === 3 && retired.every(r => !r.into && r.out > 0), 'retired rooms: ' + JSON.stringify(retired));
  step('the three small rooms the caves replaced are kept for old saves and no longer entered');

  // 3) Frostmere Grotto: the islands are cut off until the ice switch raises the walkways; they stay up after a reload
  await at('cave_frostmere', 13, 20, LEFT);
  assert.equal(await ev(() => G.world.map.t[20][12]), 'w', 'walkway down before the switch');
  await walk('ArrowLeft', () => G.world.p.x <= 13 && !G.world.p.moving, 'blocked by the lake');
  assert.equal(await ev(() => G.world.p.x), 13, 'the lake stops you');
  await at('cave_frostmere', 20, 18, UP); await talk();
  assert(await ev(() => G.state.flags.cf_switch && G.world.map.t[20][12] === '3' && G.world.map.t[20][28] === '3'), 'the switch raises both walkways');
  await shot('frost-switch');
  await at('cave_frostmere', 13, 20, LEFT);
  await walk('ArrowLeft', () => G.world.p.x === 6, 'cross the west walkway');
  await talk(); assert.equal(await ev(() => G.state.bag['Frost Orb']), 3, 'the frost relic on the west island');
  await ev(() => { G.loadMap('glacier'); G.loadMap('cave_frostmere'); });
  assert.equal(await ev(() => G.world.map.t[20][12]), '3', 'still up after leaving and coming back');
  step('Frostmere Grotto: the ice switch raises walkways across both lakes to the islands, and they stay up');

  // 4) The Hollow Ruins: a wrong order resets the stones; east, west, south opens the gate to the altar
  const touch = async (x, y, dir) => { await at('cave_hollow_ruins', x, y, dir); await talk(); };
  const E = [30, 16, RIGHT], W = [9, 16, LEFT], Sth = [24, 23, DOWN];
  await at('cave_hollow_ruins', 20, 11, UP);
  await walk('ArrowUp', () => !G.world.p.moving, 'blocked by the gate'); assert.equal(await ev(() => G.world.p.y), 11, 'the rune gate is shut');
  await touch(...E); await touch(...Sth);
  assert(await ev(() => !G.state.flags.cr_gate && G.world.map.t[10][20] === '9'), 'east then south is wrong: still shut');
  await touch(...E); await touch(...W);
  assert(await ev(() => !G.state.flags.cr_gate), 'two of three: still shut');
  await touch(...Sth);
  assert(await ev(() => G.state.flags.cr_gate && G.world.map.t[10][20] === 'c'), 'east, west, south opens the gate');
  await at('cave_hollow_ruins', 20, 11, UP);
  await walk('ArrowUp', () => G.world.p.y === 8, 'walk through the gate to the altar');
  await shot('ruins-altar');
  await talk();
  assert.deepEqual(await ev(() => [G.state.bag['Void Orb'], G.state.flags.cr_altar]), [3, true], 'the altar reward');
  step('The Hollow Ruins: the rune stones reset on a wrong order, east-west-south opens the gate, the altar gives its reward');

  // 5) The Living Grotto: a glowing mushroom bed gives Glowcap Spores; 3 at the shrine call down Starveil (battle stubbed)
  const bed = await ev(() => {
    const m = G.MAPS.cave_living_grotto, V = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (m.t[y][x] === '8')
      for (let d = 0; d < 4; d++) { const sx = x - V[d][0], sy = y - V[d][1], c = m.t[sy][sx]; if ((c === 'c' || c === 'e') && !m.npcs.some(n => n.x === sx && n.y === sy) && !m.objs.some(o => o.x === sx && o.y === sy)) return [sx, sy, d]; }
    return null;
  });
  assert(bed, 'a mushroom bed you can stand next to');
  await at('cave_living_grotto', ...bed); await talk();
  const spores = await ev(() => G.state.bag['Glowcap Spores'] || 0);
  assert(spores >= 1, 'gathering the mushrooms gives spores, got ' + spores);
  await at('cave_living_grotto', 20, 7, UP); await talk();
  assert(await ev(() => !G.state.flags.cl_offered), 'not enough spores yet: nothing happens');
  await ev(() => { G.state.bag['Glowcap Spores'] = 3; window.__wild = null; G.__sb = G.storyBattle; G.storyBattle = async o => { window.__wild = o.wild.id; return 'run'; }; });
  await at('cave_living_grotto', 20, 7, UP); await talk();
  assert.deepEqual(await ev(() => [window.__wild, G.state.flags.cl_offered, !!G.state.flags.cl_shrine, G.state.bag['Glowcap Spores'] || 0]), [156, true, false, 0], 'offer 3 spores: Starveil appears; fleeing leaves it for later');
  await ev(() => { G.storyBattle = async o => { window.__wild = o.wild.id; return 'win'; }; window.__wild = null; });
  await talk();
  assert.deepEqual(await ev(() => [window.__wild, G.state.flags.cl_shrine]), [156, true], 'it comes down again without more spores; a win settles it');
  await ev(() => { G.storyBattle = G.__sb; });
  await shot('grotto-shrine');
  step('The Living Grotto: mushroom beds give Glowcap Spores; 3 at the shrine bring Starveil down, and it comes back if you run');

  // 6) hidden LIGHT nooks behind the Ruins' east wall and the Grotto's rootway; Emberfall's ore face gives iron and coal
  const nooks = await ev(() => ['cr_sanctum', 'cl_rootway'].map(id => { const s = G.FIELD_SPOTS.find(s => s.id === id); G.loadMap(s.map); return [id, s.kind, G.world.map.block.has(s.b.join(',')), G.world.map.t[s.c[1]][s.c[0]]]; }));
  for (const [id, kind, blocked, floor] of nooks) assert(kind === 'light' && blocked && floor !== 'C', id + ': ' + [kind, blocked, floor]);
  await ev(() => { G.state.bag.Pickaxe = 1; G.gather.rand = () => .1; });
  const ore = await ev(() => { const m = G.MAPS.cave_emberfall; for (let y = 1; y < m.h - 1; y++) for (let x = 2; x < m.w - 1; x++) if (m.t[y][x] === 'r' && (m.t[y][x - 1] === 'c' || m.t[y][x - 1] === 'e')) return [x - 1, y, 3]; return null; });
  await at('cave_emberfall', ...ore); await talk();
  assert(await ev(() => G.state.bag['Iron Ore'] >= 1 && G.state.bag.Coal >= 1), 'the Emberfall ore face gives Iron Ore and Coal with a Pickaxe');
  step('LIGHT nooks hide the Ruins sanctum and the Grotto rootway; the Emberfall boulders give Iron Ore and Coal');

  // 7) a new game starts with the puzzles closed again
  await fresh(); await ev(() => { G.loadMap('cave_frostmere'); G.loadMap('cave_hollow_ruins'); });
  assert.deepEqual(await ev(() => [G.MAPS.cave_frostmere.t[20][12], G.MAPS.cave_hollow_ruins.t[10][20]]), ['w', '9'], 'puzzles reset for a new game');
  step('a new game starts with the walkways down and the rune gate shut');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('errors: none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
