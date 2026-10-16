# 1.4.6 · 최신 수정의 심사 반영

사용자 요청에 따라 최신 검증 초안을 비공개 **1.4.6 / ID 1426**으로 묶고, 심사 후보를 **1.4.5 → 1.4.6 / pending_review**로 교체했다. working revision **64**, `dirty_vs_latest_cut=false`. 소유자 초안 설치 성공·실패 Executa 0개를 확인했다. Anna 공개 출시는 하지 않았다.

이번 심사본에는 기존 1.4.5 cut 이후의 전투/던전 규칙 안내, sandbox 가구 구매 확인창, 정적 픽셀 미리보기와 방향 동작 상태 구분, 단계별 동작 실패 진단, 분리된 작은 꼬리/장식 부위 판독 수정이 포함된다. 게임 도구는 변경 없는 **0.9.1 / Executa version 760**이다.

런타임은 앞서 설치·검증한 revision 63과 같고 버전 메타데이터만 올렸다. **JS 91 / 브라우저 106**, [공통 CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38927806778) 및 [Anna Windows/Linux CI](https://github.com/kdkrkwhr/notebook-pets/actions/runs/38927806437) 통과 결과를 재사용하며, 1.4.6 메타데이터로 strict 검증도 통과했다. 설치 후 앱 저장 4종 값·ETag와 게임 inspect 응답, 소개·스크린샷·로고·지원 링크가 이전과 동일하다.

공개 웹은 기존 검증 배포 **0.5.0**을 유지하며 이번 심사 교체로 웹 코드는 바꾸지 않았다. dora의 과거 생성 실패 원인은 원본 응답/로그 없이 확정하지 못하며, 이미 유실된 생성 결과를 복구한 것은 아니다. [세부 수정·검증 기록](RELEASE_145.md).
