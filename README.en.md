# Notebook Pets · Notebuddy

[한국어](README.md) · **English**

Version **0.2.0**

> An AI companion born in a notebook — a monster you care for and raise on Discord.

Notebook Pets is a virtual-pet project where **Python handles the game rules and an AI agent gives the character its voice and story**. Feed your monster, play together, and take walks to build a relationship with your companion. Connect Hermes or another AI agent through shared Python tools or MCP, or use the standalone Discord gateway.

The repository is named `notebook-pets`; the service name is **Notebuddy (노트버디)**.

<p align="center">
  <img src="assets/examples/plant_nature_stage1.png" width="160" alt="A nature-element plant monster">
  <img src="assets/examples/machine_fire_stage1.png" width="160" alt="A fire-element machine monster">
  <img src="assets/examples/ghost_wind_stage1.png" width="160" alt="A wind-element ghost monster">
  <img src="assets/examples/dragon_light_stage4.png" width="160" alt="A light-element dragon in its final form">
</p>

## Game features

| Area | Contents |
| --- | --- |
| Monsters | 9 species × 8 elements: 72 starter combinations |
| Care | Feeding, snacks, play, sleep, intimacy, and satiety |
| Daily quest | Feed once, train twice, and walk once to claim a reward |
| Activities | Persistent stat training, walks, HP-based automatic battles, capture, and fleeing |
| Records | Battle records, capture collection, titles, and rankings |
| Progression rules | Stage transitions at levels 31, 51, and 81; level cap of 100 |
| Final evolution | Light branch at intimacy 70 or above; dark branch below 70 |
| Artwork | Per-pet artwork and evolution with local ComfyUI and IP-Adapter |
| Agent integration | Shared Python tools, stdio MCP, and a Discord gateway |

Browse the [character showcase](assets/examples/README.md) and the [evolution gallery](assets/anchored_evolution/index.html) for plant, machine, ghost, and dragon growth, including light/dark branches. Earlier artwork for all 72 starter combinations is preserved in `assets/samples/`.

## Architecture and principles

```text
User message → host binds authenticated actor and event
    ├─ AI agent → shared Python tool / stdio MCP
    └─ standalone Discord gateway → command handling
                        ↓
                 Python game engine
    ├─ growth, combat, and action rules from game_data.json
    ├─ access control, file locking, and event deduplication
    └─ state/{user_id}.json stores state and processing receipts
                        ↓
                 JSON result → reply

Image request → ImageService → local ComfyUI + IP-Adapter
                            → per-pet cache → host delivers artwork
```

- **Separate rules from expression:** the agent is intended to narrate engine results rather than invent game outcomes.
- **Persist state in files:** per-user JSON, rather than conversational memory, is the source of game state.
- **Keep balance in data:** species, elements, matchups, XP thresholds, and action limits live in `data/game_data.json`.
- **Swap agents:** models receive only command arguments. The trusted host binds actor and event IDs; retries keep the same receipt even when changing providers.
- **Separate saves from rendering:** image failures do not roll back committed XP or evolution. Example persona instructions are in the [integration guide](docs/AGENT_INTEGRATION.md).

Species selection, encounters, and battles use randomness governed by the game rules.

## Quick start

### Requirements

- Verified with Python 3.12.
- The engine, shared Python adapter, and basic tests use only the standard library. Install `requirements-mcp.txt` for MCP or `requirements-discord.txt` for the Discord gateway.
- Discord, Hermes, ComfyUI, and LLM API keys are not required to try the basic CLI.

Run these commands from the repository root:

```bash
git clone https://github.com/kdkrkwhr/notebook-pets.git
cd notebook-pets

# Help takes no user ID
python -X utf8 engine/engine.py help

# Creates a demo save at state/123456789012345678.json
python -X utf8 engine/engine.py 123456789012345678 start Buddy
python -X utf8 engine/engine.py 123456789012345678 status
python -X utf8 engine/engine.py 123456789012345678 밥줘
python -X utf8 engine/engine.py 123456789012345678 walk

# Rankings also take no user ID
python -X utf8 engine/engine.py rank
```

Starting again with the same ID returns an existing-monster response. These commands create and modify a save file, so use a demo ID distinct from real users. Commands and decay jobs using the same store are serialized with a file lock.

Successful commands and handled game errors print JSON containing `ok` and `msg`. Messages are currently in Korean, and additional fields vary by command.

## Commands

The general format is below. Do not pass Discord's `!` prefix directly to the engine.

