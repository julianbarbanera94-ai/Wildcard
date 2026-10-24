// MOONLIT ISLAND (south): a late-game mystic island of glowing violet trees, a moonlit crystal grove and a ferry pier.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, npc, sign, trainer, warp, wild, DOWN, UP, LEFT, RIGHT } = G.mk;

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
  }
}
function path(m, pts, ch = 'p', w = 2) {
  for (let i = 0; i < pts.length - 1; i++) {
    let [x, y] = pts[i]; const [tx, ty] = pts[i + 1];
    rect(m, x, y, w, w, ch);
    while (x !== tx) { x += Math.sign(tx - x); rect(m, x, y, w, w, ch); }
    while (y !== ty) { y += Math.sign(ty - y); rect(m, x, y, w, w, ch); }
  }
}
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id, item: name, ball: true }, qty ? { qty } : {}));

// Make sure every person, item and sign can be reached on foot: cut a trail of grass through any trees in the way.
function ensureReach(m, sx, sy) {
  const solid = (x, y) => G.TILES[m.t[y][x]].solid, key = (x, y) => y * m.w + x;
  for (const o of m.npcs.concat(m.objs)) if (solid(o.x, o.y)) set(m, o.x, o.y, 'g');
  const flood = () => { const seen = new Set([key(sx, sy)]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen.has(key(nx, ny))) continue; const blocked = solid(nx, ny) || m.objs.some(b => b.ball && b.x === nx && b.y === ny) || m.npcs.some(n => !n.trainer && n.x === nx && n.y === ny); if (!blocked) { seen.add(key(nx, ny)); q.push([nx, ny]); } } } return seen; };
  for (const o of m.npcs.concat(m.objs)) {
    let seen = flood();
    if ([[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(key(o.x + dx, o.y + dy)))) continue;
    // walk straight towards the start until we meet reachable ground, clearing as we go
    let x = o.x, y = o.y;
    for (let i = 0; i < 200 && !seen.has(key(x, y)); i++) {
      if (Math.abs(sx - x) > Math.abs(sy - y)) x += Math.sign(sx - x); else y += Math.sign(sy - y);
      if (m.t[y][x] === 'w' || m.t[y][x] === 'i') continue;
      if (solid(x, y)) set(m, x, y, 'g');
    }
  }
}

const m = newMap('moonlit', 'MOONLIT ISLAND', 44, 38, 'w', { music: 'cave', biome: 'mystic',
  enc: wild(['Psychic', 'Ghost', 'Fairy', 'Dragon'], 45, 52, { pick: 8 }) });
m.landing = { x: 21, y: 24 };

// -- the island: a sandy rim, a meadow inside, a wood of glowing trees --
blob(m, 22, 16, 19, 14.5, 'y', null, .14);
blob(m, 22, 16, 17.2, 12.6, 'g', ['y'], .16);
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.t[y][x] === 'g') {
  const h = hash(x, y);
  if (h < .36) set(m, x, y, hash(y, x) < .35 ? 'n' : '#');
  else if (h < .42) set(m, x, y, 'u');
  else if (h < .47) set(m, x, y, 'f');
}
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.t[y][x] === 'y' && hash(x, y) < .06) set(m, x, y, 'r');

// -- tall grass (Psychic, Ghost, Fairy, Dragon): three glades --
const glade = (cx, cy, rx, ry) => { blob(m, cx, cy, rx, ry, 'g', ['#', 'n', 'u', 'f', 'g', 'y'], .1); blob(m, cx, cy, rx - 1.2, ry - 1, 'G', ['g'], .2); };
glade(9, 18, 5, 4.5); glade(35, 17, 5.5, 4.5); glade(22, 5, 7, 2.6);

// -- the moonlit crystal grove at the heart of the island --
blob(m, 22, 13, 8.5, 5.5, 'g', null, .1);
blob(m, 22, 13, 3.6, 2.4, 'w', null, .1);
for (let a = 0; a < 6.28; a += .33) { const x = Math.round(22 + Math.cos(a) * 6.4), y = Math.round(13 + Math.sin(a) * 4.4); if (m.t[y][x] !== 'w') set(m, x, y, hash(x, y) < .62 ? 'i' : 'f'); }
scatter(m, 'i', [[21, 13], [23, 12], [14, 13], [30, 13], [22, 7], [22, 19]]);
rect(m, 19, 9, 7, 1, 'f'); scatter(m, 'O', [[20, 9], [24, 9]]); set(m, 22, 9, 'L'); rect(m, 21, 8, 3, 1, 'g'); set(m, 22, 8, 'i');
m.objs.push({ x: 22, y: 9, brazier: true, lit: true, fn: () => G.story.says(['A pale violet flame burns without fuel, and the grove hums around it.', 'The moon is always a little brighter here.']) });
scatter(m, 'l', [[18, 16], [26, 16], [17, 10], [27, 10]]);

