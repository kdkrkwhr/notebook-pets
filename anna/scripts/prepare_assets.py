"""Copy versioned game assets and engine files into the self-contained Anna app."""
from pathlib import Path
import shutil

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
ART = APP / 'bundle' / 'assets'
CORE = APP / 'executas' / 'notebuddy' / 'game_core'
ART.mkdir(parents=True, exist_ok=True)
for path in (ROOT / 'assets' / 'samples').glob('*_stage1.png'):
    shutil.copy2(path, ART / path.name)
for path in (ROOT / 'assets' / 'anchored_evolution').glob('*.png'):
    shutil.copy2(path, ART / path.name)
for directory, names in [('engine', ['engine.py', 'runtime.py', 'art.py']),
                          ('data', ['game_data.json', 'image_prompts.json'])]:
    (CORE / directory).mkdir(parents=True, exist_ok=True)
    for name in names:
        shutil.copy2(ROOT / directory / name, CORE / directory / name)
print('Prepared game rules and', len(list(ART.glob('*.png'))), 'character images.')
