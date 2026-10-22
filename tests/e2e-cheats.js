// Settings + Test Mode (password abc610) through the real menus: node tests/e2e-cheats.js
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  const key = async (k, hold = 60) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/c-${n}.png` });
  const until = async (fn, ms = 15000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(60); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const advance = async (cond, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(cond)) return; if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(80); } await shot('timeout'); throw new Error('timeout advancing ' + cond); };
  const idle = () => advance(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length);
  const step = n => console.log('✓', n);
  const typeKeys = async s => { for (const ch of s) await page.keyboard.type(ch, { delay: 30 }); };

  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await idle();
  assert(!(await ev(() => G.cheat('god') || !!G.state.cheats)), 'test mode starts off');
  const openSettings = async () => { await key('Enter'); await until(() => G.ui.layers.length > 0, 3000, 'start menu'); for (let i = 0; i < 8; i++) await key('ArrowDown'); await key('z'); await until(() => G.ui.layers.length > 0, 3000, 'settings'); };

  // wrong password via keyboard typing
  await openSettings(); await shot('settings'); await key('ArrowDown'); await key('z');
  await until(() => !!G.keyHook, 3000, 'text entry'); await typeKeys('nope'); await shot('password-entry'); await key('Enter');
  await advance(() => G.ui.layers.length > 0 && !G.keyHook && !G.ui.text, 8000);
  assert(!(await ev(() => G.state.cheats && G.state.cheats.unlocked)), 'wrong password rejected'); step('a wrong password is rejected');
  for (let i = 0; i < 8 && await ev(() => G.world.busy); i++) { await key('x'); await page.waitForTimeout(150); }
  await idle();

  // right password with the on-screen keyboard (arrow keys + A): J = shift page, then walk the grid
  await openSettings(); await key('ArrowDown'); await key('z'); await until(() => !!G.keyHook, 3000, 'text entry');
  await ev(() => { window.__hook = G.keyHook; G.keyHook = null; });    // force the on-screen path; the keyboard path was covered above
  const pick = async ch => { const c = await ev(ch => { const P = [['abcdefghij', 'klmnopqrst', 'uvwxyz0123', '456789-_.@'], ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ0123', '456789-_.@']]; for (const [pi, pg] of P.entries()) for (const [r, line] of pg.entries()) { const i = line.indexOf(ch); if (i >= 0) return [pi, r, i]; } }, ch); return c; };
  const probe = () => ev(() => G.textEntryProbe());
  const goto = async (r, c) => {
    for (let i = 0; i < 8 && (await probe()).row !== r; i++) await key('ArrowDown', 30);
    for (let i = 0; i < 12 && (await probe()).col !== c; i++) await key('ArrowRight', 30);
  };
  for (const ch of 'abc610') {
    const [pi, r, c] = await pick(ch);
    if ((await probe()).page !== pi) { await goto(4, 0); await key('z'); }
    await goto(r, c); await key('z');
  }
  assert.equal((await probe()).text, 'abc610', 'on-screen keyboard typed the password');
  await goto(4, 2); await key('z');   // OK
  await advance(() => G.state.cheats && G.state.cheats.unlocked && G.ui.layers.length > 0 && !G.ui.text, 10000);
  await shot('test-menu'); step('the right password (typed on the on-screen keyboard) unlocks Test Mode');

  // UNLOCK EVERYTHING
  await key('z'); await advance(() => G.state.flags.lanternLit && !G.ui.text, 10000);
  const st = await ev(() => ({ dex: Object.values(G.state.dex).filter(v => v > 1).length, shards: ['meadow', 'marsh', 'mine'].every(k => G.state.flags['shard_' + k] && G.state.flags['placed_' + k]), money: G.state.money, orbs: G.state.bag['Terra Orb'], lit: G.state.flags.lanternLit, on: G.state.cheats }));
  assert.equal(st.dex, await ev(() => Object.keys(G.SPECIES).length)); assert(st.shards && st.lit); assert.equal(st.orbs, 99); assert(st.money >= 9999999); assert(st.on.god && st.on.catch && st.on.pp && st.on.items && st.on.money);
  step('UNLOCK EVERYTHING: full Dex, shards placed, Lantern lit, items x99, money, all infinite options on');

  // ADD CREATURE
  await ev(() => { G.state.party.length = 0; G.state.party.push(G.makeCreature(4, 20)); });
  await key('ArrowDown', 60); for (let i = 0; i < 5; i++) await key('ArrowDown', 40);     // ADD CREATURE is item index 6
  await key('z'); await until(() => G.ui.layers.length > 0, 3000);
  for (let i = 0; i < 24; i++) await key('ArrowDown', 25);                                  // Joker (#25)
  await shot('pick-creature'); await key('z'); await until(() => G.ui.layers.length > 0, 3000); await key('ArrowDown', 40); await key('ArrowDown', 40); await key('ArrowDown', 40); await key('ArrowDown', 40); await key('z');
  await advance(() => G.state.party.length === 2 && !G.ui.text, 8000);
  assert.equal(await ev(() => G.state.party[1].id), 25); assert.equal(await ev(() => G.state.party[1].lvl), 100); step('ADD CREATURE gives a chosen species at a chosen level');
  for (let i = 0; i < 8 && await ev(() => G.world.busy); i++) { await key('x'); await page.waitForTimeout(150); }
  await idle();

  // battle effects: god mode (no damage), infinite PP / items, sure catch on the first orb
  await ev(() => { const S = G.state; S.party.length = 0; const c = G.makeCreature(1, 10); c.moves = [{ id: 'Tackle', pp: 1 }]; S.party.push(c); S.bag = { 'Terra Orb': 1 }; window.__res = undefined;
    const foe = G.makeCreature(25, 60); G.runWorld(async () => { window.__res = await G.startBattle({ wild: foe }); await G.fadeTo(0, 5); }); });
  const cmdReady = () => G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length > 0;
  for (let turn = 0; turn < 3; turn++) { await advance(cmdReady, 40000); await key('z', 50); await key('z', 50); }   // FIGHT -> Tackle three times with 1 PP
  await advance(cmdReady, 40000);
  const mid = await ev(() => ({ hp: G.state.party[0].hp, max: G.state.party[0].stats.hp, pp: G.state.party[0].moves[0].pp }));
  assert.equal(mid.hp, mid.max, 'god mode: a level-60 Joker did no damage'); assert.equal(mid.pp, 1, 'infinite PP'); step('GOD MODE (no damage) and INFINITE PP hold through three turns against a Lv60 Joker');
  await key('ArrowRight'); await key('z'); await page.waitForTimeout(400); await key('z');      // BAG -> first item (an orb, bag refilled to 99 by the tick or kept)
  await until(() => window.__res !== undefined, 60000, 'catch');
  assert.equal(await ev(() => window.__res), 'caught'); assert.equal(await ev(() => G.state.bag['Terra Orb']), 1, 'infinite items: the orb was not used up'); step('SURE CATCH catches a Lv60 legendary with the first orb, and the orb is not used up');

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
