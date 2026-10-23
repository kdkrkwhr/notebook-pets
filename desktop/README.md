# NoteBuddy Desktop · 설치형 노트버디

Windows와 macOS에서 별도 창으로 실행하는 노트버디 초기 설치판입니다.
Anna에 로그인하지 않아도 게임을 실행할 수 있고, AI 기능은 **이 PC에 설치하고 로그인한 Codex CLI**에 연결합니다.

## 할 수 있는 일

- 직접 그린 그림·업로드한 사진을 분석해 내 캐릭터 만들기
- 랜덤 친구로 시작하기, 돌보기, 대화, 성격과 추억 쌓기
- 산책에서 던전 발견하기, 탐험, 성장과 진화
- 마이홈과 마당, 가구 상점, 아이템 도감
- 영어 기본값과 한국어·일본어·중국어 간체·번체
- 게임·대화·이미지를 PC에 저장하고 백업 파일 내보내기

랜덤 생성과 기본 게임 규칙, 도감과 저장된 그림 보기는 AI 없이 동작합니다.
그림 분석·생성, 대화, 켜 둔 돌봄 반응, 꾸며 줘 등은 Codex를 사용합니다.
AI는 PC에서 모델을 직접 돌리는 방식이 아닙니다. **인터넷과 사용자 Codex 계정의 이용 한도**가 필요합니다.
CLI 인증 정보를 앱에 입력하거나 복사하지 않습니다. Anna 사용량과 별개입니다.

## 처음 실행하기

1. Windows는 `NoteBuddy-0.1.0a1-windows-x64-setup.exe`를 실행합니다.
   macOS는 본인 Mac에 맞는 `macos-arm64`(Apple Silicon) 또는 `macos-x64`(Intel) DMG에서 앱을 Applications로 옮깁니다.
2. AI를 쓸 경우 [공식 Codex CLI](https://learn.chatgpt.com/docs/cli)를 설치하고 터미널에서 `codex login`을 실행합니다.
   이 버전은 Codex CLI **0.159.3**으로 검증했습니다. `--ignore-user-config`, `--ignore-rules`, `--ephemeral` 지원이 필요합니다.
3. 앱 상단의 **AI 연결 설정 → 연결 확인**을 누릅니다. CLI가 검색되지 않으면 실행 파일 경로를 입력합니다.
4. 모델은 비워 두면 Codex 기본 모델을 사용합니다. 원하는 모델 ID를 직접 넣을 수도 있으며 계정에서 지원해야 합니다.
5. 친구 이름을 정하고 랜덤으로 만나거나 그림·사진을 입력합니다.

그림 생성은 일반 대화보다 오래 걸리고 Codex 한도를 더 많이 사용할 수 있습니다.
실패했다고 자동으로 반복 생성하지 않습니다. 오류는 AI 연결 설정에서 확인할 수 있고, 진행 중인 요청도 그곳에서 취소할 수 있습니다.
첫 마이홈 방문에서는 AI 픽셀 캐릭터 또는 현재 초상화를 이용한 무료 기본 이미지를 선택합니다.

## 지원 환경과 현재 한계

- Windows 10/11 x64, Microsoft Edge WebView2 Runtime 필요
- macOS 15 이상, Apple Silicon 및 Intel용 별도 패키지
- Python이나 게임 서버는 따로 설치할 필요가 없습니다. CLI와 그 계정은 사용자가 준비합니다.
- 첫 배포는 개발자 인증서 서명·Apple 공증이 없는 미리보기 패키지입니다. OS에서 게시자 확인 안내가 나올 수 있습니다.
- 자동 업데이트, 기기 간 동기화, Anna 세이브 가져오기, Claude Code/Cursor 연결은 아직 없습니다.
- 설치판의 세이브는 Anna·공개 웹과 독립적입니다. 앱을 삭제해도 저장 폴더는 남습니다.
- Codex 이미지 결과 수집은 현재 CLI의 `generated_images/<요청 thread_id>` 구조를 지원합니다. CLI가 이 형식을 바꾸면 업데이트가 필요할 수 있습니다. 다른 세션의 이미지는 가져오지 않습니다.

## 내 데이터

Windows: `%LOCALAPPDATA%\NoteBuddyDesktop`

macOS: `~/Library/Application Support/NoteBuddyDesktop`

`notebuddy.sqlite3`에 게임·대화·이미지를 저장합니다. AI 설정에는 CLI 경로와 모델 이름만 저장합니다.
게임 자료와 내보낸 백업은 암호화되지 않으므로 개인 파일처럼 관리하세요.
앱의 데이터 삭제는 Codex·AI 제공자의 로그나 생성 이미지 사본, 직접 만든 백업까지 지우지 않습니다.

**AI 연결 설정 → 백업 만들기**에서 일관된 SQLite 스냅샷을 내보낼 수 있습니다.
복원 UI는 아직 없습니다. 복원 전 앱을 완전히 종료하고 기존 데이터 폴더를 통째로 따로 보관한 다음,
새 데이터 폴더의 `notebuddy.sqlite3`로 백업 파일을 복사하세요. 실행 중인 DB 파일에 덮어쓰지 마세요.

## 개발과 검증

```powershell
uv venv --python 3.11 .venv-desktop
uv pip install --python .venv-desktop/Scripts/python.exe -r desktop/requirements-build.txt
.venv-desktop/Scripts/python.exe desktop/prepare.py
.venv-desktop/Scripts/python.exe -m desktop.entry
```

macOS에서는 `.venv-desktop/bin/python`을 사용합니다.
빌드는 해당 OS/CPU에서 `python desktop/build.py`, 실제 패키지 재실행 검증은 `python desktop/smoke.py --target windows-x64` 등으로 수행합니다.
Windows 설치 파일 생성에는 Inno Setup 6이 필요합니다. `.github/workflows/desktop.yml`에서 Windows·Mac 두 아키텍처를 각각 빌드합니다.

```text
python -m unittest discover -s desktop/tests -v
npm ci --prefix desktop
npx --prefix desktop playwright-core install chromium
npm test --prefix desktop
```

브라우저 통합 검사는 실제 Python 게임·SQLite·HTTP 저장소와 결정적인 AI 대역을 사용합니다.
테스트 대역은 배포 앱에 포함하지 않습니다. 실제 Codex 테스트는 별도로 수행하며 자동 CI에서 계정·AI 한도를 쓰지 않습니다.

## 코드 구조

`desktop/prepare.py`가 기존 Anna UI를 빌드 출력으로 가져와 SDK import와 설치판 안내만 교체합니다.
`desktop/runtime.py`는 기존 GameService와 `engine/game_api.py`를 재사용합니다.
게임 규칙·보상·상태·타이머를 별도로 복제하거나 AI가 수정하게 하지 않습니다.

`storage.py`는 SQLite와 조건부 저장, `server.py`는 토큰과 Origin 검사로 보호된 루프백 통신,
`codex.py`는 제한된 CLI 호출, `app.py`는 네이티브 창·백업 대화상자·프로세스 수명을 담당합니다.
새 CLI 요청은 임시 작업 폴더와 새 세션을 사용하며 개발 중인 저장소·기존 대화 세션을 재개하지 않습니다.

설치판 작업 브랜치는 `release-desktop`입니다. 이 브랜치의 빌드는 Anna 심사본이나 GitHub Pages를 배포하지 않습니다.

공식 연동 참고: [비대화형 실행](https://learn.chatgpt.com/docs/non-interactive-mode),
[CLI 참조](https://learn.chatgpt.com/docs/cli/reference), [이미지 생성과 사용량](https://learn.chatgpt.com/docs/image-generation).
