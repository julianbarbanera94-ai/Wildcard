// Interiors of the enterable structures: shed, nursery, barn, healing station, refinery, forge, garage, greenhouse.
// One map per build, id 'in_<build id>', made by G.interiorFor(b) when the structure is stamped and kept fresh by
// G.refreshInteriors(). Each interior grows with the structure's level (size and contents come from the level's perks).
// Furniture is map.props (drawn by js/homestead.js with G.homeArt.prop, blocked by applyBuilds) and map.objs; creatures and
// vehicles are drawn by map.dyn(items, cx, cy, t), called every frame by the draw hook at the bottom.
// Objects look the build up by id at call time (G.state.builds.find), never holding on to a stale object.
(function () {
const G = globalThis.G;
const { maps, rect, interior, warp, npc, DOWN, UP, LEFT, RIGHT } = G.mk;
const DEF = G.STRUCTURES;
const idOf = b => 'in_' + b.id;
const find = bid => ((G.state && G.state.builds) || []).find(x => x.id === bid);
const say = l => G.worldApi.says(l);
const S = () => G.state;
const stored = n => ((S().storage) || {})[n] || 0;
const have = n => G.inv.count(n) + stored(n);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// ---- Helpers ------------------------------------------------------------------------------------
const STYLE = {
  hand: { hair: '#6a4a28', skin: '#f0c8a0', shirt: '#4a8a4a', pants: '#6a5a3a', hat: '#d8b860' },
  mech: { hair: '#2a2a30', skin: '#e8b890', shirt: '#e07830', pants: '#3a4a6a', hat: '#e07830' },
  smith: { hair: '#8a3a20', skin: '#e8b890', shirt: '#7a7a8a', pants: '#4a3a30' },
  tech: { hair: '#4a6a8a', skin: '#f8d0a8', shirt: '#e8e0c8', pants: '#5a6a58', hat: '#e8c840' },
};
const style = k => STYLE[k] || G.mk.ST[k];

// The doorstep in front of build b (where the exit mat leads).
function doorstep(b) {
  const d = G.home.door(b);
  if (d) return [d[0], d[1] + 1];
  const { w, h } = G.home.dims(b.type, G.home.lvl(b), b.rot), dc = G.home.L(b).door || [0, h - 1];
  return [b.x + Math.min(dc[0], w - 1), b.y + h];
}
function aim(m, b) {
  const [tx, ty] = doorstep(b), w = m.warps[0];
  if (w && (w.to !== b.map || w.tx !== tx || w.ty !== ty)) Object.assign(w, { to: b.map, tx, ty, dir: DOWN });
}

// A room under construction. R.prop(kind, x, y, w, h, opts): opts { fn, say, prompt, flat, info, cells }.
function room(b, name, w, h, mat, floor) {
  const id = idOf(b), bid = b.id, lvl = G.home.lvl(b), perks = G.home.L(b).perks;
  const m = interior(id, name, w, h, mat);
  Object.assign(m, { build: bid, type: b.type, lvl, props: [], labels: [], block: new Set(), music: 'town', dyn: null });
  rect(m, 1, 1, w - 2, h - 2, floor || 'T');
  warp(m, mat, h - 1, b.map, 0, 0, DOWN);
  const R = {
    m, id, bid, lvl, perks,
    b: () => find(bid),
    floor: (x, y, ww, hh, ch) => rect(m, x, y, ww, hh, ch),
    // call a G.homeUse handler for this build
    use: key => async () => { const bb = find(bid), f = G.homeUse[key]; if (!bb || !f) { await say('Nobody is here right now.'); return; } return f(bb); },
    prop(kind, x, y, ww, hh, o) {
      o = o || {}; ww = ww || 1; hh = hh || 1;
      const p = { x, y, w: ww, h: hh, kind, info: Object.assign({ lvl }, o.info || {}) };
      if (o.flat) p.flat = true;
      m.props.push(p);
      if (!o.flat) for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) m.block.add((x + i) + ',' + (y + j));
      const fn = o.fn || (o.say ? () => say(typeof o.say === 'function' ? o.say() : o.say) : null);
      if (fn) {
        const prompt = o.prompt || cap(kind);
        for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) m.objs.push({ x: x + i, y: y + j, prompt, fn });
      }
      return p;
    },
    windows(list) { for (const [x, ww] of list) R.prop('windowwall', x, 0, ww || 1, 1, { flat: true }); },
    sign(x, text, styleName) { m.labels.push({ x, y: 1, text, style: styleName || 'craft' }); },
    person(x, y, dir, st, talk) { npc(m, x, y, dir, 'boy', null, { style: style(st), still: true, talk }); },
  };
  return R;
}
const stars = (b) => '★'.repeat(G.home.lvl(b));
const SIGN = b => DEF[b.type].name.toUpperCase() + (DEF[b.type].levels.length > 1 ? ' ' + stars(b) : '');

