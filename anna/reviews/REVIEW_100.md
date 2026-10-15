# Review submission · 1.0.0

Submitted candidate: **app 1.0.0**, immutable version **1383**, game tool **0.6.0 / Executa version 746**. On **2026-10-14 KST**, at the owner's request, the official CLI resubmitted review and replaced the earlier **0.8.1** candidate. A fresh server read confirmed **pending_review / review_candidate_version 1.0.0**. Approval and publication are pending; no release command was run.

## Listing

- Description updated for 1.0.0: dungeon companions now "turn, step and lean"; a paragraph explains the item book preview after a companion arrives (collecting and wearing are later); the "Updated in 1.0.0" note covers the notebook look and title screen, the meeting step guide, the item book preview, livelier dungeon movement and reliable dungeon scene loading. Name, tagline, category, homepage, support, privacy and logo are unchanged.
- Six screenshots, the maximum Anna accepts (a seven-image request was rejected with 422 and changed nothing): companion home, title screen, drawing editor, dungeon preview, item book, first meeting. They were captured from the 1.0.0 bundle with the recorded Anna-generated **Mori**; capture made no AI or production storage calls. See [store/README.md](../store/README.md).
- `apps sync-meta --json` succeeded. A fresh read showed the seven text fields identical to local `app.json`, six screenshots, all HTTP 200 WebP. All six CDN files were downloaded; the companion home, title, item book and first-meeting images were visually checked in the intended positions.

## Candidate contents

Everything since 0.8.1: the item book preview (0.9.0), the JRPG notebook theme, title screen and meeting steps (0.10.0), the item book after meeting, art choice alignment and the dungeon portrait loading fix (0.10.1), and the 2.5D dungeon companion (1.0.0). Each was deployed to the owner test app and verified in the installed UI; see [RELEASE_100.md](../releases/RELEASE_100.md), [RELEASE_0101.md](../releases/RELEASE_0101.md), [RELEASE_0100.md](../releases/RELEASE_0100.md) and [RELEASE_090.md](../releases/RELEASE_090.md).
