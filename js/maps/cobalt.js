// COBALT CITY (72x56): a big modern port city of tower blocks, roads and plazas; the Cobalt Arena (Electric, Circuit Badge), a department
// store, a Healing Centre, a power plant, a harbour with the ferry pier, and a long bridge east to a lighthouse island with three houses.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, interior, warp, npc, sign, edgeExit, DOWN, UP, LEFT, RIGHT } = G.mk;

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
  }
}
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id: 'cobalt_' + id, item: name, ball: true }, qty ? { qty } : {}));

G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, {
  cobaltstore: { name: 'COBALT DEPARTMENT STORE', place: 'COBALT CITY', color: '#3a7ae0', greet: 'Welcome to Cobalt Department Store! Six floors of everything, all on one counter.', bye: 'Thank you for shopping Cobalt!',
    stock: [{ item: 'Potion', cat: 'MEDICINE' }, { item: 'Super Potion', cat: 'MEDICINE' }, { item: 'Full Heal', cat: 'MEDICINE' }, { item: 'Revive', cat: 'MEDICINE' }, { item: 'Herb Salve', cat: 'MEDICINE' },
      { item: 'Terra Orb', cat: 'ORBS' }, { item: 'Pulse Orb', cat: 'ORBS' }, { item: 'Aqua Orb', cat: 'ORBS' }, { item: 'Flare Orb', cat: 'ORBS' }, { item: 'Verdant Orb', cat: 'ORBS' }, { item: 'Frost Orb', cat: 'ORBS' },
      { item: 'Gale Orb', cat: 'ORBS' }, { item: 'Stone Orb', cat: 'ORBS' }, { item: 'Void Orb', cat: 'ORBS' }, { item: 'Mythic Orb', cat: 'ORBS' },
      { item: 'Watering Can', cat: 'TOOLS' }, { item: 'Axe', cat: 'TOOLS' }, { item: 'Pickaxe', cat: 'TOOLS' },
      { item: 'Glass', cat: 'MATERIALS' }, { item: 'Rope', cat: 'MATERIALS' }, { item: 'Cloth', cat: 'MATERIALS' }, { item: 'Wire', cat: 'MATERIALS' }, { item: 'Gear', cat: 'MATERIALS' }],
    sells: 'all', rate: .5 },
});

