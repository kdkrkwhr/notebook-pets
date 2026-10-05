# 이미지 프롬프트 / Image prompts

실행되는 프롬프트의 원본은 [image_prompts.json](image_prompts.json)입니다. 봇과 CLI 모두 `engine/art.py`에서 성장 단계 + 종족 + 속성 + 공통 스타일 + 최종 진화 분기 + 참조 지시를 조합합니다.

종족 9종 × 속성 8종에 대해 1~3단계와 최종 빛/어둠 분기를 구분합니다. 최종 분기는 원래 속성을 바꾸지 않습니다. 진화 시 이전 PNG를 ComfyUI에 업로드하고 VAE로 인코딩한 이미지를 다음 단계의 초기 latent로 사용합니다. 외형의 완전한 보존을 보장하지 않으므로 실제 출력을 확인해야 합니다.

```bash
python -X utf8 tools/gen_image.py dragon fire ultimate samples/preview.png 42 --branch light --dry-run
```

이 명령은 네트워크 호출 없이 실제 프롬프트와 워크플로우를 출력합니다. 새 스타일의 캐시를 만들 때 JSON의 `revision`을 올립니다. 모델만 변경하면 기존 PNG는 유지됩니다. 자세한 실행·저장·실패 처리는 [연결 안내](../docs/IMAGES.md)를 참고하세요.

The executable source is `image_prompts.json`. The CLI and bot share stage, species, element, style, final-branch and reference instructions through `engine/art.py`. Final light/dark branches preserve the base element. Evolution uploads the previous PNG and uses its encoded latent, but continuity requires visual review. Bump `revision` to create a new artwork cache. See [the integration guide](../docs/IMAGES.md).
