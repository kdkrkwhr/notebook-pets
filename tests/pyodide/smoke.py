import sys
sys.path.insert(0, '/core')
import copy
import json
import random
from datetime import datetime
from game_api import transition
from ports import ExecutionContext
from domain import KST

rules = json.loads(rules_json)
templates = json.loads(templates_json)
ids = random.Random(1)
now = datetime(2026, 10, 15, 12, tzinfo=KST).timestamp()
context = ExecutionContext(rules, templates, now, random.Random(42),
                           lambda: f'{ids.getrandbits(128):032x}')
born = transition(None, 'start', context, arguments=['WASM buddy'], request_id='birth')
assert born.result['ok']
fed = transition(born.state, 'feed', context, request_id='food')
assert fed.result['ok']
read = transition(fed.state, 'status', context)
assert not read.changed
assert transition(fed.state, 'feed', context, request_id='food').result == fed.result

# Isolated high-stat fixture completes a final room; no production data exists.
state = copy.deepcopy(fed.state)
state['training_bonus'] = {'atk':1000, 'def':1000, 'hp':1000}
state['dungeons'] = {'date':'2026-10-15','discovered':['hellgate'], 'cleared':[],
                    'misses':0,'last_run':None,'expires_at':{'hellgate':now+86400}}
entered = transition(state, 'explore_hellgate', context, request_id='entry')
candidate = copy.deepcopy(entered.state)
ex = candidate['dungeons']['expedition']
ex.update(index=ex['room_count']-1, event='fork')
won = transition(candidate, 'dungeon_safe', context, arguments=[ex['choice_id']], request_id='win')
assert won.result['ok'], won.result
replay = transition(won.state, 'dungeon_safe', context, arguments=[ex['choice_id']], request_id='win')
assert won.state['collectibles'] == {'ember-horns':1}
equipment_payload=dict(pet_id=won.state['pet_id'],revision=0,id='a'*32,item_id='ember-horns',stage=1,source_path='assets/starters-v1/ghost_fire_stage1.png')
reserved=transition(won.state,'equipment_prepare',context,arguments=[json.dumps(equipment_payload)],request_id='equipment-reserve')
assert reserved.result['ok'],reserved.result
apply_payload=dict(pet_id=won.state['pet_id'],revision=1,id='a'*32)
worn=transition(reserved.state,'equipment_apply',context,arguments=[json.dumps(apply_payload)],request_id='equipment-apply')
assert worn.result['ok'] and worn.state['collectibles']=={}
assert worn.state['collectible_discoveries']==['ember-horns']
assert not transition(worn.state,'equipment_apply',context,arguments=[json.dumps(apply_payload)],request_id='equipment-apply').changed

home_state = copy.deepcopy(fed.state)
home_state['coins'] = 30
payload = dict(pet_id=home_state['pet_id'], revision=0, item_id='desk')
bought = transition(home_state, 'home_buy', context, arguments=[json.dumps(payload)], request_id='home-buy')
assert bought.result['ok'] and bought.state['coins'] == 20
plan = transition(bought.state, 'home', context)
selection = dict(pet_id=home_state['pet_id'], revision=1, candidate_id=plan.result['home_candidates'][0]['id'], reason='A quiet corner.')
decorated = transition(bought.state, 'home_apply', context, arguments=[json.dumps(selection)], request_id='home-apply')
assert decorated.result['ok'] and 'desk' in decorated.state['home']['layout']
assert not transition(decorated.state, 'home_apply', context, arguments=[json.dumps(selection)], request_id='home-apply').changed

json.dumps({'platform':sys.platform,'xp':read.result['xp'],
            'owned':won.result['dungeon_run']['item_awarded'],
            'sameReplay':replay.result==won.result and not replay.changed,
            'filesystemAdapterLoaded':'local_runtime' in sys.modules or 'runtime' in sys.modules})
