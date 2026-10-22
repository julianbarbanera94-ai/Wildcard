// WHISPERING WOODS (south): glowing blue and violet woods with a crystal pond, mushroom rings and a hidden shrine.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, warp, npc, sign, trainer, edgeExit, gate, wild, DOWN, UP, LEFT, RIGHT } = G.mk;

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

const m = newMap('whispering', 'WHISPERING WOODS', 64, 48, 'g', { music: 'route', biome: 'mystic', bg: 'grass',
  enc: wild(['Fairy', 'Ghost', 'Psychic', 'Bug'], 16, 22, { pick: 8, only: [24, 44, 73] }) });
m.landing = { x: 33, y: 22 };

// -- the forest: dense glowing trees everywhere, thinned out into clearings below --
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
  const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y), h = hash(x, y);
  if (d < 2) set(m, x, y, hash(y, x) < .4 ? 'n' : '#');
  else if (h < .5 - Math.min(d, 6) * .02) set(m, x, y, hash(y, x) < .35 ? 'n' : '#');
  else if (h < .56) set(m, x, y, 'u');
  else if (h < .6) set(m, x, y, 'f');
}
// open glades: meadow floor in the middle band
const glade = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j; if (hash(X, Y) > .06 || i % (w - 1) === 0 && j % (h - 1) === 0) set(m, X, Y, 'g'); } };
rect(m, 2, 17, 60, 17, 'g');
for (let y = 17; y < 34; y++) for (let x = 2; x < 62; x++) if (hash(x, y) < .1) set(m, x, y, hash(y, x) < .5 ? '#' : 'u');
glade(24, 4, 20, 12); glade(2, 36, 18, 10); glade(24, 36, 14, 10); glade(46, 4, 14, 11); glade(6, 4, 14, 11);

// -- tall grass patches (kept off the routes) --
blob(m, 16, 30, 7, 3, 'G', ['g', '#', 'u', 'n', 'f'], .2);
blob(m, 38, 10, 7, 3.5, 'G', ['g', '#', 'u', 'n', 'f'], .2);
blob(m, 54, 10, 5, 3.5, 'G', ['g', '#', 'u', 'n', 'f'], .2);
blob(m, 28, 40, 5, 3, 'G', ['g', '#', 'u', 'n', 'f'], .2);
blob(m, 56, 30, 4, 3.5, 'G', ['g', '#', 'u', 'n', 'f'], .2);
blob(m, 22, 11, 4, 2.5, 'G', ['g', '#', 'u', 'n', 'f'], .2);
blob(m, 8, 41, 5, 3, 'G', ['g', '#', 'u', 'n', 'f'], .2);

// -- the crystal pond (south-east) --
blob(m, 48, 38, 8, 5, 'g', null, .12);
blob(m, 48, 38, 6.5, 3.8, 'w', null, .1);
blob(m, 48, 38, 1.8, 1.2, 'g', null, 0); scatter(m, 'i', [[48, 38], [47, 37]]);
for (let a = 0; a < 6.28; a += .38) { const x = Math.round(48 + Math.cos(a) * 8.2), y = Math.round(38 + Math.sin(a) * 5.4); if (m.t[y] && m.t[y][x] !== 'w') set(m, x, y, hash(x, y) < .6 ? 'i' : 'f'); }
scatter(m, 'i', [[41, 36], [55, 40], [45, 43], [52, 33], [40, 41]]);
scatter(m, 'f', [[42, 40], [54, 35], [49, 44], [50, 33], [44, 33]]);

