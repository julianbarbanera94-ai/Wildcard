// Quests, the journal and reputation: one system for the main story and everything optional.
// A quest is data: G.quest.def({ id, cat, title, giver, region, desc, steps: [{ id, text, done(S), at, count(S) }], reward, start(S) }).
//   cat: 'main' | 'side' | 'discovery' | 'people' | 'research' | 'home'
//   steps run in order; a step's done(S) is checked a few times a second and the quest moves on by itself, so quests
//   stay valid when you do things early or out of order (every finished step is skipped straight away).
//   at: a place id on the world map for the marker; count(S) -> [have, need] for a progress bar.
//   start(S): when the quest appears in the journal by itself (otherwise call G.quest.start(id) from a scene).
//   reward: { money, items: { name: n }, rep: { region: n }, flags: [..], fn(S) } given exactly once (see G.grantOnce).
// State lives in the save: S.quests[id] = { st: 'active' | 'done', step, t }, S.rep[region] = 0..100, S.once[key] = true.
(function () {
const DEFS = G.QUESTS = {}, ORDER = [];
const CATS = [['main', 'STORY'], ['side', 'QUESTS'], ['discovery', 'FINDS'], ['people', 'PEOPLE'], ['research', 'CREATURES'], ['home', 'HOME']];
G.QUEST_CATS = CATS;
// Reputation: how well each region knows you. Tiers name it in the journal.
const REP_TIERS = [[0, 'STRANGER'], [15, 'KNOWN'], [40, 'FRIEND'], [70, 'TRUSTED'], [100, 'HERO']];
G.REP_REGIONS = [['west', 'WEST', 'Sunmeadow, Sunhaven, Evergreen, Driftwood, Verdant'], ['south', 'SOUTH', 'Stonebridge, Mirewood, Whispering Woods, Tidepool, Tidefall, Moonlit'],
  ['north', 'NORTH', 'The Ridge, Lakeside, Cloudpeak, Glacier Pass, Frostmere, Aurora'], ['east', 'EAST', 'Sandsreach, Badlands, Emberfall, Cobalt'], ['vale', 'LANTERNREST', 'Lanternrest and the homestead']];

function st() {
  const S = G.state; if (!S) return null;
  S.quests = S.quests || {}; S.rep = S.rep || {}; S.once = S.once || {}; S.journal = S.journal || { markers: true, seen: {} };
  return S;
}
// Run fn once per key for the whole save: reloading, revisiting or replaying an event never pays twice.
G.grantOnce = function (key, fn) { const S = st(); if (!S || S.once[key]) return false; S.once[key] = true; fn && fn(S); return true; };

const rep = G.rep = {
  get: r => { const S = st(); return S ? Math.min(100, S.rep[r] || 0) : 0; },
  add(r, n) { const S = st(); if (!S) return; const was = rep.tier(r); S.rep[r] = Math.max(0, Math.min(100, (S.rep[r] || 0) + n)); const now = rep.tier(r); if (now !== was && n > 0) G.questToast(`${G.REP_REGIONS.find(x => x[0] === r)[1]}: ${now}`, 'rep'); },
  tier: r => { const v = rep.get(r); let t = REP_TIERS[0][1]; for (const [m, n] of REP_TIERS) if (v >= m) t = n; return t; },
  tiers: REP_TIERS,
  max() { const S = st(); for (const [r] of G.REP_REGIONS) S.rep[r] = 100; },
};

function give(q) {
  const R = q.reward; if (!R) return;
  G.grantOnce('quest:' + q.id, S => {
    if (R.money) S.money += R.money;
    for (const [k, n] of Object.entries(R.items || {})) S.bag[k] = (S.bag[k] || 0) + n;
    for (const [r, n] of Object.entries(R.rep || {})) rep.add(r, n);
    for (const f of R.flags || []) S.flags[f] = true;
    if (R.fn) R.fn(S);
  });
}
function rewardText(R) {
  if (!R) return ''; const b = [];
  if (R.money) b.push('$' + R.money.toLocaleString('en-US'));
  for (const [k, n] of Object.entries(R.items || {})) b.push(`${k} x${n}`);
  for (const [r, n] of Object.entries(R.rep || {})) b.push(`+${n} ${G.REP_REGIONS.find(x => x[0] === r)[1]} REP`);
  if (R.text) b.push(R.text);
  return b.join(', ');
}

const quest = G.quest = {
  def(q) { if (!DEFS[q.id]) ORDER.push(q.id); DEFS[q.id] = q; return q; },
  all: () => ORDER.map(id => DEFS[id]),
  state: id => { const S = st(); return S && S.quests[id]; },
  active: id => { const s = quest.state(id); return !!s && s.st === 'active'; },
  done: id => { const s = quest.state(id); return !!s && s.st === 'done'; },
  start(id, quiet) {
    const S = st(), q = DEFS[id]; if (!S || !q || S.quests[id]) return false;
    S.quests[id] = { st: 'active', step: 0, t: S.frames || 0 };
    if (!quiet) G.questToast((q.cat === 'main' ? 'NEW LEAD: ' : 'NEW: ') + q.title, q.cat);
    quest.check(id, true);
    return true;
  },
  // Moves a quest past every step that is already done (it may finish straight away).
  check(id, quiet) {
    const S = st(), q = DEFS[id], s = S && S.quests[id]; if (!s || s.st !== 'active') return;
    let moved = false;
    while (s.step < q.steps.length && q.steps[s.step].done && q.steps[s.step].done(S)) { s.step++; moved = true; }
    if (s.step >= q.steps.length) quest.complete(id, quiet);
    else if (moved && !quiet) G.questToast(q.steps[s.step].text, 'step');
  },
  // Finishes a quest (from a scene or when its last step is done). Safe to call again: the reward is given once.
  complete(id, quiet) {
    const S = st(), q = DEFS[id]; if (!S || !q) return;
    const s = S.quests[id] = S.quests[id] || { st: 'active', step: 0, t: S.frames || 0 };
    if (s.st === 'done') return;
    s.st = 'done'; s.step = q.steps.length; give(q);
    if (!quiet) { G.questToast('COMPLETE: ' + q.title, 'done'); G.audio && G.audio.sfx && G.audio.sfx('levelup'); }
  },
  // Test Mode: every quest finished and every reward given.
  completeAll() { for (const id of ORDER) quest.complete(id, true); },
  // Quests that start themselves, and steps that finish themselves.
  tick() {
    const S = st(); if (!S) return;
    for (const id of ORDER) { const q = DEFS[id]; if (!S.quests[id] && q.start && q.start(S)) quest.start(id); }
    for (const id of ORDER) if (S.quests[id] && S.quests[id].st === 'active') quest.check(id);
  },
  step(id) { const q = DEFS[id], s = quest.state(id), p = q && s && s.st === 'active' ? q.steps[s.step] : null; if (!p) return null;
    return typeof p.at === 'function' ? Object.assign({}, p, { at: p.at(G.state) }) : p; },
  // The current main-story lead (the first active main quest), for the journal header and the map marker.
  lead() { const qs = ORDER.map(id => DEFS[id]).filter(q => q.cat === 'main' && quest.active(q.id)).sort((a, b) => (b.prio || 0) - (a.prio || 0)); return qs.length ? { q: qs[0], step: quest.step(qs[0].id) } : null; },
  // Places to mark on the world map: { id: 'main' | 'side' }.
  markers() {
    const S = st(), out = {}; if (!S || S.journal.markers === false) return out;
    for (const id of ORDER) { const q = DEFS[id], s = quest.step(id); if (s && s.at && !out[s.at]) out[s.at] = q.cat === 'main' ? 'main' : 'side'; }
    return out;
  },
  rewardText,
};
let tk = 0;
G.hooks.tick.push(() => { if (++tk % 20 === 0 && G.state && G.state.flags && G.state.flags.starter) quest.tick(); });

// ---- A short toast at the top of the overworld ---------------------------------------------------------------------------------
let toasts = [];
G.questToast = function (text, kind) { toasts.push({ text, kind, t: 0 }); if (toasts.length > 3) toasts.shift(); };
G.hooks.overlay.push(ctx => {
  if (!toasts.length || G.scene !== G.world.scene) return;
  const T = toasts[0]; T.t++;
  const col = { main: '#f7a33f', done: '#3fae5a', rep: '#9a5ae0', step: '#3a9ae8' }[T.kind] || '#41c7b4';
  const k = T.t < 12 ? T.t / 12 : T.t > 150 ? Math.max(0, (170 - T.t) / 20) : 1, W = G.W;
  ctx.save(); ctx.globalAlpha = k;
  ctx.font = G.FONT_S; const tw = Math.min(W - 24, ctx.measureText(T.text).width + 30), x = (W - tw) / 2, y = 22 - (1 - k) * 8;
  G.frame(ctx, x, y, tw, 14, 'light'); G.kit.pill(ctx, x + 4, y + 3, 8, 8, col, '');
  G.text(ctx, T.text, x + 16, y + 4, { font: G.FONT_S, color: '#4a3a56', shadow: false });
  ctx.restore();
  if (T.t > 170) toasts.shift();
});

// ---- START > JOURNAL ----------------------------------------------------------------------------------------------------------
G.journalScreen = async function () {
  const S = st(); quest.tick();
  const tabs = [...CATS, ['rep', 'REP']];
  let tab = 0, row = 0, close = false, tap = null;
  const listOf = c => quest.all().filter(q => q.cat === c && S.quests[q.id]).sort((a, b) => (S.quests[a.id].st === 'done') - (S.quests[b.id].st === 'done'));
  const layer = { draw(ctx) {
    G.frame(ctx, 2, 2, 236, 156, 'light'); G.tapZone(-999, -999, 2400, 2400, () => {});
    G.text(ctx, 'JOURNAL', 10, 6, { font: G.FONT_B || G.FONT });
    const mk = S.journal.markers !== false;
    G.kit.pill(ctx, 134, 5.5, 52, 9, mk ? '#3fae5a' : '#9a8ea8', mk ? 'MARKERS: ON' : 'MARKERS: OFF'); G.tapZone(134, 4, 52, 11, () => { tap = 'markers'; });
    G.kit.pill(ctx, 190, 5.5, 44, 9, '#9a8ea8', G.touch ? 'CLOSE' : 'B: CLOSE'); G.tapZone(190, 4, 44, 11, () => { close = true; });
    // tabs
    let tx = 6; tabs.forEach(([, n], i) => { ctx.font = '900 5.5px ' + G.FONT_FAM; const w = ctx.measureText(n).width + 7; G.kit.pill(ctx, tx, 18, w, 8.5, i === tab ? '#f7843f' : '#c8bcd4', n); G.tapZone(tx, 17, w, 11, () => { tap = ['tab', i]; }); tx += w + 2; });
    const sm = { font: G.FONT_S, color: '#5a4a66', shadow: false };
    if (tabs[tab][0] === 'rep') {
      G.REP_REGIONS.forEach(([r, n, sub], i) => { const y = 33 + i * 23, v = rep.get(r);
        G.text(ctx, n, 10, y, { font: G.FONT_B || G.FONT }); G.text(ctx, rep.tier(r), 230, y, { align: 'right', font: G.FONT_S, color: '#9a5ae0', shadow: false });
        G.text(ctx, sub, 10, y + 9, sm);
        G.kit.rr(ctx, 84, y + 3, 100, 4, 2); ctx.fillStyle = '#e8dff0'; ctx.fill(); if (v) { G.kit.rr(ctx, 84, y + 3, 100 * v / 100, 4, 2); ctx.fillStyle = '#b07ae8'; ctx.fill(); } });
      return;
    }
    const list = listOf(tabs[tab][0]);
    if (tab === 0) { const L = quest.lead(); G.text(ctx, L ? 'CURRENT LEAD: ' + L.step.text : 'No story lead right now. Explore!', 10, 30, { font: G.FONT_S, color: '#c06a10', shadow: false }); }
    if (!list.length) { G.text(ctx, 'Nothing here yet. Explore, talk to people and help out.', 10, 44, sm); return; }
    row = Math.min(row, list.length - 1);
    const top = tab === 0 ? 40 : 32, lw = 92;
    list.slice(0, 10).forEach((q, i) => { const s = S.quests[q.id], y = top + i * 11.5, on = i === row;
      if (on) { G.kit.rr(ctx, 6, y - 1.5, lw, 10.5, 4); ctx.fillStyle = 'rgba(247,132,63,.18)'; ctx.fill(); }
      G.text(ctx, (s.st === 'done' ? '✓ ' : '• ') + q.title, 9, y, { font: G.FONT_S, color: s.st === 'done' ? '#8aa86a' : '#4a3a56', shadow: false });
      G.tapZone(6, y - 2, lw, 11, () => { tap = ['row', i]; }); });
    // detail
    const q = list[row], s = S.quests[q.id], x = 104, w = 128; let y = top;
    G.text(ctx, q.title, x, y, { font: G.FONT_B || G.FONT }); y += 10;
    if (q.giver) { G.text(ctx, 'FROM: ' + q.giver, x, y, { ...sm, color: '#8a7a90' }); y += 8; }
    G.wrap(q.desc || '', w).slice(0, 3).forEach(l => { G.text(ctx, l, x, y, sm); y += 7.5; }); y += 2;
    q.steps.forEach((p, i) => { if (i > s.step) return; const done = i < s.step || s.st === 'done';
      const c = p.count && !done ? p.count(S) : null, txt = (done ? '✓ ' : '› ') + p.text + (c ? ` (${Math.min(c[0], c[1])}/${c[1]})` : '');
      G.wrap(txt, w).slice(0, 2).forEach(l => { if (y < 146) G.text(ctx, l, x, y, { font: G.FONT_S, color: done ? '#8aa86a' : '#2a6ab8', shadow: false }); y += 7.5; }); });
    const R = rewardText(q.reward); if (R) { const ls = G.wrap((s.st === 'done' ? 'GOT: ' : 'REWARD: ') + R, w).slice(0, 2); let ry = Math.max(y + 2, 148 - ls.length * 7.5); ls.forEach(l => { G.text(ctx, l, x, ry, { font: G.FONT_S, color: '#2a7a4a', shadow: false }); ry += 7.5; }); }
  } };
  G.ui.layers.push(layer); G.audio.sfx('select');
  for (;;) {
    await G.nextFrame(); const k = G.input.pressed, n = tabs[tab][0] === 'rep' ? 0 : listOf(tabs[tab][0]).length;
    if (tap) { const t = tap; tap = null; if (t === 'markers') S.journal.markers = S.journal.markers === false; else if (t[0] === 'tab') { tab = t[1]; row = 0; } else row = t[1]; G.audio.sfx('select'); continue; }
    if (close || k.b) break;
    if (k.left || k.right) { tab = (tab + (k.right ? 1 : tabs.length - 1)) % tabs.length; row = 0; G.audio.sfx('select'); }
    if (n && (k.up || k.down)) { row = (row + (k.down ? 1 : n - 1)) % n; G.audio.sfx('select'); }
    if (k.a) { S.journal.markers = S.journal.markers === false; G.audio.sfx('select'); }
  }
  G.ui.layers.splice(G.ui.layers.indexOf(layer), 1); G.audio.sfx('select');
};
})();
