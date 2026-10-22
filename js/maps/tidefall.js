// PLACEHOLDER for TIDEFALL ISLANDS (South region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('tidefall', 'TIDEFALL ISLANDS', 60, 46, [
    ['N', 30, 'mirewood', 38, 50, null],
  ], { music: 'route', biome: 'tropical', enc: null });
m.dock = { x: (m.w >> 1) - 2, y: (m.h >> 1) + 1 };   // stand-in ferry dock

})();
