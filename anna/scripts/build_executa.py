"""Build a self-contained Executa on the target OS (Python 3.11 recommended)."""
import json
from pathlib import Path
import platform
import subprocess
import sys
import tarfile

APP = Path(__file__).resolve().parents[1]
PLUGIN = APP / 'executas' / 'notebuddy'
platform_key = {'Linux':'linux-x86_64','Windows':'windows-x86_64'}.get(platform.system())
if not platform_key or platform.machine().lower() not in ('amd64','x86_64'):
    raise SystemExit('This build script currently supports Windows/Linux x86_64.')
sys.path.insert(0, str(PLUGIN))
from notebuddy_plugin import MANIFEST
from localization import localize
for language in ('ja','zh-Hans','zh-Hant'):
    sample=localize({'ok':True,'status':{'name':'Growing','stage_label':'새싹기'}},'start',language)
    assert sample['status']['name']=='Growing'
    assert sample['status']['stage_label'] not in ('새싹기','Hatchling')
(PLUGIN / 'manifest.json').write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
name = 'notebuddy-game'
argv = [sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--onefile',
        '--name', name, '--distpath', str(PLUGIN / 'dist' / platform_key),
        '--workpath', str(PLUGIN / 'build' / platform_key), '--specpath', str(PLUGIN / 'build' / platform_key),
        '--add-data', str(PLUGIN / 'game_core') + ':game_core',
        '--hidden-import', 'random', '--hidden-import', 'uuid',
        '--hidden-import', 'fcntl' if platform.system() == 'Linux' else 'msvcrt',
        str(PLUGIN / 'notebuddy_plugin.py')]
if '--package-only' not in sys.argv:
    subprocess.run(argv, check=True)
binary = PLUGIN / 'dist' / platform_key / (name + ('.exe' if platform.system() == 'Windows' else ''))
def worker(payload):
    result = subprocess.run([str(binary),'--engine-worker'], input=json.dumps(payload),
                            capture_output=True, text=True, encoding='utf-8', timeout=30, check=True)
    value = json.loads(result.stdout)
    assert value['result']['ok'], value
    return value
created = worker({'command':'start','name':'Build test','request_id':'build-birth'})
cared = worker({'command':'feed','state':created['state'],'request_id':'build-feed'})
assert cared['view']['status']['xp'] == 10
assert cared['state']['pet_id'] == created['state']['pet_id']
profile = {'appearance':'round fictional friend','source':'starter',
           'traits':{'curiosity':1,'warmth':0,'energy':0,'caution':0},
           'summary':{'en':'A curious round friend','ko':'호기심 많은 둥근 친구'},
           'voice':{'en':'Gentle short words','ko':'짧고 다정한 말'},
           'habit':{'en':'Tilts their head','ko':'고개를 갸웃해요'}}
personal = worker({'command':'personality','profile':json.dumps(profile),
                   'state':cared['state'],'request_id':'build-personality'})
assert personal['view']['status']['personality']['origin'] == profile
assert personal['state']['xp'] == cared['state']['xp']

# The same manual evolution rules must be present in both OS binaries.
growth_state=json.loads(json.dumps(personal['state']))
growth_state['level']=10
growth_state['journey']['counts'].update(feed=10,walk=3)
prepared=worker({'command':'evolution_prepare','state':growth_state,
    'evolution_payload':json.dumps({'pet_id':growth_state['pet_id'],'stage':1}),'request_id':'build-prepare'})
token=prepared['state']['evolution']['pending']['id']
evolved=worker({'command':'evolve','state':prepared['state'],
    'evolution_payload':json.dumps({'pet_id':growth_state['pet_id'],'choice_id':token,'route_id':'keep'}),'request_id':'build-evolve'})
assert evolved['state']['stage']==2 and evolved['state']['pet_id']==growth_state['pet_id']
assert evolved['state']['stats']==growth_state['stats']

# Exercise the copied collectibles module in the actual standalone worker.
from datetime import datetime, timedelta, timezone
import time
reward_state = personal['state']
reward_state['training_bonus'] = {'atk':1000, 'def':1000, 'hp':1000}
reward_state['dungeons'] = {'date':datetime.now(timezone(timedelta(hours=9))).date().isoformat(),
    'discovered':['hellgate'], 'cleared':[], 'misses':0, 'last_run':None,
    'expires_at':{'hellgate':time.time()+86400}}
entry = worker({'command':'explore_hellgate','state':reward_state,'request_id':'build-entry'})
entry['state']['dungeons']['expedition'].update(index=entry['result']['dungeon_visit']['room_count']-1,event='fork')
reward = worker({'command':'dungeon_safe','state':entry['state'],
    'choice_id':entry['result']['dungeon_visit']['choice_id'],'request_id':'build-reward'})
