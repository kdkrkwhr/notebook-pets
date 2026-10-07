# 백업과 복구 / Backup and recovery

`tools/backup_store.py`는 Python 표준 라이브러리로 실행하는 운영자 CLI입니다. 에이전트·MCP 게임 도구에는 노출하지 않습니다.

## 백업

```powershell
python -X utf8 tools/backup_store.py create --output backups/save-20261007.json
python -X utf8 tools/backup_store.py verify backups/save-20261007.json
```

기본 대상은 `NOTEBOOK_DATA_DIR`이며, 생략하면 저장소 루트입니다. 다른 배포는 `create --source D:\notebuddy-data --output D:\backups\save-20261007.json`처럼 지정합니다. 백업 파일은 덮어쓰지 않으므로 실행마다 새 이름을 사용합니다. `backups/`는 Git에서 제외됩니다. 실제 보관본은 별도 디스크나 백업 저장소에도 복사하세요.

게임과 동일한 파일 잠금 안에서 모든 사용자 JSON과 존재하는 `data/access.json`을 읽습니다. 사용자별 퀘스트 수령 표시·메시지 처리 기록·진화 정보도 함께 보존합니다. 기존 세이브 형식을 검증하되 마이그레이션하거나 원본을 변경하지 않습니다. 접근 설정이 없으면 그 상태도 보존합니다(공개 모드).

백업은 생성 시각·게임 버전·SHA-256 체크섬을 포함합니다. 잘린 파일, 잘못된 세이브, 허용되지 않은 경로를 검증 시 거절합니다. 체크섬은 우발적 손상 확인용이며 서명이나 암호화가 아닙니다. 백업에는 사용자 ID와 게임 기록이 포함되므로 운영자 저장소에 보관하세요. 현재 형식은 단일 JSON이며 최대 256 MiB입니다. 완성된 파일의 게시에는 같은 파일시스템 내 하드 링크를 사용하므로 이를 지원하는 로컬 파일시스템(NTFS 등)에 저장합니다.

## 복구

```powershell
# target은 아직 존재하지 않는 새 폴더여야 합니다.
python -X utf8 tools/backup_store.py restore backups/save-20261007.json --target D:\notebuddy-recovered

# 봇·배치·에이전트 연결을 모두 멈춘 후 같은 데이터 루트로 변경합니다.
$env:NOTEBOOK_DATA_DIR = 'D:\notebuddy-recovered'
python -X utf8 engine/engine.py 123456789012345678 status
```

전체 검증 후 임시 폴더에서 파일을 작성하고, 모두 성공하면 복구 경로로 옮깁니다. 검증·쓰기 실패 시 복구 경로를 공개하지 않으며 기존 운영 폴더는 수정하지 않습니다. 기존 경로로의 덮어쓰기나 사용자별 병합은 제공하지 않습니다. 위 환경변수는 현재 셸에만 적용되므로 서비스와 스케줄러 설정도 같은 경로로 바꿔 재시작하세요.

백업 이후 발생한 진행은 복구본에 없습니다. 처리 기록도 백업 시점까지만 존재하므로 **백업 이후 이미 처리한 메시지를 다시 전달하지 않도록** 게이트웨이의 이벤트 시작 지점을 맞추세요. 운영 전환 전에 복구본의 사용자 수, 소유주 제한, 대표 사용자 상태를 확인합니다.

이미지(`artwork/`), Discord 전송 기록(`delivery/`), 모델, 토큰, 관리자 환경변수는 이 세이브 백업에 포함하지 않습니다. 그림체 참조로 쓰는 최초 이미지까지 유지하려면 운영을 멈춘 상태에서 `artwork/`를 별도로 보관·복원하세요. 전송 기록은 같은 백업 시점의 자료가 있을 때 함께 복원하고, 이벤트 재전달 정책을 확인하세요. 게임 규칙과 실행 코드는 배포한 Git 커밋으로 관리합니다.

모든 명령은 JSON을 출력하며 성공 시 종료 코드 0, 오류 시 1입니다. `verify`는 세이브를 변경하지 않습니다. 백업·복구 명령은 자동으로 실행 예약되거나 데이터 루트를 전환하지 않습니다.

## English

Use `create --output <new-file>` to snapshot the current `NOTEBOOK_DATA_DIR` (repository root by default), or pass `--source`. Run `verify <file>` to validate the checksum, metadata, allowed paths, and save/access schemas. Snapshots preserve all user state, quest claims, event receipts, and the presence or absence of access settings under the same lock used by gameplay. Existing backups are never overwritten. Files are published using a same-filesystem hard link; use a local filesystem supporting this operation, such as NTFS. The JSON format has a 256 MiB limit.

Run `restore <file> --target <new-directory>` to recover into a path that does not exist. All validation happens first; files are prepared in a temporary sibling directory and published only after successful writes. Existing live data is not modified. Stop every bot, agent gateway, and scheduled job before switching their `NOTEBOOK_DATA_DIR` to the recovered root and restarting. Check user counts, owner restrictions, and representative saves before switching.

Restoration rolls progress and receipts back to the snapshot time. Do not replay events already processed after that snapshot. Artwork, Discord delivery receipts, models, credentials, and administrator environment settings are excluded. Preserve and restore `artwork/` separately while stopped to keep original character references; restore matching delivery records and align event replay boundaries. Use the deployed Git commit for rules and code. Checksums detect accidental corruption, not hostile modifications; snapshots are unencrypted operator data.

Commands return JSON and exit with 0 on success or 1 on failure. `backups/` is Git-ignored. Copy snapshots to a separate backup location; scheduling and deployment switching remain explicit operator actions.
