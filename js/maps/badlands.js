// CRIMSON BADLANDS (60x48): red mesas, canyons, cave mouths and a ghost-town outpost on the road north to Emberfall.
(function () {
const G = globalThis.G;
const { newMap, set, rect, scatter, building, warp, npc, sign, trainer, edgeExit, gate, wild, DOWN, UP, LEFT, RIGHT } = G.mk;

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function blob(m, cx, cy, rx, ry, ch, only, rag = .18) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1 + (hash(x, y) - .5) * 2 * rag && x > 1 && y > 1 && x < m.w - 2 && y < m.h - 2 && (!only || only.includes(m.t[y][x]))) set(m, x, y, ch);
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
const item = (m, x, y, id, name, qty) => m.objs.push(Object.assign({ x, y, id: 'badlands_' + id, item: name, ball: true }, qty ? { qty } : {}));

const m = newMap('badlands', 'CRIMSON BADLANDS', 60, 48, 'g', { music: 'route', biome: 'badlands', enc: wild(['Rock', 'Ground', 'Fighting', 'Dark'], 30, 36, { pick: 8 }) });
// Border of dead trees and red rock.
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
  const d = Math.min(x, y, m.w - 1 - x, m.h - 1 - y), k = hash(x, y);
  if (d < 2) set(m, x, y, k < .5 ? '#' : 'r'); else if (d === 2 && k < .3) set(m, x, y, k < .12 ? '#' : 'r');
}
// ---- Tall dry grass ----
blob(m, 8, 31, 6, 3.5, 'G', ['g']); blob(m, 21, 31, 5, 3, 'G', ['g']); blob(m, 53, 30, 4, 3.5, 'G', ['g']); blob(m, 22, 43, 6, 2.6, 'G', ['g']);
blob(m, 41, 6, 5, 2.6, 'G', ['g']); blob(m, 6, 19, 3.5, 3, 'G', ['g']); blob(m, 38, 44, 4, 2.4, 'G', ['g']); blob(m, 16, 5, 4, 2.2, 'G', ['g']);
// ---- Mesas (cliffs) ----
blob(m, 11, 11, 7, 3.6, 'E', null, .12); blob(m, 48, 11, 7.5, 4, 'E', null, .12); blob(m, 12, 40, 7, 3.4, 'E', null, .12); blob(m, 50, 41, 7, 3.5, 'E', null, .12);
blob(m, 21, 16, 3.6, 2.6, 'E', null, .1); blob(m, 40, 19, 3.2, 2.2, 'E', null, .1); blob(m, 31, 38, 3, 2.2, 'E', null, .1); blob(m, 55, 21, 2.2, 3, 'E', null, .1);
// rock spires and boulders
for (let i = 0; i < 70; i++) { const x = 3 + Math.floor(hash(i, 7) * 54), y = 3 + Math.floor(hash(7, i) * 42); if (m.t[y][x] === 'g') set(m, x, y, hash(i, 2) < .5 ? 'r' : hash(i, 9) < .5 ? 'd' : 'u'); }
// ---- Roads ----
path(m, [[0, 24], [30, 24], [52, 24]]);                       // west road through the outpost
path(m, [[30, 0], [30, 5], [26, 5], [26, 12], [30, 12], [30, 24]]);   // canyon road north to Emberfall
path(m, [[42, 24], [42, 40]]);                                // outpost cross street
path(m, [[52, 24], [52, 34], [56, 34]]);                      // east loop
path(m, [[12, 24], [12, 17]]); path(m, [[20, 24], [20, 36]]); path(m, [[30, 24], [30, 34], [24, 34]]);
// ---- Cave mouths (decor) at the foot of mesas ----
[[9, 11], [13, 11], [47, 11], [51, 11], [10, 40], [50, 41], [21, 16], [31, 38]].forEach(([x, y0]) => { let y = y0; while (m.t[y + 1] && m.t[y + 1][x] === 'E') y++; if (m.t[y][x] === 'E') set(m, x, y, 'M'); });
// ---- Ghost-town outpost (x 33..56, y 25..39) ----
rect(m, 33, 24, 20, 2, 'p'); rect(m, 43, 26, 1, 2, 'p');
building(m, 34, 28, 7, 'R', -1); building(m, 45, 28, 5, 'Q', -1); building(m, 34, 33, 5, 'R', -1); building(m, 45, 34, 7, 'R', -1);
scatter(m, 'F', [[33, 28], [33, 29], [41, 31], [43, 31], [44, 31], [44, 36], [44, 37]]); scatter(m, 'd', [[41, 29], [50, 31], [40, 35], [51, 39], [38, 31]]);
scatter(m, '#', [[39, 27], [51, 27], [40, 33], [52, 33], [38, 38], [48, 39]]); scatter(m, 'l', [[33, 26], [41, 26], [47, 26]]);
scatter(m, 'x', [[35, 36], [36, 36], [46, 32]]); rect(m, 46, 25, 2, 1, 'p');
// the old well
scatter(m, 'r', [[42, 30], [44, 30]]); set(m, 43, 30, 'w');
rect(m, 36, 31, 3, 1, 'p'); rect(m, 36, 36, 1, 1, 'p');
// ---- Signs ----
sign(m, 28, 25, 'RED CANYON OUTPOST\nA few miners still live here. Emberfall lies north through the canyon.');
sign(m, 28, 14, 'EMBERFALL VOLCANO\nNorth. Six Arena Badges needed. The ground gets hot.');
sign(m, 5, 25, 'SANDSREACH\nWest, back across the sands.');
sign(m, 43, 40, 'ABANDONED MINE\nShafts collapsed long ago. Keep out!');
// ---- Items ----
item(m, 5, 5, 'sp', 'Super Potion'); item(m, 54, 5, 'revive', 'Revive'); item(m, 22, 21, 'stone', 'Stone Orb', 2); item(m, 47, 37, 'heal', 'Full Heal');
item(m, 4, 45, 'iron', 'Iron Ore', 3); item(m, 31, 41, 'crystal', 'Crystal Shard', 2); item(m, 58 - 2, 25, 'pulse', 'Pulse Orb');
// ---- Trainers (Lv 30-36) ----
trainer(m, 'badlands_miner1', 13, 23, DOWN, 'hiker', { name: 'GRUBB', cls: 'MINER', sight: 4, team: [[14, 31], [129, 32], [141, 33]], pre: 'Hey! This stretch of canyon is my claim!', win: 'Well, I will be a rock-slide...', post: 'There is iron in those mesas, if you can climb.', prize: 60 });
trainer(m, 'badlands_brawler1', 29, 19, RIGHT, 'camper', { name: 'BRICK', cls: 'BLACK BELT', sight: 5, team: [[85, 32], [137, 33], [113, 34]], pre: 'The canyon road is closed to anyone who cannot throw a punch!', win: 'Your fists are made of stone.', post: 'Train hard. The volcano will test you.', prize: 60 });
trainer(m, 'badlands_outlaw1', 45, 26, UP, 'kade', { name: 'SABLE', cls: 'OUTLAW', sight: 5, team: [[76, 33], [95, 34], [110, 35]], pre: 'Nobody walks through my town without paying the toll.', win: 'Fine. Keep your coins.', post: 'The town is empty. I just like the quiet.', prize: 60 });
trainer(m, 'badlands_hiker1', 29, 8, LEFT, 'lass', { name: 'SIENNA', cls: 'MESA CLIMBER', sight: 4, team: [[151, 35], [115, 36], [129, 34]], pre: 'I climbed all the way up here to find a challenger!', win: 'I will be back, higher than before!', post: 'The view from the red mesa is amazing.', prize: 60 });
trainer(m, 'badlands_digger1', 21, 27, UP, 'old', { name: 'OLD PETRA', cls: 'ARCHAEOLOGIST', sight: 4, team: [[120, 31], [121, 33], [122, 34]], pre: 'Dig deep, dig long. And battle strong!', win: 'My old bones rattle.', post: 'Ground creatures remember the old days.', prize: 70 });
// ---- Locals ----
npc(m, 38, 25, DOWN, 'old', ['This was a boom town once. Then the ore ran out, and the river with it.', 'Only the wind lives here now. And me.'], { still: true });
npc(m, 14, 26, DOWN, 'kid', ['I found a cave mouth in that red cliff! Mum says do not go in.'], { roam: 1 });
npc(m, 48, 25, DOWN, 'hiker', ['Sandsreach is west and Emberfall is north. Between them, only red rock and old stories.'], { still: true });
npc(m, 32, 20, LEFT, 'mom', ['The ground shakes sometimes. That is the volcano clearing its throat.'], { roam: 1 });
npc(m, 54, 36, UP, 'camper', ['Look at those mesas. The rock changes colour at sunset!'], { still: true });
m.labels = [{ x: 37, y: 28, text: 'GHOST TOWN OUTPOST', style: 'town' }];
m.landing = { x: 31, y: 24 };
edgeExit(m, 'W', 24, 'sandsreach', 66, 14, null);
edgeExit(m, 'N', 30, 'emberfall', 30, 50, gate(6, 'EMBERFALL VOLCANO'));
rect(m, 0, 24, 3, 2, 'p'); rect(m, 30, 0, 2, 3, 'p');
})();
