// Player building: a Base you can enter, Healing Stations, Nurseries and decorations, placed on open ground.
// Builds live in G.state.builds and are stamped onto the map's tiles whenever a map is loaded or changed.
(function () {
const G = globalThis.G;
const { maps, interior, set, scatter, warp, UP, DOWN, LEFT, RIGHT } = G.mk;

G.STRUCTURES = {
  station: { name: 'Healing Station', cost: 800, tiles: ['HH', 'JJ'], desc: 'Heals your whole team for free, any time.' },
  nursery: { name: 'Nursery', cost: 1200, tiles: ['KKK', 'KKK'], desc: 'Leave a creature here. It gains EXP as you walk around.' },
  base: { name: 'Base', cost: 2500, tiles: ['AAAAA', 'AAAAA', 'WNDNW'], door: [2, 2], unique: true, desc: 'Your own house, with a bed to rest in and a PC.' },
  lamp: { name: 'Lamp Post', cost: 60, tiles: ['l'], desc: 'A warm light for your camp.' },
  flowers: { name: 'Flower Bed', cost: 40, tiles: ['f'], desc: 'Pretty flowers you can walk through.' },
  bush: { name: 'Bush', cost: 50, tiles: ['u'], desc: 'A round green bush.' },
  pine: { name: 'Pine Tree', cost: 90, tiles: ['n'], desc: 'A tall pine tree.' },
  fence: { name: 'Fence', cost: 20, tiles: ['F'], desc: 'One section of wooden fence.' },
};
const BUILDABLE = { g: 1, y: 1 };
const ORDER = ['station', 'nursery', 'base', 'lamp', 'flowers', 'bush', 'pine', 'fence'];
const NURSERY_EXP_PER_STEP = 4, NURSERY_MAX_LEVEL = 60;

// ---- Your Base (interior) -----------------------------------------------------
(function () {
  const m = interior('base', 'YOUR BASE', 10, 8, 5);
  set(m, 1, 1, 'b'); set(m, 8, 1, 'P'); scatter(m, 'S', [[4, 1], [5, 1]]); set(m, 7, 4, 't'); scatter(m, 'a', [[4, 4], [5, 4], [4, 5], [5, 5]]); set(m, 1, 5, 'x');
  m.objs.push({ x: 1, y: 1, fn: () => rest() }, { x: 8, y: 1, fn: () => G.pcMenu() });
  m.objs.push({ x: 4, y: 1, fn: () => trophies() }, { x: 5, y: 1, fn: () => trophies() });
  warp(m, 5, 7, 'lanternrest', 28, 26, DOWN);   // destination is moved to the real door by applyBuilds
})();
async function rest() {
  const say = G.worldApi.says;
  await G.fadeTo(1, 16, '#000'); G.state.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(40); await G.fadeTo(0, 16);
  await say('You took a nap in your own bed. Your whole team is fully rested!');
}
async function trophies() {
  const f = G.state.flags, n = ['meadow', 'marsh', 'mine'].filter(k => f['shard_' + k]).length;
  const caught = Object.values(G.state.dex).filter(v => v > 1).length;
  await G.worldApi.says([`Your trophy shelf: ${n} of 3 Ember Shards earned, ${caught} creatures caught.`, f.jokerCaught ? 'A card with a grinning jester sits in pride of place.' : 'There is an empty spot in the middle... for something special.']);
}

// ---- Stamping builds onto maps ----------------------------------------------------
function footprint(type) { const t = G.STRUCTURES[type].tiles; return { w: t[0].length, h: t.length }; }
function stamp(m, b) {
  const def = G.STRUCTURES[b.type];
  def.tiles.forEach((row, j) => [...row].forEach((ch, i) => set(m, b.x + i, b.y + j, ch)));
  const { w, h } = footprint(b.type);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = b.x + i, y = b.y + j;
    if (def.door && i === def.door[0] && j === def.door[1]) { m.warps.push({ _b: true, x, y, to: 'base', tx: 5, ty: 6, dir: UP }); continue; }
    m.objs.push({ _b: true, x, y, build: b, nursery: b.type === 'nursery' ? b : null, fn: () => useBuild(b) });
  }
}
G.applyBuilds = function (m) {
  if (!G.state) return;
  const builds = G.state.builds = G.state.builds || [];
  if (!m.orig) m.orig = m.t.map(r => r.slice());
  m.t = m.orig.map(r => r.slice());
  m.objs = m.objs.filter(o => !o._b); m.warps = m.warps.filter(w => !w._b);
  for (const b of builds) if (b.map === m.id) stamp(m, b);
  m.rev = (m.rev || 0) + 1;
  const base = builds.find(b => b.type === 'base'), exit = maps.base.warps[0];
  if (base) Object.assign(exit, { to: base.map, tx: base.x + 2, ty: base.y + 3, dir: DOWN });
  if (m.roamers) m.roamers = m.roamers.filter(r => !G.TILES[m.t[r.y][r.x]].solid);
};

// ---- Placement --------------------------------------------------------------
function canPlace(type, x, y) {
  const W = G.worldApi, m = G.world.map, { w, h } = footprint(type), p = G.world.p, f = G.world.f;
  if (!m.outdoor) return false;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const tx = x + i, ty = y + j, ch = W.tileAt(tx, ty);
    if (!ch || !BUILDABLE[ch] || W.tileWarp(tx, ty) || W.npcAt(tx, ty) || W.objAt(tx, ty) || W.roamAt(tx, ty)) return false;
    if ((tx === p.x && ty === p.y) || (tx === f.x && ty === f.y)) return false;
    if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) return false;
  }
  const def = G.STRUCTURES[type];
  if (def.door) { const dx = x + def.door[0], dy = y + h; if (!W.canWalk(dx, dy, true) || W.tileWarp(dx, dy)) return false; }
  return true;
}
async function place(type) {
  const { w, h } = footprint(type), p = G.world.p, V = G.worldApi.VEC;
  const ax = p.x + V[p.dir][0], ay = p.y + V[p.dir][1];
  let x = [ax - (w >> 1), ax - (w >> 1), ax - w + 1, ax][p.dir], y = [ay, ay - h + 1, ay - (h >> 1), ay - (h >> 1)][p.dir];
  const def = G.STRUCTURES[type];
  const layer = { draw(ctx) {
    const cam = G.world.cam || { cx: 0, cy: 0 }, ok = canPlace(type, x, y), pulse = .35 + Math.sin(G.frameNo / 8) * .1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const sx = (x + i) * 16 - cam.cx, sy = (y + j) * 16 - cam.cy;
      ctx.fillStyle = ok ? `rgba(90,220,140,${pulse})` : `rgba(240,80,80,${pulse})`; ctx.fillRect(sx + .5, sy + .5, 15, 15);
      ctx.strokeStyle = ok ? '#2a9a5a' : '#b83030'; ctx.lineWidth = .6; ctx.strokeRect(sx + .5, sy + .5, 15, 15);
    }
    G.frame(ctx, 2, 2, 236, 22, 'light');
    G.text(ctx, `${def.name}  $${def.cost}`, 10, 8); G.text(ctx, ok ? 'A: build   B: cancel' : 'Can\'t build here', 230, 8, { align: 'right', color: ok ? '#2a7a4a' : '#b83030' });
  } };
  G.ui.layers.push(layer);
  let res = null;
  for (;;) {
    await G.nextFrame(); const k = G.input.pressed;
    if (k.up) y--; if (k.down) y++; if (k.left) x--; if (k.right) x++;
    x = Math.max(p.x - 8, Math.min(p.x + 8, x)); y = Math.max(p.y - 6, Math.min(p.y + 6, y));
    if (k.b) break;
    if (k.a) { if (canPlace(type, x, y)) { res = { x, y }; break; } G.audio.sfx('bump'); }
  }
  G.ui.layers.splice(G.ui.layers.indexOf(layer), 1);
  return res;
}
G.buildMenu = async function () {
  const S = G.state, say = G.worldApi.says, m = G.world.map;
  if (!m.outdoor) { await say('You can only build outdoors, on open grass or sand.'); return; }
  const money = { draw(ctx) { G.frame(ctx, 150, 4, 88, 20, 'light'); G.text(ctx, '$' + S.money, 232, 10, { align: 'right' }); } };
  G.ui.layers.push(money);
  for (;;) {
    const i = await G.choose(ORDER.map(k => `${G.STRUCTURES[k].name}  $${G.STRUCTURES[k].cost}`), { x: 4, y: 4, rowH: 13, onMove: i => { G.ui.text = { lines: G.wrap(G.STRUCTURES[ORDER[i]].desc, 212).slice(0, 2), shown: 999, arrow: false, style: 'light' }; } });
    G.closeText();
    if (i < 0) break;
    const type = ORDER[i], def = G.STRUCTURES[type];
    if (def.unique && (S.builds || []).some(b => b.type === type)) { await say(`You already have a ${def.name}. Demolish it first to build a new one.`); continue; }
    if (S.money < def.cost) { await say(`You need $${def.cost} to build a ${def.name}.`); continue; }
    G.ui.layers.splice(G.ui.layers.indexOf(money), 1);
    const spot = await place(type);
    G.ui.layers.push(money);
    if (!spot) continue;
    S.money -= def.cost;
    S.builds = S.builds || [];
    S.builds.push({ id: Date.now().toString(36) + G.rand(1e6).toString(36), type, map: m.id, x: spot.x, y: spot.y });
    G.applyBuilds(m); G.audio.sfx('levelup');
    await say(`You built a ${def.name}!`);
    break;
  }
  G.ui.layers.splice(G.ui.layers.indexOf(money), 1);
  G.closeText();
};

