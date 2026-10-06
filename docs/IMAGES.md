# Local ComfyUI artwork / 로컬 이미지 생성

## 한국어

게임 상태 저장과 이미지 생성을 분리합니다. 시작·상태 조회·진화 결과의 `image` 요청을 `ImageService`에 전달하면, 개체별 캐시를 확인하고 로컬 ComfyUI에서 필요한 이미지를 생성합니다. 이미지 생성 실패는 경험치·진화 결과를 되돌리지 않습니다.

### 실행

ComfyUI의 별도 가상환경에 의존성과 SD 1.5 호환 체크포인트를 설치합니다. 기본 체크포인트 파일명은 `DreamShaper_8_pruned.safetensors`이며 ComfyUI의 `models/checkpoints/`에 넣습니다. 모델·가상환경은 이 저장소에 포함하지 않습니다.

```powershell
# ComfyUI가 설치된 위치 지정 후 로컬 서버 시작
./tools/start_comfyui.ps1 -ComfyPath D:\develop\tools\ComfyUI

# 다른 터미널에서 연결 및 필수 노드·체크포인트 확인
python -X utf8 tools/check_images.py

# 기존 펫의 현재 모습을 생성/조회: 게임 상태를 변경하지 않음
python -X utf8 tools/render_pet.py 123456789012345678

# 독립 이미지 생성: assets/samples/demo_plant.png에 저장
python -X utf8 tools/gen_image.py plant nature sprout samples/demo_plant.png 42
python -X utf8 tools/gen_image.py plant nature growth samples/demo_plant_stage2.png 42 --reference assets/samples/demo_plant.png
```

기존 파일 덮어쓰기는 `--overwrite`가 있어야 가능합니다. 최종 단계에는 `--branch light` 또는 `--branch dark`를 지정합니다. `--dry-run`은 네트워크 호출 없이 프롬프트와 API 워크플로우를 출력합니다. 배치 생성은 `tools/prerender_all.py --stage all --only plant_nature`처럼 실행합니다.

| 설정 | 기본값 / 용도 |
| --- | --- |
| `NOTEBOOK_COMFY_URL` | `http://127.0.0.1:8188` |
| `NOTEBOOK_COMFY_CHECKPOINT` | 기본 SD 1.5 파일명 대신 사용할 호환 체크포인트 |
| `NOTEBOOK_DATA_DIR` | 게임 상태·이미지·전송 기록의 데이터 루트; 생략 시 저장소 루트 |

### 프롬프트와 진화

`data/image_prompts.json`이 공통 원본입니다. CLI와 봇 모두 `engine/art.py`에서 종족·속성·성장 단계·최종 진화 분기를 조합합니다. 단계별 시드는 개체 ID와 이미지 키, 프롬프트 revision으로 고정됩니다.

1단계 식물/자연, 기계/불, 유령/바람 조합은 `assets/examples/`의 새 예시를 그대로 사용합니다. 나머지 조합은 ComfyUI가 생성합니다. 과거 `assets/samples/` 이미지를 자동 대체재로 섞지 않습니다. 대표 용 이미지도 임의의 용 펫 최종 모습으로 대체하지 않습니다.

진화는 직전 PNG를 업로드하고 알파 마스크를 반전해 640px 흰 캔버스에 합성합니다. 2단계에서는 512px로 축소해 여백을 만들고, 3단계부터는 640px를 유지하여 최종형이 반복 축소되는 문제를 피합니다. 합성한 이미지를 VAE로 인코딩하여 다음 단계의 초기 latent로 사용합니다.

`render` 설정은 640×640, DPM++ 2M / Karras, 28 steps, CFG 6.5입니다. 참조 변형 강도(denoise)는 2단계 0.56, 3단계 0.64, 4단계 0.78으로 증가합니다. 참조 없는 새싹기는 1.0입니다. 식물·기계·유령·용은 `species_stages`의 체형 지시와 `species_branches`의 분기 지시를 추가로 사용합니다. 그 외 종족은 공통 단계·분기 지시를 사용합니다. 최종 분기를 프롬프트 앞에 두고 종족별 제외 문구로 사람형 변형 등을 억제합니다.

