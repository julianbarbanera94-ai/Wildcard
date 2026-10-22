// Your Homestead (north of Lanternrest) and the four house interiors home1..home4 (see docs/HOMESTEAD.md).
// The lead's js/homestead.js stamps the house build at m.homeSpot, turns unowned grass into thicket from m.zones,
// blocks m.props cells and fixes the interiors' exit warps to the house door.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, interior, warp, npc, sign, DOWN, UP, LEFT, RIGHT } = G.mk;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x2c1b3c6d; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .16) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
  }
}
const says = t => G.story.says(t);

// ---- The homestead: 56 x 44 of meadow inside a ring of woods ----
// Deed 1 (x 15..40, y 23..41) holds the house spot, the front yard, a little pond, the Land Office board and the
// entrance road; deed 2 opens the lake to the north-west, the flower meadow to the west and the boulder field to the
// east; deed 3 claims the north woods and both far edges. Everything outside the current deed is drawn as thicket.
(function () {
  const m = newMap('homestead', 'YOUR HOMESTEAD', 56, 44, 'g', { music: 'town', enc: null, bg: 'grass' });
  // Woods all round: two solid rows of round trees and pines, a ragged third row.
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
    if (d < 2 || (d === 2 && hash(x, y) < .45)) set(m, x, y, hash(y, x) < .35 ? 'n' : '#');
  }

  // ---- Deed 1: home ----
  const HX = 24, HY = 26;                          // house spot: 7x5 at 24..30, 26..30; the door is on its bottom row
  m.homeSpot = { x: HX, y: HY };
  // Entrance road from the south edge up to the front yard.
  rect(m, 27, 31, 2, 13, 'p'); rect(m, 22, 31, 10, 1, 'p');
  // A small pond east of the road (fresh water for the watering can).
  blob(m, 36.5, 35, 2.6, 1.9, 'w', null, .05);
  scatter(m, 'r', [[34, 33], [39, 37]]); set(m, 38, 33, 'u');
  // Trees, bushes, stumps and a boulder to gather from right away.
  scatter(m, '#', [[17, 25], [16, 28], [39, 25], [38, 28], [18, 38], [35, 40]]);
  scatter(m, 'n', [[16, 24], [40, 27], [17, 40]]);
  scatter(m, 'u', [[20, 24], [33, 24], [21, 39], [32, 39], [40, 31]]);
  scatter(m, 'd', [[19, 28], [36, 27]]); scatter(m, 'r', [[18, 34]]);
  // Flowers by the Land Office board and along the yard.
  rect(m, 23, 35, 3, 2, 'f'); rect(m, 31, 29, 2, 2, 'f'); rect(m, 21, 29, 2, 2, 'f');
  // Lamp posts flanking the road where it meets the yard.
  scatter(m, 'l', [[26, 33], [29, 33]]);
  // Land Office notice board, mailbox, neighbour.
  set(m, 26, 36, 's');
  m.objs.push({ x: 26, y: 36, prompt: 'Land Office', fn: () => G.home && G.home.landOffice ? G.home.landOffice() : says('LAND OFFICE\nThe clerk is out. Come back later.') });
  m.props = [{ x: 32, y: 31, w: 1, h: 1, kind: 'mailbox' }];
  m.objs.push({ x: 32, y: 31, prompt: 'Mailbox', fn: () => mailbox() });
  npc(m, 31, 35, LEFT, 'mom', null, { roam: 1, talk: () => neighbour() });

  // ---- Deed 2: lake, flower meadow, boulder field ----
  blob(m, 13, 15, 5.5, 3.6, 'w', null, .12);
  rect(m, 12, 15, 2, 1, 'g'); set(m, 13, 14, 'g');          // a reedy islet you can see but not reach
  scatter(m, 'u', [[12, 15]]); scatter(m, 'd', [[8, 12], [19, 18]]); scatter(m, 'r', [[18, 12], [7, 17]]);
  blob(m, 10, 31, 3.5, 4.5, 'f', ['g']);                     // west meadow
  scatter(m, 'u', [[8, 27], [12, 35]]); scatter(m, '#', [[9, 22], [11, 24], [8, 38], [12, 39]]);
  scatter(m, 'r', [[44, 15], [46, 16], [45, 18], [43, 19], [47, 13]]); scatter(m, 'd', [[46, 22]]);   // east boulder field
  scatter(m, '#', [[44, 26], [47, 29], [45, 33], [43, 38], [47, 37]]); scatter(m, 'n', [[46, 25], [44, 35]]);
  scatter(m, 'u', [[43, 23], [47, 31], [44, 40]]);
  blob(m, 30, 15, 4, 2.2, 'f', ['g']);                         // flowers north of the house
  scatter(m, '#', [[22, 13], [36, 12], [24, 18], [35, 19]]); scatter(m, 'u', [[26, 12], [33, 17]]); scatter(m, 'd', [[29, 19]]);

  // ---- Deed 3: the north woods and the far edges ----
  for (let y = 3; y <= 9; y++) for (let x = 3; x <= 52; x++) if (m.t[y][x] === 'g' && hash(x * 7, y) < .22) set(m, x, y, hash(x, y * 5) < .5 ? 'n' : '#');
  blob(m, 41, 6, 4, 2, 'f', ['g']); blob(m, 16, 5, 3, 1.5, 'f', ['g']);
  scatter(m, 'r', [[50, 10], [51, 20], [4, 22], [3, 30], [51, 34]]); scatter(m, 'u', [[4, 12], [52, 15], [4, 37], [51, 40]]);
  scatter(m, '#', [[5, 26], [50, 28], [4, 41]]); scatter(m, 'd', [[5, 33], [50, 38]]);

  // Keep the 7x5 house spot and the ground in front of the door clear (last, over anything above).
  rect(m, HX, HY, 7, 5, 'g'); rect(m, HX - 1, HY - 1, 9, 1, 'g'); rect(m, 27, 31, 2, 13, 'p');

  // Five parcels, released as you earn Arena badges (0, 1, 3, 5, 7). The first is a small yard around the cabin.
  m.zones = [
    { deed: 1, x: 19, y: 24, w: 18, h: 17 },
    { deed: 2, x: 15, y: 23, w: 26, h: 19 },
    { deed: 3, x: 6, y: 10, w: 44, h: 32 },
    { deed: 4, x: 3, y: 5, w: 50, h: 37 },
    { deed: 5, x: 1, y: 1, w: 54, h: 42 },
  ];
  m.landing = { x: 33, y: 37 };
  m.labels = [{ x: 26, y: 36, text: 'LAND OFFICE', style: 'home' }];
  warp(m, 27, 43, 'lanternrest', 50, 1, DOWN); warp(m, 28, 43, 'lanternrest', 51, 1, DOWN);

  async function mailbox() {
    const f = G.state.flags;
    if (!f.homeMail) {
      f.homeMail = true; G.audio.sfx('levelup');
      await says(['There is a letter in the mailbox!', 'WELCOME HOME, WARDEN!\nThis land and the little cabin on it are yours now. The vale thanks you.',
        'Cut wood and break stone around the yard, build at START > BUILD, and plant seeds in Garden Plots. Water them every day!',
        'When you want more room, the Land Office board by the road sells the next deed. - The Lanternrest Council']);
    } else await says(['The mailbox is empty. The council\'s welcome letter is tucked in your bag of keepsakes.', 'Tip: sleeping in your bed starts a new day. Crops grow overnight.']);
  }
  async function neighbour() {
    const f = G.state.flags, lines = [
      ['NEIGHBOUR TANSY: Oh, hello! You must be the new Warden. I keep the farm over the hill.', 'Press START and pick BUILD to put up anything you like: plots, sheds, a forge... It all needs materials.',
        'Face a tree, bush or boulder and press A to gather Wood, Fiber and Stone. Each one grows back after a while.'],
      ['NEIGHBOUR TANSY: For farming, build a Garden Plot, plant seeds, and water it every day.', 'You need a Watering Can for that. Meadowbrook Seeds in Sunmeadow sells cans and seeds. Refill the can at any water, like your pond.',
        'Sleep in your bed to start a new day. Watered crops grow overnight!'],
      ['NEIGHBOUR TANSY: See the brambles round your plot? That land belongs to the Land Office.', 'Buy a deed at the board by the road and they clear the thicket for you. More room to build!',
        'And upgrade your house when you can. A bigger home gets a kitchen, a bath and more storage.'],
    ];
    const i = f.tansy || 0; f.tansy = (i + 1) % lines.length;
    await says(lines[i]);
  }
})();

