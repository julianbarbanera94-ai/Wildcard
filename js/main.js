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
  t: 0, prompt: true, ids: [1, 4, 7, 12, 10, 25],
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
    K.blit(ctx, pill('sub', 150, 13, '#ffffff', '#3cc8e0'), 45, 49);
    G.text(ctx, 'A CREATURE-CATCHING ADVENTURE', 120, 52, { align: 'center', color: '#2a8aa8', shadow: false, font: '900 7px ' + G.FONT_FAM });
    if (this.prompt) {
      const s = 1 + Math.sin(t / 10) * .04;
      ctx.save(); ctx.translate(120, 145); ctx.scale(s, s); ctx.globalAlpha = .9 + .1 * Math.sin(t / 10);
      K.blit(ctx, pill('go', 96, 15, '#fff8e8', '#ff9f43'), -48, -7.5);
      G.text(ctx, G.touch ? 'TAP A TO START' : 'PRESS Z OR ENTER', 0, -4.5, { align: 'center', color: '#f7783f', shadow: 'rgba(255,160,80,.3)', font: G.FONT_B });
      ctx.restore();
    }
  },
};

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
  G.world.busy = false;
}

// Called by the Android shell on the Back button: acts as B, or reports that the app should close from the title screen.
G.androidBack = function () {
  if (G.scene === title && !G.ui.layers.length) return 'exit';
  G.press('b'); setTimeout(() => G.release('b'), 60); return 'handled';
};

async function main() {
  G.scene = title; G.audio.music('town');
  const save = G.loadGame();
  for (;;) {
    await G.nextFrame();
    if (!(G.input.pressed.a || G.input.pressed.start)) continue;
    G.audio.sfx('select'); title.prompt = false;
    const items = save ? ['CONTINUE', 'NEW GAME'] : ['NEW GAME'];
    const c = await G.choose(items, { x: 84, y: 112, cancel: false, minW: 50 });
    if (save && c === 0) { await begin(save, false); return; }
    if (!save || c === 1) {
      if (save && !(await G.yesNo({ right: 236, bottom: 156 }))) { title.prompt = true; continue; }
      await begin(G.newState(), true); return;
    }
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
  // Thumbstick: the knob follows the finger; the strongest axis past a small dead zone is held as a direction.
  const stick = document.getElementById('stick');
  if (stick) {
    const knob = stick.querySelector('.knob'); let held = null, id = null;
    const set = k => { if (k === held) return; if (held) G.release(held); held = k; if (k) G.press(k); };
    const move = e => {
      const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2 - 20, d = Math.hypot(dx, dy), k = Math.min(1, max / (d || 1));
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      set(d < 14 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    const end = e => { if (e.pointerId !== id) return; id = null; stick.classList.remove('on'); knob.style.transform = ''; set(null); };
    stick.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; stick.setPointerCapture(id); stick.classList.add('on'); G.audio.init(); move(e); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => stick.addEventListener(ev, end));
  }
  document.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    const down = e => { e.preventDefault(); b.classList.add('on'); G.press(k); };
    const up = e => { e.preventDefault(); b.classList.remove('on'); G.release(k); };
    b.addEventListener('pointerdown', down); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, up));
    b.addEventListener('pointerup', () => G.audio.init());
  });
});
})();