// -- the routes: west to east, with a branch north --
const R = (pts) => path(m, pts, 'p', 2);
R([[0, 24], [8, 24], [8, 28], [16, 28], [16, 24], [24, 24], [24, 20], [32, 20], [32, 26], [40, 26], [40, 22], [48, 22], [48, 26], [56, 26], [56, 24], [62, 24]]);
R([[32, 0], [32, 6], [28, 6], [28, 12], [34, 12], [34, 16], [32, 16], [32, 20]]);
R([[40, 26], [44, 26], [44, 32]]);               // down to the pond
for (let k = 0; k < 2; k++) { set(m, 0, 24 + k, 'p'); set(m, 63, 24 + k, 'p'); set(m, 32 + k, 0, 'p'); }
// keep the main routes free of grass: re-cut a little verge of flowers along the road
const verge = (pts) => { for (const [x, y] of pts) if (m.t[y] && m.t[y][x] === 'G') set(m, x, y, 'f'); };

// -- the hidden shrine (north-west): a ring of crystals behind a screen of trees --
rect(m, 5, 4, 13, 10, 'g');
for (let y = 3; y <= 14; y++) for (let x = 4; x <= 18; x++) if (y === 3 || y === 14 || x === 4 || x === 18) set(m, x, y, hash(x, y) < .5 ? '#' : 'n');
rect(m, 11, 14, 2, 4, 'g');                         // the unmarked way in: a gap in the trees, then a faint trail
rect(m, 11, 17, 2, 6, 'g'); rect(m, 11, 22, 2, 2, 'g');
scatter(m, '#', [[10, 19], [13, 19], [10, 21], [13, 21], [10, 16], [13, 16]]); scatter(m, 'u', [[11, 18], [12, 20]]);
scatter(m, 'i', [[7, 5], [8, 6], [16, 5], [15, 6], [6, 9], [17, 9], [7, 12], [16, 12], [9, 4], [14, 4]]);
rect(m, 9, 7, 5, 4, 'f'); scatter(m, 'O', [[10, 8], [12, 8]]); set(m, 11, 7, 'L');
scatter(m, 'l', [[9, 12], [14, 12], [8, 7], [15, 7]]);
set(m, 11, 9, 'g'); set(m, 11, 10, 'g'); set(m, 11, 11, 'g'); set(m, 12, 11, 'g'); set(m, 11, 12, 'g'); set(m, 12, 12, 'g');
m.objs.push({ x: 11, y: 7, brazier: true, lit: true, fn: () => G.story.says(['A cold blue flame dances on the old stone. It makes no heat and no smoke.', 'A carving reads: "Those who listen to the wood are never lost in it."']) });
item(m, 8, 10, 'wh_shrine1', 'Void Orb', 2);
item(m, 15, 10, 'wh_shrine2', 'Revive');
npc(m, 12, 10, LEFT, 'elder', ['SHRINE KEEPER: Hush, Warden. You found the Whisper Shrine. Few do.', 'The crystals here hum when a Warden with a true bond walks by. Yours is humming right now.'], { still: true });

// -- mushroom rings: a ring of bushes around a bed of flowers, each with a gap --
function ring(cx, cy, gap) {
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
    const edge = Math.max(Math.abs(i), Math.abs(j)) === 2, X = cx + i, Y = cy + j;
    if (edge) set(m, X, Y, (i === gap[0] && j === gap[1]) ? 'g' : 'u'); else set(m, X, Y, 'f');
  }
}
ring(21, 31, [0, -2]); ring(49, 12, [0, 2]); ring(36, 40, [-2, 0]); ring(55, 46 - 4, [0, -2]); ring(7, 31, [2, 0]);
item(m, 21, 31, 'wh_ring1', 'Super Potion');
item(m, 36, 40, 'wh_ring2', 'Terra Orb', 2);

// -- the clearings for building: two flat 6x6+ areas --
rect(m, 38, 28, 6, 6, 'g'); rect(m, 4, 36, 7, 6, 'g');
for (const [x, y, w, h] of [[38, 28, 6, 6], [4, 36, 7, 6]]) for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if ((j < 0 || j === h || i < 0 || i === w) && m.t[y + j][x + i] === 'G') set(m, x + i, y + j, 'g');

