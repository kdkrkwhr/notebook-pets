# Notebook Pets · 노트버디

**한국어** · [English](README.en.md)

버전 **0.2.0**

> 공책에서 태어난 AI 친구 — Discord에서 돌보고 성장시키는 몬스터.

Notebook Pets는 **게임 규칙은 Python이 처리하고, 캐릭터의 말투와 이야기는 AI 에이전트가 표현하는** 몬스터 육성 프로젝트입니다. 먹이를 주고, 놀아주고, 산책하며 나만의 몬스터와 관계를 쌓는 경험을 목표로 합니다.

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
| 활동 | 능력치가 누적되는 훈련, 산책, HP 기반 자동전투·포획·도망 |
| 기록 | 전적, 포획 도감, 칭호, 랭킹 |
| 성장 규칙 | 레벨 31·51·81에서 단계 전환, 최고 레벨 100 |
| 최종 진화 | 친밀도 70 이상이면 빛 분기, 미만이면 어둠 분기 |
| 이미지 | 1단계 72조합 사전 생성 이미지, ComfyUI 기반 생성 도구 |

새로 생성한 대표 예시는 [assets/examples](assets/examples/README.md)에서, 기본 72조합은 `assets/samples/`에서 살펴볼 수 있습니다.

## 구조와 설계 원칙

```text
Discord 메시지
    ↓
Hermes 에이전트 / 라우팅 스킬       ← 외부 설정
    ↓ 명령과 실제 발신자 ID 전달
Python 게임 엔진
    ├─ game_data.json에서 규칙 읽기
    ├─ 상태·쿨타임·전투 판정
    └─ state/{user_id}.json 저장
    ↓ JSON 결과
에이전트가 몬스터 말투로 응답

이미지 생성 도구 → 로컬 ComfyUI → PNG 파일
```

- **규칙과 표현 분리:** 에이전트는 엔진의 결과를 바탕으로 응답하며, 게임 수치를 임의로 정하지 않는 것이 설계 원칙입니다.
- **상태는 파일에 저장:** 채팅 세션의 기억 대신 사용자별 JSON을 기준으로 삼습니다.
- **밸런스는 데이터로 관리:** 종족, 속성, 상성, 경험치 기준, 행동 제한을 `data/game_data.json`에 모았습니다.
- **캐릭터 관점으로 표현:** 연결 에이전트가 몬스터의 1인칭 말투를 담당합니다. 해당 페르소나 설정은 저장소에 포함되어 있지 않습니다.

종족 선택, 조우, 전투에는 게임 규칙에 따른 난수가 사용됩니다.

## 빠르게 살펴보기

### 요구사항

- Python 3.12에서 실행을 확인했습니다.
- 엔진과 현재 테스트는 Python 표준 라이브러리만 사용합니다. 이 경로에는 별도의 `pip install`이 필요하지 않습니다.
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
| 도감·칭호 | `pokedex` / `도감`, `titles` / `칭호` |
| 랭킹 | `python -X utf8 engine/engine.py rank` 또는 `랭킹` — ID 생략 |
| 도움말 | `python -X utf8 engine/engine.py help` 또는 `도움말` — ID 생략 |

야생 몬스터와 조우하면 전투·포획·도망으로 해결한 뒤 다시 산책할 수 있습니다. `status`로 현재 조우를 확인합니다. 자동전투는 매번 최대 HP에서 시작해 최대 20라운드 동안 진행하며, 체력·공격·방어 훈련이 반영됩니다. 동시 쓰러짐은 무승부입니다.

일일 횟수는 한국 시간(KST) 자정에 초기화되며, 수면의 경험치 보너스는 다음 날 하루 동안 적용됩니다. 출석하면 하루 한 번 일반 사료 3개를 받습니다. 소유주 제한이 설정되어 있으면 랭킹에도 허용된 사용자 ID가 필요합니다.

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

## Discord와 이미지 연결

### Discord / Hermes

이 저장소에는 독립적인 Discord 봇 애플리케이션이 없습니다. 기존 운영 방식은 Hermes 에이전트의 프로필·스킬이 명령을 받아 엔진을 실행하는 구조입니다.

다시 연결하려면 Discord 봇 설정, 발신자 식별, 명령 라우팅, 캐릭터 페르소나, 이미지 전송을 준비해야 합니다. 토큰과 관리자 권한은 외부 환경에서 관리하세요. 기존 문서는 [운영 매뉴얼](docs/MANUAL.md)과 [하네스 설명](docs/HARNESS.md)을 참고하되, 과거 로컬 경로·프로필 이름·cron ID를 그대로 현재 설정으로 간주하지 마세요.

### 이미지 생성 (선택)

기존 PNG를 사용하는 데 ComfyUI는 필요하지 않습니다. 새 이미지를 만들 때는 다음을 준비합니다.

- `http://127.0.0.1:8188`에서 실행되는 ComfyUI
- `tools/sd15_txt2img.json`이 지정한 `v1-5-pruned-emaonly.safetensors` 체크포인트 또는 워크플로우에서 직접 지정한 호환 모델

```bash
python -X utf8 tools/gen_image.py plant nature sprout samples/demo_plant.png 42
python -X utf8 tools/prerender_all.py --stage 1
```

첫 명령은 `assets/samples/demo_plant.png`에 저장합니다. 두 번째 명령은 기존 기본 이미지가 있으면 건너뜁니다. 생성 시간은 장비에 따라 다릅니다. 엔진은 생성 필요 정보나 진화 결과를 반환하지만, 이미지 도구 실행과 Discord 전송은 연결 계층의 역할입니다.

## 저장소 안내

```text
engine/engine.py           게임 CLI와 규칙 처리
data/game_data.json       밸런스 데이터
data/prompt_templates.md  이미지 프롬프트 참고 문서
state/                    사용자 세이브 (JSON은 Git 제외)
assets/samples/           기본 캐릭터 이미지와 추가 샘플
assets/samples_hd/        일부 고해상도 샘플
tools/gen_image.py        ComfyUI 이미지 생성
tools/prerender_all.py    조합별 이미지 일괄 생성
tools/preview_roll.py     종족·속성 랜덤 미리보기
tools/daily_decay.py      방치 감소 배치
tools/upscale_images.py  이미지 업스케일 도구
tests/test_engine.py      엔진 self-check
promo/index.html         정적 소개 페이지
docs/                    기존 기획·운영 문서
```

`state/`와 필요한 `data/access.json`은 배포 시 별도로 보존·백업해야 합니다.

## 검증

```bash
python -B -X utf8 tests/test_engine.py
python -B -X utf8 -m unittest discover -s tests -p "test_*.py" -v
```

종족 보너스, 경험치·진화, 수면, 접근 제어, 저장 실패, 동시 실행, 메시지 재처리, 훈련·전투 계산을 확인합니다. 테스트 데이터는 임시 파일에 저장합니다.

## 기획과 운영 문서

- [게임 기획서](docs/PLAN.md): 초기 설계와 구현 예정 기능
- [운영 매뉴얼](docs/MANUAL.md): 기존 환경의 설치·운영 기록
- [Discord 하네스](docs/HARNESS.md): 에이전트를 통한 연결 방식
- [이미지 프롬프트](data/prompt_templates.md): 종족·속성 표현 참고

운영 문서의 경로와 프로필 설정은 사용하는 환경에 맞게 조정하세요.
