# Cave art: asset gap report

Target: `glimmer_mine_visual_quality_reference.png` from the cave map pack (art direction only, not a background to copy).
Stage B of the cave upgrade (docs/CAVES.md) rebuilt Glimmer Mine and added four caves with the renderer as it is. This report
says what the reference shows, what the game draws today, and what is still missing.

## Current renderer and asset constraints (checked in the source)
- Renderer/camera: HTML canvas 2D, top-down with a slight front view on walls and props. The world scrolls with the player;
  the HUD and menus are drawn on top.
- Tile or world-unit size: 16 logical px per tile. Terrain and props are painted with vector paths into cached canvases at
  4 px per logical unit (`K = 4` in js/terrain.js), so one tile is a 64 x 64 px cache image.
- Image formats: terrain, walls and cave props have **no image files**. They are drawn in code (js/terrain.js: `paintMass`
  walls, cave biomes `cave_<theme>`, `paintDais`, crystals, lanterns, rails, carts, barrels, stalagmites, mushrooms, rune
  pillars, bridges, waterfalls, lava). Painted images are used only for creatures and people: WebP data URLs embedded in
  js/creatureimg.js and js/peopleimg.js by tools/build-creature-images.py and tools/build-people-images.py.
- Animation and effects: per-tile animation frames (water, waterfall, lava), glow sprites, and the cave light map
  (`caveLights`: darkness with light pools from lanterns, crystals, lava, water and light shafts, and a colour grade per theme).
- Asset loading: everything ships inside the APK's `js/` folder and works offline. There is no texture atlas or manifest.
- Android: the APK is about 7.8 MB. No frame-rate measurements on a device yet (unknown).

## Gap table
| Required visual | Existing asset/path | Gap | Exact asset needed | Dimensions/layout | Priority |
|---|---|---|---|---|---|
| Organic cave silhouette | Map grids in js/maps/ridge.js, js/maps/zz_mouths_caves.js | None | - | - | - |
| Warm floor with variation | Cave biomes in js/terrain.js (`caveBio`) | Floor is one tone with specks; no rubble at the wall foot | Rubble and pebble decals | 1 tile, 4 variants | Medium |
| Layered rock walls, overhangs, stalactites | `paintMass` (wall top plus a front face with strata) | No overhang lip, no stalactites hanging over the floor | Stalactite strip along a wall face | 1 tile, tiles left to right, 3 variants | High |
| Water with shoreline | Water tiles, cave water colours per biome | None | - | - | - |
| Waterfalls and foam | `@` waterfall over water | No splash at the foot | Foam and splash ring | 1 tile, 4 animation frames | Low |
| Bridges | `3` plank bridge | None | - | - | - |
| Crystal clusters | `i` crystal, 3 variants | Only single-tile crystals | Large crystal cluster | 2 x 2 tiles | Medium |
| Mine props | `1` rails, `2` cart, `4` barrel | No timber supports or door frames, no crates | Timber support frame; crate and crate stack | Frame 2 wide x 2 high tiles; crates 1 tile, 2 variants | High |
| Warm lanterns, cool crystal light | `6` lantern, light map | None | - | - | - |
| Raised guardian dais and steps | `o` dais (new, drawn in code) | None | - | - | - |
| Readable player, NPCs, items | Existing sprites | None | - | - | - |

## Recommendation
Every gap above can be drawn in code the same way as the dais and the cave biomes, which keeps the APK small and matches the
rest of the scenery. Image assets are only worth it if you want a hand-painted look for these props. In that case the game
first needs an image-prop hook in js/terrain.js (it does not have one today): props would be embedded the same way as the
creature art and drawn at 64 px per tile.

## Copy/paste request for ChatGPT (only if you want painted props)
> I am creating visual assets for my existing top-down 2D game. Use the attached Glimmer Mine reference image for art
> direction, not as a background to copy. Create only these missing assets:
> 1. Stalactite strip that hangs from the bottom edge of a rock wall: 3 variants, each 64 x 64 px, tileable left to right.
> 2. Timber mine support frame (two posts and a beam): 128 x 128 px (2 x 2 tiles).
> 3. Wooden crate: 64 x 64 px, plus a stack of two crates: 64 x 64 px.
> 4. Large crystal cluster: 128 x 128 px (2 x 2 tiles), in blue, in pink and in violet.
> 5. Floor rubble and pebble decals: 4 variants, 64 x 64 px each.
> 6. Waterfall foam and splash ring: 4 animation frames of 64 x 64 px, side by side in one 256 x 64 px sheet.
> Technical constraints: one game tile is 64 x 64 px at this resolution. Transparent PNG, no background, no drop shadow
> outside the object. Top-down view with a slight front view, light from the top left, objects standing on the bottom edge
> of their canvas. Style: soft painted fantasy, clean outlines, matching the attached in-game screenshots. Rock colours
> around #3e3c6a to #6c6aa2 (crystal cave), warm floor around #7c6450 to #9c8064, crystal glow #7ad8ff, wood #8a5a32.
> Deliver individual transparent PNGs and one contact sheet. Keep the same perspective, outline, shading, light direction,
> scale and palette across all assets. Do not include UI, text, characters, mockups or a complete painted map.

## Integration plan after assets arrive
1. Put the PNGs in `assets/caves/` and pack them into `js/caveimg.js` as WebP data URLs (a small packer like
   tools/build-people-images.py).
2. Add an image-prop hook in js/terrain.js: new prop tiles draw their image, otherwise they fall back to the code-drawn prop.
3. Place the props in the cave grids and check collisions, the light map, the minimap and tests/maps.test.js reachability.
4. Run tests/e2e-caves.js and check frame rate on an Android device.
