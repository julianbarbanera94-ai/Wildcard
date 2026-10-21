// Turn-based battles: wild encounters, trainer fights, capturing, EXP, levelling and evolution.
(function () {
const G = globalThis.G;
let b = null;
const STRUGGLE = { name: 'Struggle', type: 'Normal', pow: 50, acc: 100, pp: 1, recoil: true };
const STAGE_TXT = { atk: 'ATTACK', def: 'DEFENSE', spa: 'SP. ATK', spd: 'SP. DEF', spe: 'SPEED' };
const rnd = n => G.rand(n);

function mkF(c) {
  return { c, stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, dispHp: c.hp, dispExp: null, ox: 0, oy: 0, alpha: 1, scale: 1, tint: null, hidden: true, participants: new Set(), sleep: 0 };
}
const nm = f => f === b.me ? G.name(f.c) : (b.wild ? 'Wild ' : 'Foe ') + G.name(f.c);
const msg = (t, auto) => G.say(t, { auto: auto === undefined ? 36 : auto, style: 'dark' });
const mark = (id, k) => { G.state.dex[id] = Math.max(G.state.dex[id] || 0, k); }; // 1 seen, 2 caught
const expRatio = c => (c.exp - G.expFor(c.lvl)) / (G.expFor(c.lvl + 1) - G.expFor(c.lvl));
const speed = f => f.c.stats.spe * G.stageMult(f.stages.spe) * (f.c.status === 'par' ? .5 : 1);
const center = f => f === b.me ? [62, 78] : [182, 46];

// ---- Drawing --------------------------------------------------------------
function ell(ctx, x, y, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
function drawFighter(ctx, f, back, bx, by) {
  if (f.hidden || f.alpha <= 0) return;
  let img = G.creatureSprite(f.c.id, back);
  if (f.tint) img = G.tint(img, f.tint);
  const size = 64 * f.scale;
  ctx.globalAlpha = f.alpha;
  ctx.drawImage(img, Math.round(bx + f.ox + (64 - size) / 2), Math.round(by + f.oy + (64 - size)), Math.round(size), Math.round(size));
  ctx.globalAlpha = 1;
}
function infoBox(ctx, f, x, y, w, mine) {
  ctx.fillStyle = '#585868'; ctx.fillRect(x, y, w, mine ? 31 : 26);
  ctx.fillStyle = '#f8f0d8'; ctx.fillRect(x + 1, y + 1, w - 2, (mine ? 31 : 26) - 2);
  ctx.fillStyle = '#e0d0a0'; ctx.fillRect(x + 1, y + (mine ? 29 : 24), w - 2, 1);
  G.text(ctx, G.name(f.c), x + 5, y + 3, { color: '#383840', shadow: '#d8c898' });
  G.text(ctx, 'Lv' + f.c.lvl, x + w - 5, y + 3, { align: 'right', shadow: '#d8c898' });
  if (f.c.status) { ctx.fillStyle = { slp: '#8890a8', par: '#d8b020', psn: '#a050c0', brn: '#e05028' }[f.c.status]; ctx.fillRect(x + 5, y + 13, 16, 7); G.text(ctx, G.STATUS_NAME[f.c.status], x + 13, y + 13, { align: 'center', color: '#fff', shadow: false, font: 'bold 6px "Courier New", monospace' }); }
  G.text(ctx, 'HP', x + 26, y + 13, { color: '#e08828', shadow: false, font: 'bold 6px "Courier New", monospace' });
  G.hpBar(ctx, x + 38, y + 14, w - 46, f.dispHp / f.c.stats.hp);
  if (mine) {
    G.text(ctx, `${Math.ceil(f.dispHp)}/${f.c.stats.hp}`, x + w - 5, y + 19, { align: 'right', shadow: '#d8c898' });
    const r = f.dispExp === null ? expRatio(f.c) : f.dispExp;
    ctx.fillStyle = '#383840'; ctx.fillRect(x + 5, y + 26, w - 10, 3); ctx.fillStyle = '#4888f0'; ctx.fillRect(x + 6, y + 27, Math.floor((w - 12) * Math.max(0, Math.min(1, r))), 1);
  }
}
function drawOrb(ctx, x, y, rot, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s || 1, s || 1);
  ctx.fillStyle = '#383840'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#f04848'; ctx.beginPath(); ctx.arc(0, 0, 5, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#383840'; ctx.fillRect(-5, -.5, 10, 1.5); ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(0, .2, 1.8, 0, 7); ctx.fill();
  ctx.restore();
}
function draw(ctx) {
  const cave = b.bg === 'cave';
  ctx.fillStyle = cave ? '#4a4450' : '#b8e0f8'; ctx.fillRect(0, 0, G.W, 112);
  if (!cave) { ctx.fillStyle = '#d8f0f8'; ctx.fillRect(0, 40, G.W, 30); }
  ctx.fillStyle = cave ? '#7a6c5c' : '#78b858'; ctx.fillRect(0, 62, G.W, 50);
  ctx.fillStyle = cave ? '#6a5e50' : '#68a84c'; for (let y = 70; y < 112; y += 8) ctx.fillRect(0, y, G.W, 3);
  ell(ctx, 182, 74, 46, 9, cave ? '#5c5044' : '#58983c'); ell(ctx, 182, 72, 44, 8, cave ? '#9a8c7a' : '#a0d070');
  ell(ctx, 62, 106, 52, 10, cave ? '#5c5044' : '#58983c'); ell(ctx, 62, 104, 50, 9, cave ? '#9a8c7a' : '#a0d070');
  drawFighter(ctx, b.foe, false, 150, 10);
  drawFighter(ctx, b.me, true, 30, 42);
  for (const t of [b.tFoe, b.tMe]) if (t) { ctx.globalAlpha = t.alpha === undefined ? 1 : t.alpha; ctx.drawImage(t.img, Math.round(t.x + t.ox), t.y, 48, 60); ctx.globalAlpha = 1; }
  if (b.orb) drawOrb(ctx, b.orb.x, b.orb.y, b.orb.rot, b.orb.s);
  if (b.fx) drawFx(ctx, b.fx);
  if (b.showFoe) infoBox(ctx, b.foe, 6, 8, 112, false);
  if (b.showMe) infoBox(ctx, b.me, 124, 78, 112, true);
}
function drawFx(ctx, fx) {
  const t = fx.t / fx.dur, [x, y] = [fx.x, fx.y];
  ctx.save();
  if (fx.kind === 'burst') {
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + fx.t * .05, r = 4 + t * 26 + (i % 3) * 3; ctx.fillStyle = i % 2 ? fx.color : '#fff'; ctx.globalAlpha = 1 - t * .8; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 5 * (1 - t) + 1.5, 0, 7); ctx.fill(); }
  } else {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 1 - t * .5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 16 + i * 8 + t * 10, y - 18 + t * 10); ctx.lineTo(x + 2 + i * 8 + t * 10, y + 14 + t * 6); ctx.stroke(); }
    ctx.fillStyle = fx.color; ctx.globalAlpha = (1 - t) * .8; ctx.beginPath(); ctx.arc(x, y, 5 + t * 14, 0, 7); ctx.fill();
  }
  ctx.restore();
}
const scene = { update() { }, draw };

