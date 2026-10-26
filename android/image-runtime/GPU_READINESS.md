# Same-model GPU path: read-only readiness review

No GPU build, inference, phone operation, download, terms acceptance or safety-gate change was performed for this review.

## Why the APK uses CPU

- `src/main/cpp/image_jni.cpp` explicitly sets `context.backend = "cpu"`.
- The supplied `native-build-cpu/CMakeCache.txt` has both `SD_OPENCL`/`GGML_OPENCL` and `SD_VULKAN`/`GGML_VULKAN` OFF.
- The wrapper CMake import list links `libggml-cpu.a`, base and common libraries, with no GPU backend. This is a build/runtime choice; no evidence establishes that this phone rejected an attempted GPU path.

## Verified upstream and local prerequisites

The existing pinned engine `e41fbcf455e0fbb45e08bd535b00d6cba865e921` documents Vulkan (`SD_VULKAN=ON`) and Android OpenCL (`SD_OPENCL=ON`). Its OpenCL path targets Adreno and is primarily optimized for Q4_0. See the [pinned build guide](https://github.com/leejet/stable-diffusion.cpp/blob/e41fbcf455e0fbb45e08bd535b00d6cba865e921/docs/build.md).

| Path | Present in the approved task tools | Missing/unverified |
| --- | --- | --- |
| Vulkan | NDK Vulkan headers, arm64 API31 linker stub, Windows host `glslc.exe` | No SPIRV-Headers CMake package found under task build-tools; no VULKAN_SDK configured. Upstream `ggml-vulkan/CMakeLists.txt` requires Vulkan/glslc and SPIRV-Headers. Android cross-build and phone driver behavior not tested. |
| OpenCL | Pinned engine source and Q4_0 kernels | No CL/cl.h or arm64 OpenCL loader in this NDK sysroot. Upstream requires OpenCL headers/loader. Phone library accessibility/kernel support not tested. |

The existing manifest already declares optional `libOpenCL.so` and `libvndksupport.so`. Android API31+ requires an explicit declaration for accessible vendor non-NDK shared libraries; the declaration alone does not prove the library exists or is exposed. NDK libraries such as Vulkan do not need that vendor declaration. [Android documentation](https://developer.android.com/guide/topics/manifest/uses-native-library-element).

## Minimum next plan; not executed

1. Preserve weights, original Anna prompt/text2img request, dimensions, UI and auto-save. Keep `TextImageCapability.ready=false`.
2. Resolve the missing build dependency through an authorized existing source or separately approved download/license review. Do not modify device security or NDK-wide settings to bypass a missing library.
3. Build a separate arm64 GPU variant; link its GPU backend and select an enumerated supported device (upstream examples use names such as `vulkan0`, not an assumed generic GPU name). Record actual backend and fail explicitly if unavailable; do not silently run the same request on CPU.
4. A later separately authorized phone session should first check library/device availability without model generation. Only after a bounded feasibility decision should it test requested 1024px text2img, memory/thermal cancellation and actual output. GPU speed, memory, fidelity and home-sheet coherence remain unverified.

QNN/AI Hub, SDXL-Lightning, altered resolution/sampler/model, cloud profiling and external inference are outside this plan. A GPU path is the smallest candidate transport change, not a proven performance solution.
