# Anna 1.4.17 - item fitting

Runtime candidate: **app1.4.17 / tool0.9.8**. Source activation is prepared after live checks; Anna publication, installation and review submission have not yet occurred at this entry. The final deployment outcome belongs in `HANDOFF.md` and this note.

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

This establishes real storage/receipt/file behavior in the development harness. It does not replace verification of the deployed host, installed cloud executable or native/mobile shell. Those checks must precede submission. ART/files/game remain separate stores, with the documented cross-store concurrency limits in [EQUIPMENT.md](../docs/EQUIPMENT.md).

## Validation and deployment

Local changed-scope checks: **107 JS / 5 focused browser / 3 fitting storage-protocol**, strict manifest validation and diff checks passed. Full Windows/Linux CI and package results are reported for the exact pushed runtime commit. The earlier baseline's full local checks are not relabeled as new candidate runs.

Independent UI/UX review used isolated local Chromium at desktop1100x850 and mobile320x700/390x844, including Korean and the night theme, with the saved real result and original portrait. External requests were blocked. It found and corrected missing original/result comparison, cramped action layout, ambiguous progress/success copy, lost preview on reopen, inconsistent Close/Escape behavior, focus loss, and a progress banner hidden by catalog scrolling/sticky headers. Both portraits now have labeled, uncropped, enlarged views; applying explicitly states one-item consumption. Closing preserves progress with a visible return action; save errors/reload recover saved results without generation. Primary/close targets are at least44px, measured text/CTA contrasts exceed4.5:1, and no horizontal overflow or page errors were observed. Local fixture calls are not additional provider calls.

These are automated regression tests and human visual inspection of locally rendered shipped code. Actual installed Anna/native-shell rendering and physical mobile keyboards/back gestures remain separate deployment/device checks; they are not claimed by this local review.

Required sequence: publish tested Windows/Linux tool0.9.8 packages, push working draft under its observed revision, verify installation and actual runtime/tool versions, then cut1.4.17 and request its normal release review. The existing1.4.16 immutable version must not be overwritten or deleted; normal new-candidate supersession is authorized. Do not use first-app submit-review or app deletion/recreation as an update path. A pending request is not approval/public publication.
