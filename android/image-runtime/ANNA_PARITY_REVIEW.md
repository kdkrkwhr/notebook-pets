# Anna와 Android 설치본 비교 — 2026-10-26

이 문서는 코드·배포 기록·이미 준비된 APK를 읽은 결과다. 이번 조사 중 휴대폰/USB 조작, 설치, 모델 다운로드, AI 호출은 없었다. 최신 로컬 수정안과 실제 설치 APK를 구분한다.

## 비교 기준과 한계

- Anna 공개 1.4.13: 저장소 `anna/releases/RELEASE_1413.md`와 `anna/reviews/REVIEW_1413.md`의 공개/심사 기록. 런타임 `76449c3`, 패키징 `246781d`; 이 커밋 `anna/app.json`이 1.4.13이다. 기록상 후보1446 / bundle1343 / 172 files / 171337956B / manifest SHA256 `1419a6f232f68be462dc7aa0b782f9c7ab2c0cbae375c751f9f3d6988b4a1ddf`. 소유자 초안 revision89는 공개 동결본과 별개다.
- Anna 제출 1.4.17: 공식 개인 저장소 `release`의 `anna/releases/RELEASE_1417.md`, `anna/HANDOFF.md`, 고정 커밋 `85de6460afbce9c5c2b967fdd2a55f6d26b870ae`의 `anna/app.json`과 `birth-art.mjs`를 GitHub 읽기 API로 확인했다. 기록상 후보1640 pending / is_latest false / published_at null; bundle1523 / 176 files / 171636644B / manifest SHA256 `b1515f206c4128fe853db1c5350b8c059f3ea10340cab1c814d8b61b1282c22d`. 공개 승인이 아니다. 주요 추가 기능은 소유 아이템을 적용하는 image.edit 기반 착용/미리보기/확정이다.
- 오늘 공개 스토어 GET은 HTTP403이었다. 현재 Anna 서버 상태 및 동결 CDN 번들 바이트를 새로 확인했다고 주장하지 않는다. 1.4.13 공개/1.4.17 제출 구분은 위 일차 배포 기록 기준이다. 최신 release 브랜치를 공개본으로 간주하지 않았다.
- Android 기준: `release-android`의 `ee0f420353c6709c74a1d77bf6eb02af6013376b`, 0.2.2-alpha. 현재 브랜치는 `codex/android-ondevice-img2img`, HEAD는 동일하고 변경은 미커밋이다.
- 실제 설치본: `io.github.kdkrkwhr.notebuddy.lab.ondevice`, 표시명 `Notebuddy · 기기생성`, 0.2.3-alpha/code5, APK242798460B / SHA256 `6c2e12dcb9510ff853b38e3317b5199ea17e92fbbfc7e793b73256762b2286db`. 설치 때 폰 base.apk와 일치했다. 이번에는 그 PC APK의 asset도 읽었다.
- `verifyModel` 오프라인 확인 수정안은 설치본에 없다. 설치 APK의 설정은 여전히 `download` action을 호출한다.

## 우선 문제

