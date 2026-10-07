# 설정과 통합 실행 / Configuration and launcher

```powershell
# 최초 한 번: 예시에서 로컬 설정 생성 (기존 파일은 덮어쓰지 않음)
python -X utf8 tools/manage.py init

# 실제 적용되는 경로와 공개 설정 확인
python -X utf8 tools/manage.py config
python -X utf8 tools/manage.py doctor --comfy

# 데모 파트너 생성과 조회
python -X utf8 tools/manage.py game 123 start Buddy
python -X utf8 tools/manage.py game 123 status

# 같은 데이터 루트의 백업과 앨범
python -X utf8 tools/manage.py backup
python -X utf8 tools/manage.py doctor --backup --json
python -X utf8 tools/manage.py album 123
```

기본 설정 파일은 저장소 루트의 `notebook.local.json`이며 Git에서 제외됩니다. 기본 경로는 현재 터미널 폴더와 무관합니다. 다른 설정은 **하위 명령 앞에** `--config D:\notebuddy\notebook.local.json`을 지정합니다. 설정 안의 상대 경로는 해당 설정 파일의 폴더를 기준으로 해석합니다. 예를 들어 그 파일의 `data_root: "."`는 `D:\notebuddy`입니다.

| 설정 | 의미 / 기본값 |
| --- | --- |
| `version` | 설정 형식 `1` |
| `data_root` | 상태·접근 설정·개체 이미지·전송 기록 루트, 기본 `.` |
| `backup_root` | 자동 백업 보관 목적지, 기본 `backups` |
| `album_root` | HTML 앨범 저장 위치, 기본 `albums` |
| `comfy_url` | 기본 `http://127.0.0.1:8188` |
| `comfy_checkpoint` | `null`이면 이미지 설정의 기본 모델 사용 |
| `channel_ids` | Discord 허용 채널 ID 문자열 배열 |
| `admin_ids` | 관리자 ID 문자열 배열, 기본 없음 |
| `backup_keep_days`, `backup_keep_min` | 기본 30일·최소 7개 |

`NOTEBOOK_DATA_DIR`, `NOTEBOOK_COMFY_URL`, `NOTEBOOK_COMFY_CHECKPOINT`, `NOTEBOOK_CHANNEL_IDS`, `NOTEBOOK_ADMIN_IDS` 환경변수가 있으면 대응 설정보다 우선합니다. 이 실행기에 넘긴 상대 `NOTEBOOK_DATA_DIR`도 설정 파일 기준으로 해석하므로, 운영 서비스에서는 절대 경로를 권장합니다. `config`로 최종 경로를 확인할 수 있습니다. URL에는 인증정보를 넣지 않으며 토큰 필드를 설정 파일에 추가하면 거절합니다.

Discord 토큰은 별도 환경변수로 주입합니다. 설정 파일이나 저장소에 기록하지 않습니다. 운영자 ID·허용 채널은 실제 계정/서버 값으로 입력합니다.

```powershell
python -m pip install -r requirements-discord.txt
# DISCORD_BOT_TOKEN 환경변수를 설정하고 channel_ids를 채운 뒤 실행
python -X utf8 tools/manage.py doctor --discord --comfy
python -X utf8 tools/manage.py bot
```

| 명령 | 동작 |
| --- | --- |
| `init` | 로컬 설정 생성 |
| `config` | 적용할 설정 출력; 환경변수 전체나 토큰은 출력하지 않음 |
| `doctor [--backup] [--discord] [--comfy] [--json]` | 선택한 환경 점검 |
| `game <기존 CLI 인자...>` | 게임 엔진 실행 |
| `bot` | 독립 Discord 봇 실행 |
| `backup` | 새 백업 생성·검증·보관 정책 적용 |
| `decay` | 기존 KST 일일 방치 감소 작업 실행 |
| `render <user_id>` | 현재 파트너 이미지 준비 |
| `album <user_id>` | UTC 시각이 붙은 새 HTML 파일로 내보내기 |

같은 Python 인터프리터로 자식 도구를 실행하며 게임 코드의 위치도 절대 경로로 지정합니다. 설정 오류는 자식 실행 전에 종료합니다. 기존 도구는 독립 실행도 가능하며 통합 실행기는 사용자 인증을 대신하지 않습니다. AI 에이전트에는 기존의 바인딩된 게임 도구를 제공하세요.

종료 코드는 실행한 도구의 값을 그대로 반환합니다. 기존 게임 CLI는 게임 규칙상 거절도 종료 코드 0으로 출력할 수 있으므로 응답 JSON의 `ok`를 확인해야 합니다. 앨범 파일을 덮어쓰지 않고 새 이름을 만들며, 백업 정책과 초기화 동작도 기존 도구의 규칙을 따릅니다.

Windows 예약 도구의 기존 작업은 등록 당시 데이터·백업 경로를 사용합니다. 로컬 설정을 변경해도 이미 등록된 작업이 자동으로 바뀌지 않습니다. 작업 스케줄러에서 `manage.py --config <절대설정경로> backup`을 호출하도록 구성하면 실행 시 설정을 읽게 할 수 있습니다. 이번 설정 도구는 예약 작업을 자동 등록하거나 수정하지 않습니다.

## English

Run `python tools/manage.py init` once to create the Git-ignored `notebook.local.json` from `notebook.example.json`. Existing files are never overwritten. The default configuration is anchored to the repository, and relative paths inside it are anchored to the configuration file's directory, not the working directory. Supply `--config <path>` before the subcommand to select another deployment.

Use `config` to inspect effective settings; `doctor`, `game`, `bot`, `backup`, `decay`, `render`, and `album` share the same data root. Album exports use timestamped filenames. Existing `NOTEBOOK_DATA_DIR`, ComfyUI, channel, and administrator environment variables override matching settings. Relative data-root environment paths are also configuration-relative through this launcher. Tokens remain environment-only and are never included in `config` output.

Child commands use the current Python interpreter, absolute script paths, and the resolved environment. Install optional Discord/MCP dependencies in that same interpreter when needed. Child exit codes are preserved; game-rule errors still require checking the engine JSON's `ok` field. This is a local operator convenience tool, not an authentication layer or an unrestricted agent tool.

Existing scheduled tasks keep the paths used at registration. Changing this JSON does not rewrite them. To load settings on each scheduled run, configure the scheduler to invoke `manage.py --config <absolute-path> backup`.
