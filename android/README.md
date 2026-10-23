# 노트버디 Android · 0.2.0 alpha

내가 그린 그림이나 사진을 친구로 삼고, 휴대폰에서 함께 키우는 노트버디입니다. 이전 AI Lab의 검증 화면 대신 기존 노트버디 게임 화면을 연결했습니다.

## 시작하기

1. APK를 **기존 앱 위에 업데이트 설치**합니다. 이미 받은 모델과 검증판 사진은 유지됩니다. 앱 이름은 **노트버디**로 표시됩니다.
2. 시작 화면에서 **그림 그리기 · 사진 고르기**를 누르세요. 검증판에서 선택했던 사진이 있다면 **검증판 사진 가져오기**도 사용할 수 있습니다. 가져오기는 기존 검증판 기록을 수정하지 않습니다.
3. 이름을 짓고 **친구 만나기**를 누르면 그림과 게임이 함께 저장됩니다. 게임 속 종족·속성은 무작위로 정해집니다.
4. 설정의 **휴대폰 AI**에서 모델 준비 상태를 확인하세요. 이전에 다운로드한 모델은 다시 받지 않습니다. 처음 설치했다면 약 2.59GB를 한 번 받아야 합니다.
5. 밥 주기·놀기·훈련·산책·출석을 즐기고, 직접 말을 걸어 보세요. 로컬 AI가 한국어로 답하고 최근 대화를 참고합니다.

**이번 버전의 그림은 원본 그대로입니다.** 사진을 새 일러스트로 생성하거나 방향별 동작을 만드는 이미지 모델은 포함하지 않았습니다. 진화로 게임 상태와 성장 기록은 바뀌지만 그림은 유지합니다. 마이홈 첫 방문에서는 현재 그림으로 만든 무료 기본 픽셀 모습을 선택합니다.

## 가능한 기능

- 직접 그리기, 사진 선택, 기존 검증판 사진을 명시적으로 가져오기
- 기존 노트버디의 돌봄·성장·퀘스트·산책 이야기·발견한 던전·아이템 도감
- 성장 조건을 만족한 뒤 진화 방향 선택. AI 제안이 실패하면 기본 세 방향 제공
- 집과 마당, 가구 구매, **꾸며 줘**를 눌렀을 때 한 번만 로컬 AI에 배치 요청
- 테마 선택, 대화/그림/게임의 기기 내 저장과 재실행 복구
- **공책 보관**에서 Android 파일 선택기로 JSON 백업 저장·가져오기

AI 없이도 기본 게임을 사용할 수 있습니다. AI가 고른 보상이나 능력치를 적용하지 않고 기존 Python 게임 엔진이 판정합니다. UI·아트·Python/WASM 엔진을 APK에 포함하므로 게임 화면에 인터넷 연결이 필요하지 않습니다.

## 저장과 AI

- 계정·API 키·유료 AI 구독·자체 서버 없이 휴대폰에서 실행합니다. 사진과 대화를 외부 AI에 전송하지 않습니다.
- 모델 다운로드에는 네트워크와 데이터가 필요합니다. Wi-Fi를 권장합니다. 앱이 배경으로 가면 일시정지하고 다음에 이어받을 수 있습니다.
- 게임 공책은 앱의 IndexedDB에 저장합니다. 검증판의 원본 사진·분석·대화 파일은 별도로 남겨 둡니다. 기존 Lab 대화를 새 친구에게 자동으로 붙이지 않습니다.
- 앱 제거나 앱 데이터 삭제 시 게임과 모델도 삭제됩니다. **공책 보관**에서 먼저 백업하세요. 같은 서명의 업데이트 설치는 데이터를 유지합니다.
- 최근 대화 4개 메시지를 다음 요청에 전달합니다. 입력은 최대 500자이며 모델 출력은 요청별 제한을 적용합니다. 과거 전체 대화를 항상 기억하는 것은 아닙니다.
- 앱이 배경으로 가면 진행 중인 AI를 취소하고 모델 메모리를 해제합니다. 다른 유료 API로 자동 전환하거나 요청을 자동 재시도하지 않습니다.
- 현재 게임 UI는 한국어입니다. GPU 실행이 기본이며 기기별 호환성·발열·긴 세션은 추가 검증이 필요합니다.

## 설치와 빌드

Android 12(API 31) 이상을 대상으로 합니다. 현재는 개발용 APK이며 Play Store 제출본이나 iOS 앱이 아닙니다. `release-android` 브랜치의 [Actions 빌드](https://github.com/kdkrkwhr/notebook-pets/actions/workflows/android.yml)에서 APK 아티팩트를 생성합니다. CI의 디버그 서명은 로컬 설치본과 다를 수 있으므로 기존 앱을 지우고 설치하지 마세요.

JDK 17 이상, Python 3, Node.js, Android SDK 36이 필요합니다.

```powershell
npm ci --prefix tests/pyodide --ignore-scripts
cd android
.\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug
adb -s YOUR_DEVICE install -r app\build\outputs\apk\debug\app-debug.apk
```

Python 경로가 필요하면 Gradle에 `-PbundlePython=C:\path\python.exe`를 전달합니다. `build_bundle.py`가 공유 웹 UI, Anna의 공통 화면/아트, `engine/game_api.py`와 Pyodide를 APK 자산으로 묶습니다. 게임 규칙을 Kotlin으로 복사하지 않습니다.

기존 모델과 사진을 보존하기 위해 앱 ID는 `io.github.kdkrkwhr.notebuddy.lab`을 유지합니다. `versionCode=2`, `versionName=0.2.0-alpha`입니다. Anna·Desktop·공개 웹 배포 및 심사본과는 별개입니다.

## 검증

```powershell
# 저장소 루트에서: 실제 Python/WASM 게임, 네이티브 AI 응답만 모의 처리
node tests/pyodide/android-game.mjs

# 실기기 전용 별도 테스트 공책. 사용자 공책/검증판 파일은 보존 검사
adb -s YOUR_DEVICE install -r android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s YOUR_DEVICE shell am instrument -w -e class io.github.kdkrkwhr.notebuddy.lab.GameSmokeTest -e liveGame true io.github.kdkrkwhr.notebuddy.lab.test/androidx.test.runner.AndroidJUnitRunner
```

`liveGame=true`일 때만 실제 로컬 대화를 실행합니다. 테스트 공책은 디버그 빌드의 명시적 `testNotebook` 인텐트로만 선택됩니다. 결과와 한계는 [VALIDATION.md](VALIDATION.md), 현재 상태는 [HANDOFF.md](HANDOFF.md)에 기록합니다.

## 모델과 오픈소스

- LiteRT-LM Android `0.18.1`, Gemma 4 E2B IT LiteRT-LM (텍스트·이미지 입력 / 텍스트 출력)
- 모델 리비전 `a790a852d433991c0c0a41c1154cf9b3850300fa`, 파일 크기 `2,588,147,712` bytes
- SHA-256 `181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c`
- 모델 파일은 APK/Git에 포함하지 않고 고정된 배포처에서 다운로드·검증합니다.
- Pyodide `314.0.7` / CPython `3.14.2`, WebViewAssetLoader의 로컬 HTTPS 출처 사용
- 앱 설정의 **오픈소스 고지**에 라이선스 및 소스 위치를 포함합니다.

[LiteRT-LM 소스](https://github.com/google-ai-edge/LiteRT-LM/tree/v0.18.1) · [모델 배포처](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) · [Pyodide 소스](https://github.com/pyodide/pyodide/tree/314.0.7)