| 우선순위 | 확인한 차이 / 영향 | 발생 구분 |
| --- | --- | --- |
| P0 | 설치본 `ready=false`: Gemma 파일 크기·SHA256은 일치했지만 `.verified` 영수증이 없어 대화/텍스트 AI가 차단된다. 파일이 없다는 뜻은 아니다. 직접 SD img2img는 Gemma 없이 별도로 실행 가능하다. | 이번 별도 패키지 준비 미완료. 기존 모바일에도 있던 영수증 조건을 충족하지 못했다. |
| P1 | Anna의 `checkArtwork`→허용/불명확/거절→특징·종·속성·확신도→확인→생성 흐름이 Android 탄생에 연결되지 않았다. | 0.2.2의 원본 사용 경로부터 없었으며, 이번 생성 추가도 누락을 해소하지 못했다. |
| P1 | 이번 생성은 모든 입력에 고정된 monster prompt, 256x256 강제 변형, 12 steps/strength .55/seed1026이다. 사람 유지·없는 팔다리 추가 금지·잘린 사진 구도 유지가 Anna 수준으로 전달되지 않는다. | 이번 추가 생성 경로의 불완전한 이식. 모델 성능과 별도의 구현 문제다. |
| P1 | Android `web/app.js` start는 이름만 넘긴다. Anna는 분석한 `birth_species`/`birth_element`를 넘긴다. 생성 그림과 게임 종·속성이 어긋날 수 있다. | 기존 모바일 차이, 이번에도 남음. |
| P1 | 첫 화면에 별도 생성/취소/결과 영역이 덧붙었고, imageEnabled 빌드에서는 결과가 없으면 첫 저장을 막는다. 생성 실패 시 원본으로 친구 만들던 0.2.2 경로를 이용할 수 없다. | 이번 동작 변경. 명확한 실패/대체 경로가 필요하다. |
| P1 | 미확정 생성 결과는 JS 메모리에만 있다. 앱/프로세스 재시작 전에 확정하지 않으면 미리보기 복구가 없다. 확정된 원본/결과는 별도 파일로 한 트랜잭션에 저장한다. | 이번 생성 흐름의 복구 미완료. 본앱 실기기 저장/재실행은 아직 미검증. |
| P1 | `imageGeneration:false`, `imageReady:false`와 기존 오류 문구가 유지된다. 탄생 전용 native action만 생성 가능하며 진화/집 이미지는 미연결이다. | 원래 모바일 제한을 이번에도 유지. 전역 이미지 생성 완성으로 표시하면 안 된다. |

## 화면과 흐름 비교

| 항목 | Anna 공개 기준 | Android 0.2.2 → 설치 0.2.3 |
| --- | --- | --- |
| 진입/온보딩 | Anna 호스트 연결, title screen, 만남 방식→이름→만남, 랜덤 또는 그림/사진 | WebView GameActivity 직접 진입·시작 화면·사진/직접그리기 중심은 기존 차이. 진단 MainActivity는 exported=false이며 launcher가 아니다. 이번에 생성 안내/버튼/미리보기 추가. |
| 화면 탐색 | 공유 카드/대화/집 대화상자 기반 | 기존부터 친구·대화·모험·기록 4탭. 집은 친구 화면의 진입 버튼이며 네 번째 탭이 아니다. 이번 탭 구조 변경은 없음(생성 중 Back 취소만 추가). |
| 사진 선택 | 공통 그림 편집기, PNG/JPEG/WebP 정규화, 선택 취소, 원본 미리보기 | 같은 editor/normalizeArtwork 재사용 + Android Photo Picker. 이번 생성 동안 선택 잠금. 개인 사진 검사/새 열람 없음. |
| 분석과 생성 | VLM 분석 결과를 `birthPrompt`에 넣는 1024x1024 text-to-image. 원본 픽셀을 image.generate에 직접 넘기는 구조가 아니다. | 기존 원본 그대로 저장 → 이번 native SD1.5 img2img. 픽셀 입력은 사용하지만 분석 특징 텍스트를 만들거나 넘기지 않는다. |
| 사람 사진 | 사람은 mammal, 사람 형태 유지; 귀/발/꼬리 추가 금지. 신원·민감한 특성 추론 금지. | 고정 monster/full-body prompt가 사람·잘린 구도에도 적용된다. 사용자 목표와 정책을 명시적으로 맞춰야 한다. |
| 미리보기/확정 | 탄생은 사용자 만남 요청 후 분석·생성·결과 저장 흐름. 별도 결과 Apply가 필수인 구조라고 볼 수 없다. 1.4.17 아이템 착용은 별도 원본/결과 미리보기와 Apply가 있다. | 이번 탄생은 생성 미리보기 후 이름과 함께 명시 저장. 방향은 사용자 요구에 맞지만 Anna 탄생과 단계·배치가 다르다. |
| 실패/취소 | 검사·업로드·생성·저장 상태 구분, source/phase 기록, 받은 결과 저장 재시도, 불확실 결과 자동 AI 재요청 금지, 기본 모습 선택 경로 | 이번 native 작업은 취소/중복 차단/Back·background 취소/발열·메모리 보호. 결과 재시작 복구와 일관된 단계 UX는 미완료. |
| 진화/집 | 특징·선택 방향을 반영한 선택적 진화 그림, 첫 집 방문 시 AI pixel 또는 무료 기본 모습 | 규칙/화면 일부 공유하지만 새 진화/집 이미지 생성은 비활성. Gemma 준비 전 진화 제안 등 텍스트 AI도 제한. 1.4.17 착용도 이식되지 않음. |

