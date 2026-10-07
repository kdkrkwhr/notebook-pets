"""The offline experiment must be repeatable and isolated from live saves."""
import copy
import unittest
from unittest.mock import patch
import test_p0  # installs the engine/tools import paths
import engine
import simulate_balance


class BalanceToolTests(unittest.TestCase):
    def test_one_visit_quest_is_sustainable_without_battle_rewards(self):
        for species in engine.G['species']:
            result = simulate_balance.progression(species, 123, max_days=30, battles=False, profile='daily_quest')
            self.assertEqual(result['quest_claims'], 30, species)
            self.assertEqual(result.get('training_refusals', 0), 0, species)
            self.assertEqual(result.get('feed_refusals', 0), 0, species)

    def test_quest_reward_changes_progression_and_relaxed_care_remains_viable(self):
        baseline = simulate_balance.progression('mammal', 123, max_days=30, battles=False, quests=False)
        rewarded = simulate_balance.progression('mammal', 123, max_days=30, battles=False, quests=True)
        self.assertGreater(rewarded['level'], baseline['level'])
        relaxed = simulate_balance.progression('mammal', 123, max_days=30, battles=False, profile='relaxed')
        self.assertGreater(relaxed['level'], 1)
        self.assertEqual(relaxed.get('training_refusals', 0), 0)
        self.assertEqual(relaxed.get('quest_claims', 0), 0)

    def test_growth_is_repeatable_without_file_access_and_restores_engine(self):
        rules = copy.deepcopy(engine.G)
        save, load, rng, clock = engine.save_state, engine.load_state, engine.random, engine.time.time
        with patch("builtins.open", side_effect=AssertionError("Touched a file")):
            first = simulate_balance.progression("mammal", 123, max_days=4, battles=False)
            second = simulate_balance.progression("mammal", 123, max_days=4, battles=False)
        self.assertEqual(first, second)
        self.assertEqual(first["trained"], 12)
        self.assertEqual(first.get("training_refusals", 0), 0)
        self.assertEqual(engine.G, rules)
        self.assertIs(engine.save_state, save)
        self.assertIs(engine.load_state, load)
        self.assertIs(engine.random, rng)
        self.assertIs(engine.time.time, clock)

    def test_combat_report_covers_equal_opponent_counts_and_is_reproducible(self):
        first = simulate_balance.combat_report(1, 123)
        self.assertEqual(first, simulate_balance.combat_report(1, 123))
        self.assertEqual(len(first), 2 * 4 * 9)
        for row in first:
            self.assertEqual(row["battles"], 9)
            self.assertEqual(row["wins"] + row["draws"] + row["losses"], 9)


if __name__ == "__main__":
    unittest.main()
