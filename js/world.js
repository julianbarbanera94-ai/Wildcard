// Overworld: maps, player/NPC movement, interactions, trainers and wild encounters.
(function () {
const G = globalThis.G;
const VEC = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // down, up, left, right
const DOWN = 0, UP = 1, LEFT = 2, RIGHT = 3;
const OPP = [UP, DOWN, RIGHT, LEFT];

const maps = G.MAPS;

// ---- State -----------------------------------------------------------------
G.newState = () => ({
  name: 'HERO', style: G.PLAYER_STYLE, party: [], box: [], bag: {}, money: 3000, map: 'cottage', x: 4, y: 4, dir: UP, flags: {}, dex: {}, frames: 0, v: 2,
});
G.saveGame = function () {
  const S = G.state, w = G.world; S.map = w.mapId; S.x = w.p.x; S.y = w.p.y; S.dir = w.p.dir;
  try { localStorage.setItem('wildcard-save-v2', JSON.stringify(S)); return true; } catch (e) { return false; }
};
// Saves quietly when the player leaves the app, but only while the overworld is idle (never mid-battle or mid-dialogue).
G.autosave = function () {
  if (G.state && G.world.map && G.scene === G.world.scene && !G.world.busy && !G.ui.layers.length && G.state.flags.starter) G.saveGame();
};
G.loadGame = function () {
  try { const s = JSON.parse(localStorage.getItem('wildcard-save-v2')); return s && s.v === 2 ? s : null; } catch (e) { return null; }
};

// ---- World runtime ---------------------------------------------------------
const world = G.world = { mapId: null, map: null, p: { x: 0, y: 0, ox: 0, oy: 0, dir: 0, moving: false, prog: 0, turn: 0, alt: 0, bump: 0 }, busy: false, banner: null, bubble: null, lastDir: null };
const p = world.p;
// The lead creature trails one tile behind the player. It steps into the tile the player just left.
const fol = world.f = { x: 0, y: 0, tx: 0, ty: 0 };
function leadCreature() { const P = G.state && G.state.party; if (!P || !P.length) return null; return P[0].hp > 0 ? P[0] : (P.find(c => c.hp > 0) || null); }
function followBegin() { if (Math.abs(fol.x - p.x) + Math.abs(fol.y - p.y) > 1) { fol.x = p.x; fol.y = p.y; } fol.tx = p.x; fol.ty = p.y; }
function followEnd() { fol.x = fol.tx; fol.y = fol.ty; }
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
  if (world.map.outdoor || world.map.banner) world.banner = { text: world.map.name, t: 0 };
  G.audio.music(world.map.music);
};
G.placePlayer = (x, y, dir) => {
  Object.assign(p, { x, y, dir, ox: 0, oy: 0, moving: false, prog: 0, turn: 0 });
  const [bx, by] = [x - VEC[dir][0], y - VEC[dir][1]], behind = canWalk(bx, by, true) && !tileWarp(bx, by);
  fol.x = fol.tx = behind ? bx : x; fol.y = fol.ty = behind ? by : y;
};
const tileWarp = (x, y) => world.map.warps.some(w => w.x === x && w.y === y);

async function stepEntity(e, d, speed, noFollow) {
  speed = speed || 1; e.dir = d; e.moving = true; const [dx, dy] = VEC[d];
  if (e === p && !noFollow) followBegin();
  e.tx = e.x + dx; e.ty = e.y + dy;
  for (let prog = speed; prog <= 16; prog += speed) { e.ox = dx * prog; e.oy = dy * prog; e.frame = prog < 8 ? (e.alt ? 1 : 2) : 0; await G.nextFrame(); }
  e.x = e.tx; e.y = e.ty; delete e.tx; delete e.ty; e.ox = e.oy = 0; e.moving = false; e.alt = !e.alt; e.frame = 0;
  if (e === p && !noFollow) followEnd();
}
function run(fn) {
  if (world.busy) return; world.busy = true;
  fn().catch(e => console.error(e)).finally(() => { world.busy = false; G.closeText(); });
}
G.runWorld = run;
G.story = { says, questText, orrin, wren, pedestal, moll, chooseStarter, nurse, joker };

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
  const n = npcAt(tx, ty); if (n) { await talkTo(n); return; }
  const lead = leadCreature();
  if (lead && tx === fol.x && ty === fol.y) await partnerTalk(lead);
}
const SHARDS = [['meadow', 'MEADOW'], ['marsh', 'MARSH'], ['mine', 'MINE']];
const shardCount = () => SHARDS.filter(([k]) => flags()['shard_' + k]).length;
function questText() {
  const f = flags();
  if (!f.starter) return ['LANTERNREST NOTICE BOARD\nThe Great Lantern is failing. Wardens needed! Speak to Elder Wren at the Hearth Shrine.'];
  if (f.lanternLit) return ['LANTERNREST NOTICE BOARD\nThe Great Lantern burns again! The Hollow Gate in the southeast stands open.'];
  const line = SHARDS.map(([k, n]) => `${n}: ${f['placed_' + k] ? 'placed' : f['shard_' + k] ? 'in your bag' : 'missing'}`).join('\n');
  return ['LANTERNREST NOTICE BOARD\nRelight the Great Lantern with three Ember Shards.', line, 'Meadow lies west, Marsh east, the Mine north up the Ridge.'];
}
async function partnerTalk(c) {
  const nm = G.name(c), r = c.hp / c.stats.hp;
  const lines = r < .35 ? [`${nm} looks tired, but it stays close to you.`, `${nm} leans against your leg and sighs.`] :
    c.status ? [`${nm} does not feel well, but it gives you a brave look.`] :
    [`${nm} looks up at you happily!`, `${nm} bounces around you!`, `${nm} sniffs the air and stays by your side.`, `${nm} nudges your hand.`, `${nm} is keeping a sharp eye out for wild creatures.`];
  G.audio.sfx('select'); await says(lines[G.rand(lines.length)]);
}
async function orrin() {
  const f = flags();
  if (!f.orrinTold) {
    f.orrinTold = true;
    await says(['ORRIN: Up at last! Lantern Night is almost here, and it has been a strange season.', 'The Great Lantern in the tower has been dimming for weeks. They say the Wildcard, the creature that guards the vale, has vanished.', 'Elder Wren is waiting at the Hearth Shrine, just up the lane. Take this POTION with you.']);
    G.state.bag.Potion = (G.state.bag.Potion || 0) + 1; G.audio.sfx('levelup'); await says(`${G.state.name} received a POTION!`);
  } else if (G.state.party.length && G.state.party.some(c => c.hp < c.stats.hp || c.status)) {
    await G.say('ORRIN: You look worn out. Sit a spell, and let your partners rest too.'); G.closeText();
    await G.fadeTo(1, 16, '#000'); G.state.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(30); await G.fadeTo(0, 16);
    await says('ORRIN: There. Fresh as morning. Mind the roads.');
  } else await says(f.lanternLit ? 'ORRIN: The Lantern is lit! I have not seen it that bright since I was a boy.' : 'ORRIN: Walk the roads in any order you like. A Warden learns from every one.');
}
async function wren() {
  const f = flags(), S = G.state;
  if (!f.starter) await says(['ELDER WREN: Welcome, little Warden. The Great Lantern has dimmed ever since the Wildcard slipped away.', 'Three Ember Shards once fed its flame. They were hidden with the Wardens of the Meadow, the Marsh and the Mine.', 'But you cannot walk the wild roads alone. Three Bondlings sleep on the hearth stones. Wake one, and it will be your partner.']);
  else if (!f.wrenTips) {
    f.wrenTips = true;
    await says(['ELDER WREN: It chose you. I knew it would.', 'To catch wild creatures, weaken them in battle and throw an ORB from your BAG. Sleep and poison help too.', 'Win a Warden\'s respect and they will give you their Ember Shard. Bring all three to the Great Lantern in the tower.', 'The roads are open: west to the Meadow, east to the Marsh, north up the Ridge to the Mine. Choose your own path.']);
    S.bag['Catch Orb'] = (S.bag['Catch Orb'] || 0) + 5; G.audio.sfx('levelup'); await says(`${S.name} received 5 CATCH ORBs!`);
  } else if (f.jokerCaught) await says(['ELDER WREN: You caught the WILDCARD itself?! And the Lantern burns...', 'You are no apprentice any more. There are still creatures out there you have not met. Check your DEX!']);
  else if (f.lanternLit) await says(['ELDER WREN: The Lantern is lit, and the vale is calm. But the Wildcard has not returned...', 'Go through the Hollow Gate in the southeast. I think it is waiting for you.']);
  else await says([`ELDER WREN: You carry ${shardCount()} of 3 Ember Shards.`, 'The Great Lantern is in the tower, north of the village road. Place the shards on its pedestals.']);
}
async function pedestal(k, label) {
  const f = flags();
  if (f.lanternLit) { await says(`The ${label} pedestal glows steadily.`); return; }
  if (f['placed_' + k]) { await says(`The ${label} Ember Shard glows softly on its pedestal.`); return; }
  if (!f['shard_' + k]) { await says(`An empty pedestal. A shard from the ${label.toLowerCase()} belongs here.`); return; }
  f['placed_' + k] = true; G.audio.sfx('levelup');
  await says(`${G.state.name} set the ${label} EMBER SHARD on its pedestal. It begins to glow!`);
  if (SHARDS.every(([key]) => f['placed_' + key])) {
    G.closeText(); await G.fadeTo(1, 16, '#ffffff'); G.audio.sfx('heal'); await G.wait(50); f.lanternLit = true; await G.fadeTo(0, 24);
    await says(['The three shards blaze together. The Great Lantern roars to life!', 'Across the vale, every wild creature lifts its head and howls with joy.', 'Far to the southeast, a sealed archway begins to shine: the Hollow Gate has opened.']);
  }
}
async function moll() {
  const f = flags(), S = G.state;
  if (f.mollDone) { await says('FISHER MOLL: That old lantern shines on my dock every evening now. Thank you again!'); return; }
  if (S.bag['Old Lantern']) {
    await says(['FISHER MOLL: My lantern! You found it! I lost it in the dunes years ago.']);
    delete S.bag['Old Lantern']; f.mollDone = true; S.bag['Super Orb'] = (S.bag['Super Orb'] || 0) + 3; S.bag['Full Heal'] = (S.bag['Full Heal'] || 0) + 1; G.audio.sfx('levelup');
    await says(`${S.name} received 3 SUPER ORBs and a FULL HEAL!`); return;
  }
  await says(['FISHER MOLL: I lost my old brass lantern somewhere along the Tidepool Shore, south of Lanternrest.', 'If you ever find it, I will make it worth your while.']);
}
async function chooseStarter(id) {
  const S = G.state, sp = G.SPECIES[id];
  const l = { draw(ctx) { G.frame(ctx, 70, 8, 100, 90, 'light'); ctx.drawImage(G.creatureSprite(id), 88, 12, 64, 64); G.text(ctx, sp.name.toUpperCase(), 120, 76, { align: 'center' }); G.typeBadge(ctx, sp.types[0], 103, 87); } };
  G.ui.layers.push(l);
  await G.say(`A sleeping ${sp.types[0].toUpperCase()}-type Bondling, ${sp.name.toUpperCase()}.\nWake it and take it as your partner?`, { auto: 1 });
  const yes = await G.yesNo();
  G.ui.layers.splice(G.ui.layers.indexOf(l), 1);
  if (!yes) { G.closeText(); return; }
  S.party.push(G.makeCreature(id, 5)); S.flags.starter = true; S.dex[id] = 2; G.audio.sfx('caught');
  await says([`The hearth stone cracks open, and ${sp.name.toUpperCase()} wakes up. It nuzzles ${S.name}.`, 'ELDER WREN: It chose you. Come and talk to me when you are ready.']);
}
async function nurse() {
  const S = G.state;
  await G.say('Welcome to the WARDEN LODGE!\nWe can restore your team to full health. Shall we?', { auto: 1 });
  if (!(await G.yesNo())) { await says('We hope to see you again!'); return; }
  G.closeText(); await G.say('OK, I\'ll take your creatures for a moment.', { auto: 20 }); G.closeText();
  await G.fadeTo(1, 12, '#ffffff'); S.party.forEach(G.healFull); G.audio.sfx('heal'); await G.wait(70); await G.fadeTo(0, 12);
  flags().respawn = 'lodge';
  await says(['Thank you for waiting.', 'Your partners are fully rested! We hope to see you again!']);
}
async function joker() {
  await says(['...', 'In the glow of the crystals, a creature stirs. Its form seems to shift every time you blink.', 'The WILDCARD! It has been waiting for the Lantern to call it home.']);
  const wild = G.makeCreature(25, 20);
  const r = await runBattle({ wild, bg: 'cave' });
  if (r === 'caught') { flags().jokerCaught = flags().jokerGone = true; G.audio.music('town'); await says(['You caught the WILDCARD!', 'The vale is safe, the Lantern is bright, and the Wildcard has chosen to walk beside a Warden.', 'Congratulations, Warden! Keep exploring and fill your DEX.']); }
  else if (r === 'win') flags().jokerGone = true;
}

