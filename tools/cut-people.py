#!/usr/bin/env python3
"""Cut every character out of the people turnaround sheets into assets/people/<slug>-<view>.png.
usage: cut-people.py   (sheets and row names are listed below; sheets are 1536x1024, 4 views per row)"""
import subprocess, os
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.join(here, '..')
R4 = [(0, 238), (256, 494), (512, 750), (768, 1006)]; R5 = [(0, 190), (205, 395), (410, 600), (615, 805), (820, 1010)]
COLS = [(230, 530), (530, 830), (840, 1140), (1150, 1510)]; VIEWS = ['front', 'threequarter', 'side', 'back']
SHEETS = [
  ('people_player_tam_wren.png', R4, ['player-a', 'player-b', 'tam', 'wren']),
  ('people_ashen.png', R4, ['vesper', 'ashen', 'mordant', 'sable']),
  ('people_leaders_1-4.png', R4, ['mason', 'ferna', 'marlo', 'zephyra']),
  ('people_leaders_5-8.png', R4, ['osha', 'rayne', 'isolde', 'pyrra']),
  ('people_townsfolk_a.png', R5, ['oldman', 'boy', 'girl', 'mum', 'clerk']),
  ('people_trainers_a.png', R4, ['hiker', 'camper', 'bug', 'kade']),
]
for sheet, rows, names in SHEETS:
    S = os.path.join(root, 'docs/reference', sheet)
    for (y0, y1), name in zip(rows, names):
        for (x0, x1), v in zip(COLS, VIEWS):
            out = os.path.join(root, 'assets/people', f'{name}-{v}.png')
            if os.path.exists(out): continue
            subprocess.run(['python3', os.path.join(here, 'extract-creature-ai.py'), S, str(x0), str(y0), str(x1), str(y1), out, '--seed', f'{(x0 + x1) // 2},{(y0 + y1) // 2}', '--model', 'birefnet-general-lite'], capture_output=True)
print('PEOPLECUTDONE')
