# Wildcard: shared contract for parallel work

This document is the source of truth for anyone (person or agent) changing the game in parallel. Keep to your files; if you need something outside them, say so in your report instead of editing.

## Rendering model

- All layout is in **logical units**: the screen is **240 x 160**, a map tile is **16 x 16**.
- The canvas backing store is `240*S x 160*S`, where `G.S` (3–8) follows the real screen size and devicePixelRatio. `ctx` already has `setTransform(S,...)` and `imageSmoothingEnabled = true`. **Never** turn smoothing off globally, and never draw assuming 1 logical unit = 1 pixel.
- Art should be generated at **at least 4 px per logical unit** (a 16 px tile -> a 64 px offscreen canvas) and drawn with an explicit destination size in logical units: `ctx.drawImage(img, x, y, 16, 16)`. Never rely on an image's natural size, and never use a source rectangle that assumes a canvas size.
- Cache everything that is not animated. **No canvas creation and no `new Image` per frame**: only at cache-fill time. Budget: roughly 400 drawImage calls a frame; 60 fps on a mid-range phone.
- `G.frameNo` (and the `t` argument passed to draw functions) counts 60 Hz frames; use it for animation (`Math.sin(t / 30)` and so on).
- Font: **Nunito** 700/800/900 is bundled in `fonts/` (`G.FONT = '800 8px Nunito, ...'`). Sizes are logical px.

## Visual direction ("Pokopia-like")

Bright, soft and toy-like: saturated fresh greens, creamy sand paths, aqua water with light shorelines and foam, rounded chunky shapes, a gentle top-down 3/4 view where tall things (trees, houses, tall grass, cliffs) have a visible **front face** and cast **soft drop shadows** down/right. Everything breathes a little: grass and flowers sway, water shimmers, lamps glow, creatures hop and squash. No hard 1-px pixel-art outlines; use smooth outlines slightly darker than the fill, gradients for volume, and a highlight on the top-left.

## File ownership

| Owner | Files |
| --- | --- |
| Terrain/scenery art | `js/terrain.js` |
| Creature/character art | `js/sprites.js` |
| UI and battle visuals | `js/uikit.js`, drawing code in `js/battle.js`, `js/screens.js`, the title screen in `js/main.js`, CSS in `index.html` (`<style>` only) |
| Map: hub | `js/maps/hub.js` (Lanternrest + all interiors) |
| Map: west/south | `js/maps/sunmeadow.js`, `js/maps/shore.js` (Shore + Starlit Hollow) |
| Map: east/north | `js/maps/mirewood.js`, `js/maps/ridge.js` (Ridge + Glimmer Mine) |
| Lead / integration | everything else: `js/world.js`, `js/build.js`, `js/engine.js`, `js/mapkit.js`, `js/data.js`, `js/creature.js`, `js/gfx.js`, tests, android/ |

Do not commit; the lead integrates and commits. Do not edit files you don't own (a one-line note in your report is better).

## Drawing APIs (callers in parentheses)

Terrain (`world.js`):
- `G.TILES[ch] = { solid, enc }`: flags must keep their meaning; you may add fields.
- `G.terrain.drawGround(ctx, m, x0, y0, x1, y1, cx, cy, t)`: flat ground for the visible tile range. `m.t[y][x]` is the tile char; `cx, cy` is the camera offset (tile `x,y` is drawn at `x*16-cx, y*16-cy`). Neighbour-aware drawing (shorelines, path edges, grass borders, cliff faces) is expected.
- `G.terrain.collectProps(m, x0, y0, x1, y1, cx, cy, t, out)`: push `{ y, draw(ctx) }` for every tall thing; `y` is its base line in **map** pixels (`tileY*16 + 16` for something standing on tile `tileY`). The range passed in extends 3 rows below the screen so tall props can overlap upward.
- `G.terrain.drawObject(ctx, kind, x, y, t, info)`: kinds `orb {color}`, `pedestal {on}`, `brazier {lit, level 0..3}`, `ball` (item on the ground). `x, y` = tile top-left on screen.
- `G.terrain.grassOver(ctx, ch, x, y, t)`: tall-grass blades over the lower half of something standing in grass `ch` (`'G'` or `'q'`) whose tile top-left is `x, y`.
- `G.terrain.drawOverlay(ctx, m, x0, y0, x1, y1, cx, cy, t)`: ambient effects above everything (petals, butterflies, fireflies, sparkles, light).

Sprites (`world.js`, `battle.js`, `screens.js`, `main.js`):
- `G.creatureSprite(id, back)` -> canvas (any resolution, square). Callers draw the **whole** canvas into a square box: 64 logical px in battle and Dex, smaller elsewhere. Content centred, feet near the bottom (about 95% of the height), nothing clipped.
- `G.tint(img, color)` -> cached solid-colour silhouette of `img`.
- `G.charSprite(style)[dir][frame]` -> canvas with a 4:5 aspect (it used to be 16x20); callers draw the whole canvas. Used for battle trainer portraits and the Warden card.
- `G.drawChar(ctx, style, dir, frame, x, y, t)`: a person on the map. `x, y` = top-left of the tile they stand on; feet at about `(x+8, y+15)`; may extend up to about 28 px above the tile top. `dir` 0 down 1 up 2 left 3 right; `frame` 0 idle, 1/2 stepping. `style = { hair, skin, shirt, pants, hat? }`.
- `G.drawCreatureMini(ctx, id, x, y, size, t, moving, hop)`: a small creature on the map (follower, roaming wild creatures, the Joker). `x, y` = tile top-left; `size` = drawn height in logical px (18–30); include its own soft shadow.

