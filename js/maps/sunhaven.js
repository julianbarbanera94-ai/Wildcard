// SUNHAVEN CITY (west region): the west-coast harbour city. Plaza with a fountain, market street, harbour piers, Arena.
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, edgeExit, gate, DOWN, UP, LEFT, RIGHT } = G.mk;

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
  }
}
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id, item: name, ball: true }, qty ? { qty } : {}));
const get = (m, x, y) => (m.t[y] || [])[x];

// ---- Shop: the department store ----
G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, {
  sunstore: { name: 'SUNHAVEN DEPARTMENT STORE', place: 'SUNHAVEN CITY', color: '#e8863a', greet: 'Welcome to Sunhaven Department Store! Four floors of everything a Warden needs. (Well, one floor. But a big one.)', bye: 'Thank you! Do visit again!',
    stock: [{ item: 'Potion', cat: 'MEDICINE' }, { item: 'Super Potion', cat: 'MEDICINE' }, { item: 'Full Heal', cat: 'MEDICINE' }, { item: 'Revive', cat: 'MEDICINE' },
      { item: 'Terra Orb', cat: 'ORBS' }, { item: 'Pulse Orb', cat: 'ORBS' }, { item: 'Verdant Orb', cat: 'ORBS' }, { item: 'Aqua Orb', cat: 'ORBS' }, { item: 'Gale Orb', cat: 'ORBS' },
      { item: 'Rope', cat: 'GOODS' }, { item: 'Cloth', cat: 'GOODS' }, { item: 'Watering Can', cat: 'GOODS' }, { item: 'Carrot Seeds', cat: 'SEEDS' }, { item: 'Tomato Seeds', cat: 'SEEDS' }],
    sells: 'all', rate: .5 },
});

