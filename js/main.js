// Boot: title screen, new game / continue.
(function () {
const G = globalThis.G;

// ---- Title screen art (cached layers; only clouds, hills, sparkles, letters and the parade move) ----
const K = G.kit, LOGO = 'WILDCARD', LCOL = ['#ff5a5a', '#ff9f43', '#ffd23a', '#5cd65c', '#3cc8e0', '#5a8cff', '#a070ff', '#ff6fb5'];
const LFONT = '900 31px ' + G.FONT_FAM;
const sky = () => K.cache('t-sky', 240, 160, x => {
  x.fillStyle = K.lin(x, 0, 0, 0, 160, ['#6fcaff', '#a8e6ff', '#e4f8ff', '#fff2cf']); x.fillRect(0, 0, 240, 160);
}, { pad: 0, qmax: 5 });
const rays = () => K.cache('t-rays', 200, 200, x => {
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; x.fillStyle = 'rgba(255,255,255,.13)'; x.beginPath(); x.moveTo(100, 100); x.arc(100, 100, 100, a, a + .16); x.fill(); }
  const g = x.createRadialGradient(100, 100, 0, 100, 100, 100); g.addColorStop(0, 'rgba(255,250,220,.9)'); g.addColorStop(.18, 'rgba(255,250,220,.35)'); g.addColorStop(1, 'rgba(255,250,220,0)'); x.fillStyle = g; x.fillRect(0, 0, 200, 200);
}, { pad: 0, qmax: 4 });
// A 240-wide tileable hill strip, drawn twice side by side to scroll.
const hill = (k) => K.cache('t-hill' + k, 240, 70, x => {
  const R = G.mulberry(5 + k), base = k ? 22 : 10, amp = k ? 6 : 9, c = k ? ['#8fe068', '#62c24c'] : ['#a9e6b6', '#86d39a'];
  x.fillStyle = K.lin(x, 0, base - amp, 0, 70, c); x.beginPath(); x.moveTo(0, 70);
  for (let i = 0; i <= 240; i += 3) x.lineTo(i, base - Math.sin(i / 240 * Math.PI * 2 * (k ? 3 : 2)) * amp - Math.sin(i / 240 * Math.PI * 2 * 5) * 2);
  x.lineTo(240, 70); x.fill();
  for (let i = 0; i < (k ? 10 : 16); i++) {
    const tx = 9 + R() * 222, ty = base - Math.sin(tx / 240 * Math.PI * 2 * (k ? 3 : 2)) * amp - Math.sin(tx / 240 * Math.PI * 2 * 5) * 2 + 2, r = k ? 5 + R() * 3 : 3 + R() * 2.5;
    const dk = k ? ['#3f9e44', '#58bb52', '#9fe07a'] : ['#78c492', '#8fd4a5', '#bdeccb'];
    if (k) { x.fillStyle = '#8a5a3a'; x.fillRect(tx - .9, ty - r * .6, 1.8, r * .8); }
    x.fillStyle = dk[0]; x.beginPath(); x.arc(tx, ty - r, r, 0, 7); x.fill(); x.fillStyle = dk[1]; x.beginPath(); x.arc(tx - r * .25, ty - r * 1.2, r * .7, 0, 7); x.fill(); x.fillStyle = dk[2]; x.beginPath(); x.arc(tx - r * .4, ty - r * 1.45, r * .28, 0, 7); x.fill();
  }
  if (k) for (let i = 0; i < 40; i++) { const fx = R() * 240, fy = 30 + R() * 38; x.fillStyle = ['#ffffff', '#ffe066', '#ff9ec7'][i % 3]; x.beginPath(); x.arc(fx, fy, .9, 0, 7); x.fill(); }
}, { pad: 0, qmax: 5 });
const cloud = (k) => K.cache('t-cloud' + k, 44, 18, x => {
  x.fillStyle = 'rgba(150,200,235,.45)'; x.beginPath(); x.ellipse(22, 15, 19, 3, 0, 0, 7); x.fill();
  [[9, 11, 6.5], [18, 7, 8.5 - k], [28, 8, 7 + k], [36, 12, 5]].forEach(([a, b, r]) => { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
  x.fillStyle = 'rgba(200,225,245,.6)'; x.beginPath(); x.ellipse(22, 14, 17, 2.5, 0, 0, Math.PI); x.fill();
}, { pad: 1, qmax: 4 });
const letter = (i) => K.cache('t-l' + i, 30, 40, x => {
  const ch = LOGO[i], col = LCOL[i];
  x.font = LFONT; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  const X = 15, Y = 33;
  x.lineJoin = 'round';
  x.fillStyle = 'rgba(60,30,90,.45)'; x.strokeStyle = 'rgba(60,30,90,.45)'; x.lineWidth = 7; x.strokeText(ch, X, Y + 3); x.fillText(ch, X, Y + 3);   // drop shadow
  x.strokeStyle = '#3d2a5c'; x.lineWidth = 7; x.strokeText(ch, X, Y);                                                         // thick outline
  x.strokeStyle = '#ffffff'; x.lineWidth = 3.4; x.strokeText(ch, X, Y);                                                       // white inner ring
  x.fillStyle = K.lin(x, 0, Y - 24, 0, Y, [G.shade(col, 1.45), col, G.shade(col, .82)]); x.fillText(ch, X, Y);
  x.save(); x.beginPath(); x.rect(0, 0, 30, Y - 15); x.clip(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillText(ch, X, Y); x.restore();   // glossy top
}, { pad: 4, text: true });
let lw = null;   // letter advance widths (measured once the font is in)
const pill = (key, w, h, fill, line) => K.cache('t-p' + key, w, h, x => {
  x.save(); x.shadowColor = 'rgba(60,30,90,.3)'; x.shadowBlur = 2 * x.getTransform().a; x.shadowOffsetY = 1.4 * x.getTransform().a;
  K.rr(x, 0, 0, w, h, h / 2); x.fillStyle = line; x.fill(); x.restore();
  K.rr(x, 1.6, 1.6, w - 3.2, h - 3.2, (h - 3.2) / 2); x.fillStyle = fill; x.fill();
  x.fillStyle = 'rgba(255,255,255,.5)'; K.rr(x, h / 2, 2.4, w - h, 1.4, .7); x.fill();
});

const title = {
  t: 0, prompt: true, pad: 'title', ids: [1, 4, 7, 12, 10, 25],
  update() { this.t++; },
  tap() { if (this.prompt) G.tapKey('a'); },
  draw(ctx) {
    const t = this.t;
    K.blit(ctx, sky(), 0, 0);
    ctx.save(); ctx.translate(120, 36); ctx.rotate(t / 600); const r = rays(); ctx.drawImage(r.c, -150, -150, 300, 300); ctx.restore();
    [[0, 12, .06, 40], [1, 46, .04, 36], [2, 26, .09, 30], [0, 70, .03, 26]].forEach(([k, y, sp, w], i) => { const e = cloud(k), x = ((i * 71 + t * sp) % (240 + w + 10)) - w - 5; ctx.drawImage(e.c, x - e.pad, y - e.pad, w + e.pad * 2, w * 18 / 44 + e.pad * 2); });
    for (const [k, y, sp] of [[0, 66, .08], [1, 92, .2]]) { const e = hill(k), o = -((t * sp) % 240); ctx.drawImage(e.c, o, y, 240, 70); ctx.drawImage(e.c, o + 240, y, 240, 70); }
    // sparkles
    for (let i = 0; i < 9; i++) { const a = Math.sin(t / 18 + i * 2.3); if (a > 0) K.star(ctx, (i * 67 + 13) % 236 + 2, (i * 29) % 58 + 4, 1 + a * 2.2, i % 3 ? '#ffffff' : '#fff27a'); }
    // creature parade along the front hill
    const n = this.ids.length, span = n * 44;
    for (let i = 0; i < n; i++) {
      const x = ((i * 44 - t * .45) % span + span) % span - 30, hop = Math.abs(Math.sin(t / 9 + i * 1.3)) * 4;
      ctx.fillStyle = 'rgba(30,80,30,.25)'; ctx.beginPath(); ctx.ellipse(x + 14, 129, 9 - hop * .5, 2.2, 0, 0, 7); ctx.fill();
      ctx.drawImage(G.creatureSprite(this.ids[i]), x, 101 - hop, 28, 28);
    }
    if (!this.hideLetters) this.drawLetters(ctx);
    K.blit(ctx, pill('sub', 150, 13, '#ffffff', '#3cc8e0'), 45, 49);
    G.text(ctx, 'A CREATURE-CATCHING ADVENTURE', 120, 52, { align: 'center', color: '#2a8aa8', shadow: false, font: '900 7px ' + G.FONT_FAM });
    if (this.prompt) {
      const s = 1 + Math.sin(t / 10) * .04;
      ctx.save(); ctx.translate(120, 145); ctx.scale(s, s); ctx.globalAlpha = .9 + .1 * Math.sin(t / 10);
      K.blit(ctx, pill('go', 96, 15, '#fff8e8', '#ff9f43'), -48, -7.5);
      G.text(ctx, G.pad && G.pad.active() ? 'PRESS A TO START' : G.touch ? 'TAP A TO START' : 'PRESS Z OR ENTER', 0, -4.5, { align: 'center', color: '#f7783f', shadow: 'rgba(255,160,80,.3)', font: G.FONT_B });
      ctx.restore();
    }
  },
  drawLetters(ctx) {
    const t = this.t;
    // logo: chunky multi-colour letters that drop in and then bob
    if (!lw || !lw.ok) { ctx.font = LFONT; lw = [...LOGO].map(c => ctx.measureText(c).width * .92); lw.ok = K.fontsReady(); }
    const total = lw.reduce((a, b) => a + b, 0); let lx = 120 - total / 2;
    for (let i = 0; i < LOGO.length; i++) {
      const d = t - i * 5, drop = d < 0 ? -80 : d < 24 ? -80 * Math.pow(1 - d / 24, 2) + Math.sin(d / 24 * Math.PI) * -4 : 0;
      const by = Math.sin(t / 16 + i * .7) * 1.6, rot = Math.sin(t / 24 + i) * .04;
      const e = letter(i); ctx.save(); ctx.translate(lx + lw[i] / 2, 8 + 20 + drop + by); ctx.rotate(rot + (i % 2 ? .05 : -.05));
      ctx.drawImage(e.c, -15 - e.pad, -20 - e.pad, 30 + e.pad * 2, 40 + e.pad * 2); ctx.restore();
      lx += lw[i];
    }
  },
};

// ---- Launch splash: a night sky, a lantern that lights up, and its glow growing until it fills the screen with the title ----
// The splash draws the whole screen itself (wide). When the glow starts to grow, an exact copy of the title screen (built the way
// the engine centres a scene and stretches its edges) is revealed through the expanding circle, so the sky, hills, parade and
// the dropping letters appear as the light reaches them and the last frame is the title, pixel for pixel.
// Any tap, A, B or Enter skips it. Takes about 2.5 seconds.
const SPLASH_LIGHT = 62, SPLASH_END = 160;
const night = () => K.cache('s-night' + G.W + 'x' + G.H, G.W, G.H, x => {
  const W = G.W, H = G.H, R = G.mulberry(77);
  x.fillStyle = K.lin(x, 0, 0, 0, H, ['#070a24', '#141a4a', '#2a2260', '#4a2c6a']); x.fillRect(0, 0, W, H);
  for (let i = 0; i < Math.round(W * H / 330); i++) { const s = R() < .15 ? 1 : .6; x.fillStyle = `rgba(255,255,255,${.35 + R() * .5})`; x.fillRect(R() * W, R() * H * .8, s, s); }
  x.fillStyle = '#0a0c26'; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 4) x.lineTo(i, H - 28 + Math.sin(i / 30) * 4 + Math.sin(i / 11) * 2); x.lineTo(W, H); x.fill();
}, { pad: 0, qmax: 5 });
function lantern(ctx, x, y, lit, t) {
  const fl = .9 + .1 * Math.sin(t / 3) + .05 * Math.sin(t / 1.7);
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#5a4a6a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, -16); ctx.stroke();
  ctx.fillStyle = '#3a2c4a'; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(0, -17); ctx.lineTo(7, -9); ctx.closePath(); ctx.fill();   // cap
  ctx.fillStyle = '#4a3a5a'; ctx.fillRect(-8, -9, 16, 2);
  K.rr(ctx, -6.5, -7, 13, 16, 2.5); ctx.fillStyle = lit ? `rgba(255,${190 + 40 * lit | 0},110,${.25 + .5 * lit})` : 'rgba(120,130,190,.25)'; ctx.fill();   // glass
  ctx.strokeStyle = '#6a5a7a'; ctx.lineWidth = .8; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 9); ctx.moveTo(-6.5, 1); ctx.lineTo(6.5, 1); ctx.stroke();
  ctx.fillStyle = '#4a3a5a'; ctx.fillRect(-8, 9, 16, 2.4);
  if (lit > 0) {   // the flame
    const h = (7 + 2 * fl) * lit, g = ctx.createRadialGradient(0, 4, 0, 0, 4, 10 * lit); g.addColorStop(0, `rgba(255,236,170,${.95 * lit})`); g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 4, 10 * lit, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(-4.4, 5, -.6 + Math.sin(t / 4) * .6, 8 - h); ctx.quadraticCurveTo(4.6, 5, 0, 8); ctx.fill();
    ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(-2.2, 6, 0, 8 - h * .62); ctx.quadraticCurveTo(2.2, 6, 0, 8); ctx.fill();
  }
  ctx.restore();
}
// The title screen as the engine shows it (centred 240x160, edges stretched out to the screen) on an offscreen canvas.
let titleCv = null;
function titleFull(ctx) {
  const c = ctx.canvas; if (!titleCv || titleCv.width !== c.width || titleCv.height !== c.height) { titleCv = G.cv(c.width, c.height); }
  const [tc, tx] = titleCv, S = G.S, W = G.W, H = G.H, ox = (W - 240) / 2, oy = H - 160;
  tx.setTransform(S, 0, 0, S, 0, 0); tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high'; tx.clearRect(0, 0, c.width, c.height);
  tx.fillStyle = '#000'; tx.fillRect(0, 0, W, H);
  tx.save(); tx.translate(ox, oy); G.W = 240; G.H = 160; title.hideLetters = true; try { title.draw(tx); } finally { title.hideLetters = false; G.W = W; G.H = H; tx.restore(); }
  if (ox > 0) { tx.drawImage(tc, Math.round(ox * S) + 1, 0, 1, tc.height, 0, 0, ox, H); tx.drawImage(tc, Math.round((ox + 240) * S) - 2, 0, 1, tc.height, ox + 240, 0, ox, H); }
  if (oy > 0) tx.drawImage(tc, 0, Math.round(oy * S) + 1, tc.width, 1, 0, 0, W, oy);
  tx.save(); tx.translate(ox, oy); G.W = 240; G.H = 160; try { title.drawLetters(tx); } finally { G.W = W; G.H = H; tx.restore(); }   // the letters last: they fall in from above the scene
  return tc;
}
const splash = {
  t: 0, pad: 'splash', wide: true,
  skip() { if (this.t < SPLASH_END) { this.t = SPLASH_END; title.t = Math.max(title.t, 60); } },   // the letters have landed by t = 60
  tap() { this.skip(); },
  update() { this.t++; if (this.t > SPLASH_LIGHT) title.update(); },
  draw(ctx) {
    const t = this.t, W = G.W, H = G.H, cx = W / 2, cy = H - 160 + 34;
    ctx.drawImage(night().c, 0, 0, W, H);
    // before the reveal: a lantern fades in, catches (a puff of embers), and its glow swells
    const fadeIn = Math.min(1, t / 26), lit = t < 34 ? 0 : Math.min(1, (t - 34) / 14);
    const r = t < 56 ? 0 : Math.min(Math.hypot(W, H), Math.pow((t - 56) / 76, 1.7) * Math.hypot(W, H));
    ctx.save(); ctx.globalAlpha = fadeIn * Math.max(0, 1 - (r - 6) / 40);
    ctx.save(); ctx.translate(cx, cy + 4); ctx.scale(1.6, 1.6); ctx.translate(-cx, -(cy + 4));   // the lantern is drawn 1.6x so it reads on a phone
    lantern(ctx, cx, cy, lit, t);
    if (lit) { const g = ctx.createRadialGradient(cx, cy + 4, 0, cx, cy + 4, 26 + 8 * Math.min(1, (t - 34) / 24)); g.addColorStop(0, 'rgba(255,200,110,.45)'); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 50, cy - 40, 100, 100); }
    if (t >= 34 && t < 90) {   // embers rising from the flame
      for (let i = 0; i < 14; i++) { const a = (t - 34 - i * 2.5) / 40; if (a < 0 || a > 1) continue; const ex = cx + Math.sin(i * 7.3 + a * 5) * (4 + a * 16), ey = cy + 2 - a * 46; K.star(ctx, ex, ey, (1 - a) * (1 + (i % 3) * .7), i % 2 ? '#ffd27a' : '#ffffff'); }
    }
    ctx.restore(); ctx.restore();
    if (t >= 56 && r > 0) {
      const tc = titleFull(ctx);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy + 4, r, 0, 7); ctx.clip(); ctx.drawImage(tc, 0, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';   // a bright rim where the light meets the night
      ctx.strokeStyle = `rgba(255,214,140,${Math.max(0, .85 - r / 300)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + 4, r, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, .5 - r / 400)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy + 4, Math.max(0, r - 1.5), 0, 7); ctx.stroke(); ctx.restore();
    }
  },
};
// Automated browsers (tests) go straight to the title, unless localStorage wildcard-splash = 1 asks for the splash.
const wantSplash = () => { try { if (localStorage.getItem('wildcard-splash') === '1') return true; } catch (e) { /* no storage */ } return !navigator.webdriver; };
async function playSplash() {
  if (!wantSplash()) return;
  G.scene = splash; splash.t = 0; title.t = 0;
  while (splash.t < SPLASH_END) {
    await G.nextFrame();
    if (G.input.pressed.a || G.input.pressed.b || G.input.pressed.start) splash.skip();
  }
  G.scene = title; title.t = Math.max(title.t, 0);
  for (let i = 0; i < 12; i++) await G.nextFrame();   // let go of the key that skipped it before the title looks for A
}

async function intro() {
  G.ui.style = 'light';
  await G.say('LANTERNREST, the vale of the Great Lantern.\nIts flame has kept the wild creatures calm for three hundred years.');
  await G.say('But the Lantern is dying, and the Wildcard that guards the vale has vanished. Lantern Night is almost here.');
  await G.say('You are a young Warden-in-training. Your grandfather Orrin is downstairs, and Elder Wren is waiting at the Hearth Shrine.');
  G.closeText();
}

async function begin(S, fresh) {
  G.state = S; G.ui.fade.a = 1; G.ui.fade.color = '#000';
  G.loadMap(S.map); G.placePlayer(S.x, S.y, S.dir);
  G.scene = G.world.scene; G.world.banner = null; G.world.busy = true;
  await G.fadeTo(0, 20);
  if (fresh) await intro();
  if (S._recovered) { delete S._recovered; await G.say('This save could not be read, so the backup copy was loaded. You may have lost a few minutes of play.'); G.closeText(); G.saveGame(); }
  G.world.busy = false;
}

// Called by the Android shell on the Back button: acts as B, or reports that the app should close from the title screen.
G.androidBack = function () {
  if (G.scene === title && !G.ui.layers.length) return 'exit';
  G.press('b'); setTimeout(() => G.release('b'), 60); return 'handled';
};

async function main() {
  G.scene = title; G.audio.music('town');
  await playSplash();
  for (;;) {
    await G.nextFrame();
    if (!(G.input.pressed.a || G.input.pressed.start)) continue;
    G.audio.sfx('select'); title.prompt = false;
    const last = G.latestSlot(), any = last > 0;
    const items = any ? ['CONTINUE', 'LOAD GAME', 'NEW GAME'] : ['NEW GAME'];
    const c = await G.choose(items, { x: 84, y: 104, cancel: false, minW: 50 });
    const pick = items[c];
    // CONTINUE: the game saved most recently, in whichever slot
    if (pick === 'CONTINUE') { G.slot = last; await begin(G.loadGame(last), false); return; }
    if (pick === 'LOAD GAME') { const n = await G.pickSlot('load'); if (n) { G.slot = n; await begin(G.loadGame(n), false); return; } title.prompt = true; continue; }
    // NEW GAME: with no saves it goes in slot 1; otherwise choose a slot
    const n = any ? await G.pickSlot('new') : 1;
    if (!n) { title.prompt = true; continue; }
    G.slot = n; await begin(G.newState(), true); return;
  }
}

addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('screen');
  G.start(canvas);
  if (document.fonts) ['700', '800', '900'].forEach(w => document.fonts.load(w + ' 10px Nunito'));
  main();
  // Touch / mouse controls.
  G.touch = matchMedia('(pointer: coarse)').matches;
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') G.touch = true; }, { capture: true });
  // The orb button shows the real Terra Orb art.
  if (G.orbImage) { const ob = document.querySelector('#pad .orb'); if (ob) try { ob.style.background = `url(${G.orbImage('terra').toDataURL()}) center / contain no-repeat`; } catch (e) { /* keep the CSS fallback */ } }

  // The on-screen controls follow what is happening (docs/CONTROLS.md): the stick only where something can be moved,
  // MENU and the orb button only while walking about, A alone on the title. body[data-pad] picks the CSS rules in index.html.
  G.padContext = function () {
    const sc = G.scene, ui = G.ui;
    if (sc && sc.pad && !ui.layers.length && !ui.text) return sc.pad;
    if (ui.layers.length) return 'menu';
    if (ui.text) return 'text';
    if (sc && sc.battle) return 'busy';
    if (G.world && sc === G.world.scene) return G.world.busy ? 'busy' : 'world';
    return 'menu';
  };
  const hasOrb = () => { const S = G.state; return !!(S && G.ITEMS && Object.keys(S.bag || {}).some(k => S.bag[k] > 0 && G.ITEMS[k] && G.ITEMS[k].kind === 'orb')); };
  let lastPad = '', lastOrb = '';
  (function padLoop() {
    try { document.body.dataset.padhide = G.pref('controls.padHide') ? '1' : '0'; const c = G.padContext(), o = c === 'world' ? (hasOrb() ? '1' : '0') : '1'; if (c !== lastPad) { lastPad = c; document.body.dataset.pad = c; } if (o !== lastOrb) { lastOrb = o; document.body.dataset.orbs = o; } } catch (e) { /* controls stay as they were */ }
    requestAnimationFrame(padLoop);
  })();
  // Thumbstick: the knob follows the finger; the strongest axis past a dead zone is held as a direction.
  // Settings (js/settings.js): sensitivity (dead zone), fixed or floating (the ring jumps to where you touch), size,
  // position, button size and opacity, left-handed layout and haptics. G.applyControls() re-applies them live.
  // Which touches are really down. Some phones lose a pointerup (a notification, a second finger, the app switcher); a button
  // or the stick would then stay "held" forever and the game would ignore every new press. Everything below checks this set.
  const downPtrs = new Set(); addEventListener('pointerdown', e => downPtrs.add(e.pointerId), true);
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, e => downPtrs.delete(e.pointerId), true);
  addEventListener('touchend', e => { if (!e.touches.length) downPtrs.clear(); }, true);
  const stick = document.getElementById('stick'), pad = document.getElementById('pad'), ab = pad && pad.querySelector('.ab');
  let home = [0, 0];   // the stick's resting offset from its layout position (from the position settings)
  G.applyControls = function () {
    if (!stick || !pad) return;
    const P = G.pref, left = P('controls.layout') === 'left', sx = P('controls.stickX') === 'inward' ? 26 : 0, sy = { low: 22, middle: 0, high: -34 }[P('controls.stickY')];
    pad.style.flexDirection = left ? 'row-reverse' : '';
    home = [left ? -sx : sx, sy];
    stick.style.scale = P('controls.stickSize') / 100; stick.style.translate = `${home[0]}px ${home[1]}px`;
    if (ab) { ab.style.scale = P('controls.buttonSize') / 100; ab.style.opacity = P('controls.buttonOpacity') / 100; }
  };
  if (stick) {
    const knob = stick.querySelector('.knob'); let held = null, id = null, origin = null;
    // The stick's own idea of the held direction can go stale (the game drops all held keys when the app loses focus), so a
    // direction counts as held only if the game agrees; otherwise pushing the same way again would do nothing.
    const set = k => { if (k === held && (!k || G.input.held[k])) return; if (held && held !== k) G.release(held); held = k; if (k) { G.press(k); G.haptic(4); } };
    const dead = () => ({ low: 22, medium: 14, high: 7 }[G.pref('controls.sensitivity')]);
    const move = e => {
      const r = stick.getBoundingClientRect(), cx = origin ? origin[0] : r.left + r.width / 2, cy = origin ? origin[1] : r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy;
      const max = r.width / 2 - 20, d = Math.hypot(dx, dy), k = Math.min(1, max / (d || 1)), sc = G.pref('controls.stickSize') / 100;
      knob.style.transform = `translate(${dx * k / sc}px, ${dy * k / sc}px)`;
      set(d < dead() ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    const reset = () => { id = null; origin = null; stick.classList.remove('on'); knob.style.transform = ''; stick.style.translate = `${home[0]}px ${home[1]}px`; set(null); };
    const end = e => { if (e.pointerId !== id) return; reset(); };
    G.resetPad = () => { reset(); document.querySelectorAll('[data-k].on').forEach(b => b.classList.remove('on')); };   // called when the app loses focus
    // Safety net: if a finger lifts but the stick never hears about it (lost events on some phones), let go anyway.
    for (const t of ['pointerup', 'pointercancel']) addEventListener(t, e => { if (e.pointerId === id) reset(); }, true);
    addEventListener('touchend', e => { if (!e.touches.length && id !== null) reset(); }, true);
    setInterval(() => { if (id !== null && !downPtrs.has(id)) reset(); }, 300);
    const begin = (e, float) => {
      e.preventDefault(); id = e.pointerId; stick.setPointerCapture(id); stick.classList.add('on'); G.audio.init();
      if (float) {   // floating: move the ring so its centre is under the finger
        const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        stick.style.translate = `${home[0] + dx}px ${home[1] + dy}px`; origin = [e.clientX, e.clientY];
      }
      move(e);
    };
    stick.addEventListener('pointerdown', e => begin(e, G.pref('controls.joystick') === 'floating'));
    // floating also starts anywhere on the stick's half of the control area
    if (pad) pad.addEventListener('pointerdown', e => { if (G.pref('controls.joystick') !== 'floating' || e.target.closest('button') || stick.contains(e.target)) return;
      const pr = pad.getBoundingClientRect(), leftHalf = e.clientX < pr.left + pr.width / 2, stickLeft = G.pref('controls.layout') !== 'left';
      if (leftHalf === stickLeft) begin(e, true); });
    stick.addEventListener('pointermove', e => {
      if (id === null && stick.hasPointerCapture && stick.hasPointerCapture(e.pointerId)) { id = e.pointerId; stick.classList.add('on'); }   // the thumb never left: pick the stick up again after a focus loss
      if (e.pointerId === id) move(e);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => stick.addEventListener(ev, end));
  }
  // Buttons (A, B, MENU, orb): remember which finger pressed each one and let go of it when that finger is gone, however it left.
  const btnPtr = new Map();   // key -> pointerId
  const letGo = k => { btnPtr.delete(k); G.release(k); document.querySelectorAll(`[data-k="${k}"]`).forEach(b => b.classList.remove('on')); };
  document.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    const down = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (_) {} b.classList.add('on'); btnPtr.set(k, e.pointerId); G.release(k); G.press(k); G.haptic(8); };   // release first: a stale "held" never swallows a new press
    const up = e => { e.preventDefault(); if (btnPtr.get(k) === e.pointerId || !btnPtr.has(k)) letGo(k); };
    b.addEventListener('pointerdown', down); ['pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, up));
    b.addEventListener('pointerup', () => G.audio.init());
  });
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, e => { for (const [k, id] of [...btnPtr]) if (id === e.pointerId) letGo(k); }, true);
  addEventListener('touchend', e => { if (!e.touches.length) for (const k of [...btnPtr.keys()]) letGo(k); }, true);
  setInterval(() => { for (const [k, id] of [...btnPtr]) if (!downPtrs.has(id)) letGo(k); }, 300);   // watchdog for a release that never arrived
  const resetPad0 = G.resetPad; G.resetPad = () => { if (resetPad0) resetPad0(); for (const k of [...btnPtr.keys()]) letGo(k); };
  G.applySettings();
});
})();
