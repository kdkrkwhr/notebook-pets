# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.10 / working revision 79 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.10 / ID 1442 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.3 / Executa 772**, 변경 없음 |
| 검증 | JS 92 · 홈 브라우저 6 · installed UI · strict |
| 공개 웹 | 기존 배포 유지, 이번 배포 제외 |
| Limits | Garden placement is immediate; PC offline, Windows host execution not verified |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# 1.4.10 review candidate, description and screenshots - 2026-10-18

The user explicitly requested the latest review candidate with updated description and screenshots. Review is now **1.4.10 / ID 1442 / pending_review**, frozen **tool 0.9.3 / Executa 772 / master ID 1193**. Working revision **79**, unchanged executable bundle, owner installed draft **0.0.0-draft**. Listing/capture source **d1d1237**, UI source **c96d7a2**, test-fixture correction **507e59c**. No public release or web deployment.

- Updated tagline and description for the empty initial yard, 48 objects/36 garden items, Shop/My collection tabs, stored-item count, desktop split view/mobile stacked browsing and secondary controls. Kept exact AI-use boundaries and removed obsolete change-history copy.
- Recaptured ten real UI screenshots from isolated engine views and recorded Mori artwork; published six: care, empty starting yard, redesigned garden shop, drawing editor, dungeon preview, item book. Collection capture retained in Git. All six uploaded CDN images decode at 1280 pixels wide and description/tagline/listing fields exactly match source. No new paid AI, live owner screenshots or production mutations.
- Runtime bundle was already verified in successful Windows/Linux CI **39086263232**: JS **92**, full browser **118**, storage/protocol **70**, strict and executable build/smoke checks; core CI **39086263306** succeeded. Current capture flow and strict validation passed. Later metadata/capture-only CI **39088482080 / 39088482096** is running at record time; no runtime code changed.
- Actual installed app is Connected with no notice; app.js, home.mjs, home.css and home-scene.mjs hashes match source. Cloud **0.9.3 loaded/running**; art/chat/story/personality KV and game inspection unchanged. Working draft dirty_vs_latest_cut=false. PC remains offline/unverified; previously tested Windows package is retained.
- Bundle **1339**, **170 files / 171308544 bytes**, SHA-256 manifest **4a5154cee5b69fabe1c36f3bb1b47d4ed90ff79675c61d40979b9d64f3b0ea5f**. No redundant tool publish or version bump. Next review change still requires fresh user authorization.

---

# 1.4.10 home interaction refinement - 2026-10-18

Source **c96d7a2**, owner test **1.4.10 / working revision 79 / installed 0.0.0-draft**. Tool remains **0.9.3 / Executa 772**, actual cloud loaded/running. Review **1.4.9 / ID 1439 / pending_review** and all shared listing fields unchanged. No cut, review submission, public web deployment or paid AI calls.

- Landscape-first browsing: desktop shop occupies its own column; mobile shop sits below the visible world. Shop / My collection tabs, area/style filters, collection empty state and stored-item count make the purchase-to-decoration flow clear. Existing explicit Decorate is still the sole layout AI trigger.
- Zoom/pause under View options; undo/show-finished under More. Idle guidance paragraph removed, AI usage explanation collapsed. Opening the shop closes view settings; Escape closes the shop first and restores focus. Kept appearance choice and save recovery visible when needed.
- JS **92**, real-core home browser **6**, strict and diff checks passed. Real-core scenarios verify purchases/undo/lost-reply recovery, zero browsing AI calls, collection filtering, desktop/mobile non-overlap, keyboard dismissal and sandbox purchase flow. Final keyboard addition passed the focused browser check.
- Installed home.mjs and home.css SHA-256 match source; runtime index.html is host-transformed, so confirmed its view-settings structure in the actual DOM. Two collection tabs, secondary controls closed, non-overlapping world/shop and Connected/no notice verified. Art/chat/story/personality KV and game inspection unchanged. Live screenshot inspected privately; no owner data used in store captures.
- Follow-up CI failure: Anna **39085768337** failed eight recovery cases on both platforms because the shared mock home lacked the required `owned` list. Real engine responses include it. Fixed the test fixture only in **507e59c**; all eight previously failing cases pass locally. Replacement CI Tests **39086263306** and Anna **39086263232** both succeeded. Windows and Linux each passed JS **92**, full browser **118**, storage/protocol **70**, strict validation and packaged executable smoke tests. Production bundle stays at c96d7a2/revision 79; no app/tool deployment or paid AI is needed for this test-only correction.
- Core CI **39085768334** passed. Packages were not changed or republished. PC remains offline/unverified. Earlier Windows/Linux 0.9.3 packages remain installed/uploaded as recorded below.
