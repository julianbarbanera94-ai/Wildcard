// SANDSREACH DESERT (68x52): dunes, ancient sandstone ruins, a half-buried temple and the oasis village of Sandsreach
// with its Healing Centre, Dune Bazaar and the Sandsreach Arena (Ground, Dune Badge).
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, interior, warp, npc, sign, trainer, edgeExit, gate, wild, DOWN, UP, LEFT, RIGHT } = G.mk;

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 1 && y > 1 && x < m.w - 2 && y < m.h - 2 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
  }
}
function path(m, pts, ch = 'p', w = 2) {
  for (let i = 0; i < pts.length - 1; i++) {
    let [x, y] = pts[i]; const [tx, ty] = pts[i + 1];
    rect(m, x, y, w, w, ch);
    while (x !== tx) { x += Math.sign(tx - x); rect(m, x, y, w, w, ch); }
    while (y !== ty) { y += Math.sign(ty - y); rect(m, x, y, w, w, ch); }
  }
}
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id: 'sandsreach_' + id, item: name, ball: true }, qty ? { qty } : {}));

G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, {
  dunebazaar: { name: 'DUNE BAZAAR', place: 'SANDSREACH', color: '#e0a040', greet: 'Welcome, traveller! Cool drinks, good medicine, and orbs that survive the sand.', bye: 'May the dunes be kind to you!',
    stock: [{ item: 'Potion', cat: 'MEDICINE' }, { item: 'Super Potion', cat: 'MEDICINE' }, { item: 'Full Heal', cat: 'MEDICINE' }, { item: 'Revive', cat: 'MEDICINE' }, { item: 'Herb Salve', cat: 'MEDICINE' },
      { item: 'Terra Orb', cat: 'ORBS' }, { item: 'Stone Orb', cat: 'ORBS' }, { item: 'Flare Orb', cat: 'ORBS' }, { item: 'Pulse Orb', cat: 'ORBS' }, { item: 'Pepper Seeds', cat: 'SEEDS' }],
    sells: ['crop', 'mat'], rate: .5 },
});

