import copy
import json
import unittest
import test_home
from game_api import transition
import collectibles

class EquipmentTests(unittest.TestCase):
    # Reuse only the fixture, not the inherited home test suite.
    def setUp(self):
        test_home.HomeTests.setUp(self)
        self.state['collectibles']={'ember-horns':1,'drifting-embers':1}
        self.token='a'*32
    def call(self,command,request='equip',**extra):
        e=self.state.get('equipment',{'revision':0})
        payload=dict(pet_id=self.state['pet_id'],revision=e['revision'],id=self.token,**extra)
        args=[json.dumps(payload)]
        r=transition(self.state,command,self.context,arguments=args,request_id=request)
        if r.result['ok']:self.state=r.state
        return r,args
    def prepare(self):
        return self.call('equipment_prepare',item_id='ember-horns',stage=1,source_path='assets/starters-v1/ghost_fire_stage1.png')
    def test_apply_atomic_replay_and_discovery(self):
        original=copy.deepcopy(self.state);r,args=self.prepare();self.assertTrue(r.result['ok'],r.result)
        self.assertEqual(self.state['collectibles'],original['collectibles']);self.assertIsNone(self.state['equipment']['portrait'])
        r,args=self.call('equipment_apply','apply');self.assertTrue(r.result['ok'],r.result)
        self.assertNotIn('ember-horns',self.state['collectibles']);self.assertIn('ember-horns',collectibles.discovered(self.state))
        saved=copy.deepcopy(self.state)
        replay=transition(saved,'equipment_apply',self.context,arguments=args,request_id='apply')
        self.assertEqual(replay.result,r.result);self.assertFalse(replay.changed)
        duplicate,_=self.call('equipment_apply','different');self.assertFalse(duplicate.result['ok']);self.assertEqual(saved,self.state)
        for field in ('coins','inventory','level','xp','record'):self.assertEqual(original[field],self.state[field])
    def test_cancel_and_stage_change_never_consume(self):
        self.prepare();before=copy.deepcopy(self.state['collectibles']);self.state['equipment']['pending']['stage']=2
        self.assertFalse(self.call('equipment_apply','stale')[0].result['ok'])
        self.assertTrue(self.call('equipment_cancel','cancel')[0].result['ok']);self.assertEqual(before,self.state['collectibles'])
    def test_duplicate_prepare_and_bad_inputs(self):
        self.prepare();before=copy.deepcopy(self.state)
        self.assertFalse(self.call('equipment_prepare','again',item_id='ember-horns',stage=1,source_path='assets/starters-v1/a.png')[0].result['ok'])
        self.assertEqual(before,self.state)
    def test_read_legacy_is_pure_and_reward_rule_unchanged(self):
        old=copy.deepcopy(self.state);r=transition(old,'status',self.context)
        self.assertFalse(r.changed);self.assertEqual(old,self.state);self.assertEqual(set(r.result['collectible_discoveries']),set(old['collectibles']))
        self.prepare();self.call('equipment_apply','apply');self.assertEqual(collectibles.award(self.state,'hellgate'),'ember-horns')

if __name__=='__main__':unittest.main()
