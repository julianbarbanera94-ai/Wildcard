#!/usr/bin/env python3
"""Cut the first row (front, three-quarter, side, back) of small character panels (about 250x300 px, 4 views per row on a cream
card) into assets/people/<slug>-<view>.png, upscaled 3x.
usage: cut-small-sheet.py PANEL.png SLUG [--top Y] [--rowh H] [--flip-side]
Finds the gaps between the four figures from where the ink is thinnest, floods the cream paper away from each box border,
opens the result to cut thin bridges to neighbouring figures (touching hat brims), keeps the figure in the middle and
restores its edge. --flip-side mirrors the side view (the game expects figures to face left)."""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage
from collections import deque
a = sys.argv[1:]; panel, slug = a[0], a[1]
opt = lambda n, d: float(a[a.index(n) + 1]) if n in a else d
im = Image.open(panel).convert('RGB'); W, H = im.size; K = 3
top = int(opt('--top', H * .14)); rowh = int(opt('--rowh', (H - top) / 3))
up = np.asarray(im.resize((W * K, H * K), Image.LANCZOS)).astype(np.float32)
row = up[(top - 2) * K:(top + rowh + 2) * K, int(W * .16) * K:]
lum = row.sum(axis=2); paper = np.median(row[lum >= np.percentile(lum, 55)], axis=0)   # the card colour: the bright, common pixels between the figures
ink = (np.sqrt(((row - paper) ** 2).sum(axis=2)) > 40).sum(axis=0).astype(float)
ink = ndimage.uniform_filter1d(ink, 9)
# four figures: find the three deepest valleys that split the row into roughly equal quarters
x0 = int(W * .16) * K; n = len(ink); cuts = []
for q in (1, 2, 3):
    lo, hi = int(n * (q / 4 - .08)), int(n * (q / 4 + .08)); cuts.append(lo + int(np.argmin(ink[lo:hi])))
edges = [0] + cuts + [n]
def matte(box):
    bx0, by0, bx1, by1 = box; c = up[by0:by1, bx0:bx1]; h, w = c.shape[:2]
    dist = np.sqrt(((c - paper) ** 2).sum(axis=2)); T0, T1 = 14., 46.; bg = np.zeros((h, w), bool); q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if dist[y, x] < T1 and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if dist[y, x] < T1 and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and dist[ny, nx] < T1: bg[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(bg, np.clip((dist - T0) / (T1 - T0), 0, 1), 1.0)
    solid = alpha > .3
    opened = ndimage.binary_opening(solid, structure=np.ones((3, 3)), iterations=6)   # cut thin bridges to neighbours
    lab, k = ndimage.label(opened)
    if not k: return None
    cy, cx = h * .5, w * .5
    best = max(range(1, k + 1), key=lambda i: (lab == i).sum() / (1 + .03 * np.hypot(*(np.array(ndimage.center_of_mass(lab == i)) - [cy, cx]))))
    core = lab == best
    keep = ndimage.binary_dilation(core, iterations=9) & solid   # grow back to the real edge, no further than the opening removed
    lab2, _ = ndimage.label(keep); keep = lab2 == lab2[np.unravel_index(np.argmax(core), core.shape)] if lab2.max() else keep
    A = np.where(keep, alpha, 0)
    rgb = np.where(A[..., None] > .02, (c - (1 - A[..., None]) * paper) / np.maximum(A[..., None], .02), 0)
    out = Image.fromarray(np.dstack([rgb.clip(0, 255), A * 255]).astype(np.uint8), 'RGBA'); return out.crop(out.getbbox())
os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'assets', 'people'), exist_ok=True)
for v, i in zip(['front', 'threequarter', 'side', 'back'], range(4)):
    bx0 = x0 + max(0, edges[i] - 2 * K); bx1 = min(up.shape[1], x0 + edges[i + 1] + 2 * K)
    out = matte((bx0, (top - 2) * K, bx1, (top + rowh + 2) * K))
    if out is None: print('empty', slug, v); continue
    if v == 'side' and '--flip-side' in a: out = out.transpose(Image.FLIP_LEFT_RIGHT)
    out.save(os.path.join(os.path.dirname(__file__), '..', 'assets', 'people', f'{slug}-{v}.png'))
print(slug, [e // K for e in edges])
