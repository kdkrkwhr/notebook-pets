"""Isolated Anna adapter: JSON state enters the shared core directly.

Anna authenticates the APS bucket; '1' is its private internal player slot.
The adapter loads bundled rules, supplies system dependencies and builds views.
No temporary save files, process environment changes or OS locks are needed.
"""
import json
from pathlib import Path
import random
import sys
import time
import uuid

ALLOWED = frozenset({'equipment_prepare','equipment_apply','equipment_cancel','evolution_prepare','evolution_options','evolve','home','home_buy','home_apply','home_undo','personality', 'start', 'status', 'feed', 'snack', 'play', 'sleep', 'train',
                     'walk_begin', 'walk_collect', 'walk_leave', 'walk', 'battle', 'flee', 'attendance', 'quests', 'claimquest',
                     'album', 'titles', 'help', 'explore_hellgate', 'explore_icekingdom', 'explore_dreamforest',
                     'explore_sunkenpalace', 'explore_clockworkcity', 'dungeon_safe', 'dungeon_risk'})


def run(payload):
    command = payload.get('command')
    if command not in ALLOWED:
        return {'result': {'ok': False, 'code': 'forbidden', 'msg': '지원하지 않는 행동입니다.'},
                'changed': False}
    source = Path(__file__).parent / 'game_core'
    if not source.is_dir():
        source = Path(__file__).resolve().parents[3]
    sys.path.insert(0, str(source / 'engine'))
    import engine
    import art
    import memories
    from game_api import transition
    from ports import ExecutionContext, execution
    context = ExecutionContext(
        rules=json.loads((source / 'data' / 'game_data.json').read_text(encoding='utf-8')),
        templates=json.loads((source / 'data' / 'image_prompts.json').read_text(encoding='utf-8')),
        now=time.time(), rng=random, new_id=lambda: uuid.uuid4().hex)
    with execution(context):
        previous = payload.get('state')
        if previous is not None:
            previous = engine.migrate_state(previous, '1')
        arguments = [payload['name']] if command == 'start' and payload.get('name') else []
        if command in ('dungeon_safe', 'dungeon_risk', 'walk_collect', 'walk_leave'):
            arguments = [payload.get('choice_id', '')]
        if command == 'personality': arguments = [payload.get('profile', '')]
        if command in ('home_buy','home_apply','home_undo'):arguments=[payload.get('home_payload','')]
        if command.startswith('equipment_'):arguments=[payload.get('equipment_payload','')]
        if command in ('evolution_prepare','evolution_options','evolve'):arguments=[payload.get('evolution_payload','')]
        outcome = transition(previous, command, context, actor_id='1', arguments=arguments, request_id=payload.get('request_id'))
        result, current = outcome.result, outcome.state
        # Only the new local candidate is adjusted before its single APS commit.
        # Replays and already-created pets never reapply or reroll these traits.
        species, element = payload.get('birth_species'), payload.get('birth_element', 'random')
        if species is not None:
            if command != 'start' or species not in engine.G['species'] or element not in (*engine.G['elements'], 'random'):
                raise ValueError('Invalid drawing birth traits')
            if previous is None and current and result.get('ok'):
                current['species'] = species
                if element != 'random':
                    current['element'] = element
                result.update(species=engine.G['species'][species]['name_kr'],
                              element=engine.G['elements'][current['element']]['name_kr'],
                              image_key=art.describe(current)['key'], image=art.describe(current))
                request = payload.get('request_id')
                if request in current.get('processed_requests', {}):
                    current['processed_requests'][request]['result'] = result.copy()
        status = transition(current, 'status', context).result if current else None
        album = transition(current, 'album', context).result.get('album') if current else None
        view = {'status': status, 'album': album, 'memories': memories.view(current) if current else []}
        if current:
            import home
            view['home']=home.view(current)
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
