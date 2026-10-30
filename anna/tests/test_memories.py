"""Notebook adapter projections preserve source data and read-only behavior."""
import json
from pathlib import Path
import subprocess
import sys
import unittest


class MemoryWorkerTests(unittest.TestCase):
    def test_worker_projects_milestones_without_changing_legacy_saves_or_walk_context(self):
        code = '''import copy,json
from game_worker import run
born=run({'command':'start','name':'Memory','request_id':'birth'})
assert born['view'].get('memories')==born['state']['milestones'], born['view'].get('memories')
assert isinstance(born['view']['status']['memories'],dict)
old=copy.deepcopy(born['state'])
old.pop('milestones')
old['history']=[{'event':'hatched','ts':1234}]
before=copy.deepcopy(old)
read=run({'command':'status','state':old})
assert not read['changed'] and read['state']==before and old==before
assert read['view']['memories']==[{'id':old['pet_id']+':met','kind':'met','at':1234}]
fed=run({'command':'feed','state':old,'request_id':'food'})
assert fed['state']['milestones']==read['view']['memories']
assert fed['view']['memories']==read['view']['memories']
fed['view']['memories'][0]['at']=9999
assert fed['state']['milestones'][0]['at']==1234
empty=run({'command':'status'})
assert empty['view']['memories']==[] and not empty['changed']
print(json.dumps({'ok':True}))
'''
        plugin = Path(__file__).resolve().parents[1] / 'executas/notebuddy'
        result = subprocess.run([sys.executable, '-B', '-X', 'utf8', '-c', code], cwd=plugin,
                                capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)['ok'])
