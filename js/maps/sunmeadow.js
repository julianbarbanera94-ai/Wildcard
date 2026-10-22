// Sunmeadow (west region).
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

// Small deterministic helpers for organic shapes (shared idea with shore.js; kept local so each file stands alone).
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// Fill an ellipse, with a slightly ragged edge; `only` limits which existing tiles get replaced.
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
  }
}
// A path of width 2 through a list of points, moving horizontally then vertically between them.
function path(m, pts, ch = 'p', w = 2) {
  for (let i = 0; i < pts.length - 1; i++) {
    let [x, y] = pts[i]; const [tx, ty] = pts[i + 1];
    rect(m, x, y, w, w, ch);
    while (x !== tx) { x += Math.sign(tx - x); rect(m, x, y, w, w, ch); }
    while (y !== ty) { y += Math.sign(ty - y); rect(m, x, y, w, w, ch); }
  }
}
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id, item: name, ball: true }, qty ? { qty } : {}));

// ---- Sunmeadow (west): rolling grassland, orchards and a windmill; easiest of the three shard regions ----
(function () {
  const m = newMap('sunmeadow', 'SUNMEADOW', 72, 44, 'g', { music: 'route', enc: [[10, 3, 5, 35], [16, 3, 5, 30], [18, 3, 5, 20], [12, 4, 6, 10], [7, 4, 5, 3]] });
  // Forest edge: round trees with pines mixed in, two deep with a ragged inner edge.
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const e = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
    if (e === 0 || (e === 1 && hash(x, y) < .55)) set(m, x, y, hash(y, x) < .3 ? 'n' : '#');
  }

  // North-west: a flower plateau above a cliff ledge, reached by a ramp gap.
  blob(m, 11, 6, 9, 4.5, 'f', ['g']);
  scatter(m, 'g', [[6, 5], [7, 5], [11, 4], [15, 7], [16, 7], [9, 8], [4, 7], [13, 9]]);
  rect(m, 2, 12, 22, 1, 'E'); rect(m, 22, 2, 1, 11, 'E'); rect(m, 12, 12, 2, 1, 'g');
  scatter(m, 'u', [[3, 3], [4, 3], [19, 3], [20, 4], [3, 10], [21, 10]]); scatter(m, '#', [[2, 2], [21, 2]]);

  // North-centre: the windmill farm. Crop beds in rows, fenced on the west.
  building(m, 33, 3, 5, 'R', -1);
  for (let j = 0; j < 3; j++) rect(m, 25, 3 + j * 2, 6, 1, 'j');
  rect(m, 24, 2, 1, 8, 'F'); rect(m, 24, 9, 4, 1, 'F');
  for (let j = 0; j < 2; j++) rect(m, 39, 4 + j * 2, 5, 1, 'j');
  scatter(m, 'd', [[38, 8], [44, 9]]); scatter(m, 'u', [[32, 3], [38, 3], [45, 3]]);

  // North-east: the apple orchard, trees on a staggered grid with flowers under them.
  for (let y = 3; y <= 11; y += 2) for (let x = 50 + ((y >> 1) & 1); x <= 67; x += 3) set(m, x, y, '#');
  scatter(m, 'f', [[51, 4], [55, 6], [58, 4], [62, 8], [65, 6], [53, 10], [60, 10], [66, 10], [57, 8]]);

  // Tall grass meadows (encounters).
  blob(m, 59, 15, 7, 2.4, 'G', ['g']);
  blob(m, 31, 19, 6, 2.6, 'G', ['g']);
  blob(m, 13, 16, 7, 2.2, 'G', ['g']);
  blob(m, 14, 28, 5, 3, 'G', ['g']);
  blob(m, 47, 23, 5, 2.4, 'G', ['g']);
  blob(m, 63, 38, 4, 2.5, 'G', ['g']);
  blob(m, 29, 37, 4, 2.5, 'G', ['g']);

  // South-centre: a lily pond with an island and two bridges.
  blob(m, 43, 32, 8, 4.6, 'w', null, .12);
  blob(m, 43, 32, 2.2, 1.4, 'g', null, 0); set(m, 44, 32, 'u');
  for (let y = 26; y <= 38; y++) for (const x of [42, 43]) if (m.t[y][x] === 'w') set(m, x, y, 'V');
  scatter(m, 'd', [[35, 28], [51, 36]]); scatter(m, 'u', [[34, 35], [52, 28]]);

  // South-west: a pine grove hiding a secret nook. The only way in is a winding trail from the east.
  rect(m, 1, 31, 23, 12, 'n');
  for (let x = 2; x < 24; x++) if (hash(x, 30) < .45 && m.t[30][x] === 'g') set(m, x, 30, hash(x, 7) < .5 ? 'n' : '#');
  for (let y = 31; y < 42; y++) if (hash(24, y) < .4 && y !== 33) set(m, 24, y, 'n');
  blob(m, 5, 38, 3.2, 2.6, 'g', null, 0);
  scatter(m, 'f', [[4, 37], [6, 39], [3, 39], [7, 37]]); set(m, 5, 36, 'd');
  path(m, [[22, 33], [19, 33], [19, 36], [15, 36], [15, 39], [11, 39], [11, 37], [8, 37]], 'g', 1);
  scatter(m, 'g', [[23, 33], [12, 37], [13, 39], [17, 36], [19, 34]]);
  scatter(m, 'u', [[24, 32], [24, 34]]);

  // Main sand road: in from the east, north round the meadow, west past the windmill, south and on to the Warden.
  path(m, [[62, 20], [70, 20]]);
  path(m, [[62, 20], [50, 20], [50, 13], [36, 13], [22, 13]]);
  path(m, [[34, 6], [34, 13]]);
  path(m, [[22, 13], [22, 22], [7, 22], [7, 20], [3, 20]]);
  path(m, [[12, 21], [12, 12]], 'p');                       // ramp up to the flower plateau
  path(m, [[40, 15], [40, 25], [42, 25]], 'p');              // lane down to the pond bridge
  rect(m, 42, 25, 2, 3, 'p'); rect(m, 42, 37, 2, 2, 'p');
  path(m, [[60, 22], [60, 25]], 'p');                        // to the south-east field
  rect(m, 2, 19, 1, 4, 'g');
  path(m, [[42, 38], [52, 38], [52, 33]], 'p');           // trail from the south bridge to the east field
  scatter(m, 'u', [[4, 14], [5, 14], [3, 16], [9, 26], [17, 26]]); scatter(m, 'd', [[9, 15], [62, 41]]); scatter(m, '#', [[2, 15], [10, 13]]);

  // The Warden's clearing at the far west end, ringed with flowers.
  scatter(m, 'f', [[2, 18], [3, 18], [4, 18], [5, 18], [2, 24], [3, 24], [4, 24], [5, 24], [6, 24]]);
  scatter(m, 'l', [[6, 18], [6, 25]]);

  // Open fields left flat for building: south-east (12x9 at 54..65, 27..35) and centre-west (8x7 at 25..32, 25..31).
  rect(m, 54, 27, 12, 9, 'g'); rect(m, 25, 25, 8, 7, 'g');
  scatter(m, 'u', [[53, 26], [66, 27], [66, 35], [24, 25]]);
  scatter(m, 'd', [[67, 30]]);

  // Odds and ends around the road.
  scatter(m, '#', [[48, 17], [28, 16], [18, 19], [55, 23], [68, 24], [36, 24], [8, 26], [20, 26]]);
  scatter(m, 'u', [[49, 17], [27, 16], [56, 23], [69, 24], [37, 24]]);
  scatter(m, 'f', [[64, 22], [65, 22], [66, 23], [52, 22], [9, 24], [10, 24], [26, 23], [16, 24]]);

  sign(m, 36, 9, 'SUNMEADOW WINDMILL\nThe old mill still grinds the valley grain.');
  sign(m, 66, 19, 'SUNMEADOW\nLanternrest is back east.');
  sign(m, 39, 26, 'LILY POND\nCross the bridges to the little island.');

  item(m, 66, 5, 'sm_potion', 'Potion');                     // under the orchard trees
  item(m, 9, 4, 'sm_super', 'Pulse Orb');                    // up on the flower plateau
  item(m, 30, 38, 'sm_orb', 'Terra Orb', 2);                 // in the south grass
  item(m, 69, 33, 'sm_spot', 'Super Potion');                // corner of the south-east field
  item(m, 42, 32, 'sm_ultra', 'Mythic Orb');                  // on the pond island
  item(m, 5, 39, 'sm_revive', 'Revive');                     // the secret nook in the pines
  item(m, 30, 4, 'sm_heal', 'Full Heal');                    // between the crop beds
  item(m, 3, 37, 'sm_orb2', 'Terra Orb', 3);                 // deeper in the secret nook

  trainer(m, 'sm_dot', 30, 10, DOWN, 'girl', { name: 'DOT', cls: 'PICNICKER', sight: 4, team: [[10, 4], [16, 4]], pre: 'Hi hi! Nice day for a battle, right?', win: 'Aww, you were too good!', post: 'The grass here is the best for picnics.', prize: 28 });
  trainer(m, 'sm_rue', 45, 18, UP, 'kid', { name: 'RUE', cls: 'KID', sight: 4, team: [[18, 4], [12, 5]], pre: 'You walked right into my meadow!', win: 'You win this round!', post: 'I will get stronger.', prize: 28 });
  trainer(m, 'sm_finn', 17, 10, LEFT, 'old', { name: 'FINN', cls: 'BIRD WATCHER', sight: 4, team: [[16, 5], [16, 5], [10, 6]], pre: 'Shh! You will scare the birds. ...Well, a battle then.', win: 'Hmph! Even my birds could not stop you.', post: 'Wingly nest in the tall grass, you know.', prize: 30 });
  trainer(m, 'sm_ivy', 52, 8, RIGHT, 'lass', { name: 'IVY', cls: 'ORCHARD KEEPER', sight: 5, team: [[7, 5], [10, 5]], pre: 'Hands off my apples! Unless you can beat me.', win: 'Fine, take an apple. Just one!', post: 'The trees love the sun here.', prize: 30 });
  trainer(m, 'sm_bram', 45, 26, LEFT, 'camper', { name: 'BRAM', cls: 'CAMPER', sight: 4, team: [[18, 5], [16, 6], [12, 6]], pre: 'I camp by the pond every summer. Let us battle!', win: 'My campfire just went out...', post: 'Something shiny sits on the island.', prize: 32 });
  trainer(m, 'sm_moss', 27, 33, LEFT, 'bug', { name: 'MOSS', cls: 'BUG CATCHER', sight: 4, team: [[18, 5], [18, 6], [19, 7]], pre: 'The pines are full of bugs. And so is my team!', win: 'Squashed...', post: 'Some say there is a hidden glade in those pines.', prize: 30 });
  trainer(m, 'sm_hazel', 3, 20, RIGHT, 'bug', { name: 'HAZEL', cls: 'MEADOW WARDEN', sight: 4, team: [[10, 7], [12, 7], [16, 8]], pre: 'I am Hazel, Warden of Sunmeadow. The MEADOW EMBER SHARD is mine to guard. Show me you can protect the vale!', win: 'You have the heart of a Warden. Take the shard, and relight that Lantern!', post: 'The Great Lantern is in the tower back in Lanternrest. Good luck!', prize: 40, shard: 'meadow' });

  // Meadowbrook Seeds: a farm stand just off the road, with show beds of crops beside it.
  rect(m, 57, 15, 9, 5, 'g'); building(m, 59, 15, 5, 'R', 2); rect(m, 61, 18, 1, 2, 'p');
  rect(m, 64, 16, 2, 1, 'j'); rect(m, 64, 18, 2, 1, 'j'); rect(m, 57, 16, 2, 1, 'f'); scatter(m, 'l', [[58, 18]]); set(m, 65, 17, 'u');
  m.labels = [{ x: 61, y: 15, text: 'MEADOWBROOK SEEDS', style: 'shop' }];
  warp(m, 61, 17, 'seeds', 3, 5, UP);

  rect(m, 70, 20, 2, 2, 'p');
  warp(m, 71, 20, 'lanternrest', 1, 24, RIGHT); warp(m, 71, 21, 'lanternrest', 1, 25, RIGHT);
})();
(function () {
  const m = interior('seeds', 'MEADOWBROOK SEEDS', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); scatter(m, 'S', [[1, 1], [1, 2], [6, 1]]); scatter(m, 'x', [[1, 4], [6, 5]]); set(m, 6, 4, 't');
  npc(m, 4, 1, DOWN, 'lass', null, { still: true });
  npc(m, 1, 5, RIGHT, 'old', ['Turnips are the easiest crop. Three days and they are ready!', 'Water every day, mind. A plot left dry for three days withers.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Shop', fn: () => G.openShop ? G.openShop('seeds') : G.story.says('The seed stand is closed for now.') });
  warp(m, 3, 6, 'sunmeadow', 61, 18, DOWN);
})();
// ---- World expansion exits (docs/WORLD.md) ----
(function () {
  const { carveExit, gate } = G.mk, m = G.MAPS.sunmeadow;
  carveExit(m, 'W', 20, 'sunhaven', 62, 24); carveExit(m, 'N', 36, 'evergreen', 46, 50, gate(1, 'EVERGREEN FOREST')); carveExit(m, 'S', 36, 'mirewood', 38, 1);
})();
})();
