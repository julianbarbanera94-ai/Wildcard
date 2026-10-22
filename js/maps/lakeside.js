// LAKESIDE TOWN (north): a meadow town wrapped around a big lake. Piers, boathouses, a gazebo island, a waterfall from the cliffs,
// a Healing Centre, the Lakeside Marina shop and the Lakeside Arena (Water, Tide Badge).
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, interior, warp, npc, sign, trainer, edgeExit, gate, DOWN, UP, LEFT, RIGHT } = G.mk;
const H = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, {
  lakeside: { name: 'LAKESIDE MARINA', place: 'LAKESIDE TOWN', color: '#3a9ad8', greet: 'Welcome to the Marina! Tide-tested supplies for every Warden.', bye: 'Fair winds!',
    stock: [{ item: 'Potion', cat: 'MEDICINE' }, { item: 'Super Potion', cat: 'MEDICINE' }, { item: 'Full Heal', cat: 'MEDICINE' }, { item: 'Revive', cat: 'MEDICINE' },
      { item: 'Terra Orb', cat: 'ORBS' }, { item: 'Pulse Orb', cat: 'ORBS' }, { item: 'Aqua Orb', cat: 'ORBS' }, { item: 'Gale Orb', cat: 'ORBS' }],
    sells: 'all', rate: .5 },
});

