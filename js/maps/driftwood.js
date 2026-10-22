// DRIFTWOOD PORT (west region): a fishing town on the rocks. Lighthouse point, piers, boats, Healing Centre, shop, Flying Arena, ferry.
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
const CAPTAIN = { hair: '#d8d8d8', skin: '#e8c098', shirt: '#2a4a8a', pants: '#202c4a', hat: '#f4f4f4' };

G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, {
  gullwing: { name: 'GULLWING PROVISIONS', place: 'DRIFTWOOD PORT', color: '#3a9ac8', greet: 'Ahoy! Gullwing Provisions: rope, remedies and orbs for the open sea!', bye: 'Fair winds, Warden!',
    stock: [{ item: 'Potion', cat: 'MEDICINE' }, { item: 'Super Potion', cat: 'MEDICINE' }, { item: 'Full Heal', cat: 'MEDICINE' }, { item: 'Revive', cat: 'MEDICINE' },
      { item: 'Gale Orb', cat: 'ORBS' }, { item: 'Aqua Orb', cat: 'ORBS' }, { item: 'Pulse Orb', cat: 'ORBS' }, { item: 'Terra Orb', cat: 'ORBS' },
      { item: 'Rope', cat: 'GEAR' }, { item: 'Nails', cat: 'GEAR' }, { item: 'Plank', cat: 'GEAR' }, { item: 'Fiber', cat: 'GEAR' }],
    sells: ['Pearl', 'Rope', 'Fiber', 'Plank', 'Clay', 'crop', 'food'], rate: .7 },
});

