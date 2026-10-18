# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.12 / working revision 86 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.12 / ID 1445 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.5 / Executa 774**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 92 · 브라우저 129 · 저장/프로토콜 73 · 격리 APS 시나리오 14 |
| 공개 웹 | **0.7.0 / ee6a4b5**, Pages CI **39106404258** 성공 |
| Limits | Owner scope: one device per account; fresh AI quality / physical PC runner not tested |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Anna 1.4.12 review refresh — 2026-10-18

At the owner's fresh explicit request, review candidate is now **1.4.12 / ID 1445 / pending_review**, replacing 1.4.11 / 1443. Owner test app **working revision 86 / installed 0.0.0-draft**; frozen and actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Runtime UI **c968ae8 / fc92f2c / 60569b1** is unchanged by review packaging. Web remains unchanged. No public-release command, tool-binary replacement or paid AI request.

- Bundled visible image/chat/evolution progress and recovery feedback plus the wrapped APS write-conflict correction previously restricted to the owner test draft. Updated app/package versions, English store description, current-version READMEs and waiting guides. Preserved the owner-supplied English evolution image in slot 2 and added controlled English birth-progress capture in slot 5, retaining six images. Drawing editor remains in docs/Git; waiting capture provenance explicitly records the fake clock/delayed test response, not paid AI output or real provider latency.
- Strict validation, JS **92**, a fresh isolated birth capture and **4** focused home/birth recovery checks passed. The later 36a8fc9 Linux run exposed an older test asserting visibility immediately after home open, during the new loading state. Corrected that test to await the appearance choice; no frozen runtime change. Final 1.4.12 packaging CI **39114637033** passed on **Windows and Linux**: **129 browser / 92 JS / 73 storage-protocol** checks, strict validation and executable build/smoke. Shared CI **39114637052** passed all three jobs at **1040ddd**.
- Restored the exact existing 0.9.5 protocol storage declaration, synchronized store metadata, pushed/installed working **revision 86**, cut immutable 1.4.12 and submitted review. Fresh platform reads confirmed the exact 1.4.12 candidate, **dirty_vs_latest_cut false**, correct frozen minimum/exact 0.9.5 dependency, all eight installed source/style hashes and all six decoded listing screenshots.
- Bundle **1342 / 172 files / 171337260 bytes**, manifest SHA-256 **e62647de59df2db62988e5fb62a15424bd4fcf41d67f7a69b120fe9968131305**. Working hash **553c56f7ed11bc367a0659618790427fed8ac36282c6dec254f957476db1ef4e**. Owner UI Connected with no notice. Owner game ETag and artwork/chat/story/personality values/ETags remained unchanged. Review approval/public release and fresh physical-PC/provider-quality verification are not claimed. Future review replacements need another explicit instruction. Details: **releases/RELEASE_1412.md**, **reviews/REVIEW_1412.md**.

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
