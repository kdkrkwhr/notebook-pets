"""Build the desktop UI from the shipping Anna UI; do not edit/deploy Anna."""
import json
from pathlib import Path
import runpy
import shutil

ROOT = Path(__file__).resolve().parents[1]


def prepare():
    runpy.run_path(str(ROOT / 'anna/scripts/prepare_assets.py'), run_name='__main__')
    target = ROOT / 'build/desktop-ui'
    shutil.copytree(ROOT / 'anna/bundle', target, dirs_exist_ok=True)
    for source in (ROOT / 'desktop/ui').iterdir():
        shutil.copy2(source, target / ('desktop-runtime.mjs' if source.name == 'runtime.mjs' else source.name))
    app = (target / 'app.js').read_text('utf-8')
    original = "'/static/anna-apps/_sdk/latest/index.js'"
    if original not in app:
        raise RuntimeError('Shared runtime import changed; update desktop adapter.')
    app = app.replace(original, "'./desktop-runtime.mjs'")
    # Desktop settings remain usable while an AI request is in progress.
    app = app.replace("#title-screen,#theme-dialog", "#title-screen,#theme-dialog,#desktop-dialog")
    (target / 'app.js').write_text(app, encoding='utf-8')
    html = (target / 'index.html').read_text('utf-8').replace('</head>', '<link rel="stylesheet" href="desktop.css"></head>')
    html = html.replace('</body>', '<script type="module" src="settings.mjs"></script></body>')
    html = html.replace('</body>', '<script type="module" src="desktop-pet.mjs"></script></body>')
    html = html.replace('<script src="anna-tool-ids.js"></script>', '')
    (target / 'index.html').write_text(html, encoding='utf-8')
    # Platform presentation only. Stable shared game/UI modules are otherwise
    # copied unchanged; generated output is never checked in or sent to Anna.
    replacements = [('Anna AI', 'Codex AI'), ('Anna allowance', 'Codex allowance'),
                    ('Anna image request', 'Codex image request'), ('Anna 사용량', 'Codex 사용량'),
                    ('Anna stores', 'This computer stores'), ('Anna에 친구', '이 PC에 친구'),
                    ('Anna and AI-provider', 'Codex and AI-provider'), ('Anna or AI-provider', 'Codex or AI-provider'),
                    ('Anna와 AI 제공자', 'Codex와 AI 제공자'), ('in this browser', 'in this app'), ('이 브라우저', '이 앱'), ('Anna', 'Codex')]
    for name in ('i18n.mjs', 'locale-data.mjs'):
        content = (target / name).read_text('utf-8')
        for before, after in replacements:
            content = content.replace(before, after)
        (target / name).write_text(content, encoding='utf-8')
    content = (target / 'i18n.mjs').read_text('utf-8')
    content = "import {desktopText} from './desktop-copy.mjs';\n" + content
    content = content.replace('  const pair=messages[key];', '  const override=desktopText(language,key);\n  if(override!==undefined)return override.replace(/\\{(\\w+)\\}/g,(_,name)=>String(values[name]??\'\'));\n  const pair=messages[key];')
    (target / 'i18n.mjs').write_text(content, encoding='utf-8')
    # Include only shipped static assets in the frozen package.
    print('Desktop UI:', target)
    return target


if __name__ == '__main__':
    prepare()
