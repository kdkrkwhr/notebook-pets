# Review submission — 1.4.14

This is a **per-version release review**, not a new listing review. App lifecycle stays `published`; listing `review_candidate_version` remains null. The new version **1478** has `release_review_state: pending`, `is_latest: false`, `published_at: null`; latest public version remains **1.4.13**. Generic `submit-review` first returned 400 for the published lifecycle; the documented `apps release 1.4.14` route then queued this review without immediate promotion.

Explicitly requested on 2026-10-19. Adds Japanese, Simplified Chinese and Traditional Chinese to English/Korean UI and optional AI responses. New game tool 0.9.6 is required. Existing chats and generated prose remain original; language changes use no AI. Saved bilingual personalities remain valid, and new personalities can include the creation language.

Review the language menu, persistence after reopening, localized free walk choices, evolution descriptions and CJK layout. Includes the prior growth-album frame correction. Static resources include reviewed terminology and accurate 64-message/40-KB retention guidance. Only six authorized static-copy text requests were used; no image request. Native-speaker editorial review remains unperformed.


## Verified deployment and review

Runtime source **c52a144**, final reviewed glossary **f3f655b**; startup harness follow-up **6d09111**. Final CI **39247474069** passed **Windows and Linux**, each with **131 browser / 96 JS / 76 storage-protocol**, strict validation and standalone executable build/smoke. Shared CI **39247474128** passed all three jobs. The initial Windows run timed out in two cold page `load` waits before actions began; bounded browser concurrency and explicit DOM/UI readiness passed focused **11/11** checks and final CI. Native-speaker editorial review and physical PC execution are not claimed.

Published both CI-tested tool **0.9.6** platform archives, installed owner app **working revision 90 / 0.0.0-draft**, and verified actual cloud tool **0.9.6 / Executa 786 / master 1193 loaded/running**. All changed installed UI hashes match. Actual UI/tool reads pass **en / ko / ja / zh-Hans / zh-Hant**, keeping the same pet name and authoritative data. Existing game ETag and art/chat/story/personality values/ETags are unchanged. New-language switching and validation made no additional AI request beyond the six authorized translation calls; image calls **0**.

Cut **1.4.14 / ID 1478**, bundle **1374 / 174 files / 171598743 bytes**, manifest SHA-256 `f5c1811787c3a0bab742f7ae20d2f499a8e50fc7dc287c1d0dbb13ef5e12109f`. Working content hash `f6bf2d50a2f5787d4e079fd576bd1e23fe2eecd71acde485c43c8cace493570a`. Fresh platform read confirms candidate **1.4.14**, `dirty_vs_latest_cut: false` and exact/minimum tool **0.9.6**. Shared listing and the existing six screenshots are retained while public **1.4.13** stays available. Published-app update path: apps release 1.4.14 queued release review (pending, is_latest false, published_at null); there was no immediate public promotion or web deployment.
