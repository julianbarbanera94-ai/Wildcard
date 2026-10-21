// End-to-end playthrough in headless Chromium: node tests/e2e-play.js
// env: OUT=<dir for screenshots> PW=<path to playwright>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(300);
  const key = async (k, hold = 90) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(60); };
  const ev = fn => page.evaluate(fn);
  const shot = n => page.screenshot({ path: `${OUT}/${n}.png` });
  const until = async (fn, ms = 15000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(60); } throw new Error('timeout waiting for ' + (msg || fn)); };
  const mash = async (n, k = 'z') => { for (let i = 0; i < n; i++) await key(k, 50); };
  const step = (name) => console.log('✓', name);

  // --- new game ---
  await key('z'); await key('z');                          // title -> NEW GAME
  await until(() => G.state && G.world.busy, 5000, 'intro');
  await shot('01-intro');
  for (let i = 0; i < 30 && await ev(() => G.world.busy); i++) await key('z', 50);
  await until(() => !G.world.busy, 8000, 'intro finished');
  assert.equal(await ev(() => G.state.map), 'cottage'); step('new game starts in the cottage');

  // --- walk out of the house with real key input ---
  await key('ArrowDown', 700);
  await until(() => G.state && G.world.mapId === 'lanternrest', 6000, 'walk to Lanternrest'); await page.waitForTimeout(700);
  await shot('02-pebble'); step('walked out of the cottage into Lanternrest');

  // --- gating: can't enter grass without a starter ---
  await ev(() => { G.placePlayer(14, 2, 1); });
  await key('ArrowUp', 600);
  await until(() => G.world.busy, 3000, 'gate message'); await mash(4, 'z'); await until(() => !G.world.busy);
  assert.equal(await ev(() => G.world.mapId), 'lanternrest'); step('roads are blocked until a starter is chosen');

  // --- pick the starter in the lab ---
  await ev(() => { G.loadMap('shrine'); G.placePlayer(5, 4, 1); });
  await page.waitForTimeout(300); await key('z');
  await until(() => G.ui.text, 3000); await page.waitForTimeout(800); await shot('03-starter-pick');
  await mash(3, 'z');                                       // finish text, YES
  await until(() => G.state.party.length === 1, 8000, 'starter chosen'); await mash(6, 'z'); await until(() => !G.world.busy, 8000);
  assert.equal(await ev(() => G.state.party[0].id), 4); step('chose starter (Splashling)');
  await ev(() => { G.state.bag['Catch Orb'] = 10; G.state.bag.Potion = 3; });

  // helpers for battles: advance text with A only when the game is waiting on it
  const cmdReady = () => G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length > 0;
  const advance = async (cond, ms = 30000, msg = '') => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      if (await page.evaluate(cond)) return;
      if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(80);
    }
    throw new Error('timeout advancing to ' + (msg || cond));
  };

  // --- wild battle & capture ---
  await ev(() => { G.loadMap('sunmeadow'); G.placePlayer(10, 20, 1); window.__wild = G.makeCreature(10, 3); window.__wild.hp = 1; G.runWorld(async () => { window.__res = await G.startBattle({ wild: window.__wild }); await G.fadeTo(0, 5); }); });
  await advance(cmdReady, 20000, 'command menu');
  await page.waitForTimeout(300); await shot('05-command-menu');
  await key('z'); await page.waitForTimeout(300); await shot('06-move-menu'); await key('x'); await page.waitForTimeout(200);
  await key('ArrowRight'); await key('z'); await page.waitForTimeout(300); await shot('07-bag');   // BAG
  await key('z');                                                                                  // first item = Catch Orb
  await until(() => window.__res !== undefined, 40000, 'battle result'); await page.waitForTimeout(500);
  const res = await ev(() => window.__res);
  assert.equal(res, 'caught'); assert.equal(await ev(() => G.state.party.length), 2);
  assert.equal(await ev(() => G.state.dex[10]), 2); assert.equal(await ev(() => G.state.bag['Catch Orb']), 9);
  await until(() => !G.world.busy, 5000); step('caught a wild creature with an orb (party=2, dex marked, orb consumed)');

  // --- trainer battle: fight to the end, get EXP / level up ---
  await ev(() => { window.__res = undefined; const c = G.makeCreature(10, 2); G.runWorld(async () => { window.__res = await G.startBattle({ trainer: { name: 'TEST', cls: 'YOUNGSTER', style: { hair: '#000', skin: '#fca', shirt: '#0a0', pants: '#00a' }, team: [c], prize: 10, win: 'You win!' } }); await G.fadeTo(0, 5); }); });
  const lvl0 = await ev(() => G.state.party[0].lvl), money0 = await ev(() => G.state.money);
  let shotDone = false;
  for (let i = 0; i < 400 && (await ev(() => window.__res === undefined)); i++) {
    if (await ev(cmdReady)) { if (!shotDone) { shotDone = true; await shot('08-trainer-battle'); } await key('z', 50); await key('z', 50); }   // FIGHT -> first move
    else if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(80);
  }
  assert.equal(await ev(() => window.__res), 'win'); await until(() => !G.world.busy, 8000);
  assert(await ev(() => G.state.money) > money0, 'prize money awarded');
  console.log(`   party[0] level ${lvl0} -> ${await ev(() => G.state.party[0].lvl)}, exp ${await ev(() => G.state.party[0].exp)}`);
  step('won a trainer battle (prize money + EXP awarded)');

  // --- encounters when walking in tall grass ---
  await ev(() => { G.loadMap('sunmeadow'); G.placePlayer(9, 15, 2); window.__origRandom = Math.random; Math.random = () => 0.01; });
  await page.waitForTimeout(200); await key('ArrowLeft', 400);
  await until(() => G.scene !== G.world.scene, 6000, 'grass encounter'); await ev(() => { Math.random = window.__origRandom; });
  await advance(cmdReady, 20000, 'encounter command menu'); await shot('09-grass-encounter');
  await key('ArrowDown'); await key('ArrowRight'); await key('z');            // RUN (index 3)
  await until(() => G.scene === G.world.scene && !G.world.busy, 30000, 'back in overworld'); step('walking into tall grass triggers a wild battle; RUN returns to the overworld');
  await until(() => !G.world.busy && G.ui.fade.a === 0, 15000, 'world idle after RUN');

  // --- Center heal, shop & PC through the real menus ---
  await ev(() => { G.state.party[0].hp = 3; G.state.party[0].status = 'psn'; G.loadMap('lodge'); G.placePlayer(4, 3, 1); });
  await page.waitForTimeout(300); await key('z');
  await advance(() => G.ui.layers.length > 0, 8000, 'heal yes/no'); await key('z');          // YES
  await until(() => G.state.party[0].hp === G.state.party[0].stats.hp, 8000, 'healed'); await advance(() => !G.world.busy, 15000);
  assert.equal(await ev(() => G.state.party[0].status), null); step('Warden Lodge heals HP and status');
  await ev(() => { G.loadMap('post'); G.placePlayer(4, 4, 1); G.state.money = 1000; });
  await page.waitForTimeout(300); await key('z'); await advance(() => G.ui.layers.length >= 2, 8000, 'shop menu');
  await shot('10-shop'); await key('z'); await page.waitForTimeout(500); await shot('10b-shop-buy');
  await key('z');                                                                                           // BUY -> Catch Orb
  await advance(() => G.ui.text && G.ui.text.lines.join(' ').includes('How many') && G.ui.text.shown > 20, 8000, 'quantity picker'); await page.waitForTimeout(400); await key('ArrowUp'); await page.waitForTimeout(150); await shot('10c-shop-qty'); await key('z');   // qty 2
  await until(() => G.state.money === 600, 6000, 'purchase'); assert.equal(await ev(() => G.state.bag['Catch Orb']), 11); step('bought 2 Catch Orbs at the Trading Post ($1000 -> $600)');
  await ev(() => { G.ui.layers.length = 0; G.closeText(); G.world.busy = false; });

  // --- start menu, party, bag, dex screens render ---
  await ev(() => { G.loadMap('lanternrest'); G.placePlayer(14, 9, 0); });
  await page.waitForTimeout(300); await key('Enter'); await page.waitForTimeout(300); await shot('11-start-menu');
  await key('ArrowDown'); await key('z'); await page.waitForTimeout(300); await shot('12-party'); await key('z'); await page.waitForTimeout(250); await shot('12b-party-submenu');
  await key('ArrowDown'); await key('z'); await page.waitForTimeout(300); await shot('13-summary'); await key('x'); await key('x'); await key('x');
  await key('ArrowUp'); await key('z'); await page.waitForTimeout(300); await shot('14-dex'); await key('x');
  await key('ArrowDown', 80); await key('ArrowDown', 80); await key('z'); await page.waitForTimeout(300); await shot('15-bag'); await key('x'); await key('x'); await page.waitForTimeout(200);
  step('menus (party/summary/dex/bag) render without errors');

  // --- save and continue after a page reload ---
  await ev(() => { G.state.money = 4242; G.saveGame(); });
  await page.reload(); await page.waitForTimeout(400); await key('z'); await page.waitForTimeout(200); await shot('16-continue-menu'); await key('z');
  await until(() => G.state && G.scene === G.world.scene, 6000, 'continue'); await page.waitForTimeout(600);
  assert.equal(await ev(() => G.state.money), 4242); assert.equal(await ev(() => G.state.party.length), 2); step('save + reload + CONTINUE restores the game');
  await shot('17-continued');

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
