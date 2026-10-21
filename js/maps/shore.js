// Tidepool Shore (south) and the Starlit Hollow.
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

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
  m.npcs.push({ x: 9, y: 4, dir: DOWN, creature: 25, still: true, id: 'joker', hide: () => G.state.flags.jokerGone, talk: () => G.story.joker() });
  warp(m, 9, 15, 'lanternrest', 26, 20, DOWN); warp(m, 10, 15, 'lanternrest', 27, 20, DOWN);
})();
})();
