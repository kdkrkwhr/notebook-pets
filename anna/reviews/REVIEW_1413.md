# Review submission — 1.4.13

Explicitly requested on 2026-10-18 after the owner reported an invisible companion in My home. **1.4.13 / immutable ID 1446 / pending_review** replaces candidate 1.4.12 / 1445. Working revision **88** is installed in the owner app. Frozen tool **0.9.5 / Executa 774 / master 1193** remains loaded/running.

## Review focus

The original image is intact. An old download URL retained by a long-running app can fail when opening home. This version renews the saved appearance URL on every entry without generating a new image. The home warning follows actual decoded image state, so a real fetch/decode failure has visible recovery guidance. Reopening uses a fresh link. No appearance choice is reset and no automatic AI retry is introduced.

The changelog explains this correction. Existing description, six screenshots and other 1.4.12 features remain intact. Owner game, art, conversations, walk stories and personality were preserved; no paid AI request was made.

## Submission evidence

`apps cut 1.4.13` froze **bundle 1343**, **172 files / 171337956 bytes**, manifest SHA-256 `1419a6f232f68be462dc7aa0b782f9c7ab2c0cbae375c751f9f3d6988b4a1ddf`. `apps submit-review` returned **review_candidate_version: 1.4.13 / pending_review**. A subsequent independent platform read confirmed **ID 1446**, revision **88**, `dirty_vs_latest_cut: false` and minimum/exact tool version **0.9.5**. Installed hashes for `app.js`, `home.mjs` and `home-scene.mjs` match source. The owner's home reports **directional / ready**; UI is Connected without a notice. All six listing images decode and shared listing fields are unchanged.

Runtime fix **76449c3** passed Windows/Linux CI **39116562365** (**130 browser / 92 JS / 73 storage-protocol**, strict validation and standalone executable build/smoke). Shared CI **39116562380** passed. Review packaging **246781d** changes only version metadata, with strict validation and JS **92** checked again. No new provider call, tool binary replacement or web deployment. Approval/publication and fresh physical-PC/provider-quality testing are not claimed.
