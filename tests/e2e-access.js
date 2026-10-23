// Region access and difficulty: node tests/e2e-access.js
// Locked places open with badges, reputation or a travel permit; the rule covers roads, harbour gates, ferries and the map;
// Arena Leaders scale to how many badges you hold; homestead land grows with reputation too.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/access-${n}.png` });
  const key = async (k, ms = 120) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
  const until = async (fn, ms = 20000, msg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(50); } await shot('timeout'); throw new Error('timeout ' + (msg || fn)); };
  await key('z'); await key('z', 500);
  for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 80);
  await until(() => !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 40000);
  const fresh = () => ev(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; S.party.push(G.makeCreature(1, 8)); S.money = 5000; G.loadMap('lanternrest'); G.placePlayer(29, 26, 0); G.scene = G.world.scene; G.world.busy = false; });
  await fresh(); await page.waitForTimeout(400);

  // 1) three ways in
  let a = await ev(() => ({ why: G.access.why('sandsreach'), open: G.access.open('sandsreach'), short: G.access.short('sandsreach'), meadow: G.access.open('sunmeadow') }));
  assert(!a.open && a.meadow); assert.match(a.why, /2 Arena Badges.*KNOWN in the EAST.*travel permit \(\$1,500\)/); assert.match(a.short, /2 BADGES, KNOWN OR PERMIT/);
  assert(await ev(() => { G.state.rep.east = 15; return G.access.open('sandsreach'); }), 'East reputation opens it');
  assert(await ev(() => { G.state.rep.east = 0; G.state.rep.vale = 15; return !G.access.open('sandsreach') && G.access.open('sandsreach', 'lanternrest'); }), 'or the locals where you come from vouch for you');
  assert(await ev(() => { G.state.rep.vale = 0; G.state.flags.badge_keystone = G.state.flags.badge_bloom = true; const o = G.access.open('sandsreach'); G.state.flags.badge_keystone = G.state.flags.badge_bloom = false; return o; }), 'two badges open it');
  step('Sandsreach opens with 2 badges, KNOWN reputation (East, or where you come from), or a permit');
  // 2) the ranger sells a permit at the road gate
  const w = await ev(() => { const w = G.MAPS.lanternrest.warps.find(w => w.to === 'sandsreach'); return { x: w.x, y: w.y }; });
  await ev(([x, y]) => { G.placePlayer(x - 1, y, 3); }, [w.x, w.y]); await page.waitForTimeout(300);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250); await page.keyboard.up('ArrowRight');
  await until(() => !!G.ui.text, 5000, 'ranger'); await shot('ranger');
  for (let i = 0; i < 10 && !(await ev(() => G.ui.layers.length > 0)); i++) await key('z', 250);   // through the text to YES/NO
  await shot('permit-offer'); await key('z', 400);   // YES
  for (let i = 0; i < 6; i++) await key('z', 250);
  await until(() => G.world.mapId === 'sandsreach' && !G.world.busy, 8000, 'into Sandsreach');
  assert.equal(await ev(() => G.state.money), 3500); assert(await ev(() => G.state.flags.permit_sandsreach));
  step('turned back at the road, the ranger sells a $1,500 permit; you walk into Sandsreach');
  // 3) the same rule on the sea, ferries, the map and flight
  await fresh();
  const s = await ev(() => { const sea = G.MAPS.aurelis_sea.warps.find(w => w.to === 'verdant'), fr = G.ferryRoutes('driftwood').find(r => r.to === 'verdant');
    const r = { sea: !!(sea.need && sea.need()), ferry: !!fr.why, map: G.worldLockWhy('verdant') };
    G.state.flags.permit_verdant = true; const fr2 = G.ferryRoutes('driftwood').find(r => r.to === 'verdant');
    return Object.assign(r, { seaAfter: sea.need(), ferryAfter: fr2.why, mapAfter: G.worldLockWhy('verdant') }); });
  assert(s.sea && s.ferry && s.map, 'Verdant locked by boat, ferry and on the map'); assert(!s.seaAfter && !s.ferryAfter && !s.mapAfter, 'a permit opens all of them');
  assert.match(await ev(() => G.access.why('aurora')), /7 Arena Badges.*HERO/); assert(!(await ev(() => /permit/.test(G.access.why('aurora')))), 'no permits for the far islands');
  assert.match(await ev(() => { G.state.flags.permit_verdant = false; for (const b of G.BADGES) G.state.flags['badge_' + b.id] = true; const w = G.access.why('hollow'); for (const b of G.BADGES) G.state.flags['badge_' + b.id] = false; return w; }), /sealed until the Great Lantern/);   // the Hollow Gate: only the Lantern opens it
  step('the rule covers harbour gates on the sea, ferries and the map; the far islands have no permit; the Lantern rule stays');
  // 4) difficulty: the map warns, Leaders scale
  assert.equal(await ev(() => G.access.danger('emberfall')), 'high');
  const L = await ev(() => { const m = Object.values(G.MAPS).find(m => (m.npcs || []).some(n => n.trainer && n.trainer.leader === 'magma')), n = m.npcs.find(n => n.trainer && n.trainer.leader === 'magma');
    const t0 = Math.max(...G.scaledTeam(n.trainer.team, m).map(t => t[1]));
    for (const b of G.BADGES) if (b.id !== 'magma') G.state.flags['badge_' + b.id] = true;
    const t7 = Math.max(...G.scaledTeam(n.trainer.team, m).map(t => t[1])), base = Math.max(...n.trainer.team.map(t => t[1]));
    const sm = Object.values(G.MAPS).find(m => (m.npcs || []).some(n => n.trainer && n.trainer.leader === 'keystone')), sn = sm.npcs.find(n => n.trainer && n.trainer.leader === 'keystone');
    G.state.flags.badge_magma = true; const k7 = Math.max(...G.scaledTeam(sn.trainer.team, sm).map(t => t[1]));
    for (const b of G.BADGES) G.state.flags['badge_' + b.id] = false; return { t0, t7, base, k7 }; });
  assert.equal(L.t0, 15, 'Pyrra as your first Leader fights at first-Arena strength'); assert.equal(L.t7, L.base, 'and at full strength as your eighth'); assert.equal(L.k7, L.base, 'Mason as your eighth Leader is as strong as Pyrra');
  step(`difficulty: Emberfall shows TOUGH; Pyrra fights at top Lv ${L.t0} as your first Leader and Lv ${L.t7} as your eighth (Mason too)`);
  // 5) reputation from trainers and catches; homestead land
  const r = await ev(() => { G.onTrainerWin({ id: 'test_t1' }, 'stonebridge'); G.onTrainerWin({ id: 'test_t1' }, 'stonebridge'); return G.rep.get('south'); });
  assert.equal(r, 2, 'a trainer win gives +2 once');
  const d = await ev(() => { G.state.rep = { west: 40, south: 40, north: 40, east: 40 }; G.home.syncDeed(); return { p: G.progressPoints(), deed: G.state.home.deed }; });
  assert.equal(d.p, 2); assert.equal(d.deed, 2, 'reputation alone grows the homestead');
  step('reputation: +2 per trainer (once); 160 reputation is 2 progress points and the second homestead parcel');
  // 6) the map panel shows it
  await ev(() => { G.state.rep = {}; G.runWorld(() => G.worldMapScreen()); }); await page.waitForTimeout(900);
  await ev(() => { const m = G.worldMap; m.sel = m.nodes.findIndex(n => n.id === 'sandsreach'); }); await page.waitForTimeout(400); await shot('map-locked');
  await key('x', 600);
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
