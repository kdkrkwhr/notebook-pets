# Notebuddy 0.6.2 — choose your walk

App **0.6.2**, game tool **0.4.1**. Test deployment pending.

Opening or refreshing the app never opens a saved walk. Walk / Continue walk explicitly opens one outing dialog; pending events resume without another charge. Loading, quiet-story choices, XP decisions, encounter/battle/flee and results stay in that same dialog. Discovered dungeons offer a free preview or a return home to visit later. Each dungeon stage still costs its own walk charge.

Every interactive quiet walk prepares an AI vignette with two complete endings (one AI request, with a playable fallback). Quiet/XP/encounter probabilities remain 50/30/20. XP walks reserve a server-generated 10/20/30 base XP offer and spend one walk charge at entry; **Explore together** commits XP only after selection, while **Leave it untouched** completes without XP. Existing sleep bonuses apply through the normal XP rules. A saved choice token, conditional storage writes and receipts protect against duplicate claims, concurrent choices and lost replies. Legacy direct `walk` clients keep their existing behavior; Anna uses `walk_begin` plus `walk_collect`/`walk_leave`.

No login AI request, automatic battle, automatic XP collection or modal opening. Closed stories and encounters remain available through explicit resume. Review candidate **0.3.4** and shared listing will be preserved during the test deployment.

## Verification

In progress: engine, storage/protocol, UI, browser and platform package checks. Record actual working revision, installed tool version and storage comparison after deployment.
