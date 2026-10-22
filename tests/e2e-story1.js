// Prologue and Chapter 1: node tests/e2e-story1.js
// Tam's battle outside the shrine and the Warden's Lamp; Ashen Wardens and Vesper in Stonebridge; calming the Cairnwight;
// Mason's lesson after the Keystone Badge; reporting to Wren; the Chapter 1 quest and its lead.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/story1-${n}.png` });
  const key = async (k, ms = 150) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
  const until = async (fn, ms = 30000, msg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout ' + (msg || fn)); };
  const idle = () => until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 60000, 'idle');
  const mashUntil = async (fn, msg, n = 400) => { for (let i = 0; i < n && !(await ev(fn)); i++) await key('z', 90); if (!(await ev(fn))) { await shot('stuck'); console.log(await ev(() => JSON.stringify({ busy: G.world.busy, scene: G.scene === G.world.scene, text: G.ui.text && G.ui.text.lines, layers: G.ui.layers.length, fade: G.ui.fade.a, said: window.__said.slice(-3) }))); } assert(await ev(fn), msg); };
  await key('z'); await key('z', 500);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 80);
  await idle();
  await ev(() => { window.__said = []; const s0 = G.worldApi.says; G.worldApi.says = l => { window.__said.push([].concat(l).join(' ')); return s0(l); };
    G.state = G.newState(); G.migrateState(G.state); const S = G.state; const c = G.makeCreature(1, 40); c.starter = true; c.moves.sort((a, b) => (G.MOVES[b.id].pow || 0) - (G.MOVES[a.id].pow || 0)); S.party.push(c);
    Object.assign(S.flags, { starter: true, starterSp: 1, orrinTold: true, wrenTips: true }); G.loadMap('lanternrest'); G.placePlayer(39, 7, 0); G.scene = G.world.scene; G.world.busy = false; });

  // 1) Tam outside the shrine
  await until(() => G.world.busy || !!G.ui.text, 5000, 'Tam scene'); await page.waitForTimeout(300); await shot('tam');
  assert.match(await ev(() => window.__said.join(' ')), /TAM: So Wren let you wake a Bondling too.*SPLASHLING/);
  await mashUntil(() => G.state.flags.tam1 && !G.world.busy && G.scene === G.world.scene, 'Tam battle done', 1500);
  await idle();
  const p = await ev(() => ({ lamp: G.state.bag["Warden's Lamp"], ch1: G.quest.active('ch1'), lead: G.quest.lead().q.id, at: G.quest.step('ch1').at, tamGone: !G.MAPS.lanternrest.npcs.find(n => n.x === 39 && n.y === 9).hide() === false }));
  assert.equal(p.lamp, 1); assert(p.ch1); assert.equal(p.lead, 'ch1', 'Chapter 1 is the story lead'); assert.equal(p.at, 'stonebridge');
  assert.equal(await ev(() => G.state.flags.tamWon), false, 'you beat Tam');
  step("Prologue: Tam challenges you outside the shrine (with the Bondling strong against yours); Wren gives the Warden's Lamp; Chapter 1 starts");
  // the Lamp is a LIGHT tool
  assert.equal(await ev(() => { const keep = G.state.party; G.state.party = [G.makeCreature(4, 20)]; const h = G.fieldHelper('light'); G.state.party = keep; return h && h.tool; }), "Warden's Lamp");
  step("the Warden's Lamp lights dark passages, even without a Fire creature");
  // 2) Stonebridge: Ashen Wardens and Vesper
  await ev(() => { G.loadMap('stonebridge'); G.placePlayer(26, 23, 1); G.scene = G.world.scene; G.world.busy = false; window.__said.length = 0; }); await page.waitForTimeout(400);
  assert(await ev(() => G.MAPS.stonebridge.npcs.filter(n => n.trainer && /ashen_sb/.test(n.trainer.id) && !n.hide()).length === 2), 'two Ashen Wardens');
  assert.equal(await ev(() => G.quest.step('ch1').id), 'ashen');
  // fight the first for real
  await ev(() => { G.placePlayer(44, 18, 3); }); await page.waitForTimeout(200); await shot('ashen');
  await key('z', 400); await mashUntil(() => G.state.flags.ashen_sb1 && !G.world.busy && G.scene === G.world.scene, 'beat Corvin', 1500); await idle();
  await ev(() => { G.state.flags.ashen_sb2 = true; });
  await until(() => G.state.flags.vesper1 || G.world.busy, 5000, 'Vesper'); await page.waitForTimeout(300); await shot('vesper');
  await mashUntil(() => G.state.flags.vesper1 && !G.world.busy, 'Vesper scene'); await idle();
  assert.match(await ev(() => window.__said.join(' ')), /VESPER: I am Vesper/);
  step('Chapter 1: the Ashen Wardens fight for Vesper; after both, Vesper speaks from the bridge');
  // 3) the guardian: answer each mood correctly
  const GOOD = { trembles: 1, sniffs: 2, 'slow step': 0, growls: 1 };   // STAY STILL, OFFER FOOD, STEP CLOSER, STAY STILL
  await ev(() => { G.placePlayer(44, 37, 0); window.__said.length = 0; }); await page.waitForTimeout(300); await shot('guardian');
  await key('z', 400);
  for (let i = 0; i < 80 && !(await ev(() => G.state.flags.guardian1)); i++) {
    const menu = await ev(() => { const l = G.ui.layers[G.ui.layers.length - 1]; return l && l.items && l.items[0] === 'STEP CLOSER'; });
    if (menu) { const t = await ev(() => G.ui.text ? G.ui.text.lines.join(' ') : ''); const k = Object.keys(GOOD).find(w => t.includes(w)); for (let j = 0; j < GOOD[k]; j++) await key('ArrowDown', 60); await key('z', 250); }
    else await key('z', 150);
  }
  await mashUntil(() => !G.world.busy && !G.ui.text, 'guardian scene over'); await idle(); await page.waitForTimeout(600);
  const g = await ev(() => ({ f: G.state.flags.guardian1, c: G.state.party.some(c => c.id === 151 && c.befriended), rep: G.rep.get('south'), step: G.quest.step('ch1').id }));
  assert(g.f && g.c, 'the Cairnwight joined'); assert(g.rep >= 10); assert.equal(g.step, 'badge');
  step('the frightened Cairnwight: read its mood and answer gently three times; it joins your party (+10 SOUTH)');
  // 4) Mason's lesson after the Keystone Badge
  await ev(() => { window.__said.length = 0; G.runWorld(() => G.awardBadge(G.BADGES[0])); });
  await mashUntil(() => G.state.flags.masonLesson && !G.world.busy, "Mason's lesson"); await idle();
  assert.match(await ev(() => window.__said.join(' ')), /MASON: One more thing\. EMBRIT is still on its feet/);
  assert.equal(await ev(() => G.state.bag['Climbing Gear']), 1);
  step("Mason's lesson: your partner stayed standing, so Climbing Gear and 3 Super Potions");
  // 5) report to Wren
  const m0 = await ev(() => G.state.money);
  await ev(() => { G.loadMap('shrine'); G.placePlayer(5, 6, 1); G.scene = G.world.scene; G.world.busy = false; window.__said.length = 0; }); await page.waitForTimeout(300);
  await key('z', 400); await mashUntil(() => G.state.flags.ch1_wren && !G.world.busy, 'Wren report'); await idle(); await page.waitForTimeout(800);
  assert(await ev(() => G.quest.done('ch1')), 'Chapter 1 complete'); assert.equal((await ev(() => G.state.money)) - m0, 2000);
  assert.equal(await ev(() => G.quest.lead().q.id), 'lantern', 'the lead goes back to the shards');
  step('report to Wren: Chapter 1 complete ($2,000, reputation); the lead returns to the three shards');
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
