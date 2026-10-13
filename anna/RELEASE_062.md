# Notebuddy 0.6.2 — choose your walk

App **0.6.2**, game tool **0.4.1**. Deployed to the owner’s Anna test app on 2026-10-14.

Opening or refreshing the app never opens a saved walk. Walk / Continue walk explicitly opens one outing dialog; pending events resume without another charge. Loading, quiet-story choices, XP decisions, encounter/battle/flee and results stay in that same dialog. Discovered dungeons offer a free preview or a return home to visit later. Each dungeon stage still costs its own walk charge.

Every interactive quiet walk prepares an AI vignette with two complete endings (one AI request, with a playable fallback). Quiet/XP/encounter probabilities remain 50/30/20. XP walks reserve a server-generated 10/20/30 base XP offer and spend one walk charge at entry; **Explore together** commits XP only after selection, while **Leave it untouched** completes without XP. Existing sleep bonuses apply through the normal XP rules. A saved choice token, conditional storage writes and receipts protect against duplicate claims, concurrent choices and lost replies. Legacy direct `walk` clients keep their existing behavior; Anna uses `walk_begin` plus `walk_collect`/`walk_leave`.

No login AI request, automatic battle, automatic XP collection or modal opening. Closed stories and encounters remain available through explicit resume. Review candidate **0.3.4** and shared listing were preserved during the test deployment.

## Verification

Final source **b718370** passed Windows/Linux [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38420082139) and [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38420082128): **55 UI**, **76 browser**, **59 storage/protocol**, and **180 engine** tests, plus standalone package build/smoke checks. Local engine testing skipped the unavailable optional MCP dependency; CI covered it. Early validation caught and corrected a test expectation and the app's required tool version before deployment.

- App **0.6.2 / version ID 1358**, working revision **40**, installed as **0.0.0-draft**. Both **0.4.1 Windows and Linux packages** came from the successful final CI build.
- The actual running tool reports **0.4.1 / loaded=true**. Installed UI reports Connected, renders battle/encounter inside the walk dialog, and opens **zero dialogs after reload**. The live account's saved story was already completed, with no pending XP choice or encounter; pending-story resume was verified in the isolated browser regressions rather than creating a new paid walk on the account.
- Live verification made no new walk, story choice, XP claim, battle or paid AI request. All four game/art/chat/story values remained deeply equal to the pre-deployment snapshot at **2026-10-13T15:22:38.194Z**.
- Desktop/mobile XP and battle screens were visually inspected with an isolated host. Browser regressions cover XP collection/decline, modal-only encounters, lost-reply retries, completed-story hiding and delayed battle responses after close.
- Existing **0.3.4 pending_review** and shared listing retained. This is an owner test deployment, not a replacement review or public release.
