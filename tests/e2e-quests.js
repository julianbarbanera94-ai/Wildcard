// Quests, journal and reputation: node tests/e2e-quests.js
// Quests start and move on by themselves from saved state, rewards are given exactly once (also across save/load),
// the journal opens from START, markers show on the map, and Test Mode's UNLOCK EVERYTHING finishes every quest and maxes reputation.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/quests-${n}.png` });
  const key = async (k, ms = 120) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
  const until = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } throw new Error('timeout ' + fn); };
  await key('z'); await key('z', 500);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 80);
  await until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 40000);
  await ev(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.push(G.makeCreature(1, 10)); G.loadMap('lanternrest'); G.placePlayer(29, 26, 0); G.scene = G.world.scene; G.world.busy = false; });
  await page.waitForTimeout(800);

  // 1) quests appear by themselves; finished steps are skipped
  let q = await ev(() => ({ lantern: G.state.quests.lantern, arenas: !!G.state.quests.arenas, lead: G.quest.lead().step.id, at: G.quest.step('lantern').at }));
  assert.equal(q.lantern.st, 'active'); assert.equal(q.lead, 'shards', 'the Bondling step is already done'); assert.equal(q.at, 'sunmeadow', 'marker points at the first missing shard'); assert(q.arenas);
  step('quests start themselves; the story lead skips steps already done and points at Sunmeadow');
  // 2) doing things out of order: win the mine shard first, then the meadow
  await ev(() => { G.state.flags.shard_mine = true; G.state.flags.shard_meadow = true; }); await page.waitForTimeout(800);
  assert.equal(await ev(() => G.quest.step('lantern').at), 'mirewood', 'with two shards won in any order, the marker moves to Mirewood');
  await ev(() => { G.state.flags.shard_marsh = true; G.state.flags.lanternLit = true; }); await page.waitForTimeout(800);
  assert.equal(await ev(() => G.quest.lead().step.id), 'joker');
  step('out-of-order progress: shards in any order, steps move on together');
  // 3) reputation from badges and shards, once each
  const r0 = await ev(() => ({ s: G.rep.get('south'), n: G.rep.get('north'), w: G.rep.get('west') }));
  assert.equal(r0.n, 15); assert.equal(r0.w, 15); assert.equal(r0.s, 15);
  await ev(() => { G.state.flags.badge_keystone = true; }); await page.waitForTimeout(1200);
  assert.equal(await ev(() => G.rep.get('south')), 35, 'Keystone Badge gives +20 South');
  await page.waitForTimeout(800); assert.equal(await ev(() => G.rep.get('south')), 35, 'and only once');
  assert.equal(await ev(() => G.state.quests.arenas.step), 1, 'first Badge step done');
  step('reputation: shards +15, a Badge +20 in its region, given once; Arena Challenge moves on');
  // 4) rewards exactly once, also after save and load
  const m0 = await ev(() => G.state.money);
  await ev(() => { G.state.flags.jokerCaught = true; }); await page.waitForTimeout(800);
  const m1 = await ev(() => G.state.money); assert.equal(m1 - m0, 5000, 'story reward paid');
  await ev(() => { G.quest.complete('lantern'); G.quest.complete('lantern'); G.saveGame(); }); assert.equal(await ev(() => G.state.money), m1, 'completing again pays nothing');
  await ev(() => { G.state = G.loadGame(); G.quest.tick(); G.quest.complete('lantern'); }); assert.equal(await ev(() => G.state.money), m1, 'not after a reload either');
  assert.equal(await ev(() => G.state.quests.lantern.st), 'done');
  step('quest rewards are paid exactly once, also after save and reload');
  // 5) the journal opens from START (item 7) and the map shows markers
  await ev(() => { G.state.quests = {}; G.state.once = {}; G.state.flags = { starter: true }; G.state.rep = {}; G.quest.tick(); G.scene = G.world.scene; G.world.busy = false; });
  await key('Enter', 300); for (let i = 0; i < 6; i++) await key('ArrowDown', 60); await key('z', 400);
  assert(await ev(() => G.ui.layers.length > 0), 'journal open'); await shot('journal');
  await key('ArrowRight'); await shot('journal-quests'); for (let i = 0; i < 5; i++) await key('ArrowRight'); await shot('journal-rep');
  await key('x', 300); await key('x', 300);
  assert.deepEqual(await ev(() => G.quest.markers()), await ev(() => ({ sunmeadow: 'main', stonebridge: 'side', homestead: 'side' })));
  await ev(() => { G.state.journal.markers = false; }); assert.deepEqual(await ev(() => G.quest.markers()), {}, 'markers can be hidden');
  await ev(() => { G.state.journal.markers = true; G.ui.layers.length = 0; G.closeText(); G.runWorld(() => G.worldMapScreen()); }); await page.waitForTimeout(1200); await shot('map-markers');
  await key('x', 600);
  step('JOURNAL in START opens with tabs (story, quests, ..., reputation); map markers show and can be hidden');
  // 6) Test Mode: UNLOCK EVERYTHING completes every quest and maxes reputation
  await page.waitForTimeout(400);
  await ev(() => { G.ui.layers.length = 0; G.closeText(); G.world.busy = false; G.scene = G.world.scene; G.state.cheats = { on: true, unlocked: true }; });
  const before = await ev(() => G.state.money);
  await ev(() => G.runWorld(() => G.settingsMenu()));
  await page.waitForTimeout(300); await key('ArrowDown'); await key('z', 400);   // TEST MODE (already unlocked)
  await key('z', 400);   // UNLOCK EVERYTHING
  for (let i = 0; i < 8; i++) await key('z', 150);
  const u = await ev(() => ({ all: G.quest.all().every(q => G.quest.done(q.id)), rep: G.REP_REGIONS.every(([r]) => G.rep.get(r) === 100), n: G.quest.all().length }));
  assert(u.all, 'every quest done'); assert(u.rep, 'every region at 100');
  step(`Test Mode UNLOCK EVERYTHING: all ${u.n} quests complete, every region at HERO`);
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
