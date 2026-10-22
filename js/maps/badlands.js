// PLACEHOLDER for CRIMSON BADLANDS (East region owner replaces this; keep the id, size and exits from docs/WORLD.md).
(function () {
const G = globalThis.G;
const { stubMap, gate } = G.mk;
const m = stubMap('badlands', 'CRIMSON BADLANDS', 60, 48, [
    ['W', 24, 'sandsreach', 66, 14, null],
    ['N', 30, 'emberfall', 30, 50, gate(6, 'EMBERFALL VOLCANO')],
  ], { music: 'route', biome: 'badlands', enc: null });

})();
