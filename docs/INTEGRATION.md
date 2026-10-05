# 런타임 연동 / Runtime integration

## 한국어

### 발신자와 에이전트

플랫폼에서 인증한 발신자 ID를 사용하세요. Discord라면 메시지 이벤트의 실제 `author.id`입니다. 메시지 본문, 닉네임, LLM이 생성한 인자의 ID를 신뢰하면 안 됩니다.

연동 프로그램은 에이전트에 허용된 게임 명령과 인자만 노출하고, 직접 `engine.execute(actor_id, command, arguments)`를 호출하거나 아래처럼 CLI를 실행할 수 있습니다. `engine/`를 Python 모듈 경로에 추가한 뒤 `import engine`으로 불러옵니다. `cmd_*`, `load_state`, `save_state`는 내부 함수이며 잠금·접근 검사를 포함하는 공개 진입점은 `execute`입니다.

```python
import json, os, subprocess, sys

# trusted_sender_id: 플랫폼 이벤트에서 읽은 값. LLM 도구 인자로 노출하지 않습니다.
env = os.environ.copy()
env["NOTEBOOK_ACTOR_ID"] = str(trusted_sender_id)
env["NOTEBOOK_EVENT_ID"] = "discord:" + str(trusted_message_id)
result = subprocess.run(
    [sys.executable, "-X", "utf8", str(engine_script),
     str(trusted_sender_id), command, *arguments],
    env=env, capture_output=True, text=True, encoding="utf-8", check=True,
)
reply = json.loads(result.stdout)
```

`NOTEBOOK_ACTOR_ID`가 있으면 엔진은 요청 ID가 일치하는지 검사합니다. 환경변수는 인증 수단이 아니라 신뢰된 어댑터의 추가 검증값입니다. 여러 사용자를 처리하는 서버에서 전역 `os.environ`을 요청마다 바꾸지 말고, 위처럼 자식 프로세스별 환경을 전달하세요. 에이전트에 임의 셸 실행·환경변수 변경·상태 파일 접근 권한을 주면 이 경계를 우회할 수 있습니다. 관리자 ID는 운영자가 설정하고, 연동 프로그램은 관리자 명령의 허용 범위도 제한하세요.

이 저장소는 외부 Hermes 프로필이나 Discord 수신 코드를 포함하지 않습니다. 운영 연결 시 실제 발신자 ID 주입을 해당 프로그램에 적용해야 합니다. CLI 응답은 단일 JSON이며 `ok`를 확인합니다. 게임 요청 거절은 프로세스 종료 코드 0으로도 반환됩니다.

### 메시지 중복 처리

권장 진입점은 `engine/adapter.py`의 `bind_discord_event`입니다. 게이트웨이가 실제 이벤트로 도구를 만든 뒤, LLM에는 반환된 함수의 `command`, `arguments`만 노출하세요. 발신자나 메시지 ID는 도구 인자로 받지 않습니다.

```python
# engine/ 디렉터리를 Python 모듈 경로에 추가한 연동 프로그램에서 실행
from adapter import bind_discord_event

game_tool = bind_discord_event(event.author.id, event.id)
result = game_tool("snack")
```

- 직접 호출은 `engine.execute(sender_id, command, arguments, request_id="discord:메시지ID")`를 사용합니다. CLI는 신뢰된 어댑터가 설정한 `NOTEBOOK_EVENT_ID`를 사용합니다. ID를 생략한 로컬 CLI는 기존처럼 매번 별도 요청으로 처리됩니다.
- 같은 사용자·메시지 ID로 이미 저장된 명령을 재요청하면 최초 결과를 반환합니다. 동일 ID의 명령이나 인자를 바꾸면 `request_conflict`입니다. 한국어 별칭은 같은 명령으로 취급합니다. 다시 전송된 메시지에 새 ID를 만들면 중복을 판별할 수 없습니다.
- 보상과 처리 기록(`processed_requests`)은 같은 세이브에 한 번에 저장합니다. 실패한 저장에는 보상만 따로 남지 않습니다. 조회나 상태를 변경하지 못한 요청은 기록하지 않아 재시도할 수 있습니다. 성공한 명령의 재요청은 날짜가 바뀌어도 다시 실행하지 않습니다.
- 기록은 자동으로 만료시키지 않으며 세이브와 함께 백업해야 합니다. 관리자 초기화로 세이브를 지우거나 교체하면 기록도 초기화됩니다. 초기화 전의 메시지를 재전달하지 않도록 운영 큐를 정리하세요. 기록 크기는 처리 건수에 따라 증가합니다.
- 메시지 도구는 게임 명령만 허용합니다. `owner`, `clearowner`, `reset`은 운영자 CLI에서 별도로 실행하고 이벤트 ID를 지정하지 않습니다. 재요청 시에도 현재 접근 권한을 검사합니다.
- 이 보장은 게임 상태 변경에 대한 것입니다. Discord 답장과 이미지 전송의 중복 방지는 연결 프로그램이 별도로 담당합니다.

### 성장·전투 규칙