(function () {
  const m = newMap('sunhaven', 'SUNHAVEN CITY', 64, 52, 'g', { music: 'town', biome: 'city', enc: null });
  m.landing = { x: 31, y: 27 };

  // ---- Sea down the west side, a wide harbour bay in the south-west ----
  const shore = y => y <= 28 ? 8 : y >= 36 ? 21 : 8 + (y - 28) * 1.6;
  for (let y = 17; y < m.h; y++) {
    const sx = Math.round(shore(y) + Math.sin(y / 2.7) * 1.1);
    for (let x = 0; x < sx; x++) set(m, x, y, 'w');
    set(m, sx, y, 'y'); if (hash(sx, y) < .6) set(m, sx + 1, y, 'y');
  }
  // sea at the very top of the western strip fades into the coast trees
  // tree border (neat, two deep)
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const e = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
    if (get(m, x, y) === 'w' || get(m, x, y) === 'y') continue;
    if (e === 0 || (e === 1 && hash(x, y) < .6)) set(m, x, y, hash(y, x) < .25 ? 'n' : '#');
  }

  // ---- Streets ----
  rect(m, 30, 0, 2, 52, '=');                       // north-south avenue (to Evergreen and Driftwood)
  rect(m, 6, 13, 52, 2, '=');                       // north street (Arena, Healing Centre)
  rect(m, 8, 24, 56, 2, '=');                       // east-west avenue: harbour road to market street
  rect(m, 4, 24, 4, 2, 'z');                        // west pier into the sea
  // ---- Plaza ----
  rect(m, 20, 17, 24, 15, '%'); rect(m, 22, 16, 20, 1, '%'); rect(m, 22, 32, 20, 1, '%');
  rect(m, 30, 22, 4, 4, 'w');                        // the fountain
  scatter(m, 'l', [[29, 21], [34, 21], [29, 26], [34, 26], [21, 18], [42, 18], [21, 30], [42, 30], [26, 24], [37, 24]]);
  rect(m, 21, 19, 2, 2, 'f'); rect(m, 41, 19, 2, 2, 'f'); rect(m, 21, 28, 2, 2, 'f'); rect(m, 41, 28, 2, 2, 'f');
  rect(m, 25, 19, 3, 2, 'f'); rect(m, 36, 19, 3, 2, 'f'); rect(m, 25, 28, 3, 2, 'f'); rect(m, 36, 28, 3, 2, 'f');
  scatter(m, 'u', [[24, 19], [39, 19], [24, 29], [39, 29], [29, 18], [34, 18]]);
  // tidy tree rows between the north street and the plaza
  for (let x = 14; x <= 52; x += 3) if (x < 29 || x > 32) if (x < 20 || x > 43 || x % 6 === 2) set(m, x, 15, '#');
  // towers around the plaza
  rect(m, 15, 17, 3, 3, '+'); rect(m, 15, 28, 3, 3, '+'); rect(m, 11, 20, 3, 3, '+'); rect(m, 11, 27, 3, 3, '+');
  scatter(m, 'u', [[14, 17], [14, 19], [14, 28], [14, 30], [18, 17], [18, 19]]);
  rect(m, 9, 18, 2, 4, '%');

  // ---- North street: Healing Centre, Arena, and the neighbourhood houses ----
  building(m, 21, 10, 5, 'R', 2);                    // Healing Centre, door (23,12)
  building(m, 37, 9, 9, 'U', 4);                     // Arena, door (41,11)
  rect(m, 41, 12, 1, 1, '%'); rect(m, 38, 12, 7, 1, '%');
  scatter(m, 'l', [[20, 12], [26, 12], [36, 12], [46, 12], [29, 12], [32, 12]]);
  rect(m, 22, 8, 3, 1, 'f'); rect(m, 38, 7, 7, 1, 'f'); rect(m, 37, 8, 1, 1, 'u'); rect(m, 45, 8, 1, 1, 'u');
  building(m, 9, 5, 5, 'Q', 2);                      // house B, door (11,7)
  rect(m, 11, 8, 1, 5, '%');
  building(m, 15, 7, 5, 'R', -1); building(m, 4, 8, 5, 'R', -1);
  rect(m, 5, 4, 3, 1, 'f'); scatter(m, 'u', [[8, 5], [14, 5], [15, 6], [19, 8], [4, 7]]);
  building(m, 50, 5, 5, 'Q', -1); building(m, 56, 8, 5, 'R', -1); rect(m, 49, 9, 7, 1, '%');
  rect(m, 53, 10, 1, 3, '%'); rect(m, 59, 11, 1, 2, '%');
  scatter(m, 'f', [[51, 8], [52, 8], [58, 7], [59, 7]]);
  // pine park either side of the avenue, north
  for (let y = 2; y <= 9; y++) for (const x of [26, 27, 28, 33, 34, 35]) if (hash(x, y) < .45) set(m, x, y, hash(y, x) < .5 ? 'n' : '#');
  scatter(m, 'f', [[28, 6], [33, 4], [28, 9], [33, 8]]);
  // clear building ground north-east (8 x 7) and a pond corner
  rect(m, 48, 1, 0, 0, 'g');

  // ---- Market street (east) ----
  rect(m, 44, 22, 20, 6, '%'); rect(m, 44, 24, 20, 2, '=');
  building(m, 46, 19, 7, 'Q', 3);                    // Department store, door (49,21)
  building(m, 56, 19, 5, 'R', 2);                    // house A, door (58,21)
  rect(m, 49, 22, 1, 0, '%');
  building(m, 45, 28, 3, 'R', -1); building(m, 50, 28, 3, 'Q', -1); building(m, 55, 28, 3, 'R', -1); building(m, 60, 28, 3, 'Q', -1);
  scatter(m, 'l', [[45, 22], [54, 22], [62, 22], [48, 27], [58, 27], [44, 27]]);
  scatter(m, 'u', [[45, 21], [53, 21], [61, 21], [49, 27], [54, 27]]);
  rect(m, 44, 18, 2, 2, 'f'); scatter(m, 'd', [[53, 28], [58, 28]]);
  rect(m, 46, 31, 17, 1, 'f'); scatter(m, '#', [[44, 31], [63, 31], [62, 19]]);
  rect(m, 61, 22, 2, 1, '%');

  // ---- Harbour: boardwalk quay, piers, boats, fish stalls ----
  rect(m, 21, 33, 5, 16, 'z');                       // the quay
  rect(m, 26, 33, 4, 16, '%');
  rect(m, 12, 34, 9, 2, 'z'); rect(m, 9, 39, 12, 2, 'z'); rect(m, 13, 44, 8, 2, 'z');
  scatter(m, 'l', [[20, 33], [20, 36], [20, 38], [20, 41], [20, 43], [20, 46], [12, 33], [9, 38], [13, 43]]);
  // boats moored beside the piers
  const boat = (x, y, w, c) => { rect(m, x, y, w, 1, 'Q'); rect(m, x, y + 1, w, 1, c || 'W'); };
  boat(14, 37, 4); boat(11, 42, 4, 'R'); boat(15, 47, 4); boat(2, 20, 4); boat(3, 31, 4, 'R'); boat(4, 27, 3);
  scatter(m, 'r', [[2, 44], [3, 46], [6, 41], [1, 36]]);
  // quay-side buildings: fish market stalls and warehouses (east of the quay, west of the avenue)
  building(m, 26, 34, 3, 'R', -1); building(m, 26, 38, 3, 'Q', -1); building(m, 26, 42, 3, 'R', -1);
  scatter(m, 'd', [[25, 37], [25, 41], [25, 45], [22, 48]]);
  // east of the avenue: inn, house C, shipping office
  building(m, 34, 35, 5, 'R', 2);                    // house C, door (36,37)
  rect(m, 36, 38, 1, 2, '%'); rect(m, 32, 39, 9, 1, '%');
  building(m, 42, 35, 7, 'Q', -1); building(m, 34, 42, 5, 'Q', -1); building(m, 41, 42, 4, 'R', -1);
  scatter(m, 'l', [[33, 38], [40, 38], [33, 41]]);
  rect(m, 35, 45, 12, 1, 'f'); scatter(m, 'u', [[33, 45], [47, 45], [40, 41]]);
  // south park, clear building ground
  for (let y = 46; y <= 49; y++) for (let x = 32; x <= 60; x++) if (hash(x, y) < .22 && get(m, x, y) === 'g') set(m, x, y, hash(y, x) < .4 ? 'n' : '#');
  rect(m, 30, 46, 2, 5, '=');
  rect(m, 48, 33, 10, 8, 'g'); rect(m, 50, 5, 0, 0, 'g');
  scatter(m, 'F', [[47, 32], [58, 32], [47, 41], [58, 41]]);
  // lighthouse-less breakwater beacon on the south-west rocks
  scatter(m, 'r', [[19, 49], [19, 48]]);

  // garnish the lawns between the blocks: flowers, shrubs and the odd tree (kept off paths and the two clear building lawns)
  const near = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ('=%zpDy'.includes(get(m, x + i, y + j) || 'x')) return true; return false; };
  for (let y = 3; y < 50; y++) for (let x = 3; x < 61; x++) {
    if (get(m, x, y) !== 'g' || near(x, y)) continue;
    if (x >= 47 && x <= 58 && ((y >= 32 && y <= 41) || y <= 9)) continue;
    const r = hash(x + 3, y + 8);
    set(m, x, y, r < .07 ? 'f' : r < .11 ? 'u' : r < .15 ? '#' : 'g');
  }
  // clean any trees/props that landed on the exits and arrival tiles
  rect(m, 30, 0, 2, 3, '='); rect(m, 30, 49, 2, 3, '='); rect(m, 62, 24, 2, 2, '='); rect(m, 60, 24, 2, 2, '=');
  rect(m, 8, 24, 2, 2, '=');

  // ---- Signs ----
  sign(m, 34, 12, 'SUNHAVEN CITY\nNorth: Evergreen Forest. South: Driftwood Port. East: Sunmeadow.');
  sign(m, 36, 11, 'SUNHAVEN ARENA\nGrass-type Leader. Bring one Badge to prove yourself... and a Bondling that does not fear thorns.');
  sign(m, 27, 32, 'SUNHAVEN HARBOUR\nBoats leave at dawn. Mind the gulls.');

  // ---- Items ----
  item(m, 5, 5, 'sunhaven_potion', 'Super Potion');         // behind the NW houses
  item(m, 57, 2, 'sunhaven_orb', 'Verdant Orb');            // NE corner by the trees
  item(m, 49, 46, 'sunhaven_heal', 'Full Heal');            // south park
  item(m, 4, 24, 'sunhaven_pearl', 'Pearl');                // end of the west pier

  // ---- Trainers ----
  trainer(m, 'sunhaven_sailor', 17, 44, RIGHT, 'boy', { name: 'MARLO', cls: 'SAILOR', sight: 4, team: [[32, 15], [41, 15], [4, 16]], pre: 'Fresh off the boat and itching for a scrap!', win: 'Sunk without a splash...', post: 'The Arena Leader loves roses. Mind the thorns.', prize: 900 });
  trainer(m, 'sunhaven_lass', 24, 3, DOWN, 'lass', { name: 'ROSA', cls: 'GARDENER', sight: 4, team: [[7, 14], [44, 15], [26, 15]], pre: 'My roses need a sparring partner!', win: 'Pruned down to size.', post: 'Leader Briar tends the arena garden herself.', prize: 900 });

  // ---- Villagers ----
  npc(m, 32, 20, DOWN, 'kid', ['The fountain is the heart of Sunhaven. Toss in a coin and wish!', 'I wished for a creature of my own. Still waiting...'], { roam: 2 });
  npc(m, 28, 31, UP, 'old', ['Sunhaven is the oldest harbour on the coast.', 'The Arena up north rewards those who defeat its Leader with the BLOOM BADGE.'], { still: true });
  npc(m, 40, 15, DOWN, 'mom', ['The Healing Centre is just left of the Arena. It is free for everyone.', 'Even the grumpy sailors use it.'], { still: true });
  npc(m, 52, 23, LEFT, 'clerk', ['Our department store has orbs, medicine, even seeds!', 'Market street is open from dawn until dusk.'], { still: true });
  npc(m, 24, 40, RIGHT, 'hiker', ['South of here lies Driftwood Port. They want two Badges before they let you through the gate.', 'The road is rough, but the lighthouse view is worth it.'], { roam: 1 });
  npc(m, 23, 36, RIGHT, 'boy', ['The ferries leave from Driftwood, not here. We only have fishing boats!', 'I am going to be a captain someday.'], { roam: 1 });
  npc(m, 29, 8, RIGHT, 'camper', ['Evergreen Forest starts just north. The trees are enormous!', 'Bring at least one Badge. The rangers up there are strict.'], { still: true });
  npc(m, 14, 13, DOWN, 'lass', ['The towers by the plaza are apartments. The view of the bay from the top is lovely.'], { roam: 2 });
  npc(m, 6, 25, DOWN, 'old', ['I have fished off this pier for fifty years.', 'Pearls wash up here now and then. Keep your eyes open!'], { still: true });
  npc(m, 60, 25, UP, 'bug', ['East lies Sunmeadow and then Lanternrest. I came all that way to see the sea!'], { roam: 1 });
  npc(m, 54, 3, LEFT, 'girl', ['This clear lawn is perfect for a building plot. Imagine a cottage right here by the sea breeze!'], { still: true });

  // ---- Warps: buildings ----
  warp(m, 23, 12, 'sunheal', 5, 6, UP); warp(m, 49, 21, 'sunstore', 5, 7, UP); warp(m, 41, 11, 'arena_sunhaven', 0, 0, UP);
  warp(m, 58, 21, 'sunhouse1', 3, 5, UP); warp(m, 11, 7, 'sunhouse2', 3, 5, UP); warp(m, 36, 37, 'sunhouse3', 3, 5, UP);
  // ---- Warps: exits ----
  edgeExit(m, 'E', 24, 'sunmeadow', 1, 20);
  edgeExit(m, 'N', 30, 'evergreen', 30, 50, gate(1, 'EVERGREEN FOREST'));
  edgeExit(m, 'S', 30, 'driftwood', 26, 1, gate(2, 'DRIFTWOOD PORT'));

  m.labels = [
    { x: 23, y: 10, text: 'HEALING CENTRE', style: 'heal' },
    { x: 41, y: 9, text: 'SUNHAVEN ARENA', style: 'arena' },
    { x: 49, y: 19, text: 'DEPARTMENT STORE', style: 'shop' },
    { x: 58, y: 19, text: 'MARKET ROW', style: 'town' },
    { x: 27, y: 34, text: 'FISH MARKET', style: 'craft' },
    { x: 36, y: 35, text: 'HARBOUR HOUSE', style: 'home' },
    { x: 11, y: 5, text: 'ROSE COTTAGE', style: 'home' },
    { x: 45, y: 35, text: 'SHIPPING OFFICE', style: 'craft' },
  ];
})();

