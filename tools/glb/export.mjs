// Export the simplified mesh to the compact arrays the game decodes: node export.mjs simplified.glb <outprefix>  (writes <out>.json, <out>_base.jpg, <out>_normal.jpg)
import { NodeIO } from '@gltf-transform/core';
import fs from 'fs';
const io = new NodeIO(), doc = await io.read(process.argv[2]), out = process.argv[3];
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION').getArray(), N = prim.getAttribute('NORMAL').getArray(), UV = prim.getAttribute('TEXCOORD_0').getArray(), I = prim.getIndices().getArray();
const n = P.length / 3, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i * 3 + k]); hi[k] = Math.max(hi[k], P[i * 3 + k]); }
const q = new Uint16Array(n * 3); for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) q[i * 3 + k] = Math.round((P[i * 3 + k] - lo[k]) / (hi[k] - lo[k]) * 65535);
const nq = new Int8Array(n * 3); for (let i = 0; i < n * 3; i++) nq[i] = Math.round(Math.max(-1, Math.min(1, N[i])) * 127);
const uq = new Uint16Array(n * 2); for (let i = 0; i < n * 2; i++) uq[i] = Math.round(Math.max(0, Math.min(1, UV[i])) * 65535);
const iq = new Uint16Array(I);
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const mat = prim.getMaterial();
fs.writeFileSync(out + '_base.jpg', mat.getBaseColorTexture().getImage()); fs.writeFileSync(out + '_normal.jpg', mat.getNormalTexture().getImage());
fs.writeFileSync(out + '.json', JSON.stringify({ n, tris: I.length / 3, lo, hi, pos: b64(q), nrm: b64(nq), uv: b64(uq), idx: b64(iq) }));
console.log('exported', n, I.length / 3, 'bytes', fs.statSync(out + '.json').size);
