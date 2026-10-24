// Field abilities: CLIMB, DIG and LIGHT. A creature in your party can do each one, or a tool from the forge can.
//   CLIMB: rock faces with handholds lead up to hidden ledges (Rock, Ground or Fighting creature, or Climbing Gear).
//   LIGHT: pitch-black gaps open into hidden hollows once lit (Fire or Electric creature, or a Glow Lamp).
//   DIG:   soft soil with something buried in it (Ground, Bug or Rock creature, or a Shovel).
// Spots are data (G.FIELD_SPOTS). Hidden nooks are carved into the maps when this file loads, behind a single obstacle tile.
(function () {
const VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]];
const FIELD = G.FIELD = {
  climb: { name: 'CLIMB', types: ['Rock', 'Ground', 'Fighting'], tool: 'Climbing Gear', minLv: 8,
    need: 'A Rock, Ground or Fighting creature at Lv 8 or higher could climb it, or Climbing Gear from the forge.' },
  dig: { name: 'DIG', types: ['Ground', 'Bug', 'Rock'], tool: 'Shovel', minLv: 8,
    need: 'A Ground, Bug or Rock creature at Lv 8 or higher could dig here, or a Shovel from the forge.' },
  light: { name: 'LIGHT', types: ['Fire', 'Electric'], tool: 'Glow Lamp', minLv: 8,
    need: 'A Fire or Electric creature at Lv 8 or higher could light the way, or a Glow Lamp from the forge.' },
};
// Who can do it: { creature } from the party first, then { tool }; null when nobody can.
G.fieldHelper = function (kind) {
  const F = FIELD[kind], S = G.state; if (!F || !S) return null;
  const c = S.party.find(c => c.hp > 0 && c.lvl >= F.minLv && (G.SPECIES[c.id].types || []).some(t => F.types.includes(t)));
  if (c) return { creature: c, name: G.name(c) };
  for (const t of [F.tool].concat(F.tools || [])) if (G.inv && G.inv.count(t) > 0) return { tool: t, name: 'your ' + t };
  return null;
};

