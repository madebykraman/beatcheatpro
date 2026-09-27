# BeatCheat Pro Cut Engine

Detection and editing remain separate stages.

1. Detector emits timestamped evidence.
2. Event normalizer removes impossible and duplicate events.
3. Cut scorer evaluates whether an event is strong enough to cut on.
4. Preview displays proposed cuts.
5. Explicit user action commits the edit.

Default cut policy:
- confidence >= 0.78
- actual onset evidence or beat/onset agreement
- minimum shot length 350 ms
- no collision inside the minimum shot window

Future modes:
- BEAT
- DOWNBEAT
- STRONG
- DRUM
- SMART

The final Premiere edit should be one undoable transaction. No destructive cut occurs during analysis.