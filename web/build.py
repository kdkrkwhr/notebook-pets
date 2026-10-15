"""Build a relocatable static site; never include saves or credentials."""
from pathlib import Path
import shutil
import re
import hashlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web' / 'dist'
OUT.mkdir(exist_ok=True)
for name in ('app.js', 'store.js', 'worker.js', 'style.css'):
    shutil.copyfile(ROOT / 'web' / name, OUT / name)
anna = ROOT / 'anna' / 'bundle'
shared_html = (anna / 'index.html').read_text(encoding='utf-8')
def dialog(name):
    return re.search(r'<dialog id="' + name + r'"[\s\S]*?</dialog>', shared_html).group()
template = (ROOT / 'web' / 'index.html').read_text(encoding='utf-8')
template = template.replace('__ANNA_TITLE__', dialog('title-screen'))
template = template.replace('__ANNA_COLLECTION__', dialog('item-catalog') + '\n' + dialog('item-detail'))
teaser = re.search(r'<section class="paper item-book-teaser"[\s\S]*?</section>', shared_html).group()
template = template.replace('__ANNA_TEASER__', teaser)
shutil.copyfile(anna / 'style.css', OUT / 'anna-style.css')
for name in ('theme.css', 'icon.svg', 'title-screen.mjs', 'item-catalog.mjs', 'items.mjs', 'i18n.mjs'):
    shutil.copyfile(anna / name, OUT / name)
shutil.copytree(anna / 'fonts', OUT / 'fonts', dirs_exist_ok=True)
for folder in ('starters-v1', 'items-v1', 'dungeons-v2'):
    # Anna's bundle/assets is generated and ignored. Both platforms consume
    # the tracked public originals, so fresh CI checkouts need no Anna build.
    shutil.copytree(ROOT / 'assets' / folder, OUT / 'assets' / folder, dirs_exist_ok=True)
shutil.copyfile(ROOT / 'anna' / 'THIRD_PARTY_NOTICES.txt', OUT / 'THIRD_PARTY_NOTICES.txt')
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
for name in ('app.js', 'anna-style.css', 'theme.css', 'style.css'):
    digest = hashlib.sha256((OUT / name).read_bytes()).hexdigest()[:12]
    template = template.replace(f'"./{name}"', f'"./{name}?v={digest}"')
(OUT / 'index.html').write_text(template, encoding='utf-8')
print(f'Static site built: {OUT}')