// ---- Wandering creatures (nursery pets, barn animals) -----------------------------------------------
// Smooth deterministic wandering inside an area (tiles); returns the sprite cell's top-left in map px and a facing.
function wander(area, k, t, seed) {
  const s = seed * 1.7 + k * 2.3, a = t / 190 * (1 + .11 * k) + s, c = t / 150 * (1 - .07 * k) + s * 1.9 + 1;
  const fx = .5 + .5 * Math.sin(a), fy = .5 + .5 * Math.sin(c);
  const dx = Math.cos(a) * (1 + .11 * k), dy = Math.cos(c) * (1 - .07 * k) * (area.h > 1 ? 1 : 0);
  const moving = Math.sin(t / 95 + s * 3) > -.35;
  return { x: area.x * 16 + fx * (area.w - 1) * 16, y: area.y * 16 + fy * (area.h - 1) * 16, moving,
    dir: Math.abs(dx * area.w) > Math.abs(dy * area.h) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1) };
}
function drawCreature(items, c, pos, k, t, size) {
  let { x, y } = pos;
  const P = G.world.p, px = P.x * 16 + (P.ox || 0), py = P.y * 16 + (P.oy || 0);   // keep out of the player's way
  const ddx = x - px, ddy = y - py, d = Math.hypot(ddx, ddy);
  if (d < 13) { const f = (13 - d) / Math.max(d, 1); x += ddx * f; y += ddy * f; }
  const hop = pos.moving ? Math.abs(Math.sin(t / 7 + k)) * 2 : 0;
  items.push({ y: y + 15.4, draw: ctx => G.drawCreatureMini(ctx, c.id, x - G.camX, y - G.camY, size, t, pos.moving, hop, { dir: pos.dir }) });
}

// ---- Shed -----------------------------------------------------------------------------------------
function buildShed(b) {
  const lv = G.home.lvl(b), big = lv >= 2;
  const R = room(b, 'STORAGE SHED', big ? 10 : 7, big ? 7 : 6, big ? 4 : 3);
  const store = { fn: R.use('shed'), prompt: 'Open storage' };
  const note = () => `A NOTE ON THE WORKBENCH: "Storage ${G.craft ? G.craft.usedSpace() : 0}/${G.home.storageCap()} items. The shed, the cupboard and the fridge all share it. Add more sheds for more room!"`;
  if (!big) {
    R.windows([[3, 1]]);
    R.prop('rug', 2, 2, 3, 2, { flat: true });
    R.prop('goodsshelf', 1, 1, 2, 1, store); R.prop('ladder', 3, 1, 1, 1, { say: 'A ladder up to the loft. It is stuffed with hay and cobwebs. Nothing up there yet!', prompt: 'Ladder' });
    R.prop('goodsshelf', 4, 1, 2, 1, store);
    R.prop('crates', 1, 2, 1, 1, store); R.prop('workbench', 5, 2, 1, 1, { say: note, prompt: 'Read note' });
    R.prop('sacks', 1, 3, 1, 1, store); R.prop('plant', 1, 4); R.prop('lamp', 5, 4);
  } else {
    R.windows([[6, 1], [3, 1]]);
    R.prop('rug', 3, 3, 4, 2, { flat: true });
    R.prop('goodsshelf', 1, 1, 2, 1, store); R.prop('ladder', 3, 1, 1, 1, { say: 'A ladder up to the loft. It is stuffed with hay and cobwebs. Nothing up there yet!', prompt: 'Ladder' });
    R.prop('goodsshelf', 4, 1, 2, 1, store); R.prop('plant', 6, 1); R.prop('goodsshelf', 7, 1, 2, 1, store);
    R.prop('crates', 1, 2, 1, 1, store); R.prop('sacks', 1, 3, 1, 1, store); R.prop('crates', 1, 4, 1, 1, store); R.prop('lamp', 1, 5);
    R.prop('workbench', 6, 2, 2, 1, { say: note, prompt: 'Read note' });
    R.prop('sacks', 7, 5, 1, 1, store); R.prop('crates', 8, 4, 1, 1, store); R.prop('plant', 8, 5);
  }
  R.sign(big ? 5 : 3, SIGN(b), 'craft');
  return R.m;
}

