// Map-building toolkit shared by the files in js/maps/. Each map file registers its maps with these helpers.
(function () {
const G = globalThis.G;
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
G.DIR = { DOWN, UP, LEFT, RIGHT };
// ---- Map building helpers --------------------------------------------------
const maps = G.MAPS = {};
function newMap(id, name, w, h, fill, o) {
  const m = Object.assign({ id, name, w, h, t: Array.from({ length: h }, () => Array(w).fill(fill)), npcs: [], objs: [], warps: [], enc: null, music: 'town', bg: 'grass', outdoor: true }, o);
  return maps[id] = m;
}
const set = (m, x, y, ch) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y][x] = ch; };
const rect = (m, x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(m, x + i, y + j, ch); };
const border = (m, ch) => { rect(m, 0, 0, m.w, 1, ch); rect(m, 0, m.h - 1, m.w, 1, ch); rect(m, 0, 0, 1, m.h, ch); rect(m, m.w - 1, 0, 1, m.h, ch); };
const scatter = (m, ch, pts) => pts.forEach(([x, y]) => set(m, x, y, ch));
// 3-row building: two roof rows and a wall row with windows and (optionally) a door at x+dx.
function building(m, x, y, w, roof, dx) {
  rect(m, x, y, w, 2, roof); rect(m, x, y + 2, w, 1, 'W');
  for (let i = 1; i < w - 1; i++) if (i !== dx && i % 2) set(m, x + i, y + 2, 'N');
  if (dx >= 0) set(m, x + dx, y + 2, 'D');
}
function interior(id, name, w, h, mat) {
  const m = newMap(id, name, w, h, 'T', { outdoor: false });
  border(m, 'B'); set(m, mat, h - 1, 'm'); return m;
}
const warp = (m, x, y, to, tx, ty, dir, need) => m.warps.push({ x, y, to, tx, ty, dir, need });
const ST = {
  boy: { hair: '#5a3a20', skin: '#f8d0a8', shirt: '#48a0e0', pants: '#506080' }, girl: { hair: '#c04860', skin: '#f8d0a8', shirt: '#f0a0c0', pants: '#885070' },
  old: { hair: '#d8d8d8', skin: '#e8c098', shirt: '#8a7a60', pants: '#605040' }, nurse: { hair: '#f0a0b8', skin: '#f8d0a8', shirt: '#f8f0f0', pants: '#f08098', hat: '#f8f0f0' },
  clerk: { hair: '#304060', skin: '#f8d0a8', shirt: '#4070c0', pants: '#304060' }, prof: { hair: '#7a5a40', skin: '#f8d0a8', shirt: '#f8f8f8', pants: '#506848' },
  mom: { hair: '#8a4a30', skin: '#f8d0a8', shirt: '#f0c060', pants: '#a06848' }, hiker: { hair: '#403020', skin: '#e8b890', shirt: '#a87848', pants: '#605040', hat: '#c8a050' },
  bug: { hair: '#a07830', skin: '#f8d0a8', shirt: '#78c050', pants: '#686848', hat: '#e8d870' }, lass: { hair: '#f0c040', skin: '#f8d0a8', shirt: '#e86090', pants: '#4050a0' },
  camper: { hair: '#403028', skin: '#f8d0a8', shirt: '#e07830', pants: '#3a5a3a', hat: '#3a5a3a' }, kade: { hair: '#c0c0d0', skin: '#e8c8b0', shirt: '#403058', pants: '#282038', hat: '#403058' },
  elder: { hair: '#e8e8f4', skin: '#e8c098', shirt: '#6a4a9a', pants: '#403060', hat: '#6a4a9a' }, kid: { hair: '#c07030', skin: '#f8d0a8', shirt: '#f0e060', pants: '#4868b0' },
};
G.PLAYER_STYLE = { hair: '#4a2f1a', skin: '#f8d0a8', shirt: '#e04848', pants: '#3858a0', hat: '#f8f8f8' };
const npc = (m, x, y, dir, style, lines, o) => m.npcs.push(Object.assign({ x, y, dir, style: ST[style], lines }, o));
const sign = (m, x, y, text) => { set(m, x, y, 's'); m.objs.push({ x, y, fn: () => G.story.says(text) }); };


// ---- Trainers --------------------------------------------------------------
function trainer(m, id, x, y, dir, style, t) {
  npc(m, x, y, dir, style, null, { trainer: Object.assign({ id, style: ST[style] }, t), still: true });
}



