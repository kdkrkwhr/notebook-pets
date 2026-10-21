"""Render source-linked guides and Graphify Markdown as a static, searchable wiki.

No runtime Markdown renderer, LLM, application storage or API keys are used.
Guide source links stay pinned to their reviewed revision; changed references
are flagged by blob hashes, not silently marked reviewed at every deployment.
"""
from __future__ import annotations

import hashlib
from html import escape
import json
from pathlib import Path
import posixpath
import re
import shutil
import subprocess
from urllib.parse import quote, unquote, urlsplit
from zipfile import ZipFile, ZIP_DEFLATED

from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs' / 'wiki'
GRAPH = ROOT / '.local' / 'architecture' / 'graphify-out'
OUT = ROOT / 'web' / 'dist' / 'wiki'
REPO = 'https://github.com/kdkrkwhr/notebook-pets'
MD = MarkdownIt('commonmark', {'html': False}).enable('table')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def main():
    meta = json.loads((GRAPH / 'metadata.json').read_text(encoding='utf-8'))
    revision = meta['revision']
    if revision != git('rev-parse', 'HEAD').decode().strip():
        raise SystemExit('Rebuild architecture for the current Git HEAD first.')
    catalog = json.loads((SOURCE / 'catalog.json').read_text(encoding='utf-8'))
    evidence = json.loads((SOURCE / 'sources.json').read_text(encoding='utf-8'))
    reviewed = evidence['revision']
    if not re.fullmatch('[a-f0-9]{40}', reviewed):
        raise SystemExit('A full reviewed commit is required.')
    tracked = set(git('ls-tree', '-rz', '--name-only', revision).decode().split('\0'))
    docs = {}
    for page in catalog:
        name = page['file']
        if Path(name).name != name or not name.endswith('.md'):
            raise SystemExit('Guides must be Markdown files directly inside docs/wiki.')
        text = (SOURCE / name).read_text(encoding='utf-8')
        sources = sorted(set(re.findall(r'\]\(\.\./\.\./([^\s)#]+)(?:#[^)]*)?\)', text)))
        changes = []
        for src in sources:
            if src not in evidence['files']:
                raise SystemExit(f'Unreviewed reference in {name}: {src}')
            current = hashlib.sha256(git('show', f'{revision}:{src}')).hexdigest() if src in tracked else None
            if current != evidence['files'][src]:
                changes.append(src)
        text = re.sub(r'\]\(\.\./\.\./([^\s)]+)\)',
                      lambda m: f']({REPO}/blob/{reviewed}/{quote(m[1], safe="/#")})', text)
        docs[name] = dict(page, text=text, kind='guide', sources=sources, changes=changes)
    generated = sorted((GRAPH / 'wiki').glob('*.md'))
    if not generated or not (GRAPH / 'wiki' / 'index.md').is_file():
        raise SystemExit('Graphify wiki is missing; run tools/build_architecture.py.')
    for path in generated:
        text = path.read_text(encoding='utf-8')
        title = next(line[2:] for line in text.splitlines() if line.startswith('# '))
        # Turn exact file references into commit-pinned links, preserving code labels.
        text = re.sub(r'`([^`\n]+)`', lambda m:
                      f'[`{m[1]}`]({REPO}/blob/{revision}/{quote(m[1])})'
                      if m[1] in meta['files'] else m[0], text)
        name = 'graphify/' + path.name
        docs[name] = dict(file=name, title=title, summary='Graphify 코드 관계 자동 문서',
                          text=text, kind='graphify', sources=[], changes=[])
    if OUT.exists():
        if OUT.is_symlink() or OUT.resolve() != ROOT.resolve() / 'web' / 'dist' / 'wiki':
            raise SystemExit('Unexpected wiki output directory')
        shutil.rmtree(OUT)
    shutil.copytree(ROOT / 'web' / 'wiki', OUT)
    assets = {name: hashlib.sha256((OUT / name).read_bytes()).hexdigest()[:12]
              for name in ('style.css', 'search.js')}
    template = (ROOT / 'web' / 'wiki' / 'page.html').read_text(encoding='utf-8')
    (OUT / 'page.html').unlink()  # This file is a build template, not a public page.
    index = []
    for name, doc in docs.items():
        prefix = '../' if name.startswith('graphify/') else './'
        root = prefix + '../'
        tokens = MD.parse(doc['text'])
        toc = []
        for i, token in enumerate(tokens):
            if token.type == 'heading_open' and token.tag in ('h2', 'h3'):
                anchor = f'section-{len(toc) + 1}'
                token.attrSet('id', anchor)
                toc.append((anchor, tokens[i + 1].content))
            for child in token.children or []:
                if child.type != 'link_open':
                    continue
                href = child.attrGet('href')
                url = urlsplit(href)
                if url.scheme or url.netloc or not url.path:
                    continue
                target = posixpath.normpath(posixpath.join(posixpath.dirname(name), unquote(url.path)))
                if target not in docs:
                    raise SystemExit(f'Broken wiki link in {name}: {href}')
                child.attrSet('href', quote(unquote(url.path)[:-3] + '.html') + (f'#{url.fragment}' if url.fragment else ''))
        body = MD.renderer.render(tokens, MD.options, {})
        body = body.replace('<table>', '<div class="table-scroll" tabindex="0" role="region" aria-label="표"><table>').replace('</table>', '</table></div>')
        badge = '기능 해설 · LLM 작성 및 소스 대조' if doc['kind'] == 'guide' else 'Graphify 자동 문서 · 코드 관계 추출'
        provenance = f'해설 확인 <a href="{REPO}/tree/{reviewed}">{reviewed[:7]}</a>' if doc['kind'] == 'guide' else f'분석 커밋 <a href="{REPO}/tree/{revision}">{revision[:7]}</a>'
        if doc['changes']:
            status = '<aside class="notice warning"><strong>근거 변경 확인 필요</strong><p>해설 확인 이후 다음 파일이 변경되었거나 삭제됐어요. 소스 링크는 확인 당시 커밋을 가리켜요.</p><ul>' + ''.join(f'<li>{escape(p)}</li>' for p in doc['changes']) + '</ul></aside>'
        elif doc['kind'] == 'guide':
            status = '<p class="source-status">연결한 근거 파일은 해설 확인 당시와 같아요. 문장 검토는 자동화하지 않아요.</p>'
        else:
            status = '<p class="source-status">정적 코드 관계를 정리한 원본 문서예요. 그룹과 연결은 배포 때 갱신되며 동적 호출은 빠질 수 있어요.</p>'
        nav = ''
        for n, page in enumerate(catalog):
            current = 'aria-current="page"' if page['file'] == name else ''
            nav += f'<a {current} href="{prefix}{page["file"][:-3]}.html"><span>{n:02}</span>{escape(page["title"])}</a>'
        current = 'aria-current="page"' if name.startswith('graphify/') else ''
        nav += f'<a href="{prefix}graphify/index.html" {current}><span>↗</span>Graphify 자동 문서</a>'
        headings = ''.join(f'<a href="#{anchor}">{escape(label)}</a>' for anchor, label in toc)
        raw = prefix + 'markdown/' + quote(name)
        replacements = dict(TITLE=escape(doc['title']), PREFIX=prefix, ROOT=root, NAV=nav, TOC=headings,
                            BODY=body, BADGE=badge, PROVENANCE=provenance, STATUS=status, RAW=raw,
                            COUNT=str(len(generated) - 1), GUIDE_COUNT=str(len(catalog)),
                            REVISION=revision, SHORT=revision[:7], DATE=escape(meta['generatedAt'][:10]),
                            LANGUAGE='en' if doc['kind'] == 'graphify' else 'ko',
                            CSS_VERSION=assets['style.css'], JS_VERSION=assets['search.js'])
        html = re.sub(r'__([A-Z_]+)__', lambda m: replacements[m[1]], template)
        target = OUT / (name[:-3] + '.html')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding='utf-8')
        raw_path = OUT / 'markdown' / name
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        warning = f'> 근거 변경 확인 필요: {", ".join(doc["changes"])}\n\n' if doc['changes'] else ''
        raw_path.write_text(f'> NoteBuddy wiki · {badge} · source {reviewed if doc["kind"] == "guide" else revision}\n\n' + warning + doc['text'], encoding='utf-8')
        search_text = '\n'.join(t.content for t in tokens if t.type == 'inline')
        index.append(dict(title=doc['title'], summary=doc['summary'], url=quote(name[:-3] + '.html'),
                          kind=doc['kind'], text=search_text))
    (OUT / 'search-index.json').write_text(json.dumps(index, ensure_ascii=False), encoding='utf-8')
    public_meta = dict(revision=revision, reviewedRevision=reviewed, generatedAt=meta['generatedAt'],
                       guideCount=len(catalog), graphifyArticleCount=len(generated) - 1,
                       pages=[dict(file=d['file'], sources=d['sources'], changedSources=d['changes']) for d in docs.values()])
    (OUT / 'metadata.json').write_text(json.dumps(public_meta, ensure_ascii=False, indent=2), encoding='utf-8')
    with ZipFile(OUT / 'notebuddy-wiki.zip', 'w', ZIP_DEFLATED) as archive:
        for path in sorted((OUT / 'markdown').rglob('*.md')):
            archive.write(path, str(path.relative_to(OUT / 'markdown')).replace('\\', '/'))
        archive.write(OUT / 'metadata.json', 'metadata.json')
    print(f'Wiki: {len(catalog)} guides, {len(generated) - 1} Graphify articles; {revision}')


if __name__ == '__main__':
    main()
