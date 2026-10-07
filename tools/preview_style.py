"""Local ComfyUI plant style experiment; does not change game rendering defaults."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import shutil
import sys
import time
from urllib.parse import quote, urlencode
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'engine'))
import art
from comfy_images import ComfyUIProvider, build_workflow
from image_service import atomic_png

STYLE = ('(one cute leaf kitten creature:1.25), round friendly face, two huge glossy emerald eyes, leaf shaped ears, '
         'cream muzzle, tiny pink mouth, soft lime green body, forehead leaf marking, curled vine tail, '
         '(soft watercolor game character illustration:1.2), delicate warm outlines, painterly shading, '
         'pastel colors, subtle paper texture, full body centered, white background, no text')
GROWTH = {
    'stage2': 'slightly taller plump body, short rounded paws, a fuller collar of small leaves, three leaves on head',
    'stage3': '(flower buds growing in leafy mane:1.35), (larger round body with sturdy short legs:1.25), lush layered leaf collar, preserve cute oversized head',
    'stage4_light': '(golden flowers blooming in a crown around head:1.5), (golden flower petals in lush leaf mane:1.4), fully evolved friendly forest pet, larger rounded body, warm golden highlights',
    'stage4_dark': '(violet flowers blooming in a crown around head:1.5), (purple flower petals in lush leaf mane:1.4), fully evolved friendly forest pet, larger rounded body, keep cream face and green eyes',
}
NEGATIVE = ('photograph, realistic, 3d render, hard vector shading, thick black outlines, lion, tiger, human, '
            'anthropomorphic, scary, sharp teeth, extra legs, extra tail, extra ears, multiple creatures, cropped, '
            'text, watermark, logo, blurry, low quality')

def graph(provider, source, anchor, key, weight, denoise, seed):
    prompt = GROWTH[key] + ', ' + STYLE
    wf = build_workflow(prompt, seed, reference_name=provider.upload(source),
                        checkpoint='DreamShaper_8_pruned.safetensors', denoise=denoise, stage=3, species='plant')['prompt']
    wf['7']['inputs']['text'] = NEGATIVE
    wf['3']['inputs'].update(steps=32, cfg=5.5)
    if weight:
        wf['20'] = {'class_type':'LoadImage','inputs':{'image':provider.upload(anchor)}}
        wf['21'] = {'class_type':'CLIPVisionLoader','inputs':{'clip_name':'CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors'}}
        wf['22'] = {'class_type':'IPAdapterModelLoader','inputs':{'ipadapter_file':'ip-adapter-plus_sd15.safetensors'}}
        wf['23'] = {'class_type':'IPAdapterAdvanced','inputs':{
            'model':['4',0], 'ipadapter':['22',0], 'image':['20',0], 'clip_vision':['21',0],
            'weight':weight, 'weight_type':'linear', 'combine_embeds':'concat', 'start_at':0.0,
            'end_at':1.0, 'embeds_scaling':'V only'}}
        wf['3']['inputs']['model'] = ['23',0]
    return wf

def generate(provider, folder, name, source, anchor, key, weight, denoise, seed):
    wf = graph(provider, source, anchor, key, weight, denoise, seed)
    fingerprint = hashlib.sha256(json.dumps(wf, sort_keys=True).encode()).hexdigest()
    out = folder / (name + '.png')
    metadata = out.with_suffix('.json')
    record = json.loads(metadata.read_text()) if metadata.exists() else {}
    if record.get('fingerprint') == fingerprint and out.exists(): return out
    if record.get('fingerprint') != fingerprint or record.get('failed'):
        reply = provider._http('/prompt', json.dumps({'prompt':wf}).encode(), 'application/json')
        if reply.get('node_errors') or not reply.get('prompt_id'): raise RuntimeError(reply)
        record = dict(fingerprint=fingerprint, prompt_id=reply['prompt_id'], workflow=wf,
                      source=source.name, anchor=anchor.name,
                      source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                      anchor_sha256=hashlib.sha256(anchor.read_bytes()).hexdigest(),
                      weight=weight, denoise=denoise, seed=seed)
        metadata.write_text(json.dumps(record, indent=2), encoding='utf-8')
    deadline = time.monotonic() + 300
    while time.monotonic() < deadline:
        entry = provider._http('/history/' + quote(record['prompt_id'])).get(record['prompt_id'], {})
        if entry.get('status',{}).get('status_str') == 'error':
            record['failed'] = True
            metadata.write_text(json.dumps(record, indent=2), encoding='utf-8')
            raise RuntimeError(entry['status'])
        outputs = entry.get('outputs',{}).get('9',{}).get('images',[])
        if outputs:
            data = provider._http('/view?' + urlencode(outputs[0]), binary=True)
            atomic_png(out, data)
            record['sha256'] = hashlib.sha256(data).hexdigest()
            metadata.write_text(json.dumps(record, indent=2), encoding='utf-8')
            print(json.dumps({'file':out.name,'weight':weight,'denoise':denoise}), flush=True)
            return out
        time.sleep(1)
    raise TimeoutError('Job saved; rerun to resume')

def gallery(folder):
    sections = []
    groups = [('선택한 후보 · 원본 → 성장 → 성숙 → 빛 / 어둠', ['original_stage1', 'sequence_stage2', 'sequence_stage3', 'sequence_stage4_light', 'sequence_stage4_dark']),
              ('이전 결과 · 비교 기준', ['original_stage1', 'previous_stage2', 'previous_stage3', 'previous_stage4_light', 'previous_stage4_dark']),
              ('같은 프롬프트·시드 · IP-Adapter 강도 비교', ['original_stage1', 'compare_weight0', 'compare_weight0.65', 'compare_weight0.9'])]
    labels = {'original_stage1':'1단계 · 기존 원본', 'stage2':'2단계 · 성장', 'stage3':'3단계 · 성숙', 'stage4_light':'4단계 · 빛', 'stage4_dark':'4단계 · 어둠'}
    for title, names in groups:
        cards=[]
        for name in names:
            path=folder/(name+'.png')
            if not path.exists(): continue
            label=labels.get(name, labels.get(name.removeprefix('sequence_').removeprefix('previous_'), name.replace('compare_weight','참조 강도 ')))
            meta=path.with_suffix('.json')
            detail=''
            if meta.exists():
                record=json.loads(meta.read_text())
                detail=f'<small>참조 {record["weight"]} · 변형 {record["denoise"]} · seed {record["seed"]}</small>'
            cards.append(f'<figure><a href="{path.name}"><img src="{path.name}" alt="{html.escape(label)}"></a><figcaption>{html.escape(label)}{detail}</figcaption></figure>')
        if cards: sections.append(f'<h2>{title}</h2><div class="grid">'+''.join(cards)+'</div>')
    page = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Notebook Pets · 그림체 비교</title>
<style>body{font:16px system-ui;background:#f3f5ef;color:#203328;margin:30px}h1{font-size:28px}h2{font-size:20px;margin-top:36px}p{line-height:1.8;max-width:960px}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}figure{margin:0;background:white;border-radius:16px;overflow:hidden}img{width:100%;aspect-ratio:1;object-fit:contain}figcaption{padding:14px;overflow-wrap:anywhere}small{display:block;color:#68746d;margin-top:8px;font-size:12px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}a{color:inherit}</style>
<h1>식물 펫 · 원본 그림체 유지 실험</h1><p>모든 진화 단계에서 1단계 원본을 공통 참조하고, 직전 단계 이미지를 변형합니다. 최종 두 분기는 같은 3단계에서 출발합니다. 모든 새 이미지는 로컬 ComfyUI에서 생성했습니다. 이미지를 누르면 원본 크기로 볼 수 있습니다.</p><p><strong>검토 기준:</strong> 같은 펫으로 보이는지, 채색과 눈 모양이 이어지는지, 성장과 두 분기가 구분되는지 확인해 주세요. 이 페이지는 후보 비교이며 게임 기본 생성 설정은 아직 변경하지 않았습니다.</p>'''
    (folder/'index.html').write_text(page + ''.join(sections) + '</html>', encoding='utf-8')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='assets/style_review')
    parser.add_argument('--mode', choices=['compare','sequence','gallery'], default='compare')
    parser.add_argument('--weight', type=float, default=.6)
    parser.add_argument('--denoise', type=float, default=.62)
    args=parser.parse_args()
    if not 0 <= args.weight <= 2 or not 0 < args.denoise <= 1: parser.error('Invalid strength')
    folder=(art.ROOT/args.output).resolve()
    if not folder.is_relative_to((art.ROOT/'assets').resolve()): parser.error('Output must be inside assets')
    folder.mkdir(parents=True, exist_ok=True)
    anchor=folder/'original_stage1.png'
    shutil.copyfile(art.ROOT/'assets/examples/plant_nature_stage1.png',anchor)
    for stage in ['stage2','stage3','stage4_light','stage4_dark']:
        baseline=art.ROOT/'assets/evolution_review'/('plant_nature_'+stage+'.png')
        if baseline.exists(): shutil.copyfile(baseline,folder/('previous_'+stage+'.png'))
    provider=ComfyUIProvider(timeout=300)
    if args.mode=='compare':
        for weight in [0,.65,.9]:
            generate(provider,folder,f'compare_weight{weight}',anchor,anchor,'stage2',weight,args.denoise,42102)
    elif args.mode=='sequence':
        previous=anchor
        for i,key in enumerate(GROWTH):
            result=generate(provider,folder,'sequence_'+key,previous,anchor,key,args.weight,args.denoise,42102+i)
            if key in ('stage2','stage3'): previous=result
    gallery(folder)

if __name__=='__main__': main()
