"""Platform-neutral errors, identity validation and the game's calendar."""
import re
from datetime import timedelta, timezone

KST = timezone(timedelta(hours=9), name='Asia/Seoul')


class GameError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def validate_user_id(value):
    if not isinstance(value, str) or re.fullmatch(r'[1-9][0-9]{0,19}', value) is None:
        raise GameError('invalid_user_id', '사용자 ID는 1~20자리의 양의 정수여야 합니다.')
    return value