// ---- World-expansion helpers (docs/WORLD.md) -----------------------------------
// A badge gate for a warp's `need`: blocks until the player holds n badges (G.badgeGate comes from js/maps/zz_arenas.js).
const gate = (n, place) => { const f = () => { if (!G.state.flags.starter) return 'It is not safe beyond the lamplight without a Bondling.'; return G.badgeGate ? G.badgeGate(n, place) : null; }; f.badges = n; f.place = place; return f; };
// A 2-wide exit on a map edge. edge 'N'|'S'|'W'|'E'; at = first tile along the edge; (ax, ay) = arrival of the first tile on `to`.
function edgeExit(m, edge, at, to, ax, ay, need, along) {
  // `along`: which way the second arrival tile steps ('x' or 'y'); by default the same way as this edge runs
  along = along || (edge === 'N' || edge === 'S' ? 'x' : 'y');
  for (let k = 0; k < 2; k++) {
    const tx = ax + (along === 'x' ? k : 0), ty = ay + (along === 'y' ? k : 0);
    if (edge === 'N') warp(m, at + k, 0, to, tx, ty, UP, need);
    if (edge === 'S') warp(m, at + k, m.h - 1, to, tx, ty, DOWN, need);
    if (edge === 'W') warp(m, 0, at + k, to, tx, ty, LEFT, need);
    if (edge === 'E') warp(m, m.w - 1, at + k, to, tx, ty, RIGHT, need);
  }
}
// Encounter table from creature types: base forms that have any of `types` (weight 8, or `w`), plus evolved forms
// rarely (weight 2) when the level range is high enough. `pick` limits how many species; `only` adds ids by hand.
function wild(types, lo, hi, o) {
  o = o || {};
  const all = Object.values(G.SPECIES), pre = new Set(all.filter(s => s.evo).map(s => s.evo[1]));
  const legend = new Set([25, 153, 154, 155, 156]);
  const fits = s => !legend.has(s.id) && s.types.some(t => types.includes(t));
  const base = all.filter(s => fits(s) && !pre.has(s.id));
  const evo = all.filter(s => fits(s) && pre.has(s.id) && hi >= 18);
  const seedOf = id => ((id * 2654435761) ^ (lo * 97 + hi)) >>> 0, byHash = (a, b) => seedOf(a.id) - seedOf(b.id);
  const n = o.pick || 7, b = base.sort(byHash).slice(0, n), e = evo.sort(byHash).slice(0, Math.max(1, n >> 2));
  const tab = b.map(s => [s.id, lo, hi, o.w || 8]).concat(e.map(s => [s.id, Math.max(lo, hi - 4), hi, 2]));
  for (const id of o.only || []) if (!tab.some(t => t[0] === id)) tab.push([id, lo, hi, 3]);
  return tab;
}
// A placeholder outdoor map: grass in a ring of trees with dirt paths from every exit to the middle.
// exits: [[edge, at, to, ax, ay, need?], ...]. Region owners replace these with real maps (same id, size and exits).
function stubMap(id, name, w, h, exits, o) {
  const m = newMap(id, name, w, h, 'g', Object.assign({ music: 'route' }, o));
  border(m, '#'); rect(m, 1, 1, w - 2, 1, '#'); rect(m, 1, h - 2, w - 2, 1, '#'); rect(m, 1, 1, 1, h - 2, '#'); rect(m, w - 2, 1, 1, h - 2, '#');
  const cx = w >> 1, cy = h >> 1;
  for (const [edge, at] of exits) {
    if (edge === 'N' || edge === 'S') { rect(m, at, Math.min(cy, edge === 'N' ? 0 : cy), 2, edge === 'N' ? cy + 1 : h - cy, 'p'); rect(m, Math.min(at, cx), cy, Math.abs(at - cx) + 2, 2, 'p'); }
    else { rect(m, Math.min(cx, edge === 'W' ? 0 : cx), at, edge === 'W' ? cx + 1 : w - cx, 2, 'p'); rect(m, cx, Math.min(at, cy), 2, Math.abs(at - cy) + 2, 'p'); }
  }
  for (const [edge, at, to, ax, ay, need, along] of exits) edgeExit(m, edge, at, to, ax, ay, need, along);
  m.landing = { x: cx, y: cy }; m.stub = true;
  return m;
}

// Cut a 2-wide path in from a map edge until it meets open ground (water becomes a bridge), then add the exit.
function carveExit(m, edge, at, to, ax, ay, need, along) {
  const solid = (x, y) => { const c = m.t[y] && m.t[y][x]; return !c || (G.TILES[c] && G.TILES[c].solid); };
  const step = edge === 'N' ? [0, 1] : edge === 'S' ? [0, -1] : edge === 'W' ? [1, 0] : [-1, 0];
  let x = edge === 'E' ? m.w - 1 : edge === 'W' ? 0 : at, y = edge === 'S' ? m.h - 1 : edge === 'N' ? 0 : at, open = 0;
  for (let i = 0; i < Math.max(m.w, m.h) / 2 && open < 2; i++) {
    const cells = edge === 'N' || edge === 'S' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]];
    const wasOpen = i > 1 && cells.every(([cx, cy]) => !solid(cx, cy));
    if (wasOpen) open++; else { open = 0; for (const [cx, cy] of cells) set(m, cx, cy, m.t[cy][cx] === 'w' ? 'V' : 'p'); }
    x += step[0]; y += step[1];
  }
  edgeExit(m, edge, at, to, ax, ay, need, along);
}
// Ferry routes (dock to dock; each map in a route sets m.dock to a walkable tile): [from, to, badges].
const FERRIES = [['driftwood', 'verdant', 3], ['driftwood', 'tidefall', 3], ['shore', 'moonlit', 8], ['cobalt', 'moonlit', 8], ['frostmere', 'aurora', 7]];
G.mk_FERRIES = FERRIES;
G.mk = { FERRIES, maps, newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, ST, DOWN, UP, LEFT, RIGHT, gate, edgeExit, carveExit, wild, stubMap };
})();
