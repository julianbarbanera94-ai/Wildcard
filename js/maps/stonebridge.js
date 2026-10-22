// PLACEHOLDER for STONEBRIDGE TOWN (South region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('stonebridge', 'STONEBRIDGE TOWN', 56, 44, [
    ['N', 27, 'lanternrest', 28, 50, null],
    ['W', 22, 'mirewood', 74, 24, null],
    ['S', 27, 'shore', 30, 1, null],
    ['E', 22, 'whispering', 1, 24, gate(1, 'WHISPERING WOODS')],
  ], { music: 'town', biome: 'meadow', enc: null });
G.mk.warp(m, (m.w >> 1) + 3, m.h >> 1, 'arena_stonebridge', 0, 0, G.mk.UP);   // stand-in arena door

})();
