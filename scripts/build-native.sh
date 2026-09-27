#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/native/build"
cmake -S "$ROOT/native" -B "$BUILD" -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON
cmake --build "$BUILD" --config Release
ctest --test-dir "$BUILD" --output-on-failure -C Release
echo "BeatCheat Pro native DSP build + tests passed."
