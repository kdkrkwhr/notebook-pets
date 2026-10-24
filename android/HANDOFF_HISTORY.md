# Android handoff history

## 2026-10-23 · 0.2.0-alpha

- Branch: `release-android`. Android-only game integration; Anna review, installed Anna, Desktop and public Pages unchanged.
- New launcher: `GameActivity`. Existing package `io.github.kdkrkwhr.notebuddy.lab`, versionCode 2, same local signing key. Keep Lab private files and downloaded model; explicit photo import only, no silent character/data migration.
- Shared web UI + Anna common modules/art + Pyodide 314.0.7 + unchanged portable Python rules bundled into the APK. No application server, no cloud AI fallback. Native bridge is restricted to the trusted local HTTPS main frame.
- Original drawing/photo is the portrait. Evolution preserves it. Home offers a free default portrait-derived pixel appearance; AI image generation unavailable.
- PC validation: 20 unit tests, APK/test APK builds, lint 0 errors / 18 advisory warnings; actual Python/WASM game-flow browser test at 320/360/412/800px and core smoke passed. See `VALIDATION.md`.
- Installed 0.2.0-alpha (versionCode 2) over Lab on Galaxy Z Flip6 after USB reconnection. Real WebView/Python game + local chat, name recall, local furniture AI, home/back navigation, reload and native SAF backup export/import passed. Reused downloaded model. Prior 0.1.0 inference figures remain historical.
- Final local APK: `runtime/dist/NoteBuddy-Android-0.2.0-alpha.apk`, 228,093,478 bytes, SHA-256 `567923c91b8467233cfc4085877e33bd923933a4c45a4d8bf275f78e2cd4cc75`. Includes the tested implementation plus device-harness import correction and minor mobile wording/header follow-up. Installed in place and returned to the ordinary launcher, not the test notebook.
- Device harness used a distinct debug test notebook; user-game snapshot and Lab original/analysis/chat file hashes were unchanged. Do not mutate the default notebook or use personal photos as test fixtures.
- UI hooks in shared web/home/evolution code are optional and retain the original web/Anna defaults. Changes exist only on this branch; no shared release or review bump was performed.
- CI setup explicitly requests supported SDK packages, packages the game and runs the mobile browser harness. Run 39921998760 passed for implementation commit ae0ba5f. Follow-up fixes the device test import base URL and records actual device results; latest run should be checked separately.
- APK, reports, screenshots and downloaded models remain under ignored `android/runtime` / build directories. No private photos or signing keys committed.

## 2026-10-23 · 0.1.0-lab

- Branch: `release-android`, based on `release-web` at `ca5648b`.
- Separate package: `io.github.kdkrkwhr.notebuddy.lab`. Native Kotlin prototype, not a full game port.
- Build: Gradle 8.13 / AGP 8.13.2 / Kotlin 2.4.21; LiteRT-LM 0.18.1; pinned Gemma 4 E2B model with size + SHA-256 verification.
- Installed debug APK on Galaxy Z Flip6, API 36. Final APK SHA-256: `287c078b0bfaa739e008a262523d5fac9e56ac325dd4fc04a48459c4c292b1fe`.
- Local unit tests: 15 passed. Device tests: 3 passed including 5 real local inference requests and user-file hash preservation. Lint: 0 errors, 14 advisory warnings.
- Final GPU figures and image-quality failure are documented in [VALIDATION.md](VALIDATION.md).
- Preserved the latest selected photo and re-analyzed it through the UI after fixing a test fixture collision. Earlier profile/chat were overwritten by the initial harness; do not claim complete recovery. Final tests use cache/report files only.
- Native model processing is local. Model download requires network. Physical offline mode, long sessions and CPU-only fallback still need validation.
- Anna, Desktop and public Pages deployments unchanged. No review candidate created, no store submission and no public Android release.
- No model binaries, device serials, private photos, local reports or signing keys committed. CI builds a separate debug artifact; its signature may differ from the locally installed APK.

Next integration should keep the current game UI and shared Python rules. Do not adopt this lab UI as the NoteBuddy mobile product UI. Local image analysis plus limited shape rendering is not equivalent to the existing image-generation service.

