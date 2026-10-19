# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-19)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.13 / working revision 89 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.13 / ID 1446 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.5 / Executa 774**, 실제 클라우드 loaded/running |
| 검증 | Python 230 · JS 92 · 브라우저 130 · 저장/프로토콜 73 · 격리 APS 시나리오 14 |
| 공개 웹 | **0.7.0 / ee6a4b5** 서비스 중 · **0.7.1** 검증 완료, 배포 대기 |
| Limits | Owner scope: one device per account; fresh AI quality / physical PC runner not tested |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Web 0.7.1 — 진행 안내·홈 복구·앨범 통합 — 2026-10-19

사용자 요청에 따라 웹에 적용 가능한 Anna `cba0513` 변경을 merge `94c72c5`로 가져왔습니다. Anna **1.4.13 / working revision 89 / review ID 1446 / tool 0.9.5**는 유지합니다. 이번 작업에서는 Anna 업로드·설치·cut·심사 제출을 하지 않습니다.

- 공유 진행 안내를 웹 빌드에 포함하고 홈 생성 단계, 채팅·돌봄·산책·진화·배치·그림 저장에 연결했습니다. 경과 시간은 안내만 제공하며 자동 AI 재요청은 없습니다. Gemini/Ollama/ComfyUI와 웹 참고 이미지 입력을 유지합니다.
- 홈 진입 시 저장된 외형을 새로 읽고 실제 이미지 해독 성공 여부로 누락 안내를 표시합니다. 메인/도감 앨범의 패딩·프레임·contain 표시를 통일했습니다. 저장 스키마·Python 규칙·보상에는 변경이 없습니다.
- 로컬 Edge에서 웹 기본·월드·현재 기능·진화·로컬 AI·7개 테마 검증과 제공자 단위 6건 통과. 생성 지연 31초 안내·360px 화면·중복 호출 없음·저장 실패 후 AI 없는 재시도·홈 이미지 실패 후 재진입·대화 오류 후 안내 정리·360/620/1280px 양쪽 앨범을 추가 검증했습니다. IndexedDB 보존·백업·초기화 경쟁 상태도 통과했고 페이지 오류는 없습니다. 모든 AI는 모의 응답이며 유료 사용은 없습니다.
- 배포 대기: GitHub Pages CI와 공개 주소의 실제 새 번들 검증 결과를 완료 후 기록합니다. Anna API의 앱·초안·전체 버전 목록을 배포 전 읽기 전용으로 보관했습니다.

---

# Anna growth-album image containment — 2026-10-18

CSS-only source **1f2e312**, owner draft **1.4.13 / working revision 89 / installed 0.0.0-draft**, actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Review **1.4.13 / ID 1446** and shared listing must remain unchanged; public web excluded.

- Measured the owner's four saved album portraits: each 90px image exceeded the bordered 92px frame's inner height by approximately **0.83px at both top and bottom** at the current display scale. Original portrait files and album records are unchanged.
- Add 4px inner padding, contain images within the frame's content box and clip overflow at the rounded frame boundary. Keep `object-fit: contain`, so images scale without cropping. Use shrinkable album grid columns/items. Applies to both the main growth album and collection album.
- Verified **21 layouts / 168 images** across seven themes and widths **360 / 620 / 1120**, with no boundary or horizontal overflow. Existing theme browser **3/3** and strict validation passed. No new permanent test or paid AI call. Private screenshots and measurements: `.local/album-layout/`. Installed `ui-polish.css` hash matches source; all four owner portraits are loaded and fully inside their 4px padded frames. UI is Connected with no notice. Game ETag and artwork/chat/story/personality values/ETags, frozen review row **1446** and shared listing remain unchanged. No tool or app version bump. Working bundle **172 files / 171338211 bytes**, content hash **c8dabd5ba1fdc2fcfd4b162965c633302b6e3083a0aa9cf5d0822b8105ec9cdc**. No additional AI calls.

---
