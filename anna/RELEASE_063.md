# Notebuddy 0.6.3 — finish saved walk choices

App **0.6.3**, unchanged game tool **0.4.1**. Installed in the owner’s Anna test app on 2026-10-14.

Anna APS returned the current story with object keys in a different order (`scene,title,choices`) from the generated in-memory story (`title,scene,choices`). The old stringified-JSON comparison rejected an otherwise identical story before committing a choice, leaving the same two choices visible with a save warning.

Compare the displayed title, scene and ordered labels/endings by value instead. Object property order is irrelevant; changed story text or swapped choices still prevents applying an outdated selection. No saved story, pet, reward or game rule is replaced. The pending walk can finish without another walk charge or AI request.

Added storage-reordering, changed-content and choice-order regression coverage, including a browser round trip from generation through selection and reload. Actual APS read confirmed a ready, AI-generated story, a valid ETag, and differing serialization order. 

## Verification and deployment

- **58 UI tests**, **3 targeted browser regressions**, and strict manifest validation passed. Tests cover APS property reordering after generation, completion without reload, persisted endings, concurrent changes and explicit reopen. Full hosted CI is triggered by the release push; this hotfix reuses the already verified, unchanged 0.4.1 tool binaries.
- App **0.6.3 / ID 1359 / working revision 41**, installed as **0.0.0-draft**. Actual running tool **0.4.1 / loaded=true**.
- Actual browser reports Connected and serves the new semantic comparator. Reload leaves the modal closed; explicit resume restores the existing two choices, and close returns home. The user’s branch was not chosen on their behalf; successful selection/ending was verified in isolated browser tests with reordered storage responses.
- Game, art, chat and story storage were unchanged after live checks. Existing **0.3.4 review candidate and shared listing** are preserved. No walk charge or AI generation was used during diagnosis or verification.
