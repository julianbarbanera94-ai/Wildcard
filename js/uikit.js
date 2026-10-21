// UI kit: fonts, text, panels, HP bars, badges, dialogue box and menu drawing.
(function () {
const G = globalThis.G;
const { mulberry, cv } = G;

// ---- Text & frames --------------------------------------------------------
G.FONT = '800 8px Nunito, "Trebuchet MS", sans-serif';
G.text = function (ctx, s, x, y, o) {
  o = o || {};
  ctx.font = o.font || G.FONT; ctx.textBaseline = 'top'; ctx.textAlign = o.align || 'left';
  if (o.shadow !== false) { ctx.fillStyle = o.shadow || '#a8a8b8'; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = o.color || '#383840'; ctx.fillText(s, x, y);
};
G.textW = (ctx, s) => { ctx.font = G.FONT; return ctx.measureText(s).width; };
G.frame = function (ctx, x, y, w, h, kind) {
  if (kind === 'dark') { ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#304860'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); ctx.fillStyle = '#e8d8a0'; ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillStyle = '#183040'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); ctx.fillStyle = '#285068'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8); return; }
  ctx.fillStyle = '#586878'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = '#d04848'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
};
G.hpColor = r => r > .5 ? '#48d048' : r > .2 ? '#f8c830' : '#f05838';
G.hpBar = function (ctx, x, y, w, ratio) {
  ctx.fillStyle = '#383840'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = G.hpColor(ratio); ctx.fillRect(x, y, Math.ceil(w * Math.max(0, ratio)), 3);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, Math.ceil(w * Math.max(0, ratio)), 1);
};
G.typeBadge = function (ctx, t, x, y) {
  ctx.fillStyle = G.shade(G.TYPE_COL[t], .7); ctx.fillRect(x, y, 34, 9);
  ctx.fillStyle = G.TYPE_COL[t]; ctx.fillRect(x + 1, y + 1, 32, 7);
  G.text(ctx, t.toUpperCase().slice(0, 6), x + 17, y + 1, { align: 'center', color: '#fff', shadow: G.shade(G.TYPE_COL[t], .55), font: 'bold 6px "Courier New", monospace' });
};
// Draws a small party icon for a creature.
G.icon = function (ctx, id, x, y, size) { ctx.drawImage(G.creatureSprite(id), x, y, size, size); };

// Area-name banner sliding in at the top-left; t counts frames since entering (0..120).
G.drawBanner = function (ctx, text, t) {
  const y = t < 10 ? -20 + t * 2 : t > 105 ? -(t - 105) * 2 : 0;
  G.frame(ctx, 4, 3 + y, 8 + G.textW(ctx, text) + 6, 17, 'dark'); G.text(ctx, text, 11, 8 + y, { color: '#fff', shadow: '#102030' });
};
// '!' bubble above a character whose tile top-left is (x, y).
G.drawBubble = function (ctx, x, y, t) {
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y - 18, 8, 12); G.text(ctx, '!', x + 8, y - 17, { align: 'center', color: '#d83030', shadow: false, font: 'bold 10px "Courier New", monospace' });
};
G.drawTextbox = function (ctx, t) {
  G.frame(ctx, 2, 110, 236, 48, t.style);
  const dark = t.style === 'dark';
  t.lines.forEach((l, i) => G.text(ctx, l.slice(0, Math.max(0, t.shown - t.lines.slice(0, i).join('').length)), 12, 118 + i * 15, dark ? { color: '#fff', shadow: '#102030' } : {}));
  if (t.arrow && (G.frameNo >> 4) % 2) { ctx.fillStyle = dark ? '#fff' : '#d04848'; ctx.beginPath(); ctx.moveTo(224, 144); ctx.lineTo(231, 144); ctx.lineTo(227.5, 149); ctx.fill(); }
};
// m: { x, y, w, h, items, idx, cols, cw, rowH, style }
G.drawMenu = function (ctx, m) {
  G.frame(ctx, m.x, m.y, m.w, m.h, m.style);
  const dark = m.style === 'dark';
  m.items.forEach((it, i) => {
    const cx = m.x + 6 + (i % m.cols) * m.cw, cy = m.y + 5 + Math.floor(i / m.cols) * m.rowH;
    G.text(ctx, String(it), cx + 10, cy + 2, dark ? { color: '#fff', shadow: '#102030' } : {});
    if (i === m.idx) { ctx.fillStyle = dark ? '#f8d848' : '#d04848'; ctx.beginPath(); ctx.moveTo(cx + 1, cy + 2); ctx.lineTo(cx + 6, cy + 5.5); ctx.lineTo(cx + 1, cy + 9); ctx.fill(); }
  });
};
})();
