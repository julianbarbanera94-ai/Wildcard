// Directions to the story goal (docs/WORLD.md, "Directions"): from wherever you stand, which exit to take next and where it leads.
// The route is a breadth-first search over the world graph (land routes and ferry lines, js/worldmap.js); the exit is read from the
// real warps of the map you are on, so the words always match the edge you walk off (a wild road counts as the exit to the place at its
// far end). Used by the quest tracker (js/hud.js), the journal's CURRENT LEAD and the map screen.
(function () {
const G = globalThis.G;
const WORD = { N: 'north', S: 'south', E: 'east', W: 'west' };
const sideOf = (m, w) => w.y === 0 ? 'N' : w.y === m.h - 1 ? 'S' : w.x === 0 ? 'W' : w.x === m.w - 1 ? 'E' : null;
const title = s => String(s).toLowerCase().replace(/(^|[\s-])\w/g, c => c.toUpperCase());
const name = id => title(G.worldShort ? G.worldShort(id) : id);
// the place at the far end of a warp (through a road), or null
const farEnd = (m, w, fromPlace) => { const t = G.MAPS[w.to]; if (!t || !t.outdoor || w.sea) return null; if (t.road) { const o = t.warps.find(x => x.to !== fromPlace && G.WORLD.byId[x.to]); return o ? { place: o.to, road: t } : null; } return G.WORLD.byId[w.to] ? { place: w.to, road: null } : null; };
function graph() {
  const adj = {}; const add = (a, b, how) => { (adj[a] = adj[a] || []).push([b, how]); };
  for (const [a, b] of G.WORLD.edges) { add(a, b, 'land'); add(b, a, 'land'); }
  for (const f of G.WORLD.ferries) { add(f.from, f.to, 'ferry'); add(f.to, f.from, 'ferry'); }
  return adj;
}
function path(from, to) {
  if (from === to) return [from];
  const adj = graph(), prev = { [from]: null }; let q = [from];
  while (q.length) { const nx = []; for (const a of q) for (const [b, how] of adj[a] || []) if (!(b in prev)) { prev[b] = [a, how]; if (b === to) { const out = [to]; let k = to; while (prev[k]) { out.unshift(prev[k][0]); k = prev[k][0]; } return out.map((p, i) => i ? [p, prev[p][1]] : [p, null]).map(([p, h]) => ({ p, how: h })); } nx.push(b); } q = nx; }
  return null;
}
// { here, target, next, how: 'here'|'land'|'ferry'|'none', side, road, inside, locked, text, short }
G.routeHint = function (target) {
  const W = G.world; if (!target || !W || !W.map || !G.WORLD) return null;
  const map = W.map, onRoad = !!map.road, inside = !map.outdoor;
  let here = onRoad ? null : G.worldPlaceOf(W.mapId) || W.mapId;
  if (onRoad) {   // on a road: count from whichever end is nearer the goal
    const ends = [...new Set(map.warps.map(w => w.to).filter(id => G.WORLD.byId[id]))];
    let best = null; for (const e of ends) { const p = path(e, target); if (p && (!best || p.length < best.p.length)) best = { e, p }; }
    if (!best) return null;
    const w = map.warps.find(x => x.to === best.e), side = sideOf(map, w);
    const nxt = best.p.length > 1 ? best.p[1].p : null, locked = G.access ? G.access.short(best.e) : '';
    const text = best.e === target ? `Follow ${map.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} ${WORD[side]} to ${name(target)}.` : `Follow the road ${WORD[side]} to ${name(best.e)}, then on toward ${name(target)}.`;
    return { here: map.id, target, next: best.e, how: 'land', side, road: map, inside: false, locked, text: text + (locked ? ` (${locked.toLowerCase()})` : ''), short: `${WORD[side].toUpperCase()} TO ${name(best.e).toUpperCase()}` };
  }
  if (here === target) return { here, target, next: target, how: 'here', text: `You are in ${name(target)}.`, short: '' };
  const p = path(here, target);
  if (!p) return { here, target, next: null, how: 'none', text: `${name(target)} is reached by boat.`, short: name(target).toUpperCase() };
  const step = p[1], next = step.p, pre = inside ? 'Leave the building, then ' : '';
  const locked = G.access ? G.access.short(next) : '', lock = locked ? ` (${locked.toLowerCase()})` : '';
  const then = next !== target ? `, then on toward ${name(target)}` : '';
  if (step.how === 'ferry') { const t = `${pre}take the ferry from ${name(here)}'s dock to ${name(next)}${then}.`; return { here, target, next, how: 'ferry', locked, text: t.charAt(0).toUpperCase() + t.slice(1) + lock, short: `FERRY TO ${name(next).toUpperCase()}` }; }
  // the exit on the place's own map that leads (directly or by road) to the next place
  const pm = G.MAPS[here]; let side = null, road = null;
  for (const w of pm ? pm.warps : []) { const f = farEnd(pm, w, here); if (f && f.place === next) { side = sideOf(pm, w); road = f.road; if (side) break; } }
  const exit = side ? `the ${WORD[side]} exit` : 'the road';
  const t = `${pre}take ${exit}${road ? ` along ${road.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}` : ''} to ${name(next)}${then}.`;
  return { here, target, next, how: 'land', side, road, inside, locked, text: t.charAt(0).toUpperCase() + t.slice(1) + lock, short: side ? `${WORD[side].toUpperCase()} TO ${name(next).toUpperCase()}` : name(next).toUpperCase() };
};
// The hint for the current story lead, or null.
G.leadHint = function () { const L = G.quest && G.quest.lead && G.quest.lead(); return L && L.step && L.step.at ? G.routeHint(L.step.at) : null; };
})();
