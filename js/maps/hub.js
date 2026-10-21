// Lanternrest (hub village) and its interiors: cottage, shrine, lodge, post, tower.
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

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
  set(m, 13, 11, 's'); m.objs.push({ x: 13, y: 11, fn: () => G.story.says(G.story.questText()) });
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
  npc(m, 3, 3, RIGHT, 'old', null, { talk: () => G.story.orrin() });
  warp(m, 4, 6, 'lanternrest', 4, 10, DOWN);
})();
(function () {
  const m = interior('shrine', 'HEARTH SHRINE', 10, 9, 5);
  scatter(m, 'S', [[1, 1], [2, 1], [7, 1], [8, 1]]); scatter(m, 'O', [[3, 3], [5, 3], [7, 3]]);
  npc(m, 5, 5, UP, 'elder', null, { talk: () => G.story.wren() });
  npc(m, 2, 6, RIGHT, 'girl', ['Three Bondlings sleep on the hearth stones. They only wake for someone who truly wants a partner.', 'Press START to check your DEX and see everything you have met.']);
  [1, 4, 7].forEach((id, i) => m.objs.push({ x: 3 + i * 2, y: 3, orb: id, hide: () => G.state.flags.starter, fn: () => G.story.chooseStarter(id) }));
  warp(m, 5, 8, 'lanternrest', 10, 10, DOWN);
})();
(function () {
  const m = interior('lodge', 'WARDEN LODGE', 10, 8, 5);
  rect(m, 2, 2, 5, 1, 'k'); set(m, 8, 1, 'P'); set(m, 1, 1, 'h'); rect(m, 7, 5, 2, 1, 'a');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 2, 5, RIGHT, 'boy', ['Resting at the Lodge is free for any Warden. The PC in the corner stores spare Bondlings.']);
  for (let x = 2; x <= 6; x++) m.objs.push({ x, y: 2, fn: () => G.story.nurse() });
  m.objs.push({ x: 8, y: 1, fn: () => G.pcMenu() });
  warp(m, 5, 7, 'lanternrest', 4, 5, DOWN);
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
  [[3, 3, 'meadow', 'MEADOW'], [6, 2, 'mine', 'MINE'], [9, 3, 'marsh', 'MARSH']].forEach(([x, y, k, label]) => m.objs.push({ x, y, pedestal: k, fn: () => G.story.pedestal(k, label) }));
  m.objs.push({ x: 6, y: 5, brazier: true, fn: () => G.story.says(G.state.flags.lanternLit ? 'The Great Lantern burns bright, warm and steady.' : 'The Great Lantern is nearly out. Three empty pedestals ring it, waiting for the Ember Shards.') });
  npc(m, 3, 6, RIGHT, 'elder', null, { talk: () => G.story.says(G.state.flags.lanternLit ? ['KEEPER LUMI: Listen... the whole vale is singing again. The Hollow Gate stands open to the southeast.'] : ['KEEPER LUMI: Three Ember Shards once fed the flame: one from the Meadow, one from the Marsh, one from the Mine.', `Shards placed: ${['meadow', 'marsh', 'mine'].filter(k => G.state.flags['placed_' + k]).length} of 3.`]) });
  warp(m, 6, 9, 'lanternrest', 21, 5, DOWN);
})();
})();
