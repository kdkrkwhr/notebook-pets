import asyncio
import copy
import unittest
from test_anna import MemoryAPS, GameClient
from notebuddy_plugin import GameService, evaluate
from privacy import TOMBSTONE
from receipts import prefix


class PrivacyTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.store = MemoryAPS()
        self.client = GameClient(self.store)
        await self.client.invoke({'command':'start','name':'Private name','request_id':'birth'})
        self.service = GameService(self.store)

    async def preview(self):
        return await self.service.privacy({'action':'inspect'})

    async def erase(self, etag):
        return await self.service.privacy({'action':'erase','confirmation':'DELETE NOTEBUDDY','expected_etag':etag})

    async def test_confirmation_stale_preview_and_foreign_arguments_do_not_mutate(self):
        preview=await self.preview()
        for args in ({'action':'erase','confirmation':'delete','expected_etag':preview['etag']},
                     {'action':'erase','confirmation':'DELETE NOTEBUDDY'},
                     {'action':'inspect','user_id':'another-account'}):
            with self.assertRaises(ValueError):await self.service.privacy(args)
        await self.client.invoke({'command':'feed','request_id':'feed'})
        before=copy.deepcopy(self.store.document)
        self.assertEqual((await self.erase(preview['etag']))['code'],'removal_changed')
        self.assertEqual(before,self.store.document)

    async def test_removal_drops_name_receipts_progress_and_blocks_all_play_and_replay(self):
        event=prefix(self.store.value)+'late-feed'
        preview=await self.preview()
        self.assertTrue((await self.erase(preview['etag']))['erased'])
        self.assertEqual(self.store.document,TOMBSTONE)
        self.assertEqual(set(await self.preview()),{'ok','exists','erased','etag'})
        # Retry after a lost removal response is safe with the same preview.
        self.assertTrue((await self.erase(preview['etag']))['erased'])
        for command in ('status','album','start','feed','attendance'):
            reply=await GameService(self.store).invoke({'command':command,'request_id':event})
            self.assertTrue(reply['erased'])
            self.assertNotIn('status',reply)
            self.assertNotIn('request_id_prefix',reply)
        self.assertEqual(self.store.document,TOMBSTONE)
        self.assertEqual(evaluate({'command':'start','state':TOMBSTONE,'request_id':'old-client'})['result']['code'],'invalid_state')

    async def test_missing_game_never_uses_unconditional_removal_write(self):
        self.store.document=None
        writes=self.store.writes
        self.assertFalse((await self.preview())['exists'])
        self.assertEqual((await self.erase('old-preview'))['code'],'removal_unavailable')
        self.assertEqual(self.store.writes,writes)
        self.assertIsNone(self.store.document)

    async def test_delayed_existing_save_cannot_restore_after_removal(self):
        original_set=self.store.set
        entered=asyncio.Event();release=asyncio.Event()
        async def paused_set(key,value,**kwargs):
            if value!=TOMBSTONE:
                entered.set();await release.wait()
            return await original_set(key,value,**kwargs)
        self.store.set=paused_set
        event=prefix(self.store.value)+'in-flight'
        task=asyncio.create_task(GameService(self.store).invoke({'command':'feed','request_id':event}))
        try:
            await asyncio.wait_for(entered.wait(),10)
            self.assertTrue((await self.erase((await self.preview())['etag']))['erased'])
        finally:release.set()
        reply=await asyncio.wait_for(task,10)
        self.assertTrue(reply['erased'])
        self.assertEqual(self.store.document,TOMBSTONE)

    async def test_storage_failure_does_not_claim_removal(self):
        preview=await self.preview();before=copy.deepcopy(self.store.document)
        self.store.fail=True
        with self.assertRaises(Exception):await self.erase(preview['etag'])
        self.assertEqual(before,self.store.document)
