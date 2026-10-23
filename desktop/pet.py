"""Ephemeral desktop companion. Never changes saves or calls an AI provider."""
import base64
from io import BytesIO
import math
import random
import sys
import threading
import time

from PIL import Image

SIZE = 160


def decode_frames(values):
    if not isinstance(values, list) or len(values) != 16:
        raise ValueError('Expected sixteen pixel frames.')
    frames = []
    for value in values:
        if not isinstance(value, str) or not value.startswith('data:image/png;base64,') or len(value) > 100_000:
            raise ValueError('Invalid pixel frame.')
        raw = base64.b64decode(value.split(',', 1)[1], validate=True)
        with Image.open(BytesIO(raw)) as image:
            if image.format != 'PNG' or image.size != (SIZE, SIZE):
                raise ValueError('Invalid pixel frame dimensions.')
            rgba = image.convert('RGBA')
            if not rgba.getchannel('A').getbbox():
                raise ValueError('Empty pixel frame.')
            output = BytesIO(); rgba.save(output, format='PNG')
            frames.append(output.getvalue())
    return frames


class Walk:
    """Top-left desktop coordinates, bounded elapsed time, no gameplay effects."""
    def __init__(self, bounds, rng=None):
        self.rng = rng or random.Random()
        self.x, self.y = bounds[0] + 24., bounds[1] + 24.
        self.target = None
        self.pause = 0.
        self.elapsed = 0.
        self.direction = 0
        self.dragging = False

    def step(self, dt, bounds):
        left, top, width, height = bounds
        right, bottom = left + max(0, width - SIZE), top + max(0, height - SIZE)
        self.x = min(right, max(left, self.x)); self.y = min(bottom, max(top, self.y))
        dt = min(.1, max(0., dt)); self.elapsed += dt
        if self.dragging:
            self.target = None
            return self.direction * 4 + 1
        self.pause = max(0., self.pause - dt)
        if self.pause:
            return self.direction * 4 + (3 if self.elapsed % 4 < .18 else 1)
        if self.target is None:
            self.target = (self.rng.uniform(left, right), self.rng.uniform(top, bottom))
        tx, ty = self.target
        tx, ty = min(right, max(left, tx)), min(bottom, max(top, ty))
        dx, dy = tx - self.x, ty - self.y
        distance = math.hypot(dx, dy)
        if distance <= 48 * dt:
            self.x, self.y = tx, ty
            self.target = None; self.pause = self.rng.uniform(1., 3.)
            return self.direction * 4 + 1
        self.direction = (2 if dx > 0 else 1) if abs(dx) > abs(dy) else (0 if dy > 0 else 3)
        self.x += dx / distance * 48 * dt; self.y += dy / distance * 48 * dt
        return self.direction * 4 + (0, 1, 2, 1)[int(self.elapsed * 7) % 4]


class DesktopPet:
    def __init__(self, runtime, window):
        self.runtime, self.window = runtime, window
        self.surface = None
        self.identity = None
        self.check_at = 0.
        self.last_tick = 0.
        self.ticks = 0
        self.closed = False

    def current_identity(self):
        view = self.runtime.invoke('game', {'command': 'status'})
        if not view.get('status') or view.get('reset_pending'):
            return None
        art = self.runtime.wait(self.runtime.storage.get('notebuddy/art-v1')).get('value') or {}
        if art.get('_notebuddy_erased'):
            return None
        owner, stage = view['pet_id'], view['stage']
        records = view['status'].get('evolution', {}).get('records', [])
        element = records[0].get('from_element') if records else None
        source = f"assets/starters-v1/{view['species_key']}_{element or view['element_key']}_stage1.png"
        for number in range(stage, 0, -1):
            portrait = art.get(f'{owner}/stage-{number}', {})
            if portrait.get('path'):
                source = portrait['path']; break
        entry = art.get(f'{owner}/home-sprite-stage-{stage}', {})
        appearance = entry.get('path', '') if (entry.get('pet_id') == owner and entry.get('stage') == stage
            and entry.get('source_path') == source and entry.get('format') in ('home-sprite-v1', 'home-default-v1')
            and str(entry.get('path', '')).startswith(f'portraits/{owner}/')) else ''
        return [owner, stage, source, appearance]

    def on_ui(self, function):
        if sys.platform == 'win32':
            from System import Action
            native = self.window.native
            if not native.InvokeRequired:
                return function()
            box = {}
            def call():
                try: box['value'] = function()
                except Exception as exc: box['error'] = exc
            native.Invoke(Action(call))
        else:
            from Foundation import NSThread
            from PyObjCTools.AppHelper import callAfter
            if NSThread.isMainThread():
                return function()
            box, done = {}, threading.Event()
            def call():
                try: box['value'] = function()
                except Exception as exc: box['error'] = exc
                finally: done.set()
            callAfter(call)
            done.wait()
        if 'error' in box: raise box['error']
        return box.get('value')

    def summon(self, payload):
        if not isinstance(payload, dict) or payload.get('identity') != self.current_identity() or not payload.get('identity'):
            raise ValueError('Your companion changed. Try again.')
        frames = decode_frames(payload.get('frames'))
        def show():
            if self.closed: raise ValueError('NoteBuddy is closing.')
            if payload['identity'] != self.current_identity(): raise ValueError('Your companion changed. Try again.')
            if self.surface:
                return self.status_ui()
            if sys.platform == 'win32':
                from .pet_windows import PetWindow
            elif sys.platform == 'darwin':
                from .pet_macos import PetWindow
            else:
                raise ValueError('Desktop companion requires Windows or macOS.')
            surface = PetWindow(self.window.native, frames, self.tick, self.recall_ui)
            self.surface, self.identity = surface, payload['identity']
            self.walk = Walk(surface.bounds())
            self.last_tick = time.monotonic(); self.check_at = self.last_tick + 1
            self.ticks = 0
            try: surface.show(self.walk.x, self.walk.y)
            except Exception:
                self.recall_ui(); raise
            return self.status_ui()
        return self.on_ui(show)

    def tick(self):
        if not self.surface: return
        try:
            now = time.monotonic()
            if now >= self.check_at:
                self.check_at = now + 1
                if self.identity != self.current_identity():
                    self.recall_ui(); return
            frame = self.walk.step(now - self.last_tick, self.surface.bounds())
            self.last_tick = now; self.ticks += 1
            self.surface.draw(frame, round(self.walk.x), round(self.walk.y))
        except Exception:
            self.recall_ui()

    def status_ui(self):
        return {'active': self.surface is not None, 'identity': self.identity,
                'ticks': self.ticks, 'x': round(self.walk.x) if self.surface else None,
                'y': round(self.walk.y) if self.surface else None}

    def status(self):
        return self.on_ui(self.status_ui)

    def recall_ui(self):
        surface, self.surface, self.identity = self.surface, None, None
        if surface: surface.close()
        return self.status_ui()

    def recall(self):
        return self.on_ui(self.recall_ui)

    def shutdown(self):
        self.closed = True
        return self.recall()
