# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 인계 이력](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-16 기준)

| 항목 | 값 |
| --- | --- |
| Anna 앱 | **1.4.0 / ID 1403 / working revision 54**, 소유자 테스트 앱 실제 설치 확인 |
| 게임 도구 | **0.9.0 / Executa version 758**, PC·클라우드 모두 loaded=true / running=true |
| 스토어 | **1.0.0 / ID 1383 / pending_review**, 기존 공유 소개·스크린샷 유지 |
| 검증 | 엔진 221(로컬 선택 1 skip) · JS 84 · 브라우저 93 · 저장/프로토콜 70 · strict·Pyodide·Windows/Linux CI 통과 |
| 제한 | 초상화 기반 이동, 제한된 배치 후보, 방 1개. APS 최초 생성 경합은 기존 [제약](docs/FIRST_CREATION.md) 유지 |

이 파일은 최신 배포 2건만 유지한다. 이전 1.2.0 기록은 내용 수정 없이 이력 맨 위로 옮겼다.

---

# 1.4.0 · 성격 기반 나만의 홈 · 2026-10-16

앱 **1.4.0 / ID 1403 / working revision 54**, 도구 **0.9.0 / Executa version 758**, 배포 소스 **`f53e7bc`**. `release`에 커밋·푸시하고 소유자 테스트 앱을 설치했다. 설치 버전은 `0.0.0-draft`, `dirty_vs_latest_cut=false`다.

- 분리된 2D 바닥·벽·가구와 기존 친구 그림을 사용한다. 무료 둥지+구매 가구 11종, 보관함, 성격에 따른 배치 선택, 이동·마법 운반·생활 연출, 이전 배치 복원을 구현했다. 수동 배치는 없다.
- ‘꾸며 줘’에만 AI 최대 1회(응답 최대 160토큰). 구매·보기·이동·생활·되돌리기·저장 확인은 0회. 코어가 가격·소유·코인·충돌·출입구·2×2 경로·revision을 검사하고 AI는 최대 4개 후보 중 하나만 고른다. 한 요청에 최대 3개를 배치한다.
- [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38761143332)와 [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38761143190)의 Windows/Linux 검증이 통과했다. CI 기준 `9c3d694`, 두 OS 실행 파일에서 구매·배치·중복 재시도와 던전 보상까지 검사했다. 이후 UI 벽걸이 높이 조정은 홈 브라우저 2개 재검증 및 설치 파일 해시 일치로 확인했다.
- 검증된 CI 패키지를 두 실행기에 설치해 실제 **0.9.0 / loaded=true / running=true** 확인. 원래 클라우드 기본값을 복원했다. 실제 설치 UI Connected, 방 열기·가구 12종·기존 장식 초상화 표시 정상. UI/가구 파일 6개 HTTP 200 및 소스 SHA-256 일치.
- 게임 ETag와 아트·대화·이야기·성격 초안의 값/ETag 모두 동일. 친구·XP 유지, 홈 revision 0, 둥지와 24코인 그대로다. 실제 사용자 구매나 유료 AI 요청은 하지 않았으며, AI 1회 계약은 실제 코어+모의 제공자로 검증했다.
- 공유 소개·기존 스크린샷 6개·심사 후보 1.0.0 모두 유지. 재심사·공개 출시는 하지 않았다. 홈 UI의 웹 이식은 별도다. [전체 배포 기록](releases/RELEASE_140.md) · [기획 및 구현 범위](docs/HOME_DECORATION.md).

# 1.2.1 · 공통 코어 분리와 메모리 기반 Anna 작업자 · 2026-10-15

앱 **1.2.1 / ID 1402 / working revision 53**, 도구 **0.8.1 / Executa version 757**. 소스 **`506e1f141b02a615d44a60ef5c97cf61a5ff9d87`**를 `main`과 기존 Anna 배포 브랜치 `release`에 반영했다. 소유자 테스트 앱은 같은 내용의 `0.0.0-draft`로 설치됐고 `dirty_vs_latest_cut=false`다. 심사 후보 **1.0.0 / ID 1383 / pending_review** 및 공유 소개는 유지했다.

- 규칙을 복제하지 않고 `game_api.transition`에 상태·규칙·프롬프트·시각·난수·ID를 전달한다. 코어 import 시 파일/환경변수를 읽지 않고 기존 CLI는 지연 로딩하는 파일 어댑터로 호환한다.
- 저장 revision/CAS 인터페이스, 메모리·파일 구현, 저장 성공 후 결과를 반환하는 실행기를 추가했다. Anna는 임시 세이브·환경변수 변경 없이 JSON 상태를 직접 코어에 전달한다. APS 최초 생성 제약은 남는다.
- 로컬 엔진 **214개(선택 1 skip)**, 저장/프로토콜 **67/67**, JS **82/82**, strict 통과. 실제 Edge Pyodide **314.0.7**에서 탄생·돌봄·상태·던전 보상·재시도를 확인했고 파일 어댑터는 로드되지 않았다.
- [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38744733520) Windows/Linux 회귀 및 실제 브라우저 Pyodide 성공. [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38744733885) Windows/Linux 브라우저 **91/91**, 저장·프로토콜 **67/67**, 독립 실행 파일의 보상·재시도 검사와 패키징 모두 성공.
- 두 CI 패키지를 배포하고 **PC·클라우드 모두 agent_version=0.8.1 / loaded=true / running=true**를 확인했다. 기본 에이전트를 잠시 Windows로 변경해 설치한 뒤 원래 클라우드로 복원했다. 실제 설치 UI는 **Connected**, 오류 안내 없음, 기존 그림 디코딩 및 24종 도감 정상. 변경하지 않은 UI JS/CSS 5개는 설치 경로 HTTP 200·소스 SHA-256과 일치했다.
- 게임 ETag와 대화·아트·산책 이야기·성격 초안 4종의 값/ETag가 배포 전과 동일하다. 공유 소개·기존 스크린샷 6개 URL·심사 상태도 동일하다. 업로드 때만 기존 CDN URL을 사용하고 로컬 app.json을 원본으로 복원해 공유 스크린샷 재업로드를 피했다. 실게임 행동·AI·리셋·심사 재신청·공개 출시는 하지 않았다.
- 제한: 웹/Android 앱, IndexedDB, BYOK는 후속 단계다. APS 최초 생성 원자성 제약은 남는다. 이식용 진입점은 명시적 컨텍스트를 받는 `game_api.transition`이며 기존 CLI의 지연 파일 어댑터를 Web에 포함하지 않는다. [전체 기록](releases/RELEASE_121.md) · [아키텍처](../docs/ARCHITECTURE.md).
