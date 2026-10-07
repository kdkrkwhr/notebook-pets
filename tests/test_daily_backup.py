import hashlib
import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch
import test_p0
import backup_store
import daily_backup
from runtime import GameError


class DailyBackupTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def run_job(self, **kwargs):
        return daily_backup.run_once(self.root, self.root/'backups', **kwargs)

    def age_snapshots(self):
        folder = self.root/'backups'/daily_backup.source_key(self.root)
        index = json.loads((folder/'index.json').read_bytes())
        for number, entry in enumerate(index['files'], 1):
            path = folder/entry['name']
            doc = json.loads(path.read_bytes())
            doc['payload']['created_at'] = f'2020-01-{number:02d}T00:00:00+00:00'
            doc['sha256'] = hashlib.sha256(backup_store.canonical(doc['payload'])).hexdigest()
            path.write_bytes(backup_store.canonical(doc))
            entry['sha256'] = doc['sha256']
        (folder/'index.json').write_bytes(backup_store.canonical(index))
        return folder, index

    def test_retention_preserves_minimum_and_unmanaged_files(self):
        self.seed()
        for _ in range(4):
            self.assertTrue(self.run_job()['ok'])
        folder, index = self.age_snapshots()
        manual = folder/'manual.json'
        manual.write_text('keep me', encoding='utf-8')
        result = self.run_job(keep_days=30, keep_min=3)
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['retained'], 3)
        self.assertEqual(set(result['deleted']), {e['name'] for e in index['files'][:2]})
        self.assertEqual(manual.read_text(encoding='utf-8'), 'keep me')
        self.assertEqual(json.loads((folder/'last-run.json').read_bytes()), result)

    def test_recent_backups_kept_even_above_minimum(self):
        self.seed()
        for _ in range(3):
            result = self.run_job(keep_min=1)
            self.assertEqual(result['deleted'], [])
        self.assertEqual(result['retained'], 3)

    def test_failed_creation_does_not_prune(self):
        self.seed()
        self.run_job()
        folder, index = self.age_snapshots()
        before = (folder/'index.json').read_bytes()
        with patch.object(backup_store, 'create', side_effect=GameError('storage_error', 'failed')):
            result = self.run_job(keep_min=1)
        self.assertFalse(result['ok'])
        self.assertEqual((folder/'index.json').read_bytes(), before)
        self.assertTrue((folder/index['files'][0]['name']).exists())

    def test_corrupt_managed_file_stops_all_pruning(self):
        self.seed()
        for _ in range(3):
            self.run_job()
        folder, index = self.age_snapshots()
        (folder/index['files'][1]['name']).write_text('{}', encoding='utf-8')
        result = self.run_job(keep_min=1)
        self.assertFalse(result['ok'])
        self.assertEqual(result['deleted'], [])
        self.assertTrue(all((folder/e['name']).exists() for e in index['files']))
        self.assertTrue(Path(result['snapshot']['path']).exists())

    def test_invalid_index_paths_and_parameters_are_rejected(self):
        self.seed()
        first = self.run_job()
        folder = Path(first['directory'])
        index = json.loads((folder/'index.json').read_bytes())
        index['files'][0]['name'] = '../escape.json'
        (folder/'index.json').write_bytes(backup_store.canonical(index))
        self.assertFalse(self.run_job()['ok'])
        with self.assertRaises(ValueError):
            self.run_job(keep_min=0)
        with self.assertRaises(ValueError):
            daily_backup.run_once(self.root, self.state/'backups')

    def test_concurrent_jobs_preserve_every_index_entry(self):
        self.seed()
        children = [subprocess.Popen([sys.executable, '-B', '-X', 'utf8',
            str(test_p0.ROOT/'tools/daily_backup.py'), '--source', str(self.root),
            '--destination', str(self.root/'backups')], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding='utf-8') for _ in range(3)]
        try:
            for child in children:
                stdout, stderr = child.communicate(timeout=20)
                self.assertEqual(child.returncode, 0, stderr)
                self.assertTrue(json.loads(stdout)['ok'])
        finally:
            for child in children:
                if child.poll() is None:
                    child.kill()
                    child.communicate()
        folder = self.root/'backups'/daily_backup.source_key(self.root)
        index = json.loads((folder/'index.json').read_bytes())
        self.assertEqual(len(index['files']), 3)
        self.assertEqual(len({e['name'] for e in index['files']}), 3)

    def test_missing_entry_after_interrupted_pruning_recovers(self):
        self.seed()
        first = self.run_job()
        Path(first['snapshot']['path']).unlink()
        result = self.run_job()
        self.assertTrue(result['ok'])
        self.assertEqual(result['retained'], 1)
        self.assertEqual(result['missing'], [Path(first['snapshot']['path']).name])