(function () {
  const m = newMap('cobalt', 'COBALT CITY', 72, 56, 'g', { music: 'town', biome: 'city', enc: null });
  const eastCoast = y => 52 + Math.round(Math.sin(y / 4) * 1.2), southCoast = x => 46 + Math.round(Math.sin(x / 5) * 1);
  // ---- Sea, beaches and the island ----
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (x >= eastCoast(y) || y >= southCoast(x)) set(m, x, y, 'w');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.t[y][x] === 'g' && (x >= eastCoast(y) - 2 || y >= southCoast(x) - 2)) set(m, x, y, 'y');
  blob(m, 66, 30, 6.4, 10.8, 'y', null, .08); blob(m, 66, 30, 4.8, 9.2, 'g', null, .08);
  // border trees along the north and west edges
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { if (m.t[y][x] !== 'g') continue; const d = Math.min(x, y); if (d < 2 || (d === 2 && hash(x, y) < .4)) set(m, x, y, hash(y, x) < .3 ? 'n' : '#'); }
  for (let x = 0; x < 52; x++) if (hash(x, 3) < .75) set(m, x, 1, '#');
  // ---- Roads and plazas ----
  rect(m, 4, 17, 47, 2, '='); rect(m, 0, 30, 52, 2, '='); rect(m, 36, 0, 2, 44, '='); rect(m, 18, 17, 2, 26, '='); rect(m, 20, 41, 30, 2, '=');
  rect(m, 52, 30, 10, 2, '=');                                   // the long bridge east
  rect(m, 6, 23, 43, 7, '%'); rect(m, 36, 23, 2, 7, '%');
  rect(m, 36, 19, 2, 4, '=');
  // ---- Tower blocks, north-west ----
  [[4, 3, 4, 5], [9, 4, 4, 6], [14, 3, 4, 5], [20, 3, 5, 6], [27, 4, 4, 5], [32, 5, 3, 4], [4, 10, 4, 5], [10, 11, 3, 4], [15, 10, 4, 5], [21, 11, 4, 4], [27, 11, 5, 4]].forEach(([x, y, w, h]) => rect(m, x, y, w, h, '+'));
  rect(m, 3, 9, 33, 1, '%'); rect(m, 3, 15, 33, 1, '%'); rect(m, 8, 3, 1, 12, '%'); rect(m, 13, 3, 1, 12, '%'); rect(m, 19, 3, 1, 12, '%'); rect(m, 26, 3, 1, 12, '%'); rect(m, 31, 4, 1, 11, '%');
  rect(m, 33, 9, 3, 1, '%');
  scatter(m, 'l', [[8, 9], [13, 9], [19, 9], [26, 9], [8, 15], [13, 15], [19, 15], [26, 15], [31, 15], [35, 12]]);
  scatter(m, 'u', [[9, 15], [14, 15], [20, 15], [27, 16], [7, 9], [12, 9], [18, 9], [25, 9]]); scatter(m, '#', [[34, 12], [34, 13], [35, 7], [35, 8]]);
  // ---- Power plant (north-east) ----
  rect(m, 39, 3, 13, 13, '%');
  rect(m, 41, 4, 3, 6, '+'); rect(m, 47, 4, 3, 6, '+');         // cooling towers
  rect(m, 43, 5, 4, 3, 'Q'); rect(m, 43, 8, 4, 1, 'W'); scatter(m, 'N', [[44, 8], [46, 8]]); rect(m, 44, 10, 2, 4, '=');
  rect(m, 40, 11, 3, 2, 'x'); rect(m, 48, 11, 3, 2, 'x'); scatter(m, 'F', [[40, 14], [41, 14], [42, 14], [43, 14], [46, 14], [47, 14], [48, 14], [49, 14], [50, 14]]);
  rect(m, 44, 14, 2, 3, '=');
  scatter(m, 'l', [[40, 10], [50, 10], [43, 13], [46, 13]]);
  // ---- North frontage: Healing Centre, hotel, Arena, Department Store ----
  building(m, 10, 20, 7, 'R', 3);                                // Healing Centre, door (13,22)
  building(m, 20, 20, 5, 'Q', -1);                               // hotel
  building(m, 26, 20, 9, 'U', 4);                                // Cobalt Arena, door (30,22)
  building(m, 40, 20, 9, 'Q', 4);                                // Department store, door (44,22)
  building(m, 4, 20, 5, 'R', -1);
  rect(m, 13, 23, 1, 1, '%'); rect(m, 30, 23, 1, 1, '%'); rect(m, 44, 23, 1, 1, '%');
  scatter(m, 'l', [[9, 23], [17, 23], [25, 23], [35, 23], [39, 23], [49, 23], [9, 29], [25, 29], [49, 29]]);
  // fountains and planters in the plaza
  [[14, 26], [44, 26]].forEach(([x, y]) => { rect(m, x - 1, y - 1, 5, 4, 'f'); rect(m, x, y, 3, 2, 'w'); });
  scatter(m, 'u', [[7, 24], [48, 24], [7, 28], [48, 28], [22, 24], [27, 28], [32, 28]]); scatter(m, 'd', [[21, 27], [41, 27]]);
  // ---- Row of lawn and trees along the avenue ----
  scatter(m, '#', [[5, 29], [7, 29], [11, 29], [15, 29], [21, 29], [29, 29], [33, 29], [40, 29], [46, 29], [51, 29]].filter(([x, y]) => m.t[y][x] === '%'));
  // ---- South-west park with a pond ----
  rect(m, 3, 33, 14, 12, 'g'); blob(m, 9, 38, 4, 2.6, 'w', null, .12); blob(m, 9, 38, 5.4, 3.8, 'y', ['g'], .1);
  scatter(m, '#', [[4, 33], [6, 34], [12, 33], [14, 34], [4, 43], [6, 44], [14, 43], [15, 40], [3, 38], [4, 40], [15, 36]]);
  scatter(m, 'f', [[7, 35], [11, 35], [6, 41], [12, 41], [4, 36], [14, 38], [10, 43]]); scatter(m, 'd', [[5, 37], [13, 39], [8, 42]]); scatter(m, 'u', [[5, 34], [13, 36], [7, 44]]);
  rect(m, 9, 33, 1, 2, '%'); rect(m, 16, 38, 2, 1, '%'); rect(m, 9, 42, 1, 3, '%'); scatter(m, 'l', [[8, 34], [10, 34], [10, 42]]);
  // ---- Mid-south tower blocks and offices ----
  [[21, 33, 4, 4], [27, 33, 5, 4], [21, 37, 3, 3]].forEach(([x, y, w, h]) => rect(m, x, y, w, h, '+'));
  building(m, 26, 38, 5, 'Q', -1); scatter(m, 'l', [[25, 33], [26, 33], [32, 33], [25, 40], [32, 40]]); scatter(m, 'u', [[20, 38], [24, 38], [33, 36], [33, 38]]);
  rect(m, 24, 33, 1, 7, '%'); rect(m, 32, 33, 1, 7, '%');
  // ---- Harbour (south-east) ----
  rect(m, 38, 33, 13, 8, '%'); building(m, 39, 34, 7, 'Q', -1); building(m, 47, 34, 4, 'R', -1); rect(m, 38, 38, 13, 2, '=');
  scatter(m, 'x', [[40, 38], [41, 38], [42, 39], [44, 39], [45, 38], [49, 39], [50, 38], [50, 39]]); scatter(m, 'l', [[38, 33], [51, 33], [38, 40], [47, 40], [51, 40]]);
  rect(m, 44, 32, 1, 1, '%');
  // ferry pier and a second quay
  rect(m, 48, 43, 2, 10, 'z'); rect(m, 40, 43, 2, 6, 'z'); rect(m, 42, 46, 6, 2, 'z');
  scatter(m, 'l', [[47, 43], [50, 43], [47, 49], [50, 49], [40, 43], [43, 43]]); scatter(m, 'd', [[47, 52], [50, 52]]);
  m.dock = { x: 48, y: 52 };
  // ---- The lighthouse island ----
  rect(m, 61, 29, 2, 4, 'y'); rect(m, 63, 25, 4, 1, '%'); rect(m, 63, 29, 4, 1, '%'); rect(m, 63, 36, 4, 1, '%'); rect(m, 65, 21, 2, 17, '%'); rect(m, 61, 30, 5, 2, '%');
  building(m, 61, 22, 5, 'R', 2); building(m, 61, 26, 5, 'Q', 2); building(m, 61, 33, 5, 'R', 2);
  set(m, 68, 22, '|'); scatter(m, 'r', [[67, 22], [69, 22], [68, 21], [69, 23], [67, 21]]); scatter(m, 'l', [[67, 24], [64, 21], [63, 37]]);
  scatter(m, 'f', [[68, 28], [69, 28], [68, 29], [68, 33], [69, 34]]); scatter(m, 'u', [[68, 26], [69, 31], [68, 36], [67, 38]]); scatter(m, 'd', [[68, 25], [67, 30]]);
  m.t[24][63] = 'D'; // door tiles are set by `building` already; keep explicit

  // ---- Signs ----
  sign(m, 34, 30, 'COBALT CITY\nPort, power and progress. The Arena stands on the Grand Plaza.');
  sign(m, 38, 16, 'COBALT POWER PLANT\nNo entry. High voltage.');
  sign(m, 50, 41, 'FERRY PIER\nSailings to Moonlit Island. Speak to the captain.');
  sign(m, 55, 29, 'LIGHTHOUSE ISLAND\nThe long bridge leads east to the lighthouse.');
  sign(m, 35, 3, 'SANDSREACH DESERT\nNorth along the avenue.');
  sign(m, 2, 29, 'WHISPERING WOODS\nWest, back through the woods.');
  // ---- Items ----
  item(m, 6, 36, 'park', 'Super Potion'); item(m, 50, 44, 'harbour', 'Pearl'); item(m, 69, 38, 'island', 'Full Heal'); item(m, 3, 14, 'nw', 'Potion', 2);
  // ---- Townsfolk ----
  npc(m, 30, 25, DOWN, 'old', ['This is the Cobalt Arena. The Leader is an Electric specialist.', 'Win the Circuit Badge, and you will have the knack for the second half of the journey.'], { still: true });
  npc(m, 24, 26, DOWN, 'girl', ['I work at the Department Store. We sell nearly everything, but not the stars.'], { roam: 2 });
  npc(m, 40, 25, LEFT, 'boy', ['The power plant keeps every light in Cobalt burning. And the Arena too.'], { roam: 1 });
  npc(m, 11, 25, DOWN, 'mom', ['Our Healing Centre is open all hours. Port cities never sleep.'], { roam: 1 });
  npc(m, 33, 28, UP, 'camper', ['I came on a ferry from the west. Everything here is so tall!'], { still: true });
  npc(m, 22, 29, DOWN, 'kid', ['Race you to the bridge! ...Ok, you are faster.'], { roam: 2 });
  npc(m, 46, 28, LEFT, 'lass', ['The fountains are lit up at night. It is very pretty.'], { roam: 1 });
  npc(m, 35, 11, RIGHT, 'hiker', ['North along the avenue is the Sandsreach Desert. West is Whispering Woods.'], { still: true });
  npc(m, 43, 17, DOWN, 'clerk', ['Power plant staff only! Please stay behind the fence.'], { still: true });
  npc(m, 12, 40, RIGHT, 'bug', ['I love the park. It is the only place in Cobalt with real mud.'], { roam: 1 });
  npc(m, 30, 43, UP, 'old', ['Ferries leave from the south pier. The far island of Moonlit is only for the very bravest Wardens.'], { still: true });
  npc(m, 44, 37, DOWN, 'hiker', ['Cargo from all over Aurelis comes through this harbour.'], { roam: 1 });
  m.npcs.push({ x: 49, y: 52, dir: LEFT, style: { hair: '#e8e8f0', skin: '#e8b890', shirt: '#2a4a8a', pants: '#2a3048', hat: '#f8f8f8' }, still: true,
    talk: () => G.ferry ? G.ferry('cobalt') : G.story.says('The ferry is not running yet.') });
  npc(m, 66, 26, LEFT, 'old', ['KEEPER JONAH: I keep the lighthouse lit. The ships on the western sea know my beam.'], { still: true });
  npc(m, 66, 29, DOWN, 'kid', ['I live in the blue house! The bridge is the best place to watch the ferries.'], { roam: 1 });
  npc(m, 67, 33, RIGHT, 'lass', ['Quiet here, isn\'t it? Cobalt is loud, so I moved to the island.'], { roam: 1 });
  npc(m, 64, 38, UP, 'camper', ['The sea beyond the lighthouse is endless. They say Moonlit Island is out there somewhere.'], { still: true });
  m.labels = [{ x: 13, y: 20, text: 'HEALING CENTRE', style: 'heal' }, { x: 30, y: 20, text: 'COBALT ARENA', style: 'arena' }, { x: 44, y: 20, text: 'DEPARTMENT STORE', style: 'shop' },
    { x: 45, y: 4, text: 'POWER PLANT', style: 'craft' }, { x: 49, y: 42, text: 'FERRY PIER', style: 'town' }, { x: 63, y: 22, text: 'LIGHTHOUSE ISLAND', style: 'town' }];
  m.landing = { x: 36, y: 26 };
  // ---- Warps ----
  warp(m, 13, 22, 'cobaltheal', 3, 5, UP); warp(m, 44, 22, 'cobaltstore', 4, 6, UP); warp(m, 30, 22, 'arena_cobalt', 0, 0, UP);
  warp(m, 63, 24, 'cobalth1', 3, 5, UP); warp(m, 63, 28, 'cobalth2', 3, 5, UP); warp(m, 63, 35, 'cobalth3', 3, 5, UP);
  edgeExit(m, 'W', 30, 'whispering', 62, 24, null);
  edgeExit(m, 'N', 36, 'sandsreach', 66, 36, null, 'y');
  rect(m, 0, 30, 3, 2, '='); rect(m, 36, 0, 2, 3, '=');
})();

