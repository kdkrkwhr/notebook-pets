# 실행 전 점검 / Preflight checks

`tools/doctor.py`로 운영 데이터와 선택한 연결 환경을 함께 점검합니다.

```powershell
# 세이브·접근 설정·쓰기 권한 점검
python -X utf8 tools/doctor.py

# 실제 배포 경로, 자동 백업, Discord 설정, ComfyUI까지 점검
python -X utf8 tools/doctor.py --data-root D:\notebuddy-data --backup-root D:\notebuddy-backups --discord --comfy

# 모니터링에서 읽는 단일 JSON 결과
python -X utf8 tools/doctor.py --data-root D:\notebuddy-data --backup-root D:\notebuddy-backups --json
```

기본 데이터 루트는 `NOTEBOOK_DATA_DIR`이며, 없으면 저장소 루트입니다. 성공은 종료 코드 0, 점검 실패는 1, 잘못된 명령 인자는 2입니다. 출력은 `pass`, `fail`, `skip`으로 구분합니다. 선택하지 않은 항목은 `skip`이며 전체 `ok: true`가 해당 서비스까지 검증했다는 뜻은 아닙니다.

| 항목 | 확인 내용 |
| --- | --- |
| `store` | 상태 파일과 사용자 ID, 접근 설정 형식, 실제 임시 파일 쓰기·flush, 저장 잠금 획득 |
| `backup` | 자동 백업 최근 작업 성공 여부, 데이터 루트 일치, 스냅샷 경로·체크섬·세이브 형식, 생성 시각 |
| `discord_config` | 선택 의존성 설치, 토큰 설정 여부, 허용 채널 ID 형식 |
| `comfy` | ComfyUI 응답, 체크포인트, IP-Adapter·CLIP Vision 모델과 필수 노드 |

세이브·접근 설정은 읽기만 합니다. 기존 세이브를 마이그레이션하거나 방치 감소를 적용하지 않습니다. 점검용 임시 파일은 삭제하고 저장 잠금 파일은 유지합니다. 데이터 경로가 없으면 자동 생성하지 않고 실패합니다. 손상된 세이브는 파일명과 오류 코드로 보고하며 원본 내용을 출력하지 않습니다.

백업 항목에는 `daily_backup.py`의 **보관 목적지 루트**를 넘깁니다(해시 하위 폴더가 아님). 기본 허용 나이는 생성 시각 기준 36시간이며 `--max-backup-age-hours 48`처럼 조정합니다. 최신 작업이 실패했다면 이전 백업이 남아 있어도 실패로 표시합니다. 백업 누락·변조·오래된 생성 시각·5분 넘는 미래 시각도 실패로 표시합니다. 수동 백업 파일은 `backup_store.py verify`로 직접 검증하세요.

Discord 점검은 로그인하거나 메시지를 보내지 않습니다. 토큰의 실제 유효성, Discord 서버 권한, Message Content Intent 설정은 검증하지 않습니다. 토큰과 채널 설정값을 오류 출력에 포함하지 않습니다. ComfyUI는 이미지 생성 없이 기존 `check_images.py`를 호출하며 전체 30초 후 중단합니다. 개별 결과가 필요하면 `check_images.py`를 직접 실행합니다.

현재 실행 시점의 점검이므로 디스크 상태나 설정이 이후 변경되는 것까지 보장하지 않습니다. 새 배포나 데이터 루트 전환 후 이 명령으로 확인하고, 예약 백업은 `last-run.json`과 Windows 작업 스케줄러 결과를 함께 확인하세요.

## English

Run `tools/doctor.py` for store checks. Add `--data-root`, `--backup-root`, `--discord`, or `--comfy` as needed. `--json` emits a single structured result; exit codes are 0 for passed selected checks, 1 for failures, and 2 for invalid arguments. Optional checks remain `skip` unless requested.

The store check validates saves and access settings, acquires the game lock, and writes/flushed a disposable probe. It does not migrate or modify saves. Missing data roots are not created. The lock file remains in place. The backup check uses the automatic job's destination root, validates the latest successful result and actual snapshot, and defaults to a maximum age of 36 hours. Failed latest jobs, changed files, and timestamps more than five minutes in the future fail the check. Manual snapshots can be checked with `backup_store.py verify`.

Discord checks dependency presence and configuration shape without authentication or message delivery. Token validity, server permissions, and privileged intents need separate verification. Secret values are not printed. ComfyUI checks use `check_images.py` without generating artwork and have a total 30-second timeout. A passing result is a point-in-time check of the selected components, not a live end-to-end gameplay test.
