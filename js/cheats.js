// Settings and Test Mode. Test Mode is a developer aid: unlock everything and switch on "infinite" options.
// The password is checked in the browser, so it keeps casual players out but is not security.
(function () {
const G = globalThis.G;
const PASSWORD = 'abc610';
const OPTIONS = [['money', 'INFINITE MONEY'], ['items', 'INFINITE ITEMS'], ['pp', 'INFINITE PP'], ['god', 'GOD MODE'], ['catch', 'SURE CATCH']];

G.cheat = k => !!(G.state && G.state.cheats && G.state.cheats.on && G.state.cheats[k]);
// Called every overworld frame while Test Mode is on.
G.cheatTick = function () {
  const S = G.state;
  if (G.cheat('money')) S.money = 9999999;
  if (G.cheat('items')) for (const k of Object.keys(G.ITEMS)) if (G.ITEMS[k].kind !== 'key') S.bag[k] = 99;
};

// ---- On-screen text entry (touch pad, arrows + A, or a real keyboard) -----------------------------
const PAGES = [['abcdefghij', 'klmnopqrst', 'uvwxyz0123', '456789-_.@'], ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ0123', '456789-_.@']];
const CTRL = ['SHIFT', 'DEL', 'OK', 'BACK'];
G.textEntry = async function (title, maxLen, mask) {
  let text = '', page = 0, row = 0, col = 0, result;
  const cols = r => r === 4 ? 4 : 10;
  const layer = { draw(ctx) {
    G.frame(ctx, 14, 8, 212, 146, 'light');
    G.text(ctx, title, 120, 14, { align: 'center' });
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(30, 30, 180, 16);
    const shown = mask ? '*'.repeat(text.length) : text;
    G.text(ctx, shown + ((G.frameNo >> 4) % 2 ? '_' : ' '), 36, 33, { shadow: false });
    PAGES[page].forEach((line, r) => [...line].forEach((ch, c) => {
      const x = 28 + c * 18, y = 54 + r * 18, on = r === row && c === col;
      G.tapZone(x, y, 17, 17, () => { row = r; col = c; G.tapKey('a'); });
      ctx.fillStyle = on ? '#ffb040' : 'rgba(0,0,0,.07)'; ctx.fillRect(x, y, 16, 16);
      G.text(ctx, ch, x + 8, y + 3, { align: 'center', shadow: false, color: on ? '#fff' : '#383840' });
    }));
    CTRL.forEach((lab, c) => {
      const x = 28 + c * 45, y = 130, on = row === 4 && c === col;
      G.tapZone(x, y, 43, 17, () => { row = 4; col = c; G.tapKey('a'); });
      ctx.fillStyle = on ? '#ffb040' : 'rgba(0,0,0,.07)'; ctx.fillRect(x, y, 42, 16);
      G.text(ctx, lab, x + 21, y + 3, { align: 'center', shadow: false, color: on ? '#fff' : '#383840', font: G.FONT_S || G.FONT });
    });
  } };
  G.ui.layers.push(layer);
  G.textEntryProbe = () => ({ row, col, page, text });   // read-only view of the cursor, used by tests
  G.keyHook = e => {
    if (e.key === 'Enter') { result = text; return true; }
    if (e.key === 'Escape') { result = null; return true; }
    if (e.key === 'Backspace') { text = text.slice(0, -1); return true; }
    if (e.key.length === 1 && text.length < maxLen) { text += e.key; return true; }
    return e.key.length === 1;
  };
  while (result === undefined) {
    await G.nextFrame(); const k = G.input.pressed;
    if (k.up) { row = (row + 4) % 5; col = Math.min(col, cols(row) - 1); G.audio.sfx('select'); }
    if (k.down) { row = (row + 1) % 5; col = Math.min(col, cols(row) - 1); G.audio.sfx('select'); }
    if (k.left) { col = (col + cols(row) - 1) % cols(row); G.audio.sfx('select'); }
    if (k.right) { col = (col + 1) % cols(row); G.audio.sfx('select'); }
    if (k.b) text = text.slice(0, -1);
    if (k.start) result = text;
    if (k.a) {
      G.audio.sfx('select');
      if (row < 4) { if (text.length < maxLen) text += PAGES[page][row][col]; }
      else if (col === 0) page = 1 - page; else if (col === 1) text = text.slice(0, -1); else if (col === 2) result = text; else result = null;
    }
  }
  G.keyHook = null; G.textEntryProbe = null; G.ui.layers.splice(G.ui.layers.indexOf(layer), 1);
  return result;
};

// ---- Creature picker with a live preview ----------------------------------------------------------
async function pickSpecies() {
  const ids = Object.keys(G.SPECIES).map(Number); let idx = 0, top = 0;
  const layer = { draw(ctx) {
    G.frame(ctx, 4, 4, 112, 152, 'light'); G.frame(ctx, 120, 4, 116, 152, 'light');
    ids.slice(top, top + 10).forEach((id, k) => { const y = 10 + k * 14.4, on = top + k === idx; G.tapZone(8, y - 2, 104, 14, () => { idx = top + k; G.tapKey('a'); }); if (on) { ctx.fillStyle = 'rgba(255,176,64,.35)'; ctx.fillRect(9, y - 1, 102, 13); } G.text(ctx, `${String(id).padStart(3, '0')} ${G.SPECIES[id].name}`, 14, y, { shadow: false }); });
    const s = G.SPECIES[ids[idx]];
    ctx.drawImage(G.creatureSprite(s.id), 140, 14, 76, 76); G.text(ctx, s.name.toUpperCase(), 178, 94, { align: 'center' });
    s.types.forEach((t, k) => G.typeBadge(ctx, t, s.types.length === 1 ? 161 : 142 + k * 38, 108));
    G.text(ctx, 'A: choose   B: back', 178, 140, { align: 'center', shadow: false });
  } };
  G.ui.layers.push(layer); let res = -1;
  for (;;) {
    await G.nextFrame(); const k = G.input.pressed;
    if (k.up && idx > 0) { idx--; G.audio.sfx('select'); } if (k.down && idx < ids.length - 1) { idx++; G.audio.sfx('select'); }
    if (idx < top) top = idx; if (idx >= top + 10) top = idx - 9;
    if (k.b) break; if (k.a) { res = ids[idx]; break; }
  }
  G.ui.layers.splice(G.ui.layers.indexOf(layer), 1); return res;
}

function unlockEverything() {
  const S = G.state; S.cheats = S.cheats || { on: true };
  for (const id of Object.keys(G.SPECIES)) S.dex[id] = 2;
  Object.assign(S.flags, { starter: true, orrinTold: true, wrenTips: true, lanternLit: true });
  for (const k of ['meadow', 'marsh', 'mine']) { S.flags['shard_' + k] = true; S.flags['placed_' + k] = true; }
  for (const k of Object.keys(G.ITEMS)) if (G.ITEMS[k].kind !== 'key') S.bag[k] = 99;
  S.money = 9999999;
  // homestead: all the land, every vehicle and recipe
  if (G.migrateState) G.migrateState(S);
  if (S.home) S.home.deed = 3;
  if (G.vehicles && G.vehicles.grant && G.VEHICLES) for (const id of Object.keys(G.VEHICLES)) if (!(S.vehicles.owned || []).includes(id)) G.vehicles.grant(id);
  S.energy = G.farm && G.farm.energyMax ? G.farm.energyMax() : 100;
  if (G.home && G.world.map) G.home.refresh();
}

async function testMenu() {
  const S = G.state, say = G.worldApi.says;
  let idx = 0;
  for (;;) {
    const items = ['UNLOCK EVERYTHING', ...OPTIONS.map(([k, n]) => `${n}: ${S.cheats[k] ? 'ON' : 'OFF'}`), 'ADD CREATURE', 'HEAL TEAM', 'TEST MODE OFF', 'BACK'];
    const c = await G.choose(items, { x: 4, y: 4, rowH: 12, index: idx, minW: 100 }); if (c < 0 || c === items.length - 1) break; idx = c;
    if (c === 0) { unlockEverything(); S.options = S.options || {}; for (const [k] of OPTIONS) S.cheats[k] = true; G.audio.sfx('levelup'); await say(['Everything is unlocked!', 'The Dex is complete, all three shards are placed and the Great Lantern is lit (the Hollow Gate is open), every item and material is at 99, and all the infinite options are on.', 'Your homestead owns all its land, and every vehicle is yours.']); }
    else if (c <= OPTIONS.length) { const k = OPTIONS[c - 1][0]; S.cheats[k] = !S.cheats[k]; G.audio.sfx('select'); }
    else if (c === OPTIONS.length + 1) {
      const id = await pickSpecies(); if (id < 0) continue;
      const lv = await G.choose(['Lv 5', 'Lv 15', 'Lv 30', 'Lv 50', 'Lv 100'], { x: 130, y: 4 }); if (lv < 0) continue;
      const cr = G.makeCreature(id, [5, 15, 30, 50, 100][lv]); S.dex[id] = 2;
      (S.party.length < 6 ? S.party : S.box).push(cr); G.audio.sfx('caught');
      await say(`${G.name(cr)} Lv${cr.lvl} was added to your ${S.party.includes(cr) ? 'party' : 'PC'}!`);
    }
    else if (c === OPTIONS.length + 2) { S.party.forEach(G.healFull); G.audio.sfx('heal'); await say('Your team is fully healed!'); }
    else if (c === OPTIONS.length + 3) { S.cheats.on = false; await say('Test Mode is off. The settings stay saved; turn it back on from SETTINGS (no password needed again).'); break; }
  }
  G.closeText();
}

G.settingsMenu = async function () {
  const S = G.state; let idx = 0;
  for (;;) {
    const t = S.cheats && S.cheats.on ? 'TEST MODE: ON' : 'TEST MODE';
    const c = await G.choose([G.audio.muted ? 'SOUND: OFF' : 'SOUND: ON', t, 'BACK'], { right: 236, y: 4, index: idx, minW: 70 }); if (c < 0 || c === 2) break; idx = c;
    if (c === 0) G.audio.toggle();
    else {
      if (S.cheats && S.cheats.unlocked) { S.cheats.on = true; await testMenu(); continue; }
      const pw = await G.textEntry('Enter password', 20, true); if (pw === null) continue;
      if (pw === PASSWORD) { S.cheats = Object.assign({ money: false, items: false, pp: false, god: false, catch: false }, S.cheats, { on: true, unlocked: true }); G.audio.sfx('levelup'); await G.worldApi.says('Test Mode unlocked.'); await testMenu(); }
      else { G.audio.sfx('bump'); await G.worldApi.says('Wrong password.'); }
    }
  }
};
})();
