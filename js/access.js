// Region access: more than one way into every locked place, and Arena Leaders that match how far you've come.
// A place opens with ANY of:
//   - Arena Badges: the count the map lists (G.WORLD place `need`),
//   - reputation: the locals vouch for you (the destination's region, or the region you're coming from),
//   - a travel permit bought from the ranger at the gate (flag permit_<place>), for all but the far islands.
// The Great Lantern rule (Hollow Gate, Aurora Isles) is the story's and has no way round it.
// Every warp into a place with a rule uses it: road exits, harbour gates on the sea, ferries and flight.
(function () {
const REP_FOR = { 1: 15, 2: 15, 3: 40, 4: 40, 5: 70, 6: 70, 7: 100, 8: 100 };   // KNOWN, FRIEND, TRUSTED, HERO
const PERMIT = { 1: 800, 2: 1500, 3: 3000, 4: 4500, 5: 7000, 6: 9000 };          // no permits for the 8-badge islands
const tierName = n => { let t = 'STRANGER'; for (const [m, name] of G.rep.tiers) if (n >= m) t = name; return t; };
const regionName = r => (G.REP_REGIONS.find(x => x[0] === r) || [, r.toUpperCase()])[1];
const place = id => G.WORLD && G.WORLD.byId[id];
const badges = () => (G.badgeCount ? G.badgeCount() : 0);

G.access = {
  // The rule for a place, or null when it is always open.
  rule(id) {
    const p = place(id); if (!p || (!p.need && !p.lantern)) return null;
    return { id, name: p.name, badges: p.need || 0, lantern: !!p.lantern, rep: p.need ? REP_FOR[p.need] : 0, region: G.regionOf(id), permit: p.need ? PERMIT[p.need] || 0 : 0 };
  },
  // Which of the ways in you have: { badges, rep, permit, lantern, open }.
  status(id, fromId) {
    const R = G.access.rule(id), S = G.state; if (!R) return { open: true };
    const from = fromId ? G.regionOf(fromId) : null, myRep = Math.max(G.rep.get(R.region), from ? G.rep.get(from) : 0);
    const f = (S && S.flags) || {};
    const st = { badges: !R.badges || badges() >= R.badges, rep: !!R.rep && myRep >= R.rep, permit: !!f['permit_' + id], lantern: !R.lantern || !!f.lanternLit, myRep, fromRegion: from };
    st.open = st.lantern && (!R.badges || st.badges || st.rep || st.permit || !!(S && S.cheats && S.cheats.on && S.cheats.fly));
    return st;
  },
  open: (id, fromId) => G.access.status(id, fromId).open,
  // Why you can't go in (a full sentence), or null.
  why(id, fromId) {
    const R = G.access.rule(id); if (!R) return null; const s = G.access.status(id, fromId); if (s.open) return null;
    if (!s.lantern && (s.badges || s.rep || s.permit || !R.badges)) return `${R.name} is sealed until the Great Lantern burns again.`;
    const ways = [`${R.badges} Arena Badge${R.badges > 1 ? 's' : ''} (you have ${badges()})`];
    if (R.rep) ways.push(`be ${tierName(R.rep)} in the ${regionName(R.region)}${s.fromRegion && s.fromRegion !== R.region ? ' or ' + regionName(s.fromRegion) : ''} (you are ${tierName(s.myRep)})`);
    if (R.permit) ways.push(`a travel permit ($${R.permit.toLocaleString('en-US')})`);
    return `${R.name} needs ${ways.join(', or ')}.` + (R.lantern ? ' The Great Lantern must burn again too.' : '');
  },
  // A short line for map panels and gate plates.
  short(id) {
    const R = G.access.rule(id); if (!R) return ''; const s = G.access.status(id); if (s.open) return '';
    if (!s.lantern && (s.badges || s.rep || s.permit || !R.badges)) return 'LOCKED: LANTERN MUST BE RELIT';
    return `LOCKED: ${R.badges} BADGE${R.badges > 1 ? 'S' : ''}` + (R.rep ? `, ${tierName(R.rep)}` : '') + (R.permit ? ' OR PERMIT' : '');
  },
  // Soft gate: how tough a place is next to your team.
  danger(id) {
    const lv = G.worldLevels && G.worldLevels(id), S = G.state; if (!lv || !S || !S.party.length) return null;
    const top = Math.max(...S.party.map(c => c.lvl));
    return lv[1] >= top + 8 ? 'high' : lv[1] >= top + 3 ? 'some' : null;
  },
  // The ranger's offer when you're turned back: buy a permit. Resolves true when you bought one.
  async offer(id) {
    const R = G.access.rule(id), S = G.state; if (!R || !R.permit || !G.access.status(id).lantern) return false;
    const lv = G.worldLevels && G.worldLevels(id), d = G.access.danger(id);
    const warn = lv ? ` Wild creatures there are Lv ${lv[0]}-${lv[1]}.` + (d === 'high' ? ' That is far above your team. Be careful!' : d === 'some' ? ' A little above your team.' : '') : '';
    await G.worldApi.says(`RANGER: I can write you a travel permit for ${R.name}. It costs $${R.permit.toLocaleString('en-US')} and lasts for good.${warn}`);
    await G.say('Buy the permit?', { auto: 1 });
    if (!(await G.yesNo())) { G.closeText(); return false; }
    if (S.money < R.permit) { await G.worldApi.says(`RANGER: You'll need $${R.permit.toLocaleString('en-US')}. You have $${S.money.toLocaleString('en-US')}.`); return false; }
    S.money -= R.permit; S.flags['permit_' + id] = true; G.audio.sfx('buy');
    await G.worldApi.says(`You got a travel permit for ${R.name}! The ranger waves you through.`);
    return true;
  },
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
