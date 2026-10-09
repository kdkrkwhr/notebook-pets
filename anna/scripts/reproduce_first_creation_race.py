"""Offline release-blocker probe; no network, credentials, or real saves.

Exit 1 means first creation is unsafe across agents. This intentionally runs
outside the passing regression suite. Exit 0 only means THIS schedule is safe,
not a proof of atomic first creation for every schedule or the real APS service.
"""
import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tests'))
from test_anna import MemoryAPS, GameService


async def reproduce():
    ready_to_write = asyncio.Event()
    release_write = asyncio.Event()

    class PausedFirstWrite(MemoryAPS):
        pause = True

        async def set(self, key, value, *, scope, if_match):
            if self.pause:
                self.pause = False
                assert if_match is None
                # Both reads already finished. A network delay here still lets
                # another agent create AND care for its partner before our PUT.
                ready_to_write.set()
                await asyncio.wait_for(release_write.wait(), 10)
            return await super().set(key, value, scope=scope, if_match=if_match)

    storage = PausedFirstWrite()
    delayed = asyncio.create_task(GameService(storage).invoke(
        {'command': 'start', 'name': 'Delayed', 'request_id': 'delayed-birth'}))
    try:
        await asyncio.wait_for(ready_to_write.wait(), 10)
        winner = GameService(storage)
        original = await winner.invoke({'command': 'start', 'name': 'Original', 'request_id': 'first-birth'})
        cared = await winner.invoke({'command': 'feed', 'request_id': 'first-meal'})
        assert original['ok'] and cared['ok']
        release_write.set()
        late = await asyncio.wait_for(delayed, 10)
        final = await winner.invoke({'command': 'status'})
        overwritten = final['pet_id'] != original['pet_id']
        progress_lost = final['status']['xp'] != cared['status']['xp']
        print(json.dumps({
            'environment': 'offline APS contract simulation',
            'both_creations_reported_success': original['ok'] and late['ok'],
            'original_partner_overwritten': overwritten,
            'progress_lost': progress_lost,
            'release_blocker_reproduced': overwritten or progress_lost,
        }, indent=2))
        return 1 if overwritten or progress_lost else 0
    finally:
        release_write.set()
        if not delayed.done():
            delayed.cancel()
        await asyncio.gather(delayed, return_exceptions=True)


if __name__ == '__main__':
    raise SystemExit(asyncio.run(reproduce()))