유령은 얼굴이 무너지는 것을 줄이기 위해 0.48 / 0.56 / 0.60의 별도 강도를 사용합니다. 종족별 체형 지시가 있는 경우 장황한 공통 단계 지시를 중복하지 않습니다. 최종 분기는 분기 색상을 우선하고, 원래 속성은 불꽃·잎·바람 등의 무늬로 유지합니다. 게임의 속성 값은 바뀌지 않습니다.

누락된 단계는 1단계부터 생성합니다. 같은 개체나 그림체의 완전한 보존은 보장하지 않으며 변형 강도가 높을수록 원래 특징도 바뀔 수 있습니다. 대표 네 조합의 실제 비교는 [진화 갤러리](../assets/evolution_review/index.html), 판정은 [검토 기록](../assets/evolution_review/REVIEW.md)에 있습니다. 이전 512px 파이프라인의 기록은 [초기 연결 검증](LOCAL_IMAGE_VALIDATION.md)에 남겨두었습니다.

```bash
# 게임 세이브를 읽거나 바꾸지 않는 실제 이미지 비교 생성
python -X utf8 tools/preview_evolution.py
# 이전 단계가 저장되어 있을 때 최종 분기만 재생성
python -X utf8 tools/preview_evolution.py --output assets/evolution_preview --only plant --from-stage 4
# 이미 저장한 그림으로 HTML만 갱신: 서버 호출 없음
python -X utf8 tools/preview_evolution.py --output assets/evolution_review --gallery-only
# 같은 참조로 다른 시드 후보 비교
python -X utf8 tools/preview_evolution.py --output assets/evolution_preview --only ghost --from-stage 4 --seed-offset 2
```

미리보기는 검토용 파일을 덮어쓰므로 새 비교 실험에는 다른 `--output` 경로를 사용하세요. 빛·어둠 분기 모두 같은 3단계 이미지를 참조합니다. 시드, 실제 프롬프트, 참조 파일과 생성 설정은 단계별 JSON에, ComfyUI 워크플로우는 생성 PNG 메타데이터에 기록합니다. 갤러리의 검토용 샘플을 모든 사용자 펫의 이미지로 고정하는 기능은 아닙니다. 자동 외형 판별 기능은 없으며, 최종 후보 선택은 수동 검토 결과입니다.

### 저장과 실패 처리

- 출력: `artwork/<user_id>/<pet_id>/<revision>/<image_key>.png`. 옆 JSON에 요청·프롬프트·시드·이전 이미지명을 기록합니다.
- 생성 중에는 게임 저장소의 전역 잠금을 잡지 않습니다. 사용자별 이미지 잠금으로 중복 생성을 줄입니다.
- 최대 3회 시도합니다. 실패하면 이미 준비된 직전 단계 이미지를 반환하고 실제 이미지 단계와 요청 단계를 구분합니다. `!상태` 또는 `render_pet.py`로 다시 요청할 수 있습니다.
- PNG 구조·청크 CRC를 검사하고 임시 파일을 교체하여 저장합니다. 완전한 픽셀 디코딩 검사는 아닙니다.
- 생성 도중 리셋·재생성·다음 진화·접근 권한 변경이 일어나면 오래된 결과를 전송하지 않습니다.
- `.job.json`에 ComfyUI 작업 ID를 남겨 시간 초과 후 같은 작업을 조회합니다. 서버가 작업을 잊었다면 `/queue`와 `/history`에서 실행 중이 아님을 확인한 뒤 해당 작업 기록만 별도 보관하고 재시도합니다. 서버 접수와 로컬 기록 사이의 프로세스 중단까지 중복 생성을 완전히 방지하지는 않습니다.
- 체크포인트만 바꿔도 기존 PNG 캐시는 유지됩니다. 전체 스타일 변경은 프롬프트 `revision`을 올려 새 캐시 공간을 사용합니다. 이전 캐시는 자동 삭제하지 않습니다.

### 선택적 Discord 게이트웨이

```powershell
python -m pip install -r requirements-discord.txt
$env:DISCORD_BOT_TOKEN = "<bot token>"
$env:NOTEBOOK_CHANNEL_IDS = "<channel id>"
python -X utf8 tools/discord_bot.py
```