(function () {
  const m = interior('cobaltheal', 'COBALT HEALING CENTRE', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); set(m, 1, 1, 'h'); scatter(m, 'S', [[6, 1]]); rect(m, 5, 4, 2, 1, 'a'); set(m, 1, 5, 't');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 6, 5, LEFT, 'clerk', ['The Arena sends us a lot of customers. Static shocks, mostly.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING CENTRE', free: true }) : G.story.nurse() });
  warp(m, 3, 6, 'cobalt', 13, 23, DOWN);
})();
(function () {
  const m = interior('cobaltstore', 'COBALT DEPARTMENT STORE', 10, 8, 4);
  rect(m, 3, 3, 5, 1, 'k'); scatter(m, 'S', [[1, 1], [2, 1], [3, 1], [6, 1], [7, 1], [8, 1], [1, 2], [8, 2]]); scatter(m, 'x', [[1, 5], [8, 5]]); rect(m, 4, 5, 2, 2, 'a');
  npc(m, 4, 2, DOWN, 'clerk', null, { still: true });
  npc(m, 2, 6, RIGHT, 'boy', ['Six floors! ...well, one floor. But a very big one.']);
  for (let x = 3; x <= 7; x++) m.objs.push({ x, y: 3, prompt: 'Shop', fn: () => G.openShop ? G.openShop('cobaltstore') : G.story.says('The store is closed for stocktaking.') });
  warp(m, 4, 7, 'cobalt', 44, 23, DOWN);
})();
[['cobalth1', 63, 24, 'KEEPER\'S HOUSE', 'old', ['The lighthouse lamp needs oil every night. It is quite a climb to the top, so I let it shine on its own most evenings.']],
 ['cobalth2', 63, 28, 'BLUE HOUSE', 'mom', ['We moved to the island to be near the sea. You can hear the ferries from the kitchen.', 'Help yourself to the view!']],
 ['cobalth3', 63, 35, 'SEASIDE COTTAGE', 'girl', ['I paint the bridge every morning. Each day it looks different.', 'The light on the water is the secret.']]].forEach(([id, dx, dy, name, st, lines], i) => {
  const m = interior(id, name, 8, 7, 3);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 2, 1, 'a'); if (i === 1) set(m, 6, 5, 'x');
  npc(m, 4, 2, DOWN, st, lines, { still: true });
  warp(m, 3, 6, 'cobalt', dx, dy + 1, DOWN);
});
})();
