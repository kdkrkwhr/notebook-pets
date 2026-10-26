"""Transport host for unchanged Anna GameService; no gameplay fork.

The isolated serialized WebWorker replaces OS threads/subprocesses. JS commits
returned writes with the input ETag before returning to the original Anna UI.
"""
import copy
import json
import notebuddy_plugin as plugin
import game_worker
from executa_sdk import StorageError


async def same_worker(function, *args, **kwargs):
    return function(*args, **kwargs)


plugin.evaluate = game_worker.run
plugin.asyncio.to_thread = same_worker


class LocalStorage:
    def __init__(self, row):
        self.row = copy.deepcopy(row)
        self.written = False

    async def get(self, key, scope=None):
        assert key == plugin.SAVE_KEY and scope == 'tool'
        return copy.deepcopy(self.row)

    async def set(self, key, value, scope=None, if_match=None):
        assert key == plugin.SAVE_KEY and scope == 'tool'
        if self.row.get('etag') != if_match:
            raise StorageError(-32023, 'Local storage conflict')
        self.row = {'exists': True, 'value': copy.deepcopy(value), 'etag': 'local-pending'}
        self.written = True
        return {'etag': 'local-pending'}


async def invoke_json(raw):
    request = json.loads(raw)
    storage = LocalStorage(request['row'])
    service = plugin.GameService(storage)
    method = request['method']
    if method not in ('game', 'privacy', 'reset'):
        raise ValueError('Unsupported tool')
    target = service.invoke if method == 'game' else getattr(service, method)
    result = await target(request['args'])
    return json.dumps({'result': result, 'written': storage.written,
                       'value': storage.row.get('value')}, ensure_ascii=False)