(function () {
  const m = newMap('sandsreach', 'SANDSREACH DESERT', 68, 52, 'y', { music: 'route', biome: 'desert', enc: wild(['Ground', 'Rock', 'Fire', 'Bug'], 22, 28, { pick: 8 }) });
  // Border: palms and sandstone boulders.
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y), k = hash(x, y);
    if (d < 2) set(m, x, y, k < .45 ? '#' : 'r'); else if (d === 2 && k < .3) set(m, x, y, k < .12 ? '#' : 'r');
  }
  // ---- Dry tall grass patches ----
  blob(m, 12, 33, 8, 4, 'G', ['y']); blob(m, 22, 44, 9, 3.5, 'G', ['y']); blob(m, 60, 6, 5, 2.6, 'G', ['y']);
  blob(m, 58, 28, 4.5, 3, 'G', ['y']); blob(m, 8, 14, 3.5, 3, 'G', ['y']); blob(m, 46, 44, 5, 2.4, 'G', ['y']);
  blob(m, 42, 8, 6, 3, 'G', ['y']); blob(m, 62, 40, 3.5, 3, 'G', ['y']);
  // ---- Dunes: sandstone ridges, scrub and cactus ----
  [[28, 8, 6], [4, 24, 3], [50, 4, 5], [20, 38, 5], [40, 36, 4], [64, 22, 3], [30, 46, 4], [8, 46, 5]].forEach(([x, y, w]) => { rect(m, x, y, w, 1, 'E'); scatter(m, 'r', [[x - 1, y], [x + w, y + 1]]); });
  for (let i = 0; i < 90; i++) { const x = 3 + Math.floor(hash(i, 1) * 62), y = 3 + Math.floor(hash(1, i) * 46); if (m.t[y][x] === 'y') set(m, x, y, hash(i, i) < .55 ? 'u' : hash(i, 3) < .5 ? 'r' : 'd'); }

  // ---- Roads ----
  path(m, [[0, 24], [26, 24]]);                                  // west road from Lanternrest
  path(m, [[34, 50], [34, 26]]);                                 // south road to the village
  path(m, [[48, 24], [56, 24], [56, 36], [66, 36]]);             // east road to Cobalt
  path(m, [[56, 24], [56, 14], [66, 14]]);                       // north-east road to the Badlands
  path(m, [[14, 24], [14, 13]]);                                 // branch north to the ruins
  path(m, [[56, 36], [56, 44]]);                                 // branch south to the sunken colonnade
  path(m, [[34, 40], [20, 40], [20, 34]]);                       // south-west track

  // ---- Oasis village (x 26..49, y 17..36) ----
  rect(m, 26, 21, 24, 8, 'p'); rect(m, 27, 20, 22, 1, 'p');
  building(m, 28, 17, 5, 'R', 2);                                // Healing Centre, door (30,19)
  building(m, 35, 17, 9, 'U', 4);                                // Sandsreach Arena, door (39,19)
  building(m, 46, 17, 5, 'Q', 2);                                // Dune Bazaar, door (48,19)
  rect(m, 30, 20, 1, 1, 'p'); rect(m, 39, 20, 1, 1, 'p'); rect(m, 48, 20, 1, 1, 'p');
  // pool with palms and a little bridge
  blob(m, 43, 29, 5, 2.6, 'w', null, .1); rect(m, 37, 29, 13, 1, 'V');
  scatter(m, '#', [[37, 26], [39, 25], [46, 26], [48, 27], [38, 33], [41, 33], [45, 33], [48, 31], [36, 28]]);
  rect(m, 38, 31, 1, 1, 'f'); scatter(m, 'f', [[40, 25], [44, 26], [47, 33], [42, 33]]);
  // houses
  building(m, 27, 29, 5, 'R', -1); building(m, 27, 33, 5, 'Q', -1); building(m, 44, 34, 5, 'R', -1);
  scatter(m, 'l', [[27, 21], [33, 21], [37, 21], [41, 21], [49, 21], [35, 31], [49, 24], [26, 24]]);
  rect(m, 29, 32, 1, 1, 'p'); rect(m, 29, 36, 1, 1, 'p');
  scatter(m, 'F', [[26, 29], [26, 30], [26, 33], [26, 34]]);
  scatter(m, 'x', [[51, 21], [51, 22]]);
  // keep the roads open
  rect(m, 34, 25, 2, 12, 'p'); rect(m, 56, 14, 2, 23, 'p');

  // ---- North-west ruins: a ring of pillars and the half-buried temple ----
  rect(m, 8, 5, 14, 9, 'y');
  rect(m, 10, 6, 10, 3, 'E'); rect(m, 10, 9, 10, 1, 'W'); scatter(m, 'N', [[12, 9], [17, 9]]); set(m, 14, 9, 'M'); set(m, 15, 9, 'M');
  scatter(m, 'r', [[9, 10], [9, 12], [20, 10], [20, 12], [11, 12], [18, 12], [8, 7], [21, 7], [9, 5], [20, 5]]);
  scatter(m, 'E', [[12, 11], [17, 11], [10, 13], [19, 13]]); scatter(m, 'd', [[13, 12], [16, 11], [11, 10], [18, 13]]);
  rect(m, 14, 10, 2, 4, 'p');
  scatter(m, 'r', [[4, 3], [5, 4], [3, 5], [5, 5]]);
  // a secret nook behind the temple
  rect(m, 4, 4, 3, 2, 'y'); rect(m, 7, 6, 3, 1, 'y'); rect(m, 6, 4, 4, 1, 'y');

  // ---- South-east: sunken colonnade ----
  rect(m, 50, 40, 14, 8, 'y');
  for (let x = 50; x <= 62; x += 2) { set(m, x, 41, 'r'); set(m, x, 46, 'r'); }
  rect(m, 52, 43, 10, 2, 'E'); scatter(m, 'd', [[51, 44], [62, 44], [55, 47], [60, 41]]); scatter(m, 'r', [[63, 47], [49, 41]]);
  rect(m, 56, 41, 2, 6, 'p');

  // ---- Signs ----
  sign(m, 33, 30, 'SANDSREACH\nOasis village. The Arena stands on the north side of the square.');
  sign(m, 12, 24, 'ANCIENT RUINS\nNorth: the half-buried temple. Mind the loose stones.');
  sign(m, 58, 15, 'CRIMSON BADLANDS\nEast along this road. Four Arena Badges needed.');
  sign(m, 58, 35, 'COBALT CITY\nEast, then the port. Four Arena Badges needed.');
  sign(m, 33, 48, 'LANTERNREST and WHISPERING WOODS\nThe woods lie south. One badge needed.');

  // ---- Items ----
  item(m, 5, 4, 'nook', 'Super Potion'); item(m, 17, 10, 'temple', 'Crystal Shard', 2); item(m, 62, 45, 'colonnade', 'Stone Orb', 2);
  item(m, 20, 36, 'fullheal', 'Full Heal'); item(m, 62, 5, 'revive', 'Revive'); item(m, 7, 42, 'potion', 'Potion', 2); item(m, 61, 29, 'coal', 'Clay', 3);

  // ---- Trainers (Lv 22-28) ----
  trainer(m, 'sandsreach_ruin1', 18, 23, DOWN, 'hiker', { name: 'TOBIAS', cls: 'RUIN MANIAC', sight: 4, team: [[14, 23], [120, 24], [21, 25]], pre: 'These ruins are older than the Lantern itself. Care to battle among them?', win: 'Crumbled!', post: 'The temple door was sealed with a riddle nobody solved.', prize: 60 });
  trainer(m, 'sandsreach_bug1', 33, 42, RIGHT, 'bug', { name: 'MIRO', cls: 'BUG CATCHER', sight: 4, team: [[29, 23], [18, 24], [123, 25]], pre: 'Desert bugs are tough! Want to see?', win: 'Squashed my swarm...', post: 'The scarabs come out at dusk.', prize: 60 });
  trainer(m, 'sandsreach_pyro1', 55, 30, RIGHT, 'camper', { name: 'EMBER', cls: 'FIRE BREATHER', sight: 4, team: [[117, 25], [145, 26], [117, 26]], pre: 'The sand is hot, and so am I!', win: 'Cooled right off.', post: 'The volcano is even hotter, far to the north.', prize: 60 });
  trainer(m, 'sandsreach_tourist1', 58, 13, DOWN, 'lass', { name: 'DAHLIA', cls: 'TOURIST', sight: 4, team: [[143, 26], [152, 27]], pre: 'I came to see the Badlands, but a battle is fine too!', win: 'Wow, you are strong.', post: 'The mesas are on the other side of that road.', prize: 60 });
  trainer(m, 'sandsreach_sage1', 14, 15, DOWN, 'old', { name: 'ELDER AMUN', cls: 'DESERT SAGE', sight: 4, team: [[151, 27], [129, 26], [120, 28]], pre: 'Young Warden, the sands have watched you coming.', win: 'The sands remember.', post: 'Look closely at the temple. Not everything lies in the open.', prize: 70 });

  // ---- Townsfolk ----
  npc(m, 32, 26, DOWN, 'mom', ['The oasis never dries up, even in the deepest summer.', 'Our Arena Leader specialises in Ground creatures. Bring something that floats, or something that swims!'], { roam: 1 });
  npc(m, 40, 23, DOWN, 'old', ['The Sandsreach Arena is the fifth challenge for a Warden.', 'Win the Dune Badge and the Badlands road will open for you.'], { still: true });
  npc(m, 47, 32, LEFT, 'kid', ['I like splashing in the pool! Do not tell the palms.'], { roam: 1 });
  npc(m, 29, 27, RIGHT, 'camper', ['Cobalt City lies to the east, past the ruins. They say it has towers taller than the dunes.'], { still: true });
  npc(m, 52, 25, LEFT, 'hiker', ['The colonnade in the south-east sinks a little more every year.', 'People say a treasure hides under the fallen pillars.'], { still: true });
  npc(m, 22, 30, UP, 'girl', ['Dry grass hides Ground and Rock creatures. Walk the roads if you are in a hurry.'], { roam: 2 });
  npc(m, 38, 35, UP, 'lass', ['I painted the Arena sign myself. Isn\'t it golden?'], { still: true });

  m.labels = [{ x: 30, y: 17, text: 'HEALING CENTRE', style: 'heal' }, { x: 39, y: 17, text: 'SANDSREACH ARENA', style: 'arena' }, { x: 48, y: 17, text: 'DUNE BAZAAR', style: 'shop' }];
  m.landing = { x: 35, y: 24 };

  // ---- Warps ----
  warp(m, 30, 19, 'sandsreachheal', 3, 5, UP); warp(m, 48, 19, 'dunebazaar', 3, 5, UP);
  warp(m, 39, 19, 'arena_sandsreach', 0, 0, UP);
  edgeExit(m, 'W', 24, 'lanternrest', 58, 24, null);
  edgeExit(m, 'S', 34, 'whispering', 32, 1, gate(1, 'WHISPERING WOODS'));
  edgeExit(m, 'E', 36, 'cobalt', 36, 1, gate(4, 'COBALT CITY'), 'x');
  edgeExit(m, 'E', 14, 'badlands', 1, 24, gate(4, 'CRIMSON BADLANDS'));
  // make sure the exit tiles and their approaches are open
  for (const w of m.warps) if (w.x === 0 || w.x === m.w - 1 || w.y === 0 || w.y === m.h - 1) { set(m, w.x, w.y, 'p'); set(m, w.x === 0 ? 1 : w.x === m.w - 1 ? w.x - 1 : w.x, w.y === 0 ? 1 : w.y === m.h - 1 ? w.y - 1 : w.y, 'p'); }
  rect(m, 0, 24, 3, 2, 'p'); rect(m, 65, 36, 3, 2, 'p'); rect(m, 65, 14, 3, 2, 'p'); rect(m, 34, 49, 2, 3, 'p');
})();

(function () {
  const m = interior('sandsreachheal', 'SANDSREACH HEALING CENTRE', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); set(m, 1, 1, 'h'); scatter(m, 'S', [[6, 1]]); rect(m, 5, 4, 2, 1, 'a'); set(m, 1, 5, 't');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 6, 5, LEFT, 'old', ['The desert sun is hard on a creature. Rest here as long as you like.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING CENTRE', free: true }) : G.story.nurse() });
  warp(m, 3, 6, 'sandsreach', 30, 20, DOWN);
})();
(function () {
  const m = interior('dunebazaar', 'DUNE BAZAAR', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); scatter(m, 'S', [[1, 1], [1, 2], [6, 1]]); scatter(m, 'x', [[1, 4], [6, 4]]); set(m, 6, 5, 't');
  npc(m, 4, 1, DOWN, 'clerk', null, { still: true });
  npc(m, 1, 5, RIGHT, 'kid', ['Desert merchants sell the best Stone Orbs. They are heavy to carry, though!']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Shop', fn: () => G.openShop ? G.openShop('dunebazaar') : G.story.says('The stalls are empty today.') });
  warp(m, 3, 6, 'sandsreach', 48, 20, DOWN);
})();
})();
