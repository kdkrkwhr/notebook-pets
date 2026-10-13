# 0.7.0 · Accumulating shared experiences

- App 0.7.0, game tool 0.5.0. Test deployment pending verification; review candidate 0.3.4 is preserved.
- Successful feeding, snacks, play, sleep, training, walks, battle/flee, XP choices and dungeon decisions build bounded memories. No invented backfill for old saves.
- Peaceful interactive walks continue three distinct story arcs (trail, garden, shelter), each over three encounters. Care combinations and past routes select the arc; earlier decisions change the following approach and preparation requirement. Chapters can span days, interspersed with ordinary XP and battle encounters.
- Preparation plus the selected approach determines closeness and final chapter coins (2/4/6). Quiet walks still give zero XP; existing 50% quiet / 30% XP / 20% encounter distribution and 5-minute recharge remain.
- AI receives actual recent actions, completed memories and the authoritative story outline. It writes the title and scene; offered actions and final consequences remain explicit game rules. Care reactions and chat receive the same recorded context. No AI availability is required to finish a chapter.
- Choices, outcomes, rewards and memories commit atomically in the game save. Lost responses, opposing clicks, missing/stale prose cache and resets recover without duplicate rewards. A pending story blocks another walk or dungeon entry. Legacy pending stories finish under their original rules.
- Memory stays bounded: 32 recent actions, six completed stories, capped counters and one current event. Existing pet/art/chat data is preserved.

## Verification and deployment

Local checks: 67 JavaScript tests, 79 browser cases (including two new journey UI cases), 59 existing Anna protocol tests plus three new journey storage cases, and 180 existing engine cases plus 12 new journey cases. Strict manifest validation passed. One local optional MCP dependency test was skipped; hosted CI runs with the declared dependencies. Final Windows/Linux build and installed versions will be recorded after deployment.
