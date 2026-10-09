"""Run unchanged game rules against one temporary, APS-scoped save.

This worker is process-isolated: legacy engine globals and OS file locks never
point at the Discord installation. Anna authenticates the APS tool bucket; `1`
is only the internal player slot within that already-private bucket.
"""
import json
import os
from pathlib import Path
import sys
import tempfile

ALLOWED = frozenset({'start', 'status', 'feed', 'snack', 'play', 'sleep', 'train',
                     'walk', 'battle', 'flee', 'attendance', 'quests', 'claimquest',
                     'album', 'titles', 'help'})


def run(payload):
    command = payload.get('command')
    if command not in ALLOWED:
        return {'result': {'ok': False, 'code': 'forbidden', 'msg': '지원하지 않는 행동입니다.'},
                'changed': False}
    with tempfile.TemporaryDirectory(prefix='notebuddy-') as temporary:
        for key in ('NOTEBOOK_ADMIN_IDS', 'NOTEBOOK_EVENT_ID'):
            os.environ.pop(key, None)
        os.environ.update(NOTEBOOK_DATA_DIR=temporary, NOTEBOOK_ACTOR_ID='1')
        source = Path(__file__).parent / 'game_core'
        if not source.is_dir():
            source = Path(__file__).resolve().parents[3]
        sys.path.insert(0, str(source / 'engine'))
        import engine
        import art
        from runtime import atomic_write_json

        previous = payload.get('state')
        save = Path(temporary) / 'state' / '1.json'
        if previous is not None:
            previous = engine.migrate_state(previous, '1')
            atomic_write_json(save, previous)
        arguments = [payload['name']] if command == 'start' and payload.get('name') else []
        result = engine.execute('1', command, arguments, request_id=payload.get('request_id'))
        current = json.loads(save.read_text(encoding='utf-8')) if save.is_file() else None
        status = engine.execute('1', 'status') if current else None
        album = engine.execute('1', 'album').get('album') if current else None
        view = {'status': status, 'album': album}
        if current:
            view['inventory'] = current['inventory']
            view['species_key'], view['element_key'] = current['species'], current['element']
            view['pet_id'] = art.pet_identity(current)
            view['stage'] = current['stage']
            view['image_prompt'] = art.build_prompt(current['species'], current['element'],
                current['stage'], current.get('evolution_branch'), False)
        return {'result': result, 'state': current, 'changed': current != previous, 'view': view}


def main():
    try:
        result = run(json.load(sys.stdin))
    except Exception:
        # Protocol-only stdout; do not expose saves or filesystem paths.
        result = {'result': {'ok': False, 'code': 'invalid_state',
                            'msg': '저장 데이터를 확인할 수 없습니다. 원본은 보존됩니다.'}, 'changed': False}
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
