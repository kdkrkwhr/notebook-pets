"""Build on the destination OS/CPU. Outputs an app plus a platform installer."""
import argparse
import hashlib
from importlib.metadata import distributions
import json
from pathlib import Path
import platform
import plistlib
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from desktop import __version__
from desktop.prepare import prepare


def run(*args):
    subprocess.run(list(map(str, args)), cwd=ROOT, check=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--app-only', action='store_true')
    args=parser.parse_args()
    if sys.platform not in ('win32','darwin'):
        parser.error('Build on Windows or macOS, not by cross compilation.')
    prepare()
    target='windows-x64' if sys.platform=='win32' else 'macos-'+('arm64' if platform.machine()=='arm64' else 'x64')
    if sys.platform=='win32' and platform.machine().lower() not in ('amd64','x86_64'):
        parser.error('This preview requires an x64 Windows build runner.')
    out=ROOT/'dist'/target
    out.mkdir(parents=True,exist_ok=True)
    args_build=[sys.executable,'-m','PyInstaller','--noconfirm','--clean','--windowed','--onedir',
        '--name','NoteBuddy','--distpath',str(out),'--workpath',str(ROOT/'build'/target),
        '--specpath',str(ROOT/'build'),'--paths',str(ROOT),
        '--collect-all','webview','--collect-all','executa_sdk',
        '--paths',str(ROOT/'anna/executas/notebuddy'),
        '--paths',str(ROOT/'anna/executas/notebuddy/game_core/engine'),
        '--add-data',str(ROOT/'build/desktop-ui')+':build/desktop-ui',
        '--add-data',str(ROOT/'anna/executas/notebuddy/game_core')+':game_core',
        '--add-data',str(ROOT/'LICENSE')+':licenses',
        '--add-data',str(ROOT/'desktop/THIRD_PARTY_NOTICES.md')+':licenses',
        '--exclude-module','PyQt5','--exclude-module','PyQt6','--exclude-module','PySide2',
        '--exclude-module','PySide6','--exclude-module','gi']
    # Preserve dependency license texts as part of each standalone distribution.
    notices=ROOT/'build'/'dependency-licenses'
    notices.mkdir(parents=True,exist_ok=True)
    versions=[]
    for dist in distributions():
        name=dist.metadata['Name']
        versions.append({'name':name,'version':dist.version})
        for file in dist.files or []:
            if any(word in file.name.lower() for word in ('license','copying','notice')):
                source=Path(dist.locate_file(file))
                if source.is_file():
                    dest=notices/name/str(file).replace('/','_').replace('\\','_')
                    dest.parent.mkdir(parents=True,exist_ok=True)
                    shutil.copyfile(source,dest)
    (notices/'DEPENDENCIES.json').write_text(json.dumps(versions,indent=2),encoding='utf-8')
    for source in (ROOT/'desktop/licenses').glob('*.txt'):
        shutil.copyfile(source,notices/source.name)
    args_build+=['--add-data',str(notices)+':licenses/dependencies']
    if sys.platform=='win32':args_build+=['--icon',str(ROOT/'desktop/icon.ico')]
    else:
        iconset=ROOT/'build/NoteBuddy.iconset'
        iconset.mkdir(parents=True,exist_ok=True)
        for size in (16,32,128,256,512):
            for scale in (1,2):
                name=f'icon_{size}x{size}'+('@2x' if scale==2 else '')+'.png'
                run('sips','-z',size*scale,size*scale,ROOT/'desktop/icon.png','--out',iconset/name)
        run('iconutil','-c','icns',iconset,'-o',ROOT/'build/NoteBuddy.icns')
        args_build+=['--osx-bundle-identifier','io.github.kdkrkwhr.notebuddy.desktop','--target-architecture',platform.machine(),'--icon',str(ROOT/'build/NoteBuddy.icns')]
    for module in ['engine','art','game_api','ports','runtime','domain','repositories','local_runtime','dungeons','collectibles','journeys','personality','home','home_world','evolution','localization_data']:
        args_build+=['--hidden-import',module]
    run(*args_build,ROOT/'desktop/entry.py')
    if sys.platform=='darwin':
        info=out/'NoteBuddy.app/Contents/Info.plist'
        data=plistlib.loads(info.read_bytes())
        data.update(CFBundleDisplayName='NoteBuddy',CFBundleShortVersionString='0.1.0',CFBundleVersion='1002',LSMinimumSystemVersion='15.0')
        info.write_bytes(plistlib.dumps(data))
        run('codesign','--force','--deep','--sign','-',out/'NoteBuddy.app')
        run('codesign','--verify','--deep','--strict',out/'NoteBuddy.app')
    if args.app_only:return
    if sys.platform=='win32':
        compiler=shutil.which('ISCC') or next((str(p) for p in [Path('C:/Program Files (x86)/Inno Setup 6/ISCC.exe'),Path('C:/Program Files/Inno Setup 6/ISCC.exe')] if p.is_file()),None)
        if not compiler:raise RuntimeError('Inno Setup 6 is required to create the Windows installer.')
        run(compiler,'/DAppVersion='+__version__,'/DBundleDir='+str(out/'NoteBuddy'),'/DOutputDir='+str(out),ROOT/'desktop/windows.iss')
    else:
        stage=ROOT/'build'/('dmg-'+target)
        stage.mkdir(parents=True,exist_ok=True)
        # ditto preserves the app bundle's symlinks and ad-hoc signatures.
        run('ditto',out/'NoteBuddy.app',stage/'NoteBuddy.app')
        applications=stage/'Applications'
        if not applications.is_symlink():applications.symlink_to('/Applications')
        run('hdiutil','create','-volname','NoteBuddy','-srcfolder',stage,'-ov','-format','UDZO',out/f'NoteBuddy-{__version__}-{target}.dmg')
    files=sorted([*out.glob('*.exe'),*out.glob('*.dmg')])
    (out/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in files),encoding='utf-8')


if __name__=='__main__':main()