// ---- Spots -------------------------------------------------------------------------------------------------------------------
// Nooks: a = where you stand, b = the obstacle, c = the middle of the 3x3 hidden nook (with a chest). Dig spots: at.
const SPOTS = G.FIELD_SPOTS = [
  { id: 'sb_ledge', map: 'stonebridge', kind: 'climb', a: [41, 34], b: [40, 34], c: [38, 34], reward: { items: { 'Revive': 2, 'Iron Ingot': 3 } }, text: 'a hidden ledge by the river' },
  { id: 'cp_ledge', map: 'cloudpeak', kind: 'climb', a: [8, 12], b: [8, 11], c: [8, 9], reward: { items: { 'Mythic Orb': 1, 'Crystal Shard': 3 }, money: 1500 }, text: 'a high ledge on the mountain' },
  { id: 'bl_ledge', map: 'badlands', kind: 'climb', a: [13, 14], b: [13, 13], c: [13, 11], reward: { items: { 'Iron Ingot': 4, 'Revive': 2 }, money: 1200 }, text: 'a mesa top in the Badlands' },
  { id: 'sm_hollow', map: 'sunmeadow', kind: 'light', a: [12, 37], b: [12, 36], c: [12, 34], reward: { items: { 'Pulse Orb': 3, 'Honey': 3 } }, text: 'a dark thicket in the meadow' },
  { id: 'eg_hollow', map: 'evergreen', kind: 'light', a: [34, 9], b: [33, 9], c: [31, 9], reward: { items: { 'Mythic Orb': 1, 'Full Heal': 3 }, money: 800 }, text: 'a black hollow among the old trees' },
  { id: 'cr_sanctum', map: 'cave_hollow_ruins', kind: 'light', a: [34, 14], b: [35, 14], c: [37, 14], reward: { items: { 'Mythic Orb': 1, 'Revive': 2 }, money: 1500 }, text: 'the hidden sanctum behind the east wall' },
  { id: 'cl_rootway', map: 'cave_living_grotto', kind: 'light', a: [9, 12], b: [8, 12], c: [6, 12], reward: { items: { 'Glowcap Spores': 3, 'Full Heal': 2 } }, text: 'an old rootway under the grotto' },
  { id: 'sm_dig', map: 'sunmeadow', kind: 'dig', at: [27, 40], reward: { items: { 'Copper Ore': 4 } } },
  { id: 'lr_dig', map: 'lanternrest', kind: 'dig', at: [14, 26], reward: { items: { 'Potion': 3 }, money: 300 } },
  { id: 'sb_dig', map: 'stonebridge', kind: 'dig', at: [31, 31], reward: { items: { 'Iron Ore': 4, 'Coal': 2 } } },
  { id: 'rd_dig', map: 'ridge', kind: 'dig', at: [23, 24], reward: { items: { 'Crystal Shard': 2 } } },
  { id: 'sh_dig', map: 'shore', kind: 'dig', at: [41, 18], reward: { items: { 'Pearl': 1 }, money: 600 } },
  { id: 'mw_dig', map: 'mirewood', kind: 'dig', at: [29, 44], reward: { items: { 'Clay': 4, 'Glowcap': 2 } } },
  { id: 'wh_dig', map: 'whispering', kind: 'dig', at: [32, 28], reward: { items: { 'Revive': 1 }, money: 900 } },
  { id: 'sr_dig', map: 'sandsreach', kind: 'dig', at: [32, 14], reward: { items: { 'Stone Orb': 3, 'Glass': 1 } } },
];
const nooks = SPOTS.filter(s => s.c);
const flag = (s, k) => !!(G.state && G.state.flags['fx_' + s.id + (k || '')]);
// Carve each nook: the obstacle tile and the 3x3 become the floor you stand on (the obstacle stays blocked in m.block).
for (const s of nooks) {
  const m = G.MAPS[s.map]; if (!m) continue;
  const floor = m.t[s.a[1]][s.a[0]];
  s.floor = floor; s.d = VEC.findIndex(([dx, dy]) => s.a[0] + dx === s.b[0] && s.a[1] + dy === s.b[1]);
  m.t[s.b[1]][s.b[0]] = floor;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) m.t[s.c[1] + j][s.c[0] + i] = floor;
}
const spotsOn = id => SPOTS.filter(s => s.map === id);
// The obstacle stays solid (climbing hops over it; light clears it for good); the chest is solid until opened... and after.
function block(m) {
  m.block = m.block || new Set();
  for (const s of spotsOn(m.id)) if (s.c) {
    const k = s.b[0] + ',' + s.b[1];
    if (s.kind === 'light' && flag(s)) m.block.delete(k); else m.block.add(k);
    m.block.add(s.c[0] + ',' + s.c[1]);
  }
}
G.hooks.load.push(m => block(m));

function give(s) {
  return G.grantOnce('fx:' + s.id, S => {
    const R = s.reward || {}; if (R.money) S.money += R.money;
    for (const [k, n] of Object.entries(R.items || {})) S.bag[k] = (S.bag[k] || 0) + n;
    S.flags['fx_' + s.id + (s.c ? '_chest' : '')] = true;
    G.rep.add(G.regionOf(s.map), 3);
  });
}
const rewardLine = R => Object.entries(R.items || {}).map(([k, n]) => `${n} ${k}`).concat(R.money ? ['$' + R.money.toLocaleString('en-US')] : []).join(', ');

// What's at a tile: { s, part: 'obstacle' | 'chest' | 'dig' }.
function at(m, x, y) {
  for (const s of spotsOn(m.id)) {
    if (s.c && s.b[0] === x && s.b[1] === y) return { s, part: 'obstacle' };
    if (s.c && s.c[0] === x && s.c[1] === y) return { s, part: 'chest' };
    if (s.at && s.at[0] === x && s.at[1] === y) return { s, part: 'dig' };
  }
  return null;
}
G.fieldAt = (x, y) => G.world.map ? at(G.world.map, x, y) : null;

