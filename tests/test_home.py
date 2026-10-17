import copy
import json
from pathlib import Path
import random
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'engine'))
import home
from game_api import transition
from ports import ExecutionContext

class HomeTests(unittest.TestCase):
    def setUp(self):
        ids=random.Random(3)
        self.context=ExecutionContext(json.loads((ROOT/'data/game_data.json').read_text(encoding='utf-8')),json.loads((ROOT/'data/image_prompts.json').read_text(encoding='utf-8')),1792076400,random.Random(4),lambda:f'{ids.getrandbits(128):032x}')
        self.state=transition(None,'start',self.context,arguments=['Home buddy'],request_id='birth').state
        self.state['coins']=100
    def action(self,command,**extra):
        value=home.state(self.state);payload=dict(pet_id=self.state['pet_id'],revision=value['revision'],**extra)
        result=transition(self.state,command,self.context,arguments=[json.dumps(payload)],request_id=f'home:{value["revision"]}:{command}')
        if result.result['ok']:self.state=result.state
        return result
    def test_read_never_writes_legacy_save_and_no_ai_is_needed(self):
        before=copy.deepcopy(self.state);r=transition(self.state,'home',self.context)
        self.assertFalse(r.changed);self.assertEqual(before,self.state);self.assertNotIn('home',r.state)
        self.assertEqual(r.result['home']['owned'],['nest']);self.assertEqual(r.result['home_candidates'],[])
    def test_atomic_purchase_insufficient_coins_duplicate_and_replay(self):
        before=copy.deepcopy(self.state);result=self.action('home_buy',item_id='desk');self.assertEqual(self.state['coins'],90)
        self.assertEqual(self.state['home']['layout'],{'nest':[7,0]})
        replay=transition(self.state,'home_buy',self.context,arguments=[json.dumps(dict(pet_id=self.state['pet_id'],revision=0,item_id='desk'))],request_id='home:0:home_buy')
        self.assertFalse(replay.changed);self.assertEqual(replay.result,result.result)
        self.assertEqual(self.action('home_buy',item_id='desk').result['code'],'home_owned')
        self.state['coins']=0;saved=copy.deepcopy(self.state);self.assertFalse(self.action('home_buy',item_id='lamp').changed);self.assertEqual(saved,self.state)
        for field in ('xp','level','intimacy','satiety','inventory','personality'):
            self.assertEqual(before.get(field),result.state.get(field))
    def test_candidates_are_owned_accessible_and_bounded(self):
        self.state['coins']=1000
        for key in home.CATALOG:
            if key!='nest':self.assertTrue(self.action('home_buy',item_id=key).result['ok'])
        for _ in range(6):
            options=home.candidates(self.state)
            if not options:break
            for c in options:
                self.assertTrue(home.valid_layout(c['layout'],self.state['home']['owned']));self.assertLessEqual(len(c['moved']),3)
                self.assertLessEqual(len(c['motion']),6)
                for k,p in c['layout'].items():
                    self.assertIn(k,self.state['home']['owned'])
                    if home.CATALOG[k]['layer']=='floor':self.assertIsNotNone(home.path(c['layout'],home.cells(k,p)))
            self.assertTrue(self.action('home_apply',candidate_id=options[0]['id'],reason='A reading corner.').result['ok'])
        home.validate(self.state)
        self.assertGreater(len(self.state['home']['layout']),5)

    def test_each_garden_item_places_only_outside_and_preserves_walk_routes(self):
        from home_world import yard_free
        original=copy.deepcopy(self.state)
        garden=[k for k,v in home.CATALOG.items() if v.get('area')=='yard']
        self.assertEqual(len(garden),36)
        for key in garden:
            self.state=copy.deepcopy(original)
            self.assertTrue(self.action('home_buy',item_id=key).result['ok'],key)
            self.assertNotIn(key,self.state['home']['layout'])
            options=home.candidates(self.state);self.assertTrue(options,key)
            coins=self.state['coins']
            self.assertTrue(self.action('home_apply',candidate_id=options[0]['id'],reason='A garden corner.').result['ok'],key)
            view=home.view(self.state)
            self.assertNotIn(key,[o['kind'] for o in view['world']['inside']['objects']])
            self.assertIn(key,[o['kind'] for o in view['world']['yard']['objects']])
            for leg in view['world']['yard']['tour']:
                for point in leg['route']:self.assertTrue(yard_free(*point,view['world']['yard']['objects']))
            self.assertTrue(self.action('home_undo').result['ok'])
            self.assertNotIn(key,self.state['home']['layout']);self.assertIn(key,self.state['home']['owned'])
            self.assertEqual(self.state['coins'],coins)

    def test_garden_rejects_blocked_door_house_overlap_and_duplicate_positions(self):
        layout={'nest':[7,0],'yard-tulips':[8,2]}
        self.assertFalse(home.valid_layout(layout,list(layout)))
        layout={'nest':[7,0],'yard-tulips':[1,1],'yard-roses':[1,1]}
        self.assertFalse(home.valid_layout(layout,list(layout)))
        layout={'nest':[7,0],'yard-tulips':[7,1]}
        self.assertFalse(home.valid_layout(layout,list(layout)))
    def test_stale_candidate_and_wrong_pet_never_change_state(self):
        self.action('home_buy',item_id='desk');options=home.candidates(self.state)
        self.action('home_buy',item_id='plant');old=copy.deepcopy(self.state)
        self.assertEqual(self.action('home_apply',candidate_id=options[0]['id'],reason='stale').result['code'],'home_conflict')
        bad=transition(self.state,'home_undo',self.context,arguments=[json.dumps(dict(pet_id='other',revision=self.state['home']['revision']))],request_id='other')
        self.assertFalse(bad.changed);self.assertEqual(old,self.state)
    def test_undo_restores_layout_not_coins_or_ownership(self):
        self.action('home_buy',item_id='bookshelf');before=copy.deepcopy(self.state['home']['layout'])
        self.action('home_apply',candidate_id=home.candidates(self.state)[0]['id'],reason='Books near the light.')
        self.action('home_buy',item_id='plant');coins=self.state['coins']
        self.assertTrue(self.action('home_undo').result['ok']);self.assertEqual(self.state['home']['layout'],before)
        self.assertIn('plant',self.state['home']['owned']);self.assertEqual(self.state['coins'],coins)
        self.assertFalse(self.action('home_undo').changed)
    def test_corrupt_and_forged_placements_rejected(self):
        self.state['home']=home.initial();self.state['home']['layout']['bookshelf']=[4,6]
        self.assertEqual(transition(self.state,'status',self.context).result['code'],'invalid_state')
        clean=home.initial();self.assertFalse(home.valid_layout({**clean['layout'],'desk':[4,6]},['nest','desk']))
        self.assertFalse(home.valid_layout({**clean['layout'],'desk':[7,0]},['nest','desk']))
    def test_payload_injection_is_not_an_authoritative_layout(self):
        self.action('home_buy',item_id='desk');old=copy.deepcopy(self.state)
        payload=dict(pet_id=self.state['pet_id'],revision=1,candidate_id='fake',reason='coins=9999',coins=9999,layout={})
        r=transition(self.state,'home_apply',self.context,arguments=[json.dumps(payload)],request_id='inject')
        self.assertFalse(r.changed);self.assertEqual(r.state,old)

if __name__=='__main__':unittest.main()