(function () {
  const m = newMap('lakeside', 'LAKESIDE TOWN', 56, 46, 'g', { music: 'town', biome: 'meadow', enc: null });
  const blob = (cx, cy, rx, ry, ch, only) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / (rx + .5), dy = (y - cy) / (ry + .5); if (dx * dx + dy * dy <= 1 && (!only || only.includes(m.t[y] && m.t[y][x]))) set(m, x, y, ch); } };
  const grove = (x, y, w, h, chs, pct) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j, k = H(X, Y);
    if (m.t[Y] && m.t[Y][X] === 'g' && k % 100 < pct) set(m, X, Y, chs[(k >>> 8) % chs.length]); } };

  // forest edge
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
    if (d < 2 || (d === 2 && H(x, y) % 3 === 0)) set(m, x, y, H(x, y) % 5 < 2 ? 'n' : '#'); }
  // cliffs along the north with two waterfalls
  rect(m, 2, 2, 52, 3, 'E'); for (let x = 2; x < 54; x++) if (H(x, 5) % 4 === 0) set(m, x, 5, 'r');
  rect(m, 38, 2, 3, 3, '@'); rect(m, 14, 2, 2, 3, '@'); rect(m, 14, 5, 2, 3, 'w'); rect(m, 38, 5, 3, 3, 'w');
  scatter(m, 'r', [[37, 5], [41, 5], [13, 5], [16, 5]]);
  // the lake
  blob(28, 12, 19, 7, 'w'); blob(14, 15, 6, 5, 'w'); blob(43, 15, 6, 5, 'w');
  // sandy banks
  for (let y = 4; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) if (m.t[y][x] === 'g' && y < 24) {
    let near = false; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (m.t[y + j] && m.t[y + j][x + i] === 'w') near = true; if (near) set(m, x, y, 'y'); }
  // the gazebo island and its bridge
  blob(28, 12, 5, 4, 'y'); blob(28, 12, 4, 3, 'g');
  building(m, 27, 9, 3, 'Q', 1);                                   // gazebo, door (28,11)
  rect(m, 28, 12, 2, 4, 'p'); rect(m, 28, 16, 2, 7, 'V'); rect(m, 28, 23, 2, 1, 'p');
  scatter(m, 'f', [[25, 12], [26, 13], [31, 12], [30, 13], [25, 11], [31, 11]]); scatter(m, 'l', [[27, 13], [30, 15]]); scatter(m, '#', [[25, 14], [31, 14]]); scatter(m, 'u', [[26, 11], [30, 11]]);
  // main road
  rect(m, 0, 24, 56, 2, 'p'); rect(m, 52, 22, 2, 3, 'p'); rect(m, 54, 22, 2, 2, 'p'); rect(m, 2, 6, 2, 18, 'p');
  // piers (boardwalk) with boathouses on the shore
  rect(m, 13, 14, 2, 10, 'z'); rect(m, 44, 14, 2, 10, 'z'); rect(m, 22, 17, 2, 7, 'z'); rect(m, 34, 17, 2, 7, 'z');
  building(m, 16, 21, 5, 'Q', -1); building(m, 6, 21, 5, 'R', -1); building(m, 47, 21, 5, 'Q', -1); building(m, 37, 21, 5, 'R', -1);   // boathouses with doors toward the road
  set(m, 18, 23, 'D');
  scatter(m, 'd', [[15, 19], [16, 19], [43, 19], [46, 19], [21, 20], [24, 20], [33, 20], [36, 20]]);
  scatter(m, 'l', [[22, 17], [35, 17]]);
  // plaza avenue and the Arena
  rect(m, 20, 26, 2, 14, '%'); rect(m, 33, 26, 2, 14, '%'); rect(m, 20, 32, 15, 4, '%');
  building(m, 23, 29, 9, 'U', 4);                                   // Lakeside Arena, door (27,31)
  rect(m, 24, 26, 7, 3, 'g'); rect(m, 24, 26, 7, 1, 'f'); scatter(m, 'u', [[24, 28], [30, 28]]); scatter(m, 'l', [[23, 27], [31, 27]]); rect(m, 27, 26, 1, 3, 'p');
  scatter(m, 'l', [[22, 32], [32, 32], [22, 35], [32, 35]]);
  // Healing Centre and Marina
  building(m, 10, 29, 7, 'R', 3); rect(m, 13, 26, 1, 3, 'p'); rect(m, 13, 32, 1, 1, 'p'); rect(m, 12, 33, 8, 1, 'p'); scatter(m, 'l', [[11, 32], [15, 32]]);
  building(m, 38, 29, 7, 'Q', 3); rect(m, 41, 26, 1, 3, 'p'); rect(m, 41, 32, 1, 1, 'p'); rect(m, 35, 33, 7, 1, 'p'); scatter(m, 'l', [[39, 32], [43, 32]]);
  // houses and the southern road
  rect(m, 4, 39, 48, 2, 'p');
  building(m, 8, 36, 5, 'R', 2); building(m, 44, 36, 5, 'Q', 2);   // enterable: doors (10,38), (46,38)
  building(m, 15, 36, 5, 'Q', -1); building(m, 36, 36, 5, 'R', -1);
  rect(m, 10, 33, 1, 3, 'p'); rect(m, 46, 33, 1, 3, 'p'); rect(m, 10, 33, 3, 1, 'p'); rect(m, 44, 33, 3, 1, 'p');
  rect(m, 22, 40, 12, 1, 'f'); rect(m, 22, 41, 12, 2, 'g');
  rect(m, 6, 41, 1, 1, 'f'); rect(m, 14, 42, 6, 1, 'F'); rect(m, 15, 43, 4, 1, 'j'); rect(m, 37, 42, 6, 1, 'F'); rect(m, 38, 43, 4, 1, 'j');
  // open building plots (kept clear)
  rect(m, 3, 27, 6, 7, 'g'); rect(m, 47, 27, 6, 7, 'g');
  scatter(m, 'F', [[2, 26], [9, 26], [2, 34], [9, 34], [46, 26], [53, 26], [46, 34], [53, 34]]);
  sign(m, 5, 26, 'BUILDING PLOT\nOpen lakeside ground for a Warden to build on.'); sign(m, 50, 26, 'BUILDING PLOT\nOpen lakeside ground for a Warden to build on.');
  // scenery
  grove(2, 6, 10, 16, ['#', 'n', 'u', 'f'], 18); grove(43, 6, 10, 15, ['#', 'n', 'u', 'f'], 18); grove(2, 35, 6, 8, ['#', 'u'], 25); grove(50, 36, 5, 8, ['#', 'u'], 25);
  grove(14, 42, 30, 3, ['#', 'u', 'f'], 14);
  rect(m, 4, 7, 2, 4, 'g'); rect(m, 3, 8, 5, 3, 'f');

  // signs
  sign(m, 22, 25, 'LAKESIDE TOWN\nWhere the mountain water comes to rest. The Arena is just south of the road.');
  sign(m, 33, 25, 'LAKESIDE ARENA\nWater-type Leader. Win the TIDE BADGE.');
  sign(m, 36, 23, 'MARINA PIER\nNo swimming past the buoys!');
  m.objs.push({ x: 1, y: 24, fn: () => G.story.says('To the west: the Ridge and Lanternrest.') });
  sign(m, 53, 21, 'GLACIER PASS\nEast: a cold road to Frostmere. You will need five badges.');
  // items
  m.objs.push({ x: 25, y: 13, id: 'lake_gz', item: 'Super Potion', ball: true });
  m.objs.push({ x: 45, y: 14, id: 'lake_orb', item: 'Aqua Orb', qty: 2, ball: true });
  m.objs.push({ x: 4, y: 8, id: 'lake_rev', item: 'Revive', ball: true });
  m.objs.push({ x: 51, y: 31, id: 'lake_heal', item: 'Full Heal', ball: true });
  // trainers (a couple of anglers; the town itself has no wild grass)
  trainer(m, 'lakeside_angler1', 44, 16, UP, 'camper', { name: 'FINN', cls: 'ANGLER', sight: 3, team: [[32, 17], [41, 19]], pre: 'Shh! You will scare the fish. ...Or you could battle me.', win: 'You scared the fish AND my team!', post: 'The big ones bite near the waterfall.', prize: 1100 });
  trainer(m, 'lakeside_swimmer1', 14, 17, UP, 'lass', { name: 'MARI', cls: 'SWIMMER', sight: 3, team: [[55, 18], [32, 19], [34, 20]], pre: 'The water is perfect today. So is my team!', win: 'I got all wet!', post: 'Try the pier at dusk. The lake glows.', prize: 1200 });
  trainer(m, 'lakeside_ace1', 36, 34, LEFT, 'kade', { name: 'ORLO', cls: 'ARENA HOPEFUL', sight: 4, team: [[41, 20], [58, 21], [34, 22]], pre: 'I am training for the Tide Arena. Mind if I practise on you?', win: 'Back to the lake for me.', post: 'The Leader floods the floor. Watch your footing!', prize: 1300 });
  // villagers
  npc(m, 27, 33, DOWN, 'kid', ['The Arena Leader loves water creatures. Her team soaks everyone!', 'My dad says you need two badges before the Glacier road. Five, actually.'], { roam: 1 });
  npc(m, 18, 27, RIGHT, 'old', ['This lake feeds every stream in the vale. The waterfall at the north cliff never stops.'], { still: true });
  npc(m, 29, 20, DOWN, 'girl', ['The gazebo on the island is the best view in town. Walk out over the bridge!'], { still: true });
  npc(m, 6, 24, UP, 'hiker', ['The Ridge to the west is a rough climb. Cloudpeak is beyond it.', 'If you go up there, bring plenty of potions.'], { roam: 1 });
  npc(m, 45, 25, DOWN, 'bug', ['The boathouses hold canoes. Nobody is allowed to borrow them. I tried.'], { roam: 1 });
  npc(m, 30, 37, LEFT, 'mom', ['Our town keeps the Healing Centre open all night. Anyone may rest here.'], { roam: 1 });
  npc(m, 40, 27, DOWN, 'clerk', ['The Marina stocks Aqua Orbs. Water creatures love the shiny ones.'], { still: true });
  npc(m, 13, 37, RIGHT, 'camper', ['Frostmere is far east past Glacier Pass. Cold, so cold.'], { roam: 1 });
  npc(m, 51, 38, DOWN, 'old', ['At night the lake mirrors the stars. I come out here every evening.'], { roam: 1 });
  npc(m, 29, 42, UP, 'boy', ['I am saving for a Pulse Orb. The Marina sells them!'], { roam: 1 });

  m.labels = [
    { x: 13, y: 29, text: 'HEALING CENTRE', style: 'heal' }, { x: 41, y: 29, text: 'LAKESIDE MARINA', style: 'shop' },
    { x: 27, y: 29, text: 'LAKESIDE ARENA', style: 'arena' }, { x: 28, y: 9, text: 'GAZEBO', style: 'home' },
  ];
  m.landing = { x: 27, y: 27 };

  warp(m, 27, 31, 'arena_lakeside', 0, 0, UP);
  warp(m, 13, 31, 'lake_heal', 3, 5, UP); warp(m, 41, 31, 'lake_shop', 3, 5, UP);
  warp(m, 28, 11, 'lake_gazebo', 3, 4, UP);
  warp(m, 10, 38, 'lake_house1', 3, 5, UP); warp(m, 46, 38, 'lake_house2', 3, 5, UP);
  warp(m, 18, 23, 'lake_boat', 3, 4, UP);
  // exits (kept as in docs/WORLD.md; the Ridge end moved down to y 45)
  edgeExit(m, 'W', 24, 'ridge', 50, 45, null);
  edgeExit(m, 'E', 22, 'glacier', 1, 34, gate(5, 'GLACIER PASS'));
})();

