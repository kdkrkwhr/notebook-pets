import asyncio
from contextlib import closing
import base64
from io import BytesIO
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from PIL import Image
from executa_sdk import StorageError
from desktop.app import Dialogs, instance_lock
from desktop.codex import Codex, AIError
from desktop.runtime import Runtime
from desktop.server import make_server
from desktop.storage import Storage, portrait_path
from desktop.pet import DesktopPet, Walk, decode_frames


def png():
    out = BytesIO(); Image.new('RGB', (64, 64), '#76aa65').save(out, format='PNG'); return out.getvalue()


class DesktopTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.runtime = Runtime(self.root)

    def tearDown(self):
        self.runtime.close(); self.temp.cleanup()

    def start(self):
        initial = self.runtime.invoke('game', {'command': 'status'})
        return self.runtime.invoke('game', {'command': 'start', 'name': '설치 친구', 'request_id': initial['request_id_prefix'] + 'start'})

    def test_replay_and_restart_preserve_real_game(self):
        pet = self.start()
        args = {'command': 'feed', 'request_id': pet['request_id_prefix'] + 'feed'}
        first = self.runtime.invoke('game', args)
        again = self.runtime.invoke('game', args)
        self.assertTrue(again['replayed'])
        self.assertEqual(first['inventory'], again['inventory'])
        self.runtime.close(); self.runtime = Runtime(self.root)
        loaded = self.runtime.invoke('game', {'command': 'status'})
        self.assertEqual(loaded['pet_id'], pet['pet_id'])
        self.assertEqual(loaded['inventory'], first['inventory'])
        self.assertEqual(loaded['status']['name'], '설치 친구')

    def test_storage_compare_and_swap_and_scopes(self):
        store = self.runtime.storage
        row = self.runtime.wait(store.set('test', {'one': 1}))
        self.runtime.wait(store.set('test', {'two': 2}, if_match=row['etag']))
        with self.assertRaises(StorageError) as conflict:
            self.runtime.wait(store.set('test', {}, if_match=row['etag']))
        self.assertEqual(conflict.exception.code, -32023)
        self.assertFalse(self.runtime.wait(store.get('test', scope='tool'))['exists'])

    def test_file_backup_and_conditional_delete(self):
        pet = self.start(); store = self.runtime.storage
        entry = store.put_file('portraits/test.png', png())
        self.assertEqual(store.get_file('portraits/test.png')[0], png())
        with self.assertRaises(StorageError):
            store.delete_file('portraits/test.png', 'stale')
        backup = self.root / 'export.sqlite3'; store.backup(backup)
        with closing(sqlite3.connect(backup)) as db:
            self.assertEqual(db.execute('SELECT body FROM files').fetchone()[0], png())
            self.assertIn(pet['pet_id'], db.execute("SELECT value FROM kv WHERE scope='tool'").fetchone()[0])
        store.delete_file('portraits/test.png', entry['etag'])
        self.assertEqual(store.list_files()['items'], [])

    def test_portrait_paths_and_file_types(self):
        for bad in ('../x', 'portraits/../../x', 'portraits/../x', 'portraits//x', 'portraits/x?z'):
            with self.assertRaises(ValueError): portrait_path(bad)
        with self.assertRaises(Exception): self.runtime.storage.put_file('portraits/test.png', b'not an image')

    def test_reset_round_trip(self):
        first = self.start()
        preview = self.runtime.invoke('reset', {'action': 'inspect'})
        result = self.runtime.invoke('reset', {'action': 'begin', 'confirmation': 'RESET NOTEBUDDY', 'expected_etag': preview['etag'], 'reset_id': 'a' * 32})
        self.assertTrue(result['ok'])
        self.assertTrue(self.runtime.invoke('game', {'command': 'status'})['reset_pending'])
        done = self.runtime.invoke('reset', {'action': 'finish', 'reset_id': 'a' * 32})
        self.assertTrue(done['ok'])
        self.assertNotEqual(self.start()['pet_id'], first['pet_id'])

    def test_native_bridge_surface_and_instance_lock(self):
        bridge = Dialogs(self.runtime, 'http://127.0.0.1:1234', self.root)
        self.assertEqual([x for x in vars(bridge) if not x.startswith('_')], [])
        with instance_lock(self.root):
            with self.assertRaises(RuntimeError):
                with instance_lock(self.root): pass

    def test_desktop_pet_identity_tracks_actual_portrait_and_reset(self):
        first = self.start()
        pet = DesktopPet(self.runtime, None)
        initial = pet.current_identity()
        self.assertEqual(initial[:2], [first['pet_id'], first['stage']])
        owner = first['pet_id']
        self.runtime.wait(self.runtime.storage.set('notebuddy/art-v1', {
            f'{owner}/stage-1': {'path': f'portraits/{owner}/one.png'},
            f'{owner}/home-sprite-stage-1': {'format': 'home-sprite-v1', 'pet_id': owner, 'stage': 1,
                'source_path': 'old.png', 'path': f'portraits/{owner}/old-sheet.png'}}))
        self.assertEqual(pet.current_identity(), [owner, 1, f'portraits/{owner}/one.png', ''])
        with self.assertRaises(ValueError): pet.summon({'identity': initial, 'frames': []})
        preview = self.runtime.invoke('reset', {'action': 'inspect'})
        self.runtime.invoke('reset', {'action': 'begin', 'confirmation': 'RESET NOTEBUDDY', 'expected_etag': preview['etag'], 'reset_id': 'b' * 32})
        self.assertIsNone(pet.current_identity())

    def test_desktop_pet_frames_and_motion_stay_bounded(self):
        image = Image.new('RGBA', (160, 160), (40, 120, 50, 255))
        output = BytesIO(); image.save(output, format='PNG')
        frame = 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode()
        self.assertEqual(len(decode_frames([frame] * 16)), 16)
        for frames in ([frame], ['http://example.test/image.png'] * 16, ['data:image/png;base64,!!!!'] * 16):
            with self.assertRaises(ValueError): decode_frames(frames)
        walk = Walk((-1920, -200, 1920, 1080))
        start = (walk.x, walk.y)
        for _ in range(500):
            pose = walk.step(.04, (-1920, -200, 1920, 1080))
            self.assertTrue(-1920 <= walk.x <= -160 and -200 <= walk.y <= 720)
            self.assertIn(pose, range(16))
        self.assertNotEqual(start, (walk.x, walk.y))
        walk.x, walk.y = -10000, 10000
        walk.step(1000, (0, 0, 800, 600))
        self.assertTrue(0 <= walk.x <= 640 and 0 <= walk.y <= 440)

    def test_http_rejects_cross_origin_and_wrong_token(self):
        server = make_server(self.runtime, Codex(self.root), Path('build/desktop-ui'))
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            token = json.load(urlopen(server.origin + '/session'))['token']
            request = {'method': 'tools.invoke', 'args': {'method': 'game', 'args': {'command': 'status'}}}
            def call(headers):
                return urlopen(Request(server.origin + '/rpc', data=json.dumps(request).encode(), headers=headers))
            for headers in ({}, {'X-NoteBuddy-Token': 'wrong'}, {'X-NoteBuddy-Token': token, 'Origin': 'https://evil.test'}):
                with self.assertRaises(HTTPError) as error: call(headers)
                self.assertEqual(error.exception.code, 403)
            self.assertEqual(json.load(call({'X-NoteBuddy-Token': token}))['result']['code'], 'not_started')
            request['method'] = 'storage.get'; request['args'] = {'key': 'notebuddy/game-v1', 'scope': 'tool'}
            with self.assertRaises(HTTPError): call({'X-NoteBuddy-Token': token})
            with self.assertRaises(HTTPError): urlopen(Request(server.origin + '/session', headers={'Host': 'evil.test'}))
        finally:
            server.shutdown(); server.server_close(); thread.join()

    def test_codex_vision_and_text_shapes(self):
        ai = Codex(self.root)
        args = {'systemPrompt': 'Analyze only', 'messages': [{'role': 'user', 'content': [{'type': 'image', 'data': 'data:image/png;base64,' + base64.b64encode(png()).decode()}]}]}
        with patch.object(ai, 'run', return_value='{"decision":"allow"}') as run:
            result = ai.complete(args)
            self.assertIn('decision', result['content']['text'])
            self.assertEqual(run.call_args.args[1], [png()])
        args['messages'][0]['content'][0]['data'] = 'http://example.test/x.png'
        with self.assertRaises(ValueError): ai.complete(args)

    def test_codex_only_uses_exact_thread_images(self):
        with patch.dict(os.environ, {'CODEX_HOME': str(self.root)}):
            thread = '11111111-1111-1111-1111-111111111111'
            folder = self.root / 'generated_images' / thread; folder.mkdir(parents=True)
            (folder / 'one.png').write_bytes(png())
            self.assertEqual(Codex.generated_image([{'type': 'thread.started', 'thread_id': thread}], ''), png())
            with self.assertRaises(AIError): Codex.generated_image([{'type': 'thread.started', 'thread_id': '../'}], '')
            with self.assertRaises(AIError): Codex.generated_image([], str(folder / 'one.png'))
            (folder / 'two.png').write_bytes(png())
            with self.assertRaises(AIError): Codex.generated_image([{'type': 'thread.started', 'thread_id': thread}], '')


if __name__ == '__main__': unittest.main()
