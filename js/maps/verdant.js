// PLACEHOLDER for VERDANT ISLE (West region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('verdant', 'VERDANT ISLE', 40, 34, [

  ], { music: 'route', biome: 'tropical', enc: null });
m.dock = { x: (m.w >> 1) - 2, y: (m.h >> 1) + 1 };   // stand-in ferry dock

})();
