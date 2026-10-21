// Overworld: maps, player/NPC movement, interactions, trainers and wild encounters.
(function () {
const G = globalThis.G;
const VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // down, up, left, right
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
const OPP = [UP, DOWN, RIGHT, LEFT];

// ---- Map building helpers --------------------------------------------------
const maps = G.MAPS = {};
function newMap(id, name, w, h, fill, o) {
  const m = Object.assign({ id, name, w, h, t: Array.from({ length: h }, () => Array(w).fill(fill)), npcs: [], objs: [], warps: [], enc: null, music: 'town', bg: 'grass', outdoor: true }, o);
  return maps[id] = m;
}
const set = (m, x, y, ch) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y][x] = ch; };
const rect = (m, x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(m, x + i, y + j, ch); };
const border = (m, ch) => { rect(m, 0, 0, m.w, 1, ch); rect(m, 0, m.h - 1, m.w, 1, ch); rect(m, 0, 0, 1, m.h, ch); rect(m, m.w - 1, 0, 1, m.h, ch); };
const scatter = (m, ch, pts) => pts.forEach(([x, y]) => set(m, x, y, ch));
// 3-row building: two roof rows and a wall row with windows and (optionally) a door at x+dx.
function building(m, x, y, w, roof, dx) {
  rect(m, x, y, w, 2, roof); rect(m, x, y + 2, w, 1, 'W');
  for (let i = 1; i < w - 1; i++) if (i !== dx && i % 2) set(m, x + i, y + 2, 'N');
  if (dx >= 0) set(m, x + dx, y + 2, 'D');
}
function interior(id, name, w, h, mat) {
  const m = newMap(id, name, w, h, 'T', { outdoor: false });
  border(m, 'B'); set(m, mat, h - 1, 'm'); return m;
}
const warp = (m, x, y, to, tx, ty, dir, need) => m.warps.push({ x, y, to, tx, ty, dir, need });
const ST = {
  boy: { hair: '#5a3a20', skin: '#f8d0a8', shirt: '#48a0e0', pants: '#506080' }, girl: { hair: '#c04860', skin: '#f8d0a8', shirt: '#f0a0c0', pants: '#885070' },
  old: { hair: '#d8d8d8', skin: '#e8c098', shirt: '#8a7a60', pants: '#605040' }, nurse: { hair: '#f0a0b8', skin: '#f8d0a8', shirt: '#f8f0f0', pants: '#f08098', hat: '#f8f0f0' },
  clerk: { hair: '#304060', skin: '#f8d0a8', shirt: '#4070c0', pants: '#304060' }, prof: { hair: '#7a5a40', skin: '#f8d0a8', shirt: '#f8f8f8', pants: '#506848' },
  mom: { hair: '#8a4a30', skin: '#f8d0a8', shirt: '#f0c060', pants: '#a06848' }, hiker: { hair: '#403020', skin: '#e8b890', shirt: '#a87848', pants: '#605040', hat: '#c8a050' },
  bug: { hair: '#a07830', skin: '#f8d0a8', shirt: '#78c050', pants: '#686848', hat: '#e8d870' }, lass: { hair: '#f0c040', skin: '#f8d0a8', shirt: '#e86090', pants: '#4050a0' },
  camper: { hair: '#403028', skin: '#f8d0a8', shirt: '#e07830', pants: '#3a5a3a', hat: '#3a5a3a' }, kade: { hair: '#c0c0d0', skin: '#e8c8b0', shirt: '#403058', pants: '#282038', hat: '#403058' },
  kid: { hair: '#c07030', skin: '#f8d0a8', shirt: '#f0e060', pants: '#4868b0' },
};
G.PLAYER_STYLE = { hair: '#4a2f1a', skin: '#f8d0a8', shirt: '#e04848', pants: '#3858a0', hat: '#f8f8f8' };
const npc = (m, x, y, dir, style, lines, o) => m.npcs.push(Object.assign({ x, y, dir, style: ST[style], lines }, o));
const sign = (m, x, y, text) => { set(m, x, y, 's'); m.objs.push({ x, y, fn: () => says(text) }); };

