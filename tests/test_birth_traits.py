import copy
import unittest
import test_core_api as core
from game_api import transition

class BirthTraitsTests(unittest.TestCase):
    context=core.CoreTests.context
    def test_artwork_traits_replay_and_existing_pet_preserved(self):
        c=self.context();birth={'species':'reptile','element':'water'}
        r=transition(None,'start',c,arguments=['Snake'],request_id='birth',birth=birth)
        self.assertTrue(r.changed);self.assertEqual(r.state['species'],'reptile');self.assertEqual(r.state['element'],'water')
        self.assertEqual(r.state['processed_requests']['birth']['result'],r.result)
        original=copy.deepcopy(r.state)
        replay=transition(r.state,'start',c,arguments=['Snake'],request_id='birth',birth={'species':'bird','element':'fire'})
        self.assertFalse(replay.changed);self.assertEqual(replay.state,original);self.assertEqual(replay.result,r.result)
        other=transition(r.state,'start',c,arguments=['Other'],request_id='other',birth={'species':'plant','element':'nature'})
        self.assertFalse(other.changed);self.assertEqual(other.state,original)

    def test_invalid_traits_cannot_create_or_change_game(self):
        for birth in ({'species':'human','element':'random'},{'species':'mammal','element':'bad'},{'species':'mammal','element':'fire','hp':999},'bad'):
            r=transition(None,'start',self.context(),arguments=['Test'],request_id='birth',birth=birth)
            self.assertFalse(r.result['ok']);self.assertIsNone(r.state);self.assertFalse(r.changed)

    def test_random_element_uses_existing_seed_without_stat_overrides(self):
        a=transition(None,'start',self.context(),arguments=['Test'],request_id='birth')
        b=transition(None,'start',self.context(),arguments=['Test'],request_id='birth',birth={'species':'mammal','element':'random'})
        self.assertEqual(a.state['element'],b.state['element']);self.assertEqual(a.state['stats'],b.state['stats'])
