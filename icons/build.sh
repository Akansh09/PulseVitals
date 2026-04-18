#!/bin/bash
# Rasterize PulseVitals icons from SVG sources to PNG.
# Uses qlmanage (macOS built-in). For Linux / CI, install rsvg-convert or ImageMagick and swap the commands below.

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

rasterize() {
  local svg="$1"
  local size="$2"
  local out="$3"
  qlmanage -t -s "$size" -o . "$svg" >/dev/null 2>&1
  local stem
  stem="$(basename "$svg" .svg)"
  mv "${stem}.svg.png" "$out"
}

rasterize source/pulsevitals.svg 128 128.png
rasterize source/pulsevitals.svg 48 48.png
rasterize source/pulsevitals-32.svg 32 32.png
rasterize source/pulsevitals-16.svg 16 16.png

echo "Generated: 16.png 32.png 48.png 128.png in $DIR"
