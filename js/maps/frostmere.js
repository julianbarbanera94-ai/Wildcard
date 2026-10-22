// FROSTMERE CITY (north): an ice city. The Crystal Palace rises over a frozen-lake plaza, snow-roofed houses and tower blocks line
// the boulevard, the Healing Centre, the Emporium and the Frostmere Arena (Ice, Rime Badge) stand in town, and a ferry pier on the frozen bay
// sails to the Aurora Isles.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, interior, warp, npc, sign, trainer, edgeExit, DOWN, UP, LEFT, RIGHT } = G.mk;
const H = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, {
  frostmere: { name: 'FROSTMERE EMPORIUM', place: 'FROSTMERE CITY', color: '#7ac8f0', greet: 'Welcome to the Emporium! Everything a Warden needs for the cold.', bye: 'Stay warm out there!',
    stock: [{ item: 'Super Potion', cat: 'MEDICINE' }, { item: 'Full Heal', cat: 'MEDICINE' }, { item: 'Revive', cat: 'MEDICINE' },
      { item: 'Pulse Orb', cat: 'ORBS' }, { item: 'Frost Orb', cat: 'ORBS' }, { item: 'Flare Orb', cat: 'ORBS' }, { item: 'Stone Orb', cat: 'ORBS' }, { item: 'Mythic Orb', cat: 'ORBS' }],
    sells: 'all', rate: .5 },
});

