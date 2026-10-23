# NoteBuddy AI Lab for Android

내 그림을 분석하고 캐릭터와 대화하는 **온디바이스 AI 검증 앱**입니다. 전체 노트버디 게임을 이식하기 전에 실제 휴대폰의 속도, 메모리, 한국어 응답, 그림 인식 품질을 확인합니다.

## 해볼 수 있는 것

1. 모델을 한 번 다운로드하고 SHA-256 검증을 마칩니다. 약 2.59 GB이며 Wi-Fi를 권장합니다. 중단하면 이어받을 수 있습니다.
2. 직접 그림을 그리거나 시스템 사진 선택기로 이미지를 고릅니다. 선택한 이미지만 512 px 이내로 줄여 앱 안에 저장합니다.
3. **분석해서 친구 만들기**를 누르면 로컬 모델이 색상, 귀, 몸, 꼬리와 성격을 분석합니다. 앱이 검증된 특징으로 간단한 일러스트를 그립니다.
4. 캐릭터에게 말을 걸고 한국어 답변과 앞선 대화 기억을 확인합니다. 모델 준비·첫 응답·전체 답변 시간을 표시합니다.

모델과 AI 처리는 휴대폰에서 실행합니다. API 키, 유료 AI 구독, 애플리케이션 서버는 필요 없습니다. 최초 모델 다운로드에는 네트워크와 통신 데이터가 필요합니다. 사진·대화는 AI 서버로 전송하지 않으며 백업 대상에서도 제외합니다.

**그림 생성의 한계:** Gemma는 이미지 입력을 이해하지만 이미지 자체를 생성하는 모델은 아닙니다. 이 앱은 `이미지 → 특징 JSON → 로컬 일러스트` 방식입니다. 제한된 도형·부위로 표현하므로 원본과 매우 비슷한 화풍이나 자유로운 장면 생성은 지원하지 않습니다. 기본 민트색 캐릭터는 AI 생성 결과가 아닌 미리보기입니다.

## 범위와 플랫폼

- Android 12(API 31) 이상, arm64 기기. 실기기 결과는 [VALIDATION.md](VALIDATION.md)를 확인하세요.
- 기본 GPU, 수동 CPU 선택. GPU 실패 시 유료 API나 다른 모델로 자동 전환하지 않습니다.
- 한국어·영어 UI(기기 언어 기준). AI에게 다른 언어로 대화할 수도 있지만 품질 검증 범위는 별도입니다.
- 대화는 최근 6왕복을 저장하고 최근 3왕복을 다음 요청에 전달합니다. 입력 최대 500자, 출력 최대 200 토큰입니다.
- 앱이 배경으로 가면 작업 중단을 요청하고 모델 메모리를 해제합니다. 다운로드는 앱을 열어 둔 상태에서 진행합니다.
- 캐릭터 게임 규칙, 진화, 던전, 마이홈, 기존 저장 데이터 가져오기와 iOS 앱은 아직 포함하지 않습니다.
- 기존 Anna / Desktop / 공개 웹 앱과 별도의 패키지입니다. 이 검증판 설치로 기존 게임 데이터는 바뀌지 않습니다.

## 빌드

JDK 17 이상, Android SDK platform 36이 필요합니다. `local.properties`에 `sdk.dir`을 지정하거나 `ANDROID_HOME`을 설정합니다.

```powershell
cd android
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
adb -s YOUR_DEVICE install -r app\build\outputs\apk\debug\app-debug.apk
```

앱 ID: `io.github.kdkrkwhr.notebuddy.lab`, 버전: `0.1.0-lab`.
디버그 APK는 개발 검증용이며 Play Store 제출본이 아닙니다. 다른 서명 키로 빌드한 APK는 기존 설치본을 덮어쓸 수 없습니다. 앱 제거는 앱 내부 데이터도 지우므로 업데이트에는 같은 서명을 사용하세요.

## 실기기 테스트

먼저 앱에서 모델을 준비합니다. 개인 갤러리를 읽지 않는 테스트용 민트색 캐릭터를 사용하며 테스트 이미지는 캐시에, 결과는 reports에 따로 저장합니다. 캐릭터/대화 저장소는 변경하지 않습니다. 아래 **명시적 opt-in** 테스트만 AI를 실행하며, 일반 자동 테스트는 AI를 실행하지 않습니다.

```powershell
.\gradlew.bat :app:assembleDebugAndroidTest
adb -s YOUR_DEVICE install -r app\build\outputs\apk\androidTest\debug\app-debug-androidTest.apk
adb -s YOUR_DEVICE shell am instrument -w -e live true -e backend gpu io.github.kdkrkwhr.notebuddy.lab.test/androidx.test.runner.AndroidJUnitRunner
```

실기기 측정 결과는 앱 외부 전용 저장소의 `files/reports/inference.json`에 저장합니다. 공개 문서에는 기기 일련번호나 개인 이미지를 포함하지 않습니다. USB 충전 중 측정한 배터리 수치로 사용 시간을 추정하지 않습니다.

## 고정한 모델과 의존성

| 구성 | 버전/출처 |
|---|---|
| LiteRT-LM Android | `com.google.ai.edge.litertlm:litertlm-android:0.18.1` |
| 모델 | [Gemma 4 E2B IT LiteRT-LM](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) |
| 모델 리비전 | `a790a852d433991c0c0a41c1154cf9b3850300fa` |
| 파일 | `gemma-4-E2B-it.litertlm` · 2,588,147,712 bytes |
| SHA-256 | `181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c` |
| 모델/런타임 라이선스 | Apache-2.0, 각 배포처 고지 참고 |
| 빌드 | AGP 8.13.2 · Kotlin 2.4.21 · Gradle 8.13 |

[공식 Android API](https://developers.google.com/edge/litert-lm/android), [모델 카드](https://ai.google.dev/gemma/docs/core/model_card_4), [런타임 소스/라이선스](https://github.com/google-ai-edge/LiteRT-LM/tree/v0.18.1).
모델 파일은 Git과 APK에 포함하지 않습니다. 고정된 공개 배포처에서 다운로드하며 실제 크기와 해시가 일치해야 사용할 수 있습니다.

## 다음 통합 원칙

검증 결과가 허용 가능한 경우 `release-web`의 공유 UI와 Pyodide 저장소 어댑터를 Android shell에 연결합니다. 게임 판정은 기존 `engine/game_api.py`와 명시적 `ExecutionContext`를 그대로 사용합니다. Android는 파일·생명주기·로컬 AI 어댑터를 제공하며 게임 규칙을 Kotlin으로 복사하지 않습니다. 모델 출력으로 보상·능력치·시간 제한을 변경하지 않습니다.
