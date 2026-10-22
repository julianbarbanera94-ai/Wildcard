// PLACEHOLDER for FROSTMERE CITY (North region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('frostmere', 'FROSTMERE CITY', 60, 50, [
    ['W', 24, 'glacier', 58, 20, null],
  ], { music: 'town', biome: 'snow', enc: null });
G.mk.warp(m, (m.w >> 1) + 3, m.h >> 1, 'arena_frostmere', 0, 0, G.mk.UP);   // stand-in arena door
m.dock = { x: (m.w >> 1) - 2, y: (m.h >> 1) + 1 };   // stand-in ferry dock

})();
