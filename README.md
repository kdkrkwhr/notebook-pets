# notebook-monster (공책 AI 키우기)

Discord(Hermes)에서 키우는 디지몬풍 몬스터 육성 게임.

## 구조

```
docs/PLAN.md          기획서 v0.2
data/game_data.json   종족9/속성8/상성/XP곡선/커맨드 수치 (SoT)
data/prompt_templates.md  이미지 프롬프트 조각 템플릿
engine/engine.py      결정론 게임 엔진 (CLI, JSON 출력)
state/                유저별 상태 파일 {user_id}.json (gitignore)
```

## 원칙

- **판정은 엔진(Python), 서사는 에이전트(LLM)** — 경계를 섞지 않는다
- 상태는 파일 SoT. 세션 컨텍스트에 게임 상태를 두지 않는다

## 사용법

```bash
python engine/engine.py <user_id> <커맨드> [args...]

# 예시
python engine/engine.py 123456789012345678 공책시작 홍실록
python engine/engine.py 123456789012345678 상태
python engine/engine.py 123456789012345678 밥줘
```

## 커맨드

| 분류 | 커맨드 |
|---|---|
| 시작 | 공책시작 <이름> |
| 조회 | 상태 / 도감 / 랭킹 / 도움말 |
| 돌봄 | 밥줘 / 간식줘 / 놀아줘 / 재워줘 |
| 성장 | 훈련 / 산책 |
| 전투 | 배틀 / 포획 (산책으로 야생 조우 후) |
| 기타 | 출석 |

출력은 단일 JSON. Discord에서는 Hermes 에이전트가 이 JSON을 받아 몬스터 말투로 중계한다.