// ---- Nursery ----------------------------------------------------------------------------------------
function buildNursery(b) {
  const lv = G.home.lvl(b);
  const dims = [[7, 6, 3], [9, 6, 4], [11, 8, 5]][lv - 1];
  const R = room(b, 'NURSERY', dims[0], dims[1], dims[2]);
  const talk = R.use('nursery');
  const toybox = async () => {
    const bb = R.b(); if (!bb) return;
    const pets = bb.pets || [];
    if (!pets.length) { await say('The toy box is full of squeaky toys. Nobody is playing here yet. Ask the caretaker to look after a creature!'); return; }
    const lines = pets.map(p => `${G.name(p.c)} Lv${p.c.lvl}: +${G.nurseryGain(bb, p)} EXP so far (${R.perks.exp} per step, up to Lv${R.perks.cap}).`);
    await say(lines.length > 2 ? [lines.slice(0, 2).join('\n'), lines.slice(2).join('\n')] : lines.length === 2 ? [lines[0], lines[1]] : lines);
  };
  const flav = (t, p) => ({ say: t, prompt: p });
  let area;
  R.prop('toybox', 1, 1, 1, 1, { fn: toybox, prompt: 'Toy box' });
  R.prop('blocks', 2, 1, 1, 1, flav('Alphabet blocks, stacked crooked. Someone spelled "WILD" and ran out of letters.', 'Blocks'));
  if (lv === 1) {
    R.windows([[3, 2]]); R.prop('rug', 2, 2, 3, 2, { flat: true }); R.prop('cradle', 5, 1, 1, 1, flav('A tiny cradle with a patchwork blanket. Someone is dreaming of berries.', 'Cradle'));
    R.prop('plant', 1, 4); R.prop('lamp', 5, 4); R.person(5, 3, LEFT, 'mom', talk);
    area = { x: 2, y: 2, w: 3, h: 2 };
  } else if (lv === 2) {
    R.windows([[3, 2]]); R.prop('rug', 2, 2, 4, 3, { flat: true });
    R.prop('cradle', 4, 1, 1, 1, flav('A tiny cradle with a patchwork blanket. Someone is dreaming of berries.', 'Cradle'));
    R.prop('slide', 6, 1, 2, 2, flav('A bright slide. The creatures take turns climbing up and whooshing down.', 'Slide'));
    R.prop('plant', 1, 4); R.prop('lamp', 7, 4); R.person(7, 3, LEFT, 'mom', talk);
    area = { x: 2, y: 2, w: 4, h: 3 };
  } else {
    R.windows([[5, 1], [3, 1]]); R.prop('rug', 2, 2, 5, 5, { flat: true });
    R.prop('cradle', 4, 1, 1, 1, flav('A tiny cradle with a patchwork blanket. Someone is dreaming of berries.', 'Cradle'));
    R.prop('plant', 5, 1);
    R.prop('slide', 7, 1, 2, 2, flav('A bright slide. The creatures take turns climbing up and whooshing down.', 'Slide'));
    R.prop('ballpit', 8, 4, 2, 2, flav('A pit of soft coloured balls. Splash! Somebody has been buried in it.', 'Ball pit'));
    R.prop('plant', 1, 6); R.prop('lamp', 9, 1); R.prop('painting', 6, 0, 1, 1, { flat: true }); R.person(8, 6, LEFT, 'mom', talk);
    area = { x: 2, y: 2, w: 5, h: 5 };
  }
  R.sign(Math.floor(dims[0] / 2), SIGN(b), 'home');
  R.m.dyn = (items, t) => {
    const bb = R.b(); if (!bb) return;
    (bb.pets || []).forEach((p, k) => drawCreature(items, p.c, wander(area, k, t, p.c.id), k, t, 21));
  };
  return R.m;
}

