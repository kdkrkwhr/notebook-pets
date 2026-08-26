# 몬스터 이미지 프롬프트 템플릿

> 종족조각 + 속성조각 + 단계조각을 합성해 프롬프트를 만든다.
> 조합 수(9×8×4=288)와 비용 무관, 조각 품질만 관리하면 됨.

## 사용법
```
[단계조각] + [종족조각] + [속성조각] + 공통 스타일
```
image_generate 호출 시 이전 단계 이미지를 reference_image_urls로 전달해 개체 연속성 유지.

## 종족조각

| 종족 | 영문 프롬프트 조각 |
|---|---|
| 포유류족 | small fluffy mammal creature, rounded ears, paw pads |
| 조류족 | tiny bird-like creature, stubby wings, feather tuft |
| 파충류족 | small reptile creature, smooth scales, little tail |
| 기계족 | chibi robot creature, riveted metal plates, LED eyes |
| 요정족 | fairy-like sprite creature, translucent wings, sparkles |
| 괴수족 | kaiju-inspired baby monster, horns, mischievous grin |
| 용족 | baby dragon, chubby body, tiny wings, small fangs |
| 식물족 | plant creature, leaf sprouts on head, vine tail |
| 유령족 | ghost creature, wispy floating tail, semi-transparent body |

## 속성조각

| 속성 | 색/모티프 |
|---|---|
| 불 | red and orange color theme, small flame motifs |
| 물 | blue color theme, water droplet patterns |
| 번개 | yellow color theme, lightning bolt markings |
| 자연 | green color theme, leaf patterns |
| 바람 | pale green and white theme, swirling breeze motifs |
| 땅 | brown and ochre theme, rock crystal accents |
| 빛 | gold and white theme, radiant halo glow |
| 어둠 | purple and black theme, starry shadow aura |

## 단계조각 (디지몬 성장체계 오마주)

| 단계 | 프롬프트 조각 |
|---|---|
| 1단계 새싹기 | baby form, very round and small, oversized head |
| 2단계 성장기 | child form, standing upright, more defined limbs |
| 3단계 성숙기 | adolescent warrior form, taller, armor-like features emerging |
| 4단계 완전체 | majestic final form, dynamic pose, glowing aura, heroic silhouette |

## 공통 스타일 (고정)

```
Digimon style digital monster character design, notebook doodle aesthetic,
clean lineart with light watercolor coloring, big expressive eyes,
centered on plain white background, game character concept art
```

## 4단계 분기 추가 문구
- 빛 분기: `holy radiance, golden light particles, angelic yet fierce expression`
- 어둠 분기: `dark aura, crimson glowing eyes, fallen knight atmosphere`

## 예시 (유령족+바람 1단계)
```
baby form, very round and small, oversized head, ghost creature,
wispy floating tail, semi-transparent body, pale green and white theme,
swirling breeze motifs, Digimon style digital monster character design,
notebook doodle aesthetic, clean lineart with light watercolor coloring,
big expressive eyes, centered on plain white background, game character concept art
```

## 진화 시 연속성 절차
1. `state`의 `image_key`로 마지막 이미지 파일 경로 확인
2. 새 프롬프트 = 다음 단계조각 + 동일 종족조각 + 동일 속성조각 (+분기 문구 if 4단계)
3. image_generate(image_url=이전 이미지, prompt=새 프롬프트)
4. 실패 시 재시도 2회 → 실패하면 이전 단계 이미지 유지+안내 (기획서 §10)
