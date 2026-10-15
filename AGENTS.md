# Project workflow

- User preference (2026-10-13): complete feature changes with verification, a Git commit/push, and deployment to the user's Anna test app in the same task. A Git push alone does not update Anna and is not the end of the work.
- When the game tool changes, deploy its tested Windows and Linux packages along with the UI. Verify the actual installed UI and running tool version, not only the uploaded version.
- Preserve existing pet, artwork and conversation data. Keep the current review candidate and its shared listing intact during test deployment. Submit a new review or publish publicly when the user requests it.
- Record deployed app/tool versions, working revision, validation and any remaining limitations in `anna/HANDOFF.md` and the release notes. Keep only the latest two entries in `anna/HANDOFF.md`; move older entries to the top of `anna/HANDOFF_HISTORY.md` unchanged. If deployment is blocked, state that explicitly; do not claim the Anna app is updated.
- Reply to the user in Korean.

# Architecture and release direction (2026-10-15)

- Preserve the existing `release` branch as the Anna deployment track. `main` is the shared integration source. Do not rename or delete the Anna branch as part of platform work.
- Share one Python rule implementation across Anna, future static Web (Pyodide) and future Android (Web wrapper). Platform adapters handle persistence, authentication, system dependencies and AI transports; LLM output never changes authoritative rewards/stats/timers.
- Canonical portable API: `engine/game_api.py` with explicit `ExecutionContext`. Keep filesystem/environment/OS locks out of this import and execution graph. Legacy direct engine/CLI calls may use the lazy `local_runtime` compatibility adapter.
- Web target: no required application/DB/AI proxy server; local IndexedDB persistence and user BYOK direct requests where the provider supports browser calls. Do not introduce paid backend infrastructure without an explicit user request.
- Future `release-web` and `release-android` tracks are created when their adapters/builds exist. Do not fork or copy gameplay rules into platform branches.
