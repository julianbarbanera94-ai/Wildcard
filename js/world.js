// Overworld: maps, player/NPC movement, interactions, trainers and wild encounters.
(function () {
const G = globalThis.G;
const VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // down, up, left, right
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
const OPP = [UP, DOWN, RIGHT, LEFT];

// ---- Map building helpers --------------------------------------------------
const maps = G.MAPS = {};
function newMap(id, name, w, h, fill, o) {
  const m = Object.assign({ id, name, w, h, t: Array.from({ length: h }, () => Array(w).fill(fill)), npcs: [], objs: [], warps: [], enc: null, music: 'town', bg: 'grass', outdoor: true }, o);
  return maps[id] = m;
}
const set = (m, x, y, ch) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y][x] = ch; };
const rect = (m, x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(m, x + i, y + j, ch); };
const border = (m, ch) => { rect(m, 0, 0, m.w, 1, ch); rect(m, 0, m.h - 1, m.w, 1, ch); rect(m, 0, 0, 1, m.h, ch); rect(m, m.w - 1, 0, 1, m.h, ch); };
const scatter = (m, ch, pts) => pts.forEach(([x, y]) => set(m, x, y, ch));
// 3-row building: two roof rows and a wall row with windows and (optionally) a door at x+dx.
function building(m, x, y, w, roof, dx) {
  rect(m, x, y, w, 2, roof); rect(m, x, y + 2, w, 1, 'W');
  for (let i = 1; i < w - 1; i++) if (i !== dx && i % 2) set(m, x + i, y + 2, 'N');
  if (dx >= 0) set(m, x + dx, y + 2, 'D');
}
function interior(id, name, w, h, mat) {
  const m = newMap(id, name, w, h, 'T', { outdoor: false });
  border(m, 'B'); set(m, mat, h - 1, 'm'); return m;
}
const warp = (m, x, y, to, tx, ty, dir, need) => m.warps.push({ x, y, to, tx, ty, dir, need });
const ST = {
  boy: { hair: '#5a3a20', skin: '#f8d0a8', shirt: '#48a0e0', pants: '#506080' }, girl: { hair: '#c04860', skin: '#f8d0a8', shirt: '#f0a0c0', pants: '#885070' },
  old: { hair: '#d8d8d8', skin: '#e8c098', shirt: '#8a7a60', pants: '#605040' }, nurse: { hair: '#f0a0b8', skin: '#f8d0a8', shirt: '#f8f0f0', pants: '#f08098', hat: '#f8f0f0' },
  clerk: { hair: '#304060', skin: '#f8d0a8', shirt: '#4070c0', pants: '#304060' }, prof: { hair: '#7a5a40', skin: '#f8d0a8', shirt: '#f8f8f8', pants: '#506848' },
  mom: { hair: '#8a4a30', skin: '#f8d0a8', shirt: '#f0c060', pants: '#a06848' }, hiker: { hair: '#403020', skin: '#e8b890', shirt: '#a87848', pants: '#605040', hat: '#c8a050' },
  bug: { hair: '#a07830', skin: '#f8d0a8', shirt: '#78c050', pants: '#686848', hat: '#e8d870' }, lass: { hair: '#f0c040', skin: '#f8d0a8', shirt: '#e86090', pants: '#4050a0' },
  camper: { hair: '#403028', skin: '#f8d0a8', shirt: '#e07830', pants: '#3a5a3a', hat: '#3a5a3a' }, kade: { hair: '#c0c0d0', skin: '#e8c8b0', shirt: '#403058', pants: '#282038', hat: '#403058' },
  elder: { hair: '#e8e8f4', skin: '#e8c098', shirt: '#6a4a9a', pants: '#403060', hat: '#6a4a9a' }, kid: { hair: '#c07030', skin: '#f8d0a8', shirt: '#f0e060', pants: '#4868b0' },
};
G.PLAYER_STYLE = { hair: '#4a2f1a', skin: '#f8d0a8', shirt: '#e04848', pants: '#3858a0', hat: '#f8f8f8' };
const npc = (m, x, y, dir, style, lines, o) => m.npcs.push(Object.assign({ x, y, dir, style: ST[style], lines }, o));
const sign = (m, x, y, text) => { set(m, x, y, 's'); m.objs.push({ x, y, fn: () => says(text) }); };

