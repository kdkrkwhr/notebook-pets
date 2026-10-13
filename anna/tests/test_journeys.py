import copy
import unittest
from test_anna import GameClient, GameService, MemoryAPS
from receipts import prefix, byte_size, MAX_SAVE_BYTES

class JourneyStorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage=MemoryAPS();self.client=GameClient(self.storage)
        await self.client.invoke({'command':'start','name':'Companion','request_id':'birth'})
        # Seed a fully prepared final chapter; run the shipped worker and APS CAS.
        self.storage.value['journey']={'version':1,'counts':{'train':2,'feed':2},'recent':['train','feed'],
            'routes':[1,1],'arc':'trail','chapter':2,'last_arc':None,'completed':0,'endings':[],
            'current':{'choice_id':'b'*32,'arc':'trail','chapter':2,'prepared':True,'basis':['train','feed'],
                'previous_choice':1,'state':'pending','choice':None,'coins':0,'intimacy':0}}

    async def test_real_worker_commits_memory_reward_and_receipt_together(self):
        args={'command':'walk_collect','choice_id':'b'*32,'request_id':prefix(self.storage.value)+'choice'}
        result=await GameService(self.storage).invoke(args)
        self.assertTrue(result['ok'],result);self.assertEqual(result['journey_result']['coins'],6)
        self.assertEqual(result['status']['journey']['state'],'done')
        self.assertEqual(result['status']['memories']['completed'],1)
        saved=copy.deepcopy(self.storage.document)
        retry=await GameService(self.storage).invoke({**args,'language':'ko'})
        self.assertTrue(retry['replayed']);self.assertEqual(self.storage.document,saved)
        opposite=await self.client.invoke({'command':'walk_leave','choice_id':'b'*32,'request_id':'opposite'})
        self.assertEqual(opposite['journey_result']['choice'],0)
        self.assertEqual(self.storage.value['coins'],6)
        self.assertLess(byte_size(self.storage.document),MAX_SAVE_BYTES)

    async def test_failed_commit_keeps_entire_offer_and_all_rewards_unchanged(self):
        before=copy.deepcopy(self.storage.document);self.storage.fail=True
        with self.assertRaises(Exception):await self.client.invoke({'command':'walk_collect','choice_id':'b'*32,'request_id':'choice'})
        self.assertEqual(self.storage.document,before)

    async def test_another_account_cannot_use_the_token(self):
        other=MemoryAPS();client=GameClient(other)
        await client.invoke({'command':'start','name':'Other','request_id':'birth'})
        result=await client.invoke({'command':'walk_collect','choice_id':'b'*32,'request_id':'foreign'})
        self.assertFalse(result['ok']);self.assertEqual(self.storage.value['journey']['current']['state'],'pending')
