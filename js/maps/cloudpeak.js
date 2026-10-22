// CLOUDPEAK MOUNTAINS (north): five cliff terraces climbed by switchbacks, waterfalls, two cave mouths and a sealed castle on the summit.
// Terraces bottom to top: T0 (y 48..57, arrivals from the Ridge), T1 (38..45), T2 (28..35, west road from Evergreen), T3 (19..25, east road to Glacier Pass),
// T4 (11..16), the summit yard (7..8) and the castle (y 0..6). Stone stair '%' from T4 up to the castle gate.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, interior, warp, npc, sign, trainer, edgeExit, gate, wild, DOWN, UP, LEFT, RIGHT } = G.mk;
const H = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

(function () {
  const m = newMap('cloudpeak', 'CLOUDPEAK MOUNTAINS', 64, 60, 'g', { music: 'cave', biome: 'alpine', banner: true, enc: wild(['Rock', 'Flying', 'Ice', 'Fighting'], 26, 32, { pick: 9 }) });
  const blob = (cx, cy, rx, ry, ch, only) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / (rx + .5), dy = (y - cy) / (ry + .5); if (dx * dx + dy * dy <= 1 && (!only || only.includes(m.t[y] && m.t[y][x]))) set(m, x, y, ch); } };
  const keepRects = [[50, 49, 8, 8], [3, 50, 7, 7]];
  const inKeep = (x, y) => keepRects.some(([a, b, w, h]) => x >= a && x < a + w && y >= b && y < b + h);
  const grove = (x, y, w, h, chs, pct) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j, k = H(X, Y);
    if (m.t[Y] && m.t[Y][X] === 'g' && !inKeep(X, Y) && k % 100 < pct) set(m, X, Y, chs[(k >>> 8) % chs.length]); } };
  const hash = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };

  // summit and cliffs: everything from the top down to the first terrace is mountain
  rect(m, 1, 1, 62, 9, 'E');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
    if (d < 2 || (d === 2 && H(x, y) % 3 === 0)) set(m, x, y, H(x, y) % 5 < 3 ? 'n' : '#'); }
  const band = (y, gx) => {
    rect(m, 1, y, 62, 2, 'E');
    for (let x = 1; x < 63; x++) { if (hash(x, y) < .25) set(m, x, y - 1, 'E'); else if (hash(x, y + 9) < .1) set(m, x, y - 1, 'r'); }
    rect(m, gx - 1, y - 1, 4, 3, 'g'); rect(m, gx, y - 1, 2, 3, 'p');
  };
  band(46, 44); band(36, 14); band(26, 48); band(17, 12); band(10, 31);
  // the castle on the summit (special location: sealed for now)
  rect(m, 22, 3, 20, 4, '^'); rect(m, 22, 1, 4, 6, '^'); rect(m, 38, 1, 4, 6, '^'); rect(m, 29, 0, 6, 4, '^'); rect(m, 26, 2, 3, 1, '^'); rect(m, 35, 2, 3, 1, '^');
  rect(m, 31, 6, 2, 1, 'D');
  rect(m, 18, 7, 28, 2, 'g'); rect(m, 31, 7, 2, 7, '%');
  scatter(m, 'l', [[30, 7], [33, 7]]); rect(m, 20, 7, 3, 2, 'f'); rect(m, 41, 7, 3, 2, 'f'); scatter(m, 'r', [[19, 7], [45, 8], [18, 8]]);
  sign(m, 28, 8, 'CLOUDPEAK CASTLE\nThe gates are shut until a later chapter.');

  // switchback trails
  rect(m, 24, 50, 2, 10, 'p'); rect(m, 24, 50, 22, 2, 'p'); rect(m, 44, 41, 2, 10, 'p');           // T0 -> T1
  rect(m, 14, 41, 32, 2, 'p'); rect(m, 14, 30, 2, 13, 'p');                                         // T1 -> T2
  rect(m, 0, 30, 51, 2, 'p'); rect(m, 48, 20, 2, 12, 'p');                                         // T2 (west road) -> T3
  rect(m, 12, 20, 52, 2, 'p'); rect(m, 12, 13, 2, 8, 'p');                                         // T3 (east road) -> T4
  rect(m, 12, 13, 40, 2, 'p');                                                                      // T4 trail; stair at x 31..32

  // waterfalls and their pools
  rect(m, 8, 45, 3, 3, '@'); rect(m, 7, 48, 5, 2, 'w'); rect(m, 36, 35, 3, 3, '@'); rect(m, 35, 38, 5, 2, 'w');
  rect(m, 30, 25, 3, 3, '@'); rect(m, 29, 28, 5, 2, 'w'); rect(m, 30, 22, 3, 3, 'w');
  rect(m, 40, 16, 3, 3, '@'); rect(m, 39, 19, 5, 1, 'w'); rect(m, 40, 15, 3, 1, 'w');
  rect(m, 57, 25, 3, 2, 'w'); // little tarn on T3 east
  // cave mouths against the cliff faces
  rect(m, 19, 26, 4, 2, 'C'); set(m, 20, 27, 'M'); set(m, 21, 27, 'M'); scatter(m, 'i', [[19, 25], [22, 25]]); rect(m, 20, 28, 2, 2, 'p');
  rect(m, 49, 10, 4, 2, 'C'); set(m, 50, 11, 'M'); set(m, 51, 11, 'M'); scatter(m, 'i', [[49, 9], [52, 9]]);

  // ---- T0: foot of the mountain (build flats at the west and east ends) ----
  rect(m, 12, 52, 10, 5, 'G'); rect(m, 28, 53, 14, 4, 'G'); rect(m, 46, 52, 2, 5, 'g');
  rect(m, 3, 50, 7, 7, 'g'); rect(m, 50, 49, 8, 8, 'g');
  scatter(m, 'r', [[11, 54], [22, 54], [43, 55], [47, 50], [2, 50], [10, 56], [59, 49], [58, 57]]);
  rect(m, 12, 48, 6, 1, 'f'); rect(m, 27, 56, 3, 1, 'f');
  sign(m, 26, 56, 'CLOUDPEAK MOUNTAINS\nStone stairs, hanging bridges and thin air. The castle on the summit has been shut for ages.');
  m.objs.push({ x: 4, y: 55, id: 'cloudpeak_pot', item: 'Super Potion', ball: true });
  trainer(m, 'cloudpeak_hiker1', 34, 52, UP, 'hiker', { name: 'GRIT', cls: 'MOUNTAINEER', sight: 2, team: [[14, 26], [129, 27], [141, 28]], pre: 'Fresh legs! Let us see if they last past the first ledge.', win: 'My knees hold, but my team does not.', post: 'Take the east switchback. The rock is firmer there.', prize: 1700 });
  npc(m, 27, 55, DOWN, 'camper', ['This is the foothill. Real Cloudpeak starts at the first cliff.', 'Wild Rock and Flying creatures live in the long grass.'], { roam: 1 });

  // ---- T1: pine slopes, a waterfall and a hidden nook in the west ----
  rect(m, 20, 38, 14, 3, 'G'); rect(m, 4, 38, 8, 4, 'G'); rect(m, 22, 43, 18, 3, 'G'); rect(m, 48, 38, 12, 4, 'G');
  rect(m, 3, 43, 7, 3, 'n'); rect(m, 4, 44, 5, 1, 'g'); set(m, 3, 44, 'g'); set(m, 2, 44, 'g'); rect(m, 5, 43, 3, 1, 'g'); rect(m, 5, 45, 3, 1, 'f');
  scatter(m, 'r', [[34, 44], [41, 38], [47, 44], [18, 44], [50, 43]]);
  m.objs.push({ x: 6, y: 44, id: 'cloudpeak_nook', item: 'Frost Orb', qty: 2, ball: true });
  trainer(m, 'cloudpeak_climber1', 28, 44, UP, 'camper', { name: 'TESS', cls: 'CLIMBER', sight: 2, team: [[85, 27], [137, 28], [86, 29]], pre: 'Grip, step, breathe. And battle!', win: 'I lost my footing.', post: 'Fighting types never tire of cliffs.', prize: 1750 });
  npc(m, 52, 40, LEFT, 'old', ['The waterfalls feed the lake far to the south east. Follow the water and you find Lakeside.'], { still: true });

  // ---- T2: the long west ledge. Evergreen road in from the west, a cave mouth at the cliff ----
  rect(m, 4, 32, 9, 3, 'G'); rect(m, 22, 32, 12, 3, 'G'); rect(m, 40, 32, 14, 3, 'G'); rect(m, 52, 28, 8, 3, 'G');
  scatter(m, 'r', [[3, 29], [16, 33], [37, 33], [21, 34], [12, 29], [55, 33]]);
  m.objs.push({ x: 58, y: 33, id: 'cloudpeak_heal', item: 'Full Heal', ball: true });
  sign(m, 6, 29, 'EVERGREEN ROAD\nWest down the pass to the great forest.');
  trainer(m, 'cloudpeak_flyer1', 36, 34, UP, 'bug', { name: 'WILLA', cls: 'BIRD WATCHER', sight: 3, team: [[16, 28], [35, 29], [17, 30]], pre: 'Did you hear that screech? Those are my friends!', win: 'Even the birds are laughing.', post: 'Skyrant nest on the high ledges.', prize: 1800 });
  npc(m, 10, 28, DOWN, 'hiker', ['There is a cave in the cliff face to the east. It echoes!'], { roam: 1 });

  // ---- T3: wind-swept shelf with the road east to Glacier Pass ----
  rect(m, 14, 23, 12, 2, 'G'); rect(m, 34, 23, 12, 2, 'G'); rect(m, 52, 22, 8, 3, 'G'); rect(m, 20, 18, 16, 1, 'G');
  scatter(m, 'r', [[27, 23], [33, 24], [46, 22], [60, 19], [13, 24]]);
  m.objs.push({ x: 61, y: 23, id: 'cloudpeak_frost', item: 'Frost Orb', ball: true });
  sign(m, 59, 19, 'GLACIER PASS\nEast: snow, ice and a very cold wind. Five badges to pass.');
  trainer(m, 'cloudpeak_ice1', 55, 19, DOWN, 'lass', { name: 'NORA', cls: 'SKIER', sight: 1, team: [[57, 29], [36, 30], [147, 31]], pre: 'Practising for the winter slopes! Join in?', win: 'Slippery!', post: 'The Pass beyond is all snow.', prize: 1850 });
  npc(m, 28, 22, DOWN, 'old', ['A little stream runs from the top waterfall to this pool. Listen, you can hear it!'], { still: true });

  // ---- T4: the high shelf below the summit stair, a second cave and the stone stair ----
  rect(m, 14, 15, 12, 2, 'G'); rect(m, 34, 15, 4, 2, 'G'); rect(m, 44, 15, 6, 2, 'G'); rect(m, 22, 11, 8, 1, 'g');
  scatter(m, 'r', [[27, 15], [43, 15], [33, 12], [17, 12], [57, 14]]);
  m.objs.push({ x: 60, y: 14, id: 'cloudpeak_stone', item: 'Stone Orb', qty: 2, ball: true });
  rect(m, 52, 12, 8, 4, 'g'); rect(m, 54, 12, 5, 1, 'f');
  sign(m, 33, 14, 'SUMMIT STAIR\nThe castle at the top is sealed. Visitors may look but not enter.');
  trainer(m, 'cloudpeak_warden1', 24, 16, UP, 'kade', { name: 'ROWAN', cls: 'SUMMIT GUARD', sight: 2, team: [[138, 30], [142, 31], [128, 32]], pre: 'Halt! Only the strong climb this stair, and even then only to look.', win: 'The stair is yours. The gate is not.', post: 'The castle will open in time. Not today.', prize: 1950 });
  // castle gate guards
  npc(m, 31, 6, DOWN, 'kade', ['The gates are shut until a later chapter.', 'Do not ask me what lies inside.'], { still: true });
  npc(m, 32, 6, DOWN, 'kade', ['The Castle has stood on the summit for a thousand years. Its gates are sealed for now.'], { still: true });
  npc(m, 26, 8, RIGHT, 'elder', ['They say the castle keeps a secret that the whole region depends on.', 'It will open when the time comes.'], { still: true });

  // sprinkle pines and boulders over open slopes, keeping flats, routes, sight lines and people/items clear
  const keep = (x, y) => inKeep(x, y) || (y <= 9) ||
    m.npcs.concat(m.objs).some(o => Math.abs(o.x - x) + Math.abs(o.y - y) <= 2) ||
    m.npcs.some(n => n.trainer && ((n.dir > 1 && y === n.y && Math.abs(x - n.x) <= n.trainer.sight) || (n.dir < 2 && x === n.x && Math.abs(y - n.y) <= n.trainer.sight))) ||
    [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]].some(([dx, dy]) => m.t[y + dy] && (m.t[y + dy][x + dx] === 'p' || m.t[y + dy][x + dx] === '%' || m.t[y + dy][x + dx] === 'M'));
  for (let y = 10; y < 58; y++) for (let x = 1; x < 63; x++) if (m.t[y][x] === 'g' && !keep(x, y) && hash(x * 3, y) < .13) set(m, x, y, hash(y, x) < .78 ? 'n' : 'r');

  m.labels = [{ x: 32, y: 3, text: 'CLOUDPEAK CASTLE', style: 'home' }];
  m.landing = { x: 24, y: 55 };
  warp(m, 20, 27, 'cloud_cave1', 6, 8, UP); warp(m, 21, 27, 'cloud_cave1', 7, 8, UP);
  warp(m, 50, 11, 'cloud_cave2', 6, 8, UP); warp(m, 51, 11, 'cloud_cave2', 7, 8, UP);
  edgeExit(m, 'W', 30, 'evergreen', 58, 24, gate(1, 'EVERGREEN FOREST'));
  edgeExit(m, 'S', 24, 'ridge', 46, 1, null);
  edgeExit(m, 'E', 20, 'glacier', 1, 20, gate(5, 'GLACIER PASS'));
})();