(function () {
  const m = newMap('frostmere', 'FROSTMERE CITY', 60, 50, 'g', { music: 'town', biome: 'snow', enc: null });
  const blob = (cx, cy, rx, ry, ch) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / (rx + .5), dy = (y - cy) / (ry + .5); if (dx * dx + dy * dy <= 1) set(m, x, y, ch); } };
  const grove = (x, y, w, h, chs, pct) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j, k = H(X, Y);
    if (m.t[Y] && m.t[Y][X] === 'g' && k % 100 < pct) set(m, X, Y, chs[(k >>> 8) % chs.length]); } };

  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
    if (d < 2 || (d === 2 && H(x, y) % 3 === 0)) set(m, x, y, H(x, y) % 4 ? 'n' : '#'); }
  // the frozen bay and its quay
  rect(m, 2, 41, 56, 8, 'w'); scatter(m, 'r', [[6, 40], [20, 40], [35, 40], [52, 40], [10, 41], [27, 41]]);
  rect(m, 6, 38, 46, 2, '%');
  // palace: a crystal citadel of tower blocks
  rect(m, 20, 10, 20, 3, '+'); rect(m, 28, 2, 4, 9, '+'); rect(m, 24, 5, 4, 6, '+'); rect(m, 32, 5, 4, 6, '+'); rect(m, 21, 7, 3, 4, '+'); rect(m, 36, 7, 3, 4, '+');
  scatter(m, 'i', [[27, 4], [32, 4], [23, 6], [36, 6], [20, 9], [39, 9], [30, 1], [26, 4], [33, 3]]);
  rect(m, 26, 13, 8, 3, '%'); rect(m, 20, 13, 5, 2, 'w'); rect(m, 35, 13, 5, 2, 'w'); scatter(m, 'i', [[25, 13], [34, 13], [25, 15], [34, 15]]); scatter(m, 'l', [[26, 12], [33, 12]]);
  // grand plaza with the frozen lake
  rect(m, 14, 16, 32, 8, '%'); blob(30, 20, 7, 2, 'w'); rect(m, 29, 18, 2, 5, 'V'); rect(m, 23, 20, 15, 1, 'V');
  scatter(m, 'l', [[14, 16], [45, 16], [14, 23], [45, 23], [22, 17], [38, 17], [22, 23], [38, 23]]); scatter(m, 'd', [[18, 19], [41, 19], [18, 21], [41, 21]]); scatter(m, 'u', [[15, 17], [44, 17], [15, 22], [44, 22]]);
  // boulevard (W gate to the east plaza) and the avenue south to the quay
  rect(m, 0, 24, 54, 2, '='); rect(m, 29, 26, 2, 12, '=');
  rect(m, 44, 26, 2, 12, '=');
  // the Arena
  building(m, 32, 28, 9, 'U', 4); rect(m, 31, 31, 12, 4, '%'); scatter(m, 'l', [[31, 30], [41, 30], [31, 34], [41, 34]]); rect(m, 31, 35, 2, 3, '%');
  // Healing Centre and Emporium (north of the boulevard)
  building(m, 6, 19, 7, 'R', 3); rect(m, 9, 22, 1, 2, '%'); scatter(m, 'l', [[7, 22], [11, 22]]);
  building(m, 47, 19, 7, 'Q', 3); rect(m, 50, 22, 1, 2, '%'); scatter(m, 'l', [[48, 22], [52, 22]]);
  // enterable houses south of the boulevard
  building(m, 16, 28, 5, 'Q', 2); rect(m, 18, 31, 1, 1, '%'); rect(m, 18, 32, 12, 1, 'p'); building(m, 22, 33, 5, 'R', 2); rect(m, 24, 36, 1, 1, '%'); rect(m, 24, 37, 6, 1, '%');
  scatter(m, 'l', [[17, 31], [23, 36]]);
  // quarters of snow-roofed houses and tower blocks
  [[4, 4, 'Q'], [11, 4, 'R'], [4, 10, 'R'], [11, 10, 'Q']].forEach(([x, y, r]) => { building(m, x, y, 5, r, -1); });
  [[43, 4, 'Q'], [50, 4, 'R'], [43, 10, 'R'], [50, 10, 'Q']].forEach(([x, y, r]) => { building(m, x, y, 5, r, -1); });
  rect(m, 17, 4, 3, 5, '+'); rect(m, 40, 4, 3, 5, '+'); rect(m, 17, 11, 2, 3, '+'); rect(m, 41, 11, 2, 3, '+'); rect(m, 4, 14, 3, 4, '+'); rect(m, 54, 14, 3, 4, '+');
  rect(m, 3, 7, 16, 1, '%'); rect(m, 41, 7, 16, 1, '%'); rect(m, 3, 14, 12, 1, '%'); rect(m, 43, 14, 12, 1, '%'); rect(m, 15, 7, 1, 9, '%'); rect(m, 44, 7, 1, 9, '%');
  scatter(m, 'l', [[3, 8], [14, 8], [45, 8], [55, 8], [3, 15], [14, 15], [45, 15], [55, 15]]);
  // pier
  rect(m, 44, 40, 2, 7, 'z'); rect(m, 12, 40, 2, 4, 'z'); scatter(m, 'l', [[43, 40], [46, 40]]); scatter(m, 'd', [[43, 43], [46, 45], [14, 42]]);
  m.dock = { x: 45, y: 44 };
  // open flats for building (kept clear)
  rect(m, 3, 29, 7, 7, 'g'); rect(m, 50, 28, 7, 7, 'g');
  scatter(m, 'F', [[2, 28], [10, 28], [2, 36], [10, 36], [49, 27], [57, 27], [49, 35], [57, 35]]);
  sign(m, 6, 28, 'BUILDING PLOT\nA fine patch of snow for a Warden to build on.'); sign(m, 53, 27, 'BUILDING PLOT\nA fine patch of snow for a Warden to build on.');
  // scenery
  grove(2, 26, 6, 3, ['n', 'u'], 20); grove(2, 36, 8, 3, ['n', 'u'], 30); grove(50, 36, 8, 2, ['n', 'u'], 30); grove(47, 26, 10, 2, ['n', 'u'], 20);
  grove(31, 26, 3, 2, ['u'], 40); grove(14, 26, 14, 2, ['u', 'n'], 12); grove(2, 14, 12, 2, ['u'], 10);
  // signs
  sign(m, 12, 26, 'FROSTMERE CITY\nThe ice city. Its Arena awaits the strong.');
  sign(m, 28, 15, 'CRYSTAL PALACE\nThe palace of living ice. Closed to visitors.');
  sign(m, 38, 27, 'FROSTMERE ARENA\nIce-type Leader. Win the RIME BADGE.');
  sign(m, 42, 40, 'FERRY PIER\nSailings to the AURORA ISLES, far to the north east.');
  // items
  m.objs.push({ x: 45, y: 46, id: 'frostmere_orb', item: 'Frost Orb', ball: true });
  m.objs.push({ x: 3, y: 13, id: 'frostmere_rev', item: 'Revive', ball: true });
  m.objs.push({ x: 24, y: 15, id: 'frostmere_shard', item: 'Crystal Shard', qty: 2, ball: true });
  m.objs.push({ x: 56, y: 33, id: 'frostmere_sp', item: 'Super Potion', ball: true });
  // trainers
  trainer(m, 'frostmere_skater1', 23, 17, RIGHT, 'lass', { name: 'ILSE', cls: 'FIGURE SKATER', sight: 3, team: [[58, 37], [140, 38], [128, 38]], pre: 'Glide with me on the frozen plaza!', win: 'I slipped!', post: 'The lake is solid all year round.', prize: 2300 });
  trainer(m, 'frostmere_guard1', 30, 14, DOWN, 'kade', { name: 'BORIS', cls: 'PALACE GUARD', sight: 2, team: [[128, 38], [152, 39], [127, 38]], pre: 'Halt! The palace is closed. But I can spare a battle.', win: 'You may pass. Not into the palace, though.', post: 'It is quiet in there. Too quiet.', prize: 2500 });
  // villagers (the ferry captain stands by the dock)
  npc(m, 44, 44, RIGHT, 'hiker', null, { still: true, talk: () => G.ferry ? G.ferry('frostmere') : G.story.says('The ferry is not running yet.') });
  npc(m, 36, 32, DOWN, 'kid', ['The Arena Leader skates across the ice floor! Wear thick socks.', 'Eight badges, then the ferry sails north.'], { roam: 1 });
  npc(m, 20, 26, DOWN, 'old', ['Frostmere never melts. The palace is older than the city itself.'], { roam: 1 });
  npc(m, 32, 17, DOWN, 'girl', ['They say the Aurora Isles glow green at night. I want to see them someday.'], { still: true });
  npc(m, 10, 26, DOWN, 'bug', ['The Healing Centre has a hot spring. Free for any Warden!'], { roam: 1 });
  npc(m, 52, 25, LEFT, 'camper', ['I came here from the Pass. Brr! The Emporium sells Flare Orbs to warm the heart.'], { roam: 1 });
  npc(m, 40, 24, UP, 'mom', ['My children love the ice plaza. I love my fireplace.'], { roam: 1 });
  npc(m, 26, 31, DOWN, 'boy', ['Rime Badge, Ice Arena. I want one!'], { roam: 1 });
  npc(m, 33, 38, UP, 'elder', ['The ferry to the far north needs a special pass. Eight badges and a relit Lantern.'], { still: true });
  npc(m, 8, 24, UP, 'clerk', ['West road goes back to the Pass. The Emporium is on the east side of the plaza.'], { still: true });
  npc(m, 27, 13, DOWN, 'prof', ['The palace walls are living ice. They hum when the aurora is near.'], { still: true });
  npc(m, 18, 38, LEFT, 'girl', ['I fish on the pier. The bay is frozen but the fish are not.'], { roam: 1 });

  m.labels = [
    { x: 9, y: 19, text: 'HEALING CENTRE', style: 'heal' }, { x: 50, y: 19, text: 'FROSTMERE EMPORIUM', style: 'shop' },
    { x: 36, y: 28, text: 'FROSTMERE ARENA', style: 'arena' }, { x: 30, y: 2, text: 'CRYSTAL PALACE', style: 'home' }, { x: 45, y: 39, text: 'FERRY PIER', style: 'shop' },
  ];
  m.landing = { x: 22, y: 22 };

  warp(m, 36, 30, 'arena_frostmere', 0, 0, UP);
  warp(m, 9, 21, 'frost_heal', 3, 5, UP); warp(m, 50, 21, 'frost_shop', 3, 5, UP);
  warp(m, 18, 30, 'frost_house1', 3, 5, UP); warp(m, 24, 35, 'frost_house2', 3, 5, UP);
  edgeExit(m, 'W', 24, 'glacier', 58, 20, null);
})();

