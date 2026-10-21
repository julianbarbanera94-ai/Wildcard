// Engine: input, audio, main loop, dialogue boxes, menus and screen fades.
(function () {
const G = globalThis.G;

// ---- Input ----------------------------------------------------------------
// `pressed` holds this frame's fresh key-downs; `next` collects ones arriving between frames.
const input = G.input = { held: {}, pressed: {}, next: {} };
const KEYS = {
  ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
  z: 'a', Z: 'a', ' ': 'a', x: 'b', X: 'b', Backspace: 'b', Escape: 'b', Enter: 'start', m: 'mute', M: 'mute',
};
G.press = k => { if (!input.held[k]) input.next[k] = true; input.held[k] = true; G.audio.init(); };
G.release = k => { input.held[k] = false; };
addEventListener('keydown', e => { const k = KEYS[e.key]; if (k) { e.preventDefault(); if (!e.repeat) G.press(k); } });
addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) G.release(k); });
addEventListener('blur', () => { input.held = {}; });
addEventListener('contextmenu', e => e.preventDefault());
// Pause sound and drop held keys while the page/app is in the background; save progress when leaving.
document.addEventListener('visibilitychange', () => {
  const a = G.audio;
  if (document.hidden) { input.held = {}; if (a.ctx) a.ctx.suspend(); if (G.autosave) G.autosave(); }
  else if (a.ctx) a.ctx.resume();
});
addEventListener('pagehide', () => { if (G.autosave) G.autosave(); });

