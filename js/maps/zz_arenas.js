// PLACEHOLDER arenas and badge system (the Arenas owner replaces this file; see docs/WORLD.md).
// Loads after every city file, so it can aim each arena's exit back at its city's arena door.
(function () {
const G = globalThis.G;
const { interior, warp, DOWN } = G.mk;
G.BADGES = [
  { id: 'keystone', name: 'Keystone Badge', city: 'stonebridge', type: 'Rock' },
  { id: 'bloom', name: 'Bloom Badge', city: 'sunhaven', type: 'Grass' },
  { id: 'tide', name: 'Tide Badge', city: 'lakeside', type: 'Water' },
  { id: 'gale', name: 'Gale Badge', city: 'driftwood', type: 'Flying' },
  { id: 'dune', name: 'Dune Badge', city: 'sandsreach', type: 'Ground' },
  { id: 'circuit', name: 'Circuit Badge', city: 'cobalt', type: 'Electric' },
  { id: 'rime', name: 'Rime Badge', city: 'frostmere', type: 'Ice' },
  { id: 'magma', name: 'Magma Badge', city: 'emberfall', type: 'Fire' },
];
G.badgeCount = () => G.BADGES.filter(b => G.state && G.state.flags['badge_' + b.id]).length;
G.badgeGate = (n, place) => G.badgeCount() >= n ? null : `A ranger blocks the way. "${place || 'This area'} is only open to Wardens with ${n} Arena Badge${n > 1 ? 's' : ''}. You have ${G.badgeCount()}."`;
for (const b of G.BADGES) {
  const id = 'arena_' + b.city, m = interior(id, (b.city.toUpperCase()) + ' ARENA', 10, 12, 5);
  warp(m, 5, 11, b.city, 0, 0, DOWN);
  const city = G.MAPS[b.city], door = city && city.warps.find(w => w.to === id);
  if (door) Object.assign(m.warps[0], { tx: door.x, ty: door.y + 1 }), Object.assign(door, { tx: 5, ty: 10 });
}
})();
