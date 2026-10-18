"""Build a relocatable static site; never include saves or credentials."""
from pathlib import Path
import shutil
import re
import hashlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web' / 'dist'
OUT.mkdir(exist_ok=True)
for name in ('app.js', 'store.js', 'worker.js', 'style.css', 'models.js', 'visuals.js', 'gemini.js', 'local-ai.js', 'ai.js', 'ai-settings.js', 'LOCAL_AI.md'):
    shutil.copyfile(ROOT / 'web' / name, OUT / name)
anna = ROOT / 'anna' / 'bundle'
shared_html = (anna / 'index.html').read_text(encoding='utf-8')
def dialog(name):
    return re.search(r'<dialog id="' + name + r'"[\s\S]*?</dialog>', shared_html).group()
template = (ROOT / 'web' / 'index.html').read_text(encoding='utf-8')
template = template.replace('__ANNA_TITLE__', dialog('title-screen'))
template = template.replace('__ANNA_THEMES__', dialog('theme-dialog'))
template = template.replace('__ANNA_COLLECTION__', dialog('item-catalog') + '\n' + dialog('item-detail'))
template = template.replace('__ANNA_HOME_DUNGEON__', dialog('home-dialog') + '\n' + dialog('dungeon-dialog'))
template = template.replace('__ANNA_WALK__', dialog('walk-story'))
teaser = re.search(r'<section class="paper item-book-teaser"[\s\S]*?</section>', shared_html).group()
template = template.replace('__ANNA_TEASER__', teaser)
shutil.copyfile(anna / 'style.css', OUT / 'anna-style.css')
for name in ('evolution.mjs', 'birth-art.mjs', 'theme.css', 'themes.css', 'themes.mjs', 'home.css', 'ui-polish.css', 'hints.mjs', 'garden-art.mjs', 'walk-stories.mjs', 'walk-story-dialog.mjs', 'journey-stories.mjs', 'reactions.mjs', 'icon.svg', 'title-screen.mjs', 'item-catalog.mjs', 'items.mjs', 'i18n.mjs',
             'model.mjs', 'data.mjs', 'pixel-pet.mjs', 'home.mjs', 'home-scene.mjs', 'home-walk.mjs', 'home-sprite.mjs',
             'dungeon.mjs', 'dungeon-scene.mjs', 'dungeon-avatar.mjs', 'dungeon-map.mjs', 'dungeon-enemies.mjs', 'dungeon-journey.mjs'):
    shutil.copyfile(anna / name, OUT / name)
shutil.copytree(anna / 'fonts', OUT / 'fonts', dirs_exist_ok=True)
for folder in ('starters-v1', 'items-v1', 'dungeons-v2', 'home-v2'):
    # Anna's bundle/assets is generated and ignored. Both platforms consume
    # the tracked public originals, so fresh CI checkouts need no Anna build.
    shutil.copytree(ROOT / 'assets' / folder, OUT / 'assets' / folder, dirs_exist_ok=True)
shutil.copyfile(ROOT / 'anna' / 'THIRD_PARTY_NOTICES.txt', OUT / 'THIRD_PARTY_NOTICES.txt')
for folder in ('core', 'data', 'pyodide'):
    (OUT / folder).mkdir(exist_ok=True)
for name in ('evolution', 'engine', 'domain', 'ports', 'game_api', 'art', 'dungeons', 'collectibles', 'journeys', 'personality', 'home', 'home_world'):
    shutil.copyfile(ROOT / 'engine' / f'{name}.py', OUT / 'core' / f'{name}.py')
for name in ('game_data.json', 'image_prompts.json'):
    shutil.copyfile(ROOT / 'data' / name, OUT / 'data' / name)
runtime = ROOT / 'tests' / 'pyodide' / 'node_modules' / 'pyodide'
for name in ('pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'):
    shutil.copyfile(runtime / name, OUT / 'pyodide' / name)
(OUT / '.nojekyll').touch()
# One release token for the entire module graph, including worker/core reads.
# Updating app.js alone would leave previously cached imports at old versions.
sources = sorted([*OUT.glob('*.js'), *OUT.glob('*.mjs'), * (OUT / 'core').glob('*.py'), * (OUT / 'data').glob('*.json')])
release = hashlib.sha256(b''.join(p.read_text(encoding='utf-8').encode('utf-8') for p in sources)).hexdigest()[:12]
for module in [*OUT.glob('*.js'), *OUT.glob('*.mjs')]:
    source = module.read_text(encoding='utf-8')
    source = re.sub(r"(['\"])(\./[a-zA-Z0-9_-]+\.(?:js|mjs))\1", lambda m: f'{m[1]}{m[2]}?v={release}{m[1]}', source)
    module.write_text(source, encoding='utf-8', newline='\n')
for name in ('app.js', 'anna-style.css', 'theme.css', 'themes.css', 'home.css', 'ui-polish.css', 'style.css'):
    digest = hashlib.sha256((OUT / name).read_bytes()).hexdigest()[:12]
    template = template.replace(f'"./{name}"', f'"./{name}?v={digest}"')
(OUT / 'index.html').write_text(template, encoding='utf-8')
print(f'Static site built: {OUT}')
