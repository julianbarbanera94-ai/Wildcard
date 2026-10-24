// 3D creatures in battle, end to end in headless Chromium (software WebGL): node tests/e2e-c3d.js
// Embrit is a real three.js model; its clips must play on real battle events (enter, anticipate, attack, hit, faint,
// victory, status), the battle must still finish normally, and the 2D sprite of a 3D species is a still of the model.
// 3D creatures are opt-in (localStorage 'wildcard-force3d' = '1'), so this test sets it and keeps it on.
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load|GPU stall|swiftshader/i.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => localStorage.setItem('wildcard-force3d', '1')); await page.reload(); await page.waitForTimeout(500);   // headless WebGL is software-only
  const ev = (fn, arg) => page.evaluate(fn, arg), key = async k => { await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k); await page.waitForTimeout(60); };
  const step = n => console.log('✓', n);
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z');

  assert(await ev(() => G.c3d.has(1)), 'WebGL and the Embrit model are available');
  const still = await ev(() => { const c = G.creatureSprite(1), x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < x.length; i += 4) if (x[i] > 20) n++; return [c.width, n / (c.width * c.height)]; });
  assert(still[0] === 512 && still[1] > .08, 'the 2D sprite is a render of the 3D model: ' + still);
  step('Embrit is a 3D model; menus use a still render of it');

  await ev(() => {
    G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.length = 0;
    const me = G.makeCreature(1, 40); me.moves = [{ id: 'Growl', pp: 40 }, { id: 'Ember', pp: 25 }]; S.party.push(me);
    G.loadMap('lanternrest'); G.placePlayer(29, 26, 0); G.scene = G.world.scene; G.world.busy = false; G.c3d.log.length = 0; window.__res = null;
    const foe = G.makeCreature(1, 8); foe.moves = [{ id: 'Growl', pp: 40 }];
    G.startBattle({ wild: foe }).then(r => { window.__res = r; });
  });
  const top = () => ev(() => { const L = G.ui.layers[G.ui.layers.length - 1]; return L && L.items ? String(L.items[0]) : ''; });
  // turn 1: Growl (status), turn 2+: Ember until the foe faints
  let turn = 0;
  for (let i = 0; i < 400 && !(await ev(() => window.__res)); i++) {
    const t = await top();
    if (t === 'FIGHT') { await key('z'); await page.waitForTimeout(120); if (turn++ > 0) { await key('ArrowRight'); } await key('z'); }
    else await key('z');
    if (i === 30) await page.screenshot({ path: `${OUT}/c3d-battle.png` });
  }
  const res = await ev(() => window.__res), log = await ev(() => G.c3d.log.join(' '));
  assert.equal(res, 'win', 'the battle still ends normally: ' + res + ' | ' + log);
  for (const want of ['1:front:walk', '1:back:enter', '1:back:status', '1:back:anticipate', '1:back:cast', '1:front:hit', '1:front:faint', '1:back:victory'])
    assert(log.includes(want), `clip ${want} played on its battle event | ${log}`);
  assert(log.indexOf('1:back:anticipate') < log.indexOf('1:back:cast'), 'anticipation comes before the attack');
  assert(log.indexOf('1:front:faint') < log.indexOf('1:back:victory'), 'the winner celebrates after the faint');
  assert.equal(await ev(() => G.c3d.live.size), 0, 'actors stop updating when the battle ends');
  step('battle events drive the clips: enter, status, anticipate, cast, hit, faint, victory; the battle ends normally');

  // every Embrit clip runs, finishes, and keeps the model on screen
  const clips = await ev(() => { const a = new G.c3d.Actor(1, 'front'), out = {};
    for (const n of Object.keys(a.spec.clips)) { a.reset(); a.play(n); const cl = a.cur; for (let i = 0; i < 200 && !cl.ended; i++) a.step(); const done = !!cl.ended; for (let i = 0; i < 2; i++) a.step();
      const c = a.frame(128), d = c.getContext('2d').getImageData(0, 0, 128, 128).data; let px = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) px++; out[n] = [done, px]; }
    return out; });
  for (const [n, [done, px]] of Object.entries(clips)) { assert(done, n + ' finishes'); assert(px > 600, n + ' leaves the model visible: ' + px); }
  step('all ' + Object.keys(clips).length + ' Embrit clips finish and keep the model in frame: ' + Object.keys(clips).join(', '));

  assert(!errors.length, errors.join('\n'));
  console.log('errors: none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
