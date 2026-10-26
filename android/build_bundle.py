"""Offline Android package: immutable Anna UI/core plus platform transports."""
from pathlib import Path
import json
import shutil
from package_anna import ROOT, package

OUT = ROOT / 'android/app/build/generated/gameAssets/game'
# Only replace the verified generated build directory; never runtime/user data.
assert OUT.resolve().is_relative_to((ROOT / 'android/app/build').resolve())
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
mapping = package(OUT)
(OUT / 'anna-tool-ids.js').write_text('window.__ANNA_TOOL_IDS__={notebuddy:"tool-dev-notebuddy"};\n', encoding='utf-8')
shutil.copytree(ROOT / 'android/anna-adapter', OUT / 'local', dirs_exist_ok=True, ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
shutil.copyfile(ROOT / 'android/game/native.js', OUT / 'local/native.js')
runtime = ROOT / 'tests/pyodide/node_modules/pyodide'
(OUT / 'local/pyodide').mkdir()
for name in ('pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'):
    shutil.copyfile(runtime / name, OUT / 'local/pyodide' / name)
python_files = sorted(p.relative_to(OUT / 'local/python').as_posix() for p in (OUT / 'local/python').rglob('*') if p.is_file())
(OUT / 'local/python-files.json').write_text(json.dumps(python_files), encoding='utf-8')
notices = [(ROOT / 'LICENSE').read_text(encoding='utf-8'), (ROOT / 'anna/THIRD_PARTY_NOTICES.txt').read_text(encoding='utf-8')]
notices += ['Pyodide 314.0.7 (MPL-2.0), https://github.com/pyodide/pyodide/tree/314.0.7; CPython 3.14.2 (Python license), https://github.com/python/cpython/tree/v3.14.2; LiteRT-LM 0.18.1 (Apache-2.0), https://github.com/google-ai-edge/LiteRT-LM/tree/v0.18.1; AndroidX/Kotlin/Gson (Apache-2.0), versions in app/build.gradle.kts.',
            'Anna Executa SDK 0.1.0, commit 49749905d443a7e8e7479a8faab39c03c7f16c16 (MIT), https://github.com/whtcjdtc2007/anna-executa-examples\n' + (ROOT / 'android/anna-adapter/python/executa_sdk/LICENSE').read_text(encoding='utf-8')]
notices += [p.read_text(encoding='utf-8') for p in sorted((ROOT / 'android/licenses').glob('*.txt'))]
(OUT / 'android-notices.txt').write_text('\n\n'.join(notices), encoding='utf-8')
print(f'Pinned Anna files: {len(mapping)}; Android adapter: local/; no UI source rewrites')
