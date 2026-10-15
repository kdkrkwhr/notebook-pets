"""The production adapter uses memory candidates, never temporary save files."""
import json
from pathlib import Path
import subprocess
import sys
import unittest


class PortableWorkerTests(unittest.TestCase):
    def test_worker_ignores_local_identity_env_and_never_creates_a_save_file(self):
        code = '''import json,os,tempfile
from pathlib import Path
from unittest.mock import patch
from game_worker import run
with patch.dict(os.environ,{'NOTEBOOK_ACTOR_ID':'999','NOTEBOOK_ADMIN_IDS':'invalid','NOTEBOOK_EVENT_ID':'foreign-event'}):
 before=dict(os.environ)
 with patch.object(tempfile,'TemporaryDirectory',side_effect=AssertionError('temp save')),patch.object(Path,'write_text',side_effect=AssertionError('write')):
  born=run({'command':'start','name':'Portable','request_id':'birth'})
  fed=run({'command':'feed','state':born['state'],'request_id':'food'})
  replay=run({'command':'feed','state':fed['state'],'request_id':'food'})
 assert born['state']['user_id']=='1'
 assert fed['view']['status']['xp']==10
 assert replay['state']==fed['state'] and not replay['changed']
 assert dict(os.environ)==before
 print(json.dumps({'ok':True}))
'''
        plugin=Path(__file__).resolve().parents[1]/'executas/notebuddy'
        result=subprocess.run([sys.executable,'-B','-X','utf8','-c',code],cwd=plugin,
                              capture_output=True,text=True,encoding='utf-8',check=True)
        self.assertTrue(json.loads(result.stdout)['ok'])
