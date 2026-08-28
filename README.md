# 노트버디 (notebuddy)

> 공책에서 태어난 AI 친구 — Discord 몬스터 육성 게임
> *(GitHub repo `notebuddy`, 로컬 개발 코드네임 `notebook-monster`)*

Discord에서 키우는 디지몬풍 몬스터 육성 게임. **판정은 결정론 엔진, 서사는 AI 에이전트**가 담당한다.

```
Discord "!밥줘"  →  게임 엔진(Python) 판정  →  JSON 결과  →  봇이 몬스터 말투로 중계
"냥~ 배불러! 🍚"
```

## 특징

- 🎲 **결정론 엔진**: 스탯·쿨타임·전투 판정은 전부 Python이 계산. LLM은 개입하지 않음 (조작 불가)
- 📁 **파일 SoT**: 유저 상태는 `state/{user_id}.json` 파일 하나로 관리, DB 불필요
- 🧬 **9종족 × 8속성**: 조합 72가지 + 속성 상성 시스템
- 🌱 **4단계 진화**: 새싹기 → 성장기 → 성숙기 → 완전체 (친밀도에 따라 빛/어둠 분기)
- 🎨 **AI 이미지 생성**: 탄생·진화 시 ComfyUI(SD1.5)로 캐릭터 이미지 자동 생성

## 구조

```
data/game_data.json        종족/속성/상성/XP곡선/커맨드 수치 (게임 밸런스 SoT)
engine/engine.py           결정론 게임 엔진 (CLI, 단일 JSON 출력)
tools/gen_image.py         ComfyUI 이미지 생성 래퍼
tools/prerender_all.py     종족×속성 전조합 이미지 프리렌더 배치
tools/daily_decay.py       방치 페널티 배치 (cron용)
tools/preview_roll.py      종족/속성 랜덤 미리보기
tests/test_engine.py       엔진 로직 self-check (python -X utf8 tests/test_engine.py)
docs/MANUAL.md             운영 매뉴얼 (설치/권한/시나리오/장애대응)
docs/HARNESS.md            Discord 연결 하네스 설계 (프롬프트 라우팅 방식)
docs/PLAN.md               게임 기획서
assets/samples/            생성된 몬스터 이미지 (프리렌더 캐시)
state/                     유저 상태 파일 (gitignore — 커밋 안 됨)
```

## 사용법

```bash
python engine/engine.py <user_id> <커맨드> [args...]

# 예시
python engine/engine.py 123456789012345678 공책시작 홍실록
python engine/engine.py 123456789012345678 상태
python engine/engine.py 123456789012345678 밥줘
python engine/engine.py <관리자ID> reset <대상ID> 새이름   # 관리자 전용 초기화
```

출력은 항상 단일 JSON:

```json
{"ok": true, "msg": "홍실록 탄생!", "species": "요정족", "element": "빛", "level": 1}
```

## 커맨드

| 분류 | 커맨드 |
|---|---|
| 시작 | 공책시작 <이름> |
| 조회 | 상태 / 도감 / 칭호 / 랭킹 / 도움말 |
| 돌보기 | 밥줘 / 간식줘 / 놀아줘 / 재워줘 |
| 성장 | 훈련 / 산책 |
| 전투 | 배틀 / 포획 (산책으로 야생 조우 후) |
| 기타 | 출석 / 리셋(관리자 전용) |

## Discord 봇 운영

별도 봇 코드 없이 **Hermes Agent 프로필이 라우터**가 되는 구조다.
설치 절차·권한 관리·장애 대응은 [docs/MANUAL.md](docs/MANUAL.md) 참고.

- 판정(스탯·쿨타임·전투) = 엔진(Python) 100%
- 서사·말투·중계 = 에이전트(LLM) — 종족×속성별 고정 말투로 연기
- 이미지 = 로컬 ComfyUI (:8188)

## 원칙

1. **엔진과 에이전트의 경계를 섞지 않는다** — 판정 조작 방지
2. **상태는 파일 SoT** — 세션 컨텍스트에 게임 상태를 두지 않는다
3. **봇은 항상 몬스터 1인칭** — 내레이션 금지, 과정 노출 금지
