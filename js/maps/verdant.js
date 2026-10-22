// VERDANT ISLE (west region): a lush jungle island reached by ferry from Driftwood Port, with a hidden waterfall grotto.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, warp, npc, sign, trainer, wild, DOWN, UP, LEFT, RIGHT } = G.mk;

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
const CAPTAIN = { hair: '#9a6a3a', skin: '#c89868', shirt: '#2aa89a', pants: '#304868', hat: '#f4f0e0' };

const m = newMap('verdant', 'VERDANT ISLE', 40, 34, 'w', { music: 'route', biome: 'tropical', bg: 'grass' });
m.landing = { x: 20, y: 22 };

// ---- The island: a sand ring round a jungle heart ----
blob(m, 20, 15, 17.5, 13, 'y', null, .14);
blob(m, 20, 15, 15, 11, 'g', ['y'], .16);
// dense jungle
for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
  if (m.t[y][x] !== 'g') continue;
  const r = hash(x, y), r2 = hash(y + 5, x + 9);
  if (r < .5) set(m, x, y, r2 < .15 ? 'n' : '#'); else if (r < .62) set(m, x, y, 'u'); else if (r < .68) set(m, x, y, 'f');
}
// a few palms and driftwood on the beach
for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) if (m.t[y][x] === 'y') { const r = hash(x + 11, y); if (r < .06) set(m, x, y, '#'); else if (r < .09) set(m, x, y, 'r'); else if (r < .11) set(m, x, y, 'd'); }

// ---- Clearings with jungle tall grass ----
const glade = (cx, cy, rx, ry, grass) => { blob(m, cx, cy, rx + 1, ry + 1, 'g'); if (grass) blob(m, cx, cy, rx, ry, 'G', ['g'], .25); };
glade(10, 10, 3.5, 3, true); glade(30, 20, 3.5, 3, true); glade(11, 22, 3, 2.4, true); glade(20, 8, 4, 2.4, true); glade(31, 10, 2.5, 2, false);
glade(25, 16, 3, 2, false);

// ---- Trails ----
path(m, [[20, 27], [20, 19], [14, 19], [14, 14], [10, 14], [10, 12]]);
path(m, [[20, 19], [28, 19], [28, 14], [24, 14], [24, 10], [20, 10]]);
path(m, [[14, 22], [14, 19]]);
// the pier: boards from the south beach out into the sea
rect(m, 19, 26, 3, 7, 'y'); rect(m, 20, 28, 2, 5, 'z');
rect(m, 20, 27, 2, 2, 'p');
scatter(m, 'l', [[19, 29], [19, 31], [22, 30]]);
m.dock = { x: 20, y: 31 };

// ---- Beach hut by the pier ----
blob(m, 26, 25, 4, 2.5, 'y'); building(m, 24, 23, 5, 'R', -1); rect(m, 24, 26, 5, 1, 'y'); scatter(m, 'd', [[23, 26], [29, 25]]);
rect(m, 21, 25, 4, 1, 'y');
sign(m, 17, 26, 'VERDANT ISLE\nWelcome to the jungle! The ferry back to Driftwood Port leaves from the pier.');

// ---- The hidden waterfall grotto (north-east): reached by a thin gap in the jungle ----
rect(m, 27, 4, 8, 2, 'E'); rect(m, 26, 5, 1, 4, 'E'); rect(m, 35, 5, 1, 4, 'E');
rect(m, 29, 5, 4, 2, '@');                                       // the waterfall face
rect(m, 28, 7, 6, 3, 'w'); set(m, 28, 7, 'g'); set(m, 33, 7, 'g');
blob(m, 31, 8.5, 3.4, 1.8, 'w', null, .1);
rect(m, 27, 7, 1, 5, 'g'); rect(m, 34, 7, 1, 5, 'g'); rect(m, 27, 11, 8, 1, 'g'); rect(m, 28, 10, 6, 1, 'g');
scatter(m, 'f', [[27, 8], [27, 9], [34, 8], [34, 9], [30, 11], [32, 11]]);
rect(m, 26, 11, 3, 1, 'g'); set(m, 26, 12, 'g'); rect(m, 25, 12, 2, 1, 'g');   // the narrow way in from the trail
rect(m, 24, 12, 2, 1, 'p'); rect(m, 24, 13, 1, 1, 'p');
sign(m, 29, 11, 'THE HIDDEN FALLS\nYou found the secret grotto. The mist feels wonderful.');