// ---- Animations -----------------------------------------------------------
async function slide(o, key, from, to, frames) { for (let i = 0; i <= frames; i++) { o[key] = from + (to - from) * i / frames; await G.nextFrame(); } }
async function popIn(f) {
  f.hidden = false; f.tint = '#ffffff'; f.alpha = 1;
  for (let i = 1; i <= 14; i++) { f.scale = i / 14; await G.nextFrame(); }
  f.tint = null; f.scale = 1; f.ox = 0; f.oy = 0;
}
async function popOut(f) { f.tint = '#ffffff'; for (let i = 13; i >= 0; i--) { f.scale = Math.max(.05, i / 14); await G.nextFrame(); } f.hidden = true; f.scale = 1; f.tint = null; }
async function animAttack(att, def, move, eff) {
  const dir = att === b.me ? 1 : -1;
  for (let i = 0; i < 6; i++) { att.ox += dir * 3; att.oy -= dir * 1; await G.nextFrame(); }
  const [x, y] = center(def), special = !G.PHYS.has(move.type);
  b.fx = { kind: special ? 'burst' : 'impact', x, y, color: G.TYPE_COL[move.type], t: 0, dur: 18 };
  for (let i = 0; i < 6; i++) { att.ox -= dir * 3; att.oy += dir * 1; b.fx.t++; await G.nextFrame(); }
  G.audio.sfx(eff > 1 ? 'super' : eff < 1 ? 'weak' : 'hit');
  for (let i = 0; i < 12; i++) { b.fx.t = Math.min(b.fx.dur, b.fx.t + 1); if (i % 4 === 0) def.alpha = def.alpha ? 0 : 1; else if (i % 4 === 2) def.alpha = 1; await G.nextFrame(); }
  def.alpha = 1; b.fx = null; att.ox = 0; att.oy = 0;
}
async function drain(f) {
  const target = f.c.hp, step = Math.max(.35, f.c.stats.hp / 100);
  while (Math.abs(f.dispHp - target) > .01) { f.dispHp += Math.sign(target - f.dispHp) * Math.min(step, Math.abs(target - f.dispHp)); await G.nextFrame(); }
  f.dispHp = target;
}
async function shake(f) { for (let i = 0; i < 8; i++) { f.ox = (i % 2 ? 3 : -3); await G.nextFrame(); await G.nextFrame(); } f.ox = 0; }
async function animExp(f, to, frames) {
  let from = f.dispExp === null ? expRatio(f.c) : f.dispExp; f.dispExp = from;
  for (let i = 1; i <= frames; i++) { f.dispExp = from + (to - from) * i / frames; await G.nextFrame(); }
  f.dispExp = to;
}

