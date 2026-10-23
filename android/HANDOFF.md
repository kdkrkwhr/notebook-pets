# Android handoff

## 2026-10-23 · 0.2.1-alpha · mobile UX

- Branch: `release-android`; Android only. Anna, its review candidate, Desktop and public Pages are unchanged.
- Replaced the long page with companion/chat/adventure/journal tabs, compact cards and normal UI typography. Home/dungeon/evolution use full-screen flows; furniture shop overlays the world. Native Back dismisses keyboard, inner shop/dialog, then returns to the companion tab.
- Outgoing chat appears immediately, native response progress/preview is streamed, cancellation is available inside dialogs too, and drafts survive cancellation. Conflicting game actions are disabled while a chat request is active. No automatic paid service or new image generation added.
- Removed model/engine/implementation copy from normal gameplay. Required download size, backup and app information remain in Settings.
- Builds, 20 unit tests, lint (0 errors, 19 advisories) and the existing real Python/WASM game suite passed. Added 4-viewport UX tests, keyboard-space checks, tab scroll restoration, primary touch target checks, modal Back, delayed cancellation/late-result rejection and light/dark screenshots.
- Flip6: in-place update, real game instrumentation passed in 27.275 seconds. Native keyboard + Back, actual local chat and cancellation, home-shop Back and evolution close passed through the installed WebView. Test notebook and original Lab file hashes/user-game snapshot preserved. Existing downloaded model reused.
- Final locally installed APK: `runtime/dist/NoteBuddy-Android-0.2.1-alpha.apk`, versionCode 3, 227,990,536 bytes, SHA-256 `0e613efee54a76467fef8006281aee81c730b2a375b04d2b2fe8b544f3f44173`. Last rebuild only raises dark-theme selected-tab contrast; no game or native logic changed after the complete flow checks.
- Local evidence: `runtime/game-browser/report.json`, `runtime/ux-device/report.json`, `runtime/ux-device-test.txt`; private/runtime files stay ignored. Instrumentation and CDP tests select `notebuddy-android-test`, never reset the default notebook.
- Limits: cover display/physical folding, other devices/system large-font settings, prolonged thermals/memory and process-kill recovery remain unverified. Landscape was exercised in browser emulation. CI for this new commit should be checked separately; prior commit bef4e88 CI run 39923343592 passed.

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