// ---- Audio ----------------------------------------------------------------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = n => { if (n === 'r') return 0; const m = /^([A-G])(#?)(\d)$/.exec(n); return 440 * Math.pow(2, (NOTE[m[1]] + (m[2] ? 1 : 0) + (+m[3] - 4) * 12 - 9) / 12); };
const SFX = {
  select: [['E6', .04], ['A6', .06]], bump: [['A2', .07]], hit: [['C3', .05, 'sawtooth'], ['A2', .09, 'sawtooth']],
  super: [['C3', .05, 'sawtooth'], ['G5', .08, 'square'], ['C6', .1, 'square']], weak: [['E3', .1, 'triangle']],
  faint: [['G4', .12], ['E4', .12], ['C4', .12], ['G3', .25]], throw: [['C5', .05], ['E5', .05], ['G5', .05]],
  wobble: [['C4', .06, 'triangle'], ['G3', .08, 'triangle']], caught: [['C5', .1], ['E5', .1], ['G5', .1], ['C6', .1], ['r', .06], ['G5', .08], ['C6', .3]],
  levelup: [['C5', .08], ['E5', .08], ['G5', .08], ['C6', .16], ['G5', .08], ['C6', .3]], heal: [['C5', .1], ['E5', .1], ['G5', .1], ['E5', .1], ['G5', .1], ['C6', .3]],
  exclaim: [['A5', .06], ['E6', .12]], buy: [['E5', .05], ['B5', .1]], warp: [['C5', .05], ['G4', .05], ['C4', .08]],
};
const TUNES = {
  town: { bpm: 104, lead: 'E5:.5 G5:.5 C6:1 B5:.5 G5:.5 A5:1 G5:.5 E5:.5 D5:1 E5:.5 G5:.5 C5:1 r:1 A5:.5 C6:.5 E6:1 D6:.5 C6:.5 B5:1 A5:.5 G5:.5 E5:1 D5:.5 E5:.5 C5:2', bass: 'C3:2 G3:2 A3:2 E3:2 F3:2 C3:2 G3:2 C3:2', wave: 'square' },
  route: { bpm: 132, lead: 'G5:.5 G5:.5 E5:.5 G5:.5 A5:1 G5:1 F5:.5 F5:.5 D5:.5 F5:.5 G5:1 E5:1 G5:.5 A5:.5 B5:.5 C6:.5 B5:1 G5:1 A5:.5 G5:.5 F5:.5 E5:.5 D5:1 C5:1', bass: 'C3:1 G3:1 C3:1 G3:1 F3:1 C3:1 F3:1 C3:1 E3:1 B3:1 E3:1 B3:1 F3:1 G3:1 C3:1 G3:1', wave: 'square' },
  cave: { bpm: 80, lead: 'A4:1 r:.5 C5:.5 B4:1 r:1 E4:1 r:.5 G4:.5 F4:1 r:1 A4:.5 B4:.5 C5:1 E5:1 D5:.5 C5:.5 B4:2', bass: 'A2:2 A2:2 E2:2 E2:2 F2:2 F2:2 E2:2 E2:2', wave: 'triangle' },
  battle: { bpm: 156, lead: 'A4:.5 A4:.5 C5:.5 A4:.5 E5:.5 A4:.5 D5:.5 C5:.5 B4:.5 B4:.5 D5:.5 B4:.5 F5:.5 B4:.5 E5:.5 D5:.5 C5:.5 C5:.5 E5:.5 C5:.5 G5:.5 E5:.5 F5:.5 E5:.5 D5:1 B4:1', bass: 'A2:.5 A2:.5 A3:.5 A2:.5 A2:.5 A2:.5 A3:.5 A2:.5 G2:.5 G2:.5 G3:.5 G2:.5 G2:.5 G2:.5 G3:.5 G2:.5 F2:.5 F2:.5 F3:.5 F2:.5 F2:.5 F2:.5 F3:.5 F2:.5 E2:.5 E2:.5 E3:.5 E2:.5 E2:.5 E2:.5 E3:.5 E2:.5', wave: 'square' },
};
const parse = s => s.split(' ').map(t => { const [n, b] = t.split(':'); return [n, +b]; });
const audio = G.audio = {
  ctx: null, muted: false, cur: null, timer: null,
  init() { if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = .12; this.master.connect(this.ctx.destination); if (this.want) this.music(this.want); } catch (e) { } },
  tone(f, t, d, type, vol) {
    if (!this.ctx || !f) return; const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.value = f; g.gain.setValueAtTime(vol || 1, t); g.gain.exponentialRampToValueAtTime(.001, t + d + .02);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + .05);
  },
  sfx(name) { if (!this.ctx || this.muted) return; let t = this.ctx.currentTime; for (const [n, d, w] of SFX[name] || []) { this.tone(freq(n), t, d, w, .9); t += d; } },
  music(name) {
    this.want = name; if (!this.ctx || this.cur === name) return; this.cur = name; clearInterval(this.timer);
    if (!name) return;
    const tu = TUNES[name], spb = 60 / tu.bpm, ch = [parse(tu.lead), parse(tu.bass)];
    const len = Math.max(...ch.map(c => c.reduce((a, n) => a + n[1], 0)));
    const st = ch.map(() => ({ i: 0, t: this.ctx.currentTime + .1, done: 0 }));
    this.timer = setInterval(() => {
      if (this.muted) { st.forEach(s => s.t = Math.max(s.t, this.ctx.currentTime)); return; }
      ch.forEach((c, k) => {
        const s = st[k];
        s.t = Math.max(s.t, this.ctx.currentTime - .05);   // never replay notes missed while backgrounded
        while (s.t < this.ctx.currentTime + .3) {
          const [n, b] = c[s.i]; this.tone(freq(n), s.t, b * spb * .9, k ? tu.wave === 'triangle' ? 'triangle' : 'triangle' : tu.wave, k ? .9 : .5);
          s.t += b * spb; s.done += b; s.i++;
          if (s.i >= c.length) { s.i = 0; if (s.done < len) { s.t += (len - s.done) * spb; } s.done = 0; }
        }
      });
    }, 60);
  },
  toggle() { this.muted = !this.muted; },
};

