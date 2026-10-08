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
protocol = subprocess.run([str(binary)], input='\n'.join(json.dumps({'jsonrpc':'2.0','id':i,'method':method}) for i,method in [(1,'initialize'),(2,'describe')])+'\n',
                          capture_output=True, text=True, encoding='utf-8', timeout=30, check=True)
frames = [json.loads(line) for line in protocol.stdout.splitlines()]
assert frames[0]['result']['protocolVersion'] == '2.0'
assert frames[1]['result']['version'] == MANIFEST['version']
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
