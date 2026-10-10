import copy
import unittest
from test_anna import MemoryAPS, GameClient
from notebuddy_plugin import GameService, evaluate
from receipts import prefix, unpack
from privacy import TOMBSTONE

class ResetTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.store=MemoryAPS();self.client=GameClient(self.store)
        await self.client.invoke({'command':'start','name':'Old friend','request_id':'old-birth'})
        await self.client.invoke({'command':'feed','request_id':'old-feed'})
        self.service=GameService(self.store)
        self.old=copy.deepcopy(self.store.document)
        self.old_id=(await self.service.invoke({'command':'status'}))['pet_id']
        self.late=prefix(self.store.value)+'old-action'
        preview=await self.service.reset({'action':'inspect'})
        self.args={'action':'begin','confirmation':'RESET NOTEBUDDY','expected_etag':preview['etag'],'reset_id':'unique-reset-123456','name':'New friend'}

    async def finish(self):
        return await self.service.reset({'action':'finish','reset_id':self.args['reset_id']})

    async def test_new_partner_and_no_old_progress_after_confirmed_reset(self):
        result=await self.service.reset(self.args);self.assertTrue(result['reset_pending'])
        new_id=self.store.document['game']['pet_id']
        self.assertNotEqual(new_id,unpack(self.old)['pet_id'])
        for command in ('status','feed','start'):
            blocked=await GameService(self.store).invoke({'command':command,'request_id':self.late})
            self.assertTrue(blocked['reset_pending'])
        self.assertEqual(evaluate({'command':'start','state':self.store.document})['result']['code'],'invalid_state')
        self.assertTrue((await self.finish())['reset_complete'])
        state=await self.service.invoke({'command':'status'})
        self.assertEqual(state['status']['name'],'New friend');self.assertEqual(state['status']['xp'],0)
        self.assertNotEqual(state['pet_id'],self.old_id)
        self.assertEqual((await self.service.invoke({'command':'feed','request_id':self.late}))['code'],'request_expired')
        self.assertNotIn('Old friend',str(self.store.document))

    async def test_confirmation_stale_etag_missing_game_and_erasure_preserve_data(self):
        for extra in ({'confirmation':'wrong'},{'name':''},{'user_id':'other'}):
            with self.assertRaises(ValueError):await self.service.reset({**self.args,**extra})
        self.assertEqual(self.old,self.store.document)
        self.assertEqual((await self.service.reset({**self.args,'expected_etag':'stale'}))['code'],'reset_changed')
        self.store.document=None
        self.assertEqual((await self.service.reset(self.args))['code'],'reset_unavailable')
        self.store.document=TOMBSTONE
        self.assertEqual((await self.service.reset({**self.args,'expected_etag':'stale'}))['code'],'reset_changed');self.assertEqual(self.store.document,TOMBSTONE)

    async def test_lost_begin_and_finish_replies_do_not_reroll_or_erase_new_progress(self):
        original=self.store.set
        async def lost(*args,**kwargs):
            await original(*args,**kwargs);raise RuntimeError('lost reply')
        self.store.set=lost
        with self.assertRaises(RuntimeError):await self.service.reset(self.args)
        candidate=copy.deepcopy(self.store.document)
        self.store.set=original
        self.assertTrue((await GameService(self.store).reset(self.args))['reset_pending'])
        self.assertEqual(candidate,self.store.document)
        self.store.set=lost
        with self.assertRaises(RuntimeError):await self.finish()
        self.store.set=original
        await self.client.invoke({'command':'feed','request_id':'new-feed'})
        progressed=copy.deepcopy(self.store.document)
        self.assertTrue((await self.finish())['reset_complete'])
        self.assertTrue((await self.service.reset(self.args))['reset_complete'])
        self.assertEqual(progressed,self.store.document)

    async def test_concurrent_reset_or_delayed_old_action_cannot_overwrite_new_game(self):
        await self.service.reset(self.args)
        competing={**self.args,'reset_id':'other-reset-123456'}
        self.assertEqual((await GameService(self.store).reset(competing))['code'],'reset_changed')
        with self.assertRaises(Exception):await self.store.set('notebuddy/game-v1',self.old,scope='tool',if_match=self.args['expected_etag'])
        self.assertFalse((await self.service.reset({'action':'finish','reset_id':'other-reset-123456'}))['ok'])

    async def test_storage_failure_and_invalid_save_are_preserved(self):
        self.store.fail=True
        with self.assertRaises(Exception):await self.service.reset(self.args)
        self.assertEqual(self.store.document,self.old)
        self.store.fail=False;self.store.document={'broken':True}
        self.assertEqual((await self.service.reset(self.args))['code'],'reset_unavailable')

    async def test_removed_restart_has_fresh_epoch_and_never_accepts_old_requests(self):
        from receipts import FORMAT, META
        self.store.document=copy.deepcopy(TOMBSTONE)
        preview=await self.service.reset({'action':'inspect'})
        self.assertTrue(preview['erased']);self.assertTrue(preview['restart_allowed'])
        self.args['expected_etag']=preview['etag']
        await self.service.reset(self.args)
        pending=copy.deepcopy(self.store.document)
        self.assertTrue((await self.service.reset({'action':'inspect'}))['reset_from_erasure'])
        self.assertTrue((await self.service.reset(self.args))['reset_pending'])
        self.assertEqual(pending,self.store.document)
        self.assertTrue((await self.service.invoke({'command':'status'}))['reset_pending'])
        await self.finish()
        self.assertEqual(self.store.document[FORMAT],3)
        current=await self.service.invoke({'command':'status'})
        self.assertEqual(current['status']['xp'],0)
        self.assertNotEqual(current['pet_id'],self.old_id)
        self.assertTrue(current['request_id_prefix'].startswith('nb3:'))
        for request in [self.late,'nb2:1:late','nb3:'+'0'*32+':1:late']:
            result=await self.service.invoke({'command':'feed','request_id':request})
            self.assertEqual(result['code'],'request_expired')
        event=current['request_id_prefix']+'new-meal'
        result=await self.service.invoke({'command':'feed','request_id':event})
        self.assertTrue(result['ok']);self.assertEqual(result['status']['xp'],10)
        self.assertTrue((await self.service.invoke({'command':'feed','request_id':event}))['replayed'])
        self.assertEqual(self.store.document[FORMAT],3)
        epoch=self.store.value[META]['epoch']
        preview=await self.service.reset({'action':'inspect'})
        self.args.update(expected_etag=preview['etag'],reset_id='second-reset-123456')
        await self.service.reset(self.args);await self.finish()
        self.assertEqual(self.store.value[META]['epoch'],epoch)
        self.assertEqual((await self.service.invoke({'command':'feed','request_id':event}))['code'],'request_expired')

    async def test_removed_restart_rejects_stale_preview_competing_reset_and_finish_only(self):
        self.store.document=copy.deepcopy(TOMBSTONE)
        self.assertEqual((await self.finish())['code'],'reset_changed')
        self.assertEqual((await self.service.reset({**self.args,'expected_etag':'stale'}))['code'],'reset_changed')
        self.assertEqual(self.store.document,TOMBSTONE)
        await self.service.reset(self.args)
        candidate=copy.deepcopy(self.store.document)
        other={**self.args,'reset_id':'competing-12345678'}
        self.assertEqual((await self.service.reset(other))['code'],'reset_changed')
        self.assertEqual(self.store.document,candidate)
