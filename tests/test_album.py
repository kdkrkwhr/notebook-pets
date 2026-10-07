import unittest
import asyncio
from unittest.mock import patch
import test_p0
import engine
from adapter import bind_game_event, tool_definition
from discord_delivery import parse_command, response_text
from image_service import ImageService
from test_images import FakeProvider
from test_image_delivery import FAKE_DISCORD, FakeMessage
from discord_delivery import DiscordDelivery
import export_album


class AlbumTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def test_capture_removed_and_old_history_preserved(self):
        self.seed(history=[{'event': 'caught', 'what': 'old record'}])
        before = (self.state/'123.json').read_bytes()
        for command in ('catch', '포획', 'pokedex', '도감'):
            self.assertFalse(engine.execute('123', command)['ok'])
            self.assertIsNone(parse_command('!'+command))
        commands = tool_definition()['parameters']['properties']['command']['enum']
        self.assertNotIn('catch', commands)
        self.assertNotIn('pokedex', commands)
        self.assertNotIn('포획가', engine.execute('123', 'titles')['titles'])
        self.assertEqual((self.state/'123.json').read_bytes(), before)

    def test_album_is_read_only_and_old_dates_not_invented(self):
        self.seed(stage=3, level=51)
        before = (self.state/'123.json').read_bytes()
        album = bind_game_event('123')('앨범')['album']
        self.assertEqual([e['reached'] for e in album['entries']], [True, True, True, False])
        self.assertTrue(all(e['achieved_at'] is None for e in album['entries']))
        self.assertIsNone(album['entries'][3]['image'])
        self.assertEqual((self.state/'123.json').read_bytes(), before)

    def test_evolution_logged_once_with_message_retry(self):
        self.seed(level=30, xp=90)
        first = engine.execute('123', 'feed', request_id='grow:1')
        self.assertEqual(first, engine.execute('123', 'feed', request_id='grow:1'))
        events = [e for e in engine.load_state('123')['history'] if e['event']=='evolved']
        self.assertEqual(len(events), 1)
        entry = engine.execute('123', 'album')['album']['entries'][1]
        self.assertTrue(entry['achieved_at'].endswith('+09:00'))
        self.assertTrue(entry['current'])

    def test_multistage_growth_and_final_branch_belong_to_same_partner(self):
        st = self.seed(intimacy=90)
        identity = engine.art.pet_identity(st)
        engine.add_xp(st, 20000)
        engine.save_state(st)
        album = engine.execute('123', 'album')['album']
        self.assertEqual([e['stage'] for e in st['history'] if e['event']=='evolved'], [2,3,4])
        self.assertEqual(album['branch'], 'light')
        for entry in album['entries']:
            self.assertEqual(entry['image']['pet_id'], identity)
        self.assertEqual(album['entries'][3]['image']['branch'], 'light')

    def test_cache_missing_or_other_partner_never_substituted(self):
        self.seed()
        service = ImageService(root=self.root/'artwork')
        request = engine.execute('123', 'album')['album']['current_image']
        self.assertEqual(service.album('123', request), {'status':'ready', 'images':[]})
        self.assertEqual(service.album('456', request)['status'], 'stale')
        self.seed(name='Different partner')
        self.assertEqual(service.album('123', request)['status'], 'stale')

    def test_export_escapes_name_and_does_not_generate_or_overwrite(self):
        self.seed(name='<script>alert(1)</script>')
        path = self.root/'album.html'
        before = (self.state/'123.json').read_bytes()
        with patch.object(ImageService, 'render', side_effect=AssertionError('must not generate')):
            result = export_album.export('123', path)
        self.assertTrue(result['ok'])
        content = path.read_text(encoding='utf-8')
        self.assertNotIn('<script>', content)
        self.assertIn('&lt;script&gt;', content)
        self.assertIn('저장된 그림 없음', content)
        with self.assertRaises(FileExistsError):
            export_album.export('123', path)
        self.assertEqual((self.state/'123.json').read_bytes(), before)

    def test_access_restriction_applies_to_album_and_export(self):
        self.seed()
        engine.save_access({'owner_id':'456', 'owner_name':'Owner'})
        self.assertFalse(engine.execute('123', 'album')['ok'])
        path = self.root/'album.html'
        self.assertFalse(export_album.export('123', path)['ok'])
        self.assertFalse(path.exists())

    def test_discord_album_text_has_timeline_and_no_capture(self):
        self.seed()
        self.assertEqual(parse_command('!진화앨범'), ('album', []))
        text = response_text(engine.execute('123', 'album'))
        self.assertIn('성장 앨범', text)
        self.assertIn('Lv.31', text)
        self.assertNotIn('포획', text)

    def test_cached_album_images_export_and_discord_delivery_without_regeneration(self):
        self.seed(level=51, stage=3)
        provider = FakeProvider()
        service = ImageService(provider, root=self.root/'artwork', examples=self.root/'no-examples')
        request = engine.execute('123', 'album')['album']['current_image']
        self.assertEqual(service.render('123', request)['status'], 'ready')
        self.assertEqual(len(provider.calls), 3)
        cached = service.album('123', request)
        self.assertEqual([item['stage'] for item in cached['images']], [1,2,3])
        output = self.root/'images.html'
        self.assertEqual(export_album.export('123', output)['images'], 3)
        self.assertEqual(output.read_text(encoding='utf-8').count('data:image/png;base64,'), 3)
        message = FakeMessage('!앨범')
        asyncio.run(DiscordDelivery(service, FAKE_DISCORD, root=self.root/'delivery').handle(message))
        self.assertEqual(len(message.log[-1][1]['attachments']), 3)
        self.assertEqual(len(provider.calls), 3)
