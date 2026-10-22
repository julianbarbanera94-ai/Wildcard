// Field abilities: node tests/e2e-field.js
// LIGHT, CLIMB and DIG with a creature or a tool; hidden nooks with chests; rewards once; the discovery quest; forge recipes.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/field-${n}.png` });
  const key = async (k, ms = 150) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
  const until = async (fn, ms = 20000, msg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout ' + (msg || fn)); };
  const idle = () => until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 20000, 'idle');
  const talk = async () => { await key('z', 300); for (let i = 0; i < 12 && await ev(() => !!G.ui.text || G.world.busy); i++) await key('z', 200); await idle(); };
  const lastText = () => ev(() => window.__said.join(' | '));
  await key('z'); await key('z', 500);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 80);
  await idle();
  await ev(() => { window.__said = []; const s0 = G.worldApi.says; G.worldApi.says = l => { window.__said.push([].concat(l).join(' ')); return s0(l); };
    G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.push(G.makeCreature(1, 10)); G.quest.tick(); });
  const go = (id, face) => ev(([id, face]) => { const s = G.FIELD_SPOTS.find(s => s.id === id); G.loadMap(s.map); const [x, y] = face === 'in' ? [s.b[0] * 2 - s.a[0], s.b[1] * 2 - s.a[1]] : s.a; G.placePlayer(x, y, face === 'in' ? [1, 0, 3, 2][s.d] : s.d); G.scene = G.world.scene; G.world.busy = false; window.__said.length = 0; }, [id, face]);
  const spot = id => ev(id => G.FIELD_SPOTS.find(s => s.id === id), id);
  const pos = () => ev(() => [G.world.p.x, G.world.p.y]);

  // 1) LIGHT with a Fire creature: the dark gap in Sunmeadow opens, the chest inside pays once
  assert.deepEqual(await ev(() => [!!G.fieldHelper('light'), !!G.fieldHelper('climb'), !!G.fieldHelper('dig')]), [true, false, false], 'a Lv 10 Embrit can light, not climb or dig');
  await go('sm_hollow'); await page.waitForTimeout(300); await shot('dark-gap');
  assert.equal(await ev(() => G.worldApi.canWalk(...(() => { const s = G.FIELD_SPOTS.find(s => s.id === 'sm_hollow'); return s.b; })())), false, 'the gap is blocked');
  await talk(); assert.match(await lastText(), /lit up the darkness/);
  const s1 = await spot('sm_hollow');
  assert(await ev(([x, y]) => G.worldApi.canWalk(x, y), s1.b), 'the gap is open now');
  const k = [s1.b[0] - s1.a[0], s1.b[1] - s1.a[1]];
  await ev(([x, y, d]) => { G.placePlayer(x, y, d); }, [s1.c[0] - k[0], s1.c[1] - k[1], s1.d]); await page.waitForTimeout(200);
  const m0 = await ev(() => G.state.bag['Pulse Orb'] || 0); await talk();
  assert.equal((await ev(() => G.state.bag['Pulse Orb'])) - m0, 3, 'the chest held 3 Pulse Orbs'); await shot('chest');
  await talk(); assert.match(await lastText(), /empty chest/); assert.equal((await ev(() => G.state.bag['Pulse Orb'])) - m0, 3, 'and only once');
  step('LIGHT: a Fire creature lights the dark gap for good; the hidden chest pays once');
  // 2) CLIMB: refused without help, then with Climbing Gear over the rock face and back
  await go('sb_ledge'); await page.waitForTimeout(200); const a0 = await pos(); await talk();
  assert.match(await lastText(), /Rock, Ground or Fighting creature.*Climbing Gear/); assert.deepEqual(await pos(), a0, 'no help: you stay put');
  await ev(() => { G.state.bag['Climbing Gear'] = 1; }); await go('sb_ledge'); await talk();
  const s2 = await spot('sb_ledge'); assert.deepEqual(await pos(), [s2.b[0] * 2 - s2.a[0], s2.b[1] * 2 - s2.a[1]], 'climbed up onto the ledge'); await shot('ledge');
  await talk(); assert.match(await lastText(), /hidden chest on a hidden ledge/);
  await go('sb_ledge', 'in'); await talk(); assert.deepEqual(await pos(), s2.a, 'and climbed back down');
  step('CLIMB: without a climber or gear you are told what would help; Climbing Gear takes you up the ledge and back');
  // 3) DIG with a Ground creature, once
  await ev(() => { G.state.party.push(G.makeCreature(6, 12)); });
  const sd = await spot('sm_dig');
  await ev(([x, y]) => { G.loadMap('sunmeadow'); G.placePlayer(x, y + 1, 1); G.scene = G.world.scene; G.world.busy = false; }, sd.at); await page.waitForTimeout(200); await shot('soil');
  const c0 = await ev(() => G.state.bag['Copper Ore'] || 0); await talk();
  assert.equal((await ev(() => G.state.bag['Copper Ore'])) - c0, 4); assert.match(await lastText(), /dug into the soft soil/);
  await talk(); assert.equal((await ev(() => G.state.bag['Copper Ore'])) - c0, 4, 'nothing more to dig');
  step('DIG: a Ground creature digs up 4 Copper Ore from soft soil, once');
  // 4) the discovery quest, reputation, forge recipes
  await page.waitForTimeout(800);
  const q = await ev(() => ({ step: G.state.quests.hidden && G.state.quests.hidden.step, west: G.rep.get('west'), south: G.rep.get('south'), rec: ['climbgear', 'shovel', 'glowlamp'].every(id => G.RECIPES.forge.some(r => r.id === id)) }));
  assert.equal(q.step, 2, 'found one of each kind'); assert(q.west >= 6 && q.south >= 3, 'chests and digs raise reputation'); assert(q.rec, 'forge recipes for the tools');
  step('Off the Beaten Path quest moves on; each find gives +3 reputation; the forge makes Climbing Gear, a Shovel and a Glow Lamp');
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
