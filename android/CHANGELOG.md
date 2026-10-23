# Android release notes

## 0.2.1-alpha · 2026-10-23

- Replace the long mobile web page with four Android screens: companion, chat, adventure and journal. Keep each screen’s scroll position and all existing component handlers.
- Use compact cards, readable system typography and at least 44px primary touch targets. Keep the chat composer above the keyboard and hide bottom tabs while typing.
- Use full-screen home, dungeon and evolution flows; show the furniture shop as its own overlay and let native Back close the shop before the home.
- Show outgoing chat immediately, stream local response previews and expose progress/cancel across tabs and dialogs. Preserve the draft on cancellation and ignore late cancelled output. Disable conflicting actions while chatting.
- Move technical copy out of gameplay. Keep initial download size and data/backup information in Settings. Preserve user notebook, original artwork, Lab files and the existing downloaded model.
- Add mobile UX checks at 320×640, 360×800, 412×892 and 800×360, delayed-response cancellation, dark theme and real Flip6 keyboard/Back/chat/cancel verification.

## 0.2.0-alpha · 2026-10-23

- Replace the Lab launcher with the shared NoteBuddy game: original drawings/photos, care, walks, dungeons, collection, evolution, home and themes.
- Package the static UI, assets, Python rules and Pyodide inside the APK. Keep the existing application ID/signature for in-place data-preserving updates.
- Add an origin-restricted native message bridge for local LiteRT-LM text/vision, model setup, explicit Lab photo import and chunked SAF backup export.
- Save original artwork and initial game state atomically. No AI image generation; evolve while keeping the portrait and choose a free default pixel appearance for home.
- Preserve a bounded chat history and cancel native work on backgrounding. Reject remote resources; never fall back to a cloud provider.
- Add 20 total native unit tests, an isolated device game harness, mobile browser game-flow checks and bundled open-source notices.
- Fix the Android CI SDK setup by removing its obsolete `tools` package default; build the shared game in CI as well.

## 0.1.0-lab · 2026-10-23

- Initial native local-model download, sketch/photo analysis, limited shape illustration and conversation prototype.
- Flip6 GPU inference/vision checks and explicit model/file integrity verification.
