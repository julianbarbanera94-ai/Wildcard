// Legacy player Base (from before the homestead): its interior and bed. Building, upgrading and every other
// structure now live in js/structures.js (data) and js/homestead.js (behaviour).
(function () {
const G = globalThis.G;
const { interior, set, scatter, warp, DOWN } = G.mk;

// ---- Your Base (interior) -----------------------------------------------------
(function () {
  const m = interior('base', 'YOUR BASE', 10, 8, 5);
  set(m, 1, 1, 'b'); set(m, 8, 1, 'P'); scatter(m, 'S', [[4, 1], [5, 1]]); set(m, 7, 4, 't'); scatter(m, 'a', [[4, 4], [5, 4], [4, 5], [5, 5]]); set(m, 1, 5, 'x');
  m.objs.push({ x: 1, y: 1, fn: () => rest() }, { x: 8, y: 1, fn: () => G.pcMenu() });
  m.objs.push({ x: 4, y: 1, fn: () => trophies() }, { x: 5, y: 1, fn: () => trophies() });
  warp(m, 5, 7, 'lanternrest', 28, 26, DOWN);   // destination is moved to the real door by applyBuilds
})();
async function rest() {
  const say = G.worldApi.says;
  await G.fadeTo(1, 16, '#000'); G.state.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(40); await G.fadeTo(0, 16);
  await say('You took a nap in your own bed. Your whole team is fully rested!');
}
async function trophies() {
  const f = G.state.flags, n = ['meadow', 'marsh', 'mine'].filter(k => f['shard_' + k]).length;
  const caught = Object.values(G.state.dex).filter(v => v > 1).length;
  await G.worldApi.says([`Your trophy shelf: ${n} of 3 Ember Shards earned, ${caught} creatures caught.`, f.jokerCaught ? 'A card with a grinning jester sits in pride of place.' : 'There is an empty spot in the middle... for something special.']);
}

})();
