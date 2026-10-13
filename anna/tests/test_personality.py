import copy
import json
import unittest
from test_anna import GameClient, GameService, MemoryAPS
from receipts import prefix, byte_size, MAX_SAVE_BYTES

def profile():
    return {'appearance':'a round fictional pet with small ears','source':'starter','traits':{'curiosity':1,'warmth':0,'energy':0,'caution':-1},
        'summary':{'en':'Mochi is playful and soft-looking.','ko':'모찌는 부드럽고 장난스러워요.'},'voice':{'en':'Warm and short','ko':'짧고 다정한 말'},'habit':{'en':'Tilts their head','ko':'고개를 갸웃해요'}}

class PersonalityStorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage=MemoryAPS();self.client=GameClient(self.storage)
        await self.client.invoke({'command':'start','name':'Mochi','request_id':'birth'})

    async def test_actual_worker_saves_profile_and_replays_same_arguments(self):
        args={'command':'personality','profile':json.dumps(profile()),'request_id':prefix(self.storage.value)+'persona'}
        result=await GameService(self.storage).invoke(args);self.assertTrue(result['ok'],result)
        before=copy.deepcopy(self.storage.document)
        replay=await GameService(self.storage).invoke(args);self.assertTrue(replay['replayed']);self.assertEqual(before,self.storage.document)
        altered=profile();altered['traits']['warmth']=1
        bad=await GameService(self.storage).invoke({**args,'profile':json.dumps(altered)})
        self.assertEqual(bad['code'],'request_conflict');self.assertEqual(before,self.storage.document)
        self.assertLess(byte_size(before),MAX_SAVE_BYTES)

    async def test_failed_storage_never_claims_personality_was_set(self):
        before=copy.deepcopy(self.storage.document);self.storage.fail=True
        with self.assertRaises(Exception):await self.client.invoke({'command':'personality','profile':json.dumps(profile()),'request_id':'persona'})
        self.assertEqual(before,self.storage.document)

    async def test_profile_field_is_rejected_on_other_commands(self):
        before=copy.deepcopy(self.storage.document)
        with self.assertRaises(ValueError):await self.client.invoke({'command':'feed','profile':json.dumps(profile()),'request_id':'bad'})
        self.assertEqual(before,self.storage.document)
