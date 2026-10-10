# Artwork first meeting — develop only

## Flow

Random mode remains free of automatic birth image calls and uses the 72 bundled baby pictures. Artwork mode accepts a file or 512px canvas drawing (color, eraser, undo, clear). On explicit Meet, local input checks precede a multimodal `llm.complete` suitability check. Only a strict `allow` JSON decision with bounded visual features proceeds to the ordinary, receipt-protected start action. Unclear, refused, malformed or unavailable assessments do not create a pet or request an image. Source text is treated as data, never instructions; the AI cannot choose game species, element, stats or rewards.

The engine chooses species and element once. The source is normalized PNG under `portraits/<pet_id>/source-<uuid>.png`; the ART key `<pet_id>/birth-source` records its path, features and phase. The image request sends only the checked textual features, baby proportions and actual game traits. It does not send a reference image URL. A generated stage-1 portrait is saved through the existing ART index and becomes the reference for later evolution.

## Failure and recovery

| Case | Behavior |
| --- | --- |
| Empty, unsupported, undersized, oversized, unreadable input | Local correction guidance; no AI call |
| Unclear reference / explicit AI refusal | Ask for another artwork; no birth action before acceptance |
| Missing vision model, assessment outage or malformed JSON | Report check unavailable, never claim artwork was rejected; no silent approval |
| Lost start response | Keep the original game request ID and approved artwork in memory; explicit receipt retry |
| Reference save/upload failure | Retry source work while the page remains open; if lost, reselect for the existing baby without restarting the game |
| Provider generation failure | Persist reference; manual retry with same pet and traits, with allowance warning |
| Explicit provider content refusal | Mark source rejected; require replacement artwork or default appearance before further generation |
| Generated image save failure | Keep received URL/bytes in memory; retry download/upload/index without another generation |
| Reopen with an uncertain generating marker | No automatic AI retry; warn previous request may have consumed allowance |
| Companion reset/replaced or stage changed during work | Stop applying the old source/output; guards precede uploads and index writes |

Care/evolution buttons are disabled in this UI while a custom baby is unfinished. The user can explicitly choose the same companion's default appearance. This does not erase source files. Other agents are not globally blocked by this UI; the existing cross-runtime concurrency limitations remain. Manual concurrent generations are not guaranteed exactly-once and no provider request idempotency is claimed.

All sources and outputs stay in the existing portraits prefix; ART and files are covered by reset/removal. Unfinished source records remain indexed so ordinary unused-portrait cleanup does not delete their reference. No raw filenames, signed URLs, full saves, real photos or generated personal pictures are committed to Git. The browser input check and LLM assessment are product guidance, not a server-side security or moderation guarantee.

## Verification boundary

Automated browser tests use a mocked image/vision provider. They verify UI, rejection decisions, request shape, identities, persistence, uncertainty and recovery, not real model quality or provider moderation accuracy. The previous image-to-image 404 is bypassed by text-only image requests; success of the new live route is not yet established. No new paid live image attempts, submission replacement or release deployment are part of this change. Actual vision support and feature-conditioned birth quality still need a working Anna route and live verification.

Official API: [LLM image inputs](https://anna.partners/developers/reference/host-api-llm.md), [image generation](https://anna.partners/developers/reference/host-api-image.md). This implementation uses the already declared `llm.complete` and `image.generate` permissions; it does not add image.edit grants.

Live follow-up: one actual Anna baby-to-juvenile vision/text-generation/download sample succeeded. No production game or album write was requested. Deployed UI, user-artwork birth and stages 3/4 remain unverified. See [verification record](EVOLUTION_LIVE_VERIFICATION.md).
