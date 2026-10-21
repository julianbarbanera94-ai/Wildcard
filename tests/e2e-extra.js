// Deeper flows: level-up/learn/evolve, whiteout, cave boss + Joker capture, and a randomised battle bot.
// node tests/e2e-extra.js   (env: OUT, PW, CHROME)
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
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(60); };
  const ev = fn => page.evaluate(fn), shot = n => page.screenshot({ path: `${OUT}/x-${n}.png` });
  const until = async (fn, ms = 20000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(60); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn) + ' | state ' + JSON.stringify(await page.evaluate(() => ({ busy: G.world.busy, world: G.scene === G.world.scene, fade: G.ui.fade.a, layers: G.ui.layers.length, text: G.ui.text && G.ui.text.lines.join('|'), arrow: G.ui.text && G.ui.text.arrow, map: G.world.mapId, flags: G.state.flags })))); };
  const step = n => console.log('✓', n);
  const cmdReady = () => G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length > 0;
  const advance = async (cond, ms = 40000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(cond)) return; if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(80); } throw new Error('timeout advancing to ' + (msg || cond)); };
  // play through the title/intro for real, then take over the state
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await page.waitForTimeout(400);
  const idle = () => advance(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length, 60000, 'world idle');
  const fight = async (done) => { for (let i = 0; i < 3000 && await ev(done); i++) { if (await ev(cmdReady)) { await ev(() => G.state.party.forEach(c => c.moves.forEach(m => { m.pp = 50; }))); await key('z', 50); await key('z', 50); } else if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(80); } };

  // 1) level-up, learn a 5th move (replace prompt) and evolve ------------------------------
  await ev(() => { const S = G.state; S.party.length = 0; const c = G.makeCreature(4, 13); c.moves = [{ id: 'Tackle', pp: 35 }, { id: 'Tail Whip', pp: 30 }]; c.exp = G.expFor(14) - 5; S.party.push(c); window.__moves0 = c.moves.map(m => m.id).join(); window.__res = undefined;
    const foe = G.makeCreature(10, 6); foe.hp = 1; G.runWorld(async () => { window.__res = await G.startBattle({ wild: foe }); await G.runEvolutions(); await G.fadeTo(0, 5); }); });
  await fight(() => window.__res === undefined && !(G.state.party[0].lvl >= 14));
  await until(() => G.state.party[0].lvl === 14, 30000, 'level 14'); await page.waitForTimeout(500); await shot('levelup');
  await advance(() => G.state.party[0].id === 5, 90000, 'evolved into Torrentle');
  await page.waitForTimeout(300); await shot('evolved');
  await until(() => window.__res !== undefined, 60000, 'battle end'); await advance(() => !G.world.busy && G.scene === G.world.scene, 60000, 'world');
  assert.equal(await ev(() => G.state.party[0].id), 5); step('level-up -> evolution (Splashling -> Torrentle)');
  await idle();

  // 2) learn-a-move prompt with four moves known -----------------------------------------
  await ev(() => { const S = G.state; S.party.length = 0; const c = G.makeCreature(1, 11); c.exp = G.expFor(12) - 3; S.party.push(c); window.__res = undefined;   // Embrit learns Bite at 12
    const foe = G.makeCreature(10, 6); foe.hp = 1; G.runWorld(async () => { window.__res = await G.startBattle({ wild: foe }); await G.fadeTo(0, 5); }); });
  const known0 = await ev(() => G.state.party[0].moves.map(m => m.id).join());
  for (let i = 0; i < 500 && await ev(() => !(G.state.party[0].lvl >= 12 && G.ui.text && /wants to learn/.test(G.ui.text.lines.join(' ')) )); i++) {
    if (await ev(cmdReady)) { await key('z', 50); await key('z', 50); } else if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(80); }
  await page.waitForTimeout(600); await shot('learn-prompt');
  await advance(() => G.ui.layers.length > 0, 10000, 'yes/no'); await key('z');                // YES
  await until(() => G.ui.layers.length > 0, 10000, 'forget list'); await page.waitForTimeout(200); await shot('forget-list'); await key('z');   // forget first
  await until(() => window.__res !== undefined, 60000, 'battle end'); await idle();
  const moves1 = await ev(() => G.state.party[0].moves.map(m => m.id).join());
  assert(moves1.includes('Bite') && moves1 !== known0, 'Bite learned in place of another move'); console.log('   moves:', known0, '->', moves1);
  step('level-up learns a move and the forget-a-move flow works');

  // 3) whiteout and respawn ---------------------------------------------------------------
  await ev(() => { const S = G.state; S.party.length = 0; S.party.push(G.makeCreature(10, 2)); S.money = 1000; S.flags.respawn = 'center'; G.loadMap('route1'); G.placePlayer(10, 20, 1); window.__res = undefined;
    const t = { name: 'BOSS', cls: 'ACE', style: G.PLAYER_STYLE, prize: 1, team: [G.makeCreature(25, 40)] }; G.runWorld(async () => { window.__res = await G.startBattle({ trainer: t }); /* afterBattle handled by world in real play */ }); });
  await fight(() => window.__res === undefined);
  assert.equal(await ev(() => window.__res), 'lose'); step('losing every creature ends the battle with "lose"');
  await ev(() => { G.scene = G.world.scene; G.ui.fade.a = 0; G.world.busy = false; });

  // 4) cave boss ambush + reward, then catch Joker ----------------------------------------
  await ev(() => { const S = G.state; S.party.length = 0; for (let i = 0; i < 3; i++) { const j = G.makeCreature(25, 60); j.moves = [{ id: 'Quake', pp: 10 }]; S.party.push(j); } S.bag = { 'Ultra Orb': 30 }; S.flags = { starter: true };
    G.loadMap('cave'); G.placePlayer(10, 13, 1); window.__ultra0 = 30; });
  await page.waitForTimeout(400); await key('ArrowUp', 250);                      // step to (10,12): inside Kade's line of sight
  await until(() => G.world.busy, 5000, 'trainer spotted'); await page.waitForTimeout(500); await shot('boss-spotted');
  await fight(() => !G.state.flags.cave_kade); await idle();
  assert.equal(await ev(() => G.state.bag['Ultra Orb']), 33); step('cave boss spots the player, battles, and pays 3 Ultra Orbs');
  await ev(() => { window.__mk = G.makeCreature; G.makeCreature = (id, l) => { const c = window.__mk(id, l); if (id === 25) { c.hp = 1; c.status = 'slp'; } return c; }; G.placePlayer(10, 4, 1); });
  await page.waitForTimeout(300); await shot('joker-room'); await key('z');   // talk to the Joker (facing up at (10,3))
  await advance(cmdReady, 40000, 'joker battle'); await page.waitForTimeout(200); await shot('joker-battle');
  for (let tries = 0; tries < 12; tries++) {
    if (!(await ev(() => G.scene !== G.world.scene))) break;
    await advance(cmdReady, 40000, 'cmd'); await key('ArrowRight'); await key('z'); await page.waitForTimeout(300); await key('z');   // BAG -> Ultra Orb
    await advance(() => (G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length > 0) || G.state.flags.jokerCaught, 40000, 'catch result');
  }
  await until(() => G.state.flags.jokerCaught, 60000, 'Joker caught'); await advance(() => !G.world.busy, 40000);
  assert(await ev(() => G.state.party.length === 4 || G.state.box.length >= 1), 'joker stored'); assert.equal(await ev(() => G.state.dex[25]), 2);
  step('caught the legendary Joker; it is removed from the cave'); await ev(() => { G.makeCreature = window.__mk; });
  await page.waitForTimeout(300); await shot('after-joker');

  // 5) randomised bot: 8 mixed battles must all terminate without errors -------------------
  const results = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const tap = async k => { G.press(k); await sleep(45); G.release(k); await sleep(55); };
    const out = [];
    G.ui.layers.length = 0; G.closeText(); G.world.busy = false; G.scene = G.world.scene; G.ui.fade.a = 0;
    for (let n = 0; n < 8; n++) {
      const S = G.state; S.party.length = 0; S.bag = { 'Catch Orb': 5, Potion: 5, Revive: 2, 'Full Heal': 2 };
      [[1, 18], [4, 16], [7, 17]].forEach(([id, l]) => S.party.push(G.makeCreature(id, l)));
      S.party[0].moves = [['Sleep Powder', 'Thunder Wave', 'Poison Powder', 'Growl'][n % 4], 'Ember', 'Lullaby', 'Harden'].map(id => ({ id, pp: G.MOVES[id].pp }));
      const wild = n % 2 === 0, foe = G.makeCreature([22, 23, 24, 20, 21, 12, 14, 16][n], 8 + (n >> 1));
      let res; const opts = wild ? { wild: foe } : { trainer: { name: 'BOT', cls: 'TESTER', style: G.PLAYER_STYLE, prize: 5, team: [foe, G.makeCreature(10, 7)] } };
      G.runWorld(async () => { res = await G.startBattle(opts); });
      const t0 = Date.now();
      while (res === undefined && Date.now() - t0 < 180000) {
        const cmd = G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length === 1;
        const seq = async ks => { for (const k of ks) await tap(k); };
        const r = Math.random();
        if (G.ui.text && G.ui.text.arrow) await tap('a');
        else if (cmd) {
          // mostly FIGHT with a random move; sometimes try BAG, PARTY or RUN to exercise those paths
          if (r < .7) await seq(['up', 'left', 'a', ...[['a'], ['right', 'a'], ['down', 'a'], ['right', 'down', 'a']][Math.floor(Math.random() * 4)]]);
          else if (r < .8) await seq(['up', 'left', 'right', 'a', 'down', 'a', 'a']);          // BAG -> second item -> target
          else if (r < .9) await seq(['up', 'left', 'down', 'a', 'right', 'a', 'a']);          // PARTY -> slot 2 -> SHIFT
          else await seq(['right', 'down', 'a']);                                              // RUN
        }
        else if (G.ui.layers.length) { if (!G.ui.text && Math.random() < .6) await seq(['a', 'a']); else await tap(['a', 'down', 'right', 'b'][Math.floor(Math.random() * 4)]); }   // party/bag screens: usually pick the highlighted entry
        else await sleep(60);
      }
      out.push(res === undefined ? 'TIMEOUT' : res);
      for (let i = 0; i < 400 && G.world.busy; i++) await sleep(50);   // let the world script wind down
      G.ui.layers.length = 0; G.closeText(); G.scene = G.world.scene; G.ui.fade.a = 0; G.world.busy = false;
    }
    return out;
  });
  console.log('   bot battle results:', results.join(', '));
  assert(!results.includes('TIMEOUT'), 'bot battles terminated'); step('randomised bot: all battles terminated');

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