// ---- interiors ----
(function () {
  const m = interior('lake_heal', 'HEALING CENTRE', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); set(m, 1, 1, 'h'); rect(m, 5, 4, 2, 1, 'a'); set(m, 1, 5, 't');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 6, 5, LEFT, 'girl', ['Lakeside nurses never close. Even the fish get a checkup.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING CENTRE', free: true }) : G.story.nurse() });
  warp(m, 3, 6, 'lakeside', 13, 32, DOWN);
})();
(function () {
  const m = interior('lake_shop', 'LAKESIDE MARINA', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); rect(m, 1, 1, 1, 3, 'S'); scatter(m, 'x', [[6, 1], [6, 5]]);
  npc(m, 4, 1, DOWN, 'clerk', null, { still: true });
  npc(m, 5, 4, LEFT, 'boy', ['Aqua Orbs go fast in summer. Everyone wants a water partner.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Shop', fn: () => G.openShop ? G.openShop('lakeside') : G.story.says('The Marina is closed for stocktaking.') });
  warp(m, 3, 6, 'lakeside', 41, 32, DOWN);
})();
(function () {
  const m = interior('lake_gazebo', 'LAKE GAZEBO', 6, 6, 3);
  rect(m, 1, 1, 1, 2, 't'); rect(m, 3, 3, 2, 1, 'a');
  npc(m, 4, 2, LEFT, 'elder', ['The whole lake can be seen from here. It is deeper than anyone knows.', 'They say a great water creature sleeps in the middle.']);
  m.objs.push({ x: 1, y: 4, id: 'lake_gz2', item: 'Aqua Orb', ball: true });
  warp(m, 3, 5, 'lakeside', 28, 12, DOWN);
})();
(function () {
  const m = interior('lake_house1', 'LAKESIDE HOUSE', 8, 7, 3);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 3, 1, 'a'); scatter(m, 'S', [[4, 1]]);
  npc(m, 5, 4, LEFT, 'mom', ['We keep a window open over the water. Fresh air, fresh fish!', 'The Arena Leader trains at dawn. She is strict.']);
  warp(m, 3, 6, 'lakeside', 10, 39, DOWN);
})();
(function () {
  const m = interior('lake_house2', 'LAKESIDE HOUSE', 8, 7, 3);
  set(m, 1, 1, 'b'); set(m, 2, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 3, 1, 'a'); scatter(m, 'S', [[6, 1]]);
  npc(m, 2, 4, RIGHT, 'old', ['I fished this lake for fifty years. The biggest catch was a boot.', 'The bridge to the gazebo was built by the whole town.']);
  warp(m, 3, 6, 'lakeside', 46, 39, DOWN);
})();
(function () {
  const m = interior('lake_boat', 'BOATHOUSE', 8, 6, 3);
  scatter(m, 'x', [[1, 1], [2, 1], [6, 1], [6, 2]]); rect(m, 2, 3, 4, 1, 'a');
  npc(m, 4, 2, DOWN, 'camper', ['The canoes are being repainted. Come back after the Tide Badge!']);
  warp(m, 3, 5, 'lakeside', 18, 24, DOWN);
})();
})();
