// More optional quests (Phase 8): node tests/e2e-threads2.js
// Who Took the Tomatoes (both choices), Lantern Night Lights, Bridge Repairs (materials and cash), The Cobalt Cup,
// Lost Little Pilfet (return and keep), A Salve for the Hermit. Each records its outcome and the world changes.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/threads2-${n}.png` });
  const key = async (k, ms = 120) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
  const until = async (fn, ms = 30000, msg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout ' + (msg || fn)); };
  const idle = () => until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 60000, 'idle');
  const menu = () => ev(() => { const l = G.ui.layers[G.ui.layers.length - 1]; return l && l.items ? l.items.slice() : null; });
  // talk to whoever is in front; pick[] answers the menus in order (by label); mash through everything else
  const talk = async (pick = []) => {
    await key('z', 300);
    for (let i = 0; i < 900; i++) {
      if (await ev(() => !G.world.busy && G.scene === G.world.scene && !G.ui.text && !G.ui.layers.length)) break;
      const items = await menu();
      if (items && pick.length && items.includes(pick[0])) { const n = items.indexOf(pick.shift()); for (let j = 0; j < n; j++) await key('ArrowDown', 60); await key('z', 250); continue; }
      await key('z', 90);
    }
    await idle(); await page.waitForTimeout(450);
  };
  const at = (map, x, y, dir) => ev(([map, x, y, dir]) => { G.loadMap(map); G.placePlayer(x, y, dir); G.scene = G.world.scene; G.world.busy = false; G.world.banner = null; }, [map, x, y, dir]);
  const fresh = () => ev(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; const c = G.makeCreature(1, 60); c.starter = true; c.moves.sort((a, b) => (G.MOVES[b.id].pow || 0) - (G.MOVES[a.id].pow || 0)); S.party.push(c); Object.assign(S.flags, { starter: true, orrinTold: true, wrenTips: true, tam1: true }); S.day = 1; });
  await key('z'); await key('z', 500);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 80);
  await idle(); await fresh();
  const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;

  const bag = (k) => ev(k => G.state.bag[k] || 0, k);
  // ---- Who Took the Tomatoes: give them a patch ----
  await at('lanternrest', 18, 11, UP); await talk(); assert(await ev(() => G.quest.active('tomato')));
  await at('lanternrest', 17, 13, UP); await shot('tomato-clue'); await talk(); await at('lanternrest', 19, 14, UP); await talk(); await at('lanternrest', 14, 12, UP); await talk();
  await page.waitForTimeout(700); assert.equal(await ev(() => G.quest.step('tomato').id), 'decide');
  await at('lanternrest', 16, 11, UP); await shot('fluffur'); await talk(['GIVE THEM A PATCH']); assert(await ev(() => G.state.flags.th_tom_share && G.state.party.some(c => c.id === 10 && c.befriended)), 'a Fluffur came home');
  await at('lanternrest', 18, 11, UP); const s0 = await bag('Tomato Seeds'); await talk(); assert(await ev(() => G.quest.done('tomato'))); assert.equal((await bag('Tomato Seeds')) - s0, 3);
  step('Who Took the Tomatoes: three clues point to a Fluffur family; give them a patch of their own, one joins you, Dilla shares her garden');
  // ...or the scarecrow
  await fresh(); await at('lanternrest', 18, 11, UP); await talk(); for (const [x, y] of [[17, 13], [19, 14], [14, 12]]) { await at('lanternrest', x, y, UP); await talk(); }
  await at('lanternrest', 16, 11, UP); await talk(['BUILD A SCARECROW']); const m1 = await ev(() => G.state.money); await at('lanternrest', 18, 11, UP); await talk();
  assert.equal((await ev(() => G.state.money)) - m1, 1600); assert(await ev(() => /scarecrow/.test(G.state.quests.tomato.outcome)));
  step('...or build a scarecrow: $1,600, and the Fluffur go hungry');
  // ---- Lantern Night Lights ----
  await fresh(); await at('lanternrest', 31, 29, UP); await talk(); assert(await ev(() => G.quest.active('lights')));
  await ev(() => { G.state.bag.Glowcap = 3; G.state.bag.Honey = 3; G.state.bag.Wool = 2; }); await talk(); assert(await ev(() => !G.state.flags.th_lights_done), 'one Wool short');
  await ev(() => { G.state.bag.Wool = 3; }); await talk(['HAND IT OVER']); assert(await ev(() => G.state.flags.th_lights_done && !G.state.bag.Glowcap && G.quest.done('lights')));
  await at('lanternrest', 24, 14, UP); await page.waitForTimeout(300); await shot('lanterns');
  step('Lantern Night Lights: gather 3 Glowcap, Honey and Wool; paper lanterns hang across Lanternrest');
  // ---- Bridge Repairs: materials, then cash ----
  await fresh(); await at('stonebridge', 28, 15, UP); await shot('bridge-cracked'); await talk(); assert(await ev(() => G.quest.active('bridge')));
  await ev(() => { G.state.bag.Plank = 12; G.state.bag.Brick = 8; }); await talk(['GIVE MATERIALS']); assert(await ev(() => G.state.flags.th_bridge_fixed && !G.state.bag.Plank && G.quest.done('bridge')));
  await page.waitForTimeout(300); await shot('bridge-fixed');
  await fresh(); await at('stonebridge', 28, 15, UP); await talk(); const m2 = await ev(() => G.state.money = 9000); await talk(['PAY $4,000']); assert.equal(await ev(() => G.state.money), 5000); assert(await ev(() => G.quest.done('bridge')));
  step('Bridge Repairs: donate 12 Plank and 8 Brick (and get paid), or pay $4,000; the bridge gains a bench and lantern');
  // ---- The Cobalt Cup ----
  await fresh(); await ev(() => { G.state.cheats = { on: true, unlocked: true, god: true, pp: true }; G.state.party.forEach(c => { c.lvl = 70; c.exp = G.expFor(70); c.stats = G.calcStats(c); c.hp = c.stats.hp; c.moves = [{ id: 'Boulder Crash', pp: 5 }, { id: 'Slam', pp: 20 }]; }); });
  await at('cobalt', 35, 27, UP); await key('z', 300);
  for (let i = 0; i < 60 && !(await ev(() => { const l = G.ui.layers[G.ui.layers.length - 1]; return l && l.items && l.items.includes('ENTER'); })); i++) await key('z', 120);
  await key('z', 300);
  for (let i = 0; i < 5000 && !(await ev(() => G.state.flags.th_cup_won && !G.world.busy && !G.ui.text)); i++) await key('z', 60);
  await idle(); await page.waitForTimeout(900); assert(await ev(() => G.state.flags.th_cup_won), 'won the Cobalt Cup'); assert(await ev(() => G.quest.done('cup')), 'the quest finished');
  step('The Cobalt Cup: three rounds with one team (healed between rounds); winning the cup finishes the quest');
  await ev(() => { G.state.cheats = { on: false }; });
  // ---- Lost Little Pilfet: return it, then keep it ----
  await fresh(); await at('sandsreach', 35, 31, UP); await talk(); assert(await ev(() => G.quest.active('pilfet')));
  await at('cobalt', 39, 26, LEFT); await talk(); await at('sandsreach', 38, 29, UP); await talk(); await page.waitForTimeout(700); assert.equal(await ev(() => G.quest.step('pilfet').id), 'find');
  await at('badlands', 20, 23, UP); await shot('pilfet'); await talk(['RETURN IT TO JORY']); await at('sandsreach', 35, 31, UP); const e0 = await ev(() => G.rep.get('east')); await talk();
  assert(await ev(() => G.quest.done('pilfet'))); assert.equal((await ev(() => G.rep.get('east'))) - e0, 12);
  await fresh(); await at('sandsreach', 35, 31, UP); await talk(); await at('cobalt', 39, 26, LEFT); await talk(); await at('sandsreach', 38, 29, UP); await talk();
  await at('badlands', 20, 23, UP); await talk(['KEEP IT']); assert(await ev(() => G.state.party.some(c => c.id === 76)), 'the Pilfet joined');
  await at('sandsreach', 35, 31, UP); await talk(); assert.equal(await ev(() => G.rep.get('east')), 0, 'the East thinks less of you (clamped at 0)'); assert(await ev(() => /kept the Pilfet/.test(G.state.quests.pilfet.outcome)));
  step('Lost Little Pilfet: ask around, find it in the Badlands; return it (+12 EAST) or keep it (Jory is heartbroken)');
  // ---- A Salve for the Hermit ----
  await fresh(); await at('whispering', 31, 25, UP); await talk(); assert(await ev(() => G.quest.active('hermit')));
  await ev(() => { G.state.bag['Herb Salve'] = 1; }); await talk(['GIVE HERB SALVE']); assert(await ev(() => G.state.flags.th_hermit_healed && !G.state.bag['Herb Salve']));
  const o0 = await bag('Mythic Orb'); await talk(); assert(await ev(() => G.quest.done('hermit'))); assert.equal((await bag('Mythic Orb')) - o0, 1);
  step('A Salve for the Hermit: bring a Herb Salve; she recovers and gives you a Mythic Orb');
  assert.equal(await ev(() => G.threadsDone()), 1, 'this last save has finished only the hermit quest');
  await ev(() => G.runWorld(() => G.journalScreen())); await page.waitForTimeout(400); await key('ArrowRight'); await page.waitForTimeout(300); await shot('journal'); await key('x', 300);
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
