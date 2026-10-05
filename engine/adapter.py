"""Bind a game tool to authenticated event metadata, outside the model's args."""
import engine
from runtime import validate_user_id


def bind_discord_event(author_id, message_id):
    """Trusted gateway calls this with event.author.id and event.id.

    Expose only the returned tool(command, arguments) to the model. It cannot
    select a sender or deduplication ID. Never expose arbitrary shell tools.
    """
    sender = validate_user_id(str(author_id))
    event_id = "discord:" + validate_user_id(str(message_id))

    def game_tool(command, arguments=()):
        if not isinstance(command, str):
            return engine.out(False, "명령 형식이 올바르지 않습니다.", code="invalid_arguments")
        canonical = engine.ALIASES.get(command, command)
        if canonical not in engine.PLAYER_COMMANDS:
            return engine.out(False, "게임 명령만 실행할 수 있습니다.", code="forbidden")
        return engine.execute(sender, canonical, arguments, request_id=event_id)

    return game_tool