// ---- Pebble Town -----------------------------------------------------------
(function () {
  const m = newMap('pebble', 'PEBBLE TOWN', 22, 20, 'g', { music: 'town' });
  border(m, '#'); rect(m, 10, 0, 2, 13, 'p'); rect(m, 5, 8, 1, 5, 'p'); rect(m, 16, 8, 1, 5, 'p'); rect(m, 5, 12, 12, 1, 'p');
  building(m, 3, 5, 5, 'R', 2); building(m, 13, 5, 6, 'Q', 3);
  rect(m, 2, 9, 3, 2, 'f'); rect(m, 17, 14, 3, 3, 'f'); rect(m, 7, 16, 4, 1, 'F'); rect(m, 13, 9, 2, 2, 'f');
  scatter(m, '#', [[2, 3], [3, 3], [18, 2], [19, 3], [1, 14], [2, 15], [1, 17], [4, 17], [19, 18], [8, 18], [15, 18], [13, 17]]);
  sign(m, 9, 10, 'PEBBLE TOWN\nA quiet town at the edge of the wild.');
  sign(m, 14, 8, "PROF. QUILL'S LAB\nStudy of wild creatures.");
  npc(m, 7, 14, DOWN, 'girl', ["Tall grass is where wild creatures hide!", "Weaken one in battle, then throw an ORB at it."], { roam: 2 });
  npc(m, 14, 14, LEFT, 'old', ["I walked every route in this region when I was young.", "Marlow Town lies north, past ROUTE 1."]);
  warp(m, 5, 7, 'home', 4, 5, UP); warp(m, 16, 7, 'lab', 5, 7, UP);
  const need = () => G.state.flags.starter ? null : 'PROF. QUILL: Wait! It\'s dangerous to go into the tall grass without a creature! Come see me at my lab first!';
  warp(m, 10, 0, 'route1', 10, 30, UP, need); warp(m, 11, 0, 'route1', 11, 30, UP, need);
})();
(function () {
  const m = interior('home', 'YOUR HOUSE', 8, 7, 4);
  set(m, 1, 1, 'b'); rect(m, 5, 2, 2, 1, 't'); rect(m, 3, 4, 2, 1, 'a');
  npc(m, 3, 3, RIGHT, 'mom', null, { talk: () => mom() });
  warp(m, 4, 6, 'pebble', 5, 8, DOWN);
})();
(function () {
  const m = interior('lab', "QUILL'S LAB", 10, 9, 5);
  scatter(m, 'S', [[1, 1], [2, 1], [7, 1], [8, 1]]); rect(m, 3, 3, 3, 1, 't'); scatter(m, 'x', [[8, 6], [1, 6]]);
  npc(m, 7, 4, LEFT, 'prof', null, { talk: () => prof() });
  npc(m, 2, 5, RIGHT, 'kid', ["I'm Prof. Quill's assistant!", "Check your DEX in the START menu to see which creatures you've found."]);
  [1, 4, 7].forEach((id, i) => m.objs.push({ x: 3 + i, y: 3, orb: id, hide: () => G.state.flags.starter, fn: () => chooseStarter(id) }));
  warp(m, 5, 8, 'pebble', 16, 8, DOWN);
})();

// ---- Route 1 ---------------------------------------------------------------
(function () {
  const m = newMap('route1', 'ROUTE 1', 22, 32, 'g', { music: 'route' });
  m.enc = [[10, 2, 4, 35], [16, 2, 4, 30], [18, 2, 4, 25], [12, 3, 4, 10]];
  border(m, '#'); rect(m, 10, 0, 2, 32, 'p');
  rect(m, 2, 22, 6, 6, 'G'); rect(m, 14, 18, 6, 6, 'G'); rect(m, 3, 8, 5, 5, 'G'); rect(m, 14, 5, 5, 5, 'G'); rect(m, 4, 14, 3, 1, 'G');
  scatter(m, '#', [[2, 3], [3, 3], [2, 4], [18, 2], [19, 2], [8, 17], [8, 18], [17, 28], [18, 28], [19, 28], [1, 20], [1, 21], [8, 29], [7, 29], [15, 12], [16, 12], [3, 18], [4, 18]]);
  rect(m, 2, 30, 3, 1, 'f'); rect(m, 16, 14, 3, 1, 'f'); rect(m, 5, 4, 3, 1, 'f');
  sign(m, 9, 28, 'ROUTE 1\nPebble Town  <-  ->  Marlow Town');
  m.objs.push({ x: 2, y: 2, id: 'r1_potion', item: 'Potion', ball: true }); m.objs.push({ x: 19, y: 26, id: 'r1_orb', item: 'Catch Orb', ball: true });
  trainer(m, 'r1_tim', 15, 16, LEFT, 'kid', { name: 'TIM', cls: 'YOUNGSTER', sight: 5, team: [[10, 4], [12, 4]], pre: "Hey! Your eyes met mine! That means we battle!", win: "Aw... You're strong!", post: 'My creatures need more training.', prize: 30 });
  trainer(m, 'r1_lia', 6, 14, RIGHT, 'bug', { name: 'LIA', cls: 'BUG CATCHER', sight: 4, team: [[18, 3], [18, 4], [18, 4]], pre: "I love bugs! Let's see whose are tougher!", win: 'My bugs lost...', post: 'Bugs are great, but so are others, I guess.', prize: 30 });
  warp(m, 10, 31, 'pebble', 10, 1, DOWN); warp(m, 11, 31, 'pebble', 11, 1, DOWN);
  warp(m, 10, 0, 'marlow', 11, 18, UP); warp(m, 11, 0, 'marlow', 12, 18, UP);
})();