// -- paths: the pier road north, a ring round the grove, and spurs to each glade --
rect(m, 21, 30, 2, 6, 'z');                                   // the pier
path(m, [[21, 29], [21, 20], [16, 20], [16, 14], [16, 19]], 'p', 2);   // up to the west bend
path(m, [[21, 20], [28, 20], [28, 14]], 'p', 2);
path(m, [[16, 17], [10, 17], [10, 20]], 'p', 2);              // to the west glade
path(m, [[28, 17], [34, 17], [34, 20]], 'p', 2);              // to the east glade
path(m, [[16, 14], [16, 8], [20, 8]], 'p', 2);                // to the northern altar
path(m, [[28, 14], [28, 8], [24, 8]], 'p', 2);
path(m, [[20, 7], [22, 6]], 'p', 2);
rect(m, 21, 24, 2, 2, 'p'); rect(m, 22, 6, 2, 2, 'p');
rect(m, 21, 28, 2, 2, 'y');
// keep the landing and the pier road free of grass/trees
rect(m, 20, 21, 4, 6, 'p'); rect(m, 21, 26, 2, 4, 'p');
// a hidden nook in the north-east, reached through a gap in the trees
blob(m, 36, 7, 3, 2.2, 'g', null, .1); rect(m, 33, 9, 2, 3, 'g'); rect(m, 34, 12, 2, 3, 'g');
scatter(m, 'i', [[34, 6], [38, 7], [36, 5]]);
// build clearings (flat grass 6x6)
rect(m, 4, 22, 6, 6, 'g'); rect(m, 33, 23, 6, 6, 'g');

sign(m, 23, 26, 'MOONLIT ISLAND\nThe wild things here are old, strong and not shy. Be ready.');
sign(m, 18, 8, 'MOONLIT GROVE\nThe crystals sing to Wardens who listen.');
item(m, 22, 10, 'ml_grove1', 'Mythic Orb');
item(m, 36, 7, 'ml_nook', 'Star Treat');
item(m, 12, 5, 'ml_rev', 'Revive', 2);
item(m, 5, 16, 'ml_shard', 'Crystal Shard', 2);
item(m, 38, 22, 'ml_void', 'Void Orb', 3);
item(m, 20, 27, 'ml_sp', 'Super Potion', 2);

trainer(m, 'moonlit_vesper', 21, 17, DOWN, 'kade', { name: 'LUNA', cls: 'MOON MYSTIC', sight: 4, team: [[92, 48], [75, 49], [24, 48], [107, 50]], pre: 'The moon told me a Warden would come.', win: 'The moon was right.', post: 'The grove is north. Listen carefully.', prize: 90 });
trainer(m, 'moonlit_thorne', 12, 14, RIGHT, 'elder', { name: 'THORNE', cls: 'DRAGON TAMER', sight: 5, team: [[102, 49], [116, 50], [115, 49], [81, 51]], pre: 'Dragons roost on moonlit islands. So do I.', win: 'You have a dragon heart.', post: 'My dragons love the crystals.', prize: 96 });
trainer(m, 'moonlit_ivy', 31, 20, LEFT, 'girl', { name: 'IVY', cls: 'FAIRY QUEEN', sight: 4, team: [[131, 48], [65, 49], [84, 50], [45, 49]], pre: 'Dance with me, brave Warden!', win: 'What a lovely finish.', post: 'The glow of the grass pleases the fairies.', prize: 90 });
trainer(m, 'moonlit_grim', 28, 6, DOWN, 'hiker', { name: 'GRIM', cls: 'GHOST HUNTER', sight: 5, team: [[96, 50], [108, 50], [74, 49], [151, 51]], pre: 'Do you feel the chill? Good. Then you will understand.', win: 'The chill breaks.', post: 'The Wildcard is not the only legend here.', prize: 94 });
trainer(m, 'moonlit_noa', 35, 26, UP, 'lass', { name: 'NOA', cls: 'SEER', sight: 4, team: [[100, 50], [72, 51], [64, 50], [91, 52]], pre: 'I saw you coming. I saw how this goes, too.', win: 'Unexpected! Even to a seer.', post: 'Not everything is written.', prize: 100 });

m.npcs.push({ x: 22, y: 34, dir: DOWN, style: { hair: '#c0c0d8', skin: '#e8c098', shirt: '#403080', pants: '#282048', hat: '#e8e8f4' }, still: true, talk: () => G.ferry ? G.ferry('moonlit') : G.story.says('The ferry is not running yet.') });
m.dock = { x: 21, y: 34 };
npc(m, 25, 24, LEFT, 'elder', ['KEEPER ULA: I tend the grove. The island has asked me not to say more.', 'Stay on the paths if the grass looks hungry.'], { still: true });
npc(m, 18, 22, RIGHT, 'kid', ['I came on the ferry to see the glowing trees. Then they glowed back.'], { roam: 1 });
npc(m, 10, 10, DOWN, 'old', ['Fireflies live here all year. They never leave.'], { roam: 1 });
ensureReach(m, 21, 24);
const fl = (x, y) => { if (G.TILES[m.t[y][x]].solid) set(m, x, y, 'g'); };
m.npcs.forEach(n => fl(n.x, n.y)); m.objs.forEach(o => fl(o.x, o.y));
m.labels = [{ x: 22, y: 31, text: 'MOONLIT PIER', style: 'home' }];
})();
