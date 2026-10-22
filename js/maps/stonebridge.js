// STONEBRIDGE TOWN (south): a town built across a river gorge, with stone bridges, waterfalls, a mill, a Healing Centre, a shop and the first Arena.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, interior, warp, npc, sign, DOWN, UP, LEFT, RIGHT } = G.mk;

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
  }
}
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id, item: name, ball: true }, qty ? { qty } : {}));
const it = (item, cat) => ({ item, cat });

G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, {
  keystone: { name: 'KEYSTONE MARKET', place: 'STONEBRIDGE', color: '#8a8ab4', greet: 'Welcome to the Keystone Market! Good stone, good stock, and a fair price for good materials.', bye: 'Mind the bridges, they are slippery in spring!',
    stock: [it('Potion', 'MEDICINE'), it('Super Potion', 'MEDICINE'), it('Full Heal', 'MEDICINE'), it('Revive', 'MEDICINE'), it('Terra Orb', 'ORBS'), it('Stone Orb', 'ORBS'), it('Aqua Orb', 'ORBS'), it('Stone', 'MATERIALS'), it('Brick', 'MATERIALS'), it('Pickaxe', 'TOOLS')],
    sells: ['mat', 'Pearl'], rate: .5 },
});

(function () {
  const m = newMap('stonebridge', 'STONEBRIDGE TOWN', 56, 44, 'g', { music: 'town', biome: 'meadow', enc: null });
  m.landing = { x: 26, y: 20 };
  const W = m.w, H = m.h;
  // river geometry: it enters at the top (x 37..40), drops over a waterfall, meanders south and spills over a second fall into a pool
  const cx = y => y <= 8 ? 39 : 39 + Math.round(1.3 * Math.sin((y - 8) / 6));
  const bridgeRows = [[10, 11], [22, 23], [29, 30]];
  const nearBridge = y => bridgeRows.some(([a, b]) => y >= a - 1 && y <= b + 1);

  // -- the forest rim --
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (d < 2 || (d === 2 && hash(x, y) < .45)) set(m, x, y, hash(y, x) < .35 ? 'n' : '#');
  }
  // -- the cliff band across the north: the plateau above it is wooded --
  rect(m, 2, 5, 52, 2, 'E'); rect(m, 26, 5, 4, 2, 'g');
  for (let x = 3; x < 53; x++) if (hash(x, 4) < .6 && !(x >= 26 && x <= 29)) set(m, x, 4, hash(x, 9) < .5 ? 'n' : '#');
  for (let x = 3; x < 53; x++) if (hash(x, 3) < .5 && !(x >= 26 && x <= 29)) set(m, x, 3, hash(x, 8) < .5 ? 'n' : '#');
  // -- the great river --
  for (let y = 1; y < H - 2; y++) {
    let a = cx(y) - 2, b = cx(y) + 1, ch = 'w';
    if (y >= 4 && y <= 6) ch = '@';
    if (y >= 33 && y <= 35) ch = '@';
    if (y >= 36) { a -= Math.min(3, y - 35); b += Math.min(3, y - 35); }
    rect(m, a, y, b - a + 1, 1, ch);
  }
  // pool basin at the foot of the falls
  blob(m, cx(38), 39, 7, 3.4, 'w', null, .12);
  // cliffs along the gorge, left open where bridges and paths cross
  for (let y = 7; y <= 35; y++) {
    if (nearBridge(y)) continue;
    set(m, cx(y) - 3, y, 'E'); set(m, cx(y) + 2, y, 'E');
  }
  for (let x = 36; x <= 41; x++) { set(m, x, 5, '@'); }
  scatter(m, 'r', [[cx(36) - 5, 37], [cx(36) + 4, 37], [cx(40) - 6, 41], [cx(40) + 5, 40], [cx(36) - 4, 36], [cx(36) + 3, 36]]);

  // -- the pond below the west fall, and the creek running east to the river --
  rect(m, 8, 4, 2, 3, '@'); rect(m, 7, 5, 4, 2, 'E'); rect(m, 8, 5, 2, 2, '@');
  blob(m, 8, 10, 4.2, 3, 'w', null, .1); rect(m, 8, 7, 2, 1, 'w');
  rect(m, 12, 12, cx(12) - 3 - 12, 2, 'w');
  rect(m, cx(12) - 3, 12, 1, 2, '@');                       // the creek spills into the river
  rect(m, cx(12) - 3, 12, 1, 2, '@');
  scatter(m, 'r', [[4, 8], [5, 13], [11, 13], [12, 8], [4, 11]]);

  // -- ground detail: flowers and meadow --
  rect(m, 15, 7, 10, 4, 'g');
  // -- stone bridges (V): drawn only over water, so they fit any bank --
  const bridge = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (m.t[y][x] === 'w' || m.t[y][x] === 'E') set(m, x, y, 'V'); };
  for (const [a, b] of bridgeRows) bridge(cx(a) - 3, a, cx(a) + 2, b);
  bridge(27, 12, 28, 13);                                    // the north road over the creek
  bridge(9, 12, 10, 13); bridge(19, 12, 20, 13);             // two footbridges over the creek
  // -- main street, the north road and the south road --
  rect(m, 27, 0, 2, 12, 'p'); rect(m, 27, 14, 2, 4, 'p');
  rect(m, 0, 22, cx(22) - 2, 2, 'p'); rect(m, cx(22) + 2, 22, W - cx(22) - 2, 2, 'p');
  rect(m, 27, 28, 2, 16, 'p');
  // -- the plaza --
  rect(m, 15, 17, 20, 8, '%'); rect(m, 17, 16, 16, 1, '%'); rect(m, 17, 25, 16, 1, '%');
  rect(m, 27, 14, 2, 3, '%');
  rect(m, 14, 22, 1, 2, '%'); rect(m, 35, 22, 2, 2, '%');
  // a back lane behind the southern houses
  rect(m, 3, 29, 24, 1, 'p'); rect(m, 29, 29, 6, 1, 'p'); rect(m, 4, 24, 1, 5, 'p'); rect(m, 34, 26, 1, 4, 'p');
  rect(m, 21, 25, 1, 4, 'p');
  rect(m, 23, 12, 1, 0, 'p');
  // north lane along the creek, leading to the mill
  rect(m, 15, 11, 22, 1, 'p'); rect(m, 27, 11, 2, 1, 'p');

  // -- Healing Centre and Keystone Market on the north side of the plaza --
  building(m, 19, 14, 6, 'R', 3);     // door (22,16)
  building(m, 30, 14, 6, 'Q', 3);     // door (33,16)  Keystone Market
  // (the creek lies just north; lamps and flowers soften the line)
  // -- the Arena on the east bank --
  building(m, 44, 14, 9, 'U', 4);     // door (48,16)
  rect(m, 43, 17, 11, 5, '%'); rect(m, 48, 17, 2, 5, '%');
  scatter(m, 'l', [[43, 17], [53, 17], [46, 19], [51, 19]]);
  rect(m, 43, 14, 1, 3, 'F'); rect(m, 53, 14, 1, 3, 'F');
  // -- the mill, by the river --
  building(m, 31, 7, 5, 'R', 2);      // door (33,9)
  rect(m, 33, 10, 1, 1, 'p'); rect(m, 36, 9, 1, 3, 'd'); set(m, 36, 9, 'd');
  scatter(m, 'x', []);
  // -- west houses --
  building(m, 6, 17, 5, 'R', 2);      // door (8,19)  Cottage
  building(m, 14, 18, 3, 'Q', -1);    // stone house (no door)
  rect(m, 8, 20, 1, 2, 'p'); rect(m, 4, 22, 3, 2, 'p');
  building(m, 17, 7, 5, 'Q', 2);      // door (19,9), north bank house
  rect(m, 19, 10, 1, 1, 'p');
  building(m, 8, 26, 5, 'R', -1);
  building(m, 14, 26, 5, 'Q', -1);
  building(m, 29, 26, 5, 'R', -1);
  building(m, 36, 26, 4, 'Q', -1); // across the south road, east of the plaza (stone house)
  // -- the east bank --
  building(m, 44, 26, 5, 'R', -1);
  rect(m, 46, 29, 1, 1, 'p'); rect(m, 42, 29, 12, 1, 'p'); rect(m, 42, 24, 1, 6, 'p');
  // -- scenery --
  const grove = (x, y, w, h, chs, pct) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j, k = hash(X, Y); if (m.t[Y] && m.t[Y][X] === 'g' && k < pct) set(m, X, Y, chs[Math.floor(hash(Y, X) * chs.length)]); } };
  grove(2, 30, 6, 12, ['#', 'n', 'u'], .25); grove(10, 31, 14, 10, ['#', 'n', 'u'], .2); grove(30, 31, 6, 10, ['#', 'u'], .2);
  grove(44, 31, 10, 11, ['#', 'n', 'u'], .2); grove(42, 7, 12, 6, ['#', 'n'], .4); grove(15, 7, 2, 4, ['u'], .5); grove(2, 14, 10, 9, ['#', 'u'], .15);
  grove(20, 7, 8, 4, ['u', 'f'], .3);
  // clear flat building ground (6x6 each): south-west and south-east
  rect(m, 4, 31, 7, 7, 'g'); rect(m, 44, 32, 7, 7, 'g');
  rect(m, 22, 31, 4, 1, 'f'); rect(m, 29, 33, 4, 2, 'f'); rect(m, 15, 20, 3, 1, 'f');
  scatter(m, 'f', [[11, 23], [12, 22], [24, 8], [25, 9], [45, 24], [50, 24], [16, 17], [33, 24]]);
  scatter(m, 'l', [[21, 17], [33, 17], [26, 22], [30, 22], [26, 14], [30, 14], [14, 21], [41, 21], [36, 21], [26, 29], [30, 29], [18, 11], [34, 11], [8, 22], [24, 28]]);
  scatter(m, 'u', [[15, 24], [16, 24], [34, 24], [35, 24], [17, 17], [18, 17], [20, 13], [24, 13]]);
  scatter(m, 'd', [[41, 12], [14, 29], [33, 35]]);
  // flowering banks on the plaza edge
  rect(m, 15, 24, 2, 1, 'f'); rect(m, 33, 24, 2, 1, 'f');

  // -- signs --
  sign(m, 26, 8, 'STONEBRIDGE TOWN\nThree bridges, two waterfalls, one very old Arena.');
  sign(m, 46, 19, 'STONEBRIDGE ARENA\nLeader of the Rock type. Prove your bond to earn the KEYSTONE BADGE.');
  sign(m, 13, 24, 'MAIN BRIDGE\nStone laid by hand, a century ago. East: Whispering Woods. West: Mirewood.');
  sign(m, 26, 36, 'TIDEPOOL SHORE\nThe south road follows the waterfalls down to the beach.');
  sign(m, 6, 12, 'THE WHISTLING FALLS\nThe creek sings when the wind is from the north.');

  // -- items --
  item(m, 5, 41, 'sb_potion', 'Potion');                // south-west grove
  item(m, 3, 16, 'sb_orb', 'Terra Orb', 2);             // behind the west trees
  item(m, 51, 8, 'sb_sp', 'Super Potion');              // secret nook, north-east
  item(m, 52, 41, 'sb_shard', 'Crystal Shard');         // beside the pool
  item(m, 13, 9, 'sb_heal', 'Full Heal');               // by the pond

  // -- people --
  npc(m, 26, 10, DOWN, 'old', ['ELDER BRIGG: Welcome to Stonebridge! Our bridges are older than the Lantern itself.', 'The Arena is across the Main Bridge. Its Leader is a Rock-type master. Water and Grass creatures do well there.'], { still: true });
  npc(m, 23, 20, RIGHT, 'kid', ['I can hear the waterfall from my bed. Dad says it is a hundred cats purring.'], { roam: 2 });
  npc(m, 31, 19, LEFT, 'lass', ['The Healing Centre is the red-roofed one. It is free! Even the grumpy Warden from Mirewood uses it.'], { roam: 1 });
  npc(m, 50, 23, UP, 'hiker', ['East of here the road climbs into the Whispering Woods. You will need a Keystone Badge to pass the ranger.', 'The woods glow at night. They say a hidden shrine sleeps somewhere inside.'], { still: true });
  npc(m, 44, 20, RIGHT, 'camper', ['I came to challenge the Arena. Then I saw the lines. Now I am just here for the view.'], { roam: 1 });
  npc(m, 33, 12, DOWN, 'mom', ['The mill grinds flour for the whole town. Bring me Wheat and I will tell you a bread recipe!'], { roam: 1 });
  npc(m, 12, 28, RIGHT, 'bug', ['The pond below the Whistling Falls is full of Dewsnail and Padhop.', 'South of town the river tumbles down to Tidepool Shore. Follow the road past the pool.'], { roam: 1 });
  npc(m, 37, 30, DOWN, 'boy', ['I jumped off the lower falls once. Once.'], { still: true });
  npc(m, 41, 30, UP, 'old', ['The pool at the bottom of the falls is deep. Old Stonebridge folk say the river keeps lost keys and lost tempers.'], { still: true });
  npc(m, 9, 22, UP, 'girl', ['The west road runs back to Mirewood Marsh. Mind the boardwalks!'], { roam: 1 });

  m.labels = [
    { x: 22, y: 14, text: 'HEALING CENTRE', style: 'heal' },
    { x: 33, y: 14, text: 'KEYSTONE MARKET', style: 'shop' },
    { x: 48, y: 14, text: 'STONEBRIDGE ARENA', style: 'arena' },
    { x: 33, y: 7, text: 'STONEBRIDGE MILL', style: 'craft' },
  ];
  // -- doors --
  warp(m, 22, 16, 'stoneheal', 3, 6, UP);
  warp(m, 33, 16, 'stonemart', 3, 6, UP);
  warp(m, 48, 16, 'arena_stonebridge', 0, 0, UP);
  warp(m, 33, 9, 'stonemill', 3, 6, UP);
  warp(m, 8, 19, 'stonehouse1', 3, 6, UP);
  warp(m, 19, 9, 'stonehouse2', 3, 6, UP);
  // -- exits --
  G.mk.edgeExit(m, 'N', 27, 'lanternrest', 28, 50);
  G.mk.edgeExit(m, 'W', 22, 'mirewood', 74, 24);
  G.mk.edgeExit(m, 'S', 27, 'shore', 30, 1);
  G.mk.edgeExit(m, 'E', 22, 'whispering', 1, 24, G.mk.gate(1, 'WHISPERING WOODS'));
})();

