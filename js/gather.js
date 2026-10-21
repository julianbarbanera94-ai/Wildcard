// Gathering: face a tree, bush, stump, boulder or crystal outdoors (or in the mine) and press A for materials.
// Each tile regrows REGROW steps after it was last gathered (S.gather['map:x,y'] = step). Facing water refills the
// watering can. Drop tables and seed chances follow docs/HOMESTEAD.md §6.
(function () {
const G = globalThis.G;
const inv = G.inv;
const says = l => G.worldApi.says(l);
const REGROW = 150, COST = 2;
const KIND = { '#': 'tree', n: 'tree', u: 'bush', d: 'stump', r: 'rock', i: 'crystal' };
const LABEL = { tree: 'Chop tree', stump: 'Chop stump', bush: 'Forage bush', rock: 'Break rock', crystal: 'Mine crystal' };
// Seed chances per map (rolled once per bush: the first matching band wins).
const SEEDS = {
  sunmeadow: [['Turnip Seeds', .25], ['Carrot Seeds', .15]],
  lanternrest: [['Carrot Seeds', .15]],
  shore: [['Tomato Seeds', .15]],
  ridge: [['Pepper Seeds', .2]],
  mirewood: [['Glowcap Spores', .2]],
  hollow: [['Starmelon Seeds', .1]],
};
const STUMP_SEEDS = { mirewood: [['Glowcap Spores', .2]] };
const CLAY_MAPS = { shore: 1, mirewood: 1 };
const RARE = { 'Iron Ore': 1, 'Copper Ore': 1, Coal: 1, 'Crystal Shard': 1 };

const S = () => G.farm ? G.farm.ensure() : G.state;
const keyOf = (mapId, x, y) => mapId + ':' + x + ',' + y;
// Steps left before a tile can be gathered again (0 = ready).
function wait(mapId, x, y) {
  const st = S(), k = keyOf(mapId, x, y), at = st.gather[k];
  if (at === undefined) return 0;
  const left = REGROW - ((st.steps || 0) - at);
  if (left <= 0) { delete st.gather[k]; return 0; }
  return left;
}
// Decorative plants that give nothing: village crop beds anywhere, and the flowerbeds of the Lanternrest plaza.
function decorative(mapId, x, y, ch) {
  if (ch === 'j') return true;
  return mapId === 'lanternrest' && (ch === 'u' || ch === 'd') && x >= 20 && x <= 39 && y >= 15 && y <= 31;
}
const gatherable = m => !!m && m.outdoor !== false;
function roll(table, r) { const x = r(); let acc = 0; for (const [item, p] of table || []) { acc += p; if (x < acc) return item; } return null; }
// The drops for one gather: { item: qty }. tools: { axe, pick }.
function rollDrops(kind, mapId, tools, r) {
  r = r || G.gather.rand; const out = {}, add = (k, n) => { out[k] = (out[k] || 0) + (n || 1); };
  if (kind === 'tree') add('Wood', tools.axe ? 3 : 1);
  else if (kind === 'stump') { add('Wood', tools.axe ? 3 : 1); const s = roll(STUMP_SEEDS[mapId], r); if (s) add(s); }
  else if (kind === 'bush') { add('Fiber'); const s = roll(SEEDS[mapId], r); if (s) add(s); }
  else if (kind === 'rock') {
    const n = 1 + (r() < .5 ? 1 : 0);
    add(CLAY_MAPS[mapId] && r() < .5 ? 'Clay' : 'Stone', n);
    if (tools.pick && mapId === 'ridge') { if (r() < .4) add('Copper Ore'); if (r() < .15) add('Iron Ore'); }
    if (tools.pick && mapId === 'mine') { if (r() < .5) add('Iron Ore'); if (r() < .4) add('Coal'); }
  } else if (kind === 'crystal') add('Crystal Shard');
  return out;
}
const tools = () => ({ axe: inv.count('Axe') > 0, pick: inv.count('Pickaxe') > 0 });

async function gather(tx, ty) {
  const W = G.worldApi, m = G.world.map, ch = W.tileAt(tx, ty);
  if (!gatherable(m) || !ch) return false;
  if (ch === 'w') return G.farm ? G.farm.refill('water') : false;
  if (ch === 'j') { await says('Somebody is growing vegetables here. Better leave them be.'); return true; }
  const kind = KIND[ch]; if (!kind) return false;
  if (decorative(m.id, tx, ty, ch)) { await says('The villagers keep these flowerbeds neat and tidy. Better leave them be.'); return true; }
  const left = wait(m.id, tx, ty);
  if (left) { await says(`${{ tree: 'This tree has', stump: 'This stump has', bush: 'This bush has', rock: 'This rock has', crystal: 'This crystal has' }[kind]} been picked clean. It grows back in about ${left} steps.`); return true; }
  if (kind === 'crystal' && !tools().pick) { await says('The crystal is far too hard to break by hand. You need a Pickaxe.'); return true; }
  if (G.farm && !(await G.farm.useEnergy(COST))) return true;
  const drops = rollDrops(kind, m.id, tools());
  S().gather[keyOf(m.id, tx, ty)] = S().steps || 0;
  let rare = false, k = 0;
  for (const [item, n] of Object.entries(drops)) {
    inv.give(item, n);
    const special = RARE[item] || G.ITEMS[item].kind === 'seed'; rare = rare || special;
    if (G.farm) G.farm.pop(tx, ty, `+${n} ${item}`, { delay: k++ * 14, col: special ? '#ffe066' : '#ffffff' });
  }
  G.audio.sfx(rare ? 'levelup' : 'select');
  await G.wait(12 + k * 6);
  return true;
}
G.hooks.interact.push(gather);
G.hooks.prompt.push((tx, ty) => {
  const m = G.world.map; if (!gatherable(m) || !G.state) return null;
  const ch = G.worldApi.tileAt(tx, ty);
  if (ch === 'w') { const cap = G.farm ? G.farm.canCap() : 0; return cap && S().can < cap ? 'Refill can' : null; }
  const kind = KIND[ch]; if (!kind || decorative(m.id, tx, ty, ch)) return null;
  return wait(m.id, tx, ty) ? 'Regrowing' : LABEL[kind];
});

G.gather = { REGROW, COST, KIND, SEEDS, STUMP_SEEDS, rollDrops, wait, decorative, gather, rand: Math.random };
})();
