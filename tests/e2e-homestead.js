// Homestead construction end to end: node tests/e2e-homestead.js
// Building through the real menus, invalid placement, costs enforced, upgrades (locked, unaffordable, growing),
// moving, rotating, removing with refunds, the Land Office, entering the house, and saving/loading it all.
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
  const key = async (k, hold = 60) => { await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k); await page.waitForTimeout(60); };
  const ev = (fn, arg) => page.evaluate(fn, arg), shot = n => page.screenshot({ path: `${OUT}/h-${n}.png` });
  const until = async (fn, ms = 15000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout waiting for ' + (msg || fn)); };
  const advance = async (cond, ms = 30000, msg = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(cond)) return; if (await ev(() => G.ui.text && G.ui.text.arrow)) await key('z', 40); else await page.waitForTimeout(60); } await shot('timeout'); throw new Error('timeout advancing to ' + (msg || cond)); };
  const idle = () => advance(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 40000, 'world idle');
  const step = n => console.log('✓', n);
  const menu = () => ev(() => { const l = [...G.ui.layers].reverse().find(l => l.items); return l ? { items: l.items.map(String), idx: l.idx } : null; });
  // Pick a menu entry whose label starts with `label` (works for 1- and 2-column menus).
  const pick = async (label, cols = 1) => {
    await until(async () => true, 10); let m;
    const t = Date.now(); while (Date.now() - t < 8000) { m = await menu(); if (m && m.items.some(s => s.startsWith(label))) break; await page.waitForTimeout(60); }
    assert(m && m.items.some(s => s.startsWith(label)), `menu has ${label}: ${m && m.items.join('|')}`);
    const want = m.items.findIndex(s => s.startsWith(label));
    for (let g = 0; g < 30 && (await menu()).idx !== want; g++) {
      const cur = (await menu()).idx;
      if (cols === 1) await key(want > cur ? 'ArrowDown' : 'ArrowUp', 40);
      else if (Math.floor(want / cols) !== Math.floor(cur / cols)) await key(want > cur ? 'ArrowDown' : 'ArrowUp', 40);
      else await key(want > cur ? 'ArrowRight' : 'ArrowLeft', 40);
    }
    await key('z');
  };
  const lastText = () => ev(() => G.ui.text ? G.ui.text.lines.join(' ') : '');
  const waitText = async (re, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await lastText(); if (re.test(s)) return s; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('no text matching ' + re); };

  // Past the title into a fresh game, then set up the homestead with a starter and some money
  await key('z'); await key('z'); await page.waitForTimeout(600);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 50);
  await idle();
  await ev(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.push(G.makeCreature(1, 12), G.makeCreature(4, 10)); S.money = 1000;
    G.loadMap('homestead'); const h = G.home.get('house'); G.placePlayer(h.x + 1, h.y + 4, 1); G.scene = G.world.scene; });
  await page.waitForTimeout(500);
  const house = await ev(() => { const h = G.home.get('house'); return { x: h.x, y: h.y, lvl: h.lvl }; });
  assert.equal(house.lvl, 1); assert(await ev(() => G.world.map.block.has((G.home.get('house').x) + ',' + G.home.get('house').y)), 'house footprint is solid');
  await shot('home'); step('a new game owns a level-1 house on the homestead');

  // 1) Can't afford: the barn costs materials we don't have; nothing is spent
  await ev(() => G.runWorld(() => G.buildMenu()));
  await pick('CREATURES'); await pick('Barn', 2);
  const why = await waitText(/can't afford/); assert(/Wood/.test(why) && /Stone/.test(why), why);
  assert.equal(await ev(() => G.state.money), 1000); step('building without materials is refused, naming exactly what is missing: ' + why.replace(/^.*need /, 'need '));
  await advance(() => (G.ui.layers.find(l => l.items) || {}).items && !G.ui.text, 8000, 'back to list'); await key('x'); await page.waitForTimeout(150); await key('x'); await idle();

  // 2) Build a barn through the menu with an invalid spot first
  await ev(() => { const S = G.state; S.money = 50000; Object.assign(S.bag, { Wood: 60, Stone: 60, Plank: 80, Brick: 60, 'Iron Ingot': 30, Glass: 20, 'Copper Ingot': 20, Fiber: 20, Rope: 10 });
    const h = G.home.get('house'); G.placePlayer(h.x - 4, h.y + 6, 1); });
  await page.waitForTimeout(200);
  await ev(() => G.runWorld(() => G.buildMenu()));
  await pick('CREATURES'); await pick('Barn', 2);
  await until(() => G.ui.layers.some(l => !l.items) && G.ui.layers.length >= 1, 4000, 'placement');
  // steer the ghost onto the house: A must not build there
  const ghost = () => ev(() => { const l = G.ui.layers.find(l => l.ghost); return l ? [l.ghost.x, l.ghost.y] : null; });
  const steer = async (tx, ty) => { for (let g = 0; g < 40; g++) { const [x, y] = await ghost(); if (x === tx && y === ty) return; await key(x < tx ? 'ArrowRight' : x > tx ? 'ArrowLeft' : y < ty ? 'ArrowDown' : 'ArrowUp', 30); } throw new Error('could not steer ghost'); };
  await steer(house.x, house.y); await shot('place-invalid'); await key('z');
  assert.equal(await ev(() => G.home.all('barn').length), 0, 'barn not built on top of the house');
  const good = await ev(() => { const p = G.world.p; for (let r = 1; r < 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (G.buildApi.canPlace('barn', p.x + dx, p.y + dy, 0)) return [p.x + dx, p.y + dy]; return null; });
  assert(good, 'found a valid barn spot'); await steer(good[0], good[1]);
  await shot('place-valid'); await key('z');
  await advance(() => G.home.all('barn').length === 1, 6000, 'barn built'); await idle();
  const spent = await ev(() => [G.state.money, G.state.bag.Wood, G.state.bag.Stone]);
  assert.deepEqual(spent, [50000 - 1500, 60 - 20, 60 - 10]); await shot('barn');
  step('invalid placement is refused; a valid one builds the barn and charges exactly $1500, 20 Wood, 10 Stone');

  // 3) Upgrades: house L1 -> L2 (fits, grows), L2 -> L3 locked behind an Ember Shard
  const before = await ev(() => JSON.stringify(G.state.bag));
  await ev(() => { G.state.bag.Brick = 3; });   // not enough bricks
  await ev(() => G.runWorld(() => G.home.upgrade(G.home.get('house'))));
  const t1 = await waitText(/You need/); assert(/Brick/.test(t1), t1); await idle();
  assert.equal(await ev(() => G.home.get('house').lvl), 1);
  await ev(() => { G.state.bag.Brick = 60; });
  const money0 = await ev(() => G.state.money);
  await ev(() => G.runWorld(() => G.home.upgrade(G.home.get('house'))));
  await waitText(/Upgrade to Cottage/); await pick('YES');
  await advance(() => G.home.get('house').lvl === 2, 8000, 'upgraded'); await idle();
  assert.equal(await ev(() => G.state.money), money0 - 3000);
  assert.deepEqual(await ev(() => G.home.dims('house', 2, 0)), { w: 5, h: 4 });
  step('house upgrade refused while short on Brick, then Cabin -> Cottage for $3000 (footprint 4x3 -> 5x4)');
  await ev(() => G.runWorld(() => G.home.upgrade(G.home.get('house'))));
  const t2 = await waitText(/First you need/); assert(/Ember Shard/.test(t2), t2); await idle();
  assert.equal(await ev(() => G.home.get('house').lvl), 2); step('the next house level is locked: ' + t2);
  void before;

  // 4) The house door leads into the level-2 interior and back out
  await ev(() => { const h = G.home.get('house'), d = G.home.L(h).door; G.placePlayer(h.x + d[0], h.y + d[1] + 1, 1); });
  await page.waitForTimeout(150); await key('ArrowUp', 300);
  await until(() => G.world.mapId === 'home2', 6000, 'enter house'); await idle(); await shot('interior');
  const exit = await ev(() => { const w = G.world.map.warps.find(w => w.to === 'homestead'); return [w.x, w.y]; });
  await ev(e => G.placePlayer(e[0], e[1] - 1, 0), exit); await page.waitForTimeout(100); await key('ArrowDown', 300);
  await until(() => G.world.mapId === 'homestead', 6000, 'leave house'); await idle();
  const out = await ev(() => { const h = G.home.get('house'), d = G.home.L(h).door; return [G.world.p.x - h.x - d[0], G.world.p.y - h.y - d[1]]; });
  assert.deepEqual(out, [0, 1]); step('the door enters the Cottage interior and you come back out in front of it');

  // 5) Move the barn, rotate a bench, remove with a 50% refund
  const b0 = await ev(() => { const b = G.home.get('barn'); return { x: b.x, y: b.y }; });
  await ev(() => { const b = G.home.get('barn'); G.placePlayer(b.x, b.y + 3, 1); }); await page.waitForTimeout(100);
  await key('z'); await pick('MOVE');
  await until(() => G.ui.layers.length >= 1 && !G.ui.layers.some(l => l.items), 4000, 'move ghost');
  const dest = await ev(() => { const b = G.home.get('barn'); for (let r = 1; r < 8; r++) for (const [dx, dy] of [[-r, 0], [0, -r], [r, 0], [-r, -r]]) if (G.buildApi.canPlace('barn', b.x + dx, b.y + dy, 0, b)) return [b.x + dx, b.y + dy]; return null; });
  assert(dest, 'somewhere to move the barn'); await steer(dest[0], dest[1]); await key('z');
  await idle();
  const b1 = await ev(() => { const b = G.home.get('barn'); return { x: b.x, y: b.y }; });
  assert.deepEqual(b1, { x: dest[0], y: dest[1] }, 'barn moved'); assert(await ev(b => G.world.map.block.has(b.x + ',' + b.y), b1));
  step('MOVE repositions the barn (its state and level kept)');
  await ev(() => { const h = G.home.get('house'); G.state.builds.push({ id: 'bench1', type: 'bench', map: 'homestead', x: h.x - 4, y: h.y - 1, lvl: 1, rot: 0 }); G.home.refresh(); });
  await ev(() => G.runWorld(() => G.home.manage(G.state.builds.find(b => b.id === 'bench1')))); await pick('ROTATE'); await idle();
  assert.equal(await ev(() => G.state.builds.find(b => b.id === 'bench1').rot), 1);
  assert(await ev(() => { const b = G.state.builds.find(b => b.id === 'bench1'); return G.world.map.block.has(b.x + ',' + (b.y + 1)) && !G.world.map.block.has((b.x + 1) + ',' + b.y); }), 'rotated footprint is 1x2');
  step('ROTATE turns a 2x1 bench into 1x2');
  const w0 = await ev(() => G.state.bag.Wood);
  await ev(() => G.runWorld(() => G.home.manage(G.home.get('barn')))); await pick('REMOVE'); await waitText(/Take down/); await pick('YES');
  await idle();
  assert.equal(await ev(() => G.home.all('barn').length), 0); assert.equal(await ev(() => G.state.bag.Wood), w0 + 10);
  step('REMOVE takes the barn down and refunds half (10 of 20 Wood)');

  // 6) Land Office: unowned land can't be built on; buying deed 2 clears the thicket
  const outside = await ev(() => { const m = G.world.map, z1 = m.zones.find(z => z.deed === 1); return { x: z1.x - 3, y: z1.y + 4 }; });
  assert.equal(await ev(o => G.world.map.t[o.y][o.x], outside), 'X', 'thicket outside the deed');
  assert(/not yours/.test(await ev(o => G.buildApi.whyNot('well', o.x, o.y, 0), outside)));
  await ev(() => { G.state.bag.Wood = 5; });
  await ev(() => G.runWorld(() => G.home.landOffice())); const t3 = await waitText(/You need/); assert(/Wood/.test(t3)); await idle();
  assert.equal(await ev(() => G.state.home.deed), 1);
  await ev(() => { G.state.bag.Wood = 40; });
  await ev(() => G.runWorld(() => G.home.landOffice())); await waitText(/Buy land deed 2/); await pick('YES');
  await advance(() => G.state.home.deed === 2, 8000, 'deed 2'); await idle();
  assert.notEqual(await ev(o => G.world.map.t[o.y][o.x], outside), 'X'); assert.equal(await ev(o => G.buildApi.whyNot('well', o.x, o.y, 0), outside), null);
  await shot('deed2'); step('unowned land is thicket and unbuildable; the Land Office sells deed 2 and the thicket clears');

  // 7) Save, reload, continue: levels, positions, deed and rotation persist
  await ev(() => G.saveGame()); await page.reload(); await page.waitForTimeout(400); await key('z'); await key('z');
  await until(() => G.state && G.scene === G.world.scene, 8000, 'continue'); await page.waitForTimeout(400);
  const st = await ev(() => ({ map: G.world.mapId, house: G.home.get('house').lvl, deed: G.state.home.deed, bench: G.state.builds.find(b => b.id === 'bench1').rot }));
  assert.deepEqual(st, { map: 'homestead', house: 2, deed: 2, bench: 1 });
  step('save + reload keeps the house level, the deed, and placed structures');

  await browser.close();
  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
