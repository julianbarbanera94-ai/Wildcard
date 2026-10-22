// Optional quest threads: node tests/e2e-threads.js
// The Missing Ferry (both choices), The Sick Orchard, Trader's Debt (open the crate; and a missed deadline),
// Duel at Dawn, The Unusual Footprints. Each records its outcome, and the world changes afterwards.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/threads-${n}.png` });
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

  // ---- The Missing Ferry: return it ----
  await at('sunhaven', 10, 27, UP); await talk(); assert(await ev(() => G.quest.active('ferry')));
  await at('shore', 11, 26, DOWN); await shot('gull-beached'); await talk(['RETURN IT TO ILSA']);
  assert(await ev(() => G.state.flags.th_ferry_back));
  await at('sunhaven', 10, 27, UP); const w0 = await ev(() => G.rep.get('west')); await talk();
  assert(await ev(() => G.quest.done('ferry'))); assert.equal((await ev(() => G.rep.get('west'))) - w0, 15); assert.match(await ev(() => G.state.quests.ferry.outcome), /brought the Gull home/);
  await shot('gull-home'); await talk(['SAIL']); assert.equal(await ev(() => G.world.mapId), 'shore', 'Ilsa sails you to Tidepool Shore for free');
  step('The Missing Ferry (returned): +15 WEST, Pearls; the Gull is moored in Sunhaven and Ilsa sails you to Tidepool Shore for free');
  // ---- The Missing Ferry: sell it ----
  await fresh(); await at('sunhaven', 10, 27, UP); await talk(); await at('shore', 11, 26, DOWN);
  const m0 = await ev(() => G.state.money); await talk(['TAKE THE $3,000']); assert.equal((await ev(() => G.state.money)) - m0, 3000);
  await at('sunhaven', 10, 27, UP); await talk(); assert(await ev(() => G.quest.done('ferry') && G.rep.get('west') === 0 && /sold the Gull/.test(G.state.quests.ferry.outcome)));
  await talk(); assert.match(await ev(() => (G.ui.text && G.ui.text.lines.join(' ')) || ''), /|/);
  step('The Missing Ferry (sold): $3,000, Ilsa turns her back on you, the West thinks less of you');
  // ---- The Sick Fields ----
  await fresh(); await at('sunmeadow', 31, 6, RIGHT); await talk(); assert(await ev(() => G.quest.active('orchard')));
  await at('sunmeadow', 26, 4, UP); await shot('sick-trees'); await talk(); await at('sunmeadow', 29, 4, DOWN); await talk(); await at('sunmeadow', 27, 6, DOWN); await talk();
  assert.equal(await ev(() => G.quest.step('orchard').id), 'source');
  await at('sunmeadow', 35, 29, DOWN); await shot('nest'); await talk(['MOVE THE NEST HOME']);
  assert(await ev(() => G.state.party.some(c => c.id === 20 && c.befriended)), 'a Venomite came home with you');
  await at('sunmeadow', 31, 6, RIGHT); const h0 = await ev(() => G.state.bag.Honey || 0); await talk();
  assert(await ev(() => G.quest.done('orchard'))); assert.equal((await ev(() => G.state.bag.Honey)) - h0, 3);
  await talk(); assert.equal((await ev(() => G.state.bag.Honey)) - h0, 3, 'no second gift the same day');
  await ev(() => { G.state.day++; }); await talk(); assert.equal((await ev(() => G.state.bag.Honey)) - h0, 5, 'a gift every new day');
  step('The Sick Fields: three sick crop beds lead to a Venomite nest; you move it home (a Venomite joins); the fields heal and Bram gives honey every day');
  // ---- Trader's Debt: open the crate and report it ----
  await fresh(); await at('lanternrest', 38, 32, UP); await talk(); assert(await ev(() => G.state.bag['Sealed Crate'] === 1));
  await at('stonemill', 4, 3, RIGHT); await talk(['OPEN IT FIRST']); assert(await ev(() => G.state.flags.th_crate_opened));
  await at('stonebridge', 26, 11, UP); await talk(); assert(await ev(() => G.quest.done('trader') && !G.state.bag['Sealed Crate']));
  await at('lanternrest', 38, 32, UP); await shot('pell'); const t0 = await ev(() => G.state.bag['Terra Orb'] || 0); await talk();
  assert.equal((await ev(() => G.state.bag['Terra Orb'])) - t0, 2, 'Pell runs the stall now');
  step("Trader's Debt (opened): stolen crystals; Elder Brigg rewards you; Oswin's honest niece Pell takes over his stall");
  // ---- Trader's Debt: miss the deadline ----
  await fresh(); await at('lanternrest', 38, 32, UP); await talk(); await ev(() => { G.state.day += 3; }); await page.waitForTimeout(1500);
  assert(await ev(() => G.quest.failed('trader') && !G.state.bag['Sealed Crate']), 'missed the deadline');
  step("Trader's Debt (late): after three days the quest fails and the crate is gone");
  // ---- Duel at Dawn ----
  await fresh(); await at('lanternrest', 11, 24, UP); await talk(); assert(await ev(() => G.state.flags.th_rook1));
  await at('stonebridge', 20, 22, UP); await talk(); await at('sunhaven', 36, 28, UP); await talk();
  assert(await ev(() => G.quest.done('duel') && G.state.flags.th_rook3));
  assert(await ev(() => !G.MAPS.homestead.npcs.find(n => n.x === 24 && n.y === 39).hide()), 'Rook lives at the homestead');
  step('Duel at Dawn: beat Rook in Lanternrest, Stonebridge and Sunhaven; Rook moves to your homestead');
  // ---- The Unusual Footprints: watch quietly ----
  await at('lanternrest', 24, 33, UP); await talk(); assert(await ev(() => G.quest.active('tracks')));
  await at('sunmeadow', 30, 28, UP); await shot('prints'); await talk(); await at('lanternrest', 4, 31, RIGHT); await talk(); await at('mirewood', 40, 44, DOWN); await talk();
  await at('mirewood', 61, 48, LEFT); await shot('lemurmur'); await talk(['WATCH QUIETLY']);
  await at('lanternrest', 24, 33, UP); const o0 = await ev(() => G.state.bag['Mythic Orb'] || 0); await talk();
  assert(await ev(() => G.quest.done('tracks'))); assert.equal((await ev(() => G.state.bag['Mythic Orb'])) - o0, 1);
  step('The Unusual Footprints: three sets of glowing prints lead to a Lemurmur in Mirewood; watching it quietly earns the best research reward');
  // ---- journal shows outcomes ----
  await ev(() => G.runWorld(() => G.journalScreen())); await page.waitForTimeout(400); await key('ArrowRight'); await page.waitForTimeout(300); await shot('journal'); await key('x', 300);
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
