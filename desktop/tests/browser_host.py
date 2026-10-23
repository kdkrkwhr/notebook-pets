"""Only tests import this deterministic AI; the production app never loads it."""
from io import BytesIO
import json
from pathlib import Path
import sys
import tempfile
import threading
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from desktop.runtime import Runtime
from desktop.server import make_server
from PIL import Image, ImageDraw


class FakeAI:
    def __init__(self):
        self.calls = []; self.provider = 'codex'
        self.profiles = {'codex': {'path': '', 'model': ''}, 'claude': {'path': '', 'model': ''}}
    def info(self, check=False, provider=None):
        selected = provider or self.provider
        return {'settings': {**self.profiles[selected], 'provider': selected}, 'profiles': self.profiles,
                'busy': False, 'lastError': '', 'compatible': True, 'loggedIn': True, 'version': 'fixture', 'calls': self.calls}
    def configure(self, args):
        self.provider = args['provider']; self.profiles[self.provider] = {k: args[k] for k in ('path', 'model')}
        return {'saved': True}
    def complete(self, args):
        prompt = args.get('systemPrompt', ''); self.calls.append('text')
        value = 'I am happy to see you!'
        if 'fictional lifelong virtual pet personality' in prompt:
            value = json.dumps({'traits': {'curiosity': 1, 'warmth': 0, 'energy': 0, 'caution': 1}, 'summary': {'en': 'A curious friend.', 'ko': '호기심 많은 친구예요.'}, 'voice': {'en': 'Short gentle sentences', 'ko': '짧고 다정하게 말해요'}, 'habit': {'en': 'Tilts their head', 'ko': '고개를 갸웃해요'}})
        elif isinstance(args.get('messages', [{}])[0].get('content'), list):
            value = json.dumps({'decision': 'allow', 'features': 'Round green face, leaf ears, four paws', 'species': 'plant', 'element': 'nature', 'confidence': 'clear'})
        elif 'Choose ONE candidate_id' in prompt:
            request = json.loads(args['messages'][0]['content']['text'])
            value = json.dumps({'candidate_id': request['candidates'][0]['id'], 'reason': 'A peaceful corner.'})
        elif 'virtual-pet walk vignette' in prompt:
            value = json.dumps({'title': 'A quiet path', 'scene': 'Leaves rustle.', 'choices': [{'label': 'Listen', 'ending': 'We listened.'}, {'label': 'Keep walking', 'ending': 'We walked.'}]})
        return {'content': {'type': 'text', 'text': value}}
    def generate(self, args):
        self.calls.append('image')
        image = Image.new('RGB', (512, 512), '#fbf6e9'); draw = ImageDraw.Draw(image)
        draw.ellipse((100, 100, 412, 420), fill='#71926e'); draw.ellipse((180, 210, 205, 245), fill='white'); draw.ellipse((310, 210, 335, 245), fill='white')
        out = BytesIO(); image.save(out, format='PNG'); return out.getvalue()


with tempfile.TemporaryDirectory(prefix='notebuddy-browser-') as folder:
    runtime = Runtime(Path(folder)); ai = FakeAI()
    server = make_server(runtime, ai, Path('build/desktop-ui'))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    print(server.origin, flush=True)
    try: sys.stdin.read()
    finally: server.shutdown(); server.server_close(); thread.join(); runtime.close()
