# Android handoff history

## 2026-10-23 · 0.1.0-lab

- Branch: `release-android`, based on `release-web` at `ca5648b`.
- Separate package: `io.github.kdkrkwhr.notebuddy.lab`. Native Kotlin prototype, not a full game port.
- Build: Gradle 8.13 / AGP 8.13.2 / Kotlin 2.4.21; LiteRT-LM 0.18.1; pinned Gemma 4 E2B model with size + SHA-256 verification.
- Installed debug APK on Galaxy Z Flip6, API 36. Final APK SHA-256: `287c078b0bfaa739e008a262523d5fac9e56ac325dd4fc04a48459c4c292b1fe`.
- Local unit tests: 15 passed. Device tests: 3 passed including 5 real local inference requests and user-file hash preservation. Lint: 0 errors, 14 advisory warnings.
- Final GPU figures and image-quality failure are documented in [VALIDATION.md](VALIDATION.md).
- Preserved the latest selected photo and re-analyzed it through the UI after fixing a test fixture collision. Earlier profile/chat were overwritten by the initial harness; do not claim complete recovery. Final tests use cache/report files only.
- Native model processing is local. Model download requires network. Physical offline mode, long sessions and CPU-only fallback still need validation.
- Anna, Desktop and public Pages deployments unchanged. No review candidate created, no store submission and no public Android release.
- No model binaries, device serials, private photos, local reports or signing keys committed. CI builds a separate debug artifact; its signature may differ from the locally installed APK.

Next integration should keep the current game UI and shared Python rules. Do not adopt this lab UI as the NoteBuddy mobile product UI. Local image analysis plus limited shape rendering is not equivalent to the existing image-generation service.

