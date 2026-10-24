# Android release notes

## 0.2.2-alpha · 2026-10-24

- Split photo selection and drawing into explicit buttons; open the Android file picker directly. Keep the confirmed artwork on invalid input or cancellation and ignore stale Lab-photo import results.
- Restore a bounded chat draft after recreation, scoped to the companion and notebook replacement epoch. Clear it after successful chat storage and invalidate it after reset/import.
- Persist drafts in a separate IndexedDB transaction with strict durability and show saving/saved/failure state. Fix latest-draft loss after Android force-stop; retain localStorage only for migration/fallback.
- Commit received chat before clearing the input. Offer save-only retry and explicit discard if storage fails; do not request another inference or duplicate chat entries.
- Keep actionable errors visible with an explicit dismiss button. Honor Android font scale and offer recovery when the WebView renderer terminates, without deleting the notebook.
- Show startup progress, keep unfinished screens inert and offer explicit reopen on initialization failure or prolonged loading. Handle engine failure even when it occurs before the first game request.
- Replace internal care/training command names in activity results with readable Korean messages.
- Wrap long companion headings without squeezing names into narrow columns at large font sizes. Keep the empty chat prompt scrollable and move the debug notebook label into the brand caption.
- Give native requests document-unique identifiers and clean up failed sends, cancellation and timeouts. Reject late responses from a previous document.
- Add failure-injection tests for bridge errors, quota failure and save-only recovery; extend photo, draft, mobile WebView and accessibility verification. No paid API calls or model download required.

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
