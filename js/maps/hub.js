// Lanternrest (hub village) and its interiors: cottage, shrine, lodge, post, tower.
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

// ---- Lanternrest: the hub village. Four roads lead out; the Hollow gate opens after the relight. ----
// Layout (60 x 52): a sand plaza around the Great Lantern in the middle, four winding sand roads to the
// map edges, homes and gardens to the northwest, the Hearth Shrine in a pine grove to the northeast,
// the pond and flower fields to the southwest, the Trading Post and the Hollow Gate to the southeast,
// and three open BUILDING PLOTS (NE, SW, SE) left as clear grass for player structures.
(function () {
  const m = newMap('lanternrest', 'LANTERNREST', 60, 52, 'g', { music: 'town' });
  const H = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  // Fill a rectangle with a deterministic mix of scenery, only over plain grass.
  const grove = (x, y, w, h, chs, pct) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j, k = H(X, Y); if (m.t[Y] && m.t[Y][X] === 'g' && k % 100 < pct) set(m, X, Y, chs[(k >>> 8) % chs.length]); } };
  // 2-wide road through axis-aligned waypoints (each point is the top-left of the 2x2 brush).
  const road = (pts, ch) => { for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    rect(m, Math.min(ax, bx), Math.min(ay, by), Math.abs(ax - bx) + 2, Math.abs(ay - by) + 2, ch || 'y'); } };

  // Forest edge: two rows of mixed round trees and pines all round.
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
    if (d < 2 || (d === 2 && H(x, y) % 3 === 0)) set(m, x, y, H(x, y) % 5 < 2 ? 'n' : '#');
  }

  // Central plaza around the Great Lantern (rounded corners).
  rect(m, 20, 16, 20, 15, 'y'); rect(m, 21, 15, 18, 1, 'y'); rect(m, 21, 31, 18, 1, 'y');
  // Winding sand roads to the four exits.
  road([[0, 24], [8, 24], [8, 21], [14, 21], [14, 24], [20, 24]]);
  road([[38, 24], [44, 24], [44, 21], [51, 21], [51, 24], [58, 24]]);
  road([[28, 0], [28, 5], [31, 5], [31, 10], [28, 10], [28, 15]]);
  road([[28, 31], [28, 36], [25, 36], [25, 43], [28, 43], [28, 50]]);
  // Branch east of the Trading Post down to the Hollow Gate.
  road([[55, 24], [55, 40], [52, 40]]);

  // The Great Lantern tower (4 rows) in the middle of the plaza.
  rect(m, 27, 17, 5, 4, 'Q'); rect(m, 27, 21, 5, 1, 'W'); scatter(m, 'N', [[27, 21], [31, 21]]); set(m, 29, 21, 'D');
  scatter(m, 'l', [[25, 19], [33, 19], [25, 22], [33, 22], [21, 16], [38, 16], [21, 30], [38, 30]]);
  rect(m, 22, 17, 3, 2, 'f'); rect(m, 35, 17, 3, 2, 'f'); rect(m, 22, 28, 3, 2, 'f'); rect(m, 35, 28, 3, 2, 'f');
  scatter(m, 'u', [[20, 16], [39, 16], [20, 30], [39, 30]]);
  scatter(m, 'd', [[23, 27], [36, 27], [24, 20], [34, 20]]); scatter(m, 'u', [[26, 21], [32, 21]]);

  // ---- Northwest: homes and gardens ----
  building(m, 5, 13, 5, 'R', 2);                         // Cottage, door (7,15)
  rect(m, 7, 16, 1, 6, 'p');
  rect(m, 12, 4, 7, 3, 'R'); rect(m, 12, 7, 7, 1, 'W'); scatter(m, 'N', [[13, 7], [17, 7]]); set(m, 15, 7, 'D');   // Lodge, door (15,7)
  building(m, 4, 4, 5, 'Q', -1);                         // neighbour's house
  building(m, 21, 4, 5, 'R', 2);                         // Builder's Yard (once a neighbour's house), door (23,6)
  rect(m, 23, 7, 1, 2, 'p'); scatter(m, 'd', [[26, 5], [26, 6]]);   // a log pile by the yard
  rect(m, 4, 9, 27, 1, 'p'); rect(m, 15, 8, 1, 1, 'p');
  // Fenced vegetable garden with crop rows; gap at the bottom.
  rect(m, 12, 12, 9, 1, 'F'); rect(m, 12, 12, 1, 7, 'F'); rect(m, 20, 12, 1, 7, 'F'); rect(m, 12, 18, 9, 1, 'F'); set(m, 16, 18, 'p');
  rect(m, 13, 13, 7, 1, 'j'); rect(m, 13, 15, 7, 1, 'j'); rect(m, 13, 17, 3, 1, 'j'); rect(m, 17, 17, 3, 1, 'j');
  rect(m, 16, 19, 1, 2, 'p');
  rect(m, 3, 17, 3, 3, 'f'); scatter(m, 'u', [[4, 13], [4, 14], [10, 14], [10, 15]]);
  scatter(m, 'l', [[8, 10], [20, 10], [6, 20], [12, 23]]);
  grove(3, 10, 3, 3, ['#'], 60); grove(22, 11, 5, 3, ['#', 'u'], 40);

  // ---- Northeast: Hearth Shrine in a pine grove, BUILDING PLOT ----
  building(m, 36, 4, 7, 'Q', 3);                         // Hearth Shrine, door (39,6)
  rect(m, 39, 7, 1, 3, 'p'); rect(m, 31, 9, 13, 1, 'p');
  scatter(m, 'l', [[37, 7], [41, 7]]);
  grove(33, 3, 3, 6, ['n'], 70); grove(43, 2, 2, 6, ['n'], 70); grove(33, 11, 11, 3, ['n', '#'], 30);
  rect(m, 41, 15, 8, 5, 'f'); grove(41, 15, 8, 5, ['u'], 8);
  rect(m, 46, 2, 1, 12, 'g');
  // ---- Southwest: pond with a bridge, flower fields, BUILDING PLOT ----
  rect(m, 6, 31, 11, 8, 'w'); rect(m, 7, 30, 9, 1, 'w'); rect(m, 7, 39, 9, 1, 'w'); rect(m, 5, 32, 1, 6, 'w'); rect(m, 17, 32, 1, 6, 'w');
  rect(m, 5, 35, 13, 1, 'V'); rect(m, 4, 26, 1, 10, 'p'); rect(m, 18, 35, 2, 1, 'p'); rect(m, 19, 26, 1, 9, 'p');
  scatter(m, 'r', [[6, 30], [16, 30], [6, 39], [16, 39]]); scatter(m, 'd', [[3, 33], [3, 37]]);
  building(m, 9, 26, 5, 'R', -1);                         // fisher's hut
  rect(m, 3, 41, 9, 7, 'f'); grove(3, 41, 9, 7, ['u', '#'], 10);
  grove(20, 33, 4, 6, ['#'], 45);
  scatter(m, 'l', [[3, 26], [18, 34], [24, 38]]);

  // ---- Southeast: Trading Post, homes, the Hollow Gate ----
  building(m, 40, 28, 7, 'R', 3);                         // Trading Post, door (43,30)
  rect(m, 43, 31, 1, 2, 'p'); rect(m, 40, 32, 4, 1, 'p'); rect(m, 39, 31, 1, 2, 'p');
  scatter(m, 'l', [[41, 31], [43, 20], [54, 26], [57, 41]]);
  // Rock outcrop with the Hollow Gate arch.
  rect(m, 49, 33, 6, 6, 'C'); rect(m, 48, 34, 1, 4, 'C'); scatter(m, 'r', [[48, 33], [48, 38], [47, 35], [49, 32], [53, 32]]);
  set(m, 52, 38, 'M'); set(m, 53, 38, 'M'); rect(m, 52, 39, 2, 1, 'y');
  building(m, 46, 43, 5, 'Q', -1); building(m, 52, 43, 5, 'R', -1);   // cottages by the gate
  rect(m, 46, 46, 11, 1, 'p'); rect(m, 51, 42, 1, 4, 'p');
  rect(m, 46, 47, 5, 1, 'F'); rect(m, 52, 47, 5, 1, 'F'); rect(m, 47, 48, 3, 1, 'j'); rect(m, 53, 48, 3, 1, 'j');
  grove(44, 34, 3, 6, ['n'], 50);

  // ---- Extra greenery between the districts ----
  rect(m, 31, 33, 7, 2, 'f'); scatter(m, 'u', [[31, 33], [37, 34]]); set(m, 34, 32, 'd');
  rect(m, 47, 29, 6, 2, 'f'); scatter(m, 'd', [[48, 31], [51, 31]]);
  grove(30, 47, 16, 3, ['#', 'n'], 40); grove(44, 31, 4, 3, ['#'], 35); grove(2, 20, 5, 4, ['#', 'u'], 25);
  grove(36, 10, 10, 2, ['#'], 25); grove(21, 11, 6, 2, ['u'], 20);
  scatter(m, 'f', [[11, 16], [11, 17], [4, 16], [5, 16], [38, 7], [40, 7], [44, 31]]);

  // ---- Building plots: clear flat grass (kept clear last) ----
  const plots = [[47, 5, 10, 8], [13, 41, 10, 8], [32, 37, 10, 10]];
  plots.forEach(([x, y, w, h]) => rect(m, x, y, w, h, 'g'));
  // Fence posts framing each plot's corners.
  plots.forEach(([x, y, w, h]) => [[x - 1, y - 1, 1, 1], [x + w, y - 1, -1, 1], [x - 1, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    set(m, cx, cy, 'F'); set(m, cx + sx, cy, 'F'); set(m, cx, cy + sy, 'F'); }));
  // Road north to the homestead: up the east side of the shrine grove, along the top of the NE plot, out at the top edge.
  rect(m, 44, 2, 2, 8, 'p'); rect(m, 44, 2, 8, 2, 'p'); rect(m, 50, 0, 2, 3, 'p'); scatter(m, 'l', [[43, 2], [52, 2]]);
  sign(m, 46, 8, 'BUILDING PLOT\nOpen ground for a Warden to build on. Bring materials and make it yours!');
  sign(m, 24, 41, 'BUILDING PLOT\nOpen ground for a Warden to build on. Bring materials and make it yours!');
  sign(m, 31, 38, 'BUILDING PLOT\nOpen ground for a Warden to build on. Bring materials and make it yours!');

  // ---- Signs ----
  set(m, 24, 23, 's'); m.objs.push({ x: 24, y: 23, fn: () => G.story.says(G.story.questText()) });
  sign(m, 34, 23, 'LANTERNREST\nWhere the Great Lantern keeps the dark away.');
  sign(m, 49, 1, 'YOUR HOMESTEAD\nNorth along this road. A little cabin and a plot of land of your own.');
  sign(m, 54, 39, 'THE HOLLOW GATE\nSealed until the Great Lantern burns again.');

  // ---- Villagers ----
  npc(m, 30, 27, DOWN, 'kid', ['Lantern Night is when everyone hangs lights along the roads!', "But this year the Great Lantern is barely glowing... Elder Wren is worried."], { roam: 2 });
  npc(m, 35, 25, LEFT, 'old', ['Four roads leave Lanternrest: the meadow west, the marsh east, the ridge north, and the shore south.', 'Go any way you like. A Warden finds their own path.'], { still: true });
  npc(m, 20, 37, DOWN, 'lass', ['I collect shells at the shore south of here. Rare creatures hide in the dune grass!', 'Mind the Shell Collector, though. She is fierce.'], { roam: 1 });
  npc(m, 50, 40, RIGHT, 'camper', ['You can see the Hollow Gate from here. Nobody has gone through in years.'], { roam: 1 });
  npc(m, 45, 10, RIGHT, 'hiker', ['See those fenced corners? That is a BUILDING PLOT.', 'There are three around the village. Gather materials out in the wilds and build whatever you like!'], { still: true });
  npc(m, 10, 24, DOWN, 'bug', ['Wild creatures roam right out in the open past the village roads.', 'If one bumps into you, it wants to battle. Tall grass hides the shy ones.'], { roam: 2 });
  npc(m, 18, 10, DOWN, 'mom', ['Our tomatoes keep vanishing. I blame the round fluffy ones from the meadow.', 'They leave a thank-you leaf every time, so I can not stay mad.'], { roam: 1 });
  npc(m, 30, 41, LEFT, 'boy', ['I am going to build the biggest house in the vale on this plot!', 'Right after I find out what a "material" is.'], { roam: 1 });
  m.npcs.push({ x: 53, y: 3, dir: LEFT, style: { hair: '#2a1a10', skin: '#e8b890', shirt: '#ff8a3a', pants: '#3a5a8a', hat: '#ffd23a' }, still: true,
    talk: () => G.vehicleQuest && G.vehicleQuest.courier ? G.vehicleQuest.courier() : G.story.says(['COURIER KID: I run deliveries all over the vale! Well, I walk them.', 'If I had a scooter I could go twice as fast. Come back later, maybe I will have a job for you!']) });
  npc(m, 3, 35, RIGHT, 'girl', ['The pond is so clear you can see the sky in it.', 'The marsh east of here is murkier. Bring boots. And patience.'], { still: true });

  // ---- Warps ----
  const need = () => G.state.flags.starter ? null : 'LANTERN WARDEN: Hold on! It is not safe beyond the lamplight without a Bondling. Elder Wren is waiting for you at the Hearth Shrine.';
  warp(m, 15, 7, 'lodge', 5, 6, UP); warp(m, 7, 15, 'cottage', 4, 5, UP); warp(m, 39, 6, 'shrine', 5, 7, UP); warp(m, 29, 21, 'tower', 6, 8, UP); warp(m, 43, 30, 'post', 3, 6, UP);
  warp(m, 0, 24, 'sunmeadow', 70, 20, LEFT, need); warp(m, 0, 25, 'sunmeadow', 70, 21, LEFT, need);
  // the east road now leads into Sandsreach Desert (2 badges); Mirewood is reached from Sunmeadow and Stonebridge
  const g2 = G.mk.gate(2, 'SANDSREACH DESERT');
  warp(m, 59, 24, 'sandsreach', 1, 24, RIGHT, g2); warp(m, 59, 25, 'sandsreach', 1, 25, RIGHT, g2);
  warp(m, 28, 0, 'ridge', 24, 50, UP, need); warp(m, 29, 0, 'ridge', 25, 50, UP, need);
  warp(m, 50, 0, 'homestead', 27, 42, UP, need); warp(m, 51, 0, 'homestead', 28, 42, UP, need);
  warp(m, 23, 6, 'yard', 3, 6, UP);
  // the south road now leads to Stonebridge Town (Tidepool Shore lies beyond it)
  warp(m, 28, 51, 'stonebridge', 27, 1, DOWN, need); warp(m, 29, 51, 'stonebridge', 28, 1, DOWN, need);
  const gate = () => G.state.flags.lanternLit ? null : 'The archway is sealed by a faint, flickering light. Relight the Great Lantern first.';
  warp(m, 52, 38, 'hollow', 18, 30, UP, gate); warp(m, 53, 38, 'hollow', 19, 30, UP, gate);

  // ---- Name plates over the town's services ----
  m.labels = [
    { x: 15, y: 4, text: 'WARDEN LODGE · HEALING', style: 'heal' },
    { x: 43, y: 28, text: 'GENERAL STORE', style: 'shop' },
    { x: 23, y: 4, text: "BUILDER'S YARD", style: 'craft' },
    { x: 39, y: 4, text: 'HEARTH SHRINE', style: 'home' },
  ];
})();
(function () {
  const m = interior('cottage', 'YOUR COTTAGE', 8, 7, 4);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 2, 1, 'a');
  npc(m, 3, 3, RIGHT, 'old', null, { talk: () => G.story.orrin() });
  warp(m, 4, 6, 'lanternrest', 7, 16, DOWN);
})();
(function () {
  const m = interior('shrine', 'HEARTH SHRINE', 10, 9, 5);
  scatter(m, 'S', [[1, 1], [2, 1], [7, 1], [8, 1]]); scatter(m, 'O', [[3, 3], [5, 3], [7, 3]]);
  npc(m, 5, 5, UP, 'elder', null, { talk: () => G.story.wren(), style: G.WREN_LOOK });
  npc(m, 2, 6, RIGHT, 'girl', ['Three Bondlings sleep on the hearth stones. They only wake for someone who truly wants a partner.', 'Press START to check your DEX and see everything you have met.']);
  [1, 4, 7].forEach((id, i) => m.objs.push({ x: 3 + i * 2, y: 3, orb: id, hide: () => G.state.flags.starter, fn: () => G.story.chooseStarter(id) }));
  warp(m, 5, 8, 'lanternrest', 39, 7, DOWN);
})();
(function () {
  const m = interior('lodge', 'WARDEN LODGE', 10, 8, 5);
  rect(m, 2, 2, 5, 1, 'k'); set(m, 8, 1, 'P'); set(m, 1, 1, 'h'); rect(m, 7, 5, 2, 1, 'a');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 2, 5, RIGHT, 'boy', ['Resting at the Lodge is free for any Warden. The PC in the corner stores spare Bondlings.']);
  for (let x = 2; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.story.nurse() });
  m.objs.push({ x: 8, y: 1, fn: () => G.pcMenu() });
  warp(m, 5, 7, 'lanternrest', 15, 8, DOWN);
})();
(function () {
  const m = interior('post', 'TRADING POST', 8, 8, 3);
  rect(m, 3, 3, 4, 1, 'k'); rect(m, 1, 1, 1, 3, 'S'); rect(m, 6, 1, 1, 1, 'S');
  npc(m, 4, 2, DOWN, 'clerk', null, { still: true });
  npc(m, 5, 5, LEFT, 'girl', ['Wardens who clear the Mine sometimes carry MYTHIC ORBS. I could never afford one!']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 3, prompt: 'Shop', fn: () => G.shopMenu() });
  warp(m, 3, 7, 'lanternrest', 43, 31, DOWN);
})();
(function () {
  const m = interior('yard', "BUILDER'S YARD", 8, 8, 3);
  rect(m, 3, 3, 4, 1, 'k'); scatter(m, 'x', [[1, 1], [2, 1], [1, 2], [6, 5], [6, 6]]); scatter(m, 'S', [[5, 1], [6, 1]]); set(m, 1, 5, 't');
  npc(m, 4, 2, DOWN, 'hiker', null, { still: true });
  npc(m, 2, 6, RIGHT, 'boy', ['Planks and bricks come out of a Refinery. If you are in a hurry, the Yard sells them ready-made.', 'They buy spare materials too, if your shed is overflowing.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 3, prompt: 'Shop', fn: () => G.openShop ? G.openShop('builder') : G.story.says("BUILDER'S YARD: We are still unloading the cart. Come back soon!") });
  warp(m, 3, 7, 'lanternrest', 23, 7, DOWN);
})();
(function () {
  const m = interior('tower', 'THE GREAT LANTERN', 12, 10, 6);
  scatter(m, 'S', [[1, 1], [2, 1], [9, 1], [10, 1]]); scatter(m, 'O', [[3, 3], [6, 2], [9, 3]]); set(m, 6, 5, 'L');
  [[3, 3, 'meadow', 'MEADOW'], [6, 2, 'mine', 'MINE'], [9, 3, 'marsh', 'MARSH']].forEach(([x, y, k, label]) => m.objs.push({ x, y, pedestal: k, fn: () => G.story.pedestal(k, label) }));
  m.objs.push({ x: 6, y: 5, brazier: true, fn: () => G.story.says(G.state.flags.lanternLit ? 'The Great Lantern burns bright, warm and steady.' : 'The Great Lantern is nearly out. Three empty pedestals ring it, waiting for the Ember Shards.') });
  npc(m, 3, 6, RIGHT, 'elder', null, { talk: () => G.story.says(G.state.flags.lanternLit ? ['KEEPER LUMI: Listen... the whole vale is singing again. The Hollow Gate stands open to the southeast.'] : ['KEEPER LUMI: Three Ember Shards once fed the flame: one from the Meadow, one from the Marsh, one from the Mine.', `Shards placed: ${['meadow', 'marsh', 'mine'].filter(k => G.state.flags['placed_' + k]).length} of 3.`]) });
  warp(m, 6, 9, 'lanternrest', 29, 22, DOWN);
})();
})();
