// Creature logic: stats, experience, damage and capture maths (no rendering).
(function () {
const G = globalThis.G;
const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
G.STATS = STATS;
G.rand = n => Math.floor(Math.random() * n);
G.expFor = l => l * l * l;

G.calcStats = function (c) {
  const b = G.SPECIES[c.id].base, out = {};
  STATS.forEach((s, i) => {
    const core = Math.floor((2 * b[i] + c.ivs[i]) * c.lvl / 100);
    out[s] = s === 'hp' ? core + c.lvl + 10 : core + 5;
  });
  return out;
};

G.makeCreature = function (id, lvl) {
  const c = { id, lvl, exp: G.expFor(lvl), ivs: STATS.map(() => G.rand(32)), status: null, moves: [], hp: 0 };
  c.stats = G.calcStats(c);
  c.hp = c.stats.hp;
  const known = G.SPECIES[id].learn.filter(l => l[0] <= lvl).map(l => l[1]);
  [...new Set(known)].slice(-4).forEach(n => c.moves.push({ id: n, pp: G.MOVES[n].pp }));
  return c;
};

G.name = c => G.SPECIES[c.id].name.toUpperCase();

// Raises level by one; returns the stat gains so the UI can show them.
G.levelUp = function (c) {
  const old = c.stats;
  c.lvl++;
  c.stats = G.calcStats(c);
  c.hp = Math.min(c.stats.hp, c.hp + (c.stats.hp - old.hp));
  const gains = {};
  STATS.forEach(s => gains[s] = c.stats[s] - old[s]);
  return gains;
};

G.movesAt = (c, lvl) => G.SPECIES[c.id].learn.filter(l => l[0] === lvl).map(l => l[1]);

G.typeMult = function (moveType, defTypes) {
  let m = 1;
  for (const t of defTypes) { const v = (G.CHART[moveType] || {})[t]; if (v !== undefined) m *= v; }
  return m;
};

G.stageMult = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);

// att/def are fighter objects: { c, stages }.
G.calcDamage = function (att, def, move, o) {
  o = o || {};
  const phys = G.PHYS.has(move.type);
  const aStat = phys ? 'atk' : 'spa', dStat = phys ? 'def' : 'spd';
  let A = att.c.stats[aStat] * G.stageMult(att.stages[aStat]);
  let D = def.c.stats[dStat] * G.stageMult(def.stages[dStat]);
  if (o.crit) { A = att.c.stats[aStat] * Math.max(1, G.stageMult(att.stages[aStat])); D = def.c.stats[dStat] * Math.min(1, G.stageMult(def.stages[dStat])); }
  if (phys && att.c.status === 'brn') A /= 2;
  const defTypes = G.SPECIES[def.c.id].types;
  const eff = G.typeMult(move.type, defTypes);
  const stab = G.SPECIES[att.c.id].types.includes(move.type) ? 1.5 : 1;
  let dmg = Math.floor(Math.floor(Math.floor(2 * att.c.lvl / 5 + 2) * move.pow * A / D) / 50) + 2;
  dmg = Math.floor(dmg * stab * eff * (o.crit ? 2 : 1) * (o.roll === undefined ? 1 : o.roll));
  if (eff > 0) dmg = Math.max(1, dmg);
  return { dmg, eff };
};

// Gen-3 style capture: returns how many times the orb wobbles (0-3) and the result.
G.catchCheck = function (c, ballMult, rng) {
  rng = rng || (() => Math.random());
  const max = c.stats.hp;
  let a = Math.floor((3 * max - 2 * c.hp) * G.SPECIES[c.id].catchRate * ballMult / (3 * max));
  a = Math.floor(a * (c.status === 'slp' ? 2 : c.status ? 1.5 : 1));
  if (a >= 255) return { shakes: 3, caught: true };
  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
  let n = 0;
  for (let i = 0; i < 4; i++) { if (Math.floor(rng() * 65536) >= b) break; n++; }
  return { shakes: Math.min(n, 3), caught: n === 4 };
};

G.healFull = function (c) {
  c.hp = c.stats.hp; c.status = null;
  c.moves.forEach(m => m.pp = G.MOVES[m.id].pp);
};
})();