// ---- Status & stat effects ------------------------------------------------
const STATUS_MSG = { slp: 'fell asleep!', par: 'is paralyzed! It may be unable to move!', psn: 'was poisoned!', brn: 'was burned!' };
async function inflict(f, status) {
  if (f.c.status || f.c.hp <= 0) return false;
  const ty = G.SPECIES[f.c.id].types;
  if ((status === 'psn' && ty.includes('Poison')) || (status === 'brn' && ty.includes('Fire')) || (status === 'par' && ty.includes('Electric'))) return false;
  f.c.status = status; if (status === 'slp') f.sleep = 1 + rnd(3);
  G.audio.sfx('weak'); await msg(`${nm(f)} ${STATUS_MSG[status]}`); return true;
}
async function changeStage(f, stat, d) {
  const s = f.stages[stat];
  if ((d > 0 && s >= 6) || (d < 0 && s <= -6)) { await msg(`${nm(f)}'s ${STAGE_TXT[stat]} won't go any ${d > 0 ? 'higher' : 'lower'}!`); return; }
  f.stages[stat] = Math.max(-6, Math.min(6, s + d));
  if (d < 0) await shake(f);
  await msg(`${nm(f)}'s ${STAGE_TXT[stat]} ${d > 0 ? 'rose' : 'fell'}!`);
}

