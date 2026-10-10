# Direct evolution image editing — 2026-10-10

## Implementation and specification

Official reference checked: https://anna.partners/developers/reference/host-api-image.md

Evolution passes the previous portrait's fresh download URL and growth instructions to `anna.image.edit`. The manifest includes `image.edit`; the test account already grants `allowEdit`. No vision-LLM extraction is performed for evolution, and `portrait-features.mjs` is removed. Artwork checks for first-time drawing creation remain unchanged.

Keep face, palette, markings and illustration style while changing growth proportions. The source image's text remains untrusted data. Save returned images into file storage; do not persist expiring URLs. Preserve the previous portrait on errors and never automatically repeat a failed paid call. Save-only retries do not regenerate.

The `GPT Image 2` hint is a preference, not a pinned model. Anna documents fallback to the account image-edit preference when hints do not match an allowed model. The failure response did not identify the actual model, so no particular model is confirmed to have run.

## Verification

- Candidate source: `47b84d3`, app candidate 0.2.6, unchanged tool 0.1.13.
- 41 unit tests, manifest validation and 49 browser tests passed on the candidate.
- Official CLI upload succeeded: working revision 25, 87 files, ready. No WAF rejection in this upload. This does not prove which pattern caused earlier upload blocks.
- Development draft installed successfully, tool 0.1.13 loaded.
- A separate public bundled baby image was used for two isolated probes. Neither altered the user's pet, artwork index or game state.
- Legacy development image-edit endpoint: HTTP 502 gateway response.
- Hosted Anna runtime `image.edit`: `APP_PROVIDER_ERROR: image edit failed: Exception: fal.ai image API call failed (HTTP 404): {"detail":"Path /image-to-image not found"}`.

The hosted request passed far enough to report an upstream image-provider route failure. The evidence does not establish whether a model configuration, fallback selection or Anna provider adapter caused the missing route. This is not a source-image download 404 and is separate from the earlier deployment WAF rejection.

## Release decision

Direct-edit implementation is retained in source for follow-up. Do not promote 0.2.6 or replace the review candidate until a supported model/provider route actually returns an image and its visual result is inspected. Keep review/release at 0.2.5. Restore the working test installation to 0.2.5 after the failed live probe. No new immutable release or review submission is authorized by this technical verification record.

Next external diagnostic: ask Anna which available image-edit model/route supports this account, with the above provider error. Do not remove prompt safeguards or change user-wide preferences to conceal the failure.