// ---- Barn -------------------------------------------------------------------------------------------
const PRODUCE = { Normal: 'Wool or Milk', Bug: 'Honey', Grass: 'Fertilizer', Poison: 'Fertilizer', Fire: 'Coal', Rock: 'Stone', Ground: 'Stone', Steel: 'Stone or Iron Ore', Electric: 'Copper Ore', Water: 'Clay or Pearl', Fairy: 'Fiber or Crystal Shards', Psychic: 'Fiber or Crystal Shards' };
const produceOf = c => PRODUCE[G.SPECIES[c.id].types[0]] || 'Fiber';
function buildBarn(b) {
  const lv = G.home.lvl(b);
  const dims = [[9, 7, 4], [13, 8, 6], [15, 10, 7]][lv - 1];
  const R = room(b, 'BARN', dims[0], dims[1], dims[2]);
  const menu = R.use('barn');
  const pens = [];
  const barnMenu = async () => { await menu(); };
  const offer = async () => {
    const i = await G.choose(['OPEN THE BARN MENU', 'NEVER MIND'], { right: 236, bottom: 108, minW: 60 }); G.closeText();
    if (i === 0) await barnMenu();
  };
  const pen = (x, y) => {
    const idx = pens.length; pens.push({ x, y, w: 2, h: 2 });
    R.prop('pen', x, y, 2, 2, { prompt: 'Pen', fn: async () => {
      const bb = R.b(); if (!bb) return;
      const c = (bb.animals || [])[idx];
      if (!c) { await say(idx < R.perks.slots ? 'An empty pen with fresh straw. Move a creature in at the trough!' : 'A spare pen. Upgrade the barn to house more creatures.'); await offer(); return; }
      await say([`${G.name(c)} Lv${c.lvl} lives here. It makes ${R.perks.output} item${R.perks.output > 1 ? 's' : ''} of ${produceOf(c)} a day.`]);
      await offer();
    } });
  };
  const trough = (x, y, w) => R.prop('trough', x, y, w, 1, { fn: barnMenu, prompt: 'Barn menu' });
  const milk = (x, y) => R.prop('milkcan', x, y, 1, 1, { prompt: 'Milk can', fn: async () => {
    const bb = R.b(); if (!bb) return;
    const items = Object.entries(bb.store || {}).filter(([, n]) => n);
    if (!items.length) { await say('The milk can is empty. The creatures make their produce overnight.'); return; }
    await say(`Ready to collect: ${items.map(([k, n]) => `${n} ${k}`).join(', ')}.`); await barnMenu();
  } });
  const hay = (x, y) => R.prop('hay', x, y, 1, 1, { say: 'A fresh bale of hay. It smells like summer.', prompt: 'Hay' });
  const stall = (x, y) => R.prop('stall', x, y, 2, 2, { say: 'A cosy stall with a deep bed of straw.', prompt: 'Stall' });
  const farmhand = (x, y, dir) => R.person(x, y, dir, 'hand', async () => {
    const bb = R.b(); if (!bb) return;
    const n = (bb.animals || []).length;
    await say([n ? `FARMHAND: ${n} happy creature${n > 1 ? 's' : ''} in the barn. They make their produce overnight.` : 'FARMHAND: The barn is quiet. Move a creature in and I will keep an eye on it!',
      'Tell me what you need and I will open the barn book.']);
    await offer();
  });
  if (lv === 1) {
    R.windows([[3, 3]]);
    pen(1, 1); pen(6, 1); trough(3, 1, 3);
    R.prop('rug', 3, 3, 3, 2, { flat: true });
    hay(1, 4); hay(1, 5); milk(7, 4); R.prop('lamp', 7, 5); farmhand(6, 3, LEFT);
  } else if (lv === 2) {
    R.windows([[3, 1], [6, 1], [9, 1]]);
    pen(1, 1); pen(4, 1); pen(7, 1); pen(10, 1);
    hay(3, 1); milk(6, 1); hay(9, 1);
    trough(5, 4, 3); stall(1, 4); stall(10, 4); R.prop('rug', 4, 5, 5, 2, { flat: true });
    farmhand(9, 4, LEFT); R.prop('lamp', 3, 5); R.prop('plant', 8, 6); hay(1, 6); hay(11, 6);
  } else {
    R.windows([[3, 1], [6, 1], [9, 1], [12, 1]]);
    pen(1, 1); pen(4, 1); pen(7, 1); pen(10, 1); pen(1, 5); pen(12, 5);
    hay(3, 1); milk(6, 1); hay(9, 1); milk(13, 1); R.prop('plant', 13, 2);
    stall(3, 5); stall(10, 5); milk(4, 7); trough(6, 6, 3); milk(10, 7);
    R.prop('rug', 5, 7, 5, 2, { flat: true });
    farmhand(11, 8, LEFT); R.prop('lamp', 1, 8); R.prop('lamp', 13, 8); R.prop('plant', 3, 8); R.prop('plant', 12, 8); hay(1, 4); hay(13, 4);
  }
  R.sign(Math.floor(dims[0] / 2), SIGN(b), 'craft');
  R.m.dyn = (items, t) => {
    const bb = R.b(); if (!bb) return;
    (bb.animals || []).forEach((c, k) => {
      const pn = pens[k]; if (!pn) return;
      drawCreature(items, c, wander({ x: pn.x, y: pn.y + .25, w: 1.6, h: 1.3 }, k, t, c.id), k, t, 20);
    });
  };
  return R.m;
}

