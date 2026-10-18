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
| Limits | One drawn reference verified; complex anatomy / physical PC runner not covered |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Anna 1.4.11 bounded portrait/home verification and review check - 2026-10-18

The user reported evolution verification complete, authorized one fresh image-to-home check with **image <=2 / text+vision <=2**, and excluded web work. Actual usage: **two image.generate calls and two text/vision calls**, with no paid retries or image-edit/reference-image transport. Runtime remains **Anna 1.4.11 / working revision 81 / tool 0.9.4 / Executa 773**; review remains **1.4.11 / ID 1443 / pending_review**, review_message null. No runtime, listing, review-candidate or web deployment change.

- Used a fresh isolated dev app/tool with the actual release UI modules (six hashes match), actual Anna AI and APS. One recorded sprout PNG exercised the file-input flow. Gemini reference analysis and personality each succeeded; GPT Image 2 returned and stored one 1024px birth portrait and one 1024px directional sheet. Raw responses/images retained privately before parsing.
- Birth completed without an automatic home image. Free default persisted and displayed after home reopening with no AI. An isolated pre-choice snapshot fork then exercised the explicit generation path: 16 frames, four correct directions, matching current portrait, successful save and visible home character. Full page reload/read-only refresh restored the generated appearance without the choice dialog or extra AI calls. Eleven focused free browser cases also passed.
- Test infrastructure needed recovery: the CLI storage bridge omitted the app scope, a diagnostic session replaced the open harness session, and R2 refused the non-whitelisted 127.0.0.1 origin. Scoped the isolated adapter to app storage, reused the paid analysis, performed same-action/save-only recovery, confirmed an actual Anna-origin source upload HTTP 200, and resumed from the stored reference at allowed localhost:5180. These were harness/environment issues; no new product code fix was needed. This was not an uninterrupted first-attempt creation.
- Production game inspection ETag and art/chat/story/personality values/ETags are unchanged. Candidate/listing unchanged, dirty_vs_latest_cut false. Platform status has no new review message. No Discord connector is available, so a new dora reply or external retest result cannot be confirmed.
- Scope: real generation of one simple drawn reference, not all photo inputs/complex anatomies. Physical Windows runner remains unverified. User evolution verification was recorded without repeating paid evolution tests. Details: docs/PAID_TEST_20261018.md. Only verification documentation is committed; the app and public web remain unchanged.

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
