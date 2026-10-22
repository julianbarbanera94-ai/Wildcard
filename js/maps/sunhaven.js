// PLACEHOLDER for SUNHAVEN CITY (West region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('sunhaven', 'SUNHAVEN CITY', 64, 52, [
    ['E', 24, 'sunmeadow', 1, 20, null],
    ['N', 30, 'evergreen', 30, 50, gate(1, 'EVERGREEN FOREST')],
    ['S', 30, 'driftwood', 26, 1, gate(2, 'DRIFTWOOD PORT')],
  ], { music: 'town', biome: 'city', enc: null });
G.mk.warp(m, (m.w >> 1) + 3, m.h >> 1, 'arena_sunhaven', 0, 0, G.mk.UP);   // stand-in arena door

})();