G.hooks.prompt.push((tx, ty) => {
  const h = G.world.map && at(G.world.map, tx, ty); if (!h) return null;
  if (h.part === 'chest') return flag(h.s, '_chest') ? null : 'Open';
  if (h.part === 'dig') return flag(h.s) ? null : G.fieldHelper('dig') ? 'Dig' : 'Look';
  if (h.s.kind === 'light') return flag(h.s) ? null : G.fieldHelper('light') ? 'Light' : 'Look';
  return G.fieldHelper('climb') ? 'Climb' : 'Look';
});

const says = l => G.worldApi.says(l);
G.hooks.interact.push(async (tx, ty) => {
  const m = G.world.map, h = m && at(m, tx, ty); if (!h) return false;
  const s = h.s, F = FIELD[s.kind], p = G.world.p;
  if (h.part === 'chest') {
    if (flag(s, '_chest')) { await says('An empty chest. You already took what was inside.'); return true; }
    G.audio.sfx('levelup'); give(s);
    await says([`You found a hidden chest on ${s.text}!`, `Inside: ${rewardLine(s.reward)}.`]);
    return true;
  }
  if (h.part === 'dig') {
    if (flag(s)) return false;
    const who = G.fieldHelper('dig');
    if (!who) { await says(['The soil here is soft and freshly turned, as if something is buried underneath.', F.need]); return true; }
    G.audio.sfx('bump'); await G.wait(10); G.audio.sfx('levelup'); give(s); G.state.flags['fx_' + s.id] = true;
    await says([`${who.creature ? who.name + ' dug' : 'You dug with ' + who.name} into the soft soil...`, `Something was buried here: ${rewardLine(s.reward)}!`]);
    return true;
  }
  if (s.kind === 'light') {
    if (flag(s)) return false;
    const who = G.fieldHelper('light');
    if (!who) { await says(['A gap in the undergrowth, so dark you can\'t see a thing. Something glints far inside.', F.need]); return true; }
    G.audio.sfx('select'); G.state.flags['fx_' + s.id] = true; block(m);
    await says([`${who.creature ? who.name + ' lit up the darkness' : 'You held up ' + who.name}!`, 'A hidden hollow opens up beyond the gap.']);
    return true;
  }
  // climb: hop over the rock face, either way
  const who = G.fieldHelper('climb');
  if (!who) { await says(['A steep rock face with good handholds. There seems to be a ledge up there.', F.need]); return true; }
  const [dx, dy] = VEC[p.dir], nx = tx + dx, ny = ty + dy;
  if (!G.worldApi.canWalk || !G.worldApi.canWalk(nx, ny)) return false;
  G.audio.sfx('select');
  await says(who.creature ? `${who.name} helped you climb!` : `You climbed up with ${who.name}.`);
  await G.fadeTo(.6, 6, '#fff'); G.placePlayer(nx, ny, p.dir); G.state.flags['fx_' + s.id] = true; await G.fadeTo(0, 8);
  return true;
});

