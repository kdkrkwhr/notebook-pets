# Anna 작업 인계

웹 디자인 공유(2026-10-15): 웹 0.2.0은 Anna의 폰트·테마 CSS·공개 기본 그림·시작 화면·아이템 도감을 빌드 시 공유한다. Anna 파일/앱/도구와 개인 데이터는 변경하지 않았다. 웹 배포·검증은 [웹 0.2.0 기록](../web/RELEASE_020.md)을 따른다.

웹 트랙 추가(2026-10-15): `main`/`release-web`에 [GitHub Pages 웹 프리뷰](../web/README.md)를 구현했다. Anna 소스·게임 도구는 변경하지 않아 재배포하지 않았으며, 마지막 확인된 Anna 앱 1.2.1 / 도구 0.8.1 / working revision 53은 아래 기록을 따른다. Pages 배포 결과는 [웹 릴리즈 기록](../web/RELEASE.md)에 별도 기록한다.

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 인계 이력](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-15 기준)

| 항목 | 값 |
| --- | --- |
| Anna 앱 | **1.2.1** / ID 1402 / working revision 53, 소유자 테스트 앱 설치·실행 확인 |
| 게임 도구 | **0.8.1** / Executa version 757 / PC·클라우드 모두 loaded=true / running=true |
| 스토어 | 1.0.0 **pending_review** (review_candidate_version=1.0.0), 공개 전 |
| 검증 | JS 82 · 브라우저 91 · 저장/프로토콜 67 · 엔진 214(로컬 선택 1 skip) · Pyodide·strict·두 OS CI 통과 |
| 알려진 제한 | 여러 실행기의 동시 최초 생성 경합 ([FIRST_CREATION.md](docs/FIRST_CREATION.md)), 해결 수단 없음 |

이 파일은 최신 배포·심사 2건만 유지한다. 새 기록을 추가하면 가장 오래된 섹션을 [HANDOFF_HISTORY.md](HANDOFF_HISTORY.md) 맨 위로 옮긴다.

문서 유지 관리(2026-10-15, 작업 기준 `fc939f5`): [문서 목차](../docs/README.md)와 [Anna 기술 문서](docs/README.md)를 신설하고 과거 절차는 `archive/`로 분리했다. 새로 시작 안내는 [RESET.md](docs/RESET.md)에 통합했다. 이 작업은 문서·중복 홍보 자료 정리이며 UI·도구·설치 버전 변경이나 재배포는 없다. 문서 정리 당시의 설치 버전은 1.1.2였으며 현재 설치 상태는 위 표를 따른다. 로컬 링크 검사 결과는 [정리 기록](../docs/MAINTENANCE.md)에 남긴다.

---

# 1.2.1 · 공통 코어 분리와 메모리 기반 Anna 작업자 · 2026-10-15

앱 **1.2.1 / ID 1402 / working revision 53**, 도구 **0.8.1 / Executa version 757**. 소스 **`506e1f141b02a615d44a60ef5c97cf61a5ff9d87`**를 `main`과 기존 Anna 배포 브랜치 `release`에 반영했다. 소유자 테스트 앱은 같은 내용의 `0.0.0-draft`로 설치됐고 `dirty_vs_latest_cut=false`다. 심사 후보 **1.0.0 / ID 1383 / pending_review** 및 공유 소개는 유지했다.

- 규칙을 복제하지 않고 `game_api.transition`에 상태·규칙·프롬프트·시각·난수·ID를 전달한다. 코어 import 시 파일/환경변수를 읽지 않고 기존 CLI는 지연 로딩하는 파일 어댑터로 호환한다.
- 저장 revision/CAS 인터페이스, 메모리·파일 구현, 저장 성공 후 결과를 반환하는 실행기를 추가했다. Anna는 임시 세이브·환경변수 변경 없이 JSON 상태를 직접 코어에 전달한다. APS 최초 생성 제약은 남는다.
- 로컬 엔진 **214개(선택 1 skip)**, 저장/프로토콜 **67/67**, JS **82/82**, strict 통과. 실제 Edge Pyodide **314.0.7**에서 탄생·돌봄·상태·던전 보상·재시도를 확인했고 파일 어댑터는 로드되지 않았다.
- [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38744733520) Windows/Linux 회귀 및 실제 브라우저 Pyodide 성공. [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38744733885) Windows/Linux 브라우저 **91/91**, 저장·프로토콜 **67/67**, 독립 실행 파일의 보상·재시도 검사와 패키징 모두 성공.
- 두 CI 패키지를 배포하고 **PC·클라우드 모두 agent_version=0.8.1 / loaded=true / running=true**를 확인했다. 기본 에이전트를 잠시 Windows로 변경해 설치한 뒤 원래 클라우드로 복원했다. 실제 설치 UI는 **Connected**, 오류 안내 없음, 기존 그림 디코딩 및 24종 도감 정상. 변경하지 않은 UI JS/CSS 5개는 설치 경로 HTTP 200·소스 SHA-256과 일치했다.
- 게임 ETag와 대화·아트·산책 이야기·성격 초안 4종의 값/ETag가 배포 전과 동일하다. 공유 소개·기존 스크린샷 6개 URL·심사 상태도 동일하다. 업로드 때만 기존 CDN URL을 사용하고 로컬 app.json을 원본으로 복원해 공유 스크린샷 재업로드를 피했다. 실게임 행동·AI·리셋·심사 재신청·공개 출시는 하지 않았다.
- 제한: 웹/Android 앱, IndexedDB, BYOK는 후속 단계다. APS 최초 생성 원자성 제약은 남는다. 이식용 진입점은 명시적 컨텍스트를 받는 `game_api.transition`이며 기존 CLI의 지연 파일 어댑터를 Web에 포함하지 않는다. [전체 기록](releases/RELEASE_121.md) · [아키텍처](../docs/ARCHITECTURE.md).

