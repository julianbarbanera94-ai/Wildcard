// The journal's first quests, built on the game as it already plays (the full story arrives chapter by chapter).
// Every step reads saved state, so a quest is right however you got there: early, out of order, or from an old save.
(function () {
const Q = G.quest, F = S => S.flags;
const SHARDS = [['meadow', 'evergreen', 'Evergreen Forest'], ['marsh', 'tidefall', 'Tidefall'], ['mine', 'aurora', 'the Aurora Isles']];   // where each is found (js/chapter2.js)
const shardCount = S => SHARDS.filter(([k]) => F(S)['shard_' + k]).length;
// Which reputation region a place belongs to.
const REGION = { sunmeadow: 'west', sunhaven: 'west', evergreen: 'west', driftwood: 'west', verdant: 'west',
  stonebridge: 'south', mirewood: 'south', whispering: 'south', shore: 'south', tidefall: 'south', moonlit: 'south', hollow: 'south',
  ridge: 'north', lakeside: 'north', cloudpeak: 'north', glacier: 'north', frostmere: 'north', aurora: 'north',
  sandsreach: 'east', badlands: 'east', emberfall: 'east', cobalt: 'east', lanternrest: 'vale', homestead: 'vale' };
G.regionOf = id => REGION[id] || 'vale';
const badges = S => (G.BADGES || []).filter(b => F(S)['badge_' + b.id]).length;
const visited = S => G.WORLD ? G.WORLD.places.filter(p => G.worldVisited(p.id)).length : 0;
const caught = S => Object.values(S.dex || {}).filter(v => v > 1).length;

// ---- Main story -------------------------------------------------------------------------------------------------------------
Q.def({ id: 'lantern', cat: 'main', title: 'The Dimming Lantern', giver: 'Elder Wren',
  desc: 'The Great Lantern is failing. Three Ember Shards can relight it, and the Wardens of the Meadow, the Marsh and the Mine know where they are.',
  start: () => true,
  steps: [
    { id: 'bond', text: 'Wake a Bondling at the Hearth Shrine', at: 'lanternrest', done: S => !!F(S).starter },
    { id: 'shards', text: 'Find the three Ember Shards', count: S => [shardCount(S), 3], done: S => shardCount(S) >= 3,
      at: S => (SHARDS.find(([k]) => !F(S)['shard_' + k]) || [, 'lanternrest'])[1] },
    { id: 'light', text: 'Place the shards in the Great Lantern', at: 'lanternrest', done: S => !!F(S).lanternLit },
    { id: 'joker', text: 'Go through the Hollow Gate and find the Wildcard', at: 'hollow', done: S => !!(F(S).jokerCaught || F(S).jokerGone) },
  ],
  reward: { money: 5000, rep: { vale: 40 }, text: 'the thanks of the whole vale' } });

// ---- Optional ---------------------------------------------------------------------------------------------------------------
const nextArena = S => { const b = (G.BADGES || []).find(b => !F(S)['badge_' + b.id]); return b ? b.city : null; };
Q.def({ id: 'arenas', cat: 'side', title: 'Arena Challenge', giver: 'The Arena Leaders',
  desc: 'Eight Leaders across Aurelis each hand a Badge to anyone who can beat them.',
  start: S => !!F(S).starter,
  steps: [
    { id: 'b1', text: 'Earn your first Badge', count: S => [badges(S), 1], done: S => badges(S) >= 1, at: nextArena },
    { id: 'b4', text: 'Earn four Badges', count: S => [badges(S), 4], done: S => badges(S) >= 4, at: nextArena },
    { id: 'b8', text: 'Earn all eight Badges', count: S => [badges(S), 8], done: S => badges(S) >= 8, at: nextArena },
  ],
  reward: { money: 10000, items: { 'Revive': 3 } } });

Q.def({ id: 'courier', cat: 'people', title: "The Courier's Parcel", giver: 'The courier',
  desc: 'A courier asked you to carry a parcel for them.',
  start: S => !!F(S).courierAsked,
  steps: [{ id: 'deliver', text: 'Deliver the parcel', done: S => !!F(S).courierDone }],
  reward: { rep: { vale: 10 } } });

Q.def({ id: 'explore', cat: 'discovery', title: 'Map of Aurelis', desc: 'Visit every place on the map of Aurelis.',
  start: S => !!F(S).starter,
  steps: [
    { id: 'v6', text: 'Visit 6 places', count: S => [visited(S), 6], done: S => visited(S) >= 6 },
    { id: 'v12', text: 'Visit 12 places', count: S => [visited(S), 12], done: S => visited(S) >= 12 },
    { id: 'all', text: 'Visit every place', count: S => [visited(S), G.WORLD ? G.WORLD.places.length : 24], done: S => !!G.WORLD && visited(S) >= G.WORLD.places.length },
  ],
  reward: { money: 3000, rep: { west: 10, south: 10, north: 10, east: 10 } } });

Q.def({ id: 'dex', cat: 'research', title: 'Field Notes', desc: 'Catch creatures to fill your Dex.',
  start: S => !!F(S).starter,
  steps: [
    { id: 'c10', text: 'Catch 10 kinds of creature', count: S => [caught(S), 10], done: S => caught(S) >= 10 },
    { id: 'c50', text: 'Catch 50 kinds of creature', count: S => [caught(S), 50], done: S => caught(S) >= 50 },
    { id: 'c100', text: 'Catch 100 kinds of creature', count: S => [caught(S), 100], done: S => caught(S) >= 100 },
  ],
  reward: { money: 5000, items: { 'Mythic Orb': 3 } } });

// Hidden places found with CLIMB, LIGHT and DIG (js/field.js).
const fx = (S, kind) => (G.FIELD_SPOTS || []).filter(s => (!kind || s.kind === kind) && S.once && S.once['fx:' + s.id]).length;
const fxAll = kind => (G.FIELD_SPOTS || []).filter(s => !kind || s.kind === kind).length;
Q.def({ id: 'hidden', cat: 'discovery', title: 'Off the Beaten Path', desc: 'Rock faces, dark gaps and soft soil hide things. Climb, light and dig with your creatures, or with tools from the forge.',
  start: S => !!F(S).starter,
  steps: [
    { id: 'first', text: 'Find something hidden off the path', count: S => [fx(S), 1], done: S => fx(S) >= 1 },
    { id: 'each', text: 'Find a hidden spot with each of CLIMB, LIGHT and DIG', count: S => [['climb', 'light', 'dig'].filter(k => fx(S, k)).length, 3], done: S => ['climb', 'light', 'dig'].every(k => fx(S, k) > 0) },
    { id: 'all', text: 'Find every hidden spot in Aurelis', count: S => [fx(S), fxAll()], done: S => fx(S) >= fxAll() },
  ],
  reward: { money: 4000, items: { 'Mythic Orb': 2 } } });

const deed = S => (S.home && S.home.deed) || 1;
Q.def({ id: 'home', cat: 'home', title: 'A Place of My Own', desc: 'Your homestead grows as you make your name across Aurelis.',
  start: S => !!F(S).starter,
  steps: [
    { id: 'd2', text: 'Grow the homestead to its second plot', at: 'homestead', count: S => [deed(S), 2], done: S => deed(S) >= 2 },
    { id: 'd3', text: 'Grow the homestead to its third plot', at: 'homestead', count: S => [deed(S), 3], done: S => deed(S) >= 3 },
    { id: 'd5', text: 'Own all the homestead land', at: 'homestead', count: S => [deed(S), 5], done: S => deed(S) >= 5 },
  ],
  reward: { money: 5000, rep: { vale: 20 } } });

// Progress for the homestead's land: badges, plus 1 for every 80 reputation in total.
G.progressPoints = () => { const S = G.state; if (!S) return 0; const rep = G.REP_REGIONS.reduce((a, [r]) => a + G.rep.get(r), 0); return (G.badgeCount ? G.badgeCount() : 0) + Math.floor(rep / 80); };
// Beating a trainer: +2 with the region you're in (once per trainer).
G.onTrainerWin = (t, mapId) => G.grantOnce('rep:tr_' + t.id, () => G.rep.add(G.regionOf(G.worldPlaceOf ? G.worldPlaceOf(mapId) || mapId : mapId), 2));
// ---- Reputation from what you already do --------------------------------------------------------------------------------------
// Beating an Arena Leader: +20 with that region. Winning a shard: +15. Given once each.
G.hooks.tick.push(() => {
  const S = G.state; if (!S || !S.flags || G.frameNo % 30) return; S.once = S.once || {};
  for (const b of G.BADGES || []) if (S.flags['badge_' + b.id]) G.grantOnce('rep:badge_' + b.id, () => G.rep.add(G.regionOf(b.city), 20));
  for (const [k, place] of SHARDS) if (S.flags['shard_' + k]) G.grantOnce('rep:shard_' + k, () => G.rep.add(G.regionOf(place), 15));
  // a new kind of creature caught: +1 with the region you're in (creatures caught before this existed count for nothing)
  const seeded = !!S.once['dex:seeded'], here = G.regionOf((G.worldPlaceOf && G.world.mapId && G.worldPlaceOf(G.world.mapId)) || 'lanternrest');
  for (const [id, v] of Object.entries(S.dex || {})) if (v > 1 && !S.once['dex:' + id]) { S.once['dex:' + id] = true; if (seeded) G.rep.add(here, 1); }
  S.once['dex:seeded'] = true;
});
})();
