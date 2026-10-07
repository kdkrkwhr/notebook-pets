import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch
import test_p0
import daily_backup
import doctor


class DoctorTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def test_healthy_store_preserves_save_and_skips_optional_services(self):
        self.seed(version=2)
        before = (self.state/'123.json').read_bytes()
        report = doctor.diagnose(self.root)
        self.assertTrue(report['ok'])
        self.assertEqual(report['checks'][0]['users'], 1)
        self.assertEqual([c['status'] for c in report['checks']], ['pass', 'skip', 'skip', 'skip'])
        self.assertEqual(before, (self.state/'123.json').read_bytes())
        self.assertEqual(list(self.state.glob('.notebook-doctor-*')), [])

    def test_bad_save_and_access_fail_without_overwrite(self):
        self.seed()
        (self.state/'456.json').write_text('{}', encoding='utf-8')
        report = doctor.diagnose(self.root)
        self.assertFalse(report['ok'])
        self.assertEqual(report['checks'][0]['invalid_saves'][0]['file'], '456.json')
        self.access.write_text('{}', encoding='utf-8')
        self.assertFalse(doctor.diagnose(self.root)['ok'])
        self.assertEqual(self.access.read_text(encoding='utf-8'), '{}')

    def test_missing_root_is_not_created(self):
        target = self.root/'missing'
        self.assertFalse(doctor.diagnose(target)['ok'])
        self.assertFalse(target.exists())

    def test_backup_verification_and_freshness(self):
        self.seed()
        destination = self.root/'backups'
        self.assertFalse(doctor.diagnose(self.root, backup_root=destination)['ok'])
        job = daily_backup.run_once(self.root, destination)
        self.assertTrue(doctor.diagnose(self.root, backup_root=destination)['ok'])
        self.assertFalse(doctor.diagnose(self.root, backup_root=destination, max_age_hours=1e-15)['ok'])
        Path(job['snapshot']['path']).write_text('{}', encoding='utf-8')
        self.assertFalse(doctor.diagnose(self.root, backup_root=destination)['ok'])

    def test_failed_job_is_not_hidden_by_existing_good_backup(self):
        self.seed()
        destination = self.root/'backups'
        job = daily_backup.run_once(self.root, destination)
        path = Path(job['directory'])/'last-run.json'
        value = json.loads(path.read_bytes())
        value['ok'] = False
        path.write_text(json.dumps(value), encoding='utf-8')
        self.assertFalse(doctor.diagnose(self.root, backup_root=destination)['ok'])

    def test_discord_validation_does_not_leak_token(self):
        self.seed()
        with patch.dict(os.environ, {'DISCORD_BOT_TOKEN': 'secret-never-print', 'NOTEBOOK_CHANNEL_IDS': 'bad-channel'}):
            report = doctor.diagnose(self.root, discord=True)
        self.assertFalse(report['ok'])
        self.assertNotIn('secret-never-print', json.dumps(report))
        self.assertNotIn('bad-channel', json.dumps(report))

    def test_comfy_timeout_does_not_block_other_checks(self):
        self.seed()
        with patch.object(doctor.subprocess, 'run', side_effect=subprocess.TimeoutExpired('check', 30)):
            report = doctor.diagnose(self.root, comfy=True)
        self.assertEqual(report['checks'][0]['status'], 'pass')
        self.assertEqual(report['checks'][-1]['status'], 'fail')

    def test_cli_json_failure_exit_status(self):
        child = subprocess.run([sys.executable, '-B', '-X', 'utf8', str(test_p0.ROOT/'tools/doctor.py'),
            '--data-root', str(self.root/'missing'), '--json'], capture_output=True, text=True, encoding='utf-8', timeout=10)
        self.assertEqual(child.returncode, 1)
        self.assertFalse(json.loads(child.stdout)['ok'])
