"""Anna Executa v2 bridge. APS is authoritative; local files are disposable."""
import asyncio
import json
from pathlib import Path
import re
import subprocess
import sys
import threading

from executa_sdk import StorageClient, StorageError, bind_invoke
from executa_sdk.storage import FilesClient
from storage_errors import precondition_failed
from game_worker import ALLOWED
from privacy import privacy, erased
from reset import reset, pending, ready, ID_KEY
from localization import localize
from receipts import disposition, event_key, prefix, commit_result, SaveCapacityError, pack, unpack

# Enabled after approved image editing, live quality and real APS validation.
EQUIPMENT_ENABLED = True
VERSION = '0.9.9'
BIRTH_SPECIES = ('mammal','bird','reptile','machine','fairy','monster','dragon','plant','ghost')
BIRTH_ELEMENTS = ('fire','water','thunder','nature','wind','earth','light','dark','random')
SAVE_KEY = 'notebuddy/game-v1'
READ = frozenset({'home','status', 'album', 'titles', 'quests', 'help'})
MANIFEST = {
    'name': 'tool-dev-notebuddy', 'display_name': 'Notebuddy Game', 'version': VERSION,
    'description': 'Care for the authenticated user’s lifelong pet. Python rules are authoritative.',
    # Executa describe/cache preserves legacy capability strings. The app uses
    # schema-3 storage; both must normalize to the same complete declaration.
    'host_capabilities': ['aps.kv', 'aps.files', 'aps.scope.tool.read', 'aps.scope.tool.write'],
    'tools': [{
        'name': 'game', 'description': 'Read or care for your pet. Never choose a user or provide game state. Read status first. For a new action append a unique suffix to request_id_prefix from the latest response. Reuse the entire request_id on retries. Never restamp an expired request automatically.',
        'timeout': 60,
        'parameters': [
            {'name':'equipment_payload','type':'string','required':False,'description':'UI-confirmed equipment transaction only. Reserve without consumption; apply a stored preview once. Bounded JSON <=1024 chars. No automatic generation or paid retry.'},
            {'name':'evolution_payload','type':'string','required':False,'description':'Explicit user evolution only. JSON <=4096 chars with current pet_id. evolution_prepare adds current stage to reserve three routes once; evolution_options adds choice_id, three allowed options (keep first), language, memory <=600 chars and observed appearance features <=1200 chars; evolve adds choice_id and the exact route_id the user selected. Never evolve automatically or invent elements/stats. Read status.evolution first.'},
            {'name':'home_payload','type':'string','required':False,'description':'home_buy/home_apply/home_undo only: bounded JSON. Current pet_id and home revision required. Buy adds item_id; apply adds a current home_candidates candidate_id and short reason. Invoke home_apply only for explicit room-decoration requests. Buying/viewing/animation never require AI.'},
            {'name': 'profile', 'type': 'string', 'required': False, 'description': 'personality only: bounded JSON with appearance, source (reference/portrait/starter), traits (curiosity/warmth/energy/caution: -1/0/1), and bilingual en/ko summary, voice, habit. Establish once from the pet name and visual features. Cannot overwrite an existing personality or change rewards.'},
            {'name': 'command', 'type': 'string', 'required': True, 'enum': sorted(ALLOWED),
             'description': 'One game action. status reads current progress; start creates your first partner.'},
            {'name': 'choice_id', 'type': 'string', 'required': False, 'description': 'Required for dungeon_safe/dungeon_risk/walk_collect/walk_leave: use the exact pending choice_id from status.walk_choice or status.journey (first=walk_collect, second=walk_leave), or the dungeon choice. Never choose for the user without their selection.'},
            {'name': 'name', 'type': 'string', 'required': False, 'description': 'Pet name, only for start. Up to 24 characters.'},
            {'name':'birth_species','type':'string','required':False,'enum':list(BIRTH_SPECIES),'description':'Drawing-based first creation only: species inferred from the user artwork. Omit for a random start. Cannot change an existing pet.'},
            {'name':'birth_element','type':'string','required':False,'enum':list(BIRTH_ELEMENTS),'description':'Drawing-based first creation only: visible element cues, or random when absent. Requires birth_species.'},
            {'name': 'language', 'type': 'string', 'required': False, 'enum': ['en', 'ko', 'ja', 'zh-Hans', 'zh-Hant'],
             'description': 'Response language. Defaults to English. Presentation only; reuse request_id when switching language on a retry.'},
            {'name': 'request_id', 'type': 'string', 'required': False,
             'description': 'Required for new actions: latest request_id_prefix plus a unique suffix, e.g. nb2:12:my-action. Reuse the exact ID for retries. Old unsequenced IDs can only replay retained results.'},
        ]
    }],
}

