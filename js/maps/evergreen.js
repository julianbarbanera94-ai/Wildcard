// EVERGREEN FOREST (west region): a deep old forest around the giant Elder Oak, with a woodland pond and hidden glades.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, warp, npc, sign, trainer, edgeExit, gate, wild, DOWN, UP, LEFT, RIGHT } = G.mk;

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

const m = newMap('evergreen', 'EVERGREEN FOREST', 60, 52, 'g', { music: 'route', biome: 'forest', bg: 'grass' });
m.landing = { x: 30, y: 30 };

// ---- The forest: dense mixed trees, thicker towards the edges ----
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
  const e = Math.min(x, y, m.w - 1 - x, m.h - 1 - y), r = hash(x, y), r2 = hash(y + 7, x + 3);
  let ch = 'g';
  if (e <= 1) ch = r2 < .4 ? 'n' : '#';
  else if (r < .64 - (e < 5 ? 0 : 0.02)) ch = r2 < .42 ? 'n' : '#';
  else if (r < .70) ch = 'u';
  else if (r < .74) ch = 'f';
  else if (r < .76) ch = 'd';
  set(m, x, y, ch);
}
// a clearing, optionally with tall grass inside (kept ringed by plain grass)
const glade = (cx, cy, rx, ry, grass) => { blob(m, cx, cy, rx + 1, ry + 1, 'g'); if (grass) blob(m, cx, cy, rx, ry, 'G', ['g'], .25); };

// ---- Clearings ----
blob(m, 29, 16, 10, 8, 'g', null, .12);                        // the Elder Oak glade
glade(10, 29, 7, 6);                                           // woodland pond
glade(17, 5, 5, 3);                                            // ranger cabin
glade(50, 34, 6, 5);                                           // ranger post
// tall-grass meadows beside the trails
glade(21, 41, 4, 3, true); glade(40, 33, 5, 3, true); glade(45, 19, 5, 3, true); glade(19, 23, 3, 3, true);
glade(53, 44, 4, 3, true); glade(36, 46, 4, 2, true); glade(8, 40, 3, 3, true); glade(38, 9, 3, 2, true);

// ---- Trails (2 wide) ----
path(m, [[30, 50], [30, 44], [26, 44], [26, 36], [30, 36], [30, 22]]);   // from Sunhaven to the Oak
path(m, [[46, 50], [46, 40], [38, 40], [38, 36], [30, 36]]);             // from Sunmeadow
path(m, [[30, 24], [40, 24], [40, 27], [50, 27], [50, 24], [58, 24]]);   // east to Cloudpeak
path(m, [[50, 27], [50, 33]]);                                           // to the ranger post
path(m, [[22, 16], [12, 16], [12, 24]]);                                 // west to the pond
path(m, [[12, 16], [12, 8], [20, 6]]);                                   // to the ranger cabin
path(m, [[38, 14], [46, 14], [46, 8]]);                                  // north-east
path(m, [[26, 40], [14, 40], [14, 47]]);                                 // south-west
path(m, [[38, 16], [38, 11]], 'p', 2);
// the east exit and the two southern exits
rect(m, 58, 24, 2, 2, 'p'); rect(m, 30, 49, 2, 3, 'p'); rect(m, 46, 49, 2, 3, 'p');

// ---- The Elder Oak: a giant tree with a trunk of old stumps and a wide canopy ----
blob(m, 29, 11, 6, 3.4, '#', null, .1);
rect(m, 24, 12, 11, 1, '#'); rect(m, 25, 13, 9, 1, '#');
rect(m, 27, 14, 5, 1, 'n');
rect(m, 28, 15, 3, 2, 'd');                                    // the trunk
scatter(m, 'r', [[27, 16], [31, 16], [26, 15], [32, 15]]);
scatter(m, 'f', [[25, 18], [26, 19], [33, 18], [34, 19], [28, 19], [30, 19], [24, 20], [35, 20]]);
scatter(m, 'u', [[24, 17], [34, 17]]);
sign(m, 33, 21, 'THE ELDER OAK\nThe oldest tree in Aurelis. Wardens say it was a seedling when the first Lantern was lit.');

