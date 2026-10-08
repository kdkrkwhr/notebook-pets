# Anna 작업 인계 · 2026-10-08

## 현재 상태

사용자가 Anna에 가입하고 개발자 프로필을 설정한 뒤, Notebook Pets를 Anna 앱으로 만드는 작업을 요청했습니다. 이메일 발송은 요청 범위에서 제외했습니다. 현재 개발·비공개 등록까지 진행했고, 심사 제출이나 스토어 공개는 하지 않았습니다. 사용자가 다음 날 이어갈 수 있도록 이 상태를 커밋합니다.

Anna 서버에 다음 항목이 실제로 생성되어 있습니다.

- 앱 `@kdkrkwhr/notebuddy`, 앱 ID **450**, 상태 **draft**
- [개발자 콘솔](https://anna.partners/developer?app=450&tab=versions)
- 앱 버전 **0.1.0**, version ID **1154**, bundle ID **1075**
- 게임 도구 `tool-kdkrkwhr-notebuddy-game-hc8mw4gu`, Executa ID **1193**
- 고정된 게임 도구 버전 **0.1.1**, Executa version ID **656**
- UI 번들 94개 파일, 약 32 MB; Windows/Linux x86_64 바이너리는 Anna CDN에 업로드됨
- 0.1.0 게임 도구는 최초 local 프로필 등록 이력입니다. 배포는 binary 프로필 0.1.1을 사용합니다.

## 완료한 작업

- 원본 Python 게임 엔진을 그대로 재사용하는 Anna Executa 어댑터 구현
- 사용자별 APS 게임 저장, ETag 충돌 재시도, 요청 ID를 통한 중복 보상 방지
- 한국어 화면: 친구 생성, 돌봄·훈련·산책·배틀, 출석, 퀘스트, 성장 앨범
- 실제 게임 상태를 바탕으로 한 AI 대화와 최근 대화 기억
- Anna 이미지 생성 및 APS 파일로 영구 저장, 재접속 시 URL 재발급
- Windows/Linux 독립 실행 파일 생성 및 초기화·describe·친구 생성·밥 주기 검사
- 어댑터/프로토콜 테스트 9개, UI 상태 테스트 4개, `validate --strict` 통과
- 실제 Anna 계정으로 테스트 친구 **모찌(유령족/불)** 생성, 밥 주기(+10 XP), AI 대화 1회, 이미지 생성 1회 확인
- 새로고침 후 게임·대화·그림이 모두 복원됨. 1105px/375px 화면에 가로 넘침 없음

원본 `engine/`와 기존 Discord 세이브는 수정하지 않았습니다. 새 기능은 `anna/` 아래에 있습니다.

## 다음에 할 일

1. 개발자 콘솔에서 0.1.0 버전과 binary 도구 연결을 확인합니다.
2. **Install draft**로 사용자 본인 계정에 설치한 후 Anna Agent/Cloud에서 실제 실행을 검사합니다. 이 작업은 아직 하지 않았습니다. 지금까지의 실서비스 검증은 공식 로컬 테스트 도구 + 실제 Anna APS/AI 조합입니다.
3. 심사에 필요한 앱 로고·스크린샷·소개 정보를 완성합니다.
4. 여러 실행기에서 동시에 최초 생성하는 경우와 장기간 게임 저장 크기를 점검합니다. APS는 최초 생성에 `if-none-match`를 지원하지 않으며, 현재 프로세스 내 잠금만 적용되어 있습니다. 원본 엔진의 기록/요청 영수증은 계속 커질 수 있습니다.
5. 실제 설치 검증과 소개 정보 확인 후 사용자 지시에 따라 심사를 제출합니다. `submit-review` 또는 `release`를 이미 했다고 가정하지 마세요.

## 로컬에서 다시 실행하기

작업을 마치면서 테스트 서버를 종료했습니다. 저장은 Anna APS에 남아 있습니다.

```powershell
cd D:\develop\project\notebook-pets\anna
npm run dev:live
```

브라우저에서 `http://localhost:5180/`을 열면 됩니다. 새 체크아웃이라면 먼저 README의 `npm ci`, 자산 준비, `uv sync`, Anna 로그인 절차를 따릅니다.

개발용 앱 `notebuddy-dev`(ID 451), 독립 도구 개발 프로필 `executa-tool-dev-notebuddy`(ID 452), 앱 테스트 도구의 저장소용 프로필 `executa-dev-notebuddy-dev`(ID 453)을 등록했습니다. 운영 앱과 개발 앱의 저장소는 분리되어 있습니다. 테스트 친구가 운영 앱에서도 보여야 한다고 가정하지 마세요.

로그인은 공식 CLI 기기 인증으로 완료했습니다. PAT는 CLI가 사용자 설정 폴더에 저장하며 Git에 포함하지 않습니다. `.anna/`의 등록 ID 캐시, `.venv*`, `node_modules`, 생성된 바이너리·복사 자산·화면 캡처도 Git에서 제외했습니다. 업로드된 버전은 Anna 서버에 남아 있습니다.

## 작업 중 확인한 주의점

- CLI는 **@anna-ai/cli 0.1.57**으로 고정했습니다. 오래된 문서의 `--llm real` 대신 실제 연결이 기본이며 `--storage aps`를 사용합니다.
- 앱 테스트 도구가 사용하는 저장소 Executa ID는 `dev-<app-slug>`입니다. `dev-notebuddy-dev`를 등록하지 않으면 `forbidden_scope`가 발생합니다.
- `apps push`가 로컬 `anna-tool-ids.js`를 운영 ID로 바꿉니다. 이후 로컬 테스트는 dev 서버를 재시작해 개발 ID로 돌립니다.
- 원격 도구는 게시된 버전을 같은 번호로 바꿀 수 없습니다. 코드/배포 형태를 바꿨다면 게임 도구 버전을 올리고 다시 빌드해야 합니다.
- Windows에서 dev 서버 실행 중 `uv`가 Executa 패키지를 재설치하면 실행 파일 잠금으로 실패합니다. dev 서버를 종료하고 빌드합니다.
- Windows 샌드박스에서는 임시 폴더/테스트 하위 프로세스에 접근 거부가 있었습니다. 정상 권한으로 재실행한 테스트는 통과했습니다.
- Orca에서 DOM 조회는 `orca eval --page <id>`로 했습니다. 탭 ID는 다음 세션에 다시 조회하세요. 스크린샷은 JSON의 base64를 파일로 저장한 뒤 봅니다. 그대로 콘솔에 출력하지 마세요.
- macOS 패키지는 아직 만들지 않았습니다. Linux 바이너리는 WSL Ubuntu에서 빌드했으며 실제 Anna Cloud의 OS 호환성은 설치 검증에서 확인해야 합니다.
