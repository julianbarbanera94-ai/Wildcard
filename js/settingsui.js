// START > SETTINGS: six categories of player preferences (js/settings.js holds the values).
// Keyboard: up/down choose, right or A enters a category, left/right change a value, A toggles or presses, B goes back.
// Touch: tap a category, tap a switch, tap an option, tap along a slider, tap the arrows to scroll.
// Test Mode now lives in a separate Developer menu, hidden until revealed (press A five times on the version row, or a save
// that had Test Mode unlocked before). It still asks for the password.
(function () {
const K = G.kit, P = k => G.pref(k);
const SW = (key, label, help) => ({ key, label, help, type: 'bool' });
const SEG = (key, label, opts, help) => ({ key, label, help, type: 'enum', opts });   // opts: [[value, 'LABEL'], ...]
const SL = (key, label, help, unit) => ({ key, label, help, type: 'num', unit: unit || '%' });
const ACT = (label, help, run, danger) => ({ label, help, type: 'act', run, danger });
const INFO = (label, value, help, run) => ({ label, help, type: 'info', value, run });
const yes = async q => { await G.say(q, { auto: 1 }); const ok = await G.yesNo(); G.closeText(); return ok; };
const fmtTime = ms => { if (!ms) return 'NEVER'; const d = new Date(ms); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); };
let devTaps = 0, result = null;

const CATS = [
  { id: 'gameplay', name: 'GAMEPLAY', title: 'GAMEPLAY & BATTLE', rows: () => [
    SW('battle.rememberMove', 'Remember last move', 'Each creature\'s last move is highlighted next turn. It is never chosen for you.'),
    SW('battle.rememberAction', 'Remember last action', 'Start each turn on FIGHT, BAG, PARTY or RUN, whichever you picked last.'),
    SEG('battle.animSpeed', 'Battle speed', [['normal', 'NORMAL'], ['fast', 'FAST']], 'Fast plays battles at double speed.'),
    SEG('battle.textSpeed', 'Text speed', [['slow', 'SLOW'], ['normal', 'MID'], ['fast', 'FAST'], ['instant', 'NOW']], 'How quickly words appear, everywhere in the game.'),
    SW('battle.autoAdvance', 'Auto-advance text', 'Dialogue moves on by itself after a moment. You can still press A.'),
    SW('battle.skipSeenIntros', 'Skip seen intros', 'Rematches skip a trainer\'s opening speech and the challenge line you have already seen.'),
    SW('battle.reduceAnims', 'Fewer battle effects', 'Fewer sparks and particles in battle.'),
    SW('battle.damageNumbers', 'Damage numbers', 'Show how much damage each hit does.'),
    SW('battle.statusIcons', 'Status icons', 'Show PSN, SLP, PAR and other status tags in battle.'),
    SW('battle.effectMsgs', 'Effectiveness messages', '"It\'s super effective!" and "not very effective" after hits.'),
    SW('battle.confirmValuable', 'Confirm valuable items', 'Ask before using items worth $1,000 or more, like Revives and Mythic Orbs.'),
  ] },
  { id: 'hud', name: 'HUD', title: 'HUD & INTERFACE', preview: 'hud', rows: () => [
    SW('hud.prompts', 'Interaction prompts', 'The "Z Talk" hint for whatever you are facing.'),
    SW('hud.questMarkers', 'Quest markers', 'Story and quest markers on the world map.'),
    SW('hud.healthBars', 'Health bars', 'Battle HP bars. When off, your HP numbers and the foe\'s % stay.'),
    SW('hud.namesLevels', 'Names and levels', 'Creature names and levels in battle.'),
    SW('hud.notifications', 'Notifications', 'Pop-ups for new quests, steps and reputation.'),
    SW('hud.wildIndicators', 'Wild creature alerts', 'The ! bubble when a bold wild creature spots you.'),
    SW('hud.navHints', 'Navigation hints', 'Entrance arrows and name plates, and the place name when you arrive.'),
    SW('hud.minimap', 'Sea mini-map', 'The mini-map and harbour compass while sailing.'),
    SW('hud.tutorialHints', 'Control hints', 'The keyboard help line under the game screen.'),
    SEG('hud.scale', 'HUD size', [['small', 'S'], ['medium', 'M'], ['large', 'L']], 'Size of prompts, pop-ups, place names and the mini-map.'),
    SL('hud.opacity', 'HUD opacity', 'How solid prompts, pop-ups and the mini-map look.'),
    SW('hud.reduceClutter', 'Reduce clutter', 'Hides the optional extras: hints, pop-ups, alerts and the mini-map. Prompts and markers stay.'),
    ACT('RESET HUD', 'Put every HUD setting back to its default.', async () => { if (await yes('Reset the HUD settings?')) G.resetPrefs('hud.'); }),
  ] },
  { id: 'controls', name: 'CONTROLS', title: 'CONTROLS', preview: 'controls', rows: () => [
    SEG('controls.sensitivity', 'Stick sensitivity', [['low', 'LOW'], ['medium', 'MID'], ['high', 'HIGH']], 'High reacts to the smallest push.'),
    SEG('controls.joystick', 'Stick type', [['fixed', 'FIXED'], ['floating', 'FLOAT']], 'Floating: the stick jumps to wherever you put your thumb.'),
    SL('controls.stickSize', 'Stick size', 'Size of the on-screen stick.'),
    SEG('controls.stickX', 'Stick position', [['edge', 'EDGE'], ['inward', 'INWARD']], 'Move the stick in from the edge of the screen.'),
    SEG('controls.stickY', 'Stick height', [['low', 'LOW'], ['middle', 'MID'], ['high', 'HIGH']], 'Move the stick up or down.'),
    SL('controls.buttonSize', 'Button size', 'Size of A, B, MENU and the orb button.'),
    SL('controls.buttonOpacity', 'Button opacity', 'Make the buttons more see-through.'),
    SEG('controls.layout', 'Buttons on', [['right', 'RIGHT'], ['left', 'LEFT']], 'Left puts A and B on the left, for left-handed play.'),
    SEG('controls.run', 'Running', [['hold', 'HOLD B'], ['toggle', 'TAP B'], ['always', 'ALWAYS']], 'Hold B to run, tap B to switch running on and off, or always run (hold B to walk).'),
    SW('controls.haptics', 'Vibration', 'A short buzz when you press buttons (phones that support it).'),
    ACT('RESET CONTROLS', 'Put every control setting back to its default.', async () => { if (await yes('Reset the control settings?')) G.resetPrefs('controls.'); }),
  ] },
  { id: 'audio', name: 'AUDIO', title: 'AUDIO', rows: () => [
    SL('audio.master', 'Master volume', 'Everything at once.'),
    SL('audio.music', 'Music', 'Town, route and cave music.'),
    SL('audio.sfx', 'Sound effects', 'Sounds out in the world: items, catches, doors.'),
    SL('audio.battle', 'Battle', 'Battle music and battle sounds.'),
    SL('audio.ui', 'Menu sounds', 'The little blips when you move through menus.'),
    SW('audio.mute', 'Mute all', 'Silence everything (M on a keyboard does this too).'),
  ] },
  { id: 'access', name: 'ACCESS', title: 'ACCESSIBILITY & COMFORT', rows: () => [
    SW('access.shake', 'Screen shake', 'The battle screen shakes when a hit lands.'),
    SW('access.reducedMotion', 'Reduced motion', 'No shaking, fewer particles, no sliding pop-ups or rising numbers.'),
    SW('access.reducedFlash', 'Reduced flashes', 'No white flashes: hits, evolutions and bright screen fades are softened.'),
    SEG('access.textSize', 'Text size', [['small', 'S'], ['medium', 'M'], ['large', 'L']], 'Size of the words in dialogue boxes.'),
    SW('access.noVibration', 'No vibration', 'Never vibrate, whatever the Controls setting says.'),
    SW('access.colourFriendly', 'Colour-friendly', 'HP bars use blue, orange and magenta instead of green, yellow and red.'),
  ] },
  { id: 'system', name: 'SYSTEM', title: 'SYSTEM', rows: () => {
    const I = G.slotInfo ? G.slotInfo(G.slot) : null, S = G.state;
    const rows = [
      INFO('Save', I ? `SLOT ${G.slot}  ${fmtTime(I.when)}` : `SLOT ${G.slot}  NOT SAVED YET`, 'Your current save slot and when it was last saved. Save from START > SAVE.'),
      INFO('Autosave', 'ON', 'The game saves quietly when you leave or switch apps, if you are out exploring.'),
      SEG('system.graphics', 'Graphics', [['high', 'HIGH'], ['balanced', 'SAVER']], 'Saver draws at a lower resolution to save battery.'),
      ACT('LOAD LAST SAVE', 'Go back to the last time this slot was saved. Anything since is lost.', async () => {
        const save = G.loadGame(G.slot); if (!save) { await G.worldApi.says('There is no save in this slot yet.'); return; }
        if (!(await yes(`Load slot ${G.slot}, saved ${fmtTime(save.savedAt)}? Progress since then is lost.`))) return;
        G.state = save; G.loadMap(save.map); G.placePlayer(save.x, save.y, save.dir); G.scene = G.world.scene; result = 'reloaded';
      }, true),
      ACT('CREDITS', 'Who made WILDCARD.', async () => { await G.worldApi.says(['WILDCARD', 'Made with Claude Code, for a player who wanted their own creature-catching adventure.', 'Every creature, town and tune was drawn and written for this game.', 'Thank you for playing!']); }),
      ACT('RESET ALL SETTINGS', 'Every setting back to its default. Your saves and progress are not touched.', async () => { if (await yes('Reset ALL settings? Your saves are safe.')) G.resetPrefs(); }, true),
      INFO('Version', G.VERSION, 'WILDCARD version.', async () => { if (P('system.dev')) return; if (++devTaps >= 5) { G.setPref('system.dev', true); G.audio.sfx('levelup'); await G.worldApi.says('Developer menu revealed.'); } }),
    ];
    if (P('system.dev') || (S && S.cheats && S.cheats.unlocked)) rows.push(ACT('DEVELOPER', 'Test Mode and debug tools. Needs the password.', async () => { if (G.devMenu) await G.devMenu(); }));
    return rows;
  } },
];

const X0 = 70, ROW = 13, VIS = 9, Y0 = 22;
G.settingsMenu = async function () {
  let cat = 0, row = 0, top = 0, focus = 'tabs', close = false, tap = null; result = null; devTaps = 0;
  const rows = () => CATS[cat].rows();
  const layer = { draw(ctx) {
    ctx.fillStyle = 'rgba(255,246,232,.55)'; ctx.fillRect(-300, -300, 900, 800);   // the world shows softly behind
    G.frame(ctx, 2, 2, 236, 156, 'light'); G.tapZone(-999, -999, 2400, 2400, () => {});
    G.text(ctx, 'SETTINGS', 10, 6, { font: G.FONT_B || G.FONT });
    G.text(ctx, CATS[cat].title, 122, 6.5, { font: G.FONT_S, color: '#8a7a90', shadow: false, align: 'center' });
    K.pill(ctx, 190, 5, 44, 9, '#9a8ea8', G.touch ? 'CLOSE' : 'B: CLOSE'); G.tapZone(188, 3, 48, 13, () => { tap = ['close']; });
    // categories
    CATS.forEach((c, i) => { const y = Y0 + i * 19, on = i === cat;
      K.rr(ctx, 6, y - 2, 60, 15, 7); ctx.fillStyle = on ? (focus === 'tabs' ? '#f7843f' : '#ffb27a') : 'rgba(200,188,212,.35)'; ctx.fill();
      G.text(ctx, c.name, 36, y + 1.5, { align: 'center', font: '900 6.5px ' + G.FONT_FAM, color: on ? '#fff' : '#5a4a66', shadow: on ? '#c0602a' : false });
      G.tapZone(6, y - 2, 60, 15, () => { tap = ['cat', i]; }); });
    // rows
    const R = rows(); top = Math.max(0, Math.min(top, R.length - VIS));
    R.slice(top, top + VIS).forEach((r, k) => {
      const i = top + k, y = Y0 + k * ROW, on = focus === 'rows' && i === row;
      if (on) { K.rr(ctx, X0, y - 2.5, 164, ROW - 1, 4); ctx.fillStyle = 'rgba(247,132,63,.18)'; ctx.fill(); }
      G.tapZone(X0, y - 2.5, 164, ROW - 1, (tx) => { tap = ['row', i, tx]; });
      if (r.type === 'act') { K.pill(ctx, X0 + 2, y - 1.5, 160, 9.5, r.danger ? '#e06a5a' : '#3a9ae8', r.label); return; }
      G.text(ctx, r.label, X0 + 4, y, { font: G.FONT_S, color: '#4a3a56', shadow: false });
      const cx = X0 + 160;   // right edge of the control
      if (r.type === 'bool') { const v = P(r.key); K.rr(ctx, cx - 17, y - .5, 17, 8, 4); ctx.fillStyle = v ? '#3fae5a' : '#c8bcd4'; ctx.fill(); ctx.beginPath(); ctx.arc(v ? cx - 4 : cx - 13, y + 3.5, 3, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); G.text(ctx, v ? 'ON' : 'OFF', cx - 20, y + .5, { font: '900 5px ' + G.FONT_FAM, color: v ? '#2a7a4a' : '#8a7a90', shadow: false, align: 'right' }); }
      else if (r.type === 'enum') { ctx.font = '900 5px ' + G.FONT_FAM; const ws = r.opts.map(([, l]) => ctx.measureText(l).width + 6); let x = cx - ws.reduce((a, b) => a + b + 1, -1);
        r.opts.forEach(([v, l], j) => { const sel = P(r.key) === v; K.rr(ctx, x, y - .5, ws[j], 8.5, 4); ctx.fillStyle = sel ? '#3a9ae8' : 'rgba(200,188,212,.5)'; ctx.fill(); G.text(ctx, l, x + ws[j] / 2, y + .8, { align: 'center', font: '900 5px ' + G.FONT_FAM, color: sel ? '#fff' : '#5a4a66', shadow: false }); x += ws[j] + 1; }); }
      else if (r.type === 'num') { const s = G.SETTINGS_SCHEMA[r.key][2], v = P(r.key), w = 44, x = cx - w - 20, k2 = (v - s[0]) / (s[1] - s[0]);
        K.rr(ctx, x, y + 2, w, 3, 1.5); ctx.fillStyle = '#e0d6ea'; ctx.fill(); K.rr(ctx, x, y + 2, Math.max(3, w * k2), 3, 1.5); ctx.fillStyle = '#f7843f'; ctx.fill();
        ctx.beginPath(); ctx.arc(x + w * k2, y + 3.5, 3.2, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#f7843f'; ctx.lineWidth = 1; ctx.stroke();
        G.text(ctx, v + r.unit, cx, y + .5, { font: '900 5.5px ' + G.FONT_FAM, color: '#4a3a56', shadow: false, align: 'right' }); }
      else if (r.type === 'info') G.text(ctx, r.value, cx, y + .5, { font: '900 5.5px ' + G.FONT_FAM, color: '#5a4a66', shadow: false, align: 'right' });
    });
    if (top > 0) { G.text(ctx, '▲', X0 + 82, 15, { font: G.FONT_S, color: '#f7843f', align: 'center' }); G.tapZone(X0 + 60, 12, 44, 9, () => { tap = ['scroll', -1]; }); }
    if (top + VIS < R.length) { G.text(ctx, '▼', X0 + 82, Y0 + VIS * ROW - 3, { font: G.FONT_S, color: '#f7843f', align: 'center' }); G.tapZone(X0 + 60, Y0 + VIS * ROW - 5, 44, 10, () => { tap = ['scroll', 1]; }); }
    // help line, and a live preview of the HUD
    const cur = focus === 'rows' ? R[row] : null, help = cur ? cur.help : 'Choose a category. ' + (G.touch ? 'Tap a setting to change it.' : 'Right or A to open it.');
    ctx.fillStyle = 'rgba(255,190,90,.16)'; K.rr(ctx, 6, 141, 228, 14, 4); ctx.fill();
    const pv = CATS[cat].preview === 'hud' && focus === 'rows' && cur && /hud\.(scale|opacity|prompts)/.test(cur.key || '');   // live preview of the prompt at this size and opacity
    if (pv) G.hud(ctx, 204, 148, () => { if (G.hudOn('prompts')) G.drawHint(ctx, 'Talk', 0, 204, 148); });
    G.wrap(help, pv ? 156 : 222).slice(0, 2).forEach((l, i) => G.text(ctx, l, 10, 142 + i * 6.5, { font: '800 5.5px ' + G.FONT_FAM, color: '#5a4a66', shadow: false }));
  } };
  G.ui.layers.push(layer); G.audio.sfx('select');
  const change = async (r, dir, tx) => {
    if (r.type === 'bool') { G.setPref(r.key, !P(r.key)); }
    else if (r.type === 'enum') {
      const vals = r.opts.map(o => o[0]); let i = vals.indexOf(P(r.key));
      if (tx !== undefined) {   // a tap lands on a segment
        const c = document.createElement('canvas').getContext('2d'); c.font = '900 5px ' + G.FONT_FAM; const ws = r.opts.map(([, l]) => c.measureText(l).width + 6);
        let x = X0 + 160 - ws.reduce((a, b) => a + b + 1, -1); for (let j = 0; j < ws.length; j++) { if (tx >= x && tx < x + ws[j] + 1) { i = j; break; } x += ws[j] + 1; }
      } else i = (i + (dir || 1) + vals.length) % vals.length;
      G.setPref(r.key, vals[i]);
    } else if (r.type === 'num') {
      const s = G.SETTINGS_SCHEMA[r.key][2]; let v = P(r.key);
      if (tx !== undefined) { const w = 44, x = X0 + 160 - w - 20; if (tx < x - 4) return; v = s[0] + Math.round(Math.max(0, Math.min(1, (tx - x) / w)) * (s[1] - s[0]) / s[2]) * s[2]; }
      else v = Math.max(s[0], Math.min(s[1], v + (dir || 1) * s[2]));
      G.setPref(r.key, v);
      if (r.key.startsWith('audio.') && G.audio.preview) G.audio.preview(r.key === 'audio.master' ? 'ui' : r.key.slice(6));
      return;
    } else if (r.type === 'act' || (r.type === 'info' && r.run)) { G.ui.layers.splice(G.ui.layers.indexOf(layer), 1); await r.run(); if (result === 'reloaded') return; G.ui.layers.push(layer); }
    G.audio.sfx('select');
  };
  for (;;) {
    await G.nextFrame(); if (result === 'reloaded') break;
    const k = G.input.pressed, R = rows();
    if (tap) { const t = tap; tap = null;
      if (t[0] === 'close') break;
      if (t[0] === 'cat') { cat = t[1]; row = 0; top = 0; focus = 'tabs'; G.audio.sfx('select'); continue; }
      if (t[0] === 'scroll') { top = Math.max(0, Math.min(R.length - VIS, top + t[1] * 3)); continue; }
      if (t[0] === 'row') { row = t[1]; focus = 'rows'; await change(R[row], 1, R[row].type === 'bool' ? undefined : t[2]); continue; }
    }
    if (focus === 'tabs') {
      if (k.b) break;
      if (k.up || k.down) { cat = (cat + (k.down ? 1 : CATS.length - 1)) % CATS.length; row = 0; top = 0; G.audio.sfx('select'); }
      if (k.right || k.a) { focus = 'rows'; row = 0; G.audio.sfx('select'); }
      continue;
    }
    if (k.b) { focus = 'tabs'; G.audio.sfx('select'); continue; }
    if (k.up || k.down) { row = (row + (k.down ? 1 : R.length - 1)) % R.length; if (row < top) top = row; if (row >= top + VIS) top = row - VIS + 1; G.audio.sfx('select'); }
    const r = R[row];
    if ((k.left || k.right) && r && (r.type === 'enum' || r.type === 'num' || r.type === 'bool')) await change(r, k.left ? -1 : 1);
    else if (k.left && r && (r.type === 'act' || r.type === 'info')) { focus = 'tabs'; }
    if (k.a && r) await change(r, 1);
  }
  const i = G.ui.layers.indexOf(layer); if (i >= 0) G.ui.layers.splice(i, 1);
  G.closeText(); return result;
};
})();
