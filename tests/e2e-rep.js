// What reputation gives (js/quests.js G.rep.discount, js/shops.js): node tests/e2e-rep.js
// FRIEND, TRUSTED and HERO make the region's shops 5, 10 and 15 percent cheaper; the tier-up message and the journal say so;
// quest messages sit low on the screen, clear of the quest tracker.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, arg) => page.evaluate(fn, arg), step = n => console.log('✓', n);
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 60 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await ev(() => { G.state.rep = G.state.rep || {}; G.state.flags.starter = true; G.loadMap('lanternrest'); G.placePlayer(30, 26, 0); G.scene = G.world.scene; G.world.busy = false; });
  const price = async rep => { await ev(r => { G.state.rep.vale = r; window.__p = null; G.openShop('general'); }, rep);
    const t = Date.now(); while (Date.now() - t < 5000 && !(await ev(() => G.shopState && G.shopState.rows && G.shopState.rows.length))) await page.waitForTimeout(50);
    const p = await ev(() => { const r = G.shopState.rows.find(r => r.type === 'item'); return [r.name, r.price, G.ITEMS[r.name].price]; });
    for (let i = 0; i < 10 && await ev(() => !!G.shopState); i++) await key('x', 80); await page.waitForTimeout(300); return p; };
  const [n, p0, base] = await price(0); assert.equal(p0, base, 'a stranger pays full price');
  const [, p1] = await price(45); assert.equal(p1, Math.round(base * .95), 'a FRIEND pays 5% less');
  const [, p3] = await price(100); assert.equal(p3, Math.round(base * .85), 'a HERO pays 15% less');
  step(`${n}: $${p0} for a stranger, $${p1} for a friend, $${p3} for a hero of Lanternrest`);
  const toast = await ev(() => { G.state.rep.south = 30; let got = ''; const t0 = G.questToast; G.questToast = s => { got = s; }; G.rep.add('south', 15); G.questToast = t0; return got; });
  assert.match(toast, /SOUTH: FRIEND \(shops 5% off\)/, toast); step('the tier-up message says what it gives: ' + toast);
  assert.deepEqual(errors, []); console.log('errors: none'); await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
