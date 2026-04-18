#!/usr/bin/env bash
# Build a Chrome Web Store-uploadable zip of the PulseVitals extension.
# Excludes repo-local files the store doesn't need.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")"
OUT_DIR="${ROOT}/dist"
OUT_ZIP="${OUT_DIR}/pulsevitals-${VERSION}.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP"

# Include list. Keep this tight — the store is happier with a minimal bundle.
INCLUDE=(
  "manifest.json"
  "background.js"
  "service-worker.js"
  "popup.html"
  "popup.js"
  "options.html"
  "options.js"
  "batch.html"
  "batch.js"
  "compare.html"
  "compare.js"
  "axe-lite.js"
  "privacy.html"
  "terms.html"
  "LICENSE"
  "icons"
  "_locales"
)

# Exclude everything else explicitly by including only the allowlist above.
zip -r "$OUT_ZIP" "${INCLUDE[@]}" -x "*.DS_Store" "__MACOSX/*"

echo ""
echo "Packaged: $OUT_ZIP"
ls -lh "$OUT_ZIP" | awk '{print "  size: " $5}'
echo ""
echo "Next:"
echo "  1. Load ${OUT_ZIP} unpacked to verify it still runs."
echo "  2. Upload to https://chrome.google.com/webstore/devconsole when the dev account is live (seed #34)."
