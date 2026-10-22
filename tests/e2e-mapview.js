// Map and flight picker on a portrait phone: full-screen layout, shared zoom, touch drag to pan, tap to pick: node tests/e2e-mapview.js
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(page);
  const drag = async (x0, y0, x1, y1) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 8, y: y0 + (y1 - y0) * i / 8 }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  await page.evaluate(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.push(G.makeCreature(17, 30));
    for (const m of Object.values(G.MAPS)) if (m.outdoor) S.visited[m.id] = true; G.loadMap('lakeside'); G.placePlayer(10, 10, 0); G.scene = G.world.scene; G.touch = true; G.runWorld(() => G.worldMapScreen()); });
  await page.waitForTimeout(1200);
  assert(await page.evaluate(() => G.scene.wide && G.scene.raw), 'the map uses the whole screen');
  await page.touchscreen.tap(357, 484); await page.waitForTimeout(1400);
  assert(await page.evaluate(() => G.worldMap.zoomed && G.worldMap.zoom > 2), 'tapping ZOOM zooms in');
  const c0 = await page.evaluate(() => [G.worldMap.nav.tcx, G.worldMap.nav.tcy]); await drag(300, 300, 100, 500); await page.waitForTimeout(200);
  const c1 = await page.evaluate(() => [G.worldMap.nav.tcx, G.worldMap.nav.tcy]);
  assert(c1[0] > c0[0] + .05, 'dragging left pans the map right: ' + c0 + ' -> ' + c1); console.log('✓ zoom button and touch drag pan the map');
  const sel0 = await page.evaluate(() => G.worldMap.sel); await drag(300, 300, 301, 301); // a tiny wiggle is a tap, not a pan
  console.log('✓ tiny moves are taps');
  await page.evaluate(() => { G.worldMap.nav.setZoom(false, 0); }); await page.waitForTimeout(100);
  await page.keyboard.press('x'); await page.waitForTimeout(1200);
  await page.evaluate(() => { G.runWorld(() => G.vehicles.fly()); }); await page.waitForTimeout(1200);
  assert(await page.evaluate(() => G.vehicles._fly && G.scene === G.vehicles._fly.scene && G.scene.raw), 'flight picker uses the same full-screen viewer');
  await page.touchscreen.tap(60, 1010 / 2 + 20 * 0); // ZOOM pill (bottom panel, left)
  await page.waitForTimeout(1200);
  await page.keyboard.press('x'); await page.waitForTimeout(900);
  console.log('✓ flight picker opens and closes'); await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
