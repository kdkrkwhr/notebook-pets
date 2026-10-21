# 프로젝트 문서

[기능 소개](../README.md) · [English overview](../README.en.md)

Anna 앱과 원본 Python 엔진은 같은 게임 규칙을 사용하지만 실행·저장 방식이 다르다. 사용하는 환경에 맞는 안내에서 시작한다.

| 하고 싶은 일 | 시작 문서 |
| --- | --- |
| 기능을 읽고 코드·연결 관계 따라가기 | [프로젝트 위키](wiki/index.md) · [웹 위키](https://kdkrkwhr.github.io/notebook-pets/wiki/) |
| 공통 코어·멀티 플랫폼 구조와 출시 방향 | [아키텍처](ARCHITECTURE.md) |
| Anna에서 친구 만나기 | [Anna 사용 안내](../anna/README.md) |
| Anna UI·도구 개발 및 테스트 배포 | [Anna 개발·배포](../anna/DEVELOPMENT.md) |
| 현재 설치 버전·최근 검증 확인 | [최신 작업 인계](../anna/HANDOFF.md) |
| Anna 기능·저장·리셋·후속 계획 확인 | [Anna 기술 문서](../anna/docs/README.md) |
| Python 엔진·Discord 실행 | [개발 안내](DEVELOPMENT.md) · [English](DEVELOPMENT.en.md) |
| 공통 설정과 실행기 | [설정](CONFIGURATION.md) |
| 에이전트·MCP 연결 | [에이전트 연결](AGENT_INTEGRATION.md) · [런타임 연결](INTEGRATION.md) |
| 로컬 이미지 생성 | [이미지 파이프라인](IMAGES.md) |
| 운영 전 점검·백업 | [점검](OPERATIONS.md) · [백업](BACKUP.md) |
| 테스트·밸런스·앨범 | [하네스](HARNESS.md) · [밸런스](BALANCE_REPORT.md) · [앨범](ALBUM.md) |
| 스크린샷 출처 | [화면 기록](screenshots/README.md) |

## 폴더 기준

- `engine/`, `tools/`, `data/`, `tests/`: 원본 엔진, 실행 도구, 규칙 데이터, 회귀 검사.
- `anna/bundle/`, `anna/executas/`, `anna/tests/`: Anna UI, 게임 도구, 검사.
- `assets/`: 원본 아트·생성 프롬프트·비교 갤러리. 이전 실험도 그림 출처와 재현을 위해 보존한다.
- `anna/releases/`, `anna/reviews/`, `anna/HANDOFF_HISTORY.md`: 배포·심사·설치 검증 이력.
- `anna/archive/`, `docs/archive/`: 현재 절차에서 제외한 과거 계획과 검증 문서.
- `state/`, `artwork/`, `.local/`: 로컬 저장·개인 그림·작업 백업. 정리 대상으로 취급하지 않는다.

문서에 적힌 과거 버전은 그 시점의 사실이다. 현재 배포 상태는 `anna/HANDOFF.md` 한 곳에서 확인하고, 기능 설명은 해당 주제 문서를 갱신한다. 오래된 문서는 고유한 근거가 있으면 보관하며 중복 안내는 현재 문서로 합친다.

문서 이동·통합 후 저장소 루트에서 `python -B -X utf8 tools/check_docs.py`로 로컬 링크와 이미지 경로를 검사한다. 외부 URL의 접속 상태는 별도 확인한다.

초기 계획과 Hermes 운영 매뉴얼은 [과거 문서](archive/README.md), 로컬 그림 실험은 [스타일 비교](STYLE_REVIEW.md)와 [로컬 검증](LOCAL_IMAGE_VALIDATION.md)에 남아 있다.

최근 폴더 이동·삭제 기준과 검증 범위는 [저장소 정리 기록](MAINTENANCE.md)에 남겼다.
