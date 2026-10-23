// Settings, controls and player preferences: node tests/e2e-settings.js
// Persistence (reload, bad data, old format, reset keeps saves), the settings screen, battle memory (same creature, switching,
// exhausted moves, the setting off, reload), HUD toggles on the real HUD, controls on the real pad, audio buses, accessibility,
// text speed, fast battles, and the hidden Developer menu. Desktop and phone sizes.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errors = [];
  const open = async (vp, mobile) => {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: !!mobile, isMobile: !!mobile });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(400);
    return page;
  };
  let page = await open({ width: 960, height: 640 });
  const ev = (fn, a) => page.evaluate(fn, a), step = n => console.log('✓', n), shot = n => page.screenshot({ path: `${OUT}/settings-${n}.png` });
  const key = async (k, ms = 120) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
  const until = async (fn, ms = 20000, msg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return; await page.waitForTimeout(40); } await shot('timeout'); throw new Error('timeout ' + (msg || fn)); };
  const idle = () => until(() => G.state && !G.world.busy && G.scene === G.world.scene && G.ui.fade.a === 0 && !G.ui.layers.length && !G.ui.text, 40000, 'idle');
  const boot = async () => { await key('z'); await key('z', 400); for (let i = 0; i < 40 && await ev(() => !G.state || G.world.busy); i++) await key('z', 60); await idle();
    await ev(() => { G.state = G.newState(); G.migrateState(G.state); const S = G.state; S.flags.starter = true; const a = G.makeCreature(1, 30), c = G.makeCreature(4, 30); S.party.push(a, c); G.loadMap('lanternrest'); G.placePlayer(29, 26, 0); G.scene = G.world.scene; G.world.busy = false; }); };
  await ev(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400); await boot();

  // 1) defaults, saving, reload, bad data, old format
  assert.deepEqual(await ev(() => [G.pref('battle.textSpeed'), G.pref('audio.music'), G.pref('hud.scale'), G.pref('controls.joystick')]), ['normal', 70, 'medium', 'fixed']);
  await ev(() => { G.setPref('battle.textSpeed', 'fast'); G.setPref('audio.music', 30); G.setPref('hud.prompts', false); G.setPref('nonsense', 1); G.setPref('audio.music', 999); });
  assert.deepEqual(await ev(() => JSON.parse(localStorage.getItem('wildcard-settings'))), { v: 1, values: await ev(() => Object.fromEntries(Object.keys(G.SETTINGS_SCHEMA).map(k => [k, G.pref(k)]))) }, 'saved straight away with a version');
  assert.equal(await ev(() => G.pref('audio.music')), 30, 'an out-of-range value is refused');
  await page.reload(); await page.waitForTimeout(400);
  assert.deepEqual(await ev(() => [G.pref('battle.textSpeed'), G.pref('audio.music'), G.pref('hud.prompts')]), ['fast', 30, false], 'settings survive a reload');
  await ev(() => localStorage.setItem('wildcard-settings', '{not json')); await page.reload(); await page.waitForTimeout(400);
  assert.equal(await ev(() => G.pref('battle.textSpeed')), 'normal', 'broken data falls back to defaults');
  await ev(() => localStorage.setItem('wildcard-settings', JSON.stringify({ 'audio.sfx': 40, 'hud.scale': 'huge', 'battle.rememberMove': 'yes' }))); await page.reload(); await page.waitForTimeout(400);
  assert.deepEqual(await ev(() => [G.pref('audio.sfx'), G.pref('hud.scale'), G.pref('battle.rememberMove')]), [40, 'medium', true], 'an old unversioned format is read; bad values reset key by key');
  step('settings save immediately with a schema version, survive reloads, and broken, invalid or old data falls back safely');
  // 2) reset keeps game progress
  await boot(); await ev(() => { G.state.name = 'KEEPME'; G.saveGame(2); G.setPref('audio.master', 20); G.resetPrefs(); });
  assert.deepEqual(await ev(() => [G.pref('audio.master'), G.loadGame(2) && G.loadGame(2).name]), [80, 'KEEPME'], 'reset settings, save slot untouched');
  step('Reset to Defaults restores settings and leaves save slots alone');

  // 3) the settings screen: keyboard and touch
  await ev(() => G.runWorld(() => G.settingsMenu())); await page.waitForTimeout(300); await shot('gameplay');
  await key('ArrowRight'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowRight');   // GAMEPLAY > Battle speed > FAST
  assert.equal(await ev(() => G.pref('battle.animSpeed')), 'fast', 'right arrow changes an option');
  await key('ArrowUp'); await key('z'); assert.equal(await ev(() => G.pref('battle.rememberAction')), false, 'A toggles a switch');
  await key('z'); await key('x'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowRight'); await shot('audio');   // AUDIO
  await key('ArrowRight'); assert.equal(await ev(() => G.pref('audio.master')), 90, 'a slider steps by 10');
  await key('x'); await key('x'); await idle();
  await ev(() => { G.setPref('battle.animSpeed', 'normal'); G.setPref('audio.master', 80); });
  step('the settings screen opens on Gameplay & Battle; arrows move and change values, A toggles, B goes back and closes');

  // 4) battle memory
  const startBattle = () => ev(() => { const w = G.makeCreature(12, 60); w.stats.hp = w.hp = 9999; G.state.flags.__b = 'run'; G.runWorld(async () => { G.state.flags.__r = await G.storyBattle({ wild: w }); }); });
  const menuIs = labels => ev(l => { const L = G.ui.layers[G.ui.layers.length - 1]; return !!(L && L.items && l.every((x, i) => L.items[i] === x)); }, labels);
  const cursor = () => ev(() => G.ui.layers[G.ui.layers.length - 1].idx);
  // battle messages advance by themselves, so just wait (pressing A here could land on the new menu)
  const toAction = async () => { await until(() => { const L = G.ui.layers[G.ui.layers.length - 1]; return !!(L && L.items && L.items[0] === 'FIGHT' && L.items[3] === 'RUN'); }, 30000, 'action menu'); await page.waitForTimeout(150); };
  await ev(() => { G.state.party.forEach(c => { c.moves.forEach(m => { m.pp = 30; }); }); });
  const moves = await ev(() => G.state.party[0].moves.map(m => m.id)); assert(moves.length >= 2, 'the lead knows two moves');
  await startBattle(); await toAction();
  await key('z', 250); assert(await ev(() => G.ui.layers[G.ui.layers.length - 1].items[0] === G.state.party[0].moves[0].id)); assert.equal(await cursor(), 0, 'first battle: the first move');
  await key('ArrowRight', 150); await key('z', 300);   // pick move 2
  await toAction(); assert.equal(await cursor(), 0, 'turn 2 starts on FIGHT (the last action)');
  await key('z', 250); assert.equal(await cursor(), 1, 'turn 2: the same move is highlighted, not chosen');
  await key('x', 200); await key('ArrowRight', 120); assert.equal(await cursor(), 1); await key('z', 400);   // BAG ...
  for (let i = 0; i < 10 && !(await ev(() => !!G.ui.layers.find(l => l.draw && !l.items))); i++) await page.waitForTimeout(80);
  await key('x', 400); await toAction(); assert.equal(await cursor(), 1, 'the last action (BAG) is remembered');
  // exhausted move falls back
  await ev(() => { G.state.party[0].moves[1].pp = 0; }); await key('ArrowLeft', 120); await key('z', 250); assert.equal(await cursor(), 0, 'no PP left: falls back to the first usable move');
  await key('x', 200);
  // switch creature: each keeps its own move
  await ev(() => { G.state.party[1].lastMove = G.state.party[1].moves[G.state.party[1].moves.length - 1].id; });
  assert.equal(await ev(() => G.battleMemory.move(G.state.party[1])), await ev(() => G.state.party[1].moves.length - 1), "the other creature's own move");
  assert.equal(await ev(() => G.battleMemory.move(G.state.party[0])), 0);
  assert.equal(await ev(() => G.battleMemory.target() && G.battleMemory.target().c.id), 12, 'the target is the foe in front of you');
  // setting off
  await ev(() => { G.state.party[0].moves[1].pp = 30; G.setPref('battle.rememberMove', false); G.setPref('battle.rememberAction', false); });
  assert.deepEqual(await ev(() => [G.battleMemory.move(G.state.party[0]), G.battleMemory.action()]), [0, 0], 'memory off: back to FIGHT and the first move');
  await ev(() => { G.setPref('battle.rememberMove', true); G.setPref('battle.rememberAction', true); });
  assert.equal(await ev(() => G.battleMemory.move(G.state.party[0])), 1, 'memory on again: the remembered move');
  // run away to end the battle; memory survives the battle and a save + reload
  await key('ArrowDown', 120); await key('ArrowRight', 120); await key('z', 300);
  for (let i = 0; i < 100 && await ev(() => G.scene !== G.world.scene); i++) { if (await menuIs(['FIGHT', 'BAG', 'PARTY', 'RUN'])) { await ev(() => { G.ui.layers[G.ui.layers.length - 1].items; }); await key('ArrowDown', 80); await key('ArrowRight', 80); } await key('z', 120); }
  await idle(); await ev(() => G.saveGame(1)); const re = await ev(() => { const S = G.loadGame(1); return [S.party[0].lastMove, S.battleMem && S.battleMem.action]; });
  assert.equal(re[0], moves[1], 'the remembered move is in the save'); assert.equal(typeof re[1], 'number');
  step('battle memory: the same move and last action are preselected (never auto-used); no-PP moves fall back; each creature keeps its own; the setting turns it off; it survives battles and reloads');

  // 5) HUD toggles change the real HUD
  await ev(() => { G.loadMap('lanternrest'); G.placePlayer(30, 28, 1); G.world.busy = false; G.world.banner = null; }); await page.waitForTimeout(300);   // facing a villager: 'Talk'
  await ev(() => { window.__h = 0; const d = G.drawHint; G.drawHint = function () { window.__h++; return d.apply(this, arguments); }; }); await page.waitForTimeout(400);
  const withP = await ev(() => window.__h); await ev(() => { G.setPref('hud.prompts', false); window.__h = 0; }); await page.waitForTimeout(400); const without = await ev(() => window.__h);
  assert(withP > 0 && without === 0, `prompts drawn ${withP} then ${without}`); await ev(() => G.setPref('hud.prompts', true));
  assert.deepEqual(await ev(() => { G.quest.tick(); const a = Object.keys(G.quest.markers()).length; G.setPref('hud.questMarkers', false); const b = Object.keys(G.quest.markers()).length; G.setPref('hud.questMarkers', true); return [a > 0, b]; }), [true, 0], 'quest markers vanish from the map');
  assert.deepEqual(await ev(() => { G.setPref('hud.reduceClutter', true); const r = [G.hudOn('navHints'), G.hudOn('minimap'), G.hudOn('prompts'), G.hudOn('questMarkers')]; G.setPref('hud.reduceClutter', false); return r; }), [false, false, true, true], 'reduced clutter keeps prompts and markers');
  assert.equal(await ev(() => { G.setPref('hud.tutorialHints', false); const v = document.getElementById('help').style.visibility; G.setPref('hud.tutorialHints', true); return v; }), 'hidden', 'control hints line hides');
  await ev(() => { G.setPref('hud.scale', 'large'); G.setPref('hud.opacity', 60); }); await page.waitForTimeout(300); await shot('hud-large');
  assert.deepEqual(await ev(() => [G.hudScale(), G.hudAlpha()]), [1.25, .6]); await ev(() => G.resetPrefs('hud.'));
  step('HUD: prompts, quest markers, control hints and clutter really change on screen; size and opacity apply; Reset HUD');

  // 6) controls change the real pad
  await page.close(); page = await open({ width: 412, height: 915 }, true); await boot();
  const pad = () => ev(() => { const s = document.getElementById('stick'), a = document.querySelector('#pad .ab'); return { scale: s.style.scale, tr: s.style.translate, dir: document.getElementById('pad').style.flexDirection, as: a.style.scale, ao: a.style.opacity }; });
  await ev(() => { G.setPref('controls.stickSize', 130); G.setPref('controls.layout', 'left'); G.setPref('controls.buttonOpacity', 60); G.setPref('controls.buttonSize', 80); G.setPref('controls.stickY', 'high'); });
  assert.deepEqual(await pad(), { scale: '1.3', tr: '0px -34px', dir: 'row-reverse', as: '0.8', ao: '0.6' }); await page.screenshot({ path: `${OUT}/settings-controls-phone.png` });
  // floating stick: touching away from the ring moves it there and steers
  await ev(() => { G.setPref('controls.layout', 'right'); G.setPref('controls.joystick', 'floating'); G.setPref('controls.stickSize', 100); G.setPref('controls.stickY', 'middle'); });
  const pr = await ev(() => { const r = document.getElementById('pad').getBoundingClientRect(); return [r.left + 30, r.top + 40]; });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pr[0], y: pr[1] }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pr[0] + 40, y: pr[1] }] });
  await page.waitForTimeout(100); const held = await ev(() => G.input.held.right); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert(held, 'floating stick: a drag from where you touched steers right');
  // run modes
  assert.deepEqual(await ev(() => { const r = []; for (const m of ['hold', 'always']) { G.setPref('controls.run', m); r.push([G.running({ b: false }), G.running({ b: true })]); } G.setPref('controls.run', 'toggle'); r.push(G.running({ b: false })); G.runToggle(); r.push(G.running({ b: false })); G.runToggle(); G.setPref('controls.run', 'hold'); return r; }),
    [[false, true], [true, false], false, true], 'hold B, always run (B walks), tap to toggle');
  await ev(() => G.resetPrefs('controls.')); const pr0 = await pad(); assert.deepEqual(pr0, { scale: '1', tr: '0px', dir: '', as: '1', ao: '1' }, 'Reset Controls ' + JSON.stringify(pr0));
  step('controls: stick size, height, layout, button size and opacity change the real pad; the floating stick follows your thumb; hold/tap/always running; Reset Controls');
  // the settings screen on a phone
  await ev(() => G.runWorld(() => G.settingsMenu())); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/settings-phone.png` });
  const fits = await ev(() => { const c = document.getElementById('screen').getBoundingClientRect(); return c.width <= innerWidth && c.height <= innerHeight; }); assert(fits);
  await page.keyboard.press('x'); await page.waitForTimeout(200);

  // 7) audio buses
  assert.deepEqual(await ev(() => { G.audio.init(); G.setPref('audio.music', 30); G.setPref('audio.ui', 0); G.setPref('audio.master', 50); const a = G.audio; const q = v => +v.toFixed(4), r = [q(a.bus.music.gain.value), q(a.bus.ui.gain.value), q(a.master.gain.value)]; G.setPref('audio.mute', true); r.push(a.master.gain.value); G.setPref('audio.mute', false); return r; }),
    [.3, 0, +(0.12 * .5 * 1.25).toFixed(4), 0], 'music, menu and master volumes, and mute, reach the real gains');
  step('audio: each slider sets its own bus gain; mute silences the master');
  // 8) accessibility, text, speed
  const acc = await ev(async () => { const r = {};
    G.setPref('access.shake', false); r.shake = G.shakeOK(); G.setPref('access.shake', true); G.setPref('access.reducedMotion', true); r.motion = [G.shakeOK(), G.motionOK()]; G.setPref('access.reducedMotion', false);
    G.setPref('access.reducedFlash', true); const p = G.fadeTo(0, 1, '#ffffff'); r.fade = G.ui.fade.color; await p; G.setPref('access.reducedFlash', false);
    G.setPref('access.textSize', 'large'); r.px = G.textPx(); G.setPref('access.textSize', 'medium');
    G.setPref('access.colourFriendly', true); r.hp = G.hpColor(.9); G.setPref('access.colourFriendly', false);
    G.setPref('access.noVibration', true); let buzz = 0; const v = navigator.vibrate; navigator.vibrate = () => { buzz++; }; G.haptic(); G.setPref('access.noVibration', false); G.haptic(); navigator.vibrate = v; r.buzz = buzz;
    return r; });
  assert.deepEqual(acc, { shake: false, motion: [false, false], fade: '#2a2040', px: 9.5, hp: '#3a8ad8', buzz: 1 });
  const frames = await ev(async () => { const out = {}; for (const sp of ['normal', 'instant']) { G.setPref('battle.textSpeed', sp); const f0 = G.frameNo; const p = G.say('The quick brown fox jumps over the lazy creature.', { auto: 1 }); await p; out[sp] = G.frameNo - f0; G.closeText(); } G.setPref('battle.textSpeed', 'normal'); return out; });
  assert(frames.instant < 6 && frames.normal > 30, 'instant text: ' + JSON.stringify(frames));
  const fast = await ev(async () => { const sc = G.scene, fake = { battle: true, update() {}, draw() {} }; G.scene = fake; const n = async () => { const f0 = G.frameNo; await new Promise(r => setTimeout(r, 500)); return G.frameNo - f0; };
    G.setPref('battle.animSpeed', 'normal'); const a = await n(); G.setPref('battle.animSpeed', 'fast'); const b = await n(); G.setPref('battle.animSpeed', 'normal'); G.scene = sc; return [a, b]; });
  assert(fast[1] > fast[0] * 1.6, 'fast battles run about twice the ticks: ' + fast);
  assert.deepEqual(await ev(() => [G.isValuable('Revive'), G.isValuable('Mythic Orb'), G.isValuable('Potion'), G.isValuable("Warden's Lamp")]), [true, true, false, false]);
  step('accessibility: shake, reduced motion and flashes (no white-outs), text size, colour-friendly HP, vibration; instant text and fast battles; valuables are flagged for confirmation');

  // 9) the developer menu is hidden until revealed
  await ev(() => { G.state.cheats = undefined; G.setPref('system.dev', false); G.runWorld(() => G.settingsMenu()); }); await page.waitForTimeout(300);
  for (let i = 0; i < 5; i++) await key('ArrowDown', 80); await key('ArrowRight');
  const rowsBefore = await ev(() => G.ui.layers.length);
  for (let i = 0; i < 6; i++) await key('ArrowDown', 80);
  for (let i = 0; i < 4; i++) await key('z', 120); assert.equal(await ev(() => G.pref('system.dev')), false, 'four presses: still hidden');
  await key('z', 200); for (let i = 0; i < 5 && await ev(() => !!G.ui.text); i++) await key('z', 150);
  assert.equal(await ev(() => G.pref('system.dev')), true, 'the fifth press reveals it'); await page.screenshot({ path: `${OUT}/settings-system-dev.png` });
  await key('x'); await key('x'); await idle();
  step('the Developer menu (Test Mode) is hidden in SYSTEM until you press A five times on the version');
  await browser.close();
  console.log('errors:', errors.length ? errors : 'none'); if (errors.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
