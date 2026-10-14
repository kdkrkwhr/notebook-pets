# 0.8.0 · A personality and experiences that matter

App **0.8.0 / game tool 0.6.0**. Owner test deployment verified on **2026-10-14 KST**; review candidate **0.3.4** and its shared listing are preserved.

## Changes

- Initial personality is generated from both the chosen name and visual observations: saved artwork features, an explicitly requested analysis of an existing custom portrait, or the source description of the exact bundled starter. AI creates bounded curiosity, sociability, energy and caution tendencies, bilingual speaking style, a harmless habit and an explanation. These are fictional characteristics, not an assessment of real people.
- Initial identity is stored once in the authoritative game save. Duplicate/opposing requests cannot reroll it, and evolution preserves it. Eight net relevant actions change expression by one point, capped at 15 points from the initial tendency. Existing counters at creation are the baseline, so past actions are not invented or suddenly relabelled as new changes. No personality directly grants XP, coins or combat advantages.
- Personality is shared by chat, care reactions and walk narration, and modestly influences which story is encountered. Current tendencies and the activities shaping them appear under the companion’s personality details. New births initialize after the portrait is ready; existing companions use the explicit button once. No initialization or paid retry happens on refresh.
- A separate canonical influence note explains the actual recorded contributors to each offered outcome. It distinguishes an earlier safe choice substituting for missing preparation from actions actually performed. Later care does not change an already offered outcome; the chosen gentle ending is explained after resolution.
- Six three-chapter arcs: trail, garden, shelter, river, workshop and market. Three location variants and distinct chapter endings replace generic repeated endings. Avoid the two most recent completed arcs and prefer less-visited arcs, so repeating the same care routine cannot starve the other stories. Active chapters, old pending choices and existing rewards remain compatible.
- Personality generation is reserved before AI; received drafts can be saved without regenerating. Game commit and receipt remain atomic. Failure leaves ordinary gameplay available. Drafts are separate from the portrait index and are included in reset/removal.
- A received personality is also retained in memory if its first draft write fails. Retrying in the same window only saves and commits it, without repeating vision or text generation. Reset or changing the companion discards this pending answer; closing the window before a successful draft save can lose it. A dedicated status message explains the save-only retry.

## Verification

The original candidate passed engine 202, Anna protocol/storage 65, JS 74 and browser 82 checks in hosted CI, including Windows/Linux package builds. The deployment follow-up reproduced a draft-write failure that made a retry call AI twice, then fixed it with a bounded per-window pending answer. A browser regression exercises failed draft storage, save-only retry and reopen.

Final source **87ed1df59ca11bd18baec4bef96d719c4384fe45** passed [Windows/Linux Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38491519411) and [engine CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38491519425). Final Anna checks: **76 JavaScript, 83 browser and 65 protocol/storage tests**, plus strict manifest validation. Both standalone packages were built and smoke-tested by that exact CI run, including a personality command with no XP change.

## Installed verification

- Working revision **43**, **119** bundle files ready; immutable app **0.8.0**, version ID **1369**, bundle ID **1270**. Installed to the owner as **0.0.0-draft**.
- Tool **0.6.0**, Executa version ID **746**. Actual agent **agent_51a98c681c364ed788a854773058d51b** reports **agent_version=0.6.0, loaded=true, running=true**. Normal installation updated the running tool; executable removal was unnecessary.
- Actual installed UI reports **Connected**, no visible notice error and zero automatically opened dialogs. `personality.mjs`, `journey-stories.mjs`, `walk-stories.mjs` and `app.js` loaded with HTTP 200. The personality details, usage explanation, enabled **Meet your personality** button and independent story-influence element are present. The details panel was opened and visually inspected.
- The existing companion has no initialized personality yet. No real-account personality creation, AI call, walk, choice or reset was issued during verification. AI generation and gradual experience changes were exercised with isolated fixtures; the live model's characterization quality remains a user playtest.
- Game, portrait index, chat, walk-story values and ETags are unchanged from the predeployment snapshot. The previously absent personality draft remains absent. Review **0.3.4 pending_review**, description, screenshots and other shared listing fields were restored and checked. No public release or new review submission.

Tested package SHA-256:

- Linux: `E623A6D1A11262E6BCC9C11EA8638D90E20591A0A207F1122824E7E414FD5F51`
- Windows: `1399B331FA605DDC9C6D0303360493267F424DA7A0AA61C17BE4B46BEDCC0D73`
