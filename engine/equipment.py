"""Cosmetic transactions. Image bytes are stored before the atomic apply command."""
import copy
import json
import re
import math
import art
import collectibles
from ports import time
from domain import GameError

COMMANDS = {'equipment_prepare', 'equipment_apply', 'equipment_cancel'}

def view(st):
    return copy.deepcopy(st.get('equipment', {'revision': 0, 'pending': None, 'portrait': None}))

def validate(st):
    e = view(st)
    if set(e) != {'revision', 'pending', 'portrait'} or type(e['revision']) is not int or e['revision'] < 0:
        raise ValueError('Invalid equipment')
    for p in (e['pending'], e['portrait']):
        if p is None: continue
        if (not isinstance(p, dict) or set(p) != {'id','item_id','stage','source_path','path','at'} or
            not isinstance(p['id'], str) or re.fullmatch('[a-f0-9]{32}', p['id']) is None or
            not isinstance(p['item_id'], str) or p['item_id'] not in collectibles.IDS or type(p['stage']) is not int or not 1 <= p['stage'] <= 4 or
            type(p['at']) not in (int,float) or not math.isfinite(p['at']) or p['at']<0 or
            not safe_source(p['source_path'], art.pet_identity(st)) or
            p['path'] != f"portraits/{art.pet_identity(st)}/equipment-{p['id']}.png"):
            raise ValueError('Invalid equipment record')

def safe_source(path, pet):
    return (isinstance(path, str) and len(path) <= 240 and
            re.fullmatch(r'[A-Za-z0-9_./-]+', path) is not None and
            all(p not in ('', '.', '..') for p in path.split('/')) and
            (path.startswith(f'portraits/{pet}/') or path.startswith('assets/starters-v1/')))

def request(st, command, raw):
    p = json.loads(raw)
    e = view(st)
    fields = {'pet_id','revision','id'} | ({'item_id','stage','source_path'} if command == 'equipment_prepare' else set())
    if (not isinstance(p, dict) or set(p) != fields or p['pet_id'] != art.pet_identity(st) or
        type(p['revision']) is not int or p['revision'] != e['revision'] or
        not isinstance(p['id'], str) or re.fullmatch('[a-f0-9]{32}', p['id']) is None):
        raise GameError('equipment_changed', '착용 요청이 바뀌었어요. 상태를 확인해 주세요.')
    if command == 'equipment_prepare':
        if (e['pending'] or p['item_id'] not in collectibles.IDS or
            st.get('collectibles', {}).get(p['item_id']) != 1 or type(p['stage']) is not int or
            p['stage'] != st['stage'] or not safe_source(p['source_path'], p['pet_id'])):
            raise GameError('equipment_unavailable', '현재 이 아이템을 착용할 수 없어요.')
        e['pending'] = {k:p[k] for k in ('id','item_id','stage','source_path')}
        if e['portrait'] and e['portrait']['id'] == p['id']:
            raise GameError('equipment_changed', 'Request already used')
        e['pending']['at'] = time.time()*1000
        e['pending']['path'] = f"portraits/{p['pet_id']}/equipment-{p['id']}.png"
    else:
        pending = e['pending']
        if not pending or pending['id'] != p['id']:
            raise GameError('equipment_changed', '착용 요청이 바뀌었어요.')
        if command == 'equipment_apply':
            if pending['stage'] != st['stage'] or st.get('collectibles', {}).get(pending['item_id']) != 1:
                raise GameError('equipment_changed', '친구 또는 아이템이 바뀌었어요.')
            # Preserve legacy discovery BEFORE removing ownership. No refund/unequip.
            st['collectible_discoveries'] = sorted(collectibles.discovered(st))
            del st['collectibles'][pending['item_id']]
            pending['at'] = time.time()*1000
            e['portrait'] = pending
        e['pending'] = None
    e['revision'] += 1
    st['equipment'] = e
    return {'ok': True, 'msg': '', 'equipment': copy.deepcopy(e)}
