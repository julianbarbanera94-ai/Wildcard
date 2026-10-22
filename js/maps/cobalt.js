// PLACEHOLDER for COBALT CITY (East region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('cobalt', 'COBALT CITY', 72, 56, [
    ['W', 30, 'whispering', 62, 24, null],
    ['N', 36, 'sandsreach', 66, 36, null, 'y'],
  ], { music: 'town', biome: 'city', enc: null });
G.mk.warp(m, (m.w >> 1) + 3, m.h >> 1, 'arena_cobalt', 0, 0, G.mk.UP);   // stand-in arena door
m.dock = { x: (m.w >> 1) - 2, y: (m.h >> 1) + 1 };   // stand-in ferry dock

})();
