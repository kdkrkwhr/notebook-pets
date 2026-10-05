#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""One inactivity penalty per KST date; safe to retry or overlap with commands."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "engine"))
import engine
from runtime import GameError, game_clock, store_lock, validate_user_id


def run_decay():
    changed, errors = [], []
    current = engine.today()
    try:
        with store_lock(engine.STATE_DIR), game_clock():
            current = engine.today()
            for filename in sorted(os.listdir(engine.STATE_DIR)):
                if not filename.endswith(".json"):
                    continue
                uid = filename[:-5]
                try:
                    validate_user_id(uid)
                    st = engine.load_state(uid)
                    if st is None:
                        continue
                    if st.get("last_decay_date") and st["last_decay_date"] >= current:
                        continue
                    active = st["daily"]["date"] >= current
                    if not active:
                        drop = 7 if st["species"] == "plant" else 15
                        st["satiety"] = max(0, st["satiety"] - drop)
                        st["intimacy"] = max(0, st["intimacy"] - (3 if st["satiety"] < 30 else 1))
                    # Mark even skipped active users. Do not replay missed days.
                    st["last_decay_date"] = current
                    engine.save_state(st)
                    if not active:
                        changed.append({"user": uid, "name": st["name"], "satiety": st["satiety"], "intimacy": st["intimacy"]})
                except GameError as exc:
                    errors.append({"user": uid, "code": exc.code})
        return {"ok": not errors, "date": current, "affected": changed, "errors": errors}
    except GameError as exc:
        return {"ok": False, "date": current, "affected": changed, "errors": errors, "code": exc.code, "msg": str(exc)}


def main():
    result = run_decay()
    print(json.dumps(result, ensure_ascii=False))
    return result


if __name__ == "__main__":
    sys.exit(0 if main()["ok"] else 1)
