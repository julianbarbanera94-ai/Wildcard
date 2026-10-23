// Cave dressing (Stage A of the cave upgrade, docs/CAVES.md): every cave gets a theme, a darkness level and set dressing:
// lanterns, crystals, stalagmites, glowing mushrooms, rune pillars, barrels, mine carts on rails, light shafts and pools.
// Runs after the caves exist (file name sorts after zz_mouths.js) and only places a solid prop where it cannot cut a path:
// the walkable neighbours of the tile must stay connected around it, and the tile must be away from warps, people and items.
(function () {
const maps = G.MAPS, TILES = G.TILES;
const hsh = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 7, -2048144777); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const THEMES = {
  mine: ['crystal', .62], hollow: ['ruins', .7], cloud_cave1: ['frost', .55], cloud_cave2: ['crystal', .55],
};
for (const m of Object.values(maps)) {
  if (m.bg !== 'cave' || m.caveTheme) continue;
  const id = m.id;
  let theme = THEMES[id] && THEMES[id][0], dark = THEMES[id] && THEMES[id][1];
  if (!theme) {
    if (/^mouth_emberfall/.test(id)) theme = 'volcanic';
    else if (/^mouth_glacier/.test(id)) theme = 'frost';
    else if (/^mouth_badlands/.test(id)) theme = (+id.split('_').pop()) % 2 ? 'grotto' : 'crimson';
    else theme = 'crystal';
    dark = .58;
  }
  m.caveTheme = theme; m.dark = dark;
  dress(m);
}
function dress(m) {
  const W = m.w, H = m.h, t = m.t, at = (x, y) => (t[y] && t[y][x]) || 'C';
  const walk = (x, y) => { const c = at(x, y); return !!TILES[c] && !TILES[c].solid; };
  const busy = new Set();
  const mark = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) busy.add((x + i) + ',' + (y + j)); };
  for (const w of m.warps) mark(w.x, w.y, 2);
  for (const e of m.npcs) mark(e.x, e.y, 1);
  for (const o of m.objs) mark(o.x, o.y, 1);
  if (m.landing) mark(m.landing.x, m.landing.y, 2);
  const floor = (x, y) => { const c = at(x, y); return (c === 'c' || c === 'e') && !busy.has(x + ',' + y); };
  const wallNext = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(x + a, y + b) === 'C');
  // a solid on (x, y) is safe if the walkable 8-ring around it stays in one piece
  const safe = (x, y) => {
    const ring = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].map(([a, b]) => walk(x + a, y + b));
    const orth = [1, 3, 5, 7].filter(i => ring[i]); if (orth.length <= 1) return orth.length === 1 || true;
    // walk round the ring: orthogonal walkable neighbours must be linked through walkable ring cells
    const seen = new Set([orth[0]]), q = [orth[0]];
    while (q.length) { const i = q.pop(); for (const d of [1, 7]) { const j = (i + d) % 8; if (ring[j] && !seen.has(j)) { seen.add(j); q.push(j); } } }
    return orth.every(i => seen.has(i));
  };
  const put = (x, y, ch, solid) => { if (!floor(x, y) || (solid && !safe(x, y))) return false; t[y][x] = ch; mark(x, y, 1); return true; };
  const T = m.caveTheme;
  if (W <= 16 && H <= 12) {   // the small cave rooms behind cave mouths: a fixed, tidy layout
    put(2, 4, '6', true); put(11, 5, '6', true); put(8, 4, '7', false);
    if (T === 'volcanic') { put(10, 6, '!', true); put(4, 2, '5', true); }
    else if (T === 'grotto') { put(4, 2, '8', true); put(9, 7, '8', true); put(10, 6, 'w', true); }
    else if (T === 'crimson') { put(4, 2, '5', true); put(9, 7, '5', true); put(10, 6, '4', true); }
    else if (T === 'frost') { put(4, 2, 'i', true); put(9, 7, '5', true); put(10, 6, 'w', true); }
    else { put(4, 2, 'i', true); put(9, 7, '4', true); }
    return;
  }
  // bigger caves: scatter by theme along the walls, light shafts in open floor
  const wallSet = { crystal: ['6', 'i', 'i', '5', '4', '6'], volcanic: ['6', '5', '!', '5', '4'], frost: ['i', '5', '6', 'i'], ruins: ['9', '6', '8', '9', '5'], grotto: ['8', '8', 'i', '6', '5'], crimson: ['5', '6', '4', '5'] }[T];
  let n = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const h = hsh(x, y, 1);
    if (wallNext(x, y) && h < .075) { if (put(x, y, wallSet[(hsh(x, y, 2) * wallSet.length) | 0], true)) n++; }
    else if (!wallNext(x, y) && h > .992) put(x, y, '7', false);
  }
  // the mine: a cart on a short track and a few barrels by the entrance
  if (m.id === 'mine') {
    const w = m.warps[0]; if (w) {
      const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
      for (const [a, b] of dirs) {
        let ok = true; for (let k = 3; k <= 8; k++) if (!(at(w.x + a * k, w.y + b * k) === 'c' || at(w.x + a * k, w.y + b * k) === 'e')) ok = false;
        if (!ok) continue;
        const sx = w.x + b * 2, sy = w.y + a * 2;   // a parallel lane two tiles to the side
        let lane = true; for (let k = 3; k <= 8; k++) if (!(at(sx + a * k, sy + b * k) === 'c' || at(sx + a * k, sy + b * k) === 'e')) lane = false;
        const [lx, ly] = lane ? [sx, sy] : [w.x, w.y];
        for (let k = 3; k <= 7; k++) { const x = lx + a * k, y = ly + b * k; if (t[y][x] === 'c' || t[y][x] === 'e') t[y][x] = '1'; }
        const ex = lx + a * 8, ey = ly + b * 8; if (safe(ex, ey) && (t[ey][ex] === 'c' || t[ey][ex] === 'e')) t[ey][ex] = '2';
        break;
      }
    }
  }
}
})();
