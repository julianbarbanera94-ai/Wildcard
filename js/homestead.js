// The homestead framework: save migration, the structure API used by every system, stamping builds onto maps,
// drawing them, the build menu (placement grid, rotation, repeat placing), upgrades, moving, removing,
// expanding your land, and the nursery and healing-station behaviour. Structure data is in js/structures.js.
(function () {
const G = globalThis.G;
const { maps, UP, DOWN } = G.mk;
const DEF = G.STRUCTURES;
const inv = G.inv;
G.homeUse = G.homeUse || {};          // use id -> async (build) => {}; registered by each system's owner
G.homeBlockRemove = G.homeBlockRemove || {};   // type -> (build) => reason string or null
const HOME = 'homestead';
const BUILDABLE = { g: 1, y: 1 }, HOME_BUILDABLE = { g: 1, y: 1, f: 1 };
const says = (l) => G.worldApi.says(l);

// ---- Save migration -------------------------------------------------------------------------
G.migrateState = function (S) {
  if (!S) return S;
  S.builds = S.builds || []; S.home = S.home || { deed: 1 }; S.day = S.day || 1; S.clock = S.clock || 0;
  if (typeof S.energy !== 'number') S.energy = 100;
  S.storage = S.storage || {}; S.gather = S.gather || {}; S.visited = S.visited || {}; S.recipes = S.recipes || {}; S.can = S.can || 0;
  S.vehicles = Object.assign({ owned: [], riding: null, parked: null, paint: {}, tune: {} }, S.vehicles || {});
  for (const b of S.builds) {
    b.lvl = b.lvl || 1; b.rot = b.rot || 0;
    if (!b.id) b.id = uid();
    if (b.type === 'nursery') { b.pets = b.pets || []; if (b.pet) { b.pets.push({ c: b.pet, steps0: b.steps0 || S.steps || 0 }); delete b.pet; delete b.steps0; } }
  }
  const hm = maps[HOME];
  if (hm && hm.homeSpot && !S.builds.some(b => b.type === 'house')) S.builds.push({ id: 'house', type: 'house', map: HOME, x: hm.homeSpot.x, y: hm.homeSpot.y, lvl: 1, rot: 0 });
  return S;
};
const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
{ const ns = G.newState; G.newState = () => G.migrateState(ns()); }
{ const lg = G.loadGame; G.loadGame = () => G.migrateState(lg()); }

// ---- Structure API ---------------------------------------------------------------------------
const def = b => DEF[b.type];
const lvlOf = b => Math.max(1, Math.min(def(b).levels.length, b.lvl || 1));
const L = b => def(b).levels[lvlOf(b) - 1];
const dims = (type, lvl, rot) => { const l = DEF[type].levels[(lvl || 1) - 1]; return rot ? { w: l.h, h: l.w } : { w: l.w, h: l.h }; };
const all = type => (G.state.builds || []).filter(b => b.map === HOME && (!type || b.type === type));
const shards = () => ['meadow', 'marsh', 'mine'].filter(k => G.state.flags['shard_' + k]).length;
const maxLvl = type => Math.max(0, ...(G.state.builds || []).filter(b => b.type === type).map(lvlOf));
// Requirements -> list of { text, ok }.
function reqList(req) {
  const out = [];
  if (!req) return out;
  if (req.shards) out.push({ text: `${req.shards} Ember Shard${req.shards > 1 ? 's' : ''}`, ok: shards() >= req.shards });
  if (req.lit) out.push({ text: 'The Great Lantern relit', ok: !!G.state.flags.lanternLit });
  if (req.deed) out.push({ text: `Land deed ${req.deed}`, ok: (G.state.home.deed || 1) >= req.deed });
  for (const [t, l] of Object.entries(req.struct || {})) out.push({ text: `${DEF[t].name} Lv${l}`, ok: maxLvl(t) >= l });
  return out;
}
const reqOk = req => reqList(req).every(r => r.ok);
G.home = { def, lvl: lvlOf, L, dims, all, get: type => all(type)[0] || null, maxLvl, reqList, reqOk, shards,
  refresh: () => { if (G.world.map) G.applyBuilds(G.world.map); }, manage: b => manage(b), upgrade: b => upgrade(b), landOffice: () => landOffice(),
  storageCap: () => { const h = G.home.get('house'); return (h ? L(h).perks.storage : 20) + all('shed').reduce((a, b) => a + L(b).perks.storage, 0); } };

// ---- Stamping builds onto a map --------------------------------------------------------------
const cellsOf = b => { const { w, h } = dims(b.type, lvlOf(b), b.rot), out = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([b.x + i, b.y + j, i, j]); return out; };
const doorOf = b => { const d = L(b).door; return d && !b.rot ? [b.x + d[0], b.y + d[1]] : null; };
function interiorEntry(id) { const im = maps[id]; if (!im) return null; const ex = im.warps.find(w => w.to === HOME) || im.warps[0]; return ex ? [ex.x, ex.y - 1] : [1, 1]; }
function stamp(m, b) {
  const d = def(b); if (!d) return;
  if (d.tiles) {   // legacy / tile decorations
    d.tiles.forEach((row, j) => [...row].forEach((ch, i) => G.mk.set(m, b.x + i, b.y + j, ch)));
    const ld = d.legacyDoor;
    d.tiles.forEach((row, j) => [...row].forEach((ch, i) => {
      const x = b.x + i, y = b.y + j;
      if (ld && i === ld[0] && j === ld[1]) { m.warps.push({ _b: true, x, y, to: 'base', tx: 5, ty: 6, dir: UP }); return; }
      m.objs.push({ _b: true, x, y, build: b, prompt: d.name, fn: () => useStructure(b) });
    }));
    return;
  }
  const door = doorOf(b), perks = L(b).perks;
  for (const [x, y] of cellsOf(b)) {
    if (door && x === door[0] && y === door[1] && perks.interior && maps[perks.interior]) {
      const [ex, ey] = interiorEntry(perks.interior);
      m.warps.push({ _b: true, x, y, to: perks.interior, tx: ex, ty: ey, dir: UP }); continue;
    }
    m.block.add(x + ',' + y);
    m.objs.push({ _b: true, x, y, build: b, prompt: () => promptOf(b), fn: () => useStructure(b) });
  }
}
function promptOf(b) {
  const d = def(b);
  if (d.direct && G.homePrompt && G.homePrompt[d.use]) return G.homePrompt[d.use](b);
  return d.useLabel ? titleCase(d.useLabel) : d.name;
}
const titleCase = s => s.charAt(0) + s.slice(1).toLowerCase();
function applyZones(m) {
  if (!m.zones) return;
  const deed = (G.state.home && G.state.home.deed) || 1, own = m.zones.filter(z => z.deed <= deed);
  const owned = (x, y) => own.some(z => x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (!owned(x, y) && 'gGfy'.includes(m.t[y][x]) && !m.warps.some(w => w.x === x && w.y === y)) m.t[y][x] = 'X';
}
G.home.owned = (x, y) => { const m = maps[HOME], deed = G.state.home.deed || 1; return !m.zones || m.zones.some(z => z.deed <= deed && x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h); };
G.applyBuilds = function (m) {
  if (!G.state) return;
  G.migrateState(G.state);
  if (!m.orig) m.orig = m.t.map(r => r.slice());
  m.t = m.orig.map(r => r.slice());
  m.objs = m.objs.filter(o => !o._b); m.warps = m.warps.filter(w => !w._b);
  m.block = new Set();
  for (const p of m.props || []) if (!p.flat) for (let j = 0; j < (p.h || 1); j++) for (let i = 0; i < (p.w || 1); i++) m.block.add((p.x + i) + ',' + (p.y + j));
  if (m.id === HOME) applyZones(m);
  for (const b of G.state.builds) if (b.map === m.id) stamp(m, b);
  m.rev = (m.rev || 0) + 1;
  // interior exits lead back to the right door
  const base = G.state.builds.find(b => b.type === 'base');
  if (base && maps.base) Object.assign(maps.base.warps[0], { to: base.map, tx: base.x + 2, ty: base.y + 3, dir: DOWN });
  const house = G.state.builds.find(b => b.type === 'house');
  if (house) { const dr = doorOf(house) || [house.x + 1, house.y + 2]; for (const l of DEF.house.levels) { const im = maps[l.perks.interior]; if (im) for (const w of im.warps) if (w.to === HOME) Object.assign(w, { tx: dr[0], ty: dr[1] + 1, dir: DOWN }); } }
  if (m.roamers) m.roamers = m.roamers.filter(r => !G.TILES[m.t[r.y][r.x]].solid && !m.block.has(r.x + ',' + r.y));
};

// ---- Drawing ---------------------------------------------------------------------------------
const CAT_COL = { home: '#5fae3f', creature: '#ff8ab0', craft: '#7a8eb8', farm: '#b07a40', vehicle: '#4a9ad8', decor: '#9a9a9a' };
function fallbackStructure(ctx, b, x, y, w, h) {
  const d = def(b), c = CAT_COL[d.cat] || '#999';
  ctx.fillStyle = 'rgba(0,0,0,.18)'; G.kit.rr(ctx, x + 2, y + 3, w * 16, h * 16, 4); ctx.fill();
  ctx.fillStyle = c; G.kit.rr(ctx, x, y - 6, w * 16, h * 16 + 6, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; G.kit.rr(ctx, x + 2, y - 4, w * 16 - 4, 6, 3); ctx.fill();
}
G.hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map; if (!G.state) return;
  for (const b of G.state.builds) {
    if (b.map !== m.id || !def(b) || def(b).tiles) continue;
    const { w, h } = dims(b.type, lvlOf(b), b.rot), x = b.x * 16 - cx, y = b.y * 16 - cy;
    if (x > G.W + 16 || y > G.H + 40 || x + w * 16 < -16 || y + h * 16 < -16) continue;
    const info = { rot: b.rot, door: L(b).door, active: !!(G.homeActive && G.homeActive(b)), build: b };
    items.push({ y: (b.y + h) * 16 - .5, draw: c => (G.homeArt && G.homeArt.structure) ? G.homeArt.structure(c, b.type, lvlOf(b), x, y, w, h, t, info) : fallbackStructure(c, b, x, y, w, h) });
    if (b.type === 'nursery') (b.pets || []).forEach((p, k) => {
      const span = (w - 1) * 16 - 4, ph = (t / 90 + b.x + k * .7) % 2, f = ph < 1 ? ph : 2 - ph;
      const px = x + 4 + f * span - 6, py = y + 2 + (k % 2) * 8, hop = Math.abs(Math.sin(t / 7 + k)) * 2;
      items.push({ y: (b.y + h) * 16 - .2, draw: c => G.drawCreatureMini(c, p.c.id, px, py, 18, t, true, hop) });
    });
  }
  for (const p of m.props || []) {
    const x = p.x * 16 - cx, y = p.y * 16 - cy, w = p.w || 1, h = p.h || 1;
    if (x > G.W + 16 || y > G.H + 40 || x + w * 16 < -16 || y + h * 16 < -16) continue;
    const draw = c => { if (G.homeArt && G.homeArt.prop) G.homeArt.prop(c, p.kind, x, y, w, h, t, p.info || {}); else { c.fillStyle = '#c8a070'; G.kit.rr(c, x + 1, y + 1, w * 16 - 2, h * 16 - 2, 3); c.fill(); } };
    items.push({ y: p.flat ? -1e9 : (p.y + h) * 16 - .6, draw });
  }
});
G.hooks.overlay.push((ctx, cx, cy, t) => {
  const m = G.world.map; if (!G.state) return;
  for (const b of G.state.builds) {
    const d = def(b); if (b.map !== m.id || !d || d.tiles || !d.label) continue;
    const { w } = dims(b.type, lvlOf(b), b.rot), x = (b.x + w / 2) * 16 - cx, y = b.y * 16 - 20 - cy;
    if (x < -60 || x > G.W + 60 || y < -10 || y > G.H + 10) continue;
    const text = (b.type === 'house' ? L(b).name : d.name).toUpperCase() + (d.levels.length > 1 ? ' ' + '★'.repeat(lvlOf(b)) : '');
    G.drawSignPlate(ctx, text, x, y, t, d.style);
  }
});

// ---- Using a structure -----------------------------------------------------------------------
async function useStructure(b) {
  const d = def(b);
  if (d.direct && G.homeUse[d.use]) return G.homeUse[d.use](b);
  const opts = [];
  const handler = d.use && G.homeUse[d.use];
  if (handler) opts.push([d.useLabel || 'USE', () => handler(b)]);
  return manage(b, opts);
}
// The management menu: extra entries first, then UPGRADE / MOVE / ROTATE / REMOVE.
async function manage(b, extra) {
  const d = def(b), opts = (extra || []).slice(), onHome = b.map === HOME;
  if (lvlOf(b) < d.levels.length) opts.push([`UPGRADE TO LV${lvlOf(b) + 1}`, () => upgrade(b)]);
  if (onHome && !d.tiles) opts.push(['MOVE', () => move(b)]);
  else if (d.tiles && d.repeat) opts.push(['MOVE', () => move(b)]);
  if (d.rotatable) opts.push(['ROTATE', () => rotate(b)]);
  if (d.removable !== false) opts.push(['REMOVE', () => remove(b)]);
  opts.push(['CANCEL', null]);
  const title = { draw(ctx) { G.frame(ctx, 4, 4, 150, 20, 'light'); G.text(ctx, `${(b.type === 'house' ? L(b).name : d.name).toUpperCase()}  Lv${lvlOf(b)}/${d.levels.length}`, 12, 10); } };
  G.ui.layers.push(title);
  const i = await G.choose(opts.map(o => o[0]), { right: 236, bottom: 108, minW: 60 });
  G.ui.layers.splice(G.ui.layers.indexOf(title), 1);
  if (i >= 0 && opts[i][1]) await opts[i][1]();
}
G.homeUse.house = async b => { const per = L(b).perks, dr = doorOf(b); if (!maps[per.interior]) { await says('The door is stuck. (This house level has no interior yet.)'); return; } const [ex, ey] = interiorEntry(per.interior); await G.worldApi.warpTo(per.interior, ex, ey, UP); };

// ---- Placement -------------------------------------------------------------------------------
// Can `type` (at level lvl, rotation rot) stand with its top-left at x, y on the current map? ignore = a build being moved.
function canPlace(type, x, y, rot, ignore, lvl) {
  return whyNot(type, x, y, rot, ignore, lvl) === null;
}
function whyNot(type, x, y, rot, ignore, lvl) {
  const W = G.worldApi, m = G.world.map, d = DEF[type], { w, h } = dims(type, lvl || (ignore ? lvlOf(ignore) : 1), rot), p = G.world.p, f = G.world.f;
  if (!m.outdoor) return 'You can only build outdoors.';
  if (d.homestead && m.id !== HOME) return 'This can only be built on your homestead.';
  const mine = new Set(ignore ? cellsOf(Object.assign({}, ignore, { lvl: lvl || lvlOf(ignore), rot: rot === undefined ? ignore.rot : rot })).map(c => c[0] + ',' + c[1]) : []);
  const ignoreCells = new Set(ignore ? cellsOf(ignore).map(c => c[0] + ',' + c[1]) : []);
  void mine;
  const okTile = m.id === HOME ? HOME_BUILDABLE : BUILDABLE;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const tx = x + i, ty = y + j, k = tx + ',' + ty, own = ignoreCells.has(k);
    if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) return 'Too close to the edge.';
    if (m.id === HOME && !G.home.owned(tx, ty)) return 'That land is not yours yet. Expand at the Land Office.';
    const ch = W.tileAt(tx, ty);
    if (!own && (!ch || !okTile[ch])) return 'The ground there is not clear.';
    if (!own && m.block.has(k)) return 'Something is already built there.';
    if ((W.tileWarp(tx, ty) && !own) || W.npcAt(tx, ty) || W.roamAt(tx, ty)) return 'Something is in the way.';
    const o = W.objAt(tx, ty); if (o && o.build !== ignore) return 'Something is in the way.';
    if ((tx === p.x && ty === p.y) || (tx === f.x && ty === f.y)) return 'You are standing there!';
  }
  const ld = d.legacyDoor || (DEF[type].levels[(lvl || 1) - 1].door && !rot ? DEF[type].levels[(lvl || 1) - 1].door : null);
  if (ld) { const dx = x + ld[0], dy = y + h; if (!W.canWalk(dx, dy, true) || W.tileWarp(dx, dy) || (m.block.has(dx + ',' + dy) && !ignoreCells.has(dx + ',' + dy))) return 'The door needs open ground in front of it.'; }
  return null;
}
// Interactive placement. Returns { x, y, rot } or null.
async function place(type, start, ignore) {
  const d = DEF[type], p = G.world.p, V = G.worldApi.VEC;
  let rot = ignore ? ignore.rot : 0, { w, h } = dims(type, ignore ? lvlOf(ignore) : 1, rot);
  const ax = p.x + V[p.dir][0], ay = p.y + V[p.dir][1];
  let x = start ? start.x : [ax - (w >> 1), ax - (w >> 1), ax - w + 1, ax][p.dir], y = start ? start.y : [ay, ay - h + 1, ay - (h >> 1), ay - (h >> 1)][p.dir];
  let tapGo = false;
  const layer = { ghost: { get x() { return x; }, get y() { return y; }, get rot() { return rot; } }, draw(ctx) {
    const cam = G.world.cam || { cx: 0, cy: 0 }, why = whyNot(type, x, y, rot, ignore), ok = !why, pulse = .35 + Math.sin(G.frameNo / 8) * .1;
    const ox = G.uiX || 0, oy = G.uiY || 0;
    ctx.save(); ctx.translate(-ox, -oy);   // menus are centred; the grid and ghost sit on the map
    // placement grid: a dot on every cell you could build on around the ghost
    const m = G.world.map, okT = m.id === HOME ? HOME_BUILDABLE : BUILDABLE;
    for (let j = -6; j <= 6 + h; j++) for (let i = -8; i <= 8 + w; i++) {
      const tx = x + i, ty = y + j; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue;
      const ch = m.t[ty][tx], free = okT[ch] && !m.block.has(tx + ',' + ty) && (m.id !== HOME || G.home.owned(tx, ty));
      if (!free) continue;
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(tx * 16 - cam.cx + 7, ty * 16 - cam.cy + 7, 2, 2);
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const sx = (x + i) * 16 - cam.cx, sy = (y + j) * 16 - cam.cy;
      ctx.fillStyle = ok ? `rgba(90,220,140,${pulse})` : `rgba(240,80,80,${pulse})`; ctx.fillRect(sx + .5, sy + .5, 15, 15);
      ctx.strokeStyle = ok ? '#2a9a5a' : '#b83030'; ctx.lineWidth = .6; ctx.strokeRect(sx + .5, sy + .5, 15, 15);
    }
    const lv = DEF[type].levels[(ignore ? lvlOf(ignore) : 1) - 1], dr = lv.door && !rot ? lv.door : d.legacyDoor;
    if (dr) { const sx = (x + dr[0]) * 16 - cam.cx, sy = (y + h) * 16 - cam.cy; ctx.strokeStyle = ok ? '#2a9a5a' : '#b83030'; ctx.setLineDash([2, 2]); ctx.strokeRect(sx + 2.5, sy + 2.5, 11, 11); ctx.setLineDash([]); }
    // tap a tile to move the ghost there
    G.tapZone(-999, -999, 2400, 2400, (ux, uy) => { const tx = Math.floor((ux + ox + cam.cx) / 16), ty = Math.floor((uy + oy + cam.cy) / 16); if (tx === x && ty === y) tapGo = true; else { x = tx; y = ty; } });
    ctx.restore();
    G.frame(ctx, 2, 2, 236, 30, 'light');
    G.text(ctx, `${d.name}${ignore ? ' (moving)' : '  ' + inv.costText(lv.cost)}`, 10, 7);
    G.text(ctx, ok ? `A: ${ignore ? 'put here' : 'build'}   B: cancel${d.rotatable ? '   C: rotate' : ''}` : why, 10, 18, { color: ok ? '#2a7a4a' : '#b83030', font: G.FONT_S });
  } };
  G.ui.layers.push(layer);
  let res = null;
  for (;;) {
    await G.nextFrame(); const k = G.input.pressed;
    if (k.up) y--; if (k.down) y++; if (k.left) x--; if (k.right) x++;
    if (k.orb && d.rotatable) { rot = rot ? 0 : 1; ({ w, h } = dims(type, ignore ? lvlOf(ignore) : 1, rot)); G.audio.sfx('select'); }
    x = Math.max(p.x - 10, Math.min(p.x + 10, x)); y = Math.max(p.y - 8, Math.min(p.y + 8, y));
    if (k.b) break;
    if (k.a || tapGo) { tapGo = false; if (canPlace(type, x, y, rot, ignore)) { res = { x, y, rot }; break; } G.audio.sfx('bump'); }
  }
  G.ui.layers.splice(G.ui.layers.indexOf(layer), 1);
  return res;
}

