# Phase 9: Settings, Controls & Player Preferences (queued, not started)

Do this after all earlier phases (the last is Phase 8, more optional quests). Implementation model: Claude Opus 5.5 (as the player requested).

## Role
Act as a senior game developer, gameplay systems engineer and UX designer. Review the existing creature-collecting RPG and implement a polished, production-quality Settings & Controls system, directly in the existing codebase. This is an implementation task, not a design proposal: inspect, implement, integrate with game systems, and test. No decorative controls: every setting must be connected to its behaviour.

## Starting point
The current settings screen has only: Sound On/Off, Test Mode On/Off, Back. Replace it with an organised, persistent player-preferences system covering gameplay, battle, HUD, mobile controls, audio, accessibility and system preferences.

## Preserve the existing game
- Audit first: architecture, gameplay systems, UI components, state management, persistence; how settings open and close; battle system, move and target selection, HUD, joystick, action buttons, audio, save system.
- Reuse existing components and conventions; no unnecessary dependencies; do not replace working systems.
- Keep the look: warm cream and pastel backgrounds, rounded panels and buttons, blue/orange/red/green accents, clear type, comfortable touch targets, soft shadows, mobile-first. It should feel native to the game, not like an admin dashboard.

## Categories
**A. Gameplay & Battle**
- Battle memory: remember last move, last valid target, last action category (Fight/Items); keep them across interruptions and transitions; remember the last move per creature; fall back to a valid choice when the move is unavailable, the creature changes or the target is defeated. Remembering must NOT auto-execute (only a separate, explicitly enabled repeat-action option may).
- Presentation: animation speed Normal/Fast; text speed Slow/Normal/Fast/Instant; skip previously seen battle intros; reduce repetitive animations; show/hide damage numbers, status indicators, effectiveness messages; auto-advance eligible messages.
- Safety: confirm before using rare or valuable items and destructive actions; never silently consume valuables or do anything irreversible.

**B. HUD & Interface**
- Toggles: mini-map, quest and objective markers, creature health bars, names and levels, damage numbers and floating notifications, interaction prompts, wild creature indicators, navigation hints, tutorial hints after the tutorial.
- HUD scale Small/Medium/Large, HUD opacity, reduced-clutter mode, reset HUD. Must affect the real HUD; do not hide critical information.

**C. Controls**
- Joystick sensitivity, fixed or floating, size, position; action button size and opacity; layout customisation where supported; tap versus hold behaviour; haptics On/Off; reset controls. Keep the current joystick and A/B model. Controller support: integrate if it exists, otherwise leave as a future extension.

**D. Audio**
- Master, music, sound effects, battle, ambient environment, UI volumes, and mute all; sliders with visible values and immediate feedback. Refactor audio only as far as needed so every slider really controls playback.

**E. Accessibility & Comfort**
- Screen shake On/Off, reduced motion, reduced flashes and intense effects, text size Small/Medium/Large, disable vibration, colour-friendly indicators for important states, alternatives to hold-based interactions.

**F. System & Game Management**
- Save status, autosave status, restart from checkpoint (if supported), language only if supported, graphics/frame rate only if supported, version info, credits, Reset all settings to defaults (never deletes progress).
- Move Test Mode out of the player settings into a separate developer/debug menu. Keep existing developer features; do not expose them to ordinary players unless enabled by the existing dev configuration.

## Persistence
Central settings store (single source of truth), loaded at startup, applied to every system, saved immediately, sensible first-time defaults, graceful handling of missing or malformed or old saved settings, a schema version with safe migration, kept separate from game progress, survives closing the menu, changing location, battles, reloads and interruptions. Reset to Defaults restores settings only.

## Battle memory details
- Store it in the existing battle state, not transient UI state. Remember the action category separately from the move.
- Preserve turn rules, move availability, targeting restrictions, status effects and costs.
- Tests: repeated turns with the same creature; switching creatures (each keeps its own move); invalid or exhausted moves; defeated or unavailable targets; battle exit and re-entry; the setting disabled; reload persistence.

## UX
Settings title with close/back; tabs or a vertical category list that adapts to screen size; readable sections; consistent switches, sliders and segmented controls; immediate feedback; Reset to Defaults with confirmation; start on Gameplay & Battle; the world may show softly behind the panel; a HUD and Controls customisation view with a live preview where practical. Prioritise frequently used settings; do not crowd the panel.

## Stages (no approval needed between stages unless blocked)
1. Audit and brief report (existing settings, systems, persistence, risks, files to change).
2. Settings foundation (store, defaults, persistence, reusable controls, Reset).
3. Battle memory (move, target, category, fallbacks, transitions, automated tests).
4. HUD, controls, audio and accessibility connected to real behaviour.
5. Polish and verification: visuals, mobile layouts, persistence and defaults, every setting, regression of exploration, battles, menus, saves.

## Engineering standards
Follow the project's conventions; one source of truth; no duplicated state or conflicting defaults; keep settings, progress and battle state separate; no unrelated rewrites; never claim a feature works unless it does; if a setting cannot be supported by the architecture, say so and build the closest useful alternative.

## Acceptance criteria
- [ ] Menu matches the game's visual style, grouped into clear categories
- [ ] Settings persist after closing the menu and reloading the game
- [ ] Battle move memory works; target memory handles invalid targets; per-creature last move
- [ ] HUD toggles affect the real HUD; control customisation affects the real controls
- [ ] Audio sliders change the real audio levels; accessibility options affect their systems
- [ ] Reset to Defaults works without deleting progress
- [ ] Test Mode moved to a developer/debug area
- [ ] Exploration, battles, menus and saving still work; automated tests pass
- [ ] Tested at mobile and desktop sizes; no non-functional settings shown as complete

## Final delivery
Summary of changes; files created or modified; fully functional settings; settings deferred (with reasons); tests run and results; known limitations; how to run and verify.
