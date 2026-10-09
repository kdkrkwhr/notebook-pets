"""Supported APS guarantees, plus protection while a birth is being computed.

The final missing-read/write gap is deliberately NOT claimed safe. See
scripts/reproduce_first_creation_race.py for a deterministic release-blocker probe.
"""
import asyncio
import copy
import unittest

from test_anna import MemoryAPS, GameClient, evaluate, SAVE_KEY
from executa_sdk import StorageError
from executa_sdk.storage import STORAGE_ERR_PRECONDITION_FAILED


class CreationTests(unittest.IsolatedAsyncioTestCase):
    async def test_partner_committed_after_initial_read_is_preserved(self):
        # Two services have independent locks, just like two Anna agents.
        for same_request in (False, True):
            with self.subTest(same_request=same_request):
                observed_missing = asyncio.Event()
                release_read = asyncio.Event()

                class DelayedFirstRead(MemoryAPS):
                    delay = True

                    async def get(self, key, *, scope):
                        snapshot = await super().get(key, scope=scope)
                        if self.delay:
                            self.delay = False
                            observed_missing.set()
                            await asyncio.wait_for(release_read.wait(), 10)
                        return snapshot

                storage = DelayedFirstRead()
                request = {'command': 'start', 'name': 'Original', 'request_id': 'birth'}
                delayed = asyncio.create_task(GameClient(storage).invoke(
                    request if same_request else {**request, 'name': 'Late', 'request_id': 'other-birth'}))
                try:
                    await asyncio.wait_for(observed_missing.wait(), 10)
                    winner = GameClient(storage)
                    born = await winner.invoke(request)
                    await winner.invoke({'command': 'feed', 'request_id': 'first-meal'})
                    before = copy.deepcopy(storage.value)
                    release_read.set()
                    result = await asyncio.wait_for(delayed, 10)
                    self.assertEqual(result['ok'], same_request)
                    if not same_request:
                        self.assertEqual(result['code'], 'request_expired')
                    self.assertEqual(result['pet_id'], born['pet_id'])
                    self.assertEqual(result['status']['xp'], 10)
                    self.assertEqual(storage.value, before)
                    self.assertEqual(storage.writes, 2)
                finally:
                    release_read.set()
                    if not delayed.done():
                        delayed.cancel()
                    await asyncio.gather(delayed, return_exceptions=True)

    async def test_recheck_failure_never_writes_a_new_partner(self):
        class UnavailableRecheck(MemoryAPS):
            reads = 0

            async def get(self, key, *, scope):
                self.reads += 1
                if self.reads == 2:
                    raise StorageError(-32029, 'Offline')
                return await super().get(key, scope=scope)

        storage = UnavailableRecheck()
        with self.assertRaises(StorageError):
            await GameClient(storage).invoke({'command': 'start', 'request_id': 'birth'})
        self.assertIsNone(storage.value)
        self.assertEqual(storage.writes, 0)

    async def test_existing_invalid_save_at_recheck_is_never_replaced(self):
        class InvalidWinner(MemoryAPS):
            reads = 0

            async def get(self, key, *, scope):
                self.reads += 1
                if self.reads == 2:
                    self.value = {'name': 'preserve this invalid save'}
                    self.generation += 1
                return await super().get(key, scope=scope)

        storage = InvalidWinner()
        result = await GameClient(storage).invoke({'command': 'start', 'request_id': 'birth'})
        self.assertFalse(result['ok'])
        self.assertEqual(result['code'], 'invalid_state')
        self.assertEqual(storage.value, {'name': 'preserve this invalid save'})
        self.assertEqual(storage.writes, 0)

    async def test_first_insert_conflict_reloads_the_winner(self):
        class InsertConflict(MemoryAPS):
            async def set(self, key, value, *, scope, if_match):
                if self.value is None:
                    self.value = evaluate({'command': 'start', 'name': 'Winner',
                                           'request_id': 'other-birth'})['state']
                    self.generation += 1
                    raise StorageError(STORAGE_ERR_PRECONDITION_FAILED, 'Concurrent insert')
                return await super().set(key, value, scope=scope, if_match=if_match)

        storage = InsertConflict()
        result = await GameClient(storage).invoke({'command': 'start', 'name': 'Late', 'request_id': 'birth'})
        self.assertFalse(result['ok'])
        self.assertEqual(result['code'], 'already_started')
        self.assertEqual(result['status']['name'], 'Winner')
        self.assertEqual(storage.writes, 1)

    async def test_missing_or_stale_etag_cannot_authorize_a_write(self):
        storage = MemoryAPS()
        for etag in ('', '0', '*', 'stale'):
            with self.subTest(etag=etag), self.assertRaises(StorageError) as caught:
                await storage.set(SAVE_KEY, {'name': 'no'}, scope='tool', if_match=etag)
            self.assertEqual(caught.exception.code, STORAGE_ERR_PRECONDITION_FAILED)
        self.assertIsNone(storage.value)
        await GameClient(storage).invoke({'command': 'start', 'request_id': 'birth'})
        before = copy.deepcopy(storage.value)
        for etag in ('', '*', 'stale'):
            with self.subTest(etag=etag), self.assertRaises(StorageError):
                await storage.set(SAVE_KEY, {}, scope='tool', if_match=etag)
        self.assertEqual(storage.value, before)

    async def test_independent_services_retry_one_meal_only_once(self):
        storage = MemoryAPS()
        await GameClient(storage).invoke({'command': 'start', 'request_id': 'birth'})
        args = {'command': 'feed', 'request_id': 'shared-meal'}
        results = await asyncio.gather(*(GameClient(storage).invoke(args) for _ in range(2)))
        self.assertTrue(all(result['ok'] for result in results))
        self.assertEqual(storage.value['xp'], 10)
        self.assertEqual(storage.value['inventory']['normal_feed'], 2)
        self.assertEqual(storage.writes, 2)

    async def test_exhausted_conflicts_preserve_save_and_report_failure(self):
        class AlwaysConflicts(MemoryAPS):
            reject = False
            rejected = 0

            async def set(self, key, value, *, scope, if_match):
                if self.reject:
                    self.rejected += 1
                    raise StorageError(STORAGE_ERR_PRECONDITION_FAILED, 'Conflict')
                return await super().set(key, value, scope=scope, if_match=if_match)

        storage = AlwaysConflicts()
        await GameClient(storage).invoke({'command': 'start', 'request_id': 'birth'})
        before = copy.deepcopy(storage.value)
        storage.reject = True
        with self.assertRaises(StorageError):
            await GameClient(storage).invoke({'command': 'feed', 'request_id': 'meal'})
        self.assertEqual(storage.rejected, 3)
        self.assertEqual(storage.value, before)
        self.assertEqual(storage.writes, 1)
