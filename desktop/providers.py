"""Choose one local CLI while preserving each provider's separate settings."""
import json
from pathlib import Path
import threading

from .ai_common import AIError
from .codex import Codex
from .claude import Claude


class AI:
    def __init__(self,root):
        self.clients = {'codex':Codex(root),'claude':Claude(root)}
        self.file = Path(root)/'ai-provider.json'
        self.provider = json.loads(self.file.read_text('utf-8')) if self.file.exists() else 'codex'
        if self.provider not in self.clients: raise ValueError('Unknown saved AI provider.')
        self.lock = threading.Lock()

    def info(self,check=False,provider=None):
        selected = provider or self.provider
        if selected not in self.clients: raise ValueError('Unknown AI provider.')
        info = self.clients[selected].info(check)
        return {**info,'settings':{**info['settings'],'provider':selected},'busy':self.lock.locked(),
                'profiles':{name:client.settings.copy() for name,client in self.clients.items()}}

    def configure(self,values):
        if not isinstance(values,dict) or set(values)!={'provider','path','model'} or values['provider'] not in self.clients:
            raise ValueError('Invalid AI settings.')
        if not self.lock.acquire(blocking=False): raise AIError('Wait for the current AI request before changing settings.')
        try:
            selected = values['provider']
            self.clients[selected].configure({k:values[k] for k in ('path','model')})
            temporary = self.file.with_suffix('.tmp')
            temporary.write_text(json.dumps(selected),encoding='utf-8'); temporary.replace(self.file)
            self.provider = selected
            return {'saved':True}
        finally: self.lock.release()

    def _call(self,method,args):
        if not self.lock.acquire(blocking=False): raise AIError('Another AI request is running. Wait for it to finish.')
        try: return getattr(self.clients[self.provider],method)(args)
        finally: self.lock.release()

    def complete(self,args): return self._call('complete',args)
    def generate(self,args): return self._call('generate',args)
    def cancel(self): return self.clients[self.provider].cancel()
