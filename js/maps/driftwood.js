// PLACEHOLDER for DRIFTWOOD PORT (West region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('driftwood', 'DRIFTWOOD PORT', 52, 44, [
    ['N', 26, 'sunhaven', 30, 50, null],
    ['E', 22, 'mirewood', 1, 24, null],
  ], { music: 'town', biome: 'coast', enc: null });
G.mk.warp(m, (m.w >> 1) + 3, m.h >> 1, 'arena_driftwood', 0, 0, G.mk.UP);   // stand-in arena door
m.dock = { x: (m.w >> 1) - 2, y: (m.h >> 1) + 1 };   // stand-in ferry dock

})();
