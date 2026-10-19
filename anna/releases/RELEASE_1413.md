# 1.4.13 — Reliable home companion loading

## Public availability — 2026-10-19

Anna approved **1.4.13**, and the [public Notebuddy store page](https://anna.partners/store/@kdkrkwhr/notebuddy) is available. An unauthenticated HTTP request returned **200** with app reference **@kdkrkwhr/notebuddy** and `latest_version: 1.4.13`. Dora's review feedback asks for more polished battle companion visuals that better match the portrait; this did not block approval. README installation links and release status now reflect the public listing. This documentation update performs no app upload, candidate replacement, publish action or new AI request. Existing limitations and the owner-only revision 89 distinction remain as recorded below.

## Submission and validation — 2026-10-18

Submitted on 2026-10-18 at the owner's explicit request. Review candidate **1.4.13 / ID 1446 / pending_review** replaces 1.4.12 / 1445. Owner test app: **working revision 88 / installed 0.0.0-draft**. Game tool stays **0.9.5 / Executa 774 / master 1193**, verified loaded/running. Public web remains unchanged.

- Fix an empty home after a long-running session: renew the saved companion image download URL on every home entry. Preserve the existing personal directional sheet or free default; no image regeneration or AI request.
- Show missing-image guidance based on actual decoded renderer state. A retained URL alone no longer hides a real loading failure. Reopening can recover through a fresh download link.
- Include all 1.4.12 progress, recovery, evolution and home/garden features. Existing listing description and six screenshots are retained and verified readable.

Runtime source **76449c3** passed local **130 browser** checks and Windows/Linux CI **39116562365**, each with **130 browser / 92 JS / 73 storage-protocol**, strict validation and executable build/smoke. Shared CI **39116562380** passed. Packaging **246781d** changes app/package version metadata only; strict validation and JS **92** passed again. All three installed source hashes match. Actual home is **directional / ready**, Connected, with no notice. Owner game ETag and art/chat/story/personality ETags and values are unchanged. Additional paid AI calls: **0**.

Frozen bundle **1343 / 172 files / 171337956 bytes**, manifest SHA-256 `1419a6f232f68be462dc7aa0b782f9c7ab2c0cbae375c751f9f3d6988b4a1ddf`. Working content hash `6858a171240677535ee2e6a0c21ada8fe46a667af6c8390034f46522ecc36098`. Fresh platform verification confirmed candidate **1446**, revision **88**, `dirty_vs_latest_cut: false` and exact/minimum dependency **0.9.5**. No tool binary replacement, public release or web deployment. Approval and physical PC/provider-quality verification are not claimed. See [review record](../reviews/REVIEW_1413.md).


## Owner draft follow-up: growth-album image containment (2026-10-18)

The frozen review candidate above remains unchanged. A CSS-only owner draft fix keeps growth-album images inside their bordered frames using 4px inner spacing, content-box sizing and contained scaling. Both main and collection albums share the correction. Portrait files, stages and gameplay remain unchanged. Verified **21 layouts / 168 images** across seven themes and three viewport widths, existing theme browser **3/3**, and strict validation. No new AI request. Source **1f2e312** is deployed to owner working **revision 89 / 0.0.0-draft**. Installed stylesheet hash matches, and all four owner portraits are loaded and inside their padded frames. The game ETag and art/chat/story/personality values/ETags, frozen review row **1446** and listing are unchanged. Actual tool **0.9.5** remains loaded/running. Bundle **172 files / 171338211 bytes**, content hash `c8dabd5ba1fdc2fcfd4b162965c633302b6e3083a0aa9cf5d0822b8105ec9cdc`. Web remains unchanged.
