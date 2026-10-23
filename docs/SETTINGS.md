# Settings, controls and player preferences (Phase 9)

## Where things live
- `js/settings.js`: the single settings store. Each setting is defined once in a schema (default, kind, allowed values). `G.pref(key)` reads a value; `G.setPref(key, value)` validates, saves immediately to localStorage `wildcard-settings` (`{ v: 1, values }`) and applies it. Missing, broken, out-of-range or old (unversioned) data falls back to the default key by key. Settings are separate from save slots: `G.resetPrefs()` never touches progress.
- `js/settingsui.js`: START > SETTINGS, six categories, keyboard and touch.
- Hooked in: `js/engine.js` (audio buses, text speed and size, auto-advance, fast battles, soft fades, render quality), `js/uikit.js` (text size, colour-friendly HP), `js/battle.js` (battle memory, damage numbers, status icons, effectiveness messages, shake, flashes, particles, skip intros, valuable-item confirmation), `js/world.js` (prompts, place-name banner, wild alerts, running, trainer speeches), `js/gates.js` (entrance markers, sea mini-map), `js/quests.js` (markers, notifications), `js/main.js` (touch controls), `js/vehicles.js` (running speed), `js/cheats.js` (Developer menu).

## Fully working settings
- **Gameplay & Battle:** remember last move (per creature, stored on the creature in the save), remember last action (FIGHT/BAG/PARTY/RUN, stored in the save), battle speed Normal/Fast (two game ticks a frame in battle), text speed Slow/Normal/Fast/Instant (everywhere), auto-advance text, skip seen intros (trainer speeches and challenge lines on rematches), fewer battle effects, damage numbers (new floating numbers), status icons, effectiveness messages, confirm valuable items (worth $1,000 or more, and Mythic Orbs, in battle).
- **HUD:** interaction prompts, quest markers, health bars (off keeps your HP numbers and shows the foe's %), names and levels, notifications, wild creature alerts, navigation hints (entrance markers and place names), sea mini-map, control hints (the keyboard help line), HUD size S/M/L and opacity (prompts, pop-ups, place names, mini-map), reduce clutter (hides the optional extras, keeps prompts and markers), Reset HUD. Live preview of the prompt at the chosen size and opacity.
- **Controls:** stick sensitivity (dead zone), fixed or floating stick (jumps to your thumb), stick size, position (edge/inward) and height, button size and opacity, buttons on the right or left, running (hold B / tap B / always), vibration, Reset Controls. The pad changes live behind the settings screen.
- **Audio:** master, music, sound effects, battle, menu sounds (each its own gain bus, with a preview beep), mute all (also the M key).
- **Accessibility & Comfort:** screen shake, reduced motion (no shake, fewer particles, no sliding pop-ups or rising numbers), reduced flashes (no white hit flashes or evolution flashes; bright fades become a soft dark fade), text size S/M/L for dialogue, no vibration, colour-friendly HP bars (blue/orange/magenta). Running by tapping B is the alternative to holding it.
- **System:** save status (slot and time), autosave status, graphics High/Saver (render resolution), load last save (with confirmation), credits, reset all settings (confirmation; saves are safe), version. The Developer menu (Test Mode, plus new Teleport and Wild Battle tools) is hidden until you press A five times on the version row, or a save already had Test Mode unlocked; it still needs the password.

## Not included, and why
- **Ambient volume:** the game has no ambient sounds, so there is nothing for a slider to control. Not shown.
- **Target memory beyond the current foe:** battles are one-on-one, so the target is always the creature in front of you. The game records it and falls back to that foe, but there is nothing else to choose.
- **Language:** the game is English only. Not shown.
- **Frame-rate option:** game logic is tied to 60 ticks a second, so a frame cap would slow the game down. Only render quality is offered.
- **Controller support:** the game has none today (keyboard and touch only); left as a future extension.
- **Repeat-last-action:** not added. Battle memory only moves the cursor; nothing is chosen for you.

## Tests
`node tests/e2e-settings.js` covers persistence (reload, broken data, old format, reset keeps saves), the screen (keyboard), battle memory (repeat turns, last action, no-PP fallback, per-creature moves, setting off, save and reload), HUD effects on the real HUD, controls on the real pad (phone size, floating stick by touch), audio gains, accessibility, text speed, fast battles, valuable items, and the hidden Developer menu. `e2e-cheats` and `e2e-touch` reach Test Mode through the new Developer menu.
