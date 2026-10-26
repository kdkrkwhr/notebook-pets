# 온디바이스 img2img 검증 앱 (최초 생성·저장 확인, 품질 개선 필요)

이 모듈은 기존 Notebuddy `.lab` 및 `.lab.qa20261026`과 다른 패키지 `io.github.kdkrkwhr.notebuddy.imgqa20261026`을 사용한다. 인터넷 권한이 없으며 새 합성 그림만 입력한다. 원본 앱/QA 공책을 열지 않는다. 첫 실행은 취소됐지만 화면 유지 수정 후 SM-F741N에서 실제 새 PNG 생성·미리보기·명시 저장을 확인했다. 배경 잡무늬와 원본 특징 변형이 남아 출시 품질 통과가 아니다. 자세한 수치와 제한은 [VERIFICATION.md](VERIFICATION.md)에 있다.

첫 구성: CPU 4 threads, q4_0 로드, mmap, 256×256 img2img, Euler A, 12 steps, strength 0.55, CFG 6, seed 1026. PC에서 이미지 추론은 실행하지 않는다. 단일 합성 샘플 실측은 전체 174.861초, native 생성 168.912초, 최대 RSS 5,710,496KiB, 최대 배터리 온도 35.6°C였다. 다른 입력·해상도·지속 사용의 성능과 안전성을 보장하지 않는다. native 프로세스의 max RSS와 wall time을 결과 JSON에 기록하며 외부 ADB 측정으로 보완한다.

준비한 동작: 원본 표시, 준비·생성 진행, 취소, 새 결과 미리보기, 명시적 별도 저장. 픽셀 차이만으로 품질 통과 처리하지 않는다. 모든 결과는 시각 검토 전 상태로 기록한다. 현재는 게임 birth-flow에 연결하지 않았다. 최초 생성 검증 후 공통 Android adapter로 옮겨 Gemma 해제/로딩을 직렬화해야 한다.

고정 의존성:

- stable-diffusion.cpp `e41fbcf455e0fbb45e08bd535b00d6cba865e921`, MIT
- ggml `a5915eb0e47adef21c3f25b889a008925ea838c2`, MIT
- SD1.5 보존 미러 `451f4fe16113bff5a5d2269ed5ad43b0592e9a14`의 `v1-5-pruned-emaonly.safetensors`
- 모델 4,265,146,304B, SHA256 `6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa`
- NDK 30.0.16248370, CMake 3.22.1, compile/target SDK36

작업공간 외부 runtime checkout 경로를 `-PimageRuntimePath=...`로 지정한 경우에만 이 모듈을 포함한다. NDK 별도 설치 경로는 `-PimageNdkPath=...`로 지정한다. `local.properties`에서 기존 SDK와 별도 CMake 경로를 설정한다. 예: `gradlew :imageprobe:assembleDebug -PimageRuntimePath=<pinned checkout> -PimageNdkPath=<NDK>`. 이번 검증 APK는 `-PimageRuntimeBuildPath=<native-build-cpu>`로 이미 완료된 NDK arm64 Release 정적 라이브러리를 재사용했다. JNI만 Debug이며 엔진은 Release이다. 다른 ABI/host 라이브러리를 넣지 않는다.

runtime source/모델과 게임 APK는 이 모듈에 내장되지 않는다. APK 설치 후 모델 파일을 이 앱의 external files `models/sd15.safetensors`에 넣는다. 첫 실행은 매번 크기/SHA256를 확인한다. 실행 허가는 최신 사용자 지시를 확인하고, 배터리·발열·여유 RAM 및 USB 상태를 읽은 후 적용한다. UI는 severe thermal 상태 또는 화면 이탈 때 취소한다. native 모델 로드 취소는 로드가 반환할 때 적용될 수 있으며 대기 시간을 검증해야 한다.

2026-10-26 결과: PC 모델 다운로드/해시 확인, NDK/CMake 설치, 네이티브 CLI와 테스트 APK 빌드, Kotlin/Lint 검증 완료. SDK 약관은 기존 수락본과 공백 외 동일함을 확인했고 sdkmanager가 신규 수락 입력 없이 설치했다. 최초 USB 단절 때 폴더/파일 생성은 실행되지 않았음을 재연결 후 확인했다. 이후 모델 4,265,146,304B를 복사했고 폰 SHA256도 일치했다. 모델은 이제 이 테스트 앱 external files의 `models/sd15.safetensors`에 있다.

첫 생성 요청은 폰 CPU에서 실행했으나 CANCELLED로 종료했고 PNG가 나오지 않았다. 모니터링 구간은 92.55초(요청 전체 시간 아님), 최대 앱 PSS 5,162,299KiB, 최대 배터리 온도 34.5°C, thermal status 0, 취소 후 PSS 83,580KiB였다. 앱 범위 수집 로그에 FATAL/ANR 신호는 없었다. 종료 무렵 `mWakefulness=Dozing`, 화면 제한 시간 120,000ms, keyguard showing=true/secure=true가 확인됐다. 화면 이탈 취소와 일치하지만 첫 실행에는 정확한 취소 콜백 이유를 기록하지 않아 직접 원인까지 확정할 수 없다.

보정: 명시적인 생성 동안 보이는 앱 창에만 FLAG_KEEP_SCREEN_ON을 적용하고 종료 시 해제한다. 시스템 화면 시간/잠금/보안 설정은 수정하지 않는다. 취소 사유와 실패 시 native timing/RSS도 기록한다. 보정 APK 빌드/Lint 통과, 설치 APK 해시 일치 확인 후 사용자가 잠금을 푼 상태에서 한 번 재실행했다. 2분 화면 제한을 지나 생성이 완료됐고, 미리보기와 별도 저장 파일의 해시가 일치했다. 게임 birth-flow 통합/출시 품질/재실행 저장 복원/진화/커밋·푸시는 아직 완료하지 않았다. PC 추론은 수행하지 않았다.
