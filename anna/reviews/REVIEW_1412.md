# Review submission — 1.4.12

The owner explicitly requested review reflection on 2026-10-18 after testing the stability and waiting-feedback improvements. Candidate **1.4.12 / immutable ID 1445 / pending_review** replaces 1.4.11 / 1443. Dependencies freeze **tool 0.9.5 / Executa 774 / master 1193**. Owner-installed working revision **86**, version **0.0.0-draft**. No public-release command was run.

## Review focus

- Birth portraits, personal home pixel characters and evolution portraits show the current generation/save step, an activity mark and elapsed time. Image generation may take minutes; elapsed time is not an ETA or percentage. Continued-wait guidance does not submit another request or claim a provider has exceeded a measured normal latency.
- Direct chat shows that the companion is preparing a reply and then saving it. Failed saves retain their existing save-only recovery. Mobile home activity remains visible, and completed/failed work restores the appropriate controls and guidance.
- Existing manual evolution remains available: meet level/activity requirements, compare three paths informed by care/adventures/recent conversations/prior memories, choose a route and optionally generate one text-to-image portrait. An image failure preserves the evolution and previous portrait. Home appearance remains a separate first-visit choice with a free default.
- Wrapped APS write conflicts now reload the winner and report stale actions correctly; they never restamp requests or grant duplicate rewards/charges/stages. The app requires the corrected tool 0.9.5.

The description includes progress/recovery guidance. Listing order: companion/care, **owner-provided English evolution**, empty garden, garden shop, **English image-generation waiting**, dungeon preview. The new waiting capture is actual UI with a controlled response and fake clock; it is not a fresh Anna AI result or a latency benchmark. Other image provenance remains recorded in [store documentation](../store/README.md). No paid requests were used for release preparation.

## Submission evidence

`apps cut 1.4.12` froze bundle **1342**, **172 files / 171337260 bytes**, manifest SHA-256 **e62647de59df2db62988e5fb62a15424bd4fcf41d67f7a69b120fe9968131305**. `apps submit-review` returned **review_candidate_version: 1.4.12 / pending_review**. A fresh independent platform read confirmed candidate **1445**, frozen minimum/exact tool version **0.9.5**, working revision **86** and `dirty_vs_latest_cut: false`.

All eight installed changed-module/style hashes match the tested source. Actual owner UI is Connected with no notice and cloud tool 0.9.5 is loaded/running. Listing fields match the prepared metadata; all six CDN images decode, including 1100 × 784 English evolution and 1120 × 900 English progress. Production game ETag and artwork/chat/story/personality values/ETags are unchanged.

Final 1.4.12 packaging CI **39114637033** passed on both Windows and Linux at **1040ddd**, including **129 browser / 92 JS / 73 storage-protocol** checks, strict validation and executable build/smoke. Shared CI **39114637052** passed all three jobs. Final copy also had a **17-case Chromium** check; release metadata passed a fresh isolated progress capture and four focused home/birth checks. The older home-visibility assertion now waits for the loading phase to finish; this test-only synchronization correction does not change the frozen runtime UI. Approval/publication and physical PC/provider-quality checks are not claimed.