```text
python -X utf8 engine/engine.py <user_id> <command> [arguments...]
```

| Action | CLI command / alias |
| --- | --- |
| Create a monster | `start <name>` / `공책시작 <name>` |
| View status | `status` / `상태` |
| Feed / give a snack | `feed` / `밥줘`, `snack` / `간식줘` |
| Play / sleep | `play` / `놀아줘`, `sleep` / `재워줘` / `잘자` |
| Train / walk | `train` / `훈련`, `walk` / `산책` |
| Battle / capture / flee | `battle` / `배틀`, `catch` / `포획`, `flee` / `도망` |
| Daily attendance (XP + 3 normal feed) | `attendance` / `출석` |
| Quest progress / claim reward | `quests` / `퀘스트` / `일일퀘스트`, `claimquest` / `퀘스트보상` |
| Collection / titles | `pokedex` / `도감`, `titles` / `칭호` |
| Rankings | `python -X utf8 engine/engine.py rank` or `랭킹` — omit the ID |
| Help | `python -X utf8 engine/engine.py help` or `도움말` — omit the ID |

Resolve a wild encounter by battling, capturing, or fleeing before walking again. Use `status` to inspect the current encounter. Automatic battles start at full HP and last up to 20 rounds; HP, attack, and defense training all contribute. Simultaneous knockouts are draws.

Daily limits reset at midnight in Korea (KST); sleep grants an XP bonus for the following calendar day. Attendance provides three normal feed once per day. When owner access is enabled, rankings also require an allowed user ID.

### Daily quest

Use `quests` to check progress. Feed once, train twice, and walk once, then use `claimquest` to receive **30 base XP and one rare feed**. Discord aliases are `!퀘스트` and `!퀘스트보상`. Status and successful objective actions also include progress.

Only successful actions count; rewards can be claimed once per day. Progress and claim eligibility reset at midnight KST; unclaimed rewards do not carry over. Existing sleep bonuses, level caps, and evolution rules apply to XP rewards. Configure objectives and rewards in `data/game_data.json` under `daily_quest`.

### Administrator and owner settings

Set `NOTEBOOK_ADMIN_IDS` to comma-separated administrator IDs. By default, no administrators are configured.

```powershell
# PowerShell example — replace with the actual administrator's Discord ID
$env:NOTEBOOK_ADMIN_IDS = "123456789012345678"
python -X utf8 engine/engine.py 123456789012345678 owner 987654321098765432 Player
python -X utf8 engine/engine.py 123456789012345678 clearowner
```

- `owner <target_id> [name]`: restricts **this entire deployment** to the designated owner and administrators. It does not assign ownership of an individual user's monster.
- `clearowner`: removes the owner restriction.
- `reset <target_id> [new_name]`: deletes the target save. If the new name has at least two characters, a new monster is created.

Settings are stored in the Git-ignored `data/access.json`. The CLI does not authenticate callers: the integration must supply the real sender ID. IDs must be positive integer strings of 1–20 ASCII digits. See the [runtime integration guide](docs/INTEGRATION.md) for agent integration and storage settings.

## Agent and Discord integration

| Connection | Use |
| --- | --- |
| Python tools | Register the game with a custom agent, Hermes, or another host |
| stdio MCP | Persistent read-only access, or event-scoped gameplay through a gateway |
| Standalone Discord bot | Command handling and artwork delivery without an AI agent |

### Shared Python tool

Add `engine/` to the host's Python module search path. Replace these example IDs with authenticated message metadata.

```python
from adapter import bind_game_event, dispatch_tool, tool_definition

game = bind_game_event(actor_id="123", event_id="discord:456")
definition = tool_definition()  # Register using your host SDK's format
result = dispatch_tool(game, {"command": "feed", "arguments": []})
```

Retrying the same event returns the saved result. A different mutation for an already committed event is rejected; reads remain available. Administrative commands are excluded from agent tools.

### MCP

```bash
python -m pip install -r requirements-mcp.txt
```

Configure your MCP host to launch `tools/mcp_server.py` over stdio with `NOTEBOOK_ACTOR_ID` and `NOTEBOOK_DATA_DIR`. **Persistent connections are read-only.** For gameplay mutations, a trusted gateway supplies `NOTEBOOK_EVENT_ID` for each authenticated user message. Do not put a fixed event ID in persistent configuration. The tool returns game JSON; rendering and image delivery remain host responsibilities.

See [AI agent integration](docs/AGENT_INTEGRATION.md) for configuration JSON and event-scoped connections.

