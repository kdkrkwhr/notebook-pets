"""Copy versioned game assets and engine files into the self-contained Anna app."""
from pathlib import Path
import shutil
import hashlib
import json

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
ART = APP / 'bundle' / 'assets'
CORE = APP / 'executas' / 'notebuddy' / 'game_core'
ART.mkdir(parents=True, exist_ok=True)
# A versioned path prevents browsers from reusing the old sample artwork.
starters = ROOT / 'assets' / 'starters-v1'
rules = json.loads((ROOT / 'data' / 'game_data.json').read_text(encoding='utf-8'))
expected = {f'{species}_{element}_stage1.png'
            for species in rules['species'] for element in rules['elements']}
records = json.loads((starters / 'manifest.json').read_text(encoding='utf-8'))
if {record['file'] for record in records} != expected or len(records) != len(expected):
    raise ValueError('Starter manifest must cover every species and element exactly once')
for record in records:
    source = starters / record['file']
    if hashlib.sha256(source.read_bytes()).hexdigest() != record['sha256']:
        raise ValueError(f'Starter checksum mismatch: {source.name}')
(ART / 'starters-v1').mkdir(parents=True, exist_ok=True)
for name in sorted(expected):
    shutil.copy2(starters / name, ART / 'starters-v1' / name)
# Remove obsolete generated starter copies, never personal storage or source art.
for path in ART.glob('*_stage1.png'):
    path.unlink()
for path in (ROOT / 'assets' / 'anchored_evolution').glob('*.png'):
    if not path.name.endswith('_stage1.png'):
        shutil.copy2(path, ART / path.name)
for directory, names in [('engine', ['engine.py', 'runtime.py', 'art.py']),
                          ('data', ['game_data.json', 'image_prompts.json'])]:
    (CORE / directory).mkdir(parents=True, exist_ok=True)
    for name in names:
        shutil.copy2(ROOT / directory / name, CORE / directory / name)
print('Prepared game rules and', len(list(ART.rglob('*.png'))), 'character images.')
