#!/usr/bin/env python3
"""Render the current pet without advancing gameplay. Same service as Discord."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "engine"))
import engine
from comfy_images import ComfyUIProvider
from image_service import ImageService


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("user_id")
    parser.add_argument("--timeout", type=float, default=180)
    args = parser.parse_args()
    result = engine.execute(args.user_id, "status")
    if result["ok"]:
        result = ImageService(ComfyUIProvider(timeout=args.timeout)).render(args.user_id, result["image"])
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result.get("status") == "ready" else 1


if __name__ == "__main__":
    sys.exit(main())
