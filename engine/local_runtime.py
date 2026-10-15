"""Filesystem/CLI compatibility adapter; never imported by an explicit transition."""
import json
import os
import sys
import re
import dungeons
from pathlib import Path
from functools import lru_cache
import engine as core
from runtime import MISSING, read_json, atomic_write_json, store_lock, game_clock, game_date

BASE = str(Path(__file__).resolve().parents[1])
DATA_ROOT = os.path.abspath(os.environ.get('NOTEBOOK_DATA_DIR', BASE))
STATE_DIR = os.path.join(DATA_ROOT, 'state')
ACCESS = os.path.join(DATA_ROOT, 'data', 'access.json')
ADMIN_IDS = {v.strip() for v in os.environ.get('NOTEBOOK_ADMIN_IDS', '').split(',') if v.strip()}

@lru_cache(maxsize=2)
def default_data(kind):
    name = {'rules':'game_data.json', 'templates':'image_prompts.json'}[kind]
    return json.loads((Path(BASE) / 'data' / name).read_text(encoding='utf-8'))

def read_state(actor_id):
    value = core.read_json(core.state_path(actor_id))
    return None if value is core.MISSING else core.migrate_state(value, actor_id)

def write_state(state):
    core.atomic_write_json(core.state_path(state['user_id']), state)

def state_path(uid):
    return os.path.join(core.STATE_DIR, f'{core.validate_user_id(uid)}.json')

def is_admin(uid):
    return uid in core.ADMIN_IDS

def load_access():
    a = core.read_json(core.ACCESS)
    if a is core.MISSING:
        return {'owner_id': '', 'owner_name': ''}
    return core.validate_access(a)

def save_access(a):
    core.atomic_write_json(core.ACCESS, a)

def access_check(uid):
    """소유주 게이트. 반환 (allowed, owner_name).
    소유주 미등록 → 전체 개방. 등록 시 → 소유주 본인 또는 관리자만."""
    a = core.load_access()
    owner = a.get('owner_id', '')
    if not owner:
        return (True, '')
    if uid == owner or core.is_admin(uid):
        return (True, a.get('owner_name', ''))
    return (False, a.get('owner_name', ''))

def cmd_set_owner(uid, target, name):
    """관리자 전용: 소유주 등록. 이후 그 ID(+관리자)만 게임 가능."""
    if not core.is_admin(uid):
        return core.out(False, '이 명령어는 관리자만 쓸 수 있어.')
    core.validate_user_id(target)
    core.save_access({'owner_id': target, 'owner_name': name or ''})
    return core.out(True, '소유주 등록 완료', owner_id=target, owner_name=name or '')

def cmd_clear_owner(uid):
    """관리자 전용: 소유주 해제 → 전체 개방으로 복귀."""
    if not core.is_admin(uid):
        return core.out(False, '이 명령어는 관리자만 쓸 수 있어.')
    core.save_access({'owner_id': '', 'owner_name': ''})
    return core.out(True, '소유주 해제 완료 — 이제 누구나 놀 수 있어.')

def cmd_reset(uid, target, name):
    """관리자 전용: 몬스터 초기화. reset <target_uid> [새이름]"""
    if uid not in core.ADMIN_IDS:
        return core.out(False, '이 명령어는 관리자만 쓸 수 있어.')
    st = core.load_state(target)
    if not st:
        return core.out(False, f'{target} 은(는) 몬스터가 없어.')
    old_name = st['name']
    if len(name) > 1:
        r = core.cmd_start(target, name, replace=True)
        return core.out(True, f"{old_name} 초기화 후 {r.get('species')} {name} 재탄생!", **{k: v for k, v in r.items() if k not in ('ok', 'msg')})
    os.remove(core.state_path(target))
    return core.out(True, f'{old_name} 초기화 완료. !공책시작 으로 다시 키울 수 있어.')

def cmd_rank():
    ranks = []
    for fn in os.listdir(core.STATE_DIR):
        if fn.endswith('.json'):
            s = core.load_state(fn[:-5])
            if s:
                ranks.append({'name': s['name'], 'lv': s['level'], 'win': s['record']['win']})
    ranks.sort(key=lambda r: (r['lv'], r['win']), reverse=True)
    return core.out(True, '', ranking=ranks[:10])

