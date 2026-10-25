// Battle HUD components (docs/BATTLE_UI.md): drawn live on the 240x160 battle canvas, separate from the arena and the creature
// actors, and from the battle rules in battle.js. Each piece is independently replaceable:
//   statusPanel   name, level, portrait, HP (and EXP for your creature); turns red and pulses when HP is low
//   healthBar     the slim HP bar
//   commandBar    ABILITIES / ITEMS / TEAM / RUN, one row
//   abilityCards  one card per move (type, power, PP); only shown while choosing a move
//   messageBar    the dark dialogue bar (G.drawTextbox uses it)
//   targetRing    the restrained ring and marker on the foe while a move is being chosen
// Look and layout follow the Battle UI Kit (dark navy panels, one cyan accent).
(function () {
const G = globalThis.G, K = G.kit;
const FAM = () => G.FONT_FAM, F = (w, px) => `${w} ${px}px ${FAM()}`;
// warm cream panels with orange edges, like every other screen; dark navy is kept as an accent (the message bar)
const ACC = '#f7983f', ACC2 = '#e07a2a', INK = '#4a3b58', DIM = '#8a7a90', SH = false;
const NAVY = '#53D6E9', NAVY2 = '#247F9F';
function plate(ctx, x, y, w, h, r, o) {
  o = o || {};
  const dark = !!o.dark;
  ctx.save(); ctx.shadowColor = dark ? 'rgba(2,12,22,.45)' : 'rgba(120,70,20,.3)'; ctx.shadowBlur = 3 * ctx.getTransform().a; ctx.shadowOffsetY = 1.2 * ctx.getTransform().a;
  K.rr(ctx, x, y, w, h, r); ctx.fillStyle = dark ? '#071B2B' : '#f7983f'; ctx.fill(); ctx.restore();
  K.rr(ctx, x, y, w, h, r); ctx.fillStyle = dark ? K.lin(ctx, 0, y, 0, y + h, ['rgba(26,58,80,.95)', 'rgba(7,27,43,.96)']) : K.lin(ctx, 0, y, 0, y + h, ['#fffdf8', '#fff0d4']); ctx.fill();
  ctx.strokeStyle = o.edge || (dark ? K.lin(ctx, x, y, x + w, y + h, [NAVY, NAVY2]) : K.lin(ctx, 0, y, 0, y + h, ['#ffc85a', '#f7983f'])); ctx.lineWidth = o.lw || (dark ? .9 : 1.4); K.rr(ctx, x + .45, y + .45, w - .9, h - .9, r - .4); ctx.stroke();
}
// icons from the kit's SVGs (64x64 boxes)
const ICON = {
  abilities: { d: 'M32 5 L38 23 L57 17 L45 32 L57 47 L38 41 L32 59 L26 41 L7 47 L19 32 L7 17 L26 23 Z', fill: '#ffc85a', stroke: '#e07a2a', lw: 3 },
  tactics: { d: 'M32 4 V60 M8 18 L56 46 M8 46 L56 18 M32 4 L26 13 M32 4 L38 13 M32 60 L26 51 M32 60 L38 51', stroke: '#c8642a', lw: 5 },
  items: { d: 'M23 9 H41 V18 L47 25 V52 Q47 57 41 57 H23 Q17 57 17 52 V25 L23 18 Z', stroke: '#8a6a50', lw: 4, extra: { d: 'M20 36 H44', stroke: '#f7983f', lw: 5 } },
  team: { d: 'M8 52 Q9 33 24 33 Q39 33 40 52 Z', fill: '#c8865a', extra: { d: 'M36 36 Q52 32 56 50 L56 52 L43 52 Q43 42 36 36 Z', fill: '#e8b080' }, circles: [[24, 21, 9, '#c8865a'], [43, 23, 7, '#e8b080']] },
};
const paths = {};
function icon(ctx, k, cx, cy, s, alpha) {
  const I = ICON[k]; if (!I) return;
  const P = paths[k] || (paths[k] = { d: new Path2D(I.d), e: I.extra && new Path2D(I.extra.d) });
  ctx.save(); ctx.globalAlpha *= alpha === undefined ? 1 : alpha; ctx.translate(cx - s / 2, cy - s / 2); ctx.scale(s / 64, s / 64); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (I.circles) for (const [x, y, r, c] of I.circles) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  if (I.fill) { ctx.fillStyle = I.fill; ctx.fill(P.d); }
  if (I.stroke) { ctx.strokeStyle = I.stroke; ctx.lineWidth = I.lw || 3; ctx.stroke(P.d); }
  if (I.extra) { if (I.extra.fill) { ctx.fillStyle = I.extra.fill; ctx.fill(P.e); } if (I.extra.stroke) { ctx.strokeStyle = I.extra.stroke; ctx.lineWidth = I.extra.lw; ctx.stroke(P.e); } }
  ctx.restore();
}
function healthBar(ctx, x, y, w, ratio, h) {
  h = h || 4; ratio = Math.max(0, Math.min(1, ratio || 0));
  K.rr(ctx, x - .6, y - .6, w + 1.2, h + 1.2, (h + 1.2) / 2); ctx.fillStyle = '#3d3352'; ctx.fill(); K.rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = '#e8e2ee'; ctx.fill();
  if (ratio > 0) {
    const c = G.hpColor(ratio), fw = Math.max(h, w * ratio);
    K.rr(ctx, x, y, fw, h, h / 2); ctx.fillStyle = K.lin(ctx, 0, y, 0, y + h, [G.shade(c, 1.25), c, G.shade(c, .82)]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; K.rr(ctx, x + 1, y + .5, Math.max(0, fw - 2), h * .3, h * .15); ctx.fill();
  }
}
function portrait(ctx, c, x, y, s, mine) {
  K.rr(ctx, x, y, s, s, 4); ctx.fillStyle = '#ffe6c0'; ctx.fill();
  ctx.save(); K.rr(ctx, x, y, s, s, 4); ctx.clip();
  const img = G.creatureSprite(c.id, false);
  if (img) { const w = img.width || 64, h = img.height || 64, ins = .12; ctx.drawImage(img, w * ins, h * ins * .6, w * (1 - ins * 2), h * (1 - ins * 1.6), x, y, s, s); }
  ctx.restore();
  K.rr(ctx, x + .4, y + .4, s - .8, s - .8, 3.6); ctx.strokeStyle = '#f7b060'; ctx.lineWidth = .9; ctx.stroke();
}
// f: fighter { c, dispHp, dispExp }; mine: your creature (shows HP numbers and EXP); expR: EXP fraction for it
function statusPanel(ctx, f, x, y, w, mine, expR) {
  const h = mine ? 34 : 27, ratio = f.dispHp / f.c.stats.hp, low = ratio > 0 && ratio <= .25 && f.c.hp > 0;
  const pulse = low ? .5 + .5 * Math.sin(G.frameNo / 6) : 0;
  plate(ctx, x, y, w, h, 7, low ? { edge: `rgba(255,${Math.round(110 + pulse * 40)},${Math.round(100 + pulse * 30)},${.65 + pulse * .35})`, lw: 1.2 } : null);
  portrait(ctx, f.c, x + 3.5, y + 3.5, h - 7, mine);
  const tx = x + h - 1.5, tw = w - (h - 1.5) - 5;
  if (G.hudOn('namesLevels')) {
    G.text(ctx, G.name(f.c), tx, y + 3, { font: F(800, 7), color: INK, shadow: SH });
    G.text(ctx, 'Lv ' + f.c.lvl, x + w - 5, y + 3.4, { font: F(700, 6), color: DIM, shadow: SH, align: 'right' });
  }
  const by = y + 13.2;
  if (G.hudOn('healthBars')) healthBar(ctx, tx, by, tw, ratio, 4);
  else if (!mine) G.text(ctx, Math.ceil(100 * ratio) + '%', x + w - 5, by - 1, { align: 'right', font: F(800, 6.5), color: INK, shadow: SH });
  if (f.c.status && G.pref('battle.statusIcons')) K.pill(ctx, tx, y + (mine ? 20 : 19.2), 17, 6.4, K.STATUS_COL[f.c.status], G.STATUS_NAME[f.c.status], F(900, 5));
  if (low) G.text(ctx, 'LOW', x + w - 5, y + (mine ? 19.5 : 18.5), { align: 'right', font: F(900, 5.5), color: `rgb(${Math.round(200 + pulse * 30)},50,50)`, shadow: SH });
  if (mine) {
    G.text(ctx, `${Math.ceil(f.dispHp)} / ${f.c.stats.hp}  HP`, tx, y + 19.6, { font: F(700, 5.8), color: '#5a4a66', shadow: SH });
    const r = Math.max(0, Math.min(1, expR)), ey = y + h - 5.2, ew = tw;
    K.rr(ctx, tx, ey, ew, 1.8, .9); ctx.fillStyle = '#e8dff0'; ctx.fill();
    if (r > 0) { K.rr(ctx, tx, ey, Math.max(1.8, ew * r), 1.8, .9); ctx.fillStyle = '#4a8cff'; ctx.fill(); }
  }
}
function commandBar(label) {
  const NAMES = ['ABILITIES', 'ITEMS', 'TEAM', 'RUN'], KEYS = ['abilities', 'items', 'team', 'tactics'];
  return (ctx, st) => {
    const x = 12, y = 130, w = 216, h = 24, sw = w / 4;
    if (label) G.text(ctx, label, x + 2, y - 11, { font: F(800, 7), color: '#fff', shadow: '#3d2a52' });
    plate(ctx, x, y, w, h, 9);
    ctx.strokeStyle = 'rgba(200,140,80,.35)'; ctx.lineWidth = .6;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + sw * i, y + 5); ctx.lineTo(x + sw * i, y + h - 5); ctx.stroke(); }
    NAMES.forEach((n, i) => {
      const sx = x + i * sw, sel = i === st.idx;
      G.tapZone(sx, y - 2, sw, h + 4, () => st.tap(i));
      if (sel) {
        const p = .5 + .5 * Math.sin(G.frameNo / 10);
        K.rr(ctx, sx + 2, y + 2, sw - 4, h - 4, 7); ctx.fillStyle = `rgba(255,190,90,${.28 + p * .1})`; ctx.fill(); ctx.strokeStyle = 'rgba(247,152,63,.85)'; ctx.lineWidth = .9; ctx.stroke();
        K.rr(ctx, sx + 8, y + h - 4.2, sw - 16, 1.4, .7); ctx.fillStyle = ACC; ctx.fill();
      }
      icon(ctx, KEYS[i], sx + 11, y + h / 2 - .8, 10, sel ? 1 : .7);
      G.text(ctx, n, sx + 18, y + h / 2 - 4.4, { font: F(800, 6.6), color: sel ? '#3a2a48' : '#6a5a76', shadow: SH });
    });
  };
}
function abilityCards(moves) {
  return (ctx, st) => {
    const n = moves.length, cw = 54, gap = 4, x0 = Math.round((240 - (n * cw + (n - 1) * gap)) / 2), y = 122, ch = 32;   // below the status panels (they end at y 122)
    moves.forEach((m, i) => {
      const mv = G.MOVES[m.id], sel = i === st.idx, x = x0 + i * (cw + gap), col = G.TYPE_COL[mv.type] || '#9aa', dead = m.pp <= 0;
      G.tapZone(x, y - 2, cw, ch + 4, () => st.tap(i));
      plate(ctx, x, y, cw, ch, 6, sel ? { edge: '#e0602a', lw: 1.8 } : null);
      if (sel) { ctx.fillStyle = 'rgba(255,190,90,.22)'; K.rr(ctx, x + 1, y + 1, cw - 2, ch - 2, 5); ctx.fill(); }
      // type-coloured icon plate and the name on one line (shrunk to fit)
      K.rr(ctx, x + 2.5, y + 2.5, 10, 10, 3); ctx.fillStyle = G.shade(col, .5); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = .7; ctx.stroke();
      ctx.save(); ctx.globalAlpha *= dead ? .4 : 1; ctx.translate(x + 7.5, y + 7.5); ctx.scale(.15, .15); ctx.translate(-32, -32); ctx.fillStyle = G.shade(col, 1.35); ctx.fill(new Path2D(mv.pow ? ICON.abilities.d : ICON.tactics.d.split(' M')[0])); if (!mv.pow) { ctx.strokeStyle = G.shade(col, 1.35); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke(new Path2D(ICON.tactics.d)); } ctx.restore();
      let px = 6; ctx.font = F(800, px); while (px > 3.8 && ctx.measureText(m.id).width > cw - 17) { px -= .2; ctx.font = F(800, px); }
      G.text(ctx, m.id, x + 15, y + 3.8, { font: F(800, px), color: dead ? '#a898b0' : INK, shadow: SH });
      G.typeBadge(ctx, mv.type, x + 2.5, y + 14);
      G.text(ctx, mv.pow ? 'PWR ' + mv.pow : 'STATUS', x + 3.5, y + 25, { font: F(700, 5), color: DIM, shadow: SH });
      G.text(ctx, `PP ${m.pp}/${mv.pp}`, x + cw - 3, y + 25, { font: F(800, 5), color: dead ? '#d05050' : m.pp <= Math.max(1, mv.pp * .25) ? '#d07010' : '#5a4a66', shadow: SH, align: 'right' });
    });
  };
}
// the dark dialogue bar; lines are the visible text, arrow shows the continue marker
function messageBar(ctx) { plate(ctx, 6, 122, 228, 32, 9, { dark: true }); }   // the one dark accent in battle
function targetRing(ctx, cx, cy, t) {
  const p = .5 + .5 * Math.sin(t / 12);
  ctx.save();
  ctx.fillStyle = `rgba(78,216,233,${.08 + p * .04})`; ctx.beginPath(); ctx.ellipse(cx, cy, 40, 10, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(85,214,232,${.55 + p * .25})`; ctx.lineWidth = 1; ctx.setLineDash([3, 3.5]); ctx.lineDashOffset = -t / 5; ctx.beginPath(); ctx.ellipse(cx, cy, 34, 8.5, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(154,234,242,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, 25, 6, 0, 0, 7); ctx.stroke();
  ctx.restore();
}
function targetMarker(ctx, cx, cy, t) {
  const by = Math.sin(t / 9) * 1.4;
  ctx.fillStyle = '#B4F8FF'; ctx.strokeStyle = '#39BFD7'; ctx.lineWidth = .7; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy + 5 + by); ctx.lineTo(cx + 3.4, cy + by); ctx.lineTo(cx, cy - 5 + by); ctx.lineTo(cx - 3.4, cy + by); ctx.closePath(); ctx.fill(); ctx.stroke();
}
G.battleUI = { plate, icon, healthBar, statusPanel, commandBar, abilityCards, messageBar, targetRing, targetMarker };
})();
