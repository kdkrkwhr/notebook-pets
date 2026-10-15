# 0.7.0 · Accumulating shared experiences

- App 0.7.0, game tool 0.5.0. Owner test deployment verified; review candidate 0.3.4 is preserved.
- Successful feeding, snacks, play, sleep, training, walks, battle/flee, XP choices and dungeon decisions build bounded memories. No invented backfill for old saves.
- Peaceful interactive walks continue three distinct story arcs (trail, garden, shelter), each over three encounters. Care combinations and past routes select the arc; earlier decisions change the following approach and preparation requirement. Chapters can span days, interspersed with ordinary XP and battle encounters.
- Preparation plus the selected approach determines closeness and final chapter coins (2/4/6). Quiet walks still give zero XP; existing 50% quiet / 30% XP / 20% encounter distribution and 5-minute recharge remain.
- AI receives actual recent actions, completed memories and the authoritative story outline. It writes the title and scene; offered actions and final consequences remain explicit game rules. Care reactions and chat receive the same recorded context. No AI availability is required to finish a chapter.
- Choices, outcomes, rewards and memories commit atomically in the game save. Lost responses, opposing clicks, missing/stale prose cache and resets recover without duplicate rewards. A pending story blocks another walk or dungeon entry. Legacy pending stories finish under their original rules.
- Memory stays bounded: 32 recent actions, six completed stories, capped counters and one current event. Existing pet/art/chat data is preserved.

## Verification and deployment

Local checks: 67 JavaScript tests, 79 browser cases (including two new journey UI cases), 59 existing Anna protocol tests plus three new journey storage cases, and 180 existing engine cases plus 12 new journey cases. Strict manifest validation passed. One local optional MCP dependency test was skipped; hosted CI runs with the declared dependencies. Windows/Linux CI passed for source `a6940bd195ce0bf0c77ce0645a1676ec1b9a37f9`: [Anna packages and full checks](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38426453896), [engine and real MCP](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38426453599). Both platform packages were downloaded from that successful run. Final totals: 192 engine tests, 62 Anna storage/protocol tests, 67 JavaScript tests and 79 browser tests.

2026-10-14 KST: installed app **0.7.0 / version ID 1360 / working revision 42** as the owner draft. Actual server and running tool **0.5.0 / loaded=true**. Browser reload confirmed Connected, zero automatically opened dialogs, and the deployed journey module, authoritative resolution hook and memory recovery logic. No pending story was visible in the current account; new choices and missing-cache recovery were exercised in isolated browser and protocol tests rather than spending this pet's walk/AI resources.

After actual UI reload, all four game/art/chat/walk-story values remained equal to the predeployment snapshot. Existing 0.3.4 review candidate and shared listing were preserved. No public release or new review submission was made.

The rule catalogue currently has three three-chapter arcs; AI varies their scene rather than inventing new reward rules. Memories begin with successful post-update interactions. Existing records cannot reconstruct unrecorded past actions.
