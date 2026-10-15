"""Storage-free execution, deterministic dependencies and repository contracts."""
import copy
from datetime import datetime
import json
import os
from pathlib import Path
import random
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'engine'))
import engine
from domain import KST, GameError
from game_api import GameApplication, transition
from ports import ExecutionContext, execution
from repositories import FileRepository, MemoryRepository
import test_p0

NOW = datetime(2026,10,15,12,tzinfo=KST).timestamp()


class CoreTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed

    def context(self, seed=42, now=NOW):
        rules=json.loads((ROOT/'data/game_data.json').read_text(encoding='utf-8'))
        templates=json.loads((ROOT/'data/image_prompts.json').read_text(encoding='utf-8'))
        ids=random.Random(seed)
        return ExecutionContext(rules, templates, now, random.Random(seed),
                                lambda:f'{ids.getrandbits(128):032x}')

    def test_import_never_loads_filesystem_or_local_configuration(self):
        self.assertEqual(set(engine.BASE_COMMANDS),set(self.context().rules['commands']))
        code="""import sys
sys.path.insert(0, 'engine')
import game_api
assert 'local_runtime' not in sys.modules
assert 'runtime' not in sys.modules
print('pure-import-ok')
"""
        result=subprocess.run([sys.executable,'-B','-c',code],cwd=ROOT,capture_output=True,text=True,check=True,
            env={**os.environ,'NOTEBOOK_DATA_DIR':'Z:/must-not-be-used','NOTEBOOK_ADMIN_IDS':'not-an-id'})
        self.assertEqual(result.stdout.strip(),'pure-import-ok')

    def test_transition_uses_only_explicit_inputs_and_never_modifies_them(self):
        context=self.context();rules=copy.deepcopy(context.rules)
        with patch('builtins.open',side_effect=AssertionError('filesystem')), \
             patch.object(Path,'open',side_effect=AssertionError('filesystem')), \
             patch('time.time',side_effect=AssertionError('system clock')), \
             patch('uuid.uuid4',side_effect=AssertionError('system IDs')), \
             patch('os.getenv',side_effect=AssertionError('environment')):
            birth=transition(None,'start',context,arguments=['Portable'],request_id='birth')
            original=copy.deepcopy(birth.state)
            fed=transition(birth.state,'feed',context,request_id='food')
            read=transition(fed.state,'status',context)
        self.assertTrue(birth.result['ok']);self.assertTrue(fed.changed)
        self.assertEqual(read.result['xp'],10);self.assertFalse(read.changed)
        self.assertEqual(birth.state,original);self.assertEqual(context.rules,rules)
        self.assertEqual(birth.events[0]['ts'],NOW)

    def test_same_time_seed_and_ids_reproduce_birth_walk_and_replay(self):
        def run():
            c=self.context();born=transition(None,'start',c,request_id='birth')
            walked=transition(born.state,'walk',c,request_id='walk')
            replay=transition(walked.state,'walk',c,request_id='walk')
            self.assertFalse(replay.changed)
            self.assertEqual(replay.result,walked.result)
            return born,walked,replay
        self.assertEqual(run(),run())

    def test_cli_and_memory_core_keep_existing_gameplay_and_receipts(self):
        for command in ['start','feed','snack','play','sleep','train','walk','attendance','status','quests','album']:
            with self.subTest(command=command):
                state=None if command=='start' else self.seed()
                if command=='start':
                    path=self.state/'123.json'
                    if path.exists():path.unlink()
                args=['Portable'] if command=='start' else []
                context=self.context()
                context=ExecutionContext(context.rules,context.templates,NOW,random.Random(42),lambda:'a'*32)
                random.seed(42)
                with patch('time.time',return_value=NOW),patch('uuid.uuid4',return_value=uuid.UUID(hex='a'*32)), \
                     patch.object(engine,'game_date',return_value=datetime.fromtimestamp(NOW,KST).date()):
                    local=engine.execute('123',command,args,request_id='same-command')
                    portable=transition(state,command,context,actor_id='123',arguments=args,request_id='same-command')
                self.assertEqual(portable.result,local)
                if portable.changed:self.assertEqual(portable.state,engine.load_state('123'))

    def test_contexts_do_not_leak_and_corrupt_or_foreign_state_is_preserved(self):
        first=transition(None,'start',self.context(1),request_id='one')
        again=transition(None,'start',self.context(2),request_id='two')
        self.assertNotEqual(first.state['pet_id'],again.state['pet_id'])
        bad={**first.state,'coins':-1};before=copy.deepcopy(bad)
        result=transition(bad,'feed',self.context(),request_id='bad')
        self.assertFalse(result.result['ok']);self.assertFalse(result.changed);self.assertEqual(bad,before)
        foreign=transition(first.state,'feed',self.context(),actor_id='2',request_id='foreign')
        self.assertFalse(foreign.changed)
        for command in ['reset','owner','clearowner','rank']:
            self.assertEqual(transition(first.state,command,self.context()).result['code'],'forbidden')

    def test_atomic_create_and_stale_commit_contract_for_both_repositories(self):
        state=transition(None,'start',self.context(),request_id='birth').state
        for repo in [MemoryRepository(),FileRepository(self.root/'portable')]:
            empty=repo.load('1');self.assertIsNone(empty.revision)
            self.assertTrue(repo.compare_and_set('1',None,state))
            self.assertFalse(repo.compare_and_set('1',None,{**state,'xp':999}))
            current=repo.load('1')
            self.assertTrue(repo.compare_and_set('1',current.revision,{**state,'xp':10}))
            self.assertFalse(repo.compare_and_set('1',current.revision,{**state,'xp':999}))
            self.assertEqual(repo.load('1').state['xp'],10)
            current.state['xp']=777
            self.assertEqual(repo.load('1').state['xp'],10)

    def test_application_commit_failure_conflict_and_retry_do_not_claim_extra_rewards(self):
        repo=MemoryRepository();app=GameApplication(repo,self.context)
        first=app.execute('1','start',request_id='birth')
        self.assertEqual(app.execute('1','start',request_id='birth').result,first.result)
        with patch.object(repo,'compare_and_set',side_effect=OSError('offline')):
            with self.assertRaises(OSError):app.execute('1','feed',request_id='food')
        self.assertEqual(repo.load('1').state['xp'],0)
        commit=repo.compare_and_set;calls=[]
        def conflict_once(actor,revision,state):
            calls.append(1)
            return False if len(calls)==1 else commit(actor,revision,state)
        with patch.object(repo,'compare_and_set',side_effect=conflict_once):
            fed=app.execute('1','feed',request_id='food')
        self.assertEqual(fed.state['xp'],10);self.assertEqual(len(calls),2)
        self.assertFalse(app.execute('1','feed',request_id='food').changed)
        with patch.object(repo,'compare_and_set',return_value=False):
            with self.assertRaises(GameError) as error:app.execute('1','train',request_id='training')
        self.assertEqual(error.exception.code,'conflict');self.assertEqual(repo.load('1').state['xp'],10)