// ---- Lanternrest: the hub village. Four roads lead out; the Hollow gate opens after the relight. ----
(function () {
  const m = newMap('lanternrest', 'LANTERNREST', 30, 26, 'g', { music: 'town' });
  border(m, '#'); rect(m, 0, 12, 30, 2, 'p'); rect(m, 14, 0, 2, 26, 'p'); rect(m, 12, 10, 6, 5, 'p');
  building(m, 2, 2, 5, 'R', 2); building(m, 2, 7, 5, 'R', 2); building(m, 8, 7, 5, 'Q', 2); building(m, 18, 2, 7, 'Q', 3); building(m, 24, 7, 5, 'R', 2);
  rect(m, 4, 10, 1, 2, 'p'); rect(m, 10, 10, 1, 2, 'p'); rect(m, 26, 10, 1, 2, 'p'); rect(m, 4, 5, 4, 1, 'p'); rect(m, 7, 5, 1, 7, 'p'); rect(m, 21, 5, 2, 1, 'p'); rect(m, 22, 5, 1, 7, 'p');
  rect(m, 3, 17, 6, 4, 'w'); rect(m, 18, 16, 4, 3, 'f'); rect(m, 6, 14, 3, 2, 'f'); rect(m, 25, 14, 3, 2, 'f');
  rect(m, 24, 17, 5, 3, 'C'); set(m, 26, 19, 'M'); set(m, 27, 19, 'M'); rect(m, 22, 14, 1, 8, 'p'); rect(m, 22, 21, 6, 1, 'p'); rect(m, 26, 20, 2, 1, 'p');
  scatter(m, '#', [[9, 2], [10, 2], [9, 4], [12, 3], [11, 5], [17, 6], [17, 7], [25, 5], [27, 4], [28, 3], [1, 16], [1, 17], [2, 22], [3, 23], [9, 21], [10, 22], [19, 22], [20, 23], [11, 17], [12, 18]]);
  scatter(m, 'l', [[12, 10], [17, 10], [12, 14], [17, 14]]);
  set(m, 13, 11, 's'); m.objs.push({ x: 13, y: 11, fn: () => says(questText()) });
  sign(m, 16, 11, 'LANTERNREST\nWhere the Great Lantern keeps the dark away.');
  sign(m, 25, 20, 'THE HOLLOW GATE\nSealed until the Great Lantern burns again.');
  npc(m, 12, 17, DOWN, 'kid', ['Lantern Night is when everyone hangs lights along the roads!', "But this year the Great Lantern is barely glowing... Elder Wren is worried."], { roam: 2 });
  npc(m, 19, 15, LEFT, 'old', ['Four roads leave Lanternrest: the meadow west, the marsh east, the ridge north, and the shore south.', 'Go any way you like. A Warden finds their own path.'], { still: true });
  npc(m, 6, 22, DOWN, 'lass', ['I collect shells at the shore south of here. Rare creatures hide in the dune grass!', 'Mind the Shell Collector, though. She is fierce.'], { roam: 1 });
  npc(m, 23, 16, DOWN, 'camper', ['You can see the Hollow Gate from here. Nobody has gone through in years.'], { roam: 1 });
  const need = () => G.state.flags.starter ? null : 'LANTERN WARDEN: Hold on! It is not safe beyond the lamplight without a Bondling. Elder Wren is waiting for you at the Hearth Shrine.';
  warp(m, 4, 4, 'lodge', 5, 6, UP); warp(m, 4, 9, 'cottage', 4, 5, UP); warp(m, 10, 9, 'shrine', 5, 7, UP); warp(m, 21, 4, 'tower', 6, 8, UP); warp(m, 26, 9, 'post', 3, 6, UP);
  warp(m, 0, 12, 'sunmeadow', 34, 10, LEFT, need); warp(m, 0, 13, 'sunmeadow', 34, 11, LEFT, need);
  warp(m, 29, 12, 'mirewood', 1, 12, RIGHT, need); warp(m, 29, 13, 'mirewood', 1, 13, RIGHT, need);
  warp(m, 14, 0, 'ridge', 12, 24, UP, need); warp(m, 15, 0, 'ridge', 13, 24, UP, need);
  warp(m, 14, 25, 'shore', 15, 1, DOWN, need); warp(m, 15, 25, 'shore', 16, 1, DOWN, need);
  const gate = () => G.state.flags.lanternLit ? null : 'The archway is sealed by a faint, flickering light. Relight the Great Lantern first.';
  warp(m, 26, 19, 'hollow', 9, 14, UP, gate); warp(m, 27, 19, 'hollow', 10, 14, UP, gate);
})();
(function () {
  const m = interior('cottage', 'YOUR COTTAGE', 8, 7, 4);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 2, 1, 'a');
  npc(m, 3, 3, RIGHT, 'old', null, { talk: () => orrin() });
  warp(m, 4, 6, 'lanternrest', 4, 10, DOWN);
})();
(function () {
  const m = interior('shrine', 'HEARTH SHRINE', 10, 9, 5);
  scatter(m, 'S', [[1, 1], [2, 1], [7, 1], [8, 1]]); scatter(m, 'O', [[3, 3], [5, 3], [7, 3]]);
  npc(m, 5, 5, UP, 'elder', null, { talk: () => wren() });
  npc(m, 2, 6, RIGHT, 'girl', ['Three Bondlings sleep on the hearth stones. They only wake for someone who truly wants a partner.', 'Press START to check your DEX and see everything you have met.']);
  [1, 4, 7].forEach((id, i) => m.objs.push({ x: 3 + i * 2, y: 3, orb: id, hide: () => G.state.flags.starter, fn: () => chooseStarter(id) }));
  warp(m, 5, 8, 'lanternrest', 10, 10, DOWN);
})();
(function () {
  const m = interior('lodge', 'WARDEN LODGE', 10, 8, 5);
  rect(m, 2, 2, 5, 1, 'k'); set(m, 8, 1, 'P'); set(m, 1, 1, 'h'); rect(m, 7, 5, 2, 1, 'a');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 2, 5, RIGHT, 'boy', ['Resting at the Lodge is free for any Warden. The PC in the corner stores spare Bondlings.']);
  for (let x = 2; x <= 6; x++) m.objs.push({ x, y: 2, fn: () => nurse() });
  m.objs.push({ x: 8, y: 1, fn: () => G.pcMenu() });
  warp(m, 5, 7, 'lanternrest', 4, 5, DOWN, () => { G.state.flags.respawn = 'lodge'; return null; });
})();
(function () {
  const m = interior('post', 'TRADING POST', 8, 8, 3);
  rect(m, 3, 3, 4, 1, 'k'); rect(m, 1, 1, 1, 3, 'S'); rect(m, 6, 1, 1, 1, 'S');
  npc(m, 4, 2, DOWN, 'clerk', null, { still: true });
  npc(m, 5, 5, LEFT, 'girl', ['Wardens who clear the Mine sometimes carry ULTRA ORBS. I could never afford one!']);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 3, fn: () => G.shopMenu() });
  warp(m, 3, 7, 'lanternrest', 26, 10, DOWN);
})();
(function () {
  const m = interior('tower', 'THE GREAT LANTERN', 12, 10, 6);
  scatter(m, 'S', [[1, 1], [2, 1], [9, 1], [10, 1]]); scatter(m, 'O', [[3, 3], [6, 2], [9, 3]]); set(m, 6, 5, 'L');
  [[3, 3, 'meadow', 'MEADOW'], [6, 2, 'mine', 'MINE'], [9, 3, 'marsh', 'MARSH']].forEach(([x, y, k, label]) => m.objs.push({ x, y, pedestal: k, fn: () => pedestal(k, label) }));
  m.objs.push({ x: 6, y: 5, brazier: true, fn: () => says(flags().lanternLit ? 'The Great Lantern burns bright, warm and steady.' : 'The Great Lantern is nearly out. Three empty pedestals ring it, waiting for the Ember Shards.') });
  npc(m, 3, 6, RIGHT, 'elder', null, { talk: () => says(flags().lanternLit ? ['KEEPER LUMI: Listen... the whole vale is singing again. The Hollow Gate stands open to the southeast.'] : ['KEEPER LUMI: Three Ember Shards once fed the flame: one from the Meadow, one from the Marsh, one from the Mine.', `Shards placed: ${['meadow', 'marsh', 'mine'].filter(k => flags()['placed_' + k]).length} of 3.`]) });
  warp(m, 6, 9, 'lanternrest', 21, 5, DOWN);
})();

