# BeatCheat Pro Native DSP

This directory is reserved for the Premiere UXP Hybrid Plugin implementation.

Premiere Pro 26.2+ supports UXP Hybrid Plugins, allowing JavaScript/UXP to call a compiled C++ addon. Adobe explicitly identifies audio DSP and waveform analysis as appropriate workloads for this architecture.

The native layer will own:
- high-throughput PCM decoding where required
- multi-band spectral flux
- complex-domain onset detection
- adaptive whitening / normalization
- kick/snare/hat feature bands
- beat tracking and local phase correction
- optional ML inference
- SIMD/vectorized processing

The stable JS contract is:
analyzeAudio(samples, sampleRate, options) -> { bpm, quality, events[] }

Keep the UI independent of C++ implementation details.

Required Adobe host target for this layer: Premiere Pro 26.2+.
