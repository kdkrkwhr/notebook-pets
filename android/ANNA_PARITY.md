# Anna 1.4.13 Android parity contract

Reference: `246781d1ec7a55f014756acc71100e9b531d8dad` (recorded public 1.4.13 packaging source, not a new assertion about the live service). Previous implementation remains at `6066cadbc3379dd97dc4be97bc98d551518d5f9e` on `codex/android-ondevice-img2img`.

## Fixed behavior

- Package the reference `anna/bundle` bytes directly, including its title screen, first/revisit flow, labels, editor, start trigger, uncertain-input confirmation, automatic generation/save, recovery, personality, evolution and home choice. No mobile shell or extra preview/confirmation/save stage.
- Subsequent explicit user approval allows mobile presentation changes: only `local/mobile.css` and `local/platform.mjs` adjust responsive layout, touch targets, font sizes, insets/keyboard scrolling. The reference bytes remain unchanged. Pixel differences caused by this stylesheet are intentional; functional/flow parity, not identical mobile pixels, is the final criterion.
- Reuse reference `GameService`, worker, receipts, privacy/reset, localization and Python rules. Only subprocess/thread execution and authenticated cloud storage are replaced with a single local WebWorker and IndexedDB transactions.
- Preserve complete `llm.complete` prompts/options and `image.generate` text-to-image requests. Never attach the source image to generation, substitute an img2img strength, shorten the birth prompt, or invent a monster policy.
- Preserve original records and unfinished drafts. Migration copies records atomically and retains the previous schema; it never promotes an unconfirmed preview to a saved friend.

## Platform changes and acceptance

| Change | Required reason | Verification |
| --- | --- | --- |
| Serve Anna SDK URL from packaged local adapter | Anna host is absent on Android | All original UI source hashes equal reference; SDK request/response contract tests |
| APS KV/files → IndexedDB | Offline local persistence | CAS, receipt replay, interrupted save, migration and reopen tests |
| Executa subprocess → Pyodide WebWorker | Android has no Anna Executa host | Run unchanged GameService and worker against real Python core |
| LLM/image transport → existing Gemma/SD | User requires free on-device inference | Exact request capture; no network/download; text2img JNI build; phone quality unverified |
| Android Back/IME/insets and cancellation | Native lifecycle | Original dialogs close using their cancel event; no new normal-path screens |

`android/anna-reference.json` pins source hashes. The build fails if reference bytes differ. Render comparisons use the same viewport, input/state and deterministic host fixtures; these establish rendered UI behavior only, not real model quality or Android performance.

## Unverified constraints (not silently substituted)

Anna requests 1024×1024 images, including birth/evolution and home sprite sheets. The existing phone measurement is only 256px img2img (174.9 seconds, peak RSS 5.45 GiB, poor quality). 1024px text2img CPU speed, memory, character quality and sprite coherence are unverified and may be impractical. No downscaling, backend/model replacement, phone execution or quality claim is authorized in this PC preparation stage. CPU sampling parameters are adapter implementation details, not Anna parity evidence.

The packaged capability gate explicitly rejects unvalidated 1024px generation before loading SD. The original Anna recovery UI receives this failure. The JNI text2img implementation is build preparation, not an enabled/validated image feature. Enabling it needs a separate feasibility decision and bounded device validation; do not install this APK as a completed image-generation product. `modelPreferences` cost/speed ranking cannot choose a different provider: this adapter has exactly one approved offline model. Prompts, messages, temperature and token limits are not rewritten.

An old uncommitted preview draft is retained in the old storage record; it is not silently saved or deleted. Any user-facing recovery beyond the original Anna flow needs an explicit decision.

No Anna/Pages/store deployment, model download, external inference, phone UI operation or reinstall is part of this change.
