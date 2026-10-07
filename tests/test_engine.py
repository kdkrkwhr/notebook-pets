#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""엔진 신규 로직 self-check. 실행: python -X utf8 tests/test_engine.py
프레임워크 없음 — assert 로 깨지면 실패. 순수 함수 위주 + snack rare_feed 통합 1건."""
import io, json, os, sys, contextlib, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "engine"))
import engine  # noqa: E402


def base_state(**over):
    st = {
        "version": 3, "user_id": "123", "name": "테스트몬", "species": "mammal",
        "element": "fire", "stage": 1, "level": 1, "xp": 0, "stats": {},
        "intimacy": 50, "satiety": 80, "record": {"win": 0, "lose": 0},
        "cooldowns": {}, "daily": {"date": engine.today(), "train": 0, "battle": 0,
                                    "snack": 0, "walk": 0, "attendance": 0, "sleep_buff": False},
        "inventory": {"normal_feed": 3, "rare_feed": 0}, "evolution_branch": None,
        "history": [], "_wild": None, "sleep_bonus_dates": [], "last_decay_date": None,
    }
    st.update(over)
    return st


def run_cmd(fn):
    try:
        return fn()
    except engine.GameError as exc:
        return {"ok": False, "code": exc.code}


def test_berserk_only_low_intimacy_monster():
    assert engine.berserk(base_state(species="monster", intimacy=30)) is True
    assert engine.berserk(base_state(species="monster", intimacy=60)) is False
    assert engine.berserk(base_state(species="dragon", intimacy=10)) is False  # 괴수족만


def test_titles_progression():
    assert engine.titles(base_state())[0] if engine.titles(base_state()) else True  # 무전적이어도 에러 없음
    veteran = base_state(record={"win": 12, "lose": 0})
    assert "백전노장" in engine.titles(veteran)
    legend = base_state(record={"win": 50, "lose": 0})
    assert "전설의 조련사" in engine.titles(legend)
    maxed = base_state(level=100, stage=4, evolution_branch="light", record={"win": 60, "lose": 0})
    ts = engine.titles(maxed)
    assert "완전체 마스터" in ts and "빛의 성체" in ts


def test_snack_consumes_rare_feed_and_boosts_xp():
    tmp = tempfile.mkdtemp()
    orig = engine.STATE_DIR
    engine.STATE_DIR = tmp
    try:
        # rare_feed 있을 때: 소비 + XP 부스트
        st = base_state(inventory={"normal_feed": 3, "rare_feed": 1})
        engine.save_state(st)
        r = run_cmd(lambda: engine.cmd_care(st, "snack"))
        assert r["used_rare_feed"] is True
        assert st["inventory"]["rare_feed"] == 0, "맛있는 사료가 소비돼야 함"
        boosted = r["xp_result"]["gained"]
        # rare_feed 없을 때: 미소비 + 기본 XP
        st2 = base_state(daily={"date": engine.today(), "train": 0, "battle": 0,
                                "snack": 0, "walk": 0, "attendance": 0, "sleep_buff": False},
                         inventory={"normal_feed": 3, "rare_feed": 0})
        engine.save_state(st2)
        r2 = run_cmd(lambda: engine.cmd_care(st2, "snack"))
        assert r2["used_rare_feed"] is False
        assert boosted > r2["xp_result"]["gained"], "맛있는 사료가 XP를 더 줘야 함"
    finally:
        engine.STATE_DIR = orig


def test_owner_gate_open_when_unset():
    tmp = tempfile.mkdtemp()
    orig = engine.ACCESS
    engine.ACCESS = os.path.join(tmp, "access.json")
    try:
        assert engine.access_check("999") == (True, "")  # 미등록 → 전체 개방
    finally:
        engine.ACCESS = orig


def test_owner_gate_restricts_when_set():
    tmp = tempfile.mkdtemp()
    orig_a, orig_admin = engine.ACCESS, engine.ADMIN_IDS
    engine.ACCESS = os.path.join(tmp, "access.json")
    engine.ADMIN_IDS = {"362"}
    try:
        engine.save_access({"owner_id": "279", "owner_name": "박형민"})
        assert engine.access_check("279") == (True, "박형민")   # 소유주 본인
        assert engine.access_check("362") == (True, "박형민")   # 관리자 우회
        allowed, name = engine.access_check("999")              # 남 → 거절
        assert allowed is False and name == "박형민"
    finally:
        engine.ACCESS, engine.ADMIN_IDS = orig_a, orig_admin


def test_set_owner_admin_only_and_persists():
    tmp = tempfile.mkdtemp()
    orig_a, orig_admin = engine.ACCESS, engine.ADMIN_IDS
    engine.ACCESS = os.path.join(tmp, "access.json")
    engine.ADMIN_IDS = {"362"}
    try:
        assert run_cmd(lambda: engine.cmd_set_owner("999", "279", "박형민"))["ok"] is False  # 비관리자 거절
        r = run_cmd(lambda: engine.cmd_set_owner("362", "279", "박형민"))                    # 관리자 OK
        assert r["ok"] is True and engine.load_access()["owner_id"] == "279"
        assert run_cmd(lambda: engine.cmd_set_owner("362", "박형민", ""))["ok"] is False      # 비숫자 ID 거절
        assert run_cmd(lambda: engine.cmd_clear_owner("362"))["ok"] is True                   # 해제
        assert engine.load_access()["owner_id"] == ""
    finally:
        engine.ACCESS, engine.ADMIN_IDS = orig_a, orig_admin


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")
