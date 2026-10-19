# 1.4.14 — Japanese and Chinese support

Prepared on 2026-10-19 at the owner's request, including explicit authorization to update the review candidate after deployment. Owner app **1.4.14 / working revision 90** and game tool **0.9.6** are deployed; review candidate **1.4.14 / ID 1478** is submitted. Public Anna **1.4.13** remains live; web remains on hold.

- Add Japanese, Simplified Chinese and Traditional Chinese alongside English and Korean. Keep a distinct saved preference for each language and appropriate local CJK font fallbacks. Cover menus, creation/recovery, care, quests, evolution, home/furniture, collections, dungeons and static walk stories.
- New chat, care, walk, evolution and requested decoration prompts use the selected language/script. Language switching never asks AI or translates previous chat, portraits or stories. New personalities may store an optional creation-language description while old bilingual records remain valid and unchanged.
- Extend the authoritative evolution prose validator and Anna tool language enum to accept the five locale codes. Localize response labels after committing the unchanged receipt; changing language on a retry never duplicates rewards or changes the pet name.
- Retain the latest album containment fix. Correct privacy retention copy to the existing behavior: up to **64 messages / 40 KB saved**, latest **24 displayed**. Retention behavior itself is unchanged.

Translation budget used: **six authorized text calls / zero images**, public static copy only. Results saved before parsing; no paid retries. Traditional Chinese conversion is offline; native-speaker editorial review remains unperformed. See [resource provenance](../locales/README.md).

See the verified deployment evidence below and [review record](../reviews/REVIEW_1414.md).


## Verified deployment and review

Runtime source **c52a144**, final reviewed glossary **f3f655b**; startup harness follow-up **6d09111**. Final CI **39247474069** passed **Windows and Linux**, each with **131 browser / 96 JS / 76 storage-protocol**, strict validation and standalone executable build/smoke. Shared CI **39247474128** passed all three jobs. The initial Windows run timed out in two cold page `load` waits before actions began; bounded browser concurrency and explicit DOM/UI readiness passed focused **11/11** checks and final CI. Native-speaker editorial review and physical PC execution are not claimed.

Published both CI-tested tool **0.9.6** platform archives, installed owner app **working revision 90 / 0.0.0-draft**, and verified actual cloud tool **0.9.6 / Executa 786 / master 1193 loaded/running**. All changed installed UI hashes match. Actual UI/tool reads pass **en / ko / ja / zh-Hans / zh-Hant**, keeping the same pet name and authoritative data. Existing game ETag and art/chat/story/personality values/ETags are unchanged. New-language switching and validation made no additional AI request beyond the six authorized translation calls; image calls **0**.

Cut **1.4.14 / ID 1478**, bundle **1374 / 174 files / 171598743 bytes**, manifest SHA-256 `f5c1811787c3a0bab742f7ae20d2f499a8e50fc7dc287c1d0dbb13ef5e12109f`. Working content hash `f6bf2d50a2f5787d4e079fd576bd1e23fe2eecd71acde485c43c8cace493570a`. Fresh platform read confirms candidate **1.4.14**, `dirty_vs_latest_cut: false` and exact/minimum tool **0.9.6**. Shared listing and the existing six screenshots are retained while public **1.4.13** stays available. Published-app update path: apps release 1.4.14 queued release review (pending, is_latest false, published_at null); there was no immediate public promotion or web deployment.