(function () {
  const m = interior('frost_heal', 'HEALING CENTRE', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); set(m, 1, 1, 'h'); rect(m, 5, 4, 2, 1, 'a'); set(m, 1, 5, 't');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 6, 5, LEFT, 'old', ['Warm tea, a warm bed, a warm Bondling. That is Frostmere hospitality.']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Heal', fn: () => G.healUI ? G.healUI({ name: 'HEALING CENTRE', free: true }) : G.story.nurse() });
  warp(m, 3, 6, 'frostmere', 9, 22, DOWN);
})();
(function () {
  const m = interior('frost_shop', 'FROSTMERE EMPORIUM', 8, 7, 3);
  rect(m, 3, 2, 4, 1, 'k'); rect(m, 1, 1, 1, 3, 'S'); scatter(m, 'x', [[6, 1], [6, 5]]);
  npc(m, 4, 1, DOWN, 'clerk', null, { still: true });
  npc(m, 5, 4, LEFT, 'girl', ['Frost Orbs shimmer in the cold. They work best on ice creatures!']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 2, prompt: 'Shop', fn: () => G.openShop ? G.openShop('frostmere') : G.story.says('The Emporium is closed for stocktaking.') });
  warp(m, 3, 6, 'frostmere', 50, 22, DOWN);
})();
(function () {
  const m = interior('frost_house1', 'ICE HOUSE', 8, 7, 3);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 3, 1, 'a'); scatter(m, 'S', [[4, 1]]);
  npc(m, 5, 4, LEFT, 'mom', ['The walls are thick ice, but the hearth keeps us toasty.', 'My son wants to skate in the Arena.']);
  warp(m, 3, 6, 'frostmere', 18, 31, DOWN);
})();
(function () {
  const m = interior('frost_house2', 'ICE HOUSE', 8, 7, 3);
  set(m, 1, 1, 'b'); set(m, 2, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 3, 1, 'a'); scatter(m, 'S', [[6, 1]]);
  npc(m, 2, 4, RIGHT, 'old', ['I saw the aurora once, from the pier. Green and violet, rippling like silk.']);
  warp(m, 3, 6, 'frostmere', 24, 36, DOWN);
})();
})();
