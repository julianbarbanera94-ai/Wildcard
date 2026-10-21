// The Ridge (north) and Glimmer Mine.
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

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
})();
