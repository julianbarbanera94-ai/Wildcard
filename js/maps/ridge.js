// The Ridge (north) and Glimmer Mine.
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;
const hash = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };

// ---- The Ridge (north): a switchback trail up four terraces to Glimmer Mine ----
// Terraces, bottom to top: T0 (y 42..50, entry from Lanternrest), T1 (y 30..39), T2 (y 17..27), T3 (y 5..14, the mine mouth).
// Cliff bands 'E' separate them; the trail climbs through one gap per band, alternating sides.
(function () {
  const m = newMap('ridge', 'THE RIDGE', 52, 52, 'g', { music: 'route', banner: true, enc: [[14, 5, 8, 30], [16, 5, 7, 25], [21, 6, 9, 20], [10, 5, 7, 15], [1, 5, 6, 5]] });
  // mountain wall at the top with the mine mouth as an arch of rock
  rect(m, 1, 1, 50, 4, 'E'); rect(m, 20, 0, 10, 5, 'C'); rect(m, 21, 4, 8, 1, 'C'); set(m, 24, 4, 'M'); set(m, 25, 4, 'M');
  scatter(m, 'C', [[19, 3], [19, 4], [30, 3], [30, 4], [20, 5], [29, 5]]);
  // cliff bands (2 rows) with ragged edges and one trail gap each
  const band = (y, gx) => {
    rect(m, 1, y, 50, 2, 'E');
    for (let x = 1; x < 51; x++) { if (hash(x, y) < .25) set(m, x, y - 1, 'E'); else if (hash(x, y + 9) < .12) set(m, x, y - 1, 'r'); }
    rect(m, gx - 1, y - 1, 4, 3, 'g'); rect(m, gx, y - 1, 2, 3, 'p');
  };
  band(15, 9); band(28, 43); band(40, 6);
  border(m, 'n');
  // the trail
  rect(m, 24, 42, 2, 10, 'p'); rect(m, 6, 42, 20, 2, 'p');          // T0
  rect(m, 6, 30, 2, 12, 'p'); rect(m, 6, 30, 39, 2, 'p');           // T1
  rect(m, 43, 17, 2, 13, 'p'); rect(m, 9, 17, 36, 2, 'p');          // T2
  rect(m, 9, 7, 2, 10, 'p'); rect(m, 9, 7, 30, 2, 'p'); rect(m, 24, 5, 2, 3, 'p');   // T3
  warp(m, 24, 51, 'lanternrest', 28, 1, DOWN); warp(m, 25, 51, 'lanternrest', 29, 1, DOWN);
  warp(m, 24, 4, 'mine', 19, 30, UP); warp(m, 25, 4, 'mine', 20, 30, UP);

  // -- T0: the foot of the ridge. West meadow of tall grass, an open build flat east (36..43, 43..49) --
  rect(m, 3, 45, 11, 5, 'G'); rect(m, 27, 45, 6, 5, 'G'); rect(m, 15, 47, 7, 3, 'G');
  scatter(m, 'n', [[45, 42], [46, 43], [47, 42], [48, 44], [49, 43], [47, 46], [49, 47], [48, 49], [26, 44], [33, 43], [34, 49], [1, 43], [14, 44]]);
  scatter(m, '#', [[22, 45], [22, 46], [27, 43], [44, 48], [45, 49]]); scatter(m, 'r', [[2, 46], [3, 44], [5, 50], [12, 44], [34, 45]]);
  rect(m, 2, 48, 1, 3, 'g'); scatter(m, 'r', [[1, 47], [3, 50]]);
  rect(m, 28, 42, 4, 1, 'f'); rect(m, 19, 44, 3, 1, 'f');
  sign(m, 23, 48, 'THE RIDGE\nGlimmer Mine lies at the top. Lantern light is dim up there.');
  m.objs.push({ x: 2, y: 49, id: 'rd_pot', item: 'Potion', qty: 2, ball: true });
  trainer(m, 'rd_kit', 16, 46, UP, 'kid', { name: 'KIT', cls: 'KID', sight: 3, team: [[14, 6], [16, 7]], pre: 'This is my mountain! Well, the bottom of it.', win: 'Okay, okay, you can climb it too.', post: 'My big sister is up at the mine. She is way tougher.', prize: 26 });

  // -- T1: grass slopes, a pine grove with a hidden nook in the east --
  rect(m, 10, 33, 12, 5, 'G'); rect(m, 25, 33, 12, 5, 'G'); rect(m, 2, 37, 3, 2, 'G');
  rect(m, 39, 32, 11, 8, 'n'); rect(m, 41, 34, 7, 4, 'g'); set(m, 40, 36, 'g'); set(m, 39, 36, 'g'); rect(m, 42, 35, 3, 1, 'f');
  scatter(m, 'r', [[9, 33], [23, 34], [23, 37], [37, 33], [12, 39], [30, 39], [3, 32]]); scatter(m, '#', [[22, 33], [24, 38], [8, 38], [9, 39]]); scatter(m, 'n', [[1, 32], [1, 33], [20, 39], [21, 39], [37, 39]]);
  rect(m, 2, 33, 3, 2, 'f');
  m.objs.push({ x: 46, y: 35, id: 'rd_heal', item: 'Full Heal', ball: true });
  m.objs.push({ x: 23, y: 36, id: 'rd_sp', item: 'Super Potion', ball: true });
  trainer(m, 'rd_bram', 2, 35, RIGHT, 'hiker', { name: 'BRAM', cls: 'HIKER', sight: 5, team: [[14, 8], [14, 9], [21, 9]], pre: "I've climbed every rock on this ridge. Ready for a rumble?", win: 'My rocks crumbled!', post: 'Hiking builds strong legs and strong creatures.', prize: 36 });

  // -- T2: a wide shelf. West lookout, open build flat (18..25, 20..26), tall grass east --
  rect(m, 2, 19, 6, 6, 'y'); rect(m, 2, 19, 6, 1, 'f'); scatter(m, 'r', [[1, 21], [7, 24], [2, 25], [6, 20]]); set(m, 4, 22, 'd');
  rect(m, 27, 20, 11, 7, 'G'); rect(m, 9, 22, 6, 4, 'G');
  scatter(m, 'n', [[46, 19], [47, 20], [48, 19], [49, 21], [46, 23], [48, 24], [49, 26], [47, 26], [16, 20], [16, 26], [26, 21], [26, 25], [10, 20], [14, 20]]);
  scatter(m, 'r', [[39, 21], [41, 26], [38, 26], [11, 26]]); scatter(m, '#', [[9, 26], [8, 21]]);
  m.objs.push({ x: 3, y: 23, id: 'rd_rev', item: 'Revive', ball: true });
  trainer(m, 'rd_ash', 38, 23, RIGHT, 'camper', { name: 'ASH', cls: 'CLIMBER', sight: 5, team: [[16, 8], [14, 9]], pre: 'You look like you can handle a mountain. Can you handle me?', win: 'You climbed right over me!', post: 'The Mine is just ahead. Careful in the dark.', prize: 34 });

  // -- T3: the top shelf below the mine. Grass beds and a lookout to the east --
  rect(m, 13, 10, 9, 4, 'G'); rect(m, 27, 10, 9, 4, 'G'); rect(m, 2, 6, 5, 5, 'G');
  rect(m, 39, 6, 11, 7, 'g'); rect(m, 41, 6, 8, 1, 'f'); rect(m, 39, 7, 2, 2, 'p'); scatter(m, 'r', [[49, 6], [49, 12], [44, 12], [39, 12]]); scatter(m, 'n', [[38, 11], [38, 12], [37, 13], [45, 13], [46, 12]]);
  scatter(m, 'n', [[8, 11], [7, 13], [12, 13], [22, 13], [23, 11], [26, 13], [36, 10], [1, 12], [2, 13]]); scatter(m, 'r', [[11, 5], [17, 5], [32, 5], [12, 9], [22, 10]]);
  m.objs.push({ x: 48, y: 9, id: 'rd_orb', item: 'Pulse Orb', qty: 2, ball: true });
  sign(m, 44, 9, 'RIDGE LOOKOUT\nOn a clear night you can see the Great Lantern from here.');
  trainer(m, 'rd_pia', 17, 10, UP, 'lass', { name: 'PIA', cls: 'CLIMBER', sight: 3, team: [[16, 9], [21, 10]], pre: 'Almost at the top! But you have to get past me first.', win: 'You must have mountain legs!', post: 'Kade guards the deep chamber. Bring your best.', prize: 36 });
  // sprinkle pines and boulders over the open slopes, keeping build flats, the trail edges, sight lines and anything near people/items clear
  const keep = (x, y) => (x >= 38 && y >= 32 && y <= 39) || (x >= 35 && x <= 44 && y >= 42 && y <= 50) || (x >= 16 && x <= 26 && y >= 19 && y <= 27) ||
    m.npcs.concat(m.objs).some(o => Math.abs(o.x - x) + Math.abs(o.y - y) <= 2) ||
    m.npcs.some(n => n.trainer && ((n.dir > 1 && y === n.y && Math.abs(x - n.x) <= n.trainer.sight) || (n.dir < 2 && x === n.x && Math.abs(y - n.y) <= n.trainer.sight))) ||
    [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => m.t[y + dy] && m.t[y + dy][x + dx] === 'p');
  for (let y = 5; y < 51; y++) for (let x = 1; x < 51; x++) if (m.t[y][x] === 'g' && !keep(x, y) && hash(x * 3, y) < .1) set(m, x, y, hash(y, x) < .75 ? 'n' : 'r');

  // -- Mine Row: a Healing Post and the Ridgehold Forge built against the cliff beside the mine mouth --
  building(m, 30, 4, 5, 'R', 2); building(m, 36, 4, 5, 'Q', 2); set(m, 35, 5, 'g'); set(m, 35, 6, 'l'); set(m, 41, 5, 'd');
  m.labels = [{ x: 32, y: 4, text: 'HEALING POST', style: 'heal' }, { x: 38, y: 4, text: 'RIDGEHOLD FORGE', style: 'shop' }];
  warp(m, 32, 6, 'ridgeheal', 3, 5, UP); warp(m, 38, 6, 'forgeshop', 3, 5, UP);
  // -- an abandoned quad bike, rusting in the sand at the west lookout (the vehicles owner draws and repairs it) --
  m.objs.push({ x: 6, y: 21, kind: 'quad', ball: false, prompt: 'Old quad bike', hide: () => G.state.flags.quadFound, fn: () => G.vehicleQuest && G.vehicleQuest.quad ? G.vehicleQuest.quad() : G.story.says('An old quad bike, half buried in the sand. Its engine is long dead.') });
})();
(function () {
  const m = interior('ridgeheal', 'RIDGE HEALING POST', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); set(m, 1, 1, 'h'); scatter(m, 'S', [[6, 1]]); rect(m, 5, 4, 2, 1, 'a'); set(m, 1, 5, 't');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 6, 5, LEFT, 'hiker', ['Miners come up out of the dark with their Bondlings half asleep. This post is a lifesaver.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'RIDGE HEALING POST', free: true }) : G.story.nurse() });
  warp(m, 3, 6, 'ridge', 32, 7, DOWN);
})();
(function () {
  const m = interior('forgeshop', 'RIDGEHOLD FORGE', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); scatter(m, 'L', [[1, 1]]); scatter(m, 'x', [[6, 1], [1, 4], [1, 5]]); set(m, 6, 5, 'O');
  npc(m, 4, 1, DOWN, 'hiker', null, { still: true, style: { hair: '#3a2a20', skin: '#e0a880', shirt: '#7a4a2a', pants: '#3a3a48', hat: '#4a4a58' } });
  npc(m, 5, 4, LEFT, 'kade', ['Smiths on the Ridge have worked iron since before the Lantern was lit.', 'Bring your ore here if you have no use for it. We pay fair.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Shop', fn: () => G.openShop ? G.openShop('forge') : G.story.says('The forge fire is out for now.') });
  warp(m, 3, 6, 'ridge', 38, 7, DOWN);
})();

// ---- Glimmer Mine: crystal caves guarded by the Mine Warden ----
// Layout from the cave map pack (docs/CAVES.md, Stage B): the entrance tunnel climbs north through the great cavern to
// a one-tile neck that Kade watches from the foot of the crystal dais. West and east grottoes open off the
// cavern; two underground pools fed by waterfalls lie below them. The west plank bridge reaches an island, the east one
// is a shortcut down to the hidden south-east nook. C wall, c tunnel, e cavern floor (encounters), w water, 3 plank
// bridge, @ waterfall, o guardian dais, i crystal, r ore boulder (Iron Ore and Coal with a Pickaxe), 6 lantern post, 7 light shaft,
// 9 rune pillar, 4 barrel. Item ids are the ones saves already remember.
(function () {
  const m = newMap('mine', 'GLIMMER MINE', 40, 32, 'C', { music: 'cave', bg: 'cave', banner: true, enc: [[14, 9, 12, 25], [21, 9, 12, 20], [22, 10, 13, 20], [23, 10, 13, 15], [24, 11, 13, 10], [20, 9, 11, 10]] });
  const GRID = [
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCeee9ooo9eeeCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCee7eeoooeeeeeCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCeeeeieoooeieeeeCCCCCCCCCCCC',
    'CCCCCCCCCCCCeeeeeeeeeeeeeeeeeCCCCCCCCCCC',
    'CCCCCCCCCCCCCeeereeeeeeereeeCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCeeeeeeeeeeeeeCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCee6eeeee6eeCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCcCCCCCCCCCCieCCCCCCC',
    'CCCCCCCiCCCCCCeeiecccceeieeCCeeeeeeeCCCC',
    'CCCCCieeeeiCeeeeeecccceeeeeeeeeeeeee4CCC',
    'CCCCeeeeeeeereeeeecccceeeeeieeeeeeeieCCC',
    'CCCCeeeeeeeeeieeeecccceeeeeeeeeeeeeeeCCC',
    'CCCCreeeeeeeeeeeeecccceeeeeeeeeeeeeeeeCC',
    'CCCeeeecccceeeeeeecccceeeeeeeccceereeCCC',
    'CCCCeeeccccc6ccceecccceeeee6cccceeeeeCCC',
    'CCCCeeeccccccccceecccceeeeeccccceeeeeCCC',
    'CCCCeeeeeccccccceecccceeeercccceeeeeCCCC',
    'CCCCCiwwweeeeereeecccceeeeeeeeweeCiCCCCC',
    'CCCCCC@eweeeeeeeeecccceeeieewwwwwCCCCCCC',
    'CCCCCww33333eeeeeecccceeeee3333333@CCCCC',
    'CCCCwwwwwwwwwieeerccccereewwwwwww3wCCCCC',
    'CCCCCwwwwwwweeee6eccccee6eewwwwwweCCCCCC',
    'CCCCCCCCwCCCCCeeeecccceeeeeCwwweeeeeCCCC',
    'CCCCCCCCCCCCCCCCCcccccccccccccceeeeeeCCC',
    'CCCCCCCCCCCCCCCCCccccccccccccccereeeeeCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCeeeeeeeCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCeeeeeCCCC',
    'CCCCCCCCCCCCCCCCCccccccCCCCCCCCCCeCCCCCC',
    'CCCCCCCCCCCCCCCCCCccccCCCCCCCCCCCCCCCCCC',
  ];
  GRID.forEach((row, y) => { for (let x = 0; x < row.length; x++) set(m, x, y, row[x]); });
  for (const [x, rx] of [[18, 24], [19, 24], [20, 25], [21, 25]]) warp(m, x, 31, 'ridge', rx, 5, DOWN);
  // the guardian chamber: Kade, and the two orbs either side of the dais
  m.objs.push({ x: 14, y: 6, id: 'mn_rev', item: 'Revive', ball: true }); m.objs.push({ x: 26, y: 6, id: 'mn_ultra', item: 'Mythic Orb', ball: true });
  trainer(m, 'mn_kade', 20, 6, DOWN, 'kade', { name: 'KADE', cls: 'MINE WARDEN', sight: 4, team: [[22, 12], [23, 13], [24, 14]], pre: 'I am Kade, Warden of the Mine. Show me what a true Warden is made of!', win: 'The Mine accepts you. Take these.', post: 'The Mine shard? Ashen Wardens broke in and carried it north, to the Aurora Isles. Only something old and cold guards it now.', prize: 60, reward: ['Mythic Orb', 3] });
  // west grotto (Rhea) and the island across the west bridge
  m.objs.push({ x: 5, y: 14, id: 'mn_heal', item: 'Full Heal', ball: true });
  m.objs.push({ x: 7, y: 21, id: 'mn_lake', item: 'Aqua Orb', qty: 2, ball: true });
  trainer(m, 'mn_rhea', 4, 17, RIGHT, 'girl', { name: 'RHEA', cls: 'CRYSTAL SEEKER', sight: 4, team: [[22, 11], [23, 12]], pre: 'Every crystal down here hums a different note. Yours sounds strong!', win: 'What a beautiful sound that battle made.', post: 'The west grotto glows the brightest. And there is something shiny on the island past the bridge.', prize: 44 });
  // east grotto (Flint) and the hidden nook past the east bridge
  m.objs.push({ x: 34, y: 12, id: 'mn_sp', item: 'Super Potion', ball: true });
  trainer(m, 'mn_flint', 36, 17, LEFT, 'hiker', { name: 'FLINT', cls: 'MINER', sight: 4, team: [[14, 11], [15, 13], [21, 12]], pre: 'Ho there! Nobody digs in my tunnel without a battle!', win: 'Crushed like gravel!', post: 'The east bridge is a shortcut. Nobody uses it, so nobody finds what is down there.', prize: 48 });
  m.objs.push({ x: 35, y: 28, id: 'mn_orb', item: 'Pulse Orb', qty: 3, ball: true });
})();
// ---- World expansion exits (docs/WORLD.md) ----
(function () {
  const { carveExit, gate, rect: rect_ } = G.mk, m = G.MAPS.ridge;
  // North exit moved east to x 46 (the old x 36 ran through the Forge); it climbs the lookout shelf. East exit moved down to the
  // foot of the ridge (y 45) so it no longer cuts the whole cliff band.
  carveExit(m, 'N', 46, 'cloudpeak', 24, 58, gate(3, 'CLOUDPEAK MOUNTAINS')); carveExit(m, 'E', 45, 'lakeside', 1, 24);
  rect_(m, 46, 5, 2, 1, 'p');
})();
})();
