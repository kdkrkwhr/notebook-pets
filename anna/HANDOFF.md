# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 인계 이력](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-17 기준)

| 항목 | 값 |
| --- | --- |
| Anna 앱 | **1.4.7 / ID 1427 / 소유자 초안 `0.0.0-draft` / working revision 66**, 설치·실제 번들 연결 검증 |
| 최신 수정 | 제한 유료 테스트, 삭제 표시 시 유료 기능 차단·Windows 개발 브리지 UTF-8 수정 |
| 게임 도구 | **0.9.1 / Executa version 760**, 변경 없음, 클라우드 실행 확인, PC 오프라인 |
| 스토어 | **1.4.7 / ID 1427 / pending_review**, 직전 유료 검사 후 수정까지 후보에 반영, 소개·스크린샷 유지 |
| 검증 | 재검사 JS 91 · 브라우저 107 · Python 223(MCP 포함) · 도구 70 · strict/Pyodide, 추가 유료 0회 |
| 공개 웹 | **0.5.0**, Pages 배포와 실제 URL의 공통 모듈·1120/360px·저장 검증 완료 |
| 제한 | 직전 실제 초상화·성격·대화·반응·분석 확인. 실제 이동 시트는 기존 이미지 한도 소진으로 미검증 |

최신 작업 2건만 유지한다. 이전 1.4.6 심사 교체 기록은 내용 수정 없이 이력 맨 위로 옮겼다.

---

# 1.4.7 · 유료 검사 후 수정의 심사 반영·재검사 · 2026-10-17

사용자가 직전 수정도 심사에 반영하고 다시 검사하도록 요청했다. **1.4.7 / ID 1427 / working revision 66**을 cut한 뒤 **심사 후보 1.4.6 → 1.4.7 / pending_review**로 교체했다. 서버 재조회로 후보 ID/버전과 `dirty_vs_latest_cut=false`를 확인했다. 공개 Anna 출시는 하지 않았다.

- 아트/대화 삭제 표시 시 유료 조작 차단과 Windows 개발 브리지 UTF-8 수정이 포함됐다. UI 코드는 검증된 **`d7c5d176a28b858cebc0a5c1fa7a92920f54398b`**와 같고 이번에는 버전 메타데이터/기록만 갱신했다. 도구 **0.9.1 / Executa 760** 유지, Windows/Linux 패키지는 직전 [성공 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38986219436) 결과를 재사용한다.
- 사용자 요청으로 무료 전체 검사를 다시 실행해 **Python 223(MCP 포함) / JS 91 / 도구 70 / 브라우저 107** 모두 통과했다. strict와 실제 Pyodide 공통 규칙 실행도 통과했다. **추가 유료 이미지/텍스트 0회**이며, 이전 2 이미지/6 텍스트 한도는 늘리지 않았다. 실제 Anna 이동 시트 생성은 여전히 미검증이다.
- 소유자 초안 **0.0.0-draft** 설치 성공/실패 Executa 0개, 실제 Connected·홈 열기/실내외/닫기를 확인했다. 설치된 `app.js` SHA-256 **`fdfdbb2ffd5bfe8e7b42949ba21962be7cd1bf96d328863ca4a98d6f4ad825e7`**이 로컬과 같다. 앱 저장 4종의 값/ETag와 게임 inspect, 소개·스크린샷·로고·링크 모두 보존했다. 클라우드 도구 0.9.1 loaded/running 확인, PC는 미확인.
- Git commit/push 후 `release-web`에 심사/버전 기록을 통합했다. 공개 웹 **0.5.0**의 기존 런타임 배포를 유지한다. 이번에는 UI 코드 변화가 없어 웹 배포를 다시 만들지 않았고, 실제 공개 URL의 모듈/1120·360px/저장 보존/외부 요청 0/오류 0 재검사를 통과했다. [1.4.7 기록](releases/RELEASE_147.md) · [기존 유료 검사와 제한](docs/PAID_TEST_20261017.md).

# 1.4.6 후속 · 제한 유료 검사와 요청 전 삭제 상태 차단 · 2026-10-17

사용자 승인 한도 내에서 실제 Anna **이미지 2회 / 텍스트 6회**를 호출했다. 개발용 `notebuddy-dev` 저장소를 사용했으며 운영 친구·그림·대화·게임에 유료 조작을 하지 않았다. [상세 검사와 실수·제한](docs/PAID_TEST_20261017.md).

- 실제 성격·대화·돌봄 반응·참조 이미지 분석, 초상화 응답·업로드·APS 저장·무료 픽셀 변환을 확인했다. 홈 배치와 산책은 실제 모델 응답을 격리 입력으로 검증한 것이며 실제 플레이 전체의 유료 통합 검사는 아니다. 재접속/홈 열기에서 저장 4종 값·ETag 동일, 추가 AI 0회.
- 오래된 개발용 앱 삭제 표시 때문에 첫 이미지 저장이 차단됐고, 담당자가 제거 화면에서 대기 이미지가 지워지는 점을 놓쳐 두 번째 초상화를 호출했다. 두 원본을 비공개 로컬에 보존했지만 **실제 Anna 이동 시트 생성은 검증하지 못했다.** 추가 호출/한도 초과 없이 종료했다. 과거 dora의 원래 실패 원인도 확정하지 않는다.
- 아트/대화 삭제 표시가 있으면 유료 기능을 열지 않도록 `readExtras`를 수정하고 두 키의 회귀를 추가했다. Windows 개발 Python 브리지의 CP949 JSON 전달/저장 오류는 개발 실행 UTF-8 환경으로 고쳤다. 도구 패키지는 변경하지 않았다.
- 소스 **`d7c5d176a28b858cebc0a5c1fa7a92920f54398b`**, Anna **1.4.6 소스 / working revision 65 / 소유자 초안 0.0.0-draft** 업로드·설치 성공. 실제 설치 Connected 및 삭제 표시 차단 코드 확인. 앱 저장 4종 값/ETag·게임 inspect·소개/스크린샷/로고/링크 모두 동일. 클라우드 도구 **0.9.1 / Executa 760** loaded/running, 설치 already_satisfied. PC 실행은 미확인.
- 로컬 Python 222 통과/초기 1 skip, 도구 70, JS 91, 기존 전체 브라우저 106와 추가 회귀 통과. 수정 후 recovery 96 통과(다른 묶음 11개와 합쳐 최종 107개). 처음 건너뛴 MCP 검사는 의존성을 격리 설치해 해당 묶음 5개 모두 통과했다. strict·Pyodide 실행 통과.
- [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38986219395)와 [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38986219436)의 규칙·107 브라우저·저장/프로토콜·패키지 빌드/실행 검사 모두 성공했다.
- Git으로 `release-web`에 병합 **`13e43682ef56b497ba4d23962626f45e1558b79f`**, 웹 **0.5.0** 유지. [웹 공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38986229602)와 [Pages 검사·배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38986229507) 성공. 실제 공개 URL에서 빌드 모듈 일치·1120/360px·16프레임 판독·저장 동일·외부 AI/기타 외부 요청 0·페이지 오류 0 확인. 격리 브라우저만 사용했다.
- **심사 후보 1.4.6 / ID 1426 / pending_review 유지. 이번 revision 65 수정은 기존 심사본에 포함되지 않으며 `dirty_vs_latest_cut=true`다.** 새 cut/심사 재제출/공개 Anna 출시는 하지 않았다.
