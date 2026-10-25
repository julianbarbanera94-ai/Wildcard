// Longer later chapters (docs/STORY_AND_PROGRESSION.md, section 2): Chapters 5 to 8 each gain story steps on the new roads, in a cave
// and on Cloudpeak, so the story grows as the world opens instead of shrinking. The steps are inserted into the chapter definitions
// from js/chapter5.js; a save already past a chapter is unaffected (a finished quest stays finished), and a save part-way through
// simply has the new step to do next.
//   5. Dust and Thunder: beat the Ashen courier on Cobalt Flats, then read the pipe map he dropped.
//   6. Cold Resolve: on Frostmere Approach, hear Brann the deserter out, then find the Ashen supply cache he names.
//   7. Fire at the Heart: free the caged creatures in the Emberfall cave (trust), then beat the scout at the mountain gate.
//   8. The Great Lantern: gather Tam, Pyrra and Kade at the foot of Cloudpeak before the castle.
(function () {
const G = globalThis.G, Q = G.quest, F = () => G.state.flags, says = l => G.worldApi.says(l);
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
const ASHEN = { hair: '#3a3440', skin: '#e8c0a0', shirt: '#4a4450', pants: '#2a2630', hat: '#8a3a3a' };
const TAM = { hair: '#2a8a8a', skin: '#f0c8a0', shirt: '#f0a030', pants: '#3a3a50', hat: '#2a8a8a' };
const PYRRA = { hair: '#d03a20', skin: '#e8b890', shirt: '#e8502a', pants: '#3a2a30', hat: '#ffb040' };
// the nearest free, walkable tile to (x, y) on a map: not water, not tall grass, nothing standing there, away from the edges
function near(id, x, y) {
  const m = G.MAPS[id], taken = new Set([...m.npcs, ...m.objs, ...m.warps].map(o => o.x + ',' + o.y));
  const ok = (a, b) => a > 1 && b > 1 && a < m.w - 2 && b < m.h - 2 && !taken.has(a + ',' + b) && G.TILES[m.t[b][a]] && !G.TILES[m.t[b][a]].solid && !G.TILES[m.t[b][a]].enc && m.t[b][a] !== 'w' && !m.warps.some(w => Math.abs(w.x - a) + Math.abs(w.y - b) <= 2);
  for (let r = 0; r < 30; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (Math.max(Math.abs(i), Math.abs(j)) === r && ok(x + i, y + j)) return [x + i, y + j];
  return [x, y];
}
const person = (map, at, dir, style, o) => { const [x, y] = near(map, ...at); G.mk.npc(G.MAPS[map], x, y, dir, style, null, Object.assign({ still: true }, o)); return [x, y]; };
const thing = (map, at, o) => { const [x, y] = near(map, ...at); G.MAPS[map].objs.push(Object.assign({ x, y, prompt: 'Look' }, o)); return [x, y]; };
const insert = (qid, beforeId, steps) => { const q = G.QUESTS[qid], i = q.steps.findIndex(s => s.id === beforeId); q.steps.splice(i < 0 ? q.steps.length : i, 0, ...steps); };
const on = (qid, sid) => { const s = Q.state(qid) && Q.step(qid); return !!(s && s.id === sid); };

// ==== Chapter 5: the courier on Cobalt Flats ===============================================================================
insert('ch5', 'machine', [
  { id: 'courier', text: 'Stop the Ashen courier on Cobalt Flats', at: 'road_cobalt', done: S => !!S.flags.ashen_flats },
  { id: 'pipemap', text: 'Read the map the courier dropped', at: 'road_cobalt', done: S => !!S.flags.ch5_pipemap },
]);
const cm = G.MAPS.road_cobalt, cAt = [cm.landing.x, cm.landing.y];
const [cx, cy] = person('road_cobalt', cAt, DOWN, 'boy', { style: ASHEN, hide: () => !Q.state('ch5') || (!F().ch5_sr && !F().ch5_cb),
  trainer: { id: 'ashen_flats', style: ASHEN, name: 'SKARL', cls: 'ASHEN COURIER', sight: 3, team: [[141, 27], [120, 28], [20, 29]], prize: 300,
    pre: ['SKARL: Out of my way. These orders go to the Badlands.', 'SKARL: The siphons are the least of your worries, Warden.'], win: 'SKARL: Fine! Take the map, it is no use to me now.', post: 'SKARL: Vesper will hear about this.' } });
thing('road_cobalt', [cx + 2, cy + 1], { hide: () => !F().ashen_flats || !!F().ch5_pipemap, fn: async () => {
  if (!on('ch5', 'pipemap') && !F().ashen_flats) return;
  F().ch5_pipemap = true; G.audio.sfx('exclaim');
  await says(['A folded map, stamped with the Ashen sigil. Red lines run from Sandsreach and Cobalt to one point in the Crimson Badlands.', 'Under it, in small writing: "Main valve, Badlands. Then north, to the volcano."', 'The Badlands are south-west of Sandsreach.']);
} });

// ==== Chapter 6: Brann on Frostmere Approach ===============================================================================
insert('ch6', 'badge', [
  { id: 'brann', text: 'Hear out the stranger on Frostmere Approach', at: 'road_frostmere', done: S => !!S.flags.ch6_brann },
  { id: 'cache', text: "Find the Ashen supply cache Brann told you about", at: 'road_frostmere', done: S => !!S.flags.ch6_cache },
]);
const fm = G.MAPS.road_frostmere;
const [bx, by] = person('road_frostmere', [fm.landing.x, fm.landing.y], LEFT, 'boy', { style: ASHEN, hide: () => !Q.state('ch6') || !F().ch6_tam, talk: async () => {
  const f = F();
  if (f.ch6_brann) { await says(f.ch6_cache ? 'BRANN: Good. Now get that shard before they do.' : 'BRANN: The cache is by the pines, near the east end of the road. Hurry.'); return; }
  f.ch6_brann = true;
  await says(['BRANN: Easy! I am not one of them any more. I threw my coat in the bay.', 'BRANN: Vesper sent a boat north with the Mine shard. They stopped here first and left supplies: ferry tickets, rations, a chart of the Aurora Isles.', 'BRANN: The cache is hidden by the pines, near the Frostmere end of this road. Take it and they cannot follow you.']);
} });
thing('road_frostmere', [fm.w - 8, fm.landing.y - 6], { hide: () => !F().ch6_brann || !!F().ch6_cache, fn: async () => {
  F().ch6_cache = true; const S = G.state; S.bag['Super Potion'] = (S.bag['Super Potion'] || 0) + 3; G.audio.sfx('levelup');
  await says(['Under a tarp in the snow: Ashen crates, ferry tickets and a sea chart of the Aurora Isles.', `${S.name} found 3 SUPER POTIONS in the cache.`, 'Without their chart the Ashen boat will be slow. Earn the Rime Badge in Frostmere, then take the ferry north.']);
} });

// ==== Chapter 7: the cage in the Emberfall cave and the gate scout ===========================================================
insert('ch7', 'pyrra', [
  { id: 'cage', text: 'Free the caged creatures in the Emberfall cave', at: 'cave_emberfall', done: S => !!S.flags.ch7_cage },
  { id: 'scout', text: "Beat the Ashen scout watching the mountain", at: 'emberfall', done: S => !!S.flags.ashen_scout },
]);
const em = G.MAPS.cave_emberfall;
thing('cave_emberfall', [em.w >> 1, em.h >> 1], { hide: () => !Q.state('ch7') || !!F().ch7_cage, fn: async () => {
  if (!Q.active('ch7')) { await says('An empty iron cage, hot from the lava.'); return; }
  await says(['An Ashen cage, full of creatures too frightened to move. A young Embrit at the front growls at you.', 'Open it gently, and they may trust you enough to run home.']);
  if (!(await G.trust('the young Embrit'))) return;
  F().ch7_cage = true; G.rep.add('east', 10); G.audio.sfx('levelup');
  await says(['The creatures pour out of the cage and scatter into the tunnels, free.', 'The Embrit stays a moment, then runs off toward the volcano, as if to show the way. Pyrra will want to hear about this.']);
} });
person('emberfall', [26, 22], LEFT, 'boy', { style: ASHEN, hide: () => !Q.state('ch7') || !F().ch7_cage,
  trainer: { id: 'ashen_scout', style: ASHEN, name: 'EMBERLY', cls: 'ASHEN SCOUT', sight: 4, team: [[134, 41], [119, 42], [20, 42]], prize: 400,
    pre: ['EMBERLY: So you are the one letting our creatures go.', 'EMBERLY: Nobody reaches the machine while I watch the mountain.'], win: 'EMBERLY: ...Pyrra is that way. Go on, then.', post: 'EMBERLY: Cindra will not be so easy.' } });

// ==== Chapter 8: friends at the foot of Cloudpeak ===========================================================================
const allies = S => ['ch8_tam', 'ch8_pyrra', 'ch8_kade'].filter(k => S.flags[k]).length;
insert('ch8', 'vesper', [
  { id: 'allies', text: 'Gather Tam, Pyrra and Kade on Cloudpeak', at: 'cloudpeak', count: S => [allies(S), 3], done: S => allies(S) >= 3 },
]);
const cp = G.MAPS.cloudpeak, base = [cp.landing.x, cp.landing.y - 4];
const ally = (key, style, at, lines) => person('cloudpeak', at, UP, 'boy', { style, hide: () => !Q.state('ch8') || !!F().ch8_vesper, talk: async () => {
  const f = F(); if (!f[key]) { f[key] = true; G.audio.sfx('select'); await says(lines); const n = allies(G.state); if (n < 3) await says(`(${n} of 3 friends are with you.)`); else await says('Tam, Pyrra and Kade fall in behind you. Together, you start the climb to the castle.'); }
  else await says('They are ready when you are.');
} });
ally('ch8_tam', TAM, [base[0] - 3, base[1]], ['TAM: I am not letting you face Vesper alone. I owe the vale that much.']);
ally('ch8_pyrra', PYRRA, [base[0], base[1] - 2], ['PYRRA: The volcano is quiet thanks to you. Now I return the favour.']);
ally('ch8_kade', G.mk.ST.kade, [base[0] + 3, base[1]], ['KADE: That shard was mine to guard, and I lost it. Let me help you finish this.']);
})();
