# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 인계 이력](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-16 기준)

| 항목 | 값 |
| --- | --- |
| Anna 앱 | **1.4.5 소스 / 소유자 초안 `0.0.0-draft` / working revision 62**, 설치·실제 번들 연결 검증 |
| 최신 수정 | 정적 픽셀/방향 동작 상태 구분 및 실패 단계 진단; Anna 테스트 초안·공개 웹 반영 |
| 게임 도구 | **0.9.1 / Executa version 760**, 변경 없음, 클라우드 실행 확인, PC 오프라인 |
| 스토어 | **1.4.5 / ID 1417 / pending_review**, 요청에 따라 후보 교체, 기존 소개·스크린샷 유지 |
| 검증 | JS 91 · 브라우저 105 · strict · Windows/Linux/Pyodide CI, 실제 설치 안내·저장 보존 확인 |
| 공개 웹 | **0.5.0**, Pages 배포와 실제 URL의 공통 모듈·1120/360px·저장 검증 완료 |
| 제한 | 대표 체형 4종 중 3종 수용·네발 잎 장식 시트 판독 거부. 생성물 의미 검수 필요, 실제 Anna 참조 생성 미검증, 아바타 착용 미구현 |

최신 작업 2건만 유지한다. 이전 전투·던전 안내 기록은 내용 수정 없이 이력 맨 위로 옮겼다.

---

# 1.4.5 후속 · 동작 준비 실패 표시·진단 · 2026-10-16

사용자가 전달한 dora의 스크린샷에는 저장된 초상화·정적 픽셀 미리보기와 동작 준비 실패 안내가 함께 표시됐다. 정적 미리보기만 있어도 “Ready for dungeon exploration”이라고 표시하고 동작 생성의 모든 예외를 하나의 안내로 숨기는 코드 문제를 확인했다. **스크린샷만으로 당시 이미지 제공자 요청·다운로드·시트 검증 중 무엇이 실패했는지는 확정하지 못한다. 이번 변경은 생성 성공률이나 당시 실패 원인 해결을 증명하지 않는다.**

- 픽셀 안내를 정적 미리보기로 명확히 하고 홈/던전 방향 동작 상태를 따로 안내한다. 요청·참고 이미지·응답 누락·다운로드·4×4 시트 판독·저장 실패를 단계 코드로 구분한다. 기존 요청 기록에 짧은 실패 단계만 최선 노력으로 보관하며 원문 오류·키·서명 URL은 저장하지 않는다. 예전 실패 기록은 원인을 추정하지 않고 미완료 요청으로 표시한다. 다른 그림·성장 단계의 실패를 가져오지 않으며 늦은 진단 쓰기도 삭제/교체 가드를 통과해야 한다.
- 자동 재생성·수동 동작 재생성 버튼은 추가하지 않았다. 같은 그림의 요청 예약과 저장만 재시도하는 복구를 유지한다. 판독기의 16프레임 규칙이나 생성 프롬프트, Python 보상·능력치·시간 규칙은 변경하지 않았다. 저장된 친구·초상화·대화는 보존한다.
- Anna **1.4.5 소스 / working revision 62 / 소유자 초안 0.0.0-draft** 업로드·설치. 소스 `c8cf0debe8350502b2cba71d8c57a9ccb921c213`. 게임 도구 **0.9.1 / 기존 Executa 760**은 변경·재게시하지 않았다. 설치의 실패 Executa는 0개다. **심사 후보 1.4.5 / ID 1417 / pending_review**를 유지하며 새 cut/심사 제출/공개 출시를 하지 않았다. CLI push가 동일 스크린샷 파일을 새 CDN URL로 재업로드해 공유 목록 참조가 바뀐 것을 확인해 원래 URL 목록으로 복원했고, 이후 소개·스크린샷·로고·지원 링크·심사 후보가 이전 값과 정확히 같음을 확인했다.
- 실제 설치 번들을 공식 WM/브리지로 실행해 Connected·한영 정적 미리보기 안내·360px·실제 app.js/home-sprite.mjs/i18n.mjs 원본 일치를 확인했다. 설치 화면 확인 전후 앱 저장 4종의 값/ETag와 게임 inspect 응답이 같다. AI 호출 0·페이지 예외 0이다. 실패 분류기는 실제 설치 모듈의 순수 함수에 별도 테스트 입력을 넣어 확인했으며 사용자의 공책을 실패 상태로 만들지 않았다. 설치 전에는 닫힌 창의 토큰으로 APS 접근이 거부돼 완전한 사전 스냅샷을 얻지 못했고, 보존 비교는 설치 후 실제 화면 검증 전후를 기준으로 했다.
- 검사: JS **91**·strict 통과. API 실패/잘못된 시트·실패 기록의 재열기·정적 픽셀 보존·추가 AI 0 회귀 검사를 확인했다. 전체 브라우저 **105개**와 저장/프로토콜·독립 패키지 검사를 포함한 [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38894333095) 및 [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38894333028)가 성공했다.
- 공유 코드를 Git merge로 `release-web`에 통합했고 웹도 단계별 오류를 표시한다. 웹 **0.5.0**, 소스 `73c3cbc074976468398391a1c7dfab549db60b35`, [Pages 검사·배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38894499755)와 [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38894499628) 성공. 실제 공개 URL에서 HTML·공통 모듈·웹 AI 모듈의 빌드 일치, 1120/360px, 설정 확인 중 게임 저장 불변·AI 0·페이지 오류 0을 확인했다. 기존 웹 전용 Ollama/ComfyUI 선택은 유지한다.
- 제한: 실제 Anna 유료 이미지 요청은 실행하지 않았다. dora의 이전 실패를 규명하려면 Anna 측 해당 요청 로그 또는 실패 원본 출력이 필요하다. 생성물 의미 검수와 분리된 부속 부위에 대한 기존 시트 판독 제한도 유지된다. 개인 검증 파일은 `.local/anna-guidance/movement-*`와 웹 worktree의 `.local/`에만 있다.