// ---- Build menu ------------------------------------------------------------------------------
function costPanelLayer(title, sub, cost, req, unlock) {
  return { draw(ctx) {
    G.frame(ctx, 4, 4, 232, 102, 'light');
    G.text(ctx, title, 12, 9, { font: G.FONT_B || G.FONT });
    if (sub) G.text(ctx, sub, 12, 21, { font: G.FONT_S, color: '#6a5a78' });
    let y = 31;
    if (unlock) { G.wrap(unlock, 210).slice(0, 2).forEach(l => { G.text(ctx, l, 12, y, { font: G.FONT_S, color: '#2a6a3a' }); y += 8; }); y += 2; }
    G.text(ctx, 'COST', 12, y, { font: G.FONT_S, color: '#8a6a40' }); y += 9;
    const entries = Object.entries(cost || {}).filter(([, n]) => n);
    if (!entries.length) G.text(ctx, 'Free', 16, y, { font: G.FONT_S });
    entries.forEach(([k, n], i) => { const have = inv.count(k), ok = have >= n, cx = 16 + (i % 2) * 110, cy = y + Math.floor(i / 2) * 9;
      G.text(ctx, k === 'money' ? `$${n}` : `${n} ${k}`, cx, cy, { font: G.FONT_S, color: ok ? '#3a3a48' : '#c03030', shadow: false });
      G.text(ctx, k === 'money' ? `($${have})` : `(${have})`, cx + 104, cy, { font: G.FONT_S, color: ok ? '#2a8a4a' : '#c03030', align: 'right', shadow: false }); });
    y += Math.ceil(entries.length / 2) * 9 + 2;
    const rl = reqList(req);
    if (rl.length) { G.text(ctx, 'NEEDS', 12, y, { font: G.FONT_S, color: '#8a6a40' }); rl.forEach((r, i) => G.text(ctx, `${r.ok ? '✓' : '✗'} ${r.text}`, 50 + i * 80, y, { font: G.FONT_S, color: r.ok ? '#2a8a4a' : '#c03030', shadow: false })); }
  } };
}
G.home.costPanel = costPanelLayer;
G.buildMenu = async function () {
  const S = G.state, m = G.world.map;
  if (!m.outdoor) { await says('You can only build outdoors, on open grass or sand.'); return; }
  const onHome = m.id === HOME;
  for (;;) {
    const cats = G.BUILD_CATS.filter(([c]) => Object.values(DEF).some(d => d.cat === c && !d.hidden && (onHome || !d.homestead)));
    const ci = await G.choose(cats.map(c => c[1]), { x: 4, y: 4, rowH: 13, minW: 70 });
    if (ci < 0) break;
    const types = Object.values(DEF).filter(d => d.cat === cats[ci][0] && !d.hidden && (onHome || !d.homestead)).map(d => d.id);
    let idx = 0;
    for (;;) {
      const labels = types.map(t => { const d = DEF[t], built = d.unique && S.builds.some(b => b.type === t); return `${d.name}${built ? ' (built)' : ''}`; });
      let panel = null;
      const show = i => { if (panel) G.ui.layers.splice(G.ui.layers.indexOf(panel), 1); const d = DEF[types[i]], l = d.levels[0]; panel = costPanelLayer(d.name.toUpperCase(), `${l.w}x${l.h} tiles${d.levels.length > 1 ? `  ·  ${d.levels.length} levels` : ''}`, l.cost, l.req, d.desc); G.ui.layers.splice(G.ui.layers.length - 1, 0, panel); };
      const i = await G.choose(labels, { x: 4, y: 108, cols: 2, rowH: 12, minW: 100, index: idx, onMove: i => show(i) });
      if (panel) G.ui.layers.splice(G.ui.layers.indexOf(panel), 1);
      if (i < 0) break;
      idx = i;
      const type = types[i], d = DEF[type], l = d.levels[0];
      if (d.unique && S.builds.some(b => b.type === type)) { await says(`You already have a ${d.name}. You can upgrade or move it instead.`); continue; }
      if (!reqOk(l.req)) { await says(`To build a ${d.name} you first need: ${reqList(l.req).filter(r => !r.ok).map(r => r.text).join(', ')}.`); continue; }
      if (!inv.has(l.cost)) { await says(`You can't afford a ${d.name}. You need ${inv.missingText(l.cost)}.`); continue; }
      let built = 0, last = null;
      for (;;) {
        const spot = await place(type, last);
        if (!spot) break;
        if (!inv.pay(l.cost)) { await says(`You ran out of materials. You need ${inv.missingText(l.cost)}.`); break; }
        const b = { id: uid(), type, map: m.id, x: spot.x, y: spot.y, lvl: 1, rot: spot.rot };
        if (type === 'nursery') b.pets = [];
        S.builds.push(b); built++; G.applyBuilds(m); G.audio.sfx(d.repeat ? 'select' : 'levelup');
        if (!d.repeat) { await says(`You built a ${d.name}!`); break; }
        if (!inv.has(l.cost)) { await says(`You built ${built} ${d.name}${built > 1 ? 's' : ''}. That's all you can afford for now.`); break; }
        last = { x: spot.x + (G.world.p.dir === 2 ? -1 : G.world.p.dir === 3 ? 1 : 0), y: spot.y + (G.world.p.dir === 0 ? 1 : G.world.p.dir === 1 ? -1 : 0) };
      }
      if (built && d.repeat) G.audio.sfx('levelup');
      if (built) return;
    }
  }
  G.closeText();
};

