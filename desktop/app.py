"""Native window and private local service lifetime."""
import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
import traceback
from urllib.parse import urlsplit

from . import __version__
from .codex import Codex
from .runtime import Runtime
from .server import make_server
from .pet import DesktopPet

ROOT = Path(__file__).resolve().parents[1]


def default_data():
    if os.name == 'nt':
        return Path(os.environ.get('LOCALAPPDATA', Path.home() / 'AppData/Local')) / 'NoteBuddyDesktop'
    return Path.home() / 'Library/Application Support/NoteBuddyDesktop'


@contextmanager
def instance_lock(root):
    root.mkdir(parents=True, exist_ok=True)
    with (root / 'instance.lock').open('a+b') as handle:
        handle.seek(0)
        if os.name == 'nt':
            import msvcrt
            if os.fstat(handle.fileno()).st_size == 0:
                handle.write(b'0'); handle.flush()
            handle.seek(0)
            try:
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError as exc:
                raise RuntimeError('NoteBuddy is already open for this data folder.') from exc
        else:
            import fcntl
            try:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError as exc:
                raise RuntimeError('NoteBuddy is already open for this data folder.') from exc
        try:
            yield
        finally:
            if os.name == 'nt':
                handle.seek(0); msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


@contextmanager
def running(root):
    with instance_lock(root):
        runtime = Runtime(root)
        ai = Codex(root)
        server = None
        try:
            port_file = root / 'local-port.json'
            port = json.loads(port_file.read_text('utf-8')) if port_file.exists() else 0
            if not isinstance(port, int) or port != 0 and not 1024 <= port <= 65535:
                raise ValueError('Invalid local port setting.')
            server = make_server(runtime, ai, ROOT / 'build/desktop-ui', port)
            port_file.write_text(json.dumps(server.server_port), encoding='utf-8')
            serving = threading.Thread(target=server.serve_forever, daemon=True)
            serving.start()
            yield runtime, ai, server.origin
        finally:
            ai.cancel()
            if server:
                server.shutdown(); server.server_close(); serving.join(timeout=5)
            runtime.close()


class Dialogs:
    def __init__(self, runtime, origin, root):
        self._runtime, self._origin, self._root = runtime, origin, root
        self._window = None
        self._pet = None

    def _check(self):
        current = urlsplit(self._window.get_current_url() or '')
        if f'{current.scheme}://{current.netloc}' != self._origin or current.path not in ('', '/', '/index.html'):
            raise ValueError('Native actions are only available in NoteBuddy.')

    def backup(self):
        self._check()
        import webview
        chosen = self._window.create_file_dialog(webview.FileDialog.SAVE, save_filename='NoteBuddy-backup.sqlite3', file_types=('NoteBuddy backup (*.sqlite3)',))
        if not chosen:
            return None
        path = Path(chosen[0] if isinstance(chosen, (list, tuple)) else chosen).resolve()
        if path.is_relative_to(self._root):
            raise ValueError('Save backups outside the active data folder.')
        # Write atomically so an interrupted export cannot damage an old backup.
        temp = path.with_name(path.name + '.tmp')
        if temp.exists():
            raise ValueError('A temporary backup already exists at this path.')
        self._runtime.storage.backup(temp)
        temp.replace(path)
        return str(path)

    def open_data_folder(self):
        self._check()
        if os.name == 'nt':
            os.startfile(str(self._root))
        else:
            subprocess.Popen(['/usr/bin/open', str(self._root)])
        return True

    def pet_summon(self, payload):
        self._check()
        return self._pet.summon(payload)

    def pet_recall(self):
        self._check()
        return self._pet.recall()

    def pet_status(self):
        self._check()
        return self._pet.status()


def prepare_environment():
    if sys.platform == 'darwin':
        paths = os.environ.get('PATH', '').split(os.pathsep)
        paths += [str(Path.home() / '.local/bin'), str(Path.home() / '.npm-global/bin'), '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin']
        os.environ['PATH'] = os.pathsep.join(dict.fromkeys(paths))
    if getattr(sys, 'frozen', False) and os.name == 'nt':
        import ctypes
        ctypes.windll.kernel32.SetDllDirectoryW(None)
    for key in ('LD_LIBRARY_PATH', 'DYLD_LIBRARY_PATH'):
        if key + '_ORIG' in os.environ:
            os.environ[key] = os.environ[key + '_ORIG']


