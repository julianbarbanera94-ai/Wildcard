// Menu screens: party, summary, bag, dex, PC, shop and the start menu.
(function () {
const G = globalThis.G;
const F6 = '800 6px ' + G.FONT_FAM;
const K = G.kit;
const push = l => { G.ui.layers.push(l); return l; };
const pop = l => G.ui.layers.splice(G.ui.layers.indexOf(l), 1);

// Soft pastel backdrop (cached) with slowly drifting polka dots (one cached overlay, scrolled).
function bg(ctx, c1, c2) {
  K.blit(ctx, K.cache('sbg' + c1, 240, 160, x => {
    x.fillStyle = K.lin(x, 0, 0, 0, 160, [G.shade(c1, 1.25), c1, G.shade(c1, .9)]); x.fillRect(0, 0, 240, 160);
    const g = x.createRadialGradient(60, 30, 0, 60, 30, 160); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 240, 160);
  }, { pad: 0, qmax: 4 }), 0, 0);
  const dots = K.cache('sdots' + c2, 272, 192, x => {
    x.fillStyle = c2;
    for (let yy = 0; yy < 192; yy += 16) for (let xx = (yy / 16 % 2) * 16; xx < 272; xx += 32) { x.beginPath(); x.arc(xx + 8, yy + 8, 3.2, 0, 7); x.fill(); }
  }, { pad: 0, qmax: 4 });
  const o = (G.frameNo * .2) % 32;
  ctx.drawImage(dots.c, o - 32, o - 32, 272, 192);
}
// Rounded title ribbon along the top of a full-screen screen.
function header(ctx, text, col, right) {
  K.blit(ctx, K.cache('shdr' + col, 236, 14, x => {
    x.save(); x.shadowColor = 'rgba(40,20,30,.3)'; x.shadowBlur = 2 * x.getTransform().a; x.shadowOffsetY = 1 * x.getTransform().a;
    K.rr(x, 0, 0, 236, 14, 7); x.fillStyle = '#ffffff'; x.fill(); x.restore();
    K.rr(x, 1.4, 1.4, 233.2, 11.2, 5.6); x.fillStyle = K.lin(x, 0, 1, 0, 13, [G.shade(col, 1.25), col, G.shade(col, .85)]); x.fill();
    x.fillStyle = 'rgba(255,255,255,.3)'; K.rr(x, 6, 2.4, 224, 3, 1.5); x.fill();
  }), 2, 1);
  K.star(ctx, 10, 8, 3, '#fff6a8');
  G.text(ctx, text, 16, 4, { color: '#fff', shadow: G.shade(col, .55) });
  if (right) G.text(ctx, right, G.W - 9, 4, { align: 'right', color: '#fff', shadow: G.shade(col, .55) });
}
// List highlight pill + bobbing cursor (same look as G.drawMenu's).
function hilite(ctx, x, y, w, h) {
  K.rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = `rgba(255,190,90,${.3 + .1 * Math.sin(G.frameNo / 10)})`; ctx.fill();
  ctx.strokeStyle = 'rgba(247,152,63,.75)'; ctx.lineWidth = .8; ctx.stroke();
  const bx = x + 2 + Math.sin(G.frameNo / 5), cy = y + h / 2;
  ctx.fillStyle = '#ff6b5a'; ctx.beginPath(); ctx.moveTo(bx, cy - 3); ctx.lineTo(bx + 5, cy); ctx.lineTo(bx, cy + 3); ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#ff6b5a'; ctx.stroke(); ctx.fill();
}
function miniOrb(ctx, x, y, r) {
  ctx.fillStyle = '#3d3352'; ctx.beginPath(); ctx.arc(x, y, r + .6, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#3d3352'; ctx.fillRect(x - r, y - .3, r * 2, .6); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * .35, 0, 7); ctx.fill();
}
// Soft spotlight disc behind a creature portrait.
function spot(ctx, cx, cy, r, col) {
  const e = K.cache('sspot' + col, 64, 64, x => {
    const g = x.createRadialGradient(32, 30, 2, 32, 34, 32); g.addColorStop(0, '#ffffff'); g.addColorStop(.6, G.shade(col, 1.6)); g.addColorStop(1, G.shade(col, 1.25)); x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, 7); x.fill();
    x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.ellipse(32, 54, 18, 4, 0, 0, 7); x.fill();
  }, { pad: 0, qmax: 4 });
  ctx.drawImage(e.c, cx - r, cy - r, r * 2, r * 2);
}
function cardArt(kind) {   // party slot card, 116x39
  const P = { norm: ['#ffffff', '#eef7ff', '#8fc9ee'], sel: ['#fffbe8', '#fff0c4', '#ffb83a'], swap: ['#f0ffe8', '#d4f5c4', '#5ccf6a'], fnt: ['#fff0f0', '#ffd8d8', '#ff8a8a'] }[kind];
  return K.cache('scard' + kind, 116, 39, x => {
    x.save(); x.shadowColor = 'rgba(20,40,70,.35)'; x.shadowBlur = 2.5 * x.getTransform().a; x.shadowOffsetY = 1.4 * x.getTransform().a;
    K.rr(x, 0, 0, 116, 39, 9); x.fillStyle = P[2]; x.fill(); x.restore();
    K.rr(x, 0, 0, 116, 39, 9); x.fillStyle = K.lin(x, 0, 0, 0, 39, [G.shade(P[2], 1.2), P[2], G.shade(P[2], .85)]); x.fill();
    K.rr(x, kind === 'sel' ? 2.4 : 1.8, kind === 'sel' ? 2.4 : 1.8, kind === 'sel' ? 111.2 : 112.4, kind === 'sel' ? 34.2 : 35.4, 7.5); x.fillStyle = K.lin(x, 0, 2, 0, 37, [P[0], P[1]]); x.fill();
    x.fillStyle = G.shade(P[2], 1.55); x.beginPath(); x.arc(17, 19.5, 14, 0, 7); x.fill();   // icon disc
    x.fillStyle = 'rgba(255,255,255,.7)'; K.rr(x, 10, .7, 26, 1, .5); x.fill();
  });
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
    G.tapZone(0, 0, 120, 160, () => { if (i > 0) { i--; G.audio.sfx('select'); } }); G.tapZone(120, 0, 120, 160, () => { if (i < party.length - 1) { i++; G.audio.sfx('select'); } });
    const c = party[i], sp = G.SPECIES[c.id];
    bg(ctx, '#bfeedd', 'rgba(255,255,255,.35)');
    header(ctx, `${G.name(c)}  Lv${c.lvl}`, '#3cc0a8', `${i + 1}/${party.length}`);
    G.frame(ctx, 4, 18, 80, 78, 'light');
    spot(ctx, 44, 52, 30, G.TYPE_COL[sp.types[0]]);
    ctx.drawImage(G.creatureSprite(c.id), 12, 22 + Math.sin(G.frameNo / 16) * 1.2, 64, 64);
    sp.types.forEach((t, k) => G.typeBadge(ctx, t, 6 + k * 38, 84));
    G.frame(ctx, 88, 18, 148, 78, 'light');
    G.STATS.forEach((s, k) => {
      if (k % 2 === 0) { K.rr(ctx, 94, 24 + k * 10, 136, 10, 5); ctx.fillStyle = 'rgba(255,190,90,.16)'; ctx.fill(); }
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
    bg(ctx, '#8fd3f0', 'rgba(255,255,255,.28)');
    party.forEach((c, i) => {
      const sel = i === idx, x = 3 + (i % 2) * 119, y = 4 + Math.floor(i / 2) * 42 - (sel ? 1 + Math.abs(Math.sin(G.frameNo / 12)) * .8 : 0);
      G.tapZone(x, y, 116, 40, () => { idx = i; G.tapKey('a'); });
      K.blit(ctx, cardArt(i === swap ? 'swap' : sel ? 'sel' : c.hp <= 0 ? 'fnt' : 'norm'), x, y);
      const hop = sel && c.hp > 0 ? Math.abs(Math.sin(G.frameNo / 7)) * 2.5 : 0;
      G.icon(ctx, c.id, x + 3, y + 5 - hop, 28);
      G.text(ctx, G.name(c), x + 34, y + 4, { shadow: false });
      G.text(ctx, 'Lv' + c.lvl, x + 112, y + 4, { align: 'right', shadow: false });
      G.hpBar(ctx, x + 50, y + 17, 62, c.hp / c.stats.hp);
      K.pill(ctx, x + 34, y + 15.5, 13, 7, '#ff9f43', 'HP');
      G.text(ctx, `${c.hp}/${c.stats.hp}`, x + 112, y + 26, { align: 'right', shadow: false });
      if (c.status) K.pill(ctx, x + 34, y + 27, 17, 7, K.STATUS_COL[c.status], G.STATUS_NAME[c.status]);
      else if (c.hp <= 0) K.pill(ctx, x + 34, y + 27, 17, 7, '#ff5a5a', 'FNT');
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
const bagArt = () => K.cache('sbag', 56, 66, x => {
  x.save(); x.shadowColor = 'rgba(90,40,10,.35)'; x.shadowBlur = 3 * x.getTransform().a; x.shadowOffsetY = 2 * x.getTransform().a;
  K.rr(x, 4, 14, 48, 50, 14); x.fillStyle = '#c2582f'; x.fill(); x.restore();
  x.strokeStyle = '#9a4422'; x.lineWidth = 4; x.beginPath(); x.moveTo(18, 16); x.quadraticCurveTo(28, 0, 38, 16); x.stroke();     // handle
  x.strokeStyle = '#ff9a5a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(18.5, 15); x.quadraticCurveTo(28, 1.5, 37.5, 15); x.stroke();
  K.rr(x, 4, 14, 48, 50, 14); x.fillStyle = K.lin(x, 0, 14, 0, 64, ['#ff9a5a', '#f2733c', '#d65a2c']); x.fill();
  K.rr(x, 4, 14, 48, 22, 12); x.fillStyle = K.lin(x, 0, 14, 0, 36, ['#ffd25a', '#ffb43a']); x.fill();                                // flap
  x.fillStyle = 'rgba(160,70,20,.25)'; x.fillRect(6, 35, 44, 1.5);
  K.rr(x, 14, 42, 28, 16, 6); x.fillStyle = '#e0602f'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = .8; x.setLineDash([1.6, 1.4]); K.rr(x, 15.5, 43.5, 25, 13, 5); x.stroke(); x.setLineDash([]);
  K.rr(x, 24, 31, 8, 9, 3); x.fillStyle = '#fff3c4'; x.fill(); x.fillStyle = '#ffb43a'; x.beginPath(); x.arc(28, 36, 1.6, 0, 7); x.fill();   // buckle
  x.fillStyle = 'rgba(255,255,255,.45)'; K.rr(x, 9, 17, 14, 3, 1.5); x.fill();
});
// ctx 'battle' -> returns { item, idx? } or null. ctx 'field' applies items itself.
G.bagScreen = async function (where) {
  let idx = 0, top = 0, pk = 0;
  // Pockets (js/economy.js): in battle only the battle items pocket is shown.
  const pockets = (G.POCKETS || [{ id: 'items', name: 'ITEMS', kinds: null }]).filter(p => where !== 'battle' || p.id === 'items');
  const names = () => Object.keys(G.state.bag).filter(k => G.state.bag[k] > 0 && G.ITEMS[k] && (!pockets[pk].kinds || pockets[pk].kinds.includes(G.ITEMS[k].kind)));
  const turn = d => { pk = (pk + d + pockets.length) % pockets.length; idx = 0; top = 0; G.audio.sfx('select'); };
  const layer = push({ draw(ctx) {
    const list = names(); bg(ctx, '#ffd3a1', 'rgba(255,255,255,.3)');
    header(ctx, 'BAG', '#ff8a5a');
    if (pockets.length > 1) {   // pocket switcher above the list
      K.pill(ctx, 104, 4, 120, 11, '#ff8a5a'); G.text(ctx, pockets[pk].name, 164, 6, { align: 'center', color: '#fff', shadow: '#c0502a', font: F6 });
      G.text(ctx, '\u25C0', 98, 6, { color: '#f7843f', font: F6 }); G.text(ctx, '\u25B6', 226, 6, { color: '#f7843f', font: F6 });
      G.tapZone(90, 0, 26, 17, () => turn(-1)); G.tapZone(212, 0, 28, 17, () => turn(1));
    }
    G.frame(ctx, 90, 18, 148, 94, 'light');
    const rows = list.concat('CLOSE');
    rows.slice(top, top + 6).forEach((n, k) => {
      const y = 24 + k * 14, i = top + k;
      G.tapZone(92, y - 3, 144, 14, () => { idx = i; G.tapKey('a'); });
      if (i === idx) hilite(ctx, 95, y - 2.5, 139, 12);
      else if (n !== 'CLOSE') miniOrb(ctx, 100, y + 4, 2);
      G.text(ctx, n === 'CLOSE' ? 'CLOSE' : n, 108, y);
      if (n !== 'CLOSE') G.text(ctx, 'x' + G.state.bag[n], 230, y, { align: 'right' });
    });
    const ab = Math.sin(G.frameNo / 8) * 1;
    if (top > 0) G.text(ctx, '\u25B2', 164, 17 - ab, { font: F6, color: '#f7983f' }); if (top + 6 < rows.length) G.text(ctx, '\u25BC', 164, 105 + ab, { font: F6, color: '#f7983f' });
    // bag art: a chunky toy backpack that wiggles a little
    ctx.save(); ctx.translate(46, 94); ctx.rotate(Math.sin(G.frameNo / 30) * .04); K.blit(ctx, bagArt(), -28, -66); ctx.restore();
    K.pill(ctx, 22, 99, 48, 10, '#ffc43a'); G.text(ctx, '$' + G.state.money, 46, 100.5, { align: 'center', color: '#6a4210', shadow: 'rgba(255,255,255,.5)' });
    G.frame(ctx, 2, 116, 236, 42, 'light');
    const cur = rows[idx]; G.text(ctx, cur === 'CLOSE' ? 'Close the bag.' : G.ITEMS[cur].desc, 12, 128);
  } });
  let result = null;
  for (;;) {
    await G.nextFrame(); const p = G.input.pressed, rows = names().length + 1;
    if (p.up && idx > 0) { idx--; G.audio.sfx('select'); } if (p.down && idx < rows - 1) { idx++; G.audio.sfx('select'); }
    if (pockets.length > 1 && (p.left || p.right)) turn(p.left ? -1 : 1);
    if (idx < top) top = idx; if (idx >= top + 6) top = idx - 5;
    if (p.b) break;
    if (!p.a) continue;
    G.audio.sfx('select');
    const list = names(), item = list[idx]; if (!item) break;
    const it = G.ITEMS[item];
    const st = { style: where === 'battle' ? 'dark' : 'light' };
    if (it.kind === 'mat' || it.kind === 'seed') { await G.say(it.kind === 'seed' ? 'Plant seeds in a Garden Plot on your homestead.' : 'Materials are used for building, crafting and upgrades.', st); G.closeText(); continue; }
    if (it.kind === 'tool') { await G.say(`Your ${item} is used automatically when you gather or farm.`, st); G.closeText(); continue; }
    if (it.kind === 'food' || (it.kind === 'crop' && it.energy)) {
      if (G.farm && G.farm.eat) await G.farm.eat(item);
      else { G.state.bag[item]--; if (!G.state.bag[item]) delete G.state.bag[item]; G.state.energy = Math.min(100, (G.state.energy || 0) + it.energy); G.audio.sfx('heal'); await G.say(`You ate the ${item}. Energy +${it.energy}.`); }
      G.closeText(); idx = Math.min(idx, names().length); continue;
    }
    if (it.kind === 'crop') { await G.say(`${item} is an ingredient. Cook it in your kitchen, or sell it.`, st); G.closeText(); continue; }
    if (it.kind === 'treat') {
      const t = await G.partyScreen({ mode: 'use' }); if (t < 0) continue;
      if (G.useTreat) await G.useTreat(G.state.party[t], item); else { await G.say("It won't have any effect.", st); }
      G.closeText(); idx = Math.min(idx, names().length); continue;
    }
    if (it.kind === 'orb') {
      if (where === 'battle') { result = { item }; break; }
      await G.say("You can't use that here.", { style: 'light' }); G.closeText(); continue;
    }
    if (it.kind === 'key') { await G.say("You can't use that right now.", { style: where === 'battle' ? 'dark' : 'light' }); G.closeText(); continue; }
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
    bg(ctx, '#ffb3b8', 'rgba(255,255,255,.3)');
    G.frame(ctx, 2, 2, 116, 156, 'light');
    ids.slice(top, top + 9).forEach((id, k) => {
      const y = 9 + k * 16, d = G.state.dex[id] || 0, i = top + k;
      G.tapZone(4, y - 3, 112, 15, () => { idx = i; G.audio.sfx('select'); });
      if (i === idx) { K.rr(ctx, 5, y - 2.5, 110, 13, 6.5); ctx.fillStyle = `rgba(255,190,90,${.3 + .1 * Math.sin(G.frameNo / 10)})`; ctx.fill(); ctx.strokeStyle = 'rgba(247,152,63,.75)'; ctx.lineWidth = .8; ctx.stroke(); }
      G.text(ctx, String(id).padStart(3, '0') + ' ' + (d ? G.SPECIES[id].name.toUpperCase() : '-----'), 18, y, d ? {} : { color: '#a898b0' });
      if (d > 1) miniOrb(ctx, 11, y + 4, 2.6); else if (d) { ctx.fillStyle = '#c8b8d0'; ctx.beginPath(); ctx.arc(11, y + 4, 2, 0, 7); ctx.fill(); }
    });
    const id = ids[idx], d = G.state.dex[id] || 0, sp = G.SPECIES[id];
    G.frame(ctx, 122, 2, 116, 156, 'light');
    if (d) {
      spot(ctx, 180, 42, 32, G.TYPE_COL[sp.types[0]]);
      ctx.drawImage(G.creatureSprite(id), 148, 8 + Math.sin(G.frameNo / 16) * 1.2, 64, 64); G.text(ctx, sp.name.toUpperCase(), 180, 76, { align: 'center', font: G.FONT_B });
      sp.types.forEach((t, k) => G.typeBadge(ctx, t, 128 + (sp.types.length === 1 ? 40 : k * 38 + 2), 88));
      if (d > 1) {
        G.wrap(sp.desc, 100).forEach((l, k) => G.text(ctx, l, 130, 104 + k * 10, { font: F6 }));
        const from = Object.values(G.SPECIES).find(o => o.evo && o.evo[1] === sp.id);
        const evo = sp.evo ? `Evolves into ${G.SPECIES[sp.evo[1]].name} at Lv${sp.evo[0]}` : from ? `Evolved from ${from.name}` : 'Does not evolve';
        G.text(ctx, evo, 130, 132, { font: F6, color: '#7a5a30', shadow: false });
      }
      else G.text(ctx, 'Not yet caught.', 130, 108, { font: F6 });
    } else { spot(ctx, 180, 42, 32, '#b8a8c8'); G.text(ctx, '?', 180, 28, { align: 'center', color: '#fff', shadow: '#8a7a98', font: '900 24px ' + G.FONT_FAM }); G.text(ctx, 'Unknown', 180, 80, { align: 'center', color: '#8a7a98' }); }
    const seen = Object.keys(G.state.dex).length, caught = Object.values(G.state.dex).filter(v => v > 1).length;
    K.pill(ctx, 134, 143, 92, 10, '#ff8a9a'); G.text(ctx, `SEEN ${seen}  CAUGHT ${caught}`, 180, 145, { align: 'center', font: F6, color: '#fff', shadow: '#c04a5a' });
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
function coin(ctx, x, y) {
  ctx.fillStyle = '#d98a14'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x, y - .3, 4.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff2a8'; ctx.beginPath(); ctx.arc(x - 1.4, y - 1.6, 1.3, 0, 7); ctx.fill(); G.text(ctx, '$', x, y - 3.4, { align: 'center', color: '#b86a08', shadow: false, font: '900 6px ' + G.FONT_FAM });
}
G.shopMenu = async function () {
  const S = G.state;
  const money = push({ draw(ctx) { G.frame(ctx, 150, 4, 88, 20, 'light'); coin(ctx, 162, 14); G.text(ctx, '$' + S.money, 230, 10, { align: 'right' }); } });
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
      const names = Object.keys(S.bag).filter(k => S.bag[k] > 0 && G.ITEMS[k].kind !== 'key');
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
    // BUILD sits after BAG; the rest of the menu keeps its old indices via `ch` below
    const labels = ['DEX', 'PARTY', 'BAG', 'BUILD', 'TRAVEL', S.name, 'SAVE', 'SETTINGS', 'EXIT'];
    const pick = await G.choose(labels, { right: 238, y: 4, index: idx, minW: 50, rowH: 13 });
    if (pick < 0 || pick === 8) break; idx = pick;
    if (pick === 3) { await G.buildMenu(); break; }
    if (pick === 4) { if (G.travelMenu) await G.travelMenu(); else await G.worldApi.says('Travel is not available yet.'); break; }
    const ch = pick > 4 ? pick - 2 : pick;
    if (ch === 0) await G.dexScreen();
    else if (ch === 1) await G.partyScreen({ mode: 'menu' });
    else if (ch === 2) await G.bagScreen('field');
    else if (ch === 3) {
      const t = Math.floor(S.frames / 3600), caught = Object.values(S.dex).filter(v => v > 1).length;
      const l = push({ draw(ctx) { G.frame(ctx, 20, 12, 200, 124, 'light');
        K.pill(ctx, 70, 16, 100, 13, '#41c7b4'); G.text(ctx, 'WARDEN CARD', 120, 18.5, { align: 'center', color: '#fff', shadow: '#1f8a7a', font: G.FONT_B });
        [['NAME', S.name], ['MONEY', '$' + S.money], ['DEX', `${caught} caught / ${Object.keys(S.dex).length} seen`], ['SHARDS', `${['meadow', 'marsh', 'mine'].filter(k => S.flags['shard_' + k]).length} / 3`], ['TIME', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`]].forEach(([k, v], i) => {
          if (i % 2 === 0) { K.rr(ctx, 28, 35.5 + i * 15, 184, 13, 6.5); ctx.fillStyle = 'rgba(255,190,90,.18)'; ctx.fill(); }
          G.text(ctx, k, 34, 38 + i * 15, { color: '#f7843f', shadow: false, font: G.FONT_B }); G.text(ctx, String(v), 206, 38 + i * 15, { align: 'right' }); });
        spot(ctx, 120, 121, 13, '#41c7b4');
        ctx.drawImage(G.charSprite(S.style)[0][0], 112, 112, 16, 20); } });
      await G.waitA(); pop(l);
    } else if (ch === 4) {
      if (await (async () => { await G.say('Would you like to save the game?', { auto: 1 }); return G.yesNo(); })()) { if (G.saveGame()) { G.audio.sfx('levelup'); await G.say(`${S.name} saved the game.`); } else await G.say('Saving failed! Storage may be full or disabled.'); }
      G.closeText();
    } else if (ch === 5) await G.settingsMenu();
  }
};
})();
