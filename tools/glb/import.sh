#!/bin/sh
# Import a modelling tool's .glb as a 3D creature: tools/glb/import.sh species/NNN-name.json path/to/model.glb [ratio]
# Needs: (cd tools/glb && npm install), python3 with numpy and pillow. Then load js/c3d_<name>_mesh.js before js/c3d_<name>.js.
set -e
cd "$(dirname "$0")"
CFG=$1 SRC=$2 RATIO=${3:-0.03} W=$(mktemp -d)
node simplify.mjs "$SRC" "$W/simp.glb" "$RATIO"
node export.mjs "$W/simp.glb" "$W/m"
python3 rig.py "$CFG" "$W/m" "$W/rig.json"
python3 pack.py "$CFG" "$W/m" "$W/rig.json"
