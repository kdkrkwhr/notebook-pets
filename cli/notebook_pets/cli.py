"""Small installed launcher for the existing local game and stdio MCP adapter."""
import argparse
from importlib.metadata import version
from importlib.util import find_spec
import json
import os
from pathlib import Path
import re
import runpy
import sys


def default_data_dir():
    if sys.platform == 'win32':
        base = Path(os.environ.get('LOCALAPPDATA') or Path.home() / 'AppData' / 'Local')
        return base / 'NotebookPetsCLI'
    if sys.platform == 'darwin':
        return Path.home() / 'Library' / 'Application Support' / 'NotebookPetsCLI'
    return Path(os.environ.get('XDG_DATA_HOME') or Path.home() / '.local' / 'share') / 'notebook-pets'


def main(argv=None):
    # Help/errors and JSON must also work in a redirected non-UTF-8 Windows shell.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(
        prog='notebook-pets',
        description='Raise a local NoteBuddy companion. Game commands return JSON.',
        epilog='Try: notebook-pets start Buddy; notebook-pets status; notebook-pets feed. '
               'Use help for game commands, data-dir for the save location, or mcp for stdio. '
               'MCP is read-only unless a trusted host supplies NOTEBOOK_EVENT_ID.')
    parser.add_argument('--version', action='version', version=version('notebook-pets'))
    parser.add_argument('--data-dir', default=os.environ.get('NOTEBOOK_DATA_DIR'),
                        help='Save directory (default: a private per-OS user data directory).')
    parser.add_argument('--actor-id', default=os.environ.get('NOTEBOOK_ACTOR_ID', '1'),
                        help='Local notebook ID, 1–20 digits, default 1. Not remote authentication.')
    parser.add_argument('command', nargs='?', help='start, status, feed, play, walk, album, help, mcp, …')
    parser.add_argument('arguments', nargs=argparse.REMAINDER)
    args = parser.parse_args(argv)
    if not args.command:
        parser.print_help()
        return 0
    if re.fullmatch(r'[1-9][0-9]{0,19}', args.actor_id) is None:
        parser.error('--actor-id must be a positive numeric ID of 1–20 digits.')
    actor = os.environ.get('NOTEBOOK_ACTOR_ID')
    if actor is not None and actor != args.actor_id:
        parser.error('--actor-id conflicts with the host NOTEBOOK_ACTOR_ID.')
    data_dir = Path(args.data_dir).expanduser().resolve() if args.data_dir else default_data_dir().resolve()
    if args.command == 'data-dir':
        if args.arguments:
            parser.error('data-dir takes no arguments.')
        print(data_dir)
        return 0
    runtime = Path(__file__).resolve().parent / '_runtime'
    if not (runtime / 'engine' / 'engine.py').is_file():
        parser.error('Bundled game files are missing. Install the built notebook-pets wheel.')
    os.environ['NOTEBOOK_DATA_DIR'] = str(data_dir)
    os.environ['NOTEBOOK_ACTOR_ID'] = args.actor_id
    # These legacy module names stay private to this command-line process.
    sys.path.insert(0, str(runtime / 'engine'))
    if args.command == 'mcp':
        if args.arguments:
            parser.error('mcp takes no positional arguments; use the trusted host environment.')
        if find_spec('mcp') is None:
            parser.error('MCP is optional. Install it with: pip install --pre "notebook-pets[mcp]"')
        runpy.run_path(str(runtime / 'tools' / 'mcp_server.py'), run_name='__main__')
        return 0
    import engine
    result = engine.execute(args.actor_id, args.command, args.arguments)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get('ok') else 1