// ---- Upgrade, move, rotate, remove ----------------------------------------------------------
async function upgrade(b) {
  const d = def(b), cur = lvlOf(b);
  if (cur >= d.levels.length) { await says(`Your ${d.name} is already at its best.`); return false; }
  const nx = d.levels[cur], { w, h } = dims(b.type, cur + 1, b.rot), { w: w0, h: h0 } = dims(b.type, cur, b.rot);
  const panel = costPanelLayer(`${d.name.toUpperCase()}  Lv${cur} → Lv${cur + 1}`, `${nx.name}  ·  size ${w0}x${h0} → ${w}x${h}`, nx.cost, nx.req, 'Unlocks: ' + nx.desc);
  G.ui.layers.push(panel);
  const fail = async msg => { await says(msg); G.ui.layers.splice(G.ui.layers.indexOf(panel), 1); return false; };
  const reqBad = reqList(nx.req).filter(r => !r.ok);
  if (reqBad.length) return fail(`Not yet! First you need: ${reqBad.map(r => r.text).join(', ')}.`);
  if (!inv.has(nx.cost)) return fail(`You don't have enough. You need ${inv.missingText(nx.cost)}.`);
  const why = (w !== w0 || h !== h0) ? whyNot(b.type, b.x, b.y, b.rot, b, cur + 1) : null;
  if (why) return fail(`It needs ${w}x${h} tiles of room, but: ${why} Move it somewhere roomier first.`);
  await G.say(`Upgrade to ${nx.name} for ${inv.costText(nx.cost)}?`, { auto: 1 });
  const yes = await G.yesNo();
  G.ui.layers.splice(G.ui.layers.indexOf(panel), 1);
  if (!yes) { G.closeText(); return false; }
  if (!inv.pay(nx.cost)) { await says('Something went missing. Nothing was spent.'); return false; }
  b.lvl = cur + 1; G.home.refresh();
  await G.fadeTo(.7, 8, '#ffffff'); G.audio.sfx('levelup'); await G.wait(20); await G.fadeTo(0, 10);
  await says([`Your ${d.name} is now a ${nx.name}!`, nx.desc]);
  return true;
}
async function move(b) {
  const d = def(b);
  if (d.tiles) { const spot = await place(b.type, { x: b.x, y: b.y }, b); if (spot) { b.x = spot.x; b.y = spot.y; G.home.refresh(); } return; }
  const spot = await place(b.type, { x: b.x, y: b.y }, b);
  if (!spot) return;
  b.x = spot.x; b.y = spot.y; b.rot = spot.rot; G.home.refresh(); G.audio.sfx('select');
  await says(`The ${d.name} was moved.`);
}
async function rotate(b) {
  const r = b.rot ? 0 : 1;
  if (!canPlace(b.type, b.x, b.y, r, b)) { await says('There is no room to turn it here. Try moving it.'); return; }
  b.rot = r; G.home.refresh(); G.audio.sfx('select');
}
function paidSoFar(b) { const d = def(b), out = {}; for (let i = 0; i < lvlOf(b); i++) for (const [k, n] of Object.entries(d.levels[i].cost || {})) out[k] = (out[k] || 0) + n; return out; }
async function remove(b) {
  const d = def(b);
  if (d.removable === false) { await says(`You can't remove your ${d.name}.`); return false; }
  const block = G.homeBlockRemove[b.type] && G.homeBlockRemove[b.type](b);
  if (block) { await says(block); return false; }
  const back = {}; for (const [k, n] of Object.entries(paidSoFar(b))) { const r = Math.floor(n / 2); if (r) back[k] = r; }
  await G.say(`Take down this ${d.name}? You get back ${inv.costText(back)}.`, { auto: 1 });
  if (!(await G.yesNo())) { G.closeText(); return false; }
  G.state.builds.splice(G.state.builds.indexOf(b), 1); inv.refund(back); G.home.refresh(); G.audio.sfx('buy');
  await says(`The ${d.name} was taken down.`); return true;
}

