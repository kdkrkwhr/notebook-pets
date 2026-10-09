import copy
import json
import random
import unittest
import test_p0
from test_engine import base_state
import engine


class InteractionTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def test_legacy_migration_preserves_identity_progress_and_is_read_only_until_action(self):
        for level in (1, 9, 10, 29, 30, 31, 49, 50, 80, 81, 100):
            for version in (2, 3):
                with self.subTest(level=level, version=version):
                    st = base_state(version=version, level=level, stage=engine.legacy_stage(level), xp=17,
                                    intimacy=80, evolution_branch='light' if level >= 81 else None)
                    st['history'] = [{'event':'hatched', 'ts':1000}]
                    path = self.state/'123.json'
                    path.write_text(json.dumps(st), encoding='utf-8')
                    original = path.read_bytes()
                    migrated = engine.load_state('123')
                    self.assertEqual(path.read_bytes(), original)
                    self.assertEqual(engine.art.pet_identity(st), engine.art.pet_identity(migrated))
                    for key in ('level', 'xp', 'species', 'element', 'name', 'inventory', 'record'):
                        self.assertEqual(st[key], migrated[key])
                    self.assertEqual(migrated['stage'], engine.stage_of(level)[0])
                    self.assertEqual(engine.migrate_state(migrated,'123'), migrated)
                    events = [e for e in migrated['history'] if e['event']=='evolved']
                    self.assertEqual(len(events), migrated['stage']-st['stage'])
                    self.assertTrue(all(e['reason']=='progression_update' for e in events))
                    self.assertTrue(engine.execute('123','attendance', request_id='upgrade')['ok'])
                    saved = json.loads(path.read_text(encoding='utf-8'))
                    self.assertEqual(saved['version'], 4)
                    self.assertEqual(len(saved['history']), len(migrated['history']))
                    engine.execute('123','attendance', request_id='upgrade')
                    self.assertEqual(json.loads(path.read_text(encoding='utf-8')), saved)

    def test_corrupt_legacy_stage_is_rejected_and_not_repaired(self):
        path = self.state/'123.json'
        path.write_text(json.dumps(base_state(version=3, level=20, stage=3)), encoding='utf-8')
        original = path.read_bytes()
        self.assertEqual(engine.execute('123','status')['code'], 'invalid_state')
        self.assertEqual(path.read_bytes(), original)

    def test_new_stage_thresholds_do_not_increase_xp_cost_early(self):
        self.assertEqual([engine.xp_needed(n) for n in (9,10,29,30,31,49,50,51,80,81)],
                         [100,100,100,100,200,200,200,400,400,800])

    def test_battle_trace_conserves_hp_and_replay_preserves_opponent_and_rewards(self):
        enemy={'species_key':'dragon','element_key':'water','species':'Dragon','element':'Water','level':1}
        st=self.seed(_wild=enemy)
        original=copy.deepcopy(st)
        for seed in range(30):
            battle=engine.simulate_battle(st,enemy,random.Random(seed))
            self.assertLessEqual(len(battle['turns']),20)
            hp_me,hp_enemy=battle['max_hp_me'],battle['max_hp_enemy']
            for turn in battle['turns']:
                self.assertAlmostEqual(hp_me-turn['damage_me'],turn['hp_me'],delta=.02)
                self.assertAlmostEqual(hp_enemy-turn['damage_enemy'],turn['hp_enemy'],delta=.02)
                hp_me,hp_enemy=turn['hp_me'],turn['hp_enemy']
                self.assertGreaterEqual(hp_me,0)
                self.assertGreaterEqual(hp_enemy,0)
            self.assertEqual((hp_me,hp_enemy),(battle['hp_me'],battle['hp_enemy']))
        self.assertEqual(st,original)
        first=engine.execute('123','battle',request_id='battle-trace')
        self.assertTrue(first['ok'],first)
        saved=engine.load_state('123')
        self.assertIsNone(saved['_wild'])
        self.assertEqual(first['opponent'],enemy)
        self.assertEqual(engine.execute('123','battle',request_id='battle-trace'),first)
        self.assertEqual(engine.load_state('123'),saved)
