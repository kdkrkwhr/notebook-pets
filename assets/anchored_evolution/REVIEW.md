# Growth with a persistent original reference / 성장 체형과 원본 참조

이번 갤러리는 실제 게임 생성기와 같은 `art.build_prompt`, `ComfyUIProvider`를 사용한 로컬 ComfyUI 결과입니다. 3장의 기존 새싹기와 17장의 생성 이미지로 구성합니다. 이전 실험처럼 장식만 바뀌지 않도록 성숙기부터 몸통·다리·목 비율을 조절했습니다.

## 육안 검토

- **식물:** 성장기의 큰 머리·짧은 몸에서 성숙기의 길어진 몸통·다리와 선 자세로 바뀝니다. 완전체는 어깨와 잎 갈기가 넓어집니다. 원본의 눈·색상 계열은 이어지지만 꼬리에 줄무늬가 생기고 잎이 털처럼 표현되는 부분은 남습니다.
- **기계:** 성숙기부터 별도 몸통·굵은 팔다리가 발달하도록 조정했습니다. 주황·금속 계열은 이어지지만 원본의 웃는 LED 눈과 불꽃 장식이 약해지고 선이 더 굵어지는 차이는 남습니다.
- **유령:** 강한 변형에서 생기던 추가 얼굴을 피하기 위해 낮은 변형 강도의 후보를 선택했습니다. 따라서 다른 종족보다 단계별 체형 차이가 작고, 작은 지느러미가 손처럼 표현되는 차이가 남습니다. 다른 시드에서는 추가 얼굴 오류가 생길 수 있어 검수가 필요합니다.
- **용:** 최초 생성부터 공통 그림체를 참조해 실사 같은 피부 질감을 줄였습니다. 성장하면서 목·뿔·몸체가 발달하지만 일부 포즈는 두 발로 앉은 모습이고, 참조 원본의 초록색이 빛 속성 팔레트에도 섞입니다.

## 연결과 검증

직전 단계는 VAE 초기 이미지, 최초 원본은 IP-Adapter 참조로 구분합니다. 새로 생성하는 1단계는 공통 예시의 그림체만 참조하고, 이후에는 자기 자신의 1단계로 고정합니다. 두 완전체는 같은 성숙기를 부모로 사용합니다. 이미지 revision은 `anchored-growth-v4`이며 이전 캐시는 삭제하지 않고 별도 경로에 보존합니다.

갤러리의 생성 이미지에는 실제 워크플로우가 PNG 메타데이터에 들어 있습니다. JSON에는 프롬프트·시드·원본/직전 단계 해시·참조 강도·파일 해시를 기록합니다. 일부 단계는 이미 검토한 앞 단계를 유지한 채 재생성했으므로, 보존된 PNG와 메타데이터가 그 후보의 정확한 기록입니다. 현재 설정으로 처음부터 다시 생성하면 앞 단계의 변경이 이후 이미지에도 영향을 줍니다.

전체 조합의 품질을 보장하는 자료는 아닙니다. 실제 Discord 봇 연결은 아직 없으며 로컬 게임·전송 모의 테스트와 실제 ComfyUI 요청으로 검증합니다. 게임 수치·진화 조건은 바꾸지 않았습니다.

검증 기록: [20장 메타데이터·해시 검사](audit.json), [격리된 세이브의 실제 생성·캐시 재사용 검사](live_smoke.json). 최종 시각 비교는 로컬에서 수행했습니다.

## English

The runtime now separates the previous-stage latent from the original pet's persistent IP-Adapter reference. Mature profiles change proportions rather than only adding decorations. These four representative sequences contain 3 curated starters and 17 locally generated images. Both final branches share the same stage-three parent.

Identity is approximate. Plant tails and leaf details may drift; robot faces can change; ghost wisps can become extra faces; dragons can retain a seated pose and borrow the shared reference's green palette. The saved PNG workflow and JSON provenance describe each selected output. Regenerating the entire sequence with updated profiles may change earlier stages and therefore later stages. No live Discord server was contacted.