// ---- House interiors ----------------------------------------------------------------
// Each layout is a string grid: B wall, . wooden floor, , tiled floor (kitchens, bathrooms), m exit mat.
// Furniture goes in m.props (drawn by the prop art and blocked by the lead) with a matching object on every cell.
const floorTile = () => (G.TILES && G.TILES.v ? 'v' : 'T');
const PROMPT = { bed: 'Sleep', bed2: 'Sleep', stove: 'Cook', fridge: 'Fridge', counter: 'Counter', sink: 'Sink', toilet: 'Toilet', shower: 'Shower', bath: 'Bath',
  sofa: 'Rest', armchair: 'Armchair', tv: 'Watch TV', bookshelf: 'Recipe book', cupboard: 'Cupboard', chest: 'Chest', table: 'Table', desk: 'Ledger', plant: 'Plant',
  lamp: 'Lamp', wardrobe: 'Wardrobe', trophy: 'Trophies', petbed: 'Pet bed', painting: 'Painting', fireplace: 'Fireplace', piano: 'Piano' };
const FLAVOUR = {
  bed: 'A cosy bed with a patchwork quilt.', bed2: 'A big soft double bed.', stove: 'A little wood-burning stove.', fridge: 'A cold box full of nothing yet.',
  counter: 'A clean wooden worktop.', sink: 'A sink with a squeaky tap.', toilet: 'You wash your hands. Good habit!', shower: 'A shower with a sunflower head.',
  bath: 'A deep tub with lion feet.', sofa: 'A squashy sofa. Very sit-able.', armchair: 'A comfy armchair by the window.', tv: 'The TV shows a cooking programme.',
  bookshelf: 'Books about creatures, crops and cooking.', cupboard: 'A roomy cupboard.', chest: 'A sturdy chest with brass corners.', table: 'A sturdy table.',
  desk: 'A writing desk with a ledger on it.', plant: 'A happy little houseplant.', lamp: 'A warm reading lamp.', wardrobe: 'Your clothes hang neatly inside.',
  trophy: 'A shelf of trophies and keepsakes.', petbed: 'A round cushion with paw prints.', painting: 'A painting of the Great Lantern at night.',
  fireplace: 'The fire crackles and pops.', piano: 'You plink a few happy notes.' };
