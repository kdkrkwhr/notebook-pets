"""Local durable APS-shaped storage, with conditional writes and real image files."""
import hashlib
from contextlib import closing
from io import BytesIO
import json
from pathlib import Path
import re
import sqlite3
import threading
import uuid

from executa_sdk import StorageError
from PIL import Image

MAX_IMAGE = 20 * 1024 * 1024
APP_KEYS = {'notebuddy/chat-v1', 'notebuddy/art-v1', 'notebuddy/walk-story-v1',
            'notebuddy/personality-draft-v1'}


def portrait_path(path):
    if not isinstance(path, str) or len(path) > 300 or not re.fullmatch(r'portraits/[A-Za-z0-9_./-]+', path) or any(p in ('', '.', '..') for p in path.split('/')):
        raise ValueError('Invalid portrait path.')
    return path


def check_image(data):
    if not data or len(data) > MAX_IMAGE:
        raise ValueError('Image is too large or empty.')
    with Image.open(BytesIO(data)) as img:
        if img.format not in ('PNG', 'JPEG', 'WEBP') or img.width * img.height > 24_000_000:
            raise ValueError('Unsupported image.')
        mime = Image.MIME[img.format]
        img.verify()
    return mime


class Storage:
    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(self.root / 'notebuddy.sqlite3', check_same_thread=False)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.executescript('''
          CREATE TABLE IF NOT EXISTS kv(scope TEXT,key TEXT,value TEXT,etag TEXT,PRIMARY KEY(scope,key));
          CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY,body BLOB,mime TEXT,etag TEXT);
        ''')

    async def get(self, key, scope='app'):
        with self.lock:
            row = self.db.execute('SELECT value,etag FROM kv WHERE scope=? AND key=?', (scope, key)).fetchone()
        return {'exists': bool(row), 'value': json.loads(row[0]) if row else None, 'etag': row[1] if row else None}

    async def set(self, key, value, scope='app', if_match=None, **ignored):
        text = json.dumps(value, ensure_ascii=False, allow_nan=False)
        if len(text.encode('utf-8')) > 8 * 1024 * 1024:
            raise StorageError(-32025, 'Save is too large.')
        with self.lock, self.db:
            row = self.db.execute('SELECT etag FROM kv WHERE scope=? AND key=?', (scope, key)).fetchone()
            if if_match is not None and (not row or row[0] != if_match):
                raise StorageError(-32023, 'Save changed; reload before retrying.')
            etag = uuid.uuid4().hex
            self.db.execute('INSERT OR REPLACE INTO kv VALUES (?,?,?,?)', (scope, key, text, etag))
        return {'etag': etag}

    def put_file(self, path, data):
        path = portrait_path(path)
        mime = check_image(data)
        etag = hashlib.sha256(data).hexdigest()
        with self.lock, self.db:
            self.db.execute('INSERT OR REPLACE INTO files VALUES (?,?,?,?)', (path, data, mime, etag))
        return {'path': path, 'etag': etag, 'size': len(data)}

    def get_file(self, path):
        with self.lock:
            row = self.db.execute('SELECT body,mime,etag FROM files WHERE path=?', (portrait_path(path),)).fetchone()
        if not row:
            raise StorageError(-32022, 'Portrait not found.')
        return row

    def list_files(self, prefix='portraits/', limit=100, cursor=None):
        if prefix != 'portraits/' or not isinstance(limit, int) or not 1 <= limit <= 100:
            raise ValueError('Invalid listing.')
        with self.lock:
            rows = self.db.execute('SELECT path,etag,length(body) FROM files WHERE path>? ORDER BY path LIMIT ?', (cursor or '', limit + 1)).fetchall()
        return {'items': [{'path': r[0], 'etag': r[1], 'size': r[2]} for r in rows[:limit]],
                'next_cursor': rows[limit-1][0] if len(rows) > limit else None}

    def delete_file(self, path, if_match):
        with self.lock, self.db:
            row = self.get_file(path)
            if not if_match or row[2] != if_match:
                raise StorageError(-32023, 'Portrait changed.')
            self.db.execute('DELETE FROM files WHERE path=?', (path,))
        return {'deleted': True}

    def backup(self, destination):
        # SQLite backup API captures a consistent snapshot, including WAL commits.
        with self.lock, closing(sqlite3.connect(destination)) as target:
            self.db.backup(target)

    def close(self):
        with self.lock:
            self.db.close()