놀이는 기존 친밀도에 `반올림(20 × 종족 배율)`을 더하고 100에서 제한합니다. 훈련은 `hp`, `atk`, `def` 중 하나에 영구 보너스 1을 더합니다. 기본 능력치는 레벨·종족 성장치에서 계산하고 `training_bonus`를 더합니다. 예전 세이브의 사용되지 않던 `stats`를 훈련 보너스로 해석하지 않습니다.

전투는 매번 최대 HP에서 시작해 최대 20라운드 동안 동시에 공격하고 체력을 소모합니다. 양쪽 기본 능력치는 같은 레벨·종족 공식을 사용합니다. 피해량은 `max(0, 공격력 × 상성 × 변동률 × 폭주 배율 - 상대 방어력 × 0.5)`이며 남은 HP를 초과해 피해를 기록하지 않습니다. 폭주는 플레이어 괴수족의 기존 조건을 유지합니다. 회피는 각 방어자의 종족에 따라 독립 판정하며 기본 5%, 조류·유령족은 10%입니다. HP가 0인 개체가 나오면 해당 라운드 종료 시 전투를 마칩니다. 동시 쓰러짐은 무승부이며, 20라운드 이후 양쪽이 살아 있으면 남은 HP 비율로 판정합니다. 비율이 같으면 무승부입니다. 전투 후 HP는 세이브에 저장하지 않아 다음 전투는 회복된 상태로 시작합니다.

응답의 `outcome`은 `win`, `lose`, `draw`이며 `won`은 승리만 `true`입니다. 무승부는 `record.draw`에 기록하고 경험치 20만 지급합니다. `rounds`, `hp_me`, `hp_enemy`, `max_hp_me`, `max_hp_enemy`와 회피 횟수를 응답에 포함합니다. `dmg_me`·`dmg_enemy`는 전투 전체의 누적 실제 피해입니다. 이전 단일 교환 결과가 메시지 처리 기록에 있다면 재요청 시 그 원본을 반환하므로 중계 계층은 새 필드가 없는 응답도 처리해야 합니다. 훈련 증가량, 방어 계수, 회피율, 라운드 제한과 보상은 `data/game_data.json`에서 조정합니다.

조우가 남아 있으면 산책은 `encounter_pending`으로 거절하고 경험치·일일 횟수를 소비하지 않습니다. `status.encounter` 또는 산책 응답의 `wild`로 상대를 확인합니다. `battle`, `catch`, `flee`(`도망`)로 조우를 마칠 수 있고, 도망에는 보상이 없습니다. 생성되는 야생 레벨은 1~100입니다. 기존 세이브의 조우는 보존합니다.

출석은 경험치와 함께 일반 사료 3개를 하루 한 번 지급하며, 같은 메시지 재처리는 보급을 중복 지급하지 않습니다. 이전 버전에서 당일 출석을 이미 했다면 보급은 다음 출석부터 적용됩니다. 전투 보상을 받지 못해도 이 사료로 다시 먹이·훈련을 진행할 수 있습니다.

전투 32,400회와 일일 성장·사료 수급 실험은 [밸런스 보고서](BALANCE_REPORT.md)에 정리했습니다. 보고서는 고정 일정의 시뮬레이션이며 실제 플레이 지표가 아닙니다. 재현 도구는 `tools/simulate_balance.py`이고 운영 세이브에 접근하지 않습니다.

### 저장과 배치

- `NOTEBOOK_DATA_DIR`은 `state/`와 `data/access.json`을 보관할 루트입니다. 생략하면 저장소 루트입니다. 밸런스 데이터는 계속 코드 저장소의 `data/game_data.json`에서 읽습니다.
- 명령과 배치는 반드시 같은 데이터 루트를 사용합니다. 단일 호스트의 로컬 파일시스템용 OS 잠금이며, 네트워크 공유 저장소나 여러 서버의 분산 잠금을 제공하지 않습니다.
- 잠금은 읽기·판정·쓰기를 묶습니다. 저장은 임시 파일을 완성한 뒤 교체합니다. `.store.lock` 파일은 삭제하지 마세요. 프로세스가 종료되면 OS가 잠금을 해제합니다. 15초 내 획득하지 못하면 `busy` 오류를 반환합니다.
- 기존 배치를 중지하고 명령·배치 코드를 함께 교체하세요. 이전 코드로 실행 중인 프로세스는 새 잠금을 사용하지 않습니다. 교체 전에 `state/`와 접근 설정을 백업합니다.
- `python -X utf8 tools/daily_decay.py`를 매일 원하는 KST 시각에 실행합니다. 해당 날짜에 활동하지 않은 사용자에게 최대 한 번 적용하며, 누락된 여러 날의 감소를 한꺼번에 적용하지 않습니다. 일부 세이브가 잘못된 경우 나머지는 계속 처리하고 `errors` 및 종료 코드 1로 알립니다. 재실행해도 이미 저장된 감소는 반복하지 않습니다.
- 모든 게임 날짜는 KST입니다. 수면 보너스는 다음 날 00:00부터 24:00까지이며, 당일 다시 잠을 자도 현재 보너스는 유지됩니다.
- v2 세이브는 읽을 때 v3 형식으로 변환하고 다음 저장 시 반영합니다. 성장·인벤토리·기록은 보존하지만 적용 날짜를 알 수 없는 기존 `sleep_buff`는 만료 처리합니다. 과거에 누락된 경험치는 기록만으로 복구할 수 없어 소급 지급하지 않습니다.
- 접근 설정 파일이 없으면 공개 모드입니다. 파일이 손상되거나 읽을 수 없으면 게임 접근을 거절합니다. 관리자의 `owner` 또는 `clearowner`로 명시적으로 복구할 수 있습니다. 손상된 사용자 세이브는 덮어쓰지 않습니다.