(function () {
  const m = newMap('driftwood', 'DRIFTWOOD PORT', 52, 44, 'g', { music: 'town', biome: 'coast', enc: null });
  m.landing = { x: 26, y: 14 };

  // ---- Sea along the west side; the lighthouse point juts out in the north-west ----
  for (let y = 0; y < m.h; y++) {
    const sx = y < 15 ? 2 : Math.round(9 + Math.sin(y / 2.4) * 1.2 + (y > 36 ? (y - 36) * 1.2 : 0));
    for (let x = 0; x < sx; x++) set(m, x, y, 'w');
    if (y >= 15) { set(m, sx, y, 'y'); if (hash(sx, y) < .6) set(m, sx + 1, y, 'y'); }
  }
  for (let y = 3; y < 15; y++) for (let x = 0; x < 2; x++) set(m, x, y, 'w');
  // tree border on the north, east and south
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const e = Math.min(y, m.w - 1 - x, m.h - 1 - y);
    if (m.t[y][x] !== 'g') continue;
    if (e === 0 || (e === 1 && hash(x, y) < .55)) set(m, x, y, hash(y, x) < .35 ? 'n' : '#');
  }
  // ---- Lighthouse point ----
  rect(m, 2, 3, 11, 12, 'y'); blob(m, 8, 9, 7, 6, 'y', null, .2);
  rect(m, 2, 3, 12, 1, 'E'); rect(m, 2, 3, 1, 8, 'E');
  for (let y = 3; y < 15; y++) for (let x = 2; x < 13; x++) if (m.t[y][x] === 'y' && hash(x + 4, y) < .1) set(m, x, y, 'r');
  scatter(m, 'r', [[3, 11], [3, 13], [4, 14], [11, 14], [12, 4], [10, 4]]);
  rect(m, 6, 5, 2, 3, '|');                                         // the lighthouse tower
  scatter(m, 'l', [[5, 8], [8, 8]]); rect(m, 4, 8, 5, 1, 'y');
  rect(m, 6, 8, 2, 7, 'p'); rect(m, 4, 11, 10, 2, 'p');              // path out to the point

  // ---- Streets ----
  rect(m, 26, 0, 2, 23, 'p');                                        // road from Sunhaven
  rect(m, 12, 11, 36, 2, 'p');                                       // north street (Healing Centre, Arena, shop)
  rect(m, 12, 22, 40, 2, 'p');                                       // main street east to Mirewood
  rect(m, 10, 14, 3, 22, 'z');                                       // the quay
  rect(m, 3, 17, 7, 2, 'z');                                         // fishing pier
  rect(m, 2, 30, 8, 2, 'z');                                         // the ferry pier
  rect(m, 4, 35, 6, 2, 'z');                                         // small boat pier
  rect(m, 12, 30, 2, 0, 'z'); rect(m, 12, 23, 1, 7, 'p'); rect(m, 12, 31, 14, 1, 'p');
  scatter(m, 'l', [[9, 17], [9, 30], [9, 35], [3, 19], [3, 32], [11, 15], [11, 25], [11, 33]]);
  // boats
  const boat = (x, y, w, c) => { rect(m, x, y, w, 1, 'Q'); rect(m, x, y + 1, w, 1, c || 'W'); };
  boat(3, 21, 4); boat(2, 26, 4, 'R'); boat(4, 33, 4); boat(2, 38, 5, 'R'); boat(6, 28, 3);
  scatter(m, 'r', [[1, 24], [2, 29], [1, 34], [5, 41], [3, 23]]);

  // ---- North street: Healing Centre, Arena, shop ----
  building(m, 18, 8, 5, 'R', 2);                                     // Healing Centre, door (20,10)
  building(m, 29, 8, 9, 'U', 4);                                     // Arena, door (33,10)
  building(m, 40, 8, 7, 'Q', 3);                                     // shop, door (43,10)
  scatter(m, 'l', [[17, 10], [23, 10], [28, 10], [38, 10], [39, 10], [47, 10]]);
  rect(m, 29, 7, 9, 1, 'f'); rect(m, 40, 7, 7, 1, 'f'); rect(m, 18, 7, 5, 1, 'f');
  scatter(m, 'F', [[13, 9], [14, 9], [15, 9]]);
  // ---- Fishermen's cottages and fish stalls between the streets ----
  building(m, 14, 15, 5, 'R', 2);                                    // cottage, door (16,17)
  rect(m, 16, 18, 1, 4, 'p');
  building(m, 21, 15, 3, 'Q', -1); building(m, 30, 15, 3, 'R', -1);
  building(m, 34, 15, 5, 'Q', 2);                                    // cottage, door (36,17)
  rect(m, 36, 18, 1, 4, 'p');
  building(m, 43, 15, 5, 'R', -1);
  scatter(m, 'd', [[20, 17], [24, 17], [29, 17], [33, 17], [42, 17]]);
  rect(m, 21, 18, 3, 1, 'f');
  // south of the main street
  building(m, 15, 26, 5, 'R', -1); building(m, 22, 26, 3, 'Q', -1); building(m, 28, 26, 5, 'R', -1); building(m, 38, 26, 5, 'Q', -1);
  scatter(m, 'd', [[14, 28], [21, 28], [27, 28], [37, 28], [43, 28]]);
  rect(m, 14, 25, 28, 1, 'f'); rect(m, 15, 25, 5, 1, 'p'); rect(m, 22, 25, 3, 1, 'p'); rect(m, 28, 25, 5, 1, 'p'); rect(m, 38, 25, 5, 1, 'p');
  scatter(m, 'l', [[20, 24], [33, 24], [43, 24], [44, 21], [20, 21]]);
  // fish drying racks by the quay
  scatter(m, 'F', [[12, 33], [13, 33], [14, 33], [12, 36], [13, 36], [14, 36]]); scatter(m, 'x', [[14, 34], [14, 35], [13, 29]]);

  // ---- Wild grassy edges ----
  blob(m, 46, 5, 4, 2.4, 'G', ['g']); blob(m, 17, 38, 6, 2.6, 'G', ['g', 'y']); blob(m, 44, 33, 5, 3, 'G', ['g']); blob(m, 31, 39, 5, 2.4, 'G', ['g']);
  blob(m, 48, 28, 2.4, 2, 'G', ['g']);
  scatter(m, 'u', [[43, 5], [49, 5], [14, 36], [24, 37], [38, 33], [49, 35], [36, 40]]);
  for (let y = 36; y <= 42; y++) for (let x = 12; x <= 50; x++) if (m.t[y][x] === 'g' && hash(x, y) < .16) set(m, x, y, hash(y, x) < .4 ? 'n' : '#');
  // clear lawn for building (two 6x6): south-east and north-east
  rect(m, 36, 30, 7, 6, 'g'); rect(m, 42, 36, 7, 5, 'g'); rect(m, 35, 2, 7, 5, 'g');
  scatter(m, 'F', [[35, 29], [42, 29], [35, 36], [41, 36]]);
  // trails to the wild edges
  rect(m, 26, 24, 2, 14, 'p'); rect(m, 44, 22, 2, 14, 'p'); rect(m, 44, 12, 0, 0, 'p'); rect(m, 48, 12, 2, 0, 'p'); rect(m, 46, 6, 2, 6, 'p'); rect(m, 26, 36, 2, 0, 'p');
  rect(m, 26, 36, 2, 3, 'p'); rect(m, 17, 36, 11, 1, 'p');
  scatter(m, 'r', [[31, 42], [32, 42], [21, 40], [47, 40], [40, 3]]);

  // exits and arrival tiles must be clear
  rect(m, 26, 0, 2, 2, 'p'); rect(m, 49, 22, 3, 2, 'p');

  // ---- Signs ----
  sign(m, 24, 12, 'DRIFTWOOD PORT\nFerries to Verdant Isle and the Tidefall Islands leave from the long pier. Three Badges needed.');
  sign(m, 34, 12, 'DRIFTWOOD ARENA\nFlying-type Leader. The wind here never stops.');
  sign(m, 10, 11, 'LIGHTHOUSE POINT\nThe lamp has guided boats home for a hundred years.');
  sign(m, 13, 31, 'FERRY PIER\nTickets from the Captain at the end of the boards.');

  // ---- Items ----
  item(m, 3, 10, 'driftwood_potion', 'Super Potion');         // tip of the lighthouse point
  item(m, 3, 17, 'driftwood_pearl', 'Pearl');                 // end of the fishing pier
  item(m, 13, 37, 'driftwood_orb', 'Gale Orb', 2);            // by the drying racks
  item(m, 49, 3, 'driftwood_revive', 'Revive');               // north-east corner
  item(m, 46, 38, 'driftwood_heal', 'Full Heal');             // south-east dune grass

  // ---- Trainers ----
  trainer(m, 'driftwood_fisher', 5, 17, RIGHT, 'hiker', { name: 'OLLIE', cls: 'FISHERMAN', sight: 5, team: [[41, 19], [32, 19], [4, 20]], pre: 'Nothing is biting. So, battle?', win: 'The big one got away again!', post: 'Try the end of the pier. Pearls turn up there.', prize: 1200 });
  trainer(m, 'driftwood_sailor', 11, 32, UP, 'boy', { name: 'DEXTER', cls: 'SAILOR', sight: 4, team: [[33, 20], [103, 21], [5, 22]], pre: 'Want a ticket? Not before a battle, landlubber!', win: 'Shiver me timbers!', post: 'The Captain at the end of the pier runs the ferries.', prize: 1260 });
  trainer(m, 'driftwood_bird', 45, 33, UP, 'kid', { name: 'PIPPA', cls: 'BIRD KEEPER', sight: 4, team: [[16, 20], [17, 21], [35, 21], [47, 22]], pre: 'Gulls and gales go together. So do I and battles!', win: 'My birds flew the coop...', post: 'Leader Zephyr trains with the strongest winds.', prize: 1320 });
  trainer(m, 'driftwood_swim', 28, 38, DOWN, 'girl', { name: 'MARIN', cls: 'SWIMMER', sight: 4, team: [[4, 20], [32, 20], [99, 22]], pre: 'I came for the surf, but I will take a battle!', win: 'Wiped out!', post: 'The water here is deep and cold.', prize: 1260 });
  trainer(m, 'driftwood_keeper', 9, 8, LEFT, 'old', { name: 'GRIMSBY', cls: 'LIGHTKEEPER', sight: 4, team: [[17, 23], [56, 23], [48, 24]], pre: 'Nobody passes my lighthouse without a bout!', win: 'My lamp is not out yet.', post: 'On clear nights you can see Sunhaven glow.', prize: 1440 });

  // ---- Villagers and the ferry captain ----
  npc(m, 5, 31, DOWN, 'hiker', null, { still: true, style: CAPTAIN, talk: () => G.ferry ? G.ferry('driftwood') : G.story.says('The ferry is not running yet.') });
  npc(m, 25, 18, DOWN, 'old', ['Driftwood Port: where the sea leaves its best pieces.', 'The Arena is up the road, and the lighthouse is on the point.'], { roam: 1 });
  npc(m, 40, 24, LEFT, 'mom', ['Fresh fish! Fresh fish! Well, fresh-ish.', 'Everything in the shop is cheaper than at the city.'], { still: true });
  npc(m, 22, 13, DOWN, 'kid', ['I want to fly like the Arena Leader. She says the trick is to love the wind.'], { roam: 2 });
  npc(m, 14, 21, RIGHT, 'bug', ['The ferry goes to Verdant Isle: jungle, waterfalls and warm sand!', 'You need three Badges to board.'], { roam: 1 });
  npc(m, 30, 20, DOWN, 'lass', ['Tidefall Islands are linked by rope bridges. I get dizzy just looking.'], { still: true });
  npc(m, 49, 19, UP, 'camper', ['East leads back inland to Mirewood Marsh. Wear boots.'], { roam: 1 });
  npc(m, 20, 12, DOWN, 'girl', ['The Healing Centre is right there. Sailors are always dropping in half soaked.'], { still: true });
  npc(m, 9, 13, RIGHT, 'kade', ['Grimsby has kept the lighthouse lit since before I was born. Do not touch the lamp.'], { still: true });

  // ---- Warps ----
  warp(m, 20, 10, 'dwheal', 5, 6, UP); warp(m, 43, 10, 'dwshop', 5, 6, UP); warp(m, 33, 10, 'arena_driftwood', 0, 0, UP);
  warp(m, 16, 17, 'dwhouse1', 3, 5, UP); warp(m, 36, 17, 'dwhouse2', 3, 5, UP);
  edgeExit(m, 'N', 26, 'sunhaven', 30, 50);
  edgeExit(m, 'E', 22, 'mirewood', 1, 24);
  m.dock = { x: 3, y: 30 };

  m.labels = [
    { x: 20, y: 8, text: 'HEALING CENTRE', style: 'heal' },
    { x: 33, y: 8, text: 'DRIFTWOOD ARENA', style: 'arena' },
    { x: 43, y: 8, text: 'GULLWING PROVISIONS', style: 'shop' },
    { x: 16, y: 15, text: 'NET LOFT', style: 'home' },
    { x: 36, y: 15, text: 'SALTY COTTAGE', style: 'home' },
    { x: 6, y: 5, text: 'LIGHTHOUSE', style: 'town' },
    { x: 6, y: 29, text: 'FERRY PIER', style: 'town' },
  ];
  m.enc = wild(['Flying', 'Normal', 'Water'], 18, 24, { pick: 9 });
})();

