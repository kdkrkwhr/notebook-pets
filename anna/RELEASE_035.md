# Notebuddy 0.3.5 — photo references

Local source candidate, 2026-10-12. The most recently verified Anna review submission is still app **0.3.4**, version ID 1282. This feature has not been uploaded, cut, installed or submitted for review. Game tool **0.1.15** and the storage schema are unchanged.

## Behavior

- First meeting → **From a drawing or photo** → **Draw or choose a photo**. Keep drawing on the existing canvas, or switch to **Upload a photo or image**.
- PNG, JPEG and WebP up to 12 MiB and 16 million pixels, at least 32 pixels on each side. Check actual file signatures and decoding, reject blank input, flatten transparency onto white and re-encode as PNG with the longest side at most 1024 pixels. Original filenames and image metadata are not retained.
- File selection and preview stay local. **Meet** starts the existing Anna image-analysis → trait confirmation when uncertain → game creation → source storage → text-guided portrait generation → album save flow.
- Human, animal, plant and object photos are valid references. Prompts prioritize the foreground subject, preserve human anatomy and cropped framing, and request no identification or sensitive-trait inference. Output is an illustration inferred from visible features, not a direct photo edit or a likeness guarantee.
- Selecting a different accepted reference clears its cached assessment. Cancelling or switching modes invalidates pending decoding. A saved portrait retries storage without another generation, and reopening never automatically regenerates.
- English/Korean labels, file errors, the candidate description and the privacy notice include photos and explain the two AI requests. No new permissions, API keys, services or game-data migration are needed.

## Validation

- JavaScript unit checks: 49 passed before the final growth-prompt wording adjustment.
- Strict Anna manifest validation passed.
- Full browser validation is **unfinished**. The initial connection assertions passed, but the installed Edge and Chrome processes hung during teardown. Diagnostic launcher changes were removed; the normal test harness is retained with a 15-second page-operation timeout. The new upload cases have not yet produced a completed test run. Resume them before deployment; this commit is not a fully validated release.

Browser tests use synthetic references and mocked Anna APIs; they cannot establish live model quality or Anna mobile file-picker compatibility. The earlier one-photo Anna analysis/generation experiment used a provisional photo-enabled prompt and does not substitute for an installed 0.3.5 check.

## Before Anna deployment

1. Publish the reviewed source and an immutable `anna-release-v0.3.5` tag containing `anna/PRIVACY.md`. Change `app.json`'s `privacy_url` to that tag and verify the page is accessible. Until then the local manifest retains the already-public 0.3.4 notice URL; do not sync this mixed candidate metadata to Anna.
2. Reuse the verified game tool 0.1.15 package, push/finalize the new UI, and cut an immutable private 0.3.5 version. Preserve the pending 0.3.4 listing while testing.
3. In the installed Anna app, check desktop/mobile file selection and a real drawing/photo analysis → generated portrait → save → reopen flow. Verify the preview, AI allowance messages, source deletion and retry behavior; local tests do not test Anna's host picker or provider output.
4. Only after that validation, update the listing/screenshots and submit the intended candidate for review. A source commit alone does not update an installed Anna app.

Private reference photos, generated personal portraits, account storage backups and one-off migration scripts remain in ignored local storage and are excluded from the release.
