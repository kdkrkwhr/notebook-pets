# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.10 / working revision 79 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.9 / ID 1439 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.3 / Executa 772**, 변경 없음 |
| 검증 | JS 92 · 홈 브라우저 6 · installed UI · strict |
| 공개 웹 | 기존 배포 유지, 이번 배포 제외 |
| Limits | Garden placement is immediate; PC offline, Windows host execution not verified |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# 1.4.10 home interaction refinement - 2026-10-18

Source **c96d7a2**, owner test **1.4.10 / working revision 79 / installed 0.0.0-draft**. Tool remains **0.9.3 / Executa 772**, actual cloud loaded/running. Review **1.4.9 / ID 1439 / pending_review** and all shared listing fields unchanged. No cut, review submission, public web deployment or paid AI calls.

- Landscape-first browsing: desktop shop occupies its own column; mobile shop sits below the visible world. Shop / My collection tabs, area/style filters, collection empty state and stored-item count make the purchase-to-decoration flow clear. Existing explicit Decorate is still the sole layout AI trigger.
- Zoom/pause under View options; undo/show-finished under More. Idle guidance paragraph removed, AI usage explanation collapsed. Opening the shop closes view settings; Escape closes the shop first and restores focus. Kept appearance choice and save recovery visible when needed.
- JS **92**, real-core home browser **6**, strict and diff checks passed. Real-core scenarios verify purchases/undo/lost-reply recovery, zero browsing AI calls, collection filtering, desktop/mobile non-overlap, keyboard dismissal and sandbox purchase flow. Final keyboard addition passed the focused browser check.
- Installed home.mjs and home.css SHA-256 match source; runtime index.html is host-transformed, so confirmed its view-settings structure in the actual DOM. Two collection tabs, secondary controls closed, non-overlapping world/shop and Connected/no notice verified. Art/chat/story/personality KV and game inspection unchanged. Live screenshot inspected privately; no owner data used in store captures.
- Follow-up CI failure: Anna **39085768337** failed eight recovery cases on both platforms because the shared mock home lacked the required `owned` list. Real engine responses include it. Fixed the test fixture only in **507e59c**; all eight previously failing cases pass locally. Replacement CI Tests **39086263306** and Anna **39086263232** both succeeded. Windows and Linux each passed JS **92**, full browser **118**, storage/protocol **70**, strict validation and packaged executable smoke tests. Production bundle stays at c96d7a2/revision 79; no app/tool deployment or paid AI is needed for this test-only correction.
- Core CI **39085768334** passed. Packages were not changed or republished. PC remains offline/unverified. Earlier Windows/Linux 0.9.3 packages remain installed/uploaded as recorded below.

---

# 1.4.10 empty starting yard - 2026-10-18

Source **7037da7**, owner test app **1.4.10 / working revision 78 / installed 0.0.0-draft**, actual cloud tool **0.9.3 / Executa 772 / ID 1193 loaded/running**. The user clarified that all default trees and decorations should be absent. Kept the cottage/fence/paths/lawn and existing owned objects; removed all separate default trees, bushes, bench, pots and flower clusters. Cottage artwork is preserved. The earlier sparse two-tree variant was never deployed.

- Home/geometry tests **11**, JS **92**, real-core home browser **5**, strict passed locally. Core CI **39084579106** and both Windows/Linux jobs in **39084579116** passed, including full browser/protocol checks and packaged executable smoke tests.
- Explicitly published both tested 0.9.3 binary artifacts, then used scoped cloud tool reinstall and restored the source storage declaration. Installed the working UI. Actual world default object list is exactly **house**; existing purchased objects still render. Current home-scene.mjs SHA-256 **770b5ff307ae4604485cb450d9fb615cfeea2a3153a2ef3087f5a5e031cb5fcd** matches the installed file. Connected, no error notice.
- Private pre/post game value and ETag are identical. Art/chat/walk-story/personality KV all identical. No game migration, paid AI or production purchase calls.
- Review **1.4.9 / ID 1439 / pending_review**, tagline/description, all six screenshot URLs and shared listing fields verified unchanged. No app cut, review submission or public web deployment. PC host remains unverified/offline as previously recorded; Windows package is CI-tested and uploaded.
