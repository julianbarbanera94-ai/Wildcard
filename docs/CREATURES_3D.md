# 3D creatures

Embrit (#1) is a real 3D model with a skeleton and an animation set, drawn live in battles. Emberon (#2) and Infernox (#3)
come next on the same pipeline. Visual target: `docs/reference/creatures_001-003_3d_style.png` (stylised, soft, rounded;
expressive eyes; sculpted fur and flame shapes).

## How it fits the game
- The game stays a 2D canvas game. `js/vendor/three.min.js` (three.js r149, MIT, bundled so the APK works offline) renders
  each creature into its own small canvas, and the battle draws that canvas where the sprite used to go (same platform,
  shadow, flashes, HUD). No other screen or system changed.
- Menus, party, Dex and the overworld still use 2D sprites; for a 3D species the sprite is a still render of the model, so
  they match.
- No WebGL (or a failed build) falls back to the 2D sprite automatically.

## Files
| File | What |
| --- | --- |
| `js/c3d.js` | Shared: renderer, lighting, material and shape helpers (`G.c3d.kit`), eye rig (lids, lashes, gaze), stylised flame shader, sparks, two-bone leg IK, `Actor` (rig + animation controller), event log |
| `js/c3d_embrit.js` | Embrit: model, rig, idle, and its clips |
| `js/battle.js` | Battle events call the clips (see below) |
| `tests/e2e-c3d.js` | Clips fire on real battle events; every clip finishes and stays in frame; battle still ends normally |

## Rig and poses
A model is a tree of named joints. A pose is a flat object of numbers added to the rest pose:
`'head.ry'`, `'body.y'`, `'earL.rz'`, `'tail2.rx'`, `'root.z'`, scale keys `.s/.sx/.sy/.sz`, plus
- `paw.<FL|FR|BL|BR>.<x|y|z>`: paw target offsets; legs are solved with IK so paws stay planted (no foot sliding) unless a
  clip lifts them;
- `face.blink`, `face.squint` (happy/focused lower lids), `face.gx`, `face.gy` (gaze), `face.mouth` (jaw open);
- `fx.flare`: species effects (Embrit: tail-flame size and spark rate).

Flame clusters always stay upright (fire rises), whatever the joint they grow from is doing.

## Clip names (the contract with the battle)
| Clip | Triggered by | Notes |
| --- | --- | --- |
| `idle` | always (base layer) | breathing, weight shift, blinks, gaze, species extras |
| `look` | idle, now and then | optional |
| `enter` | sent out / orb opens (`popIn`) | |
| `walk` | wild creature appears (slides in) | |
| `anticipate` | before any damaging move | awaited |
| `attack` / `cast` | physical / special damaging move | must define event `impact`; damage, particles and the defender's hit happen there |
| `status` | non-damaging move (growl, glare...) | event `impact`; falls back to `cast` |
| `hit` / `hitHeavy` | defender is damaged (`hitHeavy` on super-effective); status damage and stat drops use `hit` | |
| `faint` | creature faints | `hold: true` (stays down) |
| `victory` | the winner, when the battle ends (win: your creature; loss: the foe) | |

Missing clips are skipped (the promise resolves at once), so a new species can start with only `idle`, `attack` and `hit`.
Clip options: `dur` (s), `events`, `hold`, `additive` (adds onto idle), `keepIdle`, `blendIn`, `blendOut`. Actors are stepped
on the engine's frame clock (twice per frame in fast battles), so a clip always finishes even if the scene changes.

## Adding a creature
1. Put its reference sheet in `docs/reference/` and note the traits that make its face and body unique.
2. Copy `js/c3d_embrit.js` to `js/c3d_<name>.js`, `G.c3d.def(<id>, ...)`. Build the body from the kit: `sphere`, `lathe`
   (ears, horns, tails), `tuft` (fur locks), `eye(...)` (its own iris colours, size, lid colour), `flames(...)`, legs with
   `{ hip, knee, paw, L1, L2, bend, rest }` for IK. Set `view.height` so the whole model fits.
3. Write `idle` and the clips in its own personality (timing, weight, how far it moves). Reuse helpers, not motions.
4. Add `<script src="js/c3d_<name>.js">` after `js/c3d_embrit.js` in `index.html`.
5. Run `node tests/e2e-c3d.js` (extend it with the new id) and look at it in a battle on both sides.

## Not done yet / limits
- Emberon and Infernox are still 2D sprites (next stage).
- Models are sculpted from smooth primitives in code (spheres, lathes, cones), not a hand-sculpted mesh, so detail is lower
  than the reference painting. A `.glb` from a modelling tool could replace a model without changing the clips if its joints
  use the same names.
- Facial expression is lids, gaze and jaw; there are no brow shapes or lip-sync.
- Movement (walk/run/turn) is used where the battle has it (the wild intro); the overworld still uses 2D sprites.
