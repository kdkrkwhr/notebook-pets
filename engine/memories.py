"""Bounded lifetime milestones backed by actual gameplay evidence.

Views never mutate saves. A successful save retains known birth/evolution
evidence; new guardian victories are recorded inside their reward transaction.
Old stages, cumulative wins and the latest dungeon run cannot establish a first
victory, so none of them invent a milestone or a date.
"""
import copy
import math
import art
import dungeons


def timestamp(value):
    try:
        return value if type(value) in (int, float) and math.isfinite(value) and value >= 0 else None
    except OverflowError:
        return None


def milestone(st, kind, at, **details):
    suffix = str(details['stage']) if kind == 'evolved' else details.get('region')
    identity = art.pet_identity(st) + ':' + kind + (':' + suffix if suffix else '')
    return {'id':identity, 'kind':kind, 'at':timestamp(at), **details}


def validate(st):
    if 'milestones' not in st:
        return
    records = st['milestones']
    def require(ok):
        if not ok:
            raise ValueError('Invalid lifetime milestone')
    require(isinstance(records, list) and len(records) <= 9)
    seen = set()
    for record in records:
        require(isinstance(record, dict))
        kind = record.get('kind')
        require(kind in ('met', 'evolved', 'dungeon'))
        fields = {'stage'} if kind == 'evolved' else {'region'} if kind == 'dungeon' else set()
        require(set(record) == {'id', 'kind', 'at'} | fields)
        require(record['at'] is None or timestamp(record['at']) is not None)
        if kind == 'evolved':
            require(type(record['stage']) is int and 2 <= record['stage'] <= min(4, st['stage']))
        elif kind == 'dungeon':
            require(isinstance(record['region'], str) and record['region'] in dungeons.CATALOG)
        require(record['id'] == milestone(st, kind, record['at'], **{k:record[k] for k in fields})['id'])
        require(record['id'] not in seen)
        seen.add(record['id'])


def view(st):
    """Return saved milestones plus reliable legacy evidence, without a write."""
    records = {record['id']:copy.deepcopy(record) for record in st.get('milestones', [])}
    saved = set(records)
    def add(kind, at, **details):
        record = milestone(st, kind, at, **details)
        previous = records.get(record['id'])
        if previous is None or (record['id'] not in saved and previous['at'] is None and record['at'] is not None):
            records[record['id']] = record
    for event in st.get('history', []):
        if event.get('event') == 'hatched':
            add('met', event.get('ts'))
        elif event.get('event') == 'evolved' and type(event.get('stage')) is int and 2 <= event['stage'] <= min(4, st['stage']):
            add('evolved', event.get('ts'), stage=event['stage'])
    for record in (st.get('evolution') or {}).get('records', []):
        add('evolved', record['at'], stage=record['stage'])
    return list(records.values())


def retain(st):
    """Called only while preparing an existing successful gameplay write."""
    st['milestones'] = view(st)


def guardian_victory(st, region, at):
    retain(st)
    record = milestone(st, 'dungeon', at, region=region)
    if all(previous['id'] != record['id'] for previous in st['milestones']):
        st['milestones'].append(record)
