// PLACEHOLDER for LAKESIDE TOWN (North region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('lakeside', 'LAKESIDE TOWN', 56, 46, [
    ['W', 24, 'ridge', 50, 40, null],
    ['E', 22, 'glacier', 1, 34, gate(5, 'GLACIER PASS')],
  ], { music: 'town', biome: 'meadow', enc: null });
G.mk.warp(m, (m.w >> 1) + 3, m.h >> 1, 'arena_lakeside', 0, 0, G.mk.UP);   // stand-in arena door

})();
