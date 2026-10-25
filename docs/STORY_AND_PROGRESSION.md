# WILDCARD: Story, Quests and Progression Guide

Build 3.39.x. This guide is checked against the game by `tests/e2e-guide.js` (see the appendix). Everything in this document was read from the game's own code and data (the quest definitions, the gate rules, the
arena and map data), not from the old design drafts. Where the game differs from `docs/STORY_DESIGN.md`, this document is right.

Contents

1. [The story in one page](#1-the-story-in-one-page)
2. [How progress works](#2-how-progress-works)
3. [The world and its gates](#3-the-world-and-its-gates)
4. [Systems that move you forward](#4-systems-that-move-you-forward)
5. [Difficulty curve](#5-difficulty-curve)
6. [Start-to-finish walkthrough](#6-start-to-finish-walkthrough)
7. [Optional quests](#7-optional-quests)
8. [Everything at a glance](#8-everything-at-a-glance)
9. [Known inconsistencies and open decisions](#9-known-inconsistencies-and-open-decisions)
10. [Appendix: flags, files and tests](#10-appendix-flags-files-and-tests)

---

## 1. The story in one page

**Setting.** Aurelis, a vale watched over by the Great Lantern in the village of Lanternrest. For three hundred years the Lantern's
flame kept the wild creatures calm. Now it is dying, and the **Wildcard** (the creature called Joker, the one that guards the vale)
has vanished. Lantern Night is almost here.

**You** are a young Warden-in-training. Your grandfather **Orrin** lives with you; **Elder Wren** keeps the Hearth Shrine.

**The Lantern** is fed by three **Ember Shards**. Each was held by a Warden (Hazel of the Meadow, Bog of the Marsh, Kade of the
Mine), but the shards are no longer where those Wardens left them: a shard goes only to someone it trusts.

| Shard | Where it is now | Who holds it | How you get it |
| --- | --- | --- | --- |
| Meadow | Evergreen Forest | a Florelle, the forest guardian | relight the Elder Oak's lantern, then earn its trust (Chapter 2) |
| Marsh | the drowned shrine at Tidefall | nobody (washed downriver) | beat Sable, then dive with a Water creature (Chapter 4) |
| Mine | the Aurora Isles | a Glacitan (the Ashen Wardens stole it from Kade) | reach Aurora with Tam beside you, earn its trust (Chapter 6) |

**The villain** is **Vesper**, once a Warden and now the leader of the **Ashen Wardens** (grey cloaks). Vesper believes creatures stay
safe only if they are kept still through fear. The Ashen Wardens are draining "calm" out of every town into a machine under Emberfall,
so that the Wildcard can be bound to the Lantern forever. Vesper is not a cartoon villain: they are right that the vale is in danger and
wrong about the cure. Their lieutenants are **Mordant** and **Sable**.

**The rival** is **Tam**, who trained at the same hearth. Tam starts out half-believing Vesper, doubts them after Verdant Isle, turns on
them in the north, and becomes a Warden at the end.

**The theme** is trust against control. Almost every guardian is won by *calming* it, not fighting it (a small "trust" mini-game),
and the finale lets you choose how to meet the Wildcard: **Trust**, **Strength** or **Balance**.

**The spine** (eight chapters, one per region, each ending in a badge and a reward):

| | Chapter | Where | What you do | You get |
| --- | --- | --- | --- | --- |
| P | Prologue | Lanternrest | wake a Bondling, meet Tam | the Warden's Lamp |
| 1 | First Light | Stonebridge | stop the Ashen Wardens, calm a Cairnwight | Keystone Badge, $2,000 |
| 2 | The Green Hush | Evergreen, Sunhaven | relight the Elder Oak, win the Meadow shard, beat Mordant | Bloom Badge, Meadow shard, rowboat, $3,000 |
| 3 | Tides and Winds | Driftwood, Verdant Isle | relight the lighthouse, drive off the Ashen sailors with Tam | Gale Badge, motorboat, $4,000 |
| 4 | The Quiet Water | Lakeside, Tidefall | recover the Tide Stone, beat Sable, dive for the Marsh shard | Tide Badge, Marsh shard, sailboat, $5,000 |
| 5 | Dust and Thunder | Sandsreach, Cobalt, the Badlands | shut down two siphon machines, find the valve | Dune and Circuit Badges, a Skyrant, $6,000 |
| 6 | Cold Resolve | Glacier Pass, Frostmere, Aurora | Tam turns; win the Mine shard | Rime Badge, Mine shard, $7,000 |
| 7 | Fire at the Heart | Emberfall | break Vesper's machine under the volcano | $8,000 (Magma Badge from Pyrra's arena) |
| 8 | The Great Lantern | Cloudpeak, Lanternrest | beat Vesper in three stages, relight the Lantern | $10,000 |
| F | The Wildcard | Starlit Hollow | choose Trust, Strength or Balance | the Wildcard, $20,000, the epilogue |

---

## 2. How progress works

### 2.1 Quests are data, and every step reads saved state

A quest is a record: id, category, title, giver, description, a list of **steps**, and a reward. Each step has a test that reads the
save (`done(S)`), a location (`at`) and sometimes a counter. Because steps read the save instead of a running script:

- doing things early, late or out of order is fine: finished steps are skipped the moment the quest starts;
- old saves stay valid;
- the journal and the HUD tracker are always right.

The journal groups quests as **STORY** (main), **QUESTS** (side), **FINDS** (discovery), **PEOPLE**, **CREATURES** (research) and
**HOME**. The HUD's quest tracker shows the highest-priority active **main** quest's current step (and a count such as 1/2), and tapping
it opens the journal. Completing a quest pays its reward and shows a toast; many also record an **outcome** line that the epilogue
repeats.

### 2.2 The chapter chain

Chapters are quests that start when the previous one is **done**:

```
ch1 starts when Tam's scene ends (prologue)
ch2 starts when ch1 is done      (ch1's last step is "Tell Elder Wren what happened")
ch3 starts when ch2 is done
ch4 starts when ch3 is done
ch5 starts when ch4 is done
ch6 starts when ch5 is done
ch7 starts when ch6 is done
ch8 starts when ch7 is done
finale starts when ch8 is done (or the Lantern is lit and ch7 is done)
```

Each chapter has an Elder Wren line when it becomes active (talk to Wren to hear it). Scenes in the world check the chapter state: for
example the Verdant fight and Tam's scene only exist while Chapter 3 is active, and Vesper's three-stage fight only exists while
Chapter 8 is active.

### 2.3 What can stop you: the gates (the key rule)

**A place opens only when you have BOTH the Arena Badges it needs AND have finished the story chapter before it.** Where no gym on
the way gives a badge (the start of the game, a town or island without an Arena) the finished chapter is what lets you through, so
there is always a way forward.

Nothing else opens a gate. In particular:

- **No permit.** The ranger no longer sells travel permits, and an old `permit_*` flag from an older save does nothing.
- **Reputation does not open gates** (it still matters for other things, see 4.4).
- **Vehicles, boats, ferries and the helicopter all use the same rule.** Harbour gates on the sea, ferry desks, flying with a creature
  and the map's travel screen all call the same access check. Money and a fleet of vehicles still cannot take you past the story.
- A place you have **already visited stays open** (so older saves, and going back, still work).
- Test Mode's FLY ANYWHERE opens everything (a developer tool).
- The Hollow Gate is also sealed until the Great Lantern is lit.

A refused entrance names what is missing: the chapter to finish first, or the badges you lack ("X needs 3 Arena Badges (you have 2)").

The table is in 3.1. It is checked by `tests/e2e-access.js`, which finishes the chapters one at a time with every reputation at 100
and $999,999 and confirms each chapter opens exactly the next places and no others.

### 2.4 Arena badges

Eight Arenas, each with a gym puzzle, three gym trainers and a Leader. The Leader gives the badge and prize money, and a
reputation boost (+20 in its region). **Badges can be earned in any order that the gates allow, and Leaders scale to match**: the
*k*-th Leader you face fights at the strength of the *k*-th Arena, whichever city it is, and the Arena's trainers shift the same way.
So there is never a Leader that is too weak or far too strong just because you went to a city early or late.

| # (by strength) | Badge | City | Type | Leader | Team (levels) |
| --- | --- | --- | --- | --- | --- |
| 1 | Keystone | Stonebridge | Rock | Mason | Pebblit 12, Prismel 13, Stalabat 14, Boulderon 15 |
| 2 | Bloom | Sunhaven | Grass | Ferna | Dandrop 16, Burrkin 17, Lotoad 18, Zephbloom 19 |
| 3 | Tide | Lakeside | Water | Marlo | Glimfin 20, Dewsnail 21, Gullet 22, Brinecrab 22, Reefotter 23 |
| 4 | Gale | Driftwood | Flying | Zephyra | Skyrant 24, Grottowing 25, Mallarch 25, Zaphron 26, Zephbloom 27 |
| 5 | Dune | Sandsreach | Ground | Osha | Drillmail 28, Scythetail 29, Magmaw 29, Gunkroak 30, Bulwarmor 31 |
| 6 | Circuit | Cobalt City | Electric | Rayne | Voltaro 32, Currenel 33, Stormedusa 33, Gearhulk 34, Zaphron 34, Tempestel 35 |
| 7 | Rime | Frostmere | Ice | Isolde | Rimeroar 37, Floeseal 37, Aurowl 38, Tuxfrost 38, Sleetcoil 39, Glacimaul 40 |
| 8 | Magma | Emberfall | Fire | Pyrra | Calderon 42, Coalbruin 43, Volcashell 43, Kettlegeist 43, Infernox 44, Anvilord 45 |

(The numbers are each Leader's *base* team. In the story the chapters earn them in this order: Keystone, Bloom, Gale, Tide, Dune and
Circuit, Rime, Magma; the scaling makes the order irrelevant.)

Gym trainers (three per Arena, a little weaker than the Leader): Stonebridge Flint, Greta, Pip (Lv 10-11); Sunhaven Daisy, Moss, Ivy
(13-15); Lakeside Reef, Splash, Coral (17-19); Driftwood Kite, Wren, Talon (21-22); Sandsreach Dusty, Scarab, Tamarisk (25-26);
Cobalt Watt, Ohm, Bolt (28-30); Frostmere Frost, Flurry, Sleet (33-35); Emberfall Cinder, Slag, Ember (38-41). Each Arena has a
different movement puzzle (hopping pools, feather bridges, sand pits, three switches, crystal halls, lava paths).

### 2.5 Reputation, progress points and the Balance score

Five regions keep a reputation from 0 to 100: **WEST** (Sunmeadow, Sunhaven, Evergreen, Driftwood, Verdant), **SOUTH** (Stonebridge,
Mirewood, Whispering Woods, Tidepool, Tidefall, Moonlit), **NORTH** (the Ridge, Lakeside, Cloudpeak, Glacier Pass, Frostmere, Aurora),
**EAST** (Sandsreach, Badlands, Emberfall, Cobalt) and **LANTERNREST** (the village and your homestead). Tiers: 15 KNOWN, 40 FRIEND,
70 TRUSTED, 100 HERO. **What it gives:** the region's shops sell items 5% cheaper at FRIEND, 10% at TRUSTED and 15% at HERO
(the tier-up message and the journal's REP tab say so; vehicles are not discounted), and all reputation together counts toward homestead
deeds (section 4).

You earn it from: each trainer you beat (+2, once), each new species caught (+1 in the region you are in), each badge (+20 in its
region), each shard (+15), every chapter and side quest reward, and the choices in side quests (some give negative reputation).

Reputation no longer opens gates. It still does three things:

1. **Progress points** = badges + (total reputation / 80, rounded down). These grow your **homestead** (see 4.5).
2. **The finale's Balance option** needs a Balance score of at least 5 = (total reputation / 100, rounded down) + the number of
   finished non-main quests.
3. It is shown in the journal and in the ranger's refusal messages.

### 2.6 Shards, the Lantern and the Hollow Gate

`shard_meadow`, `shard_marsh` and `shard_mine` are flags set when you win each shard. The tower in Lanternrest has three pedestals
(Meadow, Mine, Marsh). Place a shard on its pedestal; when all three are placed the Lantern blazes (`lanternLit`), every creature
howls with joy, and the archway of the **Starlit Hollow** (southeast of Lanternrest) opens. The Lantern being lit also unlocks the
Hoverboard recipe and the Helicopter.

### 2.7 Losing, healing and respawning

- A normal battle loss **halves your money**, fully heals your team and sends you back to the **Warden Lodge** (if you last healed there)
  or to your **cottage**.
- A **story battle** (Tam, Vesper, the rival fights, the Wildcard) never sends you home: you are only healed, so the story is never lost.
  Tam's first fight is fine to lose; the story goes on either way.
- Healing is free at the Warden Lodge nurse and town Healing Centres, and at Orrin in your cottage.
- Trainers see you down their line of sight (from 3 to 5 tiles) and walk up to battle. A trainer you have beaten stays beaten.

---

## 3. The world and its gates

### 3.1 Every locked place (the full gate table)

"Chapter" means the chapter that must be **finished** first. A place also needs the listed number of badges, **and** you can only
enter by the listed exits (or by boat or ferry where noted).

| Place | Badges | Chapter finished | Reached from |
| --- | --- | --- | --- |
| Evergreen Forest | 1 | 1 | Sunmeadow (N), Sunhaven (N), Cloudpeak (W) |
| Whispering Woods | 1 | 1 | Stonebridge (E), Sandsreach (S), Cobalt (W) |
| Driftwood Port | 2 | 2 | Sunhaven (S), Mirewood (W) |
| Verdant Isle | 3 | 2 | by sea: your own boat, or the ferry from Driftwood |
| Lakeside Town | 0 | 3 | the Ridge (E), Glacier Pass (W) |
| Tidefall Islands | 3 | 3 | Mirewood (S), or by sea (boat, or the ferry from Driftwood) |
| Sandsreach Desert | 2 | 4 | Lanternrest (E), Whispering Woods (N), Cobalt (N), Badlands (W) |
| Cobalt City | 4 | 4 | Whispering Woods (E), Sandsreach (E) |
| Crimson Badlands | 4 | 4 | Sandsreach (E), Emberfall (S) |
| Glacier Pass | 5 | 5 | Lakeside (E), Cloudpeak (E), Emberfall (W), Frostmere (W) |
| Frostmere City | 5 | 5 | Glacier Pass (E) |
| Aurora Isles | 7 | 5 | by sea only: your own boat, or the ferry from Frostmere |
| Emberfall Volcano | 6 | 6 | Badlands (N), Glacier Pass (S) |
| Cloudpeak Mountains | 3 | 7 | the Ridge (N), Evergreen (E), Glacier Pass (W) |
| Moonlit Island | 8 | 8 | by sea: your own boat, or the ferry from Cobalt or the Shore |
| Starlit Hollow | the Lantern lit | | Lanternrest (southeast archway) |

Every harbour on the open sea follows the same rule as the road to that place, so a boat cannot reach a place the roads would refuse.

**Open from the first minute:** Lanternrest (and its cottage, Hearth Shrine, Warden Lodge, tower and post), your Homestead, Sunmeadow,
Sunhaven, Mirewood Marsh, Stonebridge, Tidepool Shore and the Ridge (with the Glimmer Mine).

### 3.2 How the places connect

```
                          Cloudpeak (ch7)
                          /     |     \
                  Evergreen    Ridge     Glacier -- Frostmere ~~ferry~~ Aurora
                  (ch1)       /  |  \     (ch5)      (ch5)       (ch5, 7 badges)
                      |      /   |   \      |
   Sunhaven -- Sunmeadow   Lakeside |   Lanternrest -- Hollow (Lantern)
   (open)      (open)      (ch3)    |   /   |   \
      |            |                |  /    |    \
  Driftwood     Mirewood ---------- Stonebridge   Sandsreach -- Cobalt
   (ch2)        (open)   \           (open)        (ch4)        (ch4)
      ~~ferry~~   |       \              |    \       |
   Verdant      Tidefall   Shore       Whispering --- Badlands -- Emberfall
   (ch2)        (ch3)     (open)         (ch1)         (ch4)       (ch6)
```

(Schematic only: the real exits are in the table above. The sea, "Aurelian Sea", connects every harbour; each harbour uses the same
gate rule as the road to it.)

### 3.3 The size of the world

24 places, each 40 to 76 tiles wide (a tile is 16 pixels), 36 land routes, 5 ferry lines, and an open sea of 192 by 128 tiles with seven small outer islands (each with a treasure cache). Travel is paced to that size: walking is 1 pixel a frame (16 frames a tile), running 1.5, light land vehicles 1.75 to 2.75, boats 1.25 to 2, ferries 8 to 15 seconds and flights 4 to 8. Four wild roads (36 to 56 tiles long, a 15 to 26 second walk each) now lie where towns used to open straight into each other: Stonebridge Road (Lanternrest to Stonebridge), Coast Road (Sunhaven to Driftwood), Cobalt Flats (Cobalt to Sandsreach) and Frostmere Approach (Frostmere to Glacier Pass); see docs/WORLD.md section 7c. A road is free to walk onto; the gate of the place at its far end stops you there.

---

## 4. Systems that move you forward

### 4.1 Creatures: catching, trust, levelling

- **Catching:** weaken a wild creature, then throw an **orb** from the bag (the orb button on touch, `C` on a keyboard). Better orbs
  catch better: Terra $200 (x1), Aqua / Flare / Verdant / Frost / Gale / Stone $450 (x1, type-matched), Void $700, Pulse $600 (x1.5),
  Mythic $2,000 (x2). Sleep and poison help.
- **Trust (calming):** for guardians and some wild creatures. Each round the creature shows a mood and you pick a response (STEP
  CLOSER, STAY STILL, OFFER FOOD, SPEAK SOFTLY); three right answers win its trust, two wrong ones scare it off (try again later).
  It joins you (party of six, extras go to the PC box).
- **Levelling:** experience from battles, evolution at set levels, treats from the homestead. Experience needed is level cubed.
- **Field abilities:** CLIMB, LIGHT and DIG (4.7).

### 4.2 The rival and the guardians (story encounters)

| Encounter | Where | How it ends |
| --- | --- | --- |
| Tam (prologue) | outside the Hearth Shrine | story battle, Tam's Bondling is the one strong against yours (Lv 5); losing is fine |
| Cairnwight (Chapter 1) | Stonebridge, by the river (44,38) | trust mini-game; it joins you at Lv 12 (+10 SOUTH) |
| Florelle (Chapter 2) | Evergreen (26,18), after the Oak is lit | trust; it gives the Meadow shard |
| Skiff + Tam (Chapter 3) | Verdant Isle | battle Skiff; Tam's scene starts by itself afterwards |
| Sable (Chapter 4) | Tidefall (10,34) | battle; she guards the shrine |
| Glacitan (Chapter 6) | Aurora (22,19), only after you found Tam | trust; it gives the Mine shard |
| Vesper (Chapter 8) | Cloudpeak castle (32,9) | three battle stages in a row |
| the Wildcard (finale) | Starlit Hollow (19,5) | Trust, Strength or Balance |

### 4.3 Vehicles and travel

Vehicles do not bypass the story gates; they make travel faster and open some places on the map.

| Vehicle | Where it goes | How you get it |
| --- | --- | --- |
| Bicycle | land except tall grass, marsh, caves | craft at a Forge (tier 2), or $4,000 at Tidewheel Motors |
| Scooter | roads only | the courier kid in Lanternrest: 3 Carrots + 2 Turnips |
| Quad Bike | all land, halves wild encounters | repair the broken quad on the Ridge: 1 Engine Part + 2 Wheels |
| Motorbike | land and cave floors | $15,000 at Tidewheel Motors, once you hold an Ember Shard |
| Car | roads only | $30,000 at Tidewheel Motors; needs a Double Garage and 2 shards |
| Hoverboard | all land and water, no wild encounters | craft at a Master Forge (tier 3) after the Lantern is lit |
| Rowboat | water | Chapter 2 reward; or craft (tier 1) or $1,500 at Tidewheel Motors |
| Motorboat | water, fast | Chapter 3 reward; or craft (tier 2) or $9,000 |
| Sailboat | water | Chapter 4 reward; or craft at a Master Forge |
| Helicopter | flies between visited landing spots | $80,000 after the Lantern is lit; needs Garage Lv3 and a Helipad |

The **bicycle, scooter and hoverboard are light vehicles**: they go wherever you go, with no Garage needed. Bigger vehicles are kept
in the Garage on your homestead. The ride chip on the HUD (or the `V` key) gets on or off your equipped vehicle in one tap.

**Ferries** (Driftwood to Verdant and Tidefall, Frostmere to Aurora, Cobalt and the Shore to Moonlit) cost a ticket ($450-$500 for the
ones I checked) or are free if you own a boat; they follow the same gate rule as roads.

**Flying with a creature** (a Flying type that has evolved, Lv 18 or higher, not fainted) takes you to places you have **already
visited** that have a landing spot, and again only to places the gates allow. The Chapter 5 reward Skyrant (Lv 30) can carry you.

### 4.4 Quests, reputation and the journal

Described in 2.1 and 2.5. The Journal also tracks the discovery quests: **Map of Aurelis** (visit 6, 12, then all places), **Field Notes**
(catch 10, 50, 100 kinds), **Off the Beaten Path** (find hidden spots with CLIMB, LIGHT and DIG), **A Place of My Own** (grow the
homestead), and **Arena Challenge** (1, 4, then all 8 badges).

### 4.5 The homestead (farm, crafting and building)

Your land grows with progress points (badges + reputation/80), in five **deeds**:

| Deed | Name | Progress points needed |
| --- | --- | --- |
| 1 | Starter plot | 0 |
| 2 | Home lot | 1 |
| 3 | Country lot | 3 |
| 4 | Grand estate | 5 |
| 5 | The whole valley | 7 |

- **Day and energy:** a day is 36,000 frames (10 minutes of play). Sleeping in a bed starts the next morning, refills energy and heals
  the team. Gathering costs 2 energy, watering 1, harvesting 1. At 0 energy you cannot do those until you eat or sleep. Energy never
  blocks walking or battles.
- **Crops** (turnip, carrot, wheat, tomato, pepper, glowcap, pumpkin, starmelon) grow over 3 to 9 watered days; a plot not watered for
  3 days in a row withers.
- **Gathering** from trees, bushes, boulders, crystals and mushroom beds gives Wood, Fiber, Stone, ores, Crystal Shards and Glowcap
  Spores; each tile regrows after 150 steps.
- **Crafting:** the Refinery (planks, rope, brick, ingots, glass, cloth, flour), the Forge (tools, parts, orbs, vehicles; recipes
  unlock by tier), the Kitchen (meals for energy) and treats for creatures.
- **Structures:** house (four levels), barn (creatures produce goods), garage, helipad, sheds, sprinklers, greenhouse and more, each with
  levels, costs and requirements (shards, the Lantern lit, other structures, a deed).
- **Shops:** Lanternrest General Store, Builder's Yard, Meadowbrook Seeds (Sunmeadow), Bogroot Apothecary (Mirewood), Ridgehold Forge
  (the Ridge), Tidewheel Motors and Market (Shore), and a department store or provisions shop in most cities (Sunhaven, Driftwood,
  Stonebridge, Tidefall, Lakeside, Frostmere, Sandsreach, Emberfall, Cobalt). Orb types and healing items sold depend on the city.
- Full numbers: `docs/HOMESTEAD.md`.

### 4.6 Caves

Every cave mouth on a cliff leads somewhere. The small caves are short side rooms; five large caves are 40 by 32 tiles with a puzzle or
reward:

| Cave | Entrance | What is in it |
| --- | --- | --- |
| Glimmer Mine | the Ridge, north | Kade, Rhea, Flint; a central cavern, west and east grottoes, two pools with bridges; island Aqua Orb; hidden nook (Pulse Orb x3); the guardian dais |
| Emberfall Tunnels | Emberfall cave mouth | lava, an ore face, a hot chamber, stepping stones to an island (Mythic Orb) |
| Frostmere Grotto | cave mouth on Glacier Pass | an ice switch raises walkways across both lakes (Frost Orb relic, Mythic Orb) |
| The Hollow Ruins | a Badlands cave mouth | three rune stones in the order east, west, south open the rune gate to the Warden altar (2 Mythic Orb, 3 Void Orb); a LIGHT nook hides a sanctum |
| The Living Grotto | another Badlands cave mouth | glowing mushrooms give Glowcap Spores; 3 at the shrine call down Starveil; a LIGHT nook hides a rootway |

Caves are reached through the same gates as the area they are in, so they respect the story order.

### 4.7 Field abilities and hidden spots

| Ability | Needs | Or the tool |
| --- | --- | --- |
| CLIMB | a Rock, Ground or Fighting creature, Lv 8 or higher | Climbing Gear (Mason gives one; or craft: 4 Rope + 1 Iron Ingot) |
| LIGHT | a Fire or Electric creature, Lv 8 or higher | the Warden's Lamp (Wren gives it), or a Glow Lamp |
| DIG | a Ground, Bug or Rock creature, Lv 8 or higher | a Shovel (craft: 3 Wood + 1 Iron Ingot) |

15 hidden spots (7 reached by CLIMB or LIGHT behind an obstacle, 8 dig spots) hold items and money, listed in the **Off the Beaten
Path** quest. The Elder Oak lantern (Chapter 2) and the Grimsby lighthouse (Chapter 3) both need a LIGHT helper; the Warden's Lamp
always works.

### 4.8 Controls and settings

Touch pad, keyboard or a game controller (Backbone One and others); the pad hides what does nothing in the current context. See
`docs/CONTROLS.md` and `docs/CONTROLLER.md`. Settings hold HUD toggles, text speed, accessibility and control preferences.

---

## 5. Difficulty curve

Everything gets harder as you go, in three independent ways.

**Leaders and gym trainers** scale to the number of badges you hold (2.4): 12-15, 16-19, 20-23, 24-27, 28-31, 32-35, 37-40, 42-45.

**Wild creatures** by place:

| Place | Wild levels | Place | Wild levels |
| --- | --- | --- | --- |
| Sunmeadow | 3-9 | Cloudpeak | 26-32 |
| Shore | 4-16 | Badlands | 30-36 |
| Mirewood, the Ridge | 5-16 | Glacier Pass | 32-38 |
| Evergreen | 14-20 | Emberfall | 38-44 |
| Whispering Woods | 16-22 | Moonlit | 45-52 |
| Driftwood | 18-24 | Aurora | 48-55 |
| Verdant, Sandsreach | 22-28 | | |
| Tidefall | 24-30 | | |

The world map shows a "tough" warning when a place is well above your team.

**Story trainers** (the Ashen Wardens and bosses):

| Chapter | Who | Team |
| --- | --- | --- |
| 1 | Corvin, Sable (Stonebridge) | Venomite 7 + Bandibit 7; Gloomoth 7 + Pilfet 8 |
| 2 | Mordant (Evergreen) | Gloomoth 16, Masquiff 17, Venomite 18 |
| 3 | Skiff (Verdant) | Brinecrab 20, Gloomoth 21, Bandibit 22 |
| 4 | Bracken (Lakeside), Sable (Tidefall) | Glimfin 21, Gloomoth 22, Venomite 23; Gloomoth 24, Pilfet 24, Gullet 25, Venomite 26 |
| 5 | Dunmore (Sandsreach), Volta (Cobalt) | Drillmail 30, Gloomoth 31, Venomite 32; Currenel 31, Bandibit 32, Venomite 32 |
| 7 | Cindra (Emberfall) | Calderon 42, Volcashell 43, Gloomoth 43, Venomite 44 |
| 8 | Vesper, stage 1 / 2 / 3 | each creature is your top level minus 4 (at least 30) plus 3 to 8. Stage 1: Gloomoth, Masquiff, Venomite. Stage 2: Grottowing, Prismantle, Snowhoot. Stage 3: Infernox, Anvilord, Glacimaul, Oraclowl |
| F | the Wildcard (Strength) | your top level + 2 (at least 40) |

**Length** (the number of written steps per chapter): 5, 5, 5, 6, 6, 7, 6, 4. The middle and later chapters are the longest, and they
also contain more fights per step (Chapter 5 is two towns, Chapter 8 is three Vesper stages) and cover larger distances. The new steps
in Chapters 5 to 8 are in `js/chapters_more.js` (tested by `tests/e2e-chapters.js`).

---

## 6. Start-to-finish walkthrough

Coordinates are tile positions `(x, y)` on that map. Recommended team levels are the enemy levels you will meet; being a couple of
levels above is comfortable. The first thing to do in every town is to heal and look at the shop.

### Part 0: The opening (Lanternrest)

You begin in **YOUR COTTAGE** with **$3,000**.

1. Talk to **Orrin** (3,3). He tells you about the dimming Lantern and the vanished Wildcard and gives you a **Potion**. (Talk to him
   again any time: he heals your team.)
2. Go outside into **Lanternrest** and enter the **Hearth Shrine** (door at 39,6).
3. Talk to **Elder Wren** (5,5). She explains the Lantern, the three shards and the Wardens.
4. Three sleeping Bondlings sit on hearth stones at (3,3), (5,3) and (7,3):
   - **Embrit** (Fire), **Splashling** (Water), **Sproutle** (Grass).
   Choose one: it wakes and becomes your partner.
5. Talk to Wren again. She gives advice (how to catch creatures with orbs, how the roads open as you earn Badges and finish what each
   town asks) and **5 Terra Orbs**. This sets the flag that lets Tam appear.

### Prologue: Tam and the Warden's Lamp

Step outside the shrine toward (39,9). **Tam** runs up: "Hey! Wait up!" Tam picks the Bondling that is strong against yours
(Embrit gets Splashling, Splashling gets Sproutle, Sproutle gets Embrit), at Lv 5, and challenges you. Win or lose, the story goes on
(a loss is just a different line). Tam mentions that Vesper's **Ashen Wardens** are heading to Stonebridge.

**Elder Wren** gives you the **Warden's Lamp**. It lights dark places and, it says, leans toward the shards. **Chapter 1 begins.**

**Before you leave (optional):** the Lanternrest General Store sells orbs and medicine; the Warden Lodge nurse heals and makes the Lodge
your respawn point; the Trading Post and several residents start side quests (section 7). Sunmeadow to the west is a gentle place to gain
your first levels (wild 3-9) and Hazel, the Meadow Warden, is there.

### Chapter 1: First Light (Stonebridge)

*Goal:* find out what the Ashen Wardens want. *Recommended level:* about 10-15 (Mason's team is Lv 12-15).

Route: Lanternrest, south exit, **Stonebridge** (open).

1. **Stop the Ashen Wardens** near the Arena: **Corvin** (45,18) and **Sable** (50,20), who see you from 3 tiles away. Their teams are Lv 7-8.
   They do not appear until Tam's scene is done.
2. When both are beaten, you step into the open and a cold voice speaks from the bridge: **Vesper**, in person for the first time.
   Vesper says fear keeps creatures still, that when they hold the Wildcard the vale will be calm forever, and that their Wardens
   frightened a Cairnwight by the river: "See if your kindness can do anything with it."
3. **Calm the Cairnwight** at (44,38), by the river: a trust mini-game. Pick the right response to each mood three times. It joins
   you at Lv 12 and Stonebridge thanks you (+10 SOUTH).
4. **Win Mason's Keystone Badge** at the Stonebridge Arena. Mason then asks whether your partner is still standing: give you **Climbing
   Gear** and, if it is, **3 Super Potions**.
5. **Return to Lanternrest and tell Elder Wren.** She remembers Vesper ("a gifted Warden, and a frightened one"), says the Lamp is
   warmer, and sends you to find the Wardens of the Meadow, the Marsh and the Mine.

*Reward:* $2,000, +15 SOUTH, +10 LANTERNREST. **Opens:** Evergreen Forest and Whispering Woods (1 badge). Chapter 2 starts.

### Chapter 2: The Green Hush (Sunmeadow, Evergreen, Sunhaven)

*Goal:* the forest has gone silent. *Recommended level:* 16-20 (Mordant is 16-18, Ferna 16-19).

Route: Lanternrest, west to **Sunmeadow**; Evergreen is north of Sunmeadow, Sunhaven is west.

1. **Battle Hazel**, the Meadow Warden, in Sunmeadow (3,20). Her team is Lv 7-8. She says the Meadow shard is no longer hers: when the
   forest went silent its guardian carried it deep into Evergreen, and lighting the Elder Oak may bring it out.
2. In **Evergreen**, **relight the lantern by the Elder Oak** at (29,16) (press A on it). You need a LIGHT helper: a Fire or Electric
   creature Lv 8+, or simply the Warden's Lamp. Birdsong returns.
3. A **Florelle** appears at (26,18) holding something that glows. Calm it (trust). It opens its petals and gives you the **Meadow Ember
   Shard** (+10 WEST).
4. Once you hold the shard, a scene starts by itself while you are in Evergreen: **Vesper** (32,22) says kindness is not enough and sends **Mordant** (34,22). **Beat
   Mordant** (Gloomoth 16, Masquiff 17, Venomite 18).
5. In **Sunhaven**, win **Ferna's Bloom Badge** at the Arena.

*Reward:* $3,000, +15 WEST, a **rowboat**, the Meadow shard. **Opens:** Driftwood Port (2 badges). A first boat appears in your garage.

### Chapter 3: Tides and Winds (Driftwood, Verdant Isle)

*Goal:* the lighthouse is dark and Ashen boats are on the water. *Recommended level:* 20-27 (Zephyra 24-27, Skiff 20-22).

Route: Sunhaven, south exit, **Driftwood Port**.

1. **Travel to Driftwood Port.** (Each time a chapter starts, Elder Wren at the Hearth Shrine has a new line: for this one, "Keep an eye on Tam. That one is torn.")
2. **Relight Grimsby's lighthouse** at (6,7) (a LIGHT helper again). Grimsby cheers from below (+5 WEST).
3. **Win Zephyra's Gale Badge** at the Driftwood Arena.
4. **Sail to Verdant Isle** by boat (you own a rowboat) or by the Driftwood ferry ($500). Verdant opens once you have 3 badges.
5. **Drive off the Ashen sailors** on the island: **Skiff** (20,24), Lv 20-22. Tam shows up on the beach and takes the other one.
   Afterwards **Tam** (18,26) speaks: the creatures were not calm, they were terrified. "I don't know what to think any more."

*Reward:* $4,000, +20 WEST, a **motorboat**. **Opens:** Lakeside (the Ridge, east) and Tidefall (3 badges).

### Chapter 4: The Quiet Water (Lakeside, Tidefall)

*Goal:* the lake is draining; the Marsh shard is in a drowned shrine. *Recommended level:* 20-27. **You need a Water-type creature Lv 15
or higher to dive**: if you have none, catch one first (the Shore and Mirewood have Water creatures).

Route: from Lanternrest go north to the **Ridge**, then east to **Lakeside**. Tidefall is south of Mirewood.

1. **Travel to Lakeside.** At the empty plinth (46,7) fresh scratches and grey footprints lead east.
2. **Catch the thief:** **Bracken** (50,10), Lv 21-23. Beating him hands over the **Tide Stone**.
3. **Put the Tide Stone back** on its plinth (46,7). The lake fills (+10 NORTH).
4. **Win Marlo's Tide Badge** at the Lakeside Arena.
5. **Race to Tidefall** (Mirewood south exit, or ferry from Driftwood): **Sable** (10,34), Lv 24-26, guards the shrine.
6. **Dive into the drowned shrine** (8,33) holding a Water creature (Lv 15+): you reach the **Marsh Ember Shard** (+10 SOUTH).

*Reward:* $5,000, +15 NORTH, +15 SOUTH, a **sailboat**, the Marsh shard. **Opens:** Sandsreach, Cobalt City and the Crimson Badlands
(chapter 4 done; badges 2 and 4).

### Chapter 5: Dust and Thunder (Sandsreach, Cobalt City, the Badlands)

*Goal:* Ashen machines are siphoning the calm from two towns. *Recommended level:* 28-35 (Osha 28-31, Rayne 32-35).

Route: Lanternrest, east exit, **Sandsreach**; **Cobalt** is east of Sandsreach (or through Whispering Woods).

1. **Help one town first** (your choice): in each town an **Ashen Warden guards a siphon machine**.
   - Sandsreach: **Dunmore** (37,24) and the machine at (31,24).
   - Cobalt: **Volta** (39,28) and the machine at (33,26).
   Beat the guard, then use the machine and choose SHUT IT DOWN. The first town you help gives +20 reputation and the leader says "You came
   to us first"; the second gives +10 ("You got here in the end").
2. **Help the other town too.** When both are off, a message says both pipes run east to the Badlands.
3. **Stop the Ashen courier on Cobalt Flats** (the wild road out of Cobalt's north gate). **Skarl**, Ashen Courier, Lv 27-29, appears once
   a siphon is shut. He is carrying orders to the Badlands.
4. **Read the map he dropped** (beside where he stood): red lines from both towns to one valve in the Badlands, "then north, to the volcano".
5. **Follow the pipes into the Crimson Badlands** and find the great **iron valve** (46,20). A torn page in its wheel reads that "the calm
   of a hundred towns" is gathered under Emberfall so the Wildcard can be bound to the Lantern forever. (This is the plot reveal.)
6. **Win Osha's Dune Badge** (Sandsreach Arena) **and Rayne's Circuit Badge** (Cobalt Arena).

*Reward:* $6,000, +20 EAST, **a Skyrant (Lv 30) that can carry you** (flight). **Opens:** Glacier Pass and Frostmere (5 badges).
The siphon you helped first is remembered in the epilogue.

### Chapter 6: Cold Resolve (Glacier Pass, Frostmere, the Aurora Isles)

*Goal:* the Mine shard was stolen and taken north. *Recommended level:* 33-40 (Isolde 37-40).

Route: from Lakeside go east to **Glacier Pass**; **Frostmere** is east of the Pass; the ferry to Aurora leaves from Frostmere.

1. **Cross Glacier Pass.**
2. **Find Tam** at (30,23). Tam went back to Vesper after Verdant and saw the machine: creatures in cages, too quiet to cry. Tam is done
   with Vesper and asks to come with you.
3. **Hear out the stranger on Frostmere Approach** (the wild road between Glacier Pass and Frostmere). **Brann**, an Ashen deserter, says
   Vesper's boat stopped here with the Mine shard and left a supply cache by the pines near the Frostmere end.
4. **Find the cache**: ferry tickets, a sea chart of the Aurora Isles and 3 Super Potions. Without the chart the Ashen boat is slow.
5. **Win Isolde's Rime Badge** at the Frostmere Arena. That is your 7th badge.
6. **Sail to the Aurora Isles** on the Frostmere ferry (or your own boat). Aurora needs 7 badges and Chapter 5 done.
7. **Earn the Glacitan's trust** (22,19) with Tam beside you (the Glacitan only shows itself if you found Tam first; Tam waits at 24,16).
   It cracks its shell open and gives you the **Mine Ember Shard** (+10 NORTH). Tam: "All three. You did it."

*Reward:* $7,000, +20 NORTH, the Mine shard. **Opens:** Emberfall Volcano (6 badges).
All three shards are in your bag now. You do not have to place them yet.

### Chapter 7: Fire at the Heart (Emberfall)

*Goal:* Vesper's machine is under the volcano. *Recommended level:* 38-44 (Cindra 42-44; Pyrra 42-45).

Route: Glacier Pass, south exit, or Badlands, north exit, to **Emberfall Volcano**.

1. **Travel to Emberfall.**
2. **Free the caged creatures in the Emberfall cave** (through the cave entrance in Emberfall): an Ashen cage full of frightened creatures;
   earn the young Embrit's trust (the trust mini-game) and they run free (+10 EAST).
3. **Beat the Ashen scout** watching the mountain, **Emberly**, Lv 41-42, near (26,22). She appears once the cage is open.
4. **Talk to Pyrra** (26,17). She has opened the old lava tunnel for you: Vesper's **elite guard** waits at the machine.
5. **Beat Cindra** (32,19), Lv 42-44.
6. **Shut the machine down** (29,16): you throw the great lever and the calm of every town flows home. Vesper shouts "Enough!" from the
   ridge and swears to bind the Wildcard at Cloudpeak, then vanishes.

*Reward:* $8,000, +20 EAST. **Opens:** Cloudpeak Mountains (chapter 7 done; 3 badges).
The Magma Badge is won separately at Pyrra's Arena (optional for the story, needed for Moonlit and the Arena Challenge).

### Chapter 8: The Great Lantern (Cloudpeak, Lanternrest)

*Goal:* Vesper waits at the castle; end it, then bring the Lantern back. *Recommended level:* 40+ (Vesper scales to you).

Route: the Ridge north exit, or Evergreen east, or Glacier west, to **Cloudpeak**.

1. **Climb to the castle** (the door opens into the castle hall; Vesper stands on the terrace, around 32,9).
2. **Gather Tam, Pyrra and Kade** at the foot of Cloudpeak (near where you arrive). Talk to all three; they climb with you.
3. **Defeat Vesper** in three stages in a row. Each stage has a speech and a new team; levels are your top level minus 4 (at least 30) plus
   3 to 8. If you lose a stage, you keep the stages already won (`ch8_stage`), you are healed, and Vesper tells you to come back. Stage
   3 uses Vesper's last partner.
   Vesper kneels and says maybe the Wildcard left because we stopped trusting it, and will go and open the cages. Tam: "Let's go home."
4. **Return to Lanternrest and place the three shards** on the pedestals in the tower (door at 29,21). When the third shard is down the
   Lantern blazes, every creature howls with joy, and the **Hollow Gate** opens far to the southeast.

*Reward:* $10,000, +30 LANTERNREST. **Opens:** the Starlit Hollow; the Hoverboard recipe; the Helicopter.

### Finale: The Wildcard (Starlit Hollow)

Elder Wren: "The Hollow Gate is open. Go and meet the Wildcard, little Warden. Not so little any more." Go through the archway at
(52-53, 38) in Lanternrest and talk to the **Wildcard** at (19,5).

It is not angry. It is tired. Choose how to meet it:

| Choice | What happens | Result |
| --- | --- | --- |
| **TRUST** | you put down your orbs and play the trust mini-game | it joins you (Lv 50 or your top level) |
| **STRENGTH** | a story battle against the Wildcard (level: your top + 2, at least 40) | catch it and it joins you; beat it and it fades into the crystals; lose and you may try again |
| **BALANCE** | needs a Balance score of 5 or more (2.5): you tell it about the towns you helped | it joins you; if the score is too low it says "not convinced yet" and you can come back |

Then the **epilogue** plays: how the vale remembers your stance, which town you helped first in Chapter 5, the outcomes of your side
quests (ferry, orchard, trader, duel, tracks), that Tam became a Warden at the Hearth Shrine, that Vesper opened every cage and walks
the roads alone, and how big your homestead has grown. **THE END.** The game goes on.

*Reward:* $20,000, reputation in every region, and the main quest "The Dimming Lantern" pays $5,000 and +40 LANTERNREST.

### Post-game

- **Arena Leader rematches**, once a day per Leader, at your top level + 3 (the Leader will say so). Win for $2,500 and +2 reputation.
- **Moonlit Island** (8 badges, Chapter 8 done): ferry from Cobalt or the Shore. Wild creatures Lv 45-52 and trainers: Luna the Moon Mystic,
  Thorne the Dragon Tamer, Ivy the Fairy Queen.
- **The Helicopter**, Hoverboard, the remaining hidden spots, the Dex (catch 100 kinds), the homestead and the optional quests.
- **Rook** (if you finished *Duel at Dawn*) spars with you every day at your homestead.

---

## 7. Optional quests

Eleven authored threads, plus the quest categories in 4.4. Each starts when you talk to its giver, keeps its state in flags, and
records an **outcome** line that the epilogue repeats (the first five). Choices have consequences.

| Quest | Giver and where | Steps | Choice and result |
| --- | --- | --- | --- |
| **The Missing Ferry** | Captain Ilsa, Sunhaven (10,26) | find the Gull on Tidepool Shore; decide; tell Ilsa | *Return it:* free crossings Sunhaven-Shore, +15 WEST, 2 Pearl + $1,000. *Sell to Grizz:* $3,000, -15 WEST, Ilsa never sails again. |
| **The Sick Fields** | Farmer Bram, Sunmeadow (32,6) | look at three sick beds; find the poison source (35,30); tell Bram | *Move the nest home:* a Venomite joins you. *Drive them off:* a battle. Either way the fields heal: 3 Honey + $1,500, +12 WEST, and Bram gives 2 Honey every day. |
| **Trader's Debt** | Oswin, Lanternrest (38,31) | deliver a sealed crate to Miller Ada in Stonebridge within 3 days; return | *Deliver it sealed:* $2,500. *Open it:* stolen mine crystals; report him to Elder Brigg: 2 Crystal Shard + $1,000, +15 SOUTH, +10 NORTH, and Oswin's honest niece Pell runs the stall. Miss the deadline and the quest fails. |
| **Duel at Dawn** | Rook, Lanternrest (11,23) | beat Rook in Lanternrest, Stonebridge, then Sunhaven | $3,000, reputation, and Rook moves into your homestead and spars daily. |
| **The Unusual Footprints** | Researcher Fenna, Lanternrest (24,32) | follow glowing prints Sunmeadow, Lanternrest, Mirewood; find the Lemurmur; tell Fenna | *Watch quietly:* Mythic Orb + 2 Revive + $3,000. *Befriend it:* it joins you. *Battle it:* Revives and money. |
| **Who Took the Tomatoes** | Dilla, Lanternrest (18,10) | check three clues; decide; tell Dilla | *Scarecrow:* $1,600, +8. *Give them a patch:* a Fluffur joins you, Tomato Seeds + Honey + $800, +15 LANTERNREST. |
| **Lantern Night Lights** | Pim, Lanternrest (31,28) | bring 3 Glowcap, 3 Honey, 3 Wool | lanterns hang across Lanternrest; 3 Super Potion + 2 Pulse Orb + $1,200 |
| **Bridge Repairs** | Tobin, Stonebridge (28,14) | deliver 12 Plank + 8 Brick or pay $4,000 | a bench and lanterns appear on the bridge; +15 SOUTH |
| **The Cobalt Cup** | Referee Sparks, Cobalt City (35,26) | win three rounds with the same team (healed between rounds) | $5,000, +15 EAST, the cup |
| **Lost Little Pilfet** | Jory, Sandsreach (35,30) | ask in Sandsreach and Cobalt; find it in the Badlands (20,22) | *Return it:* 2 Full Heal + 2 Pulse Orb + $1,000, +12 EAST. *Keep it:* it joins you, -10 EAST. |
| **A Salve for the Hermit** | the hermit, Whispering Woods (31,24) | bring a Herb Salve (forge: 2 Glowcap + 1 Honey) | Mythic Orb + Revive + $800, +10 SOUTH |

Also: **The Courier's Parcel** (the courier kid in Lanternrest trades a Scooter for 3 Carrots + 2 Turnips), **Fisher Moll** (bring her old brass
lantern, found on the rocky islet at the end of the Tidepool Shore sandbar at (4,36), for 3 Pulse Orb and a Full Heal), and daily gifts from Bram and Pell once you have helped them.

Side quests are good ways to earn reputation and levels, to afford orbs, and to reach the Balance score of 5 for the finale. None block
the story.

---

## 8. Everything at a glance

**The rules in order of importance**

1. A chapter starts when the one before it is done.
2. A place opens only with its badges **and** the previous chapter finished. Money, permits, reputation and vehicles do not change that.
3. Leaders and gym trainers scale to your badge count; wild levels and story trainers rise with the chapters.
4. Guardians are won by trust; bosses are story battles that never send you home.
5. Three shards light the Lantern; the Lantern opens the Hollow Gate; the finale needs Trust, Strength or a Balance score of 5.

**Dependency map**

```
Wren + starter ──> Tam ──> CH1 (Stonebridge) ──> Wren ──> CH2 (Evergreen, Sunhaven)
                              │ Keystone              │ Meadow shard, Bloom, rowboat
                              v                       v
                        CH3 (Driftwood, Verdant) ──> CH4 (Lakeside, Tidefall)
                          Gale, motorboat              Tide, Marsh shard, sailboat
                              v
                        CH5 (Sandsreach, Cobalt, Badlands) ──> CH6 (Glacier, Frostmere, Aurora)
                          Dune + Circuit, Skyrant               Rime, Mine shard (Tam)
                              v
                        CH7 (Emberfall) ──> CH8 (Cloudpeak, then the tower)
                          Vesper's machine     Vesper x3, 3 shards placed, Lantern lit
                              v
                        FINALE (Hollow Gate): Trust | Strength | Balance (rep/100 + side quests >= 5)
                              v
                        Post-game: rematches, Moonlit, Helicopter, Hoverboard, Dex, homestead
```

**What each chapter hands you**

| Chapter | Badge | Shard | Vehicle | Creature | Money |
| --- | --- | --- | --- | --- | --- |
| P | | | | | the Warden's Lamp |
| 1 | Keystone | | | Cairnwight Lv 12 | $2,000 |
| 2 | Bloom | Meadow | rowboat | | $3,000 |
| 3 | Gale | | motorboat | | $4,000 |
| 4 | Tide | Marsh | sailboat | | $5,000 |
| 5 | Dune, Circuit | | | Skyrant Lv 30 | $6,000 |
| 6 | Rime | Mine | | | $7,000 |
| 7 | (Magma at Pyrra's Arena) | | | | $8,000 |
| 8 | | | Hoverboard and Helicopter become available | | $10,000 |
| Finale | | | | the Wildcard | $20,000 |

**Completion checklist**

- all 8 badges, all 3 shards, the Lantern lit, the Wildcard met
- the 11 optional quests, Fisher Moll and the courier
- Map of Aurelis (visit all 24 places), Field Notes (100 species), Off the Beaten Path (15 hidden spots)
- the homestead at deed 5, the Cobalt Cup, the rematches

---

## 9. Known inconsistencies and open decisions

Fixed while writing this guide (build 3.23.1):

- Wren's first talk, the Lanternrest notice board and Orrin all still said "the roads are open, choose your own path / Meadow lies west, Marsh
  east, Mine north". They now say the roads open as you earn them, and name Hazel, Bog and Kade.
- A Moonlit trainer was named VESPER (a "Moon Mystic"), the same as the villain. She is now LUNA.
- Fisher Moll said she lost her lantern "in the dunes" when it is on the Tidepool Shore sandbar; she now says "on the sandbar".

Things to know, or to decide:

1. **Map size and the spaces between cities.** Done for the four direct town-to-town links (the wild roads in 3.3). Still open: roads
   on the links that already reach a wild region, story beats on the new roads and on the seven outer islands (today they hold a treasure cache each), and
   a longer path from Driftwood to Lakeside, which still crosses only three maps.
2. **Chapter length.** Done: the step count is now 5, 5, 5, 6, 6, 7, 6, 4 (Chapters 5 to 8 gained steps on the new roads, in the
   Emberfall cave and at the foot of Cloudpeak). Chapter 8 is still short on steps but is the longest fight (three Vesper stages).
3. **Badge order versus story order.** The arena list is Keystone, Bloom, Tide, Gale ... but the story earns Gale (Chapter 3) before
   Tide (Chapter 4). The scaling makes this harmless.
4. **Kade and the Mine** are not part of any chapter: Kade gives Mythic Orbs and his shard line, but you never have to go there.
5. **Cloudpeak is closed until Chapter 7**, including its caves, its ledge and its wild creatures.
6. **Tidefall's dive needs a Water creature Lv 15+.** The story never hands you one, so a player with none must catch one (the Shore and
   Mirewood have them). The shrine tells you so.
7. **Older saves:** places you have visited stay open; permit flags do nothing; money spent on permits is not refunded.
8. **`docs/STORY_DESIGN.md`** is an early design draft and differs from the game (it puts the Mine shard at the Mine and the machine in
   the Badlands). This guide is the current description.
9. **Reputation and the Wildcard "Balance" ending** are the only places reputation matters for the story now. The score counts every
   finished non-main quest, including the discovery quests, so a player who does little else can still reach it.

---

## 10. Appendix: flags, files and tests

**Main story flags** (all in `G.state.flags`): `starter`, `starterSp`, `wrenTips`, `tam1`, `tamWon`, `ashen_sb1`, `ashen_sb2`, `vesper1`,
`guardian1`, `masonLesson`, `badge_keystone`, `ch1_wren`, `sm_hazel`, `ch2_oak`, `shard_meadow`, `ch2_vesper`, `ashen_eg`, `badge_bloom`,
`ch3_light`, `badge_gale`, `ashen_vd`, `ch3_tam`, `ashen_lk`, `ch4_gotstone`, `ch4_stone`, `badge_tide`, `ashen_tf`, `shard_marsh`,
`ashen_sr`, `ashen_cb`, `ch5_sr`, `ch5_cb`, `ch5_first`, `ch5_machine`, `badge_dune`, `badge_circuit`, `ch5_sky`, `ch6_tam`, `badge_rime`,
`shard_mine`, `ch7_pyrra`, `ashen_ef`, `ch7_machine`, `ch8_stage`, `ch8_vesper`, `placed_meadow/marsh/mine`, `lanternLit`, `finale`,
`jokerGone`, `jokerCaught`. Side quests use `th_*` flags. Gate access also reads `S.visited[place]` and `G.quest.done('chN')`.

**Source files**

| What | File |
| --- | --- |
| quest engine, journal, reputation | `js/quests.js` |
| the lantern quest, side-quest categories, reputation rules | `js/story.js` |
| the opening, Wren, Orrin, shards, the Lantern, Hollow Gate | `js/world.js` |
| prologue and Chapter 1 | `js/chapter1.js` |
| Chapters 2 to 4 | `js/chapter2.js` |
| Chapters 5 to 8, the finale, rematches | `js/chapter5.js` |
| the 11 optional quests | `js/threads.js`, `js/threads2.js` |
| gates (badges and the story) | `js/access.js`, `js/gates.js`, `js/worldmap.js` |
| arenas, badges, Leaders | `js/arenas.js`, `js/maps/zz_arenas.js` |
| vehicles, ferries, flying | `js/vehicles.js`, `js/worldmap.js` |
| field abilities and hidden spots | `js/field.js` |
| caves | `js/maps/ridge.js` (Glimmer Mine), `js/maps/zz_mouths_caves.js` |
| homestead, farm, crafting, shops | `js/homestead.js`, `js/farm.js`, `js/craft.js`, `js/shops.js`, `js/structures.js` |

**The guide checks itself.** `node tests/e2e-guide.js` reads this file's tables and compares them with the running game: the build number, the
gate table (badges, chapter and which exits lead in), the arena table (type, leader, base team) and level ranges, the chapter titles, money
rewards and step counts, the wild levels, the story bosses' teams, the homestead deeds, vehicle and orb prices, and the list of optional
quests. If you change the story, a gate, a level, a price or a reward and do not update this guide, that test fails and names the stale
row. Keep the table layouts and the bold anchor phrases (**The spine**, **Wild creatures** by place, **Story trainers**,
**Length**) as they are, or update the test with them.

**Tests that check the game** (`node tests/<name>.js`, run all with the project's runner): `e2e-story1`, `e2e-story2`, `e2e-story3`
(the whole story, prologue to finale), `e2e-access` (gate order), `e2e-worldmap` and `e2e-sea` (ferries and harbours), `e2e-threads`,
`e2e-threads2` (side quests), `e2e-quests`, `e2e-arenas`, `e2e-caves`, `e2e-field`, `e2e-vehicles`.

**Test Mode** (a hidden developer menu) can finish every quest, set every region to 100 and open every gate; it is for testing, not
for play.