// ---- Woodland pond (west) with a little island and a log bridge ----
blob(m, 9, 30, 4, 3, 'w', null, .15);
blob(m, 9, 30, 1.2, 1, 'g', null, 0);
for (let y = 24; y <= 31; y++) if (m.t[y][9] === 'w') set(m, 9, y, 'V');
rect(m, 9, 22, 2, 3, 'p');
scatter(m, 'r', [[5, 28], [13, 33], [6, 33]]); scatter(m, 'f', [[13, 27], [14, 29], [5, 31], [7, 35], [11, 35]]);
sign(m, 13, 25, 'WILLOW POND\nThe water is clear and cold. Something shiny glitters on the little island.');

// ---- Ranger cabin (north-west) and ranger post (east) ----
building(m, 15, 2, 5, 'R', -1); scatter(m, 'l', [[14, 5], [21, 5]]); rect(m, 15, 5, 5, 1, 'f'); rect(m, 16, 5, 3, 1, 'g');
sign(m, 21, 7, 'RANGER CABIN\nNo camping beyond this point. Fires are only allowed in the lanterns.');
building(m, 53, 31, 5, 'Q', -1); scatter(m, 'l', [[46, 34], [53, 34], [54, 36]]); rect(m, 53, 34, 5, 1, 'g');
sign(m, 49, 36, 'RANGER POST\nCloudpeak lies east, beyond the great trees. Three Badges needed.');
rect(m, 55, 30, 2, 2, 'f');

// ---- Hidden glades: reached by a one-tile gap through the trees ----
blob(m, 54, 6, 4, 3, 'g', null, .1); scatter(m, 'f', [[52, 5], [53, 5], [55, 7], [56, 5], [54, 8]]);
path(m, [[46, 8], [47, 7], [50, 6]], 'g', 1); set(m, 47, 8, 'g'); rect(m, 46, 8, 2, 1, 'p');
rect(m, 47, 7, 4, 1, 'g'); set(m, 50, 6, 'g'); set(m, 51, 6, 'g');
blob(m, 8, 46, 4, 3, 'g', null, .1); scatter(m, 'f', [[6, 45], [7, 44], [10, 47], [9, 48], [6, 48]]);
path(m, [[14, 47], [12, 47], [10, 46]], 'g', 1); rect(m, 11, 47, 3, 1, 'g'); rect(m, 10, 46, 2, 2, 'g');

// ---- Open building ground (two 6x6 or larger clear lawns) ----
rect(m, 3, 3, 7, 7, 'g'); rect(m, 51, 38, 0, 0, 'g'); rect(m, 52, 45, 6, 5, 'g');
rect(m, 40, 43, 6, 6, 'g');
scatter(m, 'F', [[2, 2], [10, 2], [2, 10], [10, 10]]);
rect(m, 9, 8, 3, 1, 'g');   // a gap linking the lawn to the trail

// ---- Items ----
item(m, 27, 17, 'evergreen_orb', 'Verdant Orb', 2);          // at the foot of the Elder Oak
item(m, 9, 30, 'evergreen_island', 'Super Potion');          // pond island
item(m, 54, 6, 'evergreen_glade1', 'Revive');                // hidden north-east glade
item(m, 8, 46, 'evergreen_glade2', 'Aqua Orb', 2);           // hidden south-west glade
item(m, 52, 36, 'evergreen_potion', 'Potion');               // ranger post
item(m, 21, 38, 'evergreen_heal', 'Full Heal');              // beside the tall grass