// ---- Marlow Town -----------------------------------------------------------
(function () {
  const m = newMap('marlow', 'MARLOW TOWN', 24, 20, 'g', { music: 'town' });
  border(m, '#'); rect(m, 11, 0, 2, 20, 'p'); rect(m, 6, 9, 13, 1, 'p'); rect(m, 6, 8, 1, 1, 'p'); rect(m, 18, 8, 1, 1, 'p');
  building(m, 3, 5, 6, 'R', 3); building(m, 15, 5, 6, 'Q', 3); building(m, 3, 12, 5, 'R', -1);
  sign(m, 5, 8, 'CREATURE CENTER\nHeal your team for free!'); sign(m, 16, 8, 'CREATURE MART\nOrbs, potions and more.');
  rect(m, 15, 12, 4, 2, 'f'); rect(m, 8, 15, 5, 1, 'F'); scatter(m, '#', [[2, 2], [3, 2], [20, 2], [21, 2], [20, 17], [21, 17], [2, 17], [9, 17], [15, 17], [16, 17]]);
  sign(m, 13, 11, 'MARLOW TOWN\nWhere wild paths meet.');
  npc(m, 9, 11, DOWN, 'lass', ["I heard there's a cave north of here, past ROUTE 2.", "They say a strange creature lives deep inside..."], { roam: 1 });
  npc(m, 17, 15, LEFT, 'kid', ["I want to catch them all!", "A DEX entry fills in when you catch a creature, not just see one."], { roam: 2 });
  npc(m, 7, 10, RIGHT, 'old', ["Sleeping or weakened creatures are much easier to catch.", "Throwing a SUPER ORB helps, too."]);
  warp(m, 6, 7, 'center', 5, 6, UP); warp(m, 18, 7, 'mart', 3, 6, UP);
  warp(m, 11, 0, 'route2', 10, 32, UP); warp(m, 12, 0, 'route2', 11, 32, UP);
  warp(m, 11, 19, 'route1', 10, 1, DOWN); warp(m, 12, 19, 'route1', 11, 1, DOWN);
})();
(function () {
  const m = interior('center', 'CREATURE CENTER', 10, 8, 5);
  rect(m, 2, 2, 5, 1, 'k'); set(m, 8, 1, 'P'); set(m, 1, 1, 'h'); rect(m, 7, 5, 2, 1, 'a');
  npc(m, 4, 1, DOWN, 'nurse', null, { still: true });
  npc(m, 2, 5, RIGHT, 'boy', ["Resting here is totally free. Great, right?"]);
  for (let x = 2; x <= 6; x++) m.objs.push({ x, y: 2, fn: () => nurse() });
  m.objs.push({ x: 8, y: 1, fn: () => G.pcMenu() });
  warp(m, 5, 7, 'marlow', 6, 8, DOWN, () => { G.state.flags.respawn = 'center'; return null; });
})();
(function () {
  const m = interior('mart', 'CREATURE MART', 8, 8, 3);
  rect(m, 3, 3, 4, 1, 'k'); rect(m, 1, 1, 1, 3, 'S'); rect(m, 6, 1, 1, 1, 'S');
  npc(m, 4, 2, DOWN, 'clerk', null, { still: true });
  npc(m, 5, 5, LEFT, 'girl', ["The ULTRA ORB isn't sold here yet... but bosses sometimes carry them."]);
  for (let x = 3; x <= 6; x++) m.objs.push({ x, y: 3, fn: () => G.shopMenu() });
  warp(m, 3, 7, 'marlow', 18, 8, DOWN);
})();