// ---- Moves ----------------------------------------------------------------
// Returns false if the user could not act. Handles all messaging.
async function useMove(att, def, move) {
  if (att.c.status === 'slp') {
    if (--att.sleep > 0) { await msg(`${nm(att)} is fast asleep.`); return; }
    att.c.status = null; await msg(`${nm(att)} woke up!`);
  }
  if (att.c.status === 'par' && rnd(4) === 0) { await msg(`${nm(att)} is fully paralyzed!\nIt can't move!`); return; }
  await msg(`${nm(att)} used ${move.name}!`, 22);
  const slot = att.c.moves.find(m => m.id === move.name); if (slot) slot.pp--;
  if (move.acc < 100 && rnd(100) >= move.acc) { await msg(`${nm(att)}'s attack missed!`); return; }
  if (move.pow > 0) {
    const crit = rnd(16) === 0, r = G.calcDamage(att, def, move, { crit, roll: .85 + Math.random() * .15 });
    if (r.eff === 0) { await msg(`It doesn't affect ${nm(def)}...`); return; }
    await animAttack(att, def, move, r.eff);
    def.c.hp = Math.max(0, def.c.hp - r.dmg); await drain(def);
    if (crit) await msg('A critical hit!');
    if (r.eff > 1) await msg("It's super effective!"); else if (r.eff < 1) await msg("It's not very effective...");
    if (move.recoil) { att.c.hp = Math.max(0, att.c.hp - Math.max(1, Math.floor(r.dmg / 4))); await drain(att); await msg(`${nm(att)} is hit with recoil!`); }
    if (def.c.hp > 0 && move.status && rnd(100) < move.chance) await inflict(def, move.status);
  } else {
    if (move.stat) { const t = move.self ? att : def; await changeStage(t, move.stat[0], move.stat[1]); }
    else if (move.status) { if (!(await inflict(def, move.status))) await msg('But it failed!'); }
  }
}
function pickMove(f, other) {
  const usable = f.c.moves.filter(m => m.pp > 0);
  if (!usable.length) return STRUGGLE;
  const ws = usable.map(m => { const mv = G.MOVES[m.id]; if (mv.pow) { const e = G.typeMult(mv.type, G.SPECIES[other.c.id].types); return e === 0 ? .1 : e > 1 ? 3 : e < 1 ? .6 : 2; } return (mv.status && other.c.status) ? .1 : 1; });
  let r = Math.random() * ws.reduce((a, c) => a + c, 0), i = 0;
  while ((r -= ws[i]) > 0) i++;
  return G.MOVES[usable[Math.min(i, usable.length - 1)].id];
}

// ---- Fainting, EXP & level ups -------------------------------------------
async function showGains(c, gains) {
  const layer = { draw(ctx) {
    G.frame(ctx, 128, 4, 108, 74, 'light');
    G.STATS.forEach((s, i) => { G.text(ctx, G.STAT_NAME[s], 138, 11 + i * 10); G.text(ctx, '+' + gains[s], 202, 11 + i * 10, { align: 'right' }); G.text(ctx, String(c.stats[s]), 228, 11 + i * 10, { align: 'right' }); });
  } };
  G.ui.layers.push(layer); await G.waitA(); G.ui.layers.splice(G.ui.layers.indexOf(layer), 1);
}
async function learnMoves(c, lvl) {
  for (const name of G.movesAt(c, lvl)) {
    if (c.moves.some(m => m.id === name)) continue;
    const mvd = G.MOVES[name];
    if (c.moves.length < 4) { c.moves.push({ id: name, pp: mvd.pp }); G.audio.sfx('select'); await msg(`${G.name(c)} learned ${name}!`); continue; }
    for (;;) {
      await msg(`${G.name(c)} wants to learn ${name}.\nBut it already knows four moves. Forget a move?`, 0);
      if (!(await G.yesNo({ style: 'dark' }))) { await msg(`${G.name(c)} did not learn ${name}.`); break; }
      const i = await G.choose(c.moves.map(m => m.id), { x: 4, y: 4, style: 'dark', cancel: true });
      if (i < 0) continue;
      const old = c.moves[i].id; c.moves[i] = { id: name, pp: mvd.pp };
      await msg(`1, 2 and... Poof!\n${G.name(c)} forgot ${old}.\nAnd... ${G.name(c)} learned ${name}!`); break;
    }
  }
}
async function awardExp(foe) {
  const party = G.state.party, parts = [...foe.participants].filter(c => c.hp > 0 && party.includes(c));
  if (!parts.length) return;
  const sp = G.SPECIES[foe.c.id];
  const gain = Math.max(1, Math.floor(Math.floor(sp.expYield * foe.c.lvl / 7) * (b.wild ? 1 : 1.5) / parts.length));
  for (const c of parts) {
    await msg(`${G.name(c)} gained ${gain} EXP. Points!`);
    c.exp += gain;
    const active = c === b.me.c;
    while (c.lvl < 100 && c.exp >= G.expFor(c.lvl + 1)) {
      if (active) await animExp(b.me, 1, 14);
      const gains = G.levelUp(c); G.audio.sfx('levelup');
      if (active) { b.me.dispHp = c.hp; b.me.dispExp = 0; }
      await msg(`${G.name(c)} grew to LV. ${c.lvl}!`, 0);
      await showGains(c, gains);
      await learnMoves(c, c.lvl);
      const evo = G.SPECIES[c.id].evo; if (evo && c.lvl >= evo[0]) c.evolveReady = true;
    }
    if (active) { await animExp(b.me, expRatio(c), 20); b.me.dispExp = null; }
  }
}
async function faint(f) {
  G.audio.sfx('faint');
  for (let i = 0; i < 20; i++) { f.oy += 3; f.alpha = 1 - i / 20; await G.nextFrame(); }
  f.hidden = true; f.oy = 0; f.alpha = 1;
  await msg(`${nm(f)} fainted!`);
}