UI (`engine.js`, `screens.js`, `battle.js`, `world.js`, `build.js`):
- `G.text(ctx, s, x, y, { color, shadow, font, align })`, `G.textW(ctx, s)`, `G.frame(ctx, x, y, w, h, 'light'|'dark')`, `G.hpColor(r)`, `G.hpBar(ctx, x, y, w, ratio)`, `G.typeBadge(ctx, type, x, y)`, `G.icon(ctx, id, x, y, size)`.
- `G.drawTextbox(ctx, t)`: `t = { lines[], shown, arrow, style }`, the bottom dialogue box (x 2..238, y 110..158).
- `G.drawMenu(ctx, { x, y, w, h, items, idx, cols, cw, rowH, style })`: a choice menu.
- `G.drawBanner(ctx, text, t)`, `G.drawBubble(ctx, x, y, t)`.
Positions and sizes callers pass must keep working; you may restyle freely inside them.

## Tile characters

Ground: `g` grass, `G` tall grass (encounters), `q` marsh grass (encounters), `p` dirt path, `y` sand, `f` flowers, `w` water, `V` wooden bridge over water (walkable), `z` boardwalk planks, `c` cave floor, `e` cave floor with encounters, `T` wooden floor, `a` rug, `m` exit mat.
Solid scenery: `#` round tree, `n` pine tree, `u` bush, `d` log/stump, `j` crop bed, `r` boulder, `E` cliff/ledge, `C` cave wall, `i` crystal, `F` fence, `l` lamp post, `s` sign, `M` cave mouth / archway (walkable warp).
Buildings: `R` red roof, `Q` blue roof, `A` teal roof (player base), `W` wall, `N` window, `D` door (walkable warp).
Interiors: `B` wall, `k` counter, `S` shelf, `h` healing machine, `P` PC, `t` table, `b` bed, `x` crate, `O` stone pedestal, `L` brazier.
Player-built: `H` healing-station awning (top row), `J` healing-station counter (bottom row), `K` nursery pen, plus `A`/`W`/`D` for a base.

## Map contract (everything doubles: width and height x2)

| Map | Size | Exits (warp tiles) -> destination (arrival tile) |
| --- | --- | --- |
| lanternrest | 60 x 52 | W (0,24),(0,25) -> sunmeadow (70,20),(70,21); E (59,24),(59,25) -> mirewood (1,24),(1,25); N (28,0),(29,0) -> ridge (24,50),(25,50); S (28,51),(29,51) -> shore (30,1),(31,1); Hollow Gate `M` (52,38),(53,38) -> hollow (18,30),(19,30) |
| sunmeadow | 72 x 44 | E (71,20),(71,21) -> lanternrest (1,24),(1,25) |
| mirewood | 76 x 52 | W (0,24),(0,25) -> lanternrest (58,24),(58,25) |
| ridge | 52 x 52 | S (24,51),(25,51) -> lanternrest (28,1),(29,1); Mine mouth `M` (24,4),(25,4) -> mine (18,50),(19,50) |
| mine | 40 x 52 | S (18,51),(19,51) -> ridge (24,5),(25,5) |
| shore | 64 x 40 | N (30,0),(31,0) -> lanternrest (28,50),(29,50) |
| hollow | 40 x 32 | S (18,31),(19,31) -> lanternrest (52,39),(53,39) |

Arrival tiles must be walkable and must not themselves be warps. The hub's four road exits keep their `need` (starter required) and the gate keeps its `lanternLit` check. Interiors keep their current size and layout; only their exit warps' destinations move to wherever the hub puts the doors.

Content rules for map owners:
- Keep every existing trainer id, item id, NPC, sign, shard holder (`shard: 'meadow'|'marsh'|'mine'`), story hook (`G.story.*`) and encounter table. Add **more**: about 2–3 new trainers per region (new unique ids with the region prefix, sensible levels), 3–5 new items, secret nooks, decorative areas, ponds, flower fields, bridges, cliffs, pine groves.
- Leave **open flat ground** (`g` or `y`) where players can build: in the hub, at least three clear areas of 8x8 or more; in each outdoor region, at least two of 6x6 or more.
- Tall grass should be generous but leave walkable non-encounter routes between exits and points of interest.
- Use only the tile chars listed above.
- `node tests/maps.test.js` must pass: every warp, NPC, item and object reachable on foot from the start; nothing on solid tiles; no overlaps.

## Testing helpers

- `node tests/maps.test.js`, `node tests/logic.test.js`
- Screenshots: headless Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, Playwright at `/opt/node-tools/node_modules/playwright`. Load `file:///home/user/Wildcard/index.html`. In the page, `G.state = G.newState()` plus `G.loadMap(id); G.placePlayer(x, y, dir); G.scene = G.world.scene;` shows any spot (press Z twice first to get past the title, or set the state directly). Put scratch scripts and screenshots under `/tmp/claude-0/<your-name>/`.
- Do **not** run `tests/e2e-*.js`; the lead runs those.
