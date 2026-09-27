# BeatCheat Pro Windows UXP Addon

This directory contains the Adobe UXP Hybrid native bridge.

## SDK

Build against the Adobe UXP Hybrid Plugin SDK supplied separately from this repository. The SDK Windows template uses Visual Studio, x64, a Dynamic Library configuration, `.uxpaddon` output, and SDK `src/api` plus `src/utilities` include paths.

BeatCheat Pro's native bridge is in `addon.cpp`. The DSP implementation remains independent of Adobe in `native/src/detector.cpp`.

## Expected Windows bundle

Place the compiled addon at:

`win/x64/beatcheatpro_dsp.uxpaddon`

The JavaScript layer loads it with `require("beatcheatpro_dsp.uxpaddon")`.

Build **Release**, not Debug, for a distributable Windows addon.