"""Daily objectives share the game transaction, KST clock and event receipts."""
from datetime import date
import json
import unittest
from unittest.mock import patch
import test_p0
import engine
import runtime
from discord_delivery import parse_command, response_text
from adapter import bind_game_event, tool_definition


class QuestTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed
    parallel = test_p0.RuntimeTests.parallel

    def completed(self, **changes):
        st = self.seed(**changes)
        st['daily'].update(feed=1, train=2, walk=1)
        engine.save_state(st)
        return st

    def test_old_save_and_view_are_read_only(self):
        self.seed()
        before = (self.state/'123.json').read_bytes()
        result = engine.execute('123','퀘스트')
        self.assertEqual([x['progress'] for x in result['quest']['tasks']], [0,0,0])
        self.assertFalse(result['quest']['ready'])
        self.assertEqual((self.state/'123.json').read_bytes(),before)
        self.assertEqual(engine.execute('123','status')['quest'],result['quest'])

    def test_only_successful_actions_count_and_retry_is_not_counted_twice(self):
        self.seed()
        fed=engine.execute('123','feed',request_id='feed1')
        self.assertEqual(engine.execute('123','밥줘',request_id='feed1'),fed)
        self.assertFalse(engine.execute('123','feed',request_id='feed2')['ok'])
        self.assertEqual(engine.load_state('123')['daily']['feed'],1)
        self.assertEqual(fed['quest']['tasks'][0]['progress'],1)
        engine.execute('123','train',request_id='train1')
        engine.execute('123','train',request_id='train2')
        with patch.object(engine.random,'random',return_value=1):
            result=engine.execute('123','walk',request_id='walk1')
        self.assertTrue(result['quest']['ready'])
        self.assertIn('!퀘스트보상',response_text(result))

    def test_rejected_action_and_premature_claim_do_not_write(self):
        self.seed(satiety=0,inventory={'normal_feed':0,'rare_feed':0})
        before=(self.state/'123.json').read_bytes()
        for command in ('feed','train','claimquest'):
            self.assertFalse(engine.execute('123',command)['ok'])
        self.assertEqual((self.state/'123.json').read_bytes(),before)

    def test_claim_reward_and_receipt_are_atomic_and_survive_restart(self):
        before=self.completed()
        result=engine.execute('123','claimquest',request_id='reward1')
        after=engine.load_state('123')
        self.assertTrue(result['ok'])
        self.assertTrue(result['quest']['claimed'])
        self.assertEqual(after['xp']-before['xp'],30)
        self.assertEqual(after['inventory']['rare_feed']-before['inventory']['rare_feed'],1)
        self.assertEqual(after['processed_requests']['reward1']['result'],result)
        replay=self.parallel([['engine/engine.py','123','퀘스트보상']])
        self.assertEqual(replay[0]['code'],'quest_already_claimed')
        self.assertEqual(engine.execute('123','claimquest',request_id='reward1'),result)
        self.assertEqual(engine.load_state('123'),after)

    def test_concurrent_claims_only_reward_once(self):
        self.completed()
        results=self.parallel([['engine/engine.py','123','claimquest'] for _ in range(4)])
        self.assertEqual(sum(r['ok'] for r in results),1)
        self.assertEqual(engine.load_state('123')['inventory']['rare_feed'],1)

    def test_failed_save_does_not_consume_claim_or_award_reward(self):
        self.completed()
        path = self.state / '123.json'
        before = path.read_bytes()
        with patch.object(engine, 'atomic_write_json', side_effect=runtime.GameError('storage_error', 'failed')):
            failed = engine.execute('123', 'claimquest', request_id='claim:retry')
        self.assertFalse(failed['ok'])
        self.assertEqual(path.read_bytes(), before)
        result = engine.execute('123', 'claimquest', request_id='claim:retry')
        self.assertTrue(result['ok'])
        self.assertEqual(engine.load_state('123')['inventory']['rare_feed'], 1)

    def test_agent_read_only_quest_and_bound_claim(self):
        self.completed()
        reader = bind_game_event('123')
        self.assertTrue(reader('quests')['quest']['ready'])
        self.assertEqual(reader('claimquest')['code'], 'forbidden')
        commands = tool_definition(writable=False)['parameters']['properties']['command']['enum']
        self.assertIn('quests', commands)
        self.assertNotIn('claimquest', commands)
        writer = bind_game_event('123', 'chat:claim')
        reward = writer('claimquest')
        self.assertTrue(reward['ok'])
        self.assertTrue(writer('quests')['quest']['claimed'])
        self.assertEqual(writer('claimquest'), reward)

    def test_next_day_resets_objectives_but_old_event_replays_without_new_reward(self):
        with patch.object(runtime,'game_date',return_value=date(2026,10,7)), patch.object(engine,'game_date',return_value=date(2026,10,7)):
            self.completed()
            original=engine.execute('123','claimquest',request_id='yesterday')
        with patch.object(runtime,'game_date',return_value=date(2026,10,8)), patch.object(engine,'game_date',return_value=date(2026,10,8)):
            self.assertEqual(engine.execute('123','claimquest',request_id='yesterday'),original)
            quest=engine.execute('123','quests')['quest']
            self.assertFalse(quest['claimed'])
            self.assertEqual([t['progress'] for t in quest['tasks']],[0,0,0])
            self.assertEqual(engine.execute('123','claimquest')['code'],'quest_incomplete')
            self.assertEqual(engine.load_state('123')['inventory']['rare_feed'],1)

    def test_reward_can_evolve_and_respects_sleep_bonus_and_level_cap(self):
        self.completed(level=30,xp=70,sleep_bonus_dates=[engine.today()])
        result=engine.execute('123','claimquest')
        self.assertEqual(result['xp_result']['gained'],36)
        self.assertEqual(result['xp_result']['image']['stage'],2)
        self.assertEqual(engine.load_state('123')['xp'],6)
        self.completed(level=100,stage=4)
        result=engine.execute('123','claimquest')
        self.assertEqual(result['xp_result']['gained'],0)
        self.assertEqual(result['loot']['rare_feed'],1)

    def test_bound_commands_and_discord_text_expose_objectives(self):
        self.completed()
        self.assertEqual(parse_command('!퀘스트'),('quests',[]))
        self.assertEqual(parse_command('!퀘스트보상'),('claimquest',[]))
        self.assertIn('훈련 2/2',response_text(engine.execute('123','quests')))
        text=response_text(engine.execute('123','claimquest'))
        self.assertIn('맛있는 사료 +1',text)
        self.assertIn('보상 수령 완료',text)

    def test_corrupt_claim_flag_is_rejected_without_overwrite(self):
        self.seed()
        path=self.state/'123.json'
        data=json.loads(path.read_text(encoding='utf-8'))
        data['daily']['quest_claimed']=2
        path.write_text(json.dumps(data),encoding='utf-8')
        before=path.read_bytes()
        self.assertEqual(engine.execute('123','quests')['code'],'invalid_state')
        self.assertEqual(path.read_bytes(),before)

if __name__=='__main__': unittest.main()
