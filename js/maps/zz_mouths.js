// Cave mouths and doorways that used to lead nowhere. The map art draws a dark doorway (tile 'M') on cliffs and the Sandsreach
// building, and the Cloudpeak castle has a door ('D'); this file builds a real place behind each one and links it both ways.
//   - Every unconnected 'M' cluster gets its own small cave (themed by region, with loot that is picked up once, and a person
//     or a trainer), except the Sandsreach building, which becomes the Dune Elders' Hall.
//   - The Cloudpeak castle door opens into the castle hall.
// It runs after the other maps (file name sorts last but one) and before the sea maps are generated.
(function () {
const { newMap, rect, scatter, warp, npc, trainer, interior, set, DOWN, UP, LEFT, RIGHT } = G.mk, maps = G.MAPS;
const walk = (m, x, y) => { const c = m.t[y] && m.t[y][x]; return !!c && !G.TILES[c].solid && c !== 'w'; };
// Themes: cave name, an item or two, who is inside.
const THEME = {
  glacier: { name: 'FROZEN GROTTO', items: [['Crystal Shard', 2], ['Super Potion', 2], ['Full Heal', 1]], lines: ['The ice here hums when you hum back. Try it.', 'I keep warm by listening to the glacier crack. It is very slow music.'], style: 'old', trainer: ['SLEET', 'ICE CLIMBER', [[154, 30], [128, 31]], 'You are walking on thin ice, friend.', 'My boots slipped.'] },
  badlands: { name: 'CRIMSON CAVERN', items: [['Iron Ore', 3], ['Revive', 1], ['Coal', 3], ['Super Potion', 2]], lines: ['Red rock all the way down. The echoes here are loud, so I whisper.', 'Watch the walls. They look solid, but some are only dust.'], style: 'hiker', trainer: ['BASALT', 'SPELUNKER', [[141, 36], [129, 37], [15, 38]], 'Nobody ever comes in here. Not even me, most days!', 'Cave-in. On my pride.'] },
  emberfall: { name: 'MAGMA TUNNEL', items: [['Coal', 4], ['Iron Ore', 3], ['Super Potion', 2]], lines: ['It is warm in here. The mountain breathes slowly.', 'The glow on the walls is old lava. It stopped moving long ago. Probably.'], style: 'kade', trainer: ['EMBERS', 'TUNNELER', [[3, 42], [119, 43]], 'This is my tunnel. Mind your boots!', 'Cooled right off.'] },
};
const LOOK = { old: 'old', hiker: 'hiker', kade: 'kade' };
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const clusters = m => {
  const seen = new Set(), out = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (m.t[y][x] !== 'M' || seen.has(x + ',' + y)) continue;
    const cl = [], q = [[x, y]]; seen.add(x + ',' + y);
    while (q.length) { const [a, c] = q.pop(); cl.push([a, c]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (a + dx) + ',' + (c + dy); if (!seen.has(k) && m.t[c + dy] && m.t[c + dy][a + dx] === 'M') { seen.add(k); q.push([a + dx, c + dy]); } } }
    out.push(cl);
  }
  return out;
};
// A walkable tile next to the cluster to come back out on (below it first).
const outside = (m, cl) => {
  const set = new Set(cl.map(c => c.join(',')));
  const order = [[0, 1], [-1, 0], [1, 0], [0, -1]];
  for (const [dx, dy] of order) for (const [x, y] of cl) { const a = x + dx, b = y + dy; if (!set.has(a + ',' + b) && walk(m, a, b)) return [a, b]; }
  return null;
};
const cave = (id, name, ret, theme, n) => {
  const m = newMap(id, name, 14, 10, 'C', { music: 'cave', bg: 'cave', outdoor: false });
  rect(m, 2, 2, 10, 6, 'c'); rect(m, 6, 8, 2, 2, 'c'); rect(m, 3, 1, 8, 1, 'c');
  scatter(m, 'C', n % 2 ? [[5, 4], [9, 5]] : [[4, 4], [10, 4]]); scatter(m, 'i', [[2, 2], [11, 2], [2, 7], [11, 7], [6, 1], [8, 1]]);
  warp(m, 6, 9, ret.map, ret.x, ret.y, DOWN); warp(m, 7, 9, ret.map, ret.x, ret.y, DOWN);
  const T = THEME[theme], items = T.items.slice(n % 2, n % 2 + 2);
  items.forEach(([item, qty], i) => m.objs.push({ x: i ? 10 : 3, y: i ? 3 : 6, id: `${id}_item${i}`, item, qty, ball: true }));
  if (n % 2) trainer(m, `${id}_t`, 6, 3, DOWN, T.style, { name: T.trainer[0], cls: T.trainer[1], sight: 3, team: T.trainer[2], pre: T.trainer[3], win: T.trainer[4], post: 'Take whatever you find. It was never mine.', prize: 80 });
  else npc(m, 5, 6, RIGHT, T.style, [T.lines[n % T.lines.length], T.lines[(n + 1) % T.lines.length]]);
  return m;
};
let count = 0;
for (const mid of ['glacier', 'badlands', 'emberfall', 'sandsreach']) {
  const m = maps[mid]; if (!m) continue;
  clusters(m).forEach((cl, i) => {
    if (cl.some(([x, y]) => m.warps.some(w => w.x === x && w.y === y))) return;   // already connected
    const out = outside(m, cl); if (!out) return;
    const ret = { map: mid, x: out[0], y: out[1] };
    let dest, tx, ty;
    if (mid === 'sandsreach') {   // the building: the Dune Elders' Hall
      dest = interior('dune_hall', "DUNE ELDERS' HALL", 10, 8, 4);
      rect(dest, 3, 1, 4, 2, 'a'); scatter(dest, 'O', [[1, 1], [8, 1]]);
      npc(dest, 5, 2, DOWN, 'old', null, { still: true, talk: async () => {
        await G.worldApi.says(['DUNE ELDER: Welcome, Warden. Sandsreach has stood here since before the Lantern was lit.', 'DUNE ELDER: We keep the old stories in this hall. The desert remembers everything it buries.', G.state.flags.finale ? 'DUNE ELDER: And now it remembers you.' : 'DUNE ELDER: The Wardens who bring calm to the vale are always welcome at our table.']);
      } });
      npc(dest, 2, 5, RIGHT, 'camper', ['The elders let travellers sleep by the fire. Mind the scorpions, not the elders.']);
      dest.objs.push({ x: 8, y: 5, id: 'dune_hall_a', item: 'Full Heal', qty: 2, ball: true }, { x: 1, y: 3, id: 'dune_hall_b', item: 'Super Potion', qty: 2, ball: true });
      warp(dest, 4, 7, mid, ret.x, ret.y, DOWN);
      [tx, ty] = [4, 6];
    } else {
      const id = `mouth_${mid}_${i}`, n = hash(id) % 5; dest = cave(id, THEME[mid].name, ret, mid, n); [tx, ty] = [6, 8];
    }
    for (const [x, y] of cl) { m.warps.push({ x, y, to: dest.id, tx: tx + (cl.length > 1 && x % 2 ? 1 : 0), ty, dir: UP }); }
    count++;
  });
}
// The Cloudpeak castle: its door leads to the great hall.
{
  const m = maps.cloudpeak, doors = [[31, 6], [32, 6]];
  if (m && doors.every(([x, y]) => m.t[y][x] === 'D') && !m.warps.some(w => doors.some(([x, y]) => w.x === x && w.y === y))) {
    const out = [31, 7], hall = interior('cloud_castle', 'CLOUDPEAK CASTLE', 12, 9, 6);
    rect(hall, 4, 2, 4, 5, 'a'); scatter(hall, 'O', [[1, 1], [10, 1], [1, 6], [10, 6]]);
    npc(hall, 6, 2, DOWN, 'old', null, { still: true, talk: async () => {
      const f = G.state.flags;
      await G.worldApi.says(f.ch8_vesper ? ['CASTLE STEWARD: The Ashen banners came down this morning. Vesper walked out through the front gate and has not been back.', 'CASTLE STEWARD: This hall was a Warden hall before it was a fortress. It would like to be one again.']
        : f.vesper1 ? ['CASTLE STEWARD: The Ashen Wardens use these walls now. I stay out of their way and keep the lamps lit.', 'CASTLE STEWARD: Whoever you are looking for, they are on the terrace outside. Mind the steps.'] : ['CASTLE STEWARD: Cloudpeak Castle. Visitors are rare. Make yourself at home, but mind the stairs.']);
    } });
    npc(hall, 2, 4, RIGHT, 'prof', ['The old Wardens drew a map of every cave in Aurelis on this wall. It is mostly unfinished.', 'I am adding the ones I find. There are always more.']);
    hall.objs.push({ x: 10, y: 3, id: 'castle_a', item: 'Mythic Orb', qty: 1, ball: true }, { x: 1, y: 4, id: 'castle_b', item: 'Revive', qty: 2, ball: true }, { x: 10, y: 5, id: 'castle_c', item: 'Super Potion', qty: 3, ball: true });
    warp(hall, 6, 8, 'cloudpeak', out[0], out[1], DOWN);
    for (const [x, y] of doors) m.warps.push({ x, y, to: 'cloud_castle', tx: 6, ty: 7, dir: UP });
    count++;
  }
}
G.MOUTHS_BUILT = count;
})();
