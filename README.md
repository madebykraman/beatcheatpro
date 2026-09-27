# BeatCheat Pro

High-quality beat and onset detection for Adobe Premiere Pro.

## Product direction

BeatCheat Pro is designed to distinguish musical events from a simplistic BPM grid. The analysis pipeline is intentionally layered:

1. Audio feature extraction
2. Onset candidate detection
3. Tempo/beat tracking
4. Local transient refinement
5. Event classification and confidence scoring
6. Timeline-accurate marker export

## Premiere architecture

The plugin targets Premiere Pro UXP. Premiere 26.2+ is the intended native-processing target because UXP Hybrid Plugins provide a C++ bridge suitable for performance-critical audio DSP.

## Current status

This repository is being initialized as a production-oriented foundation. The first milestone establishes branding, analysis contracts, deterministic pure-JS DSP primitives, and a Premiere-facing marker abstraction. Native C++ DSP can be added behind the same interface without changing the UI contract.

## Internal brand

**BeatCheat Pro**

Tagline: **Hear the beat. Cut on the moment.**

Internal product namespace: `com.madebykraman.beatcheatpro`

