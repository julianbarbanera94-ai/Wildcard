// Cave mouths and doorways lead somewhere, end to end in headless Chromium: node tests/e2e-mouths.js
// Walks into every generated cave / the Dune Elders' Hall / the Cloudpeak castle on foot, then back out through the exit.
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const hold = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); await page.waitForTimeout(60); };
  const key = (k, ms = 70) => hold(k, ms);
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await ev(() => { G.state = G.newState(); G.migrateState(G.state); G.state.flags.starter = true; G.state.party.length = 0; G.state.party.push(G.makeCreature(1, 30)); G.scene = G.world.scene; });
  const until = async (fn, ms, msg, arg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn, arg)) return; await page.waitForTimeout(50); } await page.screenshot({ path: `${OUT}/mouths-timeout.png` }); throw new Error('timeout: ' + msg); };
  const settle = () => until(() => !G.world.busy && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 8000, 'idle');
  // one entrance per destination
  const doors = await ev(() => {
    const out = {};
    for (const m of Object.values(G.MAPS)) for (const w of m.warps) if (/^(mouth_|dune_hall|cloud_castle)/.test(w.to) && !out[w.to]) out[w.to] = { map: m.id, x: w.x, y: w.y };
    return out;
  });
  const names = Object.keys(doors);
  assert(names.length >= 6, 'expected the generated places, got ' + names.join());
  let n = 0;
  for (const dest of names) {
    const d = doors[dest];
    await ev(([d]) => { G.state.flags.finale = false; G.loadMap(d.map); G.placePlayer(d.x, d.y + 1, 0); G.scene = G.world.scene; }, [d]);
    await settle();
    await hold('ArrowUp', 400);
    await until(m => G.world.mapId === m, 6000, 'enter ' + dest, dest);
    await settle();
    const info = await ev(() => { const m = G.MAPS[G.world.mapId]; return { exits: m.warps.filter(w => !/^(mouth_|dune_hall|cloud_castle)/.test(w.to)).length, home: m.warps[0].to }; });
    assert(info.exits >= 1, dest + ' has no way out');
    // walk to the exit warp and leave
    const ex = await ev(() => { const m = G.MAPS[G.world.mapId], w = m.warps[0]; return { x: w.x, y: w.y, px: G.world.p.x, py: G.world.p.y, back: w.to }; });
    await ev(e => { G.placePlayer(e.x, e.y - 1, 1); }, ex);
    await settle();
    await hold('ArrowDown', 400);
    await until(m => G.world.mapId === m, 6000, 'leave ' + dest, ex.back);
    n++;
  }
  console.log('✓ walked into and out of', n, 'places:', names.join(', '));
  assert(!errors.length, errors.join('\n'));
  console.log('errors: none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