const ALIAS = { bed2: 'bed', chest: 'cupboard' };   // fall back to a sibling behaviour when there is no dedicated one
function furnish(m, lvl, list) {
  m.props = m.props || [];
  for (const [kind, x, y, w, h, room] of list) {
    const p = { x, y, w: w || 1, h: h || 1, kind, info: { lvl, room } };
    if (kind === 'rug') p.flat = true;   // paintings hang on the top wall row itself
    m.props.push(p);
    if (kind === 'rug') continue;
    const info = { lvl, room, kind, id: m.id + ':' + kind + ':' + x + ',' + y };
    const fn = () => { const F = G.homeFurn, k = F && (F[kind] ? kind : (ALIAS[kind] && F[ALIAS[kind]] ? ALIAS[kind] : null)); return k ? F[k](info) : says(FLAVOUR[kind] || 'Nice.'); };
    for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) m.objs.push({ x: x + i, y: y + j, prompt: PROMPT[kind] || kind, furn: kind, fn });
  }
}
// Default exit landing: in front of where that level's door would be with the house at the home spot (the lead re-aims it).
const EXIT = { 1: [25, 29], 2: [26, 30], 3: [26, 30], 4: [27, 31] };
function house(id, name, lvl, rows, furniture, rooms) {
  const h = rows.length, w = rows[0].length, mat = rows[h - 1].indexOf('m');
  const m = interior(id, name, w, h, mat), fl = floorTile();
  rows.forEach((r, y) => [...r].forEach((c, x) => set(m, x, y, c === '.' ? 'T' : c === ',' ? fl : c)));
  furnish(m, lvl, furniture);
  m.rooms = rooms;
  warp(m, mat, h - 1, 'homestead', EXIT[lvl][0], EXIT[lvl][1], DOWN);
  return m;
}

