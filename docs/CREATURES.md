# Creature design contract (156 species)

The game has 25 species (ids 1–25). We are adding **131 more (ids 26–156)**, split into three packs designed in parallel. Read this whole file, then `js/data.js` (existing species, moves, `G.defineSpecies`, `G.defineMove`) and the `C` table at the top of the species config section in `js/sprites.js` (how existing creatures are styled).

## Who owns what

| Pack | File | Ids | Theme (main types) |
| --- | --- | --- | --- |
| A | `js/species/pack-a.js` | 26–69 (44) | Meadow and shore life: Normal, Grass, Bug, Flying, Water, Fairy, a little Ice |
| B | `js/species/pack-b.js` | 70–113 (44) | Marsh, night and mind: Poison, Ghost, Dark, Psychic, Water, Electric, Fighting |
| C | `js/species/pack-c.js` | 114–156 (43) | Mountain, mine and legends: Rock, Ground, Steel, Fire, Dragon, Ice, Fighting, plus 4 legendaries |
| Art parts | `js/sprites.js` | n/a | Expands the art vocabulary listed below |

Use **every id in your range exactly once**, no gaps. Edit only your own file. Secondary types may be anything (all 18 types: Normal, Fire, Water, Grass, Electric, Bug, Flying, Rock, Ground, Poison, Ghost, Psychic, Dark, Ice, Fighting, Steel, Dragon, Fairy).

## Pack file shape

```js
(function () {
const G = globalThis.G, D = G.defineSpecies, ART = G.CREATURE_ART;
// optional new moves (names must be new and original; check G.MOVES)
G.defineMove('Petal Gust', 'Grass', 50, 100, 25);
D(26, 'Name', ['Grass'], [hp, atk, def, spa, spd, spe], catchRate, expYield, {
  evo: [16, 27],                       // [level, id]; omit if it does not evolve
  learn: [[1, 'Tackle'], [1, 'Growl'], [5, 'Vine Whip'], ...],
  look: { stage: 1, form: 'round', feat: ['ears', 'tail'] },   // stage 1-3; form round|tall|wide; feat from the original list
  desc: 'One sentence, at most 90 characters.',
  habitat: [['sunmeadow', 3, 7, 8]],   // [mapId, minLv, maxLv, weight]; omit for evolved-only or legendary-only species
});
ART[26] = { main: '#hex', belly: '#hex', ... };    // art config, see vocabulary below
})();
```

## Structure per pack (about)

- 7 three-stage lines (21 species), 8 two-stage lines (16), and the rest single-stage. Pack C includes 4 legendaries (single stage, very rare).
- Evolution levels: stage 1 to 2 at Lv 14–22, stage 2 to 3 at Lv 30–40; 2-stage lines evolve at Lv 16–28.
- An evolution must be stronger (higher base stat total) and look like a grown-up, fiercer or more elaborate version of the same creature: same palette and motifs, more features, bigger.

## Numbers

| | Base stat total | Catch rate | EXP yield |
| --- | --- | --- | --- |
| Stage 1 of 3 | 280–320 | 190–255 | 50–65 |
| Stage 2 of 3 | 380–420 | 90–120 | 130–150 |
| Stage 3 of 3 | 495–535 | 45 | 220–245 |
| Stage 1 of 2 | 260–330 | 150–255 | 50–70 |
| Stage 2 of 2 | 420–480 | 60–120 | 150–180 |
| Single | 380–480 | 60–150 | 100–170 |
| Legendary (pack C only) | 570–600 | 15–30 | 250–270 |

Each stat is between 20 and 160 (legendaries up to 150 in one stat). Give each species a clear role (fast attacker, tank, special sweeper...).

## Learnsets

4–8 entries, at least one level-1 move, levels ascending, all moves existing in `G.MOVES` (or defined in your pack). STAB moves of increasing power as levels rise; strong moves (power 90+) only at Lv 30+ or on stage-3/legendary species. Evolved forms re-list the important early moves at level 1.

## Habitats and levels

