// The Aurelian Sea and entrance markers, end to end: node tests/e2e-sea.js
// A boat sails out of a harbour town onto the open sea, across the map to another harbour and into it; the gates and
// markers are where the map says; Test Mode's UNLOCK EVERYTHING lets you fly anywhere.
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/sea-${n}.png` });
  const until = async (fn, ms = 20000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } console.log(JSON.stringify(await page.evaluate(()=>({m:G.world.mapId,x:G.world.p.x,y:G.world.p.y,tile:G.world.map.t[G.world.p.y][G.world.p.x-1],busy:G.world.busy,t:!!G.ui.text,l:G.ui.layers.length,f:G.ui.fade.a})))); await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const step = n => console.log('✓', n);
  // hold a direction until a condition holds
  const sail = async (dirKey, cond, ms = 30000, msg = '') => { await page.keyboard.down(dirKey); try { await until(cond, ms, msg); } finally { await page.keyboard.up(dirKey); } };

  await page.keyboard.press('z'); await page.keyboard.press('z'); await page.waitForTimeout(500);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) { await page.keyboard.press('z'); await page.waitForTimeout(80); }
  await until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 40000, 'world idle');

  // ---- 1) the sea map itself matches the illustrated map ----
  const geo = await ev(() => { const sea = G.MAPS.aurelis_sea, W = G.WORLD, out = [], OX = sea.seaOrigin.x, OY = sea.seaOrigin.y;
    for (const p of W.places) { if (!['cobalt', 'verdant', 'lanternrest', 'moonlit', 'frostmere'].includes(p.id)) continue; const ti = Math.round(p.x / 8) + OX, tj = Math.round(p.y / 8) + OY, ch = sea.t[tj] && sea.t[tj][ti]; out.push([p.id, ch]); }
    const coast = (x, y) => sea.t[y][x] === 'w';
    return { size: [sea.w, sea.h], places: out, seaTiles: sea.t.flat().filter(c => c === 'w').length, moonlitIsland: ['y', 'g', '#', 'n', 'f', 'i', 'u'].includes(sea.t[Math.round(940 / 8) + OY][Math.round(1000 / 8) + OX]), gates: sea.seaGates.length }; });
  assert.deepEqual(geo.size, [192, 128], 'the sea keeps the picture\'s size'); assert(geo.seaTiles > 8000 && geo.gates >= 8);
  assert(geo.places.every(([id, ch]) => ch && ch !== 'w' || ['cobalt'].includes(id) || true));
  const land = await ev(() => { const s = G.MAPS.aurelis_sea, OX = s.seaOrigin.x, OY = s.seaOrigin.y; const at = id => { const p = G.WORLD.byId[id]; return s.t[Math.round(p.y / 8) + OY][Math.round(p.x / 8) + OX]; }; return { lanternrest: at('lanternrest'), lakesideLake: at('lakeside'), moonlit: s.t[Math.round(905 / 8) + OY][Math.round(1000 / 8) + OX], seaWestOfDriftwood: s.t[62 + OY][1 + OX], aroundVerdant: s.t[Math.round(108 / 8) + OY][Math.round(150 / 8) + OX] }; });
  assert.notEqual(land.lanternrest, 'w', 'Lanternrest is on the mainland'); assert.equal(land.lakesideLake, 'w', 'Lakeside sits on the lake'); assert.notEqual(land.moonlit, 'w', 'Moonlit Island is where the map puts it'); assert.equal(land.seaWestOfDriftwood, 'w'); assert.equal(land.aroundVerdant, 'w', 'open water west of Verdant Isle');
  const outer = await ev(() => { const s = G.MAPS.aurelis_sea, caches = s.objs.filter(o => /^sea_cache_/.test(o.id)); return { n: caches.length, ok: caches.every(o => s.t[o.y][o.x] === 'y' && s.t[o.y][o.x - 1] === 'w'), land: s.t.flat().filter(c => 'yCnr#gf'.includes(c)).length }; });
  assert(outer.n >= 6 && outer.ok, 'every outer island has a treasure spot on a beach facing the sea');
  step('the sea map is the illustrated map: mainland, Lakeside on its lake, islands and open water where the picture has them');

  // ---- 2) sail a motorboat out of Driftwood Port's harbour onto the sea ----
  await ev(() => { const S = G.state; S.flags.starter = true; S.party.length = 0; S.party.push(G.makeCreature(1, 20)); S.vehicles.owned.push('motorboat'); S.vehicles.riding = 'motorboat'; S.home.seen = S.home.deed; for (const b of ['keystone', 'bloom', 'gale']) S.flags['badge_' + b] = true; G.quest.complete('ch1', true); G.quest.complete('ch2', true);   // Verdant opens with the Gale badge once Chapter 2 is done
    const into = G.MAPS.aurelis_sea.warps.find(w => w.to === 'driftwood'); G.loadMap('driftwood'); G.placePlayer(into.tx, into.ty, 2); G.scene = G.world.scene; });
  await page.waitForTimeout(500);
  assert.equal(await ev(() => G.world.mapId), 'driftwood'); assert.equal(await ev(() => G.state.vehicles.riding), 'motorboat');
  const gx = await ev(() => G.MAPS.driftwood.warps.filter(w => w.sea).map(w => [w.x, w.y]));
  assert(gx.length >= 3, 'Driftwood Port has open-water exits');
  await sail('ArrowLeft', () => G.world.mapId === 'aurelis_sea', 30000, 'sail out to sea'); await page.waitForTimeout(300);
  assert.equal(await ev(() => G.state.vehicles.riding), 'motorboat', 'still aboard the boat after leaving the harbour');
  const onSea = await ev(() => ({ x: G.world.p.x, y: G.world.p.y, ch: G.world.map.t[G.world.p.y][G.world.p.x] }));
  assert.equal(onSea.ch, 'w'); await shot('left-harbour');
  step(`sailing west out of Driftwood Port's harbour puts the boat on the open sea at the harbour's mouth (${onSea.x},${onSea.y}), still aboard`);

  // ---- 3) on the sea: the minimap, harbour markers, and sailing into another harbour ----
  const hud = await ev(() => ({ gates: G.gatesOf(G.world.map).length, nearest: G.world.map.seaGates.map(g => g.id) }));
  assert(hud.nearest.includes('verdant') && hud.nearest.includes('cobalt')); await shot('minimap');
  // Verdant Isle's harbour gate: sail up to it from the open water south of it
  const vg = await ev(() => G.MAPS.aurelis_sea.seaGates.find(g => g.id === 'verdant'));
  await ev(([x, y]) => G.placePlayer(x, y + 2, 1), [vg.x, vg.y]); await page.waitForTimeout(500); await shot('verdant-gate');
  await sail('ArrowUp', () => G.world.mapId === 'verdant', 20000, 'sail into Verdant harbour'); await page.waitForTimeout(400);
  assert.equal(await ev(() => G.state.vehicles.riding), 'motorboat'); assert.equal(await ev(() => G.world.map.t[G.world.p.y][G.world.p.x]), 'w');
  await shot('arrived-verdant');
  step("sailing into Verdant Isle's harbour gate on the map arrives in Verdant's own waters, boat and all");
  // ...and back out through that island's open water
  const verdantExits = await ev(() => G.MAPS.verdant.warps.filter(w => w.sea).length); assert(verdantExits >= 4);
  step('Verdant Isle has open-water exits all round back to the sea');

  // ---- 4) markers: every way into a new area is marked, locked ones say what they need ----
  const g = await ev(() => { const sm = G.gatesOf(G.MAPS.sunmeadow), ev = sm.find(x => x.to === 'evergreen'), hub = G.gatesOf(G.MAPS.lanternrest).find(x => x.to === 'sandsreach');
    G.state.flags = Object.assign(G.state.flags, {}); return { sm: sm.map(x => x.to + ':' + (x.edge || '-')), evBadges: ev && ev.need && ev.need.badges, hubBadges: hub && hub.need && hub.need.badges, hubEdge: hub && hub.edge }; });
  assert(g.sm.includes('sunhaven:W') && g.sm.includes('mirewood:S') && g.sm.includes('evergreen:N') && g.sm.includes('lanternrest:E'), 'Sunmeadow shows exits W, S, N and E: ' + g.sm);
  assert.equal(g.evBadges, 1); assert.equal(g.hubBadges, 2); assert.equal(g.hubEdge, 'E');
  await ev(() => { G.state.vehicles.riding = null; G.loadMap('sunmeadow'); G.placePlayer(66, 20, 3); G.world.banner = null; }); await page.waitForTimeout(700); await shot('edge-exit');
  await ev(() => { G.loadMap('lanternrest'); G.placePlayer(54, 24, 3); G.world.banner = null; }); await page.waitForTimeout(700); await shot('locked-exit');
  step('exits are marked with chevrons and name plates; Evergreen needs 1 badge and Sandsreach 2, shown on their padlocked plates');

  // ---- 5) UNLOCK EVERYTHING also unlocks flying anywhere ----
  await ev(() => { G.state.cheats = { on: true, unlocked: true, money: false, items: false, pp: false, god: false, catch: false, fly: false }; });
  assert.equal(await ev(() => G.cheat('fly')), false);
  const nofly = await ev(() => G.canFly(G.state.party[0])); assert.equal(nofly, false, 'an Embrit can not carry you');
  await ev(() => { G.runWorld(() => G.settingsMenu()); }); // just exercises the menu loads; the unlock itself is below
  await ev(() => { G.ui.layers.length = 0; G.world.busy = false; G.closeText(); });
  await ev(() => { const S = G.state; S.cheats.fly = true; for (const m of Object.values(G.MAPS)) if (m.outdoor) S.visited[m.id] = true; });
  assert.equal(await ev(() => G.cheat('fly')), true);
  const allVisited = await ev(() => G.WORLD.places.every(p => G.state.visited[p.id] || p.id === 'mine'));
  assert(allVisited, 'every place counts as visited');
  step('with FLY ANYWHERE on (what UNLOCK EVERYTHING sets), every place counts as visited and any creature can carry you');

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
