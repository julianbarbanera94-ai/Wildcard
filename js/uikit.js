// UI kit: fonts, text, panels, HP bars, badges, dialogue box and menu drawing.
// Look: soft cream / deep-teal rounded panels with thick bright outlines and baked drop shadows.
// Static shapes are pre-rendered once into offscreen canvases (see kit.cache) and blitted each frame.
(function () {
const G = globalThis.G;
const { cv } = G;

// ---- Fonts ----------------------------------------------------------------
const FAM = 'Nunito, "Trebuchet MS", "Segoe UI", sans-serif';
G.FONT = '800 8px ' + FAM;
G.FONT_S = '800 6px ' + FAM;    // small labels (PP, status, captions)
G.FONT_B = '900 8px ' + FAM;    // bold headings
G.FONT_FAM = FAM;

// ---- Kit: shared helpers for uikit / battle / screens / title -------------
const kit = G.kit = {};
// Rounded-rect path.
kit.rr = function (ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
};
let fontsOk = false;
kit.fontsReady = () => fontsOk || (fontsOk = !document.fonts || document.fonts.check('900 8px Nunito'));
// Cached offscreen art in logical units. draw(x) gets a context already scaled so 1 unit = 1 logical px,
// with the origin moved by `pad` so shapes may spill (shadows, glows). Returns { c, w, h, pad } where c is the canvas.
// Pass text=true for art that contains text: it is not kept until the web font has loaded.
const store = new Map();
kit.cache = function (key, w, h, draw, o) {
  o = o || {};
  const q = Math.min(o.qmax || 8, Math.max(4, G.S || 4)), k = key + '@' + q;
  let e = store.get(k); if (e) return e;
  const pad = o.pad === undefined ? 4 : o.pad;
  const [c, x] = cv(Math.ceil((w + pad * 2) * q), Math.ceil((h + pad * 2) * q));
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.setTransform(q, 0, 0, q, pad * q, pad * q); x.lineJoin = 'round'; x.lineCap = 'round';
  draw(x);
  e = { c, w, h, pad };
  if (!o.text || kit.fontsReady()) { if (store.size > 400) store.clear(); store.set(k, e); }
  return e;
};
kit.blit = function (ctx, e, x, y) { ctx.drawImage(e.c, x - e.pad, y - e.pad, e.w + e.pad * 2, e.h + e.pad * 2); };
kit.lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; };
// A soft round glow sprite (radial gradient) for additive light.
kit.glow = function (color) {
  return kit.cache('glow' + color, 32, 32, x => {
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, color); g.addColorStop(.35, color + '99'); g.addColorStop(1, color + '00');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  }, { pad: 0, qmax: 4 });
};
kit.drawGlow = function (ctx, color, x, y, r, a) {
  const e = kit.glow(color); ctx.globalAlpha = a === undefined ? 1 : a; ctx.drawImage(e.c, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
};
// Four-point sparkle star.
kit.star = function (ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * .18, y - r * .18, x + r, y); ctx.quadraticCurveTo(x + r * .18, y + r * .18, x, y + r);
  ctx.quadraticCurveTo(x - r * .18, y + r * .18, x - r, y); ctx.quadraticCurveTo(x - r * .18, y - r * .18, x, y - r); ctx.fill();
};
// Pill label (status, small tags) drawn live; small and cheap.
kit.pill = function (ctx, x, y, w, h, fill, txt, font) {
  kit.rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = G.shade(fill, .72); ctx.fill();
  kit.rr(ctx, x + .7, y + .7, w - 1.4, h - 1.4, (h - 1.4) / 2); ctx.fillStyle = fill; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; kit.rr(ctx, x + 1.5, y + 1, w - 3, (h - 2) / 2, (h - 2) / 4); ctx.fill();
  if (txt) G.text(ctx, txt, x + w / 2, y + (h - 6) / 2 - .2, { align: 'center', color: '#fff', shadow: G.shade(fill, .5), font: font || '900 5.5px ' + FAM });
};
kit.STATUS_COL = { slp: '#8f9bc0', par: '#f2c230', psn: '#b05cd0', brn: '#ff6a3d' };

// ---- Text -----------------------------------------------------------------
G.text = function (ctx, s, x, y, o) {
  o = o || {};
  ctx.font = o.font || G.FONT; ctx.textBaseline = 'top'; ctx.textAlign = o.align || 'left';
  if (o.shadow !== false) { ctx.fillStyle = o.shadow || 'rgba(150,105,60,.28)'; ctx.fillText(s, x + .45, y + .75); }
  ctx.fillStyle = o.color || '#4a3b58'; ctx.fillText(s, x, y);
};
G.textW = (ctx, s) => { ctx.font = G.FONT; return ctx.measureText(s).width; };

