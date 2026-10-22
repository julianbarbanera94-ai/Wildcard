// Tap-to-select (touch / mouse) on menus, the title and the on-screen keyboard: node tests/e2e-touch.js
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/t-${n}.png` });
  const key = async (k, hold = 60) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const until = async (fn, ms = 15000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(60); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const step = n => console.log('✓', n);
  // tap a point given in the 240x160 UI space
  const tapUI = async (x, y) => { const p = await ev(([x, y]) => { const r = document.getElementById('screen').getBoundingClientRect(); return [r.left + (x + G.uiX) / G.W * r.width, r.top + (y + G.uiY) / G.H * r.height]; }, [x, y]); await page.mouse.click(p[0], p[1]); await page.waitForTimeout(120); };
  // tap the centre of menu item i of the topmost menu (zone 0 is the dismiss-all background)
  const tapItem = async i => { const c = await ev(i => { const zs = G.zones.slice(1); const z = zs[i]; return [z.x + z.w / 2, z.y + z.h / 2]; }, i); await tapUI(c[0], c[1]); };

  await page.waitForTimeout(500);
  await tapUI(120, 80);                                  // tap anywhere on the title
  await until(() => G.ui.layers.length > 0, 4000, 'title menu'); step('tapping the title opens the menu');
  await tapItem(0);                                      // NEW GAME
  for (let i = 0; i < 80 && await ev(() => !G.state || G.world.busy || G.ui.text || G.ui.layers.length); i++) {   // dialogue and choices: tap through
    if (await ev(() => G.ui.layers.length > 0 && G.zones.length > 1)) await tapItem(0); else await tapUI(120, 80);
    await page.waitForTimeout(60);
  }
  await until(() => G.state && !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 60000, 'world idle');
  step('a new game can be started and the intro clicked through with taps alone');

  // settings -> test mode -> password typed on the on-screen keyboard by tapping keys
  await key('Enter'); await until(() => G.ui.layers.length > 0 && G.zones.length > 5, 3000, 'start menu');
  await tapItem(8); await until(() => G.ui.layers.length > 0 && G.zones.length >= 4, 3000, 'settings'); await tapItem(1);
  await until(() => !!G.keyHook, 3000, 'text entry'); await ev(() => { G.keyHook = null; });
  await shot('keyboard');
  const rows = ['abcdefghij', 'klmnopqrst', 'uvwxyz0123', '456789-_.@'];
  for (const ch of 'abc610') { const r = rows.findIndex(l => l.includes(ch)), c = rows[r].indexOf(ch); await tapUI(28 + c * 18 + 8, 54 + r * 18 + 8); }
  assert.equal(await ev(() => G.textEntryProbe().text), 'abc610', 'keys typed by tapping'); step('on-screen keyboard keys respond to taps');
  await tapUI(28 + 2 * 45 + 21, 138);                    // OK
  await until(() => G.state.cheats && G.state.cheats.unlocked, 8000, 'unlock'); step('the password abc610 unlocks Test Mode');
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