// ---- Sending out ----------------------------------------------------------
async function sendOutMe(c, first) {
  b.me = mkF(c); b.me.participants = new Set(); b.foe.participants.add(c); b.me.dispHp = c.hp; b.me.dispExp = null; mark(c.id, 2);
  await msg(`Go! ${G.name(c)}!`, 20);
  b.showMe = true; await popIn(b.me);
}
async function sendOutFoe(c) {
  b.foe = mkF(c); b.foe.participants = new Set([b.me.c]); mark(c.id, Math.max(1, G.state.dex[c.id] || 0));
  b.showFoe = true; await popIn(b.foe);
}

// ---- Player menus ---------------------------------------------------------
const prompt = lines => { G.ui.text = { lines, shown: 999, arrow: false, style: 'dark' }; };
async function chooseAction() {
  let last = 0;
  for (;;) {
    prompt(['What will', G.name(b.me.c) + ' do?']);
    const ch = await G.choose(['FIGHT', 'BAG', 'PARTY', 'RUN'], { cols: 2, right: 238, y: 112, rowH: 15, style: 'dark', cancel: false, index: last, minW: 34 });
    last = ch;
    if (ch === 0) {
      const mvs = b.me.c.moves;
      if (!mvs.some(m => m.pp > 0)) { G.ui.text = null; return { t: 'move', move: STRUGGLE }; }
      const i = await G.choose(mvs.map(m => m.id), {
        cols: 2, x: 2, y: 111, rowH: 16, style: 'dark', cancel: true, minW: 56,
        extra(ctx, i) {
          const m = mvs[i], mv = G.MOVES[m.id];
          G.frame(ctx, 160, 110, 78, 48, 'dark');
          G.text(ctx, `PP ${m.pp}/${mv.pp}`, 168, 117, { color: m.pp === 0 ? '#f08070' : '#fff', shadow: '#102030' });
          G.text(ctx, mv.pow ? `PWR ${mv.pow}` : 'STATUS', 168, 130, { color: '#fff', shadow: '#102030' });
          G.typeBadge(ctx, mv.type, 168, 143);
        },
      });
      if (i < 0) continue;
      if (mvs[i].pp <= 0) { await msg('There\'s no PP left for this move!', 0); continue; }
      return { t: 'move', move: G.MOVES[mvs[i].id] };
    }
    if (ch === 1) {
      G.ui.text = null;
      const r = await G.bagScreen('battle');
      if (!r) continue;
      if (G.ITEMS[r.item].kind === 'orb') {
        if (!b.wild) { await msg("The trainer blocked the ORB!\nDon't be a thief!"); continue; }
        return { t: 'orb', item: r.item };
      }
      return { t: 'item', item: r.item, idx: r.idx };
    }
    if (ch === 2) {
      G.ui.text = null;
      const i = await G.partyScreen({ mode: 'switch', current: G.state.party.indexOf(b.me.c) });
      if (i >= 0) return { t: 'switch', idx: i };
      continue;
    }
    if (ch === 3) {
      if (!b.wild) { await msg("No! There's no running from a trainer battle!"); continue; }
      return { t: 'run' };
    }
  }
}
async function forcedSwitch() {
  for (;;) {
    G.ui.text = null;
    const i = await G.partyScreen({ mode: 'switch', forced: true, current: -1, start: Math.max(0, G.state.party.findIndex(c => c.hp > 0)) });
    if (i >= 0) return i;
  }
}
async function doSwitch(idx, forced) {
  const c = G.state.party[idx];
  if (!forced && !b.me.hidden) { await msg(`${G.name(b.me.c)}, come back!`, 18); await popOut(b.me); }
  await sendOutMe(c);
}

