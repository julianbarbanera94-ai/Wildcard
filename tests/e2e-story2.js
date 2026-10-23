// Chapters 2 to 4: node tests/e2e-story2.js
// The Green Hush (the Elder Oak, the forest guardian's Meadow shard, Vesper and Mordant), Tides and Winds (the lighthouse,
// Verdant Isle with Tam), The Quiet Water (the Tide Stone, Sable at Tidefall, diving for the Marsh shard). Boats as rewards.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/story2-${n}.png` });
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
  await ev(() => { const S = G.state; Object.assign(S.flags, { ch1_wren: true, badge_keystone: true, guardian1: true, ashen_sb1: true, ashen_sb2: true, vesper1: true, masonLesson: true }); S.visited.stonebridge = true; G.quest.start('ch1', true); G.quest.complete('ch1', true); G.quest.tick(); });
  await page.waitForTimeout(400);
  assert(await ev(() => G.quest.active('ch2') && G.quest.lead().q.id === 'ch2'), 'Chapter 2 starts after Chapter 1');
  await at('shrine', 5, 6, UP); await talk(); assert.match(await ev(() => window.__said.join(' ')), /forest has gone silent/);

  // ---- Chapter 2 ----
  await ev(() => { G.state.flags.sm_hazel = true; }); await page.waitForTimeout(400);
  await at('evergreen', 29, 17, UP); await shot('oak-dark'); await talk(); assert(await ev(() => G.state.flags.ch2_oak), 'the Lamp relights the Elder Oak');
  await at('evergreen', 27, 18, LEFT); await shot('florelle'); await trust();
  assert(await ev(() => G.state.flags.shard_meadow), 'the forest guardian gave the Meadow shard');
  await scene(); assert(await ev(() => G.state.flags.ch2_vesper), 'Vesper speaks');
  await at('evergreen', 33, 22, RIGHT); await shot('mordant'); await talk(); assert(await ev(() => G.state.flags.ashen_eg), 'beat Mordant');
  await ev(() => { G.state.flags.badge_bloom = true; }); await page.waitForTimeout(800);
  assert(await ev(() => G.quest.done('ch2') && G.state.vehicles.owned.includes('rowboat')), 'Chapter 2 done; a rowboat');
  step('Chapter 2: the Lamp relights the Elder Oak; the Florelle guardian trusts you with the Meadow shard; Vesper and Mordant; Bloom Badge; a rowboat');

  // ---- Chapter 3 ----
  assert(await ev(() => G.quest.active('ch3')));
  await ev(() => { G.state.visited.driftwood = true; }); await at('driftwood', 6, 8, UP); await talk(); assert(await ev(() => G.state.flags.ch3_light), 'lighthouse relit');
  await page.waitForTimeout(200); await shot('lighthouse');
  await ev(() => { G.state.flags.badge_gale = G.state.flags.badge_bloom = true; G.state.visited.verdant = true; });
  await at('verdant', 20, 25, UP); await talk(); assert(await ev(() => G.state.flags.ashen_vd), 'beat Skiff');
  await scene(); assert(await ev(() => G.state.flags.ch3_tam)); assert.match(await ev(() => window.__said.join(' ')), /They were terrified/);
  await page.waitForTimeout(800);
  assert(await ev(() => G.quest.done('ch3') && G.state.vehicles.owned.includes('motorboat')), 'Chapter 3 done; a motorboat');
  step("Chapter 3: relight Grimsby's lighthouse; on Verdant Isle you and Tam drive off the Ashen sailors, and Tam begins to doubt Vesper; a motorboat");

  // ---- Chapter 4 ----
  assert(await ev(() => G.quest.active('ch4')));
  await ev(() => { G.state.visited.lakeside = true; }); await at('lakeside', 46, 8, UP); await talk(); assert.match(await ev(() => window.__said.join(' ')), /empty stone plinth/);
  await at('lakeside', 49, 10, RIGHT); await talk(); await page.waitForTimeout(400); assert(await ev(() => G.state.flags.ashen_lk && G.state.bag['Tide Stone'] === 1), 'got the Tide Stone back');
  await at('lakeside', 46, 8, UP); await talk(); assert(await ev(() => G.state.flags.ch4_stone && !G.state.bag['Tide Stone'])); await shot('tide-stone');
  await ev(() => { G.state.flags.badge_tide = true; });
  await at('tidefall', 8, 34, UP); await talk(); assert.match(await ev(() => window.__said.join(' ')), /SABLE is guarding the shrine/);
  await at('tidefall', 11, 34, LEFT); await talk(); assert(await ev(() => G.state.flags.ashen_tf), 'beat Sable');
  await at('tidefall', 8, 34, UP); await shot('shrine'); await talk(); assert.match(await ev(() => window.__said.join(' ')), /strong Water creature/);
  await ev(() => { G.state.party.push(G.makeCreature(4, 20)); }); await talk(); assert(await ev(() => G.state.flags.shard_marsh), 'dove for the Marsh shard');
  await page.waitForTimeout(800);
  assert(await ev(() => G.quest.done('ch4') && G.state.vehicles.owned.includes('sailboat')), 'Chapter 4 done; a sailboat');
  assert.equal(await ev(() => G.quest.step('lantern').at), 'aurora', 'the last shard is on the Aurora Isles');
  step('Chapter 4: win back the Tide Stone, beat Sable at Tidefall, dive with a Water creature for the Marsh shard; a sailboat; the last shard is on the Aurora Isles');
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
