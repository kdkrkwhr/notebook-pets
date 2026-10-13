# Notebuddy 0.6.3 — finish saved walk choices

App **0.6.3**, unchanged game tool **0.4.1**. Deployment pending.

Anna APS returned the current story with object keys in a different order (`scene,title,choices`) from the generated in-memory story (`title,scene,choices`). The old stringified-JSON comparison rejected an otherwise identical story before committing a choice, leaving the same two choices visible with a save warning.

Compare the displayed title, scene and ordered labels/endings by value instead. Object property order is irrelevant; changed story text or swapped choices still prevents applying an outdated selection. No saved story, pet, reward or game rule is replaced. The pending walk can finish without another walk charge or AI request.

Added storage-reordering, changed-content and choice-order regression coverage, including a browser round trip from generation through selection and reload. Actual APS read confirmed a ready, AI-generated story, a valid ETag, and differing serialization order. Verification and deployment details follow after installation.
