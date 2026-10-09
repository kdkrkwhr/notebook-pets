"""Raw adapter integration and bounded-history stress tests; no paid APIs."""
import asyncio
import copy
import hashlib
import unittest
from unittest.mock import patch

from test_anna import MemoryAPS, GameService, evaluate
from receipts import (META, MAX_RECEIPTS, MAX_RECEIPT_BYTES, MAX_SAVE_BYTES,
                      byte_size, prefix, disposition, event_key, commit_result, FORMAT, pack)
from executa_sdk import StorageError


class ReceiptTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage = MemoryAPS()
        self.service = GameService(self.storage)

    async def new(self, command, suffix, **extra):
        status = await self.service.invoke({'command': 'status'})
        request = {'command': command, 'request_id': status['request_id_prefix'] + suffix, **extra}
        return request, await self.service.invoke(request)

    async def start(self):
        return await self.new('start', 'birth', name='Mochi')

    async def test_retained_retry_and_conflicting_payload(self):
        await self.start()
        request, first = await self.new('feed', 'meal')
        before = copy.deepcopy(self.storage.value)
        again = await GameService(self.storage).invoke({**request, 'language': 'ko'})
        conflict = await self.service.invoke({**request, 'command': 'play'})
        self.assertEqual(first['xp_result'], again['xp_result'])
        self.assertEqual(conflict['code'], 'request_conflict')
        self.assertEqual(self.storage.value, before)

    async def test_failure_retry_stays_a_failure_after_conditions_change(self):
        await self.start()
        self.storage.value['inventory']['normal_feed'] = 0
        request, failed = await self.new('feed', 'no-food')
        self.assertEqual(failed['code'], 'no_food')
        self.storage.value['inventory']['normal_feed'] = 3
        before = copy.deepcopy(self.storage.value)
        again = await GameService(self.storage).invoke(request)
        self.assertEqual(again['code'], 'no_food')
        self.assertEqual(self.storage.value, before)

    async def test_evicted_ids_cannot_execute_even_after_restart(self):
        await self.start()
        request, _ = await self.new('feed', 'old-meal')
        # Fill the bounded window with real engine outcomes; these failures are
        # intentionally cached, avoiding clock/cooldown manipulation.
        for n in range(MAX_RECEIPTS + 2):
            await self.new('start', f'existing-{n}', name='Still Mochi')
        before = copy.deepcopy(self.storage.value)
        result = await GameService(self.storage).invoke(request)
        self.assertEqual(result['code'], 'request_expired')
        self.assertEqual(self.storage.value, before)
        self.assertEqual(before['xp'], 10)
        self.assertLessEqual(len(before['processed_requests']), MAX_RECEIPTS)
        self.assertLessEqual(byte_size(before['processed_requests']), MAX_RECEIPT_BYTES)
        self.assertLessEqual(byte_size(before), MAX_SAVE_BYTES)

    async def test_two_agents_same_sequence_different_actions_only_one_commits(self):
        await self.start()
        current = prefix(self.storage.value)
        results = await asyncio.gather(
            GameService(self.storage).invoke({'command': 'feed', 'request_id': current + 'a'}),
            GameService(self.storage).invoke({'command': 'attendance', 'request_id': current + 'b'}))
        self.assertEqual(sum(r['ok'] for r in results), 1)
        self.assertEqual(sum(r.get('code') == 'request_expired' for r in results), 1)
        self.assertEqual(self.storage.value[META]['next_sequence'], 2)
        self.assertEqual(self.storage.writes, 2)

    async def test_lost_write_response_replays_committed_result(self):
        class LostResponse(MemoryAPS):
            lose = False

            async def set(self, *args, **kwargs):
                result = await super().set(*args, **kwargs)
                if self.lose:
                    self.lose = False
                    raise StorageError(-32030, 'Response lost after commit')
                return result

        storage = LostResponse()
        service = GameService(storage)
        await service.invoke({'command': 'start', 'request_id': 'nb2:0:birth'})
        storage.lose = True
        request = {'command': 'feed', 'request_id': 'nb2:1:meal'}
        with self.assertRaises(StorageError):
            await service.invoke(request)
        again = await GameService(storage).invoke(request)
        self.assertTrue(again['ok'])
        self.assertEqual(storage.value['xp'], 10)
        self.assertEqual(storage.value[META]['next_sequence'], 2)
        self.assertEqual(storage.writes, 2)

    async def test_uncommitted_write_failure_preserves_sequence_and_receipts(self):
        await self.start()
        before = copy.deepcopy(self.storage.value)
        self.storage.fail = True
        request = {'command': 'feed', 'request_id': prefix(before) + 'meal'}
        with self.assertRaises(StorageError):
            await self.service.invoke(request)
        self.assertEqual(self.storage.value, before)
        self.storage.fail = False
        result = await GameService(self.storage).invoke(request)
        self.assertTrue(result['ok'])
        self.assertEqual(self.storage.value['xp'], 10)

    async def test_large_legacy_save_migrates_without_losing_progress(self):
        legacy = evaluate({'command': 'start', 'name': 'Legacy', 'request_id': event_key('legacy-birth')})['state']
        receipt = next(iter(legacy['processed_requests'].values()))
        legacy['processed_requests'].update({event_key(f'legacy-{i}'): copy.deepcopy(receipt) for i in range(2000)})
        self.storage.value = legacy
        self.storage.generation = 1
        before = copy.deepcopy(legacy)
        replay = await self.service.invoke({'command': 'start', 'name': 'Legacy', 'request_id': 'legacy-birth'})
        self.assertTrue(replay['ok'])
        self.assertEqual(self.storage.value, before)  # reads/retries do not migrate
        unknown = await self.service.invoke({'command': 'feed', 'request_id': 'never-issued'})
        self.assertEqual(unknown['code'], 'request_expired')
        _, result = await self.new('feed', 'migration')
        self.assertTrue(result['ok'])
        self.assertEqual(self.storage.value['pet_id'], legacy['pet_id'])
        self.assertEqual(self.storage.value['history'], legacy['history'])
        self.assertEqual(self.storage.value['xp'], 10)
        self.assertLessEqual(byte_size(self.storage.document), MAX_SAVE_BYTES)
        self.assertLessEqual(len(self.storage.value['processed_requests']), MAX_RECEIPTS)
        forgotten = next(k for k in before['processed_requests'] if k not in self.storage.value['processed_requests'])
        raw = next('legacy-birth' if i == -1 else f'legacy-{i}' for i in range(-1, 2000)
                   if event_key('legacy-birth' if i == -1 else f'legacy-{i}') == forgotten)
        current = copy.deepcopy(self.storage.value)
        response = await self.service.invoke({'command': 'start', 'request_id': raw, 'name': 'Legacy'})
        self.assertEqual(response['code'], 'request_expired')
        self.assertEqual(self.storage.value, current)

    async def test_future_noncanonical_and_legacy_ids_never_mutate(self):
        await self.start()
        before = copy.deepcopy(self.storage.value)
        for value in ['nb2:9:future', 'nb2:01:zero', 'nb2:0:unseen', 'old-uuid', 'nb2:9007199254740992:large']:
            result = await self.service.invoke({'command': 'feed', 'request_id': value})
            self.assertEqual(result['code'], 'request_expired')
        self.assertEqual(self.storage.value, before)

    async def test_oversized_nonreceipt_data_never_commits_or_reports_reward(self):
        await self.start()
        self.storage.value['history'][0]['extra'] = 'x' * MAX_SAVE_BYTES
        before = copy.deepcopy(self.storage.value)
        _, result = await self.new('feed', 'oversized')
        self.assertEqual(result['code'], 'save_capacity')
        self.assertNotIn('xp_result', result)
        self.assertEqual(result['status']['xp'], 0)
        self.assertEqual(self.storage.value, before)

    async def test_migrated_save_is_rejected_by_old_engine_and_unknown_envelope(self):
        await self.start()
        self.assertEqual(self.storage.document[FORMAT], 2)
        before = copy.deepcopy(self.storage.document)
        # This is precisely what the previous adapter hands to the engine.
        old = evaluate({'state': self.storage.document, 'command': 'feed', 'request_id': 'old-agent'})
        self.assertEqual(old['result']['code'], 'invalid_state')
        self.assertFalse(old['changed'])
        self.assertEqual(self.storage.document, before)
        self.storage.document[FORMAT] = 999
        with self.assertRaises(ValueError):
            await self.service.invoke({'command': 'status'})
        self.assertEqual(self.storage.document[FORMAT], 999)

    async def test_invalid_sequence_metadata_preserves_original(self):
        await self.start()
        for bad in [None, {'version': 1, 'next_sequence': True, 'order': []},
                    {'version': 1, 'next_sequence': 0, 'order': []}]:
            self.storage.value[META] = bad
            before = copy.deepcopy(self.storage.value)
            with self.assertRaises(ValueError):
                await self.service.invoke({'command': 'feed', 'request_id': 'nb2:0:bad'})
            self.assertEqual(self.storage.value, before)


class ReceiptStressTests(unittest.TestCase):
    def test_ten_thousand_outcomes_stay_bounded_with_explicit_order(self):
        state = evaluate({'command': 'start', 'name': 'Stress'})['state']
        initial = copy.deepcopy(state)
        first_id = 'nb2:0:first'
        for n in range(10000):
            request = first_id if n == 0 else f'nb2:{n}:result'
            self.assertEqual(disposition(state, request), 'new')
            state = commit_result(state, state, request, 'feed', '',
                                  {'ok': True, 'msg': '성장 일기' * 30, 'xp_result': {'gained': 10}})
            # Simulate JSONB changing map key order between invocations.
            state['processed_requests'] = dict(sorted(state['processed_requests'].items()))
        self.assertEqual(state[META]['next_sequence'], 10000)
        self.assertEqual(disposition(state, first_id), 'expired')
        self.assertEqual(disposition(state, 'nb2:9999:result'), 'replay')
        self.assertEqual(state['history'], initial['history'])
        self.assertLessEqual(byte_size(state['processed_requests']), MAX_RECEIPT_BYTES)
        self.assertLessEqual(byte_size(pack(state)), MAX_SAVE_BYTES)
        self.assertLessEqual(len(state['processed_requests']), MAX_RECEIPTS)