assert reward['result']['dungeon_run']['item_awarded'] == 'ember-horns'
assert reward['view']['status']['collectibles'] == {'ember-horns':1}
replay = worker({'command':'dungeon_safe','state':reward['state'],
    'choice_id':entry['result']['dungeon_visit']['choice_id'],'request_id':'build-reward'})
assert replay['state'] == reward['state']

# The packaged worker must include the same atomic equipment rules.
fit=dict(pet_id=reward['state']['pet_id'],revision=0,id='a'*32,item_id='ember-horns',stage=1,source_path='assets/starters-v1/ghost_fire_stage1.png')
reserved=worker({'command':'equipment_prepare','state':reward['state'],'equipment_payload':json.dumps(fit),'request_id':'build-fit'})
apply_fit=dict(pet_id=fit['pet_id'],revision=1,id=fit['id'])
worn=worker({'command':'equipment_apply','state':reserved['state'],'equipment_payload':json.dumps(apply_fit),'request_id':'build-fit-apply'})
assert worn['result']['ok'] and worn['state']['collectibles']=={}
assert worn['view']['status']['collectible_discoveries']==['ember-horns']
assert worker({'command':'equipment_apply','state':worn['state'],'equipment_payload':json.dumps(apply_fit),'request_id':'build-fit-apply'})['state']==worn['state']

home_state = personal['state'].copy()
home_state['coins'] = 30
payload = dict(pet_id=home_state['pet_id'], revision=0, item_id='desk')
bought = worker({'command':'home_buy','state':home_state,'home_payload':json.dumps(payload),'request_id':'build-home-buy'})
assert bought['state']['coins'] == 20
plan = worker({'command':'home','state':bought['state']})
assert plan['result']['home']['world']['yard']['tour'][-1]['next'] == 'inside'
assert plan['result']['home']['world']['inside']['tour'][-1]['next'] == 'yard'
selection = dict(pet_id=home_state['pet_id'], revision=1, candidate_id=plan['result']['home_candidates'][0]['id'], reason='A quiet corner.')
decorated = worker({'command':'home_apply','state':bought['state'],'home_payload':json.dumps(selection),'request_id':'build-home-apply'})
assert 'desk' in decorated['view']['home']['layout']
replayed_home = worker({'command':'home_apply','state':decorated['state'],'home_payload':json.dumps(selection),'request_id':'build-home-apply'})
assert replayed_home['state'] == decorated['state']
garden_catalog=plan['result']['home']['catalog']
assert len(garden_catalog)==48 and sum(i.get('area')=='yard' for i in garden_catalog)==36
garden_buy=dict(pet_id=home_state['pet_id'],revision=0,item_id='yard-lily-pond')
garden_owned=worker({'command':'home_buy','state':home_state,'home_payload':json.dumps(garden_buy),'request_id':'build-garden-buy'})
assert garden_owned['state']['coins']==14
garden_plan=worker({'command':'home','state':garden_owned['state']})
garden_pick=dict(pet_id=home_state['pet_id'],revision=1,candidate_id=garden_plan['result']['home_candidates'][0]['id'],reason='A lily pond in the garden.')
garden_placed=worker({'command':'home_apply','state':garden_owned['state'],'home_payload':json.dumps(garden_pick),'request_id':'build-garden-place'})
assert any(o['kind']=='yard-lily-pond' for o in garden_placed['view']['home']['world']['yard']['objects'])
assert not any(o['kind']=='yard-lily-pond' for o in garden_placed['view']['home']['world']['inside']['objects'])

protocol = subprocess.run([str(binary)], input='\n'.join(json.dumps({'jsonrpc':'2.0','id':i,'method':method}) for i,method in [(1,'initialize'),(2,'describe')])+'\n',
                          capture_output=True, text=True, encoding='utf-8', timeout=30, check=True)
frames = [json.loads(line) for line in protocol.stdout.splitlines()]
assert frames[0]['result']['protocolVersion'] == '2.0'
assert frames[1]['result']['version'] == MANIFEST['version']
assert frames[1]['result'] == MANIFEST, 'Packaged describe must preserve the complete storage capability declaration'
archive = PLUGIN / 'dist' / f'{name}-{MANIFEST["version"]}-{platform_key}.tar.gz'
with tarfile.open(archive, 'w:gz') as output:
    output.add(binary, arcname=binary.name)
    output.add(APP / 'THIRD_PARTY_NOTICES.txt', arcname='THIRD_PARTY_NOTICES.txt')
    for license_name in ('LICENSE.txt', 'LICENSE'):
        license_path = Path(sys.base_prefix) / license_name
        if license_path.is_file():
            output.add(license_path, arcname='PYTHON_LICENSE.txt')
            break
print(f'Built and smoke-tested {archive} ({archive.stat().st_size} bytes)')
