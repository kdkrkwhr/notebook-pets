# Android local image runtime

The app and isolated probe compile this same JNI bridge and Kotlin handle API. No network transport or model download is present in the runtime. Android's existing text model is closed on the same worker before image inference. Native images are accepted only after bounded validation and an original/output pixel comparison; visual quality still requires user review.

Build with stable-diffusion.cpp revision `e41fbcf455e0fbb45e08bd535b00d6cba865e921`, ggml submodule `a5915eb0e47adef21c3f25b889a008925ea838c2`, NDK `30.0.16248370`, CMake `3.22.1`. Only arm64-v8a is enabled when `imageRuntimePath` is set. The ordinary CI build omits the native image feature; it validates the fallback app, request parsing and JS state machine without model downloads or inference.

Prepare the pinned upstream checkout with only its ggml submodule, then configure an Android arm64 Release build with `ANDROID_PLATFORM=android-31`, `ANDROID_STL=c++_static`, `GGML_OPENMP=OFF`, `GGML_NATIVE=OFF`, `SD_WEBP=OFF`, `SD_WEBM=OFF`, and build `sd-cli`. Building this target does not execute it. Pass its build directory as `imageRuntimeBuildPath` to reuse the four NDK static archives. Do not pass host archives.

Gradle arguments:

```
:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug
-PimageRuntimePath=<pinned upstream checkout>
-PimageRuntimeBuildPath=<Android arm64 Release build>
-PimageNdkPath=<NDK directory>
-PimageTestSuffix=.ondevice
```

The suffix produces a distinct installation (`Notebuddy · 기기생성`), preserving the original app and prior QA notebook. Weights are not embedded: copy the approved SD1.5 `v1-5-pruned-emaonly.safetensors` to this app's external files `models/sd15.safetensors`. Exact size 4,265,146,304 bytes and SHA256 `6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa` are checked before inference. Licenses ship from the probe's assets: CreativeML OpenRAIL-M model terms, stable-diffusion.cpp/ggml MIT and bundled dependency notices. Preserve the model restrictions and notices if redistributing weights.

The prepared correction is birth portrait img2img only: actual Gemma `checkArtwork` analysis, explicit uncertainty confirmation, then 256×256, 20 requested steps, strength .40, seed1026, CPU4 threads. White contain padding preserves input aspect ratio; a bounded prompt includes observed features and Anna's human/limb/crop policy. These new settings have not been quality-tested on the phone. The older installed/probe path used 12 steps/.55; its 174.9s timing must not be presented as the new pipeline's measurement. See [quality rationale and next test](QUALITY_PLAN.md).

Evolution and directional home sprites are not enabled. `imageReady=false` for those generic transports intentionally remains; native birth readiness is `localImageReady`. Generation does not save a pet or consume game resources. A separate `birth-draft` record retains source/assessment/result for explicit recovery, never auto-generation. Explicit submission passes validated species/element through the canonical core and commits both PNGs/game state while deleting that draft in the same IndexedDB transaction. Reopening displays saved pixels without inference. [Offline Gemma preparation](OFFLINE_MODEL_PREPARATION.md) hashes existing weights only; it is distinct from download.

Real phone test is opt-in and refuses the original package: `am instrument -w -e liveImage true -e class io.github.kdkrkwhr.notebuddy.lab.ImageBirthTest io.github.kdkrkwhr.notebuddy.lab.ondevice.test/androidx.test.runner.AndroidJUnitRunner`. It uses only a bundled synthetic fixture and a separate test notebook. Do not run on user photos. UI and native safety limits cancel on background, severe thermal status, 42°C battery temperature, low memory, low battery or a 10-minute request. Cancellation during lazy model loading may wait for the current native operation. No automatic retries.
