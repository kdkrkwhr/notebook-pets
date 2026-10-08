import asyncio
import copy
import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

PLUGIN = Path(__file__).resolve().parents[1] / 'executas' / 'notebuddy'
sys.path.insert(0, str(PLUGIN))
from notebuddy_plugin import GameService, evaluate, SAVE_KEY
from executa_sdk import StorageError
from executa_sdk.storage import STORAGE_ERR_PRECONDITION_FAILED


class MemoryAPS:
    def __init__(self):
        self.value = None
        self.generation = 0
        self.fail = False
        self.conflict_once = False
        self.writes = 0

    async def get(self, key, *, scope):
        assert key == SAVE_KEY and scope == 'tool'
        return {'exists': self.value is not None, 'value': copy.deepcopy(self.value),
                'etag': str(self.generation) if self.value is not None else None}

    async def set(self, key, value, *, scope, if_match):
        assert key == SAVE_KEY and scope == 'tool'
        if self.fail:
            raise StorageError(-32029, 'Offline')
        if self.conflict_once:
            self.conflict_once = False
            # Simulate a different process committing attendance after our read.
            self.value = evaluate({'state': self.value, 'command': 'attendance',
                                   'request_id': 'other-agent'})['state']
            self.generation += 1
        if if_match is not None and if_match != str(self.generation):
            raise StorageError(STORAGE_ERR_PRECONDITION_FAILED, 'Conflict')
        self.value = copy.deepcopy(value)
        self.generation += 1
        self.writes += 1
        return {'etag': str(self.generation)}


class AdapterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage = MemoryAPS()
        self.service = GameService(self.storage)

    async def start(self):
        out = await self.service.invoke({'command':'start','name':'모찌','request_id':'birth'})
        self.assertTrue(out['ok'], out)
        self.assertEqual(out['status']['name'], '모찌')
        return out

    async def test_birth_status_and_process_restart_preserve_identity(self):
        await self.start()
        before = copy.deepcopy(self.storage.value)
        response = await GameService(self.storage).invoke({'command':'status'})
        self.assertEqual(response['pet_id'], before['pet_id'])
        self.assertEqual(self.storage.value, before)
        self.assertEqual(len(response['album']['entries']), 4)

    async def test_retried_action_awards_once(self):
        await self.start()
        request = {'command':'feed','request_id':'feed-1'}
        first = await self.service.invoke(request)
        before = copy.deepcopy(self.storage.value)
        again = await GameService(self.storage).invoke(request)
        self.assertTrue(first['ok'], first)
        self.assertEqual(first, again)
        self.assertEqual(self.storage.value, before)
        self.assertEqual(self.storage.writes, 2)

    async def test_conflict_reloads_and_preserves_other_action(self):
        await self.start()
        self.storage.conflict_once = True
        response = await self.service.invoke({'command':'feed','request_id':'feed-conflict'})
        self.assertTrue(response['ok'], response)
        self.assertEqual(self.storage.value['daily']['attendance'], 1)
        self.assertEqual(self.storage.value['daily']['feed'], 1)
        self.assertEqual(self.storage.value['xp'], 60)

    async def test_storage_failure_never_reports_success(self):
        await self.start()
        before = copy.deepcopy(self.storage.value)
        self.storage.fail = True
        with self.assertRaises(StorageError):
            await self.service.invoke({'command':'feed','request_id':'offline'})
        self.assertEqual(self.storage.value, before)

    async def test_invalid_save_preserved(self):
        self.storage.value = {'name':'do not overwrite'}
        before = copy.deepcopy(self.storage.value)
        result = await self.service.invoke({'command':'start','request_id':'broken'})
        self.assertFalse(result['ok'])
        self.assertEqual(self.storage.value, before)
        self.assertEqual(self.storage.writes, 0)

    async def test_commands_cannot_choose_actor_or_replace_game(self):
        for args in [{'command':'reset'}, {'command':'rank'}, {'command':'status','user_id':'2'},
                     {'command':'start','state':{}}, {'command':'feed'},
                     {'command':'feed','name':'rename'}, {'command':'start','name':'x'*25}]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                await self.service.invoke(args)

    async def test_parallel_daily_actions_enforce_limit(self):
        await self.start()
        results = await asyncio.gather(*[self.service.invoke({'command':'snack','request_id':f'snack-{i}'}) for i in range(5)])
        self.assertEqual(sum(result['ok'] for result in results), 3)
        self.assertEqual(self.storage.value['daily']['snack'], 3)

    async def test_separate_authenticated_buckets_isolate_players(self):
        first = await self.start()
        other = MemoryAPS()
        second = await GameService(other).invoke({'command':'start','name':'구름','request_id':'birth'})
        self.assertNotEqual(first['pet_id'], second['pet_id'])
        self.assertEqual(self.storage.value['name'], '모찌')


class ProtocolTests(unittest.TestCase):
    def test_reverse_rpc_and_invocation_context(self):
        process = subprocess.Popen([sys.executable, '-B', '-X', 'utf8', str(PLUGIN / 'notebuddy_plugin.py')],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   text=True, encoding='utf-8')
        def send(frame):
            process.stdin.write(json.dumps({'jsonrpc':'2.0', **frame}) + '\n')
            process.stdin.flush()
        try:
            send({'id':1,'method':'initialize','params':{'protocolVersion':'2.0'}})
            self.assertEqual(json.loads(process.stdout.readline())['result']['protocolVersion'], '2.0')
            send({'id':2,'method':'describe'})
            self.assertEqual(json.loads(process.stdout.readline())['result']['tools'][0]['name'],'game')
            send({'id':3,'method':'invoke','params':{'tool':'game','arguments':{'command':'status'},'context':{'invoke_id':'trusted-event'}}})
            reverse = json.loads(process.stdout.readline())
            self.assertEqual(reverse['method'], 'storage/get')
            self.assertEqual(reverse['params']['scope'], 'tool')
            self.assertEqual(reverse['params']['context']['invoke_id'], 'trusted-event')
            send({'id':reverse['id'],'result':{'exists':False,'value':None}})
            result = json.loads(process.stdout.readline())
            self.assertEqual(result['id'],3)
            self.assertTrue(result['result']['success'])
            self.assertFalse(result['result']['data']['ok'])
            send({'id':4,'method':'shutdown'})
            self.assertEqual(json.loads(process.stdout.readline())['id'],4)
            process.wait(timeout=5)
        finally:
            if process.poll() is None:
                process.kill()
            process.communicate(timeout=5)


if __name__ == '__main__':
    unittest.main()
