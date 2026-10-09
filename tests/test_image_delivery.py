import asyncio
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import test_p0
from test_images import FakeProvider, fixture_png
import art
import engine
from comfy_images import ComfyUIProvider
from discord_delivery import DiscordDelivery, parse_command
from image_service import ImageService


class FakeFile:
    def __init__(self, path):
        self.path = path
        self.data = Path(path).read_bytes()
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass


class NotFound(Exception):
    pass


FAKE_DISCORD = SimpleNamespace(File=FakeFile, NotFound=NotFound,
                               AllowedMentions=SimpleNamespace(none=lambda: "none"))


class FakeReply:
    def __init__(self, log):
        self.id = 200
        self.log = log
    async def edit(self, **kwargs):
        self.log.append(("edit", kwargs))


class FakeMessage:
    def __init__(self, content="!start Buddy"):
        self.author = SimpleNamespace(id=123, bot=False)
        self.id, self.content = 100, content
        self.log = []
        self.sent = FakeReply(self.log)
        self.channel = SimpleNamespace(id=300, fetch_message=self.fetch)
    async def fetch(self, reply_id):
        if reply_id != 200:
            raise NotFound()
        return self.sent
    async def reply(self, content, **kwargs):
        self.log.append(("reply", {"content": content, **kwargs}))
        return self.sent


class DeliveryTests(unittest.IsolatedAsyncioTestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def delivery(self, provider=None):
        service = ImageService(provider or FakeProvider(), root=self.root / "artwork", examples=self.root / "examples")
        return DiscordDelivery(service, FAKE_DISCORD, root=self.root / "delivery")

    async def test_reply_precedes_render_then_edits_same_message_with_attachment(self):
        message = FakeMessage()
        provider = FakeProvider()
        def generate(*args, **kwargs):
            self.assertEqual(message.log[0][0], "reply")
            message.log.append(("render", {}))
            return fixture_png()
        with patch.object(provider, "generate", side_effect=generate):
            result = await self.delivery(provider).handle(message)
        self.assertTrue(result["ok"])
        self.assertEqual([name for name, _ in message.log], ["reply", "render", "edit"])
        self.assertEqual(message.log[-1][1]["attachments"][0].data, fixture_png())
        self.assertEqual(message.log[-1][1]["allowed_mentions"], "none")

    async def test_duplicate_event_concurrent_and_after_restart_has_one_reply(self):
        message = FakeMessage()
        delivery = self.delivery()
        first, second = await asyncio.gather(delivery.handle(message), delivery.handle(message))
        self.assertEqual(first, second)
        await self.delivery().handle(message)
        self.assertEqual(sum(name == "reply" for name, _ in message.log), 1)
        self.assertEqual(len(engine.load_state("123")["history"]), 1)

    async def test_generation_failure_keeps_successful_game_result(self):
        message = FakeMessage()
        provider = FakeProvider()
        from runtime import GameError
        with patch.object(provider, "generate", side_effect=GameError("offline", "offline")):
            result = await self.delivery(provider).handle(message)
        self.assertTrue(result["ok"])
        self.assertIn("!상태", message.log[-1][1]["content"])
        self.assertIsNotNone(engine.load_state("123"))

    async def test_unauthorized_player_receives_no_attachment(self):
        engine.execute("999", "owner", ["124"])
        message = FakeMessage()
        result = await self.delivery().handle(message)
        self.assertFalse(result["ok"])
        self.assertEqual(len(message.log), 1)
        self.assertNotIn("attachments", message.log[0][1])

    async def test_edited_command_conflicts_without_second_reward(self):
        self.seed()
        message = FakeMessage("!snack")
        delivery = self.delivery()
        await delivery.handle(message)
        message.content = "!train"
        result = await delivery.handle(message)
        self.assertEqual(result["code"], "request_conflict")
        self.assertEqual(engine.load_state("123")["xp"], 5)

    async def test_bot_messages_and_non_game_commands_ignored(self):
        message = FakeMessage()
        message.author.bot = True
        self.assertIsNone(await self.delivery().handle(message))
        for text in ("hello", "!reset 123", '!start "unclosed'):
            self.assertIsNone(parse_command(text))
        self.assertEqual(parse_command("!공책시작 작은 친구"), ("start", ["작은", "친구"]))


class ComfyHTTPTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def test_reference_upload_queue_history_download_round_trip(self):
        received = []
        png = fixture_png()
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass
            def respond(self, payload, binary=False):
                body = payload if binary else json.dumps(payload).encode()
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            def do_POST(self):
                body = self.rfile.read(int(self.headers["Content-Length"]))
                received.append((self.path, body, self.headers.get("Content-Type")))
                if self.path == "/upload/image":
                    self.respond({"name": "reference.png", "subfolder": "", "type": "input"})
                else:
                    self.respond({"prompt_id": "test-job", "node_errors": {}})
            def do_GET(self):
                received.append((self.path, b"", ""))
                if self.path.startswith("/history"):
                    self.respond({"test-job": {"status": {"completed": True},
                                               "outputs": {"9": {"images": [{"filename": "result.png"}]}}}})
                else:
                    self.respond(png, True)
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            self.seed(species="plant", element="nature", level=10, stage=2)
            provider = ComfyUIProvider(f"http://127.0.0.1:{server.server_port}")
            service = ImageService(provider, root=self.root / "artwork")
            result = service.render("123", engine.execute("123", "status")["image"])
            self.assertEqual(result["status"], "ready")
            self.assertEqual(Path(result["path"]).read_bytes(), png)
            upload = next(r for r in received if r[0] == "/upload/image")
            self.assertIn("multipart/form-data", upload[2])
            self.assertIn(b"\x89PNG\r\n\x1a\n", upload[1])
            workflow = json.loads(next(r[1] for r in received if r[0] == "/prompt"))["prompt"]
            self.assertEqual(workflow["10"]["inputs"]["image"], "reference.png")
            self.assertIn("SAME individual", workflow["6"]["inputs"]["text"])
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
