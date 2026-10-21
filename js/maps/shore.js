// Tidepool Shore (south) and the Starlit Hollow.
(function () {
const G = globalThis.G;
const { newMap, set, rect, border, scatter, building, interior, warp, npc, sign, trainer, DOWN, UP, LEFT, RIGHT } = G.mk;

// Small deterministic helpers for organic shapes.
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
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
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id, item: name, ball: true }, qty ? { qty } : {}));

// ---- Tidepool Shore (south): optional, with rare finds and a lost-lantern side quest ----
(function () {
  const m = newMap('shore', 'TIDEPOOL SHORE', 64, 40, 'y', { music: 'town', enc: [[16, 4, 7, 30], [14, 4, 7, 25], [18, 4, 6, 20], [4, 5, 7, 8], [10, 4, 6, 15]] });
  // The sea fills the south; the shoreline wobbles.
  for (let x = 0; x < m.w; x++) { const sy = 27 + Math.round(Math.sin(x / 5) * 1.5 + Math.sin(x / 2.3) * .7); rect(m, x, sy, 1, m.h - sy, 'w'); }
  // A grassy strip and woods along the north edge, rocky cliffs down the sides.
  for (let y = 0; y < 27; y++) for (let x = 0; x < m.w; x++) {
    const e = Math.min(x, y, m.w - 1 - x);
    if (y <= 4 + Math.round(Math.sin(x / 4.5) * .8) && m.t[y][x] === 'y') set(m, x, y, 'g');
    if (e === 0 || (e === 1 && hash(x, y) < .5)) set(m, x, y, y < 8 ? (hash(y, x) < .4 ? 'n' : '#') : (e === 0 ? 'E' : 'r'));
  }
  for (let y = 27; y < m.h; y++) { if (hash(0, y) < .6) set(m, 0, y, 'r'); if (hash(63, y) < .6) set(m, 63, y, 'r'); }

  // Dunes of tall grass.
  blob(m, 12, 9, 7, 3, 'G', ['y', 'g']);
  blob(m, 50, 8, 8, 3, 'G', ['y', 'g']);
  blob(m, 24, 17, 5, 2.4, 'G', ['y']);
  blob(m, 56, 19, 4, 2.2, 'G', ['y']);
  scatter(m, 'u', [[5, 6], [6, 6], [19, 7], [42, 6], [58, 6], [59, 6], [34, 6], [27, 6]]);

  // Rocky outcrops.
  scatter(m, 'r', [[16, 13], [17, 13], [16, 14], [44, 12], [45, 12], [45, 13], [3, 23], [4, 24], [34, 24], [35, 25], [27, 13]]);
  scatter(m, 'E', [[17, 14], [46, 13], [46, 12], [53, 14]]);
  scatter(m, 'r', [[52, 15], [53, 15], [54, 15], [52, 14], [60, 12], [61, 13], [8, 15], [33, 11]]); scatter(m, '#', [[35, 9], [40, 10], [21, 11]]);

  // Tidepools: little rock-ringed pools on the beach.
  const pool = (x, y, w, h) => { rect(m, x, y, w, h, 'w'); for (let i = -1; i <= w; i++) for (const j of [-1, h]) if (hash(x + i, y + j) < .35) set(m, x + i, y + j, 'r'); };
  pool(11, 21, 3, 2); pool(16, 23, 2, 2); pool(28, 21, 2, 1); pool(46, 22, 3, 2); pool(38, 23, 3, 1);

  // The road down from Lanternrest, fading into a sandy track.
  path(m, [[30, 0], [30, 9], [26, 9], [26, 15], [30, 15], [30, 20]]);
  scatter(m, 'p', [[29, 21], [31, 21], [30, 22]]);

  // A wooden pier out into the sea, with a boardwalk spur.
  rect(m, 20, 24, 2, 11, 'z'); rect(m, 22, 32, 4, 2, 'z');
  scatter(m, 'l', [[19, 24], [22, 24]]); scatter(m, 'd', [[9, 24], [38, 25], [25, 12], [57, 13]]);

  // The lighthouse on a rocky point in the south-east, with a cliff ridge behind it.
  blob(m, 53, 29, 6, 4, 'y', null, .1);
  rect(m, 49, 25, 9, 1, 'y'); rect(m, 49, 26, 9, 2, 'y');
  rect(m, 50, 22, 7, 2, 'y'); rect(m, 52, 23, 3, 2, 'R'); rect(m, 52, 25, 3, 3, 'W'); set(m, 53, 26, 'N'); set(m, 53, 22, 'l');   // a tall white tower
  scatter(m, 'r', [[57, 31], [58, 30], [48, 32], [49, 32], [56, 33], [59, 28]]);
  scatter(m, 'E', [[48, 27], [48, 28], [58, 26], [58, 27]]);

  // A winding sandbar out to a rocky islet in the south-west: the Old Lantern washed up there.
  path(m, [[8, 26], [8, 29], [12, 29], [12, 32], [7, 32], [7, 34]], 'y', 1);
  blob(m, 5, 35, 3, 2, 'y', null, 0);
  scatter(m, 'r', [[2, 34], [3, 37], [7, 37], [8, 35], [4, 33]]);

  // Open sand left flat for building: centre-east (10x8 at 36..45, 14..21) and west (8x7 at 2..9, 13..19).
  rect(m, 36, 14, 10, 8, 'y'); rect(m, 2, 13, 8, 7, 'y');

  sign(m, 32, 4, 'TIDEPOOL SHORE\nLanternrest is back north.');
  sign(m, 48, 24, 'LIGHTHOUSE POINT\nThe lamp has guided boats home for a hundred years.');

  item(m, 4, 36, 'sh_lantern', 'Old Lantern');                // on the islet at the end of the sandbar
  item(m, 2, 11, 'sh_orb', 'Catch Orb', 2);                   // west dunes
  item(m, 13, 20, 'sh_sp', 'Super Potion');                   // beside a tidepool
  item(m, 25, 33, 'sh_ultra', 'Ultra Orb');                   // end of the boardwalk spur
  item(m, 57, 29, 'sh_heal', 'Full Heal');                    // round the back of the lighthouse
  item(m, 61, 5, 'sh_potion', 'Potion');                      // north-east corner by the woods
  item(m, 50, 23, 'sh_rev', 'Revive');                        // tucked behind a tidepool

  npc(m, 51, 30, UP, 'old', ['TIDEKEEPER MARO: I have watched this shore for sixty years.', 'The old Wardens said the Wildcard comes and goes as it pleases. It never showed itself to anyone who chased it.', 'Perhaps it is waiting for the Lantern to call it home.'], { still: true });
  trainer(m, 'sh_pete', 24, 32, LEFT, 'boy', { name: 'PETE', cls: 'SAILOR', sight: 4, team: [[4, 6], [16, 6]], pre: 'Ahoy! Shore leave means battling, matey!', win: 'Blown out of the water!', post: 'The tide always turns back.', prize: 30 });
  trainer(m, 'sh_lin', 19, 21, LEFT, 'lass', { name: 'LIN', cls: 'SHELL COLLECTOR', sight: 5, team: [[14, 7], [18, 6], [16, 7]], pre: 'You found my secret beach! Now you have to battle me.', win: 'My shells!... I mean, nice battle.', post: 'Check the dunes. There are rare finds. Something washed up out past the sandbar, too.', prize: 32 });
  trainer(m, 'sh_cora', 33, 17, LEFT, 'girl', { name: 'CORA', cls: 'SWIMMER', sight: 4, team: [[4, 6], [4, 7]], pre: 'The water is lovely! But first, a battle.', win: 'I am all washed up!', post: 'Watch out for the tidepools, they pinch.', prize: 30 });
  trainer(m, 'sh_gus', 47, 20, LEFT, 'hiker', { name: 'GUS', cls: 'FISHERMAN', sight: 5, team: [[4, 6], [14, 7], [4, 8]], pre: 'Nothing is biting today. You will have to do!', win: 'The one that got away...', post: 'Maro at the lighthouse knows every story on this shore.', prize: 34 });

  warp(m, 30, 0, 'lanternrest', 28, 50, UP); warp(m, 31, 0, 'lanternrest', 29, 50, UP);
})();

