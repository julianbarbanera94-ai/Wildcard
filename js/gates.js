// Entrance markers: every way into another outdoor area is marked on the map, so you can see where you can go.
//   - exits on a map edge get pulsing chevrons pointing out, a glowing strip, and a name plate inside the edge;
//   - gates that aren't on an edge (an archway, a harbour gate out at sea) get a pulsing ring, a bobbing arrow and a plate;
//   - a locked way shows a padlock and what it needs (badges).
// The Aurelian Sea (js/maps/zz_sea.js) also gets a minimap of the whole map with your boat on it.
(function () {
const G = globalThis.G;
const TAU = Math.PI * 2;

// ---- Grouping the warps of a map into gates ------------------------------------------------------------------
let cacheMap = null, cacheRev = -1, gates = [];
function edgeOf(m, x, y) { return y === 0 ? 'N' : y === m.h - 1 ? 'S' : x === 0 ? 'W' : x === m.w - 1 ? 'E' : null; }
function build(m) {
  const list = m.warps.filter(w => !w._b && G.MAPS[w.to] && G.MAPS[w.to].outdoor);
  const used = new Set(), out = [];
  for (const w of list) {
    if (used.has(w)) continue; used.add(w);
    const grp = [w], q = [w];
    while (q.length) { const a = q.pop(); for (const b of list) if (!used.has(b) && b.to === w.to && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1) { used.add(b); grp.push(b); q.push(b); } }
    const xs = grp.map(g => g.x), ys = grp.map(g => g.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const edge = edgeOf(m, grp[0].x, grp[0].y), sea = !!w.sea || w.to === 'aurelis_sea';
    out.push({ to: w.to, name: G.MAPS[w.to].name, warps: grp, x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, edge: edge && (x1 - x0 + 1 >= 1) ? edge : null, sea, need: w.need || null });
  }
  return out;
}
function gatesOf(m) {
  if (m !== cacheMap || cacheRev !== (m.rev || 0)) { cacheMap = m; cacheRev = m.rev || 0; gates = build(m); }
  return gates;
}
G.gatesOf = gatesOf;

// Is this gate closed right now, and why (short)?
function lockOf(g) {
  if (!g.need) return null;
  let why = null; try { why = g.need(); } catch (e) { why = null; }
  if (!why) return null;
  return g.need.badges ? `${g.need.badges} BADGE${g.need.badges > 1 ? 'S' : ''}` : 'LOCKED';
}

// ---- Drawing ---------------------------------------------------------------------------------------------------
const OUT = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
function chevron(ctx, x, y, dir, s, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate({ N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 }[dir]); ctx.globalAlpha = a;
  ctx.beginPath(); ctx.moveTo(-s, s * .5); ctx.lineTo(0, -s * .5); ctx.lineTo(s, s * .5);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = s * .9 + 1.6; ctx.strokeStyle = 'rgba(70,40,10,.55)'; ctx.stroke();
  ctx.lineWidth = s * .9; ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
}
function ring(ctx, x, y, r, t, col) {
  const k = (t % 60) / 60;
  ctx.save(); ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.globalAlpha = .75 * (1 - k); ctx.beginPath(); ctx.arc(x, y, r * (.6 + k * .6), 0, TAU); ctx.stroke();
  ctx.globalAlpha = .45 + .2 * Math.sin(t / 10); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y, r * .62, 0, TAU); ctx.stroke(); ctx.restore();
}
function arrowDown(ctx, x, y, col) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(4, -3); ctx.lineTo(0, 3.5); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(60,30,10,.6)'; ctx.stroke(); ctx.fillStyle = col; ctx.fill(); ctx.restore();
}

G.hooks.overlay.push((ctx, cx, cy, t) => {
  const m = G.world.map; if (!m || !G.state || !m.outdoor) return;
  const P = G.world.p, ptx = P.x + P.ox / 16, pty = P.y + P.oy / 16;
  for (const g of gatesOf(m)) {
    const sx0 = g.x0 * 16 - cx, sx1 = (g.x1 + 1) * 16 - cx, sy0 = g.y0 * 16 - cy, sy1 = (g.y1 + 1) * 16 - cy;
    if (sx1 < -40 || sx0 > G.W + 40 || sy1 < -40 || sy0 > G.H + 40) continue;
    const lock = lockOf(g), col = lock ? '#c4cadc' : '#ffd23a', ink = lock ? 'craft' : g.sea ? 'town' : 'shop';
    const near = Math.hypot(ptx - g.cx, pty - g.cy) < 16;
    let px, py;   // plate anchor (screen units): centred over / beside the gate
    if (g.edge && (g.x1 - g.x0 + 1) * (g.y1 - g.y0 + 1) <= 14) {   // a short exit on a map edge: glowing strip + chevrons
      const [ox, oy] = OUT[g.edge];
      ctx.save(); ctx.fillStyle = `rgba(${lock ? '200,206,226' : '255,226,110'},${.16 + .1 * Math.sin(t / 12)})`; ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
      ctx.strokeStyle = `rgba(${lock ? '150,158,190' : '255,200,60'},.8)`; ctx.lineWidth = 1; ctx.strokeRect(sx0 + .5, sy0 + .5, sx1 - sx0 - 1, sy1 - sy0 - 1); ctx.restore();
      for (const w of g.warps) for (let k = 0; k < 2; k++) {
        const ph = ((t / 28) + k * .5) % 1, x = (w.x + .5) * 16 - cx - ox * (4 - ph * 9 + 6), y = (w.y + .5) * 16 - cy - oy * (4 - ph * 9 + 6);
        // chevrons slide towards the exit, fading in and out
        chevron(ctx, (w.x + .5) * 16 - cx - ox * (9 - ph * 12), (w.y + .5) * 16 - cy - oy * (9 - ph * 12), g.edge, 4.5, Math.sin(ph * Math.PI) * .95, col);
      }
      px = (sx0 + sx1) / 2 - ox * 0; py = (sy0 + sy1) / 2;
      if (g.edge === 'N') py = sy1 + 26; else if (g.edge === 'S') py = sy0 - 14; else if (g.edge === 'W') { px = sx1 + 42; py = (sy0 + sy1) / 2 + 4; } else { px = sx0 - 42; py = (sy0 + sy1) / 2 + 4; }
    } else if (g.edge) {   // a long open edge (the sea): a chevron every few tiles along it, plate near you
      const [ox, oy] = OUT[g.edge], step = 6;
      for (let i = 0; i < g.warps.length; i += step) { const w = g.warps[i], ph = ((t / 34) + i * .13) % 1;
        chevron(ctx, (w.x + .5) * 16 - cx - ox * (8 - ph * 12), (w.y + .5) * 16 - cy - oy * (8 - ph * 12), g.edge, 4, Math.sin(ph * Math.PI) * .7, '#ffffff'); }
      let best = g.warps[0], bd = 1e9; for (const w of g.warps) { const d = Math.hypot(w.x - ptx, w.y - pty); if (d < bd) { bd = d; best = w; } }
      if (bd > 9) continue;
      px = (best.x + .5) * 16 - cx - ox * 22; py = (best.y + .5) * 16 - cy - oy * 22 - 6;
    } else {   // an archway or a harbour gate: pulsing ring, bobbing arrow
      const X = (g.cx + .5) * 16 - cx, Y = (g.cy + .5) * 16 - cy, r = Math.max(14, (Math.max(g.x1 - g.x0, g.y1 - g.y0) + 1) * 11);
      ring(ctx, X, Y, r, t, lock ? '#c4cadc' : '#fff7b0'); ring(ctx, X, Y, r, t + 30, lock ? '#c4cadc' : '#ffe27a');
      arrowDown(ctx, X, Y - r * .62 - 3 + Math.sin(t / 9) * 2, col);
      px = X; py = Y - r - 8;
    }
    if (!near && !g.edge) { if (Math.hypot(ptx - g.cx, pty - g.cy) > 22) continue; }
    if (px < -60 || px > G.W + 60 || py < -10 || py > G.H + 10) continue;
    const name = g.name + (lock ? '  ' + lock : '');
    G.drawSignPlate(ctx, name, px, py, t, ink);
    if (lock && G.worldIcons && G.worldIcons.lock) { ctx.font = G.FONT_S || G.FONT; const tw = ctx.measureText(name).width; G.worldIcons.lock(ctx, px - tw / 2 - 9, py - 7, 3); }
  }
});

// ---- The sea minimap -----------------------------------------------------------------------------------------------
const MINI_COL = { w: '#34c8dc', r: '#1f9ab0', y: '#f6eccb', g: '#68c850', '#': '#2f8a3c', n: '#2a7a46', u: '#58b848', f: '#7ad060', C: '#8a7aa8', E: '#b88858', p: '#d8b878', d: '#8a6a40', i: '#b8a0e8', '!': '#ff7a1a', R: '#d8584a', Q: '#4a7ad8', W: '#fff0d8', '+': '#8090b8', '|': '#ffffff', z: '#c89050' };
let mini = null;
function miniMap(m) {
  if (mini && mini.id === m.id) return mini.c;
  const c = document.createElement('canvas'); c.width = m.w; c.height = m.h; const x = c.getContext('2d');
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) { x.fillStyle = MINI_COL[m.orig ? m.orig[j][i] : m.t[j][i]] || '#68c850'; x.fillRect(i, j, 1, 1); }
  mini = { id: m.id, c }; return c;
}
const COMPASS = ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'];
G.hooks.overlay.push((ctx, cx, cy, t) => {
  const m = G.world.map; if (!m || !m.sea || !G.state) return;
  const w = 76, h = 51, x = G.W - w - 8, y = 8, P = G.world.p, ptx = P.x + P.ox / 16, pty = P.y + P.oy / 16;
  ctx.save();
  ctx.fillStyle = 'rgba(30,20,50,.28)'; G.kit.rr(ctx, x + 1, y + 2, w + 6, h + 6, 5); ctx.fill();
  ctx.fillStyle = '#fffaf0'; G.kit.rr(ctx, x - 3, y - 3, w + 6, h + 6, 5); ctx.fill(); ctx.strokeStyle = '#ffb648'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.save(); G.kit.rr(ctx, x, y, w, h, 3); ctx.clip(); ctx.imageSmoothingEnabled = true; ctx.drawImage(miniMap(m), x, y, w, h);
  for (const g of m.seaGates || []) { const gx = x + (g.x + .5) / m.w * w, gy = y + (g.y + .5) / m.h * h; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(gx, gy, 1.9, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.arc(gx, gy, 1.1, 0, TAU); ctx.fill(); }
  const bx = x + (ptx + .5) / m.w * w, by = y + (pty + .5) / m.h * h, pulse = 1 + .35 * Math.sin(t / 8);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(bx, by, 3.2 * pulse, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff3a4a'; ctx.beginPath(); ctx.arc(bx, by, 2, 0, TAU); ctx.fill();
  ctx.restore();
  // the nearest harbour and which way it lies
  let best = null, bd = 1e9; for (const g of m.seaGates || []) { const d = Math.hypot(g.x - ptx, g.y - pty); if (d < bd) { bd = d; best = g; } }
  if (best) {
    const ang = Math.atan2(best.y - pty, best.x - ptx), dirw = COMPASS[(Math.round(ang / (Math.PI / 4)) + 8) % 8], txt = `${best.name}  ${Math.round(bd)} ${dirw}`;
    const f = G.FONT_S || G.FONT; ctx.font = f; const tw = Math.ceil(ctx.measureText(txt).width) + 10, tx = G.W - tw - 5, ty = y + h + 6;
    ctx.fillStyle = 'rgba(30,20,50,.55)'; G.kit.rr(ctx, tx, ty, tw, 10, 5); ctx.fill();
    G.text(ctx, txt, tx + 5, ty + 2.2, { color: '#fff', shadow: false, font: f });
  }
  ctx.restore();
});
})();
