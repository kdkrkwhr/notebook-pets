"""Anna Executa v2 bridge. APS is authoritative; local files are disposable."""
import asyncio
import json
from pathlib import Path
import re
import subprocess
import sys
import threading

from executa_sdk import StorageClient, StorageError, bind_invoke
from executa_sdk.storage import STORAGE_ERR_PRECONDITION_FAILED
from game_worker import ALLOWED
from privacy import privacy, erased
from reset import reset, pending
from localization import localize
from receipts import disposition, event_key, prefix, commit_result, SaveCapacityError, pack, unpack

VERSION = '0.1.8'
SAVE_KEY = 'notebuddy/game-v1'
READ = frozenset({'status', 'album', 'titles', 'quests', 'help'})
MANIFEST = {
    'name': 'tool-dev-notebuddy', 'display_name': 'Notebuddy Game', 'version': VERSION,
    'description': 'Care for the authenticated user’s lifelong pet. Python rules are authoritative.',
    'host_capabilities': ['aps.kv'],
    'storage': {'kv': True, 'files': True, 'scopes': {'tool': 'rw'}},
    'tools': [{
        'name': 'game', 'description': 'Read or care for your pet. Never choose a user or provide game state. Read status first. For a new action append a unique suffix to request_id_prefix from the latest response. Reuse the entire request_id on retries. Never restamp an expired request automatically.',
        'timeout': 60,
        'parameters': [
            {'name': 'command', 'type': 'string', 'required': True, 'enum': sorted(ALLOWED),
             'description': 'One game action. status reads current progress; start creates your first partner.'},
            {'name': 'name', 'type': 'string', 'required': False, 'description': 'Pet name, only for start. Up to 24 characters.'},
            {'name': 'language', 'type': 'string', 'required': False, 'enum': ['en', 'ko'],
             'description': 'Response language. Defaults to English. Presentation only; reuse request_id when switching language on a retry.'},
            {'name': 'request_id', 'type': 'string', 'required': False,
             'description': 'Required for new actions: latest request_id_prefix plus a unique suffix, e.g. nb2:12:my-action. Reuse the exact ID for retries. Old unsequenced IDs can only replay retained results.'},
        ]
    }],
}

MANIFEST['tools'].append({'name': 'privacy', 'description': 'Inspect or irreversibly erase the authenticated user’s existing game. Never invoke erase without an explicit data-removal request and confirmation. Not a reset/reroll. App chat and files require separate UI cleanup. Read inspect first; never automatically replace expected_etag after a conflict.', 'timeout': 60, 'parameters': [{'name': 'action', 'type': 'string', 'required': True, 'enum': ['inspect', 'erase'], 'description': 'inspect is read-only; erase replaces game content with a minimal permanent removal marker.'}, {'name': 'confirmation', 'type': 'string', 'required': False, 'description': 'For erase only: exact user-confirmed phrase DELETE NOTEBUDDY.'}, {'name': 'expected_etag', 'type': 'string', 'required': False, 'description': 'For erase only: etag from the preview the user confirmed. Reuse it on uncertain retries.'}]})


MANIFEST['tools'].append({'name':'reset','description':'Explicitly replace an existing companion with a new random companion. Requires user confirmation RESET NOTEBUDDY and a fresh inspect ETag. UI must clean chat and all portraits before finish. Resume a pending reset; never automatically begin a new reset on conflicts. Permanent privacy removal cannot be reset.','timeout':60,'parameters':[
 {'name':'action','type':'string','description':'inspect previews the save; begin stages one new pet; finish follows verified UI chat/file cleanup.','required':True,'enum':['inspect','begin','finish']},
 {'name':'confirmation','type':'string','description':'For begin only: exact user-confirmed phrase RESET NOTEBUDDY.','required':False},
 {'name':'expected_etag','type':'string','description':'For begin only: ETag from the preview the user confirmed; never refresh it automatically.','required':False},
 {'name':'reset_id','type':'string','description':'Stable UUID for this confirmed reset. Reuse on begin and finish retries.','required':False},
 {'name':'name','type':'string','description':'For begin only: new companion name, 1–24 characters.','required':False}]})

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

    async def privacy(self, args):
        async with self.lock:
            return await privacy(self.storage, SAVE_KEY, args)

    async def reset(self, args):
        async with self.lock:
            return await reset(self.storage, SAVE_KEY, args, lambda payload: asyncio.to_thread(evaluate, payload))

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
                if erased(previous):
                    return {'ok': False, 'code': 'data_erased', 'erased': True,
                            'msg': ('게임 데이터가 삭제되어 더 이상 플레이할 수 없습니다.' if language == 'ko' else 'Your game data was removed. This game can no longer be played.')}
                if pending(previous):
                    return {'ok':False,'code':'reset_pending','reset_pending':True,'reset_id':previous['reset_id'],'msg':('초기화 정리를 완료해 주세요.' if language=='ko' else 'Finish resetting your saved data.')}
                previous = unpack(previous)
                mode = disposition(previous, event) if event else 'read'
                computed = await asyncio.to_thread(evaluate, {
                    'command': 'status' if mode == 'expired' else command, 'name': name,
                    'request_id': event_key(event) if event and mode != 'expired' else None,
                    'state': previous})
                if mode == 'expired' and computed['result'].get('code') != 'invalid_state':
                    computed['result'] = {'ok': False, 'code': 'request_expired', 'msg': ''}
                committed = previous
                # Cache terminal failures too: retrying a failed action later
                # must not silently turn it into a successful, new game action.
                if mode == 'new' and isinstance(computed.get('state'), dict):
                    try:
                        candidate = commit_result(computed['state'], previous, event,
                                                  command, name, computed['result'])
                    except SaveCapacityError:
                        computed = await asyncio.to_thread(evaluate, {'command': 'status', 'state': previous})
                        computed['result'] = {'ok': False, 'code': 'save_capacity', 'msg': ''}
                    else:
                        if not saved.get('exists'):
                            # This recheck narrows the first-write race, but APS
                            # still has no atomic create-if-absent operation.
                            latest = await self.storage.get(SAVE_KEY, scope='tool')
                            if latest.get('exists'):
                                continue
                        try:
                            await self.storage.set(SAVE_KEY, pack(candidate), scope='tool',
                                                   if_match=saved.get('etag'))
                        except StorageError as exc:
                            if exc.code == STORAGE_ERR_PRECONDITION_FAILED and attempt < 2:
                                continue
                            raise
                        committed = candidate
                # Reads/replays never rewrite the save. Only expose the next
                # sequence after its game state and receipt commit together.
                return localize({**computed['result'], **computed.get('view', {}),
                                 'request_id_prefix': prefix(committed)}, command, language)
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
            if params.get('tool') not in ('game', 'privacy', 'reset'):
                raise ValueError('Unknown tool.')
            with bind_invoke(params):
                context = {**(params.get('context') or {})}
                context.setdefault('invoke_id', params.get('invoke_id'))
                result = (await service.invoke(params.get('arguments') or {}, context) if params['tool']=='game'
                          else await getattr(service, params['tool'])(params.get('arguments') or {}))
            write({'jsonrpc': '2.0', 'id': request_id,
                   'result': {'success': True, 'tool': params['tool'], 'data': result}})
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