Discord Developer Portal에서 Message Content Intent를 활성화하고 봇에 채널 보기·메시지 보내기·메시지 기록 보기·파일 첨부 권한을 부여합니다. `!start Buddy`, `!상태` 등의 명령을 지원합니다. 허용 채널만 처리하고 인증된 이벤트의 `author.id`와 메시지 ID를 사용합니다. 이 게이트웨이는 정해진 문구로 응답하며 LLM 페르소나 설정은 별도입니다.

게임 결과를 먼저 응답하고 이미지가 준비되면 **같은 응답을 수정하여** 첨부합니다. `delivery/`의 전송 기록으로 재전달된 이벤트의 응답을 찾습니다. Discord 전송 성공 직후 로컬 기록 전에 프로세스가 중단되는 경우에는 중복 응답 가능성이 있습니다. 외부 전송까지 정확히 한 번을 보장하는 구조는 아닙니다. 한 데이터 루트에 게이트웨이 하나만 실행합니다. 기존 Hermes도 동일 이벤트를 동시에 처리하지 않도록 구성하세요.

## English

The game commits its state before slow image work. Start, status and evolution responses include an image descriptor. `ImageService` validates the current pet identity, reuses its cache and invokes local ComfyUI outside the game lock. Failed rendering never rolls back XP or evolution; it returns previous-stage artwork when available.

Install ComfyUI in a separate virtual environment and put the SD 1.5 checkpoint in its `models/checkpoints/` directory. Start it with `tools/start_comfyui.ps1 -ComfyPath <path>` and run `python tools/check_images.py`. The default endpoint is `http://127.0.0.1:8188`; configure `NOTEBOOK_COMFY_URL` and `NOTEBOOK_COMFY_CHECKPOINT` if needed. The commands above generate a standalone image or render an existing pet without changing gameplay.

The CLI and gateway share `data/image_prompts.json`. Three matching curated starter examples are reused; other starters use text-to-image. Evolution fits the previous image onto a 640px white canvas using its alpha mask and encodes the result. Sampling uses 28 steps, DPM++ 2M / Karras, CFG 6.5 and stage-specific denoise 0.56 / 0.64 / 0.78. Plant, machine, ghost and dragon have species-specific silhouettes, final branches and negative terms. Final-branch instructions come first. Missing stages are generated in order. Stronger evolution can also change identity; outputs still require visual review.

Ghosts use lower strengths of 0.48 / 0.56 / 0.60 to retain facial structure. References are reduced to 512px for stage two, then kept at 640px to avoid progressively shrinking the character. Species-specific silhouettes replace redundant generic descriptions. Final branches prioritize their own palette while retaining the original element through motifs; game element values are unchanged.

`tools/preview_evolution.py` generates a four-species comparison without accessing game saves. Both final branches use the same stage-three reference. Use separate output folders for experiments because preview files are overwritten. `--from-stage 4` regenerates finals using saved earlier stages; `--gallery-only` rebuilds HTML without network calls. See the [review gallery](../assets/evolution_review/index.html) and [findings](../assets/evolution_review/REVIEW.md). The historical 512px validation describes an earlier configuration.

PNG files and metadata live in `artwork/<user>/<pet>/<revision>/`. A per-user image lock, atomic PNG writes, structural PNG/CRC checks and stale-request checks protect rendering. Up to three attempts are made. Persisted ComfyUI job IDs resume polling after timeouts; a crash between server acceptance and saving that ID can still duplicate work. If ComfyUI forgets a job after restarting, inspect its queue/history before archiving the affected `.job.json` and retrying. Bump the prompt revision when intentionally replacing cached artwork; changing only the model preserves existing PNGs.

The optional `discord.py` gateway requires a bot token, allowed channel IDs, Message Content Intent and channel permissions. It sends the game result first, then edits that reply with the image. Persisted delivery receipts support retries but cannot eliminate the crash gap between Discord accepting a send and local receipt persistence. Run one gateway per data root and avoid duplicate routing through Hermes. Game rules remain independent of both gateways.

## References

- [ComfyUI manual installation](https://docs.comfy.org/installation/manual_install)
- [ComfyUI server API implementation](https://github.com/Comfy-Org/ComfyUI/blob/master/server.py)
- [SD 1.5 model card and license](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5)
- [DreamShaper model and license](https://huggingface.co/Lykon/DreamShaper)
- [discord.py API](https://discordpy.readthedocs.io/en/latest/api.html)