# 1.4.5 후속 · 가구 구매 확인창 수정 · 2026-10-16

사용자 보고: 가구 구매 버튼을 눌러도 확인창·코인·보유 표시 변화가 없었다. Anna 공식 iframe sandbox는 `allow-modals`를 허용하지 않는데 기존 코드가 `window.confirm()`을 사용해 브라우저가 확인창을 무시하고 **false**를 반환했다. 같은 sandbox에서 경고와 구매 취소를 재현했다. 기존 테스트는 최상위 페이지에서 네이티브 확인창을 자동 승인해 이 문제를 놓쳤다.

- 확인창을 앱 내부의 접근 가능한 HTML dialog로 교체했다. 한·영 가구명/가격·보관함 안내·취소/구매 확인을 제공하고 Esc로 취소한다. 구매 성공 시 해당 가구명과 보관함 저장·‘꾸며 줘’ 다음 행동을 표시한다. sandbox 권한·Python 규칙·가격·AI 호출 조건은 변경하지 않았다. 구매만으로 배치하거나 AI를 호출하지 않는다.
- 앱 **1.4.5 소스 / working revision 61 / 소유자 초안 `0.0.0-draft`** 업로드·설치 완료. 소스 `29ac4cc229f18e2c4a20096a2d8fd633793d6b3f`. 새 cut/심사 제출/공개 출시 없이 **1.4.5 / ID 1417 / pending_review** 후보 및 공유 소개·스크린샷·로고·지원 링크를 유지했다. `dirty_vs_latest_cut=true`. 게임 도구 **0.9.1 / Executa 760**은 변경 없이 재사용했고 설치 응답 `already_satisfied`다. 실제 클라우드 플러그인 manifest 0.9.1 / enabled=true / running=true / last_error=null을 확인했다.
- 검증: JS **89**·브라우저 **104**·strict 통과. 실제 Python 코어를 Anna와 같은 sandbox에 연결한 회귀 검사에서 확인 전 저장 불변·취소/Esc·코인 100→90·가구 보유·배치 불변·구매 AI 0회, 응답 유실 후 동일 요청 재시도 코인 82 유지·중복 차감 방지·한영/모바일을 확인했다. 웹 기본/저장/백업·홈/던전/꾸미기·7개 테마 통합 검사도 통과했다.
- 실제 설치 번들을 공식 WM/호스트 브리지로 실행해 **Connected**, 한영 확인창·모바일·취소/Esc를 확인했다. 사용자 코인을 쓰는 실제 구매 확정은 하지 않았다. 모의 응답 없이 home.mjs/home.css HTTP 200/원본 바이트 SHA-256 일치, HTML은 실제 DOM으로 확인했다(iframe 직접 fetch 403). 설치 전후 앱 저장 4종 값/ETag 및 게임 inspect 응답 동일·AI 0회·브라우저 예외 0이다. 일반 대시보드의 쿠키 로그인/사용자 브라우저 재접속은 별도 확인 범위다.
- 웹 **0.4.2** 유지, 소스 `c8c54570c21c840814144b6432923b838ed69768`에 공통 코드를 Git merge로 통합하고 [Pages 배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38889927900)를 완료했다. 실제 공개 URL의 격리 공책에서 취소 시 저장 불변·구매 후 코인 100→90/책상 보유/배치 불변·보유 가구 중복 구매 비활성·360px·Esc 취소를 확인했다. HTML/home.mjs/home.css 원본 바이트 일치·AI 0회·브라우저 예외 0, 사용자 웹 저장소는 건드리지 않았다.
- [release 공통 Windows/Linux/Pyodide CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38889638086)와 [웹 공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38889928125) 성공. [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38889637988)는 기록 시점 진행 중이다. 개인 저장 스냅샷·검증 화면은 Git 제외 `.local/anna-guidance/`와 `.local/anna-home-purchase/`에만 보관한다.