// ---- Loop -----------------------------------------------------------------
G.frameNo = 0; G.scene = null;
const waiters = [];
G.nextFrame = () => new Promise(r => waiters.push(r));
G.wait = async n => { for (let i = 0; i < n; i++) await G.nextFrame(); };
G.waitA = async () => { for (;;) { await G.nextFrame(); if (input.pressed.a || input.pressed.b) return; } };

G.ui = { text: null, layers: [], fade: { a: 0, color: '#000' }, wipe: 0 };
function tick() {
  input.pressed = input.next; input.next = {}; G.frameNo++;
  if (input.pressed.mute) audio.toggle();
  waiters.splice(0).forEach(r => r());
  G.scene && G.scene.update && G.scene.update();
}
function draw(ctx) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, G.W, G.H);
  G.scene && G.scene.draw(ctx);
  if (G.ui.text) drawText(ctx, G.ui.text);
  G.ui.layers.forEach(l => l.draw(ctx));
  const f = G.ui.fade; if (f.a > 0) { ctx.globalAlpha = Math.min(1, f.a); ctx.fillStyle = f.color; ctx.fillRect(0, 0, G.W, G.H); ctx.globalAlpha = 1; }
  if (G.ui.wipe > 0) { // battle-entry shutters
    ctx.fillStyle = '#000'; const n = 8, hh = G.H / n;
    for (let i = 0; i < n; i++) { const w = G.W * Math.min(1, G.ui.wipe); if (i % 2) ctx.fillRect(G.W - w, i * hh, w, hh); else ctx.fillRect(0, i * hh, w, hh); }
  }
  if (audio.muted) G.text(ctx, 'MUTE', G.W - 4, 2, { align: 'right', color: '#fff', shadow: '#000' });
}
G.start = function (canvas) {
  const ctx = canvas.getContext('2d'); ctx.scale(G.S, G.S); ctx.imageSmoothingEnabled = false;
  let last = performance.now(), acc = 0;
  const dt = 1000 / 60;
  (function frame(now) {
    acc = Math.min(acc + now - last, dt * 2); last = now;
    if (acc >= dt - 1) {   // update and draw once per game tick, so 120Hz screens don't do double work
      acc = Math.max(0, acc - dt); try { tick(); } catch (e) { console.error(e); }
      try { draw(ctx); } catch (e) { console.error(e); }
    }
    requestAnimationFrame(frame);
  })(last);
};

// ---- Fades ----------------------------------------------------------------
G.fadeTo = async (a, frames, color) => {
  const f = G.ui.fade; if (color) f.color = color; const a0 = f.a;
  for (let i = 1; i <= frames; i++) { await G.nextFrame(); f.a = a0 + (a - a0) * i / frames; }
  f.a = a;
};

// ---- Dialogue -------------------------------------------------------------
function wrap(ctx, str, maxW) {
  const lines = [];
  for (const para of str.split('\n')) {
    let cur = '';
    for (const word of para.split(' ')) {
      const t = cur ? cur + ' ' + word : word;
      if (cur && G.textW(ctx, t) > maxW) { lines.push(cur); cur = word; } else cur = t;
    }
    lines.push(cur);
  }
  return lines;
}
const measure = document.createElement('canvas').getContext('2d');
G.wrap = (s, w) => wrap(measure, s, w);
function drawText(ctx, t) {
  G.frame(ctx, 2, 110, 236, 48, t.style);
  const dark = t.style === 'dark';
  t.lines.forEach((l, i) => G.text(ctx, l.slice(0, Math.max(0, t.shown - t.lines.slice(0, i).join('').length)), 12, 118 + i * 15, dark ? { color: '#fff', shadow: '#102030' } : {}));
  if (t.arrow && (G.frameNo >> 4) % 2) { ctx.fillStyle = dark ? '#fff' : '#d04848'; ctx.beginPath(); ctx.moveTo(224, 144); ctx.lineTo(231, 144); ctx.lineTo(227.5, 149); ctx.fill(); }
}
// opts: { auto: frames to wait instead of A, style: 'light'|'dark' }
G.say = async function (str, opts) {
  opts = opts || {};
  const style = opts.style || G.ui.style || 'light', lines = wrap(measure, str, 212);
  for (let p = 0; p < lines.length; p += 2) {
    const page = lines.slice(p, p + 2), total = page.join('').length;
    const t = G.ui.text = { lines: page, shown: 0, arrow: false, style };
    await G.nextFrame();
    while (t.shown < total) { t.shown += input.held.a || input.held.b ? 4 : 1; if (input.pressed.a || input.pressed.b) t.shown = total; await G.nextFrame(); }
    t.shown = total;
    if (opts.auto) { for (let i = 0; i < opts.auto; i++) { await G.nextFrame(); if (input.pressed.a || input.pressed.b) break; } }
    else { t.arrow = true; await G.waitA(); G.audio.sfx('select'); }
  }
};
G.closeText = () => { G.ui.text = null; };