// ---- Route 2 ---------------------------------------------------------------
(function () {
  const m = newMap('route2', 'ROUTE 2', 22, 34, 'g', { music: 'route' });
  m.enc = [[16, 5, 7, 22], [18, 5, 7, 22], [20, 6, 8, 18], [14, 5, 8, 18], [12, 5, 7, 10], [10, 5, 6, 10]];
  border(m, '#'); rect(m, 10, 3, 2, 31, 'p'); rect(m, 6, 0, 10, 3, 'C'); set(m, 10, 2, 'M'); set(m, 11, 2, 'M');
  rect(m, 10, 2, 2, 1, 'M'); rect(m, 1, 10, 5, 6, 'w'); rect(m, 16, 20, 5, 5, 'w');
  rect(m, 3, 26, 6, 5, 'G'); rect(m, 13, 24, 6, 6, 'G'); rect(m, 2, 17, 6, 4, 'G'); rect(m, 14, 12, 6, 6, 'G'); rect(m, 3, 5, 5, 4, 'G'); rect(m, 14, 4, 5, 5, 'G');
  scatter(m, '#', [[8, 30], [9, 30], [8, 12], [9, 12], [12, 22], [13, 20], [8, 24], [18, 32], [2, 32], [2, 31], [7, 14], [7, 15], [17, 10], [18, 10]]);
  rect(m, 7, 3, 2, 1, 'F'); rect(m, 13, 3, 2, 1, 'F');
  sign(m, 9, 4, 'ECHO CAVE ahead.\nStrong wild creatures live inside!');
  sign(m, 9, 32, 'ROUTE 2\nMarlow Town  ->  Echo Cave');
  m.objs.push({ x: 4, y: 3, id: 'r2_super', item: 'Super Orb', ball: true }); m.objs.push({ x: 19, y: 11, id: 'r2_pot', item: 'Super Potion', ball: true });
  trainer(m, 'r2_mira', 14, 27, LEFT, 'lass', { name: 'MIRA', cls: 'LASS', sight: 4, team: [[16, 7], [12, 8], [10, 7]], pre: 'Oh, a challenger! My team is adorable AND strong!', win: 'Oh no, my cuties!', post: 'You really are good.', prize: 32 });
  trainer(m, 'r2_bram', 7, 19, RIGHT, 'hiker', { name: 'BRAM', cls: 'HIKER', sight: 3, team: [[14, 8], [14, 9], [21, 9]], pre: "I've climbed every rock around here. Ready for a rumble?", win: 'My rocks crumbled!', post: 'Hiking builds strong legs and strong creatures.', prize: 36 });
  trainer(m, 'r2_jo', 15, 9, LEFT, 'camper', { name: 'JO', cls: 'CAMPER', sight: 4, team: [[20, 9], [18, 9]], pre: 'I camp out here every night. Wanna fight?', win: 'Whoa, you beat me!', post: "I'll train more by the campfire.", prize: 34 });
  warp(m, 10, 33, 'marlow', 11, 1, DOWN); warp(m, 11, 33, 'marlow', 12, 1, DOWN);
  warp(m, 10, 2, 'cave', 9, 24, UP); warp(m, 11, 2, 'cave', 10, 24, UP);
})();

// ---- Echo Cave -------------------------------------------------------------
(function () {
  const m = newMap('cave', 'ECHO CAVE', 20, 26, 'C', { music: 'cave', bg: 'cave', enc: [[14, 9, 12, 25], [21, 9, 12, 20], [22, 10, 13, 20], [23, 10, 13, 15], [24, 11, 13, 10], [20, 9, 11, 10]] });
  rect(m, 4, 13, 12, 8, 'e'); rect(m, 8, 20, 4, 6, 'c'); rect(m, 10, 7, 1, 6, 'c'); rect(m, 5, 2, 10, 5, 'c');
  scatter(m, 'C', [[6, 15], [13, 15], [9, 17], [5, 19], [14, 19]]); scatter(m, 'C', [[7, 3], [13, 3], [7, 5], [13, 5]]);
  rect(m, 10, 7, 1, 1, 'c');
  trainer(m, 'cave_kade', 10, 9, DOWN, 'kade', { name: 'KADE', cls: 'RANGER', sight: 4, team: [[22, 12], [23, 13], [24, 14]], pre: 'You came all this way to find the WILDCARD? Prove you are worthy first!', win: 'Impressive... The WILDCARD is just ahead. Take these.', post: 'It sleeps in the chamber ahead. Be gentle.', prize: 60, reward: ['Ultra Orb', 3] });
  m.npcs.push({ x: 10, y: 3, dir: DOWN, creature: 25, still: true, id: 'joker', hide: () => G.state.flags.jokerGone, talk: () => joker() });
  m.objs.push({ x: 6, y: 3, id: 'cave_revive', item: 'Revive', ball: true });
  warp(m, 9, 25, 'route2', 10, 3, DOWN); warp(m, 10, 25, 'route2', 11, 3, DOWN);
})();

// ---- Trainers --------------------------------------------------------------
function trainer(m, id, x, y, dir, style, t) {
  npc(m, x, y, dir, style, null, { trainer: Object.assign({ id, style: ST[style] }, t), still: true });
}

// ---- State -----------------------------------------------------------------
G.newState = () => ({
  name: 'HERO', style: G.PLAYER_STYLE, party: [], box: [], bag: {}, money: 3000, map: 'home', x: 4, y: 4, dir: UP, flags: {}, dex: {}, frames: 0, v: 1,
});
G.saveGame = function () {
  const S = G.state, w = G.world; S.map = w.mapId; S.x = w.p.x; S.y = w.p.y; S.dir = w.p.dir;
  try { localStorage.setItem('wildcard-save-v1', JSON.stringify(S)); return true; } catch (e) { return false; }
};
// Saves quietly when the player leaves the app, but only while the overworld is idle (never mid-battle or mid-dialogue).
G.autosave = function () {
  if (G.state && G.world.map && G.scene === G.world.scene && !G.world.busy && !G.ui.layers.length && G.state.flags.starter) G.saveGame();
};
G.loadGame = function () {
  try { const s = JSON.parse(localStorage.getItem('wildcard-save-v1')); return s && s.v === 1 ? s : null; } catch (e) { return null; }
};

