# Notebook Pets CLI · NoteBuddy

**Raise a small companion from your terminal, and let your AI agent check in on it.**

Notebook Pets is the lightweight Python edition of [NoteBuddy](https://github.com/kdkrkwhr/notebook-pets). Name a companion, feed and play with it, take walks, gain experience, complete daily quests and inspect its growth album. The shared Python engine decides rewards, stats, timers and saves; an LLM cannot invent them.

Python 3.11 or newer. Windows, macOS and Linux. The basic CLI uses only the Python standard library and makes no AI or network requests. This is an alpha distribution, independently versioned from the Anna and desktop apps.

## Install and meet your companion

After the first PyPI publication:

```sh
python -m pip install --pre notebook-pets
notebook-pets start Buddy
notebook-pets status
notebook-pets feed
notebook-pets play
notebook-pets walk
notebook-pets album
```

Commands return UTF-8 JSON. Check `ok`, `code` and `msg`; a rejected game action exits with status 1. Rule messages are currently primarily Korean. The command names and this setup guide are English. The AI host can explain results in your preferred language.

```sh
notebook-pets --help       # launcher options
notebook-pets help         # game commands
notebook-pets data-dir     # actual save location; does not create a save
python -m notebook_pets status
notebook-pets --data-dir ./my-notebook --actor-id 2 start Mochi
```

Put launcher options before the game command. Running `start` again preserves an existing companion. There is no AI image generation, chat model, graphical game window, desktop roaming pet or bundled artwork in this package. Image descriptors in game results are metadata, not newly generated image files. Get the [desktop app](https://github.com/kdkrkwhr/notebook-pets/blob/release-desktop/desktop/README.md) or [Anna app](https://anna.partners/store/@kdkrkwhr/notebuddy) for the visual experience.

## Connect an MCP client

```sh
python -m pip install --pre "notebook-pets[mcp]"
```

Create your companion with the CLI first. Then add this to a host that supports stdio MCP (its settings format may differ):

```json
{
  "mcpServers": {
    "notebook-pets": {
      "command": "notebook-pets",
      "args": ["mcp"]
    }
  }
}
```

If your host cannot find the command, use the installed Python executable's absolute path as `command`, and `["-m", "notebook_pets", "mcp"]` as `args`. Use the same `--data-dir` and `--actor-id` as your CLI if you changed them. Those options precede `mcp`.

Ask your agent: “Check my Notebook Pets companion's status and explain its quests.” The `notebook_game` tool is **read-only by default**: status, quests, album, titles, ranking, home layout and help. It does not automatically play or generate images. MCP itself needs no AI key; your chosen AI host supplies the model and its own usage terms.

### Mutation-capable gateways

The existing engine supports exactly one committed game mutation per authenticated user-message ID. A trusted gateway can launch one MCP process per message with `NOTEBOOK_ACTOR_ID` and a unique, stable `NOTEBOOK_EVENT_ID`, e.g. `discord:123456`. Reuse that event ID when retrying the same message. The model cannot supply either ID as a tool argument. Different messages require different processes/events. **Do not put a fixed event ID in a persistent MCP configuration.** Normal persistent MCP clients remain read-only; use the CLI to care for your companion.

This preserves the existing [agent integration contract](https://github.com/kdkrkwhr/notebook-pets/blob/release/docs/AGENT_INTEGRATION.md). Local notebook IDs and environment variables are not remote authentication. Do not expose the CLI, arbitrary shell access or data directory to untrusted remote users. Operator commands are never exposed through MCP.

## Your saves

| OS | Default data directory |
| --- | --- |
| Windows | `%LOCALAPPDATA%\NotebookPetsCLI` |
| macOS | `~/Library/Application Support/NotebookPetsCLI` |
| Linux | `$XDG_DATA_HOME/notebook-pets`, or `~/.local/share/notebook-pets` |

`--data-dir` overrides `NOTEBOOK_DATA_DIR`, which overrides the default. Saves live under `state/` within that directory; local access configuration is under `data/`. Each `--actor-id` selects a notebook in this local store (default `1`). Updates do not delete saves. Back up the directory while the CLI/MCP process is stopped. This package does not discover, import or modify Anna, desktop or Android saves automatically.

## Build from the repository

```sh
python -m pip install build twine
python -m build
python -m twine check dist/*
python -m pip install --pre "notebook-pets[mcp] @ file:///absolute/path/to/the-built-wheel.whl"
```

The wheel contains an explicit selection of the canonical `engine/` files, two rule JSON files and the existing stdio MCP adapter. These are packaged at build time; game rules are not copied into a separately maintained implementation. Runtime files, personal saves, generated pictures, credentials and the Anna-only tool adapter are excluded.

## Download statistics

Once published to PyPI and its data becomes available, [pepy](https://pepy.tech/projects/notebook-pets) can display this distribution's download activity. Downloads include automated installs and repeat installs; they are not unique players, active users or downloads of the Anna/desktop/Android apps. The link may not resolve before publication or initial indexing.

MIT licensed. [Source and feedback](https://github.com/kdkrkwhr/notebook-pets).
