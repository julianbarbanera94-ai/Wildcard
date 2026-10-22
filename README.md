# WILDCARD

A cosy creature-catching RPG for the browser and Android, with bright, soft, animated art in the spirit of Pokopia: a big free-roam world where wild creatures wander the map, turn-based battles, capture orbs, a party of six with your lead partner walking behind you, trainers, and your own buildings (a base, healing stations, nurseries and decorations).

Everything is original and generated in code. There are no image or audio files: scenery, characters, all 156 creatures, the UI and the chiptune music are drawn or synthesised at runtime (smooth vector shapes rendered at the screen's real resolution). The only bundled asset is the Nunito font (SIL OFL), embedded in `js/fonts.js`. No build step and no dependencies.

## Play

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`) and visit it.

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Move, navigate menus |
| `Z` / Space | A: confirm, talk, read |
| `X` / Esc / Backspace | B: cancel. Hold while walking to run |
| `C` | Throw an orb at a nearby roaming creature |
| Enter | Start menu |
| `M` | Mute |

On phones and tablets a thumbstick (drag to walk) and A, B, MENU and ORB buttons appear, and the title says *Tap A to start*.

## Test Mode

START → SETTINGS → TEST MODE, then enter the password (`abc610`; type it on a keyboard, or use the on-screen keyboard with the arrow keys and A). It offers: **Unlock Everything** (complete Dex, all three shards placed, Great Lantern lit so the Hollow Gate is open, every item at 99, lots of money), **Infinite Money**, **Infinite Items**, **Infinite PP**, **God Mode** (your creatures take no damage), **Sure Catch**, **Add Creature** (any species, Lv 5 to 100, with a live preview), and **Heal Team**. The check happens in the browser, so it is a convenience for testing, not security.

## Android APK

A tiny native shell (`android/`) wraps the game in a full-screen WebView, locked to landscape, with the on-screen pad, Back button mapped to B, autosave when the app is backgrounded, and sound paused in the background. Requires Android 7.0+ (API 24).

```
sudo apt-get install -y aapt apksigner zipalign dalvik-exchange   # one-time; plus a JDK and zip
android/build-apk.sh                                              # -> dist/wildcard.apk
```

No Gradle or Android SDK install is needed. The script compiles the activity, dexes it, links the manifest and icon with `aapt2`, aligns and signs the APK (v2/v3). To install, copy `dist/wildcard.apk` to the phone and open it (allow "install unknown apps"), or `adb install dist/wildcard.apk`.

Notes:
- A signing key is generated at `android/keystore/wildcard.p12` on first build (git-ignored). **Back it up**: updates must be signed with the same key. Override with `KS` / `KPASS`.
- The compile-time `android.jar` is downloaded from a community build of AOSP android-14 (`Reginer/aosp-android-jar`). It is only used to compile and is not shipped in the APK. Set `ANDROID_JAR` to use Google's official platform jar instead.
- This produces a sideloadable APK. Google Play needs an AAB, a newer target API and Play App Signing, which this script does not cover.
- Saves live in the WebView's localStorage, so clearing the app's storage or uninstalling deletes them.

## The game

You are a Warden-in-training in **Lanternrest**, a lantern-lit village whose Great Lantern has kept the wild creatures of the vale calm for 300 years. It is dying, and the legendary **Wildcard** that guards the vale has vanished.

1. Wake up in your cottage, meet Elder Wren at the Hearth Shrine, and wake a **Bondling** (your starter) from its hearth stone. It follows you around the map from then on. Press A facing it to talk to it.
2. The village has four roads, and you can take them in any order:
   - **West, Sunmeadow:** open grassland and the easiest region. Warden Hazel holds the Meadow Ember Shard.
   - **East, Mirewood Marsh:** boardwalks and marsh grass with bug and poison creatures. Warden Bog holds the Marsh Ember Shard. Fisher Moll has a side quest.
   - **North, the Ridge and Glimmer Mine:** the hardest region. Warden Kade holds the Mine Ember Shard.
   - **South, Tidepool Shore:** optional, with hidden items, rare creatures in the dune grass, and Moll's lost lantern.
3. Wild creatures roam the map. Bold ones notice you and give chase, shy ones scurry off, curious ones mill about. Bump into one (or press A on it) to battle, or get within a few steps and **throw an orb** at it (ORB button / `C`): the battle opens with that capture attempt, and if it breaks free you fight it. More hide in the tall grass. Weaken them and throw an orb from the BAG to catch them. Sleep and poison improve your odds. Trainers will spot you and walk up for a battle.
4. **Your homestead**: take the road north out of Lanternrest's north-east plot. You own a little cabin and the land around it; see *Homestead* below.
5. Rest for free at the Warden Lodge, store spare creatures in its PC, and shop at the Trading Post.
6. Bring all three shards to the **Great Lantern** tower and place them on the pedestals. When the Lantern relights, the **Hollow Gate** in the southeast opens, and the Wildcard, **Joker**, waits inside.

## Homestead

- **Build** (START → BUILD), grouped by HOME, CREATURES, CRAFTING, FARMING, VEHICLES and DECOR.
  - Every structure shows its cost: what you have against what you need, in green or red.
  - Placing shows a grid and a green or red ghost with the reason. Tap a tile to move the ghost, rotate with C, and place plots, fences and paths several in a row.
  - Press A on a structure to use it, **upgrade** it (with a preview of the new size, what it unlocks, the cost and any requirements), move it, rotate it or remove it. Removing refunds half.
  - Data lives in `js/structures.js`; adding a structure or a level is a data change.
- **Player House**, 4 levels: Cabin → Cottage → Family Home → Grand Homestead. Walk inside: bed (sleep to the next day and heal), kitchen (cook meals), fridge and cupboards (storage), shower or bath and toilet (energy), sofa, TV, bookshelf (recipe book), desk (ledger), wardrobe and trophies.
- **Creatures:**
  - **Nursery**: 1–3 slots that earn EXP as you walk.
  - **Barn**: creatures living there make Wool, Milk, Honey, Fertilizer, Coal, Stone, Clay, Pearls and so on every day, depending on their type.
  - **Healing Station**: 1, 3 or unlimited free heals a day, with revives from level 2.
- **Crafting:**
  - **Refinery**: timed jobs that turn wood, ore, clay, fibre, wool and wheat into planks, ingots, bricks, rope, glass, cloth and flour.
  - **Forge**: tools, parts, orbs, care items and vehicles.
  - **Kitchen**: meals.
- **Farming:**
  - Garden plots (normal, rich or a self-watering planter box), watering can, well, sprinklers and greenhouse.
  - Eight crops with growth stages. A crop withers after 3 dry days.
  - Seeds come from bushes (it depends on the region) and from seed shops.
  - **Days** advance by sleeping or after 10 minutes of play. **Energy** is spent gathering and farming, and restored by food and rest.
- **Gathering**: press A facing trees, stumps, bushes, boulders, crystals or water.
  - An **Axe** gives more wood. A **Pickaxe** unlocks ore and crystals on the Ridge and in the Mine.
  - Tiles regrow after 150 steps.
- **Your land grows with your progress**: the homestead starts as a small yard, and every Arena badge you earn (every town you open) clears more land at 1, 3, 5 and 7 badges. The Land Office board shows where you stand.
- **Enterable buildings**: the shed, nursery, barn, healing station, refinery, forge, garage and greenhouse all have a door and a furnished interior to walk into, which grow as you upgrade them.
- **Vehicles**: the **Garage** stores them, and START → TRAVEL lets you ride or get off.
  - **Bicycle**: land, not tall grass. Craft it or buy it.
  - **Scooter**: roads only. A courier quest in Lanternrest.
  - **Quad bike**: everywhere on land, including tall grass and caves. Repair the wreck on the Ridge.
  - **Motorbike** and **car**: bought at Tidewheel Motors on the Shore. The car stays on roads.
  - **Hoverboard**: crosses water. Craft it after the Lantern is lit.
  - **Helicopter**: flies between landing spots. It needs a Garage Lv3 and a Helipad.
  - Vehicles park themselves outside when you go indoors.
- **Flying**: START → TRAVEL → FLY, with an evolved Flying-type creature at Lv18+. Pick any place you've visited on the vale map.
- **Map**: START → MAP shows the whole vale, where you are, what you've visited, and the healers, shops and wardens in each region.
- **Towns**: every service has a name plate.
  - Lanternrest: General Store, Builder's Yard, Warden Lodge (healing).
  - Sunmeadow: Meadowbrook Seeds.
  - Mirewood: Bogroot Apothecary.
  - Ridge: Ridgehold Forge and a Healing Post.
  - Shore: Tidewheel Motors, Tidewheel Market and a Healing Post.
- **Orbs**: Terra (standard), Aqua, Flare, Verdant, Frost, Gale, Stone (3x on their types), Void (Ghost, Dark, Psychic and rare creatures), Pulse (strong, best on fast or fierce creatures) and Mythic (the best, 4x on legendaries).
  - Each region's shops sell the orbs that suit its creatures.
  - Throwing from the overworld picks your best orb for that creature.

Touch: tap any menu item, party card, bag row, Dex entry or on-screen keyboard key to pick it (tap outside a menu to go back); the thumbstick still works everywhere.

Features: 156 species with evolution lines (including four legendaries), 18 types with a type chart, STAB, critical hits, accuracy, stat stages, sleep/paralysis/poison/burn, Gen-3 style capture maths and escape odds, EXP and levelling with move learning (forget-a-move prompt) and evolution, whiteout and respawn, party/summary/bag/Dex/PC/shop screens, and saving to the browser's `localStorage` via START → SAVE.

## Code layout

```
index.html          page, canvas and touch controls
js/fonts.js         embedded Nunito font
js/data.js          types, moves, species, items
js/creature.js      stats, EXP, damage and capture maths (no DOM, unit-testable)
js/gfx.js           shared canvas helpers
js/terrain.js       tile flags and all scenery art: ground, water, grass, trees, buildings, ambient effects
js/sprites.js       creature and character art (vector, cached)
js/uikit.js         panels, text, menus, HP bars, badges
js/engine.js        input, audio/music, game loop, dialogue, menus, fades
js/screens.js       party, summary, bag, Dex, PC, shop, start menu
js/battle.js        battle scene, turn logic, catching, EXP, evolution
js/mapkit.js        map-building helpers
js/maps/*.js        the world: hub village, Sunmeadow, Mirewood, Ridge + Mine, Shore + Hollow
js/world.js         overworld runtime: movement, follower, roaming creatures, trainers, story, save/load
js/economy.js       item catalogue (materials, tools, seeds, crops, food) and inventory helpers (G.inv)
js/orbart.js        the ten capture orbs: art and catch bonuses
js/structures.js    every buildable structure: levels, costs, requirements, perks (data)
js/homestead.js     building framework: placement, upgrades, move/rotate/remove, land deeds, nursery, healing station, save migration
js/homeart.js       structure and crop art          js/propart.js   furniture and vehicle art
js/farm.js          days, energy, plots and crops, barn, sprinklers, greenhouse
js/craft.js         refinery, forge, kitchen, storage, house furniture
js/gather.js        gathering from trees, bushes, rocks, crystals and water
js/shops.js         every shop (G.SHOPS, G.openShop) and the shared healing screen (G.healUI)
js/vehicles.js      vehicles, garage, riding, parking, flight, helicopter, the TRAVEL menu and the vale MAP
js/build.js         the legacy base interior (old saves)
js/cheats.js        Settings and the password-gated Test Mode
js/main.js          title screen and boot
docs/CONTRACT.md    rendering model, APIs, file ownership and map contract
docs/HOMESTEAD.md   homestead systems contract: hooks, state fields, rules and numbers
tests/              logic unit tests and headless-browser playthroughs
```

To add a creature, add an `sp(...)` line in `data.js` (its look is generated from its types and `look` features). To add an area, add a file in `js/maps/` using the helpers in `js/mapkit.js` (`newMap`, `rect`, `building`, `warp`, `npc`, `trainer`) and a `<script>` tag in `index.html`.

## Tests

```
node tests/logic.test.js                       # data integrity + battle/catch maths
node tests/maps.test.js                        # map data + every NPC/item/warp is reachable on foot
npm i playwright && node tests/e2e-play.js     # headless playthrough: new game, capture, trainer, shop, save/load
node tests/e2e-extra.js                        # level-up, evolution, whiteout, boss, relight, follower, Joker capture, fuzz bot
node tests/e2e-world.js                        # roaming creatures, building outdoors, healing station, nursery EXP, legacy base, saved builds
node tests/e2e-cheats.js                       # Settings, password prompt, Test Mode options
node tests/e2e-controls.js                     # thumbstick, ORB button, touch title prompt, throwing orbs at roaming creatures
node tests/e2e-touch.js                        # tapping menus, the title and the on-screen keyboard
node tests/home-maps.test.js                   # homestead/house/shop maps: props never block exits or furniture
node tests/e2e-homestead.js                    # build menu, invalid placement, costs, upgrades, move/rotate/remove, deeds, save
node tests/e2e-farm.js                         # crops, watering, withering, sprinklers, days, energy, gathering, barn
node tests/e2e-craft.js                        # refinery jobs, forge, kitchen, storage, treats, furniture
node tests/e2e-towns.js                        # shops (D-pad and touch), selling, healing centres, homestead road
node tests/e2e-vehicles.js                     # garage, riding rules, parking, buying, flight, helicopter, quests, world map
```

The end-to-end tests drive the real game with keyboard input in headless Chromium. Set `PW` to the playwright module path, `CHROME` to a Chromium binary and `OUT` to a folder for screenshots if the defaults don't apply.