// ---- Interiors ----
(function () {
  const m = interior('dwheal', 'DRIFTWOOD HEALING CENTRE', 10, 8, 5);
  rect(m, 2, 2, 5, 1, 'k'); set(m, 8, 1, 'P'); set(m, 1, 1, 'h'); rect(m, 7, 5, 2, 1, 'a');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 2, 5, RIGHT, 'hiker', ['Salt spray and a cup of cocoa. The best way to recover.']);
  for (let x = 2; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING CENTRE', free: true }) : G.story.nurse() });
  m.objs.push({ x: 8, y: 1, fn: () => G.pcMenu() });
  warp(m, 5, 7, 'driftwood', 20, 11, DOWN);
})();
(function () {
  const m = interior('dwshop', 'GULLWING PROVISIONS', 10, 8, 5);
  rect(m, 3, 3, 5, 1, 'k'); scatter(m, 'S', [[1, 1], [2, 1], [7, 1], [8, 1], [1, 2]]); scatter(m, 'x', [[8, 5], [8, 6], [1, 5]]); rect(m, 4, 5, 3, 1, 'a');
  npc(m, 5, 2, DOWN, 'clerk', null, { still: true, style: { hair: '#c8c8d0', skin: '#e8c098', shirt: '#3a9ac8', pants: '#2a3048', hat: '#f4f4f4' } });
  npc(m, 2, 6, RIGHT, 'lass', ['Pearls fetch a fine price here. They pay extra for the big ones.']);
  for (let x = 3; x <= 7; x++) m.objs.push({ x, y: 3, prompt: 'Shop', fn: () => G.openShop ? G.openShop('gullwing') : G.story.says('The shop is shut for the tide.') });
  warp(m, 5, 7, 'driftwood', 43, 11, DOWN);
})();
const house = (id, name, door, lines, who) => {
  const m = interior(id, name, 8, 7, 3);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 2, 1, 'a'); scatter(m, 'x', [[6, 1], [1, 4]]);
  npc(m, 3, 3, RIGHT, who, lines);
  warp(m, 3, 6, 'driftwood', door[0], door[1], DOWN);
};
house('dwhouse1', 'NET LOFT', [16, 18], ['I mend nets all day. Every knot is a story.', 'The big gale last winter tore half my nets. The gulls laughed.'], 'old');
house('dwhouse2', 'SALTY COTTAGE', [36, 18], ['My son is a sailor. He sends postcards from the Tidefall Islands.', 'The ferry captain knows every wave by name.'], 'mom');
})();
