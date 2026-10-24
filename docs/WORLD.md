# The Aurelis world: shared contract

We are growing the world from 8 outdoor maps to 25, following the reference map in `docs/world-reference.png`. **Open it with the Read tool before you start.** It is the user's reference for the layout, landmarks and feel, and our maps should read as this region. The places that already exist keep their content and take a slot on that map:

| Reference place | Our map |
| --- | --- |
| Willowbrook Town (centre, windmill, farms) | `lanternrest` (the hub); `homestead` is its farmland just north |
| the meadows between Willowbrook and Sunhaven | `sunmeadow` |
| Mistral Swamp (south-west, purple) | `mirewood` (Mirewood Marsh; keep the name) |
| Serenity Beach (south) | `shore` (Tidepool Shore; keep the name) |
| the foothills below Cloudpeak, and the cave | `ridge` and `mine` |
| a mystic glade near the centre | `hollow` (Starlit Hollow, through Lanternrest's sealed gate) |

Every other place on the reference is new: see the tables below. The story comes later. This pass is about the **map**: rich, good-looking, explorable places with towns, routes, islands, wild creatures, trainers, items, services and an **Arena with a boss (Arena Leader) and a Badge in every city**.

Read `docs/CONTRACT.md` (rendering, tile chars, the map content rules) and `docs/HOMESTEAD.md` (hooks, shops, healing UI) first, then `js/mapkit.js`, then a couple of existing map files (`js/maps/hub.js`, `js/maps/shore.js`) for style.

## 1. Ownership

| Owner | Files |
| --- | --- |
| Lead | `js/maps/hub.js`, `js/mapkit.js`, `js/shops.js`, `js/screens.js`, `js/world.js`, `index.html`, `tests/maps.test.js`, docs |
| West | `js/maps/sunhaven.js`, `evergreen.js`, `driftwood.js`, `verdant.js`; new exits in `js/maps/sunmeadow.js` (already cut; you may tidy them) |
| South | `js/maps/stonebridge.js`, `whispering.js`, `tidefall.js`, `moonlit.js`; the new and changed exits in `js/maps/mirewood.js` and `js/maps/shore.js` (add `m.dock` to shore) |
| North | `js/maps/lakeside.js`, `cloudpeak.js`, `glacier.js`, `frostmere.js`, `aurora.js`; the new exits in `js/maps/ridge.js` |
| East | `js/maps/sandsreach.js`, `badlands.js`, `emberfall.js`, `cobalt.js` |
| Biome art | `js/terrain.js` (biome palettes and the new tile chars below) |
| Arenas | `js/maps/zz_arenas.js` (badge system, the 8 Arena interiors, leaders and arena trainers, the badge case), `tests/e2e-arenas.js` |
| World map | `js/worldmap.js` (illustrated Aurelis map, world layout data, ferries), the map, fly-scene and landing parts of `js/vehicles.js`, `tests/e2e-worldmap.js` |

Every new map file currently holds a **placeholder** made with `G.mk.stubMap`. Replace it with the real map, keeping the **id, size and exits** from the tables below. The other owners' exits depend on them.

Don't edit files you don't own; ask in your report instead. Don't commit.

`node tests/maps.test.js` must pass. While everyone is working, a failure in another region's map may show up first. Check that **your** maps pass: the message names the map.

## 2. Helpers in `js/mapkit.js` (`G.mk`)

- `edgeExit(m, edge, at, to, ax, ay, need, along)`: a 2-wide exit on edge `'N' | 'S' | 'W' | 'E'`.
  - The tiles start at `at` along the edge, and `(ax, ay)` is where the first tile arrives.
  - `along` ('x' or 'y') says which way the second arrival tile steps. It is only needed when an N/S edge meets a W/E edge; the stubs already show which exits need it.
- `carveExit(...)`: the same, but it also cuts a path in from the edge to open ground.
- `gate(n, 'PLACE NAME')`: use as a warp's `need`. It blocks the player until they hold `n` Arena badges (and before they have a starter).
- `wild(types, lo, hi, { pick, only, w })`: builds an encounter table from creature types (base forms, plus a few evolved forms at higher levels). For example `enc: wild(['Ice', 'Water'], 32, 38)`. Add `only: [ids]` for hand-picked extras.
- `stubMap(...)`: the placeholder maker. It isn't needed for the real maps.
- `G.mk.FERRIES`: the ferry routes (see below). Every map in a ferry route must set `m.dock = { x, y }`: a walkable tile at the pier where ferry passengers arrive. Put a ferry captain NPC next to it with `talk: () => G.ferry ? G.ferry(m.id) : G.story.says('The ferry is not running yet.')`.

## 3. Maps

| Map id | Name | Size | Owner | Kind | Biome | Wild levels | Badges to enter | What it is |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sunhaven` | SUNHAVEN CITY | 64x52 | West | city | `city` | none (town) | 0 | Harbour city on the west coast. Arena (Grass, Bloom Badge). Healing Centre, department store, docks. |
| `evergreen` | EVERGREEN FOREST | 60x52 | West | route | `forest` | 14-20 | 1 | Deep old forest, giant tree, hidden cave. |
| `driftwood` | DRIFTWOOD PORT | 52x44 | West | town | `coast` | 18-24 | 2 | Fishing port with a lighthouse on a rocky point. Arena (Flying, Gale Badge). Ferry to Verdant Isle and Tidefall Islands. |
| `verdant` | VERDANT ISLE | 40x34 | West | island | `tropical` | 22-28 | 3 | Lush jungle island, reached by ferry from Driftwood Port. |
| `stonebridge` | STONEBRIDGE TOWN | 56x44 | South | town | `meadow` | none (town) | 0 | Town of stone bridges over a river and waterfalls. Arena (Rock, Keystone Badge). |
| `whispering` | WHISPERING WOODS | 64x48 | South | route | `mystic` | 16-22 | 1 | Glowing blue-purple woods with a crystal pond. |
| `tidefall` | TIDEFALL ISLANDS | 60x46 | South | island | `tropical` | 24-30 | 3 | Chain of islets joined by rope bridges, south of Mirewood. Also a ferry stop from Driftwood. |
| `moonlit` | MOONLIT ISLAND | 44x38 | South | island | `mystic` | 45-52 | 8 | Late-game mystical island with glowing purple trees. Ferry from Tidepool Shore and Cobalt City. |
| `lakeside` | LAKESIDE TOWN | 56x46 | North | town | `meadow` | none (town) | 0 | Town on a big lake with piers and islands. Arena (Water, Tide Badge). |
| `cloudpeak` | CLOUDPEAK MOUNTAINS | 64x60 | North | route | `alpine` | 26-32 | 3 | High peaks with switchbacks, caves, waterfalls and a castle on the summit (special location, story later). |
| `glacier` | GLACIER PASS | 60x44 | North | route | `snow` | 32-38 | 5 | Snowy pass with frozen ponds and ice caves. |
| `frostmere` | FROSTMERE CITY | 60x50 | North | city | `snow` | none (town) | 5 | Ice city with a crystal palace. Arena (Ice, Rime Badge). Ferry to Aurora Isles. |
| `aurora` | AURORA ISLES | 44x36 | North | island | `aurora` | 48-55 | 8 | Far north-east isles under the aurora (needs 8 badges and the Lantern relit). |
| `sandsreach` | SANDSREACH DESERT | 68x52 | East | route | `desert` | 22-28 | 2 | Desert with ruins, an oasis village and its Arena (Ground, Dune Badge). |
| `badlands` | CRIMSON BADLANDS | 60x48 | East | route | `badlands` | 30-36 | 4 | Red mesas, canyons and caves. |
| `emberfall` | EMBERFALL VOLCANO | 56x52 | East | route | `volcano` | 38-44 | 6 | Volcano with lava rivers and a base camp with its Arena (Fire, Magma Badge). |
| `cobalt` | COBALT CITY | 72x56 | East | city | `city` | none (town) | 4 | Big modern port city with towers, a long bridge to a lighthouse island and its Arena (Electric, Circuit Badge). Ferry to Moonlit Island. |

### Exits

Each exit is two tiles wide: the listed tile and the next one along the edge. "Arrive" is where the first of the two tiles lands; the second lands one tile further along. Gates name the badges needed to pass that way.

| From | Edge | First tile | To | Arrive | Badges |
| --- | --- | --- | --- | --- | --- |
| `lanternrest` | S | (28,51) | `stonebridge` | (27,1) | - |
| `stonebridge` | N | (27,0) | `lanternrest` | (28,50) | - |
| `lanternrest` | E | (59,24) | `sandsreach` | (1,24) | 2 |
| `sandsreach` | W | (0,24) | `lanternrest` | (58,24) | - |
| `sunmeadow` | W | (0,20) | `sunhaven` | (62,24) | - |
| `sunhaven` | E | (63,24) | `sunmeadow` | (1,20) | - |
| `sunmeadow` | N | (36,0) | `evergreen` | (46,50) | 1 |
| `evergreen` | S | (46,51) | `sunmeadow` | (36,1) | - |
| `sunhaven` | N | (30,0) | `evergreen` | (30,50) | 1 |
| `evergreen` | S | (30,51) | `sunhaven` | (30,1) | - |
| `sunhaven` | S | (30,51) | `driftwood` | (26,1) | 2 |
| `driftwood` | N | (26,0) | `sunhaven` | (30,50) | - |
| `sunmeadow` | S | (36,43) | `mirewood` | (38,1) | - |
| `mirewood` | N | (38,0) | `sunmeadow` | (36,42) | - |
| `mirewood` | W | (0,24) | `driftwood` | (50,22) | 2 |
| `driftwood` | E | (51,22) | `mirewood` | (1,24) | - |
| `mirewood` | E | (75,24) | `stonebridge` | (1,22) | - |
| `stonebridge` | W | (0,22) | `mirewood` | (74,24) | - |
| `mirewood` | S | (38,51) | `tidefall` | (30,1) | 3 |
| `tidefall` | N | (30,0) | `mirewood` | (38,50) | - |
| `stonebridge` | S | (27,43) | `shore` | (30,1) | - |
| `shore` | N | (30,0) | `stonebridge` | (27,42) | - |
| `stonebridge` | E | (55,22) | `whispering` | (1,24) | 1 |
| `whispering` | W | (0,24) | `stonebridge` | (54,22) | - |
| `whispering` | E | (63,24) | `cobalt` | (1,30) | 4 |
| `cobalt` | W | (0,30) | `whispering` | (62,24) | - |
| `whispering` | N | (32,0) | `sandsreach` | (34,50) | 2 |
| `sandsreach` | S | (34,51) | `whispering` | (32,1) | 1 |
| `sandsreach` | E | (67,36) | `cobalt` | (36,1) | 4 |
| `cobalt` | N | (36,0) | `sandsreach` | (66,36) | - |
| `sandsreach` | E | (67,14) | `badlands` | (1,24) | 4 |
| `badlands` | W | (0,24) | `sandsreach` | (66,14) | - |
| `badlands` | N | (30,0) | `emberfall` | (30,50) | 6 |
| `emberfall` | S | (30,51) | `badlands` | (30,1) | - |
| `evergreen` | E | (59,24) | `cloudpeak` | (1,30) | 3 |
| `cloudpeak` | W | (0,30) | `evergreen` | (58,24) | 1 |
| `glacier` | S | (30,43) | `emberfall` | (1,20) | 6 |
| `emberfall` | W | (0,20) | `glacier` | (30,42) | 5 |
| `ridge` | N | (46,0) | `cloudpeak` | (24,58) | 3 |
| `cloudpeak` | S | (24,59) | `ridge` | (46,1) | - |
| `ridge` | E | (51,45) | `lakeside` | (1,24) | - |
| `lakeside` | W | (0,24) | `ridge` | (50,45) | - |
| `lakeside` | E | (55,22) | `glacier` | (1,34) | 5 |
| `glacier` | W | (0,34) | `lakeside` | (54,22) | - |
| `cloudpeak` | E | (63,20) | `glacier` | (1,20) | 5 |
| `glacier` | W | (0,20) | `cloudpeak` | (62,20) | 3 |
| `glacier` | E | (59,20) | `frostmere` | (1,24) | 5 |
| `frostmere` | W | (0,24) | `glacier` | (58,20) | - |

### Ferries (dock to dock, `m.dock` on both maps)

| From | To | Badges |
| --- | --- | --- |
| `driftwood` | `verdant` | 3 |
| `driftwood` | `tidefall` | 3 |
| `shore` | `moonlit` | 8 |
| `cobalt` | `moonlit` | 8 |
| `frostmere` | `aurora` | 8 + Lantern relit |

### Arenas (one per city or town, boss = Arena Leader)

| Arena map id | In | Type | Badge | Order | Leader team levels |
| --- | --- | --- | --- | --- | --- |
| `arena_stonebridge` | `stonebridge` | Rock | Keystone Badge | 1 | 12-15 |
| `arena_sunhaven` | `sunhaven` | Grass | Bloom Badge | 2 | 16-19 |
| `arena_lakeside` | `lakeside` | Water | Tide Badge | 3 | 20-23 |
| `arena_driftwood` | `driftwood` | Flying | Gale Badge | 4 | 24-27 |
| `arena_sandsreach` | `sandsreach` | Ground | Dune Badge | 5 | 28-31 |
| `arena_cobalt` | `cobalt` | Electric | Circuit Badge | 6 | 32-35 |
| `arena_frostmere` | `frostmere` | Ice | Rime Badge | 7 | 37-40 |
| `arena_emberfall` | `emberfall` | Fire | Magma Badge | 8 | 42-45 |


All 8 Arena levels must work in this order, so wild levels near each city should roughly match its order.

## 4. What every map needs

**Every outdoor map:**
- `m.biome` (section 5) and `m.landing` (a walkable tile for flying in).
- Trees around the edges, landmarks from the reference, paths connecting all the exits and points of interest, and open ground for building (each region: two 6x6 clear `g` areas).
- No unreachable dead ends; follow CONTRACT.md's map content rules.
- Name plates (`m.labels: [{ x, y, text, style }]`) on every service building.

**Wild areas** (routes, forests, mountains, desert, islands):
- Generous tall grass `G` (or `q` in marshes) with `enc` from `G.mk.wild`, using types that fit the place, at the level range in the table.
- Walkable routes that avoid the grass.
- 3–5 trainers with unique ids (prefix with the map id, e.g. `evergreen_ranger1`). Their teams use species of fitting types at the area's levels; prize about level × 60.
- 3–5 items on the ground (`ball` objects; potions, orbs that suit the area, materials, seeds).
- A secret nook or two, and a few NPCs with flavour lines.
- Landmarks: the reference shows, for example, Evergreen Forest's giant tree, Cloudpeak's summit castle and waterfalls, Emberfall's lava rivers, Sandsreach's ruins and oasis, Cobalt's bridge to the lighthouse island, and Driftwood's lighthouse.

**Towns and cities:**
- A **Healing Centre**: a red-roof building with a door, an interior with a nurse at a counter whose objects call `G.healUI({ name: 'HEALING CENTRE' })`, and a `heal` style label. Also set `G.state.flags.respawn` if you want, but leave that alone for now.
- A **shop** with its own stock, theming the place:
  - Define it as `G.SHOPS_EXTRA = Object.assign(G.SHOPS_EXTRA || {}, { <id>: { name, place, color, greet, bye, stock: [{ item, cat }], sells: [...kinds] | 'all' | false, rate } })`. See `js/shops.js` for the exact shape and the item names in `js/economy.js` / `js/data.js`.
  - The shop interior's counter objects call `G.openShop('<id>')`.
- An **Arena** building:
  - It uses the arena roof `U` (via `G.mk.building(m, x, y, w, 'U', doorCol)`), at least 7 wide, in a prominent spot.
  - Its door is `warp(m, dx, dy, 'arena_<mapid>', 0, 0, UP)`. The Arenas owner fixes the arrival and builds the interior.
  - Give it an `arena` style label such as "STONEBRIDGE ARENA".
- 6–14 other buildings depending on size (cities use `+` towers and plazas), 2–3 enterable houses with NPCs, lamp posts and decorations.
- 8–12 NPCs with lines about the place, its Arena and what lies beyond.
- No wild encounters inside towns.

**Islands:** a pier with `m.dock` and a ferry captain, beaches, the island's landmark, wild areas, items, a couple of trainers. Moonlit Island and the Aurora Isles are post-badge, high-level places.

**Gates:** put `need: G.mk.gate(n, 'NAME')` only on the warps that lead **into** a gated map. The tables list the badge count per warp; they are already in the placeholders.

## 5. Biomes and new tiles (Biome art owner)

`m.biome` picks a palette for the existing tile chars, so `g`, `G`, `#`, `n`, `u`, `r`, `w`, `y`, `p`, `E`, `F` and so on look right everywhere:

| Biome | How existing tiles read |
| --- | --- |
| `meadow` (default) | as today |
| `forest` | deeper, darker greens, mossy ground, big old trees, ferns |
| `coast` | meadow plus brighter sand and sea spray |
| `swamp` | like Mirewood |
| `city` | trimmed lawns, planters, neat trees |
| `alpine` | rocky mountain grass, grey cliffs, alpine pines, cold streams |
| `snow` | snow ground, snowy tall grass, frosted pines and trees, snowy bushes, ice-blue water with floes, packed-snow paths, ice cliffs |
| `desert` | sand ground, dry scrub tall grass, palms and dead trees, cactus bushes, sandstone boulders and cliffs, oasis water |
| `badlands` | red earth, dry grass, red mesa cliffs, red rocks, dead trees |
| `volcano` | dark ash ground, scorched grass, charred trees, black rocks, dark cliffs |
| `tropical` | white sand, turquoise shallow water, palms, lush jungle bushes |
| `mystic` | night-blue grass, glowing violet trees and flowers, fireflies, a soft dark tint |
| `aurora` | snow at night, glowing aurora sky shimmer, starry ice |

New tile chars:

| Char | What | Solid |
| --- | --- | --- |
| `%` | cobblestone plaza | no |
| `=` | paved road with kerbs | no |
| `+` | city tower block (tall, windows lit at night) | yes |
| `U` | Arena roof (grand, a gold emblem) | yes |
| `\|` | lighthouse (tall, beam light) | yes |
| `@` | waterfall face (animated, mist at the bottom) | yes |
| `!` | lava (glowing, animated) | yes |
| `^` | castle stone wall or tower | yes |

All of them blend with their neighbours like the existing tiles. Owners may use these right away. Until the art lands they may look unfinished, but they must be listed in `G.TILES` for the tests (the Biome art owner adds them first thing).

## 6. Arenas and badges (Arenas owner)

- **Badge data and checks:**
  - `G.BADGES` (8 entries) and the flags `S.flags['badge_' + id]`.
  - `G.badgeCount()`.
  - `G.badgeGate(n, place)`, which returns `null` or the ranger's refusal line.
- **`G.badgeCase()`:** a screen showing the 8 badges (earned badges shine; unearned ones are silhouettes with their city's name).
- **Each arena** `arena_<city>`:
  - A themed interior with a light puzzle or path (rock maze, flower garden, stepping stones on water, wind or feather towers, sand pits, electric gates, ice floor, lava walkways).
  - 2–3 Arena trainers (beatable on the way), and the **Arena Leader** with an original name, a personality and a 3–6 creature team of their type at the levels in section 3.
  - On winning: the badge (with a banner and fanfare), prize money, and 5 orbs of the matching type (Stone, Verdant, Aqua, Gale, Stone, Pulse, Frost and Flare Orbs).
  - Losing works as normal. Rematch lines for later.
- **Exits:** fix each arena's exit to its city's door (the placeholder already shows how).

## 7. World map, ferries and flight (World map owner)

- `G.WORLD`: every place's position on the illustrated map, its name, its kind (city, town, route, island, special), its services (healing, shop, arena, cave) and the routes between places.
- `G.drawWorldMap(ctx, ...)`: a beautiful illustrated overview in the game's style, like the reference:
  - coastline and sea, forests, mountains and snow, the volcano with lava, desert, swamp, rivers, lakes, waterfalls and islands;
  - routes, clouds and a compass;
  - icons for city, town, arena, healing, shop and cave, and place names;
  - fog on places you haven't visited, and padlocks on places you can't enter yet.
- It is used by START → MAP (`G.worldMapScreen`), by the flight and helicopter destination picker, and by the ferry.
- `G.ferry(fromMapId)`: a ferry ticket desk listing the destinations from `G.mk.FERRIES`, with their badge requirements, a ticket price and a short sailing scene, landing on `m.dock`.

## 7b. The Aurelian Sea and entrance markers

- `js/maps/zz_sea.js` (generated by `PW=... node tools/gen-sea.js`, template in `tools/sea-template.js`) adds the 192x128 map `aurelis_sea`. It is built from the illustrated map's own geometry (`WORLD.geo`: 1 tile = 8 px of the 1536x1024 reference), so the coast, islands, lake and open water sit where the picture has them. Seven small islands sit in the empty parts of the sea (positions are searched by `tools/gen-sea.js`, names in its `NAMES` list), each with a treasure cache on a beach facing the sea (`sea_cache_N`). `m.seaOrigin` is the picture's offset in tiles (0 now). Travel speed is tuned to the map size: see `speed` in `js/vehicles.js`.
- Harbour towns (Sunhaven, Driftwood, Verdant, Tidepool Shore, Tidefall, Moonlit, Cobalt, Frostmere, Aurora) have open-water exits (`warp.sea = true`). Sailing off the edge of a harbour puts the boat on the sea at that harbour's mouth, still aboard. Sailing into a harbour's 3x3 gate on the sea map arrives in that town's waters. Sea maps are boat-only.
- `js/gates.js` marks every way into a new area: chevrons and a name plate on map edges, a ring and arrow for gates inside a map, a padlock and "N BADGES" when locked. On the sea it also shows a minimap, harbour dots, your boat and the nearest harbour with a compass direction. `G.gatesOf(map)` lists the gates.
- Test Mode: **UNLOCK EVERYTHING** also turns on **FLY ANYWHERE** (any creature can carry you, every place counts as visited, no helicopter needed).
- Test Mode: **NO BATTLES** (a switch in the Test Mode menu, off by default and not set by UNLOCK EVERYTHING) switches battles off: no wild encounters in grass, roaming creatures do not engage, trainers do not challenge, and any battle that does start (talking to a trainer, Arena Leader or boss) is won at once, so the story can still be followed. The menu's WILD BATTLE still fights. Code: `G.cheat('nobattle')` in js/battle.js (`startBattle`) and js/world.js.

## 7c. Wild roads between neighbouring cities

Where two towns or cities used to open straight into each other, a wild road now lies between them (`js/maps/zz_roads.js`, `tests/e2e-roads.js`):

| Road | Joins | Size | Wild levels | Ground |
|---|---|---|---|---|
| Stonebridge Road | Lanternrest and Stonebridge | 40x56 | 7-11 (Mirewood's species) | grass and woods |
| Coast Road | Sunhaven and Driftwood Port | 40x56 | 16-21 (Driftwood's species) | shore grass and sand |
| Cobalt Flats | Cobalt City and Sandsreach (a bend: out of Cobalt's north gate, west into the desert) | 52x52 | 21-26 (Sandsreach's species) | desert |
| Frostmere Approach | Frostmere City and Glacier Pass | 56x40 | 30-35 (Glacier's species) | snow |

Each road has a winding two-wide path, tall-grass patches beside it (the encounters), three trainers, three or four items, two signposts and one
traveller with a line of lore. They are generated from a spec (size, seed, palette, trainers, items); the old edge exits of the two places are
re-pointed at the road (and the arrival tiles kept), so ferries, flight, the map screen and the world graph are unchanged (the road counts as part of the
place it leads away from for the graph).

Gates: a road is not a place, so walking onto it is free, and the gate rule of the place at each end stops you at that end (each road warp has `gateFrom`, the place at
the other end, which `js/access.js` uses as the "from" place). A visited place stays open as before.

To add a road: write a `between('a', 'b', { ... })` call in `js/maps/zz_roads.js` for two places that have exactly two edge warps to each other, and add the road to the `REGION` table in
`js/story.js` and to the lists in `tests/e2e-roads.js` and `tests/maps.test.js`.

## 8. Tests

- Every owner keeps `node tests/maps.test.js` and `node tests/logic.test.js` passing for their maps.
- Region owners take screenshots of each of their maps and look at them: use `G.state = G.newState(); G.migrateState(G.state); G.state.flags.starter = true; G.loadMap(id); G.placePlayer(x, y, 0); G.scene = G.world.scene;` and a wide viewport.
- Scratch files go in `/tmp/claude-0/<owner>/`. Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, Playwright at `/opt/node-tools/node_modules/playwright`.

## 9. Quests and reputation (js/quests.js, js/story.js)

- A quest is data: `G.quest.def({ id, cat, title, giver, desc, start(S), steps: [{ id, text, done(S), at, count(S) }], reward })`. Categories: main, side, discovery, people, research, home.
- Steps are checked about three times a second, and every finished step is skipped, so a quest stays right when things happen early or out of order. `at` (a place id, or a function of the state) puts a marker on the world map.
- Rewards (`money`, `items`, `rep`, `flags`, `fn`) go through `G.grantOnce(key)` and are paid exactly once per save.
- Reputation: `G.rep.add(region, n)`, regions west, south, north, east and vale (`G.regionOf(placeId)`), 0 to 100.
- Save fields: `S.quests`, `S.rep`, `S.once`, `S.journal`. Test Mode's UNLOCK EVERYTHING completes every quest and sets every region to 100.

## 10. Region access and difficulty (js/access.js)

- `G.access.rule(placeId)`: the badges (the place's `need`), the story chapter that must be finished first (`STORY` in js/access.js: ch1 opens Evergreen and Whispering Woods, ch2 Driftwood and Verdant, ch3 Lakeside and Tidefall, ch4 Sandsreach, Cobalt and the Badlands, ch5 Glacier Pass, Frostmere and Aurora, ch6 Emberfall, ch7 Cloudpeak, ch8 Moonlit), and the Lantern.
- A place is open only with BOTH the badges and the finished chapter (and the Lantern if it needs it). Where no gym on the way gives a badge (the start of the game, a town or island without an Arena) the finished chapter is what lets you on. Nothing else opens a gate: no permit (the ranger sells none any more, and an old `permit_<id>` flag does nothing), no reputation, no boat, ferry or helicopter. A place you have already visited stays open (older saves, going back). Test Mode's FLY ANYWHERE still opens everything.
- `wire()` replaces `need` on every warp into a ruled place (roads, sea harbour gates). Ferries use `ferryAccess`; the map and flight use `G.worldLockWhy`, which uses `G.access.why`. The refusal names the chapter to finish, then the badges.
- `G.access.danger(id)`: 'some' or 'high' when wild levels are above your team.
- `G.arenaShift(map)` / `G.scaledTeam(team, map)`: an Arena's trainers and Leader shift so the k-th Leader you face fights at the k-th Arena's strength.
- Reputation also comes from trainer wins (+2 each, once) and new species caught (+1 in the region you're in). It no longer opens gates; `G.progressPoints()` = badges + total reputation / 80 still drives homestead land.

## 11. Field abilities (js/field.js)

- `G.FIELD`: climb, dig and light, each with creature types, a minimum level (8) and a forge tool (Climbing Gear, Shovel, Glow Lamp). `G.fieldHelper(kind)` returns the creature or tool that can do it.
- `G.FIELD_SPOTS`: nooks `{ id, map, kind, a, b, c, reward, text }` (stand on a, the obstacle is b, a 3x3 hidden nook is centred on c with a chest) and dig spots `{ id, map, kind: 'dig', at, reward }`. Nooks are carved into the map tiles when the file loads. The obstacle and chest stay in `m.block`, and a lit gap is cleared for good.
- Flags: `fx_<id>` (used), `fx_<id>_chest` (opened). Rewards go through `G.grantOnce('fx:<id>')` and give +3 reputation in the map's region.