// ---- Sunmeadow (west): open grassland, easiest of the three shard regions ----
(function () {
  const m = newMap('sunmeadow', 'SUNMEADOW', 36, 22, 'g', { music: 'route', enc: [[10, 3, 5, 35], [16, 3, 5, 30], [18, 3, 5, 20], [12, 4, 6, 10], [7, 4, 5, 3]] });
  border(m, '#'); rect(m, 2, 10, 34, 2, 'p'); rect(m, 20, 4, 2, 6, 'p'); rect(m, 10, 12, 2, 6, 'p');
  rect(m, 6, 2, 10, 6, 'G'); rect(m, 24, 2, 10, 6, 'G'); rect(m, 3, 13, 6, 6, 'G'); rect(m, 14, 12, 8, 3, 'G'); rect(m, 24, 13, 10, 6, 'G');
  building(m, 18, 1, 5, 'R', -1); rect(m, 13, 16, 6, 4, 'w'); rect(m, 2, 3, 3, 3, 'f'); rect(m, 28, 9, 3, 1, 'f');
  scatter(m, '#', [[5, 9], [5, 8], [17, 8], [18, 8], [30, 8], [31, 8], [2, 20], [3, 20], [12, 19], [22, 19], [23, 19], [34, 12], [34, 13], [26, 12], [8, 12], [7, 12]]);
  sign(m, 19, 9, 'SUNMEADOW WINDMILL\nThe path north leads to the old mill.'); sign(m, 33, 9, 'SUNMEADOW\nLanternrest is back east.');
  m.objs.push({ x: 33, y: 3, id: 'sm_potion', item: 'Potion', ball: true }); m.objs.push({ x: 22, y: 5, id: 'sm_super', item: 'Super Orb', ball: true });
  m.objs.push({ x: 3, y: 19, id: 'sm_orb', item: 'Catch Orb', qty: 2, ball: true }); m.objs.push({ x: 19, y: 18, id: 'sm_spot', item: 'Super Potion', ball: true });
  trainer(m, 'sm_dot', 14, 8, DOWN, 'girl', { name: 'DOT', cls: 'PICNICKER', sight: 4, team: [[10, 4], [16, 4]], pre: 'Hi hi! Nice day for a battle, right?', win: 'Aww, you were too good!', post: 'The grass here is the best for picnics.', prize: 28 });
  trainer(m, 'sm_rue', 28, 14, UP, 'kid', { name: 'RUE', cls: 'KID', sight: 4, team: [[18, 4], [12, 5]], pre: 'You walked right into my meadow!', win: 'You win this round!', post: 'I will get stronger.', prize: 28 });
  trainer(m, 'sm_finn', 8, 8, DOWN, 'old', { name: 'FINN', cls: 'BIRD WATCHER', sight: 3, team: [[16, 5], [16, 5], [10, 6]], pre: 'Shh! You will scare the birds. ...Well, a battle then.', win: 'Hmph! Even my birds could not stop you.', post: 'Wingly nest in the tall grass, you know.', prize: 30 });
  trainer(m, 'sm_hazel', 3, 10, RIGHT, 'bug', { name: 'HAZEL', cls: 'MEADOW WARDEN', sight: 4, team: [[10, 7], [12, 7], [16, 8]], pre: 'I am Hazel, Warden of Sunmeadow. The MEADOW EMBER SHARD is mine to guard. Show me you can protect the vale!', win: 'You have the heart of a Warden. Take the shard, and relight that Lantern!', post: 'The Great Lantern is in the tower back in Lanternrest. Good luck!', prize: 40, shard: 'meadow' });
  warp(m, 35, 10, 'lanternrest', 1, 12, RIGHT); warp(m, 35, 11, 'lanternrest', 1, 13, RIGHT);
})();

// ---- Mirewood (east): boardwalks over a marsh. Bug and poison creatures; fisherman side quest ----
(function () {
  const m = newMap('mirewood', 'MIREWOOD MARSH', 38, 26, 'g', { music: 'route', enc: [[18, 5, 8, 25], [20, 6, 9, 22], [19, 7, 9, 15], [22, 7, 9, 15], [24, 8, 10, 8], [7, 6, 8, 3]] });
  border(m, '#'); rect(m, 4, 3, 12, 6, 'w'); rect(m, 22, 3, 13, 6, 'w'); rect(m, 5, 16, 13, 6, 'w'); rect(m, 24, 16, 11, 6, 'w');
  rect(m, 2, 9, 10, 3, 'q'); rect(m, 14, 9, 6, 3, 'q'); rect(m, 24, 9, 10, 3, 'q'); rect(m, 2, 14, 10, 2, 'q'); rect(m, 19, 14, 5, 3, 'q'); rect(m, 26, 14, 9, 2, 'q');
  rect(m, 0, 12, 37, 2, 'z'); rect(m, 31, 13, 6, 1, 'w'); rect(m, 31, 11, 6, 1, 'w');
  rect(m, 5, 22, 3, 2, 'q'); scatter(m, '#', [[3, 24], [4, 24], [20, 23], [21, 23], [30, 24], [31, 24], [13, 11], [22, 11], [36, 5], [36, 6]]);
  set(m, 36, 12, 'l'); sign(m, 3, 11, 'MIREWOOD MARSH\nStay on the boardwalk... or do not. The creatures here like it wild.');
  m.objs.push({ x: 2, y: 2, id: 'mw_heal', item: 'Full Heal', ball: true }); m.objs.push({ x: 36, y: 2, id: 'mw_sp', item: 'Super Potion', ball: true }); m.objs.push({ x: 2, y: 23, id: 'mw_rev', item: 'Revive', ball: true });
  npc(m, 9, 11, DOWN, 'old', null, { talk: () => moll(), still: true });
  trainer(m, 'mw_sage', 12, 10, DOWN, 'lass', { name: 'SAGE', cls: 'HERBALIST', sight: 3, team: [[18, 8], [20, 8]], pre: 'These reeds hold wonderful herbs... and wonderful creatures!', win: 'My herbs could not save me!', post: 'Antidotes do not grow on trees, you know.', prize: 32 });
  trainer(m, 'mw_mo', 21, 15, UP, 'bug', { name: 'MO', cls: 'BUG CATCHER', sight: 3, team: [[18, 8], [19, 9]], pre: 'Marsh bugs are the best bugs!', win: 'Mine got squashed!', post: 'I will catch a bigger one next time.', prize: 32 });
  trainer(m, 'mw_gus', 30, 10, DOWN, 'hiker', { name: 'GUS', cls: 'HERMIT', sight: 3, team: [[21, 9], [24, 9], [20, 9]], pre: 'Nobody visits me out here. Let us make it count.', win: 'Hah! A fine battle.', post: 'Come by any time. Mind the mud.', prize: 36 });
  trainer(m, 'mw_bog', 35, 12, LEFT, 'camper', { name: 'BOG', cls: 'MARSH WARDEN', sight: 5, team: [[20, 11], [22, 11], [19, 12]], pre: 'I am Bog, Warden of the Marsh. The MARSH EMBER SHARD glows in my keeping. Prove your bond is true!', win: 'Your partner trusts you. That is rare. Take the shard.', post: 'The Great Lantern needs that light. Go on.', prize: 44, shard: 'marsh' });
  warp(m, 0, 12, 'lanternrest', 28, 12, LEFT); warp(m, 0, 13, 'lanternrest', 28, 13, LEFT);
})();

