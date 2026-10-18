# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.10 / working revision 79 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.10 / ID 1442 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.3 / Executa 772**, 변경 없음 |
| 검증 | JS 92 · 웹 전체 검사 · 공개 주소 재검증 · installed Anna 유지 확인 |
| 공개 웹 | **0.6.0 / 25eede1**, Pages CI **39090052557** 성공 |
| Limits | Garden placement is immediate; PC offline, Windows host execution not verified |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Web 0.6.0 shared home, garden and care integration - 2026-10-18

The user requested all current changes on the web. Merged Anna release **3fec4e9** into `release-web` through Git (**bab2f73**), then shipped web adapter **25eede1** as **0.6.0** to https://kdkrkwhr.github.io/notebook-pets/. Anna test app **1.4.10 / working revision 79 / owner 0.0.0-draft**, tool **0.9.3 / Executa 772**, and review **1.4.10 / ID 1442 / pending_review** remain unchanged. No Anna publish, review update or paid AI calls.

- Empty initial yard, indoor 12 / garden 36 objects, Shop / My collection, storage count, desktop split / mobile stacked home, secondary controls and hover/touch help. First-home explicit image-or-free-default choice replaces automatic birth/portrait image generation. Gemini and ComfyUI retain browser-local reference-image transport through a shared generator hook; Anna keeps its existing default transport.
- Added the care AI toggle, optional reactions, saved shared walk stories and delayed dungeon discovery cards. OFF preserves game actions/rewards and authored stories; direct chat remains explicit AI. The core owns choices and rewards. IndexedDB/backup now preserve the latest story; invalid story backups are rejected. Existing epoch/CAS and late-response guards remain.
- Local shared JS **92**, web core/persistence/reset, world/image/recovery/backup, local AI **6** plus browser, current home/care/story integration, and all **7** themes passed. Pages **39090052557** build/deploy and common CI **39090052561** (Windows/Linux regressions, stdio and Pyodide) succeeded. Live `web-current.mjs` and `web-world.mjs` passed against the public URL, including no automatic images, save-only recovery, bounded AI stories, discovery order, backup/import and stale reset protection. No page errors. Twelve live source files match the build after newline normalization; actual version is 0.6.0. Orca's existing web save hash is unchanged after reload.
- Installed Anna read-only proof: Connected, app.js/home.mjs/home.css/home-scene.mjs match the previously deployed hashes, cloud 0.9.3 loaded/running, working draft dirty_vs_latest_cut=false, description and six screenshots match. PC remains offline/unverified. No installed Anna or listing mutation.
- Updated web README, local AI guide, release notes and isolated desktop/mobile/dungeon screenshots. Remaining platform differences: web imports finished portraits; Anna's reference analysis/AI birth is not ported. Chat/care messages remain tab-local. Actual paid-provider image quality was not retested. Details: `web/RELEASE_060.md`.

---

# 1.4.10 review candidate, description and screenshots - 2026-10-18

The user explicitly requested the latest review candidate with updated description and screenshots. Review is now **1.4.10 / ID 1442 / pending_review**, frozen **tool 0.9.3 / Executa 772 / master ID 1193**. Working revision **79**, unchanged executable bundle, owner installed draft **0.0.0-draft**. Listing/capture source **d1d1237**, UI source **c96d7a2**, test-fixture correction **507e59c**. No public release or web deployment.

- Updated tagline and description for the empty initial yard, 48 objects/36 garden items, Shop/My collection tabs, stored-item count, desktop split view/mobile stacked browsing and secondary controls. Kept exact AI-use boundaries and removed obsolete change-history copy.
- Recaptured ten real UI screenshots from isolated engine views and recorded Mori artwork; published six: care, empty starting yard, redesigned garden shop, drawing editor, dungeon preview, item book. Collection capture retained in Git. All six uploaded CDN images decode at 1280 pixels wide and description/tagline/listing fields exactly match source. No new paid AI, live owner screenshots or production mutations.
- Runtime bundle was already verified in successful Windows/Linux CI **39086263232**: JS **92**, full browser **118**, storage/protocol **70**, strict and executable build/smoke checks; core CI **39086263306** succeeded. Current capture flow and strict validation passed. Later metadata/capture-only CI **39088482080 / 39088482096** is running at record time; no runtime code changed.
- Actual installed app is Connected with no notice; app.js, home.mjs, home.css and home-scene.mjs hashes match source. Cloud **0.9.3 loaded/running**; art/chat/story/personality KV and game inspection unchanged. Working draft dirty_vs_latest_cut=false. PC remains offline/unverified; previously tested Windows package is retained.
- Bundle **1339**, **170 files / 171308544 bytes**, SHA-256 manifest **4a5154cee5b69fabe1c36f3bb1b47d4ed90ff79675c61d40979b9d64f3b0ea5f**. No redundant tool publish or version bump. Next review change still requires fresh user authorization.
