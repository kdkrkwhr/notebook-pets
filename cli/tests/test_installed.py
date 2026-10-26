"""Exercise the installed wheel outside the source checkout, with temporary saves."""
import asyncio
from importlib.metadata import distribution
import json
import os
from pathlib import Path
import subprocess
import sys
import sysconfig
import tempfile
import tomllib
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


class InstalledPackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='notebook-pets-package-')
        self.addCleanup(self.temp.cleanup)
        self.cwd = Path(self.temp.name)
        self.store = self.cwd / 'notebook with spaces'
        self.env = {k: v for k, v in os.environ.items()
                    if not k.startswith('NOTEBOOK_') and k not in ('PYTHONPATH', 'PYTHONHOME')}
        self.env.update(PYTHONUTF8='1', PYTHONDONTWRITEBYTECODE='1')

    def call(self, *args, env=None):
        return subprocess.run([sys.executable, '-I', '-m', 'notebook_pets',
                               '--data-dir', str(self.store), *args],
                              cwd=self.cwd, env=env or self.env, capture_output=True,
                              text=True, encoding='utf-8', timeout=30)

    def game(self, *args, env=None):
        p = self.call(*args, env=env)
        try:
            value = json.loads(p.stdout)
        except ValueError:
            self.fail(f'Non-JSON game output: {p.stdout!r} {p.stderr!r}')
        self.assertEqual(p.returncode, 0 if value['ok'] else 1, p.stderr)
        return value

    def test_installed_payload_matches_sources_and_contains_no_private_files(self):
        dist = distribution('notebook-pets')
        metadata = tomllib.loads((ROOT / 'pyproject.toml').read_text('utf-8'))
        files = metadata['tool']['hatch']['build']['targets']['wheel']['force-include']
        for source, target in files.items():
            installed = Path(dist.locate_file(target)).resolve()
            self.assertFalse(installed.is_relative_to(ROOT), installed)
            # Git checkouts may convert LF to CRLF on Windows; compare source text.
            self.assertEqual(installed.read_text('utf-8'),
                             (ROOT / source).read_text('utf-8'), source)
        actual = {str(p).replace('\\', '/') for p in dist.files
                  if str(p).startswith('notebook_pets/') and str(p).endswith(('.py', '.json'))}
        expected = set(files.values()) | {
            'notebook_pets/__init__.py', 'notebook_pets/__main__.py', 'notebook_pets/cli.py'}
        self.assertEqual(actual, expected)
        self.assertTrue(all('extra ==' in requirement for requirement in dist.requires or []))

    def test_help_and_data_location_do_not_create_a_save(self):
        self.assertEqual(self.call('--help').returncode, 0)
        self.assertEqual(self.call('--version').stdout.strip(), distribution('notebook-pets').version)
        self.assertEqual(Path(self.call('data-dir').stdout.strip()), self.store)
        self.assertFalse(self.store.exists())

    def test_birth_care_reload_and_notebook_isolation(self):
        self.assertTrue(self.game('start', '별콩이')['ok'])
        initial = (self.store / 'state' / '1.json').read_bytes()
        self.game('start', 'Replacement')
        self.assertEqual((self.store / 'state' / '1.json').read_bytes(), initial)
        self.assertTrue(self.game('play')['ok'])
        self.assertTrue(self.game('status')['ok'])
        self.assertTrue(self.game('album')['ok'])
        self.assertTrue(self.game('--actor-id', '2', 'start', 'Mochi')['ok'])
        self.assertEqual(json.loads((self.store / 'state' / '1.json').read_bytes())['name'], '별콩이')
        self.assertEqual(json.loads((self.store / 'state' / '2.json').read_bytes())['name'], 'Mochi')
        self.assertFalse((self.cwd / 'state').exists())

    def test_bad_arguments_and_host_identity_do_not_write(self):
        self.assertEqual(self.call('--actor-id', '../bad', 'start').returncode, 2)
        self.assertEqual(self.call('--actor-id', '2', 'start',
                                   env=dict(self.env, NOTEBOOK_ACTOR_ID='1')).returncode, 2)
        self.assertFalse(self.game('not-a-command')['ok'])
        self.assertFalse(self.store.exists())

    def test_cli_command_entry_point(self):
        script = Path(sysconfig.get_path('scripts')) / ('notebook-pets.exe' if os.name == 'nt' else 'notebook-pets')
        p = subprocess.run([str(script), '--data-dir', str(self.store), 'start', 'Console Buddy'],
                           cwd=self.cwd, env=self.env, capture_output=True, text=True,
                           encoding='utf-8', timeout=30)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertTrue(json.loads(p.stdout)['ok'])

    def test_mcp_missing_extra_has_actionable_error(self):
        from notebook_pets.cli import main
        with patch('notebook_pets.cli.find_spec', return_value=None), patch.dict(os.environ, self.env, clear=True):
            with self.assertRaises(SystemExit) as error:
                main(['--data-dir', str(self.store), 'mcp'])
            self.assertEqual(error.exception.code, 2)

    def test_real_installed_mcp_default_readonly_and_receipt_replay(self):
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client
        self.assertTrue(self.game('start', 'MCP Buddy')['ok'])

        async def session(event=None):
            env = dict(self.env)
            if event:
                env['NOTEBOOK_EVENT_ID'] = event
            params = StdioServerParameters(command=sys.executable,
                args=['-I', '-m', 'notebook_pets', '--data-dir', str(self.store), 'mcp'],
                env=env, cwd=str(self.cwd))
            async with stdio_client(params) as (read, write):
                async with ClientSession(read, write) as client:
                    await client.initialize()
                    tools = await client.list_tools()
                    self.assertEqual([t.name for t in tools.tools], ['notebook_game'])
                    self.assertNotIn('actor_id', tools.tools[0].inputSchema['properties'])
                    status = await client.call_tool('notebook_game', {'command': 'status'})
                    self.assertTrue(json.loads(status.content[0].text)['ok'])
                    reset = await client.call_tool('notebook_game', {'command': 'reset'})
                    self.assertTrue(reset.isError)
                    result = await client.call_tool('notebook_game', {'command': 'play'})
                    if event is None:
                        self.assertTrue(result.isError)
                        return None
                    result = json.loads(result.content[0].text)
                    self.assertTrue(result['ok'], result)
                    conflict = await client.call_tool('notebook_game', {'command': 'feed'})
                    self.assertEqual(json.loads(conflict.content[0].text)['code'], 'request_conflict')
                    return result

        async def scenario():
            before = (self.store / 'state' / '1.json').read_bytes()
            await session()
            self.assertEqual((self.store / 'state' / '1.json').read_bytes(), before)
            first = await session('test:message-1')
            saved = (self.store / 'state' / '1.json').read_bytes()
            self.assertEqual(await session('test:message-1'), first)
            self.assertEqual((self.store / 'state' / '1.json').read_bytes(), saved)

        asyncio.run(asyncio.wait_for(scenario(), 45))


if __name__ == '__main__':
    unittest.main()
