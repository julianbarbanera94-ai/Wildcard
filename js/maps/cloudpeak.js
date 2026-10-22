// PLACEHOLDER for CLOUDPEAK MOUNTAINS (North region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('cloudpeak', 'CLOUDPEAK MOUNTAINS', 64, 60, [
    ['W', 30, 'evergreen', 58, 24, gate(1, 'EVERGREEN FOREST')],
    ['S', 24, 'ridge', 36, 1, null],
    ['E', 20, 'glacier', 1, 20, gate(5, 'GLACIER PASS')],
  ], { music: 'cave', biome: 'alpine', enc: null });

})();
