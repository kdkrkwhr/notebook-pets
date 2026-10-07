"""Snapshot saves under the game lock; restore into a new data root only."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'engine'))
import engine
from runtime import GameError, atomic_write_json, store_lock

MAX_BYTES = 256 * 1024 * 1024


def fail(message):
    raise GameError('invalid_backup', message)


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(',', ':'), allow_nan=False).encode('utf-8')


def read_document(path):
    with Path(path).open('rb') as stream:
        raw = stream.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        fail('File exceeds the 256 MiB limit.')
    return json.loads(raw)


def validate_files(files):
    if not isinstance(files, dict):
        fail('Invalid snapshot contents.')
    for name, value in files.items():
        if name == 'data/access.json':
            engine.validate_access(value)
        elif isinstance(name, str) and re.fullmatch(r'state/[1-9][0-9]{0,19}\.json', name):
            engine.validate_state(value, Path(name).stem)
        else:
            fail('Unexpected snapshot path.')


def verify(path):
    document = read_document(path)
    if not isinstance(document, dict) or document.get('format') != 'notebook-pets-save':
        fail('Not a Notebook Pets snapshot.')
    if type(document.get('version')) is not int or document['version'] != 1:
        fail('Unsupported snapshot version.')
    payload = document.get('payload')
    if not isinstance(payload, dict) or set(payload) != {'created_at', 'game_version', 'files'}:
        fail('Invalid snapshot metadata.')
    created = datetime.fromisoformat(payload['created_at'])
    if created.tzinfo is None or not isinstance(payload['game_version'], str):
        fail('Invalid snapshot metadata.')
    if hashlib.sha256(canonical(payload)).hexdigest() != document.get('sha256'):
        fail('Snapshot checksum mismatch.')
    validate_files(payload['files'])
    return document


def summary(document):
    payload = document['payload']
    return {'created_at': payload['created_at'], 'game_version': payload['game_version'],
            'users': sum(name.startswith('state/') for name in payload['files']),
            'access_settings': 'data/access.json' in payload['files'],
            'sha256': document['sha256']}


def create(source, destination):
    source = Path(source).absolute()
    state = source / 'state'
    if source.is_symlink() or state.is_symlink() or not state.is_dir():
        fail('Source must contain a real state directory.')
    destination = Path(destination).absolute()
    if destination.resolve().is_relative_to(state.resolve()):
        fail('Do not place backups inside state/.')
    files = {}
    with store_lock(state):
        for path in sorted(state.glob('*.json')):
            if path.is_symlink() or not path.is_file():
                fail('Save files must be regular files.')
            files['state/' + path.name] = read_document(path)
        access = source / 'data' / 'access.json'
        if access.is_symlink() or access.parent.is_symlink():
            fail('Access settings must not use symbolic links.')
        if access.exists():
            files['data/access.json'] = read_document(access)
        validate_files(files)
    payload = {'created_at': datetime.now(timezone.utc).isoformat(),
               'game_version': (ROOT / 'VERSION').read_text().strip(), 'files': files}
    document = {'format': 'notebook-pets-save', 'version': 1, 'payload': payload,
                'sha256': hashlib.sha256(canonical(payload)).hexdigest()}
    raw = canonical(document)
    if len(raw) > MAX_BYTES:
        fail('Snapshot exceeds the 256 MiB limit.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Publish a complete file without replacing an existing backup.
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, prefix='.backup-', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return {'ok': True, 'path': str(destination), **summary(document)}


def restore(archive, target):
    document = verify(archive)  # Validate every file before creating anything.
    target = Path(target).absolute()
    if target.exists() or target.is_symlink():
        fail('Restore target must not exist. Choose a new data directory.')
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.notebook-restore-', dir=target.parent))
    try:
        (staging / 'state').mkdir()
        for name, value in document['payload']['files'].items():
            atomic_write_json(staging / name, value)
        if target.exists() or target.is_symlink():
            fail('Restore target appeared during restoration.')
        os.rename(staging, target)
    finally:
        if staging.exists():
            shutil.rmtree(staging)
    return {'ok': True, 'data_root': str(target), **summary(document)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    backup = commands.add_parser('create', help='Take a consistent save snapshot')
    backup.add_argument('--source', type=Path, default=Path(engine.DATA_ROOT))
    backup.add_argument('--output', type=Path, required=True)
    check = commands.add_parser('verify', help='Check checksum, paths, and save schemas')
    check.add_argument('archive', type=Path)
    recovery = commands.add_parser('restore', help='Restore into a new data directory')
    recovery.add_argument('archive', type=Path)
    recovery.add_argument('--target', type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == 'create':
            result = create(args.source, args.output)
        elif args.command == 'verify':
            result = {'ok': True, **summary(verify(args.archive))}
        else:
            result = restore(args.archive, args.target)
    except (GameError, OSError, ValueError, TypeError, KeyError) as exc:
        result = {'ok': False, 'code': getattr(exc, 'code', 'backup_error'), 'msg': str(exc)}
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
