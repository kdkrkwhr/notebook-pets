"""Produce disposable, real-engine views for store screenshots; no Anna account."""
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'executas' / 'notebuddy'))
from localization import localize

demo_path = root / 'store/demo/provenance.json'
demo = json.loads(demo_path.read_text(encoding='utf-8')) if demo_path.exists() else None

def run(command, state=None, **arguments):
    payload = {'command': command, 'state': state, 'name': 'Mori'}
    payload.update(arguments)
    if command == 'start' and demo:
        payload.update(birth_species=demo['assessment']['species'], birth_element=demo['assessment']['element'])
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
    if demo and demo.get('personality'):
        state, initial = run('personality', state, profile=json.dumps(demo['personality']))
    state, discovery = run('walk_begin', state)
    if any(entry['discovered'] for entry in discovery['status']['dungeons']['entries']):
        if discovery['status'].get('encounter'):
            state, discovery = run('flee', state)
        print(json.dumps({'initial': initial, 'discovery': discovery}, ensure_ascii=False))
        break
else:
    raise RuntimeError('No discovery in disposable screenshot games; rerun explicitly')
