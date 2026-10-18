# 1.4.11 — Choose your evolution

- Evolution is now explicit: meet level and lifetime activity requirements, explore three paths, and choose one. Leveling alone never changes your stage. Existing companions retain their attained stages, identity and progress.
- Growing: Lv.10 + 10 care actions + 3 walks. Mature: Lv.30 + 30 care actions + 10 training + 15 walks. Final: Lv.50 + 60 care actions + 25 training + 30 walks + 3 completed story arcs. Care includes feed, treat, play and sleep; counts are cumulative.
- One bounded AI text/vision request observes the current portrait and personalizes three paths using care, adventures, recent direct chats and the previous evolution memory. The first path preserves the element; the other two offer different elements. Python validates all choices, and AI cannot grant stats, coins or rewards.
- Only the chosen appearance can request one image. Evolution uses visual observations plus the selected direction in a text-to-image prompt, with no image-edit or reference-image request. An image failure keeps the evolution and previous portrait; save recovery never regenerates. Home appearance remains a separate explicit first-visit choice.
- Direct chat history retains up to 64 messages within a 40 KB UTF-8 cap; the conversation panel shows the latest 24. Evolution uses at most 24 recent direct user messages and a 600-character previous evolution summary. This is bounded memory, not a complete transcript archive.
- Shared save schema 5 and Executa 0.9.4. Old schema 2–4 saves migrate without automatic evolution or invented care history. Read-only inspection does not persist migration.

Validation and deployment results are recorded in [HANDOFF.md](../HANDOFF.md). The initial rollout targeted the owner test app and shared web while retaining review 1.4.10 / 1442. The owner subsequently authorized the review update below. No paid AI requests are used by the automated validation; actual provider likeness remains variable.

Deployed: Anna **1.4.11 / working revision 80**, actual cloud Executa **0.9.4 / version 773**, UI **c3bd9ef**, packaged core **95a0874**. Web **0.7.0 / 6e208cd** is live. Both OS binary hashes and six installed UI source hashes match; existing game/art/chat/story/personality records are unchanged. Windows/Linux package CI **39104044964** and Pages **39104707533** passed. The physical PC runner remains unverified; the cloud runner is loaded/running.

## Concise button and review update · 2026-10-18

Changed the entry button to **진화 / Evolve**, regardless of prerequisite status, without changing evolution behavior or bumping versions. Source **e0844c2**, listing/docs **b313d7b**, installed Anna **revision 81**. Added the owner's English evolution screenshot in listing position 2 (replacing the item-book slot), a description of personalized choices and optional text-to-image portraits, and Korean/English README guidance and captures.

The explicit review request was fulfilled as **1.4.11 / ID 1443 / pending_review**, with frozen **tool 0.9.4 / Executa 773**. Bundle **1340 / 171 files / 171330654 bytes**, manifest SHA-256 **38edb72fa2d36dc79b2a2555b70ed450f46841260f5e3324ad2fa91e7ef26560**. No public-release command or new paid AI request. See [review evidence](../reviews/REVIEW_1411.md).

Strict validation, four focused evolution cases, Windows/Linux CI **39106067679** and shared CI **39106067743** passed. Installed source and live labels match; cloud 0.9.4 remains loaded/running. The platform again normalized its mutable tool storage declaration, blocking the first push; restoring the exact already-tested manifest allowed the push and install without replacing binaries. Listing fields and all six decoded CDN images match. Web **0.7.0 / ee6a4b5**, Pages **39106404258** and shared CI **39106404298** passed; the public-site evolution flow and both concise labels were verified. Actual paid-provider portrait quality and physical PC execution were not retested.
