# Battle HUD (from the Battle UI Kit)

Built from `wildcard_battle_ui_kit` (kit written against 3.18.0; this game is further along, so the kit's SVGs were ported by hand
and its APK snapshots were used only as a reference). Creature art, battle rules, saves and controller mappings are unchanged.

## Layers (all on the 240x160 battle canvas)
1. **Background** `drawBackdrop` in js/battle.js: the existing painted-by-code arena (grass or cave), unchanged.
2. **Grounding** platforms and creature contact shadows, unchanged.
3. **Actors** `drawFighter` and the 3D actors, unchanged.
4. **Effects** particles, projectiles, hit flashes, shake, and the damage number (now larger, outlined, pops in).
5. **HUD** `js/battleui.js` (`G.battleUI`), replaceable piece by piece:

| Component | What it draws | Used for |
|---|---|---|
| `statusPanel` + `healthBar` | dark panel: portrait, name, level, HP bar; yours also shows `HP / max` and a thin EXP bar; the status chip (SLP, PAR...) sits under the bar | both creatures (foe top-left, yours right, in the free corners so the actors stay clear) |
| `commandBar` | one row: ABILITIES, ITEMS, TEAM, RUN (still the FIGHT, BAG, PARTY, RUN actions underneath) with the kit's icons and one cyan accent; the label "What will X do?" sits above it | the player's turn |
| `abilityCards` | one card per move: type-coloured icon, name, type badge, power, PP (PP turns amber when low, red at 0) | only while Abilities is open |
| `messageBar` | the dark dialogue bar (`G.drawTextbox`, dark style) | every battle message |
| `targetRing` / `targetMarker` | dashed ring on the foe's platform and a diamond above it | while a move is being chosen |

## States
| Kit state | In the game |
|---|---|
| Battle start | status panels slide in; one message bar |
| Command menu | command bar only; the arena is clear |
| Abilities menu | cards replace the command bar; target ring shows on the foe |
| Target selected | the ring stays while the move is picked; cancelling (B) returns to the command bar |
| Attack animation | no menus, only the message bar and the effects |
| Damage result | big number on the target, HP bar drains, then "super effective" and similar messages |
| Enemy turn | same as the attack, with the foe's message |
| Low health | at 25% HP or less your panel's edge pulses red, the bar is red and it says LOW (no full-screen overlay) |
| Victory / capture / defeat | the existing result messages, EXP and level-up screens, in the new bar |

## Controls
Unchanged keys and controller buttons. The command bar and the cards are one row, so Left and Right move and A confirms, B backs
out; every card and every command is also a tap target. The old 2x2 command layout is gone (RUN is now three steps right).

## Arena
The grass arena is now a cinematic landscape drawn in code (cached once): sun and light rays, distant mountains and a natural arch,
sandstone cliff towers with moss, trees and waterfalls on both sides, a lake, rolling tree lines, a winding dirt trail, flowers,
rocks and soft blurred foreground grass, with a warm light wash and vignette. There are no cartoon platforms any more, only soft
contact shadows. Your creature is drawn larger (88 px) in the foreground, the foe at 72 px. The cave arena keeps its old look.

## Not done
* The arena is drawn by code, not painted art, so it is simpler than the kit's reference picture. Real painted backgrounds would
  need authored images (one per arena), which the kit does not include.
* The three concept boards were combined: the dark panels and cards come from the tactical board, the clear arena and bottom
  command row from the cinematic board. The adventure board's round ability wheel, combo meter and dodge/focus buttons are new
  mechanics and were not built.
* The foe's status panel shows no HP numbers, as before.

Screenshots from the running game: `docs/img/battle-command.png`, `battle-abilities.png`, `battle-damage.png`, `battle-lowhp.png`.