// ---- Little stream with a log bridge in the west jungle ----
rect(m, 6, 16, 1, 5, 'w'); rect(m, 7, 21, 4, 1, 'w'); set(m, 6, 15, 'w');
rect(m, 7, 18, 1, 1, 'g');

// ---- Open sand left for building (two 6x6): beach west and beach south-east ----
rect(m, 3, 24, 6, 6, 'y'); rect(m, 12, 25, 6, 3, 'y');
scatter(m, 'F', [[2, 23], [9, 23]]);
rect(m, 9, 22, 4, 2, 'g');

// ---- Clear arrival ----
rect(m, 20, 20, 2, 7, 'p');

// ---- Items ----
item(m, 30, 10, 'verdant_orb', 'Verdant Orb', 2);            // shore of the grotto pool
item(m, 34, 11, 'verdant_revive', 'Revive');                 // grotto, east bank
item(m, 3, 26, 'verdant_pearl', 'Pearl');                    // west beach
item(m, 10, 11, 'verdant_super', 'Super Potion');            // in the jungle meadow
item(m, 27, 27, 'verdant_heal', 'Full Heal');                // south beach

// ---- Trainers ----
trainer(m, 'verdant_swim', 14, 17, DOWN, 'girl', { name: 'COCO', cls: 'SWIMMER', sight: 4, team: [[4, 23], [70, 24], [88, 25]], pre: 'The jungle pools are warm! Dive into a battle!', win: 'Splash and gone.', post: 'There is a waterfall in the north-east, if you can find it.', prize: 1500 });
trainer(m, 'verdant_bug', 24, 12, LEFT, 'bug', { name: 'MANDY', cls: 'BUG CATCHER', sight: 4, team: [[31, 24], [51, 25], [53, 25], [20, 26]], pre: 'Jungle bugs are the biggest! Prepare to be bitten!', win: 'My bugs are shaken.', post: 'Mind the tall grass. It buzzes.', prize: 1560 });
trainer(m, 'verdant_explorer', 28, 16, UP, 'hiker', { name: 'RAFAEL', cls: 'EXPLORER', sight: 4, team: [[8, 25], [44, 26], [65, 26]], pre: 'I am mapping this island. Stand still, I need to measure you!', win: 'That is not on my map!', post: 'Look for thin gaps between the palms. Secrets hide there.', prize: 1620 });
trainer(m, 'verdant_dancer', 17, 19, RIGHT, 'lass', { name: 'LEILA', cls: 'FLOWER DANCER', sight: 4, team: [[44, 26], [62, 26], [84, 27]], pre: 'The island blooms for the brave. Dance with me!', win: 'You lead beautifully.', post: 'The Fairy-types love the glade by the pier.', prize: 1680 });

// ---- NPCs ----
npc(m, 21, 30, DOWN, 'hiker', null, { still: true, style: CAPTAIN, talk: () => G.ferry ? G.ferry('verdant') : G.story.says('The ferry is not running yet.') });
npc(m, 22, 26, LEFT, 'kid', ['Everything here is so green! Even the sand feels warm.'], { roam: 1 });
npc(m, 26, 26, DOWN, 'old', ['I retired to this island for peace. And now a battle at every corner!'], { still: true });
npc(m, 12, 20, RIGHT, 'camper', ['The northern waterfall is hidden from the trail. Look for a narrow way through the trees.'], { roam: 1 });
npc(m, 8, 27, UP, 'girl', ['That flat sand on the beach would make a perfect building spot.'], { still: true });

// ---- Encounters ----
m.enc = wild(['Grass', 'Bug', 'Water', 'Fairy'], 22, 28, { pick: 10 });
m.labels = [{ x: 26, y: 23, text: 'BEACH HUT', style: 'home' }, { x: 20, y: 28, text: 'FERRY PIER', style: 'town' }];
})();
