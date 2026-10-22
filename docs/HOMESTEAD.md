# Homestead expansion: shared contract

Source of truth for the homestead, construction, farming, crafting, vehicle and town-service work. Read `docs/CONTRACT.md` first (rendering model, art direction, map rules), then this file, then `js/structures.js` (structure catalogue) and `js/economy.js` (item catalogue and `G.inv`).

Keep to your own files. If you need something from a file you don't own, use a hook or write a one-line request in your report.

## 1. File ownership

| Owner | Files |
| --- | --- |
| Lead / integration | `js/world.js`, `js/engine.js`, `js/homestead.js` (placement, upgrade, move, rotate, remove, property expansion, structure drawing and labels, nursery and healing-station behaviour, save migration), `js/structures.js`, `js/economy.js`, `js/build.js`, `js/screens.js` (bag pockets, start menu), `js/data.js`, `js/main.js`, `index.html`, existing tests, `android/` |
| Building art | `js/homeart.js` (structures, crops, signs) and **new tile chars only** in `js/terrain.js` |
| Prop and vehicle art | `js/propart.js` (furniture and vehicles) |
| Systems | `js/farm.js` (day clock, energy, plots, crops, watering, sprinklers, greenhouse), `js/craft.js` (refinery, forge, kitchen recipes and UIs), `js/gather.js` (gathering from trees, bushes, rocks, crystals and water), barn behaviour, house furniture behaviour (`G.homeFurn`), shed storage |
| Vehicles | `js/vehicles.js`: vehicle data, garage UI, riding, parking, helicopter, creature flight, the travel menu and the vehicle quests |
| Maps and towns | `js/maps/homestead.js` (new: the property and the four house interiors), edits to `js/maps/*.js` (road to the homestead, new shops and healing posts, labels), `js/shops.js` (new: shop data, shop UI and the shared healing UI) |

Every new file is loaded by `index.html` in this order: `data`, `economy`, species, `creature`, `gfx`, `terrain`, `homeart`, `propart`, `sprites`, `uikit`, `engine`, `screens`, `battle`, `mapkit`, `maps/*` (including `homestead`), `world`, `build`, `structures`, `homestead`, `farm`, `craft`, `gather`, `shops`, `vehicles`, `cheats`, `main`.

Guard against code that isn't there yet: write `if (G.homeArt) ...`, `(G.homeUse.garage || fallback)` and so on. A file that throws at load breaks every other agent's tests.

## 2. World hooks (`G.hooks`, defined in js/world.js)

| Hook | Signature | Use |
| --- | --- | --- |
| `load` | array of `(map)` | After a map loads and builds are applied. |
| `tick` | array of `()` | Every overworld frame while the world is idle. |
| `interact` | array of `async (tx, ty) => true` | Runs when A is pressed on a tile with no object, person or creature. Return true when handled. |
| `prompt` | array of `(tx, ty) => string` | The hint chip for the facing tile ("Chop tree", "Refill can"). Objects use `obj.prompt` (a string or a function). |
| `draw` | array of `(items, cx, cy, t)` | Push depth-sorted `{ y, draw(ctx) }`. `y` is the base line in map pixels. |
| `overlay` | array of `(ctx, cx, cy, t)` | Above the map and below banners, in screen units of the wide world view. |
| `beforeWarp` | array of `async (warp)` | Before a warp, for example to park a vehicle outside an interior. |
| `enter` | single `(x, y, ch) => true / false / undefined` | Player-only step rule. `true` allows a solid tile (a hoverboard on water), `false` denies one (a car off the road), `undefined` keeps the default. |
| `speed` | single `(held) => px per frame` | The player's step speed. The default is 1, or 2 while B is held; 16 px is one tile. |
| `turn` | single `() => frames` | The delay after turning before the player steps. The default is 5. |
| `encRate` | single `(rate) => rate` | The tall-grass encounter rate. The default is .07. |
| `drawPlayer` | single `(ctx, x, y, dir, frame, t, grassOver) => true` | Draw the player yourself (riding a vehicle). Call `grassOver()` if you want tall grass drawn over the feet. |

