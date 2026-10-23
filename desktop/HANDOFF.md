# Desktop handoff — 2026-10-23

- Branch: `release-desktop`, based on Anna `release` at `04f4b405` (UI 1.4.16 / game tool 0.9.7).
- Desktop version: `0.1.0a1`. Anna and public web deployment are outside this task.
- Shared game rules and original worktree remain unchanged. Original Anna save data is not read or migrated.
- Implementation: native pywebview window, local SQLite APS adapter, full existing UI, Codex CLI text/vision/image generation, settings/cancel/backup, Windows Inno Setup and macOS DMG build workflows.
- Local checks: 9 backend/storage/security tests passed; real-backend UI integration passed for drawing birth, uploaded artwork, chat, care, free first-home appearance, five locales and reload persistence. Source native window opened twice with identical pet identity and origin; native JS bridge verified.
- Live Codex 0.159.3: text, image analysis, and one actual image generation succeeded. Codex exec omits inline image artifacts from JSONL; collection now reads only the freshly emitted thread ID's image folder. Frozen Windows package passed two native launches, bridge calls, persistence and shutdown checks. Installer and Mac CI results are recorded after completion below.
- Remaining distribution limits: unsigned Windows binary / ad-hoc signed, non-notarized Mac bundle; manual CLI install/login; no auto updater, sync, Anna save import, or restore UI. Mac CLI/account integration requires a user account on a real Mac.
