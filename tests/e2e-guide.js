// docs/STORY_AND_PROGRESSION.md must match the game: node tests/e2e-guide.js
// Reads the guide's tables and compares them with what the running game says: the gate table (badges, chapter, which exits lead in),
// the arena table (leader, type, base team), the chapter titles, money rewards and step counts, wild levels, the story bosses' teams,
// the homestead deeds, vehicle prices, orb prices, the optional quests, and the build number. If the story, a gate or a level changes,
// update the guide (and the test tells you which row is stale).
// env: PW=<path to playwright> CHROME=<chromium binary>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), fs = require('fs'), assert = require('assert');
const DOC = path.resolve(__dirname, '../docs/STORY_AND_PROGRESSION.md');
const md = fs.readFileSync(DOC, 'utf8'), lines = md.split('\n');

// ---- parsing helpers --------------------------------------------------------------------------------------------------------
// The rows of the first markdown table after the line matching `anchor` (header and separator rows dropped), cells trimmed.
function table(anchor) {
  const i = lines.findIndex(l => (anchor instanceof RegExp ? anchor.test(l) : l.includes(anchor)));
  assert(i >= 0, `guide: cannot find "${anchor}"`);
  let j = i + 1; while (j < lines.length && !lines[j].startsWith('|')) j++;
  const rows = []; for (; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  return rows.slice(2);
}
const money = s => { const m = /\$([\d,]+)/.exec(s || ''); return m ? +m[1].replace(/,/g, '') : 0; };
const pairs = s => [...s.matchAll(/([A-Z][a-z]+) (\d+)/g)].map(m => `${m[1]} ${m[2]}`);
const ALIAS = { sunmeadow: 'sunmeadow', sunhaven: 'sunhaven', evergreen: 'evergreen', cloudpeak: 'cloudpeak', stonebridge: 'stonebridge', sandsreach: 'sandsreach', mirewood: 'mirewood',
  'the ridge': 'ridge', ridge: 'ridge', 'glacier pass': 'glacier', lakeside: 'lakeside', cobalt: 'cobalt', emberfall: 'emberfall', badlands: 'badlands', lanternrest: 'lanternrest',
  'whispering woods': 'whispering', driftwood: 'driftwood', shore: 'shore', 'the shore': 'shore', verdant: 'verdant', frostmere: 'frostmere', tidefall: 'tidefall', aurora: 'aurora', moonlit: 'moonlit' };
const idOf = n => { const k = ALIAS[n.trim().toLowerCase()]; assert(k, `guide: unknown place "${n}"`); return k; };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(500);
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n);
  let bad = [];
  const check = (cond, msg) => { if (!cond) bad.push(msg); };

  // 0) the build number at the top
  const ver = await ev(() => G.VERSION), m0 = /Build (\d+\.\d+)\.x/.exec(md);
  assert(m0, 'guide: no "Build X.Y.x" line'); assert.equal(ver.split('.').slice(0, 2).join('.'), m0[1], `guide says build ${m0[1]}.x but the game is ${ver}: update the guide`);
  step(`the guide's build (${m0[1]}.x) matches the game (${ver})`);

  // 1) the gate table: badges, chapter, and which land exits lead in
  const gates = table('### 3.1 Every locked place'), info = await ev(() => {
    const out = {}; for (const p of G.WORLD.places) { const R = G.access.rule(p.id); out[p.name.toLowerCase()] = { id: p.id, rule: R, from: [] }; }
    for (const p of G.WORLD.places) { const m = G.MAPS[p.id]; if (!m) continue;
      for (const w of m.warps) { const t = G.MAPS[w.to]; if (!t || !t.outdoor || w.to === p.id || w.sea || w.to === 'aurelis_sea') continue;
        const side = w.y === 0 ? 'N' : w.y === m.h - 1 ? 'S' : w.x === 0 ? 'W' : w.x === m.w - 1 ? 'E' : null; if (!side) continue;
        const d = out[(G.WORLD.byId[w.to] || {}).name && G.WORLD.byId[w.to].name.toLowerCase()]; if (d) d.from.push(p.id + '(' + side + ')'); } }
    for (const k of Object.keys(out)) out[k].from = [...new Set(out[k].from)].sort(); return out; });
  const seen = new Set();
  for (const r of gates) {
    const [name, badges, chap, from] = r, g = info[name.toLowerCase()]; if (!g) { bad.push(`gate table: unknown place "${name}"`); continue; }
    seen.add(g.id); const R = g.rule;
    if (!R) { bad.push(`gate table: ${name} has no rule in the game`); continue; }
    if (/^\d+$/.test(badges)) check(R.badges === +badges, `gate table: ${name} needs ${R.badges} badges in the game, the guide says ${badges}`);
    else check(R.lantern, `gate table: ${name} is a Lantern place in the guide but not in the game`);
    check((R.story || '') === (chap ? 'ch' + chap : ''), `gate table: ${name} needs chapter ${(R.story || 'none')} in the game, the guide says ${chap || 'none'}`);
    const doc = [...from.matchAll(/([A-Z][A-Za-z' ]+?) \(([NSEW])\)/g)].map(m => idOf(m[1].replace(/^the /i, 'the ')) + '(' + m[2] + ')').sort();
    check(JSON.stringify(doc) === JSON.stringify(g.from), `gate table: ${name} is entered from ${JSON.stringify(g.from)} in the game, the guide says ${JSON.stringify(doc)}`);
  }
  for (const [name, g] of Object.entries(info)) if (g.rule && !seen.has(g.id)) bad.push(`gate table: the game locks ${name} but the guide does not list it`);
  step(`the gate table matches the game (${gates.length} places)`);

  // 2) the arena table
  const arenas = table('### 2.4 Arena badges'), AR = await ev(() => G.BADGES.map(b => { const m = G.MAPS['arena_' + b.city], n = (m.npcs || []).find(n => n.trainer && n.trainer.leader);
    return { id: b.id, name: b.name, city: b.city, type: b.type, leader: n.trainer.name, team: n.trainer.team.map(t => G.SPECIES[t[0]].name + ' ' + t[1]) }; }));
  assert.equal(arenas.length, AR.length, 'arena table: the guide lists ' + arenas.length + ' arenas, the game has ' + AR.length);
  for (const r of arenas) {
    const a = AR.find(x => x.name.toLowerCase().startsWith(r[1].toLowerCase())); if (!a) { bad.push(`arena table: unknown badge "${r[1]}"`); continue; }
    check(a.type === r[3], `arena table: ${r[1]} is ${a.type} in the game, the guide says ${r[3]}`);
    check(a.leader.toLowerCase() === r[4].toLowerCase(), `arena table: ${r[1]} leader is ${a.leader} in the game, the guide says ${r[4]}`);
    check(JSON.stringify(a.team) === JSON.stringify(pairs(r[5])), `arena table: ${r[1]} team is ${a.team.join(', ')} in the game, the guide says ${pairs(r[5]).join(', ')}`);
    check(a.city.replace('_', ' ') === r[2].toLowerCase().replace(' city', '').replace(' ', ' ') || r[2].toLowerCase().startsWith(a.city), `arena table: ${r[1]} is in ${a.city} in the game, the guide says ${r[2]}`);
  }
  const lv = AR.map(a => a.team.map(t => +t.split(' ').pop())); const sorted = lv.map(l => [Math.min(...l), Math.max(...l)]).sort((a, b) => a[0] - b[0]);
  const diffText = /Leaders and gym trainers\*\* scale[^:]*: ([\d\-, ]+)\./.exec(md); check(diffText, 'difficulty: the "Leaders and gym trainers" line is missing');
  if (diffText) check(diffText[1].split(', ').join(' ') === sorted.map(s => s[0] + '-' + s[1]).join(' ').replace(/\b(\d+)-(\d+)\b/g, '$1-$2'), `difficulty: the leader level ranges are ${sorted.map(s => s.join('-')).join(', ')} in the game, the guide says ${diffText[1]}`);
  step('the arena table (type, leader, base team) and the leader level ranges match the game');

  // 3) chapters: titles, money rewards, step counts
  const Q = await ev(() => ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'finale'].map(id => { const q = G.QUESTS[id]; return { id, title: q.title, money: (q.reward || {}).money || 0, steps: q.steps.length }; }));
  const spine = table('**The spine**').filter(r => /^(\d|F)$/.test(r[0]));
  assert.equal(spine.length, 9, 'the spine table should list chapters 1-8 and the finale');
  spine.forEach((r, i) => { const q = Q[i];
    check(q.title.toLowerCase().endsWith(r[1].toLowerCase()), `spine: chapter ${r[0]} is "${q.title}" in the game, the guide says "${r[1]}"`);
    check(money(r[4]) === q.money, `spine: ${q.title} pays $${q.money} in the game, the guide says $${money(r[4])}`); });
  const len = /\*\*Length\*\*[^:]*: ([\d, ]+)\./.exec(md); check(len, 'difficulty: the "Length" line is missing');
  if (len) check(len[1].replace(/ /g, '') === Q.slice(0, 8).map(q => q.steps).join(','), `difficulty: chapters have ${Q.slice(0, 8).map(q => q.steps).join(', ')} steps in the game, the guide says ${len[1]}`);
  step('chapter titles, money rewards and step counts match the game');

  // 4) wild levels by place
  const wild = table('**Wild creatures** by place'), W = await ev(() => Object.fromEntries(G.WORLD.places.map(p => [p.id, (G.worldLevels(p.id) || []).join('-')])));
  for (const r of wild) for (const [names, range] of [[r[0], r[1]], [r[2], r[3]]]) { if (!names) continue;
    for (const n of names.split(',')) { const id = idOf(n); check(W[id] === range, `wild levels: ${n.trim()} is ${W[id] || 'none'} in the game, the guide says ${range}`); } }
  step('wild levels by place match the game');

  // 5) story bosses' teams
  const bosses = table('**Story trainers**'), who = { 1: [['CORVIN', 'stonebridge'], ['SABLE', 'stonebridge']], 2: [['MORDANT', 'evergreen']], 3: [['SKIFF', 'verdant']], 4: [['BRACKEN', 'lakeside'], ['SABLE', 'tidefall']],
    5: [['DUNMORE', 'sandsreach'], ['VOLTA', 'cobalt']], 7: [['CINDRA', 'emberfall']] };
  const T = await ev(w => Object.fromEntries(Object.entries(w).map(([k, list]) => [k, list.flatMap(([name, map]) => { const n = G.MAPS[map].npcs.find(n => n.trainer && n.trainer.name === name); return n ? n.trainer.team.map(t => G.SPECIES[t[0]].name + ' ' + t[1]) : ['MISSING ' + name]; })])), who);
  for (const r of bosses) { const c = r[0]; if (!T[c]) continue; check(JSON.stringify(T[c].slice().sort()) === JSON.stringify(pairs(r[2]).sort()), `story trainers: chapter ${c} is ${T[c].join(', ')} in the game, the guide says ${pairs(r[2]).join(', ')}`); }
  step('the story bosses (Corvin to Cindra) teams match the game');

  // 6) homestead deeds, vehicles, orbs
  const deeds = table('### 4.5 The homestead'), D = await ev(() => G.DEEDS);
  for (const r of deeds) { const d = D.find(x => x.deed === +r[0]); check(d && d.name === r[1] && d.badges === +r[2], `deeds: deed ${r[0]} is ${d ? d.name + ' at ' + d.badges : 'missing'} in the game, the guide says ${r[1]} at ${r[2]}`); }
  const veh = table('### 4.3 Vehicles and travel'), V = await ev(() => Object.values(G.VEHICLES).map(v => ({ name: v.name, price: v.price })));
  for (const r of veh) { const v = V.find(x => x.name.toLowerCase() === r[0].toLowerCase()); if (!v) { bad.push(`vehicles: "${r[0]}" is not a vehicle in the game`); continue; }
    if (v.price) check(r[2].includes('$' + v.price.toLocaleString('en-US')), `vehicles: ${v.name} costs $${v.price.toLocaleString('en-US')} in the game, the guide says "${r[2]}"`); }
  const orbs = await ev(() => Object.fromEntries(Object.entries(G.ITEMS).filter(([k, v]) => v.kind === 'orb').map(([k, v]) => [k.replace(' Orb', ''), v.price])));
  for (const [nm, price] of Object.entries({ Terra: orbs.Terra, Void: orbs.Void, Pulse: orbs.Pulse, Mythic: orbs.Mythic })) check(new RegExp(nm + ' \\$' + price.toLocaleString('en-US').replace(',', ',') + '\\b').test(md), `orbs: ${nm} Orb costs $${price.toLocaleString('en-US')} in the game; the guide does not say so`);
  check(new RegExp('Aqua / Flare / Verdant / Frost / Gale / Stone \\$' + orbs.Aqua).test(md), `orbs: the type orbs cost $${orbs.Aqua} in the game; the guide says otherwise`);
  step('homestead deeds, vehicle prices and orb prices match the game');

  // 7) the optional quests
  const side = await ev(() => ['ferry', 'orchard', 'trader', 'duel', 'tracks', 'tomato', 'lights', 'bridge', 'cup', 'pilfet', 'hermit'].map(id => ({ id, title: G.QUESTS[id].title, giver: G.QUESTS[id].giver })));
  const sec7 = md.slice(md.indexOf('## 7. Optional quests'), md.indexOf('## 8. Everything at a glance'));
  for (const q of side) check(sec7.includes('**' + q.title + '**'), `optional quests: "${q.title}" is in the game but not in section 7`);
  check(/Eleven authored threads/.test(sec7), 'optional quests: the "Eleven authored threads" line is missing');
  const nSide = await ev(() => G.threadsDone.toString().match(/'[a-z]+'/g).length); check(nSide === 11, `optional quests: the game now counts ${nSide} threads, the guide says eleven`);
  step('the 11 optional quests are all in the guide');

  assert(bad.length === 0, '\nThe guide is out of date with the game:\n  - ' + bad.join('\n  - '));
  assert.deepEqual(errors, [], 'no page errors');
  console.log('errors: none'); await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
