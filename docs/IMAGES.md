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

진화는 직전 PNG를 `/upload/image`로 업로드하고 `LoadImage → ImageScale(512) → VAEEncode → KSampler`에 전달하는 img2img 방식입니다. 기본 denoise는 0.4입니다. 누락된 단계가 있으면 1단계부터 순서대로 생성합니다. 이전 색상과 외형을 참조하지만 동일 개체나 그림체의 완전한 보존을 보장하지는 않습니다. 채팅 도구로 만든 예시와 SD 1.5 출력도 동일한 품질을 보장하지 않습니다. [실제 로컬 검증 결과](LOCAL_IMAGE_VALIDATION.md)와 [생성 예시](../assets/runtime_examples/README.md)를 참고하세요.

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

The CLI and gateway share `data/image_prompts.json`. The three matching curated starter examples are reused; other starters use text-to-image. Evolution uploads the previous PNG and feeds its encoded latent to KSampler at denoise 0.4. Missing stages are generated in order. This encourages continuity but does not guarantee character identity or the quality of the chat-generated showcase.

PNG files and metadata live in `artwork/<user>/<pet>/<revision>/`. A per-user image lock, atomic PNG writes, structural PNG/CRC checks and stale-request checks protect rendering. Up to three attempts are made. Persisted ComfyUI job IDs resume polling after timeouts; a crash between server acceptance and saving that ID can still duplicate work. If ComfyUI forgets a job after restarting, inspect its queue/history before archiving the affected `.job.json` and retrying. Bump the prompt revision when intentionally replacing cached artwork; changing only the model preserves existing PNGs.

The optional `discord.py` gateway requires a bot token, allowed channel IDs, Message Content Intent and channel permissions. It sends the game result first, then edits that reply with the image. Persisted delivery receipts support retries but cannot eliminate the crash gap between Discord accepting a send and local receipt persistence. Run one gateway per data root and avoid duplicate routing through Hermes. Game rules remain independent of both gateways.

## References

- [ComfyUI manual installation](https://docs.comfy.org/installation/manual_install)
- [ComfyUI server API implementation](https://github.com/Comfy-Org/ComfyUI/blob/master/server.py)
- [SD 1.5 model card and license](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5)
- [DreamShaper model and license](https://huggingface.co/Lykon/DreamShaper)
- [discord.py API](https://discordpy.readthedocs.io/en/latest/api.html)
