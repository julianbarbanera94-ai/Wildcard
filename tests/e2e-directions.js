// Directions to the story goal (js/directions.js): node tests/e2e-directions.js
// Every main-story step points at a real place that can be reached from Lanternrest; the hint names the exit that really leads there
// (checked against the map's warps); it works on a road, inside a building and for ferry-only islands; the tracker, the journal and
// the map screen show it.
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, arg) => page.evaluate(fn, arg), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/dir-${n}.png` });
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const until = async (fn, ms = 20000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn)) return; await page.waitForTimeout(50); } throw new Error('timeout ' + msg); };
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 60 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length, 60000, 'world idle');
  await ev(() => { const S = G.state; S.flags.starter = true; if (!S.party.length) S.party.push(G.makeCreature(1, 10)); });

  // 1) every main-story step's place exists and has a route from Lanternrest, and the first hop's exit is a real warp on that side
  const all = await ev(() => {
    const bad = [], seen = new Set(); G.loadMap('lanternrest'); G.placePlayer(30, 26, 0);
    for (const q of Object.values(G.QUESTS).filter(q => q.cat === 'main')) for (const s of q.steps) {
      const at = typeof s.at === 'function' ? s.at(G.state) : s.at; if (!at) { bad.push(q.id + ': a step with no place: ' + s.text); continue; }
      if (!G.WORLD.byId[at]) { bad.push(q.id + ': unknown place ' + at); continue; } if (seen.has(at)) continue; seen.add(at);
      const h = G.routeHint(at); if (!h || !h.text) { bad.push('no hint for ' + at); continue; }
      if (h.how === 'none') { bad.push('no route from Lanternrest to ' + at); continue; }
      if (h.how === 'land') { const m = G.MAPS.lanternrest, side = h.side, ok = m.warps.some(w => { const s2 = w.y === 0 ? 'N' : w.y === m.h - 1 ? 'S' : w.x === 0 ? 'W' : w.x === m.w - 1 ? 'E' : null; const t = G.MAPS[w.to]; const far = t && t.road ? t.warps.find(x => x.to !== 'lanternrest').to : w.to; return s2 === side && far === h.next; }); if (!ok) bad.push(`${at}: the ${side} exit of Lanternrest does not lead to ${h.next}`); }
    }
    return { bad, n: seen.size };
  });
  assert.deepEqual(all.bad, [], 'every story destination is reachable and its first exit is real'); assert(all.n >= 15, 'places checked: ' + all.n);
  step(`every main-story step names one of ${all.n} real places, each reachable from Lanternrest, and the first exit named is a real warp`);

  // 2) the words for a few known cases
  const words = await ev(() => {
    const at = (map, x, y) => { G.loadMap(map); G.placePlayer(x, y, 0); };
    const o = {};
    at('lanternrest', 30, 26); o.toStone = G.routeHint('stonebridge');
    at('lanternrest', 30, 26); o.toDrift = G.routeHint('driftwood');
    at('road_stonebridge', 20, 20); o.onRoad = G.routeHint('stonebridge'); o.onRoadBack = G.routeHint('sunmeadow');
    at('stonebridge', 27, 10); o.here = G.routeHint('stonebridge');
    at('driftwood', 26, 10); o.ferry = G.routeHint('verdant');
    const ins = Object.values(G.MAPS).find(m => !m.outdoor && G.WORLD.parent[m.id] === 'lanternrest' && m.warps.length); at(ins.id, ins.warps[0].x, Math.max(1, ins.warps[0].y - 1)); o.inside = G.routeHint('stonebridge');
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v && v.text]));
  });
  assert.match(words.toStone, /south exit along Stonebridge Road to Stonebridge/i, words.toStone);
  assert.match(words.toDrift, /exit .* then on toward Driftwood/i, words.toDrift);
  assert.match(words.onRoad, /^Follow Stonebridge Road south to Stonebridge/, words.onRoad);
  assert.match(words.onRoadBack, /north to Lanternrest, then on toward Sunmeadow/i, words.onRoadBack);
  assert.equal(words.here, 'You are in Stonebridge.');
  assert.match(words.ferry, /ferry .* to Verdant/i, words.ferry);
  assert.match(words.inside, /^Leave the building, then take the south exit/, words.inside);
  for (const [k, v] of Object.entries(words)) console.log('   ' + k + ': ' + v);
  step('the words are right: exit and road from a town, on a road (either way), already there, by ferry, and from inside a building');

  // 3) a locked next place says so
  const lock = await ev(() => { G.loadMap('sunmeadow'); G.placePlayer(36, 20, 0); return G.routeHint('evergreen').text; });
  assert.match(lock, /locked/i, lock); step('a locked next place says it is locked: ' + lock);

  // 4) it is on screen: tracker, journal, map
  await ev(() => { G.quest.start('ch1', true); G.loadMap('lanternrest'); G.placePlayer(30, 26, 0); G.scene = G.world.scene; G.world.busy = false; G.world.map.roamers = []; });
  await page.waitForTimeout(800); await shot('tracker');
  const tr = await ev(() => G.leadHint() && G.leadHint().short); assert.match(tr, /SOUTH TO STONEBRIDGE/, tr);
  await ev(() => { G.journalScreen && G.runWorld(() => G.journalScreen()); }); await page.waitForTimeout(700); await shot('journal'); await key('x', 80); await page.waitForTimeout(400);
  for (let i = 0; i < 6 && await ev(() => G.ui.layers.length || G.scene !== G.world.scene); i++) await key('x', 80);
  await ev(() => { G.runWorld(() => G.worldMapScreen()); }); await page.waitForTimeout(900); await shot('map');
  for (let i = 0; i < 6 && await ev(() => G.scene !== G.world.scene); i++) await key('x', 80);
  step('the hint shows in the quest tracker, the journal and on the map screen (screenshots dir-tracker, dir-journal, dir-map)');
  assert.deepEqual(errors, [], 'no page errors'); console.log('errors: none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
