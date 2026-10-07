# Plant style reference experiment / 식물 펫 그림체 비교

[Open the comparison / 비교 페이지](../assets/style_review/index.html)

## 결과

기존 진화 결과는 원본과 생성 모델이 달랐고, 사자 형태·높은 변형 강도를 사용해 그림체와 얼굴이 크게 바뀌었다. 이번 후보는 DreamShaper에 IP-Adapter Plus를 연결하고 **모든 단계의 공통 참조를 최초 원본으로 고정**한다. 직전 단계는 img2img의 형태 입력으로 별도 사용한다. 두 최종 분기는 동일한 3단계 이미지를 사용한다.

- 선택한 후보: 참조 강도 0.6, 변형 강도 0.62, 640×640, 32 steps, CFG 5.5.
- 같은 프롬프트·시드·변형 강도로 IP-Adapter 0 / 0.65 / 0.9 비교를 제공한다. 0은 IP-Adapter만 끈 것이며 img2img 원본 참조는 유지한다.
- 초록색 눈, 둥근 얼굴, 부드러운 채색이 이전보다 이어진다. 최종 분기는 금색 꽃과 보라색 꽃으로 구분한다.
- 원본과 동일한 품질을 보장하지 않는다. 중간 단계 성장 폭이 작고, 잎·귀가 겹치거나 최종 단계에 머리카락 같은 형태가 생긴다. 640px 생성 결과이므로 원본 1254px와 해상도도 다르다.
- **후보 검토용이다. 게임 기본 프롬프트·생성기·기존 예시를 대체하지 않는다.** 다른 종족으로 확대하기 전 식물 펫의 방향을 확인한다.

## Reproduce

Install [ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) into ComfyUI/custom_nodes. Tested revision: `a0f451a5113cf9becb0847b92884cb10cbdec0ef` (GPL-3.0; external installation, not vendored). The upstream is in maintenance-only mode; this experiment was tested against the locally installed ComfyUI 0.38.0.

Download the official [h94/IP-Adapter](https://huggingface.co/h94/IP-Adapter) model files:

| Remote path | ComfyUI destination | SHA-256 |
|---|---|---|
| models/ip-adapter-plus_sd15.safetensors | models/ipadapter/ip-adapter-plus_sd15.safetensors | a1c250be40455cc61a43da1201ec3f1edaea71214865fb47f57927e06cbe4996 |
| models/image_encoder/model.safetensors | models/clip_vision/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors | 6ca9667da1ca9e0b0f75e46bb030f7e011f44f86cbfb8d5a36590fcd7507b030 |

DreamShaper_8_pruned.safetensors is also required in models/checkpoints (see IMAGES.md). Model files are not committed. Hashes were verified against the publisher's Hugging Face LFS metadata.

```powershell
./tools/start_comfyui.ps1 -ComfyPath D:\develop\tools\ComfyUI -EnableIPAdapter
# In a second terminal at this repository root:
python -B -X utf8 tools/preview_style.py --mode sequence
python -B -X utf8 tools/preview_style.py --mode compare
```

The launcher enables only the named custom node when explicitly requested. Default launch behavior is unchanged. Do not launch a second server on an occupied port.

Generation writes to assets/style_review by default. Choose another assets/ subdirectory with `--output` to keep an existing run. Every generated PNG has a JSON sidecar containing the submitted workflow, seed, strengths, source/anchor hashes, and output hash. Interrupted jobs can be resumed by rerunning with the same parameters. GPU/library changes may affect exact pixels.

## English review

The experiment uses the original starter as a persistent IP-Adapter reference, and the previous evolution as the img2img input. Both final branches share the same stage-three parent. The selected series improves palette and rendering continuity, but intermediate growth remains subtle and some leaf details become ear/hair-like shapes. This is a review candidate, not a replacement for the game's default renderer. All new images were generated with local ComfyUI; the starter retains its original provenance.
