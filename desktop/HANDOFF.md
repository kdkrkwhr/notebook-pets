# Desktop handoff — 2026-10-23

## Claude Code subscription support — 0.1.0a3

- Desktop only. User requested Claude Code-only operation without another AI account or image API. Anna UI 1.4.16 / tool 0.9.7, review listing and public web remain unchanged.
- Added a Codex / Claude Code selector with separate profiles, preserving the legacy Codex settings and all existing game data. No provider fallback, automatic image regeneration or paid retries.
- Claude Code uses its own subscription login through the unmodified CLI with isolated temporary sessions, no tools/MCP/custom settings, and no inherited API-key/provider overrides. Auth status is checked through the CLI; credentials are never read by NoteBuddy.
- Claude draws self-contained SVG; the bounded local renderer converts it to PNG. This is vector illustration, not Codex image-model output. External resources, scripts, embedded images, recursive references and empty drawings are rejected. New renderer dependency and Rust license notices are bundled.
- Live Windows Claude Code 2.1.301 checks passed: image analysis correctly described the mint character, gold eyes and star scarf; generation produced a valid transparent 512px PNG. Only Claude subscription requests were used. Existing installed app/data were not changed; checks used a disposable folder.
- Local validation: 19 backend/storage/provider/security checks; browser drawing/chat/home/pet flow plus provider switch, separate profiles, five locales, reload persistence and unchanged portrait; native Windows source launch, local SVG rendering and companion lifecycle all passed.
- UI and guide explain that account-level paid usage credits/extra usage must be disabled to stay within the subscription. The app does not change account billing settings or purchase credits. Exact CLI flags depend on current official CLI support; incompatible versions fail with an update message.
- Live home-sprite generation also passed: one Claude call produced a transparent 512px sheet with 16 nonempty, distinct frames. Visual inspection confirmed front/left/right/back rows and gait/blink variations. Complex character fidelity still depends on the model.
- Package source: `bd5726d8791e17bdee15ce18c7d4ac7ec92cbeb4`. [CI 39910070980](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39910070980) passed on Windows x64, macOS 15 Apple Silicon and macOS 15 Intel. All three ran 19 tests; Windows also ran the browser scenario. Each frozen app launched twice, preserved pet/origin, rendered SVG locally, and passed companion/shutdown checks. Mac account-authenticated Claude calls have not been tested locally.
- Published [desktop-v0.1.0a3](https://github.com/kdkrkwhr/notebook-pets/releases/tag/desktop-v0.1.0a3) at the exact tested source commit above. Three installers and SHA256SUMS were downloaded from CI and compared with GitHub release asset size/digest; all public download URLs returned HTTP 200. Local installers are in `dist/installers/0.1.0a3/`. Korean/English root READMEs and the desktop guide link to the new packages. Changes are committed/pushed to the desktop track; the Anna track receives download documentation only.

## Desktop companion 0.1.0a2 — verified packages

- User requested an adjacent Call outside button, a free-roaming pixel companion and a temporarily white original portrait. Desktop scope only; Anna and public web are unchanged.
- Native WinForms/Cocoa surfaces reuse personal 16-frame home sprites or a free portrait-derived default. Motion and summon/recall never invoke AI or persist new artwork. No new Python dependencies or duplicated game rules.
- Package source: `c0efe9883ecf7df7efc551b4f583c0cb8a135d3f`, branch `release-desktop`. Anna remains UI 1.4.16 / tool 0.9.7; neither Anna nor public web is deployed by this change.
- [Desktop CI run 39905138820](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39905138820): Windows x64, macOS 15 Apple Silicon and macOS 15 Intel all passed. Each ran 11 backend/storage/security checks, built an installer and opened the frozen app twice with the same saved pet and local origin. Windows also passed the real-backend browser flow, all 16 personal sprite frames, failed-summon recovery and zero AI requests for summon/recall.
- All six native package runs verified summon, actual timer movement, white/hidden original portrait, recall, native dismissal, unchanged artwork, automatic dismissal when artwork changes, restart persistence and clean shutdown with a pet still outside. The Windows source app was also visually inspected in its actual native window.
- The user's installed 0.1.0a1 and live data were not replaced during testing. This update reuses its installer identity, data directory and save format. The original isolated install/uninstall preservation test is recorded below; this release's new native behavior was verified in the frozen packages. Manual Mac pointer interaction and multi-monitor behavior remain separate from CI validation.
- Distribution limits remain: unsigned Windows / ad-hoc signed, non-notarized Mac; manual updates; no new AI integration, sync or Anna save import. A portrait-derived default has no invented directional poses; existing valid personal home sheets retain their directional/action frames.
- [Public desktop preview 0.1.0a2](https://github.com/kdkrkwhr/notebook-pets/releases/tag/desktop-v0.1.0a2): published the three verified installers and combined SHA-256 manifest at tag `desktop-v0.1.0a2`, targeting the package source above. GitHub asset sizes and SHA-256 digests match the downloaded CI packages. Local copies: `dist/installers/0.1.0a2/`. Korean/English root READMEs and the desktop guide link to this release.

## Initial desktop preview 0.1.0a1

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
