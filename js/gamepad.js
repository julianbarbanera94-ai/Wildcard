// Game controllers (Backbone One, Xbox, PlayStation and other standard pads): docs/CONTROLLER.md.
// Two sources feed one set of button states (indexes of the web "standard" gamepad layout: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT,
// 7 RT, 8 VIEW, 9 MENU, 10 L3, 11 R3, 12-15 D-pad up/down/left/right, 16 HOME):
//   - the browser Gamepad API, polled every frame (desktop browsers, and Android WebViews that expose it);
//   - the Android shell (MainActivity), which catches the controller's key and stick events itself and calls G.pad.native /
//     G.pad.axes, so a controller works whether or not the WebView exposes the Gamepad API (and its keys never reach the page
//     as Enter or arrows).
// Each game action (A, B, MENU, orb, ride) follows one button; the defaults come from Settings > Controls > Controller buttons
// and can be changed with SET UP CONTROLLER (G.padSetup), which is saved in localStorage 'wildcard-pad'. The D-pad and left
// stick always move. While a controller is in use the on-screen buttons hide (Settings can turn that off); touching the screen
// brings them back.
(function () {
const G = globalThis.G;
const NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'L3', 'R3', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'HOME'];
const ACTIONS = [['a', 'A  CONFIRM'], ['b', 'B  BACK, HOLD TO RUN'], ['start', 'MENU'], ['orb', 'THROW ORB'], ['ride', 'RIDE OR GET OFF']];
const DEFAULTS = { xbox: { a: 0, b: 1, orb: 2, ride: 3, start: 9 }, nintendo: { a: 1, b: 0, orb: 3, ride: 2, start: 9 } };
const DEAD = .5, KEY = 'wildcard-pad';
const down = new Array(17).fill(false), consumed = new Array(17).fill(false), applied = {};   // consumed: the press that finished a setup capture, ignored by the game until it is let go
let ax = 0, ay = 0, hx = 0, hy = 0, capturing = null, nativeAt = 0, apiName = '', nativeName = '', mode = 'touch';
let custom = {};
try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (ACTIONS.some(a => a[0] === k) && (v === null || (Number.isInteger(v) && v >= 0 && v < 32))) custom[k] = v; } catch (e) { custom = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch (e) { /* no storage */ } };
const layout = () => (G.pref && G.pref('controls.padLayout')) || 'xbox';
const bound = act => act in custom ? custom[act] : DEFAULTS[layout()][act];
const label = i => i === null || i === undefined ? 'NONE' : NAMES[i] || 'BUTTON ' + i;

function setMode(m) {
  if (m === mode) return; mode = m;
  document.body.dataset.input = m;
}
function wanted() {
  const on = i => down[i] && !consumed[i];
  const w = { up: on(12) || ay < -DEAD || hy < -.5, down: on(13) || ay > DEAD || hy > .5, left: on(14) || ax < -DEAD || hx < -.5, right: on(15) || ax > DEAD || hx > .5 };
  for (const [act] of ACTIONS) { const b = bound(act); w[act] = b !== null && b !== undefined && on(b); }
  return w;
}
// Turn the button states into the game's own key presses (only the changes).
function sync() {
  if (capturing) { for (const k of Object.keys(applied)) if (applied[k]) { applied[k] = false; G.release(k); } return; }
  const w = wanted(); let any = false;
  for (const k of Object.keys(w)) {
    if (w[k]) any = true;
    if (w[k] && !applied[k]) { applied[k] = true; G.press(k); } else if (!w[k] && applied[k]) { applied[k] = false; G.release(k); }
  }
  if (any) setMode('pad');
}
// The next fresh press, once everything has been let go; the controller does not drive the game meanwhile.
function newPress(i) {
  if (!capturing || capturing.waitUp) return;
  const c = capturing; capturing = null; consumed[i] = true; c.resolve(i);
}
const released = () => { for (let i = 0; i < down.length; i++) if (!down[i]) consumed[i] = false; };
function check() {
  if (capturing && capturing.waitUp && !down.some(Boolean) && Math.abs(ax) < DEAD && Math.abs(ay) < DEAD) capturing.waitUp = false;
}

const api = G.pad = {
  NAMES, ACTIONS, label, bound,
  native(i, isDown, name) {
    if (!(i >= 0 && i < down.length)) return; nativeAt = performance.now(); if (name) nativeName = name;
    const was = down[i]; down[i] = !!isDown; released(); check(); if (isDown && !was) newPress(i); sync();
  },
  axes(x, y, hatX, hatY) { nativeAt = performance.now(); ax = x || 0; ay = y || 0; hx = hatX || 0; hy = hatY || 0; check(); sync(); },
  connected() { return nativeAt > 0 || !!apiName; },
  name() { return nativeName || apiName || ''; },
  active() { return mode === 'pad'; },
  setBinding(act, i) { if (i === null) delete custom[act]; else custom[act] = i; if (i !== null) for (const [o] of ACTIONS) if (o !== act && bound(o) === i) custom[o] = null; save(); },
  resetBindings() { custom = {}; save(); },
  // resolves with a button index, or null if cancelled
  capture() { return new Promise(resolve => { capturing = { resolve, waitUp: down.some(Boolean) }; sync(); }); },
  cancelCapture() { if (capturing) { const c = capturing; capturing = null; c.resolve(null); } },
  capturing: () => !!capturing,
};

