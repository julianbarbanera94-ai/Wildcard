// The wild roads between neighbouring cities, end to end: node tests/e2e-roads.js
// Each road (js/maps/zz_roads.js) is entered from one place, walked tile by tile to its far end and left into the other place; the places
// no longer open straight into each other; the gate rule still holds at the far end; trainers and wild encounters are on the road.
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
  const ev = (fn, arg) => page.evaluate(fn, arg), step = n => console.log('✓', n);
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const until = async (fn, ms = 20000, msg = '', arg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn, arg)) return; await page.waitForTimeout(50); } throw new Error('timeout waiting for ' + msg); };
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 60 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length, 60000, 'world idle');
  await ev(() => { const S = G.state; S.flags.starter = true; S.party.length = 0; S.party.push(G.makeCreature(1, 40)); S.money = 5000; });
  const KEYS = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'], VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]];
  const idle = () => until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 30000, 'world idle');
  const here = () => ev(() => [G.world.mapId, G.world.p.x, G.world.p.y]);
  // go through the exit of `from` that leads to `to`, by stepping onto its warp tile
  const enter = async (from, to) => {
    await ev(([from, to]) => { const w = G.MAPS[from].warps.find(w => w.to === to), V = [[0, 1], [0, -1], [-1, 0], [1, 0]][w.dir]; G.loadMap(from); G.placePlayer(w.x - V[0], w.y - V[1], w.dir); G.scene = G.world.scene; G.world.busy = false; G.world.map.roamers = []; }, [from, to]);
    await page.waitForTimeout(500); const d = await ev(([from, to]) => G.MAPS[from].warps.find(w => w.to === to).dir, [from, to]);
    await key(KEYS[d], 400); if (process.env.DEBUG) console.log('after enter key', await here(), await ev(() => [G.world.busy, !!G.ui.text, G.ui.text && G.ui.text.lines.join(' ')].join()));
    await until(([to]) => G.world.mapId === to, 8000, 'entering ' + to, [to]);
  };
  // walk from the player's tile to the warp tile that leads to `to`: each step re-plans a breadth-first search over walkable tiles
  const nextDir = to => ev(([to]) => {
    const m = G.world.map, P = G.world.p, goal = m.warps.filter(w => w.to === to).map(w => w.x + ',' + w.y), key = (x, y) => x + ',' + y;
    const first = new Map([[key(P.x, P.y), -1]]); let q = [[P.x, P.y]];
    while (q.length) { const nx = []; for (const [x, y] of q) for (const [d, a, b] of [[0, 0, 1], [1, 0, -1], [2, -1, 0], [3, 1, 0]]) { const X = x + a, Y = y + b, k = key(X, Y); if (first.has(k) || X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue; const f = first.get(key(x, y)) === -1 ? d : first.get(key(x, y)); if (goal.includes(k)) return f; if (!G.worldApi.canWalk(X, Y) || G.worldApi.tileWarp(X, Y) || G.worldApi.tileAt(X, Y) === 'G') continue; first.set(k, f); nx.push([X, Y]); } q = nx; }
    return null;
  }, [to]);
  const walk = async (to, stopOnText) => {
    const start = (await here())[0], T0 = Date.now();
    for (let n = 0; n < 500; n++) {
      if ((await here())[0] !== start) return 'arrived';
      if (stopOnText && await ev(() => !!G.ui.text || G.world.busy)) return 'blocked';
      const d = await nextDir(to); assert(d !== null, 'a walkable way to the exit towards ' + to);
      const before = await here(); await page.keyboard.down(KEYS[d]);
      const t0 = Date.now(); while (Date.now() - t0 < 1500) { const now = await here(); if (now.join() !== before.join()) break; await page.waitForTimeout(12); }
      await page.keyboard.up(KEYS[d]); await page.waitForTimeout(20);
      if (process.env.DEBUG && (await here()).join() === before.join()) { console.log('STUCK', before, d, await ev(([x, y, d]) => { const V = [[0, 1], [0, -1], [-1, 0], [1, 0]][d], X = x + V[0], Y = y + V[1]; return JSON.stringify([G.worldApi.tileAt(X, Y), G.worldApi.canWalk(X, Y), G.worldApi.canStep(X, Y), G.worldApi.npcAt(X, Y) && 'npc', G.worldApi.objAt(X, Y) && 'obj', G.worldApi.roamAt(X, Y) && 'roam', G.world.p.dir, G.world.p.moving, G.world.busy, G.ui.layers.length, !!G.ui.text, G.scene === G.world.scene]); }, [before[1], before[2], d])); throw new Error('stuck'); }
      for (let i = 0; i < 40 && await ev(() => G.world.p.moving); i++) await page.waitForTimeout(10);
      if (process.env.DEBUG && n % 10 === 9) console.log('step', n, Date.now() - T0, 'ms', await here());
    }
    throw new Error('did not reach the exit towards ' + to);
  };
  if (process.env.DEBUG) setInterval(async () => { try { console.log('at', JSON.stringify(await here()), await ev(() => [G.world.busy, !!G.ui.text, G.scene === G.world.scene, G.ui.layers.length].join())); } catch (e) {} }, 4000);
  const ROADS = [['lanternrest', 'road_stonebridge', 'stonebridge'], ['sunhaven', 'road_coast', 'driftwood'], ['cobalt', 'road_cobalt', 'sandsreach'], ['frostmere', 'road_frostmere', 'glacier']];
  // 1) structure: the places no longer open into each other, the roads have wild grass, trainers, items, a sign and a traveller
  const info = await ev(r => r.map(([a, road, b]) => { const m = G.MAPS[road]; return { road, direct: G.MAPS[a].warps.some(w => w.to === b) || G.MAPS[b].warps.some(w => w.to === a), grass: m.t.flat().filter(c => c === 'G').length, trainers: m.npcs.filter(n => n.trainer).length, talk: m.npcs.filter(n => !n.trainer && n.lines).length, items: m.objs.filter(o => o.item).length, signs: m.objs.filter(o => o.fn).length, size: m.w * m.h, enc: m.enc.length }; }), ROADS);
  for (const i of info) { assert(!i.direct, i.road + ': the two places still touch'); assert(i.grass > 150 && i.trainers >= 2 && i.talk === 1 && i.items >= 3 && i.signs >= 2 && i.enc >= 6, JSON.stringify(i)); assert(i.size >= 2000, i.road + ' is a real stretch of land'); }
  step('four roads replace the direct exits: wild grass, trainers, items, signs and a traveller on each');
  // 2) walk each road end to end (trainers stay home: their fights are covered elsewhere); the far place's gate is open here
  await ev(() => { const S = G.state; for (const b of (G.BADGES || [])) S.flags['badge_' + b.id] = true; for (const c of ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8']) G.quest.complete(c, true); S.money = 5000; for (const [r] of [['road_stonebridge'], ['road_coast'], ['road_cobalt'], ['road_frostmere']]) G.MAPS[r].npcs = G.MAPS[r].npcs.filter(n => !n.trainer); });
  for (const [a, road, b] of ROADS) {
    await enter(a, road); await idle(); await ev(() => { G.world.map.roamers = []; });
    const arr = await here(); assert.equal(arr[0], road, 'arrived on ' + road);
    const t0 = Date.now(); await walk(b); if (process.env.DEBUG) console.log('walked', Date.now() - t0, 'ms, now at', await here()); await until(([b]) => G.world.mapId === b, 15000, 'leaving ' + road + ' into ' + b, [b]);
    step(`${a} > ${road} > ${b}: walked the road end to end in ${Math.round((Date.now() - t0) / 1000)} s`);
    await idle(); await ev(() => { G.world.map.roamers = []; });
    // and straight back
    await walk(road); await until(([road]) => G.world.mapId === road, 15000, 'coming back onto ' + road, [road]);
    await idle();
  }
  // 3) the gate holds at the far end: a fresh save cannot walk off the Cobalt Flats into Sandsreach, and is told why
  await ev(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.push(G.makeCreature(1, 40)); S.money = 5000; });
  await enter('cobalt', 'road_cobalt'); await idle(); await ev(() => { G.world.map.roamers = []; });
  assert.equal(await walk('sandsreach', true), 'blocked', 'the gate speaks'); await page.waitForTimeout(500); for (let i = 0; i < 12 && await ev(() => G.world.busy || !!G.ui.text); i++) await key('z', 60);
  assert.equal((await here())[0], 'road_cobalt', 'the road does not let you into Sandsreach without the badges and chapter');
  assert.match(await ev(() => G.access.why('sandsreach', 'cobalt') || ''), /./, 'the gate says why');
  // and the other way: from Sandsreach (visited by now) the Flats do not let a fresh save into Cobalt City
  await ev(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.push(G.makeCreature(1, 40)); S.money = 5000; });
  await enter('sandsreach', 'road_cobalt'); await idle(); await ev(() => { G.world.map.roamers = []; });
  assert.equal(await walk('cobalt', true), 'blocked', 'the gate speaks'); await page.waitForTimeout(500); for (let i = 0; i < 12 && await ev(() => G.world.busy || !!G.ui.text); i++) await key('z', 60);
  assert.equal((await here())[0], 'road_cobalt', 'the road does not let you into Cobalt City without the badges and chapter');
  step('the gate rule still stops you at either end of a road (Cobalt Flats: into Sandsreach and into Cobalt City)');
  assert.deepEqual(errors, [], 'no page errors'); console.log('errors: none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
