// Shops, healing and the homestead road, end to end in headless Chromium: node tests/e2e-towns.js
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/towns-${n}.png` });
  const until = async (fn, ms = 15000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(60); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const advance = async (cond, ms = 30000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(cond)) return; if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(80); } await shot('timeout'); throw new Error('timeout advancing to ' + (msg || cond)); };
  const idle = () => advance(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 40000, 'world idle');
  const tapUI = async (x, y) => { const p = await ev(([x, y]) => { const r = document.getElementById('screen').getBoundingClientRect(); return [r.left + (x + G.uiX) / G.W * r.width, r.top + (y + G.uiY) / G.H * r.height]; }, [x, y]); await page.mouse.click(p[0], p[1]); await page.waitForTimeout(120); };
  const step = n => console.log('✓', n);
  const walk = async (k, cond, msg) => { await page.keyboard.down(k); try { await until(cond, 15000, msg); } finally { await page.keyboard.up(k); } };
  const at = (map, x, y, dir) => ev(([map, x, y, dir]) => { G.loadMap(map); G.placePlayer(x, y, dir); (G.world.map.roamers || []).forEach(r => { r.timer = 1e9; }); }, [map, x, y, dir]);

  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await idle();
  await ev(() => { const S = G.state; S.flags.starter = true; S.party.length = 0; S.party.push(G.makeCreature(1, 14), G.makeCreature(4, 9)); S.money = 1000; S.bag.Turnip = 4;
    const o = G.drawSignPlate; window.__plates = new Set(); G.drawSignPlate = function (c, text) { window.__plates.add(text); return o.apply(this, arguments); }; });

  // 1) Meadowbrook Seeds: walk in through the door, see the plate, buy 5 Turnip Seeds with the D-pad
  await at('sunmeadow', 61, 19, 1); await page.waitForTimeout(400); await shot('meadowbrook-outside');
  assert(await ev(() => window.__plates.has('MEADOWBROOK SEEDS')), 'Meadowbrook name plate drawn');
  await walk('ArrowUp', () => G.world.mapId === 'seeds', 'enter the seed shop'); await idle();
  await walk('ArrowUp', () => G.world.p.y <= 3 && !G.world.p.moving, 'to the counter'); await idle();
  assert.deepEqual(await ev(() => [G.world.p.x, G.world.p.y]), [3, 3]);
  await key('z'); await until(() => G.shopState && G.shopState.id === 'seeds', 4000, 'shop open');
  assert.equal(await ev(() => G.shopState.rows[0].item), 'Turnip Seeds');
  await key('z'); await until(() => G.shopState.mode === 'qty');
  for (let i = 0; i < 4; i++) await key('ArrowUp');
  assert.equal(await ev(() => G.shopState.modal.q), 5); await shot('qty');
  await key('z'); await until(() => G.shopState.mode === 'confirm'); await shot('confirm');
  await key('z'); await until(() => G.shopState.mode === 'list' && G.shopState.tone === 'good');
  assert.equal(await ev(() => G.state.bag['Turnip Seeds']), 5); assert.equal(await ev(() => G.state.money), 1000 - 150);
  await shot('bought');
  step('Meadowbrook Seeds: entered through its door, bought 5 Turnip Seeds with the D-pad ($150 deducted)');

  // 2) the same with taps: + + then BUY, YES
  await tapUI(60, 44); assert.equal(await ev(() => G.shopState.idx), 0);
  await tapUI(60, 44); await until(() => G.shopState.mode === 'qty', 3000, 'picker by tap');
  await tapUI(167, 70); await tapUI(167, 70); assert.equal(await ev(() => G.shopState.modal.q), 3);
  await tapUI(73, 70); assert.equal(await ev(() => G.shopState.modal.q), 2);
  await tapUI(91, 108); await until(() => G.shopState.mode === 'confirm', 3000, 'confirm by tap'); await tapUI(91, 108);
  await until(() => G.shopState.mode === 'list' && G.shopState.tone === 'good');
  assert.equal(await ev(() => G.state.bag['Turnip Seeds']), 7); assert.equal(await ev(() => G.state.money), 850 - 60);
  step('touch: tapping a row, the -/+ zones, BUY and YES buys 2 more ($60)');

  // 3) a failed buy: not enough money, nothing changes
  await ev(() => { G.state.money = 20; });
  for (let i = 0; i < 3; i++) await key('ArrowDown');
  assert.equal(await ev(() => G.shopState.rows[G.shopState.idx].item), 'Tomato Seeds');
  await key('z'); await until(() => G.shopState.mode === 'qty'); await key('z');
  await until(() => G.shopState.msg === 'You need $40 more.', 3000, 'money message'); await shot('need-more');
  assert.equal(await ev(() => G.shopState.tone), 'bad');
  await key('x'); await until(() => G.shopState.mode === 'list');
  assert.equal(await ev(() => G.state.money), 20); assert.equal(await ev(() => G.state.bag['Tomato Seeds'] || 0), 0);
  step('too little money: "You need $40 more." and neither money nor bag change');

  // 4) selling crops on the SELL tab
  await key('ArrowRight'); await key('ArrowRight');
  assert.equal(await ev(() => G.shopState.tabs[G.shopState.tab]), 'SELL');
  assert.deepEqual(await ev(() => G.shopState.rows.map(r => r.item)), ['Turnip'], 'the seed stand only buys crops');
  const price = await ev(() => G.shopState.rows[0].price); assert.equal(price, 36);
  await key('z'); await until(() => G.shopState.mode === 'qty'); await key('ArrowUp'); await key('z'); await until(() => G.shopState.mode === 'confirm'); await key('z');
  await until(() => G.shopState.tone === 'good'); await shot('sold');
  assert.equal(await ev(() => G.state.bag.Turnip), 2); assert.equal(await ev(() => G.state.money), 20 + 72);
  await key('x'); await idle();
  step('selling: 2 Turnips sold for $36 each; the stand refuses non-crops');

  // 5) the general store still opens through G.shopMenu, and tools are bought once
  await ev(() => { G.state.money = 5000; G.runWorld(() => G.shopMenu()); }); await until(() => G.shopState && G.shopState.id === 'general');
  assert.deepEqual(await ev(() => G.shopState.tabs), ['ORBS', 'MEDICINE', 'TOOLS', 'SELL']);
  await key('ArrowRight'); await key('ArrowRight'); await key('z'); await until(() => G.shopState.mode === 'confirm'); await key('z'); await until(() => G.shopState.tone === 'good');
  assert.equal(await ev(() => G.state.bag['Watering Can']), 1);
  await key('z'); await until(() => /already have/.test(G.shopState.msg)); assert.equal(await ev(() => G.state.bag['Watering Can']), 1);
  await shot('general'); await key('x'); await idle();
  step('General Store via G.shopMenu: tabs ORBS/MEDICINE/TOOLS/SELL; a Watering Can bought once, a second refused');

  // 6) the Warden Lodge nurse uses the shared healing screen and sets the respawn point
  await ev(() => { G.state.flags.respawn = null; G.state.party[0].hp = 3; G.state.party[1].hp = 0; });
  await at('lodge', 4, 3, 1); await page.waitForTimeout(200);
  await key('z'); await until(() => !!G.healState, 4000, 'heal screen'); await shot('lodge-heal');
  assert.deepEqual(await ev(() => G.healState.need), [true, true]);
  await key('z'); await idle();
  assert(await ev(() => G.state.party.every(c => c.hp === c.stats.hp)), 'team healed'); assert.equal(await ev(() => G.state.flags.respawn), 'lodge');
  step('Warden Lodge: G.healUI lists the team, HEAL TEAM restores everyone (fainted too), respawn = lodge');

  // 7) the Shore Healing Post: walk in, heal; CANCEL heals nothing
  await ev(() => { G.state.party[0].hp = 2; });
  await at('shore', 26, 6, 1); await page.waitForTimeout(300); assert(await ev(() => window.__plates.has('HEALING POST')), 'healing post plate');
  await walk('ArrowUp', () => G.world.mapId === 'shoreheal', 'enter healing post'); await idle();
  await walk('ArrowUp', () => G.world.p.y <= 3 && !G.world.p.moving, 'to the counter'); await idle();
  await key('z'); await until(() => !!G.healState); await key('ArrowRight'); await key('z'); await idle();
  assert.equal(await ev(() => G.state.party[0].hp), 2, 'cancel heals nothing');
  await key('z'); await until(() => !!G.healState); await key('z'); await idle();
  assert(await ev(() => G.state.party[0].hp === G.state.party[0].stats.hp), 'post heals');
  step('Shore Healing Post: walked in through its door; CANCEL changes nothing, HEAL TEAM heals for free');

  // 8) Lanternrest -> homestead -> Lanternrest through the new north-east exit (needs the starter)
  await ev(() => { G.state.flags.starter = false; }); await at('lanternrest', 50, 2, 1); await page.waitForTimeout(200);
  await key('ArrowUp', 600); await advance(() => !G.world.busy && !G.ui.text, 10000);
  assert.equal(await ev(() => G.world.mapId), 'lanternrest', 'blocked without a starter');
  await ev(() => { G.state.flags.starter = true; }); await at('lanternrest', 50, 2, 1); await page.waitForTimeout(200);
  await shot('hub-road');
  await walk('ArrowUp', () => G.world.mapId === 'homestead', 'reach the homestead'); await idle();
  assert.deepEqual(await ev(() => [G.world.p.x, G.world.p.y]), [27, 42]);
  // walk up the road to the yard, then back down and out
  await page.keyboard.down('ArrowUp'); await until(() => G.world.p.y <= 32, 15000, 'walk up the road'); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(300);
  assert(await ev(() => window.__plates.has('LAND OFFICE')), 'land office plate'); await shot('homestead-yard');
  assert(await ev(() => G.world.map.t.some(r => r.includes('X'))), 'thicket outside deed 1');
  await page.keyboard.down('ArrowDown'); await until(() => G.world.mapId === 'lanternrest', 20000, 'walk back to Lanternrest'); await page.keyboard.up('ArrowDown'); await idle();
  assert.deepEqual(await ev(() => [G.world.p.x, G.world.p.y]), [50, 1]);
  step('Lanternrest <-> homestead on foot through the new exit (blocked before the starter)');

  // 9) the house door leads into the cabin and back out to the door
  const door = await ev(() => { const h = G.home.get('house'), d = G.home.L(h).door; return [h.x + d[0], h.y + d[1]]; });
  await at('homestead', door[0], door[1] + 1, 1); await page.waitForTimeout(200);
  await walk('ArrowUp', () => G.world.mapId === 'home1', 'enter the cabin'); await idle(); await shot('cabin');
  await walk('ArrowDown', () => G.world.mapId === 'homestead', 'leave the cabin'); await idle();
  assert.deepEqual(await ev(() => [G.world.p.x, G.world.p.y]), [door[0], door[1] + 1]);
  step('the cabin door opens onto home1 and its exit mat leads back to the door');

  // 10) the Lanternrest name plates and the Builder's Yard interior
  await at('lanternrest', 23, 8, 1); await page.waitForTimeout(400); await shot('hub-plates');
  assert(await ev(() => window.__plates.has("BUILDER'S YARD") && window.__plates.has('WARDEN LODGE · HEALING')), 'hub plates drawn');
  await walk('ArrowUp', () => G.world.mapId === 'yard', 'enter the yard'); await idle();
  await walk('ArrowUp', () => G.world.p.y <= 4 && !G.world.p.moving, 'to the counter'); await idle(); await key('z'); await until(() => G.shopState && G.shopState.id === 'builder'); await shot('builder');
  await key('x'); await idle();
  step("Builder's Yard: the hub's name plates are drawn and its counter opens the materials shop");

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
