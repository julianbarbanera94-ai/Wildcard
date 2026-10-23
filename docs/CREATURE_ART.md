# Painted creature art

Species can use painted art from a reference sheet instead of the generated sprite (`js/sprites.js`). Done so far: #1 Embrit, #2 Emberon, #3 Infernox, from `docs/reference/creatures_001-003_views.png` (front and back views).

## How it works
- `assets/creatures/NNN-front.png` and `NNN-back.png` are transparent cut-outs (the back is optional; without it the front is mirrored).
- `tools/build-creature-images.py` packs them into `js/creatureimg.js` as embedded WebP (`G.CREATURE_IMG`), so the web game and the APK need no extra files.
- `js/sprites.js` draws a painted species on a 512 px canvas (feet at 95%, centred). Every screen draws sprites at an explicit size, so battle, party, Dex, evolution and the overworld follower all pick it up. IDs, names, types, stats and evolutions are unchanged.

## Adding or replacing a creature from a reference
1. Put the reference sheet in `docs/reference/`. Use a sheet with separate front and back views and clear space around each one.
2. Cut each view out (box = the creature's cell, seed = a point on its body):
   `python3 tools/extract-creature.py SHEET X0 Y0 X1 Y1 assets/creatures/NNN-front.png --seed X,Y`
   The tool floods away the paper colour, keeps only the shapes connected to the creature (plus embers close to it) and un-blends edge pixels so there is no halo.
3. `python3 tools/build-creature-images.py`, then look at the creature in a battle (front = foe side, back = your side) on a dark and a light background.

## QA checklist
- [ ] Correct ID and name (check `js/data.js`; do not trust labels in generated images)
- [ ] No pieces of neighbouring creatures, labels or badges; no light halo on a dark background
- [ ] Feet sit on the platform; nothing clipped at the canvas edge
- [ ] Back view faces away from the camera; front view reads from the foe side
- [ ] Face is distinct from the rest of the roster (eyes, muzzle/beak, mouth), not only the colours
