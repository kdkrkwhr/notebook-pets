"""Unmodified, locally signed-in Claude Code; subscription-only vector artwork."""
import base64
from io import BytesIO
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image

from .ai_common import AIError, CLIBase
from .storage import check_image
from .vector_art import DRAWING_INSTRUCTIONS, render_svg


def command(configured=''):
    found = configured or shutil.which('claude')
    if not found:
        native = Path.home()/'.local/bin'/('claude.exe' if os.name == 'nt' else 'claude')
        if native.is_file(): found = str(native)
    if not found: raise AIError('Install Claude Code and sign in with your Claude subscription first.')
    path = Path(found).expanduser().resolve()
    if not path.is_file(): raise AIError('Claude Code executable does not exist.')
    if path.suffix.lower() in ('.cmd','.bat','.ps1'):
        entry = path.parent / 'node_modules/@anthropic-ai/claude-code/cli.js'
        node = shutil.which('node')
        if not entry.is_file() or not node: raise AIError('Choose the official Claude Code executable.')
        return [node,str(entry)]
    return [str(path)]


def subscription_environment():
    # Keep authentication inside the official CLI. Do not allow inherited API
    # keys, billing gateways or other providers to silently replace subscription login.
    return {k:v for k,v in os.environ.items() if not k.startswith(('ANTHROPIC_','ORCA_','CODEX_THREAD','CODEX_TURN'))
            and k not in ('CLAUDECODE','CLAUDE_CODE_USE_BEDROCK','CLAUDE_CODE_USE_VERTEX',
                         'CLAUDE_CODE_USE_FOUNDRY','CLAUDE_CODE_OAUTH_TOKEN','CLAUDE_CODE_API_KEY_HELPER_TTL_MS')}


class Claude(CLIBase):
    settings_filename = 'claude-settings.json'

    def info(self, check=False):
        result = {'settings':self.settings.copy(),'busy':self.lock.locked(),'lastError':self.last_error,
                  'imageMode':'vector'}
        if check:
            try:
                cmd = command(self.settings['path'])
                opts = dict(capture_output=True,text=True,encoding='utf-8',errors='replace',
                            timeout=20,env=subscription_environment(),cwd=self.jobs)
                if os.name=='nt': opts['creationflags'] = subprocess.CREATE_NO_WINDOW
                version = subprocess.run([*cmd,'--version'],**opts)
                help_text = subprocess.run([*cmd,'--help'],**opts).stdout
                result['version'] = version.stdout.strip()[:200]
                result['compatible'] = version.returncode==0 and all(flag in help_text for flag in
                    ('--safe-mode','--restricted','--setting-sources','--strict-mcp-config',
                     '--no-session-persistence','--permission-prompts','--input-format'))
                if not result['compatible']: raise AIError('Update Claude Code to a version supporting isolated subscription requests (tested with 2.1.301).')
                auth = subprocess.run([*cmd,'--safe-mode','--setting-sources','','auth','status','--json'],**opts)
                status = json.loads(auth.stdout)
                result['loggedIn'] = (auth.returncode==0 and status.get('loggedIn') is True
                                      and status.get('authMethod')=='claude.ai'
                                      and status.get('apiProvider')=='firstParty')
                if not result['loggedIn']: result['error'] = 'Sign in to the official Claude Code with your Claude account. API-key billing is not used in this mode.'
            except (OSError,subprocess.SubprocessError,ValueError,AIError) as exc:
                result.update(error=str(exc),compatible=False,loggedIn=False)
        return result

    def run(self, prompt, images=(), generate=False):
        if not self.lock.acquire(blocking=False): raise AIError('Another AI request is running.')
        self.last_error = ''
        self.cancelled.clear()
        try:
            connection = self.info(check=True)
            if not connection.get('compatible') or not connection.get('loggedIn'):
                raise AIError(connection.get('error','Check Claude Code subscription login.'))
            with tempfile.TemporaryDirectory(prefix='claude-',dir=self.jobs) as work:
                argv = [*command(self.settings['path']),'--print','--safe-mode','--restricted',
                        '--setting-sources','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}',
                        '--tools','','--permission-mode','dontAsk','--permission-prompts','none',
                        '--disable-slash-commands','--no-chrome','--no-session-persistence',
                        '--input-format','stream-json','--output-format','stream-json','--verbose',
                        '--effort','low','--system-prompt',
                        'You are NoteBuddy, a fictional companion game language and visual component. '
                        'Use only the supplied conversation or image. Do not use tools, inspect files, '
                        'browse, run commands, or modify game state. Return the requested text, JSON or SVG.']
                if self.settings['model']: argv += ['--model',self.settings['model']]
                content = []
                for data in images:
                    check_image(data)
                    with Image.open(BytesIO(data)) as image:
                        output = BytesIO(); image.convert('RGB').save(output,format='PNG')
                    content.append({'type':'image','source':{'type':'base64','media_type':'image/png',
                        'data':base64.b64encode(output.getvalue()).decode('ascii')}})
                content.append({'type':'text','text':prompt})
                request = (json.dumps({'type':'user','message':{'role':'user','content':content}},ensure_ascii=False)+'\n').encode('utf-8')
                if len(request)>10_000_000: raise AIError('The reference images are too large for Claude Code.')
                options = dict(cwd=work,env=subscription_environment(),stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE,stderr=subprocess.PIPE)
                if os.name=='nt': options['creationflags'] = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP
                else: options['start_new_session'] = True
                with self.process_lock:
                    if self.cancelled.is_set(): raise AIError('Claude Code request cancelled.')
                    self.process = proc = subprocess.Popen(argv,**options)
                try:
                    stdout,stderr = proc.communicate(request,timeout=300 if generate else 150)
                except subprocess.TimeoutExpired:
                    self.cancel(); proc.communicate()
                    raise AIError('Claude Code timed out. No automatic retry was made. Your saved companion is safe.')
                finally:
                    with self.process_lock: self.process = None
                events = []
                for line in stdout.decode('utf-8','replace').splitlines():
                    try: events.append(json.loads(line))
                    except ValueError: pass
                result = next((e for e in reversed(events) if e.get('type')=='result'),{})
                if proc.returncode or result.get('is_error') or not result.get('result'):
                    detail = str(result.get('result') or result.get('errors') or stderr.decode('utf-8','replace'))
                    raise AIError('Claude Code request failed or was cancelled. '+detail[-600:])
                return result['result'].strip()
        except Exception as exc:
            self.last_error = str(exc)[:1000]
            if isinstance(exc,AIError): raise
            raise AIError('Could not run Claude Code: '+self.last_error) from exc
        finally: self.lock.release()

    def generate(self,args):
        prompt = args.get('prompt')
        if not isinstance(prompt,str) or not 1<=len(prompt)<=20000 or args.get('n',1)!=1:
            raise ValueError('One bounded image prompt is required.')
        try:
            return render_svg(self.run(DRAWING_INSTRUCTIONS+prompt,generate=True))
        except Exception as exc:
            self.last_error = str(exc)[:1000]
            if isinstance(exc,AIError): raise
            raise AIError('Claude drawing could not be saved. No automatic retry was made. '+self.last_error) from exc
