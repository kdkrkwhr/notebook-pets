"""Package the shared game and Python rules for offline Android WebView use."""
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'android/app/build/generated/gameAssets/game'
# Only this generated directory is replaced; never touch runtime/user files.
if OUT.exists():
    shutil.rmtree(OUT)
subprocess.run([sys.executable, str(ROOT / 'web/build.py'), '--app-only', '--out', str(OUT)], check=True)
for file in (ROOT / 'android/game').iterdir():
    if file.is_file():
        shutil.copyfile(file, OUT / file.name)
notices = ['NoteBuddy Android third-party software\n\n'
           'Pyodide 314.0.7 (MPL-2.0), unmodified runtime. Source: https://github.com/pyodide/pyodide/tree/314.0.7\n'
           'CPython 3.14.2, as distributed by Pyodide. Source: https://github.com/python/cpython/tree/v3.14.2\n'
           'LiteRT-LM 0.18.1 (Apache-2.0): https://github.com/google-ai-edge/LiteRT-LM/tree/v0.18.1\n'
           'AndroidX / Kotlin / Gson (Apache-2.0), versions in android/app/build.gradle.kts.\n'
           'NoteBuddy source (MIT): https://github.com/kdkrkwhr/notebook-pets/tree/release-android\n']
for file in sorted((ROOT / 'android/licenses').glob('*.txt')):
    notices.append(file.name + '\n' + file.read_text(encoding='utf-8'))
notices.append((OUT / 'THIRD_PARTY_NOTICES.txt').read_text(encoding='utf-8'))
notices.append((ROOT / 'LICENSE').read_text(encoding='utf-8'))
(OUT / 'android-notices.txt').write_text('\n\n'.join(notices), encoding='utf-8')

html = (OUT / 'index.html').read_text(encoding='utf-8')
def replace(old, new):
    global html
    if html.count(old) != 1:
        raise RuntimeError(f'Shared UI anchor changed: {old[:70]}')
    html = html.replace(old, new)

