"""Infrastructure adapters for the platform-neutral StateRepository contract."""
import copy
import hashlib
import json
from pathlib import Path
from threading import RLock
from domain import GameError, validate_user_id
from ports import Snapshot
from runtime import atomic_write_json, store_lock


class MemoryRepository:
    def __init__(self):
        self._rows = {}
        self._lock = RLock()

    def load(self, actor_id):
        validate_user_id(actor_id)
        with self._lock:
            state, revision = self._rows.get(actor_id, (None, None))
            return Snapshot(copy.deepcopy(state), revision)

    def compare_and_set(self, actor_id, revision, state):
        validate_user_id(actor_id)
        if state.get('user_id') != actor_id:
            raise ValueError('Repository scope mismatch')
        with self._lock:
            current = self._rows.get(actor_id, (None, None))[1]
            if revision != current:
                return False
            self._rows[actor_id] = (copy.deepcopy(state), str(int(current or '0') + 1))
            return True


class FileRepository:
    """Explicit root; atomic create/update is protected by the existing OS lock."""
    def __init__(self, state_directory):
        self.directory = Path(state_directory)

    def load(self, actor_id):
        validate_user_id(actor_id)
        try:
            raw = (self.directory / f'{actor_id}.json').read_bytes()
        except FileNotFoundError:
            return Snapshot(None, None)
        except OSError as error:
            raise GameError('storage_error', '저장 데이터를 읽을 수 없습니다.') from error
        try:
            state = json.loads(raw)
            if not isinstance(state, dict):
                raise ValueError('Invalid state')
        except (UnicodeError, ValueError) as error:
            raise GameError('storage_error', '저장 데이터가 손상됐습니다. 원본을 보존합니다.') from error
        return Snapshot(state, hashlib.sha256(raw).hexdigest())

    def compare_and_set(self, actor_id, revision, state):
        validate_user_id(actor_id)
        if state.get('user_id') != actor_id:
            raise ValueError('Repository scope mismatch')
        with store_lock(self.directory):
            if self.load(actor_id).revision != revision:
                return False
            atomic_write_json(self.directory / f'{actor_id}.json', state)
            return True
