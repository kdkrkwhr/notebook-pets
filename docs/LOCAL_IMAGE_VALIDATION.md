# Local image validation

Verified on 2026-10-05 with Python 3.12.10, an RTX 3070 Laptop GPU (8 GB), NVIDIA driver 555.97 and PyTorch 2.7.1+cu126.

- ComfyUI: version 0.38.0, commit `5c460d8172fe30761ff67c0df3d5643bb74e0d70`.
- Local installation: `D:\develop\tools\ComfyUI`, isolated `.venv`.
- Endpoint: `http://127.0.0.1:8188`, loopback only; custom nodes and partner API nodes disabled.
- Default checkpoint: `DreamShaper_8_pruned.safetensors`, SHA256 `879db523c30d3b9017143d56705015e15a2cb5628762c11d086fed9538abd7fd`.
- Also installed for comparison: `v1-5-pruned-emaonly.safetensors`, SHA256 `6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa`.

The official model downloads were checked against their published LFS SHA256 values. Model weights and the ComfyUI environment are outside the game repository. No GPU driver change was made. ComfyUI reports that newer CUDA/PyTorch is needed for its optimized kernels; the eager/PyTorch path successfully generated these SD 1.5-compatible images.

`tools/check_images.py` verified the GPU, checkpoint and required text/image-to-image nodes. Actual text-to-image generation succeeded. An isolated game save reused the curated starter, reached stage two through the engine's XP rules, uploaded the previous PNG, generated the evolution, saved it atomically, and returned the same cached image on repeat. The final warm-model evolution request took approximately 3.25 seconds; this is one local measurement, not a performance guarantee.

See [the real generated samples](../assets/runtime_examples/README.md). The initial base SD 1.5 output failed the intended character composition. Shorter prompts and DreamShaper 8 produced a usable character illustration. Reference strength 0.4 reduced facial distortion, but pronounced silhouette changes between growth stages still need art direction. No live Discord server or bot token was used; Discord reply/edit/attachment behavior was verified with a fake transport, and the ComfyUI HTTP client was verified against both a local test server and real ComfyUI.

## 다시 실행하기

```powershell
# 서버가 꺼져 있을 때 저장소 루트에서 실행
./tools/start_comfyui.ps1 -ComfyPath D:\develop\tools\ComfyUI
# 다른 터미널
python -X utf8 tools/check_images.py
```

대화 중 실행한 서버의 로그는 ComfyUI 폴더의 `notebook-server.out.log`와 `notebook-server.err.log`에 있습니다. 자동 시작 서비스는 등록하지 않았습니다. 터미널 실행은 Ctrl+C로 종료할 수 있습니다.
