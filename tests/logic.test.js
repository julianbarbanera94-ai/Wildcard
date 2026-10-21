// Run with: node tests/logic.test.js  — checks data integrity and core battle maths.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const packs = fs.readdirSync(path.join(__dirname, '../js/species')).sort().map(f => 'species/' + f.replace('.js', ''));
for (const f of ['data', ...packs, 'creature']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js', f + '.js'), 'utf8'), { filename: f });
const G = globalThis.G;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('every learnset move exists and evolutions point at real species', () => {
  for (const s of Object.values(G.SPECIES)) {
    s.learn.forEach(([l, m]) => assert(G.MOVES[m], `${s.name}: unknown move ${m}`));
    if (s.evo) assert(G.SPECIES[s.evo[1]], `${s.name}: bad evolution`);
    assert(s.learn.some(l => l[0] === 1), `${s.name} has no level-1 move`);
  }
});
t('new creatures have moves and full HP', () => {
  for (const s of Object.values(G.SPECIES)) {
    const c = G.makeCreature(s.id, 5);
    assert(c.moves.length >= 1 && c.moves.length <= 4); assert.equal(c.hp, c.stats.hp);
  }
});
t('type chart', () => {
  assert.equal(G.typeMult('Fire', ['Grass']), 2);
  assert.equal(G.typeMult('Electric', ['Ground']), 0);
  assert.equal(G.typeMult('Fire', ['Water', 'Rock']), .25);
});
t('damage is positive, STAB and effectiveness apply', () => {
  const a = { c: G.makeCreature(1, 20), stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } };
  const d = { c: G.makeCreature(7, 20), stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } };
  const fire = G.calcDamage(a, d, G.MOVES.Ember), norm = G.calcDamage(a, d, G.MOVES.Tackle);
  assert(fire.dmg > norm.dmg && fire.eff === 2);
  assert.equal(G.calcDamage(a, { c: G.makeCreature(1, 20), stages: d.stages }, G.MOVES.Tackle).eff, 1);
});
t('level up grows stats and keeps HP consistent', () => {
  const c = G.makeCreature(1, 5); const hp0 = c.stats.hp; G.levelUp(c);
  assert.equal(c.lvl, 6); assert(c.stats.hp >= hp0); assert.equal(c.hp, c.stats.hp);
});
t('catch odds: low HP + sleep beats full HP; a 1-HP common creature is very likely caught', () => {
  const trials = (c, m) => { let k = 0; for (let i = 0; i < 4000; i++) if (G.catchCheck(c, m).caught) k++; return k / 4000; };
  const full = G.makeCreature(25, 20), low = G.makeCreature(25, 20); low.hp = 1; low.status = 'slp';
  assert(trials(low, 1.5) > trials(full, 1.5) * 3);
  const easy = G.makeCreature(10, 3); easy.hp = 1;
  assert(trials(easy, 1) > 0.9);
});
t('species ids run 1..N with no gaps, names are unique, nothing was registered twice', () => {
  const ids = Object.keys(G.SPECIES).map(Number).sort((a, b) => a - b);
  ids.forEach((id, i) => assert.equal(id, i + 1, `missing species id ${i + 1}`));
  const names = Object.values(G.SPECIES).map(s => s.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, 'duplicate species name: ' + names.filter((n, i) => names.indexOf(n) !== i));
  assert.deepEqual(G.dupSpecies, [], 'species defined twice'); assert.deepEqual(G.dupMoves, [], 'moves defined twice');
});
t('species data is well formed: types, stats, evolution levels, descriptions', () => {
  for (const s of Object.values(G.SPECIES)) {
    assert(s.types.length >= 1 && s.types.length <= 2 && s.types.every(t => G.TYPES.includes(t)), `${s.name}: bad types`);
    assert(s.base.length === 6 && s.base.every(v => v >= 5 && v <= 200), `${s.name}: bad base stats`);
    assert(s.catchRate >= 3 && s.catchRate <= 255 && s.expYield > 0, `${s.name}: bad catch/exp`);
    assert(s.desc && s.desc.length <= 90, `${s.name}: missing or long description`);
    assert(s.look && s.look.stage >= 1 && s.look.stage <= 3 && Array.isArray(s.look.feat), `${s.name}: bad look`);
    if (s.evo) { const to = G.SPECIES[s.evo[1]]; assert(to && s.evo[0] >= 5 && s.evo[0] <= 60, `${s.name}: bad evolution`); assert(to.base.reduce((a, b) => a + b) > s.base.reduce((a, b) => a + b), `${s.name}: evolution is not stronger`); }
  }
});
t('every type has damaging moves and the chart only names real types', () => {
  for (const t of G.TYPES) assert(Object.values(G.MOVES).some(m => m.type === t && m.pow > 0), `no ${t} attack`);
  for (const [a, row] of Object.entries(G.CHART)) { assert(G.TYPES.includes(a)); for (const d of Object.keys(row)) assert(G.TYPES.includes(d), `${a}->${d}`); }
});
console.log(`${n} tests passed`);
