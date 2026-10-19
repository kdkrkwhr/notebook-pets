# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-19)

| 항목 | 값 |
| --- | --- |
| Anna 공개 앱 | **1.4.13**, [스토어에서 다운로드](https://anna.partners/store/@kdkrkwhr/notebuddy) |
| Anna 테스트 앱 | **1.4.13 / working revision 89 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.13 승인·스토어 공개** (2026-10-19). 제출 ID **1446**; 후속 심사본 교체는 새 명시 요청 필요 |
| 게임 도구 | **0.9.5 / Executa 774**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 92 · 브라우저 130 · 저장/프로토콜 73 · 격리 APS 시나리오 14 |
| 공개 웹 | **0.7.0 / ee6a4b5**, Pages CI **39106404258** 성공 |
| Limits | Owner scope: one device per account; fresh AI quality / physical PC runner not tested |

2026-10-19 사용자가 제공한 Dora의 심사 승인 안내와 공개 스토어 URL을 확인했다. 비로그인 HTTP 조회에서 **200**, 앱 **Notebuddy / @kdkrkwhr/notebuddy**, 공개 버전 **1.4.13**을 확인했다. 전투 캐릭터의 완성도와 초상화 스타일 일관성은 후속 개선 의견이며 출시 차단 사유가 아니다. 이번 변경은 README·배포 기록 안내만 갱신하며, 앱 업로드·심사본 교체·추가 공개 작업은 하지 않았다. 위 소유자 테스트 앱·게임 도구의 실행 검증은 2026-10-18 기록을 유지한다.

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Anna growth-album image containment — 2026-10-18

CSS-only source **1f2e312**, owner draft **1.4.13 / working revision 89 / installed 0.0.0-draft**, actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Review **1.4.13 / ID 1446** and shared listing must remain unchanged; public web excluded.

- Measured the owner's four saved album portraits: each 90px image exceeded the bordered 92px frame's inner height by approximately **0.83px at both top and bottom** at the current display scale. Original portrait files and album records are unchanged.
- Add 4px inner padding, contain images within the frame's content box and clip overflow at the rounded frame boundary. Keep `object-fit: contain`, so images scale without cropping. Use shrinkable album grid columns/items. Applies to both the main growth album and collection album.
- Verified **21 layouts / 168 images** across seven themes and widths **360 / 620 / 1120**, with no boundary or horizontal overflow. Existing theme browser **3/3** and strict validation passed. No new permanent test or paid AI call. Private screenshots and measurements: `.local/album-layout/`. Installed `ui-polish.css` hash matches source; all four owner portraits are loaded and fully inside their 4px padded frames. UI is Connected with no notice. Game ETag and artwork/chat/story/personality values/ETags, frozen review row **1446** and shared listing remain unchanged. No tool or app version bump. Working bundle **172 files / 171338211 bytes**, content hash **c8dabd5ba1fdc2fcfd4b162965c633302b6e3083a0aa9cf5d0822b8105ec9cdc**. No additional AI calls.

---

# Anna 1.4.13 review refresh — 2026-10-18

Fresh owner instruction authorizes this replacement. Candidate **1.4.13 / immutable ID 1446 / pending_review** replaces **1.4.12 / 1445**. Owner test app **1.4.13 / working revision 88 / installed 0.0.0-draft**. Tool remains **0.9.5 / frozen Executa 774 / master 1193 loaded/running**. No public release or web deployment.

- Includes the tested **76449c3** home image-link fix: renew the saved appearance URL on entry and use actual decoded renderer state for missing-image guidance. No runtime-code changes during review packaging **246781d**; app/package version metadata changes only. Changelog explains the long-session failure, recovery, retained images and zero AI regeneration.
- Runtime CI **39116562365** passed Windows and Linux (**130 browser / 92 JS / 73 storage-protocol**, strict validation, standalone build/smoke); shared CI **39116562380** passed. Release packaging passed strict validation and JS **92** again. Existing personal directional sheet displays in the actual installed home; all three changed runtime source hashes match. Additional paid AI calls: **0**.
- Cut froze bundle **1343 / 172 files / 171337956 bytes**, manifest SHA-256 **1419a6f232f68be462dc7aa0b782f9c7ab2c0cbae375c751f9f3d6988b4a1ddf**. Working content hash **6858a171240677535ee2e6a0c21ada8fe46a667af6c8390034f46522ecc36098**. Fresh platform read confirms candidate **1446**, revision **88**, **dirty_vs_latest_cut false**, correct minimum/exact tool 0.9.5 dependency, Connected UI and no notice.
- Existing shared listing is unchanged and all six screenshots decode. Owner game ETag and art/chat/story/personality values/ETags remain unchanged. Approval, publication, fresh provider-quality testing and physical-PC execution are not claimed. Future review replacement requires another explicit request. See **releases/RELEASE_1413.md** and **reviews/REVIEW_1413.md**.

---
