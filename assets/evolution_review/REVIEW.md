# 진화 이미지 검토 / Evolution review

2026-10-06 · 로컬 ComfyUI + DreamShaper 8 · [비교 갤러리](index.html)

대표 네 조합의 1·2·3단계와 최종 빛/어둠 분기, 총 20장을 검토했습니다. 식물·기계·유령의 1단계 3장은 기존 대표 이미지이며, 나머지 17장은 로컬 ComfyUI 출력입니다. 모델·시드에 따라 결과가 달라지므로 이 검토를 모든 72조합의 품질 승인으로 해석하지 않습니다.

| 조합 | 확인한 개선 | 남아 있는 표현 차이 |
| --- | --- | --- |
| 식물 / 자연 | 작은 잎 캐릭터 → 길어진 몸통 → 잎 갈기를 가진 사자형 → 밝은 갈기 / 어두운 가시 덩굴 분기 | 성장하면서 얼굴형이 크게 바뀜. 덩굴과 잎이 복잡해지는 단계는 작은 썸네일에서 정보가 많음 |
| 기계 / 불 | 둥근 작은 기계 → 관절 발달 → 넓은 장갑 몸통 → 금색 장갑 / 검정·진홍 장갑 분기 | 처음의 원형 LED 눈은 후기 단계에서 그대로 유지되지 않음 |
| 유령 / 바람 | 사람형으로 바뀐 후보와 한 눈으로 합쳐진 후보를 제외. 두 눈·떠 있는 몸체를 유지하고 최종 눈 색·안개 장식을 구분 | 다른 종족보다 2→3단계 체형 변화가 작음. 최종형에서는 표정과 장식 변화 비중이 큼 |
| 용 / 빛 | 사람형 인형 후보를 제외. 둥근 몸통 → 길어진 목과 몸 → 뿔·비늘 발달 → 금빛 / 검정·보라 분기 | 대표 예시 세 장과 선·채색 방식이 완전히 같지는 않음 |

## 반영한 생성 규칙

- 종족별 단계 체형 지시가 공통 설명을 대체합니다. 지나치게 긴 설명과 중복 지시를 줄였습니다.
- 공통 변형 강도는 2단계 0.56 → 3단계 0.64 → 4단계 0.78입니다. 유령은 얼굴 보존을 우선하여 0.48 → 0.56 → 0.60을 사용합니다.
- 최종 분기 지시를 프롬프트 앞에 배치합니다. 분기 색상과 원래 속성 색이 충돌하지 않도록 최종 단계에서는 속성을 불꽃·잎·바람 무늬로 표현합니다. 게임 속성 값은 그대로입니다.
- 투명 PNG는 흰 배경에 합성합니다. 2단계에만 참조 그림을 512px로 줄여 640px 캔버스에 여백을 만들고, 이후에는 640px를 유지하여 반복 축소를 방지합니다.
- 빛·어둠 분기 모두 동일한 3단계 PNG를 사용합니다. 한쪽 최종형에서 다른 쪽을 생성하지 않습니다.
- 프롬프트 revision을 `evolution-v3b`로 분리하여 기존 사용자 이미지 캐시와 섞지 않습니다.

## 검증 범위

게임 세이브·Discord 실서버를 사용하지 않고 실제 ComfyUI 업로드, 샘플링, 다운로드 경로로 생성했습니다. 코드는 게임·이미지 회귀 테스트 92개를 통과했습니다. [manifest.json](manifest.json)에 단계별 시드, 프롬프트, 설정, 참조 파일과 해시가 있으며 생성 PNG에는 ComfyUI 워크플로우가 포함되어 있습니다. [audit.json](audit.json)은 PNG 내부 기록과 메타데이터, 분기 참조 일치 검사 결과입니다.

이 갤러리는 반복 생성 후 선택한 검토용 시퀀스입니다. 중간 단계 보존 후 일부 단계를 재생성했으므로 현재 명령을 처음부터 실행하면 특히 제외 문구가 보강된 이미지가 달라질 수 있습니다. 보관된 각 PNG의 워크플로우와 JSON이 해당 이미지의 실제 생성 기록입니다. 시드가 같아도 장비·라이브러리 버전에 따라 픽셀 단위 일치를 보장하지 않습니다.

유령 최종 분기는 보조 개체가 붙은 후보를 제외하고 `--seed-offset 2` 후보를 선택했습니다. 얼굴과 보조 개체 여부는 수동으로 검토했으며, 런타임에 이미지를 자동으로 판별·선별하는 기능을 추가한 것은 아닙니다.

## English

Twenty frames cover plant/nature, machine/fire, ghost/wind and dragon/light, including both final branches. Three starters reuse curated artwork; seventeen frames were generated locally. Species-specific silhouettes, stronger late-stage changes, earlier branch instructions, alpha-aware white backgrounds and non-cumulative padding improve visible growth. Ghosts use lower denoise and targeted negative terms to retain two eyes and avoid human forms.

This is a reviewed sample set, not a guarantee for all seeds or combinations. Identity drift remains most apparent in the plant's face and the machine's original LED eyes; ghost stages two and three differ less than the others. Final branch palettes may change while element motifs and game values remain intact. Selected stages were rerendered during review, so use each PNG's embedded workflow and adjacent JSON for its exact generation record.
