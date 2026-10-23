# Review update — 1.4.16 / 2026-10-23

This replaces pending 1.4.15 after Dora reported **storage declaration drift**. The owner explicitly authorized 1.4.16 because an already-cut version cannot be overwritten. The submission is **pending**; public 1.4.13 remains live.

## What changed

Bundled game tool **0.9.7** now declares `aps.kv`, `aps.files`, `aps.scope.tool.read` and `aps.scope.tool.write` in both its distribution manifest and binary `describe` response. The prior cached runtime manifest retained only `aps.kv`; its separate structured `storage` declaration was lost. Removing that redundant field and declaring the complete host-capability set keeps the cached runtime and the app's existing schema-3 storage permissions equivalent.

The app requires exact/minimum tool **0.9.7**, frozen as **Executa 818** with tested Windows and Linux binaries. App permissions are unchanged. This is not a temporary server-cache-only repair. UI source, gameplay, save format and AI behavior are unchanged from 1.4.15; its mobile layouts and English/Korean/Japanese/Simplified Chinese/Traditional Chinese support remain included.

## Review checks

1. Open **1.4.16 / version ID 1587** and validate its manifest. The existing storage declaration should be accepted without the reported drift error. The server returned **valid: true, errors: []** after installation and again after submission.
2. Install the candidate and open NoteBuddy. Confirm the bundled game tool reports **0.9.7** and the app connects. For an existing save, check that the companion, saved portrait, conversation history and home still load; do not reset user data.
3. Check `describe`/the cached tool manifest for all four capabilities above. Our regression tests compare their normalized storage declaration to the app and compare the entire packaged binary `describe` result to the source manifest.
4. The mobile checks from [1.4.15](REVIEW_1415.md) still apply. At 320px with touch input, check drawing/upload controls, chat, care help, albums, evolution actions, home/shop and dungeon controls in the five languages. Opening views and switching languages should not invoke AI.

## Verification and release state

Source **daa3014** passed [Windows/Linux Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39711760114): **135 browser / 96 JS / 76 storage-protocol** per OS, strict manifest validation and standalone binary build/smoke. Local Windows checks and [shared CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39711760205) also passed. The owner draft at **revision 92** runs actual cloud tool **0.9.7**, loaded and running with no installation error. Installed UI source hashes and both CDN archive hashes match the tested artifacts. Owner game/art/chat/story/personality values and ETags remain unchanged. No paid AI calls were made.

Bundle **1472 / 175 files / 171604935 bytes**; manifest SHA-256 **83c7c16b6be79de692bdb8608d3eb57a0af446dcaf0bfd4c3cd3669f237cba8a**. Release review state **pending**, `is_latest: false`, `published_at: null`; 1.4.15 is **superseded**. Public 1.4.13 and shared listing/screenshots are unchanged. Physical iOS/Android, native mobile-shell behavior and fresh provider-quality checks remain unverified. See [release record](../releases/RELEASE_1416.md) for package hashes and full deployment evidence.
