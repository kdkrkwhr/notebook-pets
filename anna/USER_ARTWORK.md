# Drawing your first companion

The 0.2.5 incremental candidate adds **From my drawing** alongside random start. The editor accepts only strokes drawn on its 512 by 512 canvas, with mouse, pen or touch, color, eraser, undo and clear. There is no photo/file picker, clipboard-image import or drag-and-drop import. Random start uses the 72 bundled baby portraits without a paid birth-image call.

Choosing **Use this artwork** keeps a local preview. Choosing **Meet** checks it with Anna's vision-capable LLM. Only structured approval with bounded visual features proceeds to receipt-protected game start. Blank drawings fail locally; unclear or unsuitable drawings ask for changes. An outage or malformed assessment is a failed check, not a rejection. Source content remains data, never instructions or authoritative game rules.

The engine chooses species and element once. The PNG is saved under `portraits/<pet_id>/source-<uuid>.png`; `<pet_id>/birth-source` records its phase and features in the portrait index. The image generator receives textual features and assigned game traits, with assigned anatomy taking precedence. It receives no reference-image URL. The baby portrait is saved in the album.

## Recovery

- Lost start response: retry the same receipt, retaining the checked drawing in memory.
- Source-save failure: retry while the window is open; if an unsaved drawing is lost on reload, draw again for the same baby.
- Generation failure: retain the source and fixed species/element for explicit retry. Reopening never automatically requests another paid image.
- Provider refusal: draw another sketch or choose the same baby's default appearance.
- Generated-image save failure: retry saving the received result without another generation while this window remains open.
- Companion replacement or growth during work: stop before applying output to the wrong companion.

Care/evolution controls pause while this UI has an unfinished custom baby. Other agents are not globally locked. Existing first-row creation and concurrent-generation limitations remain; provider exactly-once billing is not promised. Both analysis and generation use Anna allowance; failed requests may still consume it.

Source and output files use the portraits prefix and are included in reset/removal. Unfinished references remain indexed so unused-portrait cleanup preserves them. The AI check is product guidance, not a moderation guarantee.

## Verification

Browser tests use isolated storage and mocked vision/image providers for drawing, blank/canceled input, refusal, outages, retries, persistence, narrow Korean layout and companion replacement. They do not establish live model quality. Deployment and live checks are recorded in [incremental releases](INCREMENTAL_RELEASE.md).

This candidate excludes the separately blocked portrait-analysis evolution module. It keeps Executa 0.1.13 and existing LLM/image permissions.