// ---- Starlit Hollow: opens after the Lantern is relit; the Wildcard waits here ----
(function () {
  const m = newMap('hollow', 'STARLIT HOLLOW', 40, 32, 'C', { music: 'cave', bg: 'cave', banner: true });
  // Entrance tunnel from the south, opening into a wide crystal cavern.
  rect(m, 17, 25, 4, 7, 'c'); rect(m, 18, 31, 2, 1, 'c');
  blob(m, 19, 20, 13, 5, 'c', null, .15);
  // An underground pool on the west with a little bridge to a crystal island.
  blob(m, 10, 19, 5, 2.6, 'w', null, .1); set(m, 9, 19, 'c'); set(m, 10, 19, 'i'); rect(m, 11, 19, 3, 1, 'V');
  // The winding approach north, between crystal clusters.
  path(m, [[24, 16], [24, 12], [14, 12], [14, 9], [18, 9]], 'c', 3);
  blob(m, 19, 6, 7, 3, 'c', null, .1);
  // The raised dais at the end: a ring of crystals with a gap facing the approach, lamps either side.
  scatter(m, 'i', [[15, 4], [16, 3], [22, 3], [23, 4], [14, 6], [24, 6], [13, 7], [25, 7]]);
  scatter(m, 'l', [[17, 8], [21, 8]]);
  scatter(m, 'i', [[8, 17], [7, 21], [30, 17], [31, 21], [28, 22], [12, 23], [26, 18], [27, 18], [13, 16],
    [22, 11], [12, 11], [27, 13], [17, 13], [16, 10], [21, 14], [30, 23], [8, 23]]);
  scatter(m, 'l', [[16, 25], [21, 25], [16, 21], [23, 21], [26, 15]]);
  scatter(m, 'i', [[32, 19], [29, 24], [6, 20]]);
  m.npcs.push({ x: 19, y: 5, dir: DOWN, creature: 25, still: true, id: 'joker', hide: () => G.state.flags.jokerGone, talk: () => G.story.joker() });
  warp(m, 18, 31, 'lanternrest', 52, 39, DOWN); warp(m, 19, 31, 'lanternrest', 53, 39, DOWN);
})();
})();
