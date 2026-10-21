# WILDCARD

A creature-catching RPG for the browser in the style of the GBA-era Pokémon games (think *Emerald*): tile-based overworld, tall grass full of wild creatures, turn-based battles, capture orbs, a party of six, trainers, Creature Centers and a Mart.

Everything is original and generated in code. There are no image or audio files: tiles, characters, all 25 creatures and the chiptune music are drawn or synthesised at runtime. No build step and no dependencies.

## Play

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`) and visit it.

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Move, navigate menus |
| `Z` / Space | A: confirm, talk, read |
| `X` / Esc / Backspace | B: cancel. Hold while walking to run |
| Enter | Start menu |
| `M` | Mute |

On phones and tablets an on-screen D-pad and buttons appear.

## The game

1. Talk to Mom, then go next door and pick a starter from Prof. Quill's table.
2. Walk through tall grass to meet wild creatures. Weaken them, then throw an orb from the BAG to catch them. Sleep and poison improve your odds.
3. Beat trainers on Route 1 and Route 2 for money and EXP. They will spot you and walk up for a battle.
4. Heal for free at the Creature Center in Marlow Town. Its PC stores extra creatures. Buy orbs and potions at the Mart.
5. Fight through Echo Cave, beat the Ranger, and try to catch the legendary **Joker**, the Wildcard.

Features: 25 species with evolution lines, 13 types with a type chart, STAB, critical hits, accuracy, stat stages, sleep/paralysis/poison/burn, Gen-3 style capture maths and escape odds, EXP and levelling with move learning (forget-a-move prompt) and evolution, whiteout and respawn, party/summary/bag/Dex/PC/shop screens, and saving to the browser's `localStorage` via START → SAVE.

## Code layout

```
index.html          page, canvas and touch controls
js/data.js          types, moves, species, items
js/creature.js      stats, EXP, damage and capture maths (no DOM, unit-testable)
js/gfx.js           procedural tiles, characters, creature sprites, UI frames
js/engine.js        input, audio/music, game loop, dialogue boxes, menus, fades
js/screens.js       party, summary, bag, Dex, PC, shop, start menu
js/battle.js        battle scene, turn logic, catching, EXP, evolution
js/world.js         maps, overworld, NPCs, trainers, warps, encounters, save/load
js/main.js          title screen and boot
tests/              logic unit tests and headless-browser playthroughs
```

To add a creature, add an `sp(...)` line in `data.js` (its look is generated from its types and `look` features). To add an area, build a map in `world.js` with the helpers there (`newMap`, `rect`, `building`, `warp`, `npc`, `trainer`).

## Tests

```
node tests/logic.test.js                       # data integrity + battle/catch maths
npm i playwright && node tests/e2e-play.js     # headless playthrough: new game, capture, trainer, shop, save/load
node tests/e2e-extra.js                        # level-up, evolution, whiteout, boss, Joker capture, fuzz bot
```

The end-to-end tests drive the real game with keyboard input in headless Chromium. Set `PW` to the playwright module path, `CHROME` to a Chromium binary and `OUT` to a folder for screenshots if the defaults don't apply.
