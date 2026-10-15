# Web 0.3.0 · 초기화와 모델 선택 · 2026-10-15

- 공책 보관에서 명시적인 ‘초기화’ 입력 후 현재 게임을 비우고 새 친구를 만날 수 있다. 현재 탭의 대화/입력 키를 정리하고 진행 중인 대화·모델 목록 요청을 취소한다. 백업은 기존 형식으로 재사용한다.
- 초기화는 저장 revision을 비교해 원자적으로 처리한다. 다른 창에서 저장이 바뀌면 거절하고, revision을 되감지 않아 오래된 저장 시도가 이전 친구를 되살릴 수 없다. 다른 앱의 브라우저 저장은 건드리지 않는다.
- 모델 입력을 드롭다운으로 바꾸고 Google 모델 목록 API의 페이지 처리·대화 기능 필터링·기존 선택 유지·실패 시 기본 목록 유지 기능을 추가했다. 키는 헤더로만 전달하며 유료 생성 호출은 검증에 사용하지 않았다.
- Pages와 코어 CI를 `release-web` 기준으로 정리한다. 중복 `main`은 이력 포함 여부를 확인한 후 정리한다. 기존 Anna `release`와 저장 데이터는 유지한다. Anna 앱 1.2.1 / 도구 0.8.1 / working revision 53의 변경이나 재배포는 없다.

로컬 실제 Edge 검증 통과: 기존 게임·백업·모의 BYOK·폰트/모바일 회귀, 모델 드롭다운·페이지 조회·선택 모델 요청, 잘못된 확인문구/취소/오래된 초기화 거절, 초기화 후 새로고침과 새 친구 생성, 오래된 저장 부활 차단, 진행 중 AI 취소, 다른 앱 데이터 보존.

배포 완료: https://kdkrkwhr.github.io/notebook-pets/ · 배포 소스 `4ba6c232dc4ad06a6e9644eb35cdd3cd605e7105`.

- [웹 빌드·Chromium·Pages](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38754838951) 및 [release-web 코어 Windows/Linux·Pyodide CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38754838923) 모두 성공.
- 공개 URL의 실제 Edge에서도 전체 웹 회귀·모델 드롭다운/페이지 조회·초기화/취소/충돌·새 친구 생성 검증 통과. 모델/AI 요청은 모의 응답을 사용했다. 별도 브라우저 컨텍스트에서만 초기화해 사용자의 기존 저장은 보존했다.
- 로컬·원격 `main` 삭제 완료. 삭제 전 tip `dca0a256d073b125d0c1e35a5afd1945bf9c8baa`가 `release-web`의 조상임을 확인했다. 원격 브랜치는 `release`와 `release-web` 두 개뿐이며 기본 브랜치는 기존 `release`를 유지한다.
- Pages는 `release-web` 푸시만 빌드·배포하며, 코어 CI도 해당 브랜치를 검증한다. Anna의 배포 트랙과 앱/도구 버전은 변경하지 않았다.
