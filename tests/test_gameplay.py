"""HP combat, encounter lifecycle, food recovery, and replay regressions."""
import unittest
from unittest.mock import patch
import test_p0
from test_engine import base_state
from test_p1 import wild
import engine


class GameplayTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed
    parallel = test_p0.RuntimeTests.parallel

    def test_hp_training_changes_draw_to_win(self):
        st = base_state(level=10)
        with patch.object(engine, "battle_damage", return_value=(9, 9, False, False)):
            before = engine.simulate_battle(st, wild())
            st["training_bonus"] = {"hp": 1}
            after = engine.simulate_battle(st, wild())
        self.assertEqual(before["outcome"], "draw")
        self.assertEqual(after["outcome"], "win")
        self.assertEqual((after["hp_me"], after["hp_enemy"], after["rounds"]), (1, 0, 2))

    def test_simultaneous_knockout_is_draw_and_has_no_winner_loot(self):
        self.seed(_wild=wild())
        with patch.object(engine, "battle_damage", return_value=(100, 100, False, False)):
            result = engine.execute("123", "battle", request_id="draw1")
        st = engine.load_state("123")
        self.assertEqual(result["outcome"], "draw")
        self.assertFalse(result["won"])
        self.assertEqual(result["loot"], {})
        self.assertEqual(st["record"], {"win": 0, "lose": 0, "draw": 1})
        self.assertEqual(st["xp"], engine.G["commands"]["battle"]["xp_draw"])
        self.assertIsNone(st["_wild"])
        self.assertEqual(engine.execute("123", "battle", request_id="draw1"), result)

    def test_stalemate_is_bounded(self):
        with patch.object(engine, "battle_damage", return_value=(0, 0, True, True)) as exchange:
            result = engine.simulate_battle(base_state(), wild())
        self.assertEqual(result["rounds"], 20)
        self.assertEqual(exchange.call_count, 20)
        self.assertEqual(result["outcome"], "draw")
        self.assertEqual(result["dodges_me"], 20)

    def test_round_cap_uses_remaining_hp_fraction(self):
        st = base_state(level=10, training_bonus={"hp": 18})  # 36 vs 18 HP
        with patch.dict(engine.G["commands"]["battle"], {"max_rounds": 1}), \
             patch.object(engine, "battle_damage", return_value=(9, 18, False, False)):
            result = engine.simulate_battle(st, wild())
        self.assertEqual(result["outcome"], "draw")  # both have 50% left

    def test_damage_is_capped_to_remaining_hp_and_battle_does_not_mutate_inputs(self):
        st, enemy = base_state(), wild()
        with patch.object(engine, "battle_damage", return_value=(1000, 1, False, False)):
            result = engine.simulate_battle(st, enemy)
        self.assertEqual(result["dmg_me"], result["max_hp_enemy"])
        self.assertEqual(result["hp_enemy"], 0)
        self.assertEqual(st, base_state())
        self.assertEqual(enemy, wild())

    def test_each_battle_starts_with_full_hp(self):
        self.seed(_wild=wild())
        with patch.object(engine, "battle_damage", return_value=(100, 2, False, False)):
            first = engine.execute("123", "battle")
            st = engine.load_state("123")
            st["_wild"] = wild()
            engine.save_state(st)
            second = engine.execute("123", "battle")
        self.assertEqual(second["hp_me"], second["max_hp_me"] - 2)
        self.assertEqual(first["hp_me"], first["max_hp_me"] - 2)

    def test_pending_encounter_blocks_walk_without_rewards_or_reroll(self):
        self.seed(_wild=wild())
        before = (self.state / "123.json").read_bytes()
        with patch.object(engine.random, "random", side_effect=AssertionError("Rerolled")):
            result = engine.execute("123", "walk", request_id="walk1")
        self.assertEqual(result["code"], "encounter_pending")
        self.assertEqual((self.state / "123.json").read_bytes(), before)
        self.assertEqual(engine.execute("123", "status")["encounter"], wild())

    def test_flee_has_no_rewards_and_retry_cannot_clear_new_encounter(self):
        self.seed(_wild=wild())
        first = engine.execute("123", "도망", request_id="flee1")
        st = engine.load_state("123")
        self.assertTrue(first["ok"])
        self.assertEqual(st["xp"], 0)
        self.assertIsNone(st["_wild"])
        st["_wild"] = wild("bird")
        engine.save_state(st)
        self.assertEqual(engine.execute("123", "flee", request_id="flee1"), first)
        self.assertEqual(engine.load_state("123")["_wild"], wild("bird"))

    def test_flee_without_encounter_does_not_write(self):
        self.seed()
        before = (self.state / "123.json").read_bytes()
        self.assertEqual(engine.execute("123", "flee")["code"], "no_encounter")
        self.assertEqual((self.state / "123.json").read_bytes(), before)

    def test_walk_exposes_encounter_and_caps_wild_level(self):
        self.seed(level=100, stage=4)
        with patch.object(engine.random, "random", return_value=0), patch.object(engine.random, "randint", return_value=3):
            result = engine.execute("123", "walk")
        self.assertTrue(result["encounter"])
        self.assertEqual(result["wild"]["level"], 100)
        self.assertEqual(engine.load_state("123")["_wild"], result["wild"])

    def test_zero_food_and_zero_satiety_can_recover_without_winning(self):
        self.seed(satiety=0, inventory={"normal_feed": 0, "rare_feed": 0})
        attendance = engine.execute("123", "attendance", request_id="a1")
        self.assertEqual(attendance["loot"], {"normal_feed": 3})
        self.assertEqual(engine.execute("123", "attendance", request_id="a1"), attendance)
        self.assertFalse(engine.execute("123", "attendance", request_id="a2")["ok"])
        self.assertTrue(engine.execute("123", "feed")["ok"])
        self.assertTrue(engine.execute("123", "train")["ok"])
        self.assertEqual(engine.load_state("123")["inventory"]["normal_feed"], 2)

    def test_concurrent_attendance_grants_one_food_supply(self):
        self.seed(inventory={"normal_feed": 0, "rare_feed": 0})
        results = self.parallel([["engine/engine.py", "123", "attendance"] for _ in range(8)])
        self.assertEqual(sum(r["ok"] for r in results), 1)
        self.assertEqual(engine.load_state("123")["inventory"]["normal_feed"], 3)


if __name__ == "__main__":
    unittest.main()
