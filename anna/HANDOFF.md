# Anna 작업 인계

[사용 안내](README.md) · [개발·배포](DEVELOPMENT.md) · [이전 인계 이력](HANDOFF_HISTORY.md)

## 현재 상태 (2026-10-16 기준)

| 항목 | 값 |
| --- | --- |
| Anna 앱 | **1.4.5 소스 / 소유자 초안 `0.0.0-draft` / working revision 61**, 설치·실제 번들 연결 검증 |
| 최신 수정 | 가구 구매 확인창의 Anna 샌드박스 호환성 수정; Anna 초안·공개 웹 반영 및 실제 검증 완료 |
| 게임 도구 | **0.9.1 / Executa version 760**, 변경 없음, 클라우드 실행 확인, PC 오프라인 |
| 스토어 | **1.4.5 / ID 1417 / pending_review**, 요청에 따라 후보 교체, 기존 소개·스크린샷 유지 |
| 검증 | JS 89 · 브라우저 104 · strict · Windows/Linux/Pyodide CI, 실제 설치 안내·클라우드 도구·저장 보존 확인 |
| 공개 웹 | **0.4.2**, Pages 배포와 실제 URL의 공통 모듈·1120/360px·저장 검증 완료 |
| 제한 | 대표 체형 4종 중 3종 수용·네발 잎 장식 시트 판독 거부. 생성물 의미 검수 필요, 실제 Anna 참조 생성 미검증, 아바타 착용 미구현 |

최신 작업 2건만 유지한다. 이전 1.4.5 방향 시트 배포 기록은 내용 수정 없이 이력 맨 위로 옮겼다.

---

# 1.4.5 후속 · 가구 구매 확인창 수정 · 2026-10-16

사용자 보고: 가구 구매 버튼을 눌러도 확인창·코인·보유 표시 변화가 없었다. Anna 공식 iframe sandbox는 `allow-modals`를 허용하지 않는데 기존 코드가 `window.confirm()`을 사용해 브라우저가 확인창을 무시하고 **false**를 반환했다. 같은 sandbox에서 경고와 구매 취소를 재현했다. 기존 테스트는 최상위 페이지에서 네이티브 확인창을 자동 승인해 이 문제를 놓쳤다.

- 확인창을 앱 내부의 접근 가능한 HTML dialog로 교체했다. 한·영 가구명/가격·보관함 안내·취소/구매 확인을 제공하고 Esc로 취소한다. 구매 성공 시 해당 가구명과 보관함 저장·‘꾸며 줘’ 다음 행동을 표시한다. sandbox 권한·Python 규칙·가격·AI 호출 조건은 변경하지 않았다. 구매만으로 배치하거나 AI를 호출하지 않는다.
- 앱 **1.4.5 소스 / working revision 61 / 소유자 초안 `0.0.0-draft`** 업로드·설치 완료. 소스 `29ac4cc229f18e2c4a20096a2d8fd633793d6b3f`. 새 cut/심사 제출/공개 출시 없이 **1.4.5 / ID 1417 / pending_review** 후보 및 공유 소개·스크린샷·로고·지원 링크를 유지했다. `dirty_vs_latest_cut=true`. 게임 도구 **0.9.1 / Executa 760**은 변경 없이 재사용했고 설치 응답 `already_satisfied`다. 실제 클라우드 플러그인 manifest 0.9.1 / enabled=true / running=true / last_error=null을 확인했다.
- 검증: JS **89**·브라우저 **104**·strict 통과. 실제 Python 코어를 Anna와 같은 sandbox에 연결한 회귀 검사에서 확인 전 저장 불변·취소/Esc·코인 100→90·가구 보유·배치 불변·구매 AI 0회, 응답 유실 후 동일 요청 재시도 코인 82 유지·중복 차감 방지·한영/모바일을 확인했다. 웹 기본/저장/백업·홈/던전/꾸미기·7개 테마 통합 검사도 통과했다.
- 실제 설치 번들을 공식 WM/호스트 브리지로 실행해 **Connected**, 한영 확인창·모바일·취소/Esc를 확인했다. 사용자 코인을 쓰는 실제 구매 확정은 하지 않았다. 모의 응답 없이 home.mjs/home.css HTTP 200/원본 바이트 SHA-256 일치, HTML은 실제 DOM으로 확인했다(iframe 직접 fetch 403). 설치 전후 앱 저장 4종 값/ETag 및 게임 inspect 응답 동일·AI 0회·브라우저 예외 0이다. 일반 대시보드의 쿠키 로그인/사용자 브라우저 재접속은 별도 확인 범위다.
- 웹 **0.4.2** 유지, 소스 `c8c54570c21c840814144b6432923b838ed69768`에 공통 코드를 Git merge로 통합하고 [Pages 배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38889927900)를 완료했다. 실제 공개 URL의 격리 공책에서 취소 시 저장 불변·구매 후 코인 100→90/책상 보유/배치 불변·보유 가구 중복 구매 비활성·360px·Esc 취소를 확인했다. HTML/home.mjs/home.css 원본 바이트 일치·AI 0회·브라우저 예외 0, 사용자 웹 저장소는 건드리지 않았다.
- [release 공통 Windows/Linux/Pyodide CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38889638086)와 [웹 공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38889928125) 성공. [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38889637988)는 기록 시점 진행 중이다. 개인 저장 스냅샷·검증 화면은 Git 제외 `.local/anna-guidance/`와 `.local/anna-home-purchase/`에만 보관한다.

