# Importing a modelled creature (.glb)

Turns a model from a tool such as Meshy (static mesh, textures, no skeleton) into an animated game creature.

    cd tools/glb && npm install          # once (gltf-transform + meshoptimizer); python3 needs numpy and pillow
    ./import.sh species/001-embrit.json /path/to/model.glb [ratio]

1. `simplify.mjs`: weld and simplify (default 3% of the triangles: Embrit 507k -> 15k), keeping UVs.
2. `export.mjs`: quantised positions, normals, UVs and indices; the colour and normal textures.
3. `rig.py`: builds the standard skeleton from the landmarks in `species/NNN-name.json` and skins every vertex
   (see the file's docstring). Measure landmarks by rendering the model or slicing its vertices (y up, facing +z).
4. `pack.py`: embeds everything (1024 px WebP textures) in `js/c3d_<name>_mesh.js` as `G.C3D_ASSETS[id]`.

Then `js/c3d_<name>.js` calls `kit.skinned(G.C3D_ASSETS[id], { lid, eyeR })` and supplies its idle and clips
(see `js/c3d_embrit.js` and `docs/CREATURES_3D.md`). Check every clip in a battle on both sides; adjust the species file
(leg x/z, heights, `legR`, ear thresholds) if a part stretches.
