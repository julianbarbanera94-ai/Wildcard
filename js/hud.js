// The always-on HUD while you play (settings: START > SETTINGS > HUD, each piece has its own switch):
//   party bar (top left)       each partner's face and HP; tap to open the party
//   quest tracker (under it)   the current main quest step; tap for the journal
//   mini-map (top right)       the area around you, entrances in orange; tap for the world map
//   money and time (right)     $ and the time of day
//   ride chip (right)          get on or off your equipped transport (V on a keyboard); equip in START > TRAVEL
// It hides during dialogue, menus, cutscenes and battles, and steps aside for the farm energy bar and the sea mini-map.
(function () {
const G = globalThis.G, TAU = Math.PI * 2, K = () => G.kit;
const F = G.FONT_S;
const pillBg = (ctx, x, y, w, h) => { ctx.fillStyle = 'rgba(30,20,50,.58)'; K().rr(ctx, x, y, w, h, Math.min(h / 2, 6)); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = .6; ctx.stroke(); };
const fit = (ctx, text, max) => { ctx.font = F; if (ctx.measureText(text).width <= max) return text; while (text.length > 3 && ctx.measureText(text + '...').width > max) text = text.slice(0, -1); return text + '...'; };
const open = fn => () => { if (G.world.busy || G.ui.layers.length || G.ui.text) return; G.runWorld(fn); };

// ---- Party bar ------------------------------------------------------------------------------------------------------------
function partyBar(ctx, S, x, y) {
  const P = S.party.slice(0, 6), cw = 17, w = P.length * cw + 3;
  pillBg(ctx, x, y, w, 20);
  const lead = P.findIndex(c => c.hp > 0);
  P.forEach((c, i) => {
    const cx = x + 2 + i * cw, ratio = Math.max(0, Math.min(1, c.hp / c.stats.hp)), down = c.hp <= 0;
    if (i === lead) { ctx.fillStyle = 'rgba(255,214,120,.28)'; K().rr(ctx, cx - .5, y + 1.5, cw - 1, 17, 4); ctx.fill(); }
    ctx.globalAlpha = down ? .35 : 1; ctx.drawImage(G.creatureSprite(c.id), cx + 1.5, y + 1.8, 12, 12); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; K().rr(ctx, cx + 1, y + 15, 13, 2.8, 1.4); ctx.fill();
    if (ratio > 0) { ctx.fillStyle = G.hpColor(ratio); K().rr(ctx, cx + 1, y + 15, Math.max(2.4, 13 * ratio), 2.8, 1.4); ctx.fill(); }
    if (down) { ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 4, y + 4); ctx.lineTo(cx + 11, y + 11); ctx.moveTo(cx + 11, y + 4); ctx.lineTo(cx + 4, y + 11); ctx.stroke(); }
    const sc = c.status && K().STATUS_COL[c.status]; if (sc) { ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(cx + 12.5, y + 3.4, 2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = .5; ctx.stroke(); }
  });
  G.tapZone(x, y, w, 20, open(() => G.partyScreen()));
  return w;
}
// ---- Quest tracker --------------------------------------------------------------------------------------------------------
function tracker(ctx, S, x, y, maxW) {
  const lead = G.quest && G.quest.lead && G.quest.lead(); if (!lead || !lead.step) return;
  let txt = lead.step.text || lead.q.title, c = lead.step.count; if (typeof c === 'function') { try { c = c(S); } catch (e) { c = null; } }
  if (Array.isArray(c) && c[1] > 1) txt += ` (${c[0]}/${c[1]})`;
  const hint = lead.step.at && G.routeHint ? G.routeHint(lead.step.at) : null;   // which way to go (js/directions.js)
  const at = hint ? '' : lead.step.at && lead.step.at !== G.world.mapId && G.worldShort ? '  > ' + G.worldShort(lead.step.at) : '';
  ctx.font = F; const body = fit(ctx, txt + at, maxW - 14), w = Math.ceil(ctx.measureText(body).width) + 14;
  pillBg(ctx, x, y, w, 11);
  ctx.fillStyle = '#f7a33f'; ctx.beginPath(); ctx.moveTo(x + 3.5, y + 2.8); ctx.lineTo(x + 6.7, y + 5.5); ctx.lineTo(x + 3.5, y + 8.2); ctx.closePath(); ctx.fill();
  G.text(ctx, body, x + 9, y + 2.4, { font: F, color: '#fff', shadow: false });
  G.tapZone(x, y, w, 11, open(() => G.journalScreen()));
  if (hint && hint.short) {   // the way to go, on its own line so it is never cut off
    ctx.font = F; const hb = fit(ctx, 'WAY: ' + hint.short, maxW - 14), hw = Math.ceil(ctx.measureText(hb).width) + 10;
    pillBg(ctx, x, y + 12.5, hw, 10); G.text(ctx, hb, x + 5, y + 14.5, { font: F, color: '#ffe9a8', shadow: false });
    G.tapZone(x, y + 12, hw, 11, open(() => G.journalScreen()));
  }
}
// ---- Mini-map -------------------------------------------------------------------------------------------------------------
const cache = { id: null, rev: null, c: null };
const tileCol = ch => (G.MINI_COL && G.MINI_COL[ch]) || (G.TILES[ch] && G.TILES[ch].solid ? '#4a4068' : '#c8b896');
function mapBitmap(m) {
  if (cache.id === m.id && cache.rev === (m.rev || 0) && cache.t === m.t) return cache.c;
  const c = document.createElement('canvas'); c.width = m.w; c.height = m.h; const x = c.getContext('2d');
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) { x.fillStyle = tileCol(m.t[j][i]); x.fillRect(i, j, 1, 1); }
  cache.id = m.id; cache.rev = m.rev || 0; cache.t = m.t; cache.c = c; return c;
}
const VW = 26, VH = 18, BW = 56, BH = 40;
function miniMap(ctx, m, x, y, t) {
  const P = G.world.p, px = P.x + P.ox / 16 + .5, py = P.y + P.oy / 16 + .5;
  const vw = Math.min(VW, m.w), vh = Math.min(VH, m.h), vx = Math.max(0, Math.min(m.w - vw, px - vw / 2)), vy = Math.max(0, Math.min(m.h - vh, py - vh / 2));
  const sx = BW / vw, sy = BH / vh;
  ctx.fillStyle = 'rgba(30,20,50,.3)'; K().rr(ctx, x + .8, y + 1.6, BW + 6, BH + 6, 5); ctx.fill();
  ctx.fillStyle = '#fffaf0'; K().rr(ctx, x - 3, y - 3, BW + 6, BH + 6, 5); ctx.fill(); ctx.strokeStyle = '#ffb648'; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.save(); K().rr(ctx, x, y, BW, BH, 3); ctx.clip();
  ctx.imageSmoothingEnabled = false; ctx.drawImage(mapBitmap(m), vx, vy, vw, vh, x, y, BW, BH);
  for (const w of m.warps || []) { if (w.sea || w.x < vx || w.x > vx + vw || w.y < vy || w.y > vy + vh) continue; const wx = x + (w.x + .5 - vx) * sx, wy = y + (w.y + .5 - vy) * sy; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wx, wy, 1.9, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.arc(wx, wy, 1.2, 0, TAU); ctx.fill(); }
  const bx = x + (px - vx) * sx, by = y + (py - vy) * sy, pulse = 1 + .3 * Math.sin(t / 8);
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(bx, by, 2.8 * pulse, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff3a4a'; ctx.beginPath(); ctx.arc(bx, by, 1.7, 0, TAU); ctx.fill();
  ctx.restore();
  G.tapZone(x - 3, y - 3, BW + 6, BH + 6, open(() => G.worldMapScreen()));
}
// ---- Money and time -------------------------------------------------------------------------------------------------------
function moneyTime(ctx, S, rx, y) {
  const frac = S.clock && G.farm ? Math.max(0, Math.min(1, S.clock / G.farm.DAY_FRAMES)) : 0, mins = Math.floor(6 * 60 + frac * 18 * 60), hh = Math.floor(mins / 60) % 24, mm = mins % 60;
  const money = '$' + S.money, time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  ctx.font = F; const w = Math.ceil(ctx.measureText(money).width + ctx.measureText(time).width) + 30;
  pillBg(ctx, rx - w, y, w, 11);
  ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(rx - w + 6, y + 5.5, 2.8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c89a1a'; ctx.lineWidth = .6; ctx.stroke();
  G.text(ctx, money, rx - w + 11, y + 2.4, { font: F, color: '#fff', shadow: false });
  const day = frac < .75 ? '#ffd23a' : '#ff9a4a'; ctx.fillStyle = day; ctx.beginPath(); ctx.arc(rx - ctx.measureText(time).width - 9, y + 5.5, 2, 0, TAU); ctx.fill();
  G.text(ctx, time, rx - 3, y + 2.4, { font: F, color: '#fff', shadow: false, align: 'right' });
  G.tapZone(rx - w, y, w, 11, open(() => G.startMenu()));
}
// ---- Ride chip ------------------------------------------------------------------------------------------------------------
function rideChip(ctx, rx, y) {
  const V = G.vehicles; if (!V || !G.state) return; const riding = V.riding && V.riding(), id = riding || V.equipped(); if (!id) return;
  const nm = (V.list && G.state.vehicles) ? id.toUpperCase().replace('QUAD', 'QUAD BIKE') : id.toUpperCase();
  const label = (riding ? 'GET OFF ' : 'RIDE ') + nm; ctx.font = F; const w = Math.ceil(ctx.measureText(label).width) + 22;
  pillBg(ctx, rx - w, y, w, 11);
  ctx.fillStyle = riding ? '#ff8a6a' : '#5ad4a0'; K().rr(ctx, rx - w + 2, y + 2, 11, 7, 3.5); ctx.fill();
  if (G.touch) { ctx.fillStyle = '#1a2a2a'; ctx.beginPath(); ctx.moveTo(rx - w + 6, y + 3.4); ctx.lineTo(rx - w + 10.4, y + 5.5); ctx.lineTo(rx - w + 6, y + 7.6); ctx.closePath(); ctx.fill(); }   // a play arrow on touch screens: tap the chip
  else G.text(ctx, 'V', rx - w + 7.5, y + 2.6, { font: F, color: '#1a2a2a', shadow: false, align: 'center' });   // the key on a keyboard
  G.text(ctx, label, rx - w + 16, y + 2.4, { font: F, color: '#fff', shadow: false });
  const go = open(() => G.quickRide()); go.tag = 'ride';   // the tag lets tests find the zone
  G.tapZone(rx - w - 3, y - 2, w + 6, 15, go);   // a finger-sized area, a little bigger than the chip
}

G.hooks.overlay.push((ctx, cx, cy, t) => {
  const S = G.state, m = G.world.map; if (!S || !m || !S.flags || !S.flags.starter || G.scene !== G.world.scene) return;
  if (G.world.busy || G.ui.layers.length || G.ui.text) return;
  const W = G.W, farm = G.farm && G.farm.hudVisible && G.farm.hudVisible(), sea = !!m.sea;
  // left column
  let ly = 4, lw = 0;
  if (G.hudOn('partyBar') && S.party.length) G.hud(ctx, 4, ly, () => { lw = partyBar(ctx, S, 4, ly); }), ly += 23;
  if (G.hudOn('questTracker')) G.hud(ctx, 4, ly, () => tracker(ctx, S, 4, ly, W - 100));
  // right column (under the farm energy bar or the sea harbour compass when they are showing)
  const rx = W - 4; let ry = 4 + (farm ? 17 : 0);
  if (sea) return;   // the sea has its own mini-map; keep the right side clear
  if (G.hudOn('miniMapLand') && (m.w >= 24 || m.h >= 18) && m.outdoor !== false) { const y0 = ry + 3; G.hud(ctx, rx, y0, () => miniMap(ctx, m, rx - BW - 3, y0, t)); ry += BH + 11; }
  if (G.hudOn('moneyTime')) { const y0 = ry; G.hud(ctx, rx, y0, () => moneyTime(ctx, S, rx, y0)); ry += 14; }
  if (G.hudOn('rideChip') && m.outdoor !== false) { const y0 = ry; G.hud(ctx, rx, y0, () => rideChip(ctx, rx, y0)); }
});
})();
