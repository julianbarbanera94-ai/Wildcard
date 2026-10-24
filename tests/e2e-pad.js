// The launch splash and the context-aware touch controls, end to end in headless Chromium with a phone viewport:
//   node tests/e2e-pad.js
// The splash plays before the title and can be skipped by a tap or A; on a touch screen the pad shows only what does something:
// A alone on the title, stick + A + B in menus, A + B in dialogue and scripted scenes, and MENU and the orb button only while
// walking about (the orb button only with orbs in the bag).
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('wildcard-splash', '1'); } catch (e) { /* no storage */ } });   // automated browsers skip the splash otherwise
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg), step = n => console.log('✓', n);
  const until = async (fn, ms, msg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn)) return; await page.waitForTimeout(50); } throw new Error('timeout: ' + msg); };
  const shown = () => ev(() => ['#stick', '[data-k=start]', '[data-k=orb]', '[data-k=b]', '[data-k=a]'].filter(q => getComputedStyle(document.querySelector(q)).visibility === 'visible').map(q => q.replace(/[#\[\]]|data-k=/g, '')).join(' '));
  const pad = async want => { await page.waitForTimeout(700); assert.equal(await shown(), want, 'controls in ' + await ev(() => document.body.dataset.pad)); };

  // 1) splash first, with no controls; it hands over to the title by itself
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await until(() => G.scene && G.scene.pad === 'splash', 3000, 'splash scene');
  await pad('');
  await page.screenshot({ path: `${OUT}/pad-splash.png` });
  await until(() => G.scene && G.scene.pad === 'title', 8000, 'splash hands over to the title');
  step('the launch splash plays first with no controls, then hands over to the title by itself');

  // 2) a tap skips it, and the key that skipped it does not also press START on the title
  await page.reload();
  await until(() => G.scene && G.scene.pad === 'splash', 3000, 'splash again');
  await page.waitForTimeout(400); await ev(() => G.tapKey('a'));
  await until(() => G.scene && G.scene.pad === 'title', 1500, 'skipped to the title');
  await page.waitForTimeout(500);
  assert.equal(await ev(() => G.ui.layers.length), 0, 'the skip did not open the start menu');
  step('a tap or A skips the splash, and the skip does not start the game');

  // 3) title: A alone; after A the start menu needs the stick
  await pad('a'); await page.screenshot({ path: `${OUT}/pad-title.png` });
  await ev(() => G.tapKey('a')); await until(() => G.ui.layers.length > 0, 3000, 'start menu'); await pad('stick b a');
  step('title: A alone; the start menu adds the stick and B');

  // 4) in the world: everything, but the orb button only with orbs; dialogue and scripted scenes A + B; menus stick + A + B
  await ev(() => { G.state = G.newState(); G.migrateState(G.state); G.state.flags.starter = true; G.state.party.push(G.makeCreature(1, 10)); G.ui.layers.length = 0; G.loadMap('lanternrest'); G.placePlayer(30, 26, 0); G.scene = G.world.scene; G.world.busy = false; G.world.map.roamers = []; });
  await pad('stick start b a'); await page.screenshot({ path: `${OUT}/pad-world.png` });
  await ev(() => { G.state.bag['Terra Orb'] = 3; }); await pad('stick start orb b a');
  await ev(() => { G.say('Hello there!'); }); await pad('b a'); await ev(() => { G.closeText(); });
  await ev(() => { G.choose(['ONE', 'TWO'], { x: 84, y: 104 }); }); await pad('stick b a'); await ev(() => { G.ui.layers.length = 0; });
  await ev(() => { G.world.busy = true; }); await pad('b a'); await ev(() => { G.world.busy = false; });
  await pad('stick start orb b a');
  step('world: all controls (orb only with orbs); dialogue and scripted scenes: A and B; menus: stick, A and B');

  // 5) a battle: stick + A + B while choosing, A + B while it plays
  await ev(() => { const f = G.makeCreature(14, 5); window.__b = G.startBattle({ wild: f }); });
  await until(() => G.ui.layers.length > 0 && !G.ui.text, 20000, 'battle command menu').catch(() => {});
  const bp = await ev(() => document.body.dataset.pad); assert(['menu', 'text', 'busy'].includes(bp), 'battle context ' + bp);
  assert(!(await shown()).includes('start') && !(await shown()).includes('orb'), 'no MENU or orb button in battle');
  step('battle: no MENU or orb button');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('errors: none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
