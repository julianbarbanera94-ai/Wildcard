// EMBERFALL VOLCANO (56x52): a smoking cone with a lava crater, lava rivers crossed by bridges, an ash field and the base camp
// (Healing Centre, Outfitters, Emberfall Arena: Fire, Magma Badge).
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, interior, warp, npc, sign, trainer, edgeExit, gate, wild, DOWN, UP, LEFT, RIGHT } = G.mk;

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 1 && y > 1 && x < m.w - 2 && y < m.h - 2 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
  }
}
// width-w trail through axis-aligned waypoints; `lava` crossings become bridges when ch is a road
function path(m, pts, ch = 'p', w = 2) {
  const put = (x, y) => { for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue; set(m, X, Y, ch === 'p' && (m.t[Y][X] === '!' || m.t[Y][X] === 'V') ? 'V' : ch); } };
  for (let i = 0; i < pts.length - 1; i++) {
    let [x, y] = pts[i]; const [tx, ty] = pts[i + 1];
    put(x, y);
    while (x !== tx) { x += Math.sign(tx - x); put(x, y); }
    while (y !== ty) { y += Math.sign(ty - y); put(x, y); }
  }
}
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id: 'emberfall_' + id, item: name, ball: true }, qty ? { qty } : {}));

G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, {
  emberoutfit: { name: 'EMBER OUTFITTERS', place: 'EMBERFALL', color: '#e0583a', greet: 'Welcome to base camp! Everything a Warden needs for the hot road.', bye: 'Stay out of the lava!',
    stock: [{ item: 'Super Potion', cat: 'MEDICINE' }, { item: 'Full Heal', cat: 'MEDICINE' }, { item: 'Revive', cat: 'MEDICINE' }, { item: 'Herb Salve', cat: 'MEDICINE' },
      { item: 'Flare Orb', cat: 'ORBS' }, { item: 'Stone Orb', cat: 'ORBS' }, { item: 'Pulse Orb', cat: 'ORBS' }, { item: 'Void Orb', cat: 'ORBS' },
      { item: 'Coal', cat: 'METAL' }, { item: 'Iron Ingot', cat: 'METAL' }, { item: 'Spicy Treat', cat: 'TREATS' }],
    sells: ['Coal', 'Iron Ore', 'Copper Ore', 'Iron Ingot', 'Copper Ingot', 'Crystal Shard'], rate: .6 },
});

