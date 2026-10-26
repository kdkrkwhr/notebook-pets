# OpenCL preparation: no phone execution

This prepares an isolated Android GPU build. It is not a GPU speed, memory, fidelity or product-readiness result. No phone operation, model download, PC/server inference or SDK contract acceptance was performed.

## Fixed contract

- Same stable-diffusion.cpp `e41fbcf455e0fbb45e08bd535b00d6cba865e921` and existing SD1.5 safetensors (`6ce01616…06fa2fa`, 4,265,146,304 bytes).
- Existing runtime Q4_0 loading, sampling configuration and model file remain unchanged. No new quantized model or model conversion.
- Anna reference `246781d`, source hashes, prompts, text2img meaning, requested dimensions, normal UI/trigger/auto-save and storage remain unchanged.
- `TextImageCapability.ready=false` remains. JNI also rejects 1024px before model loading. Internal 256/512 synthetic text2img benchmarks do not change the product request.
- Separate package `io.github.kdkrkwhr.notebuddy.lab.ondevice.opencl`. Gradle refuses an OpenCL app build without this suffix. Existing `.lab`, `.lab.ondevice`, QA notebooks and photos are not accessed.

## Dependencies and Vulkan blocker

The pinned upstream [build guide](https://github.com/leejet/stable-diffusion.cpp/blob/e41fbcf455e0fbb45e08bd535b00d6cba865e921/docs/build.md) supports OpenCL/Adreno. Exact downloaded archives and license hashes are in `opencl-dependencies.json`:

| Dependency | Revision | Compressed bytes | License |
| --- | --- | ---: | --- |
| Khronos OpenCL-Headers v2025.07.22 | `8a97ebc88daa3495d6f57ec10bb515224400186f` | 126,798 | [Apache-2.0](https://github.com/KhronosGroup/OpenCL-Headers/blob/8a97ebc88daa3495d6f57ec10bb515224400186f/LICENSE) |
| Khronos OpenCL-ICD-Loader v2025.07.22 | `ad770a1b64c6b8d5f2ed4e153f22e4f45939f27f` | 161,373 | [Apache-2.0](https://github.com/KhronosGroup/OpenCL-ICD-Loader/blob/ad770a1b64c6b8d5f2ed4e153f22e4f45939f27f/LICENSE) |

Notices are packaged. The ICD loader is built only to resolve symbols at link time. It is **not** bundled in the APK or run on the phone. Its Linux symbol-version script is disabled by the wrapper CMake project so Android's vendor implementation need not supply Linux `OPENCL_1.x` version tags. The final JNI must have `DT_NEEDED libOpenCL.so`; optional vendor declaration already existed in the app manifest. Whether Android exposes that library and all referenced functions is unverified. No vendor path injection or security changes are used.

Vulkan was not built. The existing NDK contains C Vulkan headers, an Android linker stub and Windows glslc, but not `vulkan/vulkan.hpp` or an installed SPIRV-Headers CMake package. Its bundled shaderc tree contains some SPIR-V headers, which is insufficient for the upstream package lookup. No usable Windows host C++ compiler/Windows SDK was found at the normal command and installation locations; the upstream Vulkan shader-generator helper requires one. No large SDK/toolchain download was performed.

## Explicit backend and error boundaries

`imageBackend=opencl` compiles and links the OpenCL archive; CPU is the unchanged default build selector. A GPU request must match both the compiled backend and the exact enumerated `GPUOpenCL` device. Missing/ambiguous devices, wrong build, library load errors and absent OpenCL platforms produce errors, with no retry on the CPU backend. Native code also checks device type.

There is a separate upstream limitation: `src/core/compute_workspace.cpp` creates a CPU scheduler backend for operations unsupported by the selected GPU. Explicit GPU selection therefore does **not** prove all operations ran on the GPU. Logs/reports distinguish `fullBackendFallback=false` from `cpuOperatorFallback=possible`. Operator coverage and runtime must be measured later; this preparation does not promise acceleration.

Raw OpenCL preflight checks absent platforms/GPU devices before upstream initialization. Some later upstream OpenCL errors use assertions/abort and cannot be caught as Java exceptions. The isolated diagnostic writes `STARTED` before native inspection, so a process crash is not a successful result. Driver access, initialization, kernels, numerical behavior and cancellation remain device blockers until tested.

## Reproducible PC build and passive inspection

`prepare_opencl.py --workspace <task>` performs no network requests. It verifies archive hashes and every extracted source file, checks the pinned clean engine checkout, then builds the Android link artifact and engine with the existing NDK30/CMake3.22.1. It never launches an inference executable. Do not run another build in a directory that already has an active Ninja process.

After that engine build finishes, use the app's normal Gradle tasks with:

```text
:app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug
-PimageRuntimePath=<task>/native-runtime
-PimageRuntimeBuildPath=<task>/native-build-opencl
-PimageNdkPath=<task>/build-tools/ndk/30.0.16248370
-PimageBackend=opencl
-PimageTestSuffix=.ondevice.opencl
-PimageOpenClHeaders=<task>/build-tools/opencl-pinned/OpenCL-Headers-8a97ebc88daa3495d6f57ec10bb515224400186f
-PimageOpenClLinkLibrary=<task>/build-tools/opencl-pinned/link-arm64/loader/libOpenCL.so
```

`verify_opencl_apk.py` passively verifies AArch64 ELF, the required JNI exports, OpenCL dependency, absence of Linux OpenCL version requirements, absence of a packaged vendor loader, backend/error/1024-guard markers and hashes. Also check manifest package/vendor-library declaration, APK signature, tests and unchanged packaged Anna bytes. ELF checks cannot prove dynamic loading on the phone.

## Minimal later device session (not executed; separate instruction required)

1. Confirm one authorized USB device and install only the distinct OpenCL APK/test APK. Do not uninstall or update user packages. Initially no model copy is necessary.
2. Run **only** `GpuBackendTest#inspectBackendWithoutModel`. It records load failure or compiled/enumerated/selected devices. It never opens model weights or generates an image. If unavailable or crashed, stop; do not switch silently to CPU, change security settings or download a replacement driver.
3. Only with a separate explicit benchmark instruction, place/reuse the hash-verified existing SD1.5 in this isolated package. Invoke `GpuBackendTest#boundedSyntheticTextBenchmark` with `gpuBenchmark=synthetic-gpu-benchmark`, initially `probeSize=256`. This argument is an execution guard, not a credential. The test otherwise skips generation. A later 512px run requires a separate decision after inspecting the first result and cooling; no automatic repeat or 1024px run.
4. Capture the unique JSON/PNG, package-scoped logs, wall time including hashing, model load/generation time, process-lifetime peak RSS (not GPU memory), exact prompt/seed/steps/size/backend, battery and thermal state. Review actual pixels before quality claims. Missing completion reports remain failed/uncertain, never success.

The internal test opens an unexported debug-only diagnostic activity, holds only its own screen awake, releases it on completion/cancellation, and stops on background/user cancel, severe thermal state, battery at least 42°C, battery below 15%, low/under-1GiB available memory, or five-minute wall time. Cancellation is cooperative: an in-flight native driver/model operation can delay its return. No hard-stop responsiveness has been measured. Reports and synthetic outputs use unique paths; no existing app data is reset, deleted or promoted. No retries, external transfer or private photo input.

No phone installation or successful generation is established by PC unit tests, a compiled APK, or mocked/render comparisons.

## Completed PC evidence (2026-10-26)

`android/verification/opencl-pc.json` records the build and passive checks. The engine completed 325/325 targets. The app and instrumentation APKs, 40 JVM tests and Android Lint passed. The final packaging increment completed in 2m49s; this is build time, not generation time.

- App APK: 316,338,831 bytes, SHA256 `0ae2db1d225efcaf28623a7a6d4180829ffd92ae78579b746a3ad2cad041178c`.
- Instrumentation APK: 879,591 bytes, SHA256 `9b15a2c20c2fa9f2b9988239ee0c4d0e153ead7a85b5bc885de596d2e77ecaa2`.
- Both use debug certificate SHA256 `07987d756266505d7005e476357e8cbdd78d26b375174ff04520251a94026c7c`. The app package is distinct from existing user packages, not an update to them.
- Final app contains only arm64 libraries, no duplicate ZIP entries and no bundled `libOpenCL.so`. AGP initially included the link-only loader automatically; both app/probe OpenCL configurations now explicitly exclude it. The final ELF needs the phone's `libOpenCL.so`, `liblog.so`, `libm.so`, `libdl.so` and `libc.so`, without Linux OpenCL symbol versions.
- All 467 pinned Anna files match their source hashes. All 496 packaged game assets match the previous `ed73f6d` APK byte-for-byte. This confirms unchanged packaged code/assets, not complete mobile runtime equivalence.
- The downloaded dependency archives, repository license notices and packaged notices match the recorded hashes. No model/toolchain download was added by this verification.
- Normal Android CI builds without the image runtime. It checks JVM, Lint, packaging and fixture browser regressions; it does not validate OpenCL native compilation or phone execution. Those claims remain separate.

### Driver-only invocation prepared, not executed

After a separate authorized connection, first verify exactly one intended device. Install the distinct app/test APKs and invoke only this exact test (replace `SERIAL` with the verified device):

```text
adb -s SERIAL shell am instrument -w -r -e class io.github.kdkrkwhr.notebuddy.lab.GpuBackendTest#inspectBackendWithoutModel io.github.kdkrkwhr.notebuddy.lab.ondevice.opencl.test/androidx.test.runner.AndroidJUnitRunner
```

Do not run the whole instrumentation suite or supply `gpuBenchmark`. This test only loads the JNI/vendor dependency, enumerates devices and writes its own uniquely named report. The pinned upstream `sd_list_devices` lists names/descriptions through `ggml_opencl_probe_devices`; it does not call `new_sd_ctx`, `ggml_cl_init` or generation. No model copy or hashing is part of this check. Collect its scoped report/log, then report USB work finished immediately. Missing/failed/aborted results are not GPU readiness or acceleration success. Do not change vendor access or substitute a driver to make the check pass.
