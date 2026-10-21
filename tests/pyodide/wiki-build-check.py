"""Check stale-guide visibility and invalid-link rejection using temporary inputs."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('wiki', ROOT / 'tools' / 'build_wiki.py')
wiki = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wiki)
original = wiki.SOURCE
try:
    with tempfile.TemporaryDirectory(prefix='notebuddy-wiki-check-') as folder:
        wiki.SOURCE = Path(folder) / 'source'
        shutil.copytree(original, wiki.SOURCE)
        manifest = wiki.SOURCE / 'sources.json'
        raw = manifest.read_text(encoding='utf-8')
        data = json.loads(raw)
        data['files']['engine/game_api.py'] = '0' * 64
        manifest.write_text(json.dumps(data), encoding='utf-8')
        wiki.main()
        assert 'class="notice warning"' in (wiki.OUT / 'core.html').read_text(encoding='utf-8')
        assert '근거 변경 확인 필요' in (wiki.OUT / 'markdown/core.md').read_text(encoding='utf-8')
        pages = json.loads((wiki.OUT / 'metadata.json').read_text(encoding='utf-8'))['pages']
        assert 'engine/game_api.py' in next(p for p in pages if p['file'] == 'core.md')['changedSources']

        del data['files']['engine/game_api.py']
        manifest.write_text(json.dumps(data), encoding='utf-8')
        try:
            wiki.main()
        except SystemExit as error:
            assert 'Unreviewed reference' in str(error)
        else:
            raise AssertionError('Missing evidence accepted')

        manifest.write_text(raw, encoding='utf-8')
        guide = wiki.SOURCE / 'core.md'
        guide.write_text(guide.read_text(encoding='utf-8') + '\n[broken](missing.md)\n', encoding='utf-8')
        try:
            wiki.main()
        except SystemExit as error:
            assert 'Broken wiki link' in str(error)
        else:
            raise AssertionError('Broken wiki link accepted')
finally:
    wiki.SOURCE = original
    wiki.main()
print('Wiki build checks passed: drift warnings, missing evidence, broken links; real inputs preserved.')
