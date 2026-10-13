"""Dungeon economy, daily boundaries, old saves and durable result replay."""
import copy
import random
import unittest
from unittest.mock import patch
import test_p0
import engine
import dungeons


class DungeonTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed
    parallel = test_p0.RuntimeTests.parallel

    def opened(self, **changes):
        return self.seed(dungeons={'date': engine.today(), 'discovered': list(dungeons.CATALOG),
                                  'cleared': [], 'misses': 0, 'last_run': None}, **changes)

    def test_old_saves_read_without_mutation_and_first_walk_finds_one(self):
        self.seed()
        before = (self.state/'123.json').read_bytes()
        state = engine.execute('123', 'status')['dungeons']
        self.assertEqual(state['coins'], 0)
        self.assertEqual(sum(e['discovered'] for e in state['entries']), 0)
        self.assertEqual((self.state/'123.json').read_bytes(), before)
        with patch.object(engine.random, 'random', return_value=.9):
            first = engine.execute('123', 'walk', request_id='discover')
        self.assertIn(first['dungeon_discovered'], dungeons.CATALOG)
        saved = copy.deepcopy(engine.load_state('123'))
        self.assertEqual(engine.execute('123', 'walk', request_id='discover'), first)
        self.assertEqual(engine.load_state('123'), saved)

    def test_three_walk_pity_and_no_duplicate_discoveries(self):
        st = self.seed()
        with patch.object(engine.random, 'random', return_value=.99):
            discoveries = [dungeons.discover(st, engine.today(), engine.random) for _ in range(8)]
        found = [x for x in discoveries if x]
        self.assertEqual(len(found), 3)
        self.assertEqual(len(set(found)), 3)
        self.assertIsNone(discoveries[1])
        self.assertIsNotNone(discoveries[3])
        self.assertIsNotNone(discoveries[6])

    def test_entry_guards_never_spend_a_charge(self):
        self.seed()
        self.assertEqual(engine.execute('123', 'explore_hellgate')['code'], 'dungeon_locked')
        self.opened(walk_energy={'charges': 0, 'updated_at': engine.time.time()})
        before = (self.state/'123.json').read_bytes()
        self.assertEqual(engine.execute('123', 'explore_hellgate')['code'], 'walk_recharging')
        self.assertEqual((self.state/'123.json').read_bytes(), before)
        self.opened(_wild={'species_key':'bird','element_key':'fire','species':'bird','element':'fire','level':1})
        before = (self.state/'123.json').read_bytes()
        self.assertEqual(engine.execute('123', 'explore_hellgate')['code'], 'encounter_pending')
        self.assertEqual((self.state/'123.json').read_bytes(), before)

    def test_win_spends_once_pays_once_and_preserves_normal_progress(self):
        before = self.opened(training_bonus={'atk': 100, 'def':100, 'hp':100})
        with patch.object(engine.time, 'time', return_value=1000):
            first = engine.execute('123', 'explore_hellgate', request_id='one-entry')
            self.assertTrue(first['ok'], first)
            self.assertEqual(first['dungeon_run']['coins_awarded'], 10)
            saved = copy.deepcopy(engine.load_state('123'))
            with patch.object(engine, 'simulate_battle', side_effect=AssertionError('replayed battle')):
                self.assertEqual(engine.execute('123', 'explore_hellgate', request_id='one-entry'), first)
                self.assertEqual(engine.execute('123', 'explore_hellgate')['code'], 'dungeon_cleared')
            self.assertEqual(engine.load_state('123'), saved)
            self.assertEqual(saved['walk_energy']['charges'], 4)
        self.assertEqual(saved['coins'], 10)
        self.assertEqual(saved['dungeons']['last_run'], first['dungeon_run'])
        for field in ('xp','level','training_bonus','record','inventory'):
            self.assertEqual(before[field], saved[field])
        self.assertEqual(before['daily']['battle'], saved['daily']['battle'])

    def test_loss_and_draw_remain_retryable_without_reward(self):
        for outcome in ('lose','draw'):
            self.opened()
            original = engine.simulate_battle
            def fight(*args):
                result = original(*args, rng=random.Random(42))
                result['outcome'] = outcome
                return result
            with patch.object(engine, 'simulate_battle', side_effect=fight):
                first = engine.execute('123', 'explore_dreamforest', request_id='attempt-a')
                second = engine.execute('123', 'explore_dreamforest', request_id='attempt-b')
            self.assertTrue(second['ok'], second)
            self.assertEqual(first['dungeon_run']['coins_awarded'], 0)
            self.assertEqual(engine.load_state('123')['coins'], 0)
            self.assertEqual(engine.load_state('123')['walk_energy']['charges'], 3)
            self.assertNotEqual(first['dungeon_run']['id'], second['dungeon_run']['id'])

    def test_midnight_resets_discoveries_but_keeps_coins_and_replay(self):
        self.opened(training_bonus={'atk':100, 'def':100})
        result = engine.execute('123', 'explore_icekingdom', request_id='old-day')
        with patch.object(engine, 'today', return_value='2099-01-01'):
            status = engine.execute('123', 'status')['dungeons']
            self.assertEqual(status['coins'], 10)
            self.assertFalse(any(e['discovered'] for e in status['entries']))
            self.assertEqual(status['last_run'], result['dungeon_run'])
            self.assertEqual(engine.execute('123', 'explore_icekingdom', request_id='old-day'), result)
            self.assertEqual(engine.execute('123', 'explore_icekingdom')['code'], 'dungeon_locked')

    def test_habitat_stats_are_temporary_and_element_preview_matches_battle(self):
        for key, config in dungeons.CATALOG.items():
            st = self.opened(species=config['species'][0])
            status = engine.execute('123', 'status')['dungeons']['entries']
            entry = next(e for e in status if e['id'] == key)
            actual = engine.execute('123', 'explore_'+key)['dungeon_run']
            self.assertEqual(actual['bonus_percent'], 10)
            self.assertEqual(actual['boss_element'], entry['boss_element'])
            hp = engine.stat_total(st)['hp']
            self.assertEqual(actual['max_hp_me'], hp+max(1,round(hp*.1)))
            self.assertEqual(engine.load_state('123').get('training_bonus', {}), st.get('training_bonus', {}))

    def test_concurrent_entries_with_one_charge_only_run_once(self):
        self.opened(walk_energy={'charges':1,'updated_at':engine.time.time()})
        results = self.parallel([['engine/engine.py','123','explore_hellgate'] for _ in range(6)])
        self.assertEqual(sum(r['ok'] for r in results), 1)

    def test_bad_economy_or_unbounded_state_is_rejected(self):
        for value in (-1, True, '10'):
            with self.assertRaises(engine.GameError): self.seed(coins=value)
        for state in [None, {}, {'date':engine.today(),'discovered':['other'],'cleared':[],'misses':0}]:
            with self.assertRaises(engine.GameError): self.seed(dungeons=state)