Only these maps have wild encounters: `sunmeadow` (Lv 3–9, easiest), `shore` (Lv 4–10), `mirewood` (Lv 6–13), `ridge` (Lv 6–12), `mine` (Lv 10–16; caves). Put each base-stage species in 1–2 fitting maps (water and ice things on the shore or marsh, rocks and metal on the ridge or in the mine, bugs and grass in the meadow or marsh, ghosts in the mine or marsh at night-ish levels...). Weight 3–12 (rare 2–3). Second stages may also appear rarely (weight 1–3) at the top of a map's level range. Third stages and legendaries normally have no habitat; legendaries are added as weight-1 entries at Lv 15–16 in one map each (pack C). The tests require every species to be obtainable (in a habitat, or by evolving from something that is).

## Names and descriptions

Original names only: not any real Pokémon name and not an obvious play on one (no "Pikach-", "-chu", "Charm-", "Bulba-", "Squirt-", "Eevee"...). Two to three syllables, catchy, fitting the creature (Embrit, Splashling, Gloomoth are the house style). Descriptions are one friendly sentence. Names must be unique across all packs; check `G.SPECIES` in `js/data.js` and the other pack files before you settle a name.

## Art configuration vocabulary

Colours: `main`, `belly` (null for none), `acc`, `face`, `iris`, `cheek`, `boltCol`, `spots`.

Existing options (already drawn by `js/sprites.js`):
- `body`: (default round), `drop`, `rock`, `fluff`, `cater`, `beetle`, `wisp`
- `ear`: `frill`, `fox`, `mouse`, `spark`, `nub`, `cat`
- `tail`: `lizard`, `fluff`, `bolt`, `feather`, `stinger`, `spade`, `puff`, `none`
- `wing`: `bird`, `big`, `moth`, `bat`
- `horn`: `dark`, `rock`, `crest`, `rhino`, `moon`, `jester`
- `leaf`: `sprout`, `hood`, `tree`; `fin`: `side`, `head`, `crest`
- `mouth`: `cheeky`, `fang`, `open`, `smile`, `cat`, `beak`, `teeth`, `wisp`, `grin`; `eye`: `normal`, `fierce`, `sleepy`, `glow`
- flags: `stubTail`, `tailFlame`, `claws`, `mane`, `stripes`, `shell`, `shellSpikes`, `nozzles`, `flipper`, `thorns`, `vineArms`, `rockBack`, `ruff`, `tuft`, `tuft3`, `backStripes`, `crystals`, `fists`, `hook`, `birdFeet`, `bugStripes`, `paws`, `goggles`, `nose`, `collar`, `float`, `stars`, `cloud`; numbers `eyeAsp`, `eyeR`, `legLift`

New options being added to `js/sprites.js` by the art-parts agent (use them freely; they will exist):
- `body`: `fish`, `serpent`, `jelly`, `golem`, `shroom`, `crystal`, `dragon`, `blob`, `bird`, `flower`, `cloud`, `shell`
- `ear`: `bunny`, `bear`, `fin`, `leaf`, `droopy`
- `tail`: `fish`, `ringed`, `leaf`, `curl`, `club`, `flame`
- `wing`: `fairy`, `dragon`, `leaf`, `ice`
- `horn`: `unicorn`, `antler`, `crystal`, `ram`, `twin`
- `eye`: `round`, `happy`, `star`
- flags: `petals`, `icicles`, `armor`, `scarf`, `halo`, `gears`, `bow`, `crown`, `tentacles`, `snowcap`, `leafSkirt`, `flowerCrown`, `mushroomSpots`, `gem`, `sparkles`, `smoke`, `bubbles`, `whiskers`, `tusks`

Make every species visually distinct from every other at a glance (silhouette and palette), and its evolutions recognisably related.

## Verifying your pack

- `node tests/logic.test.js` and `node tests/maps.test.js` must pass with your pack loaded (they check ids, unique names, data ranges, moves, evolutions, habitats, obtainability). While the other packs are unfinished the "no gaps" test can fail on their ranges; check that your own ids are all present.
- Render a contact sheet of your ids (fronts, backs and small sizes) with Playwright: Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `require('/opt/node-tools/node_modules/playwright')`, open `file:///home/user/Wildcard/index.html`, wait for load, then draw `G.creatureSprite(id)` and `G.creatureSprite(id, true)` into a page canvas with names. Look at it and fix designs that look alike or broken. Scratch files go under `/tmp/claude-0/<your-name>/`.
- Do not run `tests/e2e-*.js`, do not commit, and do not edit files you don't own.
