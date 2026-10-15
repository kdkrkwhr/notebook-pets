"""Small daily dungeon catalog and bounded exploration state. No AI decisions."""
import copy
import hashlib
from datetime import date, datetime, timedelta, timezone
import math
import time

CATALOG = {
    'hellgate': {'species': ['dragon', 'monster', 'ghost'], 'elements': ['fire', 'thunder', 'dark']},
    'icekingdom': {'species': ['mammal', 'bird', 'machine'], 'elements': ['water']},
    'dreamforest': {'species': ['plant', 'fairy', 'reptile'], 'elements': ['nature', 'earth', 'light']},
    # First expansion (NEXT_RELEASE.md): thunder/nature favored below the sea, nature/wind favored in the clockwork city.
    'sunkenpalace': {'species': ['reptile', 'plant'], 'elements': ['water', 'nature']},
    'clockworkcity': {'species': ['machine', 'monster'], 'elements': ['earth', 'dark']},
}
CHOICES = {'dungeon_safe', 'dungeon_risk'}
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
    # Retire completed discoveries before resetting daily rewards at midnight.
    expiries = {key: end for key, end in expiries.items() if end > now and key not in saved.get('cleared', [])}
    return {'date': day, 'discovered': list(expiries), 'expires_at': expiries,
            'cleared': list(saved.get('cleared', [])) if saved.get('date') == day else [],
            'misses': 0, 'last_run': copy.deepcopy(saved.get('last_run')),
            'expedition': copy.deepcopy(saved.get('expedition')) if saved.get('expedition', {}).get('phase') == 'choice' or saved.get('expedition', {}).get('dungeon_id') in expiries else {}}


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
    if not state['discovered'] and not state.get('expedition') and remaining:
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
            'expedition': state.get('expedition', {}),
            'entries': [{'id': key, 'discovered': key in state['discovered'],
                         'cleared': key in state['cleared'], 'cost': 1, 'reward': REWARD,
                         'room_count': len(room_plan(key, discovery_day(state, key))),
                         'expires_at': state['expires_at'][key],
                         'boss_element': boss_element(key, discovery_day(state, key)),
                         'attack_multiplier': type_mult(st['element'], boss_element(key, discovery_day(state, key))),
                         'habitat_species': value['species'],
                         'bonus_percent': BONUS_PERCENT if st['species'] in value['species'] else 0}
                        for key, value in CATALOG.items() if key in state['discovered']]}


def room_plan(key, day):
    """Stable 3–6 room layout for this discovery; retries do not reroll its length."""
    count = 3 + hashlib.sha256(f'{key}:{day}'.encode()).digest()[0] % 4
    enemies = ['slime', 'bat', 'beetle', 'sentinel']
    rooms = []
    for index in range(count):
        kind = 'boss' if index == count - 1 else 'rest' if count >= 4 and index == count - 3 else 'battle'
        rooms.append({'index': index, 'kind': kind, 'enemy': 'guardian' if kind == 'boss' else None if kind == 'rest' else enemies[sum(r['kind']=='battle' for r in rooms) % 4]})
    return rooms


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
    validate_expedition(state.get('expedition', {}))
    run = state.get('last_run')
    if run and run.get('format') == 'stage-v1':
        validate_stage(run)
        return
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

    if 'rooms' in run:
        plan = room_plan(run['dungeon_id'], run.get('boss_date', run['date']))
        require(type(run.get('room_count')) is int and run['room_count'] == len(plan))
        rooms = run['rooms']
        require(isinstance(rooms, list) and 1 <= len(rooms) <= len(plan))
        require(run['outcome'] != 'win' or len(rooms) == len(plan))
        expected_hp = run['max_hp_me']
        for index, room in enumerate(rooms):
            require(isinstance(room, dict))
            require(all(room.get(k) == v for k, v in plan[index].items()))
            require(type(room.get('start_hp')) in (int, float) and math.isfinite(room['start_hp']) and 0 <= room['start_hp'] <= run['max_hp_me'])
            require(room['start_hp'] == expected_hp)
            if room['kind'] == 'rest':
                require(type(room.get('hp_me')) in (int, float) and math.isfinite(room['hp_me']) and room['start_hp'] <= room['hp_me'] <= run['max_hp_me'])
            else:
                combat = room.get('combat')
                require(isinstance(combat, dict))
                validate({'dungeons': {**state, 'last_run': {**{k:v for k,v in run.items() if k not in ('rooms', 'room_count')}, **combat, 'coins_awarded': REWARD if combat['outcome']=='win' else 0}}})
                require(combat['max_hp_me'] == run['max_hp_me'])
                require(index == len(rooms)-1 or combat['outcome'] == 'win')
            expected_hp = room['hp_me'] if room['kind']=='rest' else room['combat']['hp_me']
        require(rooms[-1]['kind'] != 'rest' and rooms[-1]['combat']['outcome'] == run['outcome'])


