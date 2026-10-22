// Arena runtime (the badge art and case, the badge fanfare, electric gates and sand pits). Loads after js/world.js.
// Data (G.BADGES, the arena maps and Leaders) lives in js/maps/zz_arenas.js.
(function () {
const G = globalThis.G;
if (!G.BADGES || !G.hooks || G.arenasLoaded) return;
G.arenasLoaded = true;
const K = G.kit, PI = Math.PI, TAU = PI * 2, F6 = G.FONT_S;
const hooks = G.hooks, flags = () => G.state.flags;
const shade = (c, f) => G.shade(c, f);

// ---- Badge art: one distinct shape per type ----------------------------------------------------------------
const PLATE = {
  Rock(c, x, y, r) { c.moveTo(x - r * .62, y - r * .88); c.lineTo(x + r * .62, y - r * .88); c.lineTo(x + r * .98, y + r * .88); c.lineTo(x - r * .98, y + r * .88); c.closePath(); },
  Grass(c, x, y, r) { for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * TAU / 5; c.moveTo(x + Math.cos(a) * r * .55 + r * .46, y + Math.sin(a) * r * .55); c.arc(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .46, 0, TAU); } c.moveTo(x + r * .4, y); c.arc(x, y, r * .4, 0, TAU); },
  Water(c, x, y, r) { c.moveTo(x, y - r); c.bezierCurveTo(x + r * .15, y - r * .55, x + r * .88, y - r * .1, x + r * .88, y + r * .25); c.arc(x, y + r * .25, r * .88, 0, PI); c.bezierCurveTo(x - r * .88, y - r * .1, x - r * .15, y - r * .55, x, y - r); c.closePath(); },
  Flying(c, x, y, r) { for (const s of [-1, 1]) { c.moveTo(x, y + r * .7); c.bezierCurveTo(x + s * r * .3, y + r * .75, x + s * r * 1.0, y + r * .35, x + s * r * 1.02, y - r * .6); c.bezierCurveTo(x + s * r * .78, y - r * .5, x + s * r * .7, y - r * .72, x + s * r * .62, y - r * .85); c.bezierCurveTo(x + s * r * .5, y - r * .55, x + s * r * .3, y - r * .5, x + s * r * .12, y - r * .2); c.closePath(); } },
  Ground(c, x, y, r) { c.arc(x, y, r * .95, 0, TAU); },
  Electric(c, x, y, r) { for (let i = 0; i < 6; i++) { const a = i * TAU / 6 - PI / 2; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); },
  Ice(c, x, y, r) { for (let i = 0; i < 12; i++) { const a = i * TAU / 12 - PI / 2, rr = i % 2 ? r * .62 : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); },
  Fire(c, x, y, r) { c.moveTo(x + r * .08, y - r); c.bezierCurveTo(x + r * .2, y - r * .5, x + r * .95, y - r * .15, x + r * .8, y + r * .42); c.bezierCurveTo(x + r * .68, y + r * .85, x + r * .2, y + r * .98, x, y + r * .98); c.bezierCurveTo(x - r * .6, y + r * .98, x - r * .98, y + r * .5, x - r * .8, y + r * .05); c.bezierCurveTo(x - r * .7, y - r * .22, x - r * .5, y - r * .3, x - r * .42, y - r * .55); c.bezierCurveTo(x - r * .15, y - r * .35, x - r * .05, y - r * .6, x + r * .08, y - r); c.closePath(); },
};
// Emblem lines/shapes drawn on top of a plate; col = main emblem colour, dk = shadow colour.
const EMBLEM = {
  Rock(c, x, y, r, col) { c.lineWidth = r * .16; c.strokeStyle = col; c.beginPath(); c.moveTo(x - r * .5, y + r * .62); c.lineTo(x - r * .5, y + r * .05); c.arc(x, y + r * .05, r * .5, PI, 0); c.lineTo(x + r * .5, y + r * .62); c.stroke(); c.beginPath(); c.moveTo(x - r * .3, y - r * .5); c.lineTo(x + r * .3, y - r * .5); c.stroke(); },
  Grass(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r * .26, 0, TAU); c.fill(); c.fillStyle = shade(col, .8); c.beginPath(); c.arc(x - r * .07, y - r * .07, r * .1, 0, TAU); c.fill(); },
  Water(c, x, y, r, col) { c.strokeStyle = col; c.lineWidth = r * .14; c.beginPath(); c.moveTo(x - r * .5, y + r * .2); c.quadraticCurveTo(x - r * .25, y - r * .05, x, y + r * .2); c.quadraticCurveTo(x + r * .25, y + r * .45, x + r * .5, y + r * .2); c.stroke(); c.beginPath(); c.ellipse(x - r * .28, y - r * .1, r * .1, r * .2, .4, 0, TAU); c.fillStyle = col; c.globalAlpha *= .8; c.fill(); },
  Flying(c, x, y, r, col) { c.strokeStyle = col; c.lineWidth = r * .1; for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(x + s * r * .2, y + r * (.35 - k * .25)); c.quadraticCurveTo(x + s * r * .6, y + r * (.3 - k * .25), x + s * r * .85, y + r * (-.2 - k * .1)); c.stroke(); } },
  Ground(c, x, y, r, col) { c.strokeStyle = col; c.lineWidth = r * .13; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x - r * .62, y + k * r * .36); c.quadraticCurveTo(x - r * .3, y + k * r * .36 - r * .22, x, y + k * r * .36); c.quadraticCurveTo(x + r * .3, y + k * r * .36 + r * .22, x + r * .62, y + k * r * .36); c.stroke(); } },
  Electric(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x + r * .18, y - r * .62); c.lineTo(x - r * .34, y + r * .08); c.lineTo(x - r * .02, y + r * .08); c.lineTo(x - r * .18, y + r * .62); c.lineTo(x + r * .36, y - r * .1); c.lineTo(x + r * .04, y - r * .1); c.closePath(); c.fill(); },
  Ice(c, x, y, r, col) { c.strokeStyle = col; c.lineWidth = r * .1; for (let i = 0; i < 3; i++) { const a = i * PI / 3; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5); c.lineTo(x - Math.cos(a) * r * .5, y - Math.sin(a) * r * .5); c.stroke(); } },
  Fire(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x + r * .04, y - r * .15); c.bezierCurveTo(x + r * .1, y + r * .05, x + r * .45, y + r * .1, x + r * .38, y + r * .45); c.bezierCurveTo(x + r * .3, y + r * .68, x - r * .05, y + r * .72, x - r * .1, y + r * .72); c.bezierCurveTo(x - r * .42, y + r * .68, x - r * .5, y + r * .4, x - r * .36, y + r * .22); c.bezierCurveTo(x - r * .3, y + r * .1, x - r * .12, y + r * .05, x + r * .04, y - r * .15); c.fill(); },
};
// Draws badge i (index into G.BADGES) centred at (x, y) with radius r. mini: tiny row version (no emblem detail).
function drawBadge(ctx, i, x, y, r, earned, t, mini) {
  const b = G.BADGES[i], col = b.col, shape = PLATE[b.type];
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (!mini) { ctx.beginPath(); shape(ctx, x + .5, y + 1.2, r); ctx.fillStyle = 'rgba(30,16,50,.35)'; ctx.fill(); }
  ctx.beginPath(); shape(ctx, x, y, r);
  if (earned) {
    ctx.lineWidth = (mini ? .6 : Math.max(.8, r * .1)) * 2; ctx.strokeStyle = shade(col, .5); ctx.stroke();   // outline first, so overlapping petals show no inner lines
    ctx.fillStyle = K.lin(ctx, x, y - r, x, y + r, [shade(col, 1.45), col, shade(col, .78)]); ctx.fill();
    if (!mini) {
      ctx.save(); ctx.beginPath(); shape(ctx, x, y, r); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - r * .25, y - r * .45, r * .7, r * .3, -.5, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1; EMBLEM[b.type](ctx, x, y, r * .9, b.type === 'Rock' || b.type === 'Ground' ? '#fff3d0' : b.type === 'Grass' ? '#ffe45a' : '#ffffff');
    }
  } else {
    ctx.lineWidth = (mini ? .5 : Math.max(.7, r * .08)) * 2; ctx.strokeStyle = '#3e3956'; ctx.stroke();
    ctx.fillStyle = K.lin(ctx, x, y - r, x, y + r, ['#8a84a4', '#6c6688', '#554f70']); ctx.fill();
    if (!mini) { ctx.globalAlpha = .55; EMBLEM[b.type](ctx, x, y, r * .9, '#47425f'); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
  if (earned && !mini && t !== undefined) {   // sparkles
    for (let k = 0; k < 3; k++) {
      const ph = ((t + i * 23 + k * 41) % 120) / 120, s = Math.sin(ph * PI) * r * .42; if (s < .6) continue;
      const a = k * 2.1 + i, px = x + Math.cos(a) * r * .75, py = y + Math.sin(a * 1.3) * r * .7;
      K.star(ctx, px, py, s, '#fffbe0');
    }
  }
}
G.drawBadge = drawBadge;
// A row of the eight badges: (x, y) is the top-left, `size` the width of one.
G.drawBadgeRow = function (ctx, x, y, size) {
  const f = flags(), r = size / 2;
  G.BADGES.forEach((b, i) => drawBadge(ctx, i, x + i * (size + 1.2) + r, y + r, r * .92, !!f['badge_' + b.id], undefined, true));
};

// ---- Badge case --------------------------------------------------------------------------------------------
G.badgeCase = async function (start) {
  const S = G.state; let idx = Math.max(0, Math.min(7, start || 0));
  const earned = i => !!S.flags['badge_' + G.BADGES[i].id];
  const layer = { draw(ctx) {
    const t = G.frameNo;
    // backdrop: soft lilac with drifting dots, like the other menu screens
    K.blit(ctx, K.cache('bcbg', 240, 160, x => { x.fillStyle = K.lin(x, 0, 0, 0, 160, ['#f0e0ff', '#d2b8f4', '#b8a0e8']); x.fillRect(0, 0, 240, 160); const g = x.createRadialGradient(60, 30, 0, 60, 30, 160); g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 240, 160); }, { pad: 0, qmax: 4 }), 0, 0);
    const o = (t * .2) % 32; ctx.fillStyle = 'rgba(255,255,255,.3)';
    for (let yy = -16; yy < 176; yy += 16) for (let xx = ((yy / 16) % 2 ? 16 : 0) - 32; xx < 272; xx += 32) { ctx.beginPath(); ctx.arc(xx + 8 + o, yy + 8 + o, 3.2, 0, 7); ctx.fill(); }
    // header ribbon
    K.rr(ctx, 2, 1, 236, 14, 7); ctx.fillStyle = '#fff'; ctx.fill();
    K.rr(ctx, 3.4, 2.4, 233.2, 11.2, 5.6); ctx.fillStyle = K.lin(ctx, 0, 2, 0, 14, ['#c9a0ff', '#a070e0', '#7e50c0']); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; K.rr(ctx, 8, 3.4, 224, 3, 1.5); ctx.fill();
    K.star(ctx, 10, 8, 3, '#fff6a8');
    G.text(ctx, 'BADGE CASE', 16, 4, { color: '#fff', shadow: '#5a3490' });
    G.text(ctx, `${G.badgeCount()} / 8`, 214, 4, { align: 'right', color: '#fff', shadow: '#5a3490' });
    K.pill(ctx, 217, 4, 19, 8, '#ff7a6a', 'B'); G.tapZone(200, 0, 40, 17, () => G.tapKey('b'));
    // the velvet-lined case
    G.frame(ctx, 3, 18, 234, 90, 'light');
    K.rr(ctx, 7, 22, 226, 82, 6); ctx.fillStyle = K.lin(ctx, 0, 22, 0, 104, ['#5a4690', '#3a2c6a', '#2c2254']); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,140,.5)'; ctx.lineWidth = .8; K.rr(ctx, 7.6, 22.6, 224.8, 80.8, 5.6); ctx.stroke();
    G.BADGES.forEach((b, i) => {
      const cx = 7 + (i % 4) * 56.5 + 28.2, cy0 = 22 + Math.floor(i / 4) * 41, cy = cy0 + 17, got = earned(i), sel = i === idx;
      G.tapZone(cx - 28, cy0, 56, 41, () => { if (idx !== i) { idx = i; G.audio.sfx('select'); } });
      if (sel) { K.rr(ctx, cx - 26.5, cy0 + 2, 53, 37, 7); ctx.fillStyle = `rgba(255,205,110,${.2 + .08 * Math.sin(t / 10)})`; ctx.fill(); ctx.strokeStyle = 'rgba(255,200,100,.9)'; ctx.lineWidth = .9; ctx.stroke(); }
      // the badge's slot (a dished circle)
      ctx.fillStyle = 'rgba(10,6,30,.45)'; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 15.5, 14, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 15.5, 14, 0, 0, TAU); ctx.stroke();
      if (got) { K.drawGlow(ctx, '#ffe066', cx, cy, 22 + Math.sin(t / 14 + i) * 1.5, .45 + .1 * Math.sin(t / 9 + i)); }
      drawBadge(ctx, i, cx, cy + (sel && got ? Math.sin(t / 12) * 1 : 0), 12, got, t);
      const city = b.city.toUpperCase();
      G.text(ctx, city, cx, cy0 + 31, { align: 'center', font: F6, color: got ? '#ffe9a0' : '#a89ccc', shadow: 'rgba(0,0,0,.5)' });
    });
    // description of the highlighted badge
    const b = G.BADGES[idx], got = earned(idx);
    G.frame(ctx, 3, 110, 234, 48, 'light');
    G.text(ctx, got ? b.name.toUpperCase() : '? ? ?  ' + b.name.toUpperCase(), 11, 115, { font: G.FONT_B, color: got ? '#c8780a' : '#6a5a86' });
    G.typeBadge(ctx, b.type, 198, 114);
    const body = got ? b.desc : `Defeat Arena Leader ${b.leader} at the ${b.city[0].toUpperCase() + b.city.slice(1)} Arena to earn it.`;
    G.wrap(body, 214).slice(0, 3).forEach((l, k) => G.text(ctx, l, 11, 127 + k * 10, { font: F6, color: '#5a4a66', shadow: false }));
  } };
  G.ui.layers.push(layer); G.audio.sfx('select');
  for (;;) {
    await G.nextFrame(); const p = G.input.pressed;
    if (p.b) break;
    let n = idx;
    if (p.left && idx % 4) n--; if (p.right && idx % 4 < 3) n++; if (p.up && idx > 3) n -= 4; if (p.down && idx < 4) n += 4;
    if (n !== idx) { idx = n; G.audio.sfx('select'); }
  }
  G.ui.layers.splice(G.ui.layers.indexOf(layer), 1);
};

