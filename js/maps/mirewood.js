// Mirewood Marsh (east region).
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

// ---- Mirewood (east): a misty marsh of boardwalks, reed islands and a fisher's dock. Bug and poison creatures ----
// Layout: west woods (entry from Lanternrest) -> a main boardwalk east over open water, across a central reed island,
// then winding south and back up to Warden Bog's lantern dock at the far east. A north shore path and a south shore
// path loop around the marsh; bridges link them to the islands. Moll fishes off a pier on the south shore.
(function () {
  const m = newMap('mirewood', 'MIREWOOD MARSH', 76, 52, 'w', { music: 'route', enc: [[18, 5, 8, 25], [20, 6, 9, 22], [19, 7, 9, 15], [22, 7, 9, 15], [24, 8, 10, 8], [7, 6, 8, 3]] });
  // -- land masses: west woods, north shore, south shore (water fills the middle) --
  rect(m, 1, 1, 13, 50, 'g'); rect(m, 1, 1, 74, 8, 'g'); rect(m, 1, 42, 74, 9, 'g');
  // ragged shorelines
  rect(m, 14, 8, 3, 3, 'g'); rect(m, 14, 34, 4, 8, 'g'); rect(m, 18, 39, 5, 3, 'g'); rect(m, 26, 8, 6, 2, 'g'); rect(m, 46, 8, 5, 2, 'g');
  rect(m, 30, 41, 6, 1, 'w'); rect(m, 52, 41, 4, 1, 'w'); rect(m, 22, 8, 3, 1, 'w'); rect(m, 64, 8, 10, 1, 'w'); rect(m, 66, 7, 6, 1, 'w');
  rect(m, 14, 16, 1, 5, 'g'); rect(m, 14, 28, 2, 4, 'g');
  border(m, '#');
  warp(m, 0, 24, 'lanternrest', 58, 24, LEFT); warp(m, 0, 25, 'lanternrest', 58, 25, LEFT);
  rect(m, 0, 24, 1, 2, 'p');

  // -- west woods: entry path, sign, a hidden pond and the north-west build clearing (3..10, 3..10) --
  rect(m, 1, 24, 13, 2, 'p');
  scatter(m, '#', [[1, 12], [2, 12], [1, 13], [12, 12], [13, 12], [11, 14], [1, 18], [2, 18], [1, 19], [6, 16], [7, 16], [12, 18], [13, 19], [4, 21], [1, 22], [1, 27], [2, 28], [1, 29], [12, 28], [13, 29], [9, 35], [10, 35], [1, 38], [2, 38], [1, 39], [12, 38], [12, 39], [13, 40], [6, 44], [1, 44]]);
  scatter(m, 'n', [[3, 13], [2, 15], [9, 13], [10, 18], [5, 19], [3, 23], [11, 22], [7, 27], [4, 33], [11, 31], [8, 39], [3, 41]]);
  scatter(m, 'u', [[11, 21], [12, 21], [12, 26], [11, 27], [5, 22], [8, 22], [13, 33], [13, 34], [6, 37], [1, 46], [2, 47], [3, 47], [4, 47], [4, 48]]);
  rect(m, 4, 29, 5, 4, 'w'); rect(m, 5, 28, 3, 1, 'w'); rect(m, 5, 33, 3, 1, 'w'); scatter(m, 'q', [[3, 30], [3, 31], [9, 30], [9, 31], [9, 32]]);
  scatter(m, 'd', [[3, 29], [8, 33]]); rect(m, 2, 16, 3, 2, 'f'); rect(m, 7, 19, 2, 1, 'f'); rect(m, 5, 35, 3, 2, 'f');
  sign(m, 12, 23, 'MIREWOOD MARSH\nStay on the boardwalk... or do not. The creatures here like it wild.');
  m.objs.push({ x: 2, y: 49, id: 'mw_heal', item: 'Full Heal', ball: true });
  m.objs.push({ x: 4, y: 34, id: 'mw_catch', item: 'Catch Orb', qty: 3, ball: true });

  // -- north shore: tree line, reed beds and the shore path --
  rect(m, 11, 7, 53, 1, 'p'); rect(m, 11, 7, 1, 17, 'p');
  const hash = (x, y) => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); };
  for (let x = 12; x < 74; x++) if (hash(x, 1) < .55) set(m, x, 1, hash(x, 7) < .7 ? '#' : 'n');
  scatter(m, '#', [[12, 2], [13, 2], [20, 2], [28, 2], [29, 2], [40, 2], [41, 3], [53, 2], [54, 2], [60, 3], [61, 2]]);
  scatter(m, 'n', [[14, 3], [33, 2], [34, 3], [58, 2], [62, 2]]);
  rect(m, 16, 3, 9, 3, 'q'); rect(m, 17, 6, 6, 1, 'q'); rect(m, 43, 2, 9, 4, 'q'); rect(m, 45, 6, 5, 1, 'q'); rect(m, 25, 8, 6, 1, 'q');
  rect(m, 35, 4, 4, 2, 'f'); scatter(m, 'u', [[24, 6], [31, 5], [32, 5], [42, 6], [52, 6], [12, 9], [16, 9], [28, 9]]); scatter(m, 'd', [[26, 4], [39, 4], [55, 5]]);
  // north-east grove: a ring of pines hides a little nook with an item
  rect(m, 64, 2, 9, 5, 'n'); rect(m, 65, 3, 7, 3, 'g'); rect(m, 66, 3, 5, 1, 'f'); set(m, 64, 4, 'g'); set(m, 63, 4, 'g');
  m.objs.push({ x: 70, y: 4, id: 'mw_orb', item: 'Super Orb', qty: 2, ball: true });
  trainer(m, 'mw_mo', 34, 5, DOWN, 'bug', { name: 'MO', cls: 'BUG CATCHER', sight: 3, team: [[18, 8], [19, 9]], pre: 'Marsh bugs are the best bugs!', win: 'Mine got squashed!', post: 'I will catch a bigger one next time.', prize: 32 });

  // -- main boardwalk east from the woods --
  rect(m, 14, 24, 16, 2, 'z');
  rect(m, 23, 22, 3, 2, 'z'); scatter(m, 'd', [[23, 22], [25, 22]]);  // a little lookout platform
  trainer(m, 'mw_sage', 24, 22, DOWN, 'lass', { name: 'SAGE', cls: 'HERBALIST', sight: 3, team: [[18, 8], [20, 8]], pre: 'These reeds hold wonderful herbs... and wonderful creatures!', win: 'My herbs could not save me!', post: 'Antidotes do not grow on trees, you know.', prize: 32 });

  // -- reed island (north-west of the boardwalk), reached by a short bridge --
  rect(m, 17, 13, 9, 7, 'q'); rect(m, 16, 14, 1, 5, 'q'); rect(m, 26, 14, 1, 4, 'q'); rect(m, 18, 12, 6, 1, 'g');
  rect(m, 20, 15, 2, 5, 'g'); scatter(m, 'u', [[17, 13], [25, 13], [16, 18]]); scatter(m, 'd', [[22, 12]]); set(m, 25, 19, 'u');
  rect(m, 20, 20, 2, 4, 'V');
  m.objs.push({ x: 24, y: 14, id: 'mw_sp', item: 'Super Potion', ball: true });
  trainer(m, 'mw_lily', 21, 15, DOWN, 'girl', { name: 'LILY', cls: 'SWAMP LASS', sight: 4, team: [[23, 9], [24, 10]], pre: 'The mist plays tricks on you out here. Let me show you!', win: 'You saw right through me!', post: 'On foggy nights the reeds glow faintly. Pretty, huh?', prize: 34 });

  // -- central island: marsh meadow with an open clearing (31..36, 26..31) --
  rect(m, 30, 18, 15, 14, 'g'); rect(m, 31, 17, 12, 1, 'g'); rect(m, 31, 32, 12, 1, 'g'); rect(m, 30, 18, 1, 1, 'w'); rect(m, 44, 18, 1, 1, 'w'); rect(m, 30, 31, 1, 1, 'w'); rect(m, 44, 31, 1, 1, 'w');
  rect(m, 31, 19, 6, 4, 'q'); rect(m, 39, 26, 5, 6, 'q'); rect(m, 41, 19, 3, 4, 'q');
  rect(m, 30, 24, 15, 2, 'p'); rect(m, 37, 18, 2, 6, 'p'); rect(m, 41, 26, 2, 6, 'p');
  scatter(m, '#', [[39, 19], [40, 20], [44, 23]]); scatter(m, 'u', [[30, 23], [31, 23], [37, 26], [38, 27], [43, 19]]); scatter(m, 'f', [[33, 23], [34, 23], [35, 23]]);
  m.objs.push({ x: 43, y: 30, id: 'mw_pot', item: 'Super Potion', ball: true });
  trainer(m, 'mw_reed', 40, 21, DOWN, 'camper', { name: 'REED', cls: 'BIRDER', sight: 3, team: [[16, 9], [22, 10], [16, 10]], pre: 'Quiet! You will scare off the herons... too late. Battle!', win: 'Flown away, just like the herons.', post: 'Gloomoth only come out when the mist is thick.', prize: 36 });
  // boardwalk north to the shore path, bridge south to the shore
  rect(m, 37, 9, 2, 8, 'z'); rect(m, 41, 33, 2, 9, 'V');

  // -- east: the main boardwalk winds on toward the dock --
  rect(m, 45, 24, 13, 2, 'z'); rect(m, 56, 24, 2, 8, 'z'); rect(m, 56, 30, 9, 2, 'z'); rect(m, 63, 24, 2, 8, 'z');
  scatter(m, 'q', [[50, 22], [51, 22], [51, 23], [48, 27], [49, 27], [60, 28], [61, 28], [60, 29], [59, 33]]);
  // hermit island (north-east), linked to the shore path and down to the boardwalk
  rect(m, 51, 11, 12, 7, 'q'); rect(m, 52, 10, 10, 1, 'g'); rect(m, 52, 18, 10, 1, 'q');
  rect(m, 56, 9, 2, 2, 'V'); rect(m, 56, 11, 2, 7, 'p'); rect(m, 56, 18, 2, 6, 'z');
  rect(m, 58, 12, 4, 3, 'g'); scatter(m, 'd', [[60, 12], [61, 14]]); scatter(m, '#', [[52, 11], [62, 11], [62, 17]]); scatter(m, 'u', [[51, 17], [53, 18]]);
  trainer(m, 'mw_gus', 58, 13, LEFT, 'hiker', { name: 'GUS', cls: 'HERMIT', sight: 3, team: [[21, 9], [24, 9], [20, 9]], pre: 'Nobody visits me out here. Let us make it count.', win: 'Hah! A fine battle.', post: 'Come by any time. Mind the mud.', prize: 36 });

  // -- Warden Bog's dock: a narrow pier out to a lantern-lit platform at the far east --
  rect(m, 65, 24, 4, 1, 'z'); rect(m, 69, 19, 5, 11, 'z'); rect(m, 70, 18, 3, 1, 'z'); rect(m, 70, 30, 3, 1, 'z');
  set(m, 73, 19, 'l'); set(m, 73, 29, 'l'); set(m, 69, 19, 'd'); set(m, 69, 29, 'd'); set(m, 73, 24, 'l');
  trainer(m, 'mw_bog', 71, 24, LEFT, 'camper', { name: 'BOG', cls: 'MARSH WARDEN', sight: 5, team: [[20, 11], [22, 11], [19, 12]], pre: 'I am Bog, Warden of the Marsh. The MARSH EMBER SHARD glows in my keeping. Prove your bond is true!', win: 'Your partner trusts you. That is rare. Take the shard.', post: 'The Great Lantern needs that light. Go on.', prize: 44, shard: 'marsh' });

  // -- south shore: shore path, Moll's fishing pier, a build clearing (18..25, 45..50) and a secret reed islet --
  rect(m, 13, 43, 58, 1, 'p'); rect(m, 11, 26, 1, 18, 'p'); rect(m, 11, 43, 2, 1, 'p');
  for (let x = 2; x < 74; x++) if (hash(x, 50) < .5 && (x < 17 || x > 26)) set(m, x, 50, hash(x, 3) < .7 ? '#' : 'n');
  scatter(m, '#', [[28, 47], [29, 48], [37, 49], [58, 48], [59, 47], [72, 46], [73, 47], [66, 49]]); scatter(m, 'n', [[30, 46], [38, 46], [57, 49], [71, 48]]);
  rect(m, 32, 45, 4, 3, 'q'); rect(m, 60, 45, 6, 3, 'q'); rect(m, 49, 46, 4, 2, 'f');
  scatter(m, 'u', [[14, 41], [22, 41], [27, 42], [36, 42], [44, 41], [45, 42], [53, 42], [70, 41], [71, 42]]); scatter(m, 'd', [[16, 46], [43, 47], [54, 44]]);
  // little reed islets out in the open water
  rect(m, 22, 30, 4, 3, 'q'); set(m, 23, 29, 'q'); set(m, 24, 31, 'd'); rect(m, 32, 36, 3, 2, 'q'); set(m, 33, 36, 'u'); rect(m, 17, 27, 2, 1, 'q'); rect(m, 50, 28, 2, 2, 'q'); set(m, 51, 28, 'u');
  // Moll's fishing pier
  rect(m, 48, 34, 1, 8, 'z'); rect(m, 46, 33, 5, 2, 'z'); scatter(m, 'd', [[46, 33], [50, 33]]);
  npc(m, 48, 33, UP, 'old', null, { talk: () => G.story.moll(), still: true });
  trainer(m, 'mw_wade', 45, 45, UP, 'boy', { name: 'WADE', cls: 'FISHER', sight: 3, team: [[4, 9], [22, 10]], pre: 'Moll taught me to fish. Want to see what I reeled in?', win: 'The big one got away again!', post: 'Moll is out on the pier. She knows every inch of this marsh.', prize: 34 });
  // secret islet, reached by a single plank through the reeds
  rect(m, 59, 35, 8, 4, 'q'); rect(m, 60, 34, 6, 1, 'q'); rect(m, 61, 36, 4, 2, 'g'); rect(m, 64, 39, 1, 3, 'z'); scatter(m, 'u', [[59, 35], [66, 35], [66, 38]]);
  m.objs.push({ x: 62, y: 36, id: 'mw_rev', item: 'Revive', ball: true });
  // thicken the woods and the south shore with trees, leaving the build clearings, paths and anything near people/items open
  const busy = (x, y) => m.npcs.concat(m.objs).some(o => Math.abs(o.x - x) + Math.abs(o.y - y) <= 2);
  const grow = (x0, y0, x1, y1, pr) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (m.t[y][x] === 'g' && !busy(x, y) && hash(x, y) < pr) set(m, x, y, hash(y, x) < .6 ? '#' : (hash(x + 1, y) < .5 ? 'n' : 'u')); };
  grow(1, 12, 10, 22, .22); grow(1, 27, 10, 41, .22); grow(12, 9, 13, 41, .12); grow(2, 44, 16, 49, .1); grow(27, 44, 73, 49, .1); grow(12, 2, 63, 5, .06);
})();
})();
