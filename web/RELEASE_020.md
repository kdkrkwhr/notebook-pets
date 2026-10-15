# Web 0.2.0 · Anna 디자인 공유 · 2026-10-15

기능 확인용 웹 화면이 Anna와 달랐던 문제를 수정한다. 같은 Galmuri11 폰트, JRPG 공책 테마 CSS, 시작 화면, 기본 친구 그림, 아이템 도감과 자산을 Anna 소스에서 빌드 시 공유한다. 친구/대화 카드와 돌봄 메뉴, 퀘스트/성장 앨범을 같은 시각 구조로 배치하고 API 키·백업 설정은 별도 창으로 이동했다. 모바일에서는 친구→돌봄→대화 순으로 이어진다.

기존 IndexedDB 이름/버전·게임 저장·백업 형식은 유지한다. 게임 엔진·Anna 앱/도구는 수정하지 않는다. 마지막 Anna 확인 버전은 앱 1.2.1 / 도구 0.8.1 / working revision 53이며 이번 웹 작업에 따른 재배포는 없다.

검증: 실제 Edge에서 로컬 Pyodide 실행·탄생·급식·저장/복원·CAS·백업/가져오기·모의 BYOK·키 비영속화 통과. Galmuri 폰트 로드, 기본 친구 그림, 성장 앨범 4칸, 아이템 도감 24종, 375/390/760/1280px 가로 넘침 없음 검증. 데스크톱/모바일 스크린샷 확인.

제한: AI 이미지 생성/외형 편집·Anna의 풍부한 산책 이야기/던전 애니메이션·대화 영속화는 미이식. 웹은 기본 친구 초상화를 사용한다. 유료 AI 실호출 없음.

Pages 배포 완료: https://kdkrkwhr.github.io/notebook-pets/ · 배포 소스 `661f6e378b3d88b65915511dda1e07059fa8aecb`.

- [Pages 빌드·Chromium·배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38753308700), [main 웹 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38753302549), [Windows/Linux·Pyodide 코어 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38753302981) 모두 성공.
- 공개 URL에서도 실제 Edge로 같은 게임·저장·CAS·백업·모의 BYOK·키 비영속화·폰트/이미지·24종 도감·네 가지 화면 너비 검증 통과. 별도 브라우저 컨텍스트로 실행해 기존 사용자 데이터는 변경하지 않았다.
- 공개 app.js·공유 CSS 2개·웹 CSS·Galmuri11·아이콘·대표 스타터 그림이 소스와 SHA-256 일치(텍스트 줄바꿈 정규화). HTML의 앱/스타일 참조에는 내용 해시를 붙여 업데이트 때 오래된 캐시를 재사용하지 않는다.
- Windows 로컬 생성물이 없는 새 CI 체크아웃에서도 빌드되도록 그림은 추적된 `assets/` 원본에서 읽는다. 개인 그림이나 Anna 런타임 저장은 포함하지 않는다.
