# Project workflow

- User preference (2026-10-16): when updating the Anna UI, carry the tested shared UI change through Git to `release-web` and deploy the public GitHub Pages site in the same task. Verify both installed Anna and the live web page.

- User preference (2026-10-16): raise Anna versions slowly in carefully verified release bundles, not on every internal step. Plan the AI home-decoration feature to ship and mature within 1.4.x (first candidate target 1.4.0). Planning/concept-art tasks alone must not bump versions or deploy the app.

- User preference (2026-10-13): complete feature changes with verification, a Git commit/push, and deployment to the user's Anna test app in the same task. A Git push alone does not update Anna and is not the end of the work.
- When the game tool changes, deploy its tested Windows and Linux packages along with the UI. Verify the actual installed UI and running tool version, not only the uploaded version.
- Preserve existing pet, artwork and conversation data. Keep the current review candidate and its shared listing intact during test deployment. Submit a new review or publish publicly when the user requests it.
- Record deployed app/tool versions, working revision, validation and any remaining limitations in `anna/HANDOFF.md` and the release notes. Keep only the latest two entries in `anna/HANDOFF.md`; move older entries to the top of `anna/HANDOFF_HISTORY.md` unchanged. If deployment is blocked, state that explicitly; do not claim the Anna app is updated.
- Reply to the user in Korean.

# Architecture and release direction (2026-10-15)

- Preserve the existing `release` branch as the Anna deployment track. `release-web` is the shared integration and GitHub Pages track; the redundant `main` branch has been removed with its history preserved. Do not rename or delete the Anna branch as part of platform work.
- Share one Python rule implementation across Anna, future static Web (Pyodide) and future Android (Web wrapper). Platform adapters handle persistence, authentication, system dependencies and AI transports; LLM output never changes authoritative rewards/stats/timers.
- Canonical portable API: `engine/game_api.py` with explicit `ExecutionContext`. Keep filesystem/environment/OS locks out of this import and execution graph. Legacy direct engine/CLI calls may use the lazy `local_runtime` compatibility adapter.
- Web target: no required application/DB/AI proxy server; local IndexedDB persistence and user BYOK direct requests where the provider supports browser calls. Do not introduce paid backend infrastructure without an explicit user request.
- `release-web` already exists. Create `release-android` when its adapter/build exists. Bring tested shared-core changes through Git; do not fork or manually copy gameplay rules into platform branches.

# Home decoration constraints (2026-10-16)

- User preference (2026-10-16): no manual movement generation/remake button. Prepare directional poses when a new companion or new portrait is saved, including new evolution artwork; a stage number alone does not request images. Home and dungeon reuse the same personal sheet without AI on entry or movement. Future equipment must use the same appearance-save flow when it changes the portrait. Save-only recovery may remain and must not generate again.
- Confirmed visual direction: a coherent 2D top-down pixel tile world with a house exterior and yard, entering a separate interior through the door. The user's farming-game screenshot is the camera/scale/style reference, not a request for farming. Do not use the current dungeon's portrait animation as the quality target. Use direction/action sprite frames, consistent pixel scale, grounded feet/body, depth occlusion and natural movement/idle transitions. Validate a small moving prototype before integrating the larger home; prototype/concept work does not bump or deploy Anna versions.
- Users buy furniture; only the companion chooses placement. No manual coordinate/drag editor.
- Only an explicit Decorate request invokes one bounded LLM selection. Purchases, viewing, transport/idle animations, undo and save-only retry never invoke AI. Do not auto-decorate after buying or reopening.
- Render room geometry, separate furniture assets and the existing pet independently. Never generate a flattened room image at runtime. The pure Python core validates money, ownership, geometry, routes and revisions; model output only selects a supplied candidate and short reason.
