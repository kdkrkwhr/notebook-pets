# 0.8.0 · A personality and experiences that matter

App 0.8.0 / game tool 0.6.0. Owner test deployment pending; retain review candidate 0.3.4 and its shared listing.

## Changes

- Initial personality is generated from both the chosen name and visual observations: saved artwork features, an explicitly requested analysis of an existing custom portrait, or the source description of the exact bundled starter. AI creates bounded curiosity, sociability, energy and caution tendencies, bilingual speaking style, a harmless habit and an explanation. These are fictional characteristics, not an assessment of real people.
- Initial identity is stored once in the authoritative game save. Duplicate/opposing requests cannot reroll it, and evolution preserves it. Eight net relevant actions change expression by one point, capped at 15 points from the initial tendency. Existing counters at creation are the baseline, so past actions are not invented or suddenly relabelled as new changes. No personality directly grants XP, coins or combat advantages.
- Personality is shared by chat, care reactions and walk narration, and modestly influences which story is encountered. Current tendencies and the activities shaping them appear under the companion’s personality details. New births initialize after the portrait is ready; existing companions use the explicit button once. No initialization or paid retry happens on refresh.
- A separate canonical influence note explains the actual recorded contributors to each offered outcome. It distinguishes an earlier safe choice substituting for missing preparation from actions actually performed. Later care does not change an already offered outcome; the chosen gentle ending is explained after resolution.
- Six three-chapter arcs: trail, garden, shelter, river, workshop and market. Three location variants and distinct chapter endings replace generic repeated endings. Avoid the two most recent completed arcs and prefer less-visited arcs, so repeating the same care routine cannot starve the other stories. Active chapters, old pending choices and existing rewards remain compatible.
- Personality generation is reserved before AI; received drafts can be saved without regenerating. Game commit and receipt remain atomic. Failure leaves ordinary gameplay available. Drafts are separate from the portrait index and are included in reset/removal.
- A received personality is also retained in memory if its first draft write fails. Retrying in the same window only saves and commits it, without repeating vision or text generation. Reset or changing the companion discards this pending answer; closing the window before a successful draft save can lose it. A dedicated status message explains the save-only retry.

## Verification

The original candidate passed engine 202, Anna protocol/storage 65, JS 74 and browser 82 checks in hosted CI, including Windows/Linux package builds. The deployment follow-up reproduced a draft-write failure that made a retry call AI twice, then fixed it with a bounded per-window pending answer. JavaScript 76 tests pass after that change; a browser regression exercises failed draft storage, save-only retry and reopen. Final cross-platform CI and actual installation verification will be recorded below.
