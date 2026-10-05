"""Shared persistence and clock primitives for the CLI and scheduled jobs."""
import errno
import json
import os
import re
import tempfile
import time
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from pathlib import Path


KST = timezone(timedelta(hours=9), name="Asia/Seoul")
MISSING = object()
_transaction_date = ContextVar("transaction_date", default=None)


class GameError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def game_date():
    return _transaction_date.get() or datetime.now(KST).date()


@contextmanager
def game_clock():
    """Use one date throughout a transaction, including across midnight."""
    token = _transaction_date.set(game_date())
    try:
        yield
    finally:
        _transaction_date.reset(token)


def validate_user_id(value):
    # ASCII only: reject separators, signs, whitespace, Unicode digits and paths.
    if not isinstance(value, str) or re.fullmatch(r"[1-9][0-9]{0,19}", value) is None:
        raise GameError("invalid_user_id", "사용자 ID는 1~20자리의 양의 정수여야 합니다.")
    return value


def read_json(path):
    try:
        with open(path, encoding="utf-8") as stream:
            return json.load(stream)
    except FileNotFoundError:
        return MISSING
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise GameError("storage_error", "저장 데이터를 읽을 수 없습니다. 관리자에게 문의해 주세요.") from exc


def atomic_write_json(path, value):
    """Replace the destination only after a complete, flushed write succeeds."""
    path = Path(path)
    temporary = None
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=".notebook-", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        temporary = None
    except (OSError, ValueError, TypeError) as exc:
        raise GameError("storage_error", "저장에 실패했습니다. 다시 시도해 주세요.") from exc
    finally:
        if temporary is not None:
            try:
                temporary.unlink()
            except OSError:
                pass


@contextmanager
def store_lock(state_dir, timeout=15):
    """One process-wide store lock: commands, owner changes and decay serialize.

    OS locks are released on process exit. Keep the lock file in place: deleting
    it would let another process lock a different file at the same path.
    """
    stream = None
    acquired = False
    try:
        Path(state_dir).mkdir(parents=True, exist_ok=True)
        stream = open(Path(state_dir) / ".store.lock", "a+b")
        if os.fstat(stream.fileno()).st_size == 0:
            stream.write(b"0")
            stream.flush()
        deadline = time.monotonic() + timeout
        while True:
            try:
                stream.seek(0)
                if os.name == "nt":
                    import msvcrt
                    msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                acquired = True
                break
            except OSError as exc:
                if exc.errno not in (errno.EACCES, errno.EAGAIN, errno.EDEADLK):
                    raise
                if time.monotonic() >= deadline:
                    raise GameError("busy", "다른 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.") from exc
                time.sleep(0.02)
        yield
    except OSError as exc:
        raise GameError("storage_error", "저장소에 접근할 수 없습니다. 관리자에게 문의해 주세요.") from exc
    finally:
        if stream is not None:
            try:
                if acquired:
                    stream.seek(0)
                    if os.name == "nt":
                        import msvcrt
                        msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
                    else:
                        import fcntl
                        fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
            finally:
                stream.close()