replace('content="width=device-width,initial-scale=1"', 'content="width=device-width,initial-scale=1,viewport-fit=cover"')
replace('</head>', '<link rel="stylesheet" href="./mobile.css"></head>')
replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' blob: data:; connect-src \'self\' blob: data:; worker-src \'self\' blob:; object-src \'none\'; frame-src \'none\'; base-uri \'none\'; form-action \'none\'">')
replace('<body data-web-version="0.7.1">', '<body data-android-version="0.2.1-alpha">')
html = re.sub(r'<script type="module" src="\./app.js[^\"]*"></script>', '<script type="module" src="./native-entry.js"></script>', html)
html = re.sub(r'<a class="architecture-link"[^>]*>.*?</a>', '', html)
html = re.sub(r'<dialog id="settings-dialog"[\s\S]*?</dialog>', (ROOT / 'android/game/settings.html').read_text(encoding='utf-8'), html)
anna = (ROOT / 'anna/bundle/index.html').read_text(encoding='utf-8')
editor = re.search(r'<dialog id="art-dialog"[\s\S]*?</dialog>', anna).group()
replace('<form id="birth">', '<div class="birth-art"><button id="choose-art" class="quiet" type="button">그림 그리기 · 사진 고르기</button><button id="import-lab-photo" class="quiet" type="button" hidden>이전 사진 가져오기</button><p id="birth-art-status" class="muted small">그림이나 사진을 직접 골라 주세요. 원본 모습 그대로 친구가 돼요.</p></div><form id="birth">')
replace('<img src="./assets/starters-v1/fairy_nature_stage1.png" alt="공책에서 만날 작은 요정 친구">', '<img id="birth-preview" class="art-source-preview" src="./assets/starters-v1/fairy_nature_stage1.png" alt="선택한 친구 그림">')
replace('9가지 종족과 8가지 속성 중 한 친구가 평생의 동반자가 돼요. 이름을 지어 주고 함께 첫 페이지를 열어 보세요.', '내가 그린 그림이나 좋아하는 사진을 골라 주세요. 그 모습 그대로, 우리만의 이야기가 시작돼요.')
replace('한 번 만난 친구의 종족과 속성은 다시 뽑을 수 없어요.', '친구의 종족과 속성은 첫 만남에 정해져요.')
replace('maxlength="2000"', 'maxlength="500"')
replace('게임은 이 브라우저에만 저장돼요. 브라우저 데이터를 삭제하기 전에 공책을 내려받아 주세요.', '게임·그림·대화는 이 앱 안에 저장돼요. 앱 삭제나 데이터 삭제 전에 공책을 파일로 백업해 주세요. 업데이트 설치는 저장을 유지해요.')
replace('이름과 레벨을 확인한 뒤 현재 공책을 교체해요. 다른 기기와 자동 동기화되지 않으며, 대화는 현재 탭에서만 보여요.', '이름과 레벨을 확인한 뒤 현재 공책을 교체해요. 그림과 저장된 대화도 함께 옮겨요. 다른 기기와 자동 동기화되지 않아요.')
replace('새 그림 저장은 AI를 사용하지 않아요. 마이홈 첫 접속에서 AI 픽셀 캐릭터 또는 무료 기본 이미지를 선택해요. Gemini는 Google로, ComfyUI는 이 PC로 참고 그림을 보내요.', '새 그림 저장은 AI를 사용하지 않아요. 마이홈에서는 저장한 그림을 무료 기본 픽셀 모습으로 사용해요. 사진을 외부 서버로 보내지 않아요.')
replace('이 브라우저의 현재 친구와 성장 기록, 재화, 아이템이 모두 지워져요. 현재 탭의 대화와 입력한 API 키도 지워져요.', '이 앱의 현재 친구와 성장 기록, 재화, 아이템, 그림과 대화가 모두 지워져요. 다운로드한 모델과 검증판 원본 사진은 유지돼요.')
replace('게임 엔진을 준비하고 있습니다…', '공책을 펼치고 있어요…')
replace('</body>', editor + '</body>')
(OUT / 'index.html').write_text(html, encoding='utf-8')
# Android copy stays close to the game; technical explanations live in Settings.
# These are presentation strings only, never a second gameplay implementation.
copy_overrides = {
    'app.js': {
        '공책이 준비되었습니다. AI 없이도 플레이할 수 있습니다.': '오늘도 친구와 함께해요.',
        'AI 반응을 받지 못했으며 자동으로 다시 요청하지 않아요.': '친구의 답장을 받지 못했어요.',
        '그림을 저장했어요. 마이홈에서 AI 픽셀 캐릭터 또는 무료 기본 이미지를 선택해 주세요.': '그림을 저장했어요. 집에서 새로운 모습을 만나 보세요.',
    },
    'home.mjs': {
        '현재 그림을 무료 기본 픽셀 모습으로 저장해요. 이 기기에서는 새 그림이나 방향별 동작을 생성하지 않아요.': '친구의 그림을 작은 픽셀 모습으로 바꿔 집에 데려와요.',
        '기본 이미지 사용 · 무료': '이 모습으로 들어가기',
        '기본 이미지를 설정했어요. AI를 사용하지 않았어요.': '친구가 집에 도착했어요.',
        '구매한 가구는 보관함에 들어가요. ‘꾸며 줘’를 눌러야 친구가 배치를 고르며, 구매만으로 AI를 호출하지 않아요.': '가구는 보관함에 들어가요. ‘꾸며 줘’를 누르면 친구가 어울리는 자리를 골라요.',
    },
}
for name, phrases in copy_overrides.items():
    file = OUT / name
    content = file.read_text(encoding='utf-8')
    for old, new in phrases.items():
        if old not in content:
            raise RuntimeError(f'Android copy anchor changed in {name}: {old}')
        content = content.replace(old, new)
    file.write_text(content, encoding='utf-8')
# Providers unavailable in this package have no transport implementation.
print(f'Android offline game: {sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file()) / 1024**2:.1f} MiB')