// L1 cabin (9x7): a bed nook and a living area.
house('home1', 'YOUR CABIN', 1, [
  'BBBBBBBBB',
  'B..B....B',
  'B..B....B',
  'B.......B',
  'B.......B',
  'B.......B',
  'BBBBmBBBB',
], [
  ['bed', 1, 1, 1, 2], ['lamp', 2, 1], ['wardrobe', 1, 4],
  ['bookshelf', 4, 1], ['fireplace', 5, 1], ['cupboard', 7, 1], ['painting', 6, 0],
  ['rug', 4, 3, 3, 2], ['table', 5, 3], ['armchair', 7, 3], ['plant', 7, 5], ['chest', 1, 5],
], [{ name: 'Bedroom', x: 1, y: 1, w: 2, h: 2 }, { name: 'Living area', x: 3, y: 1, w: 5, h: 5 }]);

// L2 cottage (13x9): bedroom, kitchen, bathroom, living area.
house('home2', 'YOUR COTTAGE', 2, [
  'BBBBBBBBBBBBB',
  'B....B,,,,,,B',
  'B....B,,,,,,B',
  'B....B,,,,,,B',
  'BB.BBBB.BBBBB',
  'B.......B,,,B',
  'B.......,,,,B',
  'B.......B,,,B',
  'BBBBBBmBBBBBB',
], [
  ['bed', 1, 1, 1, 2], ['lamp', 2, 1], ['wardrobe', 4, 1], ['chest', 4, 3], ['painting', 3, 0], ['rug', 2, 2, 2, 1],
  ['fridge', 6, 1], ['stove', 7, 1], ['counter', 8, 1], ['sink', 9, 1], ['counter', 10, 1], ['cupboard', 11, 1], ['table', 10, 3], ['plant', 11, 3],
  ['toilet', 9, 5], ['shower', 11, 5], ['sink', 11, 7],
  ['lamp', 1, 5], ['sofa', 3, 5, 2, 1], ['bookshelf', 5, 5], ['rug', 3, 6, 3, 1], ['table', 4, 6], ['armchair', 1, 7], ['plant', 7, 7], ['desk', 6, 5],
], [{ name: 'Bedroom', x: 1, y: 1, w: 4, h: 3 }, { name: 'Kitchen', x: 6, y: 1, w: 6, h: 3 }, { name: 'Bathroom', x: 9, y: 5, w: 3, h: 3 }, { name: 'Living area', x: 1, y: 5, w: 7, h: 3 }]);

// L3 family home (16x11): bedroom, spare room, kitchen along the top; storage, lounge and bathroom along the bottom.
house('home3', 'YOUR FAMILY HOME', 3, [
  'BBBBBBBBBBBBBBBB',
  'B....B....B,,,,B',
  'B....B....B,,,,B',
  'B....B....B,,,,B',
  'BB.BBBBB.BBBB,BB',
  'B..............B',
  'BB.BB......BB,BB',
  'B...B......B,,,B',
  'B...B......B,,,B',
  'B...B......B,,,B',
  'BBBBBBBmBBBBBBBB',
], [
  ['bed2', 3, 1, 2, 2], ['lamp', 1, 1], ['wardrobe', 1, 3], ['plant', 4, 3], ['painting', 2, 0],
  ['bed', 6, 1, 1, 2], ['plant', 7, 1], ['desk', 9, 1], ['chest', 9, 3],
  ['fridge', 11, 1], ['stove', 12, 1], ['counter', 13, 1], ['sink', 14, 1], ['table', 11, 3], ['cupboard', 14, 3],
  ['plant', 1, 5], ['plant', 14, 5],
  ['cupboard', 1, 7], ['chest', 3, 7], ['chest', 1, 9], ['chest', 3, 9],
  ['tv', 8, 6], ['rug', 6, 7, 4, 2], ['sofa', 7, 8, 2, 1], ['armchair', 5, 7], ['bookshelf', 10, 7], ['fireplace', 10, 6], ['lamp', 5, 9], ['plant', 10, 9],
  ['toilet', 12, 7], ['shower', 14, 7], ['sink', 12, 9], ['plant', 14, 9],
], [{ name: 'Bedroom', x: 1, y: 1, w: 4, h: 3 }, { name: 'Spare room', x: 6, y: 1, w: 4, h: 3 }, { name: 'Kitchen', x: 11, y: 1, w: 4, h: 3 },
  { name: 'Storage', x: 1, y: 7, w: 3, h: 3 }, { name: 'Lounge', x: 5, y: 6, w: 6, h: 4 }, { name: 'Bathroom', x: 12, y: 7, w: 3, h: 3 }]);

