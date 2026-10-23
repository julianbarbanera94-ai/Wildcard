#!/usr/bin/env python3
"""Cut one creature view out of a rendered reference sheet (dark or busy background, pedestals, glow) as a transparent PNG.

usage: extract-creature-ai.py SHEET X0 Y0 X1 Y1 OUT.png [--seed X,Y] [--mask X0,Y0,X1,Y1 ...] [--model u2net]

Needs `pip install "rembg[cpu]" scipy` (the model downloads on first use; u2net keeps heads among
flames best and drops pedestals; try isnet-general-use or birefnet-general-lite if a view comes out wrong). Steps: AI matte of the box (drops the backdrop
and the stone pedestal), --mask rectangles cleared (titles, type badges), faint grey smudges removed, then only the shape
under --seed (default: box centre) and pieces close to it are kept, so parts of neighbouring views are dropped.
Use tools/extract-creature.py instead for flat paper-coloured sheets."""
import sys
import numpy as np
from PIL import Image
from rembg import remove, new_session
from scipy import ndimage

a = sys.argv[1:]
sheet, x0, y0, x1, y1, out = a[0], *map(int, a[1:5]), a[5]
seed = tuple(map(int, a[a.index('--seed') + 1].split(','))) if '--seed' in a else ((x0 + x1) // 2, (y0 + y1) // 2)
model = a[a.index('--model') + 1] if '--model' in a else 'u2net'
masks = [tuple(map(int, a[i + 1].split(','))) for i, v in enumerate(a) if v == '--mask']
src = Image.open(sheet).convert('RGB').crop((x0, y0, x1, y1))
rgba = np.asarray(remove(src, session=new_session(model))).astype(np.float32)
rgb, al = rgba[..., :3], rgba[..., 3] / 255
for mx0, my0, mx1, my1 in masks: al[max(0, my0 - y0):max(0, my1 - y0), max(0, mx0 - x0):max(0, mx1 - x0)] = 0
# faint, colourless, dark pixels are backdrop smoke, not creature
mx, mn = rgb.max(axis=2), rgb.min(axis=2)
smudge = (al < .65) & ((mx - mn) < 40) & (mx < 120)
al[smudge] = 0
# keep the seeded shape and anything within a few pixels of it
solid = al > .3
lab, n = ndimage.label(solid, structure=np.ones((3, 3)))
sy, sx = seed[1] - y0, seed[0] - x0
main = lab[sy, sx] or (np.bincount(lab.ravel())[1:].argmax() + 1)
keep = lab == main
zone = ndimage.binary_dilation(keep, iterations=5)
for i in np.unique(lab[zone & solid]):
    if i: keep |= lab == i
keep = ndimage.binary_dilation(keep, iterations=2)
al = np.where(keep, al, 0)
img = Image.fromarray(np.dstack([rgb, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
img = img.crop(img.getbbox()); img.save(out, optimize=True); print(out, img.size)
