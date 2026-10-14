# 1.0.0 · 2.5D dungeon companion

App **1.0.0**, unchanged game tool **0.6.0**. The owner asked to number the app as 1.x from now on; 1.0.0 contains everything from 0.10.0–0.10.1 plus the dungeon companion motion below. Owner test deployment was verified on **2026-10-14 KST**. This is not a public release: the shared listing and pending **0.8.1** review remain the review materials.

## Changes

- **2.5D dungeon companion.** The companion's single pixel portrait no longer snaps when it changes direction. It turns through its card edge over 180 ms, squashes and lifts on alternate steps, leans into the walk, appears slightly smaller moving away and larger approaching, and carries stepped shading lit from the world's left that stays put when the sprite mirrors. The ground shadow shrinks as the companion lifts. Reduced motion snaps the turn and skips the step motion.
- No back view or extra anatomy is generated; there is no new art, AI request, storage or game change.

## Verification

- JavaScript **80**, browser **89** and strict manifest validation passed locally. New checks cover the turn timing (edge-on halfway, side kept on vertical travel, reduced motion snaps), a mid-turn sprite narrower than half its full width and shading that stays on the world's left when mirrored. A rendered frame strip with the demo companion was inspected.
- Sources **e5e34fb** (version) and **5cac4e7cfc955e738e1faa04e3f5fc679cafc7a7** passed both Windows/Linux jobs of Anna CI and the engine workflow. The unchanged tool was not republished.

## Owner deployment

- `apps push` produced working revision **48** (143 ready files, no upload block). `apps cut 1.0.0` created immutable version ID **1383**, froze Executa version **746 (0.6.0)** and reused both cached binaries. Installed to the owner as **0.0.0-draft** through the official working-install endpoint; the actual agent reports tool **0.6.0**, loaded and running.
- After reopening, the installed UI reports **Connected**. `dungeon-avatar.mjs` and `dungeon-scene.mjs` returned HTTP 200 with SHA-256 identical to the tested files. The account had no open dungeon at verification time, so the shipped avatar module from the installed app was rendered with the companion's real pixel image in a temporary overlay (since removed); the turn and walk frames were inspected.
- No game action, walk charge or AI request was used. Game, art, chat, walk story and personality-draft values and ETags matched before installation and after the checks. Review **0.8.1 pending_review** and the listing text fields were preserved; the re-issued screenshot CDN URLs serve byte-identical images. No review submission or public release.
