"""Dungeon results use the same private APS transaction and receipt protocol."""
import copy
import unittest
from test_anna import GameClient, GameService, MemoryAPS
from receipts import prefix, byte_size, MAX_SAVE_BYTES


class DungeonStorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage = MemoryAPS()
        self.client = GameClient(self.storage)
        response = await self.client.invoke({'command':'start','name':'Explorer','request_id':'birth'})
        self.storage.value['dungeons'] = {'date':response['status']['dungeons']['date'],
                'discovered':['hellgate','icekingdom','dreamforest'], 'cleared':[], 'misses':0, 'last_run':None}
        self.storage.value['training_bonus'] = {'atk':100,'def':100,'hp':100}

    async def test_lost_result_replays_after_process_restart_without_double_cost(self):
        args = {'command':'explore_hellgate','request_id':prefix(self.storage.value)+'entry'}
        first = await GameService(self.storage).invoke(args)
        self.assertTrue(first['ok'],first)
        self.assertEqual(first['dungeon_run']['coins_awarded'],10)
        before = copy.deepcopy(self.storage.document)
        second = await GameService(self.storage).invoke({**args,'language':'ko'})
        self.assertTrue(second['replayed'])
        self.assertEqual(first['dungeon_run'],second['dungeon_run'])
        self.assertEqual(self.storage.document,before)
        self.assertEqual(second['status']['walk_energy']['charges'],4)
        self.assertIn('코인 +10',second['msg'])
        self.assertLess(byte_size(self.storage.document),MAX_SAVE_BYTES)

    async def test_failed_storage_never_grants_coins_or_spends_charge(self):
        before = copy.deepcopy(self.storage.document)
        self.storage.fail = True
        with self.assertRaises(Exception):
            await self.client.invoke({'command':'explore_icekingdom','request_id':'entry'})
        self.assertEqual(self.storage.document,before)
        self.storage.fail = False
        result = await self.client.invoke({'command':'explore_icekingdom','request_id':'entry'})
        self.assertEqual(result['status']['dungeons']['coins'],10)

    async def test_dungeon_state_is_private_and_newly_cleared_entry_is_rejected(self):
        await self.client.invoke({'command':'explore_dreamforest','request_id':'entry'})
        result = await self.client.invoke({'command':'explore_dreamforest','request_id':'again'})
        self.assertEqual(result['code'],'dungeon_cleared')
        self.assertEqual(result['status']['walk_energy']['charges'],4)
        other = await GameClient(MemoryAPS()).invoke({'command':'start','name':'Other','request_id':'birth'})
        self.assertEqual(other['status']['dungeons']['coins'],0)
        self.assertIsNone(other['status']['dungeons']['last_run'])
        self.assertFalse(any(x['discovered'] for x in other['status']['dungeons']['entries']))