// ---- World runtime ---------------------------------------------------------
const world = G.world = { mapId: null, map: null, p: { x: 0, y: 0, ox: 0, oy: 0, dir: 0, moving: false, prog: 0, turn: 0, alt: 0, bump: 0 }, busy: false, banner: null, bubble: null, lastDir: null };
const p = world.p;
const says = async lines => { for (const l of [].concat(lines)) await G.say(l); G.closeText(); };
const flags = () => G.state.flags;

function npcsOf() { return world.map.npcs.filter(n => !(n.hide && n.hide())); }
const npcAt = (x, y) => npcsOf().find(n => (n.x === x && n.y === y) || (n.tx === x && n.ty === y));
const objAt = (x, y) => world.map.objs.find(o => o.x === x && o.y === y && !(o.hide && o.hide()) && !(o.id && flags()[o.id]));
const tileAt = (x, y) => (x < 0 || y < 0 || x >= world.map.w || y >= world.map.h) ? null : world.map.t[y][x];
function canWalk(x, y, ignoreNpc) {
  const t = tileAt(x, y); if (!t || G.TILES[t].solid) return false;
  if (!ignoreNpc && npcAt(x, y)) return false;
  const o = objAt(x, y); if (o && o.ball) return false;
  return true;
}
G.loadMap = function (id) {
  world.mapId = id; world.map = maps[id]; world.map.npcs.forEach(n => { n.ox0 = n.ox0 === undefined ? n.x : n.ox0; n.oy0 = n.oy0 === undefined ? n.y : n.oy0; n.ox = 0; n.oy = 0; n.frame = 0; n.timer = 60 + G.rand(120); delete n.tx; delete n.ty; });
  if (world.map.outdoor || id === 'cave') world.banner = { text: world.map.name, t: 0 };
  G.audio.music(world.map.music);
};
G.placePlayer = (x, y, dir) => { Object.assign(p, { x, y, dir, ox: 0, oy: 0, moving: false, prog: 0, turn: 0 }); };

async function stepEntity(e, d, speed) {
  speed = speed || 1; e.dir = d; e.moving = true; const [dx, dy] = VEC[d];
  e.tx = e.x + dx; e.ty = e.y + dy;
  for (let prog = speed; prog <= 16; prog += speed) { e.ox = dx * prog; e.oy = dy * prog; e.frame = prog < 8 ? (e.alt ? 1 : 2) : 0; await G.nextFrame(); }
  e.x = e.tx; e.y = e.ty; delete e.tx; delete e.ty; e.ox = e.oy = 0; e.moving = false; e.alt = !e.alt; e.frame = 0;
}
function run(fn) {
  if (world.busy) return; world.busy = true;
  fn().catch(e => console.error(e)).finally(() => { world.busy = false; G.closeText(); });
}
G.runWorld = run;

async function warpTo(id, x, y, dir) {
  G.audio.sfx('warp'); await G.fadeTo(1, 10, '#000');
  G.loadMap(id); G.placePlayer(x, y, dir); await G.wait(6); await G.fadeTo(0, 10);
}

