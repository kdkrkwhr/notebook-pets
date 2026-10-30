"""Truthful, bounded lifetime milestones use the gameplay commit boundary."""
import copy
from datetime import datetime
import json
from pathlib import Path
import random
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'engine'))
import engine
from domain import KST
from game_api import GameApplication, transition
from ports import ExecutionContext
from repositories import MemoryRepository

NOW = datetime(2026, 10, 30, 12, tzinfo=KST).timestamp()


class MemoryTests(unittest.TestCase):
    def context(self, now=NOW):
        ids = random.Random(12)
        return ExecutionContext(
            json.loads((ROOT / 'data/game_data.json').read_text(encoding='utf-8')),
            json.loads((ROOT / 'data/image_prompts.json').read_text(encoding='utf-8')),
            now, random.Random(42), lambda: f'{ids.getrandbits(128):032x}')

    def born(self):
        result = transition(None, 'start', self.context(), request_id='birth')
        self.assertTrue(result.result['ok'], result.result)
        return result.state

    def event(self, state, kind, at, **details):
        suffix = str(details['stage']) if kind == 'evolved' else details.get('region')
        return {'id': state['pet_id'] + ':' + kind + (':' + suffix if suffix else ''),
                'kind': kind, 'at': at, **details}

    def ready(self, state):
        state = copy.deepcopy(state)
        state['level'] = 50
        state['journey'] = engine.journeys.empty()
        state['journey'].update(counts={'feed':30, 'play':30, 'train':25, 'walk':30}, completed=3)
        return state

    def prepare(self, state, now=NOW):
        payload = {'pet_id':state['pet_id'], 'stage':state['stage']}
        result = transition(state, 'evolution_prepare', self.context(now),
                            arguments=[json.dumps(payload)], request_id=f"prepare-{state['stage']}")
        self.assertTrue(result.result['ok'], result.result)
        return result.state

    def evolve_arguments(self, state):
        return [json.dumps({'pet_id':state['pet_id'],
                            'choice_id':state['evolution']['pending']['id'], 'route_id':'keep'})]

    def dungeon_choice(self, state, region, now=NOW, final=True):
        state = copy.deepcopy(state)
        state['training_bonus'] = {'atk':1000, 'def':1000, 'hp':1000}
        state['dungeons'] = {'date':datetime.fromtimestamp(now, KST).date().isoformat(),
                            'discovered':[region], 'cleared':[], 'misses':0,
                            'last_run':None, 'expires_at':{region:now+86400}}
        entered = transition(state, 'explore_' + region, self.context(now))
        self.assertTrue(entered.result['ok'], entered.result)
        candidate = entered.state
        expedition = candidate['dungeons']['expedition']
        if final:
            expedition.update(index=expedition['room_count']-1, event='fork')
        return candidate, [expedition['choice_id']]

    def test_first_meeting_records_exact_time_once_without_read_writes(self):
        state = self.born()
        expected = [self.event(state, 'met', NOW)]
        self.assertEqual(state.get('milestones'), expected)
        before = copy.deepcopy(state)
        for command in ('status', 'album', 'home'):
            read = transition(state, command, self.context(NOW+500))
            self.assertTrue(read.result['ok'], read.result)
            self.assertFalse(read.changed)
            self.assertEqual(read.state, before)
        replay = transition(state, 'start', self.context(NOW+1000), request_id='birth')
        self.assertFalse(replay.changed)
        self.assertEqual(replay.state['milestones'], expected)
        self.assertEqual(state, before)

    def test_evolution_records_actual_choice_and_all_three_survive_pruned_history(self):
        state = self.ready(self.born())
        expected = [self.event(state, 'met', NOW)]
        for stage in (2, 3, 4):
            prepared = self.prepare(state, NOW+stage)
            self.assertEqual(prepared.get('milestones'), expected)
            arguments = self.evolve_arguments(prepared)
            evolved = transition(prepared, 'evolve', self.context(NOW+stage),
                                 arguments=arguments, request_id=f'evolve-{stage}')
            self.assertTrue(evolved.result['ok'], evolved.result)
            expected.append(self.event(state, 'evolved', NOW+stage, stage=stage))
            self.assertEqual(evolved.state.get('milestones'), expected)
            self.assertEqual(evolved.state['stats'], state['stats'])
            replay = transition(evolved.state, 'evolve', self.context(NOW+50),
                                arguments=arguments, request_id=f'evolve-{stage}')
            self.assertFalse(replay.changed)
            state = copy.deepcopy(evolved.state)
            state['history'] = [{'event':'ordinary', 'ts':NOW+60}]
        saved = transition(state, 'feed', self.context(NOW+100), request_id='feed')
        self.assertEqual(saved.state.get('milestones'), expected)

    def test_only_guardian_completion_records_each_region_and_repeated_wins_keep_first_time(self):
        state = self.born()
        ordinary, arguments = self.dungeon_choice(state, 'hellgate', final=False)
        ordinary = transition(ordinary, 'dungeon_safe', self.context(), arguments=arguments)
        self.assertTrue(ordinary.result['dungeon_run']['outcome'] == 'win')
        self.assertFalse(ordinary.result['dungeon_run']['complete'])
        self.assertEqual(ordinary.state.get('milestones'), [self.event(state, 'met', NOW)])
        for index, region in enumerate(engine.dungeons.CATALOG):
            candidate, arguments = self.dungeon_choice(state, region, NOW+index+1)
            won = transition(candidate, 'dungeon_safe', self.context(NOW+index+1),
                             arguments=arguments, request_id='win-' + region)
            self.assertTrue(won.result['dungeon_run']['complete'])
            self.assertIn(self.event(state, 'dungeon', NOW+index+1, region=region),
                          won.state.get('milestones', []))
            self.assertEqual(won.state['coins'] - candidate.get('coins', 0), 10)
            replay = transition(won.state, 'dungeon_safe', self.context(NOW+50),
                                arguments=arguments, request_id='win-' + region)
            self.assertFalse(replay.changed)
            self.assertEqual(replay.state, won.state)
            state = won.state
        again, arguments = self.dungeon_choice(state, 'hellgate', NOW+86400)
        again = transition(again, 'dungeon_safe', self.context(NOW+86400), arguments=arguments)
        self.assertEqual(again.state['milestones'], state['milestones'])
        state = self.ready(again.state)
        for stage in (2, 3, 4):
            prepared = self.prepare(state)
            state = transition(prepared, 'evolve', self.context(), arguments=self.evolve_arguments(prepared)).state
        state['history'] = []
        state['dungeons']['last_run'] = None
        saved = transition(state, 'feed', self.context(), request_id='final-feed')
        self.assertTrue(saved.result['ok'])
        self.assertEqual(len(saved.state['milestones']), 9)
        self.assertEqual(len({m['id'] for m in saved.state['milestones']}), 9)

    def test_old_evidence_is_derived_without_writes_then_saved_on_success(self):
        old = self.born()
        old.pop('milestones', None)
        old.update(level=50, stage=3, record={'win':999, 'lose':2})
        old['history'] = [{'event':'hatched', 'ts':1000}, {'event':'evolved', 'stage':2},
                          {'event':'caught', 'ts':1200}, {'event':'evolved', 'stage':3, 'ts':1300}]
        before = copy.deepcopy(old)
        read = transition(old, 'status', self.context())
        self.assertFalse(read.changed)
        self.assertEqual(read.state, before)
        saved = transition(old, 'feed', self.context(), request_id='backfill')
        expected = [self.event(old, 'met', 1000), self.event(old, 'evolved', None, stage=2),
                    self.event(old, 'evolved', 1300, stage=3)]
        self.assertEqual(saved.state.get('milestones'), expected)
        self.assertEqual(engine.memories.view(old), expected)
        self.assertEqual(old, before)
        self.assertEqual(saved.state['history'], before['history'])
        self.assertEqual(saved.state['record'], before['record'])

    def test_old_stage_and_win_totals_do_not_invent_events_or_current_dates(self):
        old = self.born()
        old.pop('milestones', None)
        old.update(level=50, stage=4, history=[], record={'win':999, 'lose':0})
        saved = transition(old, 'feed', self.context(), request_id='old-feed')
        self.assertEqual(saved.state.get('milestones'), [])

    def test_known_evolution_record_is_retained_when_history_has_rolled_away(self):
        prepared = self.prepare(self.ready(self.born()))
        evolved = transition(prepared, 'evolve', self.context(NOW+20), arguments=self.evolve_arguments(prepared))
        old = copy.deepcopy(evolved.state)
        old.pop('milestones')
        old['history'] = []
        saved = transition(old, 'feed', self.context(NOW+50), request_id='old-evolution')
        self.assertEqual(saved.state.get('milestones'), [self.event(old, 'evolved', NOW+20, stage=2)])

    def test_failed_action_and_replay_never_persist_legacy_evidence(self):
        old = self.born()
        old.pop('milestones')
        failed = transition(old, 'dungeon_safe', self.context(), arguments=['a'*32], request_id='stale')
        self.assertFalse(failed.result['ok'])
        self.assertFalse(failed.changed)
        self.assertEqual(failed.state, old)
        replay = transition(old, 'start', self.context(), request_id='birth')
        self.assertFalse(replay.changed)
        self.assertEqual(replay.state, old)

    def test_missing_or_invalid_legacy_dates_remain_unknown_without_blocking_a_valid_save(self):
        for at in (None, True, 'yesterday', -1, float('inf'), 10**1000):
            with self.subTest(at=repr(at)[:30]):
                old = self.born()
                old.pop('milestones')
                old['history'] = [{'event':'hatched', 'ts':at}]
                old['evolution'] = None
                saved = transition(old, 'feed', self.context(), request_id='unknown-date')
                self.assertTrue(saved.result['ok'], saved.result)
                self.assertEqual(saved.state.get('milestones'), [self.event(old, 'met', None)])

    def test_failed_repository_commit_does_not_persist_evolution_or_its_memory(self):
        state = self.prepare(self.ready(self.born()))
        self.assertEqual(len(state.get('milestones', [])), 1)
        repo = MemoryRepository()
        self.assertTrue(repo.compare_and_set('1', None, state))
        app = GameApplication(repo, self.context)
        with patch.object(repo, 'compare_and_set', side_effect=OSError('offline')):
            with self.assertRaises(OSError):
                app.execute('1', 'evolve', self.evolve_arguments(state), request_id='evolve')
        self.assertEqual(repo.load('1').state, state)
        completed = app.execute('1', 'evolve', self.evolve_arguments(state), request_id='evolve')
        self.assertEqual(completed.state['milestones'], [self.event(state, 'met', NOW),
                                                       self.event(state, 'evolved', NOW, stage=2)])
        self.assertFalse(app.execute('1', 'evolve', self.evolve_arguments(state), request_id='evolve').changed)

    def test_corrupt_milestones_are_rejected_without_overwriting_save(self):
        state = self.born()
        valid = self.event(state, 'met', NOW)
        for records in ([valid, valid], [{**valid, 'at':float('nan')}],
                        [{**valid, 'id':'another-pet:met'}], [{**valid, 'kind':'imagined'}],
                        [self.event(state, 'evolved', NOW, stage=4)],
                        [self.event(state, 'dungeon', NOW, region='imagined')]):
            with self.subTest(records=records):
                malformed = {**state, 'milestones':records}
                result = transition(malformed, 'feed', self.context(), request_id='corrupt')
                self.assertFalse(result.result['ok'])
                self.assertEqual(result.result['code'], 'invalid_state')
                self.assertFalse(result.changed)


if __name__ == '__main__':
    unittest.main()