def ensure(condition):
    if not condition:
        raise ValueError("Invalid dungeon stage state")


def validate_expedition(ex):
    if not ex:
        return
    ensure(isinstance(ex, dict) and ex['dungeon_id'] in CATALOG)
    ensure(ex['phase'] in ('choice', 'next'))
    ensure(isinstance(ex['id'], str) and len(ex['id']) == 32)
    plan = room_plan(ex['dungeon_id'], ex['boss_date'])
    ensure(type(ex['index']) is int and 0 <= ex['index'] < len(plan))
    ensure(ex['room_count'] == len(plan))
    ensure(type(ex['max_hp']) in (int, float) and math.isfinite(ex['max_hp']) and ex['max_hp'] > 0)
    ensure(type(ex['hp']) in (int, float) and math.isfinite(ex['hp']) and 0 < ex['hp'] <= ex['max_hp'])
    ensure(ex['bonus_percent'] in (0, BONUS_PERCENT))
    ensure(ex['event'] in ('fork', 'trap', 'sanctuary'))
    ensure(isinstance(ex['choice_id'], str) and len(ex['choice_id']) == 32)


def validate_stage(run):
    ensure(run['dungeon_id'] in CATALOG and len(run['id']) == 32)
    plan = room_plan(run['dungeon_id'], run['boss_date'])
    ensure(run['room_count'] == len(plan) and len(run['rooms']) == 1)
    room = run['rooms'][0]
    ensure(type(room['index']) is int and 0 <= room['index'] < len(plan))
    ensure(all(room[k] == v for k, v in plan[room['index']].items()))
    ensure(run['choice'] in ('safe', 'risk'))
    ensure(run['outcome'] in ('win', 'lose', 'draw'))
    ensure(run['complete'] == (room['kind'] == 'boss' and run['outcome'] == 'win'))
    ensure(run['coins_awarded'] == (REWARD if run['complete'] else 0) + run['route_coins'])
    ensure(type(run['route_coins']) is int and run['route_coins'] in (0, 2))
    ensure(not run['route_coins'] or run['choice'] == 'risk')
    for key in ('hp_me', 'max_hp_me', 'hp_enemy', 'max_hp_enemy', 'trap_damage'):
        ensure(type(run[key]) in (int, float) and math.isfinite(run[key]) and run[key] >= 0)
    ensure(0 <= run['hp_me'] <= run['max_hp_me'] and 0 <= room['start_hp'] <= run['max_hp_me'])
    if room['kind'] == 'rest':
        ensure(run['outcome'] == 'win' and run['turns'] == [])
        ensure(room['hp_me'] == run['hp_me'])
    else:
        combat = room['combat']
        ensure(all(run[k] == combat[k] for k in ('hp_me','hp_enemy','max_hp_me','max_hp_enemy','turns','outcome','rounds')))
        legacy = {k:v for k,v in run.items() if k not in ('format','rooms','room_count')}
        legacy['coins_awarded'] = REWARD if run['outcome'] == 'win' else 0
        validate({'dungeons': {'date':run['date'],'discovered':[],'cleared':[], 'misses':0,'last_run':legacy}})
