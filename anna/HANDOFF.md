# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.11 / working revision 80 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.10 / ID 1442 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.4 / Executa 773**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 92 · 저장/프로토콜 71 · 브라우저 및 공개 웹 재검증 |
| 공개 웹 | **0.7.0 / 6e208cd**, Pages CI **39104707533** 성공 |
| Limits | Paid-provider likeness not tested; physical PC runner not verified |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Anna 1.4.11 / Web 0.7.0 manual evolution and observed-feature portraits - 2026-10-18

Anna source **c3bd9ef** (core/package source **95a0874**), owner test app **1.4.11 / working revision 80 / installed 0.0.0-draft**. Actual cloud tool **0.9.4 / Executa version 773 / master ID 1193 loaded/running**. Shared changes merged through Git into `release-web`; web source **6e208cd**, live **0.7.0** at https://kdkrkwhr.github.io/notebook-pets/. Review **1.4.10 / ID 1442 / pending_review**, description, six screenshots and other listing fields are unchanged. No app cut, review submission or paid AI requests.

- Manual progression: Lv.10 + care 10 + walks 3; Lv.30 + care 30 + training 10 + walks 15; Lv.50 + care 60 + training 25 + walks 30 + three completed story arcs. Care is feed/snack/play/sleep. Counts are lifetime totals. Levels keep increasing while evolution is deferred. Existing stages and identity are preserved by schema-5 migration, with no invented history or read-only persistence.
- One text/vision call observes the current portrait and proposes three personalized paths from care, adventures, recent direct chats and a previous evolution summary. Keep-element path plus two allowed elemental alternatives; the core validates route IDs, eligibility and one-step progression. No AI stat/reward grants. Options persist across reopening and failed AI uses deterministic care-based paths.
- One selected portrait uses text-to-image with extracted features and the chosen appearance. No image-edit/reference-image transport in evolution. Optional portrait toggle; failures preserve the evolution and previous portrait. Received images support save-only recovery. Observations are tied to the exact saved source; replacing artwork cannot reuse stale analysis. Rules-only evolution carries an existing home choice forward; new artwork still waits for the explicit first-home appearance choice.
- Direct chat storage is bounded to 64 messages / 40 KB UTF-8; screen shows 24, evolution reads at most 24 recent direct user messages and a 600-character prior summary. Web saves chat in IndexedDB and includes it in backup/import. Gemini and vision-capable Ollama observe images; Gemini/ComfyUI generate evolution portraits without image inputs. ComfyUI needs a text-only workflow with no connected LoadImage; home sheets retain their reference workflow.
- Validation: shared Python **230 tests, one skipped**; JS **92**; storage/protocol **71**; full browser **121** before the final source-identity guard, then focused evolution **4** including that guard. Initial Windows/Linux CI **39104044964** succeeded and supplied the exact deployed binaries; shared CI **39104044958** succeeded. Follow-up source CI **39104708916** succeeded; final Anna CI **39104708910** also succeeded on Windows/Linux, including all **122** browser cases, **71** storage/protocol tests and executable smoke checks. All web core/persistence, world/backup/recovery, current home/care/story, seven themes, six local-AI unit checks and evolution integration passed. Pages **39104707533** build/deploy and shared CI **39104707558** succeeded. Public-URL evolution test passed in a fresh isolated browser with mocked Gemini/Ollama/ComfyUI: two stages, one vision and one image/job per stage, no automatic home image, chat restored and backup valid.
- Deployment required explicit `executa publish --profile binary`: app push updated registry metadata but retained old binary URLs. Published both tested archives, restored exact protocol `manifest_cache` storage declaration after platform normalization, and reinstalled the cloud runner. Both CDN archive hashes match the CI artifacts. Installed app.js/evolution.mjs/model.mjs/pixel-pet.mjs/home-sprite.mjs/ui-polish.css hashes match source. Actual UI Connected, no notice, evolution dialog and core prerequisites verified without game mutations. Game inspection ETag and art/chat/story/personality values/ETags are unchanged. Existing Orca web save hash is unchanged after loading 0.7.0.
- Working bundle **171 files / 171330699 bytes**, content hash **c29124eaed8ed193f818cb9375c23e9603fd2252cbdb0ddbae4c9c84960234c7**. Executa content hash **539a7c1a4c9623e5a56484bc8b47f98822d3f9ef56f234042a4d7ae47f748216**. Windows package **9520632 bytes**, Linux **18901216 bytes**.
- Limits: actual paid-provider portrait likeness was not retested; prompts preserve anatomy but generative output can vary. PC agent has no loaded/running tool, so physical Windows-host execution remains unverified; the Windows CI binary was tested and uploaded. Web imports finished birth portraits; Anna-style AI birth remains a separate platform feature.

---

# Web 0.6.0 shared home, garden and care integration - 2026-10-18

The user requested all current changes on the web. Merged Anna release **3fec4e9** into `release-web` through Git (**bab2f73**), then shipped web adapter **25eede1** as **0.6.0** to https://kdkrkwhr.github.io/notebook-pets/. Anna test app **1.4.10 / working revision 79 / owner 0.0.0-draft**, tool **0.9.3 / Executa 772**, and review **1.4.10 / ID 1442 / pending_review** remain unchanged. No Anna publish, review update or paid AI calls.

- Empty initial yard, indoor 12 / garden 36 objects, Shop / My collection, storage count, desktop split / mobile stacked home, secondary controls and hover/touch help. First-home explicit image-or-free-default choice replaces automatic birth/portrait image generation. Gemini and ComfyUI retain browser-local reference-image transport through a shared generator hook; Anna keeps its existing default transport.
- Added the care AI toggle, optional reactions, saved shared walk stories and delayed dungeon discovery cards. OFF preserves game actions/rewards and authored stories; direct chat remains explicit AI. The core owns choices and rewards. IndexedDB/backup now preserve the latest story; invalid story backups are rejected. Existing epoch/CAS and late-response guards remain.
- Local shared JS **92**, web core/persistence/reset, world/image/recovery/backup, local AI **6** plus browser, current home/care/story integration, and all **7** themes passed. Pages **39090052557** build/deploy and common CI **39090052561** (Windows/Linux regressions, stdio and Pyodide) succeeded. Live `web-current.mjs` and `web-world.mjs` passed against the public URL, including no automatic images, save-only recovery, bounded AI stories, discovery order, backup/import and stale reset protection. No page errors. Twelve live source files match the build after newline normalization; actual version is 0.6.0. Orca's existing web save hash is unchanged after reload.
- Installed Anna read-only proof: Connected, app.js/home.mjs/home.css/home-scene.mjs match the previously deployed hashes, cloud 0.9.3 loaded/running, working draft dirty_vs_latest_cut=false, description and six screenshots match. PC remains offline/unverified. No installed Anna or listing mutation.
- Updated web README, local AI guide, release notes and isolated desktop/mobile/dungeon screenshots. Remaining platform differences: web imports finished portraits; Anna's reference analysis/AI birth is not ported. Chat/care messages remain tab-local. Actual paid-provider image quality was not retested. Details: `web/RELEASE_060.md`.
