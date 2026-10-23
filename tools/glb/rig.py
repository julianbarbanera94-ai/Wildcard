#!/usr/bin/env python3
"""Auto-rig an exported creature mesh for the game's standard skeleton (see docs/CREATURES_3D.md).
usage: rig.py species/NNN-name.json <exported prefix> <out.json>
The species file gives landmarks in the model's own units (y up, facing +z): the body bones, ear bones, where the tail
starts and ends (its bones follow the tail's measured centre line), each leg's x/z with hip/knee/paw heights, region
thresholds and the painted eyes. Weights: ears blend into the head at their base; legs (only vertices close to a leg's
axis) blend body -> hip -> knee -> paw by height; the tail is shared by distance along its bones; the rest by distance to
body, chest, neck and head. Top four weights per vertex, as bytes."""
import json, base64, sys, numpy as np
cfg = json.load(open(sys.argv[1])); d = json.load(open(sys.argv[2] + '.json')); out = sys.argv[3]
q = np.frombuffer(base64.b64decode(d['pos']), dtype=np.uint16).reshape(-1, 3).astype(float)
P0 = np.array(d['lo']) + q / 65535 * (np.array(d['hi']) - np.array(d['lo']))
S = cfg['scale']; OFF = np.array([0, -cfg['ground'], 0]); P = (P0 + OFF) * S
f = lambda v: list(((np.array(v) + OFF) * S).round(4))
x0, y0, z0 = P0.T
T = cfg['tail']; tailm = (z0 < T['zStart']) & (y0 > T['yMin'])
path = []; step = (T['zStart'] - T['zEnd']) / 5
for zz in np.arange(T['zStart'], T['zEnd'], -step):
    m = tailm & (z0 < zz) & (z0 > zz - step)
    if m.sum() > 10: s = P0[m]; path.append([s[:, 0].mean(), s[:, 1].mean(), zz - step / 2])
B = []
def bone(n, p, h, t=None): B.append(dict(name=n, parent=p, head=h, tip=t))
for b in cfg['bones']: bone(b[0], b[1], f(b[2]), f(b[3]) if len(b) > 3 else None)
for i in range(T['bones']): bone('tail%d' % (i + 1), 'tail%d' % i, f(path[min(i + 1, len(path) - 1)]))
last = path[-1]; B[-1]['tip'] = f([last[0] - .05, last[1] + .2, T['zEnd']])
L = cfg['legs']; LEG = {k: L[k] for k in ('FL', 'FR', 'BL', 'BR') if k in L}
for k, (lx, lz) in LEG.items():
    bone('hip' + k, 'body', f([lx, L['hip'], lz])); bone('knee' + k, 'hip' + k, f([lx, L['knee'], lz])); bone('paw' + k, 'knee' + k, f([lx, L['paw'], lz]), f([lx, cfg['ground'], lz + .05]))
names = [b['name'] for b in B]; idx = {n: i for i, n in enumerate(names)}
def seg(b): h = np.array(b['head']); t = np.array(b['tip']) if b['tip'] else np.array(next(c['head'] for c in B if c['parent'] == b['name'])); return h, t
SEG = {b['name']: seg(b) for b in B}
def dist(n, pts): a, b = SEG[n]; ab = b - a; t = np.clip(((pts - a) @ ab) / (ab @ ab + 1e-9), 0, 1); return np.linalg.norm(pts - (a + t[:, None] * ab), axis=1)
N = len(P); W = np.zeros((N, len(B)))
def invd(mask, bones, pw=4):
    ds = np.stack([dist(n, P[mask]) for n in bones], 1); w = 1 / (ds ** pw + 1e-6); w /= w.sum(1, keepdims=True)
    for j, n in enumerate(bones): W[mask, idx[n]] += w[:, j]
def sm(e0, e1, v): t = np.clip((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
R = cfg['regions']
ear = (y0 > R['earY']) & (np.abs(x0) > R['earX']) & (z0 > R['earZ'])
leg = (y0 < R['legY']) & ~(tailm & (z0 < T['zStart'] - .02))
tail = tailm & ~leg & ~ear
rest = ~(ear | leg | tail)
for side, n in ((-1, 'earL'), (1, 'earR')):
    m = ear & (np.sign(x0) == side); e = sm(R['earY'] + .02, R['earY'] + .14, y0[m]); W[m, idx[n]] += e; W[m, idx['head']] += 1 - e
invd(tail, ['tail%d' % i for i in range(T['bones'] + 1)] + ['body'], 4)
lx = np.array([v[0] for v in LEG.values()]); lz = np.array([v[1] for v in LEG.values()]); keys = list(LEG.keys())
mi = np.where(leg)[0]; dd = (x0[mi, None] - lx[None]) ** 2 + (z0[mi, None] - lz[None]) ** 2; which = dd.argmin(1); near = np.sqrt(dd.min(1))
hy, ky, py = L['hip'], L['knee'], L['paw']
for j, i in enumerate(mi):
    k = keys[which[j]]; y = y0[i]
    if near[j] > R['legR']: W[i, idx['body']] += 1; continue   # fur between the legs follows the body
    wb = sm(hy - .06, hy + .04, y); wp = sm(ky - .02, py, y); wk = sm(hy - .04, ky - .02, y) * (1 - wp); wh = max(0, 1 - wb - wk - wp)
    for n, w in (('body', wb), ('hip' + k, wh), ('knee' + k, wk), ('paw' + k, wp)): W[i, idx[n]] += w
invd(rest, ['body', 'chest', 'neck', 'head'], 4)
order = np.argsort(-W, 1)[:, :4]; ws = np.take_along_axis(W, order, 1); ws /= ws.sum(1, keepdims=True)
wq = np.round(ws * 255).astype(np.uint8); wq[:, 0] += (255 - wq.sum(1)).astype(np.uint8)
fire = np.zeros(N, np.uint8); fire[tail] = np.clip(sm(T['zStart'] - .15, T['zStart'] - .45, z0[tail]) * 255, 0, 255).astype(np.uint8)
json.dump(dict(scale=S, off=OFF.tolist(), bones=B, skinIndex=base64.b64encode(order.astype(np.uint8).tobytes()).decode(), skinWeight=base64.b64encode(wq.tobytes()).decode(),
               fire=base64.b64encode(fire.tobytes()).decode(), eyes=[f(e) for e in cfg.get('eyes', [])]), open(out, 'w'))
print('bones', len(B), '| ears', ear.sum(), 'legs', leg.sum(), 'tail', tail.sum(), 'body/head', rest.sum())