// ---- Land Office: expanding your property ----------------------------------------------------
const DEEDS = [null, null,
  { cost: { money: 5000, Wood: 20, Stone: 20 }, req: null, desc: 'Clears the thicket around your plot: lots more room to build and farm.' },
  { cost: { money: 15000, Plank: 40, Brick: 20 }, req: { shards: 2 }, desc: 'Claims the whole valley floor, out to the old stone walls.' }];
G.DEEDS = DEEDS;
async function landOffice() {
  const S = G.state, deed = S.home.deed || 1;
  if (deed >= DEEDS.length - 1) { await says(['LAND OFFICE: You own all the land here, Warden. It is a fine homestead.']); return; }
  const nx = DEEDS[deed + 1];
  const panel = costPanelLayer(`LAND DEED ${deed} → ${deed + 1}`, 'Expand your homestead', nx.cost, nx.req, nx.desc);
  G.ui.layers.push(panel);
  const done = () => G.ui.layers.splice(G.ui.layers.indexOf(panel), 1);
  const bad = reqList(nx.req).filter(r => !r.ok);
  if (bad.length) { await says(`LAND OFFICE: That land is not for sale yet. Come back with: ${bad.map(r => r.text).join(', ')}.`); done(); return; }
  if (!inv.has(nx.cost)) { await says(`LAND OFFICE: The next deed costs ${inv.costText(nx.cost)}. You need ${inv.missingText(nx.cost)}.`); done(); return; }
  await G.say(`Buy land deed ${deed + 1} for ${inv.costText(nx.cost)}?`, { auto: 1 });
  const yes = await G.yesNo(); done();
  if (!yes) { G.closeText(); return; }
  inv.pay(nx.cost); S.home.deed = deed + 1; G.home.refresh();
  await G.fadeTo(.7, 8, '#ffffff'); G.audio.sfx('levelup'); await G.wait(20); await G.fadeTo(0, 10);
  await says('The thicket has been cleared. Your homestead just got a lot bigger!');
}