// ---- Interactions ----------------------------------------------------------
async function talkTo(n) {
  if (n.trainer) { const t = n.trainer; n.dir = OPP[p.dir]; if (!flags()[t.id]) { await trainerBattle(n); } else await says(t.post); return; }
  if (!n.still || n.talk) n.dir = OPP[p.dir];
  if (n.talk) await n.talk(n); else await says(n.lines);
}
async function interact() {
  const [dx, dy] = VEC[p.dir], tx = p.x + dx, ty = p.y + dy;
  const o = objAt(tx, ty);
  if (o) {
    if (o.item) { flags()[o.id] = true; G.state.bag[o.item] = (G.state.bag[o.item] || 0) + (o.qty || 1); G.audio.sfx('levelup'); await says(`${G.state.name} found a ${o.item.toUpperCase()}!`); return; }
    await o.fn(); return;
  }
  const n = npcAt(tx, ty); if (n) await talkTo(n);
}
async function mom() {
  const f = flags();
  if (!f.momTold) { f.momTold = true; await says(["MOM: Oh, you're finally up! Prof. Quill from next door wants to see you at his lab.", "He's been waiting to give you your very first creature partner!", "Here, take this POTION with you. Be careful out there!"]); G.state.bag.Potion = (G.state.bag.Potion || 0) + 1; G.audio.sfx('levelup'); await says(`${G.state.name} received a POTION!`); }
  else if (G.state.party.length && G.state.party.some(c => c.hp < c.stats.hp || c.status)) {
    await G.say('MOM: You look tired. Let me tuck your creatures in for a bit.'); G.closeText();
    await G.fadeTo(1, 16, '#000'); G.state.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(30); await G.fadeTo(0, 16);
    await says('MOM: There! All rested up. Do your best!');
  } else await says("MOM: Take care out there, and don't forget to eat!");
}
async function prof() {
  const f = flags(), S = G.state;
  if (!f.starter) await says(["PROF. QUILL: Ah, there you are! Welcome to the wild frontier.", "The creatures around here are fascinating. I study them, but I need a partner who will go out and meet them.", "Please choose one of the three creatures on the table. It will be your first partner!"]);
  else if (!f.quillTips) { f.quillTips = true; await says(["PROF. QUILL: Excellent choice! You two will do great.", "To catch a wild creature, battle it to lower its HP, then throw an ORB from your BAG. Sleep and poison help too.", "Take these ORBs. Fill in the DEX, and head north through MARLOW TOWN to ECHO CAVE..."]); S.bag['Catch Orb'] = (S.bag['Catch Orb'] || 0) + 5; G.audio.sfx('levelup'); await says(`${S.name} received 5 CATCH ORBs!`); }
  else if (f.jokerCaught) await says(["PROF. QUILL: You caught the WILDCARD?! Extraordinary!", "You are a true creature master. But there are still others to find... check your DEX!"]);
  else await says(["PROF. QUILL: Legend says a creature called the WILDCARD sleeps in ECHO CAVE, north of MARLOW TOWN.", "Train your team, stock up on ORBs, and see if you can catch it!"]);
}
async function chooseStarter(id) {
  const S = G.state, sp = G.SPECIES[id];
  const l = { draw(ctx) { G.frame(ctx, 70, 8, 100, 90, 'light'); ctx.drawImage(G.creatureSprite(id), 88, 12, 64, 64); G.text(ctx, sp.name.toUpperCase(), 120, 76, { align: 'center' }); G.typeBadge(ctx, sp.types[0], 103, 87); } };
  G.ui.layers.push(l);
  await G.say(`That's a ${sp.types[0].toUpperCase()}-type creature, ${sp.name.toUpperCase()}.\nDo you choose it?`, { auto: 1 });
  const yes = await G.yesNo();
  G.ui.layers.splice(G.ui.layers.indexOf(l), 1);
  if (!yes) { G.closeText(); return; }
  S.party.push(G.makeCreature(id, 5)); S.flags.starter = true; S.dex[id] = 2; G.audio.sfx('caught');
  await says([`${S.name} chose ${sp.name.toUpperCase()}!`, 'PROF. QUILL: A fine choice! Come talk to me when you are ready.']);
}
async function nurse() {
  const S = G.state;
  await G.say('Welcome to the CREATURE CENTER!\nWe can restore your team to full health. Shall we?', { auto: 1 });
  if (!(await G.yesNo())) { await says('We hope to see you again!'); return; }
  G.closeText(); await G.say('OK, I\'ll take your creatures for a moment.', { auto: 20 }); G.closeText();
  await G.fadeTo(1, 12, '#ffffff'); S.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(70); await G.fadeTo(0, 12);
  flags().respawn = 'center';
  await says(['Thank you for waiting.', 'Your creatures are fully healed! We hope to see you again!']);
}
async function joker() {
  await says(['...', 'A strange creature stirs in the shadows. Its form seems to shift as you look at it.']);
  const wild = G.makeCreature(25, 18);
  const r = await runBattle({ wild, bg: 'cave' });
  if (r === 'caught') { flags().jokerCaught = flags().jokerGone = true; G.audio.music('town'); await says(['You caught the WILDCARD!', 'Congratulations, creature master! Thanks for playing — keep exploring to fill your DEX.']); }
  else if (r === 'win') flags().jokerGone = true;
}

