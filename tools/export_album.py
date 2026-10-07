"""Export one partner's evolution album as a self-contained, offline HTML file."""
import argparse
import base64
import html
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'engine'))
import engine
from image_service import ImageService, validate_png
from runtime import GameError, validate_user_id


def build_html(album, images):
    paths = {item['stage']: Path(item['path']) for item in images}
    cards = []
    for entry in album['entries']:
        stage = entry['stage']
        picture = '<div class="placeholder">아직 만나지 않은 모습</div>'
        if entry['reached']:
            picture = '<div class="placeholder">저장된 그림 없음</div>'
            if stage in paths:
                data = base64.b64encode(validate_png(paths[stage].read_bytes())).decode('ascii')
                picture = f'<img src="data:image/png;base64,{data}" alt="{html.escape(entry["label"], quote=True)}">'
        recorded = entry['achieved_at']
        caption = (recorded[:10] + ' · KST' if recorded else '날짜 기록 없음') if entry['reached'] else f'Lv.{entry["min_level"]}에 만날 모습'
        cards.append(f'<article>{picture}<div class="body"><h2>{html.escape(entry["label"])}'
                     f'{" <small>현재</small>" if entry["current"] else ""}</h2><p>{caption}</p></div></article>')
    name = html.escape(album['name'])
    details = html.escape(f"{album['species']} · {album['element']} · Lv.{album['level']}")
    branch = {'light': '빛의 진화', 'dark': '어둠의 진화'}.get(album['branch'], '')
    return f'''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{name}의 진화 앨범</title><style>
*{{box-sizing:border-box}}body{{margin:0;background:#f6f3ed;color:#26352f;font:16px/1.7 system-ui,sans-serif}}
main{{max-width:1120px;margin:60px auto;padding:0 24px}}header{{margin-bottom:36px}}h1{{font-size:clamp(28px,5vw,46px);line-height:1.3;margin:10px 0}}
.eyebrow{{color:#526c59;letter-spacing:.16em;font-size:12px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:20px}}
article{{background:white;border:1px solid #e1e4da;border-radius:22px;overflow:hidden}}img,.placeholder{{width:100%;aspect-ratio:1;object-fit:contain;background:#fcfcf9}}
.placeholder{{display:grid;place-items:center;color:#7d847b}}.body{{padding:18px}}h2{{font-size:20px;margin:0}}p{{margin:8px 0;color:#657167}}small{{font-size:12px;background:#e0eedc;padding:4px 8px;border-radius:8px}}footer{{margin-top:30px;font-size:13px;color:#7d847b}}
</style><main><header><div class="eyebrow">NOTEBOOK PETS · OUR STORY</div><h1>{name}와 함께한 시간</h1><p>{details} {branch}</p><p>처음 만난 파트너, 함께 자라는 우리만의 기록.</p></header>
<section class="grid">{''.join(cards)}</section><footer>내보낸 시점의 앨범입니다. 날짜가 없는 과거 진화는 추정하지 않습니다. 그림은 이 파트너의 저장된 이미지로만 표시합니다.</footer></main></html>'''


def export(actor, output):
    validate_user_id(actor)
    result = engine.execute(actor, 'album')
    if not result['ok']:
        return result
    service = ImageService()
    request = result['album']['current_image']
    cached = service.album(actor, request)
    if cached['status'] != 'ready':
        raise GameError('stale_album', '파트너 상태가 변경됐습니다. 다시 시도해 주세요.')
    content = build_html(result['album'], cached['images'])
    if not service.current(actor, request):
        raise GameError('stale_album', '파트너 상태가 변경됐습니다. 다시 시도해 주세요.')
    output = Path(output)
    if output.suffix.lower() != '.html':
        raise ValueError('Output must be an HTML file.')
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as stream:
        stream.write(content)
    return {'ok': True, 'path': str(output.resolve()), 'images': len(cached['images'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('user_id')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = export(args.user_id, args.output)
    except (GameError, OSError, ValueError) as exc:
        result = {'ok': False, 'code': getattr(exc, 'code', 'album_export_error'), 'msg': str(exc)}
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
