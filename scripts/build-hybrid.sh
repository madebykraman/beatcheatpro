#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${UXP_HYBRID_SDK_ROOT:-}" ]]; then
  echo "UXP_HYBRID_SDK_ROOT must point to Adobe's extracted UXP Hybrid Plugin SDK." >&2
  exit 2
fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/native/build-hybrid"
cmake -S "$ROOT/native" -B "$BUILD" -DCMAKE_BUILD_TYPE=Release -DBUILD_UXP_ADDON=ON -DBUILD_TESTING=ON -DUXP_HYBRID_SDK_ROOT="$UXP_HYBRID_SDK_ROOT"
cmake --build "$BUILD" --config Release
ctest --test-dir "$BUILD" --output-on-failure -C Release
echo "Native addon compiled. Package the resulting dynamic library as .uxpaddon in the required architecture folder."
