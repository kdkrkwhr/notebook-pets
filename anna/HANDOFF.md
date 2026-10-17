# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.9 / working revision 74 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.8 / ID 1437 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.1 / Executa 760**, 변경 없음 |
| 검증 | JS 92 · 전체 브라우저 116 · 14개 언어/폭 조합 · 5개 창 · strict |
| 공개 웹 | 기존 배포 유지, 이번 배포 제외 |
| 제한 | 실제 이동 시트 생성·표시 확인, 스타일 차이 가능 / 전체 CI 진행 중 |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# 1.4.9 test-only: remove manual portrait redraw - 2026-10-18

Source **60a5257**, Anna **1.4.9 / working revision 74 / installed 0.0.0-draft**. Removed album redraw, growth redraw, confirmation dialog and manual image generation/retry. Initial drawing/photo birth, saved artwork, home appearance choice remain. Evolved messages no longer suggest redraw.

- Installed app: no redraw controls or manual generator, existing portrait visible, Connected. Installed app.js SHA-256 **ca84e281181b8ea8816a9d65a1ea47d4b57d67f1044c5ad95a2d62f9ef94acb7** matches source.
- ART/chat/walk-story/personality KV unchanged across install. Tool 0.9.1 / Executa 760 remains loaded/running; install failures zero. Listing unchanged. No paid AI calls or public web deployment.
- Owner coins: private backup and ETag conditional write changed only coins from 0 to 100; full value readback matched and live tool returned 100. Later home/request records and balance changed through ongoing play (53 at last check); preserved rather than resetting live progress.
- Validation: JS 92, strict passed; full browser 116 passed (449 seconds). GitHub Tests 39049179731 passed; Anna packaging 39049179684 in progress.
- Review remains **1.4.8 / ID 1437 / pending_review**. No review replacement for this later request.

---

# 1.4.8 review replacement explicitly requested - 2026-10-18

User explicitly requested review reflection. Cut tested **c93143c / working revision 73** as **1.4.8 / ID 1437** and submitted. Verified **pending_review**. Includes album cleanup/pixel-preview removal and delayed dungeon reveal after walk result acknowledgement. Tool remains **0.9.1 / Executa 760 / ID 1193**. JS 92 and browser 117 passed; GitHub Tests 39048070936 and Windows/Linux packaging 39048070819 passed. No public release. Subsequent manual-redraw removal belongs only to the 1.4.9 test draft.
