# Web 0.4.2 · 방향별 동작 생성 명세 보정

Anna 1.4.5의 공통 `home-sprite.mjs`를 Git merge로 통합했다. 좌우 화면 기준과 보행·정지·눈 감기의 방향 일관성, 다중 머리·장식 보존, 작은 표시 크기의 가독성을 구체화한다. 기존 저장·개인 그림을 자동 교체하거나 AI를 재호출하지 않는다. 개인 검수용 시트는 공개 웹에 포함하지 않는다.

실제 생성 이미지의 방향·외형은 프롬프트만으로 보장할 수 없다. 의미 검수는 여전히 필요하며 이번 보정도 Anna 제공자의 실제 참조 이미지 생성 성공을 증명하지 않는다.

배포 완료: 소스 `339181ef8ce271b268f7881825ca004e9ec9284d`, [Pages 검사·배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38849826706) 및 [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38849826764) 성공. 로컬 웹 홈/던전/그림/저장 통합 검사도 통과했다.

[공개 URL](https://kdkrkwhr.github.io/notebook-pets/)을 별도 Edge 컨텍스트로 열어 `data-web-version=0.4.2`, 실제 로드된 `home-sprite.mjs`와 로컬 빌드 일치(줄바꿈 정규화), 1120/360px, 저장 스냅샷 동일, AI 요청 0회, 페이지 오류 0을 확인했다. 사용자의 기존 웹 저장소는 건드리지 않았다.

Anna는 **1.4.5 / ID 1417 / working revision 59**, 도구 **0.9.1 / Executa version 760**으로 테스트 설치를 확인했고, 요청에 따라 **심사 후보 1.4.5 / pending_review**로 교체했다. [Anna 배포 기록](../anna/releases/RELEASE_145.md).
