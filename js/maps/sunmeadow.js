// Sunmeadow (west region).
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

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
})();
