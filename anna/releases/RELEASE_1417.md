# Anna 1.4.17 - item fitting

Deployed candidate: **app1.4.17 / tool0.9.8**, runtime commit **85de6460afbce9c5c2b967fdd2a55f6d26b870ae**. Normal release review is **pending**, candidate **1640**, replacing superseded1.4.16/1587. Public1.4.13 remains current. Submission is not review approval or public promotion.

## Behavior

Owned regional cosmetics can create a new companion portrait using one explicit `image.edit` request. The original portrait and item remain during generation, storage and preview. Only an explicit Apply after the result file exists commits the portrait pointer, one-item consumption, discovery history and receipt together. Saved-result recovery does not request another image. Cancelling an unapplied fitting preserves the original and item; it does not add an unequip/refund rule.

Both fitting gates are enabled and the app declares `image.edit`. The existing account grant already permits editing one image per call; no new grant or credential was created. User-facing copy explains that the result interprets the item and may differ from its catalog illustration. English, Korean, Japanese, Simplified Chinese and Traditional Chinese cover fitting, recovery and consumption. Common gifts/item shops remain unavailable, as before.

## Real image checks - four calls total

The user confirmed that calls use existing included allowance and explicitly prohibited extra payment and auto-recharge. The existing private image-check app519 and installed Anna CLI image bridge were used with the documented contract:

`anna.image.edit({image_url,prompt,n:1,model:'fal-ai/nano-banana-2'},{timeoutMs:240000})`

All **4 calls returned HTTP200 and one saved image**, with **0 text calls / 0 paid retries**. The attempt ledger is written before dispatch; an uncertain response cannot be retried or omitted from the four-call budget. No persistent authentication value or signed provider URL is saved.

| Original | Cosmetic | Manual visual inspection |
| --- | --- | --- |
| Water ghost | Ember Horns | Face, colors, two arms and legless body retained; head ornaments added |
| Nature plant | Snowflake Scarf | Leaf crown, face, four legs and vine tail retained; scarf fits the upper body |
| Fire dragon | Blazing Cape | Face, horns, limbs, existing wings and tail retained; cape fits around wings |
| Water ghost | Deep-Sea Bubbles | Original body retained; bubbles surround it without new limbs |

These are four inspected samples, not an automated identity/anatomy guarantee. The contract accepts one original image plus an item description; it does not copy the catalog asset as a second reference. Every application still requires a user preview. Provider-response loss before any bytes arrive remains unrecoverable without a provider lookup API; the app preserves the item/original and blocks automatic paid retries.

## Real APS and two-window checks

Actual Anna APS in the existing developer app451 was exercised through the official CLI StorageBridge and actual Python SDK service, using isolated test keys and fresh test pet IDs. Two separate local browser windows/processes shared the same test save. No owner production save, portrait or conversation was replaced. The four already saved images were reused; this phase made **no new AI calls**.

- Two simultaneous reservations produced one winner and a real ETag conflict. Preview left the item owned; explicit application consumed exactly one and retained discovery history.
- Failed upload and a missing real stored file could not consume an item. A failed game write retained the original and item. An IndexedDB reload recovered the saved bytes/action without generation.
- A deliberately lost response after a real application commit resolved from the same receipt after reload; no second consumption occurred.
- An observed portrait change from the other window rejected stale application. Cancellation retained ownership and the prior portrait.

This establishes real storage/receipt/file behavior in the development harness. Deployed files, grants and the actual PC executable were separately checked below. It does not establish native/mobile-shell rendering or a running Linux cloud executable. ART/files/game remain separate stores, with the documented cross-store concurrency limits in [EQUIPMENT.md](../docs/EQUIPMENT.md).

## Validation and deployment

Local changed-scope checks: **107 JS / 5 focused browser / 3 fitting storage-protocol**, strict manifest validation and diff checks passed. Full Windows/Linux CI and package results are reported for the exact pushed runtime commit. The earlier baseline's full local checks are not relabeled as new candidate runs.

Independent UI/UX review used isolated local Chromium at desktop1100x850 and mobile320x700/390x844, including Korean and the night theme, with the saved real result and original portrait. External requests were blocked. It found and corrected missing original/result comparison, cramped action layout, ambiguous progress/success copy, lost preview on reopen, inconsistent Close/Escape behavior, focus loss, and a progress banner hidden by catalog scrolling/sticky headers. Both portraits now have labeled, uncropped, enlarged views; applying explicitly states one-item consumption. Closing preserves progress with a visible return action; save errors/reload recover saved results without generation. Primary/close targets are at least44px, measured text/CTA contrasts exceed4.5:1, and no horizontal overflow or page errors were observed. Local fixture calls are not additional provider calls.

These are automated regression tests and human visual inspection of locally rendered shipped code. Actual installed Anna/native-shell rendering and physical mobile keyboards/back gestures remain separate deployment/device checks; they are not claimed by this local review.

Final CI on85de646 passed both platforms: **107 JS /140 browser /79 storage-protocol** plus strict validation and standalone build/smoke. [Anna workflow40158963056](https://github.com/kdkrkwhr/notebook-pets/actions/runs/40158963056); [shared workflow40158963066](https://github.com/kdkrkwhr/notebook-pets/actions/runs/40158963066). The initial candidate's missing collection/body guidance was fixed in all five languages and its failing narrow-screen check passed before this successful full CI.

Both exact CI packages were directly uploaded to existing tool1193, frozen as0.9.8/849. Linux archive SHA-256 **30ec3b6a5cbb0251b433df0ae693374b3050b55dbb6388beb279f0a69f2119ce**; Windows **68202be0af08343589bdb4db45a5e1cc2fb2f209edc120045b0a3d31ba1a8009**. Server hashes, entrypoints and all four storage capabilities match. Tool0.9.7 remains preserved.

Working push used observed revision92 and produced **revision93 /ready**, content hash **51c9f74f1e49b90768dd824194d2a365bd6da012d41f5af4b6548d6dec9727ce**. Shared listing writes were blocked and before/after hashes match, including screenshot URLs. A normal single-tool reinstall on the existing PC installation35689 returned success; status confirms **0.9.8 loaded/running**, install success. Installed0.0.0-draft serves six checked UI files byte-identical to source; image.edit is declared, existing allowEdit grant is enabled/max1, and permissions are satisfied. Production game/art/chat/story/personality record hashes and ETags remain unchanged.

Cut1.4.17/1640 freezes849 and bundle **1523 /176 files /171636644 bytes /bundle_ready**, manifest SHA-256 **b1515f206c4128fe853db1c5350b8c059f3ea10340cab1c814d8b61b1282c22d**. Working is clean vs cut. Normal `apps release 1.4.17` returned pending/is_latest false/published_at null; final server readback confirms old1.4.16 superseded and public1.4.13 unchanged. No first-app submit-review, app deletion, new credentials/grants, cloud resume or public-web deployment occurred. The final bookkeeping commit changes documentation only; runtime CI/package provenance remains85de646.
