# Notebuddy · Anna edition

Notebook Pets의 원본 Python 규칙을 사용하는 Anna 앱입니다. 기존 Discord 프로젝트와 세이브는 변경하지 않습니다.

- 앱: `@kdkrkwhr/notebuddy` (ID 450)
- [개발자 콘솔](https://anna.partners/developer?app=450)
- 앱 버전: 0.1.1 / 게임 도구 버전: 0.1.2
- 상태: 비공개 초안, 0.1.1 버전 생성 완료 (version ID 1175). 심사 제출과 스토어 공개는 별도 작업입니다.
- 다음 작업은 [HANDOFF.md](HANDOFF.md)에 기록했습니다.

## 실행

Node.js, Python 3.11+, `uv`가 필요합니다. 아래 명령은 이 `anna/` 폴더에서 실행합니다.

```powershell
npm ci
npm run prepare:assets
uv sync --project executas/notebuddy
npx anna-app login --host https://anna.partners
npx anna-app executa register --tool-id tool-dev-notebuddy
npx anna-app executa register --tool-id dev-notebuddy-dev
npm run dev:live
```

`http://localhost:5180/`에서 실행합니다. 로그인은 브라우저의 기기 인증을 이용하며 앱에 API 키를 넣지 않습니다. `dev:live`는 실제 Anna 저장소와 AI를 사용합니다. 대화·이미지 생성은 계정 사용량을 소모하므로 자동 회귀 테스트에서는 호출하지 않습니다.

CLI 0.1.57 앱 테스트 도구는 도구 저장소 소유자를 `dev-<app-slug>`로 사용합니다. 이 때문에 `dev-notebuddy-dev` 등록이 필요합니다. 독립 Executa 테스트는 `tool-dev-notebuddy`를 사용합니다. 운영 앱은 플랫폼이 발급한 `tool-kdkrkwhr-notebuddy-game-hc8mw4gu`를 사용합니다. 개발용과 운영용의 저장 데이터는 다릅니다.

`apps push`는 `bundle/anna-tool-ids.js`를 배포용 ID로 갱신합니다. 업로드 후 로컬 테스트를 계속하려면 dev 서버를 재시작하여 개발용 매핑을 다시 생성합니다.

## 구성과 저장

| 경로 | 역할 |
| --- | --- |
| `app.json`, `manifest.json` | 등록 정보, UI와 도구 권한 |
| `bundle/` | 한국어 반응형 화면, AI 대화, 돌봄, 퀘스트, 앨범 |
| `executas/notebuddy/notebuddy_plugin.py` | Executa v2 JSON-RPC와 사용자별 APS 연결 |
| `executas/notebuddy/game_worker.py` | 격리된 임시 세이브에서 기존 Python 엔진 실행 |
| `scripts/prepare_assets.py` | 원본 규칙·데이터 및 캐릭터 그림 복사 |
| `scripts/build_executa.py` | Windows/Linux 독립 실행 파일 생성 및 동작 확인 |

게임 상태는 APS `tool` 범위의 `notebuddy/game-v1`에 저장합니다. 실제 사용자 분리는 Anna의 인증된 저장소가 담당합니다. 엔진의 내부 사용자 번호 `1`은 이미 분리된 사용자별 저장소 안에서만 사용됩니다. 도구 인자로 다른 사용자나 게임 상태를 지정할 수 없습니다. 관리자·리셋·전체 순위 명령도 노출하지 않습니다.

기존 저장은 ETag 조건부 쓰기로 갱신합니다. 충돌하면 새 저장을 읽고 재계산합니다. 동일 요청 ID는 원본 엔진의 영수증을 통해 중복 지급을 막습니다. 저장 실패 시 성공한 게임 결과를 응답하지 않습니다. APS는 최초 생성에 `if-none-match`를 지원하지 않아 최초 생성은 프로세스 내 잠금에 의존합니다. 여러 실행기에서 동시에 최초 시작하는 경우는 출시 전 추가 검증 대상입니다.

대화는 앱별 APS에 최근 24개 메시지를 저장하며, AI 요청에는 최근 12개와 실제 게임 상태를 보냅니다. AI 응답이 게임 상태를 수정하지 않습니다. 그림은 생성 URL을 그대로 저장하지 않고 APS 파일 저장소로 옮긴 후 경로만 기억합니다. 다시 열면 새 다운로드 URL을 발급받습니다. 그림 생성은 명시적으로 누를 때 한 장씩 실행하며, 생성 후 저장 실패 시 새 생성 없이 저장을 재시도합니다. 성장 단계마다 가장 최근 초상화를 표시합니다.

첫 그림은 기존 프로젝트의 종족·속성별 샘플입니다. 새 그림이 없는 진화 단계에는 처음 만났을 때의 그림임을 표시합니다. Anna 이미지 제공자의 출력은 매번 달라질 수 있으며, 원본 ComfyUI의 참조 이미지 기반 동일성 보장은 제공하지 않습니다.

## 검사

```powershell
npm run validate
npm test
npm run test:plugin
```

2026-10-09 확인: 어댑터·프로토콜 10개, UI 상태 처리 5개 통과. 실제 계정에서 친구 생성, 밥 주기, AI 대화 1회, 이미지 생성 1회, APS 이미지 업로드, 새로고침 후 세 종류의 저장 복원을 확인했습니다. 1105px/375px 화면에서 가로 넘침이 없었습니다. Windows/Linux 패키지 모두 초기화·도구 설명·친구 생성·밥 주기 검사를 수행합니다.

## 패키징 및 초안 갱신

각 대상 OS에서 패키지를 빌드합니다. Windows와 Linux는 가상환경을 공유하지 마세요. Linux에서는 `UV_PROJECT_ENVIRONMENT`를 별도 경로로 지정할 수 있습니다.

```powershell
uv run --locked --project executas/notebuddy --with pyinstaller==6.16.0 python scripts/build_executa.py
npx anna-app apps push --no-install-local --profile binary
npx anna-app apps cut <새-버전>
```

플랫폼별 아카이브는 `executas/notebuddy/dist/`에 생성됩니다. 두 OS 아카이브가 있어야 현재 배포 프로필을 올릴 수 있습니다. 파일을 Anna CDN에 직접 업로드하므로 GitHub 공개 릴리스를 만들 필요가 없습니다. 최초로 등록했던 local 프로필 0.1.0과 구분하기 위해 현재 배포 도구는 0.1.2를 사용합니다. 이후 도구 내용이 변경되면 Executa의 `executa.json`, `pyproject.toml`, `uv.lock`, `manifest.json`과 `notebuddy_plugin.py`의 `VERSION`을 함께 올리고 다시 빌드해야 합니다.

`cut`은 검토할 비공개 버전을 만듭니다. `submit-review`는 심사 제출, `release`는 공개이므로 자동 실행하지 않습니다. 심사 전 실제 Anna Agent/Cloud 설치 실행, 소개 이미지·지원 정보, 장기간 저장 크기 및 여러 실행기의 동시 사용을 확인해야 합니다. 실제 설치 초안을 Anna 대시보드에서 실행하여 생성·밥 주기·대화·그림 저장과 재접속 복원까지 확인했습니다. 세부 결과는 HANDOFF.md를 참고하세요.

GitHub Actions의 Anna 워크플로는 Windows/Linux에서 검증·테스트·독립 실행 파일 빌드와 패키지 동작 검사를 수행합니다. 게임 도구는 실제 호스트의 저장 토큰 발급을 위해 `host_capabilities: ["aps.kv"]`를 명시합니다.
