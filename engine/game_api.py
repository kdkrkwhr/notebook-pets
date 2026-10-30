"""State-in/state-out game API. No filesystem, OS environment or network calls."""
import copy
from dataclasses import dataclass
import re
import engine
from domain import GameError, validate_user_id
from ports import Candidate, ExecutionContext, StateRepository, execution


@dataclass(frozen=True)
class TransitionResult:
    result: dict
    state: dict | None
    changed: bool
    events: tuple


def validate_request(actor_id, command, arguments, request_id):
    validate_user_id(actor_id)
    if not isinstance(command, str):
        raise GameError('invalid_arguments', '명령 형식이 올바르지 않습니다.')
    command = engine.ALIASES.get(command, command)
    # Cross-user ranking and administrator operations belong to local adapters.
    if command not in engine.PLAYER_COMMANDS or command == 'rank':
        raise GameError('forbidden', '지원하지 않는 행동입니다.')
    if not isinstance(arguments, (list, tuple)) or any(not isinstance(v, str) for v in arguments):
        raise GameError('invalid_arguments', '명령 인자가 올바르지 않습니다.')
    if request_id is not None and (not isinstance(request_id, str) or re.fullmatch(r'[A-Za-z0-9:_-]{1,128}', request_id) is None):
        raise GameError('invalid_request_id', '메시지 ID 형식이 올바르지 않습니다.')
    if command in engine.dungeons.CHOICES | {'walk_collect','walk_leave'}:
        if len(arguments) != 1 or re.fullmatch('[a-f0-9]{32}', arguments[0]) is None:
            raise GameError('invalid_arguments', 'A current choice_id is required.')
    elif command == 'personality':
        if len(arguments) != 1 or len(arguments[0]) > 4096:
            raise GameError('invalid_arguments', 'A bounded personality profile is required.')
    elif command in {'evolution_prepare','evolution_options','evolve'}:
        if len(arguments)!=1 or len(arguments[0])>4096:
            raise GameError('invalid_arguments','A bounded evolution request is required.')
    elif command in engine.equipment.COMMANDS:
        if len(arguments)!=1 or len(arguments[0])>1024:
            raise GameError('invalid_arguments','A bounded equipment request is required.')
    elif command in {'home_buy','home_apply','home_undo'}:
        if len(arguments)!=1 or len(arguments[0])>1024:
            raise GameError('invalid_arguments','A bounded home request is required.')
    elif command != 'start' and arguments:
        raise GameError('invalid_arguments', '이 명령에는 추가 인자가 필요하지 않습니다.')
    name = ' '.join(arguments)
    if command not in engine.equipment.COMMANDS | {'evolution_prepare','evolution_options','evolve','personality','home_buy','home_apply','home_undo'} and (len(name) > 80 or any(ord(c) < 32 for c in name)):
        raise GameError('invalid_arguments', '이름은 제어문자 없이 80자 이내로 입력해 주세요.')
    return command


def transition(state, command, context: ExecutionContext, *,
               actor_id='1', arguments=(), request_id=None):
    """Calculate one candidate. The caller alone decides whether to persist it.

    The state, rules and template input must be supplied by the host. Time is
    pinned for this command; random choices and IDs come from injected sources.
    Reads/replays never persist migration or mutate their input objects.
    """
    original = copy.deepcopy(state)
    candidate = Candidate(actor_id, state)
    try:
        with execution(context, candidate):
            canonical = validate_request(actor_id, command, arguments, request_id)
            if canonical == 'help':
                result = engine.cmd_help()
            elif request_id is not None and canonical not in engine.READ_COMMANDS:
                result = engine.execute_once(actor_id, canonical, arguments, request_id)
            else:
                result = engine.dispatch_player(actor_id, canonical, arguments)
        changed = candidate.written and candidate.state != original
        current = candidate.state if changed else original
        old_history = original.get('history', []) if original else []
        events = tuple(copy.deepcopy(current.get('history', [])[len(old_history):])) if changed else ()
        return TransitionResult(copy.deepcopy(result), copy.deepcopy(current), changed, events)
    except GameError as error:
        result = engine.out(False, str(error), code=error.code)
    except (KeyError, TypeError, ValueError, OverflowError):
        result = engine.out(False, '저장 데이터의 형식을 확인해 주세요.', code='invalid_state')
    return TransitionResult(result, original, False, ())


class GameApplication:
    """Repository transaction boundary; commit gameplay and its receipt together.

    Repositories must provide atomic creation and revision-checked replacement.
    A context factory supplies a fresh deterministic execution context per
    attempt. Storage exceptions propagate; uncommitted success is never returned.
    Anna retains its own asynchronous APS/receipt orchestration around transition.
    """
    def __init__(self, repository: StateRepository, context_factory, attempts=3):
        if type(attempts) is not int or not 1 <= attempts <= 10:
            raise ValueError('Invalid conflict retry limit')
        self.repository = repository
        self.context_factory = context_factory
        self.attempts = attempts

    def execute(self, actor_id, command, arguments=(), *, request_id=None):
        validate_user_id(actor_id)
        if not isinstance(command, str):
            raise GameError('invalid_arguments', '명령 형식이 올바르지 않습니다.')
        canonical = engine.ALIASES.get(command, command) if isinstance(command, str) else command
        if canonical not in engine.READ_COMMANDS and request_id is None:
            raise GameError('invalid_request_id', 'A stable request ID is required for a stored action.')
        for _ in range(self.attempts):
            snapshot = self.repository.load(actor_id)
            result = transition(snapshot.state, command, self.context_factory(), actor_id=actor_id,
                                arguments=arguments, request_id=request_id)
            if not result.changed:
                return result
            if self.repository.compare_and_set(actor_id, snapshot.revision, result.state):
                return result
        raise GameError('conflict', '저장 상태가 바뀌었습니다. 상태를 확인하고 같은 요청을 다시 시도해 주세요.')
