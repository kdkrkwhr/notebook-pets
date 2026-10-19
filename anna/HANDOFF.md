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
| 공개 웹 | **0.7.1 / 6b0b24a**, Pages CI **39184697747** 성공 · 공개 주소 검증 완료 |
| Limits | Owner scope: one device per account; fresh AI quality / physical PC runner not tested |

2026-10-19 사용자가 제공한 Dora의 심사 승인 안내와 공개 스토어 URL을 확인했다. 비로그인 HTTP 조회에서 **200**, 앱 **Notebuddy / @kdkrkwhr/notebuddy**, 공개 버전 **1.4.13**을 확인했다. 전투 캐릭터의 완성도와 초상화 스타일 일관성은 후속 개선 의견이며 출시 차단 사유가 아니다. 이번 변경은 README·배포 기록 안내만 갱신하며, 앱 업로드·심사본 교체·추가 공개 작업은 하지 않았다. 위 소유자 테스트 앱·게임 도구의 실행 검증은 2026-10-18 기록을 유지한다.

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# Web 0.7.1 — 진행 안내·홈 복구·앨범 통합 — 2026-10-19

사용자 요청에 따라 웹에 적용 가능한 Anna `cba0513` 변경을 merge `94c72c5`로 가져왔습니다. Anna **1.4.13 / working revision 89 / review ID 1446 / tool 0.9.5**는 유지합니다. 이번 작업에서는 Anna 업로드·설치·cut·심사 제출을 하지 않습니다.

- 공유 진행 안내를 웹 빌드에 포함하고 홈 생성 단계, 채팅·돌봄·산책·진화·배치·그림 저장에 연결했습니다. 경과 시간은 안내만 제공하며 자동 AI 재요청은 없습니다. Gemini/Ollama/ComfyUI와 웹 참고 이미지 입력을 유지합니다.
- 홈 진입 시 저장된 외형을 새로 읽고 실제 이미지 해독 성공 여부로 누락 안내를 표시합니다. 메인/도감 앨범의 패딩·프레임·contain 표시를 통일했습니다. 저장 스키마·Python 규칙·보상에는 변경이 없습니다.
- 로컬 Edge에서 웹 기본·월드·현재 기능·진화·로컬 AI·7개 테마 검증과 제공자 단위 6건 통과. 생성 지연 31초 안내·360px 화면·중복 호출 없음·저장 실패 후 AI 없는 재시도·홈 이미지 실패 후 재진입·대화 오류 후 안내 정리·360/620/1280px 양쪽 앨범을 추가 검증했습니다. IndexedDB 보존·백업·초기화 경쟁 상태도 통과했고 페이지 오류는 없습니다. 모든 AI는 모의 응답이며 유료 사용은 없습니다.
- 배포 완료: 런타임 **6b0b24a / 0.7.1**, [Pages 39184697747](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39184697747)와 [공통 CI 39184697850](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39184697850) 성공. 공개 주소에서 별도 공책으로 월드·현재 기능 시나리오를 다시 통과했고 주요 JS/CSS 14개가 검증 빌드와 일치합니다(BOM/줄바꿈 정규화). 공개 검증에서도 페이지 오류·실제 유료 AI 호출은 없습니다. Anna API의 전체 앱 정보·초안·전체 버전 목록은 배포 전후 동일하여 심사본·소개 자료·working revision이 유지됨을 확인했습니다. 기존 사용자 저장은 열거나 변경하지 않았습니다.

---

# Anna growth-album image containment — 2026-10-18

CSS-only source **1f2e312**, owner draft **1.4.13 / working revision 89 / installed 0.0.0-draft**, actual cloud tool **0.9.5 / Executa 774 / master 1193 loaded/running**. Review **1.4.13 / ID 1446** and shared listing must remain unchanged; public web excluded.

- Measured the owner's four saved album portraits: each 90px image exceeded the bordered 92px frame's inner height by approximately **0.83px at both top and bottom** at the current display scale. Original portrait files and album records are unchanged.
- Add 4px inner padding, contain images within the frame's content box and clip overflow at the rounded frame boundary. Keep `object-fit: contain`, so images scale without cropping. Use shrinkable album grid columns/items. Applies to both the main growth album and collection album.
- Verified **21 layouts / 168 images** across seven themes and widths **360 / 620 / 1120**, with no boundary or horizontal overflow. Existing theme browser **3/3** and strict validation passed. No new permanent test or paid AI call. Private screenshots and measurements: `.local/album-layout/`. Installed `ui-polish.css` hash matches source; all four owner portraits are loaded and fully inside their 4px padded frames. UI is Connected with no notice. Game ETag and artwork/chat/story/personality values/ETags, frozen review row **1446** and shared listing remain unchanged. No tool or app version bump. Working bundle **172 files / 171338211 bytes**, content hash **c8dabd5ba1fdc2fcfd4b162965c633302b6e3083a0aa9cf5d0822b8105ec9cdc**. No additional AI calls.

---
