// Vehicles end to end in headless Chromium: node tests/e2e-vehicles.js
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), fs = require('fs'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/v-${n}.png` });
  const until = async (fn, ms = 20000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const idleNow = () => ev(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text);
  // Advance dialogue (pressing A, which also picks YES / the first menu entry) until the world is idle; returns every text page seen.
  const advance = async (ms = 30000) => {
    const seen = []; const t = Date.now();
    while (Date.now() - t < ms) {
      const txt = await ev(() => G.ui.text ? G.ui.text.lines.join(' ') : null);
      if (txt && seen[seen.length - 1] !== txt) seen.push(txt);
      if (await idleNow()) return seen.join(' | ');
      const k = await ev(() => (G.ui.text && G.ui.text.arrow) || (G.ui.layers.length && G.ui.text && G.ui.text.shown >= G.ui.text.lines.join('').length) ? 'z' : G.ui.layers.length && !G.ui.text && G.scene === G.world.scene && G.ui.fade.a === 0 ? 'x' : null);
      if (k) await key(k, 50); else await page.waitForTimeout(60);
    }
    await shot('timeout'); throw new Error('timeout advancing; saw: ' + seen.join(' | '));
  };
  const talk = async fn => { await ev(f => G.runWorld(() => (new Function('return ' + f))()()), fn.toString()); return advance(); };
  const step = n => console.log('✓', n);
  // boot past the title
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await page.waitForTimeout(300);
  // fresh state on any map
  await ev(() => {
    window.setup = (map, x, y, dir, party) => {
      G.ui.layers.length = 0; G.closeText(); G.world.busy = false; G.ui.fade.a = 0;
      G.state = G.newState(); G.migrateState(G.state); const S = G.state;
      S.flags.starter = true; S.party = (party || [[1, 10]]).map(([id, l]) => G.makeCreature(id, l)); S.money = 0;
      G.loadMap(map); G.world.map._spawn = false; G.world.map.roamers = []; G.placePlayer(x, y, dir); G.scene = G.world.scene;
    };
    window.place = (x, y, dir) => { G.placePlayer(x, y, dir); };
    window.rec = []; window.recOn = false;
    G.hooks.tick.push(() => { if (window.recOn) window.rec.push([G.frameNo, G.world.p.x, G.world.p.y]); });
    window.framesPerTile = () => { const r = window.rec, ch = []; for (let i = 1; i < r.length; i++) if (r[i][1] !== r[i - 1][1] || r[i][2] !== r[i - 1][2]) ch.push(r[i][0]); const d = []; for (let i = 1; i < ch.length; i++) d.push(ch[i] - ch[i - 1]); d.sort((a, b) => a - b); return d.length ? d[d.length >> 1] : -1; };
  });
  const measure = async (dirKey, ms) => { await ev(() => { window.rec = []; window.recOn = true; }); await key(dirKey, ms); await page.waitForTimeout(250); await ev(() => { window.recOn = false; }); return ev(() => window.framesPerTile()); };

  // 1) Riding: grant a bicycle, build a garage, take it out through the garage, and it is faster than walking
  await ev(() => { setup('lanternrest', 49, 9, 1); G.vehicles.grant('bicycle');
    G.state.builds.push({ id: 'g1', type: 'garage', map: 'lanternrest', x: 48, y: 6, lvl: 1, rot: 0 }); G.applyBuilds(G.world.map); });
  await page.waitForTimeout(200);
  const walk = await ev(() => { place(47, 11, 3); return true; }) && await measure('ArrowRight', 1000);
  await ev(() => place(49, 9, 1)); await page.waitForTimeout(150);
  await ev(() => G.runWorld(() => G.homeUse.garage(G.state.builds.find(b => b.type === 'garage'))));   // the garage structure's action
  await until(() => G.ui.layers.length >= 2, 3000, 'garage ui'); await page.waitForTimeout(400); await shot('garage');
  await key('z'); await page.waitForTimeout(300); await shot('garage-actions'); await key('z');          // BICYCLE > TAKE OUT
  await advance();
  assert.equal(await ev(() => G.vehicles.riding()), 'bicycle', 'riding the bicycle');
  await page.waitForTimeout(300); await shot('ride-bicycle');
  await ev(() => place(47, 11, 3)); await page.waitForTimeout(100);
  const bike = await measure('ArrowRight', 700);
  assert(walk >= 16 && bike > 0 && bike <= 12 && bike < walk, `frames per tile: walking ${walk}, bicycle ${bike}`);
  step(`garage TAKE OUT mounts the bicycle; ${walk} frames per tile walking vs ${bike} on the bicycle`);

  // 2) Refusals and restrictions
  // bicycle refused in tall grass
  const g = await ev(() => { setup('sunmeadow', 2, 2, 0); G.vehicles.grant('bicycle'); G.state.builds.push({ id: 'g1', type: 'garage', map: 'lanternrest', x: 48, y: 6, lvl: 3, rot: 0 });
    const m = G.world.map; for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) if (m.t[y][x] === 'g' && m.t[y][x + 1] === 'G' && G.worldApi.canWalk(x, y) && !G.worldApi.tileWarp(x, y)) { place(x, y, 3); return { x, y, ok: G.vehicles.mount('bicycle'), why: G.vehicles.lastWhy }; } return null; });
  assert(g && g.ok, 'mounted next to tall grass: ' + JSON.stringify(g));
  await key('ArrowRight', 400); await page.waitForTimeout(150);
  assert.equal(await ev(() => G.world.p.x), g.x, 'the bicycle stays out of tall grass');
  const toast = await page.screenshot({ path: `${OUT}/v-grass-refused.png` }) && await ev(() => G.vehicles.allowed('bicycle', 'G'));
  assert.equal(toast, false);
  assert.match(await ev(() => G.vehicles.rideWhy('bicycle') || ''), /riding/);
  // can't mount while standing in tall grass
  const inGrass = await ev(() => { G.state.vehicles.riding = null; const m = G.world.map; for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) if (m.t[y][x] === 'G' && G.worldApi.canWalk(x, y)) { place(x, y, 0); return G.vehicles.rideWhy('bicycle'); } return null; });
  assert.match(inGrass, /tall grass/);
  step('the bicycle is refused in tall grass (and can\'t be mounted in it)');
  // car refused off-road, fine on the road
  const c = await ev(() => { setup('lanternrest', 2, 2, 0); ['bicycle', 'car'].forEach(G.vehicles.grant); G.state.builds.push({ id: 'g1', type: 'garage', map: 'lanternrest', x: 48, y: 6, lvl: 3, rot: 0 }); G.applyBuilds(G.world.map);
    const m = G.world.map; for (let y = 2; y < m.h - 2; y++) for (let x = 3; x < m.w - 3; x++) if (m.t[y][x] === 'y' && m.t[y][x - 1] === 'y' && m.t[y][x + 1] === 'g' && G.worldApi.canWalk(x, y) && G.worldApi.canWalk(x - 1, y) && G.worldApi.canWalk(x + 1, y)) { place(x, y, 3); return { x, y, ok: G.vehicles.mount('car'), why: G.vehicles.lastWhy }; } return null; });
  assert(c && c.ok, 'mounted the car: ' + JSON.stringify(c));
  await key('ArrowRight', 500); await page.waitForTimeout(150);
  assert.equal(await ev(() => G.world.p.x), c.x, 'the car stays on the road');
  await shot('car-refused');
  await key('ArrowLeft', 300); await page.waitForTimeout(400);
  assert(await ev(x => G.world.p.x < x, c.x), 'the car drives along the road');
  step('the car is refused off-road and drives on the road');
  // hoverboard crosses water, and you can't get off over water
  const h = await ev(() => { setup('lanternrest', 2, 2, 0); G.vehicles.grant('hoverboard'); G.state.builds.push({ id: 'g1', type: 'garage', map: 'lanternrest', x: 48, y: 6, lvl: 1, rot: 0 }); G.applyBuilds(G.world.map);
    const m = G.world.map; for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 3; x++) if (m.t[y][x] === 'p' && m.t[y][x + 1] === 'w' && m.t[y][x + 2] === 'w' && G.worldApi.canWalk(x, y)) { place(x, y, 3); return { x, y, ok: G.vehicles.mount('hoverboard'), why: G.vehicles.lastWhy }; } return null; });
  assert(h && h.ok, 'mounted the hoverboard: ' + JSON.stringify(h));
  await key('ArrowRight', 260); await page.waitForTimeout(400);
  const hp = await ev(() => ({ x: G.world.p.x, ch: G.worldApi.tileAt(G.world.p.x, G.world.p.y) }));
  assert(hp.x > h.x && hp.ch === 'w', 'the hoverboard is out over the water: ' + JSON.stringify(hp));
  await shot('hoverboard-water');
  assert.equal(await ev(() => G.vehicles.dismount()), false); assert.match(await ev(() => G.vehicles.lastWhy), /water/);
  step('the hoverboard crosses water, and refuses to drop you in it');
  // entering an interior auto-parks the vehicle; stepping back out puts you back on it; A re-mounts it
  await ev(() => { setup('lanternrest', 7, 18, 1); G.vehicles.grant('bicycle'); G.state.builds.push({ id: 'g1', type: 'garage', map: 'lanternrest', x: 48, y: 6, lvl: 1, rot: 0 }); G.applyBuilds(G.world.map); G.vehicles.mount('bicycle'); });
  await page.keyboard.down('ArrowUp'); await until(() => G.world.busy || G.world.mapId === 'cottage', 6000, 'reach the door'); await page.keyboard.up('ArrowUp');
  const parkText = await advance();
  const pk = await ev(() => ({ map: G.world.mapId, riding: G.vehicles.riding(), parked: G.state.vehicles.parked }));
  assert.equal(pk.map, 'cottage'); assert.equal(pk.riding, null);
  assert(pk.parked && pk.parked.id === 'bicycle' && pk.parked.map === 'lanternrest' && pk.parked.x === 7 && pk.parked.y === 16, 'parked by the door: ' + JSON.stringify(pk));
  assert.match(parkText, /parked the Bicycle outside/);
  assert.equal(await ev(() => G.hooks.drawPlayer(document.createElement('canvas').getContext('2d'), 0, 0, 0, 0, 0, () => {})), false, 'walking indoors');
  await page.keyboard.down('ArrowDown'); await until(() => G.world.mapId === 'lanternrest', 6000, 'back outside'); await page.keyboard.up('ArrowDown');
  await advance(); await page.waitForTimeout(200);
  assert.equal(await ev(() => G.vehicles.riding()), 'bicycle', 'back on the bicycle outside');
  assert(await ev(() => G.vehicles.dismount()), 'got off');
  const off = await ev(() => ({ p: [G.world.p.x, G.world.p.y], parked: G.state.vehicles.parked, prompt: G.hooks.prompt.map(f => f(...G.worldApi.facing())).filter(Boolean)[0] }));
  assert.equal(off.prompt, 'Ride bicycle'); await page.waitForTimeout(200); await shot('parked');
  await key('z'); await page.waitForTimeout(200);
  assert.equal(await ev(() => G.vehicles.riding()), 'bicycle', 'A on the parked bicycle re-mounts it');
  step('entering a house parks the vehicle outside; you re-mount it outside (step onto it, or face it and press A)');

  // 3) Buying at the dealership
  await ev(() => { setup('shore', 30, 7, 0); G.state.money = 100; });
  let t = await talk(() => G.vehicles.buy('bicycle'));
  assert.match(t, /You need \$3900 more\./); assert.equal(await ev(() => G.state.money), 100); assert.equal(await ev(() => G.vehicles.owned().length), 0);
  await ev(() => { G.state.money = 99999; });
  t = await talk(() => G.vehicles.buy('car'));
  assert.match(t, /first need: 2 Ember Shards, Garage Lv2/); assert.equal(await ev(() => G.state.money), 99999); assert(!(await ev(() => G.vehicles.owned().includes('car'))));
  assert.match(await ev(() => G.vehicles.shopList().find(r => r.id === 'helicopter').why), /Lantern/);
  await ev(() => { G.state.money = 5000; });
  t = await talk(() => G.vehicles.buy('bicycle'));
  assert.equal(await ev(() => G.state.money), 1000); assert(await ev(() => G.vehicles.owned().includes('bicycle')));
  await ev(() => { G.state.money = 40000; G.state.flags.shard_meadow = G.state.flags.shard_marsh = true; G.state.builds.push({ id: 'g1', type: 'garage', map: 'homestead', x: 10, y: 10, lvl: 2, rot: 0 }); });
  t = await talk(() => G.vehicles.buy('car'));
  assert.equal(await ev(() => G.state.money), 10000); assert(await ev(() => G.vehicles.owned().includes('car')));
  step('buying: too little money or missing requirements consumes nothing (with the reason); buys with requirements met succeed');

  // 4) Flight
  await ev(() => setup('lanternrest', 29, 26, 0, [[1, 30]]));
  const openTravel = async label => {
    await ev(() => G.runWorld(() => G.travelMenu())); await until(() => G.ui.layers.length >= 2, 3000, 'travel menu');
    const i = await ev(l => G.vehicles.menuItems.indexOf(l), label); assert(i >= 0, label + ' in ' + await ev(() => G.vehicles.menuItems));
    for (let k = 0; k < i; k++) await key('ArrowDown', 40);
    await key('z');
  };
  await openTravel('FLY'); t = await advance();
  assert(t.includes('No creature in your party can carry you. A Flying-type that has evolved, at Lv18+, can.'), 'flight refusal: ' + t);
  assert.equal(await ev(() => G.canFly(G.makeCreature(16, 30))), false, 'an unevolved flier can\'t carry you');
  assert.equal(await ev(() => G.canFly(G.makeCreature(17, 12))), false, 'too low a level');
  step('flight is refused with no eligible flying creature (exact explanation)');
  await ev(() => { setup('lanternrest', 29, 26, 0, [[1, 30], [17, 20]]); G.state.visited.sunmeadow = true; });
  await openTravel('FLY');
  await until(() => G.vehicles._fly && G.scene === G.vehicles._fly.scene && G.ui.fade.a === 0, 5000, 'fly scene');
  await page.waitForTimeout(500); await shot('fly-pick');
  const locked = await ev(() => G.vehicles._fly.nodes.filter(n => n.id === 'hollow' || n.id === 'mirewood').map(n => n.id));
  assert.equal(locked.length, 2);
  await ev(() => { const f = G.vehicles._fly; f.sel = f.nodes.findIndex(n => n.id === 'lanternrest'); });
  await key('ArrowLeft'); await page.waitForTimeout(100);
  assert.equal(await ev(() => G.vehicles._fly.nodes[G.vehicles._fly.sel].id), 'sunmeadow', 'D-pad picks Sunmeadow');
  await key('z'); await until(() => G.vehicles._fly && G.vehicles._fly.phase === 'fly', 3000, 'take off'); await page.waitForTimeout(900); await shot('fly-flight');
  await until(() => G.world.mapId === 'sunmeadow' && G.scene === G.world.scene, 8000, 'landing');
  await advance();
  const land = await ev(() => { const p = G.world.p, ch = G.worldApi.tileAt(p.x, p.y); return { x: p.x, y: p.y, ch, walk: G.worldApi.canWalk(p.x, p.y, true), warp: G.worldApi.tileWarp(p.x, p.y) }; });
  assert(land.walk && !land.warp, 'landed on walkable ground: ' + JSON.stringify(land));
  await shot('landed');
  step(`flight with SKYRANT Lv20 to a visited map: landed in Sunmeadow at ${land.x},${land.y} ('${land.ch}')`);

  // 5) Helicopter: refused without a helipad
  await ev(() => { setup('lanternrest', 29, 26, 0); G.vehicles.grant('helicopter'); G.state.flags.lanternLit = true; G.state.builds.push({ id: 'g1', type: 'garage', map: 'homestead', x: 10, y: 10, lvl: 3, rot: 0 }); });
  await openTravel('HELICOPTER'); t = await advance();
  assert.match(t, /You need a Helipad/);
  step('the helicopter is refused without a Helipad');

  // 6) Quests
  await ev(() => setup('lanternrest', 29, 26, 0));
  t = await talk(() => G.vehicleQuest.courier());
  assert.match(t, /0\/3 Carrots and 0\/2 Turnips/); assert(!(await ev(() => G.vehicles.owned().includes('scooter'))));
  await ev(() => { G.state.bag.Carrot = 2; G.state.bag.Turnip = 5; });
  t = await talk(() => G.vehicleQuest.courier());
  assert.match(t, /2\/3 Carrots and 2\/2 Turnips/); assert.deepEqual(await ev(() => [G.state.bag.Carrot, G.state.bag.Turnip]), [2, 5], 'nothing consumed');
  await ev(() => { G.state.bag.Carrot = 4; });
  t = await talk(() => G.vehicleQuest.courier());
  assert.match(t, /received the SCOOTER/); assert.deepEqual(await ev(() => [G.state.bag.Carrot, G.state.bag.Turnip, G.vehicles.owned().includes('scooter')]), [1, 3, true]);
  t = await talk(() => G.vehicleQuest.courier()); assert.match(t, /Business is booming/);
  step('courier quest: progress text, failure consumes nothing, success trades 3 Carrots + 2 Turnips for the Scooter');
  await ev(() => { G.state.bag.Wheel = 1; G.state.bag['Engine Part'] = 1; });
  t = await talk(() => G.vehicleQuest.quad());
  assert.match(t, /1\/1 Engine Part and 1\/2 Wheels/); assert.deepEqual(await ev(() => [G.state.bag.Wheel, G.state.bag['Engine Part'], G.vehicleQuest.quadHidden()]), [1, 1, false]);
  await ev(() => { G.state.bag.Wheel = 2; });
  t = await talk(() => G.vehicleQuest.quad());
  assert.deepEqual(await ev(() => [G.state.bag.Wheel || 0, G.state.bag['Engine Part'] || 0, G.vehicleQuest.quadHidden(), G.vehicles.owned().includes('quad')]), [0, 0, true, true]);
  step('quad quest: failure consumes nothing; repair takes 1 Engine Part + 2 Wheels, gives the Quad and hides the wreck');

  // 7) Garage Lv2: tune-up and paint
  await ev(() => { setup('lanternrest', 49, 9, 1); G.vehicles.grant('bicycle'); G.state.bag['Engine Part'] = 1; G.state.builds.push({ id: 'g1', type: 'garage', map: 'lanternrest', x: 48, y: 6, lvl: 2, rot: 0 }); G.applyBuilds(G.world.map); });
  const s0 = await ev(() => G.vehicles.speed('bicycle'));
  await ev(() => G.runWorld(() => G.homeUse.garage(G.state.builds.find(b => b.type === 'garage')))); await until(() => G.ui.layers.length >= 2, 3000, 'garage');
  await key('z'); await page.waitForTimeout(300); await key('ArrowDown'); await key('z');   // BICYCLE > TUNE-UP > YES
  await advance();
  assert.equal(await ev(() => G.vehicles.speed('bicycle')), s0 + .5); assert.equal(await ev(() => G.state.bag['Engine Part'] || 0), 0);
  await ev(() => G.runWorld(() => G.homeUse.garage(G.state.builds.find(b => b.type === 'garage')))); await until(() => G.ui.layers.length >= 2, 3000, 'garage');
  await key('z'); await page.waitForTimeout(300); await key('ArrowDown'); await key('ArrowDown'); await key('z');   // PAINT
  await until(() => G.ui.layers.length >= 2, 3000); await key('ArrowDown'); await page.waitForTimeout(300); await shot('garage-paint'); await key('z');   // BLUE
  await advance();
  assert.equal(await ev(() => G.state.vehicles.paint.bicycle), '#3a78e0');
  step('garage Lv2: tune-up (+0.5 speed for 1 Engine Part) and paint');

  // 9) Boats: launch from a shore, sail, refuse land, step ashore, re-board, indoors, storage and the shop
  const sailTo = async (x, y, dirKey, ms) => { await ev(([x, y]) => G.placePlayer(x, y, 3), [x, y]); };
  await ev(() => { setup('lanternrest', 4, 33, 3); G.vehicles.grant('rowboat'); });
  assert.equal(await ev(() => G.hooks.prompt.map(f => f(...G.worldApi.facing())).filter(Boolean)[0]), 'Launch boat');
  await key('z'); t = await advance();
  assert.match(t, /Launch the rowboat\?/);
  assert.deepEqual(await ev(() => [G.vehicles.riding(), G.world.p.x, G.world.p.y]), ['rowboat', 5, 33], 'launched onto the water in front of you');
  await page.waitForTimeout(300); await shot('boat-launch');
  await ev(() => { G.world.map.roamers = []; });
  const row = await measure('ArrowRight', 800);
  assert(row >= 11 && row <= 16 && row < walk, `rowboat frames per tile: ${row} (walking ${walk})`);
  const bx = await ev(() => G.world.p.x); assert(bx > 8 && await ev(() => G.worldApi.tileAt(G.world.p.x, G.world.p.y)) === 'w', 'sailing on water');
  await shot('boat-sailing');
  assert.equal(await ev(() => G.hooks.encRate(.07)), 0, 'no encounters while sailing');
  // land is refused: sail back to the west shore and push on
  await ev(() => G.placePlayer(5, 33, 2)); await page.waitForTimeout(100); await key('ArrowLeft', 500); await page.waitForTimeout(200);
  assert.equal(await ev(() => G.world.p.x), 5, 'the rowboat stays off the land');
  assert.match(await ev(() => G.vehicles.rideWhy('rowboat') || ''), /riding/);
  // step ashore (facing the shore, press A), leaving the boat moored; then board again
  assert.equal(await ev(() => G.hooks.prompt.map(f => f(...G.worldApi.facing())).filter(Boolean)[0]), 'Step ashore');
  await key('z'); await page.waitForTimeout(250);
  const ash = await ev(() => ({ r: G.vehicles.riding(), p: [G.world.p.x, G.world.p.y], m: G.state.vehicles.moored }));
  assert(ash.r === null && ash.p[0] === 4 && ash.m && ash.m.id === 'rowboat' && ash.m.x === 5 && ash.m.y === 33, 'stepped ashore, boat moored: ' + JSON.stringify(ash));
  await ev(() => G.placePlayer(4, 33, 3)); await page.waitForTimeout(250); await shot('boat-moored');
  assert.equal(await ev(() => G.hooks.prompt.map(f => f(...G.worldApi.facing())).filter(Boolean)[0]), 'Board rowboat');
  await key('z'); await page.waitForTimeout(250);
  assert.deepEqual(await ev(() => [G.vehicles.riding(), G.world.p.x, G.state.vehicles.moored]), ['rowboat', 5, null], 're-boarded the moored boat');
  // a boat never follows you indoors: the map change moors it where it floats
  await ev(() => G.loadMap('cottage'));
  assert.deepEqual(await ev(() => [G.vehicles.riding(), G.state.vehicles.moored && G.state.vehicles.moored.map]), [null, 'lanternrest'], 'moored outside when entering an interior');
  await ev(() => { setup('cottage', 4, 4, 1); G.vehicles.grant('rowboat'); });
  assert.match(await ev(() => G.vehicles.rideWhy('rowboat')), /indoors/);
  assert.equal(await ev(() => G.vehicles.mount('rowboat')), false);
  // facing land refuses a launch, with the reason
  await ev(() => { setup('lanternrest', 4, 30, 1); G.vehicles.grant('rowboat'); });
  assert.match(await ev(() => G.vehicles.rideWhy('rowboat')), /Face open water/);
  // the faster motorboat
  await ev(() => { setup('lanternrest', 4, 33, 3); G.vehicles.grant('motorboat'); G.vehicles.mount('motorboat'); G.world.map.roamers = []; });
  const mot = await measure('ArrowRight', 700);
  assert(mot > 0 && mot <= 11 && mot < row, `motorboat frames per tile: ${mot} (rowboat ${row})`);
  await shot('motorboat-sailing');
  // garage: boats are listed under their own heading; MOOR NEARBY finds the water, or explains
  await ev(() => { setup('lanternrest', 4, 33, 3); ['bicycle', 'rowboat', 'sailboat'].forEach(G.vehicles.grant); G.state.builds.push({ id: 'g1', type: 'garage', map: 'lanternrest', x: 48, y: 6, lvl: 2, rot: 0 }); });
  await ev(() => G.runWorld(() => G.homeUse.garage(G.state.builds.find(b => b.type === 'garage')))); await until(() => G.ui.layers.length >= 2, 3000, 'garage');
  assert.deepEqual(await ev(() => G.vehicles._garage), ['bicycle', 'rowboat', 'sailboat'], 'garage lists the boats');
  await page.waitForTimeout(300); await shot('garage-boats');
  await key('ArrowDown'); await page.waitForTimeout(100); await key('z'); await page.waitForTimeout(250); await key('z');   // ROWBOAT > MOOR NEARBY
  await advance();
  const mo = await ev(() => G.state.vehicles.moored);
  assert(mo && mo.id === 'rowboat' && await ev(m => G.worldApi.tileAt(m.x, m.y), mo) === 'w', 'moored on nearby water');
  await ev(() => { setup('lanternrest', 49, 9, 1); G.vehicles.grant('rowboat'); G.state.builds.push({ id: 'g1', type: 'garage', map: 'lanternrest', x: 48, y: 6, lvl: 2, rot: 0 }); });
  await ev(() => G.runWorld(() => G.homeUse.garage(G.state.builds.find(b => b.type === 'garage')))); await until(() => G.ui.layers.length >= 2, 3000, 'garage');
  await key('z'); await page.waitForTimeout(250); await key('z'); t = await advance();
  assert.match(t, /Moor it at the water instead/); assert.equal(await ev(() => G.state.vehicles.moored), null);
  // the TRAVEL menu offers boats; the dealership sells the cheap ones; the ferry can ask
  await ev(() => { setup('lanternrest', 4, 33, 3); G.vehicles.grant('rowboat'); });
  assert.equal(await ev(() => G.vehicles.ownsBoat()), true);
  await openTravel('RIDE ROWBOAT'); t = await advance();
  assert.match(t, /launched the Rowboat/); assert.equal(await ev(() => G.vehicles.riding()), 'rowboat');
  assert.equal(await ev(() => G.vehicles.shopList().filter(r => r.id.endsWith('boat')).map(r => r.id + ':' + r.price).join()), 'rowboat:1500,motorboat:9000');
  await ev(() => { setup('shore', 30, 7, 0); G.state.money = 2000; });
  await talk(() => G.vehicles.buy('rowboat'));
  assert.deepEqual(await ev(() => [G.state.money, G.vehicles.owned().includes('rowboat'), G.vehicles.ownsBoat()]), [500, true, true]);
  await ev(() => { G.state.money = 100; });
  t = await talk(() => G.vehicles.buy('motorboat')); assert.match(t, /You need \$8900 more\./);
  // forge recipes grant the boats
  assert.deepEqual(await ev(() => ['rowboat', 'motorboat', 'sailboat'].map(id => { const r = G.RECIPES.forge.find(r => r.id === id); return r && r.vehicle + r.tier; })), ['rowboat1', 'motorboat2', 'sailboat3']);
  // art sheet of every boat in every direction, drawn with the rider
  await ev(() => { const c = document.createElement('canvas'); c.id = 'sheet'; c.width = 12 * 40; c.height = 4 * 36 * 1; c.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:288px;background:#5ab8e8;z-index:99;image-rendering:auto';
    document.body.appendChild(c); const x = c.getContext('2d'); x.fillStyle = '#6cc4f0'; x.fillRect(0, 0, c.width, c.height);
    const ids = ['rowboat', 'motorboat', 'sailboat']; let n = 0; G.world.p.moving = false;
    for (const mv of [false, true]) for (const id of ids) for (let d = 0; d < 4; d++) { const col = n % 12, row = Math.floor(n / 12); const ox = col * 40 + 12, oy = row * 36 + 14; n++;
      const sp = G.homeArt.seat ? null : null; void sp;
      G.vehicleArt(x, id, d, ox, oy, 100, { moving: mv, layer: 'back' });
      const st = G.hooks.drawPlayer; void st;
      x.save(); x.translate(ox, oy); const seat = (G.vehicles._seat || (() => ({ dx: 0, dy: 0 })))(id, d); G.drawChar(x, G.state.style, d, 0, seat.dx, seat.dy, 100, true); x.restore();
      G.vehicleArt(x, id, d, ox, oy, 100, { moving: mv, layer: 'front' }); } });
  await page.screenshot({ path: `${OUT}/v-boat-sheet.png`, clip: { x: 0, y: 0, width: 960, height: 290 } });
  await ev(() => document.getElementById('sheet').remove());
  step('boats: launch from a shore, speed (rowboat ' + row + ' / motorboat ' + mot + ' frames per tile), land refused, step ashore and re-board, indoors refused, garage BOATS list and MOOR NEARBY, shop, recipes, TRAVEL');

  // 8) The world map moved to js/worldmap.js (its own tests): just check it opens and B closes it
  await ev(() => { setup('cottage', 4, 4, 1); });
  await ev(() => G.runWorld(() => G.worldMapScreen()));
  await until(() => G.scene !== G.world.scene && G.ui.fade.a === 0, 4000, 'map screen'); await page.waitForTimeout(300); await shot('world-map');
  await key('x'); await until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0, 4000, 'map closed');
  step('world map opens from anywhere and B closes it');

  assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' / '));
  console.log('vehicles e2e: all passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