// ---- Earning a badge ---------------------------------------------------------------------------------------------
async function award(b) {
  const S = G.state, says = G.worldApi.says, i = G.BADGES.indexOf(b);
  S.flags['badge_' + b.id] = true;
  const n = G.badgeCount();
  G.audio.sfx('levelup'); await G.fadeTo(.9, 5, '#ffe680');
  let t = 0;
  const layer = { draw(ctx) {
    const k = Math.min(1, t / 24), pop = 1 + Math.sin(k * PI) * .25, ease = 1 - Math.pow(1 - k, 3);
    ctx.fillStyle = `rgba(14,8,40,${.62 * Math.min(1, t / 10)})`; ctx.fillRect(-300, -300, 900, 800);
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 12; r++) { const a = r / 12 * TAU + t / 90; ctx.fillStyle = 'rgba(255,224,120,.07)'; ctx.beginPath(); ctx.moveTo(120, 62); ctx.arc(120, 62, 130, a, a + .15); ctx.fill(); }
    K.drawGlow(ctx, '#ffe066', 120, 62, 54 * ease, .8);
    ctx.globalCompositeOperation = 'source-over';
    drawBadge(ctx, i, 120, 62, 30 * ease * pop, true, t * 2);
    for (let s = 0; s < 14; s++) { const a = s / 14 * TAU + t / 30, rr = 36 + ((t * 1.2 + s * 9) % 40); const al = 1 - ((t * 1.2 + s * 9) % 40) / 40; ctx.globalAlpha = al * ease; K.star(ctx, 120 + Math.cos(a) * rr, 62 + Math.sin(a) * rr * .8, 2 + (s % 3), '#fff6b0'); }
    ctx.globalAlpha = 1;
    const by = 104 + (1 - ease) * 30; G.frame(ctx, 14, by, 212, 22, 'dark');
    K.star(ctx, 24, by + 11, 3.5, '#ffe066'); K.star(ctx, 216, by + 11, 3.5, '#ffe066');
    G.text(ctx, `You earned the ${b.name.toUpperCase()}!`, 120, by + 7.5, { align: 'center', color: '#fff', shadow: '#0c2a40' });
  } };
  G.ui.layers.push(layer);
  await G.fadeTo(0, 14);
  while (t < 150) { await G.nextFrame(); t++; if (t === 26) G.audio.sfx('caught'); if (t > 60 && (G.input.pressed.a || G.input.pressed.b)) break; }
  await G.fadeTo(1, 8, '#000'); G.ui.layers.splice(G.ui.layers.indexOf(layer), 1); await G.fadeTo(0, 8);
  S.bag[b.orb] = (S.bag[b.orb] || 0) + 5; G.audio.sfx('levelup');
  await says([`${S.name} received 5 ${b.orb.toUpperCase()}s!`, `${S.name} now holds ${n} Arena Badge${n > 1 ? 's' : ''}.`]);
  const opens = G.BADGE_OPENS[n];
  if (opens) await says(`With ${n} badge${n > 1 ? 's' : ''}, the road to ${opens} is now open to you!`);
  else if (n === 7) await says('One badge remains. Only the last Arena Leader stands between you and the whole of Aurelis!');
}
G.awardBadge = award;
hooks.tick.push(() => {
  const m = G.world.map; if (!m || !m.badge || !G.state) return;
  const b = G.BADGES.find(x => x.id === m.badge), f = G.state.flags;
  if (f[`arena_${b.city}_leader`] && !f['badge_' + b.id]) G.runWorld(() => award(b));
});

