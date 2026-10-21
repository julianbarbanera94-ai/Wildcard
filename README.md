# WILDCARD

A creature-catching RPG for the browser with the feel of the GBA-era monster-collecting games: a tile-based overworld you can roam freely, tall grass full of wild creatures, turn-based battles, capture orbs, a party of six with your lead partner walking behind you, trainers, a Lodge for healing and a Trading Post.

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
3. Weaken wild creatures and throw an orb from the BAG to catch them. Sleep and poison improve your odds. Trainers will spot you and walk up for a battle.
4. Rest for free at the Warden Lodge, store spare creatures in its PC, and shop at the Trading Post.
5. Bring all three shards to the **Great Lantern** tower and place them on the pedestals. When the Lantern relights, the **Hollow Gate** in the southeast opens, and the Wildcard, **Joker**, waits inside.

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
node tests/maps.test.js                        # map data + every NPC/item/warp is reachable on foot
npm i playwright && node tests/e2e-play.js     # headless playthrough: new game, capture, trainer, shop, save/load
node tests/e2e-extra.js                        # level-up, evolution, whiteout, boss, relight, follower, Joker capture, fuzz bot
```

The end-to-end tests drive the real game with keyboard input in headless Chromium. Set `PW` to the playwright module path, `CHROME` to a Chromium binary and `OUT` to a folder for screenshots if the defaults don't apply.