// ---- The Ridge (north): a switchback to Glimmer Mine ----
(function () {
  const m = newMap('ridge', 'THE RIDGE', 26, 26, 'g', { music: 'route', banner: true, enc: [[14, 5, 8, 30], [16, 5, 7, 25], [21, 6, 9, 20], [10, 5, 7, 15], [1, 5, 6, 5]] });
  border(m, '#'); rect(m, 12, 3, 2, 23, 'p'); rect(m, 8, 0, 10, 3, 'C'); set(m, 12, 2, 'M'); set(m, 13, 2, 'M');
  rect(m, 3, 17, 6, 6, 'G'); rect(m, 16, 15, 7, 6, 'G'); rect(m, 3, 5, 6, 7, 'G'); rect(m, 16, 4, 7, 6, 'G');
  scatter(m, 'r', [[10, 8], [15, 11], [10, 20], [15, 22], [2, 14], [22, 12], [6, 15], [20, 2], [4, 3]]); scatter(m, '#', [[10, 4], [15, 6], [9, 16], [18, 13], [24, 22], [24, 23], [1, 24], [2, 24]]);
  sign(m, 11, 20, 'THE RIDGE\nGlimmer Mine lies at the top. Lantern light is dim up there.');
  m.objs.push({ x: 2, y: 2, id: 'rd_rev', item: 'Revive', ball: true }); m.objs.push({ x: 22, y: 22, id: 'rd_sp', item: 'Super Potion', ball: true });
  trainer(m, 'rd_bram', 7, 14, RIGHT, 'hiker', { name: 'BRAM', cls: 'HIKER', sight: 5, team: [[14, 8], [14, 9], [21, 9]], pre: "I've climbed every rock on this ridge. Ready for a rumble?", win: 'My rocks crumbled!', post: 'Hiking builds strong legs and strong creatures.', prize: 36 });
  trainer(m, 'rd_ash', 18, 12, LEFT, 'camper', { name: 'ASH', cls: 'CLIMBER', sight: 5, team: [[16, 8], [14, 9]], pre: 'You look like you can handle a mountain. Can you handle me?', win: 'You climbed right over me!', post: 'The Mine is just ahead. Careful in the dark.', prize: 34 });
  warp(m, 12, 25, 'lanternrest', 14, 1, DOWN); warp(m, 13, 25, 'lanternrest', 15, 1, DOWN);
  warp(m, 12, 2, 'mine', 9, 24, UP); warp(m, 13, 2, 'mine', 10, 24, UP);
})();

// ---- Glimmer Mine: crystal caves guarded by the Mine Warden ----
(function () {
  const m = newMap('mine', 'GLIMMER MINE', 20, 26, 'C', { music: 'cave', bg: 'cave', banner: true, enc: [[14, 9, 12, 25], [21, 9, 12, 20], [22, 10, 13, 20], [23, 10, 13, 15], [24, 11, 13, 10], [20, 9, 11, 10]] });
  rect(m, 4, 13, 12, 8, 'e'); rect(m, 8, 20, 4, 6, 'c'); rect(m, 10, 7, 1, 6, 'c'); rect(m, 5, 2, 10, 5, 'c');
  scatter(m, 'C', [[6, 15], [13, 15], [9, 17], [5, 19], [14, 19]]); scatter(m, 'i', [[7, 3], [13, 3], [7, 5], [13, 5], [5, 14], [15, 17], [6, 20]]);
  m.objs.push({ x: 6, y: 3, id: 'mn_rev', item: 'Revive', ball: true }); m.objs.push({ x: 14, y: 3, id: 'mn_ultra', item: 'Ultra Orb', ball: true });
  trainer(m, 'mn_kade', 10, 9, DOWN, 'kade', { name: 'KADE', cls: 'MINE WARDEN', sight: 4, team: [[22, 12], [23, 13], [24, 14]], pre: 'I am Kade, Warden of the Mine. The MINE EMBER SHARD lies in the chamber behind me. Only a true Warden may take it!', win: 'The Mine accepts you. Take the shard, and these as well.', post: 'Light the Lantern. The Wildcard will come when the vale is whole.', prize: 60, shard: 'mine', reward: ['Ultra Orb', 3] });
  warp(m, 9, 25, 'ridge', 12, 3, DOWN); warp(m, 10, 25, 'ridge', 13, 3, DOWN);
})();

// ---- Tidepool Shore (south): optional, with rare finds and a lost-lantern side quest ----
(function () {
  const m = newMap('shore', 'TIDEPOOL SHORE', 32, 20, 'y', { music: 'town', enc: [[16, 4, 7, 30], [14, 4, 7, 25], [18, 4, 6, 20], [4, 5, 7, 8], [10, 4, 6, 15]] });
  border(m, '#'); rect(m, 1, 12, 30, 7, 'w'); rect(m, 6, 11, 6, 1, 'w'); rect(m, 22, 11, 6, 1, 'w'); rect(m, 15, 0, 2, 10, 'p');
  rect(m, 3, 3, 7, 5, 'G'); rect(m, 21, 4, 8, 5, 'G'); rect(m, 11, 8, 4, 2, 'G'); rect(m, 17, 7, 4, 2, 'G');
  scatter(m, 'r', [[2, 10], [13, 11], [20, 10], [29, 10], [12, 4], [19, 3]]); scatter(m, '#', [[2, 2], [30, 2], [12, 6], [20, 6]]);
  sign(m, 14, 2, 'TIDEPOOL SHORE\nLanternrest is back north.');
  m.objs.push({ x: 28, y: 11, id: 'sh_lantern', item: 'Old Lantern', ball: true }); m.objs.push({ x: 2, y: 11, id: 'sh_orb', item: 'Catch Orb', qty: 2, ball: true }); m.objs.push({ x: 13, y: 10, id: 'sh_sp', item: 'Super Potion', ball: true });
  npc(m, 26, 7, LEFT, 'old', ['TIDEKEEPER MARO: I have watched this shore for sixty years.', 'The old Wardens said the Wildcard comes and goes as it pleases. It never showed itself to anyone who chased it.', 'Perhaps it is waiting for the Lantern to call it home.'], { still: true });
  trainer(m, 'sh_pete', 15, 11, UP, 'boy', { name: 'PETE', cls: 'SAILOR', sight: 3, team: [[4, 6], [16, 6]], pre: 'Ahoy! Shore leave means battling, matey!', win: 'Blown out of the water!', post: 'The tide always turns back.', prize: 30 });
  trainer(m, 'sh_lin', 8, 9, RIGHT, 'lass', { name: 'LIN', cls: 'SHELL COLLECTOR', sight: 5, team: [[14, 7], [18, 6], [16, 7]], pre: 'You found my secret beach! Now you have to battle me.', win: 'My shells!... I mean, nice battle.', post: 'Check the dunes. There are rare finds.', prize: 32 });
  warp(m, 15, 0, 'lanternrest', 14, 24, UP); warp(m, 16, 0, 'lanternrest', 15, 24, UP);
})();

// ---- Starlit Hollow: opens after the Lantern is relit; the Wildcard waits here ----
(function () {
  const m = newMap('hollow', 'STARLIT HOLLOW', 20, 16, 'C', { music: 'cave', bg: 'cave', banner: true });
  rect(m, 4, 3, 12, 10, 'c'); rect(m, 9, 13, 2, 3, 'c'); scatter(m, 'i', [[5, 4], [14, 4], [5, 8], [14, 8], [7, 11], [12, 11]]); scatter(m, 'l', [[7, 4], [12, 4]]);
  m.npcs.push({ x: 9, y: 4, dir: DOWN, creature: 25, still: true, id: 'joker', hide: () => G.state.flags.jokerGone, talk: () => joker() });
  warp(m, 9, 15, 'lanternrest', 26, 20, DOWN); warp(m, 10, 15, 'lanternrest', 27, 20, DOWN);
})();

