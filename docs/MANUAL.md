# 공책 AI 키우기 운영 매뉴얼

> 노트북몬스터 봇 (Hermes Agent `notebook` 프로필)
> 최종 갱신: 2026-08-26

## 1. 구조 개요

```
관리자                     사용자(디스코드 유저)         봇(Hermes agent, 게임 전용 프로필)
     │  프로필 생성/봇 연동        │  !공책시작                │
     │ ───────────────────────▶ │ ──────────────────────▶ │ 엔진 판정(engine.py)
     │  역할 부여: "넌 ○○의 몬스터" │ ◀────────────────────── │ 이미지 생성(ComfyUI)
     │ ───────────────────────▶ │   속성·종족·이미지 안내    │
```

- 판정은 전부 결정론 엔진(`engine/engine.py`)이 한다. 봇(LLM)은 중계만.
- 상태는 `state/{discord_user_id}.json` 파일 하나가 진실의 원본(SoT).
- 봇 코드는 없다. 스킬(`gongchaek-monster`) + SOUL 프롬프트로 동작.

## 2. 권한 및 보안 규칙

| 번호 | 규칙 | 구현 위치 |
|---|---|---|
| 0-1 | 관리자와 지정된 사용자 외 명령 거절 | SOUL.md "허가된 유저" 섹션에 Discord ID 화이트리스트. 미등록 ID는 "!공책은 초대된 사람만 할 수 있어!" 반환 |
| 0-2 | 게임 외 작업 일체 불가 | SOUL.md 정체성 섹션. 게임 외 요청 → "!도움말 쳐봐~" 고정 거절 |

## 3. 설치 절차 (관리자)

### 3-1. 프로필 생성 및 Discord 봇 연동

```bash
# HERMES_HOME은 D:\develop\e2e\hermes 로!
export HERMES_HOME='D:\develop\e2e\hermes'
hermes profile create notebook --description "공책 AI 키우기 전용"
# ⚠ 생성 직후 반드시 실제 경로 확인: D:\develop\e2e\hermes\profiles\notebook 이 있어야 함
#    D:\d\... 같은 유령 경로가 생기면 폴더를 옮기고 profile.yaml 재확인

# Discord 개발자 포털(https://discord.com/developers/applications)에서:
#   New Application → Bot → Token 복사 → 아래 .env에 기입
#   Privileged Gateway Intents: MESSAGE CONTENT INTENT 켜기 (안 켜면 봇이 멈함)
echo 'DISCORD_BOT_TOKEN=여기에_토큰' >> /d/develop/e2e/hermes/profiles/notebook/.env

# 게이트웨이 기동 (봇 온라인)
hermes gateway start -p notebook
# 끌 때: hermes gateway stop -p notebook
```

### 3-2. 사용자 등록 (역할 부여)

`D:\develop\e2e\hermes\profiles\notebook\SOUL.md`의 "허가된 유저" 목록에 추가:

```
- 허가된 유저(Discord 숫자 ID):
  - 123456789012345678 : 김철수
  - 987654321098765432 : 이영희
```

그리고 첫 안내 메시지를 보낼 때 소유 관계를 지정한다:

> "넌 123456789012345678(김철수) 이 사람의 몬스터야.
> 노트북 몬스터 repo(`D:\develop\project\notebook-monster`) 읽고 세팅 진행해."

→ 봇이 gongchaek-monster 스킬을 읽고 세팅을 끝낸다.

### 3-3. 의존 서비스

| 서비스 | 필요 시점 | 기동법 |
|---|---|---|
| ComfyUI (:8188) | 이미지 생성 시 | `cd /d/develop/e2e/ComfyUI && env -u PYTHONPATH -u PYTHONHOME .venv/Scripts/python.exe main.py --cpu --port 8188 &` |
| 방치 감소 cron | 항상 | 자동 등록됨(job d9e980f08c43, 매일 04:00). 수동 실행: `python tools/daily_decay.py` |

CPU 모드라 이미지 한 장 약 5분. 재부팅 후엔 ComfyUI 수동 기동 필요(스킬에 자동 기동 로직 있음).

## 4. 플레이 시나리오 (검증됨 ✅)

