"""Build a relocatable static site; never include saves or credentials."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web' / 'dist'
OUT.mkdir(exist_ok=True)
for name in ('index.html', 'app.js', 'store.js', 'worker.js', 'style.css'):
    shutil.copyfile(ROOT / 'web' / name, OUT / name)
for folder in ('core', 'data', 'pyodide'):
    (OUT / folder).mkdir(exist_ok=True)
for name in ('engine', 'domain', 'ports', 'game_api', 'art', 'dungeons', 'collectibles', 'journeys', 'personality'):
    shutil.copyfile(ROOT / 'engine' / f'{name}.py', OUT / 'core' / f'{name}.py')
for name in ('game_data.json', 'image_prompts.json'):
    shutil.copyfile(ROOT / 'data' / name, OUT / 'data' / name)
runtime = ROOT / 'tests' / 'pyodide' / 'node_modules' / 'pyodide'
for name in ('pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'):
    shutil.copyfile(runtime / name, OUT / 'pyodide' / name)
(OUT / '.nojekyll').touch()
print(f'Static site built: {OUT}')
