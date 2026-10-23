"""Native release validation using only the explicitly isolated smoke save."""
import time
import os
from pathlib import Path


def verify(window, controller):
    def wait(expression):
        end = time.monotonic() + 20
        while time.monotonic() < end:
            value = window.evaluate_js(expression)
            if value: return value
            time.sleep(.15)
        raise RuntimeError('Desktop pet UI timed out: ' + expression)

    window.run_js("document.querySelector('#title-start').click();document.querySelector('#refresh').click()")
    wait("!document.querySelector('#refresh').disabled && !document.querySelector('#pet-panel')?.hidden && document.querySelector('#name').textContent==='Desktop Test'")
    source = window.evaluate_js("document.querySelector('#pet-image').src")
    stored_art = controller.runtime.wait(controller.runtime.storage.get('notebuddy/art-v1'))
    window.run_js("document.querySelector('#desktop-pet').click()")
    wait("document.body.classList.contains('desktop-pet-outside')")
    first = controller.status()
    assert first['active']
    assert window.evaluate_js("getComputedStyle(document.querySelector('#pet-image')).visibility==='hidden' && getComputedStyle(document.querySelector('.portrait')).backgroundColor==='rgb(255, 255, 255)'")
    time.sleep(1.2)
    second = controller.status()
    assert second['ticks'] > first['ticks'] and (second['x'], second['y']) != (first['x'], first['y']), (first, second)
    if os.name == 'nt' and os.environ.get('NOTEBUDDY_SMOKE_SCREENSHOTS'):
        from PIL import ImageGrab
        def position():
            rect = window.native.Bounds
            controller.walk.x, controller.walk.y = rect.X + 200, rect.Y + 260
            controller.walk.pause = 3
            return (rect.X, rect.Y, rect.Right, rect.Bottom)
        bounds = controller.on_ui(position)
        time.sleep(.3)
        folder = Path('desktop/runtime/screenshots'); folder.mkdir(parents=True, exist_ok=True)
        ImageGrab.grab(bbox=bounds, all_screens=True).save(folder / 'desktop-pet-native.png')
    window.run_js("document.querySelector('#desktop-pet').click()")
    wait("!document.body.classList.contains('desktop-pet-outside') && !document.querySelector('#desktop-pet').disabled")
    assert not controller.status()['active']
    assert window.evaluate_js("getComputedStyle(document.querySelector('#pet-image')).visibility==='visible'")
    assert source == window.evaluate_js("document.querySelector('#pet-image').src")
    # Native dismissal (right-click/double-click) also restores the main portrait.
    window.run_js("document.querySelector('#desktop-pet').click()")
    wait("document.body.classList.contains('desktop-pet-outside')")
    controller.recall()
    wait("!document.body.classList.contains('desktop-pet-outside')")
    assert stored_art == controller.runtime.wait(controller.runtime.storage.get('notebuddy/art-v1'))
    # A changed appearance must dismiss the old native sprite without an AI call.
    window.run_js("document.querySelector('#desktop-pet').click()")
    wait("document.body.classList.contains('desktop-pet-outside')")
    view = controller.runtime.invoke('game', {'command': 'status'})
    saved = dict(stored_art.get('value') or {})
    saved[f"{view['pet_id']}/stage-{view['stage']}"] = {'path': f"portraits/{view['pet_id']}/changed.png"}
    controller.runtime.wait(controller.runtime.storage.set('notebuddy/art-v1', saved))
    wait("!document.body.classList.contains('desktop-pet-outside')")
    controller.runtime.wait(controller.runtime.storage.set('notebuddy/art-v1', stored_art.get('value')))
    # Leave one surface active; application shutdown must close it cleanly.
    window.run_js("document.querySelector('#desktop-pet').click()")
    wait("document.body.classList.contains('desktop-pet-outside')")
    return {'summon': True, 'moved': True, 'whitePortrait': True, 'recall': True,
            'nativeDismiss': True, 'samePortrait': True, 'saveUnchanged': True,
            'appearanceChangeDismiss': True, 'first': first, 'moving': second}