// ---- Trainers ----
trainer(m, 'evergreen_bug1', 26, 38, DOWN, 'bug', { name: 'TOBY', cls: 'BUG CATCHER', sight: 4, team: [[18, 14], [29, 15], [51, 15]], pre: 'The forest is crawling with bugs, and I caught them all!', win: 'My bugs scattered...', post: 'Bigger bugs live deeper in.', prize: 840 });
trainer(m, 'evergreen_ranger1', 36, 25, LEFT, 'hiker', { name: 'JUNO', cls: 'RANGER', sight: 5, team: [[7, 16], [38, 16], [40, 17]], pre: 'Halt! Nobody crosses my stretch of trail without a battle.', win: 'You are a worthy trespasser.', post: 'The Oak is just north. Do not carve your initials in it.', prize: 960 });
trainer(m, 'evergreen_camper', 12, 11, DOWN, 'camper', { name: 'WESLEY', cls: 'CAMPER', sight: 4, team: [[49, 16], [10, 17], [35, 17]], pre: 'I pitched my tent here first! Battle for the spot!', win: 'Fine, share the spot.', post: 'The cabin ahead belongs to the rangers.', prize: 1020 });
trainer(m, 'evergreen_lass', 10, 22, DOWN, 'lass', { name: 'FERN', cls: 'PICNICKER', sight: 4, team: [[44, 17], [27, 17], [16, 17], [60, 18]], pre: 'I had a lovely picnic by the pond. Now a lovely battle!', win: 'Oh, my sandwiches.', post: 'The island in the pond hides something nice.', prize: 1080 });
trainer(m, 'evergreen_hiker', 54, 24, LEFT, 'hiker', { name: 'BRUNO', cls: 'HIKER', sight: 5, team: [[11, 19], [17, 19], [66, 19]], pre: 'Climbing Cloudpeak? Prove you can handle the forest first!', win: 'Strong legs, strong team.', post: 'The mountains are much colder. Pack warm.', prize: 1140 });
trainer(m, 'evergreen_ranger2', 51, 31, UP, 'camper', { name: 'ASH', cls: 'HEAD RANGER', sight: 4, team: [[39, 19], [52, 19], [29, 20], [11, 20]], pre: 'I keep the east gate. Show me what you have learned in my forest.', win: 'The forest approves.', post: 'Go on, the gate is open to you.', prize: 1200 });

// ---- Villagers ----
npc(m, 32, 20, LEFT, 'old', ['This is the Elder Oak. It has watched over the forest for a thousand years.', 'Sit a while under it. Your creatures will feel calmer.'], { still: true });
npc(m, 19, 9, DOWN, 'mom', ['I am the cabin cook for the rangers. Everyone here is always hungry.'], { still: true });
npc(m, 35, 43, UP, 'kid', ['I got lost looking for the Elder Oak. Then I found it. Then I got lost again!'], { roam: 2 });
npc(m, 48, 34, DOWN, 'old', ['The rangers watch the gate to Cloudpeak. Only experienced Wardens may pass.', 'Three Badges, they say.'], { still: true });
npc(m, 14, 30, RIGHT, 'girl', ['Some of the glades here are hidden. Look for thin gaps between the trees.'], { still: true });
npc(m, 39, 12, DOWN, 'bug', ['I heard that a glade full of flowers hides in the north-east. The path is only one tile wide!'], { roam: 1 });
npc(m, 20, 44, UP, 'lass', ['South goes back to Sunhaven. The Arena there is run by a Grass-type Leader.'], { roam: 1 });

// ---- Warps ----
edgeExit(m, 'S', 46, 'sunmeadow', 36, 1);
edgeExit(m, 'S', 30, 'sunhaven', 30, 1);
edgeExit(m, 'E', 24, 'cloudpeak', 1, 30, gate(3, 'CLOUDPEAK MOUNTAINS'));

m.labels = [{ x: 17, y: 2, text: 'RANGER CABIN', style: 'home' }, { x: 55, y: 31, text: 'RANGER POST', style: 'home' }];
m.enc = wild(['Grass', 'Bug', 'Normal'], 14, 20, { pick: 9 });
})();
