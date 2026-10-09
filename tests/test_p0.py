"""Run: python -B -X utf8 -m unittest discover -s tests -p test_p0.py -v"""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
sys.path.insert(0, str(ROOT / "tools"))
import engine
import runtime
import daily_decay
from test_engine import base_state


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.state = self.root / "state"
        self.state.mkdir()
        self.access = self.root / "data" / "access.json"
        self.access.parent.mkdir()
        for target, value in (("STATE_DIR", str(self.state)), ("ACCESS", str(self.access)),
                              ("ADMIN_IDS", {"999"})):
            p = patch.object(engine, target, value)
            p.start()
            self.addCleanup(p.stop)
        p = patch.dict(os.environ, {"NOTEBOOK_DATA_DIR": str(self.root),
                                   "NOTEBOOK_ADMIN_IDS": "999", "PYTHONDONTWRITEBYTECODE": "1"})
        p.start()
        self.addCleanup(p.stop)
        os.environ.pop("NOTEBOOK_ACTOR_ID", None)

    def seed(self, **changes):
        st = base_state(**changes)
        engine.save_state(st)
        return st

    def parallel(self, commands):
        children = [subprocess.Popen([sys.executable, "-B", "-X", "utf8", *args],
                    cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    text=True, encoding="utf-8") for args in commands]
        results = []
        try:
            for child in children:
                stdout, stderr = child.communicate(timeout=30)
                self.assertEqual(child.returncode, 0, stderr)
                self.assertEqual(stderr, "")
                results.append(json.loads(stdout))
        finally:
            for child in children:
                if child.poll() is None:
                    child.kill()
                    child.communicate()
        return results

    def test_xp_accumulates_and_crosses_every_evolution_boundary(self):
        st = base_state()
        engine.add_xp(st, 250)
        self.assertEqual((st["level"], st["xp"]), (3, 50))
        for level, amount, stage in ((9, 100, 2), (29, 100, 3), (49, 200, 4)):
            for intimacy, branch in ((69, "dark"), (70, "light")):
                with self.subTest(level=level, intimacy=intimacy):
                    st = base_state(level=level, stage=stage - 1, intimacy=intimacy, xp=amount - 1)
                    result = engine.add_xp(st, 1)
                    self.assertEqual((st["level"], st["stage"], st["xp"]), (level + 1, stage, 0))
                    self.assertEqual(len(result["evolutions"]), 1)
                    if stage == 4:
                        self.assertEqual(st["evolution_branch"], branch)

    def test_max_level_caps_and_does_not_bank_xp(self):
        st = base_state(level=99, stage=4, xp=799)
        engine.add_xp(st, 5000)
        self.assertEqual((st["level"], st["xp"]), (100, 0))
        self.assertEqual(engine.add_xp(st, 50)["gained"], 0)

    def test_sleep_only_next_day_and_repeat_sleep_preserves_current_bonus(self):
        self.seed(satiety=0)
        with patch.object(engine, "today", return_value="2026-10-05"):
            r = engine.execute("123", "sleep")
            self.assertEqual(r["xp_result"]["gained"], 0)
            self.assertEqual(engine.execute("123", "attendance")["xp_result"]["gained"], 50)
            self.assertFalse(engine.execute("123", "sleep")["ok"])
        with patch.object(engine, "today", return_value="2026-10-06"):
            self.assertTrue(engine.execute("123", "sleep")["ok"])
            self.assertEqual(engine.execute("123", "attendance")["xp_result"]["gained"], 60)
        with patch.object(engine, "today", return_value="2026-10-07"):
            self.assertEqual(engine.execute("123", "attendance")["xp_result"]["gained"], 60)
        with patch.object(engine, "today", return_value="2026-10-08"):
            self.assertEqual(engine.execute("123", "attendance")["xp_result"]["gained"], 50)
            self.assertEqual(engine.load_state("123")["sleep_bonus_dates"], [])

    def test_v2_migration_preserves_progress_and_expires_undated_sleep_flag(self):
        st = base_state(version=2, xp=19, level=7)
        st["daily"]["sleep_buff"] = True
        st.pop("sleep_bonus_dates")
        st.pop("last_decay_date")
        path = self.state / "123.json"
        path.write_text(json.dumps(st), encoding="utf-8")
        self.assertTrue(engine.execute("123", "attendance")["ok"])
        saved = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual((saved["version"], saved["level"], saved["xp"]), (4, 7, 69))
        self.assertEqual(saved["inventory"]["normal_feed"], st["inventory"]["normal_feed"] + 3)
        self.assertEqual(saved["inventory"]["rare_feed"], st["inventory"]["rare_feed"])
        self.assertEqual(saved["history"], st["history"])
        self.assertNotIn("sleep_buff", saved["daily"])

    def test_kst_midnight_and_transaction_clock(self):
        with patch.object(runtime, "datetime") as clock:
            clock.now.side_effect = lambda tz: datetime(2026, 10, 5, 15, tzinfo=timezone.utc).astimezone(tz)
            self.assertEqual(str(runtime.game_date()), "2026-10-06")
            with runtime.game_clock():
                clock.now.side_effect = AssertionError("Transaction reread wall clock")
                self.assertEqual(str(runtime.game_date()), "2026-10-06")

    def test_decay_once_per_day_with_plant_and_active_exceptions(self):
        for uid, species, active in (("123", "mammal", False), ("124", "plant", False), ("125", "mammal", True)):
            st = self.seed(user_id=uid, species=species, satiety=40)
            if not active:
                st["daily"]["date"] = "2020-01-01"
                engine.save_state(st)
        self.assertEqual(len(daily_decay.run_decay()["affected"]), 2)
        self.assertEqual(daily_decay.run_decay()["affected"], [])
        self.assertEqual((engine.load_state("123")["satiety"], engine.load_state("123")["intimacy"]), (25, 47))
        self.assertEqual((engine.load_state("124")["satiety"], engine.load_state("124")["intimacy"]), (33, 49))
        self.assertEqual(engine.load_state("125")["satiety"], 40)

    def test_decay_reports_corrupt_save_and_continues(self):
        st = self.seed()
        st["daily"]["date"] = "2020-01-01"
        engine.save_state(st)
        (self.state / "124.json").write_text("null", encoding="utf-8")
        result = daily_decay.run_decay()
        self.assertFalse(result["ok"])
        self.assertEqual(len(result["affected"]), 1)
        self.assertEqual(result["errors"], [{"user": "124", "code": "invalid_state"}])

    def test_invalid_ids_and_admin_targets_cannot_escape_state_directory(self):
        for uid in ("../123", "..\\123", "C:\\save", "１２３", "0", "0123", "123/4", "1" * 21, " 123", "-1"):
            with self.subTest(uid=uid):
                self.assertEqual(engine.execute(uid, "start")["code"], "invalid_user_id")
                self.assertEqual(engine.execute("999", "reset", [uid])["code"], "invalid_user_id")
                self.assertEqual(engine.execute("999", "owner", [uid])["code"], "invalid_user_id")
        self.assertEqual(list(self.state.iterdir()), [])
        self.assertFalse(self.access.exists())

    def test_access_missing_open_but_invalid_settings_fail_closed(self):
        self.assertTrue(engine.execute("123", "start")["ok"])
        for raw in ("null", "[]", "{}", "{", '{"owner_id":123,"owner_name":"x"}',
                    '{"owner_id":"../1","owner_name":"x"}'):
            with self.subTest(raw=raw):
                self.access.write_text(raw, encoding="utf-8")
                self.assertFalse(engine.execute("123", "attendance")["ok"])
                self.assertFalse(engine.execute(None, "rank")["ok"])
                self.assertEqual(self.access.read_text(encoding="utf-8"), raw)
        self.assertFalse(engine.execute("123", "clearowner")["ok"])
        self.assertTrue(engine.execute("999", "clearowner")["ok"])
        self.assertTrue(engine.execute("123", "attendance")["ok"])

    def test_unreadable_access_fails_closed(self):
        with patch.object(runtime, "open", side_effect=PermissionError("denied"), create=True):
            with self.assertRaises(runtime.GameError) as caught:
                engine.load_access()
        self.assertEqual(caught.exception.code, "storage_error")

    def test_actor_binding_and_private_ranking(self):
        self.seed()
        with patch.dict(os.environ, {"NOTEBOOK_ACTOR_ID": "123"}):
            self.assertEqual(engine.execute("999", "owner", ["123"])["code"], "actor_mismatch")
            self.assertEqual(engine.execute("124", "status")["code"], "actor_mismatch")
            self.assertTrue(engine.execute("123", "status")["ok"])
        self.assertTrue(engine.execute("999", "owner", ["123", "Buddy"])["ok"])
        self.assertFalse(engine.execute(None, "rank")["ok"])
        self.assertTrue(engine.execute("123", "rank")["ok"])

    def test_atomic_write_and_reset_failure_preserve_existing_save(self):
        self.seed()
        path = self.state / "123.json"
        before = path.read_bytes()
        with patch.object(runtime.os, "replace", side_effect=OSError("disk failure")):
            self.assertEqual(engine.execute("123", "attendance")["code"], "storage_error")
            self.assertEqual(engine.execute("999", "reset", ["123", "New Buddy"])["code"], "storage_error")
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(list(self.state.glob("*.tmp")), [])
        self.assertTrue(engine.execute("123", "attendance")["ok"])

    def test_invalid_save_is_not_overwritten_even_under_python_optimization(self):
        path = self.state / "123.json"
        for value in (None, {}, base_state(xp=-1), base_state(cooldowns={"feed": float("nan")}), base_state(history=[1])):
            raw = json.dumps(value)
            path.write_text(raw, encoding="utf-8")
            self.assertEqual(engine.execute("123", "start")["code"], "invalid_state")
            self.assertEqual(path.read_text(encoding="utf-8"), raw)
        r = self.parallel([["-O", "engine/engine.py", "123", "status"]])[0]
        self.assertEqual(r["code"], "invalid_state")

    def test_concurrent_start_creates_exactly_one_pet(self):
        results = self.parallel([["engine/engine.py", "123", "start", f"Buddy{i}"] for i in range(10)])
        self.assertEqual(sum(r["ok"] for r in results), 1)
        self.assertEqual(len(engine.load_state("123")["history"]), 1)

    def test_concurrent_snacks_enforce_limit_and_keep_all_rewards(self):
        self.seed()
        results = self.parallel([["engine/engine.py", "123", "snack"] for _ in range(12)])
        self.assertEqual(sum(r["ok"] for r in results), 3)
        st = engine.load_state("123")
        self.assertEqual((st["daily"]["snack"], st["xp"], st["intimacy"]), (3, 15, 95))

    def test_concurrent_attendance_and_feed_enforce_daily_limit_and_cooldown(self):
        self.seed()
        for command, xp in (("attendance", 50), ("feed", 60)):
            results = self.parallel([["engine/engine.py", "123", command] for _ in range(8)])
            self.assertEqual(sum(r["ok"] for r in results), 1)
            self.assertEqual(engine.load_state("123")["xp"], xp)
        self.assertEqual(engine.load_state("123")["inventory"]["normal_feed"], 5)

    def test_concurrent_decay_is_idempotent(self):
        st = self.seed(satiety=80)
        st["daily"]["date"] = "2020-01-01"
        engine.save_state(st)
        results = self.parallel([["tools/daily_decay.py"] for _ in range(8)])
        self.assertEqual(sum(len(r["affected"]) for r in results), 1)
        self.assertEqual(engine.load_state("123")["satiety"], 65)

    def test_command_and_decay_do_not_lose_each_others_updates(self):
        st = self.seed(satiety=50)
        st["daily"]["date"] = "2020-01-01"
        engine.save_state(st)
        results = self.parallel([["tools/daily_decay.py"], ["engine/engine.py", "123", "feed"]])
        self.assertTrue(all(r["ok"] for r in results))
        st = engine.load_state("123")
        self.assertEqual((st["xp"], st["inventory"]["normal_feed"]), (10, 2))
        self.assertIn(st["satiety"], (65, 80))
        self.assertEqual(st["last_decay_date"], engine.today())

    def test_os_lock_times_out_then_recovers_after_process_termination(self):
        code = "import sys; sys.path.insert(0, 'engine'); from runtime import store_lock; import time; "
        code += "\nwith store_lock(sys.argv[1]):\n print('locked', flush=True)\n time.sleep(30)\n"
        child = subprocess.Popen([sys.executable, "-B", "-c", code, str(self.state)], cwd=ROOT,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            self.assertEqual(child.stdout.readline().strip(), "locked")
            with self.assertRaises(runtime.GameError) as caught:
                with runtime.store_lock(self.state, timeout=0.05):
                    self.fail("Acquired an already-held lock")
            self.assertEqual(caught.exception.code, "busy")
        finally:
            child.kill()
            child.communicate(timeout=5)
        with runtime.store_lock(self.state, timeout=1):
            pass

    def test_english_and_korean_cli_aliases_return_single_json(self):
        self.seed()
        results = self.parallel([["engine/engine.py", "status", "123"],
                                 ["engine/engine.py", "123", "상태"]])
        self.assertTrue(all(r["ok"] for r in results))
        self.assertEqual(results[0], results[1])


if __name__ == "__main__":
    unittest.main()