(function () {
  const m = newMap('emberfall', 'EMBERFALL VOLCANO', 56, 52, 'g', { music: 'cave', biome: 'volcano', enc: wild(['Fire', 'Rock', 'Dragon', 'Steel'], 38, 44, { pick: 8 }) });
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y), k = hash(x, y);
    if (d < 2) set(m, x, y, k < .5 ? '#' : 'r'); else if (d === 2 && k < .3) set(m, x, y, k < .12 ? '#' : 'r');
  }
  // ---- Scorched grass ----
  blob(m, 8, 10, 4.5, 3, 'G', ['g']); blob(m, 47, 11, 3.5, 3, 'G', ['g']); blob(m, 6, 25, 3.6, 3, 'G', ['g']); blob(m, 26, 27, 4.5, 2.6, 'G', ['g']);
  blob(m, 51, 27, 3, 3.2, 'G', ['g']); blob(m, 38, 47, 5, 2.3, 'G', ['g']); blob(m, 16, 47, 5, 2.3, 'G', ['g']); blob(m, 8, 36, 2.5, 3, 'G', ['g']);
  // ---- The volcano: a big cone with a glowing crater, and a smaller vent in the north-east ----
  blob(m, 28, 9, 13, 6, 'E', null, .1); blob(m, 28, 8, 5.2, 2.2, '!', null, .06);
  blob(m, 47, 5, 5, 3, 'E', null, .1); blob(m, 47, 5, 2, 1.1, '!', null, 0);
  blob(m, 8, 4, 4, 2.2, 'E', null, .1);
  // ---- Lava rivers ----
  path(m, [[22, 15], [22, 17], [18, 17], [18, 30], [10, 30], [10, 40]], '!');
  path(m, [[36, 15], [36, 17], [40, 17], [40, 30], [47, 30], [47, 38]], '!');
  blob(m, 11, 43, 3.2, 2.2, '!', null, .1); blob(m, 47, 41, 3.2, 2.2, '!', null, .1);
  blob(m, 4, 18, 1.3, 1.1, '!', null, 0);
  // ash field: black rocks scattered between the rivers
  for (let i = 0; i < 80; i++) { const x = 3 + Math.floor(hash(i, 5) * 50), y = 3 + Math.floor(hash(5, i) * 46); if (m.t[y][x] === 'g') set(m, x, y, hash(i, 1) < .6 ? 'r' : hash(i, 8) < .5 ? 'd' : '#'); }
  // ---- Roads (crossing lava on bridges) ----
  path(m, [[0, 20], [34, 20], [52, 20], [52, 46]]);
  path(m, [[34, 18], [34, 38]]);
  path(m, [[30, 50], [30, 40]]);
  
  path(m, [[12, 20], [12, 12]]); path(m, [[25, 20], [25, 24]]); path(m, [[52, 8], [52, 20]]);
  // crater foot: a lookout at the end of the north road, in front of the cone
  rect(m, 32, 16, 6, 2, 'p'); set(m, 28, 14, 'M'); set(m, 29, 14, 'M');
  scatter(m, 'l', [[33, 18], [37, 18]]);

  // ---- Base camp (x 13..45, y 33..44) ----
  rect(m, 13, 36, 33, 8, 'p'); rect(m, 29, 44, 3, 6, 'p');
  building(m, 14, 33, 5, 'R', 2);                                // Healing Centre, door (16,35)
  building(m, 22, 33, 9, 'U', 4);                                // Emberfall Arena, door (26,35)
  building(m, 38, 33, 5, 'Q', 2);                                // Ember Outfitters, door (40,35)
  building(m, 44, 33, 4, 'W', -1);
  rect(m, 16, 36, 1, 1, 'p'); rect(m, 26, 36, 1, 1, 'p'); rect(m, 40, 36, 1, 1, 'p');
  scatter(m, 'l', [[13, 36], [20, 36], [32, 36], [37, 36], [43, 36], [29, 41], [33, 41]]);
  scatter(m, 'x', [[18, 40], [19, 40], [42, 40], [43, 40], [43, 41]]); scatter(m, 'F', [[13, 44], [14, 44], [15, 44], [16, 44], [17, 44], [18, 44], [19, 44], [20, 44], [21, 44], [22, 44], [23, 44], [24, 44], [25, 44], [26, 44], [27, 44], [33, 44], [34, 44], [35, 44], [36, 44], [37, 44], [38, 44], [39, 44], [40, 44], [41, 44], [42, 44], [43, 44], [44, 44], [45, 44]]);
  scatter(m, 'r', [[14, 42], [15, 43], [44, 42], [45, 43]]);
  // keep roads open
  rect(m, 29, 40, 2, 11, 'p');

  // ---- Signs ----
  sign(m, 32, 38, 'EMBERFALL BASE CAMP\nHealing Centre, Outfitters and the Arena. The last warm bed before the crater.');
  sign(m, 36, 19, 'THE CRATER\nThe lookout is straight ahead. Do not lean on the railing.');
  sign(m, 2, 22, 'GLACIER PASS\nWest, beyond the cold ridges. Five Arena Badges needed.');
  sign(m, 32, 47, 'CRIMSON BADLANDS\nSouth, down the canyon.');
  sign(m, 15, 21, 'LAVA CROSSING\nStay on the bridge. The river moves in the night.');
  // ---- Items ----
  item(m, 4, 14, 'flare', 'Flare Orb', 2); item(m, 52, 4, 'sp', 'Super Potion', 2); item(m, 55 - 2, 34, 'revive', 'Revive'); item(m, 4, 47, 'coal', 'Coal', 3);
  item(m, 22, 25, 'crystal', 'Crystal Shard', 2); item(m, 44, 24, 'heal', 'Full Heal'); item(m, 21, 47, 'pulse', 'Pulse Orb');
  // ---- Trainers (Lv 38-44) ----
  trainer(m, 'emberfall_fire1', 10, 19, DOWN, 'camper', { name: 'CINDER', cls: 'FIRE BREATHER', sight: 4, team: [[117, 38], [146, 40], [134, 41]], pre: 'Hot enough for you? It is about to get hotter!', win: 'Burnt out...', post: 'The crater glows brightest at night.', prize: 60 });
  trainer(m, 'emberfall_steel1', 33, 28, RIGHT, 'hiker', { name: 'HOLT', cls: 'FORGE WORKER', sight: 4, team: [[136, 40], [125, 41], [150, 42]], pre: 'We forge in lava here. Want to test your mettle?', win: 'Cracked my steel.', post: 'Lava-forged steel never dulls.', prize: 60 });
  trainer(m, 'emberfall_dragon1', 44, 19, DOWN, 'kade', { name: 'DRAKE', cls: 'DRAGON TAMER', sight: 5, team: [[114, 40], [116, 43], [115, 42], [116, 44]], pre: 'Dragons nest in the warm rock. Face them if you dare!', win: 'A dragon bows to you.', post: 'The big ones sleep deep under the crater.', prize: 70 });
  trainer(m, 'emberfall_ranger1', 29, 47, RIGHT, 'bug', { name: 'MAGDA', cls: 'VOLCANO RANGER', sight: 4, team: [[145, 39], [118, 41], [132, 40]], pre: 'Nobody climbs without a ranger\'s permission!', win: 'Permission granted.', post: 'Watch for ash storms. Keep to the bridges.', prize: 60 });
  trainer(m, 'emberfall_hiker1', 53, 12, LEFT, 'old', { name: 'OLD EMBER', cls: 'CLIMBER', sight: 4, team: [[119, 42], [151, 41], [134, 43]], pre: 'I have scaled this mountain a hundred times.', win: 'One more peak to climb.', post: 'The vent in the north-east smokes more every year.', prize: 70 });
  // ---- Camp folks ----
  npc(m, 28, 38, DOWN, 'old', ['The Emberfall Arena is the last of the eight. Its Leader burns brighter than the crater.', 'Win the Magma Badge and you have all eight.'], { still: true });
  npc(m, 18, 38, RIGHT, 'mom', ['Our Healing Centre is the warmest room on the mountain, and it is not because of the lava!'], { roam: 1 });
  npc(m, 36, 40, DOWN, 'kid', ['I saw a bird made of fire fly over the crater!'], { roam: 1 });
  npc(m, 42, 38, LEFT, 'camper', ['The Outfitters sells Flare Orbs and Coal. Everything burns twice as hot up here.'], { still: true });
  npc(m, 31, 23, DOWN, 'hiker', ['Cross the bridges, never swim. And never, ever, ever touch the red river.'], { still: true });
  npc(m, 22, 22, UP, 'girl', ['Black glass everywhere! The ash field is the best place to look for treasure.'], { roam: 1 });
  m.labels = [{ x: 16, y: 33, text: 'HEALING CENTRE', style: 'heal' }, { x: 26, y: 33, text: 'EMBERFALL ARENA', style: 'arena' }, { x: 40, y: 33, text: 'EMBER OUTFITTERS', style: 'shop' }];
  m.landing = { x: 30, y: 38 };
  warp(m, 16, 35, 'emberheal', 3, 5, UP); warp(m, 40, 35, 'emberoutfit', 3, 5, UP); warp(m, 26, 35, 'arena_emberfall', 0, 0, UP);
  edgeExit(m, 'S', 30, 'badlands', 30, 1, null);
  edgeExit(m, 'W', 20, 'glacier', 30, 42, gate(5, 'GLACIER PASS'), 'x');
  rect(m, 30, 49, 2, 3, 'p'); rect(m, 0, 20, 3, 2, 'p');
})();

(function () {
  const m = interior('emberheal', 'EMBERFALL HEALING CENTRE', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); set(m, 1, 1, 'h'); scatter(m, 'S', [[6, 1]]); rect(m, 5, 4, 2, 1, 'a'); set(m, 1, 5, 't');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 6, 5, LEFT, 'hiker', ['I climbed all the way to the crater. My team deserves a rest!']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING CENTRE', free: true }) : G.story.nurse() });
  warp(m, 3, 6, 'emberfall', 16, 36, DOWN);
})();
(function () {
  const m = interior('emberoutfit', 'EMBER OUTFITTERS', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); scatter(m, 'S', [[1, 1], [1, 2], [6, 1]]); scatter(m, 'x', [[1, 4], [6, 4]]); set(m, 6, 5, 't');
  npc(m, 4, 1, DOWN, 'clerk', null, { still: true });
  npc(m, 1, 5, RIGHT, 'camper', ['A Flare Orb is the best thing against a frozen creature. A Stone Orb is best against everything else.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Shop', fn: () => G.openShop ? G.openShop('emberoutfit') : G.story.says('The shelves are bare today.') });
  warp(m, 3, 6, 'emberfall', 40, 36, DOWN);
})();
})();
