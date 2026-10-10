"""Bounded Anna retry results with a persistent high-water mark.

IDs issued from the current prefix are eligible once. Retained IDs replay the
original outcome; forgotten or out-of-order IDs are rejected, never re-executed.
The sequence, results and game state are committed in one conditional APS write.
"""
import copy
import hashlib
import json
import re

META = '_anna_requests'
FORMAT = '_anna_save_format'
MAX_SEQUENCE = 9_007_199_254_740_991
MAX_RECEIPTS = 64
MAX_RECEIPT_BYTES = 24 * 1024
MAX_SAVE_BYTES = 48 * 1024  # Below both documented APS defaults (64/256 KiB).
EPOCH_PATTERN = re.compile(r'nb3:([0-9a-f]{32}):(0|[1-9][0-9]{0,15}):[A-Za-z0-9_-]{1,64}')
PATTERN = re.compile(r'nb2:(0|[1-9][0-9]{0,15}):[A-Za-z0-9_-]{1,64}')


class SaveCapacityError(ValueError):
    pass


def unpack(document):
    if document is None or FORMAT not in document:
        return document
    if (type(document.get(FORMAT)) is not int or document[FORMAT] not in (2, 3) or
            not isinstance(document.get('game'), dict) or
            set(document) != {FORMAT, 'game'}):
        raise ValueError('Invalid save format; original preserved.')
    request_meta = document['game'].get(META)
    epoch = request_meta.get('epoch') if isinstance(request_meta, dict) else None
    if (document[FORMAT] == 3) != (epoch is not None):
        raise ValueError('Invalid save epoch; original preserved.')
    return document['game']


def pack(state):
    # Old adapters pass the whole value into the original engine, whose strict
    # state validation rejects this envelope. They cannot bypass retired IDs.
    request_meta = state.get(META)
    epoch = request_meta.get('epoch') if isinstance(request_meta, dict) else None
    return {FORMAT: 3 if epoch else 2, 'game': state}


def byte_size(value):
    # ASCII escaping and default spaces overestimate compact UTF-8 serializers.
    return len(json.dumps(value, ensure_ascii=True, allow_nan=False).encode('utf-8'))


def event_key(request_id):
    return 'anna:' + hashlib.sha256(request_id.encode()).hexdigest()


def metadata(state):
    if state is None or META not in state:
        return {'version': 1, 'next_sequence': 0, 'order': []}
    value = state[META]
    if (not isinstance(value, dict) or type(value.get('version')) is not int or value.get('version') != 1 or
            type(value.get('next_sequence')) is not int or
            not 0 <= value['next_sequence'] <= MAX_SEQUENCE or
            not isinstance(value.get('order'), list) or len(value['order']) > MAX_RECEIPTS):
        raise ValueError('Invalid request history; original save preserved.')
    if 'epoch' in value and (not isinstance(value['epoch'], str) or not re.fullmatch(r'[0-9a-f]{32}', value['epoch'])):
        raise ValueError('Invalid request epoch; original save preserved.')
    order = value['order']
    if (any(not isinstance(k, str) for k in order) or len(set(order)) != len(order) or
            set(order) != set(state.get('processed_requests', {}))):
        raise ValueError('Invalid request history; original save preserved.')
    return value


def prefix(state):
    current = metadata(state)
    if current.get('epoch'):
        return f'nb3:{current["epoch"]}:{current["next_sequence"]}:'
    return f'nb2:{current["next_sequence"]}:'


def disposition(state, request_id):
    current = metadata(state)
    if event_key(request_id) in (state or {}).get('processed_requests', {}):
        return 'replay'
    if current.get('epoch'):
        parsed = EPOCH_PATTERN.fullmatch(request_id)
        sequence = int(parsed[2]) if parsed and parsed[1] == current['epoch'] else -1
    else:
        parsed = PATTERN.fullmatch(request_id)
        sequence = int(parsed[1]) if parsed else -1
    if sequence == current['next_sequence'] < MAX_SEQUENCE:
        return 'new'
    return 'expired'


def commit_result(state, previous, request_id, command, name, result):
    """Prepare a candidate; caller must use the ETag of previous for the write."""
    value = copy.deepcopy(state)
    key = event_key(request_id)
    receipts = value.setdefault('processed_requests', {})
    receipts[key] = {'command': command, 'arguments': [name] if command == 'start' and name else [],
                     'result': copy.deepcopy(result)}
    current = metadata(previous)
    # APS JSON objects need not preserve insertion order. New receipts have an
    # explicit order; legacy receipts have no reliable age and are retained only
    # as space allows, with deterministic ordering until migration completes.
    order = list(current['order']) if previous and META in previous else sorted(receipts)
    order = [item for item in order if item != key] + [key]
    for old in order[:-MAX_RECEIPTS]:
        del receipts[old]
    order = order[-MAX_RECEIPTS:]
    while byte_size(receipts) > MAX_RECEIPT_BYTES:
        if len(order) <= 1:
            raise SaveCapacityError('Action result is too large to save safely.')
        del receipts[order.pop(0)]
    value[META] = {'version': 1, 'next_sequence': current['next_sequence'] + 1, 'order': order}
    if current.get('epoch'):
        value[META]['epoch'] = current['epoch']
    if byte_size(pack(value)) > MAX_SAVE_BYTES:
        raise SaveCapacityError('Game save is too large to update safely.')
    return value
