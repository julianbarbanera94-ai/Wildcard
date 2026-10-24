// Region access and difficulty: node tests/e2e-access.js
// Locked places open only with the badges AND the story chapter before them (no permit, no reputation, no vehicle); the rule covers roads, harbour gates, ferries and the map;
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

  // 1) the key is a badge, and the story has to have got you there: reputation and money open nothing
  const info1 = () => ev(() => ({ why: G.access.why('sandsreach'), open: G.access.open('sandsreach'), short: G.access.short('sandsreach'), meadow: G.access.open('sunmeadow'), lake: G.access.open('lakeside') }));
  let a = await info1();
  assert(!a.open && a.meadow, 'Sandsreach is closed, the first meadow is free'); assert.match(a.why, /Finish Chapter 4: The Quiet Water first.*money cannot buy it/); assert.equal(a.short, 'LOCKED: FINISH CHAPTER 4');
  assert(await ev(() => { G.state.rep = { west: 100, south: 100, north: 100, east: 100, vale: 100 }; G.state.money = 999999; return !G.access.open('sandsreach'); }), 'reputation and money do not open it');
  assert(await ev(() => { for (const b of G.BADGES) G.state.flags['badge_' + b.id] = true; const o = !G.access.open('sandsreach'); return o; }), 'eight badges without the story do not open it either');
  await ev(() => { for (const b of G.BADGES) G.state.flags['badge_' + b.id] = false; G.state.rep = {}; for (const q of ['ch1', 'ch2', 'ch3', 'ch4']) if (G.quest.state(q)) delete G.state.quests[q]; });
  assert(await ev(() => { G.quest.complete('ch4', true); return !G.access.open('sandsreach'); }), 'the story alone does not open it: it needs the badges too');
  assert.match(await ev(() => G.access.why('sandsreach')), /needs 2 Arena Badges \(you have 0\)/); assert.equal(await ev(() => G.access.short('sandsreach')), 'LOCKED: 2 BADGES');
  assert(await ev(() => { G.state.flags.badge_keystone = G.state.flags.badge_bloom = true; return G.access.open('sandsreach'); }), 'the chapter and two badges open it');
  step('Sandsreach opens with the story (Chapter 4) AND 2 badges; reputation, money and eight badges alone do not');
  // 2) the ranger at the road turns you back and sells nothing
  await fresh(); await ev(() => { G.state.money = 5000; for (const k of ['permit_sandsreach']) G.state.flags[k] = true; });
  const w = await ev(() => { const w = G.MAPS.lanternrest.warps.find(w => w.to === 'sandsreach'); return { x: w.x, y: w.y }; });
  await ev(([x, y]) => { G.placePlayer(x - 1, y, 3); }, [w.x, w.y]); await page.waitForTimeout(300);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250); await page.keyboard.up('ArrowRight');
  await until(() => !!G.ui.text, 5000, 'ranger'); await shot('ranger');
  for (let i = 0; i < 8; i++) await key('z', 250);
  await page.waitForTimeout(400);
  assert.deepEqual(await ev(() => [G.world.mapId, G.state.money]), ['lanternrest', 5000], 'turned back, nothing was sold, and an old permit flag opens nothing');
  step('turned back at the road: no permit is sold, and a permit flag from an old save opens nothing');
  // 3) the same rule on the sea, ferries, the map, flight: every vehicle, all the money, still shut
  await fresh();
  const s = await ev(() => { G.state.money = 999999; for (const v of ['rowboat', 'motorboat', 'sailboat', 'hoverboard', 'helicopter']) G.vehicles.grant(v); for (const id of Object.keys(G.WORLD.byId)) G.state.flags['permit_' + id] = true;
    const sea = G.MAPS.aurelis_sea.warps.find(w => w.to === 'verdant'), fr = G.ferryRoutes('driftwood').find(r => r.to === 'verdant');
    return { sea: !!(sea.need && sea.need()), ferry: !!fr.why, map: G.worldLockWhy('verdant') }; });
  assert(s.sea && s.ferry && s.map, 'Verdant stays locked by boat, ferry and on the map with every vehicle and permit flags');
  assert.match(await ev(() => G.access.why('aurora')), /Finish Chapter 5/);
  assert.match(await ev(() => { for (const b of G.BADGES) G.state.flags['badge_' + b.id] = true; G.quest.complete('ch1', true); G.quest.complete('ch2', true); G.quest.complete('ch3', true); G.quest.complete('ch4', true); G.quest.complete('ch5', true); G.quest.complete('ch6', true); const w = G.access.why('hollow'); for (const b of G.BADGES) G.state.flags['badge_' + b.id] = false; return w; }), /sealed until the Great Lantern/);   // the Hollow Gate: only the Lantern opens it
  step('the rule covers harbour gates on the sea, ferries and the map with every vehicle and permit flag; the Lantern rule stays');
  // 3b) the story in order: each place opens when its chapter is done and its badges are held, and not before
  await fresh();
  const order = await ev(() => {
    const rows = []; const places = ['evergreen', 'whispering', 'driftwood', 'verdant', 'lakeside', 'tidefall', 'sandsreach', 'cobalt', 'badlands', 'glacier', 'frostmere', 'aurora', 'emberfall', 'cloudpeak'];
    const open = () => places.filter(p => G.access.open(p)).join(',');
    G.state.rep = { west: 100, south: 100, north: 100, east: 100, vale: 100 }; G.state.money = 999999;
    rows.push(['start', open()]);
    const chap = [['ch1', ['keystone']], ['ch2', ['bloom']], ['ch3', ['gale']], ['ch4', ['tide']], ['ch5', ['dune', 'circuit']], ['ch6', ['rime']], ['ch7', ['magma']]];
    for (const [c, bs] of chap) { for (const b of bs) G.state.flags['badge_' + b] = true; G.quest.complete(c, true); rows.push([c, open()]); }
    return rows; });
  // (Verdant opens with the Gale badge, which is earned inside Chapter 3; Aurora with the Rime badge, inside Chapter 6.)
  const base = 'evergreen,whispering,driftwood', c3 = base + ',verdant,lakeside,tidefall', c4 = c3 + ',sandsreach,cobalt,badlands', c5 = c4 + ',glacier,frostmere', c6 = c5 + ',aurora,emberfall';
  const want = { start: '', ch1: 'evergreen,whispering', ch2: base, ch3: c3, ch4: c4, ch5: c5, ch6: c6, ch7: c6 + ',cloudpeak' };
  for (const [c, got] of order) assert.equal(got, want[c], `places open after ${c}`);
  step('in story order: finishing each chapter (with its badges) opens exactly the next places, even with every reputation maxed and $999,999');
  await fresh();
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
