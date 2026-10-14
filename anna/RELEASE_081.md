# 0.8.1 · Keep the companion's appearance in dungeons

App **0.8.1**, unchanged game tool **0.6.0**. Owner test deployment verified on **2026-10-14 KST**. Initial deployment preserved review 0.3.4; the user's subsequent request updated the listing and resubmitted **0.8.1**, now **pending_review**.

## Screenshot follow-up · 2026-10-14 KST

- Replaced the initial random-starter demonstration with a matching drawing/result example. An original sprout doodle was entered through the actual editor; the unchanged app analysis, birth-image and personality prompts produced **Mori**, a plant/nature companion, through Anna. Preparation used one analysis, one image generation and one personality call. No production game/storage records were read or changed.
- The listing now starts with the completed companion, then its reference drawing, followed by the album, the same companion's pixel dungeon preview and the welcome screen. Recorded outputs and hashes are in `store/demo/`; capture reuses them with no extra AI calls.
- Strict validation, reference/result hash checks, no starter fallback, browser-error checks and visual inspection passed. `apps sync-meta` updated all five screenshots; the server still reports **0.8.1 pending_review**, candidate **1370**, bundle **1271**, revision **44**. The first two CDN images were downloaded and visually verified in the intended order. No new app cut, tool deployment or resubmission was needed for this listing-only update.

## Review resubmission · 2026-10-14 KST

- Updated the public introduction for photo/drawing creation, personality and recorded experiences, six continuing walk arcs, three pixel dungeons and current AI usage. Charges recover every five minutes up to five, and each dungeon stage costs one charge. Random starters still use AI for personality creation.
- Replaced four historical screenshots with five current UI captures, including the dungeon preview. `scripts/capture_store.mjs` uses disposable real Python-engine views with a read-only SDK fixture; no paid AI or production storage is called. All five captures were visually checked; provenance is recorded in `store/README.md` and `store/capture.json`.
- `anna-app validate --strict` passed. `apps sync-meta --json` synchronized the listing, privacy URL and five CDN screenshots. Then `apps submit-review notebuddy --json` returned **pending_review / review_candidate_version 0.8.1**.
- An independent server read confirmed candidate **1370 / 0.8.1**, ready bundle **1271**, unchanged working revision **44**, all eight listing text/URL fields matching `app.json`, and five Anna CDN screenshots. The existing tool **0.6.0 / version 746** and application bundle were not changed by this metadata submission.
- The [English review guide](REVIEW_081.md) and both language READMEs describe the current candidate. The CLI provides no separate reviewer-notes field; that guide is repository documentation, not a separately uploaded form. This is a review request, not approval or public publication.

## Fix

- The saved pixel portrait was correctly keyed to the current companion and source artwork, but the dungeon renderer only sampled its colors and drew a common species rig. Different custom companions could therefore look like the same old character. The rig's palette also survived scene loads while replacement images were loading or unavailable.
- Dungeon rendering now uses the current companion's actual pixel portrait. If that image cannot load, the current portrait is converted locally using the same 64 × 64 conversion as the saved pixel image. It never falls back to an earlier companion's appearance.
- Opening a scene clears the previous portrait and canvas. Closing/resetting invalidates outstanding loads; a late completion cannot replace a newer scene. If both current images fail, entry remains disabled without spending a walk charge.
- Automatic movement, camera, battles, hit/defeat effects and reduced-motion support remain. The single portrait uses a small walking bob and horizontal mirroring; it does not invent separate side/rear artwork. No new AI requests, storage writes or game-rule changes are introduced.

## Verification

- Five focused browser checks passed, including same-color/different-silhouette rendering, in-window companion and portrait replacement, delayed image completion, fallback and failed/cleared loads, plus pixel preparation/retry.
- JavaScript **76**, browser **85** and strict manifest validation passed locally. Source **f9641273ff271152bcaca467802c8c57f0f672c9** also passed both Windows/Linux jobs of [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38495497327), including protocol/storage tests and standalone package smoke tests. The unchanged tool uses the previously verified **0.6.0 / Executa version 746** packages; it was not republished.

## Installed verification

- Working revision **44**, **119** bundle files ready; immutable app **0.8.1 / version ID 1370 / bundle ID 1271**. Installed to the owner as **0.0.0-draft**.
- Actual agent **agent_51a98c681c364ed788a854773058d51b** reports tool **0.6.0**, loaded and running. Installation correctly kept that already loaded tool.
- Reopened the actual installed UI: **Connected**, no visible notice and no automatically opened dialogs. All four changed renderer modules loaded with HTTP 200, and their downloaded SHA-256 values match the tested local files exactly.
- The real account was already at a fresh-start marker before installation, so no companion was created and no live dungeon charge or AI allowance was spent for verification. Companion replacement and dungeon rendering were exercised in isolated browser fixtures. The earlier diagnostic snapshot contained a companion; later user-state changes were not restored or overwritten.
- The game/start marker, portrait index, chat, walk story and personality draft values and ETags are identical immediately before and after installation. Review **0.3.4 pending_review** and shared listing fields were restored and checked. No public publication or review resubmission.
