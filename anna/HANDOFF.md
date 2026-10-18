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

# Anna home image-link recovery — 2026-10-18

UI-only fix; app version stays **1.4.12**, tool stays **0.9.5**. Deployment pending validation. Review **1.4.12 / ID 1445** and shared listing must remain unchanged; web excluded.

- Reproduced owner home with `data-sprite=missing`, failed fetch and hidden missing-image guidance. The same saved 1024x1024 / 1682284-byte personal sheet downloaded through a fresh signed link and decoded into all 16 frames. No generation or owner data mutation.
- Renew the current saved home appearance download URL on each home entry, with a companion/stage/path guard. Decoded renderer state controls missing-image guidance, replacing the incorrect assumption that a URL means a visible character. No AI, automatic generation, storage write or fallback appearance replacement.
- Regression test fails before the fix (`missing` instead of `ready`), then passes: expired link on entry, fresh link recovery, real fetch failure with visible guidance, subsequent reopen recovery and zero AI requests. Local home/renderer browser **11**, JS **92** and strict validation passed. Full browser verification and installed proof pending.

---

# Anna 1.4.12 review refresh — 2026-10-18

At the owner's fresh explicit request, review candidate is now **1.4.12 / ID 1445 / pending_review**, replacing 1.4.11 / 1443. Owner test app **working revision 86 / installed 0.0.0-draft**; frozen and actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Runtime UI **c968ae8 / fc92f2c / 60569b1** is unchanged by review packaging. Web remains unchanged. No public-release command, tool-binary replacement or paid AI request.

- Bundled visible image/chat/evolution progress and recovery feedback plus the wrapped APS write-conflict correction previously restricted to the owner test draft. Updated app/package versions, English store description, current-version READMEs and waiting guides. Preserved the owner-supplied English evolution image in slot 2 and added controlled English birth-progress capture in slot 5, retaining six images. Drawing editor remains in docs/Git; waiting capture provenance explicitly records the fake clock/delayed test response, not paid AI output or real provider latency.
- Strict validation, JS **92**, a fresh isolated birth capture and **4** focused home/birth recovery checks passed. The later 36a8fc9 Linux run exposed an older test asserting visibility immediately after home open, during the new loading state. Corrected that test to await the appearance choice; no frozen runtime change. Final 1.4.12 packaging CI **39114637033** passed on **Windows and Linux**: **129 browser / 92 JS / 73 storage-protocol** checks, strict validation and executable build/smoke. Shared CI **39114637052** passed all three jobs at **1040ddd**.
- Restored the exact existing 0.9.5 protocol storage declaration, synchronized store metadata, pushed/installed working **revision 86**, cut immutable 1.4.12 and submitted review. Fresh platform reads confirmed the exact 1.4.12 candidate, **dirty_vs_latest_cut false**, correct frozen minimum/exact 0.9.5 dependency, all eight installed source/style hashes and all six decoded listing screenshots.
- Bundle **1342 / 172 files / 171337260 bytes**, manifest SHA-256 **e62647de59df2db62988e5fb62a15424bd4fcf41d67f7a69b120fe9968131305**. Working hash **553c56f7ed11bc367a0659618790427fed8ac36282c6dec254f957476db1ef4e**. Owner UI Connected with no notice. Owner game ETag and artwork/chat/story/personality values/ETags remained unchanged. Review approval/public release and fresh physical-PC/provider-quality verification are not claimed. Future review replacements need another explicit instruction. Details: **releases/RELEASE_1412.md**, **reviews/REVIEW_1412.md**.

---
