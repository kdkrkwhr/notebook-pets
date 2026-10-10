# Notebuddy · Anna edition

**한국어** · [English](README.en.md)

Notebook Pets의 원본 Python 규칙을 사용하는 Anna 앱입니다. 기존 Discord 프로젝트와 세이브는 변경하지 않습니다.

- 앱: `@kdkrkwhr/notebuddy` (ID 450)
- [개발자 콘솔](https://anna.partners/developer?app=450)
- 이번 후보: 앱 **0.2.5** / 게임 도구 **0.1.13**. 실제 업로드·설치 결과는 [배포 검증 기록](INCREMENTAL_RELEASE.md)을 확인하세요.
- 상태: **심사 대기 (pending_review)**. 2026-10-09 앱 **0.2.1** 제출 완료. 승인·공개 완료를 뜻하지 않습니다. [접수 및 검증 기록](HANDOFF.md)
- 다음 작업은 [HANDOFF.md](HANDOFF.md)에 기록했습니다.

## 직접 그린 친구

처음 만날 때 랜덤 또는 「내 그림으로 만나기」를 선택합니다. 그림 모드는 캔버스에서 직접 그리기만 지원하며 사진·파일 업로드는 제공하지 않습니다. 「만나기」를 누르면 AI가 그림을 확인하고 무작위 종족·속성을 적용해 유년기 모습을 생성합니다. 확인과 생성 모두 Anna 사용량을 사용합니다. 생성 실패 시 같은 친구로 재시도할 수 있습니다.

## 언어

처음 열면 영어로 표시됩니다. 상단의 English / 한국어 선택으로 화면·게임 결과·퀘스트·앨범·오류 안내와 새 AI 답변의 언어를 바꿀 수 있습니다. 선택은 해당 브라우저에 저장됩니다. 브라우저 저장을 사용할 수 없으면 현재 창에만 적용되고, 새로 열 때는 영어로 시작합니다.

파트너 이름과 기존 대화는 번역하거나 바꾸지 않습니다. 일일 퀘스트 초기화는 언어와 무관하게 한국 시간 자정(UTC+9)입니다. 언어 변경은 상태 조회만 실행하며, 행동 재시도의 요청 ID와 저장 영수증을 유지합니다.

UI 문구는 `bundle/i18n.mjs`, 엔진 응답의 표현은 `executas/notebuddy/localization.py`에서 관리합니다. Anna 도구는 선택 인자 `language: "en" | "ko"`를 받으며 기본은 `en`입니다. 게임 규칙·기존 세이브·Discord 응답은 변경하지 않습니다.

## 새 친구로 초기화

게임 화면의 「새로 시작…」에서 확인란과 `RESET NOTEBUDDY` 문구로 기존 데이터 정리를 확인합니다. 정리가 끝나면 처음 만나기 화면으로 돌아가 이름과 랜덤·직접 그리기를 선택합니다. 초기화만으로 새 펫이나 AI 그림을 만들지 않습니다. 다른 기기의 창과 진행 중인 요청을 종료한 뒤 실행하세요. 중단되면 정리를 이어갈 수 있으며, 삭제된 기록은 복구하지 않습니다.

## 전투와 성장

돌봄 결과는 행동 버튼 아래에 표시됩니다. 일반 AI 채팅은 기존대로 사용할 수 있습니다. 성공한 돌봄 뒤에는 Anna AI 사용량으로 친구가 반응합니다. 답장에 실패해도 돌봄 결과는 유지됩니다.

산책 중 조우하면 상대 그림을 보여 주고, 전투 후에는 서버에서 확정한 체력 변화를 2D 화면으로 재생합니다. 건너뛰기·동작 줄이기를 지원하며, 전투를 다시 실행하거나 추가 보상을 주지 않습니다.

성장 단계는 **Lv1 / 10 / 30 / 50**, 최고 레벨은 100입니다. 레벨별 필요 경험치는 유지합니다. 기존 저장은 펫·경험치·그림을 유지한 채 새 기준으로 전환됩니다. 성장한 개인 그림은 직접 생성 버튼을 눌러야 합니다.

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
| `bundle/` | 영어 기본·한국어 선택 반응형 화면, AI 대화, 돌봄, 퀘스트, 앨범 |
| `executas/notebuddy/notebuddy_plugin.py` | Executa v2 JSON-RPC와 사용자별 APS 연결 |
| `executas/notebuddy/game_worker.py` | 격리된 임시 세이브에서 기존 Python 엔진 실행 |
| `scripts/prepare_assets.py` | 원본 규칙·데이터 및 캐릭터 그림 복사 |
| `scripts/build_executa.py` | Windows/Linux 독립 실행 파일 생성 및 동작 확인 |

게임 상태는 APS `tool` 범위의 `notebuddy/game-v1`에 저장합니다. 실제 사용자 분리는 Anna의 인증된 저장소가 담당합니다. 엔진의 내부 사용자 번호 `1`은 이미 분리된 사용자별 저장소 안에서만 사용됩니다. 도구 인자로 다른 사용자나 게임 상태를 지정할 수 없습니다. 관리자·리셋·전체 순위 명령도 노출하지 않습니다.

기존 저장은 ETag 조건부 쓰기로 갱신합니다. 충돌하면 새 저장을 읽고 재계산합니다. 새 행동은 응답의 `request_id_prefix`에 고유 문자열을 붙인 요청 ID를 사용하고, 재시도는 전체 ID를 그대로 재사용합니다. 최근 결과는 최대 64개·24KiB, 전체 게임 문서는 48KiB 이내로 제한합니다. 기록이 정리된 요청은 순번으로 재실행을 막습니다. 기존 저장은 다음 정상 요청에서 새 형식으로 이행하며, 이후 구버전 도구는 쓰기가 차단됩니다. 자세한 내용은 [STORAGE_POLICY.md](STORAGE_POLICY.md)를 참고하세요. 저장 실패 시 성공한 게임 결과를 응답하지 않습니다. 최초 생성 후보를 계산한 후 저장소를 다시 읽어, 그동안 다른 실행기가 만든 파트너가 있으면 후보를 버리고 기존 파트너를 불러옵니다. 다만 APS는 원자적 최초 생성을 지원하지 않아 최종 조회와 쓰기 사이의 경합은 남습니다. 여러 실행기의 동시 최초 생성은 Anna 지원 확인까지 출시 차단 항목으로 유지합니다. 근거·오프라인 재현·해결 조건은 [FIRST_CREATION.md](FIRST_CREATION.md)에 기록했습니다.

대화는 앱별 APS에 최근 24개 메시지를 저장하며, AI 요청에는 최근 12개와 실제 게임 상태를 보냅니다. AI 응답이 게임 상태를 수정하지 않습니다. 그림은 생성 URL을 그대로 저장하지 않고 APS 파일 저장소로 옮긴 후 경로만 기억합니다. 다시 열면 새 다운로드 URL을 발급받습니다. 그림 생성은 명시적으로 누를 때 한 장씩 실행하며, 생성 후 저장 실패 시 새 생성 없이 저장을 재시도합니다. 성장 단계마다 가장 최근 초상화를 표시합니다.

첫 그림은 기존 프로젝트의 종족·속성별 샘플입니다. 새 그림이 없는 진화 단계에는 처음 만났을 때의 그림임을 표시합니다. Anna 이미지 제공자의 출력은 매번 달라질 수 있으며, 원본 ComfyUI의 참조 이미지 기반 동일성 보장은 제공하지 않습니다.

## 검사

```powershell
npm run validate
npm test
npm run test:plugin
```

2026-10-09 기능 검증: Anna 도구 47개, UI 상태 31개, 격리 브라우저 18개와 strict 검사를 통과했습니다. 전투·반응 자동 테스트는 실제 계정이나 유료 AI를 호출하지 않습니다. 이전 실제 계정 검증과 최신 배포 결과는 [HANDOFF.md](HANDOFF.md), 저장 전환과 성장 시뮬레이션은 [INTERACTIONS.md](INTERACTIONS.md)를 참고하세요.

## 패키징 및 초안 갱신

각 대상 OS에서 패키지를 빌드합니다. Windows와 Linux는 가상환경을 공유하지 마세요. Linux에서는 `UV_PROJECT_ENVIRONMENT`를 별도 경로로 지정할 수 있습니다.

```powershell
uv run --locked --project executas/notebuddy --with pyinstaller==6.16.0 python scripts/build_executa.py
npx anna-app apps push --no-install-local --profile binary
npx anna-app apps cut <새-버전>
```

플랫폼별 아카이브는 `executas/notebuddy/dist/`에 생성됩니다. 두 OS 아카이브가 있어야 현재 배포 프로필을 올릴 수 있습니다. 파일을 Anna CDN에 직접 업로드하므로 GitHub 공개 릴리스를 만들 필요가 없습니다. 최초로 등록했던 local 프로필 0.1.0과 구분하기 위해 현재 도구 버전은 0.1.9입니다. 이후 도구 내용이 변경되면 Executa의 `executa.json`, `pyproject.toml`, `uv.lock`, `manifest.json`과 `notebuddy_plugin.py`의 `VERSION`을 함께 올리고 다시 빌드해야 합니다.

`cut`은 검토할 비공개 버전을 만듭니다. `submit-review`는 심사 제출, `release`는 공개이므로 자동 실행하지 않습니다. 심사 전 실제 Anna Agent/Cloud 설치 실행, 소개 이미지·지원 정보, 장기간 저장 크기 및 여러 실행기의 동시 사용을 확인해야 합니다. 실제 설치 초안을 Anna 대시보드에서 실행하여 생성·밥 주기·대화·그림 저장과 재접속 복원까지 확인했습니다. 세부 결과는 HANDOFF.md를 참고하세요.

GitHub Actions의 Anna 워크플로는 Windows/Linux에서 검증·테스트·독립 실행 파일 빌드와 패키지 동작 검사를 수행합니다. 게임 도구는 실제 호스트의 저장 토큰 발급을 위해 `host_capabilities: ["aps.kv"]`를 명시합니다.
