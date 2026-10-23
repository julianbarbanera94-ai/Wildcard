// Player preferences: one store for every setting, kept apart from game saves.
// G.pref('battle.textSpeed') reads a value; G.setPref(key, value) writes it, saves straight away and applies it.
// Saved in localStorage under 'wildcard-settings' as { v, values }. Missing, broken or old data falls back to the defaults
// key by key, so a bad value never stops the game from starting. Resetting settings never touches save slots.
(function () {
const KEY = 'wildcard-settings', VERSION = 1;
// Every setting: [default, kind, options]. kind: 'bool' | 'enum' (options: values) | 'num' (options: [min, max, step]).
const SCHEMA = {
  'battle.rememberMove': [true, 'bool'], 'battle.rememberAction': [true, 'bool'],
  'battle.animSpeed': ['normal', 'enum', ['normal', 'fast']], 'battle.textSpeed': ['normal', 'enum', ['slow', 'normal', 'fast', 'instant']],
  'battle.skipSeenIntros': [true, 'bool'], 'battle.reduceAnims': [false, 'bool'], 'battle.damageNumbers': [true, 'bool'],
  'battle.statusIcons': [true, 'bool'], 'battle.effectMsgs': [true, 'bool'], 'battle.autoAdvance': [false, 'bool'], 'battle.confirmValuable': [true, 'bool'],
  'hud.minimap': [true, 'bool'], 'hud.questMarkers': [true, 'bool'], 'hud.healthBars': [true, 'bool'], 'hud.namesLevels': [true, 'bool'],
  'hud.notifications': [true, 'bool'], 'hud.prompts': [true, 'bool'], 'hud.wildIndicators': [true, 'bool'], 'hud.navHints': [true, 'bool'],
  'hud.tutorialHints': [true, 'bool'], 'hud.scale': ['medium', 'enum', ['small', 'medium', 'large']], 'hud.opacity': [100, 'num', [40, 100, 10]],
  'hud.reduceClutter': [false, 'bool'],
  'controls.sensitivity': ['medium', 'enum', ['low', 'medium', 'high']], 'controls.joystick': ['fixed', 'enum', ['fixed', 'floating']],
  'controls.stickSize': [100, 'num', [70, 130, 10]], 'controls.stickX': ['edge', 'enum', ['edge', 'inward']], 'controls.stickY': ['middle', 'enum', ['low', 'middle', 'high']],
  'controls.buttonSize': [100, 'num', [70, 130, 10]], 'controls.buttonOpacity': [100, 'num', [40, 100, 10]], 'controls.layout': ['right', 'enum', ['right', 'left']],
  'controls.run': ['hold', 'enum', ['hold', 'toggle', 'always']], 'controls.haptics': [true, 'bool'],
  'audio.master': [80, 'num', [0, 100, 10]], 'audio.music': [70, 'num', [0, 100, 10]], 'audio.sfx': [80, 'num', [0, 100, 10]],
  'audio.battle': [80, 'num', [0, 100, 10]], 'audio.ui': [70, 'num', [0, 100, 10]], 'audio.mute': [false, 'bool'],
  'access.shake': [true, 'bool'], 'access.reducedMotion': [false, 'bool'], 'access.reducedFlash': [false, 'bool'],
  'access.textSize': ['medium', 'enum', ['small', 'medium', 'large']], 'access.noVibration': [false, 'bool'], 'access.colourFriendly': [false, 'bool'],
  'system.graphics': ['high', 'enum', ['high', 'balanced']], 'system.dev': [false, 'bool'],
};
G.SETTINGS_SCHEMA = SCHEMA;
const valid = (k, v) => { const s = SCHEMA[k]; if (!s) return false; if (s[1] === 'bool') return typeof v === 'boolean'; if (s[1] === 'enum') return s[2].includes(v);
  return typeof v === 'number' && isFinite(v) && v >= s[2][0] && v <= s[2][1]; };
const defaults = () => { const o = {}; for (const [k, s] of Object.entries(SCHEMA)) o[k] = s[0]; return o; };
// Older saved formats would be migrated here (v0: a bare { key: value } object).
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return {};
  if (raw.v === undefined && !raw.values) return raw;   // v0
  return raw.values && typeof raw.values === 'object' ? raw.values : {};
}
function load() {
  const out = defaults(); let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
  for (const [k, v] of Object.entries(migrate(raw))) if (valid(k, v)) out[k] = v;
  return out;
}
let values = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, values })); } catch (e) { /* storage full or blocked: settings still work this session */ } };
G.pref = k => values[k];
G.setPref = function (k, v) { if (!valid(k, v)) return false; values[k] = v; save(); G.applySettings(k); return true; };
G.resetPrefs = function (prefix) { const d = defaults(); for (const k of Object.keys(d)) if (!prefix || k.startsWith(prefix)) values[k] = d[k]; save(); G.applySettings(); };
G.reloadPrefs = () => { values = load(); G.applySettings(); };

