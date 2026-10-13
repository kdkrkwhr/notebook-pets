# Notebuddy 0.6.0 — choices inside each dungeon stage

App **0.6.0**, game tool **0.4.0**. Test deployment pending verification.

Entry now spends **one walk charge per stage**, including sanctuary stages. Entry commits a durable checkpoint, not the entire expedition result. The companion travels to a fork/trap and waits for the user's explicit choice. Closing or refreshing resumes the paid stage without another charge. A separate button enters the next stage; HP carries forward. Defeat or draw ends the expedition and retry begins at stage one.

- Safe detour: no trap damage or route coins. Trapped shortcut: 50% chance of 15% maximum-HP damage (never reduces current HP below 1, or heals a pet already below 1); otherwise 2 route coins. Both paths lead to the encounter.
- Sanctuary: recover 50% maximum HP, or recover 20% and gain 2 coins. Healing caps at maximum HP.
- Final guardian clear: 10 additional coins. Route coins are separate and may be earned again on a new paid attempt; existing daily clear limits remain.
- Paid choices remain resolvable after discovery expiry; later stages require an unexpired discovery. A pending paid choice blocks a new discovery until resolved.
- Each choice includes a stage token. Old-stage choices cannot affect a later checkpoint. Cost, outcome, coins and retry receipts commit together through the existing storage protocol.

Fields expand from 1536×1152 to **2304×1728**, with connected rooms, loops, safe/risky branches, visible spike traps, worn tiles, gates and a following camera. Slime, bat, beetle and sentinel use distinct pixel silhouettes and animation rigs instead of the pet rig. Automatic movement remains; the player controls route and stage decisions, not WASD movement. One decision is offered per stage. These numerical choices are the initial playable balance, not a final balance claim.

## Validation and deployment

Validation in progress. Preserve existing pet/art/chat records and **0.3.4 review candidate/listing**. Publish neither a new review nor a public release in this task. Record final CI, Windows/Linux binaries, revision, immutable version ID and actual installed tool here after deployment.

Legacy completed expeditions remain replayable without re-running gameplay. New entries use the stage protocol. No image generation or paid AI call is added. Existing custom pet rigs are approximate species-based animations using portrait colors; they are not exact multi-view recreations.
