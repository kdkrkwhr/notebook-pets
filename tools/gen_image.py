#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ComfyUI 로컬 생성 래퍼 — 몬스터 이미지 생성 후 assets/에 저장

주의: ComfyUI의 CLIP은 영어로만 학습되어 있다. 종족/속성/단계를 한국어로
그대로 때려 박으면 전부 무시되고 "그냥 귀여운 몬스터"만 나온다.
반드시 data/game_data.json의 영어 키로 변환해 프롬프트에 넣는다.
"""
import json, sys, time, urllib.request, shutil, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WF = os.path.join(BASE, "tools", "sd15_txt2img.json")
HOST = "http://127.0.0.1:8188"
GAME_DATA = os.path.join(BASE, "data", "game_data.json")

# 한국어 표시명 -> 영어 키 매핑 (CLIP 호환용)
def _load_maps():
    g = json.load(open(GAME_DATA, encoding="utf-8"))
    sp = {v["name_kr"]: k for k, v in g["species"].items()}
    el = {v["name_kr"]: k for k, v in g["elements"].items()}
    return sp, el

SPECIES_MAP, ELEMENT_MAP = _load_maps()

STAGE_EN = {"새싹기": "sprout", "성장기": "growth", "성숙기": "mature", "완전체": "ultimate"}

# 영어 키 -> 이미지 생성용 자연어 명사
SPECIES_NOUN = {
    "mammal": "mammal", "bird": "bird", "reptile": "reptile",
    "machine": "robot", "fairy": "fairy", "monster": "monster",
    "dragon": "dragon", "plant": "plant", "ghost": "ghost",
}
# 영어 키 -> 색감 테마 (명확한 색 지정)
ELEMENT_THEME = {
    "fire": "fiery red and orange", "water": "aqua blue",
    "thunder": "electric yellow and purple", "nature": "green leafy",
    "wind": "pale cyan", "earth": "brown rocky",
    "light": "radiant white and gold", "dark": "dark purple and black",
}

def _to_en(kr, mapping):
    return mapping.get(kr, kr)

def build_prompt(species_kr, element_kr, stage_kr, seed):
    wf = json.load(open(WF, encoding="utf-8"))
    wf.pop("_comment", None)
    sp_key = _to_en(species_kr, SPECIES_MAP)
    el_key = _to_en(element_kr, ELEMENT_MAP)
    st_en = STAGE_EN.get(stage_kr, stage_kr)
    sp_noun = SPECIES_NOUN.get(sp_key, sp_key)
    el_theme = ELEMENT_THEME.get(el_key, el_key)
    pos = (f"cute {st_en} {sp_noun} monster, Digimon style digital creature, "
           f"{el_theme} color theme and motifs, chubby round body, big expressive eyes, "
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