// ---- Battles from the overworld -------------------------------------------
async function afterBattle(r) {
  if (r === 'lose') {
    const S = G.state; S.money = Math.floor(S.money / 2); S.party.forEach(G.healFull);
    const [id, x, y] = flags().respawn === 'lodge' ? ['lodge', 5, 6] : ['cottage', 4, 5];
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
    if (t.shard) { flags()['shard_' + t.shard] = true; G.audio.sfx('levelup'); await says(`${G.state.name} received the ${t.shard.toUpperCase()} EMBER SHARD!`); }
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
    if (block) run(async () => { await says(block); await stepEntity(p, OPP[p.dir], 1, true); });
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
    if (p.prog >= 16) { p.x += dx; p.y += dy; p.ox = p.oy = 0; p.moving = false; p.alt ^= 1; followEnd(); afterStep(); }
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
        if (canWalk(p.x + dx, p.y + dy)) { p.moving = true; p.prog = 0; followBegin(); }
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
        if (Math.abs(nx - n.ox0) <= n.roam && Math.abs(ny - n.oy0) <= n.roam && canWalk(nx, ny) && !(nx === fol.x && ny === fol.y) && !(nx === p.x && ny === p.y) && !(p.moving && nx === p.x + VEC[p.dir][0] && ny === p.y + VEC[p.dir][1])) { stepEntity(n, d, 1); continue; }
      }
      n.dir = d;
    }
  }
}