The hooks marked "single" have one owner: Vehicles.

Helpers in `G.worldApi` are `canWalk`, `canStep`, `tileAt`, `objAt`, `npcAt`, `roamAt`, `tileWarp`, `says(lines)`, `facing() -> [tx, ty]`, `warpTo(id, x, y, dir)` and `VEC`.

### Map extras

- `map.block`: a `Set` of `"x,y"` strings for solid cells. It is set up by the lead for structures and props, and `canWalk` respects it.
- `map.labels`: `[{ x, y, text, style }]`. A name plate is drawn centred over tile `x`, sitting just above tile row `y`. `style` is `'shop'`, `'heal'`, `'home'` or `'craft'`. Use these for town buildings.
- `map.props`: `[{ x, y, w, h, kind, info }]`. Furniture and fixtures drawn by the prop art. The lead blocks their cells and draws them depth-sorted.
- `map.zones` (homestead only): `[{ deed: 1, x, y, w, h }, ... { deed: 5, ... }]`. These are the five parcels of land. The first is a small yard around the cabin; parcels 2 to 5 are released automatically at 1, 3, 5 and 7 Arena badges (`G.home.deedFor()`). Grass outside your current parcels is drawn as thicket (`X`).
- `map.homeSpot` (homestead only): `{ x, y }`. The top-left corner where the starter house is placed. A 7x5 area there must stay clear, because the house can grow to that size.
- `map.landing`: `{ x, y }`. A walkable outdoor tile used by flight and the helicopter.

## 3. Game state (`G.state`; the lead migrates old saves)

```
S.builds   [{ id, type, map, x, y, lvl (1-based), rot (0 or 1), ...per-type state }]   existing array, extended
S.home     { deed: 1, seen: 1, v: 2 }           land parcel you own (1-5, grows with Arena badges), the last one announced
S.day      1                                    current day; advances by sleeping or after DAY_FRAMES of play
S.clock    0                                    frames into the current day
S.energy   100                                  player energy, 0..maxEnergy (from the house level's perks.energy)
S.storage  { item: qty }                        house cupboard and shed storage
S.gather   { 'map:x,y': step }                  when a tile was last gathered (regrows by steps)
S.visited  { mapId: true }                      outdoor maps you have walked in (flight destinations)
S.vehicles { owned: ['bicycle'], riding: null, parked: null | { id, map, x, y }, paint: {}, tune: {} }
S.recipes  { recipeId: true }                   extra recipes unlocked by quests or finds
S.can      0                                    water left in the watering can
```

Per-type build state: plot `b.crop = { id, grown, wet, fert, ripe }`; refinery `b.jobs = [{ r, start, dur }]`; barn `b.animals = [creature]` and `b.day`; nursery `b.pets = [{ c, steps0 }]`; station `b.used = { day, n }`.

All new fields must tolerate being missing: `S.home = S.home || { deed: 1 }`. `G.migrateState(S)` in js/homestead.js fills defaults on load and on new games. If you add a field, also default it yourself before using it.

## 4. Structures (`js/structures.js`; the lead's framework lives in `js/homestead.js`)

The building API for the other owners:
- `G.home.lvl(b)` returns a number. `G.home.L(b)` returns the level definition (`.perks`). `G.home.def(b)` returns the structure definition.
- `G.home.all(type)` returns the homestead builds of that type. `G.home.get(type)` returns the first one. `G.home.maxLvl(type)` returns the highest built level, or 0.
- `G.home.manage(b)` opens the management menu (upgrade, move, rotate, remove).
- `G.home.refresh()` re-stamps the current map after you change builds.
- `G.homeUse[use] = async b => {}` is the primary action, registered by the owner of that behaviour.
  - Pressing A on a structure opens `[useLabel, UPGRADE, MOVE, ROTATE?, REMOVE, CANCEL]`.
  - When `def.direct` is set (garden plots), A calls `G.homeUse[use](b)` straight away. That handler should offer `G.home.manage(b)` itself, for example when a plot is empty.

