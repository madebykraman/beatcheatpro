# BeatCheat Pro — engineering roadmap

## Phase 1 — foundation (implemented)
- Premiere Pro UXP panel and command
- Internal brand namespace: com.madebykraman.beatcheatpro
- WAV PCM decoder (16/24/32-bit)
- mono downmix
- spectral-flux onset envelope
- local median/std normalization
- onset peak picking
- tempo prior
- phase refinement against real audio evidence
- confidence-scored beat/onset events
- Premiere marker export
- Premiere 2026 transaction-safe marker mutation
- source-to-sequence timing mapping primitive

## Phase 2 — production detector
Replace the intentionally simple JS DSP path with a native Hybrid DSP engine on Premiere 26.2+.

Target pipeline:
audio -> high-quality resampling -> pre-emphasis/DC removal -> multi-band STFT -> spectral flux + complex-domain novelty -> adaptive whitening -> local peak picking -> tempo hypothesis set -> dynamic beat tracking -> bar/downbeat inference -> local transient refinement -> confidence calibration -> event classification.

BPM must never directly manufacture an event when the audio contains no supporting evidence.

## Phase 3 — timeline intelligence
- detect selected sequence audio clip
- match analysis file to project item
- account for clip start, source in-point and playback speed
- frame/tick quantization only at the final Premiere boundary
- sequence-offset calibration
- marker de-duplication using BeatCheat metadata

## Phase 4 — edit engine
- preview cuts before committing
- cut selected video at high-confidence events
- downbeat-only cuts
- strongest-event cuts
- configurable minimum shot length
- preserve transitions where possible
- one undoable Premiere transaction per operation

The cut engine must be conservative: a false cut is more destructive than a missed weak onset.

## Phase 5 — quality lab
Create a reproducible audio corpus covering straight 4/4 electronic, live drums, swung hats, acoustic recordings, syncopated percussion, tempo changes, half-time/double-time ambiguity, sparse intros, dense masters and low-dynamic-range masters.

Measure beat F1, onset F1, median timing error, 95th percentile timing error, false positive rate, false cut rate and tempo octave error rate.

Algorithm changes should be evaluated against the same corpus before release.
