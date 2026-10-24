# Game controllers (Backbone One and others)

WILDCARD works with any standard game controller: Backbone One (USB-C Android version), Xbox, PlayStation, 8BitDo and so on.

## Connect it
1. Android: plug the Backbone into the phone's USB-C port (it clamps round the phone), or pair a Bluetooth pad in the phone's Bluetooth settings.
2. Start the game and press any button on the controller. The game shows `Controller: <name>` in Settings > Controls.
3. The on-screen buttons fade out while you use the controller, and come back when you touch the screen (Settings > Controls > Hide touch buttons).

## Default buttons (Xbox style)
| Controller | Game |
|---|---|
| D-pad or left stick | Move, and move in menus |
| A (bottom) | A: talk, confirm |
| B (right) | B: back; hold to run |
| MENU (start) | Open the menu |
| X | Throw an orb |
| Y | Ride or get off |

Settings > Controls > Controller style = NINTENDO uses the right-hand button for A and the bottom one for B.

## Change the buttons
Settings > Controls > SET UP CONTROLLER. Press the button you want for A, B, MENU, orb and ride in turn. A button that is
already used is refused. CANCEL (or the keyboard B) leaves without changing anything; SKIP keeps that action's button.
RESET CONTROLLER BUTTONS goes back to the style's defaults. Bindings are saved on the phone.

## How it works (for developers)
- js/gamepad.js turns button states into the game's own key presses, so every screen already works with it.
- Two sources feed it: the browser Gamepad API (polled every frame) and the Android shell. MainActivity catches the controller's
  key and stick events itself and calls `G.pad.native(index, down, name)` and `G.pad.axes(x, y, hatX, hatY)`, with button
  indexes of the web "standard" layout (0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 VIEW, 9 MENU, 10 L3, 11 R3, 12-15 D-pad,
  16 HOME). Doing it in the shell means it works whether or not the WebView exposes the Gamepad API, and the controller's
  keys never reach the page as Enter or arrow keys. While the shell is sending events the Gamepad API is ignored.
- tests/e2e-gamepad.js covers both paths with a fake gamepad.

## Not tested
No real Backbone has been connected yet: the tests use a fake gamepad and call the native hooks directly. Buttons that some
controllers report as an analogue trigger (LT, RT) are read as a press past half-way in the browser path; on Android the
shell sends them only if the controller sends them as keys.