| 단계 | 행위자 | 내용 | 실측 결과 |
|---|---|---|---|
| 1-3 | 사용자 | 봇 멘션 + `!공책시작` | user_id=Discord ID로 state 생성 |
| 1-4 | 봇 | 종족×속성 랜덤 선택 후 알림, 이름 요청 | 예: 괴수족×어둠 |
| 1-5 | 사용자 | 이름 부여 (`!공책시작 홍실록`) | state에 name 기록 |
| 1-6 | 봇 | 이름·종족·속성으로 이미지 생성 후 전달 | ComfyUI SD1.5, ~5분, 1024px 업스케일 |

⚠ 현재 엔진은 `!공책시작 <이름>` 한 번에 다 받는다. 1-4(이름 먼저 묻기) 흐름은 봇의 스킬이 처리한다:
이름 없이 `!공책시작`만 오면 봇이 종족·속성을 뽑아 미리보기하고 이름을 묻는다(스킬 §1 참조).

### 커맨드 전체표

| 커맨드 | 효과 | 제한 |
|---|---|---|
| `!공책시작 <이름>` | 몬스터 생성(종족 9×속성 8 랜덤) | 유저당 1회 |
| `!상태` | 스탯·레벨·전적·포만감 조회 | 무제한 |
| `!밥줘` | 포만감+30, XP+10 | 1시간 쿨타임 |
| `!간식줘` | 사료 인벤토리 소비, 친밀도 증가 | 하루 제한 |
| `!놀아줘` | 친밀도+20 (진화 분기 영향) | 1시간 쿨타임 |
| `!재워줘` / `!잘자` | 수면 버프 | 하루 1회 |
| `!훈련` | 스탯 성장, XP+40 | 하루 3회 |
| `!산책` | XP 획득, 30% 확률 야생 조우 | 하루 5회 |
| `!배틀` | 야생몬과 전투(속성 상성 반영) | 하루 5회 |
| `!포획` | 조우한 야생몬 포획 → 도감 | 조우당 1회 |
| `!출석` | 출석 보상 | 하루 1회 |
| `!도감` | 포획한 몬스터 목록 | 무제한 |
| `!랭킹` | 전체 유저 랭킹 | 무제한 |
| `!도움말` | 커맨드 안내 | 무제한 |

### 진화 시스템

- 레벨 30/50/81 도달 시 새싹기→성장기→성숙기→완전체
- 완전체는 **친밀도 70** 기준으로 빛(70↑)/어둠(~70) 분기
- 진화마다 새 이미지 자동 생성 → 도감에 누적

## 5. 데이터 저장 위치

| 데이터 | 경로 |
|---|---|
| 유저별 몬스터 상태 | `project/notebook-monster/state/{discord_id}.json` |
| 생성된 이미지 | `project/notebook-monster/assets/samples/` |
| 게임 밸런스 | `project/notebook-monster/data/game_data.json` |
| 봇 페르소나 | `hermes/profiles/notebook/SOUL.md` |
| 라우팅 스킬 | `hermes/profiles/notebook/skills/gongchaek-monster/SKILL.md` |

백업은 위 5개 경로만 하면 된다.

## 6. 장애 대응

| 증상 | 원인 | 조치 |
|---|---|---|
| 봇 무반응 | gateway stopped 또는 Message Content Intent off | `hermes gateway status -p notebook` → start, 인텐트 확인 |
| 이미지 타임아웃 | ComfyUI 중단 또는 CPU 과부하 | :8188/system_stats 확인 → 서버 재기동 |
| KeyError/Traceback | state 스키마 불일치 | 해당 state 파일 삭제 후 `!공책시작` 재진행(초기화) |
| 한글 깨짐 | UTF-8 미지정 | python 실행 시 `-X utf8` 플래그 확인 |

## 7. 알려진 제약

- CPU 이미지 생성이라 진화 이미지까지 최대 5~13분. 봇이 "만들고 올게" 선답 후 나중에 전달하는 흐름.
- 봇 세션(Hermes gateway)이 살아있어야 커맨드 처리됨. 서버 재부팅 시 gateway + ComfyUI 재기동 필요.
- 현재 1인 1몬스터. 닉네임 변경과 무관하게 Discord ID 기준으로 판별.
