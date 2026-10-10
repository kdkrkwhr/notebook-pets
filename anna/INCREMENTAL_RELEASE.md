# Incremental Anna updates — 10 October 2026

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