// ---- Battles from the overworld -------------------------------------------
async function afterBattle(r) {
  if (r === 'lose') {
    const S = G.state; S.money = Math.floor(S.money / 2); S.party.forEach(G.healFull);
    const [id, x, y] = flags().respawn === 'center' ? ['center', 5, 6] : ['home', 4, 5];
    G.loadMap(id); G.placePlayer(x, y, UP); G.ui.fade.a = 1; await G.wait(10);
    await G.fadeTo(0, 14);
    await says('You scurried back to safety, and your creatures were restored. You dropped some money in the panic...');
  } else {
    G.audio.music(world.map.music); await G.runEvolutions(); G.audio.music(world.map.music);
    await G.fadeTo(0, 14);
  }
}
async function runBattle(opts) { const r = await G.startBattle(opts); await afterBattle(r); return r; }
async function trainerBattle(n) {
  const t = n.trainer;
  await says(t.pre);
  const r = await runBattle({ trainer: { name: t.name, cls: t.cls, style: t.style, win: t.win, prize: t.prize, team: t.team.map(([id, l]) => G.makeCreature(id, l)) }, bg: world.map.bg });
  if (r === 'win') {
    flags()[t.id] = true;
    if (t.reward) { G.state.bag[t.reward[0]] = (G.state.bag[t.reward[0]] || 0) + t.reward[1]; G.audio.sfx('levelup'); await says(`${G.state.name} received ${t.reward[1]} ${t.reward[0].toUpperCase()}s!`); }
  }
}
async function spotted(n) {
  const t = n.trainer; world.bubble = { n, t: 0 }; G.audio.sfx('exclaim'); await G.wait(40); world.bubble = null;
  for (let guard = 0; guard < 12; guard++) {
    const dx = p.x - n.x, dy = p.y - n.y; if (Math.abs(dx) + Math.abs(dy) <= 1) break;
    await stepEntity(n, n.dir, 1);
  }
  n.dir = p.x > n.x ? RIGHT : p.x < n.x ? LEFT : p.y > n.y ? DOWN : UP;
  await trainerBattle(n);
}
function sees(n) {
  const t = n.trainer; if (flags()[t.id] || (n.hide && n.hide())) return false;
  const [dx, dy] = VEC[n.dir]; const px = p.x - n.x, py = p.y - n.y;
  const dist = dx ? px * dx : py * dy, off = dx ? py : px;
  if (off !== 0 || dist < 1 || dist > t.sight) return false;
  for (let i = 1; i < dist; i++) if (!canWalk(n.x + dx * i, n.y + dy * i, true)) return false;
  return true;
}
function pickWild() {
  const tab = world.map.enc, total = tab.reduce((a, e) => a + e[3], 0); let r = G.rand(total), e = tab[0];
  for (const x of tab) { if ((r -= x[3]) < 0) { e = x; break; } }
  return G.makeCreature(e[0], e[1] + G.rand(e[2] - e[1] + 1));
}

// ---- Per-frame update ------------------------------------------------------
function afterStep() {
  const S = G.state, m = world.map;
  const w = m.warps.find(w => w.x === p.x && w.y === p.y);
  if (w) {
    const block = w.need && w.need();
    if (block) run(async () => { await says(block); await stepEntity(p, OPP[p.dir], 1); });
    else run(() => warpTo(w.to, w.tx, w.ty, w.dir));
    return;
  }
  for (const n of npcsOf()) if (n.trainer && sees(n)) { run(() => spotted(n)); return; }
  if (G.TILES[tileAt(p.x, p.y)].enc && m.enc && Math.random() < .15) run(async () => { await runBattle({ wild: pickWild(), bg: m.bg }); });
}
function heldDir() {
  const h = G.input.held, order = ['down', 'up', 'left', 'right'];
  for (const k of order) if (G.input.pressed[k]) world.lastDir = k;
  if (world.lastDir && h[world.lastDir]) return order.indexOf(world.lastDir);
  const k = order.find(k => h[k]); return k ? order.indexOf(k) : -1;
}
function update() {
  G.state.frames++;
  if (world.banner && ++world.banner.t > 120) world.banner = null;
  if (world.busy) return;
  const inp = G.input;
  if (p.moving) {
    const sp = inp.held.b ? 2 : 1; p.prog += sp; const [dx, dy] = VEC[p.dir];
    p.ox = dx * Math.min(16, p.prog); p.oy = dy * Math.min(16, p.prog);
    if (p.prog >= 16) { p.x += dx; p.y += dy; p.ox = p.oy = 0; p.moving = false; p.alt ^= 1; afterStep(); }
    // NPC wandering
  } else {
    if (inp.pressed.start) { run(async () => { G.audio.sfx('select'); await G.startMenu(); }); return; }
    if (inp.pressed.a) { run(interact); return; }
    const d = heldDir();
    if (d >= 0) {
      if (p.dir !== d) { p.dir = d; p.turn = 5; }
      else if (p.turn > 0) p.turn--;
      else {
        const [dx, dy] = VEC[d];
        if (canWalk(p.x + dx, p.y + dy)) { p.moving = true; p.prog = 0; }
        else if (p.bump++ % 20 === 0) G.audio.sfx('bump');
      }
    } else { p.turn = 0; p.bump = 0; }
  }
  for (const n of npcsOf()) {
    if (n.still || n.moving) continue;
    if (--n.timer <= 0) {
      n.timer = 80 + G.rand(160);
      const d = G.rand(4);
      if (n.roam) {
        const [dx, dy] = VEC[d], nx = n.x + dx, ny = n.y + dy;
        if (Math.abs(nx - n.ox0) <= n.roam && Math.abs(ny - n.oy0) <= n.roam && canWalk(nx, ny) && !(nx === p.x && ny === p.y) && !(p.moving && nx === p.x + VEC[p.dir][0] && ny === p.y + VEC[p.dir][1])) { stepEntity(n, d, 1); continue; }
      }
      n.dir = d;
    }
  }
}