// ---- Nursery ---------------------------------------------------------------------------------
G.nurseryGain = (b, p) => Math.max(0, ((G.state.steps || 0) - p.steps0) * L(b).perks.exp);
G.homeBlockRemove.nursery = b => (b.pets || []).length ? 'There are still creatures playing in the nursery. Take them back first.' : null;
G.homeUse.nursery = async function (b) {
  const S = G.state, per = L(b).perks; b.pets = b.pets || [];
  for (;;) {
    const opts = b.pets.map(p => `TAKE ${G.name(p.c).toUpperCase()} (+${G.nurseryGain(b, p)} EXP)`);
    if (b.pets.length < per.slots) opts.push('LEAVE A CREATURE');
    opts.push('DONE');
    await G.say(`Nursery: ${b.pets.length}/${per.slots} creatures. ${per.exp} EXP per step, up to Lv${per.cap}.`, { auto: 1 });
    const c = await G.choose(opts, { right: 236, bottom: 108, minW: 60 });
    G.closeText();
    if (c < 0 || opts[c] === 'DONE') return;
    if (opts[c] === 'LEAVE A CREATURE') {
      if (S.party.length < 2) { await says("You can't leave your only creature behind!"); continue; }
      const i = await G.partyScreen({ mode: 'use' }); if (i < 0) continue;
      if (S.party.filter((x, k) => k !== i && x.hp > 0).length < 1) { await says('You need at least one other healthy creature with you.'); continue; }
      const [pet] = S.party.splice(i, 1); b.pets.push({ c: pet, steps0: S.steps || 0 }); G.audio.sfx('select');
      await says(`You left ${G.name(pet)} at the nursery. It will grow while you are out exploring.`);
      continue;
    }
    const slot = b.pets.splice(c, 1)[0], pet = slot.c, lvl0 = pet.lvl, learned = [];
    pet.exp += G.nurseryGain(b, slot);
    while (pet.lvl < per.cap && pet.exp >= G.expFor(pet.lvl + 1)) {
      G.levelUp(pet);
      for (const mv of G.movesAt(pet, pet.lvl)) if (!pet.moves.some(m => m.id === mv) && pet.moves.length < 4) { pet.moves.push({ id: mv, pp: G.MOVES[mv].pp }); learned.push(mv); }
      const evo = G.SPECIES[pet.id].evo; if (evo && pet.lvl >= evo[0]) pet.evolveReady = true;
    }
    if (pet.lvl >= per.cap) pet.exp = Math.min(pet.exp, G.expFor(per.cap));
    G.healFull(pet);
    if (S.party.length < 6) S.party.push(pet); else S.box.push(pet);
    const lines = [`${G.name(pet)} came running back to you!`];
    if (pet.lvl > lvl0) lines.push(`It grew from Lv${lvl0} to Lv${pet.lvl}!`);
    if (learned.length) lines.push(`It learned ${learned.join(', ')}.`);
    if (!S.party.includes(pet)) lines.push('Your party was full, so it was sent to the PC.');
    G.audio.sfx('levelup'); await says(lines);
    if (S.party.some(x => x.evolveReady)) { await G.fadeTo(1, 12, '#000'); await G.runEvolutions(); G.audio.music(G.world.map.music); await G.fadeTo(0, 14); }
    return;
  }
};