// ---- Drawing -----------------------------------------------------------------------------------------------------------------
const TAU = Math.PI * 2;
function rockFace(c, x, y, t) {
  c.fillStyle = '#8a7a6a'; c.beginPath(); c.moveTo(x + 1, y + 16); c.lineTo(x + 2, y + 3); c.quadraticCurveTo(x + 8, y - 3, x + 14, y + 3); c.lineTo(x + 15, y + 16); c.closePath(); c.fill();
  c.fillStyle = '#a8988a'; c.beginPath(); c.moveTo(x + 3, y + 15); c.lineTo(x + 4, y + 4); c.quadraticCurveTo(x + 8, y, x + 12, y + 4); c.lineTo(x + 9, y + 15); c.closePath(); c.fill();
  c.fillStyle = '#5a4a3e'; for (const [hx, hy] of [[5, 6], [10, 8], [6, 11], [11, 13]]) { c.beginPath(); c.ellipse(x + hx, y + hy, 1.4, .9, 0, 0, TAU); c.fill(); }
  c.strokeStyle = '#e8c880'; c.lineWidth = .9; c.beginPath(); c.moveTo(x + 8, y + 1); c.quadraticCurveTo(x + 9.5 + Math.sin(t / 20) * .6, y + 8, x + 8, y + 15); c.stroke();
}
function darkGap(c, x, y, t) {
  const g = c.createRadialGradient(x + 8, y + 9, 1, x + 8, y + 9, 10); g.addColorStop(0, '#05030a'); g.addColorStop(.7, 'rgba(10,6,24,.92)'); g.addColorStop(1, 'rgba(20,10,40,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(x + 8, y + 9, 9, 8.5, 0, 0, TAU); c.fill();
  const tw = .5 + .5 * Math.sin(t / 25); c.fillStyle = `rgba(255,230,140,${.4 + .5 * tw})`; c.beginPath(); c.arc(x + 9.5, y + 8, .9, 0, TAU); c.fill();
}
function chest(c, x, y, open) {
  c.fillStyle = 'rgba(40,30,20,.25)'; c.beginPath(); c.ellipse(x + 8, y + 14, 6.5, 2, 0, 0, TAU); c.fill();
  c.fillStyle = '#9a5a2a'; c.fillRect(x + 2.5, y + 6, 11, 8); c.fillStyle = '#c07a3a'; c.fillRect(x + 3, y + 6.5, 10, 7);
  c.fillStyle = open ? '#5a3418' : '#b06a30'; c.beginPath(); c.moveTo(x + 2.5, y + 7); c.quadraticCurveTo(x + 8, open ? y + 4.5 : y + 1.5, x + 13.5, y + 7); c.closePath(); c.fill();
  c.fillStyle = '#ffd860'; c.fillRect(x + 7, y + 7.5, 2, 2.5); c.fillRect(x + 2.5, y + 9, 11, .8);
}
function soil(c, x, y, t, sense) {
  c.fillStyle = 'rgba(60,40,20,.25)'; c.beginPath(); c.ellipse(x + 8, y + 12, 7, 2.6, 0, 0, TAU); c.fill();
  c.fillStyle = '#7a4e2a'; c.beginPath(); c.ellipse(x + 8, y + 10, 6.8, 4.2, 0, 0, TAU); c.fill();
  c.fillStyle = '#9a6436'; c.beginPath(); c.ellipse(x + 8, y + 9.2, 5.6, 3.2, 0, 0, TAU); c.fill();
  c.fillStyle = '#b8804a'; for (const [a, b] of [[5, 8.5], [9, 7.6], [11.5, 9.6], [7, 10.6], [8.5, 9]]) { c.beginPath(); c.arc(x + a, y + b, 1.05, 0, TAU); c.fill(); }
  c.strokeStyle = '#5a3a1e'; c.lineWidth = .6; c.beginPath(); c.moveTo(x + 4, y + 11); c.lineTo(x + 6, y + 9.5); c.moveTo(x + 10, y + 11.5); c.lineTo(x + 12, y + 10); c.stroke();
  if (sense) { const k = (t % 60) / 60; c.fillStyle = `rgba(255,250,200,${1 - k})`; c.beginPath(); c.arc(x + 8, y + 6 - k * 4, 1.1, 0, TAU); c.fill(); }
}
G.hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map; if (!m) return;
  for (const s of spotsOn(m.id)) {
    if (s.c) {
      const bx = s.b[0] * 16 - cx, by = s.b[1] * 16 - cy;
      if (s.kind === 'climb') items.push({ y: s.b[1] * 16 + 15, draw: c => rockFace(c, bx, by, t) });
      else if (!flag(s)) items.push({ y: s.b[1] * 16 + 15, draw: c => darkGap(c, bx, by, t) });
      const kx = s.c[0] * 16 - cx, ky = s.c[1] * 16 - cy, op = flag(s, '_chest');
      items.push({ y: s.c[1] * 16 + 14, draw: c => chest(c, kx, ky, op) });
    } else if (!flag(s)) {
      const x = s.at[0] * 16 - cx, y = s.at[1] * 16 - cy, sense = !!G.fieldHelper('dig');
      items.push({ y: s.at[1] * 16 + 1, draw: c => soil(c, x, y, t, sense) });
    }
  }
});
})();
