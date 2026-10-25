// Save safety (js/world.js): node tests/e2e-save.js
// A save is only reported when it reads back; the previous good save is kept as a backup and a damaged save loads from it (and says so);
// the game saves itself at safe moments (after a map change, and every 30 s while idle) but never during a battle, dialogue or menu;
// leaving the app mid-battle keeps the last safe save rather than writing a half-finished one.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, arg) => page.evaluate(fn, arg), step = n => console.log('✓', n);
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const until = async (fn, ms = 20000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn)) return; await page.waitForTimeout(50); } throw new Error('timeout ' + msg); };
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 80 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await until(() => !G.world.busy && G.scene === G.world.scene && !G.ui.layers.length && !G.ui.text, 60000, 'idle');
  await ev(() => { const S = G.state; S.flags.starter = true; S.party.length = 0; S.party.push(G.makeCreature(1, 10)); S.name = 'SAFE'; localStorage.clear(); });

  // 1) a checked save, and the backup kept
  const r1 = await ev(() => { G.state.money = 111; const a = G.saveGame(1); G.state.money = 222; const b = G.saveGame(1); return [a, b, JSON.parse(localStorage.getItem('wildcard-save-v2')).money, JSON.parse(localStorage.getItem('wildcard-save-v2-bak')).money]; });
  assert.deepEqual(r1, [true, true, 222, 111]); step('a save reads back before it counts, and the previous good save is kept as a backup');
  // a write that does not stick is reported as a failure
  const fail = await ev(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/save/.test(k) && !/bak/.test(k)) throw new Error('QuotaExceeded'); return set.call(this, k, v); }; const r = G.saveGame(1); Storage.prototype.setItem = set; return r; });
  assert.equal(fail, false, 'a failed write is not reported as saved'); step('a failed write (storage full) is reported as a failure, never as "saved"');

  // 2) a damaged save loads from the backup, and the player is told
  await ev(() => { G.state.flags.starter = false; localStorage.setItem('wildcard-save-v2', '{"v":2,"party":[tru'); });   // (no autosave while we look)
  const rec = await ev(() => { const s = G.loadGame(1); return s && [s.money, !!s._recovered]; });
  assert.deepEqual(rec, [222, true], 'the backup (the last good save) is used'); assert.equal(await ev(() => G.latestSlot()), 1, 'CONTINUE still finds the slot');
  await ev(() => { localStorage.setItem('wildcard-save-v2-bak', 'nonsense'); }); assert.equal(await ev(() => G.loadGame(1)), null, 'both damaged: the slot reads as empty rather than crashing');
  step('a damaged save loads its backup (marked as recovered); with both damaged the slot is empty, no crash');
  await ev(() => { G.state.money = 333; G.saveGame(1); G.state.money = 444; G.saveGame(1); sessionStorage.setItem('corrupt', '1'); });
  await page.addInitScript(() => { if (sessionStorage.getItem('corrupt')) { sessionStorage.removeItem('corrupt'); window.__bak = JSON.parse(localStorage.getItem('wildcard-save-v2-bak')).money; localStorage.setItem('wildcard-save-v2', 'broken'); } });   // damage the save as the app starts (leaving the page would autosave over it)
  await page.reload(); await page.waitForTimeout(800);
  await key('z'); await page.waitForTimeout(500); for (let i = 0; i < 4 && await ev(() => !(G.ui.layers.length && G.ui.layers[G.ui.layers.length - 1].items)); i++) await page.waitForTimeout(200);
  const items = await ev(() => { const L = G.ui.layers[G.ui.layers.length - 1]; return L && L.items; }); assert.equal(items[0], 'CONTINUE');
  await key('z');
  await until(() => G.ui.text && /backup copy/.test(G.ui.text.lines.join(' ')), 8000, 'recovery message');
  for (let i = 0; i < 6 && await ev(() => !!G.ui.text); i++) await key('z', 60);
  await until(() => !G.world.busy && G.scene === G.world.scene, 10000);
  const bak = await ev(() => window.__bak); assert.equal(await ev(() => G.state.money), bak, 'the backup was loaded');
  assert.equal(await ev(() => JSON.parse(localStorage.getItem('wildcard-save-v2')).money), bak, 'and written back as a good save');
  step('CONTINUE on a damaged save says the backup copy was loaded, and repairs the slot');

  // 3) autosave at safe moments only
  await ev(() => { G.state.flags.starter = true; G.state.party.length || G.state.party.push(G.makeCreature(1, 10)); G.state.money = 555; G.loadMap('sunmeadow'); G.placePlayer(36, 20, 0); G.scene = G.world.scene; G.world.busy = false; G.world.map.roamers = []; });
  await until(() => JSON.parse(localStorage.getItem('wildcard-save-v2')).map === 'sunmeadow', 5000, 'autosave after a map change');
  step('the game saves itself once the overworld settles after a map change');
  await ev(() => { G.state.money = 666; window.__b = G.startBattle({ wild: G.makeCreature(4, 3) }); });
  await page.waitForTimeout(1500);
  assert.equal(await ev(() => G.autosave()), false, 'no save in a battle');
  await ev(() => { document.dispatchEvent(new Event('visibilitychange')); dispatchEvent(new Event('pagehide')); });
  assert.equal(await ev(() => JSON.parse(localStorage.getItem('wildcard-save-v2')).money), 555, 'leaving mid-battle keeps the last safe save');
  step('leaving the app in the middle of a battle keeps the last safe save (no half-finished battle is written)');
  assert.deepEqual(errors, []); console.log('errors: none'); await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