// ---- Healing station: free heals that recharge every day ---------------------------------------
G.homeUse.station = async function (b) {
  const S = G.state, per = L(b).perks;
  if (!b.used || b.used.day !== S.day) b.used = { day: S.day, n: 0 };
  const left = Math.max(0, per.perDay - b.used.n), name = L(b).name.toUpperCase();
  if (!left) { await says(`The ${L(b).name} is recharging. It will be ready again tomorrow (sleep in your bed to skip ahead).`); return; }
  let healed;
  if (G.healUI) healed = await G.healUI({ name, charges: per.perDay >= 99 ? null : left, revive: per.revive });
  else {
    const c = await G.choose(['HEAL TEAM', 'CANCEL'], { right: 236, bottom: 108 });
    healed = c === 0; if (healed) { await G.fadeTo(.8, 10, '#ffffff'); S.party.forEach(x => { if (per.revive || x.hp > 0) G.healFull(x); }); G.audio.sfx('heal'); await G.wait(30); await G.fadeTo(0, 10); await says('Your team is healed!'); }
  }
  if (healed) b.used.n++;
};

G.buildApi = { canPlace: (type, x, y, rot, ignore, lvl) => canPlace(type, x, y, rot, ignore, lvl), whyNot, footprint: type => dims(type, 1, 0), place };
})();