// ---- Drawing ---------------------------------------------------------------
const TALL = { G: 1, q: 1 };   // tiles whose blades cover the feet of whoever stands in them
function grassAt(ctx, x, y, tx, ty, t) { const ch = tileAt(tx, ty); if (TALL[ch]) G.terrain.grassOver(ctx, ch, x, y, t); }
function draw(ctx) {
  const m = world.map, S = G.state, t = G.frameNo;
  const mw = m.w * 16, mh = m.h * 16;
  const pxp = p.x * 16 + p.ox + 8, pyp = p.y * 16 + p.oy + 8;
  let cx = mw <= G.W ? -(G.W - mw) / 2 : Math.max(0, Math.min(mw - G.W, pxp - G.W / 2));
  let cy = mh <= G.H ? -(G.H - mh) / 2 : Math.max(0, Math.min(mh - G.H, pyp - G.H / 2));
  cx = Math.round(cx * G.S) / G.S; cy = Math.round(cy * G.S) / G.S;   // snap to real pixels, not logical ones
  const x0 = Math.max(0, Math.floor(cx / 16)), x1 = Math.min(m.w - 1, Math.floor((cx + G.W) / 16)), y0 = Math.max(0, Math.floor(cy / 16)), y1 = Math.min(m.h - 1, Math.floor((cy + G.H) / 16));
  G.terrain.drawGround(ctx, m, x0, y0, x1, y1, cx, cy, t);
  // Everything that stands up (scenery, objects, people, creatures) is depth-sorted by its base line.
  const items = [];
  G.terrain.collectProps(m, x0, y0, x1, Math.min(m.h - 1, y1 + 3), cx, cy, t, items);
  for (const o of m.objs) {
    if ((o.hide && o.hide()) || (o.id && flags()[o.id])) continue;
    const kind = o.orb ? 'orb' : o.pedestal ? 'pedestal' : o.brazier ? 'brazier' : o.ball ? 'ball' : null; if (!kind) continue;
    const info = { color: o.orb && G.TYPE_COL[G.SPECIES[o.orb].types[0]], on: o.pedestal && !!flags()['placed_' + o.pedestal], lit: !!flags().lanternLit, level: shardCount() };
    const x = o.x * 16 - cx, y = o.y * 16 - cy;
    items.push({ y: o.y * 16 + 16.1, draw: c => G.terrain.drawObject(c, kind, x, y, t, info) });
  }
  for (const n of npcsOf()) {
    const x = n.x * 16 + n.ox - cx, y = n.y * 16 + n.oy - cy;
    if (n.creature) items.push({ y: n.y * 16 + 16.2, draw: c => G.drawCreatureMini(c, n.creature, x, y, 28, t, false, Math.sin(t / 20) * 1.5) });
    else items.push({ y: n.y * 16 + n.oy + 16.2, draw: c => { G.drawChar(c, n.style, n.dir, n.moving ? n.frame : 0, x, y, t); grassAt(c, x, y, n.x, n.y, t); } });
  }
  const px = p.x * 16 + p.ox - cx, py = p.y * 16 + p.oy - cy;
  items.push({ y: p.y * 16 + p.oy + 16.3, draw: c => {
    const f = p.moving ? (p.prog % 16 < 8 ? (p.alt ? 1 : 2) : 0) : 0;
    G.drawChar(c, S.style, p.dir, f, px, py, t);
    const ahead = p.moving && p.prog > 8 ? [p.x + VEC[p.dir][0], p.y + VEC[p.dir][1]] : [p.x, p.y];
    grassAt(c, px, py, ahead[0], ahead[1], t);
  } });
  const lead = leadCreature();
  if (lead) {
    const prog = Math.max(Math.abs(p.ox), Math.abs(p.oy)), fx = fol.x * 16 + (fol.tx - fol.x) * prog - cx, fy = fol.y * 16 + (fol.ty - fol.y) * prog - cy;
    const st = G.SPECIES[lead.id].look.stage || 1, size = 18 + st * 3, moving = prog > 0 && prog < 16;
    const hop = moving ? Math.abs(Math.sin(prog / 16 * Math.PI * 2)) * 2 : (Math.sin(t / 22) > .85 ? 1 : 0);
    items.push({ y: fy + cy + 16.25 - .5, draw: c => { G.drawCreatureMini(c, lead.id, fx, fy, size, t, moving, hop); grassAt(c, fx, fy, Math.round((fx + cx) / 16), Math.round((fy + cy) / 16), t); } });
  }
  if (world.extraDraw) world.extraDraw(items, cx, cy, t);
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw(ctx);
  G.terrain.drawOverlay(ctx, m, x0, y0, x1, y1, cx, cy, t);
  if (world.bubble) { const n = world.bubble.n; G.drawBubble(ctx, n.x * 16 + n.ox - cx, n.y * 16 + n.oy - cy, t); }
  if (world.banner) G.drawBanner(ctx, world.banner.text, world.banner.t);
}
world.scene = { update, draw };
})();
