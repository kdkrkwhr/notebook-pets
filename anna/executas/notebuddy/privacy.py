"""Irreversible game removal, separate from normal play and reward receipts."""
from executa_sdk import StorageError
from executa_sdk.storage import STORAGE_ERR_PRECONDITION_FAILED

TOMBSTONE = {'_notebuddy_erased': 1}
CONFIRMATION = 'DELETE NOTEBUDDY'


def erased(value):
    return isinstance(value, dict) and value.get('_notebuddy_erased') == 1


async def privacy(storage, key, args):
    if not isinstance(args, dict) or set(args) - {'action', 'confirmation', 'expected_etag'}:
        raise ValueError('Invalid privacy arguments.')
    action = args.get('action')
    if action not in ('inspect', 'erase'):
        raise ValueError('Unsupported privacy action.')
    if action == 'inspect' and set(args) != {'action'}:
        raise ValueError('Inspect does not accept removal arguments.')
    if action == 'erase':
        if args.get('confirmation') != CONFIRMATION:
            raise ValueError('Explicit DELETE NOTEBUDDY confirmation is required.')
        if not isinstance(args.get('expected_etag'), str) or not args['expected_etag']:
            raise ValueError('Read the current removal preview first.')
    saved = await storage.get(key, scope='tool')
    removed = erased(saved.get('value'))
    if action == 'inspect':
        return {'ok': True, 'exists': bool(saved.get('exists')), 'erased': removed,
                'etag': saved.get('etag') if saved.get('exists') else None}
    # A lost successful response can be retried with the exact same arguments.
    if removed:
        return {'ok': True, 'erased': True}
    # Never perform an unconditional first write for removal. APS does not
    # offer create-if-absent; the absent-save case remains a release blocker.
    if not saved.get('exists'):
        return {'ok': False, 'code': 'removal_unavailable', 'erased': False}
    if not saved.get('etag') or saved['etag'] != args['expected_etag']:
        return {'ok': False, 'code': 'removal_changed', 'erased': False}
    try:
        await storage.set(key, dict(TOMBSTONE), scope='tool', if_match=saved['etag'])
    except StorageError as exc:
        if exc.code == STORAGE_ERR_PRECONDITION_FAILED:
            return {'ok': False, 'code': 'removal_changed', 'erased': False}
        raise
    return {'ok': True, 'erased': True}
