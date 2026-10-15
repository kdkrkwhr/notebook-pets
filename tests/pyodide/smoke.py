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
json.dumps({'platform':sys.platform,'xp':read.result['xp'],
            'owned':won.result['dungeon_run']['item_awarded'],
            'sameReplay':replay.result==won.result and not replay.changed,
            'filesystemAdapterLoaded':'local_runtime' in sys.modules or 'runtime' in sys.modules})
