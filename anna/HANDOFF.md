# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-20)

| 항목 | 값 |
| --- | --- |
| Anna 공개 앱 | **1.4.13**, [스토어](https://anna.partners/store/@kdkrkwhr/notebuddy) |
| Anna 테스트 앱 | **1.4.15 / working revision 91 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.15 / ID 1486 / pending**, 공개 1.4.13 유지 |
| 모바일 | **desktop/mobile 선언 / 최소 너비 320px / 터치·안전 영역·가로 배치 대응** |
| 게임 도구 | **0.9.6 / Executa 786**, 실제 클라우드 loaded/running |
| 검증 | CI Windows/Linux 각각 **브라우저 135 · JS 96 · 저장/프로토콜 76**, 실제 설치 5개 언어 |
| 공개 웹 | **0.7.0 / ee6a4b5**, 이번 작업에서 변경·배포하지 않음 |
| 한계 | 실물 iOS/Android·네이티브 모바일 셸·OS 키보드/뒤로가기는 미검증 |

모바일 대응과 기존 5개 언어를 묶은 1.4.15를 새 업데이트 심사에 접수했다. 앱 전체 상태는 published이며 새 버전의 release_review_state는 pending이다. 현재 공개 1.4.13과 공유 소개/스크린샷은 유지했다. 이후 심사 갱신에는 매번 새로운 사용자 지시가 필요하다. 최신 작업 2건만 유지하며 오래된 기록은 변경 없이 이력 맨 위로 이동한다.

---

# Anna 1.4.15 mobile support — 2026-10-20

Runtime source **cc36c65**. Anna CI **39273350333** passed Windows and Linux: each **135 browser / 96 JS / 76 storage-protocol** checks, strict manifest validation and standalone build/smoke. Shared CI **39273349842** passed all three jobs. Focused mobile suite **4/4** passed locally; the earlier full local run passed 134 before the fourth mobile scenario was added.

Installed owner app **1.4.15 / working revision 91 / 0.0.0-draft**. Actual cloud tool stays **0.9.6 / immutable Executa 786 / master 1193 / user executable 35689 loaded/running**; no tool-source or binary replacement was needed. Actual installed bundle, official SDK and official host bridge passed five-locale reads at 320px, tappable care help and landscape home checks. Changed installed **mobile.css / hints.mjs / app.js** SHA-256 hashes match local source. Owner game ETag and artwork/chat/story/personality values and ETags are unchanged. Paid AI calls for this task: **0 text / 0 images**.

Immutable review **1.4.15 / ID 1486**, bundle **1382 / 175 files / 171605357 bytes**. Manifest SHA-256 **cf07354d7aff7af92f3fdee68f6c769f1c072252b6b39cdba02bd624f87c95b1**; working content hash **b9f555e67b0d56f659ae5840a953015350254557555ec91349546fa5fb3bda41**; `dirty_vs_latest_cut: false`. Frozen manifest contains `form_factors: ["desktop", "mobile"]`, minimum width **320** and exact/minimum tool **0.9.6**. The owner explicitly requested this review update after mobile verification. `apps release 1.4.15` queued **release_review_state: pending**, current candidate **1.4.15**, `is_latest: false`, `published_at: null`. Public **1.4.13**, its immutable row and shared listing/screenshots remain unchanged; public web was not deployed.

Limits: touch emulation and a reduced-height viewport do not establish physical iOS/Android or native keyboard/hardware-back behavior. The dedicated Anna mobile-shell endpoint returned 401 with available credentials after the browser session expired; native-shell verification is not claimed. Owner installed UI and real cloud RPC were verified independently through the existing authorized CLI identity and official bridge, with a read-only RPC guard. The owner plans to check mobile-client availability and physical-device behavior. Private evidence: `.local/mobile-live-proof.json`, `.local/mobile-preservation-proof.json`, `.local/mobile-final-proof.json`, `.local/mobile-support/` and CI logs. No new translation-provider or image-provider quality test was performed.

See **releases/RELEASE_1415.md** and **reviews/REVIEW_1415.md**.

---

# Anna 1.4.14 multilingual update — 2026-10-19

Owner-authorized app **1.4.14 / working revision 90 / installed 0.0.0-draft**, actual cloud tool **0.9.6 / Executa 786 / master 1193 loaded/running**. Review **1.4.14 / ID 1478 / pending**; public **1.4.13** retained. Per-version release review is pending while the app lifecycle remains published; no immediate public promotion or web deployment.

- Added **Japanese / Simplified Chinese / Traditional Chinese** across static UI, furniture/items, fallback stories and selected-language AI output prompts. Old names, chats, portraits and prose remain original; optional new personality text and evolution prose support all five locale codes. No automatic translation/AI on language changes. Includes album containment and truthful 64-message/40-KB retention copy.
- Final source **f3f655b**, CI **39247474069** passed both OSes: **131 browser / 96 JS / 76 storage-protocol**, strict validation and executable build/smoke. Shared CI **39247474128** passed. Earlier Windows cold page-load timeouts were addressed in the test harness; focused **11** checks also passed. Both tested platform archives were published together.
- Used exactly **six authorized text calls / zero images**, public copy only, no paid retries. Raw results saved before local JSON framing repair. Traditional Chinese converted offline; glossary corrected, including the calm mood meaning of Content. **1,064** static entries. Native-speaker editorial review and physical PC execution remain unperformed.
- Installed source hashes match; actual five-language UI/tool reads passed. Game ETag and art/chat/story/personality values/ETags are unchanged. Shared listing and all six screenshots retained; public release is separate from this review submission.
- Bundle **1374 / 174 files / 171598743 bytes**, manifest SHA-256 **f5c1811787c3a0bab742f7ae20d2f499a8e50fc7dc287c1d0dbb13ef5e12109f**; working hash **f6bf2d50a2f5787d4e079fd576bd1e23fe2eecd71acde485c43c8cace493570a**, **dirty_vs_latest_cut false**, exact/minimum tool **0.9.6**. Details: **releases/RELEASE_1414.md**, **reviews/REVIEW_1414.md**, **locales/README.md**.

---