// ---- Healing station --------------------------------------------------------------------------------
function buildStation(b) {
  const lv = G.home.lvl(b);
  const dims = [[7, 6, 3], [9, 7, 4], [11, 8, 5]][lv - 1];
  const R = room(b, 'HEALING STATION', dims[0], dims[1], dims[2], 'v');
  const heal = R.use('station');
  const left = () => { const bb = R.b(), per = R.perks; if (!bb) return 0; const u = bb.used && bb.used.day === S().day ? bb.used.n : 0; return Math.max(0, per.perDay - u); };
  const healerO = { fn: heal, prompt: 'Heal team' };
  const counter = (x, y, w) => R.prop('counter', x, y, w, 1, { fn: heal, prompt: 'Reception' });
  const nurse = (x, y) => R.person(x, y, DOWN, 'nurse', heal);
  const cabinet = (x, y) => R.prop('medcabinet', x, y, 1, 1, { prompt: 'Cabinet', say: () => R.perks.perDay >= 99 ? 'The cabinet is stocked with crystal tonics. The Spa never runs out.' : `Bandages, tonics and herbs. Heals left today: ${left()} of ${R.perks.perDay}.` });
  const bed = (x, y) => R.prop('medbed', x, y, 1, 2, { prompt: 'Rest', say: 'A freshly made medical bed. You feel sleepy just looking at it.' });
  if (lv === 1) {
    R.windows([[4, 1], [1, 1]]);
    R.prop('rug', 1, 4, 3, 1, { flat: true });
    counter(2, 2, 2); nurse(2, 1); R.prop('healer', 5, 1, 1, 1, healerO);
    R.prop('armchair', 1, 4); R.prop('table', 2, 4); R.prop('plant', 5, 4); R.prop('lamp', 5, 3);
  } else if (lv === 2) {
    R.windows([[2, 1], [5, 2]]);
    counter(2, 2, 3); nurse(3, 1); cabinet(5, 1);
    R.prop('healer', 6, 1, 1, 1, healerO); R.prop('healer', 7, 1, 1, 1, healerO);
    bed(6, 3); bed(7, 3);
    R.prop('rug', 1, 4, 3, 2, { flat: true });
    R.prop('sofa', 1, 5, 2, 1); R.prop('table', 3, 4); R.prop('plant', 1, 4); R.prop('monitor', 1, 3, 1, 1, { prompt: 'Monitor', say: () => `HEAL LOG: ${left()} of ${R.perks.perDay} heals left today. Revives fainted creatures: yes.` });
    R.prop('lamp', 7, 5);
  } else {
    R.windows([[1, 1], [3, 2], [8, 2]]);
    counter(3, 2, 4); nurse(4, 1); cabinet(1, 1); R.prop('monitor', 6, 1, 1, 1, { prompt: 'Monitor', say: 'SPA LOG: unlimited heals, fainted creatures revived, crystal tonic on tap.' });
    R.prop('healer', 7, 1, 1, 1, healerO); R.prop('healer', 8, 1, 1, 1, healerO); R.prop('healer', 9, 1, 1, 1, healerO);
    bed(6, 3); bed(7, 3); bed(8, 3); bed(9, 3);
    R.prop('rug', 1, 4, 4, 3, { flat: true });
    R.prop('sofa', 1, 6, 2, 1); R.prop('armchair', 3, 6); R.prop('table', 2, 4); R.prop('plant', 1, 4); R.prop('plant', 4, 3); R.prop('lamp', 1, 3); R.prop('plant', 9, 6); R.prop('plant', 6, 6);
  }
  R.sign(Math.floor(dims[0] / 2), SIGN(b), 'heal');
  return R.m;
}

// ---- Refinery ---------------------------------------------------------------------------------------
const TANKS = [['Plank', 'Brick', 'Iron Ingot', 'Copper Ingot'], ['Plank', 'Rope'], ['Brick', 'Glass'], ['Iron Ingot', 'Copper Ingot'], ['Flour', 'Cloth']];
function buildRefinery(b) {
  const lv = G.home.lvl(b);
  const dims = [[9, 7, 4], [12, 8, 5], [14, 9, 6]][lv - 1];
  const R = room(b, 'REFINERY', dims[0], dims[1], dims[2]);
  const work = R.use('refinery');
  const live = [], tanks = [];
  const mach = (kind, x, y, w, h, o) => { const p = R.prop(kind, x, y, w, h, Object.assign({ info: { active: false } }, o)); live.push(p); return p; };
  const panel = (x, y, w) => mach('controlpanel', x, y, w, 1, { fn: work, prompt: 'Control panel' });
  const conv = (x, y, w) => mach('conveyor', x, y, w, 1, { fn: work, prompt: 'Conveyor' });
  const kiln = (x, y) => mach('kiln', x, y, 2, 2, { prompt: 'Kiln', say: () => (G.homeActive(R.b()) ? 'The kiln roars. Something is cooking in there!' : 'The kiln is cold and ready. Use the control panel to start a job.') });
  const boiler = (x, y) => mach('boiler', x, y, 2, 2, { prompt: 'Boiler', say: () => (G.homeActive(R.b()) ? 'The boiler hums and the pressure gauge is climbing.' : 'The boiler is resting. Its gauge needle droops.') });
  const tank = (x, y, ti) => { const goods = TANKS[ti]; const p = mach('tank', x, y, 1, 1, { prompt: 'Tank', info: { active: false, fill: 0, goods }, say: () => `TANK: ${goods.map(g => `${g} x${have(g)}`).join(', ')}. (bag + storage)` }); tanks.push(p); };
  const pipe = (x, y) => R.prop('pipe', x, y, 1, 1, { say: 'Warm pipes gurgle along the wall.', prompt: 'Pipe' });
  if (lv === 1) {
    R.windows([[3, 1]]);
    kiln(1, 1); pipe(3, 1); tank(4, 1, 0); pipe(5, 1); boiler(6, 1);
    conv(1, 3, 2); panel(7, 3, 1);
    R.prop('crates', 7, 5, 1, 1, { say: 'Crates of raw materials, waiting for their turn.', prompt: 'Crates' }); R.prop('lamp', 1, 5);
  } else if (lv === 2) {
    R.windows([[4, 2]]);
    kiln(1, 1); pipe(3, 1); tank(4, 1, 1); tank(5, 1, 2); kiln(6, 1); pipe(8, 1); boiler(9, 1);
    conv(1, 3, 2); conv(6, 3, 2); panel(4, 3, 2);
    R.prop('crates', 1, 5, 1, 1, { say: 'Crates of raw materials, waiting for their turn.', prompt: 'Crates' }); R.prop('crates', 10, 5, 1, 1, { say: 'Crates of finished goods.', prompt: 'Crates' });
    R.prop('lamp', 1, 6); R.prop('plant', 10, 6);
  } else {
    R.windows([[7, 3]]);
    kiln(1, 1); pipe(3, 1); kiln(4, 1); pipe(6, 1); tank(7, 1, 1); tank(8, 1, 2); tank(9, 1, 3); pipe(10, 1); boiler(11, 1);
    conv(1, 3, 2); conv(4, 3, 2); panel(7, 3, 3); conv(11, 3, 2);
    kiln(1, 5); boiler(11, 5); tank(4, 5, 4); pipe(3, 5); pipe(5, 5); pipe(10, 5);
    R.prop('crates', 1, 7, 1, 1, { say: 'Crates of raw materials, waiting for their turn.', prompt: 'Crates' }); R.prop('crates', 12, 7, 1, 1, { say: 'Crates of finished goods.', prompt: 'Crates' });
    R.prop('lamp', 2, 7); R.prop('lamp', 11, 7);
  }
  R.sign(Math.floor(dims[0] / 2), SIGN(b), 'craft');
  R.m.dyn = (items, t) => {
    const bb = R.b(); if (!bb) return;
    const on = !!G.homeActive(bb);
    for (const p of live) p.info.active = on;
    if (!(t % 20)) for (const p of tanks) p.info.fill = Math.min(1, p.info.goods.reduce((a, g) => a + have(g), 0) / 40);
  };
  return R.m;
}

