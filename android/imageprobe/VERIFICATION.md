# 2026-10-26 SM-F741N 온디바이스 첫 생성 검증

실제 휴대폰 CPU에서 합성 그림→새 PNG 생성, 화면 표시, 명시적 별도 저장을 확인했다. 원본 표시를 생성 성공으로 처리하지 않았다. 게임 birth-flow는 아직 연결하지 않았고 기존 Android 게임의 `imageReady=false`는 유지된다. 이 결과는 생성 가능성 검증이며 출시 품질 승인이 아니다.

| 항목 | 실측·결과 |
| --- | --- |
| 기기 | SM-F741N, Android 16 / API 36, USB 인증됨 |
| 테스트 패키지 | `io.github.kdkrkwhr.notebuddy.imgqa20261026` |
| 입력 | 새 합성 녹색 캐릭터 그림, 개인사진 없음 |
| 경로 | SD1.5 img2img, 휴대폰 CPU 4 threads, q4_0, mmap |
| 조건 | 256×256, Euler A, 12 steps (strength 적용 후 7 진행 단계), strength 0.55, CFG 6, seed 1026 |
| 전체 시간 | 174,861ms (모델 무결성 확인·PNG 준비 포함) |
| native 생성 시간 | 168,912ms |
| context 생성 API 시간 | 128ms; 지연 로딩/계산 전체 모델 준비 시간으로 해석하지 않음 |
| 최대 process RSS | 5,710,496KiB ≈ 5.45GiB |
| 최대 표본 PSS | 5,639,158KiB ≈ 5.38GiB |
| 최소 시스템 MemAvailable | 4,626,076KiB |
| 최대 배터리 온도 | 35.6°C, thermal status 0 |
| 완료 후 PSS | 106,376KiB |
| PNG | 88,329B, SHA256 `bd64c8dd36c3a586710289280fa8e5dee591d2597e857e331ad4ae267294f27f` |
| 저장 확인 | UI 저장 버튼 사용 후 별도 UUID PNG 생성, 미리보기와 크기·SHA256 일치 |
| 오류 | 완료 실행의 해당 PID 수집 logcat에 FATAL/ANR/fatal signal 없음 |

초록 타원 몸통·삼각 귀·두 눈은 대체로 보존됐다. 빨간 마름모는 둥근 분홍 표시로 변했고 배경 잡무늬와 흐린 세부가 생겼다. 원본 특징의 정확한 보존과 진화 일관성은 통과하지 않았다. 한 장으로 일반 사진의 품질이나 지속 발열을 추정하지 않는다. 저장 화면 캡처에서도 원본/생성 결과 분리 표시와 저장 완료를 확인했다. 실험 앱의 상단 안내는 상태 표시줄과 가까워 safe insets 보정이 필요하다.

첫 시도는 CANCELLED이고 출력이 없었다. 당시 화면 Dozing/secure keyguard와 120초 화면 제한이 확인됐지만 최초 취소 이유 로그가 없어 직접 원인은 확정하지 않았다. 수정본은 생성 중 보이는 창에만 `FLAG_KEEP_SCREEN_ON`을 설정하고 완료/취소 후 해제한다. 사용자 잠금 해제 후 수정본으로 실제 120초를 넘겨 완료했다. 기기 보안·잠금·전역 화면 제한 설정은 바꾸지 않았다.

빌드와 모델:

- Android arm64 Release 엔진 빌드 성공, APK assembleDebug·Kotlin·Lint 성공. 수정 APK 빌드 17초, 이전 엔진 빌드는 재실행하지 않음.
- APK 43,815,964B, SHA256 `0cbf128cb3125674ab23f4bcc15cbe47c5ac21927574ac4444023ec58ea2bd6d`. 설치된 `base.apk`의 SHA256도 일치.
- Debug 서명 SHA256 `07987d756266505d7005e476357e8cbdd78d26b375174ff04520251a94026c7c`, APK v2 서명 검증 통과.
- 모델 4,265,146,304B, 폰 복사 SHA256 `6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa` 확인. 앱도 매번 무결성 확인.
- runtime 및 모델 고정 revision·라이선스는 README와 APK assets에 기록. 모델 가중치는 APK에 넣지 않음.

실기기 산출물은 작업공간 `evidence/image-generation/`에 보존한다: `generated-preview.png`, `result.json`, `telemetry.json`, `verification.json`, `app-logcat.txt`. 첫 취소 기록은 `evidence/image-generation-first-cancelled/`에 별도 보존했다. PC에서 생성 추론을 실행하지 않았고 외부 AI나 사진 전송을 사용하지 않았다. Gemma는 이 별도 앱에서 로드하지 않았다.

남은 작업: 해상도·프롬프트·정밀도에 따른 품질 검증, 게임 birth-flow 연결, Gemma 해제 후 생성 모델 로딩의 직렬화, 실패·취소·중복 요청·재실행 복원 테스트, 진화 일관성. 기존 `.lab`/이전 QA 앱과 공책은 이 검증에서 열거나 교체·초기화·삭제하지 않았다. 기존 개인 체크아웃은 변경하지 않았다. 기능 통합 완료로 커밋·푸시하거나 CI·배포 성공으로 보고하지 않는다.
