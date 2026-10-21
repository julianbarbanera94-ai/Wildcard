// Menu screens: party, summary, bag, dex, PC, shop and the start menu.
(function () {
const G = globalThis.G;
const F6 = 'bold 6px "Courier New", monospace';
const push = l => { G.ui.layers.push(l); return l; };
const pop = l => G.ui.layers.splice(G.ui.layers.indexOf(l), 1);

function bg(ctx, c1, c2) {
  ctx.fillStyle = c1; ctx.fillRect(0, 0, G.W, G.H); ctx.fillStyle = c2;
  for (let i = -G.H; i < G.W; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 8, 0); ctx.lineTo(i + 8 + G.H, G.H); ctx.lineTo(i + G.H, G.H); ctx.fill(); }
}

// ---- Items ----------------------------------------------------------------
G.canUse = function (c, name) {
  const it = G.ITEMS[name];
  if (it.kind === 'heal') return c.hp > 0 && c.hp < c.stats.hp;
  if (it.kind === 'cure') return c.hp > 0 && !!c.status;
  if (it.kind === 'revive') return c.hp <= 0;
  return false;
};
G.applyItem = function (c, name) {
  const it = G.ITEMS[name];
  if (!G.canUse(c, name)) return { ok: false, msg: "It won't have any effect." };
  if (it.kind === 'heal') { const n = Math.min(it.amt, c.stats.hp - c.hp); c.hp += n; return { ok: true, msg: `${G.name(c)} recovered ${n} HP.` }; }
  if (it.kind === 'cure') { c.status = null; return { ok: true, msg: `${G.name(c)} was cured.` }; }
  c.hp = Math.floor(c.stats.hp / 2); c.status = null; return { ok: true, msg: `${G.name(c)} was revived!` };
};

// ---- Summary --------------------------------------------------------------
G.summaryScreen = async function (start) {
  const party = G.state.party; let i = start;
  const layer = push({ draw(ctx) {
    const c = party[i], sp = G.SPECIES[c.id];
    bg(ctx, '#e8d8a8', '#e0cc98');
    ctx.fillStyle = '#d04848'; ctx.fillRect(0, 0, G.W, 14); G.text(ctx, `${G.name(c)}  Lv${c.lvl}`, 6, 3, { color: '#fff', shadow: '#802020' });
    G.text(ctx, `${i + 1}/${party.length}`, G.W - 6, 3, { align: 'right', color: '#fff', shadow: '#802020' });
    G.frame(ctx, 4, 18, 80, 78, 'light');
    ctx.drawImage(G.creatureSprite(c.id), 12, 22, 64, 64);
    sp.types.forEach((t, k) => G.typeBadge(ctx, t, 6 + k * 38, 84));
    G.frame(ctx, 88, 18, 148, 78, 'light');
    G.STATS.forEach((s, k) => {
      G.text(ctx, G.STAT_NAME[s], 98, 25 + k * 10); G.text(ctx, s === 'hp' ? `${c.hp}/${c.stats.hp}` : String(c.stats[s]), 226, 25 + k * 10, { align: 'right' });
    });
    G.text(ctx, c.status ? 'Status: ' + G.STATUS_NAME[c.status] : 'Status: OK', 98, 84, { font: F6 });
    const next = c.lvl >= 100 ? 0 : G.expFor(c.lvl + 1) - c.exp;
    G.text(ctx, `Next Lv: ${next}`, 226, 84, { align: 'right', font: F6 });
    c.moves.forEach((m, k) => {
      const mv = G.MOVES[m.id], x = 4 + (k % 2) * 118, y = 100 + Math.floor(k / 2) * 30;
      G.frame(ctx, x, y, 116, 28, 'light'); G.text(ctx, m.id, x + 8, y + 5); G.typeBadge(ctx, mv.type, x + 8, y + 16);
      G.text(ctx, `PP ${m.pp}/${mv.pp}`, x + 108, y + 17, { align: 'right', font: F6 });
    });
  } });
  for (;;) {
    await G.nextFrame(); const p = G.input.pressed;
    if (p.b || p.a) break;
    if ((p.left || p.up) && i > 0) { i--; G.audio.sfx('select'); } if ((p.right || p.down) && i < party.length - 1) { i++; G.audio.sfx('select'); }
  }
  pop(layer);
};

// ---- Party ----------------------------------------------------------------
// o: { mode: 'menu' | 'switch' | 'use', forced, current } -> index chosen, or -1.
G.partyScreen = async function (o) {
  o = o || {}; const party = G.state.party;
  let idx = o.start !== undefined ? o.start : o.current >= 0 ? o.current : 0, swap = -1, hint = o.mode === 'use' ? 'Use on which creature?' : o.mode === 'switch' ? 'Choose a creature.' : 'Choose a creature.';
  const layer = push({ draw(ctx) {
    bg(ctx, '#486888', '#42607f');
    party.forEach((c, i) => {
      const x = 3 + (i % 2) * 119, y = 4 + Math.floor(i / 2) * 42, sel = i === idx;
      ctx.fillStyle = sel ? '#f8c030' : '#385068'; ctx.fillRect(x - 1, y - 1, 118, 41);
      ctx.fillStyle = i === swap ? '#b8e8b8' : c.hp <= 0 ? '#f8d0d0' : '#e8f0f8'; ctx.fillRect(x, y, 116, 39);
      G.icon(ctx, c.id, x + 3, y + 5, 28);
      G.text(ctx, G.name(c), x + 34, y + 4, { shadow: false });
      G.text(ctx, 'Lv' + c.lvl, x + 112, y + 4, { align: 'right', shadow: false });
      G.hpBar(ctx, x + 50, y + 17, 62, c.hp / c.stats.hp);
      G.text(ctx, 'HP', x + 34, y + 15, { font: F6, color: '#e08828', shadow: false });
      G.text(ctx, `${c.hp}/${c.stats.hp}`, x + 112, y + 26, { align: 'right', shadow: false });
      if (c.status) { ctx.fillStyle = { slp: '#8890a8', par: '#d8b020', psn: '#a050c0', brn: '#e05028' }[c.status]; ctx.fillRect(x + 34, y + 27, 16, 7); G.text(ctx, G.STATUS_NAME[c.status], x + 42, y + 27, { align: 'center', font: F6, color: '#fff', shadow: false }); }
      else if (c.hp <= 0) G.text(ctx, 'FNT', x + 34, y + 27, { font: F6, color: '#d04838', shadow: false });
    });
    G.frame(ctx, 2, 134, 236, 24, 'dark'); G.text(ctx, hint, 10, 141, { color: '#fff', shadow: '#102030' });
  } });
  let result = -2;
  while (result === -2) {
    await G.nextFrame(); const p = G.input.pressed; let n = idx;
    if (p.up) n -= 2; if (p.down) n += 2; if (p.left && idx % 2) n--; if (p.right && idx % 2 === 0) n++;
    if (n !== idx && n >= 0 && n < party.length) { idx = n; G.audio.sfx('select'); }
    if (p.b) { if (swap >= 0) { swap = -1; hint = 'Choose a creature.'; } else if (!o.forced) result = -1; else { hint = 'You must choose a creature!'; } }
    if (!p.a) continue;
    G.audio.sfx('select');
    if (swap >= 0) { if (idx !== swap) { [party[swap], party[idx]] = [party[idx], party[swap]]; } swap = -1; hint = 'Choose a creature.'; continue; }
    if (o.mode === 'use') { result = idx; continue; }
    const opts = o.mode === 'switch' ? ['SHIFT', 'SUMMARY', 'CANCEL'] : ['SUMMARY', 'SWITCH', 'CANCEL'];
    const ch = await G.choose(opts, { right: 238, bottom: 132, style: 'light' });
    const what = ch < 0 ? 'CANCEL' : opts[ch];
    if (what === 'SUMMARY') await G.summaryScreen(idx);
    else if (what === 'SWITCH') { swap = idx; hint = 'Move to where?'; }
    else if (what === 'SHIFT') {
      if (party[idx].hp <= 0) { await G.say('There\'s no energy left to battle!', { style: 'dark' }); }
      else if (idx === o.current) { await G.say(`${G.name(party[idx])} is already in battle!`, { style: 'dark' }); }
      else result = idx;
    }
    G.closeText();
  }
  pop(layer); G.closeText();
  return result;
};

// ---- Bag ------------------------------------------------------------------
// ctx 'battle' -> returns { item, idx? } or null. ctx 'field' applies items itself.
G.bagScreen = async function (where) {
  let idx = 0, top = 0;
  const names = () => Object.keys(G.state.bag).filter(k => G.state.bag[k] > 0);
  const layer = push({ draw(ctx) {
    const list = names(); bg(ctx, '#d8a868', '#d09c5c');
    ctx.fillStyle = '#a04838'; ctx.fillRect(0, 0, G.W, 14); G.text(ctx, 'BAG', 6, 3, { color: '#fff', shadow: '#601810' });
    G.frame(ctx, 90, 18, 148, 94, 'light');
    const rows = list.concat('CLOSE');
    rows.slice(top, top + 6).forEach((n, k) => {
      const y = 24 + k * 14, i = top + k;
      G.text(ctx, n === 'CLOSE' ? 'CLOSE' : n, 108, y);
      if (n !== 'CLOSE') G.text(ctx, 'x' + G.state.bag[n], 230, y, { align: 'right' });
      if (i === idx) { ctx.fillStyle = '#d04848'; ctx.beginPath(); ctx.moveTo(97, y + 1); ctx.lineTo(103, y + 4.5); ctx.lineTo(97, y + 8); ctx.fill(); }
    });
    if (top > 0) G.text(ctx, '^', 164, 17, { font: F6 }); if (top + 6 < rows.length) G.text(ctx, 'v', 164, 106, { font: F6 });
    // bag art
    ctx.fillStyle = '#7a4a28'; ctx.fillRect(20, 40, 52, 56); ctx.fillStyle = '#a06a3c'; ctx.fillRect(22, 42, 48, 52); ctx.fillStyle = '#d04848'; ctx.fillRect(30, 30, 32, 16); ctx.fillStyle = '#f8d048'; ctx.fillRect(42, 52, 8, 10);
    G.text(ctx, '$' + G.state.money, 46, 100, { align: 'center', font: F6 });
    G.frame(ctx, 2, 116, 236, 42, 'light');
    const cur = rows[idx]; G.text(ctx, cur === 'CLOSE' ? 'Close the bag.' : G.ITEMS[cur].desc, 12, 128);
  } });
  let result = null;
  for (;;) {
    await G.nextFrame(); const p = G.input.pressed, rows = names().length + 1;
    if (p.up && idx > 0) { idx--; G.audio.sfx('select'); } if (p.down && idx < rows - 1) { idx++; G.audio.sfx('select'); }
    if (idx < top) top = idx; if (idx >= top + 6) top = idx - 5;
    if (p.b) break;
    if (!p.a) continue;
    G.audio.sfx('select');
    const list = names(), item = list[idx]; if (!item) break;
    const it = G.ITEMS[item];
    if (it.kind === 'orb') {
      if (where === 'battle') { result = { item }; break; }
      await G.say("You can't use that here.", { style: 'light' }); G.closeText(); continue;
    }
    const t = await G.partyScreen({ mode: 'use' });
    if (t < 0) continue;
    const c = G.state.party[t];
    if (!G.canUse(c, item)) { await G.say("It won't have any effect.", { style: where === 'battle' ? 'dark' : 'light' }); G.closeText(); continue; }
    if (where === 'battle') { result = { item, idx: t }; break; }
    const r = G.applyItem(c, item); G.state.bag[item]--; if (!G.state.bag[item]) delete G.state.bag[item];
    G.audio.sfx('heal'); await G.say(r.msg); G.closeText(); idx = Math.min(idx, names().length);
  }
  pop(layer);
  return result;
};

// ---- Dex ------------------------------------------------------------------
G.dexScreen = async function () {
  const ids = Object.keys(G.SPECIES).map(Number); let idx = 0, top = 0;
  const layer = push({ draw(ctx) {
    bg(ctx, '#d86858', '#d0605a');
    G.frame(ctx, 2, 2, 116, 156, 'light');
    ids.slice(top, top + 9).forEach((id, k) => {
      const y = 9 + k * 16, d = G.state.dex[id] || 0, i = top + k;
      G.text(ctx, String(id).padStart(2, '0') + ' ' + (d ? G.SPECIES[id].name.toUpperCase() : '-----'), 18, y);
      if (d > 1) { ctx.fillStyle = '#d04848'; ctx.beginPath(); ctx.arc(10, y + 4, 3, 0, 7); ctx.fill(); }
      if (i === idx) { ctx.fillStyle = 'rgba(208,72,72,.16)'; ctx.fillRect(6, y - 2, 108, 14); ctx.fillStyle = '#d04848'; ctx.fillRect(6, y - 2, 2, 14); }
    });
    const id = ids[idx], d = G.state.dex[id] || 0, sp = G.SPECIES[id];
    G.frame(ctx, 122, 2, 116, 156, 'light');
    if (d) {
      ctx.drawImage(G.creatureSprite(id), 148, 8, 64, 64); G.text(ctx, sp.name.toUpperCase(), 180, 76, { align: 'center' });
      sp.types.forEach((t, k) => G.typeBadge(ctx, t, 128 + (sp.types.length === 1 ? 40 : k * 38 + 2), 88));
      if (d > 1) G.wrap(sp.desc, 100).forEach((l, k) => G.text(ctx, l, 130, 104 + k * 10, { font: F6 }));
      else G.text(ctx, 'Not yet caught.', 130, 108, { font: F6 });
    } else G.text(ctx, 'Unknown', 180, 40, { align: 'center' });
    const seen = Object.keys(G.state.dex).length, caught = Object.values(G.state.dex).filter(v => v > 1).length;
    G.text(ctx, `SEEN ${seen}  CAUGHT ${caught}`, 180, 146, { align: 'center', font: F6 });
  } });
  for (;;) {
    await G.nextFrame(); const p = G.input.pressed;
    if (p.b) break;
    if (p.up && idx > 0) { idx--; G.audio.sfx('select'); } if (p.down && idx < ids.length - 1) { idx++; G.audio.sfx('select'); }
    if (idx < top) top = idx; if (idx >= top + 9) top = idx - 8;
  }
  pop(layer);
};

// ---- PC -------------------------------------------------------------------
G.pcMenu = async function () {
  const S = G.state;
  await G.say('Accessed the creature storage system.');
  for (;;) {
    const ch = await G.choose(['WITHDRAW', 'DEPOSIT', 'LOG OFF'], { x: 4, y: 4 });
    if (ch === 0) {
      if (!S.box.length) { await G.say('There are no creatures in storage.'); continue; }
      if (S.party.length >= 6) { await G.say('Your party is full.'); continue; }
      const i = await G.choose(S.box.map(c => `${G.name(c)} Lv${c.lvl}`), { x: 4, y: 4 });
      if (i >= 0) { const [c] = S.box.splice(i, 1); S.party.push(c); await G.say(`${G.name(c)} was withdrawn.`); }
    } else if (ch === 1) {
      if (S.party.length <= 1) { await G.say("You can't deposit your last creature!"); continue; }
      const i = await G.choose(S.party.map(c => `${G.name(c)} Lv${c.lvl}`), { x: 4, y: 4 });
      if (i >= 0) {
        if (S.party.filter(c => c.hp > 0).length <= 1 && S.party[i].hp > 0) { await G.say('That is your last able creature!'); continue; }
        const [c] = S.party.splice(i, 1); S.box.push(c); await G.say(`${G.name(c)} was deposited.`);
      }
    } else break;
  }
  G.closeText();
};

// ---- Shop -----------------------------------------------------------------
G.shopMenu = async function () {
  const S = G.state;
  const money = push({ draw(ctx) { G.frame(ctx, 150, 4, 88, 20, 'light'); G.text(ctx, '$' + S.money, 232, 10, { align: 'right' }); } });
  await G.say('Welcome! How may I help you?');
  for (;;) {
    const ch = await G.choose(['BUY', 'SELL', 'QUIT'], { x: 4, y: 4 });
    if (ch === 0) {
      for (;;) {
        const items = G.MART_STOCK;
        const i = await G.choose(items.map(n => `${n} $${G.ITEMS[n].price}`), { x: 4, y: 26, rowH: 12, onMove: i => { G.ui.text = { lines: [G.ITEMS[items[i]].desc], shown: 999, arrow: false, style: 'light' }; } });
        if (i < 0) { G.closeText(); break; }
        const n = items[i], price = G.ITEMS[n].price; let q = 1;
        await G.say(`${n}? How many would you like?`, { auto: 1 });
        const qL = push({ draw(ctx) { G.frame(ctx, 130, 90, 108, 18, 'light'); G.text(ctx, `x${String(q).padStart(2, '0')}   $${q * price}`, 140, 95); } });
        for (;;) { await G.nextFrame(); const p = G.input.pressed; if (p.up) q = Math.min(99, q + 1); if (p.down) q = Math.max(1, q - 1); if (p.right) q = Math.min(99, q + 10); if (p.left) q = Math.max(1, q - 10); if (p.a || p.b) { if (p.b) q = 0; break; } }
        pop(qL);
        if (!q) continue;
        if (S.money < q * price) { await G.say("You don't have enough money."); continue; }
        S.money -= q * price; S.bag[n] = (S.bag[n] || 0) + q; G.audio.sfx('buy');
        await G.say(`Thank you! Here's your ${n}.`);
      }
      await G.say('Anything else?');
    } else if (ch === 1) {
      const names = Object.keys(S.bag).filter(k => S.bag[k] > 0);
      if (!names.length) { await G.say('You have nothing to sell.'); continue; }
      const i = await G.choose(names.map(n => `${n} x${S.bag[n]} $${G.ITEMS[n].price >> 1}`), { x: 4, y: 28 });
      if (i < 0) continue;
      const n = names[i], v = G.ITEMS[n].price >> 1;
      if (await (async () => { await G.say(`I can pay $${v}. Sell it?`, { auto: 1 }); return G.yesNo(); })()) {
        S.money += v; S.bag[n]--; if (!S.bag[n]) delete S.bag[n]; G.audio.sfx('buy'); await G.say(`Turned over the ${n} and received $${v}.`);
      }
    } else break;
  }
  pop(money); await G.say('Please come again!'); G.closeText();
};

// ---- Start menu -----------------------------------------------------------
G.startMenu = async function () {
  const S = G.state;
  let idx = 0;
  for (;;) {
    const labels = ['DEX', 'PARTY', 'BAG', S.name, 'SAVE', G.audio.muted ? 'SOUND: OFF' : 'SOUND: ON', 'EXIT'];
    const ch = await G.choose(labels, { right: 238, y: 4, index: idx, minW: 50 });
    if (ch < 0 || ch === 6) break; idx = ch;
    if (ch === 0) await G.dexScreen();
    else if (ch === 1) await G.partyScreen({ mode: 'menu' });
    else if (ch === 2) await G.bagScreen('field');
    else if (ch === 3) {
      const t = Math.floor(S.frames / 3600), caught = Object.values(S.dex).filter(v => v > 1).length;
      const l = push({ draw(ctx) { G.frame(ctx, 20, 20, 200, 110, 'light'); G.text(ctx, 'TRAINER CARD', 120, 28, { align: 'center' });
        [['NAME', S.name], ['MONEY', '$' + S.money], ['DEX', `${caught} caught / ${Object.keys(S.dex).length} seen`], ['TIME', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`]].forEach(([k, v], i) => { G.text(ctx, k, 34, 48 + i * 17); G.text(ctx, String(v), 206, 48 + i * 17, { align: 'right' }); });
        ctx.drawImage(G.charSprite(S.style)[0][0], 100, 112, 16, 20); } });
      await G.waitA(); pop(l);
    } else if (ch === 4) {
      if (await (async () => { await G.say('Would you like to save the game?', { auto: 1 }); return G.yesNo(); })()) { G.saveGame(); G.audio.sfx('levelup'); await G.say(`${S.name} saved the game.`); }
      G.closeText();
    } else if (ch === 5) G.audio.toggle();
  }
};
})();