// ---- Trainers --------------------------------------------------------------
function trainer(m, id, x, y, dir, style, t) {
  npc(m, x, y, dir, style, null, { trainer: Object.assign({ id, style: ST[style] }, t), still: true });
}

// ---- State -----------------------------------------------------------------
G.newState = () => ({
  name: 'HERO', style: G.PLAYER_STYLE, party: [], box: [], bag: {}, money: 3000, map: 'cottage', x: 4, y: 4, dir: UP, flags: {}, dex: {}, frames: 0, v: 2,
});
G.saveGame = function () {
  const S = G.state, w = G.world; S.map = w.mapId; S.x = w.p.x; S.y = w.p.y; S.dir = w.p.dir;
  try { localStorage.setItem('wildcard-save-v2', JSON.stringify(S)); return true; } catch (e) { return false; }
};
// Saves quietly when the player leaves the app, but only while the overworld is idle (never mid-battle or mid-dialogue).
G.autosave = function () {
  if (G.state && G.world.map && G.scene === G.world.scene && !G.world.busy && !G.ui.layers.length && G.state.flags.starter) G.saveGame();
};
G.loadGame = function () {
  try { const s = JSON.parse(localStorage.getItem('wildcard-save-v2')); return s && s.v === 2 ? s : null; } catch (e) { return null; }
};

// ---- World runtime ---------------------------------------------------------
const world = G.world = { mapId: null, map: null, p: { x: 0, y: 0, ox: 0, oy: 0, dir: 0, moving: false, prog: 0, turn: 0, alt: 0, bump: 0 }, busy: false, banner: null, bubble: null, lastDir: null };
const p = world.p;
// The lead creature trails one tile behind the player. It steps into the tile the player just left.
const fol = world.f = { x: 0, y: 0, tx: 0, ty: 0 };
function leadCreature() { const P = G.state && G.state.party; if (!P || !P.length) return null; return P[0].hp > 0 ? P[0] : (P.find(c => c.hp > 0) || null); }
function followBegin() { if (Math.abs(fol.x - p.x) + Math.abs(fol.y - p.y) > 1) { fol.x = p.x; fol.y = p.y; } fol.tx = p.x; fol.ty = p.y; }
function followEnd() { fol.x = fol.tx; fol.y = fol.ty; }
const says = async lines => { for (const l of [].concat(lines)) await G.say(l); G.closeText(); };
const flags = () => G.state.flags;

function npcsOf() { return world.map.npcs.filter(n => !(n.hide && n.hide())); }
const npcAt = (x, y) => npcsOf().find(n => (n.x === x && n.y === y) || (n.tx === x && n.ty === y));
const objAt = (x, y) => world.map.objs.find(o => o.x === x && o.y === y && !(o.hide && o.hide()) && !(o.id && flags()[o.id]));
const tileAt = (x, y) => (x < 0 || y < 0 || x >= world.map.w || y >= world.map.h) ? null : world.map.t[y][x];
function canWalk(x, y, ignoreNpc) {
  const t = tileAt(x, y); if (!t || G.TILES[t].solid) return false;
  if (!ignoreNpc && npcAt(x, y)) return false;
  const o = objAt(x, y); if (o && o.ball) return false;
  return true;
}
G.loadMap = function (id) {
  world.mapId = id; world.map = maps[id]; world.map.npcs.forEach(n => { n.ox0 = n.ox0 === undefined ? n.x : n.ox0; n.oy0 = n.oy0 === undefined ? n.y : n.oy0; n.ox = 0; n.oy = 0; n.frame = 0; n.timer = 60 + G.rand(120); delete n.tx; delete n.ty; });
  if (world.map.outdoor || world.map.banner) world.banner = { text: world.map.name, t: 0 };
  G.audio.music(world.map.music);
};
G.placePlayer = (x, y, dir) => {
  Object.assign(p, { x, y, dir, ox: 0, oy: 0, moving: false, prog: 0, turn: 0 });
  const [bx, by] = [x - VEC[dir][0], y - VEC[dir][1]], behind = canWalk(bx, by, true) && !tileWarp(bx, by);
  fol.x = fol.tx = behind ? bx : x; fol.y = fol.ty = behind ? by : y;
};
const tileWarp = (x, y) => world.map.warps.some(w => w.x === x && w.y === y);

async function stepEntity(e, d, speed) {
  speed = speed || 1; e.dir = d; e.moving = true; const [dx, dy] = VEC[d];
  if (e === p) followBegin();
  e.tx = e.x + dx; e.ty = e.y + dy;
  for (let prog = speed; prog <= 16; prog += speed) { e.ox = dx * prog; e.oy = dy * prog; e.frame = prog < 8 ? (e.alt ? 1 : 2) : 0; await G.nextFrame(); }
  e.x = e.tx; e.y = e.ty; delete e.tx; delete e.ty; e.ox = e.oy = 0; e.moving = false; e.alt = !e.alt; e.frame = 0;
  if (e === p) followEnd();
}
function run(fn) {
  if (world.busy) return; world.busy = true;
  fn().catch(e => console.error(e)).finally(() => { world.busy = false; G.closeText(); });
}
G.runWorld = run;

async function warpTo(id, x, y, dir) {
  G.audio.sfx('warp'); await G.fadeTo(1, 10, '#000');
  G.loadMap(id); G.placePlayer(x, y, dir); await G.wait(6); await G.fadeTo(0, 10);
}

