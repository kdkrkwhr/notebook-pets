"""Produce disposable, real-engine views for store screenshots; no Anna account."""
import json
import copy
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
    garden_state=copy.deepcopy(state)
    # Disposable showcase currency; production saves are never read or written.
    garden_state['coins']=200
    for key in ['yard-cherry','yard-tulips','yard-lavender','yard-lily-pond','yard-garden-bench','yard-lantern','yard-herbs','yard-stone-cat','yard-roses','yard-windmill','yard-rock-garden','yard-birdbath']:
        payload=dict(pet_id=garden_state['pet_id'],revision=garden_state.get('home',{}).get('revision',0),item_id=key)
        garden_state,_=run('home_buy',garden_state,home_payload=json.dumps(payload))
    for _ in range(4):
        _,planned=run('home',garden_state)
        payload=dict(pet_id=garden_state['pet_id'],revision=planned['home']['revision'],candidate_id=planned['home_candidates'][0]['id'],reason='')
        payload['reason']='A welcoming garden with flowers, shade and a pond.'
        garden_state,garden=run('home_apply',garden_state,home_payload=json.dumps(payload))
    state, discovery = run('walk_begin', state)
    if any(entry['discovered'] for entry in discovery['status']['dungeons']['entries']):
        if discovery['status'].get('encounter'):
            state, discovery = run('flee', state)
        current=state.get('journey',{}).get('current')
        if current and current['state']=='pending':
            state,discovery=run('walk_leave',state,choice_id=current['choice_id'])
        print(json.dumps({'initial': initial, 'discovery': discovery,'garden':garden}, ensure_ascii=False))
        break
else:
    raise RuntimeError('No discovery in disposable screenshot games; rerun explicitly')
