# Android release notes

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
