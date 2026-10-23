#!/usr/bin/env python3
"""Cut one creature out of a reference contact sheet (creature_batch_sheets/*.png) as a transparent PNG.

usage: extract-creature.py SHEET X0 Y0 X1 Y1 OUT.png [--seed X,Y] [--keep-near N]

The box is the creature's cell above its name label. The cream paper is removed by flooding from the box edges through
paper-coloured pixels (soft alpha at the edges, colour un-blended from the paper so there is no light halo). Then only the
connected shapes that touch the creature (the one under --seed, default the box centre) are kept, plus small pieces within
--keep-near pixels of it (sparks, embers), so flames or fur from the neighbours on the sheet are dropped.
"""
import sys
from collections import deque
from PIL import Image
import numpy as np

def main():
    a = sys.argv[1:]
    sheet, x0, y0, x1, y1, out = a[0], *map(int, a[1:5]), a[5]
    seed = None; near = 6
    if '--seed' in a: seed = tuple(map(int, a[a.index('--seed') + 1].split(',')))
    if '--keep-near' in a: near = int(a[a.index('--keep-near') + 1])
    im = np.asarray(Image.open(sheet).convert('RGB')).astype(np.float32)[y0:y1, x0:x1]
    h, w, _ = im.shape
    # paper colour: median of the box border
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    paper = np.median(border, axis=0)
    dist = np.sqrt(((im - paper) ** 2).sum(axis=2))
    T0, T1 = 14.0, 46.0          # below T0 is paper, above T1 is solid creature
    bgish = dist < T1
    # flood the background from the border through paper-ish pixels
    bg = np.zeros((h, w), bool); q = deque()
    for yy in range(h):
        for xx in (0, w - 1):
            if bgish[yy, xx] and not bg[yy, xx]: bg[yy, xx] = True; q.append((yy, xx))
    for xx in range(w):
        for yy in (0, h - 1):
            if bgish[yy, xx] and not bg[yy, xx]: bg[yy, xx] = True; q.append((yy, xx))
    while q:
        yy, xx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = yy + dy, xx + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and bgish[ny, nx]: bg[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(bg, np.clip((dist - T0) / (T1 - T0), 0, 1), 1.0)
    # keep the creature's connected shape(s)
    solid = alpha > 0.25
    lab = -np.ones((h, w), np.int32); comps = []
    for sy in range(h):
        for sx in range(w):
            if solid[sy, sx] and lab[sy, sx] < 0:
                i = len(comps); lab[sy, sx] = i; q = deque([(sy, sx)]); px = []
                while q:
                    yy, xx = q.popleft(); px.append((yy, xx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = yy + dy, xx + dx
                            if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and lab[ny, nx] < 0: lab[ny, nx] = i; q.append((ny, nx))
                comps.append(px)
    sy, sx = (seed[1] - y0, seed[0] - x0) if seed else (h // 2, w // 2)
    main_i = lab[sy, sx]
    if main_i < 0:  # seed on a gap: take the biggest shape
        main_i = max(range(len(comps)), key=lambda i: len(comps[i]))
    keep = np.zeros((h, w), bool)
    for yy, xx in comps[main_i]: keep[yy, xx] = True
    # grow the kept area by `near` px and keep small pieces that fall inside it (embers, whisker tips)
    from scipy.ndimage import binary_dilation
    zone = binary_dilation(keep, iterations=near)
    for i, px in enumerate(comps):
        if i != main_i and any(zone[yy, xx] for yy, xx in px[:50]): 
            for yy, xx in px: keep[yy, xx] = True
    keep = binary_dilation(keep, iterations=2)   # include the soft edge pixels around kept shapes
    alpha = np.where(keep, alpha, 0)
    # un-blend the paper from semi-transparent edge pixels
    a3 = alpha[..., None]
    rgb = np.where(a3 > 0.02, (im - (1 - a3) * paper) / np.maximum(a3, 0.02), 0)
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    img = img.crop(img.getbbox())
    img.save(out, optimize=True)
    print(out, img.size)

main()
