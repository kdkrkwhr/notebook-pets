# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-19)

| 항목 | 값 |
| --- | --- |
| Anna 공개 앱 | **1.4.13**, [스토어에서 다운로드](https://anna.partners/store/@kdkrkwhr/notebuddy) |
| Anna 테스트 앱 | **1.4.14 / working revision 90 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.14 / ID 1478 / pending**; 공개 1.4.13 유지 |
| 게임 도구 | **0.9.6 / Executa 786**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 96 · 브라우저 131 · 저장/프로토콜 76 · 실제 설치 5개 언어 |
| 공개 웹 | **0.7.0 / ee6a4b5**, Pages CI **39106404258** 성공 |
| Limits | Owner scope: one device per account; fresh AI quality / physical PC runner not tested |

공개 1.4.13을 유지하면서 1.4.14를 버전별 업데이트 심사에 접수했다. 앱 전체 상태는 `published`, 새 버전의 `release_review_state`는 `pending`, `is_latest`는 `false`다. 최초 등록용 `submit-review`와 다른 절차이며, 현재 설치·실행 검증은 2026-10-19 기준이다. 전투 캐릭터의 완성도와 초상화 스타일 일관성은 별도 후속 개선 의견이다.

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Anna 1.4.14 multilingual update — 2026-10-19

Owner-authorized app **1.4.14 / working revision 90 / installed 0.0.0-draft**, actual cloud tool **0.9.6 / Executa 786 / master 1193 loaded/running**. Review **1.4.14 / ID 1478 / pending**; public **1.4.13** retained. Per-version release review is pending while the app lifecycle remains published; no immediate public promotion or web deployment.

- Added **Japanese / Simplified Chinese / Traditional Chinese** across static UI, furniture/items, fallback stories and selected-language AI output prompts. Old names, chats, portraits and prose remain original; optional new personality text and evolution prose support all five locale codes. No automatic translation/AI on language changes. Includes album containment and truthful 64-message/40-KB retention copy.
- Final source **f3f655b**, CI **39247474069** passed both OSes: **131 browser / 96 JS / 76 storage-protocol**, strict validation and executable build/smoke. Shared CI **39247474128** passed. Earlier Windows cold page-load timeouts were addressed in the test harness; focused **11** checks also passed. Both tested platform archives were published together.
- Used exactly **six authorized text calls / zero images**, public copy only, no paid retries. Raw results saved before local JSON framing repair. Traditional Chinese converted offline; glossary corrected, including the calm mood meaning of Content. **1,064** static entries. Native-speaker editorial review and physical PC execution remain unperformed.
- Installed source hashes match; actual five-language UI/tool reads passed. Game ETag and art/chat/story/personality values/ETags are unchanged. Shared listing and all six screenshots retained; public release is separate from this review submission.
- Bundle **1374 / 174 files / 171598743 bytes**, manifest SHA-256 **f5c1811787c3a0bab742f7ae20d2f499a8e50fc7dc287c1d0dbb13ef5e12109f**; working hash **f6bf2d50a2f5787d4e079fd576bd1e23fe2eecd71acde485c43c8cace493570a**, **dirty_vs_latest_cut false**, exact/minimum tool **0.9.6**. Details: **releases/RELEASE_1414.md**, **reviews/REVIEW_1414.md**, **locales/README.md**.

---

# Anna growth-album image containment — 2026-10-18

CSS-only source **1f2e312**, owner draft **1.4.13 / working revision 89 / installed 0.0.0-draft**, actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Review **1.4.13 / ID 1446** and shared listing must remain unchanged; public web excluded.

- Measured the owner's four saved album portraits: each 90px image exceeded the bordered 92px frame's inner height by approximately **0.83px at both top and bottom** at the current display scale. Original portrait files and album records are unchanged.
- Add 4px inner padding, contain images within the frame's content box and clip overflow at the rounded frame boundary. Keep `object-fit: contain`, so images scale without cropping. Use shrinkable album grid columns/items. Applies to both the main growth album and collection album.
- Verified **21 layouts / 168 images** across seven themes and widths **360 / 620 / 1120**, with no boundary or horizontal overflow. Existing theme browser **3/3** and strict validation passed. No new permanent test or paid AI call. Private screenshots and measurements: `.local/album-layout/`. Installed `ui-polish.css` hash matches source; all four owner portraits are loaded and fully inside their 4px padded frames. UI is Connected with no notice. Game ETag and artwork/chat/story/personality values/ETags, frozen review row **1446** and shared listing remain unchanged. No tool or app version bump. Working bundle **172 files / 171338211 bytes**, content hash **c8dabd5ba1fdc2fcfd4b162965c633302b6e3083a0aa9cf5d0822b8105ec9cdc**. No additional AI calls.

---
