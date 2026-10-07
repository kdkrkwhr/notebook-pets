"""Create and verify a snapshot before pruning this job's registered backups."""
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import uuid

import backup_store as backup
from runtime import GameError, MISSING, atomic_write_json, read_json, store_lock


def source_key(source):
    return hashlib.sha256(os.path.normcase(str(Path(source).resolve())).encode('utf-8')).hexdigest()[:20]


def run_once(source, destination, *, keep_days=30, keep_min=7):
    if type(keep_days) is not int or keep_days < 1 or type(keep_min) is not int or keep_min < 1:
        raise ValueError('Retention days and minimum count must be positive integers.')
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if destination.is_relative_to(source / 'state'):
        raise ValueError('Backup directory must not be inside state/.')
    folder = destination / source_key(source)
    if folder.is_symlink() or (hasattr(folder, 'is_junction') and folder.is_junction()):
        raise ValueError('Managed backup directory must not be a link.')
    folder.mkdir(parents=True, exist_ok=True)
    with store_lock(folder / '.job-lock'):
        result = {'ok': False, 'source': str(source), 'directory': str(folder),
                  'started_at': datetime.now(timezone.utc).isoformat(), 'deleted': []}
        try:
            index_path = folder / 'index.json'
            index = read_json(index_path)
            if index is MISSING:
                index = {'version': 1, 'source': str(source), 'files': []}
            if (not isinstance(index, dict) or index.get('version') != 1 or
                    index.get('source') != str(source) or not isinstance(index.get('files'), list)):
                raise ValueError('Invalid backup index.')
            names = set()
            for entry in index['files']:
                if (not isinstance(entry, dict) or set(entry) != {'name', 'sha256'} or
                        not isinstance(entry['name'], str) or
                        re.fullmatch(r'auto-[0-9a-f]{32}\.json', entry['name']) is None or
                        not isinstance(entry['sha256'], str) or
                        re.fullmatch(r'[0-9a-f]{64}', entry['sha256']) is None or entry['name'] in names):
                    raise ValueError('Invalid backup index entry.')
                names.add(entry['name'])
            name = 'auto-' + uuid.uuid4().hex + '.json'
            snapshot = backup.create(source, folder / name)
            document = backup.verify(folder / name)
            if document['sha256'] != snapshot['sha256']:
                raise ValueError('New snapshot changed during verification.')
            result['snapshot'] = snapshot
            index['files'].append({'name': name, 'sha256': snapshot['sha256']})
            atomic_write_json(index_path, index)

            # Check the entire managed set before any deletion. Unindexed files
            # (including manual backups and crash leftovers) are never pruned.
            verified = []
            missing = []
            for entry in index['files']:
                path = folder / entry['name']
                if path.is_symlink() or path.resolve().parent != folder.resolve():
                    raise ValueError('Managed snapshot points outside its directory.')
                if not path.exists():
                    missing.append(entry['name'])
                    continue  # Crash after unlink and before index update.
                doc = backup.verify(path)
                if doc['sha256'] != entry['sha256']:
                    raise ValueError('Managed snapshot checksum differs from its index.')
                verified.append((datetime.fromisoformat(doc['payload']['created_at']), entry))
            verified.sort(key=lambda item: item[0], reverse=True)
            cutoff = datetime.now(timezone.utc) - timedelta(days=keep_days)
            protected = {entry['name'] for _, entry in verified[:keep_min]} | {name}
            for created, entry in verified:
                if created < cutoff and entry['name'] not in protected:
                    (folder / entry['name']).unlink()
                    result['deleted'].append(entry['name'])
            removed = set(result['deleted']) | set(missing)
            index['files'] = [entry for entry in index['files'] if entry['name'] not in removed]
            atomic_write_json(index_path, index)
            result.update(ok=True, retained=len(index['files']), missing=missing)
        except (GameError, OSError, ValueError, TypeError, KeyError) as exc:
            result.update(code=getattr(exc, 'code', 'backup_job_error'), msg=str(exc))
        result['finished_at'] = datetime.now(timezone.utc).isoformat()
        atomic_write_json(folder / 'last-run.json', result)
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path(backup.engine.DATA_ROOT))
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--keep-days', type=int, default=30)
    parser.add_argument('--keep-min', type=int, default=7)
    args = parser.parse_args()
    try:
        result = run_once(args.source, args.destination, keep_days=args.keep_days, keep_min=args.keep_min)
    except (GameError, OSError, ValueError) as exc:
        result = {'ok': False, 'code': getattr(exc, 'code', 'backup_job_error'), 'msg': str(exc)}
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
