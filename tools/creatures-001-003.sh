#!/bin/sh
# Re-cut Embrit, Emberon and Infernox (front and back) from the 3D reference sheet, then re-pack js/creatureimg.js.
# Boxes are sheet pixels; masks clear the type badges; the model is picked per view (see tools/extract-creature-ai.py).
set -e
cd "$(dirname "$0")/.."
S=docs/reference/creatures_001-003_3d.png T=tools/extract-creature-ai.py A=assets/creatures
python3 $T $S 0 48 262 385 $A/001-front.png --seed 150,300 --mask 15,48,160,92
python3 $T $S 262 40 512 385 $A/001-back.png --seed 380,300
python3 $T $S 515 48 775 385 $A/002-front.png --seed 650,290 --mask 530,48,658,90
python3 $T $S 775 15 1022 385 $A/002-back.png --seed 900,300
python3 $T $S 1026 48 1330 385 $A/003-front.png --seed 1170,300 --mask 1045,48,1295,92 --model isnet-general-use
python3 $T $S 1300 20 1536 385 $A/003-back.png --seed 1420,300
python3 tools/build-creature-images.py