# 1.4.5 후속 · 일반 전투·던전 규칙 안내 · 2026-10-16

사용자 요청에 따라 **규칙을 변경하지 않고** 한국어·영어 안내를 추가했다. 앱 **1.4.5**, 도구 **0.9.1**, 웹 **0.4.2** 버전을 유지한다. Anna 소스 `4f9257ebe6f222209de06b245a6f68b780808fe3`, 웹 소스 `e7d015d1badba958d9d860075f3d5732ce798ba2`.

- 승패 표시를 일반 전투로 명확히 하고 산책 중 야생 몬스터와의 전투만 집계하며 던전 결과는 포함하지 않는다고 안내한다.
- 던전 미발견·클리어·만료 후에도 발견 안내는 남기되, 미발견 던전 입장 카드는 노출하지 않는다. 다섯 지역·레벨 해금 없음·한 번에 한 던전·산책 25%·당일 클리어 지역의 한국 시간 자정 재편입을 설명한다.
- 발견 후 24시간 만료·자동 교체/타이머 초기화 없음·입장 완료 스테이지의 선택 보존, 새 탐험/패배 후 재도전 최대 HP·같은 탐험 내 체력 유지·쉼터 회복을 설명한다. HP 안내는 입장 버튼 위에 표시한다.
- 검증: JS **89**, strict 통과. 브라우저 **103** 통과. 웹 기본/저장/백업·홈/던전·7개 테마 통합 검사 통과. 로컬 웹 1120/360px·입장 안내·저장 스냅샷 동일·AI 0회·페이지 오류 0 확인.
- **Anna 배포 완료**: 사용자 로그인 승인 후 working revision **60** 업로드와 소유자 초안 **`0.0.0-draft`** 설치에 성공했다. 새 불변 버전은 만들지 않아 **1.4.5 / ID 1417 / pending_review** 후보와 공유 소개·스크린샷·로고·지원 링크를 유지했다. `dirty_vs_latest_cut=true`는 설명 변경이 테스트 초안에만 반영됐음을 뜻한다. 기존 Executa **0.9.1 / version 760**을 재사용했고 설치 응답은 `already_satisfied`, 클라우드 실제 플러그인 manifest **0.9.1 / enabled=true / running=true / last_error=null**을 확인했다. PC는 오프라인이며 도구 코드·패키지는 변경하지 않았다.
- 실제 검증: 설치 번들을 플랫폼의 공식 창 관리자·호스트 브리지에 연결해 **Connected**, 한국어·영어 승패/발견/만료/HP 안내와 실제 진행 중인 지옥문 선택의 보존, 360px 화면을 확인했다. 모의 게임/AI 응답은 쓰지 않았고 AI 호출 0·브라우저 예외 0이다. 개발자 PAT는 일반 대시보드의 브라우저 세션 로그인을 대신하지 못해 공식 WM/브리지를 별도 테스트 호스트에 올렸다. 사용자 일반 브라우저의 재접속은 별도 확인 범위다. 설치 번역·던전·CSS 3개 HTTP 200/SHA-256 소스 일치, HTML은 Node 인증 요청 HTTP 200/소스 일치 및 실제 DOM으로 확인했다(iframe 직접 fetch는 플랫폼 403).
- 설치 전후와 실제 화면 확인 후 앱 저장 **아트·대화·산책 이야기·성격 초안** 값/ETag 및 게임 개인정보 inspect 응답이 동일하다. 생성·전투·산책·구매·꾸미기·리셋·삭제는 실행하지 않았다. 개인 스냅샷·검증 화면은 Git 제외 `.local/anna-guidance/`에만 보관한다.
- 공개 웹 **0.4.2** 유지, [Pages 빌드·배포](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38886276977) 성공. 실제 공개 URL의 HTML·공통 번역·던전·앱 JS가 로컬 빌드와 동일하며 1120/360px·새 친구의 미발견 안내·입장 HP/만료 설명·저장 스냅샷 동일·AI 0회·페이지 오류 0을 확인했다. 별도 브라우저 컨텍스트로 사용자 저장소를 격리했다. [release 공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38886273807)와 [웹 공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38886277180) Windows/Linux/Pyodide 성공. [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38886273836)도 UI·브라우저·저장/프로토콜·패키지 검사를 모두 통과했다.
