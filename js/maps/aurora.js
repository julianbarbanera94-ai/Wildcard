// AURORA ISLES (north): far north-east isles under the aurora. A ferry pier on the landing isle, rope bridges to four more isles
// of ice crystals and tall grass (Ice, Dragon, Fairy, Psychic, Lv 48-55), and strong trainers.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, npc, sign, trainer, wild, DOWN, UP, LEFT, RIGHT } = G.mk;
const H = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

(function () {
  const m = newMap('aurora', 'AURORA ISLES', 44, 36, 'w', { music: 'cave', biome: 'aurora', banner: true, enc: wild(['Ice', 'Dragon', 'Fairy', 'Psychic'], 48, 55, { pick: 10 }) });
  const blob = (cx, cy, rx, ry, ch, only) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / (rx + .5), dy = (y - cy) / (ry + .5); if (dx * dx + dy * dy <= 1 && (!only || only.includes(m.t[y] && m.t[y][x]))) set(m, x, y, ch); } };
  const bridge = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (m.t[y + j][x + i] === 'w') set(m, x + i, y + j, 'V'); };
  const hash = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
  const patch = (x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (m.t[y + j] && m.t[y + j][x + i] === 'g') set(m, x + i, y + j, ch); };

  // five isles: A landing (SW), B great isle (centre), C crystal isle (NE), D north-west isle, E south-east isle
  const isles = [[10, 27, 8, 5], [22, 16, 9, 6], [36, 10, 6, 5], [9, 9, 6, 4], [34, 28, 6, 4]];
  isles.forEach(([cx, cy, rx, ry]) => { blob(cx, cy, rx + 1, ry + 1, 'y'); });
  isles.forEach(([cx, cy, rx, ry]) => { blob(cx, cy, rx, ry, 'g'); });
  // rope bridges
  bridge(15, 18, 2, 10); bridge(30, 13, 8, 2); bridge(10, 11, 7, 2); bridge(29, 20, 2, 6);
  // pier and dock on the landing isle
  rect(m, 9, 31, 2, 3, 'z'); m.dock = { x: 9, y: 33 };
  scatter(m, 'l', [[8, 31], [11, 31], [8, 29], [12, 29]]);
  npc(m, 10, 33, RIGHT, 'old', null, { still: true, talk: () => G.ferry ? G.ferry('aurora') : G.story.says('The ferry is not running yet.') });
  sign(m, 11, 30, 'AURORA ISLES\nThe lights dance over these isles all night. The wild creatures here are strong. Take care!');

  // ---- Isle A: the landing, a calm flat and a few crystals ----
  rect(m, 4, 25, 6, 5, 'f'); patch(m, 4, 25, 6, 5, 'g'); rect(m, 4, 24, 6, 6, 'g'); scatter(m, 'i', [[3, 27], [16, 26], [17, 29], [5, 31], [14, 31]]);
  rect(m, 14, 24, 3, 2, 'G'); rect(m, 12, 22, 4, 1, 'G');
  m.objs.push({ x: 5, y: 30, id: 'aurora_sp', item: 'Super Potion', qty: 2, ball: true });
  npc(m, 7, 27, DOWN, 'prof', ['The aurora feeds the crystals, and the crystals feed the creatures. Everything here shimmers.', 'Be careful. Even the grass bites.'], { roam: 1 });

  // ---- Isle B: the great isle, tall grass and ice crystal groves ----
  patch(m, 14, 12, 7, 4, 'G'); patch(m, 22, 18, 8, 3, 'G'); patch(m, 24, 10, 6, 3, 'G'); patch(m, 18, 20, 5, 2, 'G'); patch(m, 26, 14, 4, 3, 'G'); patch(m, 15, 16, 3, 1, 'G');
  scatter(m, 'i', [[13, 15], [21, 11], [22, 15], [23, 15], [30, 17], [18, 11], [28, 12], [17, 21], [27, 21], [21, 20]]);
  scatter(m, 'n', [[14, 14], [24, 13], [30, 15], [20, 12], [26, 20]]);
  m.objs.push({ x: 20, y: 14, id: 'aurora_mythic', item: 'Mythic Orb', ball: true });
  m.objs.push({ x: 29, y: 18, id: 'aurora_rev', item: 'Revive', qty: 2, ball: true });
  trainer(m, 'aurora_ace1', 22, 17, LEFT, 'kade', { name: 'ZELDA', cls: 'ELITE', sight: 3, team: [[148, 50], [116, 51], [92, 52], [112, 51]], pre: 'Few reach these isles. Fewer leave undefeated.', win: 'The aurora favours you.', post: 'The crystals only sing for the strong.', prize: 3300 });
  trainer(m, 'aurora_mystic1', 26, 12, DOWN, 'elder', { name: 'ORIN', cls: 'MYSTIC', sight: 3, team: [[92, 51], [72, 52], [107, 53]], pre: 'I read the lights. They said you would come.', win: 'The lights were right.', post: 'Beyond the aurora lies the end of the map.', prize: 3400 });
  npc(m, 18, 14, DOWN, 'camper', ['I saw a Glacitan once. It was huge and cold and it looked right through me.'], { roam: 1 });

  // ---- Isle C: the crystal isle ----
  patch(m, 32, 7, 4, 3, 'G'); patch(m, 36, 12, 5, 2, 'G');
  scatter(m, 'i', [[33, 6], [38, 6], [40, 9], [34, 12], [39, 11], [35, 8], [36, 7]]);
  m.objs.push({ x: 41, y: 8, id: 'aurora_frost', item: 'Frost Orb', qty: 3, ball: true });
  trainer(m, 'aurora_dragon1', 37, 9, DOWN, 'hiker', { name: 'DRAKE', cls: 'DRAGON TAMER', sight: 3, team: [[116, 52], [148, 53], [102, 54]], pre: 'Dragons nest in the crystals here. Want to meet them?', win: 'You tamed my tamers.', post: 'Dragon scales shimmer like the sky.', prize: 3500 });

  // ---- Isle D: the north-west isle ----
  patch(m, 5, 7, 6, 3, 'G'); patch(m, 11, 10, 3, 1, 'G'); scatter(m, 'i', [[4, 9], [13, 8], [7, 12], [12, 7]]);
  m.objs.push({ x: 8, y: 11, id: 'aurora_heal', item: 'Full Heal', qty: 2, ball: true });
  trainer(m, 'aurora_fairy1', 9, 7, DOWN, 'lass', { name: 'LYRA', cls: 'ICE FAIRY', sight: 3, team: [[46, 50], [131, 52], [112, 53], [52, 51]], pre: 'Come dance in the lights with me!', win: 'The dance is over.', post: 'Fairies love the aurora.', prize: 3300 });

  // ---- Isle E: the south-east isle ----
  patch(m, 31, 26, 5, 3, 'G'); patch(m, 36, 29, 3, 2, 'G'); scatter(m, 'i', [[30, 31], [38, 27], [35, 31]]);
  m.objs.push({ x: 38, y: 30, id: 'aurora_shard', item: 'Crystal Shard', qty: 3, ball: true });
  trainer(m, 'aurora_ice1', 34, 28, LEFT, 'camper', { name: 'FRIDA', cls: 'ICE RANGER', sight: 3, team: [[128, 50], [140, 51], [148, 52], [127, 53]], pre: 'The deepest cold lives out here.', win: 'My ice has melted.', post: 'Go home and rest. You earned it.', prize: 3300 });
  npc(m, 33, 31, UP, 'bug', ['I sailed here on the ferry. Nobody told me about the creatures!'], { roam: 1 });

  m.landing = { x: 9, y: 28 };
  m.labels = [{ x: 9, y: 30, text: 'FERRY LANDING', style: 'shop' }];
})();
})();
