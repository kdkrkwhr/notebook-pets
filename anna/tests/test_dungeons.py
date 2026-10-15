"""Dungeon results use the same private APS transaction and receipt protocol."""
import copy
import unittest
from test_anna import GameClient, GameService, MemoryAPS
from receipts import prefix, byte_size, MAX_SAVE_BYTES


class DungeonStorageTests(unittest.IsolatedAsyncioTestCase):
    async def test_final_reward_is_atomic_replayed_and_private(self):
        first=await self.client.invoke({'command':'explore_hellgate','request_id':'entry'})
        ex=self.storage.value['dungeons']['expedition']
        ex.update(index=ex['room_count']-1,event='fork')
        request={'command':'dungeon_safe','choice_id':ex['choice_id'],'request_id':'final'}
        before=copy.deepcopy(self.storage.document)
        self.storage.fail=True
        with self.assertRaises(Exception):await self.client.invoke(request)
        self.assertEqual(self.storage.document,before)
        self.storage.fail=False
        result=await self.client.invoke(request)
        self.assertEqual(result['dungeon_run']['item_awarded'],'ember-horns')
        self.assertEqual(result['status']['collectibles'],{'ember-horns':1})
        before=copy.deepcopy(self.storage.document)
        replay=await GameClient(self.storage).invoke(request)
        self.assertEqual(replay['dungeon_run'],result['dungeon_run'])
        self.assertEqual(self.storage.document,before)
        self.assertEqual((await GameClient(MemoryAPS()).invoke({'command':'start','name':'Other','request_id':'other'}))['status']['collectibles'],{})
        self.assertLess(byte_size(self.storage.document),MAX_SAVE_BYTES)

    async def asyncSetUp(self):
        self.storage = MemoryAPS()
        self.client = GameClient(self.storage)
        response = await self.client.invoke({'command':'start','name':'Explorer','request_id':'birth'})
        self.storage.value['dungeons'] = {'date':response['status']['dungeons']['date'],
                'discovered':['hellgate','icekingdom','dreamforest'], 'cleared':[], 'misses':0, 'last_run':None}
        self.storage.value['training_bonus'] = {'atk':100,'def':100,'hp':100}


    async def test_lost_entry_and_choice_replay_without_double_cost(self):
        args={'command':'explore_hellgate','request_id':prefix(self.storage.value)+'entry'}
        first=await GameService(self.storage).invoke(args)
        self.assertTrue(first['ok'],first)
        before=copy.deepcopy(self.storage.document)
        again=await GameService(self.storage).invoke({**args,'language':'ko'})
        self.assertEqual(first['dungeon_visit'],again['dungeon_visit'])
        self.assertEqual(self.storage.document,before)
        choice={'command':'dungeon_safe','choice_id':first['dungeon_visit']['choice_id'],'request_id':prefix(self.storage.value)+'choice'}
        result=await GameService(self.storage).invoke(choice)
        self.assertTrue(result['ok'],result)
        before=copy.deepcopy(self.storage.document)
        replay=await GameService(self.storage).invoke(choice)
        self.assertTrue(replay['replayed'])
        self.assertEqual(result['dungeon_run'],replay['dungeon_run'])
        self.assertEqual(self.storage.document,before)
        self.assertEqual(result['status']['walk_energy']['charges'],4)
        self.assertLess(byte_size(self.storage.document),MAX_SAVE_BYTES)

    async def test_failed_storage_preserves_charge_and_pending_choice(self):
        before=copy.deepcopy(self.storage.document);self.storage.fail=True
        with self.assertRaises(Exception):await self.client.invoke({'command':'explore_icekingdom','request_id':'entry'})
        self.assertEqual(self.storage.document,before);self.storage.fail=False
        first=await self.client.invoke({'command':'explore_icekingdom','request_id':'entry'})
        before=copy.deepcopy(self.storage.document);self.storage.fail=True
        with self.assertRaises(Exception):await self.client.invoke({'command':'dungeon_risk','choice_id':first['dungeon_visit']['choice_id'],'request_id':'choice'})
        self.assertEqual(self.storage.document,before)

    async def test_choices_are_private_and_stale_tokens_cannot_affect_next_stage(self):
        first=await self.client.invoke({'command':'explore_dreamforest','request_id':'entry'})
        token=first['dungeon_visit']['choice_id']
        await self.client.invoke({'command':'dungeon_safe','choice_id':token,'request_id':'choice'})
        await self.client.invoke({'command':'explore_dreamforest','request_id':'next'})
        stale=await self.client.invoke({'command':'dungeon_risk','choice_id':token,'request_id':'stale'})
        self.assertEqual(stale['code'],'dungeon_choice_stale')
        self.assertEqual(stale['status']['walk_energy']['charges'],3)
        other=await GameClient(MemoryAPS()).invoke({'command':'start','name':'Other','request_id':'birth'})
        self.assertFalse(other['status']['dungeons']['expedition'])
