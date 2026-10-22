// PLACEHOLDER for SANDSREACH DESERT (East region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('sandsreach', 'SANDSREACH DESERT', 68, 52, [
    ['W', 24, 'lanternrest', 58, 24, null],
    ['S', 34, 'whispering', 32, 1, gate(1, 'WHISPERING WOODS')],
    ['E', 36, 'cobalt', 36, 1, gate(4, 'COBALT CITY'), 'x'],
    ['E', 14, 'badlands', 1, 24, gate(4, 'CRIMSON BADLANDS')],
  ], { music: 'route', biome: 'desert', enc: null });
G.mk.warp(m, (m.w >> 1) + 3, m.h >> 1, 'arena_sandsreach', 0, 0, G.mk.UP);   // stand-in arena door

})();
