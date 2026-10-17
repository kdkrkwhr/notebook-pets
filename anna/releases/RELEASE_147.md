# 1.4.7 · 유료 검사 후 수정의 심사 반영

사용자의 명시적 요청에 따라 **1.4.7 / ID 1427 / working revision 66**을 만들고 심사 후보를 **1.4.6 → 1.4.7 / pending_review**로 교체했다. 서버 재조회에서 `dirty_vs_latest_cut=false`도 확인했다. 직전 유료 검사에서 수정한 아트/대화 삭제 표시 시 유료 조작 차단과 Windows 개발 브리지 UTF-8 실행을 묶었다. 게임 도구는 기존 **0.9.1 / Executa version 760**, UI 코드는 검증된 `d7c5d176a28b858cebc0a5c1fa7a92920f54398b`와 같다. 이번 변경은 버전 메타데이터와 배포 기록이다.

소유자 초안 `0.0.0-draft` 설치 성공, 실패 Executa 0개. 실제 설치의 Connected와 `app.js` SHA-256 **`fdfdbb2ffd5bfe8e7b42949ba21962be7cd1bf96d328863ca4a98d6f4ad825e7`**이 로컬과 같음을 확인했다. 앱 저장 4종 값/ETag·게임 inspect·소개·스크린샷·로고·지원 링크를 보존했다. 클라우드 도구 0.9.1 실행은 유지한다.

사용자가 재검사를 요청해 Python 규칙 223개(MCP 포함), JS 91개, 도구 70개, 브라우저 107개 및 strict/Pyodide 검사를 다시 실행해 모두 통과했다. Windows/Linux 패키지 CI는 UI 코드가 동일한 [직전 성공 결과](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38986219436)를 재사용한다. 추가 유료 AI 요청은 **0회**다. 직전 한도는 이미지 2/텍스트 6으로 소진돼 실제 Anna 방향별 이동 시트 생성은 재검사하지 않았다. [유료 검사·남은 제한](../docs/PAID_TEST_20261017.md).

심사 후보 교체와 재검사의 최종 결과는 [HANDOFF](../HANDOFF.md)에 기록한다. 공개 Anna 출시는 하지 않는다. 웹은 0.5.0의 기존 검증 배포를 유지하며 버전/심사 기록을 Git으로 `release-web`에 통합한다.
