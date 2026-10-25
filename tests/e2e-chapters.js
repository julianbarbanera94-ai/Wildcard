// The longer Chapters 5 to 8 (js/chapters_more.js): node tests/e2e-chapters.js
// Each chapter has its new steps in order, the people and objects for them appear only when the story reaches them, using them moves the
// story on, and the directions point at the new places (Cobalt Flats, Frostmere Approach, the Emberfall cave, Cloudpeak).
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
  const ev = (fn, arg) => page.evaluate(fn, arg), step = n => console.log('✓', n);
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 60 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  // quiet helpers: dialogue and trust succeed at once, so the test exercises the story logic, not the dialogue boxes
  await ev(() => { G.worldApi.says = async () => {}; G.trust = async () => true; const S = G.state; S.flags.starter = true; if (!S.party.length) S.party.push(G.makeCreature(1, 40)); window.__q = id => G.quest.step(id) && G.quest.step(id).id; });
  const steps = await ev(() => ['ch5', 'ch6', 'ch7', 'ch8'].map(id => G.QUESTS[id].steps.map(s => s.id)));
  assert.deepEqual(steps, [['first', 'both', 'courier', 'pipemap', 'machine', 'badges'], ['pass', 'tam', 'brann', 'cache', 'badge', 'aurora', 'shard'], ['go', 'cage', 'scout', 'pyrra', 'elite', 'machine'], ['climb', 'allies', 'vesper', 'light']]);
  step('chapters 5 to 8 now have 6, 7, 6 and 4 steps (were 4, 5, 4 and 3)');
  const use = (map, pred) => ev(([map, pred]) => { const m = G.MAPS[map], f = new Function('o', 'return ' + pred); const o = [...m.npcs, ...m.objs].find(o => f(o)); if (!o) return 'missing'; if (o.hide && o.hide()) return 'hidden'; return (o.talk || o.fn)().then(() => 'ok'); }, [map, pred]);
  const hint = to => ev(([from, to]) => { G.loadMap(from); G.placePlayer(G.MAPS[from].landing ? G.MAPS[from].landing.x : 30, G.MAPS[from].landing ? G.MAPS[from].landing.y : 20, 0); return G.routeHint(to).text; }, to);
  // Chapter 5
  await ev(() => { for (const c of ['ch1', 'ch2', 'ch3', 'ch4']) G.quest.complete(c, true); G.quest.start('ch5', true); });
  assert.equal(await use('road_cobalt', "o.trainer && o.trainer.id === 'ashen_flats'"), 'hidden', 'the courier waits until a siphon is shut');
  await ev(() => { const f = G.state.flags; f.ashen_sr = f.ashen_cb = f.ch5_sr = f.ch5_cb = true; }); await page.waitForTimeout(600);
  assert.equal(await ev(() => window.__q('ch5')), 'courier');
  assert.match(await hint(['cobalt', 'road_cobalt']), /north exit onto Cobalt Flats/, 'from Cobalt the way is onto the Flats');
  assert.match(await hint(['lanternrest', 'road_cobalt']), /then onto Cobalt Flats/);
  await ev(() => { G.state.flags.ashen_flats = true; }); await page.waitForTimeout(600);   // the courier beaten (trainer win sets this flag)
  assert.equal(await use('road_cobalt', "o.prompt === 'Look'"), 'ok'); await page.waitForTimeout(600);
  assert.equal(await ev(() => window.__q('ch5')), 'machine', 'the pipe map sends you on to the Badlands');
  step('Chapter 5: the courier appears after the siphons, the dropped map is read, the story moves on to the Badlands; directions lead onto Cobalt Flats');
  // Chapter 6
  await ev(() => { G.quest.complete('ch5', true); G.quest.start('ch6', true); G.state.visited.glacier = true; });
  assert.equal(await use('road_frostmere', "o.style && o.style.hat === '#8a3a3a' && o.talk"), 'hidden', 'Brann waits until Tam has joined');
  await ev(() => { G.state.flags.ch6_tam = true; }); await page.waitForTimeout(600); assert.equal(await ev(() => window.__q('ch6')), 'brann');
  assert.equal(await use('road_frostmere', "o.style && o.style.hat === '#8a3a3a' && o.talk"), 'ok'); await page.waitForTimeout(600);
  assert.equal(await ev(() => window.__q('ch6')), 'cache');
  const pots = await ev(() => G.state.bag['Super Potion'] || 0);
  assert.equal(await use('road_frostmere', "o.prompt === 'Look'"), 'ok'); await page.waitForTimeout(600);
  assert.equal(await ev(() => window.__q('ch6')), 'badge'); assert.equal(await ev(() => G.state.bag['Super Potion'] || 0), pots + 3);
  step('Chapter 6: Brann appears once Tam is with you, points to the cache, the cache gives supplies and the story moves on to the Rime Badge');
  // Chapter 7
  await ev(() => { G.quest.complete('ch6', true); G.quest.start('ch7', true); G.state.visited.emberfall = true; }); await page.waitForTimeout(600);
  assert.equal(await ev(() => window.__q('ch7')), 'cage');
  assert.match(await hint(['emberfall', 'cave_emberfall']), /Find the way into .*, here in Emberfall/i);
  assert.equal(await use('emberfall', "o.trainer && o.trainer.id === 'ashen_scout'"), 'hidden', 'the scout waits until the cage is open');
  assert.equal(await use('cave_emberfall', "o.prompt === 'Look' && o.hide && !o.pedestal"), 'ok'); await page.waitForTimeout(600);
  assert.equal(await ev(() => window.__q('ch7')), 'scout');
  await ev(() => { G.state.flags.ashen_scout = true; }); await page.waitForTimeout(600); assert.equal(await ev(() => window.__q('ch7')), 'pyrra');
  step('Chapter 7: free the caged creatures in the Emberfall cave (trust), then the gate scout, then Pyrra as before');
  // Chapter 8
  await ev(() => { G.quest.complete('ch7', true); G.quest.start('ch8', true); G.state.visited.cloudpeak = true; }); await page.waitForTimeout(600);
  assert.equal(await ev(() => window.__q('ch8')), 'allies');
  for (const hat of ['#2a8a8a', '#ffb040']) assert.equal(await use('cloudpeak', `o.style && o.style.hat === '${hat}' && o.talk && !o.trainer && o.y > 30`), 'ok');
  assert.equal(await ev(() => window.__q('ch8')), 'allies', 'two of three is not enough');
  assert.equal(await use('cloudpeak', "o.style && o.style.hair === '#c0c0d0' && o.talk && o.y > 30"), 'ok'); await page.waitForTimeout(600);
  assert.equal(await ev(() => window.__q('ch8')), 'vesper');
  step('Chapter 8: gather Tam, Pyrra and Kade at the foot of Cloudpeak, then Vesper as before');
  // the people stand on walkable ground
  const bad = await ev(() => { const out = []; for (const id of ['road_cobalt', 'road_frostmere', 'cave_emberfall', 'emberfall', 'cloudpeak']) { const m = G.MAPS[id]; for (const o of [...m.npcs, ...m.objs]) if (G.TILES[m.t[o.y][o.x]].solid && !o.fn) out.push(id + ' ' + o.x + ',' + o.y); } return out; });
  assert.deepEqual(bad, [], 'nobody stands inside a wall');
  assert.deepEqual(errors, [], 'no page errors'); console.log('errors: none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
