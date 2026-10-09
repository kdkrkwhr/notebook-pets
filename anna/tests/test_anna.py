import asyncio
import copy
import json
import hashlib
import re
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

PLUGIN = Path(__file__).resolve().parents[1] / 'executas' / 'notebuddy'
sys.path.insert(0, str(PLUGIN))
from notebuddy_plugin import GameService, evaluate, SAVE_KEY, MANIFEST, VERSION, READ
from receipts import prefix, META, FORMAT, pack, unpack
from executa_sdk import StorageError
from executa_sdk.storage import STORAGE_ERR_PRECONDITION_FAILED


class MemoryAPS:
    def __init__(self):
        self.document = None
        self.generation = 0
        self.fail = False
        self.conflict_once = False
        self.writes = 0
        self.client_ids = {}

    @property
    def value(self):
        """Fixture convenience: game state; document is the exact stored value."""
        return unpack(self.document)

    @value.setter
    def value(self, value):
        wrapped = isinstance(self.document, dict) and FORMAT in self.document
        self.document = pack(value) if wrapped else value

    async def get(self, key, *, scope):
        assert key == SAVE_KEY and scope == 'tool'
        return {'exists': self.value is not None, 'value': copy.deepcopy(self.document),
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
            self.value[META]['next_sequence'] += 1
            self.value[META]['order'].append('other-agent')
            self.generation += 1
        if if_match is not None and (self.value is None or if_match != str(self.generation)):
            raise StorageError(STORAGE_ERR_PRECONDITION_FAILED, 'Conflict')
        self.document = copy.deepcopy(value)
        self.generation += 1
        self.writes += 1
        return {'etag': str(self.generation)}


class GameClient(GameService):
    """Test caller issuing sequenced IDs, preserving each ID across retries.

    Uses the fixture snapshot instead of a status RPC so storage-race fixtures
    can pause the first *service* read. Raw protocol tests use GameService.
    """
    def __init__(self, storage):
        super().__init__(storage)
        self.client_lock = asyncio.Lock()

    async def invoke(self, args, context=None):
        async with self.client_lock:
            if isinstance(args, dict) and args.get('command') not in READ:
                event = args.get('request_id')
                if isinstance(event, str) and re.fullmatch(r'[A-Za-z0-9:_-]{1,100}', event) and not event.startswith('nb2:'):
                    event = self.storage.client_ids.setdefault(event, prefix(self.storage.value) + hashlib.sha256(event.encode()).hexdigest()[:32])
                    args = {**args, 'request_id': event}
            return await super().invoke(args, context)


class AdapterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage = MemoryAPS()
        self.service = GameClient(self.storage)

    async def start(self):
        out = await self.service.invoke({'command':'start','name':'모찌','request_id':'birth'})
        self.assertTrue(out['ok'], out)
        self.assertEqual(out['status']['name'], '모찌')
        return out

    async def test_birth_status_and_process_restart_preserve_identity(self):
        await self.start()
        before = copy.deepcopy(self.storage.value)
        response = await GameClient(self.storage).invoke({'command':'status'})
        self.assertEqual(response['pet_id'], before['pet_id'])
        self.assertEqual(self.storage.value, before)
        self.assertEqual(len(response['album']['entries']), 4)

    async def test_retried_action_awards_once(self):
        await self.start()
        request = {'command':'feed','request_id':'feed-1'}
        first = await self.service.invoke(request)
        before = copy.deepcopy(self.storage.value)
        again = await GameClient(self.storage).invoke(request)
        self.assertTrue(first['ok'], first)
        self.assertEqual(first, again)
        self.assertEqual(self.storage.value, before)
        self.assertEqual(self.storage.writes, 2)

    async def test_conflict_reloads_and_preserves_other_action(self):
        await self.start()
        self.storage.conflict_once = True
        response = await self.service.invoke({'command':'feed','request_id':'feed-conflict'})
        self.assertFalse(response['ok'], response)
        self.assertEqual(response['code'], 'request_expired')
        response = await self.service.invoke({'command':'feed','request_id':'fresh-feed'})
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
        second = await GameClient(other).invoke({'command':'start','name':'구름','request_id':'birth'})
        self.assertNotEqual(first['pet_id'], second['pet_id'])
        self.assertEqual(self.storage.value['name'], '모찌')


class ProtocolTests(unittest.TestCase):
    def test_distribution_manifest_declares_storage_and_matches_protocol(self):
        manifest = json.loads((PLUGIN / 'manifest.json').read_text(encoding='utf-8'))
        distribution = json.loads((PLUGIN / 'executa.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest, MANIFEST)
        self.assertEqual(distribution['version'], VERSION)
        self.assertIn('aps.kv', manifest['host_capabilities'])
        self.assertEqual(manifest['storage']['scopes'], {'tool': 'rw'})

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
            send({'id':4,'method':'invoke','params':{'tool':'game','arguments':{
                'command':'start','name':'Wire test','request_id':'nb2:0:birth'},
                'context':{'invoke_id':'trusted-birth'}}})
            for _ in range(2):  # initial read, then the first-write recheck
                reverse = json.loads(process.stdout.readline())
                self.assertEqual(reverse['method'], 'storage/get')
                self.assertEqual(reverse['params']['context']['invoke_id'], 'trusted-birth')
                send({'id':reverse['id'],'result':{'exists':False,'value':None}})
            reverse = json.loads(process.stdout.readline())
            self.assertEqual(reverse['method'], 'storage/set')
            stored = reverse['params']['value']
            self.assertEqual(stored[FORMAT], 2)
            self.assertEqual(stored['game'][META]['next_sequence'], 1)
            self.assertEqual(len(stored['game']['processed_requests']), 1)
            send({'id':reverse['id'],'result':{'etag':'committed','generation':1}})
            result = json.loads(process.stdout.readline())
            self.assertTrue(result['result']['data']['ok'])
            self.assertEqual(result['result']['data']['request_id_prefix'], 'nb2:1:')
            send({'id':5,'method':'invoke','params':{'tool':'game','arguments':{'command':'status'},
                'context':{'invoke_id':'trusted-read'}}})
            reverse = json.loads(process.stdout.readline())
            self.assertEqual(reverse['method'], 'storage/get')
            send({'id':reverse['id'],'result':{'exists':True,'value':stored,'etag':'committed'}})
            result = json.loads(process.stdout.readline())
            self.assertEqual(result['result']['data']['status']['name'], 'Wire test')
            self.assertEqual(result['result']['data']['request_id_prefix'], 'nb2:1:')
            send({'id':6,'method':'invoke','params':{'tool':'privacy','arguments':{'action':'inspect'},
                'context':{'invoke_id':'privacy-preview'}}})
            reverse = json.loads(process.stdout.readline())
            self.assertEqual(reverse['method'], 'storage/get')
            send({'id':reverse['id'],'result':{'exists':True,'value':stored,'etag':'committed'}})
            result = json.loads(process.stdout.readline())
            self.assertEqual(result['result']['tool'], 'privacy')
            self.assertEqual(result['result']['data']['etag'], 'committed')
            send({'id':7,'method':'invoke','params':{'tool':'privacy','arguments':{
                'action':'erase','confirmation':'DELETE NOTEBUDDY','expected_etag':'committed'},
                'context':{'invoke_id':'privacy-erase'}}})
            reverse = json.loads(process.stdout.readline())
            self.assertEqual(reverse['method'], 'storage/get')
            send({'id':reverse['id'],'result':{'exists':True,'value':stored,'etag':'committed'}})
            reverse = json.loads(process.stdout.readline())
            self.assertEqual(reverse['method'], 'storage/set')
            self.assertEqual(reverse['params']['scope'], 'tool')
            self.assertEqual(reverse['params']['if_match'], 'committed')
            self.assertEqual(reverse['params']['context']['invoke_id'], 'privacy-erase')
            self.assertEqual(reverse['params']['value'], {'_notebuddy_erased':1})
            send({'id':reverse['id'],'result':{'etag':'removed','generation':2}})
            result = json.loads(process.stdout.readline())
            self.assertTrue(result['result']['data']['erased'])
            send({'id':8,'method':'shutdown'})
            self.assertEqual(json.loads(process.stdout.readline())['id'],8)
            process.wait(timeout=5)
        finally:
            if process.poll() is None:
                process.kill()
            process.communicate(timeout=5)


if __name__ == '__main__':
    unittest.main()
