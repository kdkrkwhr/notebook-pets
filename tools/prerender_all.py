#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""종족×속성×단계 전 조합 이미지 프리렌더 배치 스크립트.
사용: python tools/prerender_all.py [--stage 1|all] [--only species,element]
ComfyUI(:8188) 필요. CPU 모드에서 1장 약 5~13분.
"""
import json, os, subprocess, sys, time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data", "game_data.json")
OUT_DIR = os.path.join(BASE, "assets", "samples")
LOG = os.path.join(BASE, "assets", "prerender_log.json")

d = json.load(open(DATA, encoding="utf-8"))
species_list = list(d["species"].keys())
element_list = list(d["elements"].keys())
stages = d["stages"]  # [{label: 새싹기...}, ...]

def existing():
    return set(os.listdir(OUT_DIR)) if os.path.isdir(OUT_DIR) else set()

def targets(stage_mode="1", only=None):
    """stage_mode: '1'=새싹기만(72장), '4'=진화 트리 4단계 전부, 'all'=모든 단계 조합"""
    out = []
    if stage_mode == "1":
        stage_list = [stages[0]]
    elif stage_mode == "4":
        stage_list = [stages[0], stages[1], stages[2], stages[-1]]  # 진화 경로만 (성숙기→완전체)
    else:
        stage_list = stages
    for sp in species_list:
        for el in element_list:
            if only and f"{sp}_{el}" not in only:
                continue
            for i, stg in enumerate(stage_list, start=1):
                n = i if stage_mode != "4" else {0: 1, 1: 2, 2: 3}.get(stage_list.index(stg), 4)
                out.append((sp, el, stg["label"], n))
    return out

def main():
    args = sys.argv[1:]
    stage_mode = "1"
    only = None
    if "--stage" in args:
        stage_mode = args[args.index("--stage") + 1]
    if "--only" in args:
        only = args[args.index("--only") + 1]

    todo = targets(stage_mode, only)
    done = existing()
    jobs = [(sp, el, label, n) for sp, el, label, n in todo
            if f"{sp}_{el}_stage{n}.png" not in done and f"{sp}_{el}_lv{n}.png" not in done]

    print(json.dumps({"total_target": len(todo), "already_done": len(todo) - len(jobs),
                      "to_generate": len(jobs)}, ensure_ascii=False))

    log = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else {"done": [], "failed": []}
    for sp, el, label, n in jobs:
        fname = f"{sp}_{el}_stage{n}.png"
        seed = abs(hash(f"{sp}_{el}_{n}")) % (2**31)  # 조합별 고정 시드 → 재현 가능
        cmd = [sys.executable, "-X", "utf8", os.path.join(BASE, "tools", "gen_image.py"),
               d["species"][sp]["name_kr"], d["elements"][el]["name_kr"], label,
               f"samples/{fname}", str(seed)]
        print(f"[render] {fname}", flush=True)
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=2400)
        if '"ok": true' in (r.stdout or ""):
            log["done"].append(fname)
            print(f"  OK ({len(log['done'])}/{len(todo)})", flush=True)
        else:
            log["failed"].append({"file": fname, "err": (r.stderr or r.stdout)[-200:]})
            print(f"  FAIL: {(r.stderr or '')[:100]}", flush=True)
        with open(LOG, "w", encoding="utf-8") as f:
            json.dump(log, f, ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
