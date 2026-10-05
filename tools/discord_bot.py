#!/usr/bin/env python3
"""Optional standalone gateway. No paid image API or LLM is required."""
import os
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "engine"))
import engine
from comfy_images import ComfyUIProvider
from discord_delivery import DiscordDelivery
from image_service import ImageService
from runtime import store_lock, validate_user_id


def main():
    token = os.environ.get("DISCORD_BOT_TOKEN")
    channels = {v.strip() for v in os.environ.get("NOTEBOOK_CHANNEL_IDS", "").split(",") if v.strip()}
    if not token or not channels:
        raise SystemExit("Set DISCORD_BOT_TOKEN and NOTEBOOK_CHANNEL_IDS before starting.")
    for channel in channels:
        validate_user_id(channel)
    try:
        import discord
    except ImportError:
        raise SystemExit("Install optional dependencies: python -m pip install -r requirements-discord.txt")
    intents = discord.Intents.default()
    intents.message_content = True
    client = discord.Client(intents=intents)
    delivery = DiscordDelivery(ImageService(ComfyUIProvider()), discord)

    @client.event
    async def on_message(message):
        if str(message.channel.id) in channels:
            await delivery.handle(message)

    with store_lock(Path(engine.STATE_DIR).parent / ".gateway", timeout=0.1):
        client.run(token)


if __name__ == "__main__":
    main()
