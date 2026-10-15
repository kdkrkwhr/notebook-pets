# Notebuddy 0.6.0 — choices inside each dungeon stage

App **0.6.0**, game tool **0.4.0**. Deployed to the owner’s Anna test app on 2026-10-13.

Entry now spends **one walk charge per stage**, including sanctuary stages. Entry commits a durable checkpoint, not the entire expedition result. The companion travels to a fork/trap and waits for the user's explicit choice. Closing or refreshing resumes the paid stage without another charge. A separate button enters the next stage; HP carries forward. Defeat or draw ends the expedition and retry begins at stage one.

- Safe detour: no trap damage or route coins. Trapped shortcut: 50% chance of 15% maximum-HP damage (never reduces current HP below 1, or heals a pet already below 1); otherwise 2 route coins. Both paths lead to the encounter.
- Sanctuary: recover 50% maximum HP, or recover 20% and gain 2 coins. Healing caps at maximum HP.
- Final guardian clear: 10 additional coins. Route coins are separate and may be earned again on a new paid attempt; existing daily clear limits remain.
- Paid choices remain resolvable after discovery expiry; later stages require an unexpired discovery. A pending paid choice blocks a new discovery until resolved.
- Each choice includes a stage token. Old-stage choices cannot affect a later checkpoint. Cost, outcome, coins and retry receipts commit together through the existing storage protocol.

Fields expand from 1536×1152 to **2304×1728**, with connected rooms, loops, safe/risky branches, visible spike traps, worn tiles, gates and a following camera. Slime, bat, beetle and sentinel use distinct pixel silhouettes and animation rigs instead of the pet rig. Automatic movement remains; the player controls route and stage decisions, not WASD movement. One decision is offered per stage. These numerical choices are the initial playable balance, not a final balance claim.

## Validation and deployment

Source **32cdfe3** passed Windows/Linux [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38413180017) and [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38413179945). Engine: **177** tests (one local MCP dependency skip, fully exercised in CI); Anna storage/protocol: **57**; JavaScript: **55**; browser: **69**. Strict manifest validation passed. Both standalone Executa packages were built and smoke-tested by that same Anna CI run, then downloaded with an exact source-commit guard.

Tests cover stage-by-stage charging, pending checkpoint resume, same-request replay, stale choice tokens, concurrent entries/choices, paid resolution after expiry, HP carry, healing choices, risk outcomes including the one-HP boundary, failed APS writes, old saved replay, reachable safe/risky routes and distinct animated enemy alpha silhouettes. Desktop and 360px choice screens plus the four-enemy gallery were visually inspected. Gameplay assertions use isolated saves and a local browser host, not the user's live pet.

- Working revision **38**, **115** bundle files ready; immutable app **0.6.0**, version ID **1356**.
- Game tool **0.4.0**, Executa version ID **742**, Windows/Linux artifacts uploaded. Owner installed as **0.0.0-draft**; actual running agent reports **0.4.0 / loaded=true**.
- Actual installed UI verified **Connected**, no notice error, new choice controls present, saved replay rendered with **art=ready**, enemy-specific slime renderer and moving camera. There was no currently available discovered dungeon; no live entry, walk, choice, reset or paid AI request was issued.
- Game, artwork and conversation values remained deeply equal to the pre-install snapshot after UI verification at **2026-10-13T14:34:33Z**. **0.3.4 pending_review** and the shared listing were preserved. No new review or public release was submitted.

Legacy completed expeditions remain replayable without re-running gameplay. New entries use the stage protocol. No image generation or paid AI call is added. Existing custom pet rigs are approximate species-based animations using portrait colors; they are not exact multi-view recreations.