MANIFEST['tools'].append({'name': 'privacy', 'description': 'Inspect or irreversibly erase the authenticated user’s existing game. Never invoke erase without an explicit data-removal request and confirmation. Not a reset/reroll. App chat and files require separate UI cleanup. Read inspect first; never automatically replace expected_etag after a conflict.', 'timeout': 60, 'parameters': [{'name': 'action', 'type': 'string', 'required': True, 'enum': ['inspect', 'erase'], 'description': 'inspect is read-only; erase replaces game content with a minimal permanent removal marker.'}, {'name': 'confirmation', 'type': 'string', 'required': False, 'description': 'For erase only: exact user-confirmed phrase DELETE NOTEBUDDY.'}, {'name': 'expected_etag', 'type': 'string', 'required': False, 'description': 'For erase only: etag from the preview the user confirmed. Reuse it on uncertain retries.'}]})


MANIFEST['tools'].append({'name':'reset','description':'Explicitly clear an existing companion and return to the welcome screen. Omit name so the user chooses a name and creation mode afterward. Requires user confirmation RESET NOTEBUDDY and a fresh inspect ETag. UI must clean chat and all portraits before finish. Resume a pending reset; never automatically begin a new reset on conflicts. A removed game may explicitly start a new companion through reset; deleted records are never recovered.','timeout':60,'parameters':[
 {'name':'action','type':'string','description':'inspect previews the save; begin clears the old pet for the welcome screen (legacy name optionally stages a pet); finish follows verified UI chat/file cleanup.','required':True,'enum':['inspect','begin','finish']},
 {'name':'confirmation','type':'string','description':'For begin only: exact user-confirmed phrase RESET NOTEBUDDY.','required':False},
 {'name':'expected_etag','type':'string','description':'For begin only: ETag from the preview the user confirmed; never refresh it automatically.','required':False},
 {'name':'reset_id','type':'string','description':'Stable UUID for this confirmed reset. Reuse on begin and finish retries.','required':False},
 {'name':'name','type':'string','description':'Legacy clients only: optional new companion name. Omit to return to the welcome screen.','required':False}]})

def evaluate(payload):
    argv = ([sys.executable, '--engine-worker'] if getattr(sys, 'frozen', False) else
            [sys.executable, '-B', '-X', 'utf8', str(Path(__file__).with_name('game_worker.py'))])
    child = subprocess.run(argv, input=json.dumps(payload, ensure_ascii=False),
                           capture_output=True, text=True, encoding='utf-8', timeout=20)
    if child.returncode:
        raise RuntimeError('Game worker could not complete.')
    return json.loads(child.stdout)


