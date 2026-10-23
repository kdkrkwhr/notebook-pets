"""Private loopback transport. No public listener, CORS or arbitrary commands."""
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import secrets
import threading
from urllib.parse import parse_qs, unquote, urlsplit
import uuid

from .storage import APP_KEYS, MAX_IMAGE, portrait_path


def make_server(runtime, ai, ui, port=0):
    token = secrets.token_urlsafe(32)
    uploads = {}
    uploads_lock = threading.Lock()
    ui = Path(ui).resolve()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def respond(self, status, body=b'', mime='application/json'):
            if not isinstance(body, bytes):
                body = json.dumps(body, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob: data:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def trusted(self, mutation=False, capability=False):
            if self.headers.get('Host') != f'127.0.0.1:{self.server.server_port}':
                return False
            origin = self.headers.get('Origin')
            if origin and origin != self.server.origin:
                return False
            if self.headers.get('Sec-Fetch-Site') == 'cross-site':
                return False
            supplied = self.headers.get('X-NoteBuddy-Token', '')
            if capability:
                supplied = parse_qs(urlsplit(self.path).query).get('token', [''])[0]
            return not mutation or secrets.compare_digest(supplied, token)

        def data(self, limit):
            if self.headers.get('Transfer-Encoding'):
                raise ValueError('Chunked requests are not supported.')
            length = int(self.headers.get('Content-Length', '-1'))
            if length < 0 or length > limit:
                raise ValueError('Request is too large.')
            return self.rfile.read(length)

        def do_GET(self):
            if not self.trusted():
                return self.respond(403, {'error': 'Untrusted origin.'})
            path = unquote(urlsplit(self.path).path)
            try:
                if path == '/session':
                    return self.respond(200, {'token': token})
                if path == '/portrait':
                    if not self.trusted(True, True):
                        return self.respond(403, {})
                    name = parse_qs(urlsplit(self.path).query).get('path', [''])[0]
                    body, mime, _ = runtime.storage.get_file(name)
                    return self.respond(200, body, mime)
                target = (ui / (path.lstrip('/') or 'index.html')).resolve()
                if not target.is_relative_to(ui) or not target.is_file() or target.suffix not in ('.html', '.js', '.mjs', '.css', '.svg', '.png', '.webp', '.jpg', '.woff', '.woff2', '.json'):
                    return self.respond(404, {})
                mime = 'application/javascript' if target.suffix in ('.js', '.mjs') else mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
                return self.respond(200, target.read_bytes(), mime)
            except Exception:
                return self.respond(404, {'error': 'File not found.'})

        def do_PUT(self):
            if not self.trusted(True, True):
                return self.respond(403, {})
            try:
                handle = urlsplit(self.path).path.removeprefix('/upload/')
                with uploads_lock:
                    expected = uploads.pop(handle, None)
                if not expected:
                    raise ValueError('Upload expired.')
                data = self.data(MAX_IMAGE)
                if len(data) != expected['size']:
                    raise ValueError('Upload length mismatch.')
                return self.respond(200, runtime.storage.put_file(expected['path'], data))
            except Exception as exc:
                return self.respond(400, {'error': str(exc)})

        def do_POST(self):
            if urlsplit(self.path).path != '/rpc' or not self.trusted(True):
                return self.respond(403, {})
            try:
                request = json.loads(self.data(32 * 1024 * 1024))
                method, args = request['method'], request.get('args', {})
                if not isinstance(args, dict):
                    raise ValueError('Expected arguments object.')
                if method == 'tools.invoke':
                    result = runtime.invoke(args['method'], args.get('args', {}))
                elif method in ('storage.get', 'storage.set'):
                    if args.get('key') not in APP_KEYS or set(args) - {'key', 'value', 'if_match'}:
                        raise ValueError('Unsupported storage key.')
                    result = runtime.wait(getattr(runtime.storage, method.split('.')[1])(**args))
                elif method == 'files.upload_init':
                    portrait_path(args['path'])
                    if not isinstance(args.get('size'), int) or not 0 < args['size'] <= MAX_IMAGE:
                        raise ValueError('Invalid upload size.')
                    handle = secrets.token_urlsafe(24)
                    with uploads_lock:
                        if len(uploads) >= 100:
                            raise ValueError('Too many unfinished uploads. Reopen the app.')
                        uploads[handle] = args
                    result = {'put_url': f'/upload/{handle}?token={token}', 'headers': {}}
                elif method == 'files.upload_finalize':
                    body, _, etag = runtime.storage.get_file(args['path'])
                    if len(body) != args['size']:
                        raise ValueError('Incomplete upload.')
                    result = {'path': args['path'], 'etag': etag}
                elif method == 'files.download_url':
                    runtime.storage.get_file(args['path'])
                    result = self.image_url(args['path'])
                elif method == 'files.list':
                    result = runtime.storage.list_files(**args)
                elif method == 'files.delete':
                    result = runtime.storage.delete_file(**args)
                elif method == 'llm.complete':
                    result = ai.complete(args)
                elif method == 'image.generate':
                    data = ai.generate(args)
                    name = f'portraits/generated/{uuid.uuid4().hex}.png'
                    runtime.storage.put_file(name, data)
                    result = {'images': [{'url': self.image_url(name)['get_url']}]}
                elif method == 'desktop.info':
                    result = ai.info(check=bool(args.get('check')))
                elif method == 'desktop.configure':
                    result = ai.configure(args)
                elif method == 'desktop.cancel':
                    result = ai.cancel()
                else:
                    raise ValueError('Unsupported request.')
                self.respond(200, {'result': result})
            except Exception as exc:
                self.respond(400, {'error': {'message': str(exc), 'code': getattr(exc, 'code', 'desktop_error')}})

        def image_url(self, name):
            from urllib.parse import urlencode
            return {'get_url': self.server.origin + '/portrait?' + urlencode({'path': name, 'token': token})}

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    server.origin = f'http://127.0.0.1:{server.server_port}'
    return server
