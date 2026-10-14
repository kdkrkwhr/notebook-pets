"""Produce disposable, real-engine views for store screenshots; no Anna account."""
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'executas' / 'notebuddy'))
from localization import localize


def run(command, state=None):
    payload = {'command': command, 'state': state, 'name': 'Mori'}
    process = subprocess.run(
        [sys.executable, '-B', '-X', 'utf8', str(root / 'executas/notebuddy/game_worker.py')],
        input=json.dumps(payload), text=True, encoding='utf-8', capture_output=True, check=True)
    value = json.loads(process.stdout)
    if not value['result']['ok']:
        raise RuntimeError(value['result'].get('code', 'Engine action failed'))
    response = localize({**value['result'], **value['view'], 'request_id_prefix': 'nb2:0:'}, command)
    return value['state'], response


for attempt in range(40):
    state, initial = run('start')
    state, discovery = run('walk_begin', state)
    if any(entry['discovered'] for entry in discovery['status']['dungeons']['entries']):
        if discovery['status'].get('encounter'):
            state, discovery = run('flee', state)
        print(json.dumps({'initial': initial, 'discovery': discovery}, ensure_ascii=False))
        break
else:
    raise RuntimeError('No discovery in disposable screenshot games; rerun explicitly')