// ---- Interactions ----------------------------------------------------------
async function talkTo(n) {
  if (n.trainer) { const t = n.trainer; n.dir = OPP[p.dir]; if (!flags()[t.id]) { await trainerBattle(n); } else await says(t.post); return; }
  if (!n.still || n.talk) n.dir = OPP[p.dir];
  if (n.talk) await n.talk(n); else await says(n.lines);
}
async function interact() {
  const [dx, dy] = VEC[p.dir], tx = p.x + dx, ty = p.y + dy;
  const o = objAt(tx, ty);
  if (o) {
    if (o.item) { flags()[o.id] = true; G.state.bag[o.item] = (G.state.bag[o.item] || 0) + (o.qty || 1); G.audio.sfx('levelup'); await says(`${G.state.name} found a ${o.item.toUpperCase()}!`); return; }
    await o.fn(); return;
  }
  const n = npcAt(tx, ty); if (n) { await talkTo(n); return; }
  const lead = leadCreature();
  if (lead && tx === fol.x && ty === fol.y) await partnerTalk(lead);
}
const SHARDS = [['meadow', 'MEADOW'], ['marsh', 'MARSH'], ['mine', 'MINE']];
const shardCount = () => SHARDS.filter(([k]) => flags()['shard_' + k]).length;
function questText() {
  const f = flags();
  if (!f.starter) return ['LANTERNREST NOTICE BOARD\nThe Great Lantern is failing. Wardens needed! Speak to Elder Wren at the Hearth Shrine.'];
  if (f.lanternLit) return ['LANTERNREST NOTICE BOARD\nThe Great Lantern burns again! The Hollow Gate in the southeast stands open.'];
  const line = SHARDS.map(([k, n]) => `${n}: ${f['placed_' + k] ? 'placed' : f['shard_' + k] ? 'in your bag' : 'missing'}`).join('\n');
  return ['LANTERNREST NOTICE BOARD\nRelight the Great Lantern with three Ember Shards.', line, 'Meadow lies west, Marsh east, the Mine north up the Ridge.'];
}
async function partnerTalk(c) {
  const nm = G.name(c), r = c.hp / c.stats.hp;
  const lines = r < .35 ? [`${nm} looks tired, but it stays close to you.`, `${nm} leans against your leg and sighs.`] :
    c.status ? [`${nm} does not feel well, but it gives you a brave look.`] :
    [`${nm} looks up at you happily!`, `${nm} bounces around you!`, `${nm} sniffs the air and stays by your side.`, `${nm} nudges your hand.`, `${nm} is keeping a sharp eye out for wild creatures.`];
  G.audio.sfx('select'); await says(lines[G.rand(lines.length)]);
}
async function orrin() {
  const f = flags();
  if (!f.orrinTold) {
    f.orrinTold = true;
    await says(['ORRIN: Up at last! Lantern Night is almost here, and it has been a strange season.', 'The Great Lantern in the tower has been dimming for weeks. They say the Wildcard, the creature that guards the vale, has vanished.', 'Elder Wren is waiting at the Hearth Shrine, just up the lane. Take this POTION with you.']);
    G.state.bag.Potion = (G.state.bag.Potion || 0) + 1; G.audio.sfx('levelup'); await says(`${G.state.name} received a POTION!`);
  } else if (G.state.party.length && G.state.party.some(c => c.hp < c.stats.hp || c.status)) {
    await G.say('ORRIN: You look worn out. Sit a spell, and let your partners rest too.'); G.closeText();
    await G.fadeTo(1, 16, '#000'); G.state.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(30); await G.fadeTo(0, 16);
    await says('ORRIN: There. Fresh as morning. Mind the roads.');
  } else await says(f.lanternLit ? 'ORRIN: The Lantern is lit! I have not seen it that bright since I was a boy.' : 'ORRIN: Walk the roads in any order you like. A Warden learns from every one.');
}
async function wren() {
  const f = flags(), S = G.state;
  if (!f.starter) await says(['ELDER WREN: Welcome, little Warden. The Great Lantern has dimmed ever since the Wildcard slipped away.', 'Three Ember Shards once fed its flame. They were hidden with the Wardens of the Meadow, the Marsh and the Mine.', 'But you cannot walk the wild roads alone. Three Bondlings sleep on the hearth stones. Wake one, and it will be your partner.']);
  else if (!f.wrenTips) {
    f.wrenTips = true;
    await says(['ELDER WREN: It chose you. I knew it would.', 'To catch wild creatures, weaken them in battle and throw an ORB from your BAG. Sleep and poison help too.', 'Win a Warden\'s respect and they will give you their Ember Shard. Bring all three to the Great Lantern in the tower.', 'The roads are open: west to the Meadow, east to the Marsh, north up the Ridge to the Mine. Choose your own path.']);
    S.bag['Catch Orb'] = (S.bag['Catch Orb'] || 0) + 5; G.audio.sfx('levelup'); await says(`${S.name} received 5 CATCH ORBs!`);
  } else if (f.jokerCaught) await says(['ELDER WREN: You caught the WILDCARD itself?! And the Lantern burns...', 'You are no apprentice any more. There are still creatures out there you have not met. Check your DEX!']);
  else if (f.lanternLit) await says(['ELDER WREN: The Lantern is lit, and the vale is calm. But the Wildcard has not returned...', 'Go through the Hollow Gate in the southeast. I think it is waiting for you.']);
  else await says([`ELDER WREN: You carry ${shardCount()} of 3 Ember Shards.`, 'The Great Lantern is in the tower, north of the village road. Place the shards on its pedestals.']);
}
async function pedestal(k, label) {
  const f = flags();
  if (f.lanternLit) { await says(`The ${label} pedestal glows steadily.`); return; }
  if (f['placed_' + k]) { await says(`The ${label} Ember Shard glows softly on its pedestal.`); return; }
  if (!f['shard_' + k]) { await says(`An empty pedestal. A shard from the ${label.toLowerCase()} belongs here.`); return; }
  f['placed_' + k] = true; G.audio.sfx('levelup');
  await says(`${G.state.name} set the ${label} EMBER SHARD on its pedestal. It begins to glow!`);
  if (SHARDS.every(([key]) => f['placed_' + key])) {
    G.closeText(); await G.fadeTo(1, 16, '#ffffff'); G.audio.sfx('heal'); await G.wait(50); f.lanternLit = true; await G.fadeTo(0, 24);
    await says(['The three shards blaze together. The Great Lantern roars to life!', 'Across the vale, every wild creature lifts its head and howls with joy.', 'Far to the southeast, a sealed archway begins to shine: the Hollow Gate has opened.']);
  }
}
async function moll() {
  const f = flags(), S = G.state;
  if (f.mollDone) { await says('FISHER MOLL: That old lantern shines on my dock every evening now. Thank you again!'); return; }
  if (S.bag['Old Lantern']) {
    await says(['FISHER MOLL: My lantern! You found it! I lost it in the dunes years ago.']);
    delete S.bag['Old Lantern']; f.mollDone = true; S.bag['Super Orb'] = (S.bag['Super Orb'] || 0) + 3; S.bag['Full Heal'] = (S.bag['Full Heal'] || 0) + 1; G.audio.sfx('levelup');
    await says(`${S.name} received 3 SUPER ORBs and a FULL HEAL!`); return;
  }
  await says(['FISHER MOLL: I lost my old brass lantern somewhere along the Tidepool Shore, south of Lanternrest.', 'If you ever find it, I will make it worth your while.']);
}
async function chooseStarter(id) {
  const S = G.state, sp = G.SPECIES[id];
  const l = { draw(ctx) { G.frame(ctx, 70, 8, 100, 90, 'light'); ctx.drawImage(G.creatureSprite(id), 88, 12, 64, 64); G.text(ctx, sp.name.toUpperCase(), 120, 76, { align: 'center' }); G.typeBadge(ctx, sp.types[0], 103, 87); } };
  G.ui.layers.push(l);
  await G.say(`A sleeping ${sp.types[0].toUpperCase()}-type Bondling, ${sp.name.toUpperCase()}.\nWake it and take it as your partner?`, { auto: 1 });
  const yes = await G.yesNo();
  G.ui.layers.splice(G.ui.layers.indexOf(l), 1);
  if (!yes) { G.closeText(); return; }
  S.party.push(G.makeCreature(id, 5)); S.flags.starter = true; S.dex[id] = 2; G.audio.sfx('caught');
  await says([`The hearth stone cracks open, and ${sp.name.toUpperCase()} wakes up. It nuzzles ${S.name}.`, 'ELDER WREN: It chose you. Come and talk to me when you are ready.']);
}
async function nurse() {
  const S = G.state;
  await G.say('Welcome to the WARDEN LODGE!\nWe can restore your team to full health. Shall we?', { auto: 1 });
  if (!(await G.yesNo())) { await says('We hope to see you again!'); return; }
  G.closeText(); await G.say('OK, I\'ll take your creatures for a moment.', { auto: 20 }); G.closeText();
  await G.fadeTo(1, 12, '#ffffff'); S.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(70); await G.fadeTo(0, 12);
  flags().respawn = 'lodge';
  await says(['Thank you for waiting.', 'Your partners are fully rested! We hope to see you again!']);
}
async function joker() {
  await says(['...', 'In the glow of the crystals, a creature stirs. Its form seems to shift every time you blink.', 'The WILDCARD! It has been waiting for the Lantern to call it home.']);
  const wild = G.makeCreature(25, 20);
  const r = await runBattle({ wild, bg: 'cave' });
  if (r === 'caught') { flags().jokerCaught = flags().jokerGone = true; G.audio.music('town'); await says(['You caught the WILDCARD!', 'The vale is safe, the Lantern is bright, and the Wildcard has chosen to walk beside a Warden.', 'Congratulations, Warden! Keep exploring and fill your DEX.']); }
  else if (r === 'win') flags().jokerGone = true;
}

