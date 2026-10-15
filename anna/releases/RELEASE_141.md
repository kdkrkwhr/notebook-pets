# 1.4.1 · Correct home portrait after reopening

App **1.4.1**, unchanged game tool **0.9.0**. Fixes an interrupted portrait load that could leave the previous companion visible in My home after closing and reopening it.

The home renderer now reuses only a fully decoded portrait for the same companion and image source. Replacing or clearing a portrait immediately clears the previous pixels. Closing the scene or making a newer request invalidates late responses; reopening an interrupted or failed request can load the correct portrait again. Completed portraits remain reusable when the same companion reopens the room.

Two browser regression tests reproduce the old failures and cover interruption/reopening, loading placeholders, missing/failed images, out-of-order responses, same-URL companion changes and successful cache reuse. Existing home purchase, single-AI decoration, undo, save-only retry and mobile tests remain part of validation.

No game rules, tool packages, saved-data schema or AI calls change. The current review candidate **1.0.0** and shared listing are preserved.

## Validation and deployment

Owner test deployment verified on **2026-10-16 KST**: app **ID 1408 / working revision 55**, Executa **758 / 0.9.0**. The installed `0.0.0-draft` matches the immutable 1.4.1 cut (`dirty_vs_latest_cut=false`). Source **`a4b29136fc04fe0cedcf1fdbdcd8c34f189ad8e0`**.

- Local JavaScript **84/84**, focused home browser **4/4**, strict manifest validation and **434** documentation links passed. Both new portrait tests failed against the previous renderer before passing with the fix.
- [Core CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38823383237) passed. [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38823383485) passed on Windows and Linux: **84 JavaScript / 95 browser / 70 storage-protocol** tests, strict validation, package builds and standalone smoke tests.
- Reused the unchanged Windows/Linux 0.9.0 artifacts from the successful 1.4.0 CI run. Both SHA-256 values match [RELEASE_140.md](RELEASE_140.md); the cut retained the already published binaries. The cloud agent reports **agent_version=0.9.0, loaded=true, running=true**. The PC agent is offline, so its current running state was not reverified; its prior installation evidence remains in the 1.4.0 record.
- The freshly opened installed app reports **Connected**, no error notice, twelve furniture cards and the current saved portrait. Opening, closing and reopening My home works. Six installed UI/art files returned HTTP 200 and matched local SHA-256. The interrupted-load scenarios were tested with synthetic browser fixtures, without replacing the live user's companion or artwork.
- Game, artwork, chat, walk-story and personality-draft values **and ETags** are identical before/after deployment. Shared listing fields, six original screenshot URLs and **1.0.0 / ID 1383 / pending_review** remain unchanged. Existing listing URLs were reused during push and local app metadata was restored afterward.
- No live gameplay, furniture purchases, paid AI, reset, review resubmission or public release. Existing portrait-based movement, bounded layouts, one-room scope and APS first-creation limits remain. The separate Web adapter is unchanged.
