"""Recognize the documented APS conflict across host error envelopes."""
import json
from executa_sdk.storage import STORAGE_ERR_PRECONDITION_FAILED


def precondition_failed(error):
    if error.code == STORAGE_ERR_PRECONDITION_FAILED:
        return True
    # Some Anna bridges wrap the HTTP response in a generic RPC error. Only
    # this exact write status + structured APS code permits conflict recovery.
    marker = 'storage.set HTTP 412: '
    message = getattr(error, 'message', '')
    if not isinstance(message, str) or not message.startswith(marker):
        return False
    try:
        body = json.loads(message[len(marker):])
        return body['detail']['error']['code'] == 'precondition_failed'
    except (ValueError, KeyError, TypeError):
        return False
