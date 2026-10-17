# 1.4.8 후속 · 돌봄·행동 AI 반응 선택 · 2026-10-18

채팅 위에 **돌봄·행동 AI 반응** 체크 옵션을 추가했다. 기본값은 기존 동작을 유지하는 ON이고 같은 기기 브라우저 localStorage에 저장한다. OFF에서는 게임 명령·상태·경험치·보상만 처리하며 행동 반응을 생성하지 않는다. 산책 진행에 필요한 선택지는 준비된 기본 이야기로 제공하고 AI 요청을 생략한다. 직접 보내는 채팅과 별도 성격/그림/홈 생성/꾸며 줘는 이 옵션과 독립적이다. 이미 전송한 요청은 완료될 수 있지만 대기 중인 반응은 OFF 후 보내지 않는다.

- 소스 **`923022e`**, Anna 테스트 앱 **1.4.8 / working revision 68 / 설치 0.0.0-draft**. 버전은 기존 검증 묶음 1.4.8을 유지한다. 게임 도구 변경 없음: **0.9.1 / Executa 760**, 클라우드 loaded/running, 실패 Executa 0개.
- 설치 화면에서 채팅 위 옵션·기본 ON·설명·Connected 확인. 설치 app.js SHA-256 **`2e8ad630bbbe640edae77ff7601687dc37f98d70cd7c9b7cbf7e7ef4b6af7d85`** 로컬 일치. 배포 전후 앱 저장 4종 값/ETag/generation과 게임 privacy inspect 모두 동일, 스토어 소개·스크린샷 등 동일.
- JS **91**, 관련 브라우저 **6** 및 strict 통과. OFF에서 경험치 반영/AI 0회, 새로고침 후 OFF 보존, 직접 채팅 유지, ON 복귀, 무료 산책 선택지 진행, 대기 반응 생략을 검증했다. 실제 유료 AI 호출 **0회**. [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39042823929)와 [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39042823916)는 기록 시 진행 중이다. 이전 revision 67 전체 CI는 모두 성공했다.
- Git `release` push와 Anna 테스트 앱만 반영했다. **심사 후보 1.4.7 / ID 1427 / pending_review 유지**, dirty_vs_latest_cut=true. cut/심사 교체/공개 Anna 출시/Pages 배포/release-web push는 하지 않았다. 심사본 변경에는 매번 새 명시 요청이 필요하다.

---

# 1.4.8 · 첫 마이홈 픽셀 모습 선택 · 2026-10-17

새 친구·새 초상화 저장 직후의 자동 동작 생성을 제거하고, 첫 마이홈에서 **픽셀 캐릭터 생성(AI 이미지 1회)** 또는 **기본 이미지 사용(무료)**을 선택한다. 선택 전에도 현재 초상화의 무료 픽셀 미리보기를 표시한다. AI 실패 시 기본 이미지로 전환하며 자동 재시도하지 않는다. 선택은 현재 모습에 저장하며 홈·던전이 재사용한다. 받은 유료 원본은 그리드 판독 전 보관하고 저장만 재시도할 수 있다.

- 소스 `2d7d382`, Anna 테스트 앱 **1.4.8 / working revision 67 / 소유자 설치 0.0.0-draft**. 실행 도구 **0.9.1 / Executa 760** 변경 없음, 클라우드 loaded/running 확인.
- 설치 app.js SHA-256 `e1665e092d1b583faad9c011f82facd95b11799a29f78d0915bd7e56af95e3a2` 로컬 일치, Connected 확인. 실제 화면은 친구 생성 단계여서 홈 진입은 검증하지 못했다. 사용자 대신 친구 생성·기본 모습 선택을 실행하지 않았다. 저장 4종 값/ETag는 이전과 동일하지만 generation이 달라졌고 게임 inspect ETag도 달라 전체 상태 불변을 주장하지 않는다. 이번 검증에서 게임 변경 명령은 호출하지 않았다.
- [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39041715055)는 성공했다. [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39041715094)는 기록 시 패키지/브라우저 검증 진행 중이다.
- 로컬 JS **91**, 브라우저 **109**, strict 통과. 무료 기본 선택/재접속/새 초상화/AI 실패/중복 요청 차단/저장 복구를 검증했다. 실제 Anna 방향별 시트 생성 성공은 미검증이다.
- 사용자 승인 추가 이미지 **1회**를 격리 개발 앱에서 기존 초상화로 요청했다. 이미지 생성 API가 **HTTP 502**를 반환해 결과가 없었다. 텍스트/초상화 재생성/재시도는 0회. 연속 호출 제한 정책이 원인이라고 확정할 근거는 없으며 과금 여부도 응답으로 확인할 수 없다.
- **심사 후보 1.4.7 / ID 1427 / pending_review 유지**, `dirty_vs_latest_cut=true`. 사용자 명시 요청 전에는 cut/심사 교체 금지. 소개·스크린샷 등 스토어 항목 동일. 이번 요청은 **Git release push + Anna 테스트 앱만**이며 공개 웹 배포와 release-web push는 하지 않았다.
