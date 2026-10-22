// Arenas and badges, end to end in headless Chromium: node tests/e2e-arenas.js
// env: OUT=<dir for screenshots> PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 640, height: 1000 } });   // tall: a whole 15x21 arena fits on screen
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  // js/arenas.js is loaded by index.html; load it here too if the page does not have it yet
  if (!(await page.evaluate(() => !!G.arenasLoaded))) await page.addScriptTag({ path: path.resolve(__dirname, '../js/arenas.js') });
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/a-${n}.png` });
  const until = async (fn, ms = 20000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(60); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const idleNow = () => ev(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text);
  // press A through text, battle menus and the badge banner until the world is idle again
  const settle = async (ms = 90000, msg = 'idle') => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      if (await idleNow()) return;
      const st = await ev(() => ({ arrow: !!(G.ui.text && G.ui.text.arrow), cmd: !!(G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length), battle: G.scene !== G.world.scene, banner: G.world.busy && G.ui.layers.length > 0 && !G.ui.text }));
      if (st.arrow) await key('z', 50);
      else if (st.cmd) { await key('z', 50); await page.waitForTimeout(250); await key('z', 50); }
      else if (st.banner) await key('z', 50);
      else await page.waitForTimeout(80);
    }
    await shot('timeout'); throw new Error('timeout waiting for ' + msg);
  };
  const step = n => console.log('ok -', n);
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await settle(30000, 'start');

  // a strong party (Lv100) and a fresh badge slate
  await ev(() => { const S = G.state; S.flags.starter = true; S.party.length = 0; S.party.push(G.makeCreature(154, 100), G.makeCreature(155, 100), G.makeCreature(153, 100)); S.cheats = { on: true, god: true }; S.money = 1000;
    const best = Object.keys(G.MOVES).filter(k => G.MOVES[k].pow > 0 && !G.MOVES[k].recoil).sort((x, y) => G.MOVES[y].pow - G.MOVES[x].pow)[0];   // one big attack, so battles end fast
    S.party.forEach(c => { c.moves = [{ id: best, pp: 99 }]; });
    for (const b of G.BADGES) delete S.flags['badge_' + b.id]; });

  // 0) data: 8 badges, every arena has a Leader, 2-3 trainers, unique ids and teams of the right type at the WORLD.md levels
  const data = await ev(() => G.BADGES.map(b => { const m = G.MAPS['arena_' + b.city], L = m.npcs.find(n => n.trainer && n.trainer.leader), ts = m.npcs.filter(n => n.trainer && !n.trainer.leader);
    return { city: b.city, type: b.type, leader: L.trainer.name, team: L.trainer.team.map(([id, l]) => [G.SPECIES[id].name, l, G.SPECIES[id].types.join('/')]), trainers: ts.length, ids: ts.map(t => t.trainer.id).concat(L.trainer.id), door: m.arenaDoor, ok: L.trainer.team.every(([id]) => G.SPECIES[id].types.includes(b.type)) }; }));
  const LV = { stonebridge: [12, 15], sunhaven: [16, 19], lakeside: [20, 23], driftwood: [24, 27], sandsreach: [28, 31], cobalt: [32, 35], frostmere: [37, 40], emberfall: [42, 45] };
  const all = new Set();
  for (const d of data) {
    assert(d.ok, `${d.city}: Leader team is not all ${d.type}`); assert(d.team.length >= 3 && d.team.length <= 6, d.city + ' team size');
    assert(d.team.every(([n, l]) => l >= LV[d.city][0] && l <= LV[d.city][1]), `${d.city}: levels ${JSON.stringify(d.team)}`);
    assert(d.trainers >= 2 && d.trainers <= 3, d.city + ' trainers'); d.ids.forEach(i => { assert(!all.has(i), 'dup id ' + i); all.add(i); }); assert(d.door, d.city + ' has a city door');
  }
  step('8 arenas: Leaders with 3-6 creatures of their type at the WORLD.md levels, 2-3 trainers each, unique ids, wired to a city door');

  // 1) screenshots of every arena interior (and its Leader's end of the hall)
  for (const b of data) {
    await ev(c => { G.loadMap('arena_' + c); G.placePlayer(7, 12, 1); G.scene = G.world.scene; G.world.banner = null; }, b.city); await page.waitForTimeout(500);
    await shot('arena-' + b.city);
  }
  step('arena screenshots taken');

  // 2) enter from the city door, check the welcome sign and the guide
  const door = await ev(() => { const w = G.MAPS.stonebridge.warps.find(w => w.to === 'arena_stonebridge'); G.loadMap('stonebridge'); G.placePlayer(w.x, w.y + 2, 1); G.scene = G.world.scene; return { x: w.x, y: w.y }; });
  await page.waitForTimeout(400); await key('ArrowUp', 350);
  await until(() => G.world.mapId === 'arena_stonebridge', 8000, 'enter arena'); await settle();
  assert.deepEqual(await ev(() => [G.world.p.x, G.world.p.y]), [7, 19]); await shot('entrance');
  // the guide at the entrance mentions the badge count
  await ev(() => { const g = G.world.map.npcs.find(n => !n.trainer); G.placePlayer(g.x + 1, g.y, 2); }); await page.waitForTimeout(150);
  await key('z'); await until(() => G.ui.text, 3000, 'guide text'); const said = [];
  for (let i = 0; i < 8 && await ev(() => !!G.ui.text); i++) { said.push(await ev(() => G.ui.text.lines.join(' '))); await page.waitForTimeout(700); await key('z', 50); await page.waitForTimeout(150); }
  await settle(); assert(said.join(' ').includes('0 of 8 Arena Badges'), 'guide says the badge count: ' + said.join(' | '));
  step('entered Stonebridge Arena from the city door; the guide reports the badge count');

  // 3) an Arena trainer spots the player and is beaten through the real battle flow
  const tr = await ev(() => { const n = G.world.map.npcs.find(n => n.trainer && !n.trainer.leader), V = [[0, 1], [0, -1], [-1, 0], [1, 0]][n.dir];
    const tx = n.x + V[0] * 2, ty = n.y + V[1] * 2, side = [[V[1], V[0]], [-V[1], -V[0]], [V[0], V[1]]].map(([a, b]) => [tx + a, ty + b]).find(([x, y]) => G.worldApi.canWalk(x, y));
    const dir = side[0] < tx ? 3 : side[0] > tx ? 2 : side[1] < ty ? 0 : 1; G.placePlayer(side[0], side[1], dir); return { id: n.trainer.id, dir }; });
  await page.waitForTimeout(150); await key(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'][tr.dir], 120);
  await until(() => G.world.busy, 5000, 'trainer spots you'); await settle();
  assert(await ev(id => !!G.state.flags[id], tr.id), 'trainer beaten'); step('an Arena trainer spotted the player and lost');

  // 4) the Leader: battle, badge, orbs, money
  await ev(() => { G.state.party.forEach(G.healFull); G.placePlayer(7, 3, 1); }); await page.waitForTimeout(200);
  const before = await ev(() => ({ money: G.state.money, orbs: G.state.bag['Stone Orb'] || 0 }));
  assert.equal(await ev(() => G.badgeCount()), 0);
  await key('z'); await until(() => G.scene !== G.world.scene || G.ui.text, 4000, 'leader talk');
  await settle(); await shot('after-leader');
  const after = await ev(() => ({ money: G.state.money, orbs: G.state.bag['Stone Orb'] || 0, badge: !!G.state.flags.badge_keystone, n: G.badgeCount() }));
  assert(after.badge && after.n === 1, 'badge flag set'); assert.equal(after.orbs - before.orbs, 5, 'five Stone Orbs'); assert(after.money > before.money, 'prize money');
  assert.equal(await ev(() => G.badgeGate(1)), null); assert(typeof (await ev(() => G.badgeGate(2, 'DRIFTWOOD PORT'))) === 'string' && (await ev(() => G.badgeGate(2))).includes('You have 1'));
  step(`beat MASON: Keystone Badge earned, +5 Stone Orbs, +$${after.money - before.money}; gate(1) open, gate(2) still refuses`);
  // the fanfare banner itself (second badge, so we can look at it)
  await ev(() => { G.runWorld(() => G.awardBadge(G.BADGES[1])); }); await until(() => G.ui.layers.length > 0 && !G.ui.text, 6000, 'banner'); await page.waitForTimeout(900); await shot('banner'); await settle();
  assert.equal(await ev(() => G.badgeCount()), 2); await ev(() => { delete G.state.flags.badge_bloom; });

  // 5) the badge case: open with some badges, move around, close with B
  await ev(() => { for (const id of ['keystone', 'bloom', 'gale', 'circuit', 'magma']) G.state.flags['badge_' + id] = true; });
  await ev(() => { G.runWorld(() => G.badgeCase()); }); await until(() => G.ui.layers.length > 0, 3000, 'badge case'); await page.waitForTimeout(700); await shot('badge-case');
  await key('ArrowRight'); await key('ArrowRight'); await key('ArrowDown'); await page.waitForTimeout(300); await shot('badge-case-2');
  await key('x'); await until(() => G.ui.layers.length === 0, 3000, 'badge case closes'); await settle();
  assert.equal(await ev(() => G.badgeCount()), 5);
  await ev(() => { G.ui.layers.length || G.runWorld(() => G.badgeCase()); }); await until(() => G.ui.layers.length > 0, 3000);   // a tap on a badge slot, then the close button, also work
  await page.mouse.click(320, 500); await page.waitForTimeout(200); await key('Escape'); await until(() => G.ui.layers.length === 0, 3000); await settle();
  step('badge case opens, moves with the D-pad and closes with B');
  await ev(() => { for (const b of G.BADGES) delete G.state.flags['badge_' + b.id]; G.state.flags.badge_keystone = true; });

  // 6) leave back to the city door
  await ev(() => { G.placePlayer(7, 18, 0); }); await page.waitForTimeout(150); await key('ArrowDown', 400);
  await until(() => G.world.mapId === 'stonebridge', 8000, 'leave arena'); await settle();
  assert.deepEqual(await ev(() => [G.world.p.x, G.world.p.y]), [door.x, door.y + 1]);
  step('left the arena back to the city door');

  // 7) electric gates and sand pits
  await ev(() => { G.loadMap('arena_cobalt'); G.placePlayer(7, 19, 1); G.scene = G.world.scene; }); await page.waitForTimeout(300);
  assert.equal(await ev(() => G.world.map.block.size), 3, 'three closed gates');
  await ev(() => { const s = G.world.map.switches[0]; G.placePlayer(s[0] + 1, s[1], 2); }); await page.waitForTimeout(150); await key('z'); await settle(30000, 'switch');
  assert.equal(await ev(() => G.world.map.block.size), 2, 'switch opened a gate'); await shot('gates');
  await ev(() => { G.loadMap('arena_sandsreach'); const [x, y] = G.world.map.pits[0]; G.placePlayer(x, y + 1, 1); G.scene = G.world.scene; }); await page.waitForTimeout(200);
  await key('ArrowUp', 350); await settle(30000, 'pit'); assert.deepEqual(await ev(() => [G.world.p.x, G.world.p.y]), [7, 19], 'a sand pit drops you at the entrance');
  step('electric gates open with switches; sand pits slide you back to the entrance');

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