// ---- Forge ------------------------------------------------------------------------------------------
function buildForge(b) {
  const lv = G.home.lvl(b);
  const dims = [[7, 6, 3], [10, 7, 4], [12, 8, 5]][lv - 1];
  const R = room(b, 'FORGE', dims[0], dims[1], dims[2]);
  const craft = R.use('forge');
  const live = [];
  const hot = (kind, x, y, w, h, o) => { const p = R.prop(kind, x, y, w, h, Object.assign({ info: { active: false, lit: true } }, o)); live.push(p); return p; };
  const anvil = (x, y) => R.prop('anvil', x, y, 1, 1, { fn: craft, prompt: 'Craft' });
  const bench = (x, y, w) => R.prop('workbench', x, y, w, 1, { fn: craft, prompt: 'Craft' });
  const furnace = (x, y) => hot('furnace', x, y, 2, 2, { prompt: 'Furnace', say: () => (G.homeActive(R.b()) ? 'The furnace roars, white-hot. Sparks fly!' : 'The furnace glows a steady orange. Craft something to stoke it up.') });
  const bellows = (x, y) => hot('bellows', x, y, 1, 1, { prompt: 'Bellows', say: 'You give the bellows a few good pumps. WHOOSH! The coals glow brighter.' });
  const quench = (x, y) => R.prop('quench', x, y, 1, 1, { prompt: 'Quench tub', say: 'A tub of quenching water. A hot blade goes in with a satisfying HISS.' });
  const rack = (x, y, w) => R.prop('toolrack', x, y, w, 1, { prompt: 'Tool rack', fn: async () => {
    const own = ['Axe', 'Pickaxe', 'Watering Can', 'Big Watering Can'].filter(n => G.inv.count(n) > 0);
    await say(own.length ? `On the rack: ${own.join(', ')}. Your tools hang in a neat row.` : 'The rack is bare. Craft an Axe, a Pickaxe or a Watering Can at the bench!');
  } });
  if (lv === 1) {
    R.windows([[3, 1]]);
    rack(1, 1, 2); bench(4, 1, 2); anvil(3, 3);
    R.prop('crates', 1, 3, 1, 1, { say: 'Wood and stone for the next job.', prompt: 'Crates' }); R.prop('lamp', 5, 4); R.prop('plant', 1, 4);
  } else if (lv === 2) {
    R.windows([[8, 1]]);
    furnace(1, 1); bellows(3, 1); rack(4, 1, 2); bench(6, 1, 2); R.prop('plant', 8, 1);
    anvil(4, 3); quench(6, 3); R.prop('rug', 3, 4, 4, 1, { flat: true });
    R.prop('crates', 1, 4, 1, 1, { say: 'Ingots and coal, stacked for the next job.', prompt: 'Crates' }); R.prop('lamp', 8, 5); R.prop('plant', 8, 3);
  } else {
    R.windows([[11, 1]]);
    furnace(1, 1); bellows(3, 1); rack(4, 1, 2); bench(6, 1, 2); bellows(8, 1); furnace(9, 1);
    anvil(3, 3); quench(5, 3); anvil(7, 3); quench(9, 3);
    R.prop('rug', 3, 5, 5, 1, { flat: true });
    R.prop('trophy', 1, 4, 1, 1, { say: 'A trophy for the finest Master Smith in the vale. You, probably.', prompt: 'Trophy' });
    R.prop('crates', 10, 4, 1, 1, { say: 'Ingots and coal, stacked for the next job.', prompt: 'Crates' }); R.prop('lamp', 1, 6); R.prop('lamp', 10, 6); R.prop('plant', 10, 3);
  }
  R.sign(Math.floor(dims[0] / 2), SIGN(b), 'craft');
  R.m.dyn = (items, t) => { const bb = R.b(); if (!bb) return; const on = !!G.homeActive(bb); for (const p of live) p.info.active = on; };
  return R.m;
}