// ---- Panels ---------------------------------------------------------------
const PANEL = {
  light: { o0: '#ffc85a', o1: '#f7983f', f0: '#fffdf8', f1: '#fff0d4', rim: 'rgba(255,255,255,.95)', sh: 'rgba(120,70,20,.32)' },
  dark: { o0: '#8ff5ea', o1: '#3cc3dc', f0: '#2c7394', f1: '#163e62', rim: 'rgba(170,255,250,.35)', sh: 'rgba(0,20,40,.45)' },
};
function panelArt(w, h, kind) {
  const P = PANEL[kind] || PANEL.light, r = Math.min(8, h / 2, w / 2);
  return kit.cache('panel' + kind + w + 'x' + h, w, h, x => {
    // soft drop shadow, baked
    x.save(); x.shadowColor = P.sh; x.shadowBlur = 3 * (x.getTransform().a); x.shadowOffsetY = 1.6 * x.getTransform().a;
    kit.rr(x, 0, 0, w, h, r); x.fillStyle = P.o1; x.fill(); x.restore();
    // thick outline (gradient)
    kit.rr(x, 0, 0, w, h, r); x.fillStyle = kit.lin(x, 0, 0, 0, h, [P.o0, P.o1]); x.fill();
    // body
    const i = 2, ri = Math.max(1, r - i);
    kit.rr(x, i, i, w - i * 2, h - i * 2, ri); x.fillStyle = kit.lin(x, 0, i, 0, h - i, [P.f0, P.f1]); x.fill();
    // inner rim highlight along the top
    x.save(); kit.rr(x, i, i, w - i * 2, h - i * 2, ri); x.clip();
    x.strokeStyle = P.rim; x.lineWidth = .9; kit.rr(x, i + .45, i + .45, w - i * 2 - .9, h - i * 2 - .9, ri - .4); x.stroke();
    if (kind === 'dark') { x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(i, i, w - i * 2, Math.min(10, (h - i * 2) / 2)); }
    else { x.fillStyle = 'rgba(255,200,120,.10)'; x.fillRect(i, h - i - Math.min(6, h / 4), w - i * 2, Math.min(6, h / 4)); }
    x.restore();
    // glossy top-left catchlight on the outline
    x.fillStyle = 'rgba(255,255,255,.55)'; kit.rr(x, r * .6, .5, Math.min(18, w / 4), .9, .45); x.fill();
  });
}
G.frame = function (ctx, x, y, w, h, kind) { kit.blit(ctx, panelArt(Math.round(w), Math.round(h), kind === 'dark' ? 'dark' : 'light'), x, y); };

// ---- HP bar ---------------------------------------------------------------
G.hpColor = r => r > .5 ? '#3fd46a' : r > .2 ? '#ffc43a' : '#ff5a4e';
G.hpBar = function (ctx, x, y, w, ratio) {
  ratio = Math.max(0, Math.min(1, ratio || 0));
  kit.rr(ctx, x - 1.2, y - 1.2, w + 2.4, 5.4, 2.7); ctx.fillStyle = '#3d3352'; ctx.fill();
  kit.rr(ctx, x - .2, y - .2, w + .4, 3.4, 1.7); ctx.fillStyle = '#e8e2ee'; ctx.fill();
  const fw = w * ratio;
  if (fw > .3) {
    const c = G.hpColor(ratio);
    kit.rr(ctx, x - .2, y - .2, Math.max(fw + .4, 1.6), 3.4, 1.7); ctx.fillStyle = kit.lin(ctx, 0, y, 0, y + 3, [G.shade(c, 1.3), c, G.shade(c, .8)]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; kit.rr(ctx, x + .8, y + .25, Math.max(0, fw - 1.6), .8, .4); ctx.fill();
  }
};
// ---- Type badge (cached per type) -----------------------------------------
G.typeBadge = function (ctx, t, x, y) {
  const col = G.TYPE_COL[t] || '#aaaaaa';
  const e = kit.cache('type' + t, 34, 9, c => {
    c.save(); c.shadowColor = 'rgba(40,20,40,.3)'; c.shadowOffsetY = .8 * c.getTransform().a; c.shadowBlur = 1.2 * c.getTransform().a;
    kit.rr(c, 0, 0, 34, 9, 4.5); c.fillStyle = G.shade(col, .66); c.fill(); c.restore();
    kit.rr(c, .9, .9, 32.2, 7.2, 3.6); c.fillStyle = kit.lin(c, 0, 1, 0, 8, [G.shade(col, 1.28), col, G.shade(col, .88)]); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)'; kit.rr(c, 3, 1.5, 28, 2, 1); c.fill();
    c.font = '900 6px ' + FAM; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 1.6; c.strokeStyle = G.shade(col, .52); c.strokeText(t.toUpperCase(), 17, 4.8);
    c.fillStyle = '#fff'; c.fillText(t.toUpperCase(), 17, 4.8);
  }, { pad: 2, text: true });
  kit.blit(ctx, e, x, y);
};
// Draws a small party icon for a creature.
G.icon = function (ctx, id, x, y, size) { ctx.drawImage(G.creatureSprite(id), x, y, size, size); };