// Browser Gamepad API: polled each frame (the page gets nothing until a button is pressed once). Ignored while the Android shell
// is sending its own events, so a button is never counted twice.
function poll() {
  requestAnimationFrame(poll);
  if (!navigator.getGamepads || (nativeAt && performance.now() - nativeAt < 3000)) return;
  let gp = null; try { gp = [...navigator.getGamepads()].find(g => g && g.connected && g.buttons && g.buttons.length > 3); } catch (e) { gp = null; }
  if (!gp) { if (apiName) { apiName = ''; for (let i = 0; i < down.length; i++) down[i] = false; ax = ay = 0; sync(); } return; }
  apiName = gp.id.replace(/\(.*?\)/g, '').replace(/vendor:.*|standard gamepad/ig, '').trim().slice(0, 28) || 'CONTROLLER';
  let changed = false;
  for (let i = 0; i < down.length; i++) { const p = !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5)); if (p !== down[i]) { changed = true; down[i] = p; if (p) newPress(i); } }
  const nx = gp.axes[0] || 0, ny = gp.axes[1] || 0; if (nx !== ax || ny !== ay) { changed = true; ax = nx; ay = ny; }
  released(); check(); if (changed) sync();
}
addEventListener('gamepaddisconnected', () => { for (let i = 0; i < down.length; i++) down[i] = false; ax = ay = hx = hy = 0; sync(); });
addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || e.pointerType === 'mouse') setMode('touch'); }, true);
addEventListener('blur', () => { for (let i = 0; i < down.length; i++) down[i] = false; ax = ay = hx = hy = 0; for (const k of Object.keys(applied)) applied[k] = false; });
document.addEventListener('DOMContentLoaded', () => { document.body.dataset.input = 'touch'; requestAnimationFrame(poll); });

// ---- Controller setup: press a button for each action ---------------------------------------------------------------------
// Keyboard B/Esc or a tap on CANCEL leaves; SKIP (or the keyboard A) keeps the current button for that action.
G.padSetup = async function () {
  if (!api.connected()) { await G.say('No controller found.\nConnect it, press any button on it, then try again.'); G.closeText(); return false; }
  const K = G.kit; let step = 0, note = '', done = false, skip = false, cancel = false;
  const got = {};
  const layer = { draw(ctx) {
    ctx.fillStyle = 'rgba(255,246,232,.78)'; ctx.fillRect(-300, -300, 900, 800);
    G.frame(ctx, 14, 14, 212, 132, 'light'); G.tapZone(-999, -999, 2400, 2400, () => {});
    G.text(ctx, 'SET UP CONTROLLER', 120, 20, { align: 'center', font: G.FONT_B || G.FONT });
    G.text(ctx, api.name() || 'CONTROLLER', 120, 31, { align: 'center', font: G.FONT_S, color: '#8a7a90', shadow: false });
    if (!done) {
      G.text(ctx, 'PRESS THE BUTTON FOR', 120, 46, { align: 'center', font: G.FONT_S, color: '#5a4a66', shadow: false });
      K.pill(ctx, 40, 55, 160, 16, '#f7843f', ACTIONS[step][1]);
      G.text(ctx, note || (capturing ? 'WAITING FOR A BUTTON...' : ''), 120, 77, { align: 'center', font: G.FONT_S, color: note ? '#d0463c' : '#8a7a90', shadow: false });
    } else G.text(ctx, 'ALL SET. THESE BUTTONS ARE SAVED.', 120, 52, { align: 'center', font: G.FONT_S, color: '#2f9a45', shadow: false });
    ACTIONS.forEach(([act, name], i) => {
      const y = 88 + i * 8.5, on = !done && i === step;
      G.text(ctx, name, 30, y, { font: G.FONT_S, color: on ? '#f7783f' : '#5a4a66', shadow: false });
      G.text(ctx, label(i < step || done ? got[act] === undefined ? bound(act) : got[act] : bound(act)), 206, y, { align: 'right', font: G.FONT_S, color: i < step || done ? '#2f9a45' : '#8a7a90', shadow: false });
    });
    K.pill(ctx, 22, 134, 44, 9, '#9a8ea8', G.touch ? 'CANCEL' : 'B: CANCEL'); G.tapZone(20, 132, 48, 13, () => { cancel = true; });
    if (!done) { K.pill(ctx, 174, 134, 44, 9, '#9a8ea8', G.touch ? 'SKIP' : 'A: SKIP'); G.tapZone(172, 132, 48, 13, () => { skip = true; }); }
  } };
  G.ui.layers.push(layer);
  for (const k of ['a', 'b']) G.release(k);
  while (step < ACTIONS.length && !cancel) {
    const act = ACTIONS[step][0]; note = ''; skip = false;
    const p = api.capture(); let pick;
    for (;;) {
      pick = await Promise.race([p, G.nextFrame().then(() => undefined)]);
      if (pick !== undefined) break;
      const k = G.input.pressed;
      if (cancel || k.b) { cancel = true; api.cancelCapture(); pick = null; break; }
      if (skip || k.a) { api.cancelCapture(); pick = -1; break; }
    }
    if (cancel) break;
    if (pick === -1) { step++; continue; }
    if (pick === null) { cancel = true; break; }
    const clash = ACTIONS.slice(0, step).find(([o]) => got[o] === pick);
    if (clash) { note = label(pick) + ' IS ALREADY ' + clash[1].split('  ')[0]; G.audio.sfx('bump'); continue; }
    got[act] = pick; G.audio.sfx('select'); step++;
  }
  if (!cancel) { for (const [act, b] of Object.entries(got)) api.setBinding(act, b); done = true; G.audio.sfx('levelup'); for (let i = 0; i < 90; i++) { await G.nextFrame(); if (G.input.pressed.a || G.input.pressed.b) break; } }
  const i = G.ui.layers.indexOf(layer); if (i >= 0) G.ui.layers.splice(i, 1);
  return !cancel;
};
})();
