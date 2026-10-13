# Notebuddy 0.4.0 — pixel companions and dungeons

Test deployment completed on 2026-10-13. Future feature work includes Git commit/push, Anna test deployment and installed-runtime verification, as requested by the user and recorded in [AGENTS.md](../AGENTS.md).

## Deployed build

- App `@kdkrkwhr/notebuddy`, ID 450: immutable **0.4.0**, version ID **1339**.
- Working revision **34**, bundle ready, **106 files**. Installed through the Developer Console's **Install draft** action as **0.0.0-draft**.
- Game Executa 1193, `tool-kdkrkwhr-notebuddy-game-hc8mw4gu`: **0.2.0**, frozen version ID **732**.
- Source commit **cbe8984b401cfcaf13bd45d7abd53a7d050a67ac**. Both [Anna Windows/Linux builds](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38333091442) and [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38333091502) succeeded. The deployed binaries came from this exact Anna CI run.
- Review candidate remains **0.3.4**, version ID 1282, `pending_review`. Its shared listing was backed up before deployment, restored after the cut, and compared successfully. No review resubmission or public release occurred.

## Behavior

New companions and saved growth portraits receive a locally converted 64×64 pixel portrait without an additional AI generation request. Existing companions can prepare one on demand. Walks discover Hellgate, Ice Kingdom and Dream Forest. Entering costs one walk charge; the server saves the boss result and coin reward before the automatic pixel-map replay begins. See [DUNGEONS.md](DUNGEONS.md) for rules and remaining art/gameplay scope.

## Verification and limits

- Local engine 167, Anna Python 57, JavaScript 52 and browser 60 tests passed, plus strict manifest validation. CI independently passed the Windows and Linux suites and binary smoke tests.
- The official Agent plugin-status API reports server version **0.2.0**, agent version **0.2.0**, `agent_loaded=true` and `agent_running=true`.
- Reloaded the installed Anna app in Orca: **Connected**; actual `app.js`, `dungeon.mjs` and `pixel-pet.mjs` resources returned HTTP 200, and the new dungeon UI is present in the bundle.
- The account's authoritative save is currently a completed-reset welcome marker (`_notebuddy_new_start=1`), with an empty portrait index and chat. The installed app correctly displays first meeting. Deployment verification made no pet/reset/gameplay/storage-write or paid AI calls.
- Creating a companion, saving its pixel image to real Anna file storage, discovering/entering a dungeon and reopening the saved result remain live-play checks. Browser tests cover these flows against an isolated mock host; successful deployment does not establish provider/image quality or mobile compatibility.

Private account snapshots and operational scripts are kept under ignored `.local/` and are not committed.