// ---- Drawing ---------------------------------------------------------------
function drawEntity(ctx, e, sprite, cx, cy) {
  const x = e.x * 16 + e.ox - cx, y = e.y * 16 + e.oy - cy - 4;
  ctx.drawImage(sprite, Math.round(x), Math.round(y));
}
function draw(ctx) {
  const m = world.map, S = G.state;
  const mw = m.w * 16, mh = m.h * 16;
  const pxp = p.x * 16 + p.ox + 8, pyp = p.y * 16 + p.oy + 8;
  let cx = mw <= G.W ? -(G.W - mw) / 2 : Math.max(0, Math.min(mw - G.W, pxp - G.W / 2));
  let cy = mh <= G.H ? -(G.H - mh) / 2 : Math.max(0, Math.min(mh - G.H, pyp - G.H / 2));
  cx = Math.round(cx); cy = Math.round(cy);
  const fr = (G.frameNo >> 5) & 1;
  const x0 = Math.max(0, Math.floor(cx / 16)), x1 = Math.min(m.w - 1, Math.floor((cx + G.W) / 16)), y0 = Math.max(0, Math.floor(cy / 16)), y1 = Math.min(m.h - 1, Math.floor((cy + G.H) / 16));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.drawImage(G.tile(m.t[y][x], fr), x * 16 - cx, y * 16 - cy);
  // objects (item balls, starter orbs)
  for (const o of m.objs) {
    if ((o.hide && o.hide()) || (o.id && flags()[o.id])) continue;
    const x = o.x * 16 - cx, y = o.y * 16 - cy;
    if (o.orb) { ctx.fillStyle = G.TYPE_COL[G.SPECIES[o.orb].types[0]]; ctx.beginPath(); ctx.arc(x + 8, y + 7, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y + 7, 8, 1); ctx.beginPath(); ctx.arc(x + 8, y + 7, 1.8, 0, 7); ctx.fill(); }
    if (o.ball) { ctx.fillStyle = '#383840'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#f04848'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 3.6, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(x + 8, y + 9, 3.6, 0, Math.PI); ctx.fill(); }
  }
  // entities sorted by y
  const ents = npcsOf().map(n => ({ n, y: n.y * 16 + n.oy })).concat([{ n: null, y: p.y * 16 + p.oy }]).sort((a, b) => a.y - b.y);
  for (const { n } of ents) {
    if (!n) {
      const f = p.moving ? (p.prog % 16 < 8 ? (p.alt ? 1 : 2) : 0) : 0;
      drawEntity(ctx, p, G.charSprite(S.style)[p.dir][f], cx, cy);
      if (tileAt(p.x, p.y) === 'G' || (p.moving && tileAt(p.x + VEC[p.dir][0], p.y + VEC[p.dir][1]) === 'G' && p.prog > 8)) { const gx = p.x * 16 + p.ox - cx, gy = p.y * 16 + p.oy - cy; ctx.drawImage(G.tile('G'), 0, 8, 16, 8, gx, gy + 8, 16, 8); }
    } else if (n.creature) {
      const bob = Math.sin(G.frameNo / 20) * 1.5; ctx.drawImage(G.creatureSprite(n.creature), 0, 0, 32, 32, n.x * 16 - cx - 6, n.y * 16 - cy - 14 + bob, 28, 28);
    } else drawEntity(ctx, n, G.charSprite(n.style)[n.dir][n.moving ? n.frame : 0], cx, cy);
  }
  if (world.bubble) { const n = world.bubble.n; ctx.fillStyle = '#fff'; ctx.fillRect(n.x * 16 - cx + 4, n.y * 16 - cy - 18, 8, 12); G.text(ctx, '!', n.x * 16 - cx + 8, n.y * 16 - cy - 17, { align: 'center', color: '#d83030', shadow: false, font: 'bold 10px "Courier New", monospace' }); }
  if (world.banner) {
    const t = world.banner.t, y = t < 10 ? -20 + t * 2 : t > 105 ? -(t - 105) * 2 : 0;
    G.frame(ctx, 4, 3 + y, 8 + G.textW(ctx, world.banner.text) + 6, 17, 'dark'); G.text(ctx, world.banner.text, 11, 8 + y, { color: '#fff', shadow: '#102030' });
  }
}
world.scene = { update, draw };
})();
