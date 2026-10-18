import copy
import json
import unittest
import test_p0
import engine


class EvolutionTests(unittest.TestCase):
    setUp=test_p0.RuntimeTests.setUp
    seed=test_p0.RuntimeTests.seed

    def ready(self,stage=1):
        st=self.seed(level=50,stage=stage,coins=100)
        engine.journeys.memory(st).update(counts={'feed':30,'play':30,'train':25,'walk':30},completed=3)
        engine.save_state(st)
        return st

    def call(self,command,**values):
        st=engine.load_state('123')
        return engine.execute('123',command,[json.dumps({'pet_id':engine.art.pet_identity(st),**values},ensure_ascii=False)])

    def prepare(self,stage):
        r=self.call('evolution_prepare',stage=stage)
        self.assertTrue(r['ok'],r)
        return engine.load_state('123')['evolution']['pending']

    def test_all_requirements_and_no_auto_evolution(self):
        st=self.seed(level=10)
        engine.journeys.memory(st)['counts']={'feed':9,'walk':3}
        engine.save_state(st)
        self.assertEqual(self.call('evolution_prepare',stage=1)['code'],'evolution_unready')
        st['journey']['counts']['feed']=10;engine.save_state(st)
        p=self.prepare(1)
        self.assertEqual(len(set(p['ids'])),3)
        self.assertEqual(p['ids'][0],'keep')
        self.assertNotIn('fire',p['ids'])
        self.assertFalse(self.call('evolution_prepare',stage=1)['evolution_reserved'])
        self.assertEqual(engine.load_state('123')['stage'],1)

    def test_three_manual_steps_preserve_identity_stats_money_and_album_elements(self):
        before=self.ready();identity=engine.art.pet_identity(before)
        elements=['fire']
        for stage in (1,2,3):
            p=self.prepare(stage)
            route=p['ids'][1];elements.append(route)
            self.assertTrue(self.call('evolve',choice_id=p['id'],route_id=route)['ok'])
            st=engine.load_state('123')
            self.assertEqual(st['stage'],stage+1)
            self.assertEqual(engine.art.pet_identity(st),identity)
            for key in ('xp','level','stats','coins','inventory','species'):self.assertEqual(st[key],before[key])
            self.assertEqual(self.call('evolve',choice_id=p['id'],route_id=route)['code'],'evolution_changed')
        album=engine.execute('123','album')['album']
        self.assertEqual([e['image']['element'] for e in album['entries']],elements)
        self.assertIsNone(album['current_image']['branch'])
        self.assertEqual(self.call('evolution_prepare',stage=4)['code'],'evolution_unready')

    def test_ai_cannot_invent_routes_attributes_or_stats(self):
        self.ready();p=self.prepare(1)
        options=[{'route_id':r,'title':'A path','reason':'Care','appearance':'Soft accents'} for r in ('keep','wind','nature')]
        payload={'choice_id':p['id'],'options':options,'memory':'We like quiet walks.','features':'One round body, two ears, no wings.','language':'en'}
        original=engine.load_state('123')
        for key,value in [('options',[*options[:2],{**options[2],'route_id':'invincible'}]),('features','x'*1201),('coins',999)]:
            invalid={**payload,key:value}
            self.assertFalse(self.call('evolution_options',**invalid)['ok'])
            self.assertEqual(engine.load_state('123'),original)
        self.assertTrue(self.call('evolution_options',**payload)['ok'])
        self.assertEqual(engine.load_state('123')['evolution']['features'],payload['features'])
        self.assertFalse(self.call('evolution_options',**payload)['ok'])
        self.assertFalse(self.call('evolve',choice_id=p['id'],route_id='earth')['ok'])
        self.assertTrue(self.call('evolve',choice_id=p['id'],route_id='wind')['ok'])

    def test_busy_encounter_and_story_endings_gate(self):
        st=self.ready(3);st['journey']['completed']=2;engine.save_state(st)
        self.assertEqual(self.call('evolution_prepare',stage=3)['code'],'evolution_unready')
        st['journey']['completed']=3;engine.journeys.begin(st);engine.save_state(st)
        self.assertEqual(self.call('evolution_prepare',stage=3)['code'],'evolution_busy')

    def test_v4_migration_preserves_stage_identity_and_records_without_writes(self):
        st=self.seed(version=4,level=50,stage=4,evolution_branch='light')
        before=(self.state/'123.json').read_bytes();old=copy.deepcopy(st)
        migrated=engine.migrate_state(st,'123')
        self.assertEqual(migrated['stage'],4);self.assertEqual(migrated['evolution_branch'],'light')
        self.assertEqual(engine.art.pet_identity(old),engine.art.pet_identity(migrated))
        self.assertEqual((self.state/'123.json').read_bytes(),before)