## English

Use the sender ID from the authenticated platform event, such as Discord's `author.id`. Never take identity from message text or model-generated tool arguments. A trusted adapter may call `engine.execute(actor_id, command, arguments)` after adding `engine/` to the Python import path, or launch the CLI as shown above. The `cmd_*` and storage functions are internal: `execute` provides the lock and access checks.

Pass `NOTEBOOK_ACTOR_ID` in each child process's environment to reject mismatched IDs. It is an adapter-supplied guard, not authentication. Do not mutate a shared server's environment per request. Models must not control this value, administrator configuration, arbitrary shell commands, or save files. Restrict available tool commands in the adapter. External Hermes/Discord configuration is not included here; sender binding must be wired there. Inspect JSON `ok`: a rejected game command can still exit with code 0.

Prefer `adapter.bind_discord_event(event.author.id, event.id)`: expose only its returned `game_tool(command, arguments)` to the model. For direct calls, pass `request_id="discord:<message-id>"` to `execute`; for subprocesses, set `NOTEBOOK_EVENT_ID` from trusted metadata. Omitting it preserves the local CLI's independent-call behavior. Reuse the original event ID on retries.

Successful state writes store the result and event receipt atomically in the same save. Retries return that result across restarts and calendar days; changing the command or arguments for the same user/event returns `request_conflict`. Aliases are normalized. Read-only requests and rejected actions that do not save state are not recorded. Access is checked again before replay. Receipts never expire automatically, grow with traffic, and must be backed up with saves. Administrative reset removes them: do not redeliver pre-reset events afterward. Admin commands are excluded from the bound game tool and reject event IDs. Discord reply/image deduplication remains the integration's responsibility.

Play adds the rounded species-scaled gain to existing intimacy, capped at 100. Training adds a permanent +1 to one random HP/attack/defense stat via `training_bonus`; legacy `stats` values are preserved but not interpreted as bonuses. Battles start at full HP and run simultaneous exchanges for up to 20 rounds. Both sides use the same species/level stat formula, subtract half the opponent's defense, and clamp damage between zero and remaining HP. Defenders independently dodge at 5%, or 10% for birds/ghosts. Player berserk rules remain intact. Training gain, defense factor, dodge rates, round cap and rewards live in balance data.

A knockout ends the battle after that simultaneous round; double knockouts are draws. If both survive the round cap, remaining HP fractions decide the outcome, with equal fractions drawn. HP is local to the battle and not persisted. `outcome` is `win`, `lose` or `draw`; `won` is true only for wins. Draws add `record.draw` and award 20 XP with no loot. Results include round count, final/maximum HP, cumulative actual damage, and dodge counts. Historical deduplicated responses may lack the new fields: adapters must still handle them.

An unresolved encounter blocks another walk with `encounter_pending` and no XP/quota consumption. Inspect `status.encounter` or a walk's `wild` field, then battle, catch, or `flee` (`도망`). Fleeing gives no reward. New wild levels are capped at 100; existing encounters are preserved. Attendance now grants three normal feed once a day along with XP, atomically with event receipts. Users already checked in under older rules receive supplies on their next attendance day.

The [balance report](BALANCE_REPORT.md) contains 32,400 simulated battles and fixed-schedule progression/food experiments. These are model results, not live player data. Reproduce with `tools/simulate_balance.py`; the tool never accesses operational saves.

`NOTEBOOK_DATA_DIR` selects the root for `state/` and `data/access.json`, defaulting to the repository root. Rules still come from the repository's `data/game_data.json`. Commands and decay must use the same root. The shared OS lock is intended for a local filesystem on one host, not distributed storage. It covers the entire read/modify/write operation; writes use a completed temporary file and replacement. Keep `.store.lock` in place. Process exit releases its lock; acquisition times out after 15 seconds with `busy`.

Stop old jobs and command processes before replacing both components; older code does not participate in the new lock. Back up saves and access configuration first. Schedule `python -X utf8 tools/daily_decay.py` daily. It applies at most one inactivity penalty per KST date, skips users active that date, and does not catch up missed days. Invalid saves are reported in `errors` while other users continue; errors produce exit code 1. Retries skip previously persisted penalties.

All game dates use KST. Sleep XP bonuses apply only during the next calendar day; sleeping again preserves the current day's bonus. v2 saves migrate to v3 on the next write, preserving progression, inventory, and history. Undated legacy sleep flags expire, and historically missing XP cannot be reconstructed. A missing access file means public mode; invalid or unreadable settings deny game access. An administrator can explicitly repair settings with `owner` or `clearowner`. Invalid saves are never overwritten.
