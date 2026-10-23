# Desktop handoff — 2026-10-23

- Branch: `release-desktop`, based on Anna `release` at `04f4b405` (UI 1.4.16 / game tool 0.9.7).
- Desktop version: `0.1.0a1`. Anna and public web deployment are outside this task.
- Shared game rules and original worktree remain unchanged. Original Anna save data is not read or migrated.
- Implementation: native pywebview window, local SQLite APS adapter, full existing UI, Codex CLI text/vision/image generation, settings/cancel/backup, Windows Inno Setup and macOS DMG build workflows.
- Local checks: 9 backend/storage/security tests passed; real-backend UI integration passed for drawing birth, portrait upload/download, chat, care, free first-home appearance, five locales and reload persistence. Source native window opened twice with identical pet identity and origin; native JS bridge verified.
- Live Codex 0.159.3: text, image analysis, and one actual image generation succeeded. Codex exec omits inline image artifacts from JSONL; collection now reads only the freshly emitted thread ID's image folder. Frozen Windows package passed two native launches, bridge calls, persistence and shutdown checks. Installer and Mac CI results are recorded after completion below.
- Remaining distribution limits: unsigned Windows binary / ad-hoc signed, non-notarized Mac bundle; manual CLI install/login; no auto updater, sync, Anna save import, or restore UI. Mac CLI/account integration requires a user account on a real Mac.

## Final package verification

- Package source commit: `3f212c44fc8eae1b711831f76a22ad416eac5b0c`.
- [Desktop CI run 39892147126](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39892147126): **all three jobs passed** — Windows x64, macOS 15 Apple Silicon, macOS 15 Intel.
- Each job ran the 9 storage/core/transport checks, built its native installer and launched the frozen app twice. The native bridge, persistent pet identity and stable local origin were checked. The Windows job also ran the full UI scenario against the actual Python/SQLite backend with deterministic AI.
- Locally downloaded Windows installer: SHA-256 matched CI. Installed into an isolated path, launched twice, verified identity/data preservation, uninstalled successfully, and confirmed the save and a preservation marker remained. Existing installations are explicitly protected by the verification script.
- Local installer evidence: `desktop/runtime/desktop-installer-verification.json`; full native reports and UI screenshots are also included in CI artifacts. These disposable test files are excluded from Git.
- Deliverables: `dist/installers/NoteBuddy-0.1.0a1-windows-x64-setup.exe`, `NoteBuddy-0.1.0a1-macos-arm64.dmg`, `NoteBuddy-0.1.0a1-macos-x64.dmg`, plus combined `SHA256SUMS.txt`.
- At package completion, `release`, `release-web`, Anna review/test deployments, web site and original dirty worktree were left unchanged. The installers were initially delivered as local files and workflow artifacts.

## Public preview release — 2026-10-23

- User explicitly requested publishing the installers. [NoteBuddy Desktop 0.1.0a1](https://github.com/kdkrkwhr/notebook-pets/releases/tag/desktop-v0.1.0a1) is now a public GitHub **prerelease**, tagged `desktop-v0.1.0a1` at the verified package source `3f212c44fc8eae1b711831f76a22ad416eac5b0c`.
- Published the Windows x64 installer, both macOS DMGs and combined `SHA256SUMS.txt`. GitHub asset sizes and SHA-256 digests match the locally verified CI deliverables.
- Added direct downloads, prerequisites and preview limitations to Korean/English root READMEs on `release` and `release-desktop`, plus this branch's desktop guide. The default branch receives documentation changes only; no Anna test/review version or public web build is deployed for this distribution task.