def execute(actor_id, command, arguments=(), *, request_id=None):
    """Trusted adapter entry point: actor_id comes from the platform session.

    This is not remote authentication: local CLI callers have OS-level access.
    Never let the LLM or message body choose actor_id or runtime environment vars.
    """
    try:
        command = core.ALIASES.get(command, command)
        if command not in core.COMMANDS:
            raise core.GameError('unknown_command', '모르는 커맨드입니다.')
        if not isinstance(arguments, (list, tuple)) or any((not isinstance(v, str) for v in arguments)):
            raise core.GameError('invalid_arguments', '명령 인자가 올바르지 않습니다.')
        bound_event = os.environ.get('NOTEBOOK_EVENT_ID')
        if bound_event is not None:
            if request_id is not None and request_id != bound_event:
                raise core.GameError('request_mismatch', '플랫폼 메시지 ID가 일치하지 않습니다.')
            request_id = bound_event
        if request_id is not None:
            if not isinstance(request_id, str) or re.fullmatch('[A-Za-z0-9:_-]{1,128}', request_id) is None:
                raise core.GameError('invalid_request_id', '메시지 ID 형식이 올바르지 않습니다.')
            if command not in core.PLAYER_COMMANDS:
                raise core.GameError('unsupported_request_id', '관리자 명령은 메시지 기반 게임 도구에서 실행할 수 없습니다.')
        if command == 'help':
            if arguments:
                raise core.GameError('invalid_arguments', '도움말에는 추가 인자가 필요하지 않습니다.')
            return core.cmd_help()
        if actor_id is not None:
            core.validate_user_id(actor_id)
        elif command != 'rank':
            raise core.GameError('invalid_user_id', '실제 발신자의 사용자 ID가 필요합니다.')
        authenticated = os.environ.get('NOTEBOOK_ACTOR_ID')
        if authenticated is not None:
            core.validate_user_id(authenticated)
            if actor_id is None:
                actor_id = authenticated
            elif actor_id != authenticated:
                raise core.GameError('actor_mismatch', '발신자와 요청 사용자 ID가 일치하지 않습니다.')
        for admin in core.ADMIN_IDS:
            core.validate_user_id(admin)
        if command in {'owner', 'reset'}:
            if not core.is_admin(actor_id):
                return core.out(False, '이 명령어는 관리자만 쓸 수 있어.', code='forbidden')
            if command == 'owner' and (not arguments):
                raise core.GameError('invalid_arguments', '소유주로 등록할 사용자 ID가 필요합니다.')
            target = core.validate_user_id(arguments[0] if arguments else actor_id)
        elif command in dungeons.CHOICES | {'walk_collect', 'walk_leave'}:
            if len(arguments) != 1 or re.fullmatch('[a-f0-9]{32}', arguments[0]) is None:
                raise core.GameError('invalid_arguments', 'A current choice_id is required.')
        elif command == 'personality':
            if len(arguments) != 1 or len(arguments[0]) > 4096:
                raise core.GameError('invalid_arguments', 'A bounded personality profile is required.')
        elif command != 'start' and arguments:
            raise core.GameError('invalid_arguments', '이 명령에는 추가 인자가 필요하지 않습니다.')
        name = ' '.join(arguments[1:] if command in {'owner', 'reset'} else arguments)
        if command != 'personality' and (len(name) > 80 or any((ord(ch) < 32 for ch in name))):
            raise core.GameError('invalid_arguments', '이름은 제어문자 없이 80자 이내로 입력해 주세요.')
        with core.store_lock(core.STATE_DIR), core.game_clock():
            if command == 'owner':
                return core.cmd_set_owner(actor_id, target, name)
            if command == 'clearowner':
                return core.cmd_clear_owner(actor_id)
            allowed, owner_name = core.access_check(actor_id)
            if not allowed:
                return core.out(False, 'not_owner', reason='not_owner', owner_name=owner_name)
            if command == 'reset':
                return core.cmd_reset(actor_id, target, name)
            if request_id is not None and actor_id is not None and (command not in core.READ_COMMANDS):
                return core.execute_once(actor_id, command, arguments, request_id)
            return core.dispatch_player(actor_id, command, arguments)
    except core.GameError as exc:
        return core.out(False, str(exc), code=exc.code)
    except (KeyError, TypeError, ValueError):
        return core.out(False, '저장 데이터의 형식을 확인해 주세요.', code='invalid_state')

def main():
    args = sys.argv[1:]
    if not args:
        result = core.execute(None, 'help')
    elif core.ALIASES.get(args[0], args[0]) in core.COMMANDS:
        command = core.ALIASES.get(args[0], args[0])
        if command == 'help' or (command == 'rank' and len(args) == 1):
            result = core.execute(None, command, args[1:])
        else:
            result = core.execute(args[1] if len(args) > 1 else None, command, args[2:])
    else:
        result = core.execute(args[0], args[1] if len(args) > 1 else '', args[2:])
    print(json.dumps(result, ensure_ascii=False))
    return result
