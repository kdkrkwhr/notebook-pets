# Notebook Pets — 캐릭터 예시 / Character showcase

`data/prompt_templates.md`의 종족·속성·단계 조각을 바탕으로 내장 `image_gen` 도구로 생성한 대표 이미지입니다. 전체 입력 프롬프트는 [prompts.json](prompts.json)에 보관했습니다. 기존 ComfyUI 생성 결과와는 별도 예시이며, 생성기 코드나 기존 72조합은 변경하지 않았습니다.

Created with the built-in `image_gen` tool using the project's species, element, and evolution-stage prompt fragments. Exact generation prompts are in [prompts.json](prompts.json). These showcase illustrations are separate from the existing ComfyUI output; the runtime generator and original 72 combinations are unchanged.

| 식물족 × 자연 · 새싹기 | 기계족 × 불 · 새싹기 |
|---|---|
| ![Plant / nature](plant_nature_stage1.png) | ![Machine / fire](machine_fire_stage1.png) |
| 유령족 × 바람 · 새싹기 | 용족 × 빛 · 완전체 |
| ![Ghost / wind](ghost_wind_stage1.png) | ![Dragon / light / final](dragon_light_stage4.png) |

프롬프트에서는 한 이미지에 한 캐릭터, 전체 실루엣, 단순한 배경을 명시했습니다. 공책 느낌은 그림체로 표현하고 실제 공책·책상·캐릭터 시트는 제외했습니다. 완전체에는 새싹기의 아기 비율 대신 성숙한 체형을 적용했습니다. 유령 이미지의 생성된 투명도는 원본 그대로 보존했습니다.

Prompts specify one character, the full silhouette, and a simple backdrop. Notebook charm is expressed through illustration rather than literal notebooks or character sheets. The final evolution uses mature proportions instead of the baby-stage proportions. The ghost image retains its original generated transparency.
