# Notebuddy 0.3.5 — photo references

Test deployment completed, 2026-10-12. Anna working revision **33** is ready and installed as **0.0.0-draft**; immutable app **0.3.5** is version ID **1298**. The review candidate remains **0.3.4**, version ID 1282; its shared listing was restored and verified. 0.3.5 has not been submitted for review. Game tool **0.1.15** and the storage schema are unchanged.

## Behavior

- First meeting → **From a drawing or photo** → **Draw or choose a photo**. Keep drawing on the existing canvas, or switch to **Upload a photo or image**.
- PNG, JPEG and WebP up to 12 MiB and 16 million pixels, at least 32 pixels on each side. Check actual file signatures and decoding, reject blank input, flatten transparency onto white and re-encode as PNG with the longest side at most 1024 pixels. Original filenames and image metadata are not retained.
- File selection and preview stay local. **Meet** starts the existing Anna image-analysis → trait confirmation when uncertain → game creation → source storage → text-guided portrait generation → album save flow.
- Human, animal, plant and object photos are valid references. Prompts prioritize the foreground subject, preserve human anatomy and cropped framing, and request no identification or sensitive-trait inference. Output is an illustration inferred from visible features, not a direct photo edit or a likeness guarantee.
- Selecting a different accepted reference clears its cached assessment. Cancelling or switching modes invalidates pending decoding. A saved portrait retries storage without another generation, and reopening never automatically regenerates.
- English/Korean labels, file errors, the candidate description and the privacy notice include photos and explain the two AI requests. No new permissions, API keys, services or game-data migration are needed.

## Validation

- JavaScript unit checks: 49 passed after the final growth-prompt wording adjustment.
- Strict Anna manifest validation passed.
- Full browser validation: all 56 tests passed on Windows Edge, including PNG/JPEG/WebP normalization, local rejection, cancel/decode races, replacement analysis, save-only retry and narrow Korean layout. The process exited normally.

Browser tests use synthetic references and mocked Anna APIs; they cannot establish live model quality or Anna mobile file-picker compatibility. The earlier one-photo Anna analysis/generation experiment used a provisional photo-enabled prompt and does not substitute for an installed 0.3.5 check.

## Deployment and remaining live validation

1. Published source and immutable `anna-release-v0.3.5` tag, updated the privacy URL and verified public document access.
2. Pushed and finalized revision 33, cut version 1298 and installed the working draft. Reused verified tool 0.1.15 / Executa version 711 packages; confirmed running version 0.1.15 and agent_loaded=true. Review 0.3.4 and its listing remain unchanged.
3. In the installed Anna app, check desktop/mobile file selection and a real drawing/photo analysis → generated portrait → save → reopen flow. Verify the preview, AI allowance messages, source deletion and retry behavior; local tests do not test Anna's host picker or provider output.
4. Only after that validation, update the listing/screenshots and submit the intended candidate for review. A source commit alone does not update an installed Anna app.

Private reference photos, generated personal portraits, account storage backups and one-off migration scripts remain in ignored local storage and are excluded from the release.
