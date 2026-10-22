// Save slots: node tests/e2e-slots.js
// Three slots; CONTINUE loads the latest save; LOAD GAME picks a slot; NEW GAME picks a slot and asks before overwriting;
// START > SAVE saves to the current slot or another one; old single saves are slot 1.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  const url = 'file://' + path.resolve(__dirname, '../index.html');
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/slots-${n}.png` });
  const key = async (k, ms = 150) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
  const until = async (fn, ms = 20000, msg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout ' + (msg || fn)); };
  const idle = () => until(() => G.state && !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 40000, 'world idle');
  const menuItems = () => ev(() => { const l = G.ui.layers[G.ui.layers.length - 1]; return l && l.items ? l.items.slice() : null; });

  // 1) no saves: NEW GAME only, goes to slot 1
  await key('z', 300); assert.deepEqual(await menuItems(), ['NEW GAME']); await key('z', 500);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 80);
  await idle(); assert.equal(await ev(() => G.slot), 1);
  // a game in slot 1, and one in slot 3 saved later
  await ev(() => { G.state.flags.starter = true; G.state.name = 'ONE'; G.saveGame(); });
  await page.waitForTimeout(30);
  await ev(() => { G.state.name = 'THREE'; G.state.money = 3333; G.saveGame(3); });
  assert.deepEqual(await ev(() => [!!G.loadGame(1), !!G.loadGame(2), !!G.loadGame(3), G.latestSlot()]), [true, false, true, 3]);
  step('with no saves, NEW GAME goes straight into slot 1; saves land in their own slots');
  // 2) CONTINUE loads the latest slot
  await page.reload(); await page.waitForTimeout(400); await key('z', 300);
  assert.deepEqual(await menuItems(), ['CONTINUE', 'LOAD GAME', 'NEW GAME']); await shot('title');
  await key('z', 600); await idle();
  assert.deepEqual(await ev(() => [G.state.name, G.slot, G.state.money]), ['THREE', 3, 3333]);
  step('CONTINUE loads the most recent save (slot 3)');
  // 3) LOAD GAME picks slot 1; empty slot 2 can't be loaded
  await page.reload(); await page.waitForTimeout(400); await key('z', 300); await key('ArrowDown'); await key('z', 400);
  await shot('load'); await key('ArrowDown'); await key('z', 300);
  assert(await ev(() => G.scene !== G.world.scene || !G.state || G.state.name !== 'ONE'), 'empty slot 2 is refused');
  await key('ArrowUp'); await key('z', 600); await idle();
  assert.deepEqual(await ev(() => [G.state.name, G.slot]), ['ONE', 1]);
  step('LOAD GAME: an empty slot is refused, slot 1 loads');
  // 4) START > SAVE > SAVE TO ANOTHER SLOT (slot 2)
  await ev(() => { G.state.name = 'TWO'; });
  await key('Enter', 300); for (let i = 0; i < 8; i++) await key('ArrowDown', 60); await key('z', 300);   // SAVE
  assert.deepEqual(await menuItems(), ['SAVE (SLOT 1)', 'SAVE TO ANOTHER SLOT', 'CANCEL']);
  await key('ArrowDown'); await key('z', 300); await key('ArrowDown'); await shot('save-pick'); await key('z', 300);
  for (let i = 0; i < 4; i++) await key('z', 200);
  assert.deepEqual(await ev(() => [G.loadGame(2) && G.loadGame(2).name, G.loadGame(1).name, G.slot]), ['TWO', 'ONE', 2]);
  step('START > SAVE TO ANOTHER SLOT writes slot 2 and keeps slot 1; the game now saves to slot 2');
  await key('x', 200); await key('x', 200);
  // 5) NEW GAME into an occupied slot asks first
  await page.reload(); await page.waitForTimeout(400); await key('z', 300); await key('ArrowDown'); await key('ArrowDown'); await key('z', 400);
  await key('z', 400);   // slot 1 (occupied)
  assert.match(await ev(() => G.ui.text ? G.ui.text.lines.join(' ') : ''), /Slot 1 holds ONE's game.*Overwrite/); await shot('overwrite');
  await key('ArrowDown'); await key('z', 300);   // NO
  assert(await ev(() => !!G.loadGame(1) && G.loadGame(1).name === 'ONE'), 'slot 1 untouched');
  await browser.close();
  step('NEW GAME into a used slot asks before overwriting; saying NO keeps it');
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
