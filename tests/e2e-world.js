// Roaming creatures and player building, end to end in headless Chromium: node tests/e2e-world.js
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
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  const key = async (k, hold = 70) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(70); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/w-${n}.png` });
  const until = async (fn, ms = 20000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(60); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const advance = async (cond, ms = 40000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(cond)) return; if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(80); } await shot('timeout'); throw new Error('timeout advancing to ' + (msg || cond)); };
  const idle = () => advance(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length, 60000, 'world idle');
  const step = n => console.log('✓', n);
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await idle();
  // put the player in Sunmeadow with a team and money
  await ev(() => { const S = G.state; S.flags.starter = true; S.party.length = 0; S.party.push(G.makeCreature(1, 14), G.makeCreature(4, 9)); S.money = 20000;
    const w = G.MAPS.lanternrest.warps.find(w => w.to === 'sunmeadow'); G.loadMap('sunmeadow'); G.placePlayer(w.tx, w.ty, 2); });
  await page.waitForTimeout(800);

  // 1) roaming creatures spawn, wander, and start a battle when touched
  const n0 = await ev(() => (G.world.map.roamers || []).length);
  assert(n0 >= 4, 'roamers spawned: ' + n0);
  const pos0 = await ev(() => G.world.map.roamers.map(r => r.x + ',' + r.y).join(' '));
  await page.waitForTimeout(6000);
  const pos1 = await ev(() => G.world.map.roamers.map(r => r.x + ',' + r.y).join(' '));
  assert.notEqual(pos0, pos1, 'roamers move around'); await shot('roamers');
  await ev(() => G.world.map.roamers.forEach(r => { r.timer = 99999; })); await page.waitForTimeout(800);
  const d = await ev(() => { const P = G.world.p, rs = G.world.map.roamers.filter(r => !r.moving); rs.sort((a, b) => Math.abs(a.x - P.x) + Math.abs(a.y - P.y) - Math.abs(b.x - P.x) - Math.abs(b.y - P.y));
    for (const r of rs) for (const [dx, dy, dir] of [[0, -1, 0], [0, 1, 1], [1, 0, 2], [-1, 0, 3]]) if (G.worldApi.canWalk(r.x + dx, r.y + dy) && !G.worldApi.tileWarp(r.x + dx, r.y + dy)) { G.placePlayer(r.x + dx, r.y + dy, dir); r.timer = 99999; r.cool = 0; window.__target = r; return dir; } return -1; });
  assert(d >= 0);
  await key(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'][d], 120);
  await until(() => G.scene !== G.world.scene, 8000, 'roamer battle'); await shot('roam-battle');
  await advance(() => G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length > 0, 30000, 'command');
  for (let i = 0; i < 30 && await ev(() => G.scene !== G.world.scene); i++) {   // escaping is random: keep picking RUN
    if (await ev(() => G.ui.text && G.ui.text.lines[0] === 'What will' && G.ui.layers.length > 0)) { await key('ArrowRight'); await key('ArrowRight'); await key('ArrowRight'); await key('z'); }
    else if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 50); else await page.waitForTimeout(150);
  }
  await idle();
  assert(await ev(() => window.__target.cool > 0 && G.world.map.roamers.includes(window.__target)), 'a creature you ran from stays but backs off');
  step(`${n0} roaming creatures spawn, wander, and start a battle when bumped into`);

  // 2) build a Healing Station through the real menu and use it
  const spot = await ev(() => { const P = G.world.p, A = G.buildApi;
    for (let r = 2; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = P.x + dx, y = P.y + dy;
      if (A.canPlace('station', x, y) && G.worldApi.canWalk(x + 1, y - 1) && G.worldApi.canWalk(x, y + 2)) return { x, y }; } return null; });
  assert(spot, 'found a building spot');
  await ev(s => { G.placePlayer(s.x + 1, s.y - 1, 0); G.world.map.roamers.forEach(r => { r.timer = 99999; }); }, spot); await page.waitForTimeout(200);
  await ev(() => G.runWorld(() => G.buildMenu())); await until(() => G.ui.layers.length >= 1, 3000, 'build menu');
  const ci = await ev(() => G.BUILD_CATS.filter(([c]) => Object.values(G.STRUCTURES).some(d => d.cat === c && !d.hidden && !d.homestead)).findIndex(c => c[0] === 'creature'));
  for (let i = 0; i < ci; i++) await key('ArrowDown');
  await key('z');                                                                            // CREATURES
  await until(() => G.ui.layers.length >= 2, 3000, 'structure list'); await shot('build-menu');
  const si = await ev(() => Object.values(G.STRUCTURES).filter(d => d.cat === 'creature' && !d.hidden && !d.homestead).map(d => d.id).indexOf('station'));
  for (let i = 0; i < si; i++) await key('ArrowRight');
  await key('z'); await page.waitForTimeout(300); await shot('build-place'); await key('z');
  await idle();
  const m0 = await ev(() => G.state.money);
  const blocked = s => ev(s => G.world.map.block.has(s.x + ',' + (s.y + 1)), s);
  assert.equal(await ev(() => G.state.builds.filter(b => b.type !== 'house').length), 1); assert.equal(m0, 20000 - 800); assert(await blocked(spot), 'station footprint is solid');
  await ev(s => { G.state.party[0].hp = 1; G.placePlayer(s.x, s.y + 2, 1); }, spot); await page.waitForTimeout(150);
  await ev(() => G.runWorld(() => G.homeUse.station(G.state.builds.find(b => b.type === 'station'))));   // HEALING (used from inside the clinic in the game)
  await until(() => G.ui.layers.length > 0, 4000, 'heal screen');
  for (let i = 0; i < 12 && await ev(() => G.state.party[0].hp !== G.state.party[0].stats.hp); i++) { await key('z', 50); await page.waitForTimeout(250); }   // HEAL TEAM
  await idle();
  assert(await ev(() => G.state.party[0].hp === G.state.party[0].stats.hp), 'station heals'); await shot('station');
  step('Healing Station: built via the build menu (cost deducted, tiles stamped) and heals the team');

  // 3) nursery: leave a creature, walk, take it back with EXP
  await ev(() => { const P = G.world.p, A = G.buildApi; for (let r = 2; r < 16; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = P.x + dx, y = P.y + dy;
      if (A.canPlace('nursery', x, y) && G.worldApi.canWalk(x + 1, y + 2)) { G.state.builds.push({ id: 'n1', type: 'nursery', map: G.world.mapId, x, y }); G.applyBuilds(G.world.map); G.placePlayer(x + 1, y + 2, 1); return; } } });
  await page.waitForTimeout(150);
  const lv0 = await ev(() => G.state.party[1].lvl);
  await ev(() => G.runWorld(() => G.homeUse.nursery(G.state.builds.find(b => b.id === 'n1'))));   // NURSERY
  await until(() => G.ui.layers.length > 0 && G.ui.text, 5000, 'nursery menu'); await key('z');   // LEAVE A CREATURE
  await until(() => G.ui.layers.length > 0 && !G.ui.text, 5000, 'party screen'); await key('ArrowRight'); await key('z');   // pick slot 2
  await advance(() => G.ui.layers.length > 0 && G.ui.text && G.ui.text.lines.join(' ').includes('Nursery: 1/'), 8000, 'nursery menu again'); await page.waitForTimeout(200); await key('ArrowDown'); await key('z');   // DONE
  await idle();
  assert.equal(await ev(() => G.state.party.length), 1); assert(await ev(() => G.state.builds.find(b => b.id === 'n1').pets.length === 1));
  await page.waitForTimeout(1200); await shot('nursery');
  await ev(() => { G.state.steps = (G.state.steps || 0) + 400; });                              // pretend we walked 400 steps
  await ev(() => G.runWorld(() => G.homeUse.nursery(G.state.builds.find(b => b.id === 'n1'))));   // NURSERY
  await advance(() => G.ui.layers.length > 0 && G.ui.text && G.ui.text.lines.join(' ').includes('Nursery:'), 8000, 'nursery menu'); await key('z');   // TAKE <creature>
  await idle();
  const lv1 = await ev(() => G.state.party[1].lvl);
  assert(lv1 > lv0, `nursery creature levelled up (${lv0} -> ${lv1})`); step(`Nursery: creature left, gained EXP while walking, came back Lv${lv0} -> Lv${lv1}`);

  // 4) base: build, walk in through the door, rest, walk out to the same door
  const door = await ev(() => { const P = G.world.p, A = G.buildApi; for (let r = 2; r < 18; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = P.x + dx, y = P.y + dy;
      if (A.canPlace('base', x, y)) { G.state.builds.push({ id: 'b1', type: 'base', map: G.world.mapId, x, y }); G.applyBuilds(G.world.map); G.placePlayer(x + 2, y + 4, 1); return { x: x + 2, y: y + 2 }; } } return null; });
  assert(door, 'found room for a base');
  await page.waitForTimeout(150); await key('ArrowUp', 450);
  await until(() => G.world.mapId === 'base', 6000, 'enter base'); await idle(); await shot('base');
  await ev(() => { G.state.party[0].hp = 1; G.placePlayer(1, 2, 1); }); await key('z'); await idle();
  assert(await ev(() => G.state.party[0].hp === G.state.party[0].stats.hp), 'bed heals');
  await ev(() => { G.placePlayer(5, 6, 0); }); await key('ArrowDown', 300);
  await until(() => G.world.mapId === 'sunmeadow', 6000, 'leave base'); await idle();
  assert.deepEqual(await ev(() => [G.world.p.x, G.world.p.y]), [door.x, door.y + 1]);
  step('Base: enter through its door, rest in the bed, exit back to the same door');

  // 5) builds survive save + reload
  await ev(() => G.saveGame()); await page.reload(); await page.waitForTimeout(400); await key('z'); await key('z');
  await until(() => G.state && G.scene === G.world.scene, 6000, 'continue'); await page.waitForTimeout(500);
  assert.equal(await ev(() => G.state.builds.filter(b => b.type !== 'house').length), 3); assert.equal(await ev(() => G.world.mapId), 'sunmeadow');
  assert(await blocked(spot), 'station still stamped after reload');
  step('builds are saved and re-stamped after reload');

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
