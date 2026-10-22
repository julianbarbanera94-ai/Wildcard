// PLACEHOLDER for GLACIER PASS (North region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('glacier', 'GLACIER PASS', 60, 44, [
    ['S', 30, 'emberfall', 1, 20, gate(6, 'EMBERFALL VOLCANO'), 'y'],
    ['W', 34, 'lakeside', 54, 22, null],
    ['W', 20, 'cloudpeak', 62, 20, gate(3, 'CLOUDPEAK MOUNTAINS')],
    ['E', 20, 'frostmere', 1, 24, gate(5, 'FROSTMERE CITY')],
  ], { music: 'route', biome: 'snow', enc: null });

})();
