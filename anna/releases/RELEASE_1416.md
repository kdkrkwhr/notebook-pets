# 1.4.16 — Preserve the game tool's storage permissions

Prepared 2026-10-22 after Anna reported a `storage declaration drift` error while reviewing 1.4.15. The owner authorized a new 1.4.16 review after successful testing because already-cut Anna versions cannot be replaced under the same version number.

- Game tool **0.9.7** declares `aps.kv`, `aps.files`, `aps.scope.tool.read` and `aps.scope.tool.write` in both its distribution manifest and runtime `describe` response. Remove the tool's redundant structured `storage` field: the server's cached protocol manifest did not retain it, leaving only `aps.kv` and causing the mismatch.
- The app keeps its existing schema-3 storage declaration. Both representations cover the same KV, files and tool read/write access; no new app permission, game rule, save format, AI behavior or UI change is introduced.
- Protocol tests compare the normalized capability set with the app declaration. Standalone packaging checks the complete binary `describe` result, so a stale binary or incomplete capability declaration cannot pass the build smoke test.
- Includes the existing mobile layouts and five languages from 1.4.15. Existing characters, artwork and conversations must be preserved. Shared listing, public 1.4.13 and public web stay unchanged during review submission.

## Validation and deployment — 2026-10-23

Runtime source **daa3014**. [Anna CI 39711760114](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39711760114) passed Windows and Linux: each **135 browser / 96 JS / 76 storage-protocol** checks, strict manifest validation and standalone binary build/smoke. [Shared CI 39711760205](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39711760205) also passed. Local Windows finished **135 browser / 96 JS / 76 storage-protocol**, strict validation and binary smoke. The first Windows CI attempt timed out after slow tooling setup; its rerun passed. An initial local test used stale generated engine assets; `prepare:assets` followed by the full protocol suite passed.

Both tested archives are uploaded and pinned by immutable **Executa 818 / tool 0.9.7 / master 1193**. Downloaded CDN bytes match the tested archives and metadata:

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| Linux | 19,020,061 | `2a65ab5b07f17ac4a5f8ce012a27c9a791af8295756a72ef64a4dce21ad2969b` |
| Windows | 9,922,030 | `b993dc79ff747aebb367f6a419306832e570759e773d02815cb5e84c9a82a27f` |

Owner test app **1.4.16 / working revision 92 / installed 0.0.0-draft** is verified. Actual cloud user executable **35689** reports **0.9.7 / loaded / running**, with install status **success / Already loaded** on the final check. An initial stale executable-path failure was cleared by reinstalling only the bundled tool and reopening the draft; APS data was retained. The cloud agent resumed normally on the next day's refresh. Installed UI is connected with no notice, the existing portrait and two chat messages load, and the home renderer reports ready. Installed `app.js`, `mobile.css`, `data.mjs`, `home-sprite.mjs` and `anna-tool-ids.js` hashes match the local bundle. No UI source change relative to 1.4.15; rebuilt text file bytes can differ in line endings.

Server manifest validation returned **valid: true / errors: []** after installation, on the following day and for the frozen 1.4.16 after submission. Runtime `manifest_cache` still contains all four capabilities. The five owner APS documents (game, artwork, chat, walk story and personality draft) retain identical values and ETags through final verification. Paid AI calls: **0 text / 0 images**.

## Review submission

Immutable **1.4.16 / ID 1587** was cut and submitted for release review on **2026-10-23**. Bundle **1472 / 175 files / 171604935 bytes**, manifest SHA-256 **83c7c16b6be79de692bdb8608d3eb57a0af446dcaf0bfd4c3cd3669f237cba8a**. Working content hash **c6ed85cf2c262e4f340f1b4610f1c1c42058c758c8b5be3c22cf4727957e6fcf**; `dirty_vs_latest_cut: false`. Minimum and exact bundled tool versions are both **0.9.7**, frozen as Executa **818**.

The release request returned **release_review_state: pending / is_latest: false / published_at: null**. Candidate **1.4.15 / 1486** is now **superseded**. Developer Console independently shows **1.4.16 in release review**. Public **1.4.13 / 1446**, its complete immutable row, shared listing and all six screenshots are unchanged. No public web deployment. Approval and publication of 1.4.16 are still pending Anna's review.

Physical iOS/Android, native mobile shell/keyboard/back behavior and new AI-provider output quality were not tested in this storage-only fix. Private evidence is under `.local/storage-fix-*`; it contains owner data and is not committed. Reviewer instructions: [REVIEW_1416.md](../reviews/REVIEW_1416.md).