// -- fireflies' glade, signs and items --
sign(m, 3, 26, 'WHISPERING WOODS\nThe trees murmur in the dark. Stay on the path and they will not mind you.');
sign(m, 33, 18, 'CROSSROADS\nNorth: Sandsreach Desert (2 badges). East: Cobalt City (4 badges). West: Stonebridge.');
sign(m, 43, 31, 'CRYSTAL POND\nThe water glows when the moon is high.');
item(m, 44, 34, 'wh_pond', 'Crystal Shard');
item(m, 58, 5, 'wh_potion', 'Potion');
item(m, 3, 44, 'wh_pearl', 'Super Potion');

// -- trainers --
trainer(m, 'whispering_luma', 20, 24, DOWN, 'girl', { name: 'LUMA', cls: 'MYSTIC', sight: 4, team: [[44, 16], [24, 17]], pre: 'Did you hear the trees whisper about you?', win: 'They said you would win.', post: 'The pond glows brightest to the south-east.', prize: 60 });
trainer(m, 'whispering_orrick', 30, 8, LEFT, 'bug', { name: 'ORRICK', cls: 'BUG CATCHER', sight: 4, team: [[51, 17], [61, 18], [29, 17]], pre: 'Glowing bugs are the best bugs!', win: 'My lights went out!', post: 'Silkling spin the glowing thread, you know.', prize: 60 });
trainer(m, 'whispering_sable', 46, 22, DOWN, 'kade', { name: 'SABLE', cls: 'GHOST TAMER', sight: 4, team: [[23, 19], [73, 19], [74, 20]], pre: 'Boo. Did that scare you? Battle me and find out.', win: 'Not scary enough, apparently.', post: 'The fog is lovely here after dark.', prize: 64 });
trainer(m, 'whispering_pim', 36, 28, UP, 'lass', { name: 'PIM', cls: 'DREAMER', sight: 4, team: [[24, 20], [107, 21], [71, 20]], pre: 'Zzz... huh? Oh, a battle! Let me wake up.', win: 'I should have stayed asleep.', post: 'Dreamow stays up all day and sleeps all night. Like me.', prize: 66 });
trainer(m, 'whispering_wren', 18, 36, UP, 'old', { name: 'ELM', cls: 'HERMIT', sight: 5, team: [[50, 20], [65, 21], [72, 22]], pre: 'I have lived in these woods for forty years. Let me show you what they taught me.', win: 'The woods chose you.', post: 'There is a shrine in the north-west. Look for the faint trail.', prize: 70 });
trainer(m, 'whispering_dax', 52, 26, LEFT, 'camper', { name: 'DAX', cls: 'RANGER', sight: 4, team: [[91, 20], [62, 21], [45, 21]], pre: 'Halt, traveller. East of here lies Cobalt City, and I test every Warden who passes.', win: 'You are cleared to pass.', post: 'You will need four badges to go on to Cobalt City.', prize: 66 });

// -- travellers --
npc(m, 5, 22, RIGHT, 'hiker', ['The woods are bluer here than anywhere else in Aurelis. Nobody knows why.', 'Wild creatures glow at night. I mean that literally.'], { roam: 1 });
npc(m, 30, 4, DOWN, 'old', ['This road leads north to the sandy lands of Sandsreach.', 'The ranger will not let you through without two Arena Badges. Rules are rules.'], { still: true });
npc(m, 60, 22, LEFT, 'kid', ['East is Cobalt City! I saw towers from a tree. A very tall tree.'], { roam: 1 });
npc(m, 46, 30, DOWN, 'girl', ['The crystal pond sings when you step close. Try it!'], { roam: 1 });

// -- exits --
edgeExit(m, 'W', 24, 'stonebridge', 54, 22);
edgeExit(m, 'E', 24, 'cobalt', 1, 30, gate(4, 'COBALT CITY'));
edgeExit(m, 'N', 32, 'sandsreach', 34, 50, gate(2, 'SANDSREACH DESERT'));
})();
