// PLACEHOLDER for AURORA ISLES (North region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('aurora', 'AURORA ISLES', 44, 36, [

  ], { music: 'cave', biome: 'aurora', enc: null });
m.dock = { x: (m.w >> 1) - 2, y: (m.h >> 1) + 1 };   // stand-in ferry dock

})();
