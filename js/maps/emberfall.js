// PLACEHOLDER for EMBERFALL VOLCANO (East region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('emberfall', 'EMBERFALL VOLCANO', 56, 52, [
    ['S', 30, 'badlands', 30, 1, null],
    ['W', 20, 'glacier', 30, 42, gate(5, 'GLACIER PASS'), 'x'],
  ], { music: 'cave', biome: 'volcano', enc: null });
G.mk.warp(m, (m.w >> 1) + 3, m.h >> 1, 'arena_emberfall', 0, 0, G.mk.UP);   // stand-in arena door

})();
