# Notebook Pets · 노트버디

**한국어** · [English](README.en.md)

버전 **0.2.0**

> 공책에서 태어난 AI 친구 — Discord에서 돌보고 성장시키는 몬스터.

Notebook Pets는 **게임 규칙은 Python이 처리하고, 캐릭터의 말투와 이야기는 AI 에이전트가 표현하는** 몬스터 육성 프로젝트입니다. 먹이를 주고, 놀아주고, 산책하며 나만의 몬스터와 관계를 쌓습니다. Hermes를 비롯한 AI 에이전트에 공통 Python 도구 또는 MCP로 연결할 수 있으며, 독립 Discord 게이트웨이도 제공합니다.

저장소 이름은 `notebook-pets`, 서비스 이름은 **노트버디(notebuddy)**입니다.

<p align="center">
  <img src="assets/examples/plant_nature_stage1.png" width="160" alt="자연 속성 식물족 몬스터">
  <img src="assets/examples/machine_fire_stage1.png" width="160" alt="불 속성 기계족 몬스터">
  <img src="assets/examples/ghost_wind_stage1.png" width="160" alt="바람 속성 유령족 몬스터">
  <img src="assets/examples/dragon_light_stage4.png" width="160" alt="빛 속성 용족 완전체">
</p>

## 게임 구성

| 영역 | 내용 |
| --- | --- |
| 몬스터 | 9종족 × 8속성, 총 72가지 기본 조합 |
| 돌보기 | 먹이, 간식, 놀이, 수면과 친밀도·포만감 |
| 일일 퀘스트 | 먹이 1회·훈련 2회·산책 1회 달성 후 보상 수령 |
| 활동 | 능력치가 누적되는 훈련, 산책, HP 기반 자동전투·포획·도망 |
| 기록 | 전적, 포획 도감, 칭호, 랭킹 |
| 성장 규칙 | 레벨 31·51·81에서 단계 전환, 최고 레벨 100 |
| 최종 진화 | 친밀도 70 이상이면 빛 분기, 미만이면 어둠 분기 |
| 이미지 | 로컬 ComfyUI·IP-Adapter 기반 개체별 이미지와 단계별 진화 |
| 에이전트 연결 | 공통 Python 도구 호출, stdio MCP, Discord 게이트웨이 |

대표 캐릭터는 [예시 이미지](assets/examples/README.md), 식물·기계·유령·용의 성장과 빛·어둠 분기는 [진화 갤러리](assets/anchored_evolution/index.html)에서 살펴볼 수 있습니다. `assets/samples/`에는 기존 72조합 이미지가 보관되어 있습니다.

## 구조와 설계 원칙

```text
사용자 메시지 → 연결 호스트가 실제 사용자·이벤트 식별
    ├─ AI 에이전트 → 공통 Python 도구 / stdio MCP
    └─ 독립 Discord 게이트웨이 → 명령 처리
                        ↓
                 Python 게임 엔진
    ├─ game_data.json 기반 성장·전투·행동 판정
    ├─ 접근 제어·파일 잠금·중복 요청 처리
    └─ state/{user_id}.json에 결과와 처리 기록 저장
                        ↓
                 JSON 결과 → 응답

이미지 요청 → ImageService → 로컬 ComfyUI·IP-Adapter
                         → 개체별 캐시 → 호스트가 이미지 전달
```

- **규칙과 표현 분리:** 에이전트는 엔진의 결과를 바탕으로 응답하며, 게임 수치를 임의로 정하지 않는 것이 설계 원칙입니다.
- **상태는 파일에 저장:** 채팅 세션의 기억 대신 사용자별 JSON을 기준으로 삼습니다.
- **밸런스는 데이터로 관리:** 종족, 속성, 상성, 경험치 기준, 행동 제한을 `data/game_data.json`에 모았습니다.
- **에이전트 교체 가능:** 모델에 노출하는 인자는 명령과 명령 인자뿐입니다. 사용자·이벤트 ID는 연결 호스트가 지정하고, 모델을 바꿔 재시도해도 같은 처리 기록을 사용합니다.
- **게임 저장과 이미지 생성 분리:** 이미지 생성 실패가 이미 저장된 경험치나 진화를 되돌리지 않습니다. 에이전트 말투 지침 예시는 [연결 안내](docs/AGENT_INTEGRATION.md)에 있습니다.

종족 선택, 조우, 전투에는 게임 규칙에 따른 난수가 사용됩니다.

## 빠르게 살펴보기

### 요구사항

