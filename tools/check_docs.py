"""Check local Markdown links and HTML image/link targets without network calls.

Run from any directory: python -B -X utf8 tools/check_docs.py
Historical documents are included; external URLs are deliberately not fetched.
"""

from pathlib import Path
import re
import subprocess
from urllib.parse import unquote

root = Path(__file__).resolve().parents[1]
names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=root, text=True).splitlines()
errors = []
count = 0
for name in sorted(set(names)):
    path = root / name
    if path.suffix != '.md' or not path.is_file():
        continue
    text = path.read_text(encoding='utf-8')
    text = re.sub(r'```.*?```', '', text, flags=re.S)
    for match in re.finditer(r'\]\(<?([^\s\)<>]+)>?\)|(?:src|href)=["\']([^"\']+)["\']', text):
        url = match[1] or match[2]
        if re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:', url) or url.startswith(('#', '/', '//')):
            continue
        target = path.parent / unquote(url.split('#', 1)[0])
        count += 1
        if not target.exists():
            errors.append(f'{name}:{text.count(chr(10), 0, match.start()) + 1}: {url}')
print(f'Checked {count} local links; {len(errors)} missing targets.')
print('\n'.join(errors))
raise SystemExit(bool(errors))