| use | Owner | What the handler does |
| --- | --- | --- |
| `house` | Lead | Facing the walls: enter, upgrade. The door tile is a warp to `perks.interior`. |
| `nursery`, `station` | Lead | Nursery slots; healing with daily charges through `G.healUI`. |
| `barn`, `shed`, `refinery`, `forge`, `plot`, `sprinkler`, `well`, `greenhouse`, `bench` | Systems | See section 6. |
| `garage`, `helipad` | Vehicles | See section 7. |

Drawing: structures without `tiles` are drawn by `G.homeArt.structure(...)` over their footprint. Footprint sizes per level are in `js/structures.js`. Decorations with `tiles` are stamped as tile chars, as before.

## 5. Art APIs

All canvases are cached and drawn at destination sizes (see CONTRACT.md). Positions are screen units in the wide world view: tile `(tx, ty)` is at `tx*16 - cx, ty*16 - cy`.

Building art (`js/homeart.js`):
- `G.homeArt.structure(ctx, type, lvl, x, y, w, h, t, info)`
  - `x, y` is the footprint's top-left corner and `w, h` are in tiles. The art may rise up to 26 px above `y`; nothing is drawn below `y + h*16`.
  - `info = { rot, active, door: [col, row] | null, wear }`. `active` is true while a refinery or forge job is running: show smoke or sparks.
  - Every type and level in `js/structures.js` without `tiles` needs its own look, and each level must look clearly bigger and better.
  - House: a door on the door tile. Its levels go cabin (logs), cottage (painted, chimney), family home (two storeys of roof, porch), grand homestead (stone and timber, balcony, garden lights).
  - Barn: red with a white trim and a hayloft. Station: a pink canopy and a cross. Refinery: a stone kiln with a chimney and pipes. Forge: an anvil, a hearth and bellows. Garage: roller doors. Helipad: a painted H circle. Plot: tilled soil (crops are drawn separately). Sprinkler, well, greenhouse (glass), shed, bench (`rot` 1 = vertical), flower box (`rot`), statue, nursery (a fenced play pen with toys; it grows).
- `G.homeArt.crop(ctx, cropId, stage, x, y, t, info)`
  - `cropId` is `'turnip' | 'carrot' | 'wheat' | 'tomato' | 'pepper' | 'glowcap' | 'pumpkin' | 'starmelon'`. `stage` runs from 0 (seed) to 3 (ripe).
  - `info = { wet, withered }`. A ripe crop should sparkle a little.
  - Also provide `G.homeArt.soil(ctx, x, y, t, { wet })` for an empty plot.
- New terrain tile chars, added to `js/terrain.js` (`G.TILES` plus the ground drawing):
  - `Z`: stone path, walkable.
  - `Y`: fence gate, walkable, drawn like a fence with a gate.
  - `X`: wild thicket on land you don't own yet. Solid, dense and brambly, clearly "not yet yours".
  - `v`: tiled kitchen or bathroom floor, interior, walkable.
- `G.drawSignPlate(ctx, text, cx, y, t, style)` already exists in js/uikit.js. The building art may restyle it inside the same signature.

Prop and vehicle art (`js/propart.js`):
- `G.homeArt.prop(ctx, kind, x, y, w, h, t, info)`
  - Furniture standing on its footprint, rising up to 20 px above `y`.
  - kinds: `bed`, `bed2` (double), `stove`, `fridge`, `counter`, `sink`, `toilet`, `shower`, `bath`, `sofa`, `armchair`, `tv`, `bookshelf`, `cupboard`, `chest`, `table`, `desk`, `plant`, `lamp`, `wardrobe`, `trophy`, `petbed`, `rug` (flat), `painting` (on the top wall), `fireplace`, `piano`.
- `G.homeArt.vehicle(ctx, id, dir, x, y, t, info)`
  - `id` is `'bicycle' | 'scooter' | 'quad' | 'motorbike' | 'car' | 'hoverboard' | 'helicopter'`. `dir` is 0 down, 1 up, 2 left, 3 right. `x, y` is the tile top-left.
  - `info = { moving, color, layer: 'back' | 'front', parked }`. It is drawn twice around the rider: `'back'` before the rider, `'front'` after (handlebars, windscreen).
  - Also `G.homeArt.seat(id, dir)` returns `{ dx, dy, hide }`, the rider's offset in px from a standing pose. `hide: true` hides the rider entirely (car, helicopter).
  - The helicopter can be bigger than a tile: about 2x2 tiles, with rotor blur when `moving`.

