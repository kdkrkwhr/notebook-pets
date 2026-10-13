# Notebuddy 0.4.2 — scrolling RPG dungeons

App **0.4.2**, game tool **0.2.2**. Deployment verification is pending.

While any discovered, unexpired dungeon is unfinished, walks do not roll for another discovery. Ordinary walk rewards and encounters continue. A win closes that discovery and preserves its coin reward and replay; the next walk can roll at the existing 25% chance. Defeat, a draw, closing a preview or skipping playback does not release an unfinished dungeon. Expiration also releases the slot, without extending the original 24-hour deadline.

Completed discoveries cannot reopen at midnight. Daily reward eligibility still resets at midnight Korea time, and a previously cleared region must be discovered again on a later day. Older saves with multiple unfinished dungeons retain those discoveries; new discoveries wait until all are cleared or expired. Existing data is never arbitrarily discarded to impose the limit.

The dungeon presentation is rebuilt around three detailed 1536×1024 environments: Hellgate, Ice Kingdom and Dream Forest. A three-quarter overhead camera follows the companion from the entrance, through the sanctuary and across the bridge into the boss arena. The nearly full-screen playfield has an unobtrusive route map, health bars and collapsible briefing. Each boss has idle, wind-up and attack artwork, with attack telegraphs, hit/dodge effects and damage numbers driven by the saved combat turns. Three-times speed, skipping, reduced motion and free replay remain available.

The four static art files are bundled with the app. Loading them makes no Anna AI request. Art must load successfully before entry is enabled. The player's existing locally converted pixel portrait is preserved; its movement uses translation, bobbing and facing changes, not newly generated directional walking frames. This remains automatic exploration with one boss, without manual action controls, roaming enemy AI, loot rooms or offline farming. The camera and presentation do not change combat results or award additional rewards.

Art sources and generation briefs: [assets/dungeons-v2/README.md](../assets/dungeons-v2/README.md). The 0.3.4 review candidate and shared listing are preserved during test deployment.

## Validation

Local engine 173 tests, Anna Python 57 tests and JavaScript 52 tests passed. Focused browser checks cover discovery limits, countdown expiry, win/loss/replay, following camera through combat, missing-art entry blocking, 360px Korean UI and reduced motion. Desktop and mobile screenshots were visually inspected; the new art and boss attack overlays render correctly. Full cross-platform CI and installed Anna verification will be recorded below after deployment.
