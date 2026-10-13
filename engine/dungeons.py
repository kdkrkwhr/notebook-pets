"""Small daily dungeon catalog and bounded exploration state. No AI decisions."""
import copy
from datetime import date, datetime, timedelta, timezone
import math
import time

CATALOG = {
    'hellgate': {'species': ['dragon', 'monster', 'ghost'], 'elements': ['fire', 'thunder', 'dark']},
    'icekingdom': {'species': ['mammal', 'bird', 'machine'], 'elements': ['water']},
    'dreamforest': {'species': ['plant', 'fairy', 'reptile'], 'elements': ['nature', 'earth', 'light']},
}
COMMANDS = {f'explore_{key}': key for key in CATALOG}
REWARD = 10
BONUS_PERCENT = 10
DISCOVERY_CHANCE = .25
LIFETIME = 24 * 60 * 60
KST = timezone(timedelta(hours=9))


def daily(st, day, now=None):
    now = time.time() if now is None else now
    saved = st.get('dungeons', {})
    # Old discoveries keep their original midnight deadline; reading never rewrites a save.
    legacy_end = (datetime.fromisoformat(saved.get('date', day)).replace(tzinfo=KST) + timedelta(days=1)).timestamp()
    expiries = {key: saved.get('expires_at', {}).get(key, legacy_end) for key in saved.get('discovered', [])}
    expiries = {key: end for key, end in expiries.items() if end > now}
    return {'date': day, 'discovered': list(expiries), 'expires_at': expiries,
            'cleared': list(saved.get('cleared', [])) if saved.get('date') == day else [],
            'misses': 0, 'last_run': copy.deepcopy(saved.get('last_run'))}


def discovery_day(state, key):
    return datetime.fromtimestamp(state['expires_at'][key] - LIFETIME, KST).date().isoformat()


def boss_element(key, day):
    # Use the discovery's KST date so preview and retries stay stable until expiry.
    elements = CATALOG[key]['elements']
    return elements[date.fromisoformat(day).toordinal() % len(elements)]


def discover(st, day, rng):
    now = time.time()
    state = daily(st, day, now)
    remaining = [key for key in CATALOG if key not in state['discovered'] and key not in state['cleared']]
    found = None
    if remaining:
        if rng.random() < DISCOVERY_CHANCE:
            found = remaining[rng.randrange(len(remaining))]
            state['discovered'].append(found)
            state['expires_at'][found] = now + LIFETIME
    # Retain the old save field for compatibility; it no longer guarantees a find.
    state['misses'] = 0
    st['dungeons'] = state
    return found


def view(st, day, type_mult):
    now = time.time()
    state = daily(st, day, now)
    return {'date': day, 'server_now': now, 'coins': st.get('coins', 0), 'last_run': state.get('last_run'),
            'entries': [{'id': key, 'discovered': key in state['discovered'],
                         'cleared': key in state['cleared'], 'cost': 1, 'reward': REWARD,
                         'expires_at': state['expires_at'][key],
                         'boss_element': boss_element(key, discovery_day(state, key)),
                         'attack_multiplier': type_mult(st['element'], boss_element(key, discovery_day(state, key))),
                         'habitat_species': value['species'],
                         'bonus_percent': BONUS_PERCENT if st['species'] in value['species'] else 0}
                        for key, value in CATALOG.items() if key in state['discovered']]}


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
    if 'expires_at' in state:
        expiries = state['expires_at']
        require(isinstance(expiries, dict) and set(expiries) == set(state['discovered']))
        for end in expiries.values():
            require(type(end) in (int, float) and math.isfinite(end) and 0 < end < 253402214400)
    else:
        require(set(state['cleared']) <= set(state['discovered']))
    require(type(state['misses']) is int and 0 <= state['misses'] <= 2)
    run = state.get('last_run')
    if run is None:
        return
    require(isinstance(run, dict) and run['dungeon_id'] in CATALOG)
    require(isinstance(run['id'], str) and len(run['id']) == 32)
    date.fromisoformat(run['date'])
    require(run['outcome'] in ('win', 'lose', 'draw'))
    require(type(run['coins_awarded']) is int and run['coins_awarded'] in (0, REWARD))
    require(run['coins_awarded'] == (REWARD if run['outcome'] == 'win' else 0))
    require(run['boss_element'] == boss_element(run['dungeon_id'], run.get('boss_date', run['date'])))
    require(type(run['bonus_percent']) is int and run['bonus_percent'] in (0, BONUS_PERCENT))
    require(type(run['rounds']) is int and 1 <= run['rounds'] <= 20)
    require(isinstance(run['turns'], list) and len(run['turns']) == run['rounds'])
    for field in ('hp_me', 'hp_enemy', 'max_hp_me', 'max_hp_enemy'):
        require(type(run[field]) in (int, float) and math.isfinite(run[field]) and run[field] >= 0)
    for frame in run['turns']:
        require(isinstance(frame, dict))
        for field in ('hp_me', 'hp_enemy'):
            require(type(frame[field]) in (int, float) and math.isfinite(frame[field]) and frame[field] >= 0)