### Discord bot

`tools/discord_bot.py` replies with the game result first, then edits that message to attach artwork. See [image and Discord setup](docs/IMAGES.md) for the bot token, allowed channels, and local image server configuration. External agents such as Hermes can use the same engine through the shared adapter.

### Image generation (optional)

Using the existing PNGs does not require ComfyUI. To generate new artwork, provide:

- ComfyUI running at `http://127.0.0.1:8188`.
- The `DreamShaper_8_pruned.safetensors` checkpoint.
- The `ComfyUI_IPAdapter_plus` node and IP-Adapter Plus / CLIP Vision models — see [setup](docs/IMAGES.md).

```bash
python -X utf8 tools/gen_image.py plant nature sprout samples/demo_plant.png 42
python -X utf8 tools/prerender_all.py --stage 1
```

The first command writes `assets/samples/demo_plant.png`. The second skips starter images that already exist. The bot and CLI share `data/image_prompts.json`. Evolution uses the previous stage as its starting image and the original starter as its style and character reference. Both final branches start from the same stage-three image. Artwork is cached per pet. Check the server with `python tools/check_images.py`; render an existing pet with `python tools/render_pet.py <user_id>`.

Compare plant, machine, ghost and dragon growth and final light/dark branches in the [evolution gallery](assets/anchored_evolution/index.html). Evolution references each pet's original appearance while changing body proportions at maturity. Open the HTML locally to filter by species and inspect full-size images.

## Repository layout

```text
engine/engine.py           Game CLI and rule processing
engine/adapter.py          Shared agent tools and actor/event binding
engine/image_service.py    Per-pet image rendering and cache
tools/mcp_server.py        stdio MCP server
tools/discord_bot.py       Standalone Discord gateway
data/image_prompts.json   Shared image prompts and reference settings
assets/anchored_evolution/ Growth and final-branch gallery
data/game_data.json       Balance data
data/prompt_templates.md  Image-prompt reference
state/                    User saves (JSON files are Git-ignored)
assets/samples/           Starter artwork and extra samples
assets/samples_hd/        Selected high-resolution samples
tools/gen_image.py        ComfyUI image generator
tools/prerender_all.py    Batch generation for combinations
tools/preview_roll.py     Random species/element preview
tools/daily_decay.py      Inactivity decay batch
tools/backup_store.py     Save snapshots, verification, and recovery to a new root
tools/daily_backup.py     Verified backup job and retention policy
tools/register_backup_task.ps1 Windows daily backup scheduling
tools/upscale_images.py  Image upscaling tool
tests/test_engine.py      Engine self-checks
promo/index.html         Static promotional page
docs/                    Agent, artwork, and runtime integration guides
```

Run `python -X utf8 tools/backup_store.py create --output backups/save.json` to snapshot saves, quest claims, event receipts, and access settings together. Use `verify backups/save.json` to check the snapshot and `restore backups/save.json --target <new-directory>` to recover without overwriting existing data. See [backup and recovery](docs/BACKUP.md) for separate artwork preservation and deployment switching.

For scheduled execution, use `tools/daily_backup.py --destination backups`. It verifies each new snapshot before applying a default 30-day retention window with at least the newest seven preserved. Manual backups are excluded from pruning. The Windows scheduling helper supports configuration previews and registration with `-Register`.

## Verification

```bash
python -B -X utf8 tests/test_engine.py
python -B -X utf8 -m unittest discover -s tests -p "test_*.py" -v
```

Tests cover species bonuses, XP and evolution, sleep, access control, storage failures, concurrent processes, message replay, combat, image pipelines, and agent integration. Test data is stored in temporary files.

Installing `requirements-mcp.txt` also enables the real stdio client/server test; otherwise that test is skipped. Current validation: **120 unittest cases and 8 engine self-checks passed**, without an external LLM account. Recovery tests cover transaction locking, damaged files, event replay after restoration, retention, and interrupted-job recovery.

## Documentation

- [Backup and recovery](docs/BACKUP.md): save snapshots, validation, and restoration to a new data root

- [AI agent integration](docs/AGENT_INTEGRATION.md): Python tools, MCP setup, and agent instructions
- [Runtime integration](docs/INTEGRATION.md): identity, deduplication, and storage rules
- [Image and Discord setup](docs/IMAGES.md): running ComfyUI and the bot
- [Evolution gallery](assets/anchored_evolution/index.html): growth across four representative species
- [Balance report](docs/BALANCE_REPORT.md): combat and progression simulations
