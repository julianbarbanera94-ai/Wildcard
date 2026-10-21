// Farming and daily life: the day clock, player energy, garden plots and crops, watering, sprinklers, the
// greenhouse, the well, benches and the barn, plus the shared list / quantity menus (G.sysUI) used by the
// systems screens, floating "+1 Wood" feedback and the small Day / energy HUD. Rules: docs/HOMESTEAD.md §6.
(function () {
const G = globalThis.G;
const inv = G.inv, K = G.kit;
const DAY_FRAMES = 36000;
const TIRED = "You're too tired. Eat something or get some sleep.";
const says = l => G.worldApi.says(l);
G.homeUse = G.homeUse || {}; G.homePrompt = G.homePrompt || {}; G.homeBlockRemove = G.homeBlockRemove || {}; G.homeFurn = G.homeFurn || {};

// ---- Crops ----------------------------------------------------------------------------------------
// days: watered days to ripen; yield: [min, max] before plot and fertilizer bonuses; col/leaf: fallback art.
const CROPS = {
  turnip: { name: 'Turnip', seed: 'Turnip Seeds', days: 3, yield: [1, 2], col: '#f2e6f6', top: '#b45cc8' },
  carrot: { name: 'Carrot', seed: 'Carrot Seeds', days: 4, yield: [1, 2], col: '#f58a2c' },
  wheat: { name: 'Wheat', seed: 'Wheat Seeds', days: 3, yield: [2, 3], col: '#ecc75a', grain: true },
  tomato: { name: 'Tomato', seed: 'Tomato Seeds', days: 5, yield: [2, 3], col: '#ec4430' },
  pepper: { name: 'Pepper', seed: 'Pepper Seeds', days: 5, yield: [1, 3], col: '#d8281c' },
  glowcap: { name: 'Glowcap', seed: 'Glowcap Spores', days: 4, yield: [1, 3], col: '#7ff0de', noWater: true },
  pumpkin: { name: 'Pumpkin', seed: 'Pumpkin Seeds', days: 7, yield: [1, 2], col: '#f39322' },
  starmelon: { name: 'Starmelon', seed: 'Starmelon Seeds', days: 9, yield: [1, 1], col: '#7cc8ff' },
};
const SEED_CROP = {}; for (const [id, c] of Object.entries(CROPS)) SEED_CROP[c.seed] = id;
const plural = (name, n) => n === 1 ? name : ({ Tomato: 'Tomatoes', Wheat: 'Wheat' }[name] || name + 's');

// ---- State helpers ----------------------------------------------------------------------------------
function st() {
  const S = G.state; if (!S) return null;
  if (!S.day) S.day = 1; if (typeof S.clock !== 'number') S.clock = 0; if (typeof S.energy !== 'number') S.energy = 100;
  if (typeof S.can !== 'number') S.can = 0; S.storage = S.storage || {}; S.gather = S.gather || {}; S.builds = S.builds || [];
  if (!S.daily || S.daily.day !== S.day) S.daily = { day: S.day, done: {} };
  return S;
}
const perks = b => G.home.L(b).perks;
const energyMax = () => { const h = G.home && G.home.get && G.home.get('house'); return (h && perks(h).energy) || 100; };
let showUntil = 0;
const flash = () => { showUntil = G.frameNo + 150; };
async function useEnergy(n) {
  const S = st();
  if (S.energy < n) { G.audio.sfx('bump'); await says(TIRED); return false; }
  S.energy -= n; flash(); return true;
}
function gain(n) { const S = st(), before = S.energy; S.energy = Math.min(energyMax(), S.energy + n); flash(); return S.energy - before; }
// Daily-once effects (shower, bath, bench...): true the first time today, false after that.
const usedToday = k => !!st().daily.done[k];
const markToday = k => { st().daily.done[k] = true; };
const canCap = () => inv.count('Big Watering Can') ? 15 : inv.count('Watering Can') ? 6 : 0;

// ---- Floating feedback ("+1 Wood") ------------------------------------------------------------------
const fx = [];
// tx, ty: tile; o: { col, delay, sparkle }
function pop(tx, ty, text, o) { o = o || {}; fx.push({ map: G.world.mapId, x: tx * 16 + 8, y: ty * 16, text, col: o.col || '#ffffff', t: -(o.delay || 0), sparkle: o.sparkle !== false }); }

// ---- Shared menus (G.sysUI) ------------------------------------------------------------------------
const F6 = G.FONT_S;
const wrapS = (s, w) => G.wrap(s, w * 4 / 3);   // G.wrap measures the 8px font; small text is 6px
function hilite(ctx, x, y, w, h) {
  K.rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = `rgba(255,190,90,${.3 + .1 * Math.sin(G.frameNo / 10)})`; ctx.fill();
  ctx.strokeStyle = 'rgba(247,152,63,.75)'; ctx.lineWidth = .8; ctx.stroke();
  const bx = x + 2 + Math.sin(G.frameNo / 5), cy = y + h / 2;
  ctx.fillStyle = '#ff6b5a'; ctx.beginPath(); ctx.moveTo(bx, cy - 3); ctx.lineTo(bx + 5, cy); ctx.lineTo(bx, cy + 3); ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#ff6b5a'; ctx.stroke(); ctx.fill();
}
function backPill(ctx, x, y, onTap) {
  K.pill(ctx, x, y, 26, 10, '#f7983f', 'BACK'); G.tapZone(x - 2, y - 3, 30, 16, onTap);
}
// A full-screen list: header (title, right text, BACK), a scrolling list (optionally with a detail panel on the right)
// and a footer (the row's description, or o.footer). o: { title, right(), rows() -> [{ text, right, rcol, dim, desc, swatch }],
// act(i, row) -> 'close' | anything (keeps the list open while it runs), detail(ctx, row, i, x, y), footer(ctx, row, i),
// empty, index, key(pressed) }. Without act, returns the chosen index; always returns -1 on BACK.
async function list(o) {
  let idx = o.index || 0, top = 0, tapped = null, back = false;
  const VIS = 8, RH = 13, LW = o.detail ? 120 : 236;
  const layer = { draw(ctx) {
    const rows = o.rows();
    ctx.fillStyle = 'rgba(30,18,50,.38)'; ctx.fillRect(-60, -60, 400, 300);
    G.frame(ctx, 2, 2, 236, 18, 'light');
    K.star(ctx, 10, 11, 3, '#ffb43a');
    G.text(ctx, o.title, 16, 6.5, { font: G.FONT_B });
    const rt = o.right && o.right(); if (rt) G.text(ctx, rt, 202, 7.5, { align: 'right', font: F6, color: '#7a5a30', shadow: false });
    backPill(ctx, 207, 6, () => { back = true; });
    G.frame(ctx, 2, 22, LW, 112, 'light');
    if (!rows.length) G.text(ctx, o.empty || 'Nothing here.', 12, 30, { font: F6, color: '#8a7a98' });
    rows.slice(top, top + VIS).forEach((r, k) => {
      const i = top + k, y = 29 + k * RH;
      G.tapZone(4, y - 3, LW - 4, RH, () => { tapped = i; });
      if (i === idx) hilite(ctx, 5, y - 2.5, LW - 6, 12);
      const tx = r.icon !== undefined ? 28 : 14;
      if (r.icon !== undefined) G.icon(ctx, r.icon, 13, y - 3, 13);
      G.text(ctx, r.text, tx, y, { color: r.dim ? '#a898b0' : r.col || '#4a3b58', shadow: r.dim ? false : undefined });
      if (r.swatch) { ctx.fillStyle = '#3d3352'; K.rr(ctx, LW - 20, y - .5, 14, 9, 3); ctx.fill(); ctx.fillStyle = r.swatch; K.rr(ctx, LW - 19.2, y + .3, 12.4, 7.4, 2.4); ctx.fill(); }
      else if (r.right) G.text(ctx, r.right, LW - 4, y + 1.5, { align: 'right', font: F6, color: r.rcol || '#7a6a88', shadow: false });
    });
    const ab = Math.sin(G.frameNo / 8);
    if (top > 0) G.text(ctx, '▲', LW / 2, 21 - ab, { font: F6, color: '#f7983f', shadow: false });
    if (top + VIS < rows.length) G.text(ctx, '▼', LW / 2, 128 + ab, { font: F6, color: '#f7983f', shadow: false });
    if (o.detail) { G.frame(ctx, 124, 22, 114, 112, 'light'); if (rows[idx]) o.detail(ctx, rows[idx], idx, 124, 22); }
    G.frame(ctx, 2, 136, 236, 22, 'light');
    if (o.footer) o.footer(ctx, rows[idx], idx);
    else if (rows[idx] && rows[idx].desc) wrapS(rows[idx].desc, 222).slice(0, 2).forEach((l, k) => G.text(ctx, l, 10, 140 + k * 8, { font: F6 }));
  } };
  G.ui.layers.push(layer);
  let res = -1;
  try {
    for (;;) {
      await G.nextFrame();
      const p = G.input.pressed, rows = o.rows(), n = rows.length;
      if (idx >= n) idx = Math.max(0, n - 1);
      if (back || p.b) { G.audio.sfx('select'); res = -1; break; }
      if (o.key && await o.key(p, rows[idx], idx)) continue;
      let go = false;
      if (tapped !== null) { if (tapped < n) { if (tapped === idx || !o.tapSelect) go = true; else G.audio.sfx('select'); idx = tapped; } tapped = null; }
      if (n && p.up) { idx = (idx - 1 + n) % n; G.audio.sfx('select'); }
      if (n && p.down) { idx = (idx + 1) % n; G.audio.sfx('select'); }
      if (idx < top) top = idx; if (idx >= top + VIS) top = idx - VIS + 1;
      if (p.a) go = true;
      if (!go || !n) continue;
      G.audio.sfx('select');
      if (!o.act) { res = idx; break; }
      const r = await o.act(idx, rows[idx]); G.closeText();
      if (r === 'close') { res = idx; break; }
    }
  } finally { G.ui.layers.splice(G.ui.layers.indexOf(layer), 1); }
  return res;
}
// Quantity picker: up/down ±1, left/right ±10, or tap − / +. Returns 0 when cancelled.
async function qty(label, max, start) {
  if (max <= 1) return max;
  let q = Math.min(max, start || 1), res = null;
  const layer = { draw(ctx) {
    G.frame(ctx, 60, 50, 120, 46, 'light');
    G.text(ctx, label, 120, 56, { align: 'center', font: F6, color: '#7a5a30', shadow: false });
    K.pill(ctx, 72, 67, 20, 13, '#f7983f', '-'); K.pill(ctx, 148, 67, 20, 13, '#f7983f', '+');
    G.text(ctx, `x${q}`, 120, 69, { align: 'center', font: G.FONT_B });
    G.text(ctx, `max ${max}`, 120, 85, { align: 'center', font: F6, color: '#8a7a98', shadow: false });
    G.tapZone(64, 62, 32, 22, () => { q = Math.max(1, q - 1); G.audio.sfx('select'); });
    G.tapZone(144, 62, 32, 22, () => { q = Math.min(max, q + 1); G.audio.sfx('select'); });
    G.tapZone(98, 62, 44, 34, () => { res = q; });
    G.tapZone(-999, -999, 2400, 2400, () => { res = 0; });
  } };
  G.ui.layers.push(layer);
  while (res === null) {
    await G.nextFrame(); const p = G.input.pressed, q0 = q;
    if (p.up) q = Math.min(max, q + 1); if (p.down) q = Math.max(1, q - 1); if (p.right) q = Math.min(max, q + 10); if (p.left) q = Math.max(1, q - 10);
    if (q !== q0) G.audio.sfx('select');
    if (p.a) res = q; else if (p.b) res = 0;
  }
  G.ui.layers.splice(G.ui.layers.indexOf(layer), 1); G.audio.sfx('select');
  return res;
}
// A small titled panel over the map while a G.choose menu is open.
function infoPanel(lines, w) {
  return { draw(ctx) {
    let ww = w || 0;
    if (!ww) { ctx.save(); lines.forEach((l, i) => { ctx.font = i ? F6 : G.FONT_B; ww = Math.max(ww, ctx.measureText(l).width + 20); }); ctx.restore(); ww = Math.min(232, Math.max(110, Math.ceil(ww))); }
    const h = 10 + lines.length * 9; G.frame(ctx, 4, 4, ww, h, 'light');
    lines.forEach((l, i) => G.text(ctx, l, 12, 9 + i * 9, i ? { font: F6, color: '#6a5a78', shadow: false } : { font: G.FONT_B }));
  } };
}
// A G.choose menu (bottom right, like the structure menus) under a small info panel. opts: [[label, fn | null]].
async function menu(lines, opts) {
  const panel = infoPanel(lines);
  G.ui.layers.push(panel);
  const i = await G.choose(opts.map(o => o[0]), { right: 236, bottom: 108, minW: 60 });
  G.ui.layers.splice(G.ui.layers.indexOf(panel), 1);
  if (i >= 0 && opts[i][1]) return opts[i][1]();
  return null;
}
G.sysUI = { list, qty, wrapS, hilite, infoPanel, menu };

// ---- Plots, sprinklers and the greenhouse ---------------------------------------------------------------
const plotsOn = map => st().builds.filter(b => b.type === 'plot' && b.map === map);
const cheb = (ax, ay, b) => { const { w, h } = G.home.dims(b.type, G.home.lvl(b), b.rot); const dx = Math.max(b.x - ax, 0, ax - (b.x + w - 1)), dy = Math.max(b.y - ay, 0, ay - (b.y + h - 1)); return Math.max(dx, dy); };
const sprinkled = p => st().builds.some(s => s.type === 'sprinkler' && s.map === p.map && cheb(p.x, p.y, s) <= perks(s).radius);
const greenBoost = p => Math.max(0, ...st().builds.filter(g => g.type === 'greenhouse' && g.map === p.map && cheb(p.x, p.y, g) <= perks(g).radius).map(g => perks(g).boost || 1));
const stage = c => { const d = CROPS[c.id].days; return c.ripe || c.grown >= d ? 3 : c.grown >= d * 2 / 3 ? 2 : c.grown >= d / 3 ? 1 : 0; };
const daysLeft = c => Math.max(0, CROPS[c.id].days - c.grown);
const needsWater = (b, c) => c && !c.ripe && !c.dead && !c.wet && !CROPS[c.id].noWater && !perks(b).selfWater;
function plant(b, cropId) {
  const def = CROPS[cropId]; if (!def || b.crop) return false;
  if (!inv.take(def.seed, 1)) return false;
  const self = def.noWater || perks(b).selfWater || sprinkled(b);
  b.crop = { id: cropId, grown: 0, wet: !!self, fert: false, ripe: false, dry: 0, dead: false };
  return true;
}
// Waters plot b (the Big Watering Can also waters its 4 neighbours). Returns the number of plots watered.
function waterAt(b) {
  const list = [b];
  if (inv.count('Big Watering Can')) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = plotsOn(b.map).find(p => p.x === b.x + dx && p.y === b.y + dy); if (n) list.push(n); }
  let n = 0; for (const p of list) if (needsWater(p, p.crop)) { p.crop.wet = true; n++; }
  return n;
}
function harvestYield(b) {
  const c = b.crop, d = CROPS[c.id], r = G.farm.rand;
  return d.yield[0] + Math.floor(r() * (d.yield[1] - d.yield[0] + 1)) + (perks(b).yield || 0) + (c.fert ? 1 : 0);
}

// ---- The day ---------------------------------------------------------------------------------------
// A new morning: sprinklers water, watered crops grow (twice as fast near a greenhouse), dry ones wither after 3 days,
// barns produce. Stations reset by themselves (they remember the day they were used).
function newDay() {
  const S = st(), sum = { ripe: 0, grew: 0, withered: 0, barn: 0 };
  for (const b of S.builds.filter(x => x.type === 'plot')) {
    const c = b.crop; if (!c || c.dead || !CROPS[c.id]) continue;
    const self = !!(CROPS[c.id].noWater || perks(b).selfWater || sprinkled(b));
    if (!c.ripe) {
      if (c.wet || self) { c.dry = 0; c.grown = Math.min(CROPS[c.id].days, c.grown + 1 + greenBoost(b)); if (c.grown >= CROPS[c.id].days) { c.ripe = true; sum.ripe++; } else sum.grew++; }
      else if ((c.dry = (c.dry || 0) + 1) >= 3) { c.dead = true; sum.withered++; }
    }
    c.wet = self;
  }
  sum.barn = barnProduce(S.day);
  S.day++; S.clock = 0; S.daily = { day: S.day, done: {} };
  return sum;
}
function morningLines(sum) {
  const out = [`Good morning! It's Day ${G.state.day}.`];
  const ready = st().builds.filter(b => b.type === 'plot' && b.crop && b.crop.ripe && !b.crop.dead).length;
  if (ready) out.push(`${ready} crop${ready > 1 ? 's are' : ' is'} ready to harvest.`);
  if (sum.withered) out.push(`${sum.withered} crop${sum.withered > 1 ? 's' : ''} withered from lack of water.`);
  if (sum.barn) out.push(`Your barn creatures made ${sum.barn} item${sum.barn > 1 ? 's' : ''}. Collect them at the barn.`);
  return out;
}
async function sleep() {
  const S = st();
  await G.fadeTo(1, 18, '#000');
  const sum = newDay(); S.energy = energyMax(); S.party.forEach(G.healFull);
  G.audio.sfx('heal'); await G.wait(40); await G.fadeTo(0, 18);
  flash(); await says(morningLines(sum));
  return sum;
}
G.hooks.tick.push(() => {
  const S = G.state; if (!S || !S.flags || !S.flags.starter) return;
  st();
  if (++S.clock >= DAY_FRAMES) {
    newDay(); gain(Math.round(energyMax() / 4));   // a night outdoors: you doze a little
    G.world.banner = { text: `DAY ${S.day}`, t: 0 };
  }
});

// ---- Watering can ---------------------------------------------------------------------------------
// Fills the can. Returns false when you have no can (so water tiles can mean something else).
async function refill(src) {
  const S = st(), cap = canCap();
  if (!cap) { if (src === 'well') await says('You need a Watering Can to carry water. The General Store sells them, or craft one at a Forge.'); return false; }
  if (S.can >= cap) { await says(`Your watering can is already full (${S.can}/${cap}).`); return true; }
  S.can = cap; G.audio.sfx('select'); flash();
  const [tx, ty] = G.worldApi.facing(); pop(tx, ty, 'Can refilled!', { col: '#9ad8ff' });
  await G.wait(20);
  return true;
}

// ---- Garden plot (direct structure: A runs this straight away) -------------------------------------------
G.homePrompt.plot = b => {
  const c = b.crop;
  if (!c) return 'Plant';
  if (c.dead) return 'Clear';
  if (c.ripe) return 'Harvest';
  if (needsWater(b, c)) return 'Water';
  const d = daysLeft(c); return `Growing: ${d} day${d === 1 ? '' : 's'} left`;
};
async function harvest(b) {
  const c = b.crop, d = CROPS[c.id];
  if (!(await useEnergy(1))) return;
  const n = harvestYield(b); inv.give(d.name, n); b.crop = null;
  G.audio.sfx('levelup'); pop(b.x, b.y, `+${n} ${plural(d.name, n)}`, { col: '#ffe066' });
  await G.wait(24);
  return n;
}
async function water(b) {
  const S = st(), cap = canCap();
  if (!cap) { await says('You need a Watering Can. The General Store in Lanternrest sells them.'); return; }
  if (S.can <= 0) { await says('Your watering can is empty. Refill it at a well, a sink or any water.'); return; }
  if (!(await useEnergy(1))) return;
  const n = waterAt(b); S.can--;
  G.audio.sfx('select'); pop(b.x, b.y, n > 1 ? `Watered ${n}!` : 'Watered!', { col: '#9ad8ff' });
  await G.wait(16);
}
async function plantMenu(b) {
  const seeds = Object.keys(G.state.bag).filter(k => SEED_CROP[k] && G.state.bag[k] > 0);
  if (!seeds.length) { await says("You don't have any seeds. Meadowbrook Seeds in Sunmeadow sells them, and wild bushes sometimes drop some."); return; }
  await list({ title: 'PLANT WHICH SEED?', rows: () => seeds.filter(s => inv.count(s)).map(s => { const d = CROPS[SEED_CROP[s]]; return { text: s, right: `x${inv.count(s)}`, desc: `${d.name}: ripe in ${d.days} days, ${d.yield[0]}-${d.yield[1]} per harvest.${d.noWater ? ' Never needs water.' : ' Water it every day.'}`, seed: s }; }),
    act: async (i, r) => { if (plant(b, SEED_CROP[r.seed])) { G.audio.sfx('select'); pop(b.x, b.y, 'Planted!', { col: '#b8f080' }); } return 'close'; } });
}
G.homeUse.plot = async function (b) {
  const c = b.crop, lvl = G.home.L(b);
  if (c && c.ripe && !c.dead) return harvest(b);
  const head = c ? (c.dead ? `WITHERED ${CROPS[c.id].name.toUpperCase()}` : CROPS[c.id].name.toUpperCase()) : lvl.name.toUpperCase();
  const sub = !c ? (lvl.desc || 'Empty soil. Plant some seeds!') : c.dead ? 'It dried out. Clear it to plant again.'
    : `Day ${c.grown} of ${CROPS[c.id].days}  ·  ${CROPS[c.id].noWater || perks(b).selfWater ? 'no water needed' : c.wet ? 'watered today' : 'needs water'}${c.fert ? '  ·  fertilized' : ''}`;
  const opts = [];
  if (!c) opts.push(['PLANT', () => plantMenu(b)], ['MANAGE PLOT', () => G.home.manage(b)]);
  else if (c.dead) opts.push(['CLEAR', async () => { b.crop = null; G.audio.sfx('select'); pop(b.x, b.y, 'Cleared', { col: '#e0c8a0', sparkle: false }); await G.wait(10); }]);
  else {
    if (needsWater(b, c)) opts.push([`WATER (${st().can}/${canCap()})`, () => water(b)]);
    if (!c.fert) opts.push([`FERTILIZE (x${inv.count('Fertilizer')})`, async () => {
      if (!inv.take('Fertilizer', 1)) { await says('You have no Fertilizer. Grass- and Poison-type creatures in a barn make it, and Meadowbrook Seeds sells it.'); return; }
      c.fert = true; G.audio.sfx('select'); pop(b.x, b.y, 'Fertilized! +1 crop', { col: '#d8b070' }); await G.wait(12);
    }]);
    opts.push(['DIG UP', async () => { await G.say(`Dig up the ${CROPS[c.id].name}? You won't get anything back.`, { auto: 1 }); if (await G.yesNo()) { b.crop = null; G.audio.sfx('select'); } G.closeText(); }]);
  }
  opts.push(['CANCEL', null]);
  return menu([head, sub], opts);
};

// ---- Well, sprinkler, greenhouse, bench -------------------------------------------------------------
G.homeUse.well = async () => { await refill('well'); };
G.homeUse.sprinkler = async b => {
  const n = plotsOn(b.map).filter(p => cheb(p.x, p.y, b) <= perks(b).radius).length;
  await says([`${G.home.L(b).name.toUpperCase()}: it waters every garden plot within ${perks(b).radius} tile${perks(b).radius > 1 ? 's' : ''} each morning.`, `${n} plot${n === 1 ? ' is' : 's are'} in range. Plants there never need the can.`]);
};
G.homeUse.greenhouse = async b => {
  const n = plotsOn(b.map).filter(p => cheb(p.x, p.y, b) <= perks(b).radius).length;
  await says([`GREENHOUSE: warm glass walls. Watered plots within ${perks(b).radius} tiles grow ${1 + (perks(b).boost || 1)} days every day.`, `${n} plot${n === 1 ? ' is' : 's are'} in range right now.`]);
};
async function restOnce(key, n, ok, already, full) {
  if (usedToday(key)) { await says(already); return 0; }
  if (G.state.energy >= energyMax()) { await says(full || 'You feel great already. Maybe later!'); return 0; }
  const got = gain(n); markToday(key); G.audio.sfx('heal');
  await says(`${ok} Energy +${got}.`); return got;
}
G.homeUse.bench = () => restOnce('bench', 10, 'You sit on the bench and watch the clouds drift by.', "You've already had a good sit today. Come back tomorrow.");

// ---- Barn ------------------------------------------------------------------------------------------
const PRODUCE = { Normal: 'Wool / Milk', Bug: 'Honey', Grass: 'Fertilizer', Poison: 'Fertilizer', Fire: 'Coal', Rock: 'Stone', Ground: 'Stone', Steel: 'Stone / Iron Ore', Electric: 'Copper Ore', Water: 'Clay / Pearl', Fairy: 'Fiber / Crystal', Psychic: 'Fiber / Crystal' };
const typeOf = c => G.SPECIES[c.id].types[0];
function produceOne(c) {
  const r = G.farm.rand;
  switch (typeOf(c)) {
    case 'Normal': return r() < .5 ? 'Wool' : 'Milk';
    case 'Bug': return 'Honey';
    case 'Grass': case 'Poison': return 'Fertilizer';
    case 'Fire': return 'Coal';
    case 'Rock': case 'Ground': return 'Stone';
    case 'Steel': return r() < .3 ? 'Iron Ore' : 'Stone';
    case 'Electric': return 'Copper Ore';
    case 'Water': return r() < .15 ? 'Pearl' : 'Clay';
    case 'Fairy': case 'Psychic': return r() < .2 ? 'Crystal Shard' : 'Fiber';
    default: return 'Fiber';
  }
}
// Every barn makes its day's produce (called by newDay with the day that is ending). Returns the item count.
function barnProduce(day) {
  let total = 0;
  for (const b of st().builds.filter(x => x.type === 'barn')) {
    b.animals = b.animals || []; b.store = b.store || {};
    if (b.day === day) continue;
    const per = perks(b), bonus = per.feedBonus && b.fed === day ? 1 : 0;
    for (const c of b.animals) for (let k = 0; k < (per.output || 1) + bonus; k++) { const it = produceOne(c); b.store[it] = (b.store[it] || 0) + 1; total++; }
    b.day = day; delete b.fed;
  }
  return total;
}
G.homeBlockRemove.barn = b => (b.animals || []).length ? 'Creatures still live in the barn. Take them back first.' : null;
const storeCount = b => Object.values(b.store || {}).reduce((a, n) => a + n, 0);
async function barnAdd(b) {
  const S = st();
  const src = await G.choose(['FROM YOUR PARTY', 'FROM THE PC BOX', 'CANCEL'], { right: 236, bottom: 108 });
  if (src === 0) {
    const i = await G.partyScreen({ mode: 'use' }); if (i < 0) return;
    if (S.party.filter((x, k) => k !== i && x.hp > 0).length < 1) { await says('You need at least one other healthy creature with you.'); return; }
    const [c] = S.party.splice(i, 1); b.animals.push(c);
    G.audio.sfx('select'); await says(`${G.name(c)} moved into the barn. It will make ${PRODUCE[typeOf(c)] || 'Fiber'} every day.`);
  } else if (src === 1) {
    if (!S.box.length) { await says('There are no creatures in the PC box.'); return; }
    await list({ title: 'MOVE IN FROM THE BOX', rows: () => S.box.map(c => ({ icon: c.id, text: `${G.name(c)}  Lv${c.lvl}`, right: PRODUCE[typeOf(c)] || 'Fiber', desc: `${typeOf(c)} type. Makes ${PRODUCE[typeOf(c)] || 'Fiber'} every day.` })),
      act: async i => { const [c] = S.box.splice(i, 1); b.animals.push(c); G.audio.sfx('select'); await says(`${G.name(c)} moved into the barn.`); return 'close'; } });
  }
}
G.homeUse.barn = async function (b) {
  const S = st(), per = perks(b); b.animals = b.animals || []; b.store = b.store || {};
  await list({ title: `${G.home.L(b).name.toUpperCase()}`, right: () => `${b.animals.length}/${per.slots} creatures`,
    rows: () => {
      const rows = [], n = storeCount(b);
      if (n) rows.push({ id: 'collect', text: `COLLECT ${n} ITEM${n > 1 ? 'S' : ''}`, col: '#2a7a4a', desc: Object.entries(b.store).map(([k, v]) => `${v} ${k}`).join(', ') });
      if (b.animals.length < per.slots) rows.push({ id: 'add', text: 'MOVE A CREATURE IN', desc: 'Creatures that live here make materials every day, by their first type.' });
      if (per.feedBonus) rows.push({ id: 'feed', text: b.fed === S.day ? 'FED TODAY' : 'FEED FERTILIZER', dim: b.fed === S.day, right: `x${inv.count('Fertilizer')}`, desc: 'Feed 1 Fertilizer: every creature makes 1 extra item tomorrow morning.' });
      b.animals.forEach((c, i) => rows.push({ id: 'take', i, icon: c.id, text: `${G.name(c)}  Lv${c.lvl}`, right: PRODUCE[typeOf(c)] || 'Fiber', desc: `Makes ${per.output} ${PRODUCE[typeOf(c)] || 'Fiber'} a day. Press A to take it back.` }));
      return rows;
    },
    empty: 'The barn is empty.',
    act: async (i, r) => {
      if (r.id === 'collect') {
        const got = Object.entries(b.store); for (const [k, v] of got) inv.give(k, v); b.store = {};
        G.audio.sfx('levelup'); await says(`You collected ${got.map(([k, v]) => `${v} ${k}`).join(', ')}.`);
      } else if (r.id === 'add') await barnAdd(b);
      else if (r.id === 'feed') {
        if (b.fed === S.day) { await says('They have already eaten today.'); return; }
        if (!inv.take('Fertilizer', 1)) { await says('You have no Fertilizer to feed them.'); return; }
        b.fed = S.day; G.audio.sfx('heal'); await says('The creatures munch happily. They will make extra tomorrow.');
      } else if (r.id === 'take') {
        const [c] = b.animals.splice(r.i, 1); G.healFull(c);
        if (S.party.length < 6) S.party.push(c); else S.box.push(c);
        G.audio.sfx('select'); await says(`${G.name(c)} came back to you${S.party.includes(c) ? '' : ' (your party was full, so it went to the PC)'}.`);
      }
    } });
};

// ---- Eating ------------------------------------------------------------------------------------------
async function eat(item) {
  const it = G.ITEMS[item], S = st();
  if (!it || !it.energy) { await says("You can't eat that."); return false; }
  if (S.energy >= energyMax()) { await says("You're not hungry right now."); return false; }
  if (!inv.take(item, 1)) return false;
  const got = gain(it.energy); G.audio.sfx('heal');
  await G.say(`You ate the ${item}. Energy +${got} (${S.energy}/${energyMax()}).`);
  return true;
}

// ---- Drawing: crops on plots ------------------------------------------------------------------------
function fallbackSoil(ctx, x, y, wet) {
  ctx.fillStyle = wet ? '#5a3a24' : '#8a5e3a'; K.rr(ctx, x + 1, y + 1, 14, 14, 3); ctx.fill();
  ctx.fillStyle = wet ? 'rgba(20,10,0,.25)' : 'rgba(60,30,10,.25)'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 3, y + 4 + i * 4, 10, 1);
}
function fallbackCrop(ctx, id, s, x, y, t, info) {
  const d = CROPS[id] || CROPS.turnip, cx = x + 8, by = y + 13;
  const leaf = info.withered ? '#9a7a4a' : '#4caa3a', leaf2 = info.withered ? '#7a5a34' : '#2e8a2a';
  if (s === 0) { ctx.fillStyle = '#3a2414'; [[-3, 0], [0, -2], [3, 0]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx, by - 3 + dy, 1, 0, 7); ctx.fill(); }); return; }
  const h = s === 1 ? 4 : s === 2 ? 8 : 10, sway = Math.sin(t / 30 + x) * (info.withered ? 0 : .6);
  ctx.strokeStyle = leaf2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx + sway, by - h); ctx.stroke();
  ctx.fillStyle = leaf;
  for (let k = 0; k < s + 1; k++) { const yy = by - 2 - k * (h / (s + 1)), side = k % 2 ? 1 : -1; ctx.beginPath(); ctx.ellipse(cx + side * 2.6 + sway, yy, 2.6, 1.3, side * .5, 0, 7); ctx.fill(); }
  if (s === 3 && !info.withered) {
    ctx.fillStyle = d.col;
    if (d.grain) { for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(cx + k * 3 + sway, by - h, 1.4, 3, 0, 0, 7); ctx.fill(); } }
    else if (id === 'glowcap') { K.drawGlow(ctx, '#7ff0de', cx, by - 7, 7, .5 + Math.sin(t / 15) * .2); ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(cx, by - 8, 4, 2.6, 0, Math.PI, 0); ctx.fill(); }
    else { const r = id === 'pumpkin' || id === 'starmelon' ? 4 : 2.6; ctx.beginPath(); ctx.arc(cx + 2, by - r + .5, r, 0, 7); ctx.fill(); if (d.top) { ctx.fillStyle = d.top; ctx.beginPath(); ctx.arc(cx + 2, by - r - 1, r * .7, Math.PI, 0); ctx.fill(); } }
    if ((t >> 3) % 12 === (x >> 4) % 12) K.star(ctx, cx + 5, by - h - 2, 2, '#fff8c0');
  }
}
G.hooks.draw.push((items, cx, cy, t) => {
  const S = G.state; if (!S || !S.builds) return; const m = G.world.map;
  for (const b of S.builds) {
    if (b.type !== 'plot' || b.map !== m.id) continue;
    const x = b.x * 16 - cx, y = b.y * 16 - cy; if (x < -16 || y < -32 || x > G.W + 16 || y > G.H + 16) continue;
    const c = b.crop, wet = !!(c && (c.wet || (CROPS[c.id] && CROPS[c.id].noWater)));
    items.push({ y: (b.y + 1) * 16 - .45, draw: ctx => {
      // the plot structure art already draws its own soil (by level); soil is only needed without it
      if (!(G.homeArt && G.homeArt.structure)) { if (G.homeArt && G.homeArt.soil) G.homeArt.soil(ctx, x, y, t, { wet }); else fallbackSoil(ctx, x, y, wet); }
      if (!c) return;
      const s = c.dead ? 2 : stage(c), info = { wet, withered: !!c.dead };
      if (G.homeArt && G.homeArt.crop) G.homeArt.crop(ctx, c.id, s, x, y, t, info); else fallbackCrop(ctx, c.id, s, x, y, t, info);
    } });
  }
});

