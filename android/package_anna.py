"""Reproduce pinned Anna source bytes. No generated mobile UI fork."""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = '246781d1ec7a55f014756acc71100e9b531d8dad'
LOCK = Path(__file__).with_name('anna-reference.json')


def sources():
    # git archive otherwise applies core.autocrlf conversion on Windows. Lock
    # Git blob bytes, not host-specific checkout bytes, on every build platform.
    raw = subprocess.check_output(['git', '-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', REFERENCE, 'anna/bundle',
                                   'anna/executas/notebuddy', 'engine', 'data', 'assets'], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(raw)) as archive:
        return {m.name: archive.extractfile(m).read() for m in archive if m.isfile()}


def manifest(files):
    return {'reference': REFERENCE, 'files': {name: hashlib.sha256(data).hexdigest()
            for name, data in sorted(files.items())}}


def package(out):
    files = sources()
    if manifest(files) != json.loads(LOCK.read_text(encoding='utf-8')):
        raise RuntimeError('Anna reference source does not match the committed hash lock')
    mapping = {}
    for name, data in files.items():
        if name.startswith('anna/bundle/'):
            relative = name.removeprefix('anna/bundle/')
        elif name.startswith('assets/'):
            relative = name
        elif name.startswith('anna/executas/notebuddy/') and name.endswith('.py'):
            relative = 'local/python/' + name.rsplit('/', 1)[1]
        elif name.startswith(('engine/', 'data/')) and name.endswith(('.py', '.json')):
            relative = 'local/python/game_core/' + name
        else:
            continue
        dest = out / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        mapping[relative] = {'source': name, 'sha256': hashlib.sha256(data).hexdigest()}
    (out / 'anna-source-map.json').write_text(json.dumps(mapping, indent=2), encoding='utf-8')
    return mapping


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--record-reference', action='store_true')
    args = parser.parse_args()
    if args.record_reference:
        LOCK.write_text(json.dumps(manifest(sources()), indent=2) + '\n', encoding='utf-8')
