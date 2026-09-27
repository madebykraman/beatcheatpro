# BeatCheat Pro Quality Gates

The detector is not considered production-ready because it returns a BPM value.

## Required measurements

For a labeled reference corpus measure:

- onset F1
- beat F1
- downbeat F1
- median absolute timing error
- 95th percentile timing error
- false-positive rate
- tempo octave error rate
- false-cut rate

## Test categories

1. Quantized electronic 4/4
2. Live drums with timing variation
3. Swing and shuffle
4. Syncopated percussion
5. Sparse intros and breakdowns
6. Dense masters
7. Tempo ramps and changes
8. Half-time/double-time ambiguity
9. Acoustic recordings
10. Low-dynamic-range masters

## Product rule

A beat-grid-only detector can be useful for visualization, but BeatCheat Pro's edit mode must require audio evidence. A proposed cut without supporting onset evidence should be treated as lower confidence.

The JS detector is the reference implementation. The native C++ detector must be benchmarked against the same corpus before replacing it in production.
