#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""방치 시스템 — 하루 1회 실행, 포만감 감소 + 상태 정리. cron에서 호출됨."""
import json, os, time
from datetime import date

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_DIR = os.path.join(BASE, "state")

def main():
    today = date.today().isoformat()
    changed = []
    for fn in os.listdir(STATE_DIR):
        if not fn.endswith(".json"): continue
        p = os.path.join(STATE_DIR, fn)
        try:
            with open(p, encoding="utf-8") as f:
                st = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        if st.get("daily", {}).get("date") == today:
            continue  # 오늘 이미 활동함 — 감소 스킵
        # 포만감 -15 (식물족은 광합성으로 -7)
        drop = 7 if st.get("species") == "plant" else 15
        st["satiety"] = max(0, st["satiety"] - drop)
        # 친밀도 소폭 감소 (배고프면 더)
        int_drop = 3 if st["satiety"] < 30 else 1
        st["intimacy"] = max(0, st["intimacy"] - int_drop)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(st, f, ensure_ascii=False, indent=2)
        changed.append({"user": st["user_id"], "name": st["name"], "satiety": st["satiety"], "intimacy": st["intimacy"]})
    print(json.dumps({"ok": True, "date": today, "affected": changed}, ensure_ascii=False))

if __name__ == "__main__":
    main()