// ---- What the settings mean to the rest of the game --------------------------------------------------------------------------
// HUD pieces: reduced clutter hides the optional ones (minimap, navigation hints, notifications, wild indicators, tutorial hints).
const CLUTTER = { minimap: 1, navHints: 1, notifications: 1, wildIndicators: 1, tutorialHints: 1 };
G.hudOn = k => !!values['hud.' + k] && !(values['hud.reduceClutter'] && CLUTTER[k]);
G.hudScale = () => ({ small: .8, medium: 1, large: 1.25 }[values['hud.scale']]);
G.hudAlpha = () => values['hud.opacity'] / 100;
// Draw a HUD piece scaled about an anchor point, at the HUD opacity.
G.hud = function (ctx, ax, ay, fn) { const s = G.hudScale(); ctx.save(); ctx.globalAlpha *= G.hudAlpha(); ctx.translate(ax, ay); ctx.scale(s, s); ctx.translate(-ax, -ay); try { fn(); } finally { ctx.restore(); } };
G.motionOK = () => !values['access.reducedMotion'];
G.shakeOK = () => values['access.shake'] && !values['access.reducedMotion'];
G.flashOK = () => !values['access.reducedFlash'];
// Text: characters per frame (Infinity = instant) and how long battle messages wait.
G.textRate = () => ({ slow: .5, normal: 1, fast: 2.5, instant: Infinity }[values['battle.textSpeed']]);
G.msgWait = n => Math.round(n * ({ slow: 1.4, normal: 1, fast: .6, instant: .4 }[values['battle.textSpeed']]));
G.textPx = () => ({ small: 7, medium: 8, large: 9.5 }[values['access.textSize']]);
G.battleFast = () => values['battle.animSpeed'] === 'fast';
G.haptic = ms => { if (values['controls.haptics'] && !values['access.noVibration'] && navigator.vibrate) try { navigator.vibrate(ms || 10); } catch (e) {} };
// Running: 'hold' (hold B), 'toggle' (tap B on the map to switch), 'always'.
let runOn = false;
G.runToggle = () => { runOn = !runOn; return runOn; };
G.running = held => values['controls.run'] === 'always' ? !held.b : values['controls.run'] === 'toggle' ? runOn : !!held.b;
// Valuable items: anything worth $1,000 or more, and the rarest orbs.
G.isValuable = n => { const it = G.ITEMS[n]; return !!it && it.kind !== 'key' && (it.price >= 1000 || n === 'Mythic Orb'); };

// Apply settings to the systems that hold their own copy (audio gains, the HTML controls, render resolution).
G.applySettings = function (changed) {
  if (G.audio && G.audio.applyVolumes) G.audio.applyVolumes();
  if (G.applyControls) G.applyControls();
  if (!changed || changed === 'system.graphics') { if (G.refit) G.refit(); }
  if (!changed || changed.startsWith('hud.')) { const h = document.getElementById('help'); if (h) h.style.visibility = G.hudOn('tutorialHints') ? '' : 'hidden'; }
};
G.VERSION = '3.13.1';
})();