// ---- Menus ----------------------------------------------------------------
// items: strings. Returns chosen index or -1 when cancelled. o: x,y,cols,minW,cancel,index,onMove(i),extra(ctx,i),style,rowH
G.choose = async function (items, o) {
  o = o || {};
  const cols = o.cols || 1, rowH = o.rowH || 14, rows = Math.ceil(items.length / cols), style = o.style || G.ui.style || 'light';
  const cw = Math.max(o.minW || 0, ...items.map(s => G.textW(measure, String(s)))) + 16;
  const w = cw * cols + 8 + (o.padW || 0), h = rows * rowH + 10;
  let x = o.x === undefined ? 4 : o.x, y = o.y === undefined ? 4 : o.y;
  if (o.right) x = o.right - w; if (o.bottom) y = o.bottom - h;
  let idx = Math.min(o.index || 0, items.length - 1);
  const layer = {
    draw(ctx) {
      G.frame(ctx, x, y, w, h, style);
      const dark = style === 'dark';
      items.forEach((it, i) => {
        const cx = x + 6 + (i % cols) * cw, cy = y + 5 + Math.floor(i / cols) * rowH;
        G.text(ctx, String(it), cx + 10, cy + 2, dark ? { color: '#fff', shadow: '#102030' } : {});
        if (i === idx) { ctx.fillStyle = dark ? '#f8d848' : '#d04848'; ctx.beginPath(); ctx.moveTo(cx + 1, cy + 2); ctx.lineTo(cx + 6, cy + 5.5); ctx.lineTo(cx + 1, cy + 9); ctx.fill(); }
      });
    },
  };
  G.ui.layers.push(layer);
  if (o.extra) { layer.draw = (d => ctx => { d(ctx); o.extra(ctx, idx); })(layer.draw); }
  if (o.onMove) o.onMove(idx);
  let res = -2;
  while (res === -2) {
    await G.nextFrame();
    const p = input.pressed; let n = idx;
    if (p.up) n = idx - cols; if (p.down) n = idx + cols;
    if (cols > 1 && p.left && idx % cols) n = idx - 1; if (cols > 1 && p.right && idx % cols < cols - 1) n = idx + 1;
    if (n >= 0 && n < items.length && n !== idx) { idx = n; audio.sfx('select'); if (o.onMove) o.onMove(idx); }
    else if (cols === 1 && (p.up || p.down) && items.length > 1) { idx = p.up ? items.length - 1 : 0; audio.sfx('select'); if (o.onMove) o.onMove(idx); }
    if (p.a) { audio.sfx('select'); res = idx; }
    else if (p.b && o.cancel !== false) res = -1;
  }
  G.ui.layers.splice(G.ui.layers.indexOf(layer), 1);
  return res;
};
G.yesNo = async function (o) { return (await G.choose(['YES', 'NO'], Object.assign({ right: 236, bottom: 108, cancel: true, minW: 24 }, o))) === 0; };
})();
