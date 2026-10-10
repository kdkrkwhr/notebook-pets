# Incremental Anna updates — 10 October 2026

## Drawing-only birth candidate 0.2.5

Source: `89298ba`, tag `anna-v0.2.5`, branch `release-prep/anna-drawing-birth`. Adds in-app drawing to 0.2.4 while keeping random start. Photo/file input and its selector are removed, rather than merely hidden. The editor supports color, eraser, undo and clear; blank input is rejected locally. AI refusal is distinct from service failure. Birth generation uses checked textual drawing features and server-assigned species/element. Explicit generation retries retain that companion; received results can retry saving without generating again.

Local strict manifest validation, 40 UI unit tests and all 40 browser scenarios passed. Source CI passed: core 38041093732 and Anna Windows/Linux 38041093771, including both platform package checks. Executa remains 0.1.13 with unchanged previously tested binaries. The portrait-features.mjs evolution module is not part of this candidate.

Official push succeeded without a WAF rejection: revision 22, 103 files ready. Cut 0.2.5 created app version 1242 and reused Executa version 704. Working-draft installation succeeded with 0.1.13 loaded. Reopening the app loaded `/anna-apps/kdkrkwhr/notebuddy/0.0.0-draft/index.html`, Connected and the existing mochi companion. The deployed UI offers Random / From my drawing, has zero file inputs, and opens the canvas with color/eraser/undo/clear controls. An empty-canvas attempt displayed the local guidance; the dialog was canceled without selecting a drawing or requesting AI.

No live pet reset, game action or paid AI request was made for this verification. Successful birth generation, storage/reopen and failure recovery were checked with isolated browser mocks; a new paid production drawing-to-baby round trip was not performed. This successful bundle upload does not resolve or diagnose the separate portrait-features.mjs WAF block.

Final platform status: unpublished, pending_review, review candidate still 0.2.1, newest uploaded version 0.2.5. No review cancellation or resubmission. Develop retains the fuller feature set while also removing photo upload; release remains pinned to the existing review candidate.

## Care reaction candidate 0.2.4

Source: `8c7025a`, tag `anna-v0.2.4`, branch `release-prep/anna-care-reactions`. Adds asynchronous AI chat reactions after successful care actions to 0.2.3. Rejected actions do not request a reaction. Game changes remain committed when AI fails; received but unsaved replies support a save-only retry. Reaction reservations prevent automatic regeneration on reload within the retained chat history; this is not a permanent cross-runtime exactly-once guarantee.

Local verification passed: strict manifest, 36 UI unit tests and 26 browser scenarios. Core CI run 38040267250 and Anna Windows/Linux run 38040267127 passed for the exact source commit. Executa remains 0.1.13; the unchanged tested binaries were reused.

Official push completed with working revision 21 and 101 files ready, without a WAF rejection. Cut 0.2.4 created app version 1241 using Executa version 704. Working-draft installation succeeded and the loaded agent reports 0.1.13. The app loaded `/anna-apps/kdkrkwhr/notebuddy/0.0.0-draft/index.html` with Connected status.

Live verification preserved the existing mochi companion. Play was rejected during cooldown without requesting an AI reaction. One walk was then committed: peaceful outcome, +0 XP, XP remained 25/100. Its AI reply arrived successfully and remained in chat after dashboard reload; connection and pet identity also remained intact. This verification consumed one walk charge and an AI request. No reset, image generation or battle was performed.

Status checked after verification: pending_review, unpublished, review candidate still 0.2.1, newest uploaded version 0.2.4. No review cancellation or resubmission was performed. Develop retains its broader feature set through an ancestry-only merge; release remains pinned to the existing review candidate. This successful upload does not establish that the portrait-features.mjs WAF issue is resolved.

## Walk candidate 0.2.3

Source: `f559932`, tag `anna-v0.2.3`, branch `release-prep/anna-walk-recharge`. Adds only rechargeable walks to reset candidate 0.2.2. Executa 0.1.13 uses a five-charge cap and one charge per 300 seconds, including offline time. Each walk chooses one outcome: quiet 50%, XP 30% (10/20/30), encounter 20%. Pending encounters must still be resolved before another walk. Retrying a committed request neither redraws its outcome nor consumes another charge.

Local verification: strict manifest, 33 UI unit tests, 20 browser scenarios, 50 storage/protocol tests, and 158 core tests (one optional test skipped). Core CI run 38039693270 and Anna Windows/Linux run 38039693285 identify the exact source build; both platform jobs passed and their packages were used for deployment.

Official push completed with working revision 20 and 100 files ready. Cut 0.2.3 created app version 1240 and Executa version 704. The documented working-draft installation succeeded; the loaded agent reports 0.1.13. Reopening Notebuddy loaded `/anna-apps/kdkrkwhr/notebuddy/0.0.0-draft/index.html`, Connected, mochi, and `5/5 · +1 every 5 min`. An old 0.2.2 window retained stale state until reopened. Live verification read status only; no live walk, reset or image generation was requested. Existing pet data was preserved.

The review candidate remains 0.2.1 and no public release or review resubmission was requested. Subsequent tool versions must exceed 0.1.13. Develop retains all newer features; merging this incremental branch records ancestry without replacing that broader work.

## Reset-only candidate 0.2.2

Source: `e02a359`, tag `anna-v0.2.2`, branch `release-prep/anna-reset-only`.
This backports confirmed restart and its visible Start over button onto 0.2.1.
It deliberately excludes the newer portrait analysis, artwork birth, care reactions and rechargeable walks on develop.
Executa 0.1.12 contains the reset namespace support with the original 0.2.1 game rules.

Validation: 33 UI unit tests, 49 Python storage/protocol tests, 19 browser scenarios and strict manifest validation passed locally. GitHub core run 38039197718 and Anna Windows/Linux run 38039197741 passed. Both standalone packages were downloaded from that exact successful Anna build.

Official `apps push` succeeded: working revision 19, 100-file bundle ready.
Official `apps cut 0.2.2` succeeded: app version ID 1238, Executa version ID 703 (0.1.12).
The normal owner install still selected review candidate 0.2.1. The documented working-draft install succeeded; its response identified the reserved 0.0.0-draft installation. After dashboard reload, the actual app iframe used `/anna-apps/kdkrkwhr/notebuddy/0.2.2/index.html` and the running agent reported 0.1.12 loaded.
The existing mochi companion remained intact. The Start over confirmation opened and was canceled without resetting live data. End-to-end destructive reset and interruption recovery were tested in isolated browser/protocol tests, not against the user's current pet.

The app remains pending_review with candidate 0.2.1. No review cancellation, resubmission or public release was performed. The release Git branch remains the source for that review candidate; develop retains the fuller unreleased feature set. The backport is merged into develop by ancestry without replacing its newer functionality.

## Upload diagnostic findings

Uploading unchanged CSS and a baseline PNG through the same bundle-file endpoint succeeded. The original 1,146-byte portrait-features.mjs still returned 403. The exact blocking rule remains unknown.
A direct upload of the revised reset-data.mjs into the old revision-18 file map returned HTTP 400 size mismatch, not a WAF block. Restaging the complete coherent reset-only bundle through the official CLI resolved that mismatch and finalized successfully. Removing a module without its imports is not a valid deployment strategy.

Next incremental candidates should branch from the last successfully verified candidate and include one coherent feature plus its dependencies, tests and accurate listing text. Future Executa versions must exceed the already uploaded 0.1.12; do not reuse it for the richer develop engine.
