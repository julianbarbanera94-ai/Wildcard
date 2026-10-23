#!/usr/bin/env python3
"""Cut a 3-row turnaround sheet (rows: one creature each; columns: front, three-quarter, side, back) into
assets/creatures/NNN-<view>.png. usage: cut-sheet.py SHEET FIRST_ID [--rows y0,y1 y0,y1 y0,y1] [--cols x0,x1 x0,x1 x0,x1 x0,x1]
Defaults fit the standard 1774x887 sheet (labels on the left, views from x=260). Re-cut a bad view with
tools/extract-creature-ai.py and another --model."""
import subprocess, sys, os
from PIL import Image
a = sys.argv[1:]; S, first = a[0], int(a[1])
W, H = Image.open(S).size; k, kh = W / 1774, H / 887
def opt(name, n, dflt):
    if name in a: i = a.index(name); return [tuple(map(int, v.split(','))) for v in a[i + 1:i + 1 + n]]
    return [(round(x0 * (kh if name == '--rows' else k)), round(x1 * (kh if name == '--rows' else k))) for x0, x1 in dflt]
rows = opt('--rows', 3, [(8, 262), (310, 548), (600, 842)])
cols = opt('--cols', 4, [(262, 590), (625, 945), (1005, 1335), (1395, 1745)])
here = os.path.dirname(os.path.abspath(__file__))
for r, (y0, y1) in enumerate(rows):
    for (x0, x1), v in zip(cols, ['front', 'threequarter', 'side', 'back']):
        out = os.path.join(here, '..', 'assets', 'creatures', '%03d-%s.png' % (first + r, v))
        p = subprocess.run(['python3', os.path.join(here, 'extract-creature-ai.py'), S, str(x0), str(y0), str(x1), str(y1), out, '--seed', '%d,%d' % ((x0 + x1) // 2, (y0 + y1) // 2 + 20), '--model', 'birefnet-general-lite'], capture_output=True, text=True)
        print(p.stdout.strip() or p.stderr[-200:])
