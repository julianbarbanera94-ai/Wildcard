// TIDEFALL ISLANDS (south): a chain of islets joined by rope bridges, with a fishing hamlet, a pier and a ferry to Driftwood and beyond.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, interior, warp, npc, sign, trainer, edgeExit, wild, DOWN, UP, LEFT, RIGHT } = G.mk;

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
  tidefall: { name: 'REEFSIDE TRADER', place: 'TIDEFALL ISLANDS', color: '#2aaed0', greet: 'Fresh off the boat! Orbs, bandages and a little bit of everything for island life.', bye: 'Fair winds, Warden!',
    stock: [it('Potion', 'MEDICINE'), it('Super Potion', 'MEDICINE'), it('Full Heal', 'MEDICINE'), it('Revive', 'MEDICINE'), it('Aqua Orb', 'ORBS'), it('Gale Orb', 'ORBS'), it('Verdant Orb', 'ORBS'), it('Rope', 'MATERIALS'), it('Fiber', 'MATERIALS'), it('Pumpkin Seeds', 'SEEDS')],
    sells: ['Pearl', 'mat', 'crop'], rate: .55 },
});

(function () {
  const m = newMap('tidefall', 'TIDEFALL ISLANDS', 60, 46, 'w', { music: 'route', biome: 'tropical',
    enc: wild(['Water', 'Grass', 'Flying', 'Bug'], 24, 30, { pick: 8 }) });
  m.landing = { x: 31, y: 21 };
  const P = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (m.t[j] && 'ygfGu#npdlF'.includes(m.t[j][i])) set(m, i, j, 'p'); };
  const land = (cx, cy, rx, ry, rag) => { blob(m, cx, cy, rx, ry, 'y', null, rag == null ? .16 : rag); blob(m, cx, cy, rx - 1.6, ry - 1.4, 'g', ['y'], .2); };
  // -- the islets --
  land(30, 6, 12, 5);                      // north isle: the landing from Mirewood
  land(10, 18, 8, 6);                      // west isle
  land(31, 22, 13, 7);                     // the central isle: the fishing hamlet
  land(51, 15, 7, 6);                      // east isle
  land(13, 36, 8, 5);                      // south-west isle
  land(46, 36, 9, 5);                      // south-east isle with the lagoon
  land(31, 41, 4, 2.6, .1);                // the far islet
  rect(m, 29, 0, 4, 4, 'y'); rect(m, 30, 0, 2, 8, 'y');   // the sandbar down from Mirewood
  // -- lagoons inside the islands --
  blob(m, 46, 36, 4.2, 2, 'w', null, .1); blob(m, 8, 18, 2.4, 1.8, 'w', null, .1); blob(m, 51, 14, 2.2, 1.6, 'w', null, .1); blob(m, 13, 36, 2.6, 1.5, 'w', null, .1); blob(m, 29, 5, 3, 1.6, 'w', null, .1);
  // -- rope bridges (V) and boardwalks (z): drawn only over water so they fit --
  const bridge = (x0, y0, x1, y1, ch = 'V') => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (m.t[y][x] === 'w') set(m, x, y, ch); };
  bridge(30, 8, 31, 18);                                  // north isle to the hamlet
  bridge(14, 18, 24, 19);                                 // west isle to the hamlet
  bridge(40, 17, 48, 18); bridge(49, 17, 50, 18);        // hamlet to the east isle
  bridge(16, 28, 17, 32); bridge(17, 28, 24, 29);         // hamlet to the south-west isle
  bridge(38, 26, 45, 27); bridge(45, 27, 46, 32);         // hamlet to the south-east isle
  bridge(30, 29, 31, 38, 'z');                            // the pier and boardwalk south
  bridge(30, 28, 31, 36, 'z');
  // fix: bridges that start on sand should still be walkable on land. Land tiles are untouched.

  // -- tall grass --
  const gr = (cx, cy, rx, ry) => blob(m, cx, cy, rx, ry, 'G', ['g'], .25);
  gr(31, 5, 4, 1.8); gr(8, 21, 3, 2.2); gr(39, 25, 3, 2); gr(53, 13, 3, 2.4); gr(10, 38, 3.5, 2); gr(50, 38, 3, 1.6); gr(24, 22, 2.5, 1.8); gr(20, 6, 3, 1.5);
  // -- palms and jungle on the shores --
  const deco = (cx, cy, rx, ry, pr) => { for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) if ((m.t[y][x] === 'y' || m.t[y][x] === 'g') && hash(x, y) < pr) set(m, x, y, hash(y, x) < .6 ? '#' : 'u'); };
  deco(30, 6, 12, 5, .15); deco(10, 18, 8, 6, .2); deco(31, 22, 13, 7, .1); deco(51, 15, 7, 6, .2); deco(13, 36, 8, 5, .2); deco(46, 36, 9, 5, .2);
  scatter(m, '#', [[30, 40], [32, 42], [29, 42]]); scatter(m, 'r', [[2, 8], [5, 30], [20, 44], [38, 40], [57, 22], [57, 30], [4, 41], [53, 44]]);
  for (const [x, y] of [[3, 10], [40, 3], [55, 5], [3, 41], [56, 38], [22, 14], [42, 12], [28, 34], [5, 28]]) set(m, x, y, 'r');

  // -- the hamlet on the central isle: a plaza of sand, huts, a Healing Post, the Reefside Trader and the pier --
  rect(m, 22, 17, 20, 8, 'y'); rect(m, 23, 16, 18, 1, 'y'); rect(m, 23, 25, 18, 1, 'y');
  building(m, 23, 18, 5, 'R', 2);   // Healing Post, door (25,20)
  building(m, 34, 18, 6, 'Q', 3);   // Reefside Trader, door (37,20)
  building(m, 26, 14, 4, 'R', -1); building(m, 36, 14, 4, 'R', -1);  // huts behind (no doors)
  building(m, 38, 23, 4, 'Q', -1);  // fisher's hut
  rect(m, 25, 21, 1, 1, 'p'); rect(m, 37, 21, 1, 1, 'p');
  P(24, 22, 17, 2); P(30, 14, 2, 8); P(30, 24, 2, 4);
  scatter(m, 'F', [[22, 24], [23, 24], [24, 24], [25, 24]]); scatter(m, 'd', [[27, 24], [28, 25], [34, 24], [35, 24]]);
  scatter(m, 'l', [[29, 21], [32, 21], [29, 27], [32, 27], [22, 20], [41, 20]]);
  scatter(m, 'f', [[27, 20], [28, 20], [33, 20], [32, 20]]);
  // the pier and the dock
  rect(m, 30, 28, 2, 8, 'z'); rect(m, 29, 33, 1, 2, 'z'); rect(m, 32, 33, 1, 2, 'z');
  m.dock = { x: 30, y: 35 };
  m.npcs.push({ x: 31, y: 35, dir: DOWN, style: { hair: '#d8d8d8', skin: '#e8c098', shirt: '#2a6ab0', pants: '#304060', hat: '#f0f0f0' }, still: true, talk: () => G.ferry ? G.ferry('tidefall') : G.story.says('The ferry is not running yet.') });
  // the far islet at the end of the pier
  rect(m, 30, 36, 2, 4, 'z');
  scatter(m, 'f', [[29, 40], [33, 40]]);

  // -- paths on the other isles --
  P(30, 0, 2, 9); P(22, 6, 18, 2);
  P(8, 16, 14, 2); P(8, 16, 2, 8);
  P(41, 17, 11, 2); P(49, 10, 2, 8);
  P(8, 34, 10, 2); P(15, 28, 2, 8); P(17, 28, 6, 2);
  P(40, 34, 14, 2); P(45, 27, 2, 8); P(38, 26, 8, 2);
  P(22, 18, 2, 2);
  // open ground to build on: two flat 6x6 spots of grass
  rect(m, 5, 31, 6, 6, 'g'); rect(m, 52, 33, 6, 6, 'g'); rect(m, 38, 2, 0, 0, 'g');
  for (const [x, y] of [[5, 31], [52, 33]]) for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) set(m, x + i, y + j, 'g');
  set(m, 5, 31, 'g');

  // -- signs --
  sign(m, 29, 9, 'TIDEFALL ISLANDS\nA chain of islets. The ferry pier is on the big island, south of the bridge.');
  sign(m, 33, 28, 'FERRY PIER\nBoats to Driftwood Port and the Moonlit Island leave from the end.');
  sign(m, 10, 23, 'WEST ISLE\nBeware of Gullet. They steal sandwiches.');
  sign(m, 48, 20, 'EAST ISLE\nFairies dance here at dusk, they say.');

  // -- items --
  item(m, 6, 15, 'tf_sp', 'Super Potion');
  item(m, 55, 12, 'tf_pearl', 'Pearl');
  item(m, 30, 41, 'tf_rev', 'Revive');                   // on the far islet
  item(m, 8, 38, 'tf_orb', 'Aqua Orb', 2);
  item(m, 53, 38, 'tf_heal', 'Full Heal');
  item(m, 22, 5, 'tf_gale', 'Gale Orb');

  // -- trainers --
  trainer(m, 'tidefall_kai', 31, 11, UP, 'boy', { name: 'KAI', cls: 'FISHER', sight: 4, team: [[4, 25], [47, 26], [32, 27]], pre: 'The bridge is rocking! So are my creatures.', win: 'You reeled me right in.', post: 'The fish bite best at the south pier.', prize: 70 });
  trainer(m, 'tidefall_lea', 10, 21, RIGHT, 'girl', { name: 'LEA', cls: 'SWIMMER', sight: 4, team: [[59, 26], [41, 27], [105, 28]], pre: 'Come on in, the water is lovely! (After the battle.)', win: 'I am all wet. Obviously.', post: 'I will race you to the next island.', prize: 72 });
  trainer(m, 'tidefall_pol', 49, 14, LEFT, 'bug', { name: 'POLLY', cls: 'BUG CATCHER', sight: 4, team: [[53, 27], [62, 28], [66, 28], [51, 28]], pre: 'Island bugs are twice the size! Want to see?', win: 'Too many legs to count!', post: 'My Skimdart can cross water.', prize: 70 });
  trainer(m, 'tidefall_ren', 14, 34, UP, 'camper', { name: 'REN', cls: 'ISLAND SCOUT', sight: 4, team: [[39, 27], [28, 28], [60, 29]], pre: 'This is my island! Well, I scouted it first.', win: 'You take the island, then.', post: 'The grass is thick on the west side.', prize: 74 });
  trainer(m, 'tidefall_sky', 40, 36, DOWN, 'lass', { name: 'SKY', cls: 'BIRDWATCHER', sight: 5, team: [[47, 28], [28, 29], [56, 30]], pre: 'Shh! Oh, you are not a bird. Battle!', win: 'Flown away...', post: 'Brinegull nest on the south-east cliffs.', prize: 76 });

  // -- islanders --
  npc(m, 27, 22, DOWN, 'old', ['ELDER TAMA: Tidefall is not one island but many. The bridges are older than my grandmother.', 'The ferry takes Wardens to Driftwood Port on the west coast.'], { still: true });
  npc(m, 36, 23, LEFT, 'kid', ['I can swim across! Mum says no.'], { roam: 1 });
  npc(m, 33, 22, UP, 'boy', ['The Reefside Trader gets stock from the ferry every morning.'], { roam: 1 });
  npc(m, 28, 17, DOWN, 'mom', ['The Healing Post is the red hut. Free for every Warden, even those who fall in the lagoon.'], { still: true });
  npc(m, 46, 38, UP, 'girl', ['Look at the lagoon! You can see the bottom.'], { still: true });

  m.labels = [{ x: 25, y: 18, text: 'HEALING POST', style: 'heal' }, { x: 37, y: 18, text: 'REEFSIDE TRADER', style: 'shop' }, { x: 31, y: 26, text: 'FERRY PIER', style: 'home' }];
  warp(m, 25, 20, 'tidefallheal', 3, 5, UP);
  warp(m, 37, 20, 'tidefalltrader', 3, 5, UP);
  edgeExit(m, 'N', 30, 'mirewood', 38, 50);
  // nothing may stand inside a tree, rock or water
  const fl = (x, y) => { if (G.TILES[m.t[y][x]].solid) set(m, x, y, 'g'); };
  m.npcs.forEach(n => fl(n.x, n.y)); m.objs.forEach(o => fl(o.x, o.y));
})();
(function () {
  const m = interior('tidefallheal', 'TIDEFALL HEALING POST', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); set(m, 1, 1, 'h'); scatter(m, 'S', [[6, 1]]); rect(m, 5, 4, 2, 1, 'a'); set(m, 1, 5, 't');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 6, 5, LEFT, 'boy', ['A salty breeze and a quick rest. That is all a Warden needs.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING POST', free: true }) : G.story.nurse() });
  warp(m, 3, 6, 'tidefall', 25, 21, DOWN);
})();
(function () {
  const m = interior('tidefalltrader', 'REEFSIDE TRADER', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); scatter(m, 'S', [[1, 1], [1, 2], [6, 1]]); scatter(m, 'x', [[1, 4], [6, 4]]); set(m, 6, 5, 't');
  npc(m, 4, 1, DOWN, 'clerk', null, { still: true });
  npc(m, 1, 5, RIGHT, 'lass', ['Pearls come out of the lagoon clams. The Trader pays well for them!']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Shop', fn: () => G.openShop ? G.openShop('tidefall') : G.story.says('The Trader is out fishing.') });
  warp(m, 3, 6, 'tidefall', 37, 21, DOWN);
})();
})();