- Python 3.12에서 실행을 확인했습니다.
- 엔진·공통 Python 연결부·기본 테스트는 표준 라이브러리만 사용합니다. MCP에는 `requirements-mcp.txt`, Discord 게이트웨이에는 `requirements-discord.txt`를 별도로 설치합니다.
- 기본 CLI 확인에는 Discord, Hermes, ComfyUI, LLM API 키가 필요하지 않습니다.

저장소 루트에서 실행합니다.

```bash
git clone https://github.com/kdkrkwhr/notebook-pets.git
cd notebook-pets

# 도움말: 사용자 ID 없이 실행
python -X utf8 engine/engine.py help

# 데모 사용자 생성: state/123456789012345678.json에 저장됨
python -X utf8 engine/engine.py 123456789012345678 start Buddy
python -X utf8 engine/engine.py 123456789012345678 status
python -X utf8 engine/engine.py 123456789012345678 밥줘
python -X utf8 engine/engine.py 123456789012345678 walk

# 랭킹도 사용자 ID 없이 실행
python -X utf8 engine/engine.py rank
```

같은 ID로 다시 시작하면 기존 몬스터가 있다는 응답을 반환합니다. 데모 실행도 상태 파일을 만들고 변경하므로 실제 사용자 ID와 구분하세요. 같은 저장소를 사용하는 명령과 방치 배치는 파일 잠금으로 순서대로 처리됩니다.

정상 처리 및 처리된 게임 오류는 `ok`, `msg`를 포함한 JSON으로 출력합니다. 메시지는 현재 한국어이며, JSON 필드는 명령마다 달라집니다.

## 명령어

일반 형식은 다음과 같습니다. Discord의 `!` 접두사는 엔진에 직접 넣지 않습니다.

```text
python -X utf8 engine/engine.py <user_id> <command> [arguments...]
```

| 기능 | CLI 명령 / 별칭 |
| --- | --- |
| 시작 | `start <이름>` / `공책시작 <이름>` |
| 상태 | `status` / `상태` |
| 먹이·간식 | `feed` / `밥줘`, `snack` / `간식줘` |
| 놀이·수면 | `play` / `놀아줘`, `sleep` / `재워줘` / `잘자` |
| 훈련·산책 | `train` / `훈련`, `walk` / `산책` |
| 전투·포획·도망 | `battle` / `배틀`, `catch` / `포획`, `flee` / `도망` |
| 출석 (경험치 + 일반 사료 3개) | `attendance` / `출석` |
| 퀘스트 조회 / 보상 수령 | `quests` / `퀘스트` / `일일퀘스트`, `claimquest` / `퀘스트보상` |
| 도감·칭호 | `pokedex` / `도감`, `titles` / `칭호` |
| 랭킹 | `python -X utf8 engine/engine.py rank` 또는 `랭킹` — ID 생략 |
| 도움말 | `python -X utf8 engine/engine.py help` 또는 `도움말` — ID 생략 |

야생 몬스터와 조우하면 전투·포획·도망으로 해결한 뒤 다시 산책할 수 있습니다. `status`로 현재 조우를 확인합니다. 자동전투는 매번 최대 HP에서 시작해 최대 20라운드 동안 진행하며, 체력·공격·방어 훈련이 반영됩니다. 동시 쓰러짐은 무승부입니다.

일일 횟수는 한국 시간(KST) 자정에 초기화되며, 수면의 경험치 보너스는 다음 날 하루 동안 적용됩니다. 출석하면 하루 한 번 일반 사료 3개를 받습니다. 소유주 제한이 설정되어 있으면 랭킹에도 허용된 사용자 ID가 필요합니다.

### 일일 퀘스트

`quests`로 오늘의 진행도를 보고, 먹이 1회·훈련 2회·산책 1회를 모두 완료한 뒤 `claimquest`로 **기본 경험치 30 + 맛있는 사료 1개**를 받습니다. Discord에서는 `!퀘스트`, `!퀘스트보상`을 사용합니다. 상태 조회와 목표 행동 응답에도 진행도가 표시됩니다.

성공한 행동만 집계하며, 보상은 하루 한 번 받습니다. 진행도와 수령 여부는 KST 자정 기준으로 초기화되고 전날의 미수령 보상은 이월되지 않습니다. 경험치에는 기존 수면 보너스·레벨 상한·진화 규칙이 적용됩니다. 목표와 보상은 `data/game_data.json`의 `daily_quest`에서 관리합니다.

### 관리자와 소유주 설정

관리자 ID는 `NOTEBOOK_ADMIN_IDS` 환경변수에 쉼표로 구분해 지정합니다. 기본값은 관리자 없음입니다.

