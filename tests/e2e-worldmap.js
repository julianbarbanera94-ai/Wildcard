// World map, ferries and flight destinations end to end in headless Chromium: node tests/e2e-worldmap.js
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
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(90); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/wm-${n}.png` });
  const until = async (fn, ms = 20000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const idle = () => ev(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text);
  const textNow = () => ev(() => G.ui.text ? G.ui.text.lines.join(' ') : null);
  // press A through dialogue pages until cond() holds (cond runs in the page); returns the pages seen
  const pressUntil = async (cond, ms = 30000, msg = '') => {
    const seen = [], t = Date.now();
    while (Date.now() - t < ms) {
      const txt = await textNow(); if (txt && seen[seen.length - 1] !== txt) seen.push(txt);
      if (await ev(cond)) return seen.join(' | ');
      if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(60);
    }
    await shot('timeout'); throw new Error('timeout waiting for ' + (msg || cond) + '; saw: ' + seen.join(' | '));
  };
  const step = n => console.log('✓', n);
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await page.waitForTimeout(300);
  await ev(() => {
    window.setup = (map, x, y, dir, party, o) => {
      o = o || {};
      G.ui.layers.length = 0; G.closeText(); G.world.busy = false; G.ui.fade.a = 0;
      G.state = G.newState(); G.migrateState(G.state); const S = G.state;
      S.flags.starter = true; S.party = (party || [[1, 10]]).map(([id, l]) => G.makeCreature(id, l)); S.money = o.money || 0;
      S.visited = {}; (o.visited || []).forEach(v => S.visited[v] = true);
      (G.BADGES || []).slice(0, o.badges || 0).forEach(b => S.flags['badge_' + b.id] = true);
      G.loadMap(map); G.world.map._spawn = false; G.world.map.roamers = []; G.placePlayer(x, y, dir); G.scene = G.world.scene;
      S.visited = Object.assign({}, S.visited); (o.visited || []).forEach(v => S.visited[v] = true);
    };
  });
  const mapScreen = async () => { await ev(() => G.runWorld(() => G.worldMapScreen())); await until(() => G.worldMap && G.scene === G.worldMap.scene && G.ui.fade.a === 0, 5000, 'map screen'); await page.waitForTimeout(300); };
  const selId = () => ev(() => G.worldMap.nodes[G.worldMap.sel].id);
  const closeMap = async () => { await key('x'); await until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0, 5000, 'map closed'); };

  // 1) data: every place has a map, a position and a parent; interiors map to their outdoor parent
  const data = await ev(() => ({ n: G.WORLD.places.length, bad: G.WORLD.places.filter(p => !G.MAPS[p.id] || !(p.nx > 0 && p.nx < 1 && p.ny > 0 && p.ny < 1)).map(p => p.id),
    missing: Object.values(G.MAPS).filter(m => m.outdoor && !G.WORLD.byId[m.id] && m.id !== 'mine').map(m => m.id),
    parents: ['cottage', 'lodge', 'mine', 'arena_cobalt', 'forgeshop', 'home2', 'apothecary'].map(i => G.worldPlaceOf(i)), edges: G.WORLD.edges.length, ferries: G.WORLD.ferries.length }));
  assert.equal(data.n, 24); assert.deepEqual(data.bad, [], 'places exist and are on the map'); assert.deepEqual(data.missing, [], 'every outdoor map has a place');
  assert.deepEqual(data.parents, ['lanternrest', 'lanternrest', 'ridge', 'cobalt', 'ridge', 'homestead', 'mirewood']);
  assert(data.edges >= 25 && data.ferries === 5, JSON.stringify(data));
  const tw = await ev(() => ({ lantern: G.WORLD.byId.lanternrest.nx, mire: G.WORLD.byId.mirewood.nx, mireY: G.WORLD.byId.mirewood.ny, lanternY: G.WORLD.byId.lanternrest.ny, hollowY: G.WORLD.byId.hollow.ny, frost: G.WORLD.byId.frostmere.ny, moon: G.WORLD.byId.moonlit.ny }));
  assert(tw.mire < tw.lantern && tw.mireY > tw.lanternY, 'Mirewood sits south-west of Lanternrest like Mistral Swamp'); assert(tw.frost < .2 && tw.moon > .8, 'Frostmere far north, Moonlit far south');
  step(`G.WORLD: ${data.n} places on the map, ${data.edges} routes from the warps, ${data.ferries} ferries, interiors map to their parents`);

  // 2) the map screen: opens, you-are-here (also from an interior), cursor, zoom, closes
  await ev(() => setup('cottage', 4, 4, 1, null, { visited: ['lanternrest', 'sunmeadow', 'sunhaven', 'stonebridge'], badges: 2 }));
  await mapScreen();
  assert.equal(await ev(() => G.worldMap.here), 'lanternrest', 'you are here: Lanternrest (from inside the cottage)');
  assert.equal(await selId(), 'lanternrest', 'the cursor starts on you-are-here'); await shot('map');
  assert.match(await ev(() => G.worldMap.desc), /hub village.*healing/);
  const first = await selId(); await key('ArrowLeft'); await page.waitForTimeout(150); const second = await selId();
  assert.notEqual(first, second, 'the cursor moves'); assert.equal(second, 'sunmeadow', 'left of Lanternrest is Sunmeadow');
  await key('ArrowUp'); await key('ArrowUp'); await page.waitForTimeout(150);
  const third = await selId(); assert(third !== second, 'the cursor moves up the map: ' + third);
  await ev(() => { const m = G.worldMap; m.sel = m.nodes.findIndex(n => n.id === 'frostmere'); }); await page.waitForTimeout(200);
  let info = await ev(() => G.worldMap.info); assert.match(info.locked, /Needs 5 Arena Badges \(you have 2\)/); assert(info.services.arena && info.badge.id === 'rime'); await shot('map-locked');
  await ev(() => { const m = G.worldMap; m.sel = m.nodes.findIndex(n => n.id === 'aurora'); }); await page.waitForTimeout(200);
  info = await ev(() => G.worldMap.info); assert.match(info.locked, /8 Arena Badges.*Great Lantern relit/); assert.deepEqual(info.levels, await ev(() => G.worldLevels('aurora')));
  await ev(() => { const m = G.worldMap; m.sel = m.nodes.findIndex(n => n.id === 'sunhaven'); }); await page.waitForTimeout(200);
  info = await ev(() => G.worldMap.info); assert.equal(info.locked, null, 'Sunhaven is open'); assert(info.services.heal && info.services.arena === 'bloom' && info.badgeGot === true);
  await key('z'); await page.waitForTimeout(1400); assert(await ev(() => G.worldMap.zoomed && G.worldMap.zoom > 2), 'A zooms in'); await shot('map-zoom');
  await ev(() => { const m = G.worldMap; m.sel = m.nodes.findIndex(n => n.id === 'lakeside'); }); await page.waitForTimeout(1200); await shot('map-zoom-lake');
  await key('z'); await page.waitForTimeout(900); assert(await ev(() => !G.worldMap.zoomed && G.worldMap.zoom < 1.2), 'A zooms back out');
  await closeMap(); assert.equal(await ev(() => G.world.mapId), 'cottage', 'B closes the map');
  step('map screen: opens and closes, you-are-here from an interior, cursor moves, locked places say why, A zooms');
  await ev(() => setup('mine', 20, 30, 1, null, { visited: ['lanternrest', 'ridge'] }));
  await mapScreen(); assert.equal(await ev(() => G.worldMap.here), 'ridge', 'the mine belongs to the ridge'); await closeMap();
  await ev(() => setup('arena_cobalt', 5, 10, 1, null, { visited: ['cobalt'] }));
  await mapScreen(); assert.equal(await ev(() => G.worldMap.here), 'cobalt', 'an Arena belongs to its city'); await closeMap();
  step('you-are-here: the mine marks the Ridge, an Arena marks its city');

  // 3) visiting: loading an outdoor map marks it, interiors do not
  await ev(() => { setup('lanternrest', 29, 26, 0); G.loadMap('evergreen'); G.loadMap('lodge'); });
  assert.deepEqual(await ev(() => [!!G.state.visited.evergreen, !!G.state.visited.lodge, !!G.state.visited.lanternrest]), [true, false, true]);
  step('visiting: outdoor maps are marked on load, interiors are not');

  // 4) ferries: refused with too few badges (nothing charged), too little money, and a real crossing
  const openFerry = async (from) => { await ev(f => G.runWorld(() => G.ferry(f)), from); await pressUntil(() => G.ferryDesk && G.scene === G.ferryDesk.scene && G.ui.fade.a === 0 && !G.ui.text, 20000, 'ferry desk'); };
  const leaveDesk = async () => { await pressUntil(() => G.ferryDesk && !G.ui.text && G.scene === G.ferryDesk.scene, 8000, 'desk again'); await key('x'); await pressUntil(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.text, 20000, 'back at the pier'); };
  const dockOf = id => ev(i => G.MAPS[i].dock, id);
  let d = await dockOf('driftwood');
  await ev(d => setup('driftwood', d.x, d.y, 0, null, { money: 5000, badges: 2, visited: ['driftwood'] }), d);
  const prices = await ev(() => G.ferryRoutes('driftwood').map(r => [r.to, r.price, r.badges]));
  assert.deepEqual(prices.map(p => p[0]).sort(), ['tidefall', 'verdant']); prices.forEach(p => { assert(p[1] >= 200 && p[1] <= 800 && p[1] % 50 === 0, 'ticket price in range: ' + p); assert.equal(p[2], 3); });
  await openFerry('driftwood'); await page.waitForTimeout(300); await shot('ferry-desk');
  await key('z'); let t = await pressUntil(() => G.ui.text && G.ui.text.lines.join(' ').includes('Arena Badges'), 5000, 'badge refusal');
  assert.match(t, /3 Arena Badges\. You have 2/); assert.equal(await ev(() => G.state.money), 5000, 'nothing charged'); assert.equal(await ev(() => G.world.mapId), 'driftwood');
  await leaveDesk();
  step('ferry: too few badges is refused with the reason and nothing is charged');

  await ev(d => setup('driftwood', d.x, d.y, 0, null, { money: 100, badges: 3, visited: ['driftwood'] }), d);
  await openFerry('driftwood'); await key('z'); t = await pressUntil(() => G.ui.text && /only have \$100/.test(G.ui.text.lines.join(' ')), 5000, 'money refusal');
  assert.equal(await ev(() => G.state.money), 100); await leaveDesk();
  step('ferry: too little money is refused and nothing is charged');

  await ev(d => setup('driftwood', d.x, d.y, 0, null, { money: 5000, badges: 3, visited: ['driftwood'] }), d);
  await openFerry('driftwood');
  const price = await ev(() => G.ferryDesk.routes[G.ferryDesk.sel].price), dest = await ev(() => G.ferryDesk.routes[G.ferryDesk.sel].to);
  await key('z');
  await until(() => G.ui.layers.length > 0 && G.ui.text && /Buy a ticket/.test(G.ui.text.lines.join(' ')), 6000, 'confirm'); await shot('ferry-confirm'); await key('z');   // YES
  await pressUntil(() => G.worldSail && G.worldSail.k > .15 && G.ui.fade.a === 0, 20000, 'sailing'); await page.waitForTimeout(600); await shot('sailing');
  await until(() => G.worldSail && G.worldSail.k > .6, 20000, 'mid-crossing'); await shot('sailing-mid');
  await pressUntil(() => G.world.mapId !== 'driftwood' && !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.text, 40000, 'arrival');
  const arr = await ev(() => { const p = G.world.p, m = G.world.map; return { map: G.world.mapId, x: p.x, y: p.y, dock: m.dock, money: G.state.money, visited: !!G.state.visited[G.world.mapId], walk: G.worldApi.canWalk(p.x, p.y, true) }; });
  assert.equal(arr.map, dest); assert.equal(arr.money, 5000 - price, 'the ticket was paid'); assert(arr.visited, 'the destination is marked visited'); assert(arr.walk);
  assert(Math.abs(arr.x - arr.dock.x) + Math.abs(arr.y - arr.dock.y) <= 2, `landed at the dock ${JSON.stringify(arr.dock)}: ${arr.x},${arr.y}`);
  await shot('ferry-arrived');
  step(`ferry: Driftwood to ${dest} for $${price}: sailing scene, charged, landed at ${arr.x},${arr.y} (dock ${arr.dock.x},${arr.dock.y}), marked visited`);
  // the return crossing is free of badge checks; Aurora needs the Lantern
  const back = await ev(() => G.ferryRoutes(G.world.mapId).map(r => [r.to, r.badges, r.lantern]));
  assert(back.some(r => r[0] === 'driftwood' && r[1] === 0), 'you can always sail home: ' + JSON.stringify(back));
  const au = await ev(() => G.ferryRoutes('frostmere')); assert(au.length === 1 && au[0].to === 'aurora' && au[0].lantern && au[0].badges === 8 && /8 Arena Badges/.test(au[0].why || ''), JSON.stringify(au));
  const au8 = await ev(() => { G.BADGES.forEach(b => G.state.flags['badge_' + b.id] = true); return G.ferryRoutes('frostmere')[0].why; }); assert.match(au8, /sealed/, 'with 8 badges the Lantern still blocks Aurora');
  assert.equal(await ev(() => { G.state.flags.lanternLit = true; return G.ferryRoutes('frostmere')[0].why; }), null, 'and with the Lantern relit the ferry sails');
  const mo = await ev(() => G.ferryRoutes('cobalt').concat(G.ferryRoutes('shore')).map(r => r.to)); assert.deepEqual(mo, ['moonlit', 'moonlit']);
  step('ferry routes: always a way home; Aurora needs 8 badges and the Lantern; Moonlit from Cobalt and the Shore');

  // 4b) a boat owner sails free (same destinations and requirements)
  d = await dockOf('driftwood');
  await ev(d => { setup('driftwood', d.x, d.y, 0, null, { money: 0, badges: 3, visited: ['driftwood'] }); G.vehicles.ownsBoat = () => true; }, d);
  await openFerry('driftwood'); await key('z');
  await until(() => G.ui.layers.length > 0 && !G.ui.text, 4000, 'boat choice'); await key('ArrowDown'); await key('z');   // SAIL YOUR BOAT
  await pressUntil(() => G.worldSail && G.ui.fade.a === 0, 20000, 'boat sailing'); await page.waitForTimeout(500); await shot('sailing-boat');
  await pressUntil(() => G.world.mapId !== 'driftwood' && !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.text, 40000, 'boat arrival');
  assert.equal(await ev(() => G.state.money), 0, 'sailing your own boat costs nothing'); assert.equal(await ev(() => G.world.mapId), 'verdant');
  await ev(() => { delete G.vehicles.ownsBoat; });
  step('ferry desk: a boat owner can SAIL YOUR BOAT at no cost (same requirements, same sailing scene, lands on the dock)');

  // 5) flight uses the illustrated map: visited places only, never the mine or places behind a badge gate
  await ev(() => { setup('lanternrest', 29, 26, 0, [[1, 30], [17, 20]], { visited: ['lanternrest', 'sunmeadow', 'frostmere'], badges: 1 }); });
  await ev(() => G.runWorld(() => G.travelMenu())); await until(() => G.ui.layers.length >= 2, 3000, 'travel menu');
  const fi = await ev(() => G.vehicles.menuItems.indexOf('FLY')); for (let k = 0; k < fi; k++) await key('ArrowDown', 40); await key('z');
  await until(() => G.vehicles._fly && G.scene === G.vehicles._fly.scene && G.ui.fade.a === 0, 5000, 'fly scene'); await page.waitForTimeout(600); await shot('fly-pick');
  const why = await ev(() => G.vehicles._fly.nodes.map(n => n.id));
  assert(!why.includes('mine') && why.length === 24, 'the picker lists the 24 places, never the mine');
  await ev(() => { const f = G.vehicles._fly; f.sel = f.nodes.findIndex(n => n.id === 'frostmere'); }); await page.waitForTimeout(200); await shot('fly-locked');
  await key('z'); await page.waitForTimeout(300); assert.equal(await ev(() => G.vehicles._fly.phase), 'pick', 'Frostmere is visited but needs 5 badges: refused');
  await ev(() => { const f = G.vehicles._fly; f.sel = f.nodes.findIndex(n => n.id === 'mirewood'); }); await key('z'); await page.waitForTimeout(300);
  assert.equal(await ev(() => G.vehicles._fly.phase), 'pick', 'an unvisited place is refused');
  await ev(() => { const f = G.vehicles._fly; f.sel = f.nodes.findIndex(n => n.id === 'lanternrest'); }); await key('ArrowLeft'); await page.waitForTimeout(150);
  assert.equal(await ev(() => G.vehicles._fly.nodes[G.vehicles._fly.sel].id), 'sunmeadow');
  await key('z'); await until(() => G.vehicles._fly && G.vehicles._fly.phase === 'fly', 3000, 'take off'); await page.waitForTimeout(1000); await shot('fly-flight');
  await until(() => G.world.mapId === 'sunmeadow' && G.scene === G.world.scene, 12000, 'landing'); await pressUntil(() => !G.world.busy && G.ui.fade.a === 0 && !G.ui.text, 20000, 'landed');
  const land = await ev(() => { const p = G.world.p, L = G.vehicles.landingFor('sunmeadow'); return { x: p.x, y: p.y, L, walk: G.worldApi.canWalk(p.x, p.y, true), warp: G.worldApi.tileWarp(p.x, p.y) }; });
  assert(land.walk && !land.warp && Math.abs(land.x - land.L.x) + Math.abs(land.y - land.L.y) <= 4, 'landed on the landing tile: ' + JSON.stringify(land)); await shot('landed');
  step(`flight: refuses a visited place behind a badge gate, an unvisited place; lands on Sunmeadow's landing tile (${land.x},${land.y})`);

  assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' / '));
  console.log('worldmap e2e: all passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