// ---- Catching -------------------------------------------------------------
async function throwOrb(item) {
  const bonus = G.ITEMS[item].mult;
  G.state.bag[item]--; if (!G.state.bag[item]) delete G.state.bag[item];
  await msg(`${G.state.name} used the ${item.toUpperCase()}!`, 14);
  const res = G.catchCheck(b.foe.c, bonus), [fx, fy] = center(b.foe);
  G.audio.sfx('throw');
  b.orb = { x: 40, y: 70, rot: 0, s: 1 };
  for (let i = 0; i <= 26; i++) { const t = i / 26; b.orb.x = 40 + (fx - 40) * t; b.orb.y = 70 + (fy - 70) * t - Math.sin(t * Math.PI) * 50; b.orb.rot = t * 12; await G.nextFrame(); }
  b.foe.tint = '#ffffff';
  for (let i = 10; i >= 0; i--) { b.foe.scale = Math.max(.04, i / 10); await G.nextFrame(); }
  b.foe.hidden = true; b.foe.scale = 1; b.foe.tint = null;
  const ground = fy + 24;
  for (let i = 0; i <= 18; i++) { b.orb.y = fy + (ground - fy) * (i / 18); b.orb.rot = 0; await G.nextFrame(); }
  for (let k = 0; k < 3; k++) {
    if (k > res.shakes) break;
    await G.wait(20); G.audio.sfx('wobble');
    for (let i = 0; i <= 16; i++) { b.orb.rot = Math.sin(i / 16 * Math.PI * 2) * .5; await G.nextFrame(); }
    b.orb.rot = 0;
    if (k === res.shakes && !res.caught) break;
  }
  await G.wait(20);
  if (res.caught) {
    G.audio.sfx('caught');
    for (let i = 0; i < 12; i++) { b.orb.s = 1 + (i % 4 < 2 ? .15 : 0); await G.nextFrame(); }
    await msg(`Gotcha! ${G.name(b.foe.c)} was caught!`, 50);
    b.orb = null; b.showFoe = false;
    mark(b.foe.c.id, 2);
    const c = b.foe.c; c.stats = G.calcStats(c);
    if (G.state.party.length < 6) { G.state.party.push(c); await msg(`${G.name(c)} has been added to your party.`); }
    else { G.state.box.push(c); await msg(`${G.name(c)} was sent to the PC.`); }
    return 'caught';
  }
  b.orb = null; b.foe.hidden = false; await popIn(b.foe);
  await msg(['Oh no! The creature broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!', 'Shoot! It was so close, too!'][res.shakes]);
  return null;
}

// ---- Items in battle ------------------------------------------------------
async function useItem(a) {
  const c = G.state.party[a.idx], r = G.applyItem(c, a.item);
  G.state.bag[a.item]--; if (!G.state.bag[a.item]) delete G.state.bag[a.item];
  if (c === b.me.c) { G.audio.sfx('heal'); await drain(b.me); }
  await msg(`${G.state.name} used the ${a.item.toUpperCase()}!\n${r.msg}`);
}