```powershell
# PowerShell 예시 — 실제 관리자 Discord ID로 변경
$env:NOTEBOOK_ADMIN_IDS = "123456789012345678"
python -X utf8 engine/engine.py 123456789012345678 owner 987654321098765432 Player
python -X utf8 engine/engine.py 123456789012345678 clearowner
```

- `owner <대상ID> [이름]`: **이 배포 전체**를 지정 소유주와 관리자만 사용하도록 제한합니다. 사용자별 몬스터 소유권 설정과는 다릅니다.
- `clearowner`: 소유주 제한을 해제합니다.
- `reset <대상ID> [새이름]`: 대상의 기존 세이브를 삭제합니다. 새 이름이 2자 이상이면 새 몬스터를 생성합니다.

설정은 Git에서 제외된 `data/access.json`에 저장됩니다. 일반 CLI에는 사용자 인증이 없으므로 연결 계층이 실제 발신자 ID를 전달해야 합니다. ID는 1~20자리 양의 정수 문자열로 검증합니다. 에이전트 연결과 저장 경로 설정은 [런타임 연동 안내](docs/INTEGRATION.md)를 참고하세요.

## 에이전트와 Discord 연결

| 연결 방식 | 용도 |
| --- | --- |
| Python 도구 호출 | 자체 에이전트·Hermes 등 호스트에 게임 도구 등록 |
| stdio MCP | MCP 호스트에서 상태 조회, 이벤트별 게이트웨이를 통한 게임 조작 |
| 독립 Discord 봇 | AI 에이전트 없이 명령 처리와 이미지 응답 |

### 공통 Python 도구

호스트의 Python 모듈 검색 경로에 `engine/`을 추가한 뒤 사용합니다. 아래 ID는 예시이며, 실제 값은 인증된 메시지 메타데이터에서 가져옵니다.

```python
from adapter import bind_game_event, dispatch_tool, tool_definition

game = bind_game_event(actor_id="123", event_id="discord:456")
definition = tool_definition()  # 호스트 SDK에 맞춰 도구 등록
result = dispatch_tool(game, {"command": "feed", "arguments": []})
```

같은 이벤트의 조작을 재시도하면 저장된 결과를 반환합니다. 이미 조작한 이벤트로 다른 조작을 요청하면 거절하고, 상태 조회는 계속 허용합니다. 관리자 명령은 에이전트 도구에서 제외됩니다.

### MCP

```bash
python -m pip install -r requirements-mcp.txt
```

MCP 호스트에서 `tools/mcp_server.py`를 stdio 서버로 실행하고 `NOTEBOOK_ACTOR_ID`와 `NOTEBOOK_DATA_DIR`를 지정합니다. **상시 연결은 조회 전용**입니다. 게임 조작은 신뢰할 수 있는 게이트웨이가 사용자 메시지별로 `NOTEBOOK_EVENT_ID`를 전달하는 방식이며, 상시 설정에 고정 이벤트 ID를 넣지 않습니다. MCP 도구는 게임 JSON을 반환하고 이미지 생성·전송은 호스트가 담당합니다.

설정 JSON과 요청별 연결 방식은 [AI 에이전트 연결 안내](docs/AGENT_INTEGRATION.md)에 있습니다.

### Discord 봇

`tools/discord_bot.py`는 게임 결과를 먼저 응답한 뒤 같은 메시지에 생성 이미지를 첨부합니다. 봇 토큰·허용 채널과 로컬 이미지 서버 설정은 [이미지·Discord 연결 안내](docs/IMAGES.md)를 참고하세요. Hermes 등 외부 에이전트도 공통 연결부를 통해 같은 엔진을 사용할 수 있습니다.

### 이미지 생성 (선택)

기존 PNG를 사용하는 데 ComfyUI는 필요하지 않습니다. 새 이미지를 만들 때는 다음을 준비합니다.

- `http://127.0.0.1:8188`에서 실행되는 ComfyUI
- `DreamShaper_8_pruned.safetensors` 체크포인트
- `ComfyUI_IPAdapter_plus` 노드와 IP-Adapter Plus·CLIP Vision 모델 — [설치 안내](docs/IMAGES.md)

```bash
python -X utf8 tools/gen_image.py plant nature sprout samples/demo_plant.png 42
python -X utf8 tools/prerender_all.py --stage 1
```

첫 명령은 `assets/samples/demo_plant.png`에 저장합니다. 두 번째 명령은 기존 기본 이미지가 있으면 건너뜁니다. 봇과 CLI는 `data/image_prompts.json`의 공통 프롬프트를 사용합니다. 진화 시 직전 단계 이미지는 형태의 출발점으로, 최초 1단계 이미지는 그림체·캐릭터 참조로 사용합니다. 두 최종 분기는 같은 3단계에서 출발합니다. 생성한 이미지는 개체별로 저장하고 다시 사용합니다. 서버 점검은 `python tools/check_images.py`, 기존 펫 이미지 생성은 `python tools/render_pet.py <user_id>`로 실행합니다.

