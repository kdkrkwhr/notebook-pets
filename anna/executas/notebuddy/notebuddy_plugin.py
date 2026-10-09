"""Anna Executa v2 bridge. APS is authoritative; local files are disposable."""
import asyncio
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import threading

from executa_sdk import StorageClient, StorageError, bind_invoke
from executa_sdk.storage import STORAGE_ERR_PRECONDITION_FAILED
from game_worker import ALLOWED
from localization import localize

VERSION = '0.1.3'
SAVE_KEY = 'notebuddy/game-v1'
READ = frozenset({'status', 'album', 'titles', 'quests', 'help'})
MANIFEST = {
    'name': 'tool-dev-notebuddy', 'display_name': 'Notebuddy Game', 'version': VERSION,
    'description': 'Care for the authenticated user’s lifelong pet. Python rules are authoritative.',
    'host_capabilities': ['aps.kv'],
    'storage': {'kv': True, 'files': True, 'scopes': {'tool': 'rw'}},
    'tools': [{
        'name': 'game', 'description': 'Read or care for your pet. Never choose a user or provide game state. Reuse request_id when retrying one action.',
        'timeout': 60,
        'parameters': [
            {'name': 'command', 'type': 'string', 'required': True, 'enum': sorted(ALLOWED),
             'description': 'One game action. status reads current progress; start creates your first partner.'},
            {'name': 'name', 'type': 'string', 'required': False, 'description': 'Pet name, only for start. Up to 24 characters.'},
            {'name': 'language', 'type': 'string', 'required': False, 'enum': ['en', 'ko'],
             'description': 'Response language. Defaults to English. Presentation only; reuse request_id when switching language on a retry.'},
            {'name': 'request_id', 'type': 'string', 'required': False,
             'description': 'Stable ID for one action, reused on transport retries. Omit to use the host invoke ID.'},
        ]
    }],
}


def evaluate(payload):
    argv = ([sys.executable, '--engine-worker'] if getattr(sys, 'frozen', False) else
            [sys.executable, '-B', '-X', 'utf8', str(Path(__file__).with_name('game_worker.py'))])
    child = subprocess.run(argv, input=json.dumps(payload, ensure_ascii=False),
                           capture_output=True, text=True, encoding='utf-8', timeout=20)
    if child.returncode:
        raise RuntimeError('Game worker could not complete.')
    return json.loads(child.stdout)


class GameService:
    def __init__(self, storage):
        self.storage = storage
        self.lock = asyncio.Lock()

    async def invoke(self, args, context=None):
        if not isinstance(args, dict) or set(args) - {'command', 'name', 'request_id', 'language'}:
            raise ValueError('Invalid game arguments.')
        language = args.get('language', 'en')
        if language not in ('en', 'ko'):
            raise ValueError('Language must be en or ko.')
        command = args.get('command')
        if not isinstance(command, str) or command not in ALLOWED:
            raise ValueError('Unsupported game command.')
        name = args.get('name', '')
        if not isinstance(name, str) or len(name) > 24 or any(ord(c) < 32 for c in name):
            raise ValueError('Pet names must be at most 24 characters without control characters.')
        if name and command != 'start':
            raise ValueError('Only start accepts a name.')
        event = args.get('request_id')
        if event is not None and (not isinstance(event, str) or not re.fullmatch(r'[A-Za-z0-9:_-]{1,100}', event)):
            raise ValueError('Invalid request ID.')
        if command not in READ:
            event = event or (context or {}).get('invoke_id')
            if not isinstance(event, str) or not event:
                raise ValueError('Mutations require a stable request ID.')
            event = 'anna:' + hashlib.sha256(event.encode()).hexdigest()
        else:
            event = None
        # Serialize this agent's calls, including first creation. Existing rows
        # additionally use APS ETags, so another agent cannot silently overwrite.
        async with self.lock:
            for attempt in range(3):
                saved = await self.storage.get(SAVE_KEY, scope='tool')
                previous = saved.get('value') if saved.get('exists') else None
                if saved.get('exists') and not isinstance(previous, dict):
                    raise ValueError('Invalid saved game; original preserved.')
                if saved.get('exists') and not saved.get('etag'):
                    raise ValueError('Storage must support conditional writes.')
                computed = await asyncio.to_thread(evaluate, {'command': command, 'name': name,
                    'request_id': event, 'state': previous})
                if computed.get('changed'):
                    try:
                        await self.storage.set(SAVE_KEY, computed['state'], scope='tool',
                                               if_match=saved.get('etag'))
                    except StorageError as exc:
                        if exc.code == STORAGE_ERR_PRECONDITION_FAILED and attempt < 2:
                            continue
                        raise
                # Only return progress once the authoritative write succeeded.
                return localize({**computed['result'], **computed.get('view', {})}, command, language)
        raise RuntimeError('The game is busy. Please try again.')


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', newline='\n')
        sys.stdin.reconfigure(encoding='utf-8')
    if '--engine-worker' in sys.argv:
        from game_worker import main as worker_main
        worker_main()
        return
    asyncio.run(serve())


