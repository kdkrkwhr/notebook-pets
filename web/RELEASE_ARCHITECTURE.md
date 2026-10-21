# 프로젝트 구조 지도 · 2026-10-21

GitHub Pages에 `/architecture/`를 추가한다. 웹 데모 하단과 한국어·영문 README에서 연결하며 웹 게임 0.7.1의 규칙·세이브 형식·AI 동작은 변경하지 않는다. Anna 배포와 심사본은 이번 웹 문서 작업의 대상이 아니다.

- 웹·Anna의 실행 흐름을 설명하는 안내와 실제 Graphify 관계 그래프를 구분해 제공한다.
- 파일 검색과 기능별 바로가기에서 분석한 커밋의 GitHub 소스를 연다.
- Graphify 0.9.93의 `extract --code-only --no-cluster`, `cluster-only --no-label`, HTML export를 사용한다. API 키·LLM·새 서버는 필요하지 않는다. 스킬이나 Git hook을 설치하지 않는다.
- Git HEAD에 기록된 `engine/`, `web/`, `anna/bundle/`, `anna/executas/notebuddy/`의 Python/JavaScript만 임시 복사본에 추출한다. 분석 페이지 자체와 웹 빌더는 제외한다. 미커밋 파일·세이브·비밀 설정은 수집하지 않는다.
- 생성물은 `.local/architecture/graphify-out/`에서 `web/dist/architecture/`로 복사한다. Git에는 생성기와 페이지 소스만 기록하며 Pages 빌드마다 새로 생성한다. 분석 커밋·소스 날짜·분석 날짜와 버전을 표시한다.
- 코드 연결은 정적 분석 결과다. 동적 호출·Python/JS 경계·플랫폼 호출은 누락될 수 있으며, 추론 연결은 실제 소스와 대조해야 한다. Anna 코드는 웹 브랜치의 스냅샷이지 실제 설치 버전의 확인 결과가 아니다.
- 그래프 그룹 이름은 해당 그룹에서 가장 많이 나타나는 소스 파일로 결정한다. Graphify 원본 뷰어에 전체 보기 버튼과 크기 변경 시 화면 맞춤을 추가하며 라이선스를 함께 제공한다.

검증: `node tests/pyodide/web-architecture.mjs`는 Pages 하위 경로, 파일 검색·없음·초기화, 웹/Anna 흐름 전환, 고정 커밋 소스 링크, 실제 Graphify 검색·노드 선택, 320/390/768/1440px, 절대 로컬 경로 미포함, 웹 데모 연결을 검사한다. 기존 웹 회귀 검사는 Pages 워크플로에서 함께 실행한다.

로컬 Edge에서 웹 실행·저장·CAS·백업·초기화 및 로컬 AI 모의 호출 회귀 검사가 통과했다. 구조 페이지의 검색·실제 노드 선택·소스 링크·모바일 너비를 확인했다. 실제 사용자 저장이나 유료 AI는 사용하지 않았다.

배포 완료: **e839b77**, [프로젝트 구조 지도](https://kdkrkwhr.github.io/notebook-pets/architecture/). [Pages 검사·배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39542659124)와 [Windows/Linux/Pyodide 공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/39542659223)가 모두 성공했다.

공개 주소에서도 70개 파일·818개 항목·2,419개 추출 관계와 `e839b771807389df0a60b303940070abe8d8a611` 기준 커밋을 확인했다. 실제 Graphify 검색·노드 선택·그룹 목록·전체 보기·모바일 너비 검사가 통과했고, 웹 데모가 실행된 뒤 하단 링크로 새 탭의 구조 페이지를 여는 것도 확인했다. 공개 페이지의 JavaScript 오류는 없었다.

추가 요청한 프로젝트 MIT 라이선스는 웹 `0de02eb`, 기본 Anna 트랙 `1872209`에 반영했다. GitHub API가 기본 브랜치의 루트 `LICENSE`를 `MIT`로 식별하는 것을 확인했다. 기존 SDK·폰트·Graphify의 별도 라이선스는 유지한다. 이 문서 기록 커밋은 `[skip ci]`이며, 위 배포 커밋의 분석 결과를 그대로 유지한다.
