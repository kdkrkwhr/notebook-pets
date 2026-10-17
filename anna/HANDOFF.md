# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 기록](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-17)

| 항목 | 값 |
| --- | --- |
| Anna 테스트 앱 | **1.4.8 / working revision 70 / 소유자 초안 0.0.0-draft** |
| 심사 | **1.4.7 / ID 1427 / pending_review**, 명시 요청 전 변경 금지 |
| 게임 도구 | **0.9.1 / Executa 760**, 변경 없음 |
| 검증 | JS 92 · 전체 브라우저 110 통과 후 실패 4개 수정·관련 6개 재통과 · strict |
| 공개 웹 | 기존 배포 유지, 이번 배포 제외 |
| 제한 | 실제 이동 시트 생성·표시 확인, 스타일 차이 가능 / 전체 CI 진행 중 |

최신 작업 2건만 유지하며 이전 기록은 내용 변경 없이 이력 맨 위로 옮긴다.

---

# 1.4.8 후속 · 홈 이미지 생성 복구와 보조 설명 툴팁 · 2026-10-18

현재 소유자의 홈 요청은 판독/저장 이전 generate 단계에서 실패했다. 격리 개발 앱의 실제 비교에서 참조 URL과 data URL, image.edit는 각각 HTTP 502를 반환했고, 저장 외형 설명을 사용한 image.generate만 21초에 openai/gpt-image-2 PNG 1024×1024를 반환했다. **이미지 API 4회 / 성공 1장 / 별도 텍스트·분석·초상화 생성 0회**. 실패의 실제 과금 여부는 확인하지 못했다. [상세 기록](docs/HOME_IMAGE_TEST_20261018.md).

- 저장된 원본 분석 설명 → 성격의 외형 설명 → 게임 이미지 프롬프트를 재사용해 이미지 1회를 요청하도록 수정했다. 현재 성장 단계를 포함하고 참조 URL은 보내지 않는다. 추가 분석/자동 유료 대체 재시도는 없다. 이전 방식의 생성 실패로 기본 모습에 머물던 친구에게만 명시적인 첫 선택을 다시 제공하며 재접속만으로 AI를 요청하지 않는다.
- 성공 원본을 비공개 보관하고 16프레임 판독·방향 행을 확인했다. 친구/단계/원본/ART ETag를 재검증하고 소유자 홈 시트와 요청 기록만 조건부 복구했다. 초상화·대화·게임 상태는 보존했다. 실제 설치에서 directional/ready·빈 경고 숨김·실내 캐릭터를 육안 확인했다. 복구 추가 AI 0회. 외형 설명 기반이므로 초상화와 세부 스타일 차이는 남는다.
- 채팅·앨범·던전·그림판·마이홈 등 **17곳의 보조 설명**을 ⓘ 툴팁으로 옮겼다. hover/클릭/키보드 초점으로 표시, Esc/바깥 클릭/초점 이탈로 닫기, 모바일과 화면 경계·스크롤·언어 변경·동적 제목 갱신을 고려했다. 오류·진행 상태·행동 비용·파괴적 확인 문구는 상시 표시한다. 이미 접혀 있던 아이템 착용 설명은 중복 툴팁으로 만들지 않았다.
- 소스 **`24d90bb`**, Anna **1.4.8 / working revision 70 / 소유자 설치 0.0.0-draft**. 실제 설치 app.js SHA-256 **`32ef3a7bec2a4f9b48865214c8ee295fad6cfde289f21a176ff27d8dd341d0e4`** 로컬 일치. 설치의 툴팁 숨김/표시/Esc/화면 범위·홈 시트를 확인했다. 배포 전후 저장 4종·게임 inspect와 스토어 소개/스크린샷 등 모두 동일. 도구 **0.9.1 / Executa 760** 변경 없음, 클라우드 loaded/running, 설치 실패 Executa 0개.
- JS **92**와 strict 통과. 전체 브라우저 **114개 중 110 통과**, 참조 인자 기대값·중복 설명·그림판 설명 배치·테마 라디오 선택자에서 실패한 4개를 수정하고 **관련 6개(실패 4 + 툴팁 + 새 복구 경로) 재검증 모두 통과**. 마지막 hover 유지 보완 후 툴팁 검사도 재통과했다. 이번 [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39046187885)와 [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39046187829)는 기록 시 진행 중이며 최종 전체 CI 성공으로 주장하지 않는다.
- `release` Git push와 Anna 테스트 앱만 반영. **심사 1.4.7 / ID 1427 / pending_review 유지**, dirty_vs_latest_cut=true. cut/심사 교체/공개 Anna 출시/Pages 배포/release-web push 없음. 테스트용 image.edit 권한과 개발 서버는 종료·제거했다. 심사 변경에는 매번 새 명시 요청이 필요하다.