## 모델과 구현 한계의 분리

Gemma4 E2B / LiteRT-LM0.18.1은 사진 입력을 텍스트로 이해하는 경로가 `LocalAI.run(image)`와 `GameActivity.complete`에 있다. 그러나 현재 탄생 코드는 이를 호출하지 않는다. 파일 준비만 해결해도 탄생 분석이 자동으로 생기지 않는다. Gemma를 닫고 SD를 순차 로딩하는 메모리 보호는 구현되어 있다.

실제 폰 생성 성공은 별도 probe의 합성 그림 한 장: 256px, 약174.9초, peak RSS 약5.45GiB. 이미지가 새로 생성된 것은 확인했으나 무늬/배경/선명도 품질은 통과하지 않았다. 본앱 고정 prompt는 probe의 특징별 prompt와 다르고 본앱 정상생성→확정저장→재실행 실검증은 아직 없다. 온디바이스 SD1.5가 Anna 모델과 같은 품질·지시 이행·스타일을 낸다고 보장할 수 없다.

## 최소 수정 순서 (계획, 이번 조사에서는 실행 안 함)

1. 기존 Gemma 파일만 검증하는 별도 action/버튼으로 준비 완료 상태를 회복. 이미 준비한 PC 수정안은 unit6/UI3/lint 통과, APK/휴대폰 미적용. 자동 다운로드 fallback은 금지한다.
2. Anna의 분석 계약·불명확 확인·사람 정책·종/속성 전달을 공통으로 사용한다. 사진 데이터는 로컬 Gemma에만 전달하고 특징을 구조 검증 후 보관한다. Gemma 해제 후 SD를 로딩한다.
3. birth용 고정 문구 대신 검증된 특징을 반영하는 짧은 SD용 prompt를 구성한다. 종·요소보다 원본 정체성을 우선하고 비정사각 입력을 패딩해 비율을 보존한다. Anna 수준 동일 결과는 약속하지 않는다.
4. 기존 공유 디자인 안에서 선택→분석/확인→생성 진행/취소→원본·결과 비교→명시저장을 통합한다. 미확정 결과를 격리 draft로 복구 가능하게 하고 오류 뒤 저장만 재시도한다. 실험용 엔진/벤치마크 설명은 일반 흐름에서 줄이고 설정에 둔다.
5. 후속 승인 후 새 합성 샘플로 분석/취소/정상생성/저장/재실행을 검증하고 데이터 보존 업데이트한다. 진화·집·착용은 지원 상태를 숨기지 않고 별도 범위로 남긴다. 새 모델/외부 API 전환 계획은 없다.

## 근거 위치

- `anna/bundle/birth-art.mjs:22-33`, `birth-flow.mjs:11-18,46-80,85-98`, `app.js:407-414`, `index.html:39` (공개 패키징 커밋246781d와 Android 기준의 birth-art/birth-flow/index 비교).
- `android/game/native-entry.js:18-49,71-92`; `local-image-birth.mjs:4-32`; `mobile-shell.js:5,28-59,105-130`.
- `android/app/src/main/java/io/github/kdkrkwhr/notebuddy/lab/LocalImage.kt:18,42,50`; `LocalAI.kt:25-55`; `GameActivity.kt:198-235,281-318`.
- `web/app.js:215-229`; `android/game/ai.js:2-14`; `android/app/src/main/AndroidManifest.xml:9-16`; `android/build_bundle.py:13-16,39-52`.
- `OFFLINE_MODEL_PREPARATION.md`와 상위 workspace `evidence/installed-ready.json`, `evidence/integrated-phone-preparation.json`, `evidence/image-generation/verification.json`.

## 차단 상태

기존 `download` 준비 호출은 자동 승인 검토가 새 다운로드 가능성 때문에 실행 전에 거부했다. 실행되지 않았고 재시도/다른 경로 우회는 하지 않았다. 이번 조사도 PC 읽기만 사용했다. 오프라인 확인 수정안의 휴대폰 적용·실행은 현재 중지 지시에 따라 미실행이며 후속 지시가 필요하다. 새로운 모델 다운로드 승인이나 사용자에게 파일을 다시 받게 하는 조치는 현재 필요하지 않다.