// ---- caves ----
function cave(id, name, ret, shape) {
  const m = G.mk.newMap(id, name, 14, 10, 'C', { music: 'cave', bg: 'cave', outdoor: false });
  rect(m, 2, 2, 10, 6, 'c'); rect(m, 6, 8, 2, 2, 'c'); rect(m, 3, 1, 8, 1, 'c');
  scatter(m, 'C', shape); scatter(m, 'i', [[2, 2], [11, 2], [2, 7], [11, 7], [6, 1], [8, 1]]);
  warp(m, 6, 9, 'cloudpeak', ret[0], ret[1], DOWN); warp(m, 7, 9, 'cloudpeak', ret[0] + 1, ret[1], DOWN);
  return m;
}
(function () {
  const m = cave('cloud_cave1', 'CLOUDPEAK CAVE', [20, 28], [[5, 4], [9, 5]]);
  m.objs.push({ x: 3, y: 3, id: 'cloudpeak_c1a', item: 'Crystal Shard', qty: 2, ball: true }); m.objs.push({ x: 10, y: 3, id: 'cloudpeak_c1b', item: 'Revive', ball: true });
  npc(m, 5, 6, RIGHT, 'hiker', ['Listen to the crystals hum. This cave goes right through the cliff band.', 'I leave the shards for those who find the nook.']);
})();
(function () {
  const m = cave('cloud_cave2', 'SUMMIT CAVE', [50, 12], [[4, 4], [10, 4]]);
  m.objs.push({ x: 3, y: 6, id: 'cloudpeak_c2a', item: 'Super Potion', qty: 2, ball: true }); m.objs.push({ x: 10, y: 6, id: 'cloudpeak_c2b', item: 'Crystal Shard', ball: true });
  trainer(m, 'cloudpeak_miner1', 6, 3, DOWN, 'kade', { name: 'DUNN', cls: 'MINER', sight: 3, team: [[129, 29], [130, 30], [15, 31]], pre: 'Nobody sneaks into my cave!', win: 'Crushed. Again.', post: 'The shards are in the corners.', prize: 1800 });
})();
})();
