import copy
import json
import unittest
from test_anna import MemoryAPS,GameClient

class HomeStorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage=MemoryAPS();self.client=GameClient(self.storage)
        self.born=await self.client.invoke({'command':'start','name':'Private home','request_id':'born'})
        self.storage.value['coins']=30
    def payload(self,revision=0,**extra):return json.dumps(dict(pet_id=self.born['pet_id'],revision=revision,**extra))
    async def test_purchase_commit_and_retry_in_another_language_charge_once(self):
        args=dict(command='home_buy',request_id='buy-desk',home_payload=self.payload(item_id='desk'))
        first=await self.client.invoke(args);self.assertTrue(first['ok']);saved=copy.deepcopy(self.storage.value)
        self.assertEqual(saved['coins'],20);self.assertNotIn('desk',saved['home']['layout'])
        replay=await self.client.invoke({**args,'language':'ko'});self.assertTrue(replay['replayed']);self.assertEqual(saved,self.storage.value)
    async def test_storage_failure_preserves_coins_and_ownership(self):
        before=copy.deepcopy(self.storage.value);self.storage.fail=True
        with self.assertRaises(Exception):await self.client.invoke(dict(command='home_buy',request_id='buy',home_payload=self.payload(item_id='desk')))
        self.assertEqual(self.storage.value,before)
    async def test_plan_read_apply_restart_undo_and_cross_pet_safety(self):
        await self.client.invoke(dict(command='home_buy',request_id='desk',home_payload=self.payload(item_id='desk')))
        before=copy.deepcopy(self.storage.value);plan=await self.client.invoke({'command':'home'})
        self.assertEqual(before,self.storage.value);self.assertGreater(len(plan['home_candidates']),0)
        apply=dict(command='home_apply',request_id='decorate',home_payload=self.payload(1,candidate_id=plan['home_candidates'][0]['id'],reason='A quiet reading corner.'))
        result=await self.client.invoke(apply);self.assertTrue(result['ok']);self.assertIn('desk',result['home']['layout'])
        restarted=GameClient(self.storage);replay=await restarted.invoke(apply);self.assertTrue(replay['replayed'])
        undo=await restarted.invoke(dict(command='home_undo',request_id='undo',home_payload=self.payload(2)));self.assertTrue(undo['ok']);self.assertNotIn('desk',undo['home']['layout']);self.assertEqual(undo['home']['coins'],20)
        other=GameClient(MemoryAPS());await other.invoke({'command':'start','name':'Other','request_id':'other-born'});foreign=await other.invoke({**apply,'request_id':'foreign'});self.assertFalse(foreign['ok'])
