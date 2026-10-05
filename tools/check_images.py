#!/usr/bin/env python3
"""Read-only ComfyUI readiness check; never queues generation."""
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "engine"))
from comfy_images import ComfyUIProvider, build_workflow
from runtime import GameError


def main():
    try:
        provider = ComfyUIProvider()
        stats = provider._http("/system_stats")
        workflow = build_workflow("check", 1, reference_name="check.png", checkpoint=provider.checkpoint)["prompt"]
        required = sorted({node["class_type"] for node in workflow.values()})
        missing = []
        for name in required:
            info = provider._http("/object_info/" + name)
            if not isinstance(info, dict) or name not in info:
                missing.append(name)
        loader = provider._http("/object_info/CheckpointLoaderSimple")
        models = loader.get("CheckpointLoaderSimple", {}).get("input", {}).get("required", {}).get("ckpt_name", [[]])[0]
        expected = workflow["4"]["inputs"]["ckpt_name"]
        ok = not missing and expected in models
        print(json.dumps({"ok": ok, "url": provider.host, "checkpoint": expected,
                          "checkpoint_available": expected in models, "missing_nodes": missing,
                          "devices": stats.get("devices", [])}, ensure_ascii=False))
        return 0 if ok else 1
    except (GameError, ValueError, KeyError, TypeError, AttributeError, IndexError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main())
