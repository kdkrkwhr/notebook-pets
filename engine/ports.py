"""Injected execution inputs. Importing the core never opens files or reads env."""
from collections.abc import Mapping
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
import copy
import importlib
import math
from types import SimpleNamespace
from typing import Callable, Protocol


@dataclass(frozen=True)
class ExecutionContext:
    rules: dict
    templates: dict
    now: float
    rng: object
    new_id: Callable[[], str]

    def __post_init__(self):
        if type(self.now) not in (int, float) or not math.isfinite(self.now) or self.now < 0:
            raise ValueError('A finite execution timestamp is required')


@dataclass(frozen=True)
class Snapshot:
    state: dict | None
    revision: str | None


class StateRepository(Protocol):
    def load(self, actor_id: str) -> Snapshot: ...
    def compare_and_set(self, actor_id: str, revision: str | None, state: dict) -> bool: ...


class Candidate:
    def __init__(self, actor_id, state):
        self.actor_id = actor_id
        self.state = copy.deepcopy(state)
        self.written = False

    def read(self, actor_id):
        if actor_id != self.actor_id:
            raise ValueError('Candidate scope mismatch')
        return copy.deepcopy(self.state)

    def write(self, state):
        if state.get('user_id') != self.actor_id:
            raise ValueError('Candidate scope mismatch')
        self.state = copy.deepcopy(state)
        self.written = True


_context = ContextVar('notebuddy_execution', default=None)


def current():
    return _context.get()


@contextmanager
def execution(context, candidate=None):
    token = _context.set((context, candidate))
    try:
        yield
    finally:
        _context.reset(token)


class ContextMapping(Mapping):
    def __init__(self, field):
        self.field = field

    def _value(self):
        bound = current()
        if bound:
            return getattr(bound[0], self.field)
        # Only legacy direct helper calls use the optional filesystem adapter.
        from local_runtime import default_data
        return default_data(self.field)

    def __getitem__(self, key): return self._value()[key]
    def __iter__(self): return iter(self._value())
    def __len__(self): return len(self._value())


class Dependency:
    def __init__(self, kind): self.kind = kind

    def __getattr__(self, name):
        bound = current()
        if bound:
            context = bound[0]
            if self.kind == 'time' and name == 'time':
                return lambda: context.now
            if self.kind == 'uuid' and name == 'uuid4':
                def identifier():
                    value = context.new_id()
                    import re
                    if not isinstance(value, str) or re.fullmatch('[a-f0-9]{32}', value) is None:
                        raise ValueError('IDs must be 32 lowercase hex characters')
                    return SimpleNamespace(hex=value)
                return identifier
            if self.kind == 'random':
                return getattr(context.rng, name)
            raise AttributeError(f'{self.kind}.{name} is not available in the core')
        return getattr(importlib.import_module(self.kind), name)


time = Dependency('time')
random = Dependency('random')
uuid = Dependency('uuid')
