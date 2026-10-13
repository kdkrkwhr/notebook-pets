import copy
import json
import unittest
import test_p0
import engine
import journeys
import personality

def profile():
    return {'appearance':'round face, small horns, flame-shaped tail','source':'reference',
        'traits':{'curiosity':1,'warmth':0,'energy':0,'caution':1},
        'summary':{'en':'Mochi is soft-looking and curious.','ko':'모찌는 부드러운 모습의 호기심 많은 친구예요.'},
        'voice':{'en':'Short warm sentences','ko':'짧고 다정한 말투'},
        'habit':{'en':'Tilts their head when curious','ko':'궁금하면 고개를 갸웃해요'}}

class PersonalityTests(unittest.TestCase):
    setUp=test_p0.RuntimeTests.setUp
    seed=test_p0.RuntimeTests.seed
    parallel=test_p0.RuntimeTests.parallel

    def test_initialization_persists_once_without_rewards(self):
        self.seed();before=engine.load_state('123')
        result=engine.execute('123','personality',[json.dumps(profile())],request_id='personality')
        self.assertTrue(result['ok'],result);after=engine.load_state('123')
        for key in ('xp','level','intimacy','inventory','stats'):self.assertEqual(before[key],after[key])
        origin=after['personality']['origin'];p=profile();p['traits']['curiosity']=-1
        self.assertTrue(engine.execute('123','personality',[json.dumps(p)])['ok'])
        self.assertEqual(engine.execute('123','status')['personality']['origin'],origin)
        before=(self.state/'123.json').read_bytes();engine.execute('123','status')
        self.assertEqual(before,(self.state/'123.json').read_bytes())

    def test_invalid_profile_cannot_write_game_values_or_initial_personality(self):
        self.seed();before=(self.state/'123.json').read_bytes()
        for mutate in (lambda p:p['traits'].update(curiosity=999),lambda p:p.update(coins=999),lambda p:p['voice'].update(en='x'*221),lambda p:p['traits'].update(energy=True)):
            p=profile();mutate(p);self.assertFalse(engine.execute('123','personality',[json.dumps(p)])['ok'])
            self.assertEqual(before,(self.state/'123.json').read_bytes())

    def test_eight_experiences_change_expression_gradually_and_cap(self):
        st=self.seed();personality.establish(st,json.dumps(profile()))
        initial=personality.view(st)
        for _ in range(7):journeys.record(st,'play')
        self.assertEqual(personality.view(st)['values'],initial['values'])
        journeys.record(st,'play');self.assertEqual(personality.view(st)['values']['energy'],initial['values']['energy']+1)
        for _ in range(1000):journeys.record(st,'play')
        now=personality.view(st);self.assertEqual(now['values']['energy'],initial['values']['energy']+15)
        self.assertEqual(now['origin'],initial['origin']);self.assertEqual(now['changes']['energy']['actions'],['play'])

    def test_evolution_does_not_reroll_and_new_identity_starts_empty(self):
        st=self.seed();personality.establish(st,json.dumps(profile()));origin=copy.deepcopy(st['personality'])
        engine.add_xp(st,10000);self.assertEqual(st['personality'],origin)
        self.seed();self.assertIsNone(engine.execute('123','status')['personality'])

    def test_existing_memories_are_not_relabelled_as_new_personality_changes(self):
        st=self.seed()
        for _ in range(40):journeys.record(st,'train')
        personality.establish(st,json.dumps(profile()));self.assertEqual(personality.view(st)['changes'],{})

    def test_parallel_initialization_cannot_reroll_the_first_committed_profile(self):
        self.seed();a=profile();b=profile();b['traits']['energy']=-1
        results=self.parallel([['engine/engine.py','123','personality',json.dumps(p)] for p in (a,b)])
        self.assertTrue(all(r['ok'] for r in results));self.assertEqual(results[0]['personality']['origin'],results[1]['personality']['origin'])

    def test_personality_changes_event_preference_but_not_rewards(self):
        st=self.seed();p=profile();p['traits']={'curiosity':-1,'warmth':1,'energy':-1,'caution':-1}
        personality.establish(st,json.dumps(p));j=journeys.begin(st)
        self.assertEqual(j['arc'],'garden');self.assertEqual(j['selection'],'personality')
        a=copy.deepcopy(st);b=copy.deepcopy(st);b.pop('personality')
        self.assertEqual(journeys.resolve(a,j['choice_id'],0)['coins'],journeys.resolve(b,j['choice_id'],0)['coins'])
