# Visual and UI audit (build 3.36.0)

Screens captured in the game at phone size (412x915 portrait and 915x412 landscape, desktop browser emulating a phone):
`docs/img/ui-audit/portrait.png` and `docs/img/ui-audit/landscape.png`. The summary and crafting screens did not open from the capture
script and are not covered yet.

## What is out of whack

| # | Problem | Where | Severity |
|---|---|---|---|
| 1 | **Two panel styles.** Warm cream panels with orange edges everywhere, but the battle HUD is dark navy with cyan. Opening the bag in battle drops a cream screen onto the dark battle. | battle vs everything else; 19-battle-bag | high |
| 2 | **Every screen header is a different colour.** Bag orange, shop blue, badge case purple, healing centre pink, journal and settings plain. No rule says which colour means what. | 07, 08, 13, 14, 09, 12 | high |
| 3 | **Portrait wastes the screen.** All menus are drawn in the 240x160 box at the bottom of the game area, so in portrait the menu sits in a band with tiny text and a lot of empty map or sky above it. | every menu in portrait; battle sky | high |
| 4 | **Text is too small on a phone,** especially in portrait (journal, settings, shop descriptions, badge text). | 09, 12, 08, 13 | high |
| 5 | **Three HUD styles on the map.** Cream pills (party, money), dark translucent pills (quest tracker, WAY line, toasts), dark navy banner in caves. | 03, 20 | medium |
| 6 | **The touch controls are a fourth style:** glossy cream stick and red and green buttons that match neither the menus nor the battle. | all | medium |
| 7 | **The start menu is a bare list** on the right edge with a thin frame and no icons, unlike every other menu. | 04 | medium |
| 8 | **Empty states look broken.** The Dex shows rows of "-----" and a grey "?" with no hint; the bag in battle shows CLOSE as an item. | 10, 19 | medium |
| 9 | **Mixed art styles.** Cel-shaded battle backgrounds, the tile overworld, the painted world map and the very dark code-drawn caves. Each is fine alone; side by side they read as different games. | 17, 03, 11, 20 | medium (art, not code) |
| 10 | **Inconsistent buttons and hints.** "TAP: CLOSE", "B: CLOSE", "LEAVE", "CANCEL", "CLOSE" pills in different colours and places. | 08, 09, 11, 12, 14 | low |

## The decision you need to make

**One look for the whole game.** Two options:

- **A. Warm cream everywhere** (the existing style: menus, dialogue, shop). Restyle the battle HUD and the dark map pills to cream and orange.
  Least work, and it matches the overworld art and the title.
- **B. Dark kit everywhere** (the battle UI kit you sent). Restyle every menu, dialogue box, shop, journal and HUD pill to dark navy and cyan.
  More work. It matches the battle screen and the dark world map.

Whichever you pick, the same set of fixes follows:

1. One panel, one header style with **one accent colour per meaning** (for example: orange is the default, green means heal, blue means shop), and
   one button style with consistent "A / B" or "TAP" hints.
2. **Scale menus up in portrait** so they fill the screen width and use the empty space, with larger text (minimum about 7 px in the 240 px layout).
3. Bring the touch controls into the same palette.
4. Give the start menu a proper panel with icons; give empty Dex rows and empty lists a friendly message.
5. Brighten the caves a little and match their banner to the map banner.

## Not covered

Summary and crafting screens; evolution; trust mini-game; ferry and flight screens; vehicles garage. They will be captured in the next pass.

## Done in 3.37.0 (direction chosen: warm cream with hints of dark)

- Battle HUD (status panels, command bar, move cards) restyled to cream panels with orange edges and dark ink; the battle message bar stays
  dark navy as the accent. Icons recoloured to warm tones (js/battleui.js).
- One header for every screen: the same orange ribbon on the bag, party, summary, Dex, shop, healing centre and badge case, with a small
  coloured marker that says what kind of screen it is (shop colour, green cross for healing, purple for badges). `G.HEADER_COL`, `G.headerMark`.
- Screen backgrounds: party, summary, Dex and badge case moved from blue, mint, pink and lilac to the shared warm peach; shop tabs orange.
- Kept as dark accents: the quest tracker and WAY pills, the battle message bar, the badge case's velvet lining.

Still to do: portrait text size, the start menu panel and icons, Dex empty rows, touch-control colours, cave brightness and banner.