def main(argv=None):
    parser = argparse.ArgumentParser(description='NoteBuddy Desktop')
    parser.add_argument('--data-dir', type=Path)
    parser.add_argument('--smoke-report', type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    if args.smoke_report and not args.data_dir:
        parser.error('A smoke test requires an isolated --data-dir.')
    prepare_environment()
    root = (args.data_dir or default_data()).resolve()
    result = {'version': __version__, 'platform': sys.platform, 'ok': False}
    try:
        import webview
        with running(root) as (runtime, ai, origin):
            bridge = Dialogs(runtime, origin, root)
            window = webview.create_window('NoteBuddy · 노트버디', origin, js_api=bridge,
                                           width=1280, height=900, min_size=(720, 560), text_select=True,
                                           background_color='#fbf6e9')
            bridge._window = window
            bridge._pet = DesktopPet(runtime, window)
            webview.settings['ALLOW_FILE_URLS'] = False
            webview.settings['OPEN_EXTERNAL_LINKS_IN_BROWSER'] = True
            def closing():
                if ai.lock.locked():
                    if not window.create_confirmation_dialog('Exit NoteBuddy?', 'The current AI request will stop. Saved game progress will be kept.'):
                        return False
                bridge._pet.shutdown()
                return True
            window.events.closing += closing
            if args.smoke_report:
                def smoke_echo(value):
                    return value
                window.expose(smoke_echo)
            def smoke():
                try:
                    end = time.monotonic() + 45
                    bridge_started = False
                    while time.monotonic() < end:
                        state = window.evaluate_js("({ready:document.body.dataset.desktopReady,bridge:document.body.dataset.smokeBridge,title:document.title,notice:document.querySelector('#notice')?.textContent,settings:!!document.querySelector('#desktop-settings')})")
                        if state and state.get('ready') == 'true' and not bridge_started:
                            window.run_js("window.pywebview.api.smoke_echo('bridge-ok').then(value=>document.body.dataset.smokeBridge=value)")
                            bridge_started = True
                        if state and state.get('ready') == 'true' and state.get('settings') and state.get('bridge') == 'bridge-ok':
                            result.update(ok=True, ui=state, origin=origin)
                            break
                        time.sleep(.25)
                    else:
                        result['error'] = 'Native UI did not become ready.'
                    status = runtime.invoke('game', {'command': 'status'})
                    if not status.get('status'):
                        status = runtime.invoke('game', {'command': 'start', 'name': 'Desktop Test', 'request_id': status['request_id_prefix'] + 'native-smoke'})
                    result['pet_id'] = status.get('pet_id')
                    result['ok'] = result['ok'] and bool(result['pet_id'])
                    from .pet_smoke import verify
                    result['desktop_pet'] = verify(window, bridge._pet)
                except Exception as exc:
                    result['error'] = str(exc); result['ok'] = False
                finally:
                    window.destroy()
            webview.start(smoke if args.smoke_report else None, gui='edgechromium' if os.name == 'nt' else 'cocoa', private_mode=False, storage_path=str(root / 'window-profile'))
        result['shutdown'] = True
    except Exception as exc:
        result['error'] = str(exc)
        if not args.smoke_report:
            root.mkdir(parents=True, exist_ok=True)
            log = root / 'startup-error.log'
            log.write_text(traceback.format_exc(), encoding='utf-8')
            message = f'Could not start NoteBuddy.\n{exc}\n\nDetails: {log}'
            if os.name == 'nt':
                import ctypes
                ctypes.windll.user32.MessageBoxW(None, message, 'NoteBuddy', 0x10)
            else:
                subprocess.run(['/usr/bin/osascript', '-e', 'on run argv\ndisplay alert "NoteBuddy" message (item 1 of argv)\nend run', message])
    if args.smoke_report:
        args.smoke_report.parent.mkdir(parents=True, exist_ok=True)
        args.smoke_report.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return 0 if result.get('shutdown') and (not args.smoke_report or result['ok']) else 1
