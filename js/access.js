// Region access: the story opens the way, and Arena Leaders match how far you've come.
// A place opens when the story has got you there AND you hold the Arena Badges it needs:
//   - badges: the count the map lists (G.WORLD place `need`). Only badges count: no permit to buy, and reputation does not open a gate;
//   - story: the chapter before it is finished (STORY below). Where there is no gym on the way to earn a badge (the start of the
//     game, a town or island without an Arena) the finished chapter is what lets you on, so there is always a way to progress.
//     Nothing buys, flies or sails past it: no boat, no ferry, no helicopter. A place you have already been to stays open to you
//     (older saves, and going back).
// The Great Lantern rule (Hollow Gate) is the story's too.
// Every warp into a place with a rule uses it: road exits, harbour gates on the sea, ferries and flight.
// Story order: ch1 Stonebridge, ch2 Evergreen and Sunhaven, ch3 Driftwood and Verdant, ch4 Lakeside and Tidefall, ch5 the desert
// and Cobalt, ch6 the north, ch7 Emberfall, ch8 Cloudpeak.
const STORY = { evergreen: 'ch1', whispering: 'ch1', driftwood: 'ch2', verdant: 'ch2', lakeside: 'ch3', tidefall: 'ch3', sandsreach: 'ch4', cobalt: 'ch4', badlands: 'ch4',
  glacier: 'ch5', frostmere: 'ch5', aurora: 'ch5', emberfall: 'ch6', cloudpeak: 'ch7', moonlit: 'ch8' };
(function () {
const place = id => G.WORLD && G.WORLD.byId[id];
const badges = () => (G.badgeCount ? G.badgeCount() : 0);

G.access = {
  // The rule for a place, or null when it is always open.
  rule(id) {
    const p = place(id); if (!p || (!p.need && !p.lantern && !STORY[id])) return null;
    return { id, name: p.name, badges: p.need || 0, lantern: !!p.lantern, region: G.regionOf(id), story: STORY[id] || null };
  },
  // Which of the ways in you have: { badges, rep, permit, lantern, open }.
  status(id, fromId) {
    const R = G.access.rule(id), S = G.state; if (!R) return { open: true };
    const f = (S && S.flags) || {};
    const st = { badges: !R.badges || badges() >= R.badges, lantern: !R.lantern || !!f.lanternLit,
      story: !R.story || !!(G.quest && G.quest.done && G.quest.done(R.story)) || !!(S && S.visited && S.visited[id]) };
    st.open = st.lantern && ((st.story && st.badges) || !!(S && S.cheats && S.cheats.on && S.cheats.fly));
    return st;
  },
  open: (id, fromId) => G.access.status(id, fromId).open,
  // Why you can't go in (a full sentence), or null.
  why(id, fromId) {
    const R = G.access.rule(id); if (!R) return null; const s = G.access.status(id, fromId); if (s.open) return null;
    if (!s.lantern && s.story && s.badges) return `${R.name} is sealed until the Great Lantern burns again.`;
    const chap = R.story && G.QUESTS && G.QUESTS[R.story] ? G.QUESTS[R.story].title : null;
    if (!s.story) return `${R.name} is not open to you yet. Finish ${chap || 'the story so far'} first: the way there is part of the story, and money cannot buy it.`;
    return `${R.name} needs ${R.badges} Arena Badge${R.badges > 1 ? 's' : ''} (you have ${badges()}).` + (R.lantern ? ' The Great Lantern must burn again too.' : '');
  },
  // A short line for map panels and gate plates.
  short(id) {
    const R = G.access.rule(id); if (!R) return ''; const s = G.access.status(id); if (s.open) return '';
    if (!s.lantern && s.story && s.badges) return 'LOCKED: LANTERN MUST BE RELIT';
    if (!s.story) return 'LOCKED: FINISH CHAPTER ' + R.story.replace('ch', '');
    return `LOCKED: ${R.badges} BADGE${R.badges > 1 ? 'S' : ''}`;
  },
  // Soft gate: how tough a place is next to your team.
  danger(id) {
    const lv = G.worldLevels && G.worldLevels(id), S = G.state; if (!lv || !S || !S.party.length) return null;
    const top = Math.max(...S.party.map(c => c.lvl));
    return lv[1] >= top + 8 ? 'high' : lv[1] >= top + 3 ? 'some' : null;
  },
  // The ranger used to sell a travel permit here. Nothing buys the way any more (see the top of this file); kept so warps that call it still work.
  async offer() { return false; },
};

// ---- Wire every warp into a ruled place to the rule ---------------------------------------------------------------------------
function wire() {
  for (const m of Object.values(G.MAPS)) for (const w of m.warps || []) {
    const to = G.WORLD.byId[w.to] ? w.to : null; if (!to || !G.access.rule(to)) continue;
    const from = G.WORLD.byId[m.id] ? m.id : m.sea ? null : G.worldPlaceOf ? G.worldPlaceOf(m.id) : m.id; if (from === to) continue;   // the sea belongs to no place
    const R = G.access.rule(to);
    const need = () => { if (!G.state.flags.starter) return 'It is not safe beyond the lamplight without a Bondling.'; return G.access.why(to, from); };
    need.badges = R.badges; need.place = R.name; need.rule = to;
    w.need = need; w.offer = () => G.access.offer(to);
  }
}
G.hooks.load.push(function once() { if (!wire.done && G.WORLD) { wire(); wire.done = true; } });
if (G.WORLD) { wire(); wire.done = true; }

// ---- Arena Leaders match your progress ------------------------------------------------------------------------------------
// The k-th Leader you face fights at the strength of the k-th Arena, whichever city it is; its Arena's trainers shift the same way.
let TOPS = null;
function leaderTop(m) { const n = (m.npcs || []).find(n => n.trainer && n.trainer.leader); return n ? { badge: n.trainer.leader, top: Math.max(...n.trainer.team.map(t => t[1])) } : null; }
function tops() {
  if (TOPS) return TOPS; TOPS = {};
  for (const m of Object.values(G.MAPS)) { const L = leaderTop(m); if (L) TOPS[L.badge] = L.top; }
  return TOPS;
}
// Level offset for the Arena on map m (0 outside Arenas).
G.arenaShift = function (m) {
  const L = m && leaderTop(m); if (!L) return 0;
  const S = G.state, others = (G.BADGES || []).filter(b => b.id !== L.badge && S.flags['badge_' + b.id]).length;
  const sorted = Object.values(tops()).sort((a, b) => a - b), target = sorted[Math.min(others, sorted.length - 1)];
  return target - L.top;
};
G.scaledTeam = (team, m) => { const d = G.arenaShift(m); return team.map(([id, l]) => [id, Math.max(2, Math.min(100, l + d))]); };
})();
