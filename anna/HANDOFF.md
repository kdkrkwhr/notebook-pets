# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-18)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.11 / working revision 82 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.11 / ID 1443 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.5 / Executa 774**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 92 · 브라우저 122 · 저장/프로토콜 73 · 격리 APS 시나리오 14 |
| 공개 웹 | **0.7.0 / ee6a4b5**, Pages CI **39106404258** 성공 |
| Limits | Simultaneous first creation remains unsafe; fresh AI quality / physical PC runner not tested |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Anna 1.4.11 stability verification and tool 0.9.5 — 2026-10-18

Owner requested stability scenarios 1–3, excluding web and any unrequested review replacement. Code **e46f542 / f2f79ee**; owner test app **1.4.11 / working revision 82 / installed 0.0.0-draft**. Actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Review remains **1.4.11 / ID 1443 / pending_review**, frozen tool **0.9.4 / 773**; the full frozen row and listing are unchanged. No public release or web change.

- Fourteen controlled live-APS scenarios passed in a fresh isolated app, using two independent tool processes: click bursts, pre-send disconnect, lost commit acknowledgement, close/reopen, simultaneous care/attendance/purchase, real ETag merge conflict, interrupted portrait/home saves and simultaneous different evolution choices. No duplicate charge/reward or extra stage advance. Previously paid images replayed locally four times; **zero provider calls and zero unexpected AI attempts**.
- Found a real wrapped APS conflict (`-32603` with `storage.set HTTP 412` / structured `precondition_failed`) that was misreported as a generic save failure. Shared recognizer now handles this exact envelope in game/privacy/reset while unrelated failures retain their errors. Losing actions reload the winner and return stale-request guidance without new sequence IDs. Added regression tests and required tool 0.9.5 in the app manifest.
- Windows/Linux CI **39110144833** passed: JS **92**, browser **122**, storage/protocol **73**, strict validation, both standalone builds and executable smoke checks. Shared CI **39110144817** passed all jobs. Initial CI caught the stale app minimum-tool declaration before deployment; corrected and used only the successful artifacts.
- Explicitly published both OS packages, restored exact protocol manifest storage after normalization, pushed and installed the working draft, and reinstalled the cloud runner. Reopened owner UI is Connected with no notice; six installed UI hashes match. Registry hashes match CI artifacts. Direct CDN byte re-download was blocked by HTTP 403; actual running 0.9.5 and read-only RPC were verified. Working hash **f42216aff79421d50dca702cdc330e8fdeb6c7e287ab7fd695a43c02ec85814d**.
- Owner game ETag and art/chat/story/personality values/ETags stayed unchanged. Test servers stopped; disposable fixtures and private evidence retained under `.local/stability-audit/`. Known first-ever simultaneous creation race remains reproducible offline because supported APS lacks atomic create-if-absent; this task did not claim to fix it. Physical PC execution and fresh AI quality were not tested. Development host logged a ResizeObserver warning during reopening without observed data/action failure. Full record: **docs/STABILITY_20261018.md**.

---

# Anna 1.4.11 bounded portrait/home verification and review check - 2026-10-18

The user reported evolution verification complete, authorized one fresh image-to-home check with **image <=2 / text+vision <=2**, and excluded web work. Actual usage: **two image.generate calls and two text/vision calls**, with no paid retries or image-edit/reference-image transport. Runtime remains **Anna 1.4.11 / working revision 81 / tool 0.9.4 / Executa 773**; review remains **1.4.11 / ID 1443 / pending_review**, review_message null. No runtime, listing, review-candidate or web deployment change.

- Used a fresh isolated dev app/tool with the actual release UI modules (six hashes match), actual Anna AI and APS. One recorded sprout PNG exercised the file-input flow. Gemini reference analysis and personality each succeeded; GPT Image 2 returned and stored one 1024px birth portrait and one 1024px directional sheet. Raw responses/images retained privately before parsing.
- Birth completed without an automatic home image. Free default persisted and displayed after home reopening with no AI. An isolated pre-choice snapshot fork then exercised the explicit generation path: 16 frames, four correct directions, matching current portrait, successful save and visible home character. Full page reload/read-only refresh restored the generated appearance without the choice dialog or extra AI calls. Eleven focused free browser cases also passed.
- Test infrastructure needed recovery: the CLI storage bridge omitted the app scope, a diagnostic session replaced the open harness session, and R2 refused the non-whitelisted 127.0.0.1 origin. Scoped the isolated adapter to app storage, reused the paid analysis, performed same-action/save-only recovery, confirmed an actual Anna-origin source upload HTTP 200, and resumed from the stored reference at allowed localhost:5180. These were harness/environment issues; no new product code fix was needed. This was not an uninterrupted first-attempt creation.
- Production game inspection ETag and art/chat/story/personality values/ETags are unchanged. Candidate/listing unchanged, dirty_vs_latest_cut false. Platform status has no new review message. No Discord connector is available, so a new dora reply or external retest result cannot be confirmed.
- Scope: real generation of one simple drawn reference, not all photo inputs/complex anatomies. Physical Windows runner remains unverified. User evolution verification was recorded without repeating paid evolution tests. Details: docs/PAID_TEST_20261018.md. Only verification documentation is committed; the app and public web remain unchanged.
