"""Publish a code-only Graphify snapshot of committed, public application code.

Requires graphifyy==0.9.93. No skill installation, hooks, LLM or source execution.
The Pages workflow regenerates this snapshot for every published commit.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / ".local" / "architecture"
OUT = BUILD / "graphify-out"
VERSION = "0.9.93"
PREFIXES = ("engine/", "anna/bundle/", "anna/executas/notebuddy/", "web/")
SUFFIXES = {".py", ".js", ".mjs"}


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def main() -> None:
    cli = shutil.which("graphify")
    if not cli:
        raise SystemExit(f"Install graphifyy=={VERSION} before building architecture.")
    version = subprocess.check_output([cli, "--version"], text=True).strip()
    if version != f"graphify {VERSION}":
        raise SystemExit(f"Expected graphify {VERSION}; got {version}")
    revision = git("rev-parse", "HEAD").decode().strip()
    date = git("show", "-s", "--format=%cI", revision).decode().strip()
    files = [p for p in git("ls-tree", "-rz", "--name-only", revision).decode().split("\0")
             if p.startswith(PREFIXES) and Path(p).suffix in SUFFIXES
             and p != "web/build.py" and not p.startswith("web/architecture/")]
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="notebuddy-graph-") as scratch:
        source = Path(scratch) / "notebook-pets"
        for name in files:
            target = source / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(git("show", f"{revision}:{name}"))
        subprocess.run([cli, "extract", str(source), "--code-only", "--no-cluster",
                        "--max-workers", "2"], cwd=source, check=True)
        graph = json.loads((source / "graphify-out" / "graph.json").read_text(encoding="utf-8"))

        # Graphify records its scan root in source locations. Publish only portable
        # repo paths, never the local machine's username or temporary directories.
        def portable(value):
            if isinstance(value, dict):
                return {k: portable(v) for k, v in value.items()}
            if isinstance(value, list):
                return [portable(v) for v in value]
            if isinstance(value, str):
                return value.replace(str(source).replace("\\", "/") + "/", "").replace(
                    str(source) + "\\", "").replace(str(source), ".")
            return value

        graph = portable(graph)
        (OUT / "graph.json").write_text(json.dumps(graph, ensure_ascii=False), encoding="utf-8")
    subprocess.run([cli, "cluster-only", str(BUILD), "--graph", str(OUT / "graph.json"),
                    "--no-label", "--no-viz"], cwd=ROOT, check=True)
    # The exporter only lists communities with labels. Name them from the most
    # represented source file instead of calling an LLM.
    graph = json.loads((OUT / "graph.json").read_text(encoding="utf-8"))
    analysis = json.loads((OUT / ".graphify_analysis.json").read_text(encoding="utf-8"))
    sources = {node["id"]: node.get("source_file", "") for node in graph["nodes"]}
    labels = {}
    for cid, members in analysis["communities"].items():
        counts = Counter(sources.get(member, "") for member in members)
        counts.pop("", None)
        labels[cid] = f"{counts.most_common(1)[0][0]} · {cid}" if counts else f"Community {cid}"
    labels_path = OUT / ".graphify_labels.json"
    labels_path.write_text(json.dumps(labels, ensure_ascii=False), encoding="utf-8")
    subprocess.run([cli, "export", "html", "--graph", str(OUT / "graph.json"),
                    "--labels", str(labels_path), "--node-limit", "5000"], cwd=ROOT, check=True)
    html_path = OUT / "graph.html"
    html = html_path.read_text(encoding="utf-8")
    html = re.sub(r"<title>.*?</title>", "<title>NoteBuddy · Graphify 코드 지도</title>", html, count=1)
    html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">')
    html = html.replace('</body>', '''<button id="notebuddy-fit" type="button" style="position:fixed;left:16px;bottom:16px;z-index:5;padding:10px 16px;border:1px solid #61776d;border-radius:6px;background:#243e35;color:#fff;cursor:pointer">전체 지도 보기 · Fit</button>
<script>
const fitNoteBuddy=()=>network.fit({animation:false});
document.getElementById('notebuddy-fit').addEventListener('click',fitNoteBuddy);
network.once('stabilized',fitNoteBuddy);
window.addEventListener('resize',fitNoteBuddy);
fitNoteBuddy();
</script></body>''')
    html_path.write_text(html, encoding="utf-8")
    graph = json.loads((OUT / "graph.json").read_text(encoding="utf-8"))
    metadata = {"revision": revision, "sourceDate": date, "graphifyVersion": VERSION,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "files": files, "fileCount": len(files), "nodeCount": len(graph["nodes"]),
                "edgeCount": len(graph.get("links", graph.get("edges", []))),
                "scope": list(PREFIXES), "mode": "code-only; no LLM"}
    (OUT / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    for name in ("graph.json", "graph.html", "GRAPH_REPORT.md", "metadata.json"):
        public_text = (OUT / name).read_text(encoding="utf-8")
        if re.search(r"(?<![A-Za-z])[A-Za-z]:[\\/]|/Users/|/home/runner/|notebuddy-graph-", public_text):
            raise SystemExit(f"Non-portable machine path in {name}; refusing publication.")
    print(json.dumps(metadata | {"files": f"{len(files)} committed source files"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
