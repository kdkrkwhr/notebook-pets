# Web 0.1.0 · 2026-10-15

GitHub Pages 초기 프리뷰. 소스는 `main`, 배포는 `release-web`에서 관리한다. Anna `release`와 앱 1.2.1 / 도구 0.8.1 / working revision 53은 이번 작업으로 변경하거나 재배포하지 않았다.

- Pyodide 314.0.7 module worker로 기존 Python 규칙 실행. 빌드 결과에 런타임 포함.
- IndexedDB 원자적 생성/조건부 교체와 수동 JSON 백업/복원.
- Gemini 직접 BYOK 단일 턴 대화. 키 비영속화, 응답은 텍스트로만 표시.
- 로컬 실제 Edge 검증: 탄생/급식, 새로고침 후 복원, 동시 revision 충돌, 백업 다운로드/복원, 모의 AI 요청, 게임 상태 보존, HTML 응답 이스케이프, 키 비영속화 통과.
- 실제 유료 AI 호출은 하지 않았다. 전체 Anna UI/이미지 생성/대화 영속화/PWA/Android는 후속 단계.

배포: 아직 진행 중. CI와 공개 URL 검증 후 갱신한다.