// ---- Garage -----------------------------------------------------------------------------------------
function buildGarage(b) {
  const lv = G.home.lvl(b);
  const dims = [[8, 7, 3], [13, 8, 6], [16, 10, 8]][lv - 1];
  const R = room(b, 'GARAGE', dims[0], dims[1], dims[2]);
  const garage = R.use('garage');
  const bays = [];
  const bay = (x, y) => { bays.push({ x, y }); R.prop('bayline', x, y, 2, 2, { flat: true, info: { n: bays.length } }); };
  const counter = (x, y, w) => R.prop('counter', x, y, w, 1, { fn: garage, prompt: 'Garage' });
  const mech = (x, y, d) => R.person(x, y, d, 'mech', async () => {
    const n = bays.filter((_, i) => occupant(i)).length;
    await say([`MECHANIC: ${n ? `${n} of your vehicles ${n > 1 ? 'are' : 'is'} parked here.` : 'The bays are empty. Craft a Bicycle at a forge, or buy one at Tidewheel Motors!'}`, `Room for ${R.perks.slots}. Want the vehicle menu?`]);
    const i = await G.choose(['VEHICLE MENU', 'NEVER MIND'], { right: 236, bottom: 108, minW: 60 }); G.closeText();
    if (i === 0) await garage();
  });
  const lift = (x, y) => R.prop('vehiclelift', x, y, 2, 2, { say: 'A hydraulic lift. Tune-ups and paint jobs are done at the counter.', prompt: 'Lift' });
  const cart = (x, y) => R.prop('toolcart', x, y, 1, 1, { say: 'A tool cart with every spanner you could dream of.', prompt: 'Tool cart' });
  const tyres = (x, y) => R.prop('tyres', x, y, 1, 1, { say: 'A stack of spare tyres.', prompt: 'Tyres' });
  const barrel = (x, y) => R.prop('oilbarrel', x, y, 1, 1, { say: 'An oil barrel. It smells like hard work.', prompt: 'Oil barrel' });
  const door = (x, w) => R.prop('garagedoor', x, 0, w, 1, { flat: true });
  // which vehicle (if any) is parked in bay i: the i-th land vehicle you own, when it is in the garage
  const land = () => (G.vehicles ? G.vehicles.owned().filter(id => G.VEHICLES[id] && !G.VEHICLES[id].flies && !/boat/.test(id)) : []);
  function occupant(i) {
    if (!G.vehicles || i >= R.perks.slots) return null;
    const id = land()[i]; if (!id) return null;
    return G.vehicles.where(id) === 'garage' ? id : null;
  }
  if (lv === 1) {
    door(2, 3); bay(1, 1); bay(4, 1);
    barrel(3, 1); cart(6, 1); tyres(6, 2); counter(5, 4, 2); mech(4, 4, RIGHT); R.prop('lamp', 1, 4); R.prop('plant', 1, 5);
  } else if (lv === 2) {
    door(2, 3); door(8, 3);
    bay(1, 1); bay(4, 1); bay(7, 1); bay(10, 1);
    barrel(3, 1); cart(6, 1); tyres(9, 1);
    lift(4, 4); lift(7, 4);
    counter(10, 4, 2); mech(10, 5, LEFT);
    tyres(1, 4); tyres(1, 5); R.prop('lamp', 1, 6); R.prop('plant', 11, 6); barrel(2, 6);
  } else {
    door(2, 3); door(8, 3); door(12, 3);
    bay(1, 1); bay(4, 1); bay(7, 1); bay(10, 1); bay(13, 1); bay(1, 4); bay(4, 4);
    barrel(3, 1); cart(6, 1); tyres(9, 1); barrel(12, 1);
    lift(7, 4); lift(10, 4);
    counter(13, 4, 2); mech(13, 5, LEFT);
    cart(1, 7); tyres(2, 7); barrel(14, 7); R.prop('plant', 1, 8); R.prop('plant', 14, 8); R.prop('lamp', 6, 7); R.prop('lamp', 11, 7);
  }
  R.sign(Math.floor(dims[0] / 2), SIGN(b), 'craft');
  const mine = new Set();   // block keys owned by parked vehicles
  R.m.dyn = (items, t) => {
    if (!G.vehicles || !G.homeArt || !G.homeArt.vehicle) return;
    const m = R.m, paint = (S().vehicles && S().vehicles.paint) || {};
    const want = new Set();
    bays.forEach((bp, i) => {
      const id = occupant(i); if (!id) return;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) want.add((bp.x + dx) + ',' + (bp.y + dy));
      const x = bp.x * 16 + 8, y = bp.y * 16 + 4, col = paint[id] || G.VEHICLES[id].color;
      for (const layer of ['back', 'front']) items.push({ y: y + 17 + (layer === 'front' ? .1 : 0), draw: ctx => G.homeArt.vehicle(ctx, id, 0, x - G.camX, y - G.camY, t, { parked: true, color: col, layer }) });
    });
    for (const k of mine) if (!want.has(k)) { m.block.delete(k); mine.delete(k); }
    for (const k of want) if (!m.block.has(k)) { m.block.add(k); mine.add(k); }
  };
  return R.m;
}