// ---- Banner & bubble ------------------------------------------------------
// Area-name banner sliding in at the top-left; t counts frames since entering (0..120).
G.drawBanner = function (ctx, text, t) {
  const ease = k => 1 - Math.pow(1 - k, 3);
  const y = t < 14 ? -24 * (1 - ease(t / 14)) + Math.sin(t / 14 * Math.PI) * 2 : t > 105 ? -(t - 105) * 2 : 0;
  const w = Math.round(G.textW(ctx, text) + 24);
  G.frame(ctx, 4, 3 + y, w, 17, 'dark');
  kit.star(ctx, 11, 11.5 + y, 3, '#ffe066');
  G.text(ctx, text, 16, 7.5 + y, { color: '#fff', shadow: '#0c2a40' });
};
// '!' bubble above a character whose tile top-left is (x, y).
G.drawBubble = function (ctx, x, y, t) {
  const e = kit.cache('bubble', 12, 15, c => {
    c.save(); c.shadowColor = 'rgba(60,30,30,.35)'; c.shadowOffsetY = 1 * c.getTransform().a; c.shadowBlur = 1.5 * c.getTransform().a;
    c.fillStyle = '#ff5a5a'; kit.rr(c, 0, 0, 12, 12, 5); c.fill();
    c.beginPath(); c.moveTo(4, 11); c.lineTo(6, 15); c.lineTo(8, 11); c.fill(); c.restore();
    c.fillStyle = '#fff'; kit.rr(c, 1.3, 1.3, 9.4, 9.4, 4); c.fill(); c.beginPath(); c.moveTo(4.6, 10.5); c.lineTo(6, 13.2); c.lineTo(7.4, 10.5); c.fill();
    c.font = '900 9px ' + FAM; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ff4a4a'; c.fillText('!', 6, 6.4);
  }, { pad: 3, text: true });
  const k = t === undefined ? 99 : t, pop = k < 10 ? Math.sin(k / 10 * Math.PI) * 3 : 0, bob = Math.sin(G.frameNo / 8) * .6;
  kit.blit(ctx, e, x + 2, y - 19 - pop + bob);
};

// ---- Dialogue box ---------------------------------------------------------
G.drawTextbox = function (ctx, t) {
  const dark = t.style === 'dark';
  G.frame(ctx, 2, 110, 236, 48, t.style);
  let used = 0;
  t.lines.forEach((l, i) => {
    G.text(ctx, l.slice(0, Math.max(0, t.shown - used)), 12, 118 + i * 15, dark ? { color: '#fff', shadow: '#0c2a40' } : {});
    used += l.length;
  });
  if (t.arrow) {
    const by = Math.abs(Math.sin(G.frameNo / 9)) * 2.2;
    ctx.fillStyle = dark ? '#8ff5ea' : '#f7983f';
    kit.rr(ctx, 222, 142 + by, 10, 7, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(224.6, 144 + by); ctx.lineTo(229.4, 144 + by); ctx.lineTo(227, 147.2 + by); ctx.closePath(); ctx.fill();
  }
};

// ---- Menu -----------------------------------------------------------------
// The highlight glides between items: its position is remembered per items array.
const glide = new WeakMap();
// m: { x, y, w, h, items, idx, cols, cw, rowH, style }
G.drawMenu = function (ctx, m) {
  G.frame(ctx, m.x, m.y, m.w, m.h, m.style);
  const dark = m.style === 'dark', cols = m.cols || 1;
  const cell = i => [m.x + 6 + (i % cols) * m.cw, m.y + 5 + Math.floor(i / cols) * m.rowH];
  if (m.idx >= 0 && m.idx < m.items.length) {
    const [tx, ty] = cell(m.idx);
    let g = typeof m.items === 'object' ? glide.get(m.items) : null;
    if (!g) { g = { x: tx, y: ty }; if (typeof m.items === 'object') glide.set(m.items, g); }
    g.x += (tx - g.x) * .38; g.y += (ty - g.y) * .38; if (Math.abs(tx - g.x) < .05) g.x = tx; if (Math.abs(ty - g.y) < .05) g.y = ty;
    const hw = Math.min(m.cw - 2, m.x + m.w - 4 - g.x), hh = Math.min(m.rowH - 1, 12);
    const pulse = .5 + .5 * Math.sin(G.frameNo / 10);
    kit.rr(ctx, g.x - 1, g.y - .5, hw, hh, hh / 2);
    ctx.fillStyle = dark ? `rgba(120,240,230,${.18 + pulse * .08})` : `rgba(255,190,90,${.28 + pulse * .1})`; ctx.fill();
    ctx.strokeStyle = dark ? 'rgba(143,245,234,.75)' : 'rgba(247,152,63,.75)'; ctx.lineWidth = .8; ctx.stroke();
    // bouncy cursor nub
    const bx = g.x + 1.6 + Math.sin(G.frameNo / 5) * 1, cy = g.y + hh / 2 - .5;
    ctx.fillStyle = dark ? '#ffe066' : '#ff6b5a';
    ctx.beginPath(); ctx.moveTo(bx, cy - 3); ctx.lineTo(bx + 5, cy); ctx.lineTo(bx, cy + 3); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); ctx.fill();
  }
  if (m.tap) m.items.forEach((it, i) => { const [cx, cy] = cell(i); G.tapZone(cx - 3, cy - 1.5, m.cw, m.rowH, () => m.tap(i)); });
  m.items.forEach((it, i) => {
    const [cx, cy] = cell(i), sel = i === m.idx;
    G.text(ctx, String(it), cx + 10, cy + 2, dark ? { color: sel ? '#ffffff' : '#d6f4f6', shadow: '#0c2a40' } : { color: sel ? '#3a2a48' : '#5a4a66' });
  });
};