// ---- Electric gates and switches -------------------------------------------------------------------------------------
const gateKey = (m, key) => `gate_${m.id}_${key}`;
const gateOpen = (m, key) => !!flags()[gateKey(m, key)];
function syncGates(m) {
  if (!m.gates || !m.gates.length) return; m.block = m.block || new Set();
  for (const g of m.gates) { const k = g.x + ',' + g.y; if (gateOpen(m, g.key)) m.block.delete(k); else m.block.add(k); }
}
hooks.load.push(m => { if (m.arenaType) syncGates(m); });
for (const m of Object.values(G.MAPS)) if (m.arenaType && m.switches) for (const [x, y, key] of m.switches) {
  const gate = m.gates.find(g => g.key === key), name = gate ? gate.name.toLowerCase() : '';
  m.objs.push({ x, y, prompt: 'Press switch', fn: async () => {
    const P = G.world.p, on = gateOpen(m, key);
    if (on && m.gates.some(g => g.key === key && g.x === P.x && g.y === P.y)) return;
    flags()[gateKey(m, key)] = !on; syncGates(m); G.audio.sfx(on ? 'bump' : 'levelup');
    await G.worldApi.says(on ? `Click! The ${name} laser gate hums back on.` : `Click! The ${name} laser gate flickers off. The way is open!`);
  } });
}
function laser(ctx, x, y, g, open, t) {
  ctx.save();
  for (const px of [x + 1.5, x + 14.5]) { ctx.fillStyle = '#3a3a4c'; K.rr(ctx, px - 1.6, y + 1, 3.2, 14, 1.4); ctx.fill(); ctx.fillStyle = open ? shade(g.col, .5) : g.col; ctx.beginPath(); ctx.arc(px, y + 3, 1.3, 0, TAU); ctx.fill(); }
  if (!open) {
    const fl = .75 + .25 * Math.sin(t / 3 + g.x);
    ctx.globalCompositeOperation = 'lighter'; K.drawGlow(ctx, g.col, x + 8, y + 8, 14, .35 * fl);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const yy = y + 3.5 + k * 3.1; ctx.strokeStyle = g.col; ctx.globalAlpha = .35 * fl; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x + 2, yy); ctx.lineTo(x + 14, yy); ctx.stroke(); ctx.globalAlpha = .95 * fl; ctx.strokeStyle = '#fff'; ctx.lineWidth = .7; ctx.stroke(); }
  }
  ctx.restore();
}
// ---- Drawing the arena extras --------------------------------------------------------------------------------------
hooks.draw.push((items, cx, cy, t) => {
  const m = G.world.map; if (!m || !m.arenaType) return;
  for (const g of m.gates || []) { const open = gateOpen(m, g.key); items.push({ y: g.y * 16 + 15.5, draw: c => laser(c, g.x * 16 - cx, g.y * 16 - cy, g, open, t) }); }
  for (const [x, y, key] of m.switches || []) {
    const g = m.gates.find(q => q.key === key), on = gateOpen(m, key);
    items.push({ y: y * 16 + 16.6, draw: c => { const px = x * 16 - cx + 8, py = y * 16 - cy + 1; c.globalCompositeOperation = 'lighter'; K.drawGlow(c, g.col, px, py, 9, on ? .9 : .4 + .3 * Math.sin(t / 8)); c.globalCompositeOperation = 'source-over'; c.fillStyle = on ? '#fff' : g.col; c.beginPath(); c.arc(px, py, 1.7, 0, TAU); c.fill(); c.strokeStyle = '#2a2a3c'; c.lineWidth = .6; c.stroke(); } });
  }
  for (const [x, y] of m.pits || []) items.push({ y: y * 16 + .3, draw: c => {
    const px = x * 16 - cx + 8, py = y * 16 - cy + 8;
    c.fillStyle = '#b07c3a'; c.beginPath(); c.ellipse(px, py, 8, 7, 0, 0, TAU); c.fill();
    const gr = c.createRadialGradient(px, py, 0, px, py, 7); gr.addColorStop(0, '#2a1608'); gr.addColorStop(.6, '#6a4018'); gr.addColorStop(1, '#a8742e'); c.fillStyle = gr; c.beginPath(); c.ellipse(px, py, 6.8, 5.9, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(240,210,150,.6)'; c.lineWidth = .6;
    for (let k = 0; k < 3; k++) { const a = t / 18 + k * 2.1; c.beginPath(); c.ellipse(px, py, 5.2 - k * 1.4, 4.4 - k * 1.2, 0, a, a + 2.6); c.stroke(); }
  } });
});
// Sand pits drop you back at the door.
hooks.beforeWarp.push(async w => {
  if (!w.pit) return;
  G.audio.sfx('bump'); await G.worldApi.says('Whoa! The sand gives way, and you slide all the way back down to the entrance!');
});
})();
