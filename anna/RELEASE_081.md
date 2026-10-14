# 0.8.1 · Keep the companion's appearance in dungeons

App **0.8.1**, unchanged game tool **0.6.0**. Owner test deployment pending; preserve review **0.3.4** and its shared listing.

## Fix

- The saved pixel portrait was correctly keyed to the current companion and source artwork, but the dungeon renderer only sampled its colors and drew a common species rig. Different custom companions could therefore look like the same old character. The rig's palette also survived scene loads while replacement images were loading or unavailable.
- Dungeon rendering now uses the current companion's actual pixel portrait. If that image cannot load, the current portrait is converted locally using the same 64 × 64 conversion as the saved pixel image. It never falls back to an earlier companion's appearance.
- Opening a scene clears the previous portrait and canvas. Closing/resetting invalidates outstanding loads; a late completion cannot replace a newer scene. If both current images fail, entry remains disabled without spending a walk charge.
- Automatic movement, camera, battles, hit/defeat effects and reduced-motion support remain. The single portrait uses a small walking bob and horizontal mirroring; it does not invent separate side/rear artwork. No new AI requests, storage writes or game-rule changes are introduced.

## Verification

- Five focused browser checks passed, including same-color/different-silhouette rendering, in-window companion and portrait replacement, delayed image completion, fallback and failed/cleared loads, plus pixel preparation/retry.
- JavaScript **76** and strict manifest validation passed. Full browser checks and installed verification pending.
