"""Backup/restore must preserve receipts and reject incomplete or unsafe input."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch
import test_p0
import engine
import backup_store as backup
from runtime import GameError, store_lock


class BackupTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def snapshot(self):
        archive = self.root / 'backups' / 'save.json'
        backup.create(self.root, archive)
        return archive

    def test_roundtrip_preserves_access_quests_and_event_receipts(self):
        self.seed()
        original = engine.execute('123', 'feed', request_id='discord:1234')
        engine.save_access({'owner_id': '123', 'owner_name': 'Buddy'})
        saved = engine.load_state('123')
        archive = self.snapshot()
        target = self.root / 'recovered'
        result = backup.restore(archive, target)
        self.assertEqual(result['users'], 1)
        self.assertEqual(json.loads((target/'state/123.json').read_text(encoding='utf-8')), saved)
        self.assertEqual(json.loads((target/'data/access.json').read_text(encoding='utf-8'))['owner_id'], '123')
        env = dict(os.environ, NOTEBOOK_DATA_DIR=str(target), NOTEBOOK_EVENT_ID='discord:1234')
        replay = subprocess.run([sys.executable, '-B', '-X', 'utf8', str(test_p0.ROOT/'engine/engine.py'), '123', 'feed'],
                                env=env, capture_output=True, text=True, encoding='utf-8', timeout=15, check=True)
        self.assertEqual(json.loads(replay.stdout), original)

    def test_missing_access_remains_public_and_empty_store_roundtrips(self):
        archive = self.snapshot()
        target = self.root / 'empty'
        self.assertEqual(backup.restore(archive, target)['users'], 0)
        self.assertTrue((target/'state').is_dir())
        self.assertFalse((target/'data/access.json').exists())

    def test_existing_target_and_archive_are_never_overwritten(self):
        self.seed()
        archive = self.snapshot()
        before = archive.read_bytes()
        with self.assertRaises(OSError):
            backup.create(self.root, archive)
        self.assertEqual(archive.read_bytes(), before)
        with self.assertRaises(GameError):
            backup.restore(archive, self.root)
        self.assertTrue((self.state/'123.json').exists())

    def test_corruption_and_unsafe_paths_rejected_before_restore(self):
        self.seed()
        archive = self.snapshot()
        original = json.loads(archive.read_bytes())
        changed = json.loads(archive.read_bytes())
        changed['payload']['files']['state/123.json']['xp'] += 1
        archive.write_bytes(backup.canonical(changed))
        with self.assertRaises(GameError):
            backup.restore(archive, self.root/'bad')
        self.assertFalse((self.root/'bad').exists())
        for path in ('../escape.json', 'state/../escape.json', '/absolute.json', 'state\\123.json'):
            original['payload']['files'] = {path: {}}
            original['sha256'] = hashlib.sha256(backup.canonical(original['payload'])).hexdigest()
            archive.write_bytes(backup.canonical(original))
            with self.assertRaises(GameError):
                backup.restore(archive, self.root/'bad')
            self.assertFalse((self.root/'bad').exists())

    def test_invalid_source_save_or_access_produces_no_archive(self):
        self.seed()
        archive = self.root/'bad.json'
        self.access.write_text('{"owner_id": "../x", "owner_name": ""}', encoding='utf-8')
        with self.assertRaises(GameError):
            backup.create(self.root, archive)
        self.assertFalse(archive.exists())
        self.access.unlink()
        (self.state/'123.json').write_text('{}', encoding='utf-8')
        with self.assertRaises(GameError):
            backup.create(self.root, archive)
        self.assertFalse(archive.exists())

    def test_partial_restore_failure_does_not_publish_target(self):
        self.seed()
        archive = self.snapshot()
        with patch.object(backup, 'atomic_write_json', side_effect=GameError('storage_error', 'disk full')):
            with self.assertRaises(GameError):
                backup.restore(archive, self.root/'recovered')
        self.assertFalse((self.root/'recovered').exists())
        self.assertEqual(list(self.root.glob('.notebook-restore-*')), [])

    def test_backup_does_not_migrate_or_modify_source(self):
        self.seed(version=2)
        path = self.state/'123.json'
        before = path.read_bytes()
        archive = self.snapshot()
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(backup.verify(archive)['payload']['files']['state/123.json']['version'], 2)
        with self.assertRaises(GameError):
            backup.create(self.root, self.state/'456.json')

    def test_cli_verify_rejects_truncated_file(self):
        path = self.root/'broken.json'
        path.write_text('{', encoding='utf-8')
        result = subprocess.run([sys.executable, '-B', '-X', 'utf8', str(test_p0.ROOT/'tools/backup_store.py'), 'verify', str(path)],
                                capture_output=True, text=True, encoding='utf-8', timeout=15)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)['ok'])

    def test_snapshot_waits_for_game_transaction(self):
        self.seed()
        archive = self.root/'locked.json'
        child = None
        try:
            with store_lock(self.state):
                child = subprocess.Popen([sys.executable, '-B', '-X', 'utf8',
                    str(test_p0.ROOT/'tools/backup_store.py'), 'create', '--source', str(self.root),
                    '--output', str(archive)], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    text=True, encoding='utf-8')
                with self.assertRaises(subprocess.TimeoutExpired):
                    child.communicate(timeout=0.5)
                state = engine.load_state('123')
                state['xp'] = 75
                engine.save_state(state)
            stdout, stderr = child.communicate(timeout=15)
            self.assertEqual(child.returncode, 0, stderr)
            self.assertTrue(json.loads(stdout)['ok'])
            self.assertEqual(backup.verify(archive)['payload']['files']['state/123.json']['xp'], 75)
        finally:
            if child is not None and child.poll() is None:
                child.kill()
                child.communicate()
