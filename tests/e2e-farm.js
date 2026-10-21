// Farming, gathering, energy, the day clock and the barn, end to end in headless Chromium: node tests/e2e-farm.js
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert'), fs = require('fs');
const OUT = process.env.OUT || '/tmp';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  const key = async (k, hold = 60) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(80); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/f-${n}.png` });
  const until = async (fn, ms = 15000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const advance = async (cond, ms = 30000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(cond)) return; if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(70); } await shot('timeout'); throw new Error('timeout advancing to ' + (msg || cond)); };
  const idle = () => advance(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 30000, 'world idle');
  const menuOpen = () => until(() => G.ui.layers.length > 0 && !G.ui.text, 5000, 'menu');
  const lastText = () => ev(() => window.__said.slice(-1)[0] || '');
  const step = n => console.log('✓', n);

  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await idle();
  // Fresh state, set up directly. Record everything said so failures can be checked by message.
  await ev(() => {
    window.__said = []; const say = G.say; G.say = (s, o) => { window.__said.push(s); return say(s, o); };
    G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true;
    S.party.push(G.makeCreature(1, 10), G.makeCreature(4, 8)); S.money = 50000;
    G.loadMap('lanternrest'); G.placePlayer(50, 9, 1); G.scene = G.world.scene;
    G.farm.rand = () => .99;            // top of every yield range
  });
  await page.waitForTimeout(300); await idle();
  assert.equal(await ev(() => G.farm.energyMax()), 100);
  assert.equal(await ev(() => G.state.energy), 100);

  // 1) plant -> water -> new days -> harvest, all through A on the plot
  await ev(() => { const S = G.state; S.builds.push({ id: 'p1', type: 'plot', map: 'lanternrest', x: 50, y: 8, lvl: 1, rot: 0 }, { id: 'p2', type: 'plot', map: 'lanternrest', x: 51, y: 8, lvl: 1, rot: 0 });
    G.home.refresh(); S.bag['Turnip Seeds'] = 2; S.bag['Watering Can'] = 1; S.can = 6; });
  await page.waitForTimeout(150);
  assert.equal(await ev(() => G.homePrompt.plot(G.state.builds.find(b => b.id === 'p1'))), 'Plant');
  await key('z'); await menuOpen(); await shot('plot-menu'); await key('z');           // PLANT
  await menuOpen(); await page.waitForTimeout(150); await shot('seed-list'); await key('z');   // Turnip Seeds
  await idle();
  const p1 = () => ev(() => G.state.builds.find(b => b.id === 'p1').crop);
  assert.equal((await p1()).id, 'turnip'); assert.equal(await ev(() => G.state.bag['Turnip Seeds']), 1);
  assert.equal(await ev(() => G.state.energy), 100, 'planting is free');
  const waterIt = async () => { await key('z'); await menuOpen(); await key('z'); await idle(); };
  await waterIt();
  assert((await p1()).wet, 'watered'); assert.equal(await ev(() => G.state.can), 5); assert.equal(await ev(() => G.state.energy), 99, 'watering costs 1');
  await shot('watered');
  for (let d = 0; d < 3; d++) { await ev(() => G.farm.newDay()); if (d < 2) { assert.equal(await ev(() => G.homePrompt.plot(G.state.builds.find(b => b.id === 'p1'))), 'Water'); await waterIt(); } }
  assert((await p1()).ripe, 'ripe after 3 watered days'); assert.equal(await ev(() => G.state.day), 4);
  assert.equal(await ev(() => G.homePrompt.plot(G.state.builds.find(b => b.id === 'p1'))), 'Harvest');
  await page.waitForTimeout(200); await shot('ripe');
  const e0 = await ev(() => G.state.energy);
  await key('z'); await page.waitForTimeout(120); await shot('harvest-pop'); await idle();
  assert.equal(await ev(() => G.state.bag.Turnip), 2, 'yield 2 (top of 1-2)'); assert.equal(await p1(), null);
  assert.equal(await ev(() => G.state.energy), e0 - 1, 'harvest costs 1');
  step('plot: plant, water (can 6 -> 5, -1 energy), 3 new days -> ripe, harvest 2 Turnips (-1 energy)');

  // 2) fertilizer and a Rich Plot add to the harvest; an unwatered crop withers after 3 dry days
  await ev(() => { const b = G.state.builds.find(b => b.id === 'p1'); b.lvl = 2; G.state.bag.Fertilizer = 1; G.state.bag['Turnip Seeds'] = 2; G.farm.plant(b, 'turnip'); G.farm.plant(G.state.builds.find(b => b.id === 'p2'), 'turnip'); });
  await key('z'); await menuOpen(); await key('ArrowDown'); await key('z'); await idle();   // FERTILIZE (second option)
  assert((await p1()).fert, 'fertilized'); assert.equal(await ev(() => G.state.bag.Fertilizer || 0), 0);
  await ev(() => { for (let d = 0; d < 3; d++) { G.state.builds.find(b => b.id === 'p1').crop.wet = true; G.farm.newDay(); } });
  await key('z'); await idle();
  assert.equal(await ev(() => G.state.bag.Turnip), 2 + 4, 'rich plot +1 and fertilizer +1');
  const p2 = await ev(() => G.state.builds.find(b => b.id === 'p2').crop);
  assert(p2.dead && !p2.ripe, 'the unwatered crop withered');
  assert.equal(await ev(() => G.homePrompt.plot(G.state.builds.find(b => b.id === 'p2'))), 'Clear');
  await ev(() => G.placePlayer(51, 9, 1)); await page.waitForTimeout(250); await shot('withered');
  const bag0 = await ev(() => JSON.stringify(G.state.bag));
  await key('z'); await menuOpen(); await key('z'); await idle();
  assert.equal(await ev(() => G.state.builds.find(b => b.id === 'p2').crop), null); assert.equal(await ev(() => JSON.stringify(G.state.bag)), bag0, 'clearing gives nothing back');
  step('fertilizer + Rich Plot give +2 (4 Turnips); a crop left dry 3 days withers, and clearing it gives nothing');

  // 3) sprinklers water every morning, the greenhouse doubles growth, glowcaps never need water
  await ev(() => { const S = G.state; S.builds.push({ id: 's1', type: 'sprinkler', map: 'lanternrest', x: 53, y: 8, lvl: 1, rot: 0 }, { id: 'p3', type: 'plot', map: 'lanternrest', x: 54, y: 8, lvl: 1, rot: 0 }, { id: 'p4', type: 'plot', map: 'lanternrest', x: 55, y: 5, lvl: 1, rot: 0 });
    S.bag['Carrot Seeds'] = 1; S.bag['Glowcap Spores'] = 1; G.farm.plant(S.builds.find(b => b.id === 'p3'), 'carrot'); G.farm.plant(S.builds.find(b => b.id === 'p4'), 'glowcap'); G.home.refresh();
    for (let d = 0; d < 4; d++) G.farm.newDay(); });
  assert(await ev(() => G.state.builds.find(b => b.id === 'p3').crop.ripe), 'sprinkled carrot ripe after 4 days with no can');
  assert(await ev(() => G.state.builds.find(b => b.id === 'p4').crop.ripe), 'glowcap ripe with no water');
  await ev(() => { const S = G.state; S.builds.push({ id: 'g1', type: 'greenhouse', map: 'lanternrest', x: 47, y: 10, lvl: 1, rot: 0 }); const b = S.builds.find(b => b.id === 'p2'); S.bag['Turnip Seeds'] = 1; G.farm.plant(b, 'turnip'); b.crop.wet = true; G.farm.newDay(); });
  assert.equal(await ev(() => G.state.builds.find(b => b.id === 'p2').crop.grown), 2, 'greenhouse: 2 days of growth in one');
  step('sprinkler waters its neighbours each morning, glowcaps need no water, the greenhouse doubles growth');

  // 4) the day clock and sleeping
  const day0 = await ev(() => G.state.day);
  await ev(() => { G.state.clock = G.farm.DAY_FRAMES - 3; });
  await until(() => G.state.clock < 100, 3000, 'day rollover');
  assert.equal(await ev(() => G.state.day), day0 + 1, 'the clock rolls over to a new day');
  await ev(() => { G.state.energy = 10; G.state.party[0].hp = 1; G.runWorld(() => G.homeFurn.bed()); });
  await until(() => G.ui.layers.length > 0, 3000, 'yes/no'); await key('z');   // YES
  await idle();
  assert.equal(await ev(() => G.state.day), day0 + 2, 'sleeping starts the next day');
  assert.equal(await ev(() => G.state.energy), 100); assert(await ev(() => G.state.party[0].hp === G.state.party[0].stats.hp), 'team healed');
  step(`day clock rolls over after DAY_FRAMES; sleeping -> Day ${day0 + 2}, full energy, team healed`);

  // 5) gathering: wood from a tree, regrowth after 150 steps, the Axe, the prompt chip
  const faceTile = (chs, mapId) => ev(([chs, mapId]) => {
    if (mapId && G.world.mapId !== mapId) G.loadMap(mapId);
    const m = G.world.map, W = G.worldApi; m._spawn = false; m.roamers = [];
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      if (!chs.includes(m.t[y][x]) || G.gather.decorative(m.id, x, y, m.t[y][x]) || W.objAt(x, y)) continue;
      for (const [dx, dy, dir] of [[0, 1, 1], [0, -1, 0], [1, 0, 2], [-1, 0, 3]]) { const px = x + dx, py = y + dy;
        if (W.canWalk(px, py) && !W.tileWarp(px, py) && !W.objAt(px, py) && !(G.state.gather[m.id + ':' + x + ',' + y] !== undefined)) { G.placePlayer(px, py, dir); (m.roamers || []).forEach(r => { r.timer = 1e9; }); return [x, y]; } }
    }
    return null;
  }, [chs, mapId]);
  await ev(() => { G.state.energy = 100; G.state.steps = 1000; });
  const tree = await faceTile('#n', 'lanternrest'); assert(tree, 'found a tree'); await page.waitForTimeout(200);
  assert.equal(await ev(() => { const [x, y] = G.worldApi.facing(); for (const h of G.hooks.prompt) { const s = h(x, y); if (s) return s; } }), 'Chop tree');
  await shot('tree-prompt');
  await key('z'); await page.waitForTimeout(100); await shot('gather-pop'); await idle();
  assert.equal(await ev(() => G.state.bag.Wood), 1, '1 Wood by hand'); assert.equal(await ev(() => G.state.energy), 98, 'gathering costs 2');
  await key('z'); await advance(() => !G.world.busy, 5000);
  assert(/picked clean/.test(await lastText()), 'tree is regrowing'); assert.equal(await ev(() => G.state.bag.Wood), 1);
  await idle();
  await ev(() => { G.state.steps += 149; }); await key('z'); await idle();
  assert.equal(await ev(() => G.state.bag.Wood), 1, 'still regrowing at 149 steps');
  await ev(() => { G.state.steps += 1; G.state.bag.Axe = 1; }); await key('z'); await idle();
  assert.equal(await ev(() => G.state.bag.Wood), 4, 'regrown after 150 steps; Axe gives 3');
  step('tree: 1 Wood (-2 energy), "picked clean" until 150 steps have passed, then 3 Wood with an Axe');

  // 6) energy runs out: gathering is blocked with the message; eating restores it
  await ev(() => { G.state.energy = 1; G.state.steps += 200; });
  await key('z'); await advance(() => !G.world.busy, 5000);
  assert.equal(await lastText(), "You're too tired. Eat something or get some sleep."); assert.equal(await ev(() => G.state.bag.Wood), 4);
  await idle();
  await ev(() => G.runWorld(() => G.farm.eat('Turnip'))); await idle();
  assert.equal(await ev(() => G.state.energy), 7, 'a Turnip restores 6'); assert.equal(await ev(() => G.state.bag.Turnip), 5);
  await ev(() => { G.state.bag.Wheat = 1; G.runWorld(() => G.farm.eat('Wheat')); }); await idle();
  assert.equal(await ev(() => G.state.bag.Wheat), 1, 'wheat is not edible');
  await key('z'); await idle();
  assert.equal(await ev(() => G.state.bag.Wood), 7); assert.equal(await ev(() => G.state.energy), 5);
  step('at 1 energy gathering is refused with the exact message; eating a Turnip (+6) lets you gather again; Wheat is not edible');

  // 7) bushes: Fiber plus that map's seeds; decorative beds give nothing
  await ev(() => { G.gather.rand = () => .1; G.state.energy = 100; });
  assert(await faceTile('u', 'sunmeadow'), 'sunmeadow bush'); await page.waitForTimeout(100);
  await key('z'); await idle();
  assert.equal(await ev(() => G.state.bag.Fiber), 1); assert.equal(await ev(() => G.state.bag['Turnip Seeds']), 1, 'sunmeadow bush: turnip seeds at 10% < 25%');
  await ev(() => { G.loadMap('lanternrest'); G.placePlayer(14, 14, 1); }); assert.equal(await ev(() => G.worldApi.tileAt(14, 13)), 'j', 'village crop bed');
  await key('z'); await advance(() => !G.world.busy, 5000); assert(/leave them be/.test(await lastText())); await idle();
  assert.equal(await ev(() => G.state.energy), 98, 'decorative beds: nothing, no energy');
  step('sunmeadow bush gives Fiber + Turnip Seeds; village crop beds give nothing');

  // 8) boulders and crystals: Stone vs ore, with and without a Pickaxe, on the ridge and in the mine
  await ev(() => { delete G.state.bag.Pickaxe; G.gather.rand = () => .1; });
  assert(await faceTile('r', 'ridge'), 'ridge boulder'); await key('z'); await idle();
  assert.deepEqual(await ev(() => [G.state.bag.Stone, G.state.bag['Copper Ore'] || 0, G.state.bag['Iron Ore'] || 0]), [2, 0, 0], 'no pickaxe: stone only');
  await ev(() => { G.state.bag.Pickaxe = 1; });
  assert(await faceTile('r', 'ridge')); await key('z'); await idle();
  assert.deepEqual(await ev(() => [G.state.bag.Stone, G.state.bag['Copper Ore'], G.state.bag['Iron Ore']]), [4, 1, 1], 'pickaxe on the ridge: copper 40% and iron 15%');
  await ev(() => { G.gather.rand = () => .3; });
  assert(await faceTile('r', 'ridge')); await key('z'); await idle();
  assert.deepEqual(await ev(() => [G.state.bag['Copper Ore'], G.state.bag['Iron Ore']]), [2, 1], 'roll .3: copper but no iron');
  // the mine has no boulders yet: put one on the floor next to the entrance for the test
  await ev(() => { G.loadMap('mine'); const m = G.world.map; m.t[46][16] = 'r'; G.placePlayer(17, 46, 2); m._spawn = false; m.roamers = []; delete G.state.bag.Pickaxe; G.gather.rand = () => .1; });
  await page.waitForTimeout(150); await key('z'); await idle();
  assert.deepEqual(await ev(() => [G.state.bag['Iron Ore'], G.state.bag.Coal || 0]), [1, 0], 'mine without pickaxe: no ore');
  await ev(() => { G.state.bag.Pickaxe = 1; G.state.steps += 200; }); await key('z'); await idle();
  assert.deepEqual(await ev(() => [G.state.bag['Iron Ore'], G.state.bag.Coal]), [2, 1], 'mine with pickaxe: iron 50% + coal 40%');
  await ev(() => { delete G.state.bag.Pickaxe; });
  assert(await faceTile('i', 'mine')); const en = await ev(() => G.state.energy);
  await key('z'); await advance(() => !G.world.busy, 5000); assert(/Pickaxe/.test(await lastText()));
  await idle(); assert.equal(await ev(() => G.state.energy), en, 'no energy spent'); assert.equal(await ev(() => G.state.bag['Crystal Shard'] || 0), 0);
  await ev(() => { G.state.bag.Pickaxe = 1; }); await key('z'); await idle();
  assert.equal(await ev(() => G.state.bag['Crystal Shard']), 1);
  step('boulders: 2 Stone by hand; Pickaxe adds Copper/Iron on the ridge and Iron/Coal in the mine; crystals need a Pickaxe');

  // 9) water refills the can
  await ev(() => { G.state.can = 0; }); assert(await faceTile('w', 'lanternrest'));
  assert.equal(await ev(() => { const [x, y] = G.worldApi.facing(); return G.hooks.prompt.map(h => h(x, y)).find(Boolean); }), 'Refill can');
  await key('z'); await idle(); assert.equal(await ev(() => G.state.can), 6);
  step('facing water refills the watering can (6 splashes)');

  // 10) the barn: move a creature in (never the last healthy one), produce after a day, collect, feed, take back
  await ev(() => { G.loadMap('lanternrest'); const S = G.state; S.builds.push({ id: 'barn1', type: 'barn', map: 'lanternrest', x: 47, y: 3, lvl: 2, rot: 0 }); G.home.refresh(); G.placePlayer(48, 6, 1); });
  await page.waitForTimeout(200);
  const kind = await ev(() => G.SPECIES[G.state.party[1].id].types[0]);
  await key('z'); await menuOpen(); await key('z');                       // BARN (use label)
  await menuOpen(); await page.waitForTimeout(150); await shot('barn-empty'); await key('z');   // MOVE A CREATURE IN
  await menuOpen(); await key('z');                                     // FROM YOUR PARTY
  await menuOpen(); await key('ArrowRight'); await key('z');            // second creature
  await advance(() => G.ui.layers.length > 0 && !G.ui.text, 8000, 'back in barn list');
  assert.equal(await ev(() => G.state.builds.find(b => b.id === 'barn1').animals.length), 1); assert.equal(await ev(() => G.state.party.length), 1);
  await key('z'); await menuOpen(); await key('z'); await menuOpen(); await key('z');   // try to move the last one in
  await advance(() => window.__said.some(s => /at least one other healthy/.test(s)), 8000);
  await advance(() => G.ui.layers.length > 0 && !G.ui.text, 8000);
  assert.equal(await ev(() => G.state.party.length), 1, 'the last healthy creature stays');
  assert(await ev(() => /still live/.test(G.homeBlockRemove.barn(G.state.builds.find(b => b.id === 'barn1')))), 'removal blocked');
  await key('x'); await idle();
  await ev(() => { G.state.bag.Fertilizer = 1; G.runWorld(() => G.homeUse.barn(G.state.builds.find(b => b.id === 'barn1'))); });
  await menuOpen(); await key('ArrowDown'); await key('z');              // FEED FERTILIZER (row 2: nothing to collect yet)
  await advance(() => G.ui.layers.length > 0 && !G.ui.text, 8000); await key('x'); await idle();
  assert.equal(await ev(() => G.state.bag.Fertilizer || 0), 0);
  await ev(() => G.farm.newDay());
  const store = await ev(() => G.state.builds.find(b => b.id === 'barn1').store);
  assert.equal(Object.values(store).reduce((a, n) => a + n, 0), 2, 'Big Barn: 1 a day + 1 for feeding');
  await ev(() => G.runWorld(() => G.homeUse.barn(G.state.builds.find(b => b.id === 'barn1')))); await menuOpen(); await page.waitForTimeout(150); await shot('barn-produce');
  const before = await ev(s => Object.keys(s).map(k => G.state.bag[k] || 0), store);
  await key('z'); await advance(() => G.ui.layers.length > 0 && !G.ui.text, 8000);   // COLLECT
  const after = await ev(s => Object.keys(s).map(k => G.state.bag[k] || 0), store);
  assert.deepEqual(after, before.map((n, i) => n + Object.values(store)[i]), 'produce collected into the bag');
  await key('ArrowUp'); await key('z'); await advance(() => G.ui.layers.length > 0 && !G.ui.text, 8000);   // the creature is the last row
  await key('x'); await idle();
  assert.equal(await ev(() => G.state.party.length), 2, 'taken back'); assert.equal(await ev(() => G.homeBlockRemove.barn(G.state.builds.find(b => b.id === 'barn1'))), null);
  step(`barn: ${kind}-type moved in from the party (last healthy creature refused), fed Fertilizer, made ${JSON.stringify(store)} after a day, collected, taken back`);

  // 11) the HUD on the homestead
  await ev(() => { G.loadMap('homestead'); const h = G.state.builds.find(b => b.type === 'house'); G.placePlayer(h.x + 1, h.y + 4, 0); G.state.energy = 64; });
  await page.waitForTimeout(500); await shot('homestead-hud');
  step('HUD: Day and energy shown on the homestead');

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.stack || e.message); process.exit(1); });