## 6. Systems: rules and numbers

- **Day:**
  - `DAY_FRAMES = 36000` (10 minutes of overworld play).
  - Sleeping in a bed jumps to the next morning, refills energy and heals the team.
  - On each new day, crops that were watered (or self-water) grow 1 stage-day, sprinklers water first, barns produce, and stations reset their charges.
  - Expose `G.farm.newDay()` and `G.farm.sleep()`.
- **Energy:**
  - Gathering costs 2, watering 1 and harvesting 1. Planting, crafting and building are free.
  - At 0 energy: "You're too tired. Eat something or get some sleep."
  - Eating restores `item.energy`. Ripe raw Turnip, Carrot, Tomato and Starmelon are edible; Wheat, Pepper, Glowcap and Pumpkin are ingredients only.
  - Energy affects nothing else: walking and battles are never blocked.
- **Crops:**

  | Crop | Days | Yield | Seeds from |
  | --- | --- | --- | --- |
  | Turnip | 3 | 1–2 | Sunmeadow bushes 25%; Meadowbrook stand |
  | Carrot | 4 | 1–2 | Sunmeadow and Lanternrest bushes 15%; stand |
  | Wheat | 3 | 2–3 | Stand only |
  | Tomato | 5 | 2–3 | Shore bushes 15%; stand |
  | Pepper | 5 | 1–3 | Ridge bushes 20%; Ridgehold Forge |
  | Glowcap | 4, no water needed | 1–3 | Mirewood bushes and stumps 20%; Bogroot Apothecary |
  | Pumpkin | 7 | 1–2 | Tidewheel Market |
  | Starmelon | 9 | 1 | Hollow bushes 10%; not sold |

  - Stages: 0 means planted, 1 is a sprout from about a third of the days, 2 is growing from about two thirds, and 3 is ripe.
  - A plot not watered for 3 days in a row withers its crop. Clearing a withered crop gives nothing back.
  - Fertilizer on a planted plot adds +1 to the harvest.
- **Watering:** you need a Watering Can (6 splashes, or 15 for the Big Watering Can, which waters the plot and its 4 neighbours). Refill at a Well or by facing any water tile.
- **Gathering:**
  - Facing a tree (`#`, `n`), bush (`u`), stump (`d`), boulder (`r`) or crystal (`i`) on any outdoor map or in the mine, press A.
  - Each tile regrows 150 steps after it was last gathered.
  - Trees give 1 Wood (3 with an Axe).
  - Bushes give 1 Fiber, plus that map's seed chance.
  - Boulders give 1–2 Stone, and Clay (50% instead of Stone) on the shore and in Mirewood. With a Pickaxe they also give Copper Ore 40% / Iron Ore 15% on the ridge, and Iron Ore 50% / Coal 40% in the mine.
  - Crystals give a Crystal Shard (Pickaxe required).
  - Not every plant gives seeds: lantern-plaza flowers and decorative crop beds give nothing.
- **Barn:**
  - Give boxed or party creatures a home there; you can't move your last healthy party creature.
  - Each creature makes `perks.output` items a day according to its first type: Normal Wool or Milk; Bug Honey; Grass and Poison Fertilizer; Fire Coal; Rock, Ground and Steel Stone (Steel: Iron Ore 30%); Electric Copper Ore; Water Clay (Pearl 15%); Fairy and Psychic Crystal Shard 20% else Fiber; others Fiber.
  - Collect the items at the barn. With `feedBonus`, feeding 1 Fertilizer gives +1 to everything for that day.
