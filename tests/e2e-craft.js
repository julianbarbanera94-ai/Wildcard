// Refinery, forge, kitchen, storage, treats and house furniture, end to end in headless Chromium: node tests/e2e-craft.js
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
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/k-${n}.png` });
  const until = async (fn, ms = 15000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const advance = async (cond, ms = 30000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(cond)) return; if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(70); } await shot('timeout'); throw new Error('timeout advancing to ' + (msg || cond)); };
  const idle = () => advance(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 30000, 'world idle');
  const listUp = () => advance(() => G.ui.layers.length > 0 && !G.ui.text, 10000, 'list showing');
  const said = re => ev(re => window.__said.some(s => new RegExp(re).test(s)), re);
  const clearSaid = () => ev(() => { window.__said.length = 0; });
  const bag = k => ev(k => G.state.bag[k] || 0, k);
  const open = fn => ev(fn => { G.runWorld(() => eval(fn)()); }, fn);
  const pick = async n => { for (let i = 0; i < n; i++) await key('ArrowDown', 40); };
  const step = n => console.log('✓', n);

  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await idle();
  await ev(() => {
    window.__said = []; const say = G.say; G.say = (s, o) => { window.__said.push(s); return say(s, o); };
    G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true;
    S.party.push(G.makeCreature(1, 10), G.makeCreature(4, 8)); S.money = 50000;
    S.builds.push({ id: 'ref', type: 'refinery', map: 'lanternrest', x: 48, y: 3, lvl: 1, rot: 0 }, { id: 'forge', type: 'forge', map: 'lanternrest', x: 52, y: 3, lvl: 1, rot: 0 });
    G.loadMap('lanternrest'); G.placePlayer(49, 6, 1); G.scene = G.world.scene;
  });
  await page.waitForTimeout(300); await idle();
  const ref = "() => G.homeUse.refinery(G.state.builds.find(b => b.id === 'ref'))";

  // 1) refinery: start a job through the structure menu, inputs consumed only when it starts, done after enough frames
  await ev(() => { G.state.bag.Wood = 3; });
  await key('z'); await listUp(); await key('z');                    // REFINERY from the structure menu
  await listUp(); await page.waitForTimeout(150); await shot('refinery');
  await key('x'); await idle();
  assert.equal(await bag('Wood'), 3, 'opening and leaving consumes nothing');
  await key('z'); await listUp(); await key('z'); await listUp();
  await key('z');                                                      // Plank x2 (first recipe)
  await page.waitForTimeout(200);
  assert.equal(await ev(() => G.state.builds.find(b => b.id === 'ref').jobs.length), 1, 'job started'); assert.equal(await bag('Wood'), 0, 'inputs taken when started');
  assert(await ev(() => G.homeActive(G.state.builds.find(b => b.id === 'ref'))), 'active while working');
  await ev(() => { G.state.bag.Fiber = 3; }); await key('ArrowDown'); await key('z');   // Rope: but the only slot is busy
  await advance(() => window.__said.some(s => /busy/.test(s)), 8000); await listUp();
  assert.equal(await bag('Fiber'), 3, 'busy slot: nothing consumed');
  await page.waitForTimeout(300); await shot('refinery-job');
  await key('x'); await idle();
  await ev(() => { G.state.builds.find(b => b.id === 'ref').jobs[0].start = G.state.frames - 3500; });
  assert(await ev(() => G.homeActive(G.state.builds.find(b => b.id === 'ref'))), 'not finished at 3500 frames');
  assert(/jobs/.test(await ev(() => G.homeBlockRemove.refinery(G.state.builds.find(b => b.id === 'ref')))), 'cannot remove with jobs queued');
  await ev(() => { G.state.builds.find(b => b.id === 'ref').jobs[0].start = G.state.frames - 3600; });
  assert(!(await ev(() => G.homeActive(G.state.builds.find(b => b.id === 'ref')))), 'finished after 1 minute (3600 frames)');
  await clearSaid(); await open(ref); await advance(() => G.ui.layers.length > 0 && !G.ui.text, 8000);
  assert(await said('collected 2 Plank'), 'collected on opening'); assert.equal(await bag('Plank'), 2);
  await key('x'); await idle();
  assert.equal(await ev(() => G.homeBlockRemove.refinery(G.state.builds.find(b => b.id === 'ref'))), null);
  // tiers: Mk I can't make glass; Mk III is 2x faster and doubles planks
  await ev(() => { G.state.bag['Crystal Shard'] = 2; });
  assert(/Mk II/.test(await ev(() => G.craft.startJob(G.state.builds.find(b => b.id === 'ref'), G.RECIPES.refinery.find(r => r.id === 'glass')))), 'glass locked at tier 1');
  assert.equal(await bag('Crystal Shard'), 2);
  await ev(() => { const b = G.state.builds.find(b => b.id === 'ref'); b.lvl = 3; G.state.bag.Wood = 3; G.craft.startJob(b, G.RECIPES.refinery[0]); });
  assert.deepEqual(await ev(() => { const j = G.state.builds.find(b => b.id === 'ref').jobs[0]; return [j.dur, j.out.Plank]; }), [1800, 4]);
  await ev(() => { G.state.frames += 1800; G.craft.collect(G.state.builds.find(b => b.id === 'ref')); G.state.builds.find(b => b.id === 'ref').lvl = 1; });
  assert.equal(await bag('Plank'), 6);
  step('refinery: 3 Wood -> 2 Plank job (inputs taken only on start, slot limit, done after 3600 frames, collected); Mk III: 30 s and 4 Plank; glass locked at Mk I');

  // 2) forge: craft a tool, fail with missing ingredients (nothing consumed), tools are owned once
  await ev(() => { G.state.bag.Wood = 5; G.state.bag.Stone = 3; });
  await ev(() => G.placePlayer(53, 5, 1)); await page.waitForTimeout(100);
  await key('z'); await listUp(); await key('z'); await listUp(); await page.waitForTimeout(150); await shot('forge');
  await key('z'); await advance(() => window.__said.some(s => /crafted 1 Axe/.test(s)), 8000); await listUp();
  assert.equal(await bag('Axe'), 1); assert.equal(await bag('Wood'), 0); assert.equal(await bag('Stone'), 0);
  assert(await ev(() => G.homeActive(G.state.builds.find(b => b.id === 'forge'))), 'forge sparks after crafting');
  await ev(() => { G.state.bag.Stone = 5; G.state.bag.Wood = 2; });
  await clearSaid(); await key('ArrowDown'); await key('z');            // Pickaxe: selects it (touch-style lists select first), A crafts
  await advance(() => window.__said.some(s => /You need 2 more Wood/.test(s)), 8000); await listUp();
  assert.equal(await bag('Stone'), 5, 'failed craft consumes nothing'); assert.equal(await bag('Wood'), 2); assert.equal(await bag('Pickaxe'), 0);
  await key('ArrowUp'); await ev(() => { G.state.bag.Wood = 5; G.state.bag.Stone = 3; }); await key('z');
  await advance(() => window.__said.some(s => /already have an Axe/.test(s)), 8000); await listUp();
  assert.equal(await bag('Wood'), 5, 'a tool is owned once');
  await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await page.waitForTimeout(150); await shot('forge-locked');
  await key('z'); await advance(() => window.__said.some(s => /Forge \(Lv2\)/.test(s)), 8000); await listUp();
  await key('x'); await idle();
  // bicycle (tier 2) through the vehicles API, if it is there
  await ev(() => { const S = G.state; S.builds.find(b => b.id === 'forge').lvl = 2; Object.assign(S.bag, { 'Iron Ingot': 4, Wheel: 2, Rope: 2 }); });
  await clearSaid(); await ev(() => { G.runWorld(() => G.craft.craftNow(G.RECIPES.forge.find(r => r.id === 'bicycle'), { tier: 2, tierName: t => 'x', why: G.craft.forgeWhy })); }); await idle();
  const hasV = await ev(() => !!(G.vehicles && G.vehicles.grant));
  if (hasV) { assert(await ev(() => G.state.vehicles.owned.includes('bicycle')), 'bicycle granted'); assert.equal(await bag('Wheel'), 0); }
  else { assert(await said('vehicles'), 'says the vehicle API is missing'); assert.equal(await bag('Wheel'), 2); }
  await ev(() => { G.state.bag['Hover Core'] = 1; G.state.bag.Plank = 4; G.state.bag.Glass = 2; }); await clearSaid();
  await ev(() => { G.runWorld(() => G.craft.craftNow(G.RECIPES.forge.find(r => r.id === 'hoverboard'), { tier: 3, tierName: t => 'x', why: G.craft.forgeWhy })); }); await idle();
  assert(await said('Lantern'), 'hoverboard needs the Lantern lit'); assert.equal(await bag('Hover Core'), 1);
  step(`forge: Axe crafted (5 Wood + 3 Stone used); Pickaxe refused with "You need 2 more Wood" and nothing used; Axe owned once; tier-2 recipe locked at a Workbench; Bicycle ${hasV ? 'granted via G.vehicles' : 'refused (no G.vehicles)'}; Hoverboard needs the Lantern`);

  // 3) kitchen: none in the cabin; a cottage cooks; tier 3 makes two
  await clearSaid(); await open('G.homeFurn.stove'); await idle();
  assert(await said('Cottage'), 'the cabin has no kitchen');
  await ev(() => { const h = G.state.builds.find(b => b.type === 'house'); h.lvl = 2; Object.assign(G.state.bag, { Carrot: 1, Turnip: 1, Tomato: 1 }); });
  await open('G.homeFurn.stove'); await listUp(); await page.waitForTimeout(150); await shot('kitchen');
  await key('z'); await advance(() => window.__said.some(s => /cooked 1 Veggie Stew/.test(s)), 8000); await listUp();
  assert.equal(await bag('Veggie Stew'), 1); assert.equal(await bag('Carrot'), 0);
  await key('z'); await advance(() => window.__said.some(s => /You need 1 more Carrot/.test(s)), 8000); await listUp();
  await key('x'); await idle();
  await ev(() => { const h = G.state.builds.find(b => b.type === 'house'); h.lvl = 4; Object.assign(G.state.bag, { Tomato: 2, Milk: 1 }); });
  await open('G.homeFurn.stove'); await listUp(); await pick(2); await key('z');
  await advance(() => window.__said.some(s => /cooked 2 Tomato Soup/.test(s)), 8000); await listUp(); await key('x'); await idle();
  assert.equal(await bag('Tomato Soup'), 2);
  await ev(() => { G.state.energy = 20; G.runWorld(() => G.farm.eat('Veggie Stew')); }); await idle();
  assert.equal(await ev(() => G.state.energy), 60, 'Veggie Stew restores 40');
  step('kitchen: refused in the cabin; Cottage cooks Veggie Stew (and refuses without ingredients); Grand Homestead makes 2 Tomato Soup; stew = +40 energy');

  // 4) storage: deposit and withdraw, respecting capacity (house + sheds)
  await ev(() => { const h = G.state.builds.find(b => b.type === 'house'); h.lvl = 2; G.state.bag.Stone = 50; G.state.bag.Wood = 0; delete G.state.bag.Wood; });
  assert.equal(await ev(() => G.home.storageCap()), 40);
  await open('G.homeFurn.cupboard'); await listUp(); await key('z');                // + PUT ITEMS AWAY
  await listUp(); const si = await ev(() => Object.keys(G.state.bag).filter(k => G.state.bag[k] > 0 && G.ITEMS[k].kind !== 'key').sort().indexOf('Stone'));
  await pick(si); await page.waitForTimeout(100); await shot('storage-bag'); await key('z');
  await until(() => G.ui.layers.length >= 3, 5000, 'qty picker'); await key('ArrowDown'); await page.waitForTimeout(150); await shot('storage-qty'); await key('ArrowUp'); await key('z');   // all 40
  await listUp();
  assert.equal(await ev(() => G.state.storage.Stone), 40); assert.equal(await bag('Stone'), 10);
  await key('z'); await advance(() => window.__said.some(s => /storage is full \(40\/40\)/.test(s)), 8000); await listUp();
  assert.equal(await bag('Stone'), 10, 'full: nothing moved');
  await key('x'); await listUp(); await page.waitForTimeout(100); await shot('storage');
  await key('ArrowDown'); await key('z'); await until(() => G.ui.layers.length >= 2, 5000, 'qty');
  await key('ArrowLeft'); await key('ArrowLeft'); await key('ArrowLeft'); await key('ArrowLeft'); await key('ArrowUp'); await key('ArrowUp'); await key('ArrowUp'); await key('ArrowUp'); await key('z');   // 1 + 4 = 5
  await listUp(); await key('x'); await idle();
  assert.equal(await ev(() => G.state.storage.Stone), 35); assert.equal(await bag('Stone'), 15);
  await ev(() => { G.state.builds.push({ id: 'shed', type: 'shed', map: 'homestead', x: 33, y: 24, lvl: 1, rot: 0 }); });
  assert.equal(await ev(() => G.home.storageCap()), 80, 'a shed adds 40');
  assert.equal(await ev(() => G.craft.deposit('Stone', 99)), 15); assert.equal(await ev(() => G.craft.usedSpace()), 50);
  assert.equal(await ev(() => G.craft.withdraw('Stone', 99)), 50); assert.equal(await bag('Stone'), 50);
  step('storage: deposit 40 Stone (capacity 40), refused when full, withdraw 5; a shed adds 40 capacity');

  // 5) treats give EXP through G.useTreat (the bag calls it); G.canUse knows treats
  await ev(() => { G.state.bag['Spicy Treat'] = 1; window.__lv = G.state.party[1].lvl; window.__xp = G.state.party[1].exp; });
  assert(await ev(() => G.canUse(G.state.party[1], 'Spicy Treat')));
  await open("() => G.useTreat(G.state.party[1], 'Spicy Treat')"); await idle();
  assert.equal(await ev(() => G.state.party[1].exp - window.__xp), 300); assert(await ev(() => G.state.party[1].lvl > window.__lv), 'levelled up');
  assert.equal(await ev(() => G.state.party[1].lvl), await ev(() => { let l = window.__lv; while (G.expFor(l + 1) <= window.__xp + 300) l++; return l; }));
  assert.equal(await bag('Spicy Treat'), 0);
  step('Spicy Treat: +300 EXP with proper level-ups (G.levelUp / G.expFor)');

  // 6) furniture: daily-once energy, sink, tv, desk, wardrobe, bookshelf
  await ev(() => { G.state.energy = 50; }); await open('G.homeFurn.shower'); await idle();
  assert.equal(await ev(() => G.state.energy), 65); await open('G.homeFurn.shower'); await idle(); assert.equal(await ev(() => G.state.energy), 65, 'once a day');
  await ev(() => G.farm.newDay()); await open('G.homeFurn.shower'); await idle(); assert.equal(await ev(() => G.state.energy), 80, 'again the next day');
  await ev(() => { G.state.bag['Watering Can'] = 1; G.state.can = 0; }); await open('G.homeFurn.sink'); await idle(); assert.equal(await ev(() => G.state.can), 6);
  await clearSaid(); await open('G.homeFurn.tv'); await idle(); assert(await said('Day'));
  await open('G.homeFurn.desk'); await listUp(); await page.waitForTimeout(150); await shot('desk'); await key('x'); await idle();
  await open('G.homeFurn.bookshelf'); await listUp(); await key('z'); await listUp(); await page.waitForTimeout(150); await shot('book'); await key('x'); await listUp(); await key('x'); await idle();
  await open('G.homeFurn.wardrobe'); await listUp(); await key('ArrowDown'); await page.waitForTimeout(100); await shot('wardrobe'); await key('z'); await idle();
  assert.equal(await ev(() => G.state.style.shirt), '#4a90e0'); assert.notEqual(await ev(() => G.PLAYER_STYLE.shirt), '#4a90e0', 'default style untouched');
  await clearSaid(); for (const k of ['toilet', 'sofa', 'trophy', 'petbed']) { await open('G.homeFurn.' + k); await idle(); }
  assert(await said('TROPHIES'));
  step('furniture: shower +15 once a day, sink refills the can, TV, ledger, recipe book, wardrobe, toilet, sofa, trophies, pet bed');

  // 7) the furniture objects in a house interior call these handlers
  const ok = await ev(() => !!G.MAPS.home2);
  if (ok) {
    await ev(() => { G.loadMap('home2'); const o = G.world.map.objs.find(o => o.furn === 'shower'); G.placePlayer(o.x, o.y + 1, 1); G.state.energy = 10; G.farm.newDay(); });
    await page.waitForTimeout(300); await shot('home2'); await key('z'); await idle();
    assert.equal(await ev(() => G.state.energy), 25, 'shower object in the cottage');
    step('cottage interior: pressing A on the shower runs G.homeFurn.shower');
  }

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.stack || e.message); process.exit(1); });
