"""Use the user's unmodified Codex CLI. Never read/copy its credentials."""
import base64
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

from .storage import check_image
from .ai_common import AIError, CLIBase


def command(configured=''):
    found = configured or shutil.which('codex')
    if not found:
        raise AIError('Install Codex CLI and run codex login in your terminal first.')
    path = Path(found).expanduser().resolve()
    if not path.is_file():
        raise AIError('Codex CLI path does not exist.')
    # npm Windows shims require cmd.exe. Invoke the official JS entry with node
    # directly instead; all user text travels through stdin, never a shell.
    if path.suffix.lower() in ('.cmd', '.bat', '.ps1'):
        entry = path.parent / 'node_modules' / '@openai' / 'codex' / 'bin' / 'codex.js'
        node = shutil.which('node')
        if not entry.is_file() or not node:
            raise AIError('Choose the Codex executable, or install the official npm Codex package and Node.js.')
        return [node, str(entry)]
    return [str(path)]


class Codex(CLIBase):


    def info(self, check=False):
        result = {'settings': self.settings, 'busy': self.lock.locked(), 'lastError': self.last_error}
        if check:
            try:
                cmd = command(self.settings['path'])
                opts = {'capture_output': True, 'text': True, 'encoding': 'utf-8', 'errors': 'replace', 'timeout': 15}
                if os.name == 'nt':
                    opts['creationflags'] = subprocess.CREATE_NO_WINDOW
                version = subprocess.run([*cmd, '--version'], **opts)
                help_text = subprocess.run([*cmd, 'exec', '--help'], **opts).stdout
                result['version'] = version.stdout.strip()[:200]
                result['compatible'] = version.returncode == 0 and all(flag in help_text for flag in ('--ignore-user-config', '--ignore-rules', '--ephemeral'))
                login = subprocess.run([*cmd, 'login', 'status'], **opts)
                result['loggedIn'] = login.returncode == 0
            except (OSError, subprocess.SubprocessError, AIError) as exc:
                result['error'] = str(exc)
                result['compatible'] = False
        return result


    def run(self, prompt, images=(), generate=False):
        if not self.lock.acquire(blocking=False):
            raise AIError('Another AI request is running. Wait for it to finish.')
        self.last_error = ''
        self.cancelled.clear()
        try:
            with tempfile.TemporaryDirectory(prefix='request-', dir=self.jobs) as work:
                work = Path(work)
                output = work / 'reply.txt'
                argv = [*command(self.settings['path']), '--no-daemon', 'exec',
                        '--ignore-user-config', '--ignore-rules', '--ephemeral',
                        '--skip-git-repo-check', '--sandbox', 'read-only', '--json',
                        '--output-last-message', str(output), '-C', str(work),
                        '-c', 'approval_policy="never"', '-c', 'web_search="disabled"',
                        '-c', 'project_doc_max_bytes=0', '-c', 'features.skip_host_skill_discovery=true',
                        '-c', 'model_reasoning_effort="low"']
                # Image generation runs through Codex's isolated code-mode host;
                # leave that host enabled while removing shell/integration tools.
                for feature in ('shell_tool', 'unified_exec', 'shell_snapshot', 'apps', 'hooks', 'plugins', 'remote_plugin', 'multi_agent',
                                'view_image', 'browser_use', 'browser_use_external', 'browser_use_full_cdp_access',
                                'computer_use', 'in_app_browser', 'in_app_local_automation'):
                    argv += ['--disable', feature]
                argv += ['--enable' if generate else '--disable', 'image_generation']
                if self.settings['model']:
                    argv += ['--model', self.settings['model']]
                for index, data in enumerate(images):
                    check_image(data)
                    path = work / f'reference-{index}.png'
                    path.write_bytes(data)
                    argv += ['--image', str(path)]
                argv += ['-']
                env = {k: v for k, v in os.environ.items() if not k.startswith(('CODEX_THREAD', 'CODEX_TURN', 'ORCA_'))}
                options = {'cwd': work, 'env': env, 'stdin': subprocess.PIPE, 'stdout': subprocess.PIPE, 'stderr': subprocess.PIPE}
                if os.name == 'nt':
                    options['creationflags'] = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP
                else:
                    options['start_new_session'] = True
                with self.process_lock:
                    if self.cancelled.is_set(): raise AIError('AI request cancelled.')
                    self.process = proc = subprocess.Popen(argv, **options)
                try:
                    stdout, stderr = proc.communicate(prompt.encode('utf-8'), timeout=300 if generate else 150)
                except subprocess.TimeoutExpired:
                    self.cancel()
                    proc.communicate()
                    raise AIError('Codex timed out. No automatic retry was made. Check Codex usage before retrying.')
                finally:
                    with self.process_lock:
                        self.process = None
                events = []
                for line in stdout.decode('utf-8', 'replace').splitlines():
                    try:
                        events.append(json.loads(line))
                    except ValueError:
                        pass
                if proc.returncode:
                    detail = next((str(e.get('message') or e.get('error')) for e in reversed(events) if e.get('type') in ('error', 'turn.failed')), '')
                    raise AIError('Codex request failed or was cancelled. ' + (detail[:600] or stderr.decode('utf-8', 'replace')[-600:]))
                reply = output.read_text('utf-8') if output.exists() else ''
                if generate:
                    return self.generated_image(events, reply)
                if not reply.strip():
                    raise AIError('Codex returned no reply. Check AI settings and your CLI login.')
                return reply.strip()
        except Exception as exc:
            self.last_error = str(exc)[:1000]
            if isinstance(exc, AIError):
                raise
            raise AIError('Could not run Codex: ' + self.last_error) from exc
        finally:
            self.lock.release()

    @staticmethod
    def generated_image(events, reply):
        # Accept image bytes from a tool event, or a new artifact inside Codex's
        # dedicated output directory. Never follow arbitrary model-chosen paths.
        for event in events:
            item = event.get('item') or {}
            if item.get('type') not in ('image_generation', 'imageGeneration'):
                continue
            encoded = item.get('result')
            if encoded:
                try:
                    data = base64.b64decode(encoded, validate=True)
                    check_image(data)
                    return data
                except (ValueError, OSError):
                    pass
            saved = item.get('saved_path') or item.get('savedPath')
            if saved:
                base = Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'generated_images'
                path = Path(saved).resolve()
                if path.is_relative_to(base.resolve()) and path.is_file():
                    data = path.read_bytes()
                    check_image(data)
                    return data
        # Codex exec 0.159 emits an empty agent_message for inline images, but
        # persists them under generated_images/<this exact fresh thread ID>.
        # Do not scan other sessions or guess a path from model-generated text.
        thread = next((e.get('thread_id') for e in events if e.get('type') == 'thread.started'), '')
        if isinstance(thread, str) and re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}', thread):
            base = (Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'generated_images').resolve()
            folder = (base / thread).resolve()
            if folder.parent == base and folder.name == thread and not (base / thread).is_symlink() and folder.is_dir():
                candidates = [p for p in folder.glob('*.png') if p.is_file() and not p.is_symlink() and p.resolve().parent == folder]
                if len(candidates) == 1 and candidates[0].stat().st_size <= 20 * 1024 * 1024:
                    data = candidates[0].read_bytes()
                    check_image(data)
                    return data
        raise AIError('Codex did not return a supported image artifact. No automatic retry was made. Your previous portrait is safe.')


    def generate(self, args):
        prompt = args.get('prompt')
        if not isinstance(prompt, str) or not 1 <= len(prompt) <= 20000 or args.get('n', 1) != 1:
            raise ValueError('One bounded image prompt is required.')
        return self.run('Use the built-in image generation tool exactly ONCE to generate ONE image. '
                        'Do not run commands, use external tools, or retry. Return the generated image. '
                        'The following is the visual brief for a fictional pet game:\n' + prompt, generate=True)
