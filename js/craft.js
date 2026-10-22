// Crafting and the house: the refinery (timed jobs), the forge (tools, parts, orbs, vehicles), the kitchen,
// creature treats, cupboard / fridge / shed storage, and every piece of house furniture (G.homeFurn[kind]).
// Recipes and numbers follow docs/HOMESTEAD.md §6. Menus use G.sysUI (js/farm.js).
(function () {
const G = globalThis.G;
const inv = G.inv, K = G.kit, F6 = G.FONT_S;
const says = l => G.worldApi.says(l);
G.homeUse = G.homeUse || {}; G.homeBlockRemove = G.homeBlockRemove || {}; G.homeFurn = G.homeFurn || {};
const perks = b => G.home.L(b).perks;
const MIN = 3600;   // frames per minute of play
const UI = () => G.sysUI;

// ---- Recipes --------------------------------------------------------------------------------------
// { id, out: { item: n }, in: { item: n }, tier, time (refinery frames at speed 1), double (tier-3 refinery doubles it),
//   tool (owned once), vehicle (granted through G.vehicles), lit (needs the Great Lantern lit) }
const R = (id, tier, inp, out, o) => Object.assign({ id, tier, in: inp, out }, o);
const RECIPES = G.RECIPES = {
  refinery: [
    R('plank', 1, { Wood: 3 }, { Plank: 2 }, { time: 1 * MIN, double: true }),
    R('rope', 1, { Fiber: 3 }, { Rope: 1 }, { time: 1 * MIN }),
    R('brick', 1, { Clay: 2, Coal: 1 }, { Brick: 2 }, { time: 2 * MIN, double: true }),
    R('iron', 1, { 'Iron Ore': 3, Coal: 1 }, { 'Iron Ingot': 1 }, { time: 2 * MIN }),
    R('copper', 1, { 'Copper Ore': 3, Coal: 1 }, { 'Copper Ingot': 1 }, { time: 2 * MIN }),
    R('glass', 2, { 'Crystal Shard': 2 }, { Glass: 1 }, { time: 3 * MIN }),
    R('cloth', 2, { Wool: 2 }, { Cloth: 1 }, { time: 2 * MIN }),
    R('flour', 2, { Wheat: 3 }, { Flour: 2 }, { time: 1 * MIN }),
  ],
  forge: [
    R('axe', 1, { Wood: 5, Stone: 3 }, { Axe: 1 }, { tool: true }),
    R('pickaxe', 1, { Wood: 4, Stone: 5 }, { Pickaxe: 1 }, { tool: true }),
    R('can', 1, { 'Copper Ingot': 2 }, { 'Watering Can': 1 }, { tool: true }),
    R('nails', 1, { 'Iron Ingot': 1 }, { Nails: 4 }),
    R('salve', 1, { Glowcap: 2, Honey: 1 }, { 'Herb Salve': 1 }),
    R('rowboat', 1, { Plank: 12, Rope: 4, Nails: 6 }, {}, { vehicle: 'rowboat', name: 'Rowboat', desc: 'A little wooden rowboat. Face open water and press A to launch it.' }),
    R('gear', 2, { 'Iron Ingot': 2 }, { Gear: 1 }),
    R('wire', 2, { 'Copper Ingot': 1 }, { Wire: 2 }),
    R('wheel', 2, { 'Iron Ingot': 1, Rope: 2 }, { Wheel: 1 }),
    R('engine', 2, { 'Iron Ingot': 2, Wire: 2, Gear: 1 }, { 'Engine Part': 1 }),
    R('orb', 2, { 'Iron Ingot': 1, Fiber: 2 }, { 'Terra Orb': 3 }),
    R('superorb', 2, { 'Iron Ingot': 1, 'Copper Ingot': 1, 'Crystal Shard': 1 }, { 'Pulse Orb': 2 }),
    R('mythicorb', 3, { 'Iron Ingot': 2, 'Crystal Shard': 3, Pearl: 1 }, { 'Mythic Orb': 1 }),
    R('bigcan', 2, { 'Iron Ingot': 2, 'Copper Ingot': 2 }, { 'Big Watering Can': 1 }, { tool: true }),
    R('spicy', 2, { Pepper: 2, Honey: 1 }, { 'Spicy Treat': 1 }),
    R('bicycle', 2, { 'Iron Ingot': 4, Wheel: 2, Rope: 2 }, {}, { vehicle: 'bicycle', name: 'Bicycle', desc: 'A sturdy bicycle. Ride it from the TRAVEL menu: fast on roads and paths.' }),
    R('motorboat', 2, { Plank: 20, 'Engine Part': 1, 'Iron Ingot': 4, Rope: 4 }, {}, { vehicle: 'motorboat', name: 'Motorboat', desc: 'An outboard motorboat: nearly twice as fast as rowing.' }),
    R('hovercore', 3, { 'Crystal Shard': 3, Wire: 2, Glass: 1 }, { 'Hover Core': 1 }),
    R('rotor', 3, { 'Iron Ingot': 3, Gear: 2 }, { Rotor: 1 }),
    R('star', 3, { Starmelon: 1, Honey: 2 }, { 'Star Treat': 1 }),
    R('sailboat', 3, { Plank: 24, Cloth: 4, Rope: 6, Nails: 8 }, {}, { vehicle: 'sailboat', name: 'Sailboat', desc: 'A graceful sailboat with a bright white sail.' }),
    R('climbgear', 1, { Rope: 4, 'Iron Ingot': 1 }, { 'Climbing Gear': 1 }, { tool: true }),
    R('shovel', 1, { Wood: 3, 'Iron Ingot': 1 }, { Shovel: 1 }, { tool: true }),
    R('glowlamp', 2, { Glass: 1, 'Copper Ingot': 1, Wire: 1 }, { 'Glow Lamp': 1 }, { tool: true }),
    R('hoverboard', 3, { 'Hover Core': 1, Plank: 4, Glass: 2 }, {}, { vehicle: 'hoverboard', lit: true, name: 'Hoverboard', desc: 'Glides over land and water alike. Needs the Great Lantern lit.' }),
  ],
  kitchen: [
    R('stew', 1, { Carrot: 1, Turnip: 1, Tomato: 1 }, { 'Veggie Stew': 1 }),
    R('bread', 1, { Flour: 2, Milk: 1 }, { Bread: 1 }),
    R('soup', 1, { Tomato: 2, Milk: 1 }, { 'Tomato Soup': 1 }),
    R('toast', 2, { Bread: 1, Honey: 1 }, { 'Honey Toast': 1 }),
    R('skewer', 2, { Pepper: 2, Carrot: 1, Tomato: 1 }, { 'Pepper Skewer': 1 }),
    R('pie', 3, { Pumpkin: 1, Flour: 2, Honey: 1, Milk: 1 }, { 'Pumpkin Pie': 1 }),
  ],
};
const outName = r => r.name || Object.keys(r.out)[0];
const outQty = r => r.vehicle ? 1 : Object.values(r.out)[0];
const label = (r, mult) => { const n = outQty(r) * (mult || 1); return n > 1 ? `${outName(r)} x${n}` : outName(r); };
const unlocked = (r, tier) => tier >= r.tier || !!(G.state.recipes && G.state.recipes[r.id]);
const fmt = f => { const s = Math.max(0, Math.ceil(f / 60)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const scaled = (out, k) => { const o = {}; for (const [n, q] of Object.entries(out)) o[n] = q * k; return o; };
const giveAll = out => { for (const [n, q] of Object.entries(out)) inv.give(n, q); };
const listText = out => Object.entries(out).map(([n, q]) => `${q} ${n}`).join(', ');

// ---- The shared recipe screen ------------------------------------------------------------------------
// o: { title, tierName(t), recipes, tier, mult(r), time(r), act(r), footer(ctx), key(p), sub(r) }
function recipeScreen(o) {
  const rows = () => o.recipes.map(r => {
    const ok = unlocked(r, o.tier), can = ok && inv.has(r.in);
    return { r, text: label(r, o.mult ? o.mult(r) : 1), dim: !ok, right: ok ? (can ? 'READY' : '') : `Lv${r.tier}`, rcol: can ? '#2a8a4a' : '#a898b0' };
  });
  return UI().list({ title: o.title, right: o.right, rows, tapSelect: true, index: o.index, key: o.key,
    footer: o.footer || ((ctx, row) => {
      const d = row && (row.r.desc || (G.ITEMS[outName(row.r)] || {}).desc);
      if (d) UI().wrapS(d, 222).slice(0, 2).forEach((l, k) => G.text(ctx, l, 10, 140 + k * 8, { font: F6 }));
    }),
    detail(ctx, row, i, x, y) {
      const r = row.r, ok = unlocked(r, o.tier);
      const nameL = G.wrap(label(r, o.mult ? o.mult(r) : 1), 100).slice(0, 2);
      nameL.forEach((l, k) => G.text(ctx, l, x + 8, y + 6 + k * 9, { font: G.FONT_B }));
      let yy = y + 8 + nameL.length * 9;
      if (o.sub) { const s = o.sub(r); if (s) { G.text(ctx, s, x + 8, yy, { font: F6, color: '#7a5a30', shadow: false }); yy += 9; } }
      G.text(ctx, 'NEEDS', x + 8, yy, { font: F6, color: '#8a6a40', shadow: false }); G.text(ctx, 'HAVE', x + 106, yy, { align: 'right', font: F6, color: '#8a6a40', shadow: false }); yy += 9;
      for (const [k, n] of Object.entries(r.in)) {
        const have = inv.count(k), good = have >= n;
        G.text(ctx, `${n} ${k}`, x + 10, yy, { font: F6, color: '#3a3a48', shadow: false });
        G.text(ctx, String(have), x + 106, yy, { align: 'right', font: F6, color: good ? '#2a8a4a' : '#c03030', shadow: false }); yy += 8;
      }
      const why = o.why(r);
      const [txt, col] = !ok ? [`Needs ${o.tierName(r.tier)}`, '#c03030'] : why ? [why, '#c06a20'] : inv.has(r.in) ? [o.verb + ' it!', '#2a8a4a'] : ['Missing ingredients', '#c03030'];
      K.rr(ctx, x + 6, y + 96, 102, 11, 5.5); ctx.fillStyle = col; ctx.globalAlpha = .14; ctx.fill(); ctx.globalAlpha = 1;
      G.text(ctx, txt, x + 57, y + 98.5, { align: 'center', font: F6, color: col, shadow: false });
    },
    act: async (i, row) => o.act(row.r),
  });
}
// Instant crafting (forge, kitchen): validates everything, then pays the whole cost or nothing.
async function craftNow(r, o) {
  if (!unlocked(r, o.tier)) { await says(`You need ${o.tierName(r.tier)} to make that.`); return false; }
  const why = o.why(r); if (why) { await says(why); return false; }
  if (!inv.has(r.in)) { await says(`You need ${inv.missingText(r.in)}.`); G.audio.sfx('bump'); return false; }
  if (r.vehicle && !(G.vehicles && G.vehicles.grant)) { await says(`The ${outName(r)} can't be built yet: vehicles aren't available in this version (G.vehicles is missing).`); return false; }
  if (!inv.pay(r.in)) return false;
  if (r.vehicle) {
    const ok = G.vehicles.grant(r.vehicle);
    if (ok === false) { inv.refund(r.in); await says(`Something went wrong building the ${outName(r)}. Nothing was used.`); return false; }
    G.audio.sfx('levelup'); await says([`You built a ${outName(r)}!`, 'Ride it from the TRAVEL menu, or store it in your garage.']); return true;
  }
  const out = scaled(r.out, o.mult ? o.mult(r) : 1); giveAll(out);
  if (r.out['Watering Can'] || r.out['Big Watering Can']) G.state.can = G.farm ? G.farm.canCap() : G.state.can;
  G.audio.sfx('levelup');
  await says(`${o.done || 'You made'} ${listText(out)}!`);
  return true;
}

// ---- Refinery ---------------------------------------------------------------------------------------
const jobDone = j => G.state.frames - j.start >= j.dur;
const jobLeft = j => Math.max(0, j.dur - (G.state.frames - j.start));
G.homeBlockRemove.refinery = b => (b.jobs || []).length ? 'The refinery still has jobs in it. Collect them (or let them finish) first.' : null;
G.homeActive = b => {
  if (!b || !G.state) return false;
  if (b.type === 'refinery') return (b.jobs || []).some(j => !jobDone(j));
  if (b.type === 'forge') return G.state.frames - (b.lastCraft === undefined ? -1e9 : b.lastCraft) < 240;
  return false;
};
// Starts job r in refinery b. Returns null on success or the reason it can't.
function startJob(b, r) {
  const per = perks(b); b.jobs = b.jobs || [];
  if (!unlocked(r, per.tier)) return `That needs a Refinery Mk ${['', 'I', 'II', 'III'][r.tier]}.`;
  if (b.jobs.length >= per.slots) return `All ${per.slots} slot${per.slots > 1 ? 's are' : ' is'} busy. Wait for a job to finish${per.slots < 3 ? ', or upgrade the refinery' : ''}.`;
  if (!inv.has(r.in)) return `You need ${inv.missingText(r.in)}.`;
  inv.pay(r.in);
  b.jobs.push({ r: r.id, start: G.state.frames, dur: Math.round(r.time / (per.speed || 1)), out: scaled(r.out, r.double && per.tier >= 3 ? 2 : 1) });
  return null;
}
// Collects every finished job. Returns { item: qty } (empty when nothing was ready).
function collect(b) {
  const got = {};
  b.jobs = (b.jobs || []).filter(j => { if (!jobDone(j)) return true; for (const [n, q] of Object.entries(j.out)) got[n] = (got[n] || 0) + q; return false; });
  giveAll(got); return got;
}
G.homeUse.refinery = async function (b) {
  b.jobs = b.jobs || [];
  const first = collect(b);
  if (Object.keys(first).length) { G.audio.sfx('levelup'); await says(`You collected ${listText(first)} from the refinery.`); }
  const per = () => perks(b), byId = id => RECIPES.refinery.find(r => r.id === id);
  let note = null;
  const grab = async () => { const got = collect(b); if (Object.keys(got).length) { G.audio.sfx('levelup'); note = { text: `+ ${listText(got)}`, t: G.frameNo }; return true; } return false; };
  await recipeScreen({
    title: G.home.L(b).name.toUpperCase(), recipes: RECIPES.refinery, tier: per().tier, verb: 'Start',
    right: () => `${b.jobs.length}/${per().slots} busy  x${per().speed} speed`,
    tierName: t => `Refinery Mk ${['', 'I', 'II', 'III'][t]}`,
    mult: r => r.double && per().tier >= 3 ? 2 : 1,
    sub: r => `Takes ${fmt(r.time / (per().speed || 1))}${r.double && per().tier >= 3 ? '  (double!)' : ''}`,
    why: () => b.jobs.length >= per().slots ? 'All slots busy' : null,
    act: async r => { const why = startJob(b, r); if (why) { G.audio.sfx('bump'); await says(why); } else G.audio.sfx('select'); },
    key: async p => { if (p.orb) { if (!(await grab())) G.audio.sfx('bump'); return true; } return false; },
    footer(ctx) {
      const n = per().slots, w = (232 - (n - 1) * 3) / n;
      for (let i = 0; i < n; i++) {
        const j = b.jobs[i], x = 6 + i * (w + 3), y = 139;
        if (!j) { G.text(ctx, `Slot ${i + 1}: empty`, x + 2, y + 3, { font: F6, color: '#a898b0', shadow: false }); continue; }
        const done = jobDone(j), k = done ? 1 : 1 - jobLeft(j) / j.dur, name = listText(j.out);
        G.text(ctx, name, x + 2, y, { font: F6, color: '#3a3a48', shadow: false });
        G.text(ctx, done ? 'DONE' : fmt(jobLeft(j)), x + w - 2, y, { align: 'right', font: F6, color: done ? '#2a8a4a' : '#7a5a30', shadow: false });
        K.rr(ctx, x + 2, y + 9, w - 4, 5, 2.5); ctx.fillStyle = '#e8e2ee'; ctx.fill();
        K.rr(ctx, x + 2, y + 9, Math.max(5, (w - 4) * k), 5, 2.5); ctx.fillStyle = done ? '#4cc95a' : '#f7983f'; ctx.fill();
        if (done) G.tapZone(x, y - 2, w, 18, () => { grab(); });
      }
      if (b.jobs.some(jobDone)) { const p = .6 + .4 * Math.sin(G.frameNo / 6); ctx.globalAlpha = p; G.text(ctx, 'C / tap: collect', 234, 130, { align: 'right', font: F6, color: '#2a8a4a', shadow: false }); ctx.globalAlpha = 1; }
      if (note && G.frameNo - note.t < 120) G.text(ctx, note.text, 6, 130, { font: F6, color: '#2a8a4a', shadow: false });
    },
  });
};

// ---- Forge ------------------------------------------------------------------------------------------
const FORGE_NAME = ['', 'Workbench', 'Forge', 'Master Forge'];
const an = w => (/^[AEIOU]/i.test(w) ? 'an ' : 'a ') + w;
function forgeWhy(r) {
  const S = G.state;
  if (r.tool && inv.count(outName(r))) return `You already have ${an(outName(r))}.`;
  if (r.id === 'can' && inv.count('Big Watering Can')) return 'You already have a Big Watering Can.';
  if (r.lit && !S.flags.lanternLit) return 'This needs the Great Lantern lit.';
  if (r.vehicle && S.vehicles && (S.vehicles.owned || []).includes(r.vehicle)) return `You already own ${an(outName(r))}.`;
  return null;
}
G.homeUse.forge = async function (b) {
  const tier = perks(b).tier;
  const o = { title: G.home.L(b).name.toUpperCase(), recipes: RECIPES.forge, tier, verb: 'Craft', right: () => `Tier ${tier}`,
    tierName: t => `a ${FORGE_NAME[t]} (Lv${t})`, why: forgeWhy, done: 'You crafted',
    sub: r => r.tool ? 'Tool: yours to keep' : r.vehicle ? 'Vehicle' : null };
  o.act = async r => { if (await craftNow(r, o)) b.lastCraft = G.state.frames; };
  await recipeScreen(o);
};

// ---- Kitchen (the stove in the house) -------------------------------------------------------------------
const kitchenTier = () => { const h = G.home.get('house'); return h ? perks(h).kitchen || 0 : 0; };
G.homeFurn.stove = async function () {
  const tier = kitchenTier();
  if (!tier) { await says(["The cabin's little stove only boils a kettle.", 'Upgrade your house to a Cottage to get a real kitchen.']); return; }
  const o = { title: 'KITCHEN', recipes: RECIPES.kitchen, tier, verb: 'Cook', done: 'You cooked',
    right: () => tier >= 3 ? "Chef's kitchen: makes 2!" : `Kitchen tier ${tier}`,
    tierName: t => `a tier ${t} kitchen (${G.STRUCTURES.house.levels.find(l => l.perks.kitchen >= t).name})`,
    mult: () => tier >= 3 ? 2 : 1, why: () => null,
    sub: r => { const e = (G.ITEMS[outName(r)] || {}).energy; return e ? `Restores ${e >= 999 ? 'all' : e} energy` : null; } };
  o.act = r => craftNow(r, o);
  await recipeScreen(o);
};

// ---- Creature treats -------------------------------------------------------------------------------
{ const cu = G.canUse; G.canUse = (c, name) => (G.ITEMS[name] && G.ITEMS[name].kind === 'treat') ? c.lvl < 100 : cu(c, name); }
// Feeds a treat (kind 'treat', it.exp) to creature c: EXP, level-ups, new moves, evolution. Returns true when used.
G.useTreat = async function (c, item) {
  const it = G.ITEMS[item];
  if (!it || it.kind !== 'treat' || c.lvl >= 100) { await G.say("It won't have any effect."); G.closeText(); return false; }
  if (!inv.take(item, 1)) return false;
  const lvl0 = c.lvl, learned = [];
  c.exp += it.exp;
  while (c.lvl < 100 && c.exp >= G.expFor(c.lvl + 1)) {
    G.levelUp(c);
    for (const mv of G.movesAt(c, c.lvl)) if (!c.moves.some(m => m.id === mv) && c.moves.length < 4) { c.moves.push({ id: mv, pp: G.MOVES[mv].pp }); learned.push(mv); }
    const evo = G.SPECIES[c.id].evo; if (evo && c.lvl >= evo[0]) c.evolveReady = true;
  }
  if (c.lvl >= 100) c.exp = Math.min(c.exp, G.expFor(100));
  G.audio.sfx('levelup');
  const lines = [`${G.name(c)} gobbled up the ${item}! It gained ${it.exp} EXP.`];
  if (c.lvl > lvl0) lines.push(`${G.name(c)} grew to Lv${c.lvl}!`);
  if (learned.length) lines.push(`${G.name(c)} learned ${learned.join(', ')}!`);
  for (const l of lines) await G.say(l);
  G.closeText();
  if (c.evolveReady && G.runEvolutions && G.scene === G.world.scene && G.state.party.includes(c)) {
    const saved = G.ui.layers.splice(0);
    await G.fadeTo(1, 12, '#000'); await G.runEvolutions(); G.audio.music(G.world.map.music);
    G.ui.layers.push(...saved); await G.fadeTo(0, 14);
  }
  return true;
};

// ---- Storage (cupboard, fridge, chest, shed) --------------------------------------------------------------
const stored = () => { G.state.storage = G.state.storage || {}; return G.state.storage; };
const usedSpace = () => Object.values(stored()).reduce((a, n) => a + n, 0);
const cap = () => G.home.storageCap();
function deposit(item, n) {
  const free = cap() - usedSpace(); n = Math.min(n, free, inv.count(item));
  if (n <= 0 || !inv.take(item, n)) return 0;
  stored()[item] = (stored()[item] || 0) + n; return n;
}
function withdraw(item, n) {
  const s = stored(); n = Math.min(n, s[item] || 0); if (n <= 0) return 0;
  s[item] -= n; if (!s[item]) delete s[item]; inv.give(item, n); return n;
}
async function storageUI(name) {
  const right = () => `${usedSpace()}/${cap()} stored`;
  await UI().list({ title: name || 'STORAGE', right,
    rows: () => [{ id: 'dep', text: '+ PUT ITEMS AWAY', col: '#2a7a4a', desc: 'Move items from your bag into storage. Your cupboard, fridge and sheds share the same space.' }]
      .concat(Object.keys(stored()).sort().map(k => ({ item: k, text: k, right: `x${stored()[k]}`, desc: (G.ITEMS[k] || {}).desc || '' }))),
    act: async (i, r) => {
      if (r.id === 'dep') {
        await UI().list({ title: 'PUT AWAY', right,
          rows: () => Object.keys(G.state.bag).filter(k => G.state.bag[k] > 0 && G.ITEMS[k] && G.ITEMS[k].kind !== 'key').sort().map(k => ({ item: k, text: k, right: `x${G.state.bag[k]}`, desc: G.ITEMS[k].desc })),
          empty: 'Your bag is empty.',
          act: async (j, it) => {
            const free = cap() - usedSpace();
            if (free <= 0) { G.audio.sfx('bump'); await says(`Your storage is full (${usedSpace()}/${cap()}). Build or upgrade a Storage Shed, or upgrade your house, for more room.`); return; }
            const n = await UI().qty(`Put away ${it.item}`, Math.min(free, inv.count(it.item)), Math.min(free, inv.count(it.item)));
            if (n && deposit(it.item, n)) G.audio.sfx('select');
          } });
        return;
      }
      const n = await UI().qty(`Take out ${r.item}`, stored()[r.item], stored()[r.item]);
      if (n && withdraw(r.item, n)) G.audio.sfx('select');
    } });
}
G.homeFurn.fridge = () => storageUI('FRIDGE');
G.homeFurn.cupboard = () => storageUI('CUPBOARD');
G.homeUse.shed = () => storageUI('STORAGE SHED');

// ---- Furniture ----------------------------------------------------------------------------------------
const F = G.homeFurn, farm = () => G.farm;
F.bed = async function () {
  await G.say('Go to bed and sleep until tomorrow morning?', { auto: 1 });
  if (!(await G.yesNo())) { G.closeText(); return; }
  G.closeText(); await farm().sleep();
};
F.sink = async function () { if (!(await farm().refill('sink'))) await says('You wash your hands. Squeaky clean!'); };
F.shower = () => farm().restOnce('shower', 15, 'A hot shower! You feel brand new.', "You've already showered today.");
F.bath = () => farm().restOnce('bath', 30, 'You sink into a deep, bubbly bath. Bliss.', "You've already had a bath today. Your fingers are still wrinkly.");
F.toilet = () => farm().restOnce('toilet', 5, 'You... take care of business. You feel lighter!', 'Nothing more to do in here. Wash your hands!', 'You wash your hands. Good habit!');
function trophyLines() {
  const S = G.state, f = S.flags, shards = ['meadow', 'marsh', 'mine'].filter(k => f['shard_' + k]).length, caught = Object.values(S.dex).filter(v => v > 1).length;
  return [`TROPHIES: ${shards} of 3 Ember Shards earned, ${caught} creatures caught, ${S.day} days on the homestead.`,
    f.lanternLit ? 'A little model of the Great Lantern glows on the shelf.' : 'There is a spot saved for something to do with the Great Lantern...',
    f.jokerCaught ? 'A card with a grinning jester sits in pride of place.' : 'In the middle is an empty frame, waiting for something special.'];
}
F.sofa = async function () {
  await farm().restOnce('sofa', 10, 'You flop onto the sofa and put your feet up.', "You've already had a lie-down today.");
  await says(trophyLines()[0]);
};
F.trophy = () => says(trophyLines());
F.petbed = async function () {
  const c = G.state.party.find(x => x.hp > 0) || G.state.party[0];
  await says(c ? [`${G.name(c)} hops into the pet bed, turns around three times and curls up.`, `${G.name(c)} looks very content.`] : 'A round cushion with paw prints, waiting for a friend.');
};
F.tv = async function () {
  const S = G.state, plots = S.builds.filter(b => b.type === 'plot'), f = farm();
  const ripe = plots.filter(b => b.crop && b.crop.ripe && !b.crop.dead).length, dry = plots.filter(b => b.crop && f.needsWater(b)).length, dead = plots.filter(b => b.crop && b.crop.dead).length;
  const jobs = S.builds.filter(b => b.type === 'refinery').flatMap(b => b.jobs || []), done = jobs.filter(jobDone).length;
  const barn = S.builds.filter(b => b.type === 'barn').reduce((a, b) => a + Object.values(b.store || {}).reduce((x, n) => x + n, 0), 0);
  const lines = [`VALE MORNING NEWS: It's Day ${S.day}. Your energy is ${S.energy}/${f.energyMax()}.`];
  lines.push(plots.length ? `Garden: ${ripe} ready to harvest, ${dry} need water${dead ? `, ${dead} withered` : ''}.` : 'Garden: no plots yet. Build Garden Plots from START > BUILD.');
  if (jobs.length) lines.push(`Refinery: ${jobs.length - done} job${jobs.length - done === 1 ? '' : 's'} running, ${done} ready to collect.`);
  if (barn) lines.push(`Barn: ${barn} item${barn > 1 ? 's' : ''} waiting to be collected.`);
  const tips = ['Tip: an Axe gets you 3 Wood from every tree.', 'Tip: sprinklers water nearby plots every morning.', 'Tip: a Pickaxe finds ore in ridge and mine boulders.', 'Tip: feed Fertilizer at a Big Barn for extra produce.', 'Tip: cooked meals restore far more energy than raw crops.'];
  lines.push(tips[S.day % tips.length]);
  await says(lines);
};
F.bookshelf = async function () {
  const rec = (r, where, mult) => ({ text: label(r, mult), right: where, desc: `${listText(r.in)} → ${r.vehicle ? outName(r) : listText(scaled(r.out, mult || 1))}${r.time ? `  ·  ${fmt(r.time)} at speed x1` : ''}${r.lit ? '  ·  needs the Lantern lit' : ''}` });
  const C = farm().CROPS, seedWhere = { turnip: 'Sunmeadow bushes, Meadowbrook Seeds', carrot: 'Sunmeadow and Lanternrest bushes, Meadowbrook Seeds', wheat: 'Meadowbrook Seeds', tomato: 'Shore bushes, Meadowbrook Seeds', pepper: 'Ridge bushes, Ridgehold Forge', glowcap: 'Mirewood bushes and stumps, Bogroot Apothecary', pumpkin: 'Tidewheel Market', starmelon: 'Starlit Hollow bushes (rare)' };
  const books = [
    ['REFINERY', () => RECIPES.refinery.map(r => rec(r, `Mk ${r.tier}`))],
    ['FORGE', () => RECIPES.forge.map(r => rec(r, FORGE_NAME[r.tier]))],
    ['KITCHEN', () => RECIPES.kitchen.map(r => rec(r, `Tier ${r.tier}`))],
    ['CROPS', () => Object.entries(C).map(([id, c]) => ({ text: c.name, right: `${c.days} days`, desc: `${c.yield[0]}-${c.yield[1]} per harvest${c.noWater ? ', never needs water' : ''}. Seeds: ${seedWhere[id]}.` }))],
    ['GATHERING', () => [
      { text: 'Trees and stumps', right: 'Wood', desc: '1 Wood, or 3 with an Axe. Everything regrows after 150 steps. Gathering costs 2 energy.' },
      { text: 'Bushes', right: 'Fiber', desc: '1 Fiber, and sometimes seeds: which ones depends on where you are.' },
      { text: 'Boulders', right: 'Stone', desc: '1-2 Stone (Clay on the shore and in the marsh). With a Pickaxe: copper and iron on the ridge, iron and coal in the mine.' },
      { text: 'Crystals', right: 'Shards', desc: 'A Crystal Shard each. You need a Pickaxe.' },
      { text: 'Water', right: 'Can', desc: 'Face any water, a well or a sink to refill your watering can.' }]],
  ];
  await UI().list({ title: 'RECIPE BOOK', rows: () => books.map(([t]) => ({ text: t, desc: 'Open this book.' })),
    act: async i => { await UI().list({ title: books[i][0], rows: books[i][1] }); } });
};
F.desk = async function () {
  const S = G.state, deed = (S.home && S.home.deed) || 1, groups = {};
  for (const b of S.builds) { if (b.map !== 'homestead' || !G.STRUCTURES[b.type]) continue; (groups[b.type] = groups[b.type] || []).push(b); }
  const rows = Object.entries(groups).map(([t, bs]) => {
    const d = G.STRUCTURES[t], best = Math.max(...bs.map(G.home.lvl));
    return { text: bs.length > 1 ? `${d.name} x${bs.length}` : (t === 'house' ? G.home.L(bs[0]).name : d.name), right: d.levels.length > 1 ? `Lv${best}/${d.levels.length}` : '', desc: d.desc };
  });
  await UI().list({ title: 'PROPERTY LEDGER', right: () => `Deed ${deed}/3  ·  storage ${G.home.storageCap()}`, rows: () => rows, empty: 'Nothing built yet.' });
};
const SHIRTS = [['Cherry red', '#e04848'], ['Sky blue', '#4a90e0'], ['Leaf green', '#4cae5a'], ['Sunny yellow', '#f0c040'], ['Grape', '#8a5ad0'], ['Bubblegum', '#f080b0'], ['Pumpkin', '#f08a30'], ['Snow white', '#f2f2f2'], ['Midnight', '#3c3c58'], ['Teal', '#2ab0a0']];
F.wardrobe = async function () {
  const S = G.state;
  await UI().list({ title: 'WARDROBE', right: () => 'Pick a shirt', rows: () => SHIRTS.map(([n, c]) => ({ text: n + ((S.style || {}).shirt === c ? '  (wearing)' : ''), swatch: c, desc: 'Change into this shirt.' })),
    act: async i => { S.style = Object.assign({}, S.style || G.PLAYER_STYLE, { shirt: SHIRTS[i][1] }); G.audio.sfx('select'); return 'close'; } });
};

G.craft = { RECIPES, startJob, collect, jobDone, jobLeft, craftNow, recipeScreen, storageUI, deposit, withdraw, usedSpace, kitchenTier, forgeWhy };
})();
