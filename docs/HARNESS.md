# Discord 연결 하네스 (프롬프트 방식)

별도 봇 코드 없이 **Hermes 에이전트 자체가 라우터**가 되는 구조.

## 동작 원리

```
Discord 메시지 "!밥줘"
   ↓ (Hermes Discord 연동 — 기존 채널 그대로)
ops 에이전트 (gongchaek-monster 스킬 로드)
   ↓ terminal: python engine/engine.py <user_id> 밥줘
엔진 JSON 응답 {"ok":true, "satiety":110, ...}
   ↓ 에이전트가 몬스터 말투로 번역
Discord 답장 "냥~ 배불러! 🍚"
```

- 판정(스탯·쿨타임·전투) = 엔진(Python) 100%
- 서사·말투·중계 = 에이전트(LLM)
- 상태 = `state/{user_id}.json` 파일 SoT

## 설치된 하네스

| 요소 | 위치 |
|---|---|
| 라우팅 스킬 | `hermes/profiles/ops/skills/gongchaek-monster/SKILL.md` |
| 방치 감소 cron | job_id `179025dc6119` — 매일 04:00 (`scripts/notebook_daily_decay.py`) |
| 이미지 생성기 | `tools/gen_image.py` (ComfyUI :8188 필요) |

## ComfyUI 서버 수동 기동 (재부팅 후)

```bash
cd /d/d/ComfyUI && env -u PYTHONPATH -u PYTHONHOME .venv/Scripts/python.exe main.py --cpu --port 8188
```
기동 확인: `curl http://127.0.0.1:8188/system_stats`

## 플레이 방법

디스코드에서 (게임 채널로 정한 곳에서):
```
!공책시작 홍실록
!상태
!밥줘 / !놀아줘 / !간식줘 / !재워줘
!훈련 / !산책
!배틀 / !도망   (산책으로 조우 후)
!출석 / !앨범 / !랭킹 / !도움말
```

에이전트가 접두사 `!공책` 계열 커맨드만 가로채고, 나머지 대화는 무시한다.
