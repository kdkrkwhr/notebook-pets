# Desktop distribution notices

NoteBuddy uses its existing MIT-licensed code, game assets and bundled Galmuri fonts.
The original font license is included with the UI under `fonts/OFL.txt`.

The native runtime includes CPython (PSF license), pywebview (BSD-3-Clause),
pythonnet (MIT, Windows), PyObjC (MIT, macOS), Pillow (MIT-CMU), the Executa SDK
(MIT, copyright 2026 Anna), and PyInstaller's bootloader (GPL with its distribution exception).
Exact installed dependency versions and available license texts are collected in
`licenses/dependencies` during each native build. CPython's license is included there.

Codex CLI is not bundled, modified, or redistributed. Users install it and sign in
themselves. NoteBuddy calls it as a local subprocess and never copies credentials.
