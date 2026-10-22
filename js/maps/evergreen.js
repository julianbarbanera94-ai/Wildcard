// PLACEHOLDER for EVERGREEN FOREST (West region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('evergreen', 'EVERGREEN FOREST', 60, 52, [
    ['S', 46, 'sunmeadow', 36, 1, null],
    ['S', 30, 'sunhaven', 30, 1, null],
    ['E', 24, 'cloudpeak', 1, 30, gate(3, 'CLOUDPEAK MOUNTAINS')],
  ], { music: 'route', biome: 'forest', enc: null });

})();