// ---- Interiors ----
(function () {
  const m = interior('sunheal', 'SUNHAVEN HEALING CENTRE', 10, 8, 5);
  rect(m, 2, 2, 5, 1, 'k'); set(m, 8, 1, 'P'); set(m, 1, 1, 'h'); rect(m, 7, 5, 2, 1, 'a');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 2, 5, RIGHT, 'boy', ['Resting here is free. Sailors come in with salty, sleepy teams all the time.']);
  for (let x = 2; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING CENTRE', free: true }) : G.story.nurse() });
  m.objs.push({ x: 8, y: 1, fn: () => G.pcMenu() });
  warp(m, 5, 7, 'sunhaven', 23, 13, DOWN);
})();
(function () {
  const m = interior('sunstore', 'SUNHAVEN DEPARTMENT STORE', 12, 9, 5);
  rect(m, 3, 3, 6, 1, 'k'); scatter(m, 'S', [[1, 1], [2, 1], [3, 1], [8, 1], [9, 1], [10, 1], [1, 2], [10, 2]]); scatter(m, 'x', [[1, 5], [10, 5], [1, 6], [10, 6]]);
  rect(m, 4, 6, 4, 1, 'a'); set(m, 10, 4, 't');
  npc(m, 5, 2, DOWN, 'clerk', null, { still: true });
  npc(m, 7, 2, DOWN, 'mom', null, { still: true, style: { hair: '#ffd070', skin: '#f8d0a8', shirt: '#e8863a', pants: '#604030' } });
  npc(m, 3, 6, RIGHT, 'lass', ['The top floor is where they keep the Verdant Orbs. Oh wait, there is only one floor.', 'Good prices, though!']);
  for (let x = 3; x <= 8; x++) m.objs.push({ x, y: 3, prompt: 'Shop', fn: () => G.openShop ? G.openShop('sunstore') : G.story.says('The store is closed for stocktaking.') });
  warp(m, 5, 8, 'sunhaven', 49, 22, DOWN);
})();
const house = (id, name, door, lines, who, o) => {
  const m = interior(id, name, 8, 7, 3);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 2, 1, 'a'); scatter(m, 'S', [[6, 1], [4, 1]]);
  npc(m, 3, 3, RIGHT, who, lines, o);
  warp(m, 3, 6, 'sunhaven', door[0], door[1], DOWN);
};
house('sunhouse1', 'MARKET ROW HOUSE', [58, 22], ['I keep a stall on Market Row. The Department Store is my best neighbour.', 'Customers love it. I love it less.'], 'mom');
house('sunhouse2', 'ROSE COTTAGE', [11, 8], ['Roses grow wild around the Arena. The Leader says Grass-types love sea air.', 'Salt keeps the bugs away, too!'], 'old');
house('sunhouse3', 'HARBOUR HOUSE', [36, 38], ['My husband sails out before dawn. I watch the harbour all day.', 'Driftwood Port has a lighthouse you can see from here on clear nights.'], 'girl');
})();
