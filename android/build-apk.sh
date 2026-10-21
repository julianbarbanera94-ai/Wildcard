#!/bin/bash
# Builds a signed, installable APK of the game without Gradle or the Android SDK installer.
# usage: android/build-apk.sh [OUT_APK]        (default: dist/wildcard.apk)
# needs: java/javac/keytool, zip, and  apt-get install -y aapt apksigner zipalign dalvik-exchange
# env:   ANDROID_JAR  a platform android.jar with resources (API 34). If unset, a community build is downloaded.
#        KS / KPASS   release keystore and password. Default: android/keystore/wildcard.p12, generated on first run.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(dirname "$HERE")
OUT=$(realpath -m "${1:-$ROOT/dist/wildcard.apk}")
JAR=${ANDROID_JAR:-$HERE/.cache/android-34.jar}
KS=${KS:-$HERE/keystore/wildcard.p12}; KPASS=${KPASS:-wildcard-sideload}
for t in javac keytool zip aapt2 dalvik-exchange zipalign apksigner; do command -v $t >/dev/null || { echo "missing tool: $t (apt-get install -y aapt apksigner zipalign dalvik-exchange)"; exit 1; }; done
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
if [ ! -f "$JAR" ]; then
  mkdir -p "$(dirname "$JAR")"
  echo "Downloading compile-time android.jar (community build of AOSP android-14; only used to compile, never shipped)..."
  curl -fsSL -o "$JAR" https://raw.githubusercontent.com/Reginer/aosp-android-jar/main/android-34/android.jar
fi
if [ ! -f "$KS" ]; then
  mkdir -p "$(dirname "$KS")"
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -storepass "$KPASS" -alias key -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Wildcard,O=Wildcard,C=US" 2>/dev/null
  echo "Generated signing key $KS - back it up: updates must be signed with the same key."
fi
# 1. stage the game as the app's assets
mkdir -p "$W/assets"; cp "$ROOT/index.html" "$W/assets/"; cp -r "$ROOT/js" "$W/assets/js"; cp -r "$ROOT/fonts" "$W/assets/fonts"
# 2. Java -> classes -> dex
mkdir -p "$W/classes"; javac -nowarn -source 8 -target 8 -bootclasspath "$JAR" -d "$W/classes" $(find "$HERE/src" -name '*.java') 2>&1 | grep -v -E '^(Picked|warning|Note)' || true
dalvik-exchange --dex --min-sdk-version=24 --output="$W/classes.dex" "$W/classes" 2>&1 | grep -v Picked || true
# 3. resources (icon) + manifest + assets
aapt2 compile --dir "$HERE/res" -o "$W/res.zip"
aapt2 link -I "$JAR" --manifest "$HERE/AndroidManifest.xml" "$W/res.zip" -A "$W/assets" --min-sdk-version 24 --target-sdk-version 34 -o "$W/base.apk"
(cd "$W" && zip -q -X base.apk classes.dex)
# 4. align, then sign (v2/v3; minSdk 24 supports v2)
zipalign -f -p 4 "$W/base.apk" "$W/aligned.apk"
mkdir -p "$(dirname "$OUT")"
apksigner sign --ks "$KS" --ks-pass pass:"$KPASS" --min-sdk-version 24 --out "$OUT" "$W/aligned.apk" 2>&1 | grep -v Picked || true
rm -f "$OUT.idsig"
apksigner verify --verbose --print-certs "$OUT" 2>&1 | grep -v Picked | head -8
zipalign -c -p 4 "$OUT" && echo "zipalign OK"
ls -l "$OUT"