# 1.2.0 · 던전 아이템 수집과 보관함 · 2026-10-15

앱 **1.2.0 / ID 1400 / working revision 52**, 도구 **0.8.0 / Executa version 755**. 소스 **`38241df0bfd5835aa983cf57fb2deaa15a910e29`**를 푸시하고 두 OS CI에서 검증한 패키지를 배포했다. 소유자 테스트 앱은 `0.0.0-draft`로 설치됐으며 `dirty_vs_latest_cut=false`다. 심사 후보 **1.0.0 / ID 1383 / pending_review** 및 공유 소개는 유지했다.

- 지역별 마지막 수호자 승리에 미보유 일반 3종→희귀 1종을 순서대로 지급한다. 20종 수집, 지역별 완성 후 중복 없음. 기존 코인·산책·일일 규칙은 유지한다.
- 내 보관함, 도감 보유·미보유 필터, 카드·상세 보유 표시, 클리어 획득 아이템 이름을 연결했다. 공용 4종·상점·착용·새 AI 요청은 없다.
- 읽기만으로 기존 저장을 변경하거나 과거 클리어를 소급 지급하지 않는다. 아이템·코인·클리어·영수증을 함께 저장하고 응답 유실 재시도와 저장 실패를 검사한다.
- 로컬 JS **82/82**, 엔진 **207개(선택 검사 1개 skip)**, 저장·프로토콜 **66/66**, strict 통과. 브라우저 전체 **91/91**, 보관함·최종 획득 연결 추가 2개 검사도 통과했다.
- [엔진 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38739685672)와 [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38739685615) Windows/Linux 모두 성공. 실제 독립 실행 파일의 최종 보상·소유 상태·재시도까지 검사한 각 OS 패키지를 사용했다.
- 설치 후 **PC·클라우드 모두 agent_version=0.8.0 / loaded=true / running=true**. 설치 UI의 **Connected**, 오류 안내 없음, 24종 도감·보유 필터·빈 보관함·기존 초상화 디코딩을 확인했다. JS/CSS **5개가 HTTP 200 및 로컬 SHA-256 일치**. 진입 HTML의 별도 fetch는 보호 경로에서 403이므로 HTML 해시 일치는 주장하지 않으며 실제 로드된 DOM에서 새 보관함 요소를 확인했다.
- 대화·아트·성격 초안의 값과 ETag 동일, 친구 식별자·이름·XP·그림 경로 유지. 검증 중 완료 산책 2건이 추가돼 게임 ETag와 이야기 값/ETag는 바뀌었다. 이전 산책 식별자 모두 유지됨을 확인하고 최신 진행을 보존했으며 배포 전 스냅샷으로 덮어쓰지 않았다. 이 작업에서는 실게임 행동·산책 소모·AI 요청·리셋을 하지 않았다.
- CLI push가 같은 스토어 스크린샷을 재업로드해 공유 URL을 변경했으나 기존 6개 URL로 복원했다. 재조회한 소개·이미지·심사 상태가 배포 전과 정확히 같다. PC 확인을 위해 잠시 변경한 기본 에이전트도 원래 클라우드로 복원했다.
- 제한: 공용 4종·상점·착용·이미지 편집은 후속 작업이며 과거 클리어 소급 지급은 없다. 실제 사용자 저장에서 보상 획득을 위해 던전을 소모하지 않았고, 최종 보상은 격리 테스트·두 OS 실행 패키지에서 검증했다. [전체 기록](releases/RELEASE_120.md).
