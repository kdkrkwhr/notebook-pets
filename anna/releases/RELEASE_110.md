# 1.1.0 · Sunken Palace and Forgotten Clockwork City

App **1.1.0**, game tool **0.7.0**. Owner test deployment of the working draft was verified on **2026-10-15 KST**. The review candidate stays **1.0.0 / ID 1383 (pending_review)**; no review or public release was changed. `apps cut 1.1.0` was not run (blocked in the automated session), so there is no immutable 1.1.0 version yet.

## Changes

- **Two dungeon regions.** Sunken Palace (`sunkenpalace`, boss Crown Keeper of the Deep, water/nature, habitat reptile/plant) and Forgotten Clockwork City (`clockworkcity`, boss Great Clockwork Golem, earth/dark, habitat machine/monster). Discovery, 24-hour lifetime, one walk charge per stage, forks/traps/sanctuary and the 10-coin daily first clear are unchanged; walks now draw from five regions.
- **Procedural expansion art.** The new regions have no painted environment or guardian atlas column. The preview card shows the procedural first room, and the two bosses are new pixel silhouettes drawn beside the existing slime, bat, beetle and sentinel. No AI request is made for any of this.
- **Game tool 0.7.0.** Allows the two new `explore_*` commands; everything else in the protocol, storage schema and save format is unchanged. The app manifest requires tool 0.7.0.

## Validation

- Engine dungeon/journey unittest, Anna JavaScript 81, Anna Python 65, browser 89 (one assertion updated for six enemy kinds, re-run passing) and `anna-app validate --strict` passed locally. `uv lock --check` passed.
- Windows and Linux packages were built with PyInstaller 6.16.0 (Linux inside WSL Ubuntu with the separate `.venv-linux`). Each build ran the script's own start/feed/personality smoke test. The Windows binary was additionally exercised with `status`, `explore_clockworkcity` and a locked `explore_hellgate` through the engine worker.
- Windows package SHA-256 `245a2a9ececa423efe41730c480c131b45f5ebb64a72dfbad99e07c47e7d20ff`, Linux `2c3d0659bfc3362167202088e1b9fbbbb51923c271933d861b47f11f4385c6b2`.

## Deployment

- `apps push --no-install-local --profile binary` → working revision **49**, 143 bundle files ready, 5 changed files uploaded (the dungeon modules and i18n), tool identity `tool-kdkrkwhr-notebuddy-game-hc8mw4gu` at 0.7.0.
- `executa upload-binaries` published both 0.7.0 archives to the platform CDN (2 uploaded, 0 cached).
- Working install endpoint installed **0.0.0-draft** and scheduled deployment job `32f9cc1b-…` to the cloud agent. The cloud agent `agent_51a98c68…` then reported tool **version 0.7.0 / agent_version 0.7.0 / loaded=true / running=true**.
- The five saved APS values (game, art, chat, walk story, personality draft) and their ETags were identical before and after installation. No game action, walk charge or AI request was used.

## Remaining

- The local desktop agent `kdk-17b935d7` (online, non-cloud) still reports agent_version 0.6.0; it was not selected by the install job. It should pick up 0.7.0 on its next plugin sync, or re-run the working install when it is the active agent.
- The installed UI was not opened in a browser session during this deployment, so the "Connected" state and module HTTP 200 checks that earlier records include are pending the owner's next launch.
- `apps cut 1.1.0` remains to be run to snapshot the version. The listing text and screenshots still describe 1.0.0 and were intentionally left unchanged.