// ---- World labels and hints ------------------------------------------------------
// A name plate centred at (cx, y) in screen units: a rounded board with the building's name.
// style: 'shop' (default warm wood), 'heal' (pink cross), 'home' (green), 'craft' (slate).
const PLATE = { shop: ['#fff6e0', '#c88a3c', '#6a4210'], heal: ['#fff0f4', '#ff6b8a', '#9a2a48'], home: ['#f0ffe8', '#5fae3f', '#2a5a1a'], craft: ['#eef2fa', '#6a7ea8', '#26304a'], arena: ['#fff4d0', '#d89a1a', '#6a3a08'], town: ['#eef8ff', '#3a8ad8', '#123a6a'] };
G.drawSignPlate = function (ctx, text, cx, y, t, style) {
  const [bg, rim, ink] = PLATE[style] || PLATE.shop, f = G.FONT_S || G.FONT;
  ctx.save(); ctx.font = f; const w = Math.ceil(ctx.measureText(text).width) + 10, h = 10, x = Math.round(cx - w / 2), yy = Math.round(y - h - 2);
  ctx.fillStyle = 'rgba(40,30,60,.22)'; kit.rr(ctx, x + 1, yy + 1.5, w, h, 4); ctx.fill();
  ctx.fillStyle = rim; kit.rr(ctx, x - .8, yy - .8, w + 1.6, h + 1.6, 4.6); ctx.fill();
  ctx.fillStyle = bg; kit.rr(ctx, x, yy, w, h, 4); ctx.fill();
  if (style === 'heal') { ctx.fillStyle = rim; ctx.fillRect(x + 3, yy + 4, 4, 2); ctx.fillRect(x + 4, yy + 3, 2, 4); }
  ctx.restore();
  G.text(ctx, text, cx + (style === 'heal' ? 2 : 0), yy + 1.5, { align: 'center', color: ink, shadow: false, font: f });
};
// A small "A: something" chip near the bottom of the screen for whatever the player faces.
G.drawHint = function (ctx, text, t) {
  const f = G.FONT_S || G.FONT; ctx.save(); ctx.font = f; const w = Math.ceil(ctx.measureText(text).width) + 22; ctx.restore();
  const x = Math.round(G.W / 2 - w / 2), y = G.H - 18;
  ctx.fillStyle = 'rgba(30,20,50,.55)'; kit.rr(ctx, x, y, w, 12, 6); ctx.fill();
  ctx.fillStyle = '#4cc95a'; ctx.beginPath(); ctx.arc(x + 7, y + 6, 4.2, 0, 7); ctx.fill();
  G.text(ctx, G.touch ? 'A' : 'Z', x + 7, y + 2.2, { align: 'center', color: '#fff', shadow: false, font: f });
  G.text(ctx, text, x + 14, y + 2.2, { color: '#fff', shadow: false, font: f });
};
})();
