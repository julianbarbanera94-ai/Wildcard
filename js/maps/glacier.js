// GLACIER PASS (north): a snowy pass of packed-snow roads between Cloudpeak, Lakeside, Frostmere and the south road to Emberfall.
// Frozen ponds, a frozen waterfall, sealed ice-cave mouths, snow drifts, deep-snow tall grass and skiers.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, warp, npc, sign, trainer, edgeExit, gate, wild, DOWN, UP, LEFT, RIGHT } = G.mk;
const H = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

(function () {
  const m = newMap('glacier', 'GLACIER PASS', 60, 44, 'g', { music: 'route', biome: 'snow', banner: true, enc: wild(['Ice', 'Steel', 'Water'], 32, 38, { pick: 9 }) });
  const blob = (cx, cy, rx, ry, ch, only) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / (rx + .5), dy = (y - cy) / (ry + .5); if (dx * dx + dy * dy <= 1 && (!only || only.includes(m.t[y] && m.t[y][x]))) set(m, x, y, ch); } };
  const keepRects = [[4, 25, 7, 7], [50, 36, 7, 6]];
  const inKeep = (x, y) => keepRects.some(([a, b, w, h]) => x >= a && x < a + w && y >= b && y < b + h);
  const hash = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };

  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
    if (d < 2 || (d === 2 && H(x, y) % 3 === 0)) set(m, x, y, H(x, y) % 4 ? 'n' : '#'); }
  // ice cliffs along the north with a frozen waterfall
  rect(m, 2, 2, 56, 3, 'E'); for (let x = 2; x < 58; x++) if (hash(x, 5) < .25) set(m, x, 5, 'E'); else if (hash(x, 6) < .12) set(m, x, 5, 'r');
  rect(m, 35, 2, 3, 3, '@'); rect(m, 34, 5, 5, 3, 'w'); rect(m, 35, 8, 3, 1, 'w');
  // mid-pass ice ledges
  rect(m, 10, 14, 12, 2, 'E'); for (let x = 10; x < 22; x++) if (hash(x, 14) < .3) set(m, x, 13, 'E'); rect(m, 48, 28, 9, 2, 'E'); for (let x = 48; x < 57; x++) if (hash(x, 28) < .3) set(m, x, 27, 'E');
  // frozen ponds
  blob(10, 9, 5, 2, 'w'); blob(47, 11, 6, 3, 'w'); blob(42, 33, 4, 3, 'w'); blob(14, 38, 4, 2, 'w'); blob(24, 11, 3, 2, 'w');
  // roads of packed snow
  rect(m, 0, 20, 22, 2, 'p'); rect(m, 21, 20, 2, 6, 'p'); rect(m, 21, 24, 20, 2, 'p'); rect(m, 39, 20, 2, 6, 'p'); rect(m, 39, 20, 21, 2, 'p');
  rect(m, 0, 34, 32, 2, 'p'); rect(m, 25, 24, 2, 12, 'p'); rect(m, 30, 34, 2, 10, 'p');
  rect(m, 30, 26, 2, 9, 'p');
  // a bridge over a frozen stream cutting the east road
  rect(m, 44, 15, 2, 11, 'w'); rect(m, 44, 20, 2, 2, 'V');
  // sealed ice-cave mouths (blocked by ice crystals) and glittering crystals
  rect(m, 15, 6, 5, 2, 'C'); set(m, 17, 7, 'M'); scatter(m, 'i', [[16, 8], [17, 8], [18, 8], [14, 7], [20, 7]]);
  rect(m, 52, 4, 4, 2, 'C'); scatter(m, 'i', [[51, 5], [56, 5]]);
  rect(m, 5, 14, 5, 2, 'C'); set(m, 7, 15, 'M'); scatter(m, 'i', [[6, 16], [7, 16], [8, 16], [4, 15]]);
  rect(m, 54, 14, 4, 2, 'C'); set(m, 55, 15, 'M'); scatter(m, 'i', [[55, 16], [56, 16], [53, 15]]);

  // ---- snow drifts (bushes and boulders), flowers of frost, tall grass ----
  const drift = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j; if (m.t[Y][X] === 'g' && !inKeep(X, Y) && H(X, Y) % 100 < 55) set(m, X, Y, H(X, Y) % 3 ? 'u' : 'r'); } };
  [[3, 8, 4, 3], [26, 14, 6, 2], [37, 14, 5, 2], [4, 38, 6, 3], [18, 40, 8, 2], [36, 40, 10, 2], [8, 28, 3, 2]].forEach(a => drift(...a));
  // deep-snow tall grass patches
  const gr = [[3, 17, 14, 3], [24, 16, 10, 3], [34, 27, 11, 3], [3, 24, 7, 1], [10, 36, 10, 3], [40, 37, 8, 4], [48, 22, 10, 4], [44, 3 + 3, 3, 3], [22, 28, 4, 5], [46, 31, 4, 3], [4, 40, 6, 2], [31 + 3, 30, 5, 3], [12, 22, 8, 3], [26, 20, 5, 1]];
  gr.forEach(([x, y, w, h]) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (m.t[y + j] && m.t[y + j][x + i] === 'g') set(m, x + i, y + j, 'G'); });
  // open flats for building
  rect(m, 4, 25, 7, 7, 'g'); rect(m, 50, 36, 7, 6, 'g');
  scatter(m, 'F', [[3, 24], [11, 24], [3, 32], [11, 32]]);
  sign(m, 6, 24, 'BUILDING PLOT\nA calm patch of snow. Bring warm planks.');

  // ---- signs ----
  sign(m, 3, 22, 'GLACIER PASS\nThe cold road between the peaks and the ice city. Tall snow hides Ice, Steel and Water creatures.');
  sign(m, 27, 33, 'CROSSROADS\nWest: Lakeside Town  |  North-west: Cloudpeak  |  East: Frostmere City  |  South: Emberfall.');
  sign(m, 57, 22, 'FROSTMERE CITY\nThe ice palace shines at the end of this road.');
  // ---- items ----
  m.objs.push({ x: 2, y: 30, id: 'glacier_sp', item: 'Super Potion', ball: true });
  m.objs.push({ x: 30, y: 7, id: 'glacier_frost', item: 'Frost Orb', qty: 2, ball: true });
  m.objs.push({ x: 55, y: 7, id: 'glacier_rev', item: 'Revive', ball: true });
  m.objs.push({ x: 46, y: 40, id: 'glacier_heal', item: 'Full Heal', ball: true });
  m.objs.push({ x: 12, y: 41, id: 'glacier_shard', item: 'Crystal Shard', qty: 2, ball: true });
  // ---- skiers and other trainers ----
  trainer(m, 'glacier_skier1', 10, 23, UP, 'lass', { name: 'ELSA', cls: 'SKIER', sight: 2, team: [[57, 32], [147, 33], [139, 34]], pre: 'Fresh powder! Let me carve you up!', win: 'I wiped out.', post: 'The long grass is deep. Ice creatures hide inside.', prize: 2000 });
  trainer(m, 'glacier_skier2', 34, 22, DOWN, 'camper', { name: 'JORN', cls: 'SKIER', sight: 1, team: [[126, 33], [36, 34], [149, 35]], pre: 'I came for the slopes. Stay for the battle?', win: 'Chilled to the bone.', post: 'Frostmere has an Ice Arena. Bring fire!', prize: 2100 });
  trainer(m, 'glacier_boarder1', 47, 19, LEFT, 'kid', { name: 'PIP', cls: 'SNOWBOARDER', sight: 2, team: [[139, 34], [152, 35], [58, 35]], pre: 'Hey! Watch my backflip!', win: 'Landed on my face.', post: 'The frozen stream is slippery on the bridge.', prize: 2200 });
  trainer(m, 'glacier_ranger1', 16, 32, DOWN, 'hiker', { name: 'MARA', cls: 'RANGER', sight: 2, team: [[135, 35], [136, 36], [149, 36]], pre: 'Steel and ice make an unbeatable pair!', win: 'Perhaps not unbeatable.', post: 'Rust loves the wet air here.', prize: 2300 });
  trainer(m, 'glacier_runner1', 36, 38, LEFT, 'kade', { name: 'VAL', cls: 'ICE DANCER', sight: 4, team: [[140, 36], [127, 37], [150, 38]], pre: 'The ice is my stage. Will you dance?', win: 'An encore for you.', post: 'The south road leads to the volcano. Hot and cold!', prize: 2400 });
  // ---- villagers ----
  npc(m, 29, 32, RIGHT, 'old', ['This crossroads is where all the pass roads meet. Which way will you go?'], { still: true });
  npc(m, 40, 21, DOWN, 'girl', ['Frostmere is just east. You can see the crystal palace from the ridge.'], { roam: 1 });
  npc(m, 5, 20, UP, 'hiker', ['The caves in the cliffs are sealed with ice. No one has been inside for years.'], { still: true });
  npc(m, 52, 24, LEFT, 'bug', ['I can see my breath! And the creatures in the grass can see me.'], { roam: 1 });

  // sprinkle pines and boulders, keeping flats, roads, sight lines and people clear
  const keep = (x, y) => inKeep(x, y) || (y < 8) ||
    m.npcs.concat(m.objs).some(o => Math.abs(o.x - x) + Math.abs(o.y - y) <= 2) ||
    m.npcs.some(n => n.trainer && ((n.dir > 1 && y === n.y && Math.abs(x - n.x) <= n.trainer.sight) || (n.dir < 2 && x === n.x && Math.abs(y - n.y) <= n.trainer.sight))) ||
    [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => m.t[y + dy] && (m.t[y + dy][x + dx] === 'p' || m.t[y + dy][x + dx] === 'V'));
  for (let y = 8; y < 42; y++) for (let x = 2; x < 58; x++) if (m.t[y][x] === 'g' && !keep(x, y) && hash(x * 3, y) < .22) set(m, x, y, hash(y, x) < .8 ? 'n' : 'r');

  m.landing = { x: 30, y: 36 };
  edgeExit(m, 'S', 30, 'emberfall', 1, 20, gate(6, 'EMBERFALL VOLCANO'), 'y');
  edgeExit(m, 'W', 34, 'lakeside', 54, 22, null);
  edgeExit(m, 'W', 20, 'cloudpeak', 62, 20, gate(3, 'CLOUDPEAK MOUNTAINS'));
  edgeExit(m, 'E', 20, 'frostmere', 1, 24, gate(5, 'FROSTMERE CITY'));
})();
})();
