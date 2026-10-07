"""Bind a game tool to authenticated event metadata, outside the model's args."""
import re
import engine
from runtime import validate_user_id


READ_COMMANDS = engine.READ_COMMANDS


def tool_definition(*, writable=True):
    """Provider-neutral function definition; identity never belongs in args."""
    commands = engine.PLAYER_COMMANDS if writable else READ_COMMANDS
    return {
        'name': 'notebook_game',
        'description': 'Execute one pet game command. The engine result is authoritative. '
                       'Only start accepts arguments (optional pet name as strings); '
                       'all other commands take an empty array. Never invent rewards or stats.',
        'parameters': {
            'type': 'object', 'additionalProperties': False,
            'properties': {
                'command': {'type': 'string', 'enum': sorted(commands)},
                'arguments': {'type': 'array', 'items': {'type': 'string'}},
            },
            'required': ['command'],
        },
    }


def bind_game_event(actor_id, event_id=None):
    """Trusted host supplies a stable, namespaced event ID; None is read-only.

    Reuse the same ID on retries, even when changing the model/provider.
    One event permits at most one successfully committed mutation.
    """
    sender = validate_user_id(str(actor_id))
    if event_id is not None and (not isinstance(event_id, str) or
            re.fullmatch(r'[A-Za-z0-9:_-]{1,128}', event_id) is None):
        raise ValueError('event_id must be a stable ASCII ID of 1..128 characters')

    def game_tool(command, arguments=()):
        if not isinstance(command, str):
            return engine.out(False, 'Invalid command format.', code='invalid_arguments')
        canonical = engine.ALIASES.get(command, command)
        allowed = engine.PLAYER_COMMANDS if event_id is not None else READ_COMMANDS
        if canonical not in allowed:
            return engine.out(False, 'Command is not allowed for this connection.', code='forbidden')
        return engine.execute(sender, canonical, arguments, request_id=event_id)

    return game_tool


def dispatch_tool(tool, payload):
    """Validate a decoded function-call payload before calling the bound tool."""
    if (not isinstance(payload, dict) or 'command' not in payload or
            set(payload) - {'command', 'arguments'}):
        return engine.out(False, 'Invalid tool arguments.', code='invalid_arguments')
    return tool(payload['command'], payload.get('arguments', ()))


def bind_discord_event(author_id, message_id):
    """Trusted gateway calls this with event.author.id and event.id.

    Expose only the returned tool(command, arguments) to the model. It cannot
    select a sender or deduplication ID. Never expose arbitrary shell tools.
    """
    return bind_game_event(author_id, 'discord:' + validate_user_id(str(message_id)))
