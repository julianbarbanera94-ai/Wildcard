// PLACEHOLDER for WHISPERING WOODS (South region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('whispering', 'WHISPERING WOODS', 64, 48, [
    ['W', 24, 'stonebridge', 54, 22, null],
    ['E', 24, 'cobalt', 1, 30, gate(4, 'COBALT CITY')],
    ['N', 32, 'sandsreach', 34, 50, gate(2, 'SANDSREACH DESERT')],
  ], { music: 'route', biome: 'mystic', enc: null });

})();
