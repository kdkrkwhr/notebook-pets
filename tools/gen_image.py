#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ComfyUI 로컬 생성 래퍼 — 몬스터 이미지 생성 후 assets/에 저장"""
import json, sys, time, urllib.request, shutil, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WF = os.path.join(BASE, "tools", "sd15_txt2img.json")
HOST = "http://127.0.0.1:8188"

def build_prompt(species_kr, element_kr, stage_kr, seed):
    wf = json.load(open(WF, encoding="utf-8"))
    wf.pop("_comment", None)
    pos = (f"cute {stage_kr} {species_kr} monster, Digimon style digital creature, "
           f"{element_kr} color theme and motifs, chubby round body, big expressive eyes, "
           f"notebook doodle aesthetic, clean lineart, light watercolor coloring, "
           f"plain white background, game character concept art, masterpiece, best quality")
    neg = "ugly, blurry, low quality, deformed, realistic, photo, human"
    wf["6"]["inputs"]["text"] = pos
    wf["7"]["inputs"]["text"] = neg
    wf["3"]["inputs"]["seed"] = seed
    return {"prompt": wf}

def main():
    species_kr, element_kr, stage_kr, out_name = sys.argv[1:5]
    seed = int(sys.argv[5]) if len(sys.argv) > 5 else int(time.time())
    payload = build_prompt(species_kr, element_kr, stage_kr, seed)
    req = urllib.request.Request(f"{HOST}/api/prompt",
                                 data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        pid = json.loads(r.read())["prompt_id"]
    # 폴링
    for _ in range(360):  # 최대 30분 (CPU 모드 대비)
        time.sleep(5)
        with urllib.request.urlopen(f"{HOST}/history/{pid}", timeout=30) as r:
            h = json.loads(r.read())
        if pid in h:
            outs = h[pid]["outputs"]
            for node_id, o in outs.items():
                for img in o.get("images", []):
                    src = img["filename"]
                    url = f"{HOST}/view?filename={src}&subfolder={img.get('subfolder','')}&type={img.get('type','output')}"
                    dst_dir = os.path.join(BASE, "assets", os.path.dirname(out_name) or ".")
                    os.makedirs(dst_dir, exist_ok=True)
                    dst = os.path.join(BASE, "assets", out_name)
                    with urllib.request.urlopen(url, timeout=60) as resp, open(dst, "wb") as f:
                        shutil.copyfileobj(resp, f)
                    print(json.dumps({"ok": True, "saved": dst, "seed": seed}, ensure_ascii=False))
                    return
            print(json.dumps({"ok": False, "error": "no image in outputs", "outputs": list(outs.keys())}))
            return
    print(json.dumps({"ok": False, "error": "timeout"}))

if __name__ == "__main__":
    main()
