"""Small daily dungeon catalog and bounded exploration state. No AI decisions."""
import copy
from datetime import date
import math

CATALOG = {
    'hellgate': {'species': ['dragon', 'monster', 'ghost'], 'elements': ['fire', 'thunder', 'dark']},
    'icekingdom': {'species': ['mammal', 'bird', 'machine'], 'elements': ['water']},
    'dreamforest': {'species': ['plant', 'fairy', 'reptile'], 'elements': ['nature', 'earth', 'light']},
}
COMMANDS = {f'explore_{key}': key for key in CATALOG}
REWARD = 10
BONUS_PERCENT = 10
DISCOVERY_CHANCE = .25
PITY_WALKS = 3


def daily(st, day):
    saved = st.get('dungeons', {})
    if saved.get('date') == day:
        return copy.deepcopy(saved)
    return {'date': day, 'discovered': [], 'cleared': [], 'misses': 0,
            'last_run': copy.deepcopy(saved.get('last_run'))}


def boss_element(key, day):
    # Preview and every retry face the same element for the entire KST day.
    elements = CATALOG[key]['elements']
    return elements[date.fromisoformat(day).toordinal() % len(elements)]


def discover(st, day, rng):
    state = daily(st, day)
    remaining = [key for key in CATALOG if key not in state['discovered']]
    found = None
    if remaining:
        if not state['discovered'] or state['misses'] >= PITY_WALKS - 1 or rng.random() < DISCOVERY_CHANCE:
            found = remaining[rng.randrange(len(remaining))]
            state['discovered'].append(found)
            state['misses'] = 0
        else:
            state['misses'] += 1
    st['dungeons'] = state
    return found


def view(st, day, type_mult):
    state = daily(st, day)
    return {'date': day, 'coins': st.get('coins', 0), 'last_run': state.get('last_run'),
            'entries': [{'id': key, 'discovered': key in state['discovered'],
                         'cleared': key in state['cleared'], 'cost': 1, 'reward': REWARD,
                         'boss_element': boss_element(key, day),
                         'attack_multiplier': type_mult(st['element'], boss_element(key, day)),
                         'habitat_species': value['species'],
                         'bonus_percent': BONUS_PERCENT if st['species'] in value['species'] else 0}
                        for key, value in CATALOG.items()]}


def validate(st):
    def require(condition):
        if not condition:
            raise ValueError('Invalid dungeon state')
    require(type(st.get('coins', 0)) is int and st.get('coins', 0) >= 0)
    if 'dungeons' not in st:
        return
    state = st['dungeons']
    require(isinstance(state, dict))
    date.fromisoformat(state['date'])
    for field in ('discovered', 'cleared'):
        values = state[field]
        require(isinstance(values, list) and all(isinstance(v, str) and v in CATALOG for v in values))
        require(len(values) == len(set(values)))
    require(set(state['cleared']) <= set(state['discovered']))
    require(type(state['misses']) is int and 0 <= state['misses'] < PITY_WALKS)
    run = state.get('last_run')
    if run is None:
        return
    require(isinstance(run, dict) and run['dungeon_id'] in CATALOG)
    require(isinstance(run['id'], str) and len(run['id']) == 32)
    date.fromisoformat(run['date'])
    require(run['outcome'] in ('win', 'lose', 'draw'))
    require(type(run['coins_awarded']) is int and run['coins_awarded'] in (0, REWARD))
    require(run['coins_awarded'] == (REWARD if run['outcome'] == 'win' else 0))
    require(run['boss_element'] == boss_element(run['dungeon_id'], run['date']))
    require(type(run['bonus_percent']) is int and run['bonus_percent'] in (0, BONUS_PERCENT))
    require(type(run['rounds']) is int and 1 <= run['rounds'] <= 20)
    require(isinstance(run['turns'], list) and len(run['turns']) == run['rounds'])
    for field in ('hp_me', 'hp_enemy', 'max_hp_me', 'max_hp_enemy'):
        require(type(run[field]) in (int, float) and math.isfinite(run[field]) and run[field] >= 0)
    for frame in run['turns']:
        require(isinstance(frame, dict))
        for field in ('hp_me', 'hp_enemy'):
            require(type(frame[field]) in (int, float) and math.isfinite(frame[field]) and frame[field] >= 0)
