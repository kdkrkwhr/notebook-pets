# NoteBuddy Web preview

## 0.3.0 · 초기화·모델 선택·브랜치 간소화

- ‘공책 보관 → 현재 공책 초기화…’에서 경고와 ‘초기화’ 입력을 거쳐 이 브라우저의 게임을 비운다. 현재 탭의 대화/입력한 키도 지운다. 먼저 내려받은 백업은 다시 가져올 수 있다. 초기화 성공 전에는 화면 데이터를 지우지 않고, 다른 탭의 저장 변경이 있으면 초기화를 거절한다. 저장 revision을 유지해 오래된 작업이 이전 친구를 되살리지 못하게 한다.
- 모델은 드롭다운으로 선택한다. 기본 Gemini 2.5 Flash/Flash-Lite/Pro 외에 ‘사용 가능한 모델 불러오기’를 누르면 입력한 키로 Google `models.list`를 직접 조회해 대화용 목록을 채운다. 키를 URL이나 저장소에 넣지 않는다. 목록 조회는 생성 요청이 아니며, 모델별 사용 권한·할당량은 실제 호출 때 제공자가 판단한다. [Google 모델 API](https://ai.google.dev/api/models).
- 사용자 요청으로 `main`은 이력을 보존한 뒤 정리하고 `release-web`을 공통 통합·코어 검증·Pages 배포 기준으로 사용한다. Anna 전용 `release`는 그대로 유지한다.

## 0.2.0 · Anna 디자인 공유

Anna의 실제 `style.css`·`theme.css`·Galmuri11 폰트·아이콘·72종 기본 친구 그림·아이템 그림을 빌드 시 공유한다. 시작 화면과 아이템 도감 마크업/동작도 Anna 원본을 사용한다. 웹 전용 CSS는 플랫폼별 배치·설정 창에만 적용한다.

친구 카드, 경험치/포만감/친밀도 게이지, 돌봄 메뉴, 말풍선 대화, 오늘의 약속, 성장 앨범, 24종 아이템 도감을 제공한다. API 키/모델과 백업은 별도 대화상자에서 관리한다. 모바일에서는 친구→돌봄→대화 순서로 배치한다. IndexedDB 이름/버전과 저장·백업 형식은 그대로 유지한다.

Anna와 시각 자원을 공유하지만 이미지 생성·외형 편집·풍부한 산책 이야기·던전 애니메이션·대화 영속화까지 이식한 것은 아니다. 웹 초상화는 종족/속성에 맞는 기본 그림을 사용하며 성장 단계별 AI 그림은 생성하지 않는다. Anna 계정의 개인 그림·데이터는 정적 배포에 포함하지 않는다.

GitHub Pages에서 Python 엔진을 Pyodide module worker로 실행한다. 게임 서버·클라우드 DB·AI 프록시는 없다. Anna의 `release`와 데이터는 변경하지 않는다.

## 실행과 배포

```powershell
npm ci --prefix tests/pyodide --ignore-scripts
python web/build.py
python -m http.server 8080 --directory web/dist
```

`http://localhost:8080/`에서 실행한다. `file://`로 열지 않는다. `node tests/pyodide/web.mjs`는 실제 Edge/Chromium에서 Worker, 저장 복원, CAS 충돌, 백업 가져오기/내보내기, 모의 BYOK 요청과 키 비영속화를 검증한다.

`release-web`이 공유 소스 통합·검증과 Pages 배포를 담당한다. `.github/workflows/web.yml`이 이 브랜치의 빌드·브라우저 테스트 이후 Pages artifact를 배포한다. 모든 경로는 상대 경로여서 `/notebook-pets/` 하위 경로에서도 동작한다. 빌드는 지정한 Python 9개, 공개 규칙 JSON 2개, 공유 UI·폰트·공개 그림, 고정 버전 Pyodide 런타임을 복사한다. 저장 데이터·API 키·Anna 패키지는 포함하지 않는다.

## 저장과 AI

- IndexedDB `notebuddy-web`의 `saves/player`에 revision+state를 원자적으로 저장한다. 최초 생성도 revision 비교로 보호한다. 저장 실패/충돌 시 성공 결과를 표시하지 않는다. 시간은 기기 시계를 따른다.
- JSON 백업은 웹 전용 envelope 형식이며 코어 검증 후 이름/레벨 확인을 거쳐 교체한다. Anna 데이터 자동 이전·동기화는 없다.
- Gemini REST `generateContent`에 브라우저에서 직접 요청한다. 키는 입력 필드에만 존재하고 저장소·백업·URL에 쓰지 않는다. 새로고침하거나 키 지우기를 누르면 제거된다. 요청은 사용자가 대화 버튼을 누를 때만 발생한다.
- 제공자가 허용하는 모델명을 사용자가 설정한다. 기본값은 `gemini-2.5-flash`이며 실제 계정의 지원 여부/할당량은 제공자에 따라 다르다. API 키 제한과 브라우저 CORS 정책에 따라 요청이 거절될 수 있다. 유료 API 실호출은 검증에 사용하지 않았다.
- AI 결과는 텍스트로만 표시하며 게임 저장 API에 전달하지 않는다. 대화는 현재 탭에서만 표시하며 지속 대화 기록은 아직 없다.

## 범위와 제한

웹 프리뷰: 탄생·육성·산책 선택·전투·발견 던전·퀘스트·수동 백업·단일 턴 대화와 Anna 공통 디자인. 미이식 기능은 위의 0.2.0 범위를 따른다. 최초 실행에는 런타임 다운로드가 필요하다. 웹 프리뷰 작업은 Anna 앱이나 도구를 변경하지 않는다.

무료 정적 호스팅은 GitHub의 사용 한도/정책 내에서 이용한다. 사용자 API 사용료와 앱스토어 등록비까지 무료라는 의미는 아니다.

- [GitHub Pages 사용 한도](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Gemini API reference](https://ai.google.dev/api)