// ---- Greenhouse -------------------------------------------------------------------------------------
const GREEN = ['tomato', 'pumpkin', 'pepper', 'carrot', 'starmelon', 'wheat'];
function buildGreenhouse(b) {
  const R = room(b, 'GREENHOUSE', 9, 7, 4, 'v');
  const plots = () => S().builds.filter(x => x.type === 'plot');
  const status = () => {
    const ps = plots(), CR = (G.farm && G.farm.CROPS) || {};
    const planted = ps.filter(p => p.crop && !p.crop.dead), ripe = planted.filter(p => p.crop.ripe);
    const dry = planted.filter(p => !p.crop.ripe && !p.crop.wet && !(CR[p.crop.id] || {}).noWater && !G.home.L(p).perks.selfWater);
    return { n: ps.length, planted: planted.length, ripe: ripe.length, dry: dry.length };
  };
  const refill = async () => { if (!G.farm || !(await G.farm.refill('hose'))) await say('You need a Watering Can to carry water. The General Store sells them, or craft one at a Forge.'); };
  R.windows([[1, 7]]);
  R.prop('trellis', 1, 1, 2, 1, { say: 'Tomato vines climb the trellis, heavy with fruit.', prompt: 'Trellis' });
  R.prop('potting', 3, 1, 2, 1, { prompt: 'Potting table', fn: async () => {
    const s = status();
    if (!s.n) { await say('POTTING TABLE: You have no garden plots yet. Build some outside and plant seeds!'); return; }
    await say([`POTTING TABLE: ${s.n} garden plot${s.n > 1 ? 's' : ''} outside, ${s.planted} planted.`, `${s.ripe} ${s.ripe === 1 ? 'is' : 'are'} ripe, and ${s.dry} ${s.dry === 1 ? 'needs' : 'need'} water.`]);
  } });
  R.prop('hose', 5, 1, 1, 1, { prompt: 'Refill can', fn: refill });
  R.prop('trellis', 6, 1, 2, 1, { say: 'Sweet peas twirl up the trellis.', prompt: 'Trellis' });
  [[1, 3], [1, 4], [6, 3], [6, 4]].forEach(([x, y], i) => R.prop('potbed', x, y, 2, 1, { prompt: 'Plant bed', info: { crop: GREEN[i % GREEN.length], lush: true }, say: 'Lush plants in rich dark soil. The warm glass makes everything grow.' }));
  R.prop('wateringstation', 7, 5, 1, 1, { prompt: 'Refill can', fn: refill });
  R.prop('plant', 1, 5); R.prop('lamp', 3, 5); R.prop('rug', 3, 3, 3, 1, { flat: true });
  R.sign(4, SIGN(b), 'home');
  return R.m;
}

// ---- Registry ---------------------------------------------------------------------------------------
const BUILDERS = { shed: buildShed, nursery: buildNursery, barn: buildBarn, station: buildStation, refinery: buildRefinery, forge: buildForge, garage: buildGarage, greenhouse: buildGreenhouse };
const wants = b => { const d = DEF[b.type]; return !!(d && d.enterable && BUILDERS[b.type] && !d.levels[0].perks.interior); };

// The interior of build b: made if it is missing or built for another level, re-aimed otherwise.
function ensure(b) {
  const id = idOf(b), lv = G.home.lvl(b);
  let m = maps[id];
  if (!m || m.lvl !== lv || m.type !== b.type) {
    const inside = G.world && G.world.mapId === id, old = m;
    m = BUILDERS[b.type](b);
    if (inside && old) {   // the structure grew while you stood in it: keep the player on a free tile
      G.world.map = m;
      const P = G.world.p; if (m.block.has(P.x + ',' + P.y) || P.x >= m.w - 1 || P.y >= m.h - 1) { const [ex, ey] = [m.warps[0].x, m.warps[0].y - 1]; G.placePlayer(ex, ey, UP); }
    }
  }
  aim(m, b);
  return m;
}
G.interiorFor = function (b) {
  if (!b || !wants(b)) return null;
  ensure(b);
  return idOf(b);
};
G.refreshInteriors = function () {
  const st = G.state; if (!st || !st.builds || !G.home || !G.STRUCTURES) return;
  const keep = new Set();
  for (const b of st.builds) if (wants(b)) { ensure(b); keep.add(idOf(b)); }
  for (const id of Object.keys(maps)) if (id.startsWith('in_') && !keep.has(id) && !(G.world && G.world.mapId === id)) delete maps[id];
};

// ---- Per-frame: creatures, vehicles, machine animation ---------------------------------------------------
G.hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map; if (!m || !m.dyn || !m.build) return;
  G.camX = cx; G.camY = cy;
  m.dyn(items, t);
});
})();
