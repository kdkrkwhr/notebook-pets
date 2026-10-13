import copy
import unittest
from test_anna import GameClient, GameService, MemoryAPS
from receipts import prefix

class WalkChoiceStorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage=MemoryAPS();self.client=GameClient(self.storage)
        await self.client.invoke({'command':'start','name':'Walker','request_id':'birth'})
        self.storage.value['_walk_choice']={'choice_id':'a'*32,'reward':20}
        self.storage.value['walk_energy']={'charges':4,'updated_at':__import__('time').time()}

    async def test_saved_choice_replays_after_restart_without_duplicate_xp(self):
        args={'command':'walk_collect','choice_id':'a'*32,'request_id':prefix(self.storage.value)+'choice'}
        first=await GameService(self.storage).invoke(args)
        self.assertTrue(first['ok'],first);self.assertEqual(first['xp_result']['gained'],20)
        before=copy.deepcopy(self.storage.document)
        replay=await GameService(self.storage).invoke(args)
        self.assertTrue(replay['replayed']);self.assertEqual(replay['xp_result'],first['xp_result'])
        self.assertEqual(before,self.storage.document)
        stale=await self.client.invoke({'command':'walk_leave','choice_id':'a'*32,'request_id':'stale'})
        self.assertEqual(stale['code'],'walk_choice_stale')

    async def test_failed_commit_keeps_choice_and_xp(self):
        before=copy.deepcopy(self.storage.document);self.storage.fail=True
        with self.assertRaises(Exception):await self.client.invoke({'command':'walk_collect','choice_id':'a'*32,'request_id':'choose'})
        self.assertEqual(self.storage.document,before)
