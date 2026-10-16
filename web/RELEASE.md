# Web 0.1.0 · 2026-10-15

현재 웹 업데이트는 [0.4.0 · 집과 마당, 홈·던전 동작 공유](RELEASE_040.md)이며, 아래는 첫 프리뷰의 배포 기록이다.

GitHub Pages 초기 프리뷰. 소스는 `main`, 배포는 `release-web`에서 관리한다. Anna `release`와 앱 1.2.1 / 도구 0.8.1 / working revision 53은 이번 작업으로 변경하거나 재배포하지 않았다.

- Pyodide 314.0.7 module worker로 기존 Python 규칙 실행. 빌드 결과에 런타임 포함.
- IndexedDB 원자적 생성/조건부 교체와 수동 JSON 백업/복원.
- Gemini 직접 BYOK 단일 턴 대화. 키 비영속화, 응답은 텍스트로만 표시.
- 로컬 실제 Edge 검증: 탄생/급식, 새로고침 후 복원, 동시 revision 충돌, 백업 다운로드/복원, 모의 AI 요청, 게임 상태 보존, HTML 응답 이스케이프, 키 비영속화 통과.
- 실제 유료 AI 호출은 하지 않았다. 전체 Anna UI/이미지 생성/대화 영속화/PWA/Android는 후속 단계.

배포 완료: https://kdkrkwhr.github.io/notebook-pets/ · 배포 소스 `f005dac6880a869946461817914748f53c7b7898`.

- [Pages 빌드·Chromium 테스트·배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38748200118) 성공. [코어 Windows/Linux·Pyodide CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38748193997) 성공. 로컬 엔진 214개 통과(선택 1 skip).
- 공개 URL에서 실제 Edge로 같은 실행·저장·CAS·백업·모의 BYOK·키 비영속화 검증 통과. 별도 테스트 브라우저 컨텍스트를 사용해 사용자 저장은 건드리지 않았다.
- 공개 HTML/app.js/store.js/worker.js/Pyodide WASM은 로컬 빌드 SHA-256과 일치. Python game_api.py는 Windows/Linux 줄바꿈 정규화 후 일치.
- Pages Actions 배포 및 `github-pages` 환경의 `release-web` 배포 허용을 설정했다. 기존 Anna 배포 트랙과 심사/공유 데이터는 변경하지 않았다.
