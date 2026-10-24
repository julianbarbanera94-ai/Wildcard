# Caves

References: `docs/reference/caves_mood_shrine.png`, `docs/reference/caves_themes.png`.

## Stage A (done): look and atmosphere
- **Lighting** (`js/terrain.js`, `caveLights`): caves are dark (`m.dark`) and lit by what is in them: crystals, lanterns,
  lamp posts, mine carts, glowing mushrooms, rune pillars, lava, waterfalls, glowing water, light shafts from the ceiling
  and the player (a wider circle with the Warden's Lamp, a Glow Lamp, or a Fire/Electric partner).
- **Themes** (`m.caveTheme`): each theme colour-grades the cave and recolours its props.
  | Theme | Caves |
  | --- | --- |
  | crystal | Glimmer Mine, a Cloudpeak cave |
  | frost | a Cloudpeak cave, glacier caves |
  | volcanic | Emberfall caves |
  | ruins | Starlit Hollow |
  | grotto / crimson | Badlands caves (alternating) |
- **New cave tiles** (walkable unless noted): `1` rails, `2` mine cart (solid), `3` plank bridge over water, `4` barrel
  (solid), `5` stalagmite (solid), `6` lantern post (solid), `7` light shaft, `8` glowing mushrooms (solid), `9` rune
  pillar (solid).
- **Dressing** (`js/maps/zz_mouths_dress.js`): places props by theme. A solid prop only goes where its walkable neighbours
  stay connected around it, away from warps, people and items, so no path is ever cut (the map reachability test checks it).

## Stage B (done): bigger caves
Layouts from the cave map pack (40 x 32 tiles each), built with the existing tiles. tests/e2e-caves.js walks every one.
- **Glimmer Mine** (`mine`, js/maps/ridge.js): rebuilt. The entrance tunnel climbs through the great cavern to a one-tile neck
  that Kade watches from the foot of a crystal dais. West and east grottoes (Rhea, Flint), two pools fed by waterfalls, a west
  bridge to an island (Aqua Orb) and an east bridge down to the hidden nook (Pulse Orb). Saved item ids are unchanged.
- **Emberfall Tunnels** (`cave_emberfall`, behind the Emberfall cave mouth): lava fields, an ore face (Iron Ore and Coal with
  a Pickaxe), a hot chamber, and stepping stones across the eastern magma river to an island.
- **Frostmere Grotto** (`cave_frostmere`, behind the cave mouth on Glacier Pass): an ice switch raises walkways across both
  lakes to the frost relic and a Mythic Orb.
- **The Hollow Ruins** (`cave_hollow_ruins`, behind a Badlands cave mouth): touch three rune stones in the order the west
  archive gives (east, west, south) to open the rune gate to the Warden altar. A LIGHT gap hides the east sanctum.
- **The Living Grotto** (`cave_living_grotto`, behind another Badlands cave mouth): glowing mushrooms give Glowcap Spores;
  offer 3 at the shrine and Starveil comes down. A LIGHT gap hides the old rootway; bridges reach an island on each pool.
- Every cave has a theme biome (warm floor, wall colours and cave water per theme), a lighter light map, and a trainer.
  The three small rooms the new caves replaced are kept (`retired`) so a save made inside one still loads.
- New in the engine: tile `o` (dais, or a rune stone when it is a single tile), a map `onLoad(m)` callback (puzzle tiles
  follow the save), gathering in caves, and rocks and crystals in caves sit on cave floor.

Not built, because the engine has no way to do it yet: pulsing steam vents (Emberfall), sliding on ice (Frostmere's fast
return loop), and water creatures that appear only at night (the Living Grotto's pools). Visual gaps against the reference
image are listed in docs/ASSET_GAP_REPORT.md.

## Stage C: reasons to explore
Hidden areas behind DIG / CLIMB / LIGHT, cave-only creatures, a guardian or shrine in the last chamber, puzzles
(mine carts, switches, pressure plates), breakable rocks.