// ---- HUD and floating text ------------------------------------------------------------------------------
const homeMap = id => id === 'homestead' || /^home\d$/.test(id);
G.hooks.overlay.push((ctx, cx, cy, t) => {
  const S = G.state; if (!S || !S.flags) return;
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t++;
    if (f.t > 60 || f.map !== G.world.mapId) { fx.splice(i, 1); continue; }
    if (f.t < 0) continue;
    const k = f.t / 60, x = f.x - cx, y = f.y - cy - 4 - k * 14;
    ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
    if (f.sparkle) for (let s = 0; s < 4; s++) { const a = s * 1.57 + f.t / 9, r = 5 + f.t / 4; K.star(ctx, x + Math.cos(a) * r, y + 6 + Math.sin(a) * r * .6, 1.8 * (1 - k), '#fff3a0'); }
    G.text(ctx, f.text, x, y - 4, { align: 'center', font: G.FONT_S, color: f.col, shadow: 'rgba(30,20,50,.85)' });
    ctx.globalAlpha = 1;
  }
  if (!S.flags.starter || !G.world.map) return;
  if (!homeMap(G.world.mapId) && G.frameNo > showUntil) return;
  st();
  const max = energyMax(), r = Math.max(0, Math.min(1, S.energy / max)), w = 82, x = G.W - w - 4, y = G.audio.muted ? 12 : 4;
  ctx.fillStyle = 'rgba(30,20,50,.55)'; K.rr(ctx, x, y, w, 12, 6); ctx.fill();
  // sun with a ring that fills as the day goes by
  const sx = x + 7, sy = y + 6, day = S.clock / DAY_FRAMES;
  ctx.fillStyle = day > .8 ? '#ff9a4a' : '#ffd23a'; ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, 4.2, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#ffe680'; ctx.beginPath(); ctx.arc(sx, sy, 4.2, -Math.PI / 2, -Math.PI / 2 + day * Math.PI * 2); ctx.stroke();
  G.text(ctx, `DAY ${S.day}`, x + 13, y + 3, { font: G.FONT_S, color: '#fff', shadow: false });
  const bx = x + 44, bw = 34, col = r > .5 ? '#5ad46a' : r > .2 ? '#ffc43a' : '#ff5a4e';
  ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(bx - 3, y + 2.5); ctx.lineTo(bx - 5.5, y + 6.5); ctx.lineTo(bx - 3.6, y + 6.5); ctx.lineTo(bx - 4.6, y + 9.5); ctx.lineTo(bx - 1.6, y + 5.2); ctx.lineTo(bx - 3.4, y + 5.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.4)'; K.rr(ctx, bx, y + 3.5, bw, 5, 2.5); ctx.fill();
  if (r > 0) { ctx.fillStyle = col; K.rr(ctx, bx, y + 3.5, Math.max(3, bw * r), 5, 2.5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 1.5, y + 4.2, Math.max(0, bw * r - 3), 1); }
  const cap = canCap();
  if (cap && homeMap(G.world.mapId)) {
    const y2 = y + 14; ctx.fillStyle = 'rgba(30,20,50,.55)'; K.rr(ctx, G.W - 34, y2, 30, 10, 5); ctx.fill();
    ctx.fillStyle = '#7cc8ff'; ctx.beginPath(); ctx.moveTo(G.W - 28, y2 + 2); ctx.quadraticCurveTo(G.W - 24.5, y2 + 6, G.W - 28, y2 + 8.2); ctx.quadraticCurveTo(G.W - 31.5, y2 + 6, G.W - 28, y2 + 2); ctx.fill();
    G.text(ctx, `${S.can}/${cap}`, G.W - 7, y2 + 2, { align: 'right', font: G.FONT_S, color: '#fff', shadow: false });
  }
});

G.farm = { DAY_FRAMES, TIRED, CROPS, SEED_CROP, rand: Math.random, ensure: st, energyMax, useEnergy, gain, eat, newDay, sleep, morningLines, canCap, refill, pop, flash,
  usedToday, markToday, restOnce, plant, waterAt, harvest: b => harvest(b), water: b => water(b), stage, daysLeft, needsWater: b => needsWater(b, b.crop), sprinkled, greenBoost, harvestYield,
  barnProduce, produceOne, PRODUCE, plural };
})();
