import copy
import json
import unittest
from unittest.mock import patch
import test_p0
import engine
import journeys

class JourneyTests(unittest.TestCase):
    setUp=test_p0.RuntimeTests.setUp
    seed=test_p0.RuntimeTests.seed
    parallel=test_p0.RuntimeTests.parallel

    def walk(self):
        with patch.object(engine.random,'random',return_value=.9):
            result=engine.execute('123','walk_begin')
        self.assertTrue(result['ok'],result)
        return engine.execute('123','status')['journey']

    def choose(self,j,index=0):
        result=engine.execute('123','walk_collect' if index==0 else 'walk_leave',[j['choice_id']])
        self.assertTrue(result['ok'],result)
        return result['journey_result']

    def test_legacy_reads_do_not_invent_or_write_memories(self):
        self.seed();before=(self.state/'123.json').read_bytes()
        self.assertEqual(engine.execute('123','status')['memories']['counts'],{})
        self.assertEqual((self.state/'123.json').read_bytes(),before)

    def test_real_care_combinations_change_the_next_event(self):
        for actions,arc in [(('feed','train'),'trail'),(('play','snack'),'garden'),(('sleep','feed'),'shelter')]:
            self.seed()
            for action in actions:self.assertTrue(engine.execute('123',action)['ok'])
            j=self.walk();self.assertEqual(j['arc'],arc);self.assertTrue(j['prepared'])
            for action in actions:self.assertEqual(engine.execute('123','status')['memories']['counts'][action],1)

    def test_same_choice_yields_different_results_from_cumulative_preparation(self):
        rewards=[]
        for prepared in (False,True):
            self.seed()
            if prepared:
                engine.execute('123','feed');engine.execute('123','train')
            for chapter in range(3):
                j=self.walk();self.assertEqual(j['chapter'],chapter)
                result=self.choose(j)
            rewards.append(result['coins'])
            self.assertEqual(engine.load_state('123')['coins'],result['coins'])
        self.assertEqual(rewards,[2,6])

    def test_choices_continue_between_walks_and_care_can_prepare_next_chapter(self):
        self.seed();j=self.walk();self.assertFalse(j['prepared']);self.choose(j,1)
        engine.execute('123','feed');engine.execute('123','train')
        next_event=self.walk()
        self.assertEqual(next_event['chapter'],1);self.assertEqual(next_event['previous_choice'],1)
        self.assertTrue(next_event['prepared'])
        # Preparations after an offer cannot silently change that offer.
        self.assertEqual(j['prepared'],False)

    def test_pending_blocks_extra_charges_and_bad_tokens_do_nothing(self):
        self.seed();j=self.walk();before=(self.state/'123.json').read_bytes()
        self.assertEqual(engine.execute('123','walk_begin')['code'],'walk_choice_pending')
        self.assertEqual(engine.execute('123','explore_hellgate')['code'],'walk_choice_pending')
        self.assertFalse(engine.execute('123','walk_leave',['f'*32])['ok'])
        self.assertEqual((self.state/'123.json').read_bytes(),before)

    def test_duplicate_and_opposite_retry_return_first_decision_without_rewarding_twice(self):
        self.seed()
        for _ in range(2):self.choose(self.walk())
        j=self.walk();first=self.choose(j,1);before=engine.load_state('123')
        self.assertEqual(self.choose(j,0),first)
        self.assertEqual(engine.load_state('123'),before)
        self.assertEqual(first['coins'],4)

    def test_two_windows_resolve_only_once(self):
        self.seed();j=self.walk()
        results=self.parallel([['engine/engine.py','123',command,j['choice_id']] for command in ('walk_collect','walk_leave')])
        self.assertTrue(all(r['ok'] for r in results));self.assertEqual(results[0]['journey_result'],results[1]['journey_result'])
        self.assertEqual(sum(engine.load_state('123')['journey']['routes']),1)

    def test_complete_chain_rotates_and_memory_remains_bounded(self):
        st=self.seed()
        for i in range(500):
            journeys.record(st,'feed');journeys.record(st,'train')
            j=journeys.begin(st);journeys.resolve(st,j['choice_id'],i%2)
            journeys.validate(st)
        m=st['journey'];self.assertEqual(len(m['recent']),32);self.assertEqual(len(m['endings']),6)
        self.assertLess(len(json.dumps(m)),2200)
        self.assertTrue(all(a['arc']!=b['arc'] for a,b in zip(m['endings'],m['endings'][1:])))

    def test_reset_identity_has_no_old_memories(self):
        self.seed();self.choose(self.walk());self.seed()
        self.assertEqual(engine.execute('123','status')['memories']['counts'],{})

    def test_invalid_memory_is_rejected(self):
        st=self.seed();journeys.record(st,'feed')
        for change in ({'recent':['unknown']},{'routes':[-1,0]},{'chapter':True},{'completed':-1}):
            bad=copy.deepcopy(st);bad['journey'].update(change)
            with self.assertRaises(ValueError):journeys.validate(bad)

    def test_earlier_safe_choice_changes_later_preparation_requirement(self):
        for index,expected in [(0,False),(1,True)]:
            self.seed();j=self.walk();self.choose(j,index)
            engine.execute('123','feed')
            self.assertEqual(self.walk()['prepared'],expected)

    def test_failed_care_does_not_add_memory(self):
        self.seed(inventory={'normal_feed':0,'rare_feed':0})
        before=engine.execute('123','status')['memories']
        self.assertFalse(engine.execute('123','feed')['ok'])
        self.assertEqual(before,engine.execute('123','status')['memories'])

    def test_habits_cannot_starve_new_arcs_and_variants_rotate(self):
        st=self.seed();seen=[];variants=[]
        for _ in range(18):
            for chapter in range(3):
                journeys.record(st,'train');journeys.record(st,'feed')
                j=journeys.begin(st)
                if chapter==0:seen.append(j['arc']);variants.append(j['variant'])
                journeys.resolve(st,j['choice_id'],0)
        self.assertEqual(set(seen[:6]),set(journeys.ARCS))
        self.assertTrue(all(seen[i] not in seen[max(0,i-2):i] for i in range(len(seen))))
        for arc in journeys.ARCS:self.assertEqual([v for a,v in zip(seen,variants) if a==arc],[0,1,2])

    def test_evidence_reports_only_actual_contributors_not_missing_activities(self):
        self.seed();j=self.walk();self.choose(j,1);engine.execute('123','feed');j=self.walk()
        self.assertTrue(j['prepared']);self.assertEqual(j['evidence']['actions'],['feed'])
        self.assertEqual(j['evidence']['missing'],['train']);self.assertTrue(j['evidence']['support_used'])

    def test_offer_evidence_is_frozen_while_later_actions_accumulate(self):
        self.seed();j=self.walk();engine.execute('123','feed');engine.execute('123','train')
        self.assertEqual(engine.execute('123','status')['journey'],j)
