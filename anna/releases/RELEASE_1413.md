# 1.4.13 — Reliable home companion loading

Submitted on 2026-10-18 at the owner's explicit request. Review candidate **1.4.13 / ID 1446 / pending_review** replaces 1.4.12 / 1445. Owner test app: **working revision 88 / installed 0.0.0-draft**. Game tool stays **0.9.5 / Executa 774 / master 1193**, verified loaded/running. Public web remains unchanged.

- Fix an empty home after a long-running session: renew the saved companion image download URL on every home entry. Preserve the existing personal directional sheet or free default; no image regeneration or AI request.
- Show missing-image guidance based on actual decoded renderer state. A retained URL alone no longer hides a real loading failure. Reopening can recover through a fresh download link.
- Include all 1.4.12 progress, recovery, evolution and home/garden features. Existing listing description and six screenshots are retained and verified readable.

Runtime source **76449c3** passed local **130 browser** checks and Windows/Linux CI **39116562365**, each with **130 browser / 92 JS / 73 storage-protocol**, strict validation and executable build/smoke. Shared CI **39116562380** passed. Packaging **246781d** changes app/package version metadata only; strict validation and JS **92** passed again. All three installed source hashes match. Actual home is **directional / ready**, Connected, with no notice. Owner game ETag and art/chat/story/personality ETags and values are unchanged. Additional paid AI calls: **0**.

Frozen bundle **1343 / 172 files / 171337956 bytes**, manifest SHA-256 `1419a6f232f68be462dc7aa0b782f9c7ab2c0cbae375c751f9f3d6988b4a1ddf`. Working content hash `6858a171240677535ee2e6a0c21ada8fe46a667af6c8390034f46522ecc36098`. Fresh platform verification confirmed candidate **1446**, revision **88**, `dirty_vs_latest_cut: false` and exact/minimum dependency **0.9.5**. No tool binary replacement, public release or web deployment. Approval and physical PC/provider-quality verification are not claimed. See [review record](../reviews/REVIEW_1413.md).
