"""Reuse the shipping game host with local persistence, without Anna transport."""
import asyncio
from pathlib import Path
import sys
import threading

HOST = Path(__file__).resolve().parents[1] / 'anna' / 'executas' / 'notebuddy'
sys.path.insert(0, str(HOST))
import notebuddy_plugin
import game_worker

from .storage import Storage


class Runtime:
    def __init__(self, root):
        self.storage = Storage(root)
        # The worker already calls the portable engine with ExecutionContext.
        # Running it in the host's to_thread avoids frozen GUI stdout subprocesses.
        notebuddy_plugin.evaluate = game_worker.run
        self.game = notebuddy_plugin.GameService(self.storage)
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self.loop.run_forever, daemon=True)
        self.thread.start()

    def wait(self, coroutine):
        return asyncio.run_coroutine_threadsafe(coroutine, self.loop).result(timeout=60)

    def invoke(self, method, args):
        if method == 'game':
            return self.wait(self.game.invoke(args))
        if method in ('privacy', 'reset'):
            return self.wait(getattr(self.game, method)(args))
        raise ValueError('Unsupported game method.')

    def close(self):
        self.loop.call_soon_threadsafe(self.loop.stop)
        self.thread.join(timeout=5)
        self.loop.close()
        self.storage.close()
