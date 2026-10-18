# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.11 / working revision 85 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.11 / ID 1443 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.5 / Executa 774**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 92 · 브라우저 129 · 저장/프로토콜 73 · 격리 APS 시나리오 14 |
| 공개 웹 | **0.7.0 / ee6a4b5**, Pages CI **39106404258** 성공 |
| Limits | Owner scope: one device per account; fresh AI quality / physical PC runner not tested |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Anna 1.4.11 visible waiting and recovery feedback — 2026-10-18

UI source **c968ae8 / fc92f2c / 60569b1**, owner test app **1.4.11 / working revision 85 / installed 0.0.0-draft**. Actual cloud tool remains **0.9.5 / Executa 774 / master 1193 loaded/running**; no Python rule, tool-binary or app-version change. Review **1.4.11 / ID 1443 / pending_review**, its complete frozen row and shared listing are unchanged. Public web was excluded by the owner and remains unchanged. No paid AI calls.

- Added shared, presentation-only activity feedback to birth portraits, home pixel images, evolution, direct chat, care, stories, personality and decoration: a visible activity mark, real elapsed clock and delayed-response guidance after 30 seconds. Image generation, received-image download, validation and saving use distinct phases. No invented percentage, provider ETA, polling or automatic retries. Idle screens gain no permanent explanatory panel.
- Fixed mobile home progress being pushed out of view by disabled choice/action controls; irrelevant controls hide during work. Loading no longer displays a missing-image warning. Evolution Escape cannot hide an active operation. Completion/failure clears activity while retaining results and existing recovery controls. Chat failure restores the typed text; save retries reuse the received response. English/Korean and reduced-motion behavior verified; elapsed ticks are not repeatedly announced to screen readers.
- Local focused browser checks **17** passed, plus **4** existing home/birth recovery checks, JS **92** and strict validation. Windows/Linux CI **39113368771** passed on both OSes: **129 browser**, **92 JS**, **73 storage/protocol**, strict validation and executable build/smoke checks. Shared CI **39113368782** passed all three jobs. Existing tool binaries were retained because this task only changes UI.
- Initial Windows CI timed out before birth generation: the test advanced without waiting for asynchronous artwork selection to finish. Reproduced on local Chromium; added the missing editor/preview completion precondition and verified all 17 focused cases on Chromium. Also stopped story activity on clear and hidden evolution progress on reset. See the final CI result above; no paid reproduction was needed.
- Final copy-only follow-up **60569b1** uses neutral “still waiting” guidance rather than claiming 30 seconds is slower than the provider's normal speed. Re-ran all **17** focused cases on Chromium successfully after that wording change; the full CI above covers the preceding flow implementation **fc92f2c**.
- Restored the exact existing 0.9.5 protocol storage manifest after the platform again normalized its declaration and rejected the first UI push. Pushed/installed only the working UI draft. Bundle **172 files / 171337260 bytes**, working hash **91b26ae001a6739fef2bf77353a09df52753b2c3bafce12beb9bfd53608da7e8**. All eight installed changed-module/style hashes match; actual UI Connected, no notice, activity controls mounted and idle. Owner home reopened with its existing directional sheet, no missing-image warning or stale spinner.
- Owner game ETag and artwork/chat/story/personality values/ETags stayed unchanged. The owner confirmed one device per separate account as the supported usage assumption; previously tracked same-account simultaneous first creation remains outside that scope. Fresh provider quality and physical PC execution were not retested. Full UX findings and before/after behavior: **docs/UX_FEEDBACK_20261018.md**; screenshots retained privately under `.local/activity-ux/`.

---

# Anna 1.4.11 stability verification and tool 0.9.5 — 2026-10-18

Owner requested stability scenarios 1–3, excluding web and any unrequested review replacement. Code **e46f542 / f2f79ee**; owner test app **1.4.11 / working revision 82 / installed 0.0.0-draft**. Actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Review remains **1.4.11 / ID 1443 / pending_review**, frozen tool **0.9.4 / 773**; the full frozen row and listing are unchanged. No public release or web change.

- Fourteen controlled live-APS scenarios passed in a fresh isolated app, using two independent tool processes: click bursts, pre-send disconnect, lost commit acknowledgement, close/reopen, simultaneous care/attendance/purchase, real ETag merge conflict, interrupted portrait/home saves and simultaneous different evolution choices. No duplicate charge/reward or extra stage advance. Previously paid images replayed locally four times; **zero provider calls and zero unexpected AI attempts**.
- Found a real wrapped APS conflict (`-32603` with `storage.set HTTP 412` / structured `precondition_failed`) that was misreported as a generic save failure. Shared recognizer now handles this exact envelope in game/privacy/reset while unrelated failures retain their errors. Losing actions reload the winner and return stale-request guidance without new sequence IDs. Added regression tests and required tool 0.9.5 in the app manifest.
- Windows/Linux CI **39110144833** passed: JS **92**, browser **122**, storage/protocol **73**, strict validation, both standalone builds and executable smoke checks. Shared CI **39110144817** passed all jobs. Initial CI caught the stale app minimum-tool declaration before deployment; corrected and used only the successful artifacts.
- Explicitly published both OS packages, restored exact protocol manifest storage after normalization, pushed and installed the working draft, and reinstalled the cloud runner. Reopened owner UI is Connected with no notice; six installed UI hashes match. Registry hashes match CI artifacts. Direct CDN byte re-download was blocked by HTTP 403; actual running 0.9.5 and read-only RPC were verified. Working hash **f42216aff79421d50dca702cdc330e8fdeb6c7e287ab7fd695a43c02ec85814d**.
- Owner game ETag and art/chat/story/personality values/ETags stayed unchanged. Test servers stopped; disposable fixtures and private evidence retained under `.local/stability-audit/`. Known first-ever simultaneous creation race remains reproducible offline because supported APS lacks atomic create-if-absent; this task did not claim to fix it. Physical PC execution and fresh AI quality were not tested. Development host logged a ResizeObserver warning during reopening without observed data/action failure. Full record: **docs/STABILITY_20261018.md**.
