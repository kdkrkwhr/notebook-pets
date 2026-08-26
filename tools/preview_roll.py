#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""1-4 단계: 종족×속성 랜덤 미리보기 (실제 생성과 동일한 데이터 소스)
사용: python tools/preview_roll.py
출력: {"ok":true, "species":"monster", "species_kr":"괴수족", "element":"dark", ...}
"""
import json, os, random, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(BASE, "data", "game_data.json"), encoding="utf-8"))

seed = sys.argv[1] if len(sys.argv) > 1 else None
if seed:
    random.seed(seed)

sp = random.choice(list(d["species"].keys()))
el = random.choice(list(d["elements"].keys()))
print(json.dumps({
    "ok": True,
    "species": sp, "species_kr": d["species"][sp]["name_kr"], "species_emoji": d["species"][sp]["emoji"],
    "element": el, "element_kr": d["elements"][el]["name_kr"], "element_emoji": d["elements"][el]["emoji"],
    "trait": d["species"][sp].get("trait", "")
}, ensure_ascii=False))