async def serve():
    output_lock = threading.Lock()

    def write(frame):
        with output_lock:
            sys.stdout.write(json.dumps(frame, ensure_ascii=False) + '\n')
            sys.stdout.flush()

    storage = StorageClient(write_frame=write)
    service = GameService(storage)
    loop = asyncio.get_running_loop()
    finished = asyncio.Event()
    tasks = set()

    async def handle(frame):
        request_id, params = frame.get('id'), frame.get('params') or {}
        try:
            if params.get('tool') != 'game':
                raise ValueError('Unknown tool.')
            with bind_invoke(params):
                context = {**(params.get('context') or {})}
                context.setdefault('invoke_id', params.get('invoke_id'))
                result = await service.invoke(params.get('arguments') or {}, context)
            write({'jsonrpc': '2.0', 'id': request_id,
                   'result': {'success': True, 'tool': 'game', 'data': result}})
        except ValueError as exc:
            write({'jsonrpc': '2.0', 'id': request_id, 'error': {'code': -32602, 'message': str(exc)}})
        except StorageError as exc:
            # SDK messages can include host URLs. Log a redacted diagnostic on
            # stderr only; stdout remains protocol-only and the UI stays safe.
            diagnostic = re.sub(r'https?://\S+|eyJ[A-Za-z0-9_.-]+', '[redacted]', exc.message)
            sys.stderr.write(f'APS error {exc.code}: {diagnostic[:500]}\n')
            write({'jsonrpc': '2.0', 'id': request_id, 'error': {'code': exc.code,
                   'message': ('Anna 저장소를 사용할 수 없습니다. 저장 권한과 연결을 확인해 주세요.' if (params.get('arguments') or {}).get('language') == 'ko' else 'Anna storage is unavailable. Check storage permissions and connection.')}})
        except Exception:
            write({'jsonrpc': '2.0', 'id': request_id, 'error': {'code': -32603,
                   'message': ('요청을 완료하지 못했습니다. 같은 행동으로 다시 시도해 주세요.' if isinstance(params.get('arguments'), dict) and params['arguments'].get('language') == 'ko' else 'Could not complete the request. Retry the same action with the same request ID.')}})

    def schedule(frame):
        task = asyncio.create_task(handle(frame))
        tasks.add(task)
        task.add_done_callback(tasks.discard)

    def read():
        try:
            for raw in sys.stdin:
                try:
                    frame = json.loads(raw)
                    if not isinstance(frame, dict):
                        raise ValueError()
                except ValueError:
                    write({'jsonrpc': '2.0', 'id': None, 'error': {'code': -32700, 'message': 'Invalid JSON request.'}})
                    continue
                if storage.dispatch_response(frame):
                    continue
                method, rid = frame.get('method'), frame.get('id')
                if method == 'invoke':
                    loop.call_soon_threadsafe(schedule, frame)
                    continue
                if rid is None:
                    continue
                if method == 'initialize':
                    result = {'protocolVersion': '2.0', 'serverInfo': {'name': 'notebuddy', 'version': VERSION},
                              'capabilities': {'storage': {'kv': True, 'files': True}},
                              'client_capabilities': {'storage': {}}}
                elif method == 'describe':
                    result = MANIFEST
                elif method == 'health':
                    result = {'status': 'healthy', 'version': VERSION}
                elif method == 'shutdown':
                    write({'jsonrpc': '2.0', 'id': rid, 'result': {}})
                    break
                else:
                    write({'jsonrpc': '2.0', 'id': rid, 'error': {'code': -32601, 'message': 'Unknown method.'}})
                    continue
                write({'jsonrpc': '2.0', 'id': rid, 'result': result})
        finally:
            loop.call_soon_threadsafe(finished.set)

    threading.Thread(target=read, daemon=True).start()
    await finished.wait()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == '__main__':
    main()