// ---- interiors ----
(function () {
  const m = interior('stoneheal', 'STONEBRIDGE HEALING CENTRE', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); set(m, 1, 1, 'h'); scatter(m, 'S', [[6, 1]]); rect(m, 5, 4, 2, 1, 'a'); set(m, 1, 5, 't');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 6, 5, LEFT, 'lass', ['The mist from the falls gets in everywhere. Creatures love it, the machines do not.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING CENTRE' }) : G.story.nurse() });
  warp(m, 3, 6, 'stonebridge', 22, 17, DOWN);
})();
(function () {
  const m = interior('stonemart', 'KEYSTONE MARKET', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); scatter(m, 'S', [[1, 1], [1, 2], [6, 1]]); scatter(m, 'x', [[1, 4], [6, 4]]); set(m, 6, 5, 't');
  npc(m, 4, 1, DOWN, 'clerk', null, { still: true });
  npc(m, 1, 5, RIGHT, 'boy', ['Stone and Brick are cheap here. The bridgewrights buy them by the cartload.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Shop', fn: () => G.openShop ? G.openShop('keystone') : G.story.says('The market stalls are empty today.') });
  warp(m, 3, 6, 'stonebridge', 33, 17, DOWN);
})();
(function () {
  const m = interior('stonemill', 'STONEBRIDGE MILL', 8, 7, 3);
  scatter(m, 'x', [[1, 1], [2, 1], [1, 2], [6, 1], [6, 2], [6, 4]]); rect(m, 3, 2, 2, 1, 't'); rect(m, 2, 4, 2, 1, 'a');
  npc(m, 5, 3, LEFT, 'mom', ['MILLER ADA: The wheel never stops turning, and neither do I.', 'Flour for bread, bread for Wardens. Everyone eats in Stonebridge.'], { still: true });
  npc(m, 1, 5, UP, 'kid', ['I am counting the sacks. There are more than I can count.']);
  warp(m, 3, 6, 'stonebridge', 33, 10, DOWN);
})();
(function () {
  const m = interior('stonehouse1', 'COTTAGE', 8, 7, 3);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 2, 1, 'a'); scatter(m, 'S', [[6, 1]]);
  npc(m, 3, 3, RIGHT, 'old', ['My grandson is challenging the Arena. He has lost four times. He is very determined.', 'Rock-types are slow, he says. I say they are patient.']);
  warp(m, 3, 6, 'stonebridge', 8, 20, DOWN);
})();
(function () {
  const m = interior('stonehouse2', 'RIVERSIDE HOUSE', 8, 7, 3);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 2, 1, 'a'); scatter(m, 'S', [[2, 1]]);
  npc(m, 4, 3, LEFT, 'bug', ['I watch the creek for Dewsnail every morning. This one is called Sir Slime.']);
  npc(m, 6, 5, UP, 'girl', ['Fall asleep to the waterfall, wake up to the other waterfall.']);
  warp(m, 3, 6, 'stonebridge', 19, 10, DOWN);
})();
})();