// ---- Turn flow ------------------------------------------------------------
async function endOfTurn(f) {
  if (f.c.hp <= 0) return;
  if (f.c.status === 'psn' || f.c.status === 'brn') {
    f.c.hp = Math.max(0, f.c.hp - Math.max(1, Math.floor(f.c.stats.hp / 8)));
    await shake(f); await drain(f);
    await msg(`${nm(f)} is hurt by its ${f.c.status === 'psn' ? 'poison' : 'burn'}!`);
  }
}
// Resolves a faint; returns 'win' | 'lose' | null.
async function afterFaint() {
  if (b.foe.c.hp <= 0 && !b.foe.hidden) {
    await faint(b.foe); b.showFoe = false;
    await awardExp(b.foe);
    if (!b.wild && b.trainer.team.some(c => c.hp > 0)) {
      const next = b.trainer.team.find(c => c.hp > 0);
      await msg(`${b.trainer.cls} ${b.trainer.name} is about to send out ${G.name(next)}!`);
      await sendOutFoe(next);
    } else return 'win';
  }
  if (b.me.c.hp <= 0 && !b.me.hidden) {
    await faint(b.me); b.showMe = false;
    if (!G.state.party.some(c => c.hp > 0)) return 'lose';
    await doSwitch(await forcedSwitch(), true);
  }
  return null;
}
async function turn() {
  const my = await chooseAction();
  G.ui.text = null;
  const foeMove = pickMove(b.foe, b.me);
  if (my.t === 'run') {
    b.escapes = (b.escapes || 0) + 1;
    const odds = Math.floor(speed(b.me) * 128 / Math.max(1, speed(b.foe))) + 30 * b.escapes;
    if (odds > 255 || rnd(256) < odds) { await msg('Got away safely!'); return 'ran'; }
    await msg("Can't escape!");
  } else if (my.t === 'orb') { if (await throwOrb(my.item) === 'caught') return 'caught'; }
  else if (my.t === 'item') await useItem(my);
  else if (my.t === 'switch') await doSwitch(my.idx);
  let order = [];
  if (my.t === 'move') order.push([b.me, b.foe, my.move]);
  order.push([b.foe, b.me, foeMove]);
  if (my.t === 'move') {
    const pm = (my.move.pri || 0) - (foeMove.pri || 0);
    if (pm < 0 || (pm === 0 && (speed(b.foe) > speed(b.me) || (speed(b.foe) === speed(b.me) && rnd(2))))) order.reverse();
  }
  for (const [att, def, mv] of order) {
    if (att.c.hp <= 0 || att.hidden || (att === b.me && b.me.c !== G.state.party[G.state.party.indexOf(att.c)])) continue;
    await useMove(att, def, mv);
    const r = await afterFaint(); if (r) return r;
    if (att === b.foe && b.foe.c.hp <= 0) break;
  }
  for (const f of [b.me, b.foe]) { await endOfTurn(f); const r = await afterFaint(); if (r) return r; }
  return null;
}

