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

## Stage B (next): bigger caves
A generator for multi-chamber caves (entrance, tunnels, an underground lake, bridges, a guardian chamber) to replace the
small identical rooms behind cave mouths.

## Stage C: reasons to explore
Hidden areas behind DIG / CLIMB / LIGHT, cave-only creatures, a guardian or shrine in the last chamber, puzzles
(mine carts, switches, pressure plates), breakable rocks.
