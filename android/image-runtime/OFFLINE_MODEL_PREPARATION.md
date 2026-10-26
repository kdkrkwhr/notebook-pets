# Gemma preparation: installed state and proposed offline-only fix

This note describes the new `.lab.ondevice` package. No phone operations or rejected calls were retried while preparing this fix.

Last phone evidence: both approved model files were copied and SHA256-verified; the installed app started successfully. Read-only native status returned `textModelReady=false`, `imageModelReady=true`. The installed APK remains version 0.2.3-alpha / code 5, SHA256 `6c2e12dcb9510ff853b38e3317b5199ea17e92fbbfc7e793b73256762b2286db`. The changes in this note are not installed on the phone.

`ModelFiles.ready()` requires the expected model size plus a `.verified` receipt containing `expected SHA256:lastModified`. Copying only the weights into the fresh app does not produce that receipt. Therefore a correctly copied file is not automatically accepted as ready by the app.

The rejected operation was `n.call('download')` inside the PC verification helper, conditional on `ready=false`. The native bridge routes it to `ModelFiles.download()`. With a complete model of the expected size it hashes the local file and writes a receipt. If the model is absent or the size changes before that branch, the same public method can open the configured remote URL. A complete partial file can also be promoted; legacy checksum mismatch handling deletes the rejected weight file. An external stat check does not make this combined operation strictly offline. Automatic approval review rejected the possible new-download behavior; that invocation did not execute. The subsequent accepted helper only called read-only `status`.

Effects in the installed app:

- Text chat and Gemma-backed image understanding requests require `models.ready()` and are currently blocked at that readiness gate, based on the last observed status.
- Direct SD1.5 img2img does not need Gemma analysis. It uses the original image and a fixed prompt, checks its own weights/hash, and closes Gemma before image runtime loading. SD preparation was confirmed, but integrated main-app generation/save/recreate has not been tested on the phone.
- The original app and prior QA notebook were not replaced or reset. No statement here changes their readiness status.

Proposed, PC-only changes:

1. `verifyExisting()` hashes only the exact existing model, refuses absent/wrong-sized input, never opens a URL, never promotes a partial file and never calls `download`. It preserves model bytes on checksum failure or cancellation and only invalidates an unsafe readiness receipt.
2. `verifyModel` exposes that operation through the existing serialized worker. The normal download action remains separate and explicit.
3. Settings offer “기존 파일만 확인 · 다운로드 없음” only when a complete local model is present. Failed verification never falls back to download. No operation starts automatically.
4. The future opt-in phone test uses the separate verification action, not `download`. It has not been run.

Unit fixtures are 4KiB with an unsupported URL; tests do not use a real model, external server, or phone. Coverage includes valid receipt creation, absent/wrong-size/corrupt models, cancellation and changes during hashing. UI state tests check exact action choice, no fallback and no automatic request.

PC validation completed: six offline Kotlin tests and three settings action tests passed; four existing image-state tests also passed. Targeted unit compilation and Lint completed successfully in 49 seconds. No APK assembly or phone operation was requested in this phase; the existing installation artifact SHA256 remained unchanged. Current changes are a local, uninstalled proposal, not proof that Gemma preparation on the phone has been completed.

No additional model is currently needed. Applying this fix and executing the new offline verifier require a later instruction to resume phone work; the current instruction explicitly pauses that work. Do not suggest the old combined download button as a guaranteed offline substitute. If weights are missing or invalid, preserve them and report the problem before any new download choice. No new service or credential is introduced.

Remaining broader work: integrated real-phone generation/cancel/save/recreate verification, a bounded quality review, confirmation of text-model readiness after an authorized update, and Git commit/push/CI. The probe result (174.9 seconds at 256px, approximately 5.45GiB peak RSS) is feasibility evidence only. Red-marking deformation, background artifacts, evolution consistency and performance limitations remain.
