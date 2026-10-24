// Game controllers, end to end in headless Chromium with a fake gamepad: node tests/e2e-gamepad.js
// Both input paths (the browser Gamepad API, and G.pad.native / G.pad.axes which the Android shell calls) drive the game's keys;
// Xbox and Nintendo styles; the D-pad and left stick move; the touch buttons hide while a controller is in use and return on a
// touch; SET UP CONTROLLER rebinds buttons (and refuses a button already used); bindings survive a reload.
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  // a controllable fake gamepad for navigator.getGamepads()
  await ctx.addInitScript(() => {
    window.__gp = null;
    window.__pad = (down = [], axes = [0, 0]) => { const b = Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })); window.__gp = { id: 'Backbone One (STANDARD GAMEPAD Vendor: 358a Product: 0002)', connected: true, buttons: b, axes }; };
    navigator.getGamepads = () => [window.__gp];
  });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg), step = n => console.log('✓', n), frames = (n = 4) => page.waitForTimeout(n * 20);
  const held = () => ev(() => Object.keys(G.input.held).filter(k => G.input.held[k]).sort().join('+'));
  const pad = async (down, axes) => { await ev(([d, a]) => window.__pad(d, a), [down, axes || [0, 0]]); await page.waitForTimeout(120); };
  const until = async (fn, ms, msg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn)) return; await page.waitForTimeout(40); } throw new Error('timeout: ' + msg); };
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(500);
  await ev(() => { G.state = G.newState(); G.migrateState(G.state); G.state.flags.starter = true; G.state.party.push(G.makeCreature(1, 10)); G.ui.layers.length = 0; G.loadMap('lanternrest'); G.placePlayer(30, 26, 0); G.scene = G.world.scene; G.world.busy = false; G.world.map.roamers = []; });

  // 1) browser Gamepad API: face buttons, D-pad and the left stick; defaults are Xbox style
  assert.equal(await ev(() => G.pad.connected()), false, 'no controller yet');
  await pad([0]); assert.equal(await held(), 'a', 'button 0 is A');
  await pad([1]); assert.equal(await held(), 'b', 'button 1 is B');
  await pad([9]); assert.equal(await held(), 'start', 'MENU button opens the menu key');
  await pad([2]); assert.equal(await held(), 'orb'); await pad([3]); assert.equal(await held(), 'ride');
  await pad([12]); assert.equal(await held(), 'up'); await pad([15]); assert.equal(await held(), 'right');
  await pad([], [-1, 0]); assert.equal(await held(), 'left', 'left stick'); await pad([], [0, 1]); assert.equal(await held(), 'down');
  await pad([], [.3, .2]); assert.equal(await held(), '', 'inside the dead zone');
  await pad([0, 14]); assert.equal(await held(), 'a+left'); await pad([]); assert.equal(await held(), '');
  assert.equal(await ev(() => G.pad.connected() && /Backbone/.test(G.pad.name())), true, 'the controller is named');
  step('browser Gamepad API: A, B, MENU, orb, ride, the D-pad and the left stick drive the game keys');

  // 2) the touch buttons step aside, and come back on a touch
  await pad([0]); await page.waitForTimeout(500); await pad([]);
  assert.deepEqual(await ev(() => [document.body.dataset.input, document.body.dataset.padhide, getComputedStyle(document.getElementById('pad')).opacity]), ['pad', '1', '0']);
  await page.screenshot({ path: `${OUT}/gamepad-hidden.png` });
  await page.touchscreen.tap(200, 200); await page.waitForTimeout(500);
  assert.deepEqual(await ev(() => [document.body.dataset.input, getComputedStyle(document.getElementById('pad')).opacity]), ['touch', '1']);
  await ev(() => { G.setPref('controls.padHide', false); }); await pad([0]); await page.waitForTimeout(500); await pad([]);
  assert.equal(await ev(() => getComputedStyle(document.getElementById('pad')).opacity), '1', 'the setting keeps the touch buttons');
  await ev(() => { G.setPref('controls.padHide', true); });
  step('touch buttons hide while the controller is used, return on a touch, and the setting can keep them');

  // 3) Nintendo style swaps A and B
  await ev(() => { G.setPref('controls.padLayout', 'nintendo'); });
  await pad([1]); assert.equal(await held(), 'a', 'right button is A'); await pad([0]); assert.equal(await held(), 'b'); await pad([]);
  await ev(() => { G.setPref('controls.padLayout', 'xbox'); });
  step('Nintendo style swaps A and B');

  // 4) the Android shell path: native button and stick events; the Gamepad API is ignored while it is sending
  await ev(() => G.pad.native(0, true, 'Backbone One')); await frames(); assert.equal(await held(), 'a');
  await pad([1]); await page.waitForTimeout(150); assert.equal(await held(), 'a', 'the browser path is ignored while the shell sends events');
  await ev(() => G.pad.native(0, false)); await frames(); assert.equal(await held(), '');
  await ev(() => G.pad.axes(0, -1, 0, 0)); await frames(); assert.equal(await held(), 'up'); await ev(() => G.pad.axes(0, 0, 1, 0)); await frames(); assert.equal(await held(), 'right', 'hat axes (D-pad on some pads)');
  await ev(() => G.pad.axes(0, 0, 0, 0)); await frames(); assert.equal(await held(), '');
  step('Android shell events (G.pad.native and G.pad.axes) drive the keys and win over the browser path');

  // 5) set up the controller: press a button for each action; a button already used is refused; the result is saved
  await ev(() => { window.__native = true; });
  const press = async i => { await ev(i => G.pad.native(i, true), i); await page.waitForTimeout(100); await ev(i => G.pad.native(i, false), i); await page.waitForTimeout(100); };
  await ev(() => { window.__done = null; G.padSetup().then(r => { window.__done = r; }); });
  await until(() => G.pad.capturing(), 3000, 'waiting for a button');
  await page.screenshot({ path: `${OUT}/gamepad-setup.png` });
  await press(5); assert.equal(await ev(() => G.pad.capturing()), true, 'next action');
  await press(5); assert.equal(await ev(() => window.__done), null, 'still asking: the same button is refused');
  await press(1); await press(7); await press(6); await press(10);   // B itself is bound to B: its press must not read as the keyboard-B cancel
  await until(() => window.__done !== null, 3000, 'setup finished');
  assert.deepEqual(await ev(() => ['a', 'b', 'start', 'orb', 'ride'].map(a => G.pad.bound(a))), [5, 1, 7, 6, 10]);
  await press(0); assert.equal(await held(), '', 'the old A button no longer works');
  await ev(() => G.pad.native(5, true)); await frames(); assert.equal(await held(), 'a', 'the new A button works'); await ev(() => G.pad.native(5, false)); await frames();
  step('SET UP CONTROLLER rebinds A, B, MENU, orb and ride, and refuses a button that is already used');

  // 6) cancelling keeps the buttons; skipping keeps one; bindings survive a reload; reset restores the style
  await ev(() => { window.__done = null; G.padSetup().then(r => { window.__done = r; }); });
  await until(() => G.pad.capturing(), 3000, 'setup again');
  await page.keyboard.press('x'); await until(() => window.__done !== null, 3000, 'cancelled');
  assert.equal(await ev(() => window.__done), false); assert.equal(await ev(() => G.pad.bound('a')), 5, 'cancel keeps the buttons');
  await page.reload(); await page.waitForTimeout(500);
  assert.equal(await ev(() => G.pad.bound('a')), 5, 'bindings survive a reload');
  await ev(() => { G.pad.resetBindings(); }); assert.deepEqual(await ev(() => ['a', 'b', 'start', 'orb', 'ride'].map(a => G.pad.bound(a))), [0, 1, 9, 2, 3]);
  step('cancel keeps the buttons, bindings survive a reload, and reset restores the style defaults');

  // 7) with no controller, setup says so
  await page.reload(); await page.waitForTimeout(500);
  await ev(() => { window.__r = 'x'; G.padSetup().then(r => { window.__r = r; }); });
  await until(() => !!G.ui.text, 3000, 'the no-controller message'); assert.match(await ev(() => String(G.ui.text.lines ? G.ui.text.lines.join(' ') : G.ui.text)), /No controller/);
  step('SET UP CONTROLLER with nothing connected says so');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('errors: none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
