// Chapters 5 to 8, the finale and the post-game: node tests/e2e-story3.js
// Siphons in Sandsreach and Cobalt (your order counts), the Badlands valve; Tam on Glacier Pass and the Aurora guardian's
// Mine shard; Pyrra and the volcano machine; Vesper in three stages; the Wildcard (BALANCE) and the epilogue; Leader rematches.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/story3-${n}.png` });
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
  const fresh = () => ev(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; const c = G.makeCreature(1, 70); c.starter = true; c.moves.sort((a, b) => (G.MOVES[b.id].pow || 0) - (G.MOVES[a.id].pow || 0)); S.party.push(c); Object.assign(S.flags, { starter: true, orrinTold: true, wrenTips: true, tam1: true }); S.day = 1; });
  await key('z'); await key('z', 500);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 80);
  await idle(); await fresh(); await ev(() => { window.__said = []; const s0 = G.worldApi.says; G.worldApi.says = l => { window.__said.push([].concat(l).join(' ')); return s0(l); }; });
  const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;

  const GOOD = { trembles: 'STAY STILL', sniffs: 'OFFER FOOD', 'slow step': 'STEP CLOSER', growls: 'STAY STILL' };
  const trust = async () => {
    await key('z', 300);
    for (let i = 0; i < 300; i++) {
      if (await ev(() => !G.world.busy && !G.ui.text && !G.ui.layers.length)) break;
      const items = await menu();
      if (items && items[0] === 'STEP CLOSER') { const t = await ev(() => G.ui.text ? G.ui.text.lines.join(' ') : ''); const k = Object.keys(GOOD).find(w => t.includes(w)); const n = items.indexOf(GOOD[k]); for (let j = 0; j < n; j++) await key('ArrowDown', 60); await key('z', 250); }
      else await key('z', 110);
    }
    await idle(); await page.waitForTimeout(450);
  };
  const scene = async () => { for (let i = 0; i < 40 && !(await ev(() => G.world.busy || !!G.ui.text)); i++) await page.waitForTimeout(50); for (let i = 0; i < 300 && !(await ev(() => !G.world.busy && !G.ui.text)); i++) await key('z', 100); await idle(); await page.waitForTimeout(450); };
  await ev(() => { const S = G.state; for (let i = 0; i < 2; i++) { const c = G.makeCreature(3, 70); c.moves.sort((a, b) => (G.MOVES[b.id].pow || 0) - (G.MOVES[a.id].pow || 0)); S.party.push(c); }
    Object.assign(S.flags, { ch1_wren: true, badge_keystone: true, badge_bloom: true, badge_gale: true, badge_tide: true, shard_meadow: true, shard_marsh: true });
    for (const id of ['ch1', 'ch2', 'ch3', 'ch4']) { G.quest.start(id, true); G.quest.complete(id, true); } G.quest.tick(); });
  await page.waitForTimeout(400);
  assert(await ev(() => G.quest.active('ch5') && G.quest.lead().q.id === 'ch5'), 'Chapter 5 starts after Chapter 4');

  // ---- Chapter 5: Cobalt first, then Sandsreach ----
  await at('cobalt', 33, 27, UP); await talk(); assert.match(await ev(() => window.__said.join(' ')), /Deal with them first/);
  await at('cobalt', 38, 28, RIGHT); await talk(); assert(await ev(() => G.state.flags.ashen_cb), 'beat Volta');
  await at('cobalt', 33, 27, UP); await shot('siphon'); const e0 = await ev(() => G.rep.get('east')); await talk(['SHUT IT DOWN']);
  assert(await ev(() => G.state.flags.ch5_cb && G.state.flags.ch5_first === 'cb')); assert.equal((await ev(() => G.rep.get('east'))) - e0, 20, 'the town you help first: +20');
  await at('sandsreach', 36, 24, RIGHT); await talk(); await at('sandsreach', 31, 25, UP); const e1 = await ev(() => G.rep.get('east')); await talk(['SHUT IT DOWN']);
  assert.equal((await ev(() => G.rep.get('east'))) - e1, 10, 'the second town: +10'); assert.match(await ev(() => window.__said.join(' ')), /We held on, but only just/);
  await ev(() => { Object.assign(G.state.flags, { ashen_flats: true, ch5_pipemap: true }); });   // the new steps of js/chapters_more.js (played in tests/e2e-chapters.js)
  await at('badlands', 46, 21, UP); await talk(); assert(await ev(() => G.state.flags.ch5_machine)); assert.match(await ev(() => window.__said.join(' ')), /bound to the Lantern forever/);
  await ev(() => { G.state.flags.badge_dune = G.state.flags.badge_circuit = true; }); await page.waitForTimeout(900);
  assert(await ev(() => G.quest.done('ch5') && G.state.party.concat(G.state.box).some(c => c.id === 17)), 'Chapter 5 done; a Skyrant');
  step('Chapter 5: help Cobalt first (+20) then Sandsreach (+10); the valve in the Badlands reveals Vesper\'s plan; a Skyrant');

  // ---- Chapter 6 ----
  await ev(() => { G.state.visited.glacier = true; }); await at('glacier', 29, 23, RIGHT); await talk(); assert(await ev(() => G.state.flags.ch6_tam));
  await ev(() => { Object.assign(G.state.flags, { ch6_brann: true, ch6_cache: true }); });   // the new steps of js/chapters_more.js (played in tests/e2e-chapters.js)
  assert.match(await ev(() => window.__said.join(' ')), /done with Vesper/);
  await ev(() => { G.state.flags.badge_rime = true; G.state.visited.aurora = true; });
  assert(await ev(() => G.access.open('aurora')), 'the Aurora Isles open with 7 badges, before the Lantern');
  await at('aurora', 22, 20, UP); await shot('glacitan'); await trust(); assert(await ev(() => G.state.flags.shard_mine), 'the Glacitan gave the Mine shard');
  await page.waitForTimeout(800); assert(await ev(() => G.quest.done('ch6')));
  step("Chapter 6: Tam turns on Vesper on Glacier Pass; with Tam beside you, the Glacitan on the Aurora Isles gives you the Mine shard");

  // ---- Chapter 7 ----
  await ev(() => { Object.assign(G.state.flags, { ch7_cage: true, ashen_scout: true }); });   // the new steps of js/chapters_more.js (played in tests/e2e-chapters.js)
  await ev(() => { G.state.visited.emberfall = true; }); await at('emberfall', 27, 17, LEFT); await talk(); assert(await ev(() => G.state.flags.ch7_pyrra));
  await at('emberfall', 31, 19, RIGHT); await talk(); assert(await ev(() => G.state.flags.ashen_ef), 'beat Cindra');
  await at('emberfall', 29, 17, UP); await shot('volcano-machine'); await talk(); assert(await ev(() => G.state.flags.ch7_machine));
  await page.waitForTimeout(800); assert(await ev(() => G.quest.done('ch7')));
  step('Chapter 7: Pyrra opens the way, you beat Cindra and shut down the machine; Vesper flees to Cloudpeak');

  // ---- Chapter 8 ----
  await ev(() => { G.state.cheats = { on: true, unlocked: true, god: true, pp: true }; G.state.visited.cloudpeak = true; G.state.party.forEach(c => { c.lvl = 100; c.exp = G.expFor(100); c.stats = G.calcStats(c); c.hp = c.stats.hp; c.moves = [{ id: 'Boulder Crash', pp: 5 }, { id: 'Slam', pp: 20 }]; }); });
  await ev(() => { Object.assign(G.state.flags, { ch8_tam: true, ch8_pyrra: true, ch8_kade: true }); });   // the new step of js/chapters_more.js
  await at('cloudpeak', 32, 10, UP); await shot('vesper');
  await key('z', 300);   // three stages of battle: keep pressing A until Vesper is beaten and the scene is over
  for (let i = 0; i < 6000 && !(await ev(() => G.state.flags.ch8_vesper && !G.world.busy && !G.ui.text)); i++) { await key('z', 60); if (i % 200 === 0) await ev(() => G.state.party.forEach(c => { c.hp = Math.max(c.hp, c.stats.hp >> 1); })); }
  await idle(); await page.waitForTimeout(450);
  assert(await ev(() => G.state.flags.ch8_vesper && G.state.flags.ch8_stage === 3), 'Vesper beaten in three stages');
  assert.match(await ev(() => window.__said.join(' ')), /open the cages/);
  await ev(() => { G.state.cheats = { on: false }; });
  await ev(() => { G.state.flags.lanternLit = true; G.state.flags.placed_meadow = G.state.flags.placed_marsh = G.state.flags.placed_mine = true; }); await page.waitForTimeout(900);
  assert(await ev(() => G.quest.done('ch8') && G.quest.active('finale') && G.quest.lead().q.id === 'finale'));
  step('Chapter 8: Vesper fights in three stages at the castle and gives up; the Lantern is relit; the finale begins');

  // ---- Finale: BALANCE ----
  await ev(() => { G.rep.max(); });
  await at('hollow', 19, 6, UP); await shot('wildcard'); await talk(['BALANCE']);
  assert.equal(await ev(() => G.state.flags.finale), 'balance'); assert(await ev(() => G.state.flags.jokerGone && G.state.party.concat(G.state.box).some(c => c.id === 25)), 'the Wildcard joined');
  assert.match(await ev(() => window.__said.join(' ')), /THE END/); assert.match(await ev(() => window.__said.join(' ')), /Cobalt City named a street/);
  await page.waitForTimeout(900); assert(await ev(() => G.quest.done('finale') && G.quest.done('lantern')));
  step('Finale: BALANCE (your reputation and finished side quests) calms the Wildcard, which joins you; the epilogue remembers your choices');

  // ---- Post-game: Leader rematch ----
  await ev(() => { const m = G.MAPS.arena_stonebridge, n = m.npcs.find(n => n.trainer && n.trainer.leader); G.state.flags[n.trainer.id] = true; G.loadMap('arena_stonebridge'); G.placePlayer(n.x, n.y + 1, 1); G.scene = G.world.scene; G.world.busy = false; });
  await page.waitForTimeout(300); await key('z', 300);
  for (let i = 0; i < 40 && !(await ev(() => { const l = G.ui.layers[G.ui.layers.length - 1]; return l && l.items && l.items.includes('REMATCH'); })); i++) await key('z', 120);
  await key('z', 300);   // REMATCH
  await ev(() => { G.state.cheats = { on: true, unlocked: true, god: true, pp: true }; G.state.party.forEach(c => { c.moves = [{ id: 'Boulder Crash', pp: 5 }]; }); });
  for (let i = 0; i < 4000 && !(await ev(() => G.state.flags.rematch_keystone === G.state.day && !G.world.busy && !G.ui.text)); i++) await key('z', 60);
  await idle(); await page.waitForTimeout(450); assert(await ev(() => G.state.flags.rematch_keystone === G.state.day), 'rematched Mason');
  await talk(); assert.match(await ev(() => window.__said.join(' ')), /already had our rematch today/);
  step('Post-game: Arena Leaders offer a daily rematch at your level');
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
