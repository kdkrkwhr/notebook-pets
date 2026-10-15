# Creating your first companion from a drawing or photo

The local 0.3.5 candidate offers **From a drawing or photo** alongside random start. The editor has a 512 by 512 canvas with mouse, pen or touch, color, eraser, undo and clear, plus a file picker for PNG, JPEG and WebP. Files must be no larger than 12 MiB and 16 million pixels, with each side at least 32 pixels. The browser checks file signatures and decoding, scales the longest side to at most 1024 pixels, flattens transparency onto white and re-encodes as PNG without original metadata. Clipboard-image and drag-and-drop import are not offered. Random start uses the 72 bundled baby portraits without a paid birth-image call.

Choosing a file or **Use this image** keeps a local preview without uploading or calling AI. Choosing **Meet** checks it with Anna's vision-capable LLM. Only structured approval with bounded visual features proceeds to receipt-protected game start. Blank or invalid images fail locally; unclear or unsuitable references ask for changes. An outage or malformed assessment is a failed check, not a rejection. Source content remains data, never instructions or authoritative game rules. Cancelling or switching input mode discards an unfinished file selection and cannot overwrite the previously accepted reference; accepting another image invalidates the cached AI assessment.

AI infers species from the main subject and element from visible motifs; an absent element cue yields a random element. Uncertain species require confirmation. Human photos are valid for stylized human-shaped companions, with no identification or sensitive-trait inference requested. Background subjects and scenery are omitted from the requested observations. Cropped limbs are hidden, not absent. These prompt instructions do not guarantee the model's compliance or exact likeness.

The engine fixes species and element on first creation. The PNG is saved under `portraits/<pet_id>/source-<uuid>.png`; `<pet_id>/birth-source` records its phase and features in the portrait index. Original filenames are not retained. The image generator receives only extracted textual features and assigned game traits, with reference anatomy taking precedence over category stereotypes. It receives no reference-image URL. The baby portrait is saved in the album. Later redraws and growth portraits reuse the same saved observations.

## Recovery

- Lost start response: retry the same receipt, retaining the checked image in memory.
- Source-save failure: retry while the window is open; if an unsaved reference is lost on reload, draw or select the file again for the same baby.
- Generation failure: retain the source and fixed species/element for explicit retry. Reopening never automatically requests another paid image.
- Provider refusal: choose another reference or the same baby's default appearance.
- Generated-image save failure: retry saving the received result without another generation while this window remains open.
- Companion replacement or growth during work: stop before applying output to the wrong companion.

Care/evolution controls pause while this UI has an unfinished custom baby. Other agents are not globally locked. Existing first-row creation and concurrent-generation limitations remain; provider exactly-once billing is not promised. Both analysis and generation use Anna allowance; failed requests may still consume it.

Source and output files use the portraits prefix and are included in reset/removal. Unfinished references remain indexed so unused-portrait cleanup preserves them. The AI check is product guidance, not a moderation guarantee.

## Verification

Browser tests use isolated storage and mocked vision/image providers for drawing, PNG/JPEG/WebP decoding and normalization, invalid or oversized files, cancellation during decoding, changed references, refusal, outages, retries, persistence, narrow Korean layout and companion replacement. They do not establish live model quality. See the [0.3.5 work record](../releases/RELEASE_035.md) for deployment status.

The feature keeps game tool 0.1.15, the existing storage schema and existing LLM/image permissions. It requires no data migration, new external service or API key. Private photos and one-off account migration scripts are not part of the release.