// ---- Battles from the overworld -------------------------------------------
async function afterBattle(r) {
  if (r === 'lose') {
    const S = G.state; S.money = Math.floor(S.money / 2); S.party.forEach(G.healFull);
    const [id, x, y] = flags().respawn === 'lodge' ? ['lodge', 5, 6] : ['cottage', 4, 5];
    G.loadMap(id); G.placePlayer(x, y, UP); G.ui.fade.a = 1; await G.wait(10);
    await G.fadeTo(0, 14);
    await says('You scurried back to safety, and your creatures were restored. You dropped some money in the panic...');
  } else {
    G.audio.music(world.map.music); await G.runEvolutions(); G.audio.music(world.map.music);
    await G.fadeTo(0, 14);
  }
}
async function runBattle(opts) { const r = await G.startBattle(opts); await afterBattle(r); return r; }
async function trainerBattle(n) {
  const t = n.trainer;
  await says(t.pre);
  const r = await runBattle({ trainer: { name: t.name, cls: t.cls, style: t.style, win: t.win, prize: t.prize, team: t.team.map(([id, l]) => G.makeCreature(id, l)) }, bg: world.map.bg });
  if (r === 'win') {
    flags()[t.id] = true;
    if (t.shard) { flags()['shard_' + t.shard] = true; G.audio.sfx('levelup'); await says(`${G.state.name} received the ${t.shard.toUpperCase()} EMBER SHARD!`); }
    if (t.reward) { G.state.bag[t.reward[0]] = (G.state.bag[t.reward[0]] || 0) + t.reward[1]; G.audio.sfx('levelup'); await says(`${G.state.name} received ${t.reward[1]} ${t.reward[0].toUpperCase()}s!`); }
  }
}
async function spotted(n) {
  const t = n.trainer; world.bubble = { n, t: 0 }; G.audio.sfx('exclaim'); await G.wait(40); world.bubble = null;
  for (let guard = 0; guard < 12; guard++) {
    const dx = p.x - n.x, dy = p.y - n.y; if (Math.abs(dx) + Math.abs(dy) <= 1) break;
    await stepEntity(n, n.dir, 1);
  }
  n.dir = p.x > n.x ? RIGHT : p.x < n.x ? LEFT : p.y > n.y ? DOWN : UP;
  await trainerBattle(n);
}
function sees(n) {
  const t = n.trainer; if (flags()[t.id] || (n.hide && n.hide())) return false;
  const [dx, dy] = VEC[n.dir]; const px = p.x - n.x, py = p.y - n.y;
  const dist = dx ? px * dx : py * dy, off = dx ? py : px;
  if (off !== 0 || dist < 1 || dist > t.sight) return false;
  for (let i = 1; i < dist; i++) if (!canWalk(n.x + dx * i, n.y + dy * i, true)) return false;
  return true;
}
function pickWild() {
  const tab = world.map.enc, total = tab.reduce((a, e) => a + e[3], 0); let r = G.rand(total), e = tab[0];
  for (const x of tab) { if ((r -= x[3]) < 0) { e = x; break; } }
  return G.makeCreature(e[0], e[1] + G.rand(e[2] - e[1] + 1));
}

// ---- Per-frame update ------------------------------------------------------
function afterStep() {
  const S = G.state, m = world.map;
  const w = m.warps.find(w => w.x === p.x && w.y === p.y);
  if (w) {
    const block = w.need && w.need();
    if (block) run(async () => { await says(block); await stepEntity(p, OPP[p.dir], 1); });
    else run(() => warpTo(w.to, w.tx, w.ty, w.dir));
    return;
  }
  for (const n of npcsOf()) if (n.trainer && sees(n)) { run(() => spotted(n)); return; }
  if (G.TILES[tileAt(p.x, p.y)].enc && m.enc && Math.random() < .15) run(async () => { await runBattle({ wild: pickWild(), bg: m.bg }); });
}
function heldDir() {
  const h = G.input.held, order = ['down', 'up', 'left', 'right'];
  for (const k of order) if (G.input.pressed[k]) world.lastDir = k;
  if (world.lastDir && h[world.lastDir]) return order.indexOf(world.lastDir);
  const k = order.find(k => h[k]); return k ? order.indexOf(k) : -1;
}
function update() {
  G.state.frames++;
  if (world.banner && ++world.banner.t > 120) world.banner = null;
  if (world.busy) return;
  const inp = G.input;
  if (p.moving) {
    const sp = inp.held.b ? 2 : 1; p.prog += sp; const [dx, dy] = VEC[p.dir];
    p.ox = dx * Math.min(16, p.prog); p.oy = dy * Math.min(16, p.prog);
    if (p.prog >= 16) { p.x += dx; p.y += dy; p.ox = p.oy = 0; p.moving = false; p.alt ^= 1; followEnd(); afterStep(); }
    // NPC wandering
  } else {
    if (inp.pressed.start) { run(async () => { G.audio.sfx('select'); await G.startMenu(); }); return; }
    if (inp.pressed.a) { run(interact); return; }
    const d = heldDir();
    if (d >= 0) {
      if (p.dir !== d) { p.dir = d; p.turn = 5; }
      else if (p.turn > 0) p.turn--;
      else {
        const [dx, dy] = VEC[d];
        if (canWalk(p.x + dx, p.y + dy)) { p.moving = true; p.prog = 0; followBegin(); }
        else if (p.bump++ % 20 === 0) G.audio.sfx('bump');
      }
    } else { p.turn = 0; p.bump = 0; }
  }
  for (const n of npcsOf()) {
    if (n.still || n.moving) continue;
    if (--n.timer <= 0) {
      n.timer = 80 + G.rand(160);
      const d = G.rand(4);
      if (n.roam) {
        const [dx, dy] = VEC[d], nx = n.x + dx, ny = n.y + dy;
        if (Math.abs(nx - n.ox0) <= n.roam && Math.abs(ny - n.oy0) <= n.roam && canWalk(nx, ny) && !(nx === fol.x && ny === fol.y) && !(nx === p.x && ny === p.y) && !(p.moving && nx === p.x + VEC[p.dir][0] && ny === p.y + VEC[p.dir][1])) { stepEntity(n, d, 1); continue; }
      }
      n.dir = d;
    }
  }
}

