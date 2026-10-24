# Touch controls by context

The on-screen pad (stick, MENU, orb, B, A) changes with what is happening, so it only shows what does something right now.
`G.padContext()` in js/main.js names the context and a small loop sets `body[data-pad]`; the CSS rules in index.html hide
the rest. Hiding waits 0.3 s so a short scripted pause (a door, a fade) does not make buttons flicker; showing is immediate.
The keyboard keys are unchanged, and none of this applies to a desktop with a mouse and keyboard (the pad is not shown).

| Context | When | Shown |
|---|---|---|
| `splash` | the launch splash | nothing (tap anywhere, A or B skips it) |
| `title` | the title screen, before START | A |
| `menu` | any menu, choice, battle command list or other screen | stick, B, A |
| `text` | dialogue or a message box with no menu open | B, A |
| `busy` | a scripted scene, a door, or a battle animation | B, A |
| `world` | walking about | stick, MENU, B, A, and the orb button when the bag has an orb |

Settings (stick size and position, button size and opacity, left-handed layout) still apply to whatever is shown.

## Launch splash
js/main.js plays a short splash before the title: a lantern fades in and lights, embers rise, and its glow grows until it
fills the screen, revealing the title (the title is drawn through the expanding circle, so the last frame is exactly the
title). It takes about 2.7 s and any tap, A, B or Enter skips it; the skip does not also press START. Automated browsers
(`navigator.webdriver`) skip it so the existing tests are unchanged; `localStorage wildcard-splash = 1` turns it on for
a test (tests/e2e-pad.js).