// ---- Entry point ----------------------------------------------------------
// opts: { wild: creature, bg } or { trainer: { name, cls, team: [creatures], style, prize, win, lose }, bg }
G.startBattle = async function (opts) {
  const prev = G.scene, party = G.state.party;
  G.audio.music('battle');
  for (let i = 0; i < 3; i++) { await G.fadeTo(.9, 3, '#ffffff'); await G.fadeTo(0, 3); }
  for (let i = 0; i <= 22; i++) { G.ui.wipe = i / 22; await G.nextFrame(); }
  const lead = party.find(c => c.hp > 0);
  b = { wild: !!opts.wild, trainer: opts.trainer, bg: opts.bg || 'grass', showFoe: false, showMe: false, fx: null, orb: null, escapes: 0 };
  b.me = mkF(lead); b.foe = mkF(opts.wild || opts.trainer.team.find(c => c.hp > 0));
  const mine = G.charSprite(G.state.style)[1][0], big = (img) => { const [c, x] = G.cv(48, 60); x.drawImage(img, 0, 0, 16, 20, 0, 0, 48, 60); return c; };
  b.tMe = { img: big(mine), x: 20, y: 50, ox: 0 };
  G.ui.style = 'dark'; G.scene = scene; G.ui.fade.a = 0;
  if (!b.wild) b.tFoe = { img: big(G.charSprite(opts.trainer.style)[0][0]), x: 160, y: 10, ox: 0 };
  G.ui.wipe = 0; await G.wait(8);
  // intro
  if (b.wild) {
    mark(b.foe.c.id, Math.max(1, G.state.dex[b.foe.c.id] || 0));
    b.foe.hidden = false; b.showFoe = true; await slide(b.foe, 'ox', 110, 0, 24);
    await msg(`A wild ${G.name(b.foe.c)} appeared!`, 40);
  } else {
    b.tFoe.ox = 110; await slide(b.tFoe, 'ox', 110, 0, 24);
    await msg(`${opts.trainer.cls} ${opts.trainer.name}\nwould like to battle!`, 50);
    await msg(`${opts.trainer.name} sent out ${G.name(b.foe.c)}!`, 24);
    await slide(b.tFoe, 'ox', 0, 110, 18); b.tFoe = null;
    b.showFoe = true; mark(b.foe.c.id, Math.max(1, G.state.dex[b.foe.c.id] || 0)); await popIn(b.foe);
  }
  b.foe.participants.add(lead);
  await msg(`Go! ${G.name(lead)}!`, 16);
  await slide(b.tMe, 'ox', 0, -90, 16); b.tMe = null;
  b.showMe = true; mark(lead.id, 2); await popIn(b.me);
  // battle loop
  let result = null;
  while (!result) result = await turn();
  // wrap-up
  if (result === 'win' && !b.wild) {
    const t = b.trainer, last = t.team[t.team.length - 1];
    b.tFoe = { img: big(G.charSprite(t.style)[0][0]), x: 160, y: 10, ox: 110 }; await slide(b.tFoe, 'ox', 110, 0, 18);
    await msg(`${G.state.name} defeated\n${t.cls} ${t.name}!`, 40);
    if (t.win) await msg(t.win, 0);
    const prize = last.lvl * (t.prize || 40); G.state.money += prize;
    await msg(`${G.state.name} got $${prize} for winning!`);
    b.tFoe = null;
  }
  if (result === 'lose') { G.ui.layers.length = 0; await msg(`${G.state.name} is out of usable creatures!`); await msg(`${G.state.name} whited out!`); }
  party.forEach(c => { if (c.status === 'slp') c.status = null; });
  G.closeText(); G.ui.style = 'light';
  await G.fadeTo(1, 14, '#000000');
  G.scene = prev; b = null;
  return result;
};

// ---- Evolution ------------------------------------------------------------
G.runEvolutions = async function () {
  for (const c of G.state.party) {
    if (!c.evolveReady) continue; c.evolveReady = false;
    const evo = G.SPECIES[c.id].evo; if (!evo || c.lvl < evo[0]) continue;
    const prev = G.scene, from = c.id, to = evo[1];
    let t = 0, show = from, flash = 0;
    G.scene = { update() { t++; }, draw(ctx) {
      ctx.fillStyle = flash ? '#fff' : '#101820'; ctx.fillRect(0, 0, G.W, G.H);
      const img = G.creatureSprite(show), im = flash ? G.tint(img, '#ffffff') : img;
      ctx.drawImage(im, 88, 20, 64, 64);
    } };
    G.ui.style = 'dark'; G.audio.music(null);
    await G.fadeTo(0, 14, '#000');
    await msg(`What? ${G.name(c)} is evolving!`, 40);
    for (let i = 0; i < 60; i++) { if (i % 6 === 0) { show = show === from ? to : from; flash = i > 24 ? 1 : 0; } else if (i % 6 === 3) flash = 0; await G.nextFrame(); }
    show = to; flash = 0; c.id = to; c.stats = G.calcStats(c);
    G.audio.sfx('levelup'); G.state.dex[to] = 2;
    c.hp = Math.min(c.stats.hp, c.hp + 5);
    await msg(`Congratulations! Your ${G.SPECIES[from].name.toUpperCase()} evolved into ${G.name(c)}!`, 0);
    for (const m of G.movesAt(c, c.lvl)) if (!c.moves.some(x => x.id === m) && c.moves.length < 4) c.moves.push({ id: m, pp: G.MOVES[m].pp });
    G.closeText(); G.ui.style = 'light'; await G.fadeTo(1, 12, '#000'); G.scene = prev;
  }
};
})();
