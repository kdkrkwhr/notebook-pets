"""One local configuration for game, diagnostics, artwork, and backup commands."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / 'notebook.local.json'
FIELDS = {'version', 'data_root', 'backup_root', 'album_root', 'comfy_url', 'comfy_checkpoint',
          'channel_ids', 'admin_ids', 'backup_keep_days', 'backup_keep_min'}


def initialize(path):
    path = Path(path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8') as stream:
        stream.write((ROOT / 'notebook.example.json').read_text(encoding='utf-8'))
    return {'ok': True, 'config': str(path)}


def load_settings(path, environ=None):
    path = Path(path).resolve()
    inherited = dict(os.environ if environ is None else environ)
    if not path.is_file():
        raise ValueError('Configuration not found. Run tools/manage.py init first, or supply --config.')
    with path.open(encoding='utf-8-sig') as stream:
        raw = json.load(stream)
    if not isinstance(raw, dict) or set(raw) - FIELDS:
        raise ValueError('Unknown configuration fields. See notebook.example.json; keep tokens in environment variables.')
    if type(raw.get('version')) is not int or raw['version'] != 1:
        raise ValueError('Configuration version must be 1.')
    defaults = json.loads((ROOT / 'notebook.example.json').read_text(encoding='utf-8'))
    if 'data_root' not in raw:
        raise ValueError('data_root must be specified explicitly.')
    settings = {**defaults, **raw}

    def resolve_path(value):
        if not isinstance(value, str) or not value.strip() or '\0' in value:
            raise ValueError('Configured paths must be nonempty strings.')
        candidate = Path(value).expanduser()
        return str((candidate if candidate.is_absolute() else path.parent / candidate).resolve())

    settings['data_root'] = inherited.get('NOTEBOOK_DATA_DIR', settings['data_root'])
    for key in ('data_root', 'backup_root', 'album_root'):
        settings[key] = resolve_path(settings[key])
    for key in ('backup_root', 'album_root'):
        if Path(settings[key]).is_relative_to(Path(settings['data_root'])/'state'):
            raise ValueError('Backup and album directories must not be inside state/.')
    for key in ('backup_keep_days', 'backup_keep_min'):
        if type(settings[key]) is not int or settings[key] < 1:
            raise ValueError('Backup retention settings must be positive integers.')
    for key, variable in (('channel_ids','NOTEBOOK_CHANNEL_IDS'), ('admin_ids','NOTEBOOK_ADMIN_IDS')):
        values = ([v.strip() for v in inherited[variable].split(',') if v.strip()]
                  if variable in inherited else settings[key])
        if not isinstance(values, list) or any(not isinstance(v, str) or re.fullmatch(r'[1-9][0-9]{0,19}', v) is None for v in values):
            raise ValueError('Channel and administrator IDs must be lists of positive numeric strings.')
        settings[key] = list(dict.fromkeys(values))
        inherited[variable] = ','.join(settings[key])
    url = inherited.get('NOTEBOOK_COMFY_URL', settings['comfy_url'])
    if not isinstance(url, str):
        raise ValueError('Invalid ComfyUI URL.')
    parts = urlsplit(url)
    if parts.scheme not in ('http', 'https') or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
        raise ValueError('ComfyUI URL must be HTTP(S) without credentials, query, or fragment.')
    try:
        parts.port
    except ValueError:
        raise ValueError('Invalid ComfyUI port.') from None
    settings['comfy_url'] = url
    checkpoint = inherited.get('NOTEBOOK_COMFY_CHECKPOINT', settings['comfy_checkpoint'])
    if checkpoint is not None and (not isinstance(checkpoint, str) or not checkpoint.strip()):
        raise ValueError('Checkpoint must be a nonempty filename or null.')
    settings['comfy_checkpoint'] = checkpoint
    inherited.update(NOTEBOOK_DATA_DIR=settings['data_root'], NOTEBOOK_COMFY_URL=url, PYTHONUTF8='1')
    if checkpoint is not None:
        inherited['NOTEBOOK_COMFY_CHECKPOINT'] = checkpoint
    return settings, inherited


def build_command(args, settings):
    scripts = {'doctor':'doctor.py', 'bot':'discord_bot.py', 'backup':'daily_backup.py',
               'decay':'daily_decay.py', 'album':'export_album.py', 'render':'render_pet.py'}
    if args.action == 'game':
        if not args.arguments:
            raise ValueError('Supply game arguments, for example: game 123 start Buddy')
        return [sys.executable, '-B', '-X', 'utf8', str(ROOT/'engine/engine.py'), *args.arguments]
    command = [sys.executable, '-B', '-X', 'utf8', str(ROOT/'tools'/scripts[args.action])]
    if args.action == 'doctor':
        command += ['--data-root', settings['data_root']]
        for enabled, flag in ((args.discord,'--discord'), (args.comfy,'--comfy'), (args.as_json,'--json')):
            if enabled:
                command.append(flag)
        if args.backup:
            command += ['--backup-root', settings['backup_root']]
    elif args.action == 'backup':
        command += ['--source', settings['data_root'], '--destination', settings['backup_root'],
                    '--keep-days', str(settings['backup_keep_days']), '--keep-min', str(settings['backup_keep_min'])]
    elif args.action in ('album', 'render'):
        if re.fullmatch(r'[1-9][0-9]{0,19}', args.user_id) is None:
            raise ValueError('User ID must be a positive numeric string.')
        command.append(args.user_id)
        if args.action == 'album':
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            command += ['--output', str(Path(settings['album_root']) / f'{args.user_id}-{stamp}.html')]
    return command


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=DEFAULT_CONFIG)
    actions = parser.add_subparsers(dest='action', required=True)
    for name in ('init', 'config', 'bot', 'backup', 'decay'):
        actions.add_parser(name)
    doctor = actions.add_parser('doctor')
    doctor.add_argument('--backup', action='store_true')
    doctor.add_argument('--discord', action='store_true')
    doctor.add_argument('--comfy', action='store_true')
    doctor.add_argument('--json', dest='as_json', action='store_true')
    for name in ('album', 'render'):
        actions.add_parser(name).add_argument('user_id')
    actions.add_parser('game').add_argument('arguments', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    try:
        if args.action == 'init':
            print(json.dumps(initialize(args.config), ensure_ascii=False))
            return 0
        settings, environment = load_settings(args.config)
        if args.action == 'config':
            print(json.dumps({'ok': True, 'config': str(args.config.resolve()), 'effective': settings}, ensure_ascii=False, indent=2))
            return 0
        return subprocess.run(build_command(args, settings), env=environment, cwd=ROOT).returncode
    except KeyboardInterrupt:
        return 130
    except (OSError, ValueError, TypeError) as exc:
        print(json.dumps({'ok': False, 'code': 'configuration_error', 'msg': str(exc)}, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    sys.exit(main())