- **Refinery** (jobs take real play-time frames divided by `perks.speed`; one job = one batch):

  | Recipe | Tier | Time |
  | --- | --- | --- |
  | 3 Wood → 2 Plank | 1 | 1 min |
  | 3 Fiber → 1 Rope | 1 | 1 min |
  | 2 Clay + 1 Coal → 2 Brick | 1 | 2 min |
  | 3 Iron Ore + 1 Coal → 1 Iron Ingot | 1 | 2 min |
  | 3 Copper Ore + 1 Coal → 1 Copper Ingot | 1 | 2 min |
  | 2 Crystal Shard → 1 Glass | 2 | 3 min |
  | 2 Wool → 1 Cloth | 2 | 2 min |
  | 3 Wheat → 2 Flour | 2 | 1 min |

  Tier 3 doubles the Plank and Brick output. Show progress bars, and let finished jobs be collected.
- **Forge** (instant crafting; recipes are unlocked by tier):
  - Tier 1:
    - Axe (5 Wood, 3 Stone)
    - Pickaxe (4 Wood, 5 Stone)
    - Watering Can (2 Copper Ingot)
    - Nails ×4 (1 Iron Ingot)
    - Herb Salve (2 Glowcap, 1 Honey)
  - Tier 2:
    - Gear (2 Iron Ingot)
    - Wire ×2 (1 Copper Ingot)
    - Wheel (1 Iron Ingot, 2 Rope)
    - Engine Part (2 Iron Ingot, 2 Wire, 1 Gear)
    - Terra Orb ×3 (1 Iron Ingot, 2 Fiber)
    - Pulse Orb ×2 (1 Iron Ingot, 1 Copper Ingot, 1 Crystal Shard)
    - Big Watering Can (2 Iron Ingot, 2 Copper Ingot)
    - Spicy Treat (2 Pepper, 1 Honey)
    - Bicycle (4 Iron Ingot, 2 Wheel, 2 Rope; Vehicles grants it via `G.vehicles.grant('bicycle')`)
  - Tier 3:
    - Hover Core (3 Crystal Shard, 2 Wire, 1 Glass)
    - Rotor (3 Iron Ingot, 2 Gear)
    - Star Treat (1 Starmelon, 2 Honey)
    - Hoverboard (1 Hover Core, 4 Plank, 2 Glass; needs the Lantern lit)

  Sprinklers are built from the build menu, not crafted.
- **Kitchen** (in the house; `perks.kitchen` is the tier, and 0 means no kitchen):
  - Tier 1: Veggie Stew (1 Carrot, 1 Turnip, 1 Tomato), Bread (2 Flour, 1 Milk), Tomato Soup (2 Tomato, 1 Milk).
  - Tier 2: Honey Toast (1 Bread, 1 Honey), Pepper Skewer (2 Pepper, 1 Carrot, 1 Tomato).
  - Tier 3: Pumpkin Pie (1 Pumpkin, 2 Flour, 1 Honey, 1 Milk), and cooking makes 2 of everything.
- **House furniture** (`G.homeFurn[kind](info)`; Maps places the objects with `fn: () => G.homeFurn.bed()`):
  - `bed`: sleep → next day, full energy, team healed.
  - `stove`: the kitchen menu.
  - `fridge` and `cupboard`: storage deposit and withdraw. Capacity is the total number of items stored, from the house's `perks.storage` plus every shed's `perks.storage`.
  - `sink`: refill the watering can.
  - `shower`: +15 energy once a day. `bath`: +30 energy once a day (level 4).
  - `toilet`: a short gag, +5 energy once a day.
  - `sofa`: rest +10 energy once a day, and shows trophies.
  - `tv`: shows today's tips (day, crops ready, refinery jobs).
  - `bookshelf`: a recipe book (lists every recipe and where to get things).
  - `trophy`: the trophy shelf. `petbed`: a creature lounges.
  - `desk`: a property ledger (deed, structure levels).
  - `wardrobe`: change shirt colour.

## 7. Vehicles: rules and numbers

`G.VEHICLES[id] = { name, speed, turn, tiles, enc, how }`. Speed is px per frame (walking is 1, running 2).

