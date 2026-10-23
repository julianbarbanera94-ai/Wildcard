// Weld and simplify a modelling tool's .glb (keeps UVs): node simplify.mjs in.glb out.glb [ratio=0.03]
import { NodeIO } from '@gltf-transform/core';
import { weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
const [, , src, dst, ratio = '0.03'] = process.argv, io = new NodeIO(), doc = await io.read(src);
await MeshoptSimplifier.ready;
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: 0.002 }));
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
console.log('verts', prim.getAttribute('POSITION').getCount(), 'tris', prim.getIndices().getCount() / 3);
await io.write(dst, doc);
