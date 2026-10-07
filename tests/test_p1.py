"""Regression checks for event replay, care, training and combat."""
import json
import os
import unittest
from unittest.mock import patch
import test_p0
from test_engine import base_state
import engine
import runtime
import adapter


def wild(species="mammal", level=10):
    return {"species_key": species, "element_key": "fire", "level": level,
            "species": engine.G["species"][species]["name_kr"], "element": "불"}


class GameTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed
    parallel = test_p0.RuntimeTests.parallel

    def test_play_scales_only_gain_for_all_species_and_caps(self):
        for species, rule in engine.G["species"].items():
            for intimacy in (0, 50, 90, 100):
                with self.subTest(species=species, intimacy=intimacy):
                    self.seed(species=species, intimacy=intimacy)
                    self.assertTrue(engine.execute("123", "play")["ok"])
                    expected = min(100, intimacy + round(20 * rule["intimacy_rate"]))
                    self.assertEqual(engine.load_state("123")["intimacy"], expected)

    def test_training_bonus_persists_and_survives_level_up(self):
        self.seed(xp=90)
        with patch.object(engine.random, "choice", return_value="atk"):
            result = engine.execute("123", "train")
        st = engine.load_state("123")
        self.assertEqual((st["level"], st["xp"], st["training_bonus"]), (2, 30, {"atk": 1}))
        self.assertEqual(result["stat_gain"], 1)
        self.assertEqual(engine.execute("123", "status")["stats"], result["stats_after"])
        no_training = base_state(level=2)
        self.assertEqual(result["stats_after"]["atk"], engine.stat_total(no_training)["atk"] + 1)

    def test_training_refusal_has_no_stat_or_xp_side_effect(self):
        st = self.seed(satiety=19)
        self.assertFalse(engine.execute("123", "train")["ok"])
        self.assertEqual(engine.load_state("123"), st)
        st = self.seed()
        st["daily"]["train"] = 3
        engine.save_state(st)
        self.assertFalse(engine.execute("123", "train")["ok"])
        self.assertEqual(engine.load_state("123"), st)

    def test_legacy_stats_are_not_interpreted_as_training_bonus(self):
        st = self.seed(stats={"hp": 45, "atk": 38, "def": 30})
        self.assertEqual(engine.stat_total(st), engine.stat_total(base_state()))
        with patch.object(engine.random, "choice", return_value="hp"):
            self.assertTrue(engine.execute("123", "train")["ok"])
        saved = engine.load_state("123")
        self.assertEqual(saved["stats"], st["stats"])
        self.assertEqual(saved["training_bonus"], {"hp": 1})

    def test_invalid_bonus_or_receipt_preserves_original(self):
        for changes in ({"training_bonus": {"atk": -1}}, {"training_bonus": {"speed": 1}},
                        {"processed_requests": {"x": None}}):
            st = base_state(**changes)
            path = self.state / "123.json"
            raw = json.dumps(st)
            path.write_text(raw, encoding="utf-8")
            self.assertEqual(engine.execute("123", "train")["code"], "invalid_state")
            self.assertEqual(path.read_text(encoding="utf-8"), raw)

    def test_same_message_replays_original_response_after_day_rollover(self):
        self.seed()
        with patch.object(engine, "today", return_value="2026-10-05"):
            first = engine.execute("123", "snack", request_id="discord:100")
        before = (self.state / "123.json").read_bytes()
        with patch.object(engine, "today", return_value="2026-10-06"):
            again = engine.execute("123", "간식줘", request_id="discord:100")
        self.assertEqual(first, again)
        self.assertEqual((self.state / "123.json").read_bytes(), before)

    def test_different_event_applies_and_same_event_different_payload_is_rejected(self):
        self.seed()
        self.assertTrue(engine.execute("123", "snack", request_id="m1")["ok"])
        self.assertEqual(engine.execute("123", "train", request_id="m1")["code"], "request_conflict")
        self.assertTrue(engine.execute("123", "snack", request_id="m2")["ok"])
        self.assertEqual(engine.load_state("123")["xp"], 10)

    def test_event_is_scoped_to_user_and_permissions_checked_before_replay(self):
        self.seed()
        self.seed(user_id="124")
        for uid in ("123", "124"):
            self.assertTrue(engine.execute(uid, "snack", request_id="m1")["ok"])
            self.assertEqual(engine.load_state(uid)["xp"], 5)
        engine.execute("999", "owner", ["124"])
        self.assertFalse(engine.execute("123", "snack", request_id="m1")["ok"])

    def test_failed_commit_leaves_no_reward_or_receipt_and_retry_applies_once(self):
        self.seed()
        before = (self.state / "123.json").read_bytes()
        with patch.object(runtime.os, "replace", side_effect=OSError("disk full")):
            self.assertEqual(engine.execute("123", "snack", request_id="m1")["code"], "storage_error")
        self.assertEqual((self.state / "123.json").read_bytes(), before)
        first = engine.execute("123", "snack", request_id="m1")
        self.assertEqual(first, engine.execute("123", "snack", request_id="m1"))
        self.assertEqual(engine.load_state("123")["xp"], 5)

    def test_pending_save_is_cleared_after_exception(self):
        self.seed()
        with patch.object(engine, "cmd_care", side_effect=ValueError("bad rule")):
            self.assertFalse(engine.execute("123", "snack", request_id="m1")["ok"])
        self.assertTrue(engine.execute("123", "snack")["ok"])
        self.assertEqual(engine.load_state("123")["xp"], 5)

    def test_lost_reply_after_commit_replays_receipt(self):
        self.seed()
        replace = runtime.os.replace
        def commit_then_disconnect(source, destination):
            replace(source, destination)
            raise OSError("Connection lost after commit")
        with patch.object(runtime.os, "replace", side_effect=commit_then_disconnect):
            self.assertFalse(engine.execute("123", "snack", request_id="m1")["ok"])
        reply = engine.execute("123", "snack", request_id="m1")
        self.assertTrue(reply["ok"])
        self.assertEqual(engine.load_state("123")["xp"], 5)
        self.assertEqual(engine.load_state("123")["daily"]["snack"], 1)

    def test_process_restart_and_concurrent_retries_apply_once(self):
        self.seed()
        with patch.dict(os.environ, {"NOTEBOOK_EVENT_ID": "discord:100"}):
            results = self.parallel([["engine/engine.py", "123", "snack"] for _ in range(12)])
            later = self.parallel([["engine/engine.py", "123", "snack"]])[0]
        self.assertTrue(all(r == later for r in results))
        self.assertEqual(engine.load_state("123")["xp"], 5)
        self.assertEqual(engine.load_state("123")["daily"]["snack"], 1)

    def test_start_response_replays_without_reroll(self):
        first = engine.execute("123", "start", ["Buddy"], request_id="m1")
        before = (self.state / "123.json").read_bytes()
        with patch.object(engine.random, "choice", side_effect=AssertionError("Rerolled")):
            self.assertEqual(engine.execute("123", "start", ["Buddy"], request_id="m1"), first)
        self.assertEqual((self.state / "123.json").read_bytes(), before)
        self.assertEqual(engine.execute("123", "start", ["Other"], request_id="m1")["code"], "request_conflict")

    def test_battle_and_flee_replay_do_not_consume_new_encounters(self):
        for command in ("battle", "flee"):
            with self.subTest(command=command):
                self.seed(_wild=wild())
                first = engine.execute("123", command, request_id="m1")
                self.assertTrue(first["ok"])
                st = engine.load_state("123")
                st["_wild"] = wild("bird")
                engine.save_state(st)
                before = (self.state / "123.json").read_bytes()
                self.assertEqual(engine.execute("123", command, request_id="m1"), first)
                self.assertEqual((self.state / "123.json").read_bytes(), before)

    def test_event_adapter_binds_sender_and_excludes_admin_tools(self):
        tool = adapter.bind_discord_event(123, 100)
        first = tool("start", ["Buddy"])
        self.assertTrue(first["ok"])
        self.assertEqual(tool("공책시작", ["Buddy"]), first)
        self.assertFalse(tool("owner", ["124"])["ok"])
        self.assertFalse(adapter.bind_discord_event(999, 101)("reset", ["123"])["ok"])
        self.assertEqual(tool("start", ["Different"])["code"], "request_conflict")
        with self.assertRaises(runtime.GameError):
            adapter.bind_discord_event("../123", 100)
        with patch.dict(os.environ, {"NOTEBOOK_EVENT_ID": "discord:101"}):
            self.assertEqual(tool("status")["code"], "request_mismatch")

    def test_bad_request_id_and_admin_event_rejected(self):
        for key in ("", "../1", "x" * 129, 123):
            self.assertEqual(engine.execute("123", "start", request_id=key)["code"], "invalid_request_id")
        self.assertEqual(engine.execute("999", "reset", ["123"], request_id="m1")["code"], "unsupported_request_id")

    def damage(self, st, enemy, rolls=(0.99, 0.99)):
        with patch.object(engine.random, "uniform", return_value=1), patch.object(engine.random, "random", side_effect=rolls):
            return engine.battle_damage(st, enemy)

    def test_own_defense_only_reduces_incoming_damage(self):
        st = base_state(level=10)
        original = self.damage(st, wild())
        st["training_bonus"] = {"def": 5}
        fortified = self.damage(st, wild())
        self.assertEqual(original[0], fortified[0])
        self.assertLess(fortified[1], original[1])

    def test_enemy_species_defense_reduces_outgoing_damage(self):
        st = base_state(level=10)
        self.assertLess(self.damage(st, wild("machine"))[0], self.damage(st, wild("bird"))[0])

    def test_dodge_belongs_to_each_defender_and_both_can_dodge(self):
        bird = base_state(species="bird", level=10)
        damage = self.damage(bird, wild("mammal"), rolls=(0.075, 0.075))
        self.assertEqual(damage[2:], (False, True))
        damage = self.damage(base_state(level=10), wild("ghost"), rolls=(0.075, 0.075))
        self.assertEqual(damage[2:], (True, False))
        self.assertEqual(self.damage(bird, wild("ghost"), rolls=(0.01, 0.01)), (0, 0, True, True))

    def test_damage_never_negative_and_training_attack_has_effect(self):
        st = base_state(level=1, training_bonus={"def": 10000})
        damage = self.damage(st, wild("machine", level=100))
        self.assertEqual(damage[:2], (0, 0))
        st = base_state(level=10)
        original = self.damage(st, wild())[0]
        st["training_bonus"] = {"atk": 5}
        self.assertGreater(self.damage(st, wild())[0], original)

    def test_type_advantage_and_berserk_still_affect_attack(self):
        st = base_state(level=10, species="monster", intimacy=50)
        enemy = wild()
        normal = self.damage(st, enemy)[0]
        st["intimacy"] = 20
        self.assertGreater(self.damage(st, enemy)[0], normal)
        enemy["element_key"] = "nature"
        self.assertGreater(self.damage(st, enemy)[0], normal)

    def test_loot_reports_new_rewards_not_total_inventory(self):
        self.seed(level=100, stage=4, _wild=wild(level=1), inventory={"normal_feed": 3, "rare_feed": 7})
        with patch.object(engine.random, "uniform", return_value=1), patch.object(engine.random, "random", return_value=0.99):
            result = engine.execute("123", "battle")
        self.assertTrue(result["won"])
        self.assertEqual(result["loot"], {"normal_feed": 0, "rare_feed": 0})
        self.assertEqual(engine.load_state("123")["inventory"]["rare_feed"], 7)


if __name__ == "__main__":
    unittest.main()
