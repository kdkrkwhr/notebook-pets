# 런타임 연동 / Runtime integration

## 한국어

### 발신자와 에이전트

플랫폼에서 인증한 발신자 ID를 사용하세요. Discord라면 메시지 이벤트의 실제 `author.id`입니다. 메시지 본문, 닉네임, LLM이 생성한 인자의 ID를 신뢰하면 안 됩니다.

연동 프로그램은 에이전트에 허용된 게임 명령과 인자만 노출하고, 직접 `engine.execute(actor_id, command, arguments)`를 호출하거나 아래처럼 CLI를 실행할 수 있습니다. `engine/`를 Python 모듈 경로에 추가한 뒤 `import engine`으로 불러옵니다. `cmd_*`, `load_state`, `save_state`는 내부 함수이며 잠금·접근 검사를 포함하는 공개 진입점은 `execute`입니다.

```python
# trusted_sender_id: 플랫폼 이벤트에서 읽은 값. LLM 도구 인자로 노출하지 않습니다.
env = os.environ.copy()
env["NOTEBOOK_ACTOR_ID"] = str(trusted_sender_id)
result = subprocess.run(
    [sys.executable, "-X", "utf8", str(engine_script),
     str(trusted_sender_id), command, *arguments],
    env=env, capture_output=True, text=True, encoding="utf-8", check=True,
)
reply = json.loads(result.stdout)
```

`NOTEBOOK_ACTOR_ID`가 있으면 엔진은 요청 ID가 일치하는지 검사합니다. 환경변수는 인증 수단이 아니라 신뢰된 어댑터의 추가 검증값입니다. 여러 사용자를 처리하는 서버에서 전역 `os.environ`을 요청마다 바꾸지 말고, 위처럼 자식 프로세스별 환경을 전달하세요. 에이전트에 임의 셸 실행·환경변수 변경·상태 파일 접근 권한을 주면 이 경계를 우회할 수 있습니다. 관리자 ID는 운영자가 설정하고, 연동 프로그램은 관리자 명령의 허용 범위도 제한하세요.

이 저장소는 외부 Hermes 프로필이나 Discord 수신 코드를 포함하지 않습니다. 운영 연결 시 실제 발신자 ID 주입을 해당 프로그램에 적용해야 합니다. CLI 응답은 단일 JSON이며 `ok`를 확인합니다. 게임 요청 거절은 프로세스 종료 코드 0으로도 반환됩니다.

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

`NOTEBOOK_DATA_DIR` selects the root for `state/` and `data/access.json`, defaulting to the repository root. Rules still come from the repository's `data/game_data.json`. Commands and decay must use the same root. The shared OS lock is intended for a local filesystem on one host, not distributed storage. It covers the entire read/modify/write operation; writes use a completed temporary file and replacement. Keep `.store.lock` in place. Process exit releases its lock; acquisition times out after 15 seconds with `busy`.

Stop old jobs and command processes before replacing both components; older code does not participate in the new lock. Back up saves and access configuration first. Schedule `python -X utf8 tools/daily_decay.py` daily. It applies at most one inactivity penalty per KST date, skips users active that date, and does not catch up missed days. Invalid saves are reported in `errors` while other users continue; errors produce exit code 1. Retries skip previously persisted penalties.

All game dates use KST. Sleep XP bonuses apply only during the next calendar day; sleeping again preserves the current day's bonus. v2 saves migrate to v3 on the next write, preserving progression, inventory, and history. Undated legacy sleep flags expire, and historically missing XP cannot be reconstructed. A missing access file means public mode; invalid or unreadable settings deny game access. An administrator can explicitly repair settings with `owner` or `clearowner`. Invalid saves are never overwritten.
