// Mirewood Marsh (east region).
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

// ---- Mirewood (east): boardwalks over a marsh. Bug and poison creatures; fisherman side quest ----
(function () {
  const m = newMap('mirewood', 'MIREWOOD MARSH', 38, 26, 'g', { music: 'route', enc: [[18, 5, 8, 25], [20, 6, 9, 22], [19, 7, 9, 15], [22, 7, 9, 15], [24, 8, 10, 8], [7, 6, 8, 3]] });
  border(m, '#'); rect(m, 4, 3, 12, 6, 'w'); rect(m, 22, 3, 13, 6, 'w'); rect(m, 5, 16, 13, 6, 'w'); rect(m, 24, 16, 11, 6, 'w');
  rect(m, 2, 9, 10, 3, 'q'); rect(m, 14, 9, 6, 3, 'q'); rect(m, 24, 9, 10, 3, 'q'); rect(m, 2, 14, 10, 2, 'q'); rect(m, 19, 14, 5, 3, 'q'); rect(m, 26, 14, 9, 2, 'q');
  rect(m, 0, 12, 37, 2, 'z'); rect(m, 31, 13, 6, 1, 'w'); rect(m, 31, 11, 6, 1, 'w');
  rect(m, 5, 22, 3, 2, 'q'); scatter(m, '#', [[3, 24], [4, 24], [20, 23], [21, 23], [30, 24], [31, 24], [13, 11], [22, 11], [36, 5], [36, 6]]);
  set(m, 36, 12, 'l'); sign(m, 3, 11, 'MIREWOOD MARSH\nStay on the boardwalk... or do not. The creatures here like it wild.');
  m.objs.push({ x: 2, y: 2, id: 'mw_heal', item: 'Full Heal', ball: true }); m.objs.push({ x: 36, y: 2, id: 'mw_sp', item: 'Super Potion', ball: true }); m.objs.push({ x: 2, y: 23, id: 'mw_rev', item: 'Revive', ball: true });
  npc(m, 9, 11, DOWN, 'old', null, { talk: () => G.story.moll(), still: true });
  trainer(m, 'mw_sage', 12, 10, DOWN, 'lass', { name: 'SAGE', cls: 'HERBALIST', sight: 3, team: [[18, 8], [20, 8]], pre: 'These reeds hold wonderful herbs... and wonderful creatures!', win: 'My herbs could not save me!', post: 'Antidotes do not grow on trees, you know.', prize: 32 });
  trainer(m, 'mw_mo', 21, 15, UP, 'bug', { name: 'MO', cls: 'BUG CATCHER', sight: 3, team: [[18, 8], [19, 9]], pre: 'Marsh bugs are the best bugs!', win: 'Mine got squashed!', post: 'I will catch a bigger one next time.', prize: 32 });
  trainer(m, 'mw_gus', 30, 10, DOWN, 'hiker', { name: 'GUS', cls: 'HERMIT', sight: 3, team: [[21, 9], [24, 9], [20, 9]], pre: 'Nobody visits me out here. Let us make it count.', win: 'Hah! A fine battle.', post: 'Come by any time. Mind the mud.', prize: 36 });
  trainer(m, 'mw_bog', 35, 12, LEFT, 'camper', { name: 'BOG', cls: 'MARSH WARDEN', sight: 5, team: [[20, 11], [22, 11], [19, 12]], pre: 'I am Bog, Warden of the Marsh. The MARSH EMBER SHARD glows in my keeping. Prove your bond is true!', win: 'Your partner trusts you. That is rare. Take the shard.', post: 'The Great Lantern needs that light. Go on.', prize: 44, shard: 'marsh' });
  warp(m, 0, 12, 'lanternrest', 28, 12, LEFT); warp(m, 0, 13, 'lanternrest', 28, 13, LEFT);
})();
})();
