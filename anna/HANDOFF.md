# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.11 / working revision 81 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.11 / ID 1443 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.4 / Executa 773**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 92 · 저장/프로토콜 71 · 브라우저 및 공개 웹 재검증 |
| 공개 웹 | **0.7.0 / ee6a4b5**, Pages CI **39106404258** 성공 |
| Limits | Paid-provider likeness not tested; physical PC runner not verified |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# 1.4.11 evolution label, review introduction and owner screenshots - 2026-10-18

At the owner's fresh explicit request, review is now **1.4.11 / ID 1443 / pending_review**, replacing 1.4.10 / 1442. Owner test app **1.4.11 / working revision 81 / installed 0.0.0-draft**; frozen and running cloud game tool **0.9.4 / Executa version 773 / master 1193**. UI source **e0844c2**, listing/docs **b313d7b**, shared web source **ee6a4b5**, web **0.7.0**. No public Anna release or paid AI calls.

- Shortened the evolution entry to **진화 / Evolve** in both prerequisite states. No evolution-rule or tool-binary changes; no version bump for the copy adjustment.
- The user supplied actual Korean and English evolution screenshots, then selected English for review. Added the English capture at listing position 2; retained care, empty garden, garden shop, drawing and dungeon, replacing the item-book slot within Anna's six-image limit. Both supplied PNGs are preserved unedited in Git. The English shot shows built-in English route descriptions, while the Korean shot shows saved personalized prose. Other listing images retain their isolated-demo provenance.
- Updated store tagline/description and Korean/English READMEs for level/activity requirements, three choices informed by care/adventures/chat, element and appearance changes, one vision/text suggestion request and an optional single text-to-image portrait. Documented free picture-preserving evolution and save-only recovery; no claim that Anna's image-edit service was fixed.
- Strict validation and four focused evolution browser tests passed. Windows/Linux Anna CI **39106067679** and shared CI **39106067743** passed. Installed evolution source hash and visible Evolve label match; cloud 0.9.4 loaded/running. All listing text fields match local metadata and all six CDN images decode, including the 1100 x 784 English evolution shot.
- First UI push was rejected for platform-normalized tool storage declaration drift. Restored the exact already-tested 0.9.4 manifest and pushed successfully, without publishing new tool binaries. Working content hash **5b9cc7c245df26ba29a01239215c44be4f14196b1857985f892b71e089303d50**. Cut bundle **1340 / 171 files / 171330654 bytes**, manifest hash **38edb72fa2d36dc79b2a2555b70ed450f46841260f5e3324ad2fa91e7ef26560**. Fresh platform reads confirmed candidate 1.4.11 and pending_review after submission.
- Shared code/docs merged through Git into release-web. Pages **39106404258** and shared CI **39106404298** passed. Public-site evolution passed in an isolated browser with mocked providers: two stages, one vision and one text-only portrait/job per stage, no home images, chat restored, valid backup. Both live button labels verified and the existing Orca web save hash stayed unchanged.
- Limits: actual paid-provider image quality was not retested; physical PC runner remains unverified. Future review updates still require a fresh explicit request. Evidence: releases/RELEASE_1411.md and reviews/REVIEW_1411.md.

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
