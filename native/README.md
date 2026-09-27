# BeatCheat Pro Native / Hybrid DSP

BeatCheat Pro keeps the detector core independent from Adobe UXP.

## Requirements

- Premiere Pro 26.2+
- UXP Developer Tool 2.2+
- Adobe UXP Hybrid Plugin SDK from the Adobe Developer Console
- CMake 3.20+
- C++20 toolchain

Hybrid plugins require Manifest v6, the enableAddon permission, and a .uxpaddon binary.

## Build

Set UXP_HYBRID_SDK_ROOT to the unpacked Adobe UXP Hybrid Plugin SDK.

Configure CMake with BUILD_UXP_ADDON=ON and UXP_HYBRID_SDK_ROOT set to that SDK path, then build in Release mode.

The bridge is deliberately thin. The DSP implementation lives in src/detector.cpp; Adobe-specific ABI code lives only in uxpaddon/addon.cpp.

## Packaging

The final bundle needs the native addon for each supported platform/architecture. For full distribution this means macOS arm64, macOS x64, and Windows x64.

Production macOS binaries must be Developer ID signed and notarized.

Do not commit Adobe SDK headers or compiled .uxpaddon binaries to this repository.