// ---- Drawing ---------------------------------------------------------------
function drawEntity(ctx, e, sprite, cx, cy) {
  const x = e.x * 16 + e.ox - cx, y = e.y * 16 + e.oy - cy - 4;
  ctx.drawImage(sprite, Math.round(x), Math.round(y));
}
function draw(ctx) {
  const m = world.map, S = G.state;
  const mw = m.w * 16, mh = m.h * 16;
  const pxp = p.x * 16 + p.ox + 8, pyp = p.y * 16 + p.oy + 8;
  let cx = mw <= G.W ? -(G.W - mw) / 2 : Math.max(0, Math.min(mw - G.W, pxp - G.W / 2));
  let cy = mh <= G.H ? -(G.H - mh) / 2 : Math.max(0, Math.min(mh - G.H, pyp - G.H / 2));
  cx = Math.round(cx); cy = Math.round(cy);
  const fr = (G.frameNo >> 5) & 1;
  const x0 = Math.max(0, Math.floor(cx / 16)), x1 = Math.min(m.w - 1, Math.floor((cx + G.W) / 16)), y0 = Math.max(0, Math.floor(cy / 16)), y1 = Math.min(m.h - 1, Math.floor((cy + G.H) / 16));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.drawImage(G.tile(m.t[y][x], fr), x * 16 - cx, y * 16 - cy);
  // objects (item balls, starter orbs)
  for (const o of m.objs) {
    if ((o.hide && o.hide()) || (o.id && flags()[o.id])) continue;
    const x = o.x * 16 - cx, y = o.y * 16 - cy;
    if (o.orb) { ctx.fillStyle = G.TYPE_COL[G.SPECIES[o.orb].types[0]]; ctx.beginPath(); ctx.arc(x + 8, y + 7, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y + 7, 8, 1); ctx.beginPath(); ctx.arc(x + 8, y + 7, 1.8, 0, 7); ctx.fill(); }
    if (o.pedestal) { const on = flags()['placed_' + o.pedestal]; ctx.fillStyle = on ? '#ffb040' : '#4a4a5a'; ctx.beginPath(); ctx.moveTo(x + 8, y + 1); ctx.lineTo(x + 12, y + 5); ctx.lineTo(x + 8, y + 9); ctx.lineTo(x + 4, y + 5); ctx.fill(); if (on) { ctx.fillStyle = 'rgba(255,220,120,.35)'; ctx.beginPath(); ctx.arc(x + 8, y + 5, 8 + Math.sin(G.frameNo / 14), 0, 7); ctx.fill(); } }
    if (o.brazier) { const lit = flags().lanternLit, n = shardCount(), fl = lit ? 7 : 1 + n * 1.5; ctx.fillStyle = lit ? 'rgba(255,200,90,.3)' : 'rgba(255,140,60,.15)'; ctx.beginPath(); ctx.arc(x + 8, y + 3, fl * 2.2, 0, 7); ctx.fill(); ctx.fillStyle = lit ? '#ffd860' : '#f06a30'; ctx.beginPath(); ctx.ellipse(x + 8, y + 5 - fl / 2 + Math.sin(G.frameNo / 6), 2 + fl / 3, fl, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff4b0'; ctx.beginPath(); ctx.ellipse(x + 8, y + 6 - fl / 3, 1 + fl / 6, fl / 2, 0, 0, 7); ctx.fill(); }
    if (o.ball) { ctx.fillStyle = '#383840'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#f04848'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 3.6, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 3.6, 0, Math.PI); ctx.fill(); }
  }
  // entities sorted by y
  const lead = leadCreature();
  const prog = Math.max(Math.abs(p.ox), Math.abs(p.oy)), fx = fol.x * 16 + (fol.tx - fol.x) * prog, fy = fol.y * 16 + (fol.ty - fol.y) * prog;
  const ents = npcsOf().map(n => ({ n, y: n.y * 16 + n.oy })).concat([{ n: null, y: p.y * 16 + p.oy }]);
  if (lead) ents.push({ n: 'pet', y: fy - .5 });
  ents.sort((a, b) => a.y - b.y);
  for (const { n } of ents) {
    if (n === 'pet') {
      const st = G.SPECIES[lead.id].look.stage || 1, size = 18 + st * 3, moving = prog > 0 && prog < 16;
      const hop = moving ? Math.abs(Math.sin(prog / 16 * Math.PI * 2)) * 2 : (Math.sin(G.frameNo / 22) > .85 ? 1 : 0);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(Math.round(fx - cx + 8), Math.round(fy - cy + 14), size / 3, 2, 0, 0, 7); ctx.fill();
      ctx.drawImage(G.creatureSprite(lead.id), 0, 0, 32, 32, Math.round(fx - cx + 8 - size / 2), Math.round(fy - cy + 17 - size * 31 / 32 - hop), size, size);
    } else if (!n) {
      const f = p.moving ? (p.prog % 16 < 8 ? (p.alt ? 1 : 2) : 0) : 0;
      drawEntity(ctx, p, G.charSprite(S.style)[p.dir][f], cx, cy);
      if (tileAt(p.x, p.y) === 'G' || (p.moving && tileAt(p.x + VEC[p.dir][0], p.y + VEC[p.dir][1]) === 'G' && p.prog > 8)) { const gx = p.x * 16 + p.ox - cx, gy = p.y * 16 + p.oy - cy; ctx.drawImage(G.tile('G'), 0, 8, 16, 8, gx, gy + 8, 16, 8); }
    } else if (n.creature) {
      const bob = Math.sin(G.frameNo / 20) * 1.5; ctx.drawImage(G.creatureSprite(n.creature), 0, 0, 32, 32, n.x * 16 - cx - 6, n.y * 16 - cy - 14 + bob, 28, 28);
    } else drawEntity(ctx, n, G.charSprite(n.style)[n.dir][n.moving ? n.frame : 0], cx, cy);
  }
  if (world.bubble) { const n = world.bubble.n; ctx.fillStyle = '#fff'; ctx.fillRect(n.x * 16 - cx + 4, n.y * 16 - cy - 18, 8, 12); G.text(ctx, '!', n.x * 16 - cx + 8, n.y * 16 - cy - 17, { align: 'center', color: '#d83030', shadow: false, font: 'bold 10px "Courier New", monospace' }); }
  if (world.banner) {
    const t = world.banner.t, y = t < 10 ? -20 + t * 2 : t > 105 ? -(t - 105) * 2 : 0;
    G.frame(ctx, 4, 3 + y, 8 + G.textW(ctx, world.banner.text) + 6, 17, 'dark'); G.text(ctx, world.banner.text, 11, 8 + y, { color: '#fff', shadow: '#102030' });
  }
}
world.scene = { update, draw };
})();