식물·기계·유령·용의 성장 단계와 최종 빛·어둠 분기는 [진화 이미지 비교 갤러리](assets/anchored_evolution/index.html)에서 볼 수 있습니다. 최초 모습의 그림체를 참조하면서 성숙기부터 체형이 성장하도록 생성합니다. HTML을 로컬에서 열면 종족별 필터와 확대 보기를 사용할 수 있습니다.

## 저장소 안내

```text
engine/engine.py           게임 CLI와 규칙 처리
engine/adapter.py          에이전트 공통 도구·사용자/이벤트 바인딩
engine/image_service.py    개체별 이미지 생성·캐시
tools/mcp_server.py        stdio MCP 서버
tools/discord_bot.py       독립 Discord 게이트웨이
data/image_prompts.json   공통 이미지 프롬프트·참조 설정
assets/anchored_evolution/ 성장 단계·최종 분기 갤러리
data/game_data.json       밸런스 데이터
data/prompt_templates.md  이미지 프롬프트 참고 문서
state/                    사용자 세이브 (JSON은 Git 제외)
assets/samples/           기본 캐릭터 이미지와 추가 샘플
assets/samples_hd/        일부 고해상도 샘플
tools/gen_image.py        ComfyUI 이미지 생성
tools/prerender_all.py    조합별 이미지 일괄 생성
tools/preview_roll.py     종족·속성 랜덤 미리보기
tools/daily_decay.py      방치 감소 배치
tools/backup_store.py     세이브 백업·검증·새 데이터 루트 복구
tools/daily_backup.py     자동 백업 실행·검증·보관 정책
tools/register_backup_task.ps1 Windows 일일 백업 예약
tools/upscale_images.py  이미지 업스케일 도구
tests/test_engine.py      엔진 self-check
promo/index.html         정적 소개 페이지
docs/                    에이전트·이미지·운영 연결 안내
```

`python -X utf8 tools/backup_store.py create --output backups/save.json`으로 세이브·퀘스트 수령 기록·메시지 처리 기록과 접근 설정을 함께 백업할 수 있습니다. `verify backups/save.json`으로 검증하고, `restore backups/save.json --target <새폴더>`로 복구합니다. 기존 데이터 폴더는 덮어쓰지 않습니다. 이미지 별도 보관과 운영 경로 전환은 [백업·복구 안내](docs/BACKUP.md)를 참고하세요.

정기 실행에는 `tools/daily_backup.py --destination backups`를 사용합니다. 새 백업을 검증한 뒤 기본 30일·최소 최신 7개를 보관하며, 수동 백업은 정리하지 않습니다. Windows 예약 도구는 설정 미리보기와 `-Register` 등록을 지원합니다.

## 검증

```bash
python -B -X utf8 tests/test_engine.py
python -B -X utf8 -m unittest discover -s tests -p "test_*.py" -v
```

종족 보너스, 경험치·진화, 수면, 접근 제어, 저장 실패, 동시 실행, 메시지 재처리, 전투, 이미지 파이프라인과 에이전트 연결을 확인합니다. 테스트 데이터는 임시 파일에 저장합니다.

`requirements-mcp.txt`를 설치하면 실제 stdio 클라이언트·서버 통신 테스트도 실행됩니다. 미설치 시 해당 테스트만 건너뜁니다. 현재 검증 결과는 **unittest 120개 + 엔진 self-check 8개 통과**이며, 외부 LLM 계정 없이 실행합니다. 백업·복구 검증에는 동시 저장 잠금, 파일 손상, 복구 후 중복 요청 재처리, 보관 정책과 작업 중단 후 재실행도 포함합니다.

## 문서

- [백업·복구](docs/BACKUP.md): 세이브 스냅샷·검증·새 데이터 루트 복구

- [AI 에이전트 연결](docs/AGENT_INTEGRATION.md): Python 도구·MCP 설정과 호출 지침
- [런타임 연동](docs/INTEGRATION.md): 사용자 식별·중복 처리·저장 규칙
- [이미지·Discord 연결](docs/IMAGES.md): ComfyUI와 봇 실행
- [진화 갤러리](assets/anchored_evolution/index.html): 대표 네 종족의 성장 단계 비교
- [밸런스 보고서](docs/BALANCE_REPORT.md): 전투·성장 시뮬레이션
