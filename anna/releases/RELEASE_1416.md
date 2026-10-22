# 1.4.16 — Preserve the game tool's storage permissions

Prepared 2026-10-22 after Anna reported a `storage declaration drift` error while reviewing 1.4.15. The owner authorized a new 1.4.16 review after successful testing because already-cut Anna versions cannot be replaced under the same version number.

- Game tool **0.9.7** declares `aps.kv`, `aps.files`, `aps.scope.tool.read` and `aps.scope.tool.write` in both its distribution manifest and runtime `describe` response. Remove the tool's redundant structured `storage` field: the server's cached protocol manifest did not retain it, leaving only `aps.kv` and causing the mismatch.
- The app keeps its existing schema-3 storage declaration. Both representations cover the same KV, files and tool read/write access; no new app permission, game rule, save format, AI behavior or UI change is introduced.
- Protocol tests compare the normalized capability set with the app declaration. Standalone packaging checks the complete binary `describe` result, so a stale binary or incomplete capability declaration cannot pass the build smoke test.
- Includes the existing mobile layouts and five languages from 1.4.15. Existing characters, artwork and conversations must be preserved. Shared listing, public 1.4.13 and public web stay unchanged during review submission.

Deployment and actual installed-runtime verification will be recorded here after testing. Until then this document is a preparation record, not evidence of a completed deployment or submission.