// L4 grand homestead (22x14): master bedroom, spare room, bathroom with a bath and the chef's kitchen along the top;
// the creature room, a big lounge and the trophy hall along the bottom; a hall runs between them.
house('home4', 'YOUR GRAND HOMESTEAD', 4, [
  'BBBBBBBBBBBBBBBBBBBBBB',
  'B.....B....B,,,B,,,,,B',
  'B.....B....B,,,B,,,,,B',
  'B.....B....B,,,B,,,,,B',
  'B.....B....B,,,B,,,,,B',
  'BBB.BBBBB.BBB,BBBB,BBB',
  'B....................B',
  'BBB.BBB.......BBB.BBBB',
  'B.....B.......B......B',
  'B.....B.......B......B',
  'B.....B.......B......B',
  'B.....B.......B......B',
  'B.....B.......B......B',
  'BBBBBBBBBBmBBBBBBBBBBB',
], [
  // master bedroom
  ['bed2', 1, 1, 2, 2], ['lamp', 3, 1], ['wardrobe', 5, 1], ['rug', 2, 3, 3, 1], ['desk', 5, 3], ['plant', 1, 4], ['painting', 4, 0],
  // spare room
  ['bed', 7, 1, 1, 2], ['lamp', 8, 1], ['chest', 10, 1], ['bookshelf', 10, 4], ['plant', 7, 4],
  // bathroom
  ['bath', 12, 1, 2, 1], ['toilet', 14, 1], ['shower', 14, 3], ['sink', 12, 3], ['plant', 12, 4],
  // chef's kitchen
  ['fridge', 16, 1], ['stove', 17, 1], ['stove', 18, 1], ['sink', 19, 1], ['cupboard', 20, 1], ['counter', 17, 3, 2, 1], ['table', 20, 4], ['plant', 16, 4],
  // hall
  ['plant', 1, 6], ['lamp', 11, 6], ['plant', 20, 6],
  // creature room
  ['petbed', 1, 8], ['petbed', 5, 8], ['petbed', 1, 12], ['rug', 2, 10, 3, 1], ['plant', 5, 12], ['chest', 1, 10],
  // lounge
  ['fireplace', 7, 8], ['tv', 10, 8], ['piano', 12, 8, 2, 1], ['rug', 8, 9, 5, 2], ['sofa', 9, 11, 2, 1], ['armchair', 7, 10], ['armchair', 13, 10], ['lamp', 7, 12], ['plant', 13, 12],
  // trophy hall
  ['trophy', 15, 8], ['trophy', 16, 8], ['trophy', 20, 8], ['trophy', 20, 10], ['rug', 16, 10, 3, 2], ['painting', 18, 7], ['trophy', 15, 12], ['plant', 20, 12],
], [{ name: 'Master bedroom', x: 1, y: 1, w: 5, h: 4 }, { name: 'Spare room', x: 7, y: 1, w: 4, h: 4 }, { name: 'Bathroom', x: 12, y: 1, w: 3, h: 4 },
  { name: "Chef's kitchen", x: 16, y: 1, w: 5, h: 4 }, { name: 'Creature room', x: 1, y: 8, w: 5, h: 5 }, { name: 'Lounge', x: 7, y: 7, w: 7, h: 6 }, { name: 'Trophy hall', x: 15, y: 8, w: 6, h: 5 }]);

// Static stand-ins for the house door (one per level), so the map data alone links every interior. They carry the
// lead's `_b` flag: G.applyBuilds strips them on load and stamps the real door warp of the house you actually have.
[['home1', 25, 28], ['home2', 26, 29], ['home3', 27, 29], ['home4', 27, 30]].forEach(([to, x, y]) => {
  const im = G.MAPS[to]; G.MAPS.homestead.warps.push({ _b: true, x, y, to, tx: im.warps[0].x, ty: im.h - 2, dir: UP });
});
})();
