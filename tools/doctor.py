"""Preflight checks without changing saves or contacting Discord/LLM services."""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile

import backup_store
from daily_backup import source_key
from runtime import GameError, MISSING, read_json, store_lock, validate_user_id

engine = backup_store.engine


def inspect_store(root):
    state = root / 'state'
    if not state.is_dir() or state.is_symlink():
        raise GameError('missing_store', 'state/ directory is missing or linked.')
    errors, users = [], 0
    with store_lock(state, timeout=1):
        for path in sorted(state.glob('*.json')):
            try:
                if path.is_symlink():
                    raise GameError('invalid_state', 'Linked save')
                value = read_json(path)
                engine.validate_state(value, path.stem)
                users += 1
            except (GameError, ValueError, TypeError) as exc:
                errors.append({'file': path.name, 'code': getattr(exc, 'code', 'invalid_state')})
        access = read_json(root / 'data' / 'access.json')
        if access is not MISSING:
            engine.validate_access(access)
        # A disposable probe verifies actual write access; never rewrite a save.
        with tempfile.TemporaryFile(dir=state, prefix='.notebook-doctor-') as probe:
            probe.write(b'check')
            probe.flush()
            os.fsync(probe.fileno())
    return {'ok': not errors, 'users': users, 'invalid_saves': errors,
            'access_mode': 'restricted' if access is not MISSING and access['owner_id'] else 'public'}


def inspect_backup(root, backup_root, max_age_hours):
    folder = backup_root / source_key(root)
    report = read_json(folder / 'last-run.json')
    if not isinstance(report, dict) or report.get('ok') is not True:
        raise GameError('backup_failed_or_missing', 'No successful latest backup job result.')
    if Path(report.get('source', '')).resolve() != root:
        raise GameError('backup_source_mismatch', 'Backup job belongs to another data root.')
    snapshot = report.get('snapshot', {})
    path = Path(snapshot.get('path', '')).resolve()
    if path.parent != folder.resolve() or not path.name.startswith('auto-'):
        raise GameError('invalid_backup_path', 'Backup path does not belong to this job.')
    doc = backup_store.verify(path)
    if doc['sha256'] != snapshot.get('sha256'):
        raise GameError('backup_changed', 'Backup differs from the latest job result.')
    created = datetime.fromisoformat(doc['payload']['created_at'])
    age = (datetime.now(timezone.utc) - created).total_seconds() / 3600
    if age < -5 / 60 or age > max_age_hours:
        raise GameError('backup_stale', 'Backup is too old or dated in the future.')
    return {'ok': True, 'age_hours': round(age, 2), 'users': backup_store.summary(doc)['users']}


def inspect_discord():
    missing = []
    if importlib.util.find_spec('discord') is None:
        missing.append('discord.py')
    if not os.environ.get('DISCORD_BOT_TOKEN', '').strip():
        missing.append('DISCORD_BOT_TOKEN')
    channels = [item.strip() for item in os.environ.get('NOTEBOOK_CHANNEL_IDS', '').split(',') if item.strip()]
    if not channels:
        missing.append('NOTEBOOK_CHANNEL_IDS')
    for channel in channels:
        validate_user_id(channel)
    return {'ok': not missing, 'missing': missing, 'channel_count': len(channels)}


def inspect_comfy():
    result = subprocess.run([sys.executable, '-B', '-X', 'utf8', str(backup_store.ROOT/'tools/check_images.py')],
                            capture_output=True, text=True, encoding='utf-8', timeout=30)
    response = json.loads(result.stdout)
    if result.returncode != 0 or response.get('ok') is not True:
        raise GameError('comfy_not_ready', 'ComfyUI or its required models/nodes are not ready.')
    return {'ok': True, 'checkpoint': response.get('checkpoint')}


def diagnose(root, *, backup_root=None, max_age_hours=36, discord=False, comfy=False):
    if not math.isfinite(max_age_hours) or max_age_hours <= 0:
        raise ValueError('max_age_hours must be finite and positive.')
    root = Path(root).resolve()
    checks = []

    def check(name, action, help_text):
        try:
            details = action()
            passed = details.pop('ok')
            checks.append({'name': name, 'status': 'pass' if passed else 'fail', **details,
                           **({} if passed else {'help': help_text})})
        except (GameError, OSError, ValueError, TypeError, KeyError, AttributeError, subprocess.TimeoutExpired) as exc:
            # Do not echo environment values, subprocess output or file contents.
            checks.append({'name': name, 'status': 'fail', 'code': getattr(exc, 'code', type(exc).__name__),
                           'help': help_text})

    check('store', lambda: inspect_store(root), 'Check state/ permissions and invalid save/access files; preserve originals before recovery.')
    if backup_root is not None:
        check('backup', lambda: inspect_backup(root, Path(backup_root).resolve(), max_age_hours),
              'Run daily_backup.py with this source and backup destination; inspect last-run.json and the scheduler result.')
    else:
        checks.append({'name': 'backup', 'status': 'skip', 'help': 'Supply --backup-root to check backup freshness.'})
    if discord:
        check('discord_config', inspect_discord, 'Install requirements-discord.txt and configure the bot token and allowed channel IDs.')
    else:
        checks.append({'name': 'discord_config', 'status': 'skip'})
    if comfy:
        check('comfy', inspect_comfy, 'Start local ComfyUI, then run check_images.py for model and node details.')
    else:
        checks.append({'name': 'comfy', 'status': 'skip'})
    return {'ok': all(item['status'] != 'fail' for item in checks), 'data_root': str(root),
            'checked_at': datetime.now(timezone.utc).isoformat(), 'checks': checks}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-root', type=Path, default=Path(engine.DATA_ROOT))
    parser.add_argument('--backup-root', type=Path)
    parser.add_argument('--max-backup-age-hours', type=float, default=36)
    parser.add_argument('--discord', action='store_true')
    parser.add_argument('--comfy', action='store_true')
    parser.add_argument('--json', action='store_true', dest='as_json')
    args = parser.parse_args()
    try:
        report = diagnose(args.data_root, backup_root=args.backup_root,
                          max_age_hours=args.max_backup_age_hours, discord=args.discord, comfy=args.comfy)
    except ValueError as exc:
        parser.error(str(exc))
    if args.as_json:
        print(json.dumps(report, ensure_ascii=False))
    else:
        print('Notebook Pets preflight: ' + ('PASS' if report['ok'] else 'FAIL'))
        for check in report['checks']:
            print(f"[{check['status'].upper()}] {check['name']}: " + json.dumps(
                {k: v for k, v in check.items() if k not in ('name', 'status')}, ensure_ascii=False))
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
