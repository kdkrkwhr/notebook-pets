# Desktop distribution notices

NoteBuddy uses its existing MIT-licensed code, game assets and bundled Galmuri fonts.
The original font license is included with the UI under `fonts/OFL.txt`.

The native runtime includes CPython (PSF license), pywebview (BSD-3-Clause),
pythonnet (MIT, Windows), PyObjC (MIT, macOS), Pillow (MIT-CMU), the Executa SDK
(MIT, copyright 2026 Anna), and PyInstaller's bootloader (GPL with its distribution exception).
SVG rasterization uses resvg_py 0.5.0 (MIT) and its unmodified Rust dependencies.
Their exact source versions, checksums, license and copyright notices are included
in `licenses/dependencies/RESVG-RUST-DEPENDENCIES.txt`; the Python wrapper's license
is collected from its wheel. Upstream: https://github.com/baseplate-admin/resvg-py.
Exact installed dependency versions and available license texts are collected in
`licenses/dependencies` during each native build. CPython's license is included there.

Codex CLI and Claude Code are not bundled, modified, or redistributed. Users install them and sign in
themselves. NoteBuddy calls the selected CLI as a local subprocess and never copies credentials.
