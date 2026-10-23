import base64
from io import BytesIO
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch

from PIL import Image
from desktop.ai_common import AIError
from desktop.claude import Claude, subscription_environment
from desktop.providers import AI
from desktop.vector_art import render_svg

SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="coat"><stop stop-color="#70c8ab"/><stop offset="1" stop-color="#208a65"/></linearGradient><g id="eye"><circle r="20" fill="#fff"/></g></defs><circle cx="256" cy="256" r="180" fill="url(#coat)"/><use href="#eye" x="200" y="220"/><use href="#eye" x="310" y="220"/></svg>'


class AIProviderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)
    def tearDown(self): self.temp.cleanup()

    def test_provider_switch_preserves_legacy_settings_and_never_falls_back(self):
        legacy = {'path': 'my-codex', 'model': 'saved-model'}
        (self.root/'ai-settings.json').write_text(json.dumps(legacy), encoding='utf-8')
        ai = AI(self.root); self.assertEqual(ai.provider, 'codex')
        ai.configure({'provider': 'claude', 'path': 'my-claude', 'model': ''})
        restarted = AI(self.root)
        self.assertEqual(restarted.provider, 'claude')
        self.assertEqual(restarted.clients['codex'].settings, legacy)
        with patch.object(restarted.clients['claude'], 'complete', side_effect=AIError('quota')) as claude, patch.object(restarted.clients['codex'], 'complete') as codex:
            with self.assertRaisesRegex(AIError, 'quota'): restarted.complete({})
            claude.assert_called_once(); codex.assert_not_called()
        with restarted.lock:
            with self.assertRaises(AIError): restarted.configure({'provider': 'codex', **legacy})
        self.assertEqual(restarted.provider, 'claude')

    def test_claude_isolated_multimodal_request_and_result(self):
        ai = Claude(self.root); png = render_svg(SVG)
        process = Mock(returncode=0)
        process.communicate.return_value = (b'{"type":"result","result":"A mint friend","is_error":false}\n', b'')
        with patch.object(ai, 'info', return_value={'compatible': True, 'loggedIn': True}), patch('desktop.claude.command', return_value=['claude']), patch('desktop.claude.subprocess.Popen', return_value=process) as launch:
            self.assertEqual(ai.run('Describe this.', [png]), 'A mint friend')
        argv = launch.call_args.args[0]
        for option in ('--safe-mode', '--restricted', '--no-session-persistence', '--strict-mcp-config'):
            self.assertIn(option, argv)
        self.assertEqual(argv[argv.index('--tools')+1], '')
        self.assertEqual(argv[argv.index('--setting-sources')+1], '')
        self.assertEqual(json.loads(argv[argv.index('--mcp-config')+1]), {'mcpServers': {}})
        content = json.loads(process.communicate.call_args.args[0])['message']['content']
        self.assertEqual(content[0]['source']['media_type'], 'image/png')
        with Image.open(BytesIO(base64.b64decode(content[0]['source']['data']))) as image:
            self.assertEqual(image.size, (512,512))
        self.assertFalse(Path(launch.call_args.kwargs['cwd']).exists())
        self.assertFalse(ai.lock.locked()); self.assertIsNone(ai.process)

    def test_claude_subscription_environment_drops_billing_credentials(self):
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY':'secret', 'ANTHROPIC_BASE_URL':'https://proxy.test', 'CLAUDE_CODE_OAUTH_TOKEN':'secret', 'CLAUDE_CODE_USE_VERTEX':'1', 'CLAUDECODE':'1', 'PATH':'preserved'}, clear=True):
            self.assertEqual(subscription_environment(), {'PATH':'preserved'})

    def test_claude_api_key_auth_is_rejected_without_starting_request(self):
        ai = Claude(self.root)
        help_text = '--safe-mode --restricted --setting-sources --strict-mcp-config --no-session-persistence --permission-prompts --input-format'
        outputs = [Mock(returncode=0, stdout='2.1.301'), Mock(stdout=help_text), Mock(returncode=0, stdout=json.dumps({'loggedIn':True,'authMethod':'api_key','apiProvider':'firstParty'}))]
        with patch('desktop.claude.command', return_value=['claude']), patch('desktop.claude.subprocess.run', side_effect=outputs), patch('desktop.claude.subprocess.Popen') as launch:
            with self.assertRaisesRegex(AIError, 'API-key'): ai.run('hello')
            launch.assert_not_called()

    def test_cancellation_during_preflight_stops_launch(self):
        ai = Claude(self.root)
        def preflight(**kwargs):
            ai.cancel(); return {'compatible':True,'loggedIn':True}
        with patch.object(ai,'info',side_effect=preflight), patch('desktop.claude.command',return_value=['claude']), patch('desktop.claude.subprocess.Popen') as launch:
            with self.assertRaisesRegex(AIError,'cancelled'): ai.run('hello')
            launch.assert_not_called()

    def test_timeout_has_no_retry_and_releases_lock(self):
        ai = Claude(self.root); process = Mock(returncode=1)
        process.communicate.side_effect = [subprocess.TimeoutExpired('claude',150), (b'',b'')]
        with patch.object(ai,'info',return_value={'compatible':True,'loggedIn':True}), patch('desktop.claude.command',return_value=['claude']), patch('desktop.claude.subprocess.Popen',return_value=process) as launch, patch.object(ai,'cancel') as cancel:
            with self.assertRaisesRegex(AIError,'No automatic retry'): ai.run('hello')
            launch.assert_called_once(); cancel.assert_called_once()
        self.assertFalse(ai.lock.locked()); self.assertIsNone(ai.process)

    def test_generated_art_is_png_without_any_image_service(self):
        ai = Claude(self.root)
        with patch.object(ai,'run',return_value=SVG) as run:
            with Image.open(BytesIO(ai.generate({'prompt':'Mint friend','n':1}))) as image:
                self.assertEqual(image.size,(512,512)); self.assertEqual(image.mode,'RGBA')
                self.assertEqual(image.getpixel((0,0))[3],0)
            run.assert_called_once()
        with patch.object(ai,'run',return_value='invalid') as run:
            with self.assertRaisesRegex(AIError,'No automatic retry'): ai.generate({'prompt':'friend'})
            run.assert_called_once()

    def test_svg_blocks_external_resources_and_expansion(self):
        invalid = [
            '<svg><script>alert(1)</script></svg>',
            '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]><svg>&x;</svg>',
            '<svg><image href="https://example.test/image.png"/></svg>',
            '<svg><use href="file:///secret"/></svg>',
            '<svg><circle r="20" style="fill:red"/></svg>',
            '<svg><circle r="20" fill="url(https://example.test/x)"/></svg>',
            '<svg><g id="a"><use href="#a"/></g></svg>',
            '<svg><g id="a"><use href="#b"/></g><g id="b"><use href="#a"/></g></svg>',
            '<svg viewBox="0 0 NaN 512"/>', '<svg/>',
        ]
        for svg in invalid:
            with self.subTest(svg=svg):
                with self.assertRaises(ValueError): render_svg(svg)


if __name__ == '__main__': unittest.main()
