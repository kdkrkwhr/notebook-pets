#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""엔진 신규 로직 self-check. 실행: python -X utf8 tests/test_engine.py
프레임워크 없음 — assert 로 깨지면 실패. 순수 함수 위주 + snack rare_feed 통합 1건."""
import io, json, os, sys, contextlib, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "engine"))
import engine  # noqa: E402


def base_state(**over):
    st = {
        "version": 2, "user_id": "test", "name": "테스트몬", "species": "mammal",
        "element": "fire", "stage": 1, "level": 1, "xp": 0, "stats": {},
        "intimacy": 50, "satiety": 80, "record": {"win": 0, "lose": 0},
        "cooldowns": {}, "daily": {"date": engine.today(), "train": 0, "battle": 0,
                                    "snack": 0, "walk": 0, "attendance": 0, "sleep_buff": False},
        "inventory": {"normal_feed": 3, "rare_feed": 0}, "evolution_branch": None,
        "history": [], "_wild": None,
    }
    st.update(over)
    return st


def run_cmd(fn):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        fn()
    return json.loads(buf.getvalue())


def test_catch_bonus_fairy():
    wild = {"element_key": "water", "level": 5}  # 상성 무관 속성으로 고정
    # 같은 종족 기준으로 catch_bonus 순효과만 검증(성장치 교란 배제)
    with_bonus = engine.catch_rate(base_state(species="fairy", element="fire"), wild)
    engine.G["species"]["fairy"]["catch_bonus"] = 0.0
    try:
        without = engine.catch_rate(base_state(species="fairy", element="fire"), wild)
    finally:
        engine.G["species"]["fairy"]["catch_bonus"] = 0.15
    assert abs(with_bonus - without - 0.15) < 1e-9, "요정족 포획 보너스는 +0.15"


def test_catch_rate_cap():
    wild = {"element_key": "nature", "level": 5}  # fire→nature 상성 우위
    fairy = base_state(species="fairy", element="fire")
    assert engine.catch_rate(fairy, wild) <= 0.9, "포획률 상한 0.9"


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


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")
