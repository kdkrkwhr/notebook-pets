import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
import test_p0
import manage


class ManageTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp

    def configuration(self):
        path = self.root/'settings folder'/'notebook.local.json'
        manage.initialize(path)
        return path

    def cli(self, config, *arguments, **extra_env):
        environment = dict(os.environ)
        for name in ('NOTEBOOK_DATA_DIR','NOTEBOOK_CHANNEL_IDS','NOTEBOOK_ADMIN_IDS','NOTEBOOK_COMFY_URL','NOTEBOOK_COMFY_CHECKPOINT'):
            environment.pop(name, None)
        environment.update(extra_env)
        return subprocess.run([sys.executable, '-B', '-X', 'utf8', str(test_p0.ROOT/'tools/manage.py'),
            '--config', str(config), *arguments], cwd=self.root, env=environment,
            capture_output=True, text=True, encoding='utf-8', timeout=20)

    def test_initialize_never_overwrites_and_paths_are_config_relative(self):
        config = self.configuration()
        with self.assertRaises(FileExistsError):
            manage.initialize(config)
        settings, _ = manage.load_settings(config, {})
        self.assertTrue(Path(settings['data_root']).samefile(config.parent))
        self.assertEqual(Path(settings['backup_root']), (config.parent/'backups').resolve())

    def test_env_precedence_preserves_actor_and_secrets_without_showing_them(self):
        config = self.configuration()
        values = {'NOTEBOOK_DATA_DIR': str(self.root), 'NOTEBOOK_CHANNEL_IDS':'123,456',
                  'NOTEBOOK_ACTOR_ID':'123', 'DISCORD_BOT_TOKEN':'never-print-me'}
        settings, env = manage.load_settings(config, values)
        self.assertTrue(Path(settings['data_root']).samefile(self.root))
        self.assertEqual(settings['channel_ids'], ['123','456'])
        self.assertEqual(env['NOTEBOOK_ACTOR_ID'], '123')
        self.assertEqual(env['DISCORD_BOT_TOKEN'], 'never-print-me')
        result = self.cli(config, 'config', **values)
        self.assertEqual(result.returncode, 0)
        self.assertNotIn('never-print-me', result.stdout)

    def test_invalid_and_unknown_settings_fail_before_child_process(self):
        config = self.configuration()
        original = json.loads(config.read_text(encoding='utf-8'))
        for changes in ({'token':'secret'}, {'channel_ids':[123]}, {'backup_keep_min':0},
                        {'backup_root':'state/backups'}, {'comfy_url':'http://user:secret@localhost:8188'}):
            config.write_text(json.dumps({**original, **changes}), encoding='utf-8')
            with self.assertRaises(ValueError):
                manage.load_settings(config, {})
        config.write_text('{', encoding='utf-8')
        self.assertEqual(self.cli(config, 'config').returncode, 1)

    def test_cli_game_backup_doctor_and_album_use_same_store_from_other_directory(self):
        config = self.configuration()
        started = self.cli(config, 'game', '123', 'start', 'Buddy')
        self.assertEqual(started.returncode, 0, started.stderr)
        self.assertTrue(json.loads(started.stdout)['ok'])
        saved = config.parent/'state/123.json'
        self.assertTrue(saved.exists())
        backup = self.cli(config, 'backup')
        self.assertEqual(backup.returncode, 0, backup.stdout + backup.stderr)
        checked = self.cli(config, 'doctor', '--backup', '--json')
        self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)
        album = self.cli(config, 'album', '123')
        self.assertEqual(album.returncode, 0, album.stdout + album.stderr)
        self.assertTrue(Path(json.loads(album.stdout)['path']).parent.samefile(config.parent/'albums'))

    def test_child_failure_exit_code_propagates(self):
        config = self.configuration()
        checked = self.cli(config, 'doctor', '--json')
        self.assertEqual(checked.returncode, 1)
        self.assertFalse(json.loads(checked.stdout)['ok'])

    def test_missing_configuration_has_actionable_error(self):
        result = self.cli(self.root/'missing.json', 'backup')
        self.assertEqual(result.returncode, 1)
        self.assertIn('init', result.stdout)
        self.assertFalse((self.root/'missing.json').exists())