// ---- Using what you built ---------------------------------------------------
async function demolish(b) {
  const def = G.STRUCTURES[b.type], refund = Math.floor(def.cost / 2), say = G.worldApi.says;
  if (b.pet) { await say(`${G.name(b.pet)} is still playing in here. Take it back first.`); return false; }
  await G.say(`Take down this ${def.name}? You get $${refund} back.`, { auto: 1 });
  if (!(await G.yesNo())) { G.closeText(); return false; }
  G.state.builds.splice(G.state.builds.indexOf(b), 1); G.state.money += refund; G.applyBuilds(G.world.map); G.audio.sfx('buy');
  await say(`The ${def.name} was taken down. You got $${refund}.`); return true;
}
async function useBuild(b) {
  const say = G.worldApi.says, def = G.STRUCTURES[b.type];
  if (b.type === 'station') {
    const c = await G.choose(['HEAL TEAM', 'DEMOLISH', 'CANCEL'], { right: 236, bottom: 108 });
    if (c === 0) { await G.fadeTo(.8, 10, '#ffffff'); G.state.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(40); await G.fadeTo(0, 10); await say('Your team is fully healed!'); }
    else if (c === 1) await demolish(b);
    return;
  }
  if (b.type === 'nursery') return nursery(b);
  if (b.type === 'base') { const c = await G.choose(['DEMOLISH', 'CANCEL'], { right: 236, bottom: 108 }); if (c === 0) await demolish(b); return; }
  const c = await G.choose([`REMOVE ${def.name.toUpperCase()}`, 'CANCEL'], { right: 236, bottom: 108 });
  if (c === 0) await demolish(b);
}
G.nurseryGain = b => b.pet ? Math.max(0, ((G.state.steps || 0) - b.steps0) * NURSERY_EXP_PER_STEP) : 0;
async function nursery(b) {
  const S = G.state, say = G.worldApi.says;
  if (!b.pet) {
    const c = await G.choose(['LEAVE A CREATURE', 'DEMOLISH', 'CANCEL'], { right: 236, bottom: 108 });
    if (c === 1) { await demolish(b); return; }
    if (c !== 0) return;
    if (S.party.length < 2) { await say("You can't leave your only creature behind!"); return; }
    const i = await G.partyScreen({ mode: 'use' });
    if (i < 0) return;
    if (S.party.filter((c, k) => k !== i && c.hp > 0).length < 1) { await say('You need at least one other healthy creature with you.'); return; }
    const [pet] = S.party.splice(i, 1); b.pet = pet; b.steps0 = S.steps || 0; G.audio.sfx('select');
    await say(`You left ${G.name(pet)} at the nursery. It will grow while you are out exploring.`);
    return;
  }
  const gain = G.nurseryGain(b);
  await G.say(`${G.name(b.pet)} is playing happily. It has earned about ${gain} EXP so far.`, { auto: 1 });
  const c = await G.choose(['TAKE IT BACK', 'LEAVE IT', 'DEMOLISH'], { right: 236, bottom: 108 });
  if (c === 2) { G.closeText(); await demolish(b); return; }
  if (c !== 0) { G.closeText(); return; }
  const pet = b.pet, lvl0 = pet.lvl, learned = [];
  pet.exp += gain;
  while (pet.lvl < NURSERY_MAX_LEVEL && pet.exp >= G.expFor(pet.lvl + 1)) {
    G.levelUp(pet);
    for (const mv of G.movesAt(pet, pet.lvl)) if (!pet.moves.some(m => m.id === mv) && pet.moves.length < 4) { pet.moves.push({ id: mv, pp: G.MOVES[mv].pp }); learned.push(mv); }
    const evo = G.SPECIES[pet.id].evo; if (evo && pet.lvl >= evo[0]) pet.evolveReady = true;
  }
  if (pet.lvl >= NURSERY_MAX_LEVEL) pet.exp = Math.min(pet.exp, G.expFor(NURSERY_MAX_LEVEL));
  G.healFull(pet); b.pet = null; delete b.steps0;
  if (S.party.length < 6) S.party.push(pet); else S.box.push(pet);
  const lines = [`${G.name(pet)} came running back to you!`];
  if (pet.lvl > lvl0) lines.push(`It grew from Lv${lvl0} to Lv${pet.lvl}!`);
  if (learned.length) lines.push(`It learned ${learned.join(', ')}.`);
  if (S.party[S.party.length - 1] !== pet) lines.push('Your party was full, so it was sent to the PC.');
  G.audio.sfx('levelup'); await say(lines);
  if (S.party.some(c => c.evolveReady)) { await G.fadeTo(1, 12, '#000'); await G.runEvolutions(); G.audio.music(G.world.map.music); await G.fadeTo(0, 14); }
}

G.buildApi = { canPlace, footprint };

// Draw nursery residents playing inside their pens.
G.world.extraDraw = function (items, cx, cy, t) {
  for (const b of G.state.builds || []) {
    if (b.type !== 'nursery' || !b.pet || b.map !== G.world.mapId) continue;
    const span = 40, ph = (t / 90 + b.x) % 2, k = ph < 1 ? ph : 2 - ph;   // wander back and forth across the pen
    const x = b.x * 16 + 8 + k * span - 8 - cx, y = b.y * 16 + 6 - cy, hop = Math.abs(Math.sin(t / 7)) * 2;
    items.push({ y: b.y * 16 + 32.5, draw: c => G.drawCreatureMini(c, b.pet.id, x, y, 18, t, true, hop) });
  }
};
})();