# 1.4.8 후속 · 돌봄·행동 AI 반응 선택 · 2026-10-18

툴팁 후속 수정: 상시 설명문을 옵션 옆 **ⓘ 안내 아이콘**으로 옮겼다. 마우스 hover·키보드 초점·클릭으로 표시하고 Esc·바깥 클릭·초점 이탈로 닫는다. 모바일 클릭과 360px 화면 범위를 검증했다. 설명은 문서 흐름 밖에 표시해 채팅 공간을 차지하지 않는다. 소스 **`75a52cd`**, **working revision 69 / 설치 0.0.0-draft** 반영. 실제 설치에서 기본 숨김/hover/클릭/Esc/화면 범위, 로컬 app.js SHA-256 **`36ba9bf5ccab96bbd87d8a2b44edb9edc5c00d2905cf7639687a6c158334c9e6`** 일치 확인. 저장 4종과 게임 inspect, 스토어 내용 모두 보존했다. 관련 브라우저 2개·strict·JS 구문 검사 통과. [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39043098853)와 [Anna CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39043098822)는 기록 시 진행 중이다. 유료 AI 0회, 도구 0.9.1 유지, 심사 1.4.7 유지, 공개 웹 배포 없음.

채팅 위에 **돌봄·행동 AI 반응** 체크 옵션을 추가했다. 기본값은 기존 동작을 유지하는 ON이고 같은 기기 브라우저 localStorage에 저장한다. OFF에서는 게임 명령·상태·경험치·보상만 처리하며 행동 반응을 생성하지 않는다. 산책 진행에 필요한 선택지는 준비된 기본 이야기로 제공하고 AI 요청을 생략한다. 직접 보내는 채팅과 별도 성격/그림/홈 생성/꾸며 줘는 이 옵션과 독립적이다. 이미 전송한 요청은 완료될 수 있지만 대기 중인 반응은 OFF 후 보내지 않는다.

- 소스 **`923022e`**, Anna 테스트 앱 **1.4.8 / working revision 68 / 설치 0.0.0-draft**. 버전은 기존 검증 묶음 1.4.8을 유지한다. 게임 도구 변경 없음: **0.9.1 / Executa 760**, 클라우드 loaded/running, 실패 Executa 0개.
- 설치 화면에서 채팅 위 옵션·기본 ON·설명·Connected 확인. 설치 app.js SHA-256 **`2e8ad630bbbe640edae77ff7601687dc37f98d70cd7c9b7cbf7e7ef4b6af7d85`** 로컬 일치. 배포 전후 앱 저장 4종 값/ETag/generation과 게임 privacy inspect 모두 동일, 스토어 소개·스크린샷 등 동일.
- JS **91**, 관련 브라우저 **6** 및 strict 통과. OFF에서 경험치 반영/AI 0회, 새로고침 후 OFF 보존, 직접 채팅 유지, ON 복귀, 무료 산책 선택지 진행, 대기 반응 생략을 검증했다. 실제 유료 AI 호출 **0회**. [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39042823929)와 [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39042823916)는 기록 시 진행 중이다. 이전 revision 67 전체 CI는 모두 성공했다.
- Git `release` push와 Anna 테스트 앱만 반영했다. **심사 후보 1.4.7 / ID 1427 / pending_review 유지**, dirty_vs_latest_cut=true. cut/심사 교체/공개 Anna 출시/Pages 배포/release-web push는 하지 않았다. 심사본 변경에는 매번 새 명시 요청이 필요하다.
