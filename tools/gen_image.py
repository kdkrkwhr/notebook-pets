#!/usr/bin/env python3
"""ComfyUI CLI using the same prompts and reference workflow as the live bot."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "engine"))
import art
from comfy_images import ComfyUIProvider, build_workflow
from image_service import atomic_png
from runtime import GameError

BASE = art.ROOT
G = json.loads((BASE / "data/game_data.json").read_text(encoding="utf-8"))
SPECIES_MAP = {v["name_kr"]: k for k, v in G["species"].items()}
ELEMENT_MAP = {v["name_kr"]: k for k, v in G["elements"].items()}
STAGE_MAP = {"sprout": 1, "growth": 2, "mature": 3, "ultimate": 4,
             **{entry["label"]: i for i, entry in enumerate(G["stages"], 1)},
             "1": 1, "2": 2, "3": 3, "4": 4}


def build_prompt(species, element, stage, seed, *, branch=None, reference_name=None):
    sp, el = SPECIES_MAP.get(species, species), ELEMENT_MAP.get(element, element)
    number = STAGE_MAP.get(str(stage))
    prompt = art.build_prompt(sp, el, number, branch, reference_name is not None)
    return build_workflow(prompt, seed, reference_name=reference_name,
                          checkpoint=os.environ.get("NOTEBOOK_COMFY_CHECKPOINT"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("species")
    parser.add_argument("element")
    parser.add_argument("stage")
    parser.add_argument("out_name", help="PNG path relative to assets/")
    parser.add_argument("seed", type=int, nargs="?")
    parser.add_argument("--branch", choices=("light", "dark"))
    parser.add_argument("--reference", type=Path)
    parser.add_argument("--timeout", type=float, default=180)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    try:
        sp = SPECIES_MAP.get(args.species, args.species)
        el = ELEMENT_MAP.get(args.element, args.element)
        stage = STAGE_MAP.get(args.stage)
        key = art.image_key(sp, el, stage, args.branch)
        output = (BASE / "assets" / args.out_name).resolve()
        if not output.is_relative_to((BASE / "assets").resolve()) or output.suffix.lower() != ".png":
            raise ValueError("Output must be a PNG inside assets/")
        if args.reference and not args.reference.is_file():
            raise ValueError("Reference image does not exist")
        spec = {"species": sp, "element": el, "stage": stage, "branch": args.branch,
                "pet_id": hashlib.sha256(f"{sp}:{el}".encode()).hexdigest()[:32],
                "key": key, "revision": art.TEMPLATE["revision"]}
        if args.seed is not None:
            spec["seed"] = args.seed
        prompt = art.build_prompt(sp, el, stage, args.branch, args.reference is not None)
        if args.dry_run:
            print(json.dumps({"ok": True, "prompt": prompt, "seed": art.image_seed(spec),
                              "workflow": build_workflow(prompt, art.image_seed(spec),
                                   reference_name=args.reference.name if args.reference else None,
                                   checkpoint=os.environ.get("NOTEBOOK_COMFY_CHECKPOINT"))}, ensure_ascii=False))
            return 0
        if output.exists() and not args.overwrite:
            raise ValueError("Output exists; use --overwrite explicitly")
        data = ComfyUIProvider(timeout=args.timeout).generate(spec, prompt, args.reference, output.with_suffix(".job.json"))
        atomic_png(output, data)
        print(json.dumps({"ok": True, "saved": str(output), "seed": art.image_seed(spec)}, ensure_ascii=False))
        return 0
    except (GameError, ValueError, OSError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main())