| Vehicle | Speed | Turn | Where | Encounters | How you get it |
| --- | --- | --- | --- | --- | --- |
| Bicycle | 2.5 | 4 | land except tall grass, marsh and caves | none (it can't enter grass) | Forge tier 2, or $4,000 at Tidewheel Motors |
| Scooter | 3 | 4 | roads only: `p y V z Z D M` and plaza sand | none | Courier quest in Lanternrest: bring 3 Carrots and 2 Turnips |
| Quad bike | 2.5 | 6 | all land including tall grass, marsh and cave floors | ×0.5 | Broken quad found on the Ridge: repair it with 1 Engine Part and 2 Wheels |
| Motorbike | 3.5 | 8 | land and cave floors, not tall grass or marsh | none | $15,000 at Tidewheel Motors; needs 1 Ember Shard |
| Car | 4 | 10 | roads only, no caves | none | $30,000 at Tidewheel Motors; needs Garage Lv2 and 2 shards |
| Hoverboard | 3 | 3 | all walkable land plus water `w`; not caves | 0 | Forge tier 3, after the Lantern is lit |
| Rowboat | 2 | 4 | water `w` only | none | Forge tier 1 (12 Plank, 4 Rope, 6 Nails), or $1,500 at Tidewheel Motors |
| Motorboat | 3.5 | 6 | water `w` only | none | Forge tier 2 (20 Plank, 1 Engine Part, 4 Iron Ingot, 4 Rope), or $9,000 at Tidewheel Motors |
| Sailboat | 3 | 5 | water `w` only | none | Forge tier 3 (24 Plank, 4 Cloth, 6 Rope, 8 Nails) |
| Helicopter | flight | n/a | flies between landing spots | n/a | $80,000 at Tidewheel Motors after the Lantern is lit; needs Garage Lv3 and a Helipad |

- **Riding:**
  - While riding, B gives no extra speed. Vehicles can't enter interiors: `beforeWarp` parks it outside the door, and it is waiting when you come back out.
  - Indoors, or on maps without `outdoor`, you can't take a vehicle out.
- **Boats:** face a water tile with a boat owned and press A (`Launch the rowboat?`): the boat goes on that tile with you aboard. Boats need no Garage and never leave their map. Face a walkable shore tile and press A to step ashore; the boat stays moored (`S.vehicles.moored = { id, map, x, y, dir }`, one at a time) and you board it again by facing it and pressing A. Entering an interior moors it where it floats. The Garage lists boats under BOATS; MOOR NEARBY drops one at the closest shore water within 8 tiles. `G.vehicles.ownsBoat()` tells the ferry flow that SAIL YOUR BOAT is free.
- **Garage:** owned vehicles, take one out (capacity = `perks.slots`; owned beyond capacity are "at the dealer lot" and can't be taken out), store the one you're riding, tune (+0.5 speed, Lv2, costs 1 Engine Part), and paint (choose a colour, Lv2).
- **Travel menu** (the START menu has TRAVEL; the lead calls `G.travelMenu()`):
  - Ride or get off, call a parked vehicle back home, FLY with a creature, and HELICOPTER.
  - An unavailable option says exactly why, for example "No creature in your party can carry you. A Flying-type that has evolved, at Lv18+, can."
- **Creature flight:**
  - `G.canFly(c)` checks for a Flying type (either type) and that it is evolved (has a pre-evolution), a final single stage, or a legendary. It also needs Lv18+ and not fainted.
  - Also allowed: Dragon types with wings in their art config.
  - Destinations are outdoor maps in `S.visited` that have a `landing`. The Hollow only counts when the Lantern is lit, and nothing is reachable before you have your starter.
  - Show a fly scene: a stylised overhead vale map with the creature carrying the player along a route, then land on `map.landing`.
- **Helicopter:** take off from your Helipad, or from wherever it is parked. Same destination rules as flight, and it lands and stays parked at the destination's landing spot.

## 8. Shops and healing (Maps and towns)

`G.SHOPS[id] = { name, greet, stock: [{ item, price?, need?: () => string|null }], sells: ['kind', ...] | false, special? }` and `G.openShop(id)`.

- The shop UI lists items with prices and your count.
- A quantity picker works with touch: tap −/+ zones.
- It shows the total, then asks for confirmation.
- It validates money (exact message: "You need $N more.").
- Sell rules are per shop.
- Success and failure each get clear feedback.

`G.shopMenu()` stays as the Lanternrest Trading Post.

| Shop | Where | Sells |
| --- | --- | --- |
| Lanternrest General Store (the Trading Post) | Lanternrest | orbs and medicine (as now), Watering Can |
| Builder's Yard | Lanternrest: turn one neighbour house into it | Wood, Stone, Plank, Brick, Nails, Clay; buys materials |
| Meadowbrook Seeds | Sunmeadow: a farm stand building | Turnip, Carrot, Wheat and Tomato Seeds, Watering Can, Fertilizer; buys crops |
| Bogroot Apothecary | Mirewood | Herb Salve, Full Heal, Glowcap Spores, Honey; buys Glowcap and Honey |
| Ridgehold Forge (blacksmith) | Ridge | Iron Ingot, Copper Ingot, Coal, Axe, Pickaxe, Gear, Pepper Seeds; buys ores and ingots |
| Tidewheel Motors (vehicle dealership) | Shore | Bicycle, Motorbike, Car, Helicopter, Wheel, Engine Part. Vehicles are bought through `G.vehicles.buy(id)` from Vehicles, which checks the requirements; list them with `special: 'vehicles'`. |
| Tidewheel Market | Shore | Pumpkin and Tomato Seeds; buys Pearls, crops and food |

`G.healUI({ name, free: true } | { name, charges, revive })` is the one healing screen for every healer.
- It lists the party with HP bars, highlighting who needs healing.
- It has HEAL TEAM and CANCEL.
- It applies `G.healFull` (respecting `revive: false`, which skips fainted creatures).
- It returns true if it healed.

Town Healing Centres are free and unlimited; the Warden Lodge keeps its nurse but uses `G.healUI`. Add a small Healing Post on the Ridge (near the mine mouth) and on the Shore.

Signs: every shop, healing centre and service building gets a `map.labels` entry in a consistent style, for example "WARDEN LODGE · HEALING", "GENERAL STORE", "BUILDER'S YARD". Use `style: 'heal'` for healers.

The homestead map (`js/maps/homestead.js`):
- id `homestead`, name `YOUR HOMESTEAD`, about 56x44.
- Entrance from Lanternrest: a road north from the NE building plot to a 2-wide exit at the hub's top edge (around x 50–51), arriving at the bottom of the homestead.
- No wild encounters (`enc: null`).
- Some trees, bushes, boulders and a pond to gather from. Keep these out of the 7x5 `homeSpot`.
- `zones` for deeds 1–5. Deed 1 is a small 18x17 yard around the house; deed 5 is nearly the whole map.
- A Land Office board object: `fn: () => G.home.landOffice()`, `prompt: 'Land Office'`.
- A mailbox with a welcome note. Tip NPC: a friendly neighbour who explains the basics.
- Interiors `home1`..`home4`: the level-1 cabin is small, and each level has more rooms divided by `B` walls with gaps for doorways.
  - Use `v` tiles in kitchen and bathroom areas.
  - Furniture goes in `map.props` plus `map.objs` with `fn` and `prompt`.
  - Each interior's exit warp destination is fixed up by the lead to the house door. Use `warp(m, x, y, 'homestead', 0, 0, DOWN)`.

## 9. Tests

- Each owner adds `tests/e2e-<area>.js` (Playwright, the same style as tests/e2e-world.js).
- Test success and failure paths: not enough materials, invalid placement, locked upgrades, unavailable vehicles, no flying creature.
- Owners may run their own e2e file plus `node tests/logic.test.js` and `node tests/maps.test.js`. Don't run other owners' e2e files, and don't commit.
- To set up state quickly in tests:
  - `G.state = G.newState(); G.migrateState(G.state); ...`
  - Then `G.loadMap(id); G.placePlayer(x, y, dir); G.scene = G.world.scene;`
- Scratch files go in `/tmp/claude-0/<your-name>/`.
