#!/usr/bin/env python3
"""Generate a reproducible four-species evolution contact sheet using local ComfyUI."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import sys
import time
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "engine"))
import art
from comfy_images import ComfyUIProvider
from image_service import atomic_png

CASES = {"plant": "nature", "machine": "fire", "ghost": "wind", "dragon": "light"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="assets/evolution_preview")
    parser.add_argument("--only", nargs="+", choices=CASES, default=list(CASES))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--sample-seed", type=int, help="Explicit base seed for a reproducible visual comparison")
    parser.add_argument("--seed-offset", type=int, default=0, help="Try another sample seed for the selected stages")
    parser.add_argument("--from-stage", type=int, choices=(1, 2, 3, 4), default=1,
                        help="Keep earlier saved stages and regenerate from this stage")
    parser.add_argument("--timeout", type=float, default=300)
    parser.add_argument("--gallery-only", action="store_true", help="Rebuild HTML from saved metadata without generating")
    args = parser.parse_args()
    folder = (art.ROOT / args.output).resolve()
    if not folder.is_relative_to((art.ROOT / "assets").resolve()):
        parser.error("Output must be inside assets/")
    folder.mkdir(parents=True, exist_ok=True)
    if args.gallery_only:
        write_gallery(folder)
        return
    provider = ComfyUIProvider(timeout=args.timeout)
    manifest = []
    for species in args.only:
        element = CASES[species]
        previous = None
        anchor = folder / (art.image_key(species, element, 1) + ".png")
        for stage, branch in ((1, None), (2, None), (3, None), (4, "light"), (4, "dark")):
            key = art.image_key(species, element, stage, branch)
            if stage < args.from_stage:
                previous = folder / (key + ".png")
                if not previous.is_file() or not previous.with_suffix(".json").is_file():
                    parser.error(f"Missing previous stage: {previous}")
                continue
            spec = {"species": species, "element": element, "stage": stage, "branch": branch,
                    "key": key, "pet_id": hashlib.sha256(f"preview:{args.seed}:{species}".encode()).hexdigest()[:32],
                    "revision": art.TEMPLATE["revision"]}
            if args.seed_offset:
                spec["seed"] = art.image_seed(spec) + args.seed_offset
            if args.sample_seed is not None:
                spec["seed"] = args.sample_seed + stage + (1 if branch == "dark" else 0)
            prompt = art.build_prompt(species, element, stage, branch, previous is not None)
            destination = folder / (key + ".png")
            curated = art.ROOT / "assets/examples" / (key + ".png")
            style_reference = anchor if stage > 1 else art.ROOT / "assets/examples" / art.TEMPLATE["starter_style_reference"]
            started = time.monotonic()
            if stage == 1 and curated.is_file():
                data = curated.read_bytes()
                source = "curated"
            else:
                data = provider.generate(spec, prompt, previous, destination.with_suffix(".job.json"),
                                         style_reference=style_reference)
                source = provider.name
            atomic_png(destination, data)
            record = {"request": spec, "file": destination.name, "seed": art.image_seed(spec),
                      "preview_seed": args.seed,
                      "seed_offset": args.seed_offset,
                      "reference": previous.name if previous else None, "prompt": prompt,
                      "style_reference": style_reference.name if source != "curated" else None,
                      "style_reference_sha256": hashlib.sha256(style_reference.read_bytes()).hexdigest() if source != "curated" else None,
                      "ipadapter": art.adapter_settings(stage, species) if source != "curated" else None,
                      "reference_sha256": hashlib.sha256(previous.read_bytes()).hexdigest() if previous else None,
                      "sha256": hashlib.sha256(data).hexdigest(),
                      "checkpoint": provider.checkpoint or json.loads((art.ROOT / "tools/sd15_txt2img.json").read_text())["4"]["inputs"]["ckpt_name"],
                      "source": source, "render": art.render_settings(stage, previous is not None, species),
                      "seconds": round(time.monotonic() - started, 2)}
            destination.with_suffix(".json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
            manifest.append(record)
            if stage < 4:
                previous = destination  # both final branches reference the SAME stage three
            print(json.dumps({"file": destination.name, "seconds": record["seconds"]}), flush=True)
    write_gallery(folder)


def write_gallery(folder):
    manifest = []
    for species, element in CASES.items():
        for stage, branch in ((1, None), (2, None), (3, None), (4, "light"), (4, "dark")):
            path = folder / (art.image_key(species, element, stage, branch) + ".json")
            if path.is_file():
                manifest.append(json.loads(path.read_text(encoding="utf-8")))
    (folder / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    cards = []
    for record in manifest:
        spec = record["request"]
        title = f"{spec['species']} / {spec['element']} / Stage {spec['stage']} {spec['branch'] or ''}"
        labels = {"plant": "식물 · 자연", "machine": "기계 · 불", "ghost": "유령 · 바람", "dragon": "용 · 빛"}
        stages = {1: "01 새싹기", 2: "02 성장기", 3: "03 성숙기", 4: "04 완전체"}
        branch_label = {"light": " · 빛 분기", "dark": " · 어둠 분기", None: ""}[spec["branch"]]
        source = "기존 대표 이미지" if record["source"] == "curated" else "로컬 ComfyUI 생성"
        cards.append(f'<figure data-species="{spec["species"]}"><a href="{record["file"]}"><img alt="{html.escape(title)}" src="{record["file"]}" loading="lazy"></a>'
                     f'<figcaption><small>{labels[spec["species"]]}</small>{stages[spec["stage"]]}{branch_label}'
                     f'<small>{source} · seed {record["seed"]}</small></figcaption></figure>')
    page = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notebook Pets · Evolution review</title><style>
body{background:#f3f5f8;color:#172136;font:16px system-ui;margin:32px}h1{margin-bottom:8px}
.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}figure{margin:0;background:white;border-radius:12px;overflow:hidden}img{width:100%;aspect-ratio:1;object-fit:contain}figcaption{padding:12px;font-weight:600}small{display:block;font-size:11px;color:#69758a;margin-top:6px}p{max-width:1000px;line-height:1.7}@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}}
</style><h1>Notebook Pets · Evolution review</h1>
<p>1 → 2 → 3 → 4 Light / 4 Dark. Both final branches use the same stage-three reference. Click an image to inspect full size. Local ComfyUI outputs; curated starters are labelled.</p><div class="grid">'''
    template = art.ROOT / "tools/templates/evolution_review.html"
    if template.is_file():
        page = template.read_text(encoding="utf-8").replace("{{CARDS}}", "".join(cards))
    else:
        page += "".join(cards) + "</div></html>"
    (folder / "index.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