class GameService:
    def __init__(self, storage, files=None):
        self.storage = storage
        self.files = files
        self.lock = asyncio.Lock()

    async def privacy(self, args):
        async with self.lock:
            return await privacy(self.storage, SAVE_KEY, args)

    async def reset(self, args):
        async with self.lock:
            return await reset(self.storage, SAVE_KEY, args, lambda payload: asyncio.to_thread(evaluate, payload))

    async def invoke(self, args, context=None):
        if not isinstance(args, dict) or set(args) - {'command', 'name', 'request_id', 'language', 'birth_species', 'birth_element', 'choice_id', 'profile','home_payload','evolution_payload','equipment_payload'}:
            raise ValueError('Invalid game arguments.')
        language = args.get('language', 'en')
        if language not in ('en', 'ko', 'ja', 'zh-Hans', 'zh-Hant'):
            raise ValueError('Unsupported response language.')
        command = args.get('command')
        if not isinstance(command, str) or command not in ALLOWED:
            raise ValueError('Unsupported game command.')
        if command.startswith('equipment_') and not EQUIPMENT_ENABLED:
            return {'ok':False,'code':'equipment_disabled','msg':'Item fitting is unavailable pending image quality validation.'}
        equipment_payload=args.get('equipment_payload')
        if command.startswith('equipment_'):
            if not isinstance(equipment_payload,str) or not 1<=len(equipment_payload)<=1024:raise ValueError('A bounded equipment payload is required.')
        elif equipment_payload is not None:raise ValueError('Only equipment accepts equipment_payload.')
        birth_species = args.get('birth_species')
        birth_element = args.get('birth_element', 'random')
        if 'birth_species' in args or 'birth_element' in args:
            if command != 'start' or birth_species not in BIRTH_SPECIES or birth_element not in BIRTH_ELEMENTS:
                raise ValueError('Invalid drawing birth traits.')
        name = args.get('name', '')
        if not isinstance(name, str) or len(name) > 24 or any(ord(c) < 32 for c in name):
            raise ValueError('Pet names must be at most 24 characters without control characters.')
        if name and command != 'start':
            raise ValueError('Only start accepts a name.')
        choice_id = args.get('choice_id')
        if command in ('dungeon_safe', 'dungeon_risk', 'walk_collect', 'walk_leave'):
            if not isinstance(choice_id, str) or not re.fullmatch(r'[a-f0-9]{32}', choice_id):
                raise ValueError('A current choice_id is required.')
        elif choice_id is not None:
            raise ValueError('Only walk and dungeon choices accept choice_id.')
        profile = args.get('profile')
        if command == 'personality':
            if not isinstance(profile, str) or not 1<=len(profile)<=4096: raise ValueError('A bounded profile is required.')
        elif profile is not None: raise ValueError('Only personality accepts profile.')
        home_payload=args.get('home_payload')
        if command in ('home_buy','home_apply','home_undo'):
            if not isinstance(home_payload,str) or not 1<=len(home_payload)<=1024:raise ValueError('A bounded home payload is required.')
        elif home_payload is not None:raise ValueError('Only home actions accept home_payload.')
        evolution_payload=args.get('evolution_payload')
        if command in ('evolution_prepare','evolution_options','evolve'):
            if not isinstance(evolution_payload,str) or not 1<=len(evolution_payload)<=4096:raise ValueError('A bounded evolution payload is required.')
        elif evolution_payload is not None:raise ValueError('Only evolution actions accept evolution_payload.')
        event = args.get('request_id')
        if event is not None and (not isinstance(event, str) or not re.fullmatch(r'[A-Za-z0-9:_-]{1,128}', event)):
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
                            'msg': ('게임 데이터가 삭제되었습니다. 새 친구로 초기화하면 다시 시작할 수 있습니다.' if language == 'ko' else 'Your game data was removed. Start over to meet a new companion.')}
                if pending(previous):
                    return {'ok':False,'code':'reset_pending','reset_pending':True,'reset_id':previous['reset_id'],'msg':('초기화 정리를 완료해 주세요.' if language=='ko' else 'Finish resetting your saved data.')}
                previous = unpack(previous)
                awaiting_start = ready(previous)
                mode = disposition(previous, event) if event else 'read'
                computed = await asyncio.to_thread(evaluate, {
                    'command': 'status' if mode == 'expired' else command, 'name': name,
                    'request_id': event_key(event) if event and mode != 'expired' else None,
                    'state': None if awaiting_start else previous, 'choice_id':choice_id, 'profile':profile,'home_payload':home_payload,'evolution_payload':evolution_payload,'equipment_payload':equipment_payload,
                    'birth_species': birth_species if mode != 'expired' else None, 'birth_element': birth_element})
                if mode == 'expired' and computed['result'].get('code') != 'invalid_state':
                    computed['result'] = {'ok': False, 'code': 'request_expired', 'msg': ''}
                if command == 'equipment_apply' and mode == 'new' and computed['result'].get('ok'):
                    # Do not trust a caller-supplied image path or a UI success flag.
                    path=computed['state']['equipment']['portrait']['path']
                    if self.files is None:raise ValueError('Equipment file verification unavailable.')
                    listing=await self.files.list(prefix=path,limit=2,scope='app')
                    if not any(row.get('path')==path and type(row.get('size_bytes')) is int and row['size_bytes']>0 for row in listing.get('items',[])):
                        raise ValueError('Equipment image has not been stored.')
                committed = previous
                # Cache terminal failures too: retrying a failed action later
                # must not silently turn it into a successful, new game action.
                if mode == 'new' and isinstance(computed.get('state'), dict):
                    try:
                        candidate = commit_result(computed['state'], previous, event,
                                                  command, name, computed['result'], choice_id=choice_id, profile=profile,home_payload=home_payload,evolution_payload=evolution_payload,equipment_payload=equipment_payload)
                    except SaveCapacityError:
                        computed = await asyncio.to_thread(evaluate, {'command': 'status', 'state': None if awaiting_start else previous})
                        computed['result'] = {'ok': False, 'code': 'save_capacity', 'msg': ''}
                    else:
                        if awaiting_start:
                            candidate[ID_KEY]=previous[ID_KEY]
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
                            if precondition_failed(exc) and attempt < 2:
                                continue
                            raise
                        committed = candidate
                # Reads/replays never rewrite the save. Only expose the next
                # sequence after its game state and receipt commit together.
                return localize({**computed['result'], **computed.get('view', {}),
                                 'replayed': mode == 'replay', 'request_id_prefix': prefix(committed)}, command, language)
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
    files = FilesClient(write_frame=write)
    service = GameService(storage, files)
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
                if storage.dispatch_response(frame) or files.dispatch_response(frame):
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
