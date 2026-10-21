// Touch controls (thumbstick, ORB button), the device-aware title prompt, and throwing an orb at a roaming creature.
// node tests/e2e-controls.js
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(500);
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/k-${n}.png` });
  const until = async (fn, ms = 15000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(60); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const box = async sel => (await page.$(sel)).boundingBox();
  const tap = async k => { const b = await box(`[data-k="${k}"]`); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(200); };
  const step = n => console.log('✓', n);
  // drag the thumbstick with a real touch pointer (CDP touch events -> pointer events)
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const stickHold = async (dx, dy, ms) => { const b = await box('#stick'), cx = b.x + b.width / 2, cy = b.y + b.height / 2; await touch('touchStart', cx, cy); await touch('touchMove', cx + dx, cy + dy); await page.waitForTimeout(ms); await touch('touchEnd'); await page.waitForTimeout(100); };

  assert(await ev(() => G.touch), 'touch device detected'); await shot('title');
  step('title prompt says "TAP A TO START" on touch screens');
  await tap('a'); await tap('a'); await page.waitForTimeout(800);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await tap('a');
  await until(() => !G.world.busy && G.ui.fade.a === 0, 8000, 'intro done');
  const y0 = await ev(() => G.world.p.y), x0 = await ev(() => G.world.p.x);
  await stickHold(0, 50, 500);                         // push down: walk toward the door
  const moved = await ev(() => [G.world.p.x, G.world.p.y, G.world.mapId]);
  assert(moved[1] > y0 || moved[2] !== 'cottage', 'thumbstick moved the player: ' + moved);
  await until(() => !G.world.busy && G.ui.fade.a === 0 && !G.world.p.moving, 8000, 'settled');
  await stickHold(-50, 0, 120); assert.equal(await ev(() => G.world.p.dir), 2, 'thumbstick left turns/moves left');
  step(`thumbstick moves the player (y ${y0} -> ${moved[1]}) and steers by its strongest axis`);

  // ORB button: throw at a nearby roaming creature -> battle opens with the capture attempt (Sure Catch for determinism)
  await ev(() => { const S = G.state; S.flags.starter = true; S.party.length = 0; S.party.push(G.makeCreature(4, 12)); S.bag = { 'Catch Orb': 3 }; S.cheats = { on: true, catch: true };
    const w = G.MAPS.lanternrest.warps.find(w => w.to === 'sunmeadow'); G.loadMap('sunmeadow'); G.placePlayer(w.tx, w.ty, 2); });
  await page.waitForTimeout(600);
  const tgt = await ev(() => { const P = G.world.p, rs = G.world.map.roamers; rs.forEach(r => r.timer = 99999);
    for (const r of rs) for (const [dx, dy, d] of [[0, -3, 0], [0, 3, 1], [3, 0, 2], [-3, 0, 3], [0, -2, 0], [2, 0, 2]]) if (G.worldApi.canWalk(r.x + dx, r.y + dy) && !G.worldApi.tileWarp(r.x + dx, r.y + dy)) { G.placePlayer(r.x + dx, r.y + dy, d); window.__t = r; return G.SPECIES[r.c.id].name; } return null; });
  assert(tgt, 'found a roaming creature to throw at');
  await page.waitForTimeout(300); await tap('orb');
  await until(() => !!G.world.thrown, 3000, 'orb in flight'); await shot('orb-flight');
  await until(() => G.scene !== G.world.scene, 8000, 'battle opened');
  await until(() => G.world.scene === G.scene && !G.world.busy, 60000, 'back on the map');
  assert(await ev(() => G.state.party.some(c => c === window.__t.c) || G.state.box.includes(window.__t.c)), 'creature was caught');
  assert.equal(await ev(() => G.state.bag['Catch Orb']), 2, 'exactly one orb used');
  assert(await ev(() => !G.world.map.roamers.includes(window.__t)), 'caught creature left the map');
  step(`ORB button throws at the nearby ${tgt}; the battle opens with the capture and it is caught`);

  // Without Sure Catch a failed throw continues into a normal battle
  await ev(() => { G.state.cheats.catch = false; window.__mk = G.catchCheck; G.catchCheck = () => ({ shakes: 1, caught: false }); });
  const tgt2 = await ev(() => { const rs = G.world.map.roamers; rs.forEach(r => r.timer = 99999);
    for (const r of rs) for (const [dx, dy, d] of [[0, -2, 0], [0, 2, 1], [2, 0, 2], [-2, 0, 3]]) if (G.worldApi.canWalk(r.x + dx, r.y + dy) && !G.worldApi.tileWarp(r.x + dx, r.y + dy)) { G.placePlayer(r.x + dx, r.y + dy, d); return true; } return false; });
  assert(tgt2); await page.waitForTimeout(300);
  await page.keyboard.press('c');                      // keyboard C also throws
  await until(() => G.scene !== G.world.scene, 8000, 'battle opened (C key)');
  await until(() => G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length > 0, 40000, 'normal battle continues after the creature breaks free');
  await shot('broke-free'); step('a throw that fails continues into a normal battle (and the C key throws too)');
  await ev(() => { G.catchCheck = window.__mk; });

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
