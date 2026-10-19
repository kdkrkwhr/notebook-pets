"""Explicit, bounded evolution choices. AI selects prose/routes, never game rules."""
import copy
import json
import math
import re
import art
import journeys
from domain import GameError
from ports import ContextMapping, time, uuid

G = ContextMapping('rules')
ROUTES = {
 'keep': ('Grow into your own light', '나답게 더욱 빛나기', 'Preserve the current element and recognizable markings; a more mature, confident silhouette.', '지금 속성과 고유한 무늬를 이어받아 더 성숙하고 자신 있는 모습으로 자라요.'),
 'wind': ('Swift and clear-minded', '바람처럼 신속하고 냉철하게', 'A streamlined silhouette, alert eyes and flowing wind accents.', '날렵한 실루엣과 또렷한 눈매에 바람을 닮은 장식이 더해져요.'),
 'nature': ('A bright, healthy fairy aura', '밝고 건강한 요정의 기운으로', 'Lively natural colors with gentle leaf, flower and fairy-glow accents.', '생기 있는 색감에 잎사귀와 꽃, 은은한 요정의 빛이 어우러져요.'),
 'fire': ('Awaken the inner flame', '내면의 불꽃을 깨우며', 'Warm ember colors, flame-shaped markings and a spirited expression.', '따뜻한 불씨 색감과 불꽃 무늬, 의욕적인 표정이 돋보여요.'),
 'water': ('Calm as a flowing stream', '흐르는 물처럼 차분하게', 'Soft water colors, ripple markings and a composed expression.', '부드러운 물빛과 물결 무늬, 차분한 표정으로 자라요.'),
 'earth': ('A steadfast guardian', '든든한 대지의 수호자로', 'Grounded earth colors and protective stone-like accents, preserving the body.', '안정적인 대지 색감과 돌을 닮은 장식으로 든든함을 더해요.'),
 'thunder': ('A spark of bold curiosity', '호기심을 번개처럼 펼치며', 'Bright spark markings, lively contrast and an inquisitive expression.', '반짝이는 번개 무늬와 선명한 색감, 호기심 어린 표정이 더해져요.'),
 'light': ('A warm guiding light', '따스한 빛을 나누며', 'Gentle luminous highlights and a welcoming, radiant expression.', '은은한 광채와 따뜻하고 밝은 표정으로 주변을 밝혀요.'),
 'dark': ('A quiet, mysterious presence', '고요하고 신비로운 기운으로', 'Deep twilight colors, subtle starry markings and a thoughtful expression.', '깊은 황혼 색감과 은근한 별빛 무늬, 사려 깊은 표정으로 자라요.'),
}


def empty():
    return {'version': 1, 'pending': None, 'records': [], 'memory': '', 'features': ''}


def text(value, limit, allow_empty=False):
    return isinstance(value, str) and (allow_empty or bool(value.strip())) and len(value) <= limit and all(ord(c) >= 32 or c == '\n' for c in value)


def valid_prose(value):
    return (isinstance(value, dict) and set(value) == {'title','reason','appearance','language'}
            and value['language'] in ('ko','en','ja','zh-Hans','zh-Hant') and text(value['title'],60)
            and text(value['reason'],160) and text(value['appearance'],240))


def validate(st):
    value = st.get('evolution')
    if value is None: return
    def require(ok):
        if not ok: raise ValueError('Invalid evolution record')
    require(isinstance(value, dict) and set(value) == set(empty()) and type(value['version']) is int and value['version'] == 1)
    require(text(value['memory'],600,True) and text(value['features'],1200,True) and isinstance(value['records'],list) and len(value['records']) <= 3)
    stages = []
    for record in value['records']:
        require(isinstance(record,dict) and set(record) == {'id','stage','from_element','element','route_id','prose','at'})
        require(isinstance(record['id'],str) and re.fullmatch('[a-f0-9]{32}',record['id']) is not None)
        require(type(record['stage']) is int and 2 <= record['stage'] <= st['stage'])
        require(record['from_element'] in G['elements'] and record['element'] in G['elements'] and record['route_id'] in ROUTES)
        require(record['element'] == (record['from_element'] if record['route_id']=='keep' else record['route_id']))
        require(record['prose'] is None or valid_prose(record['prose']))
        require(type(record['at']) in (int,float) and math.isfinite(record['at']) and record['at'] >= 0)
        stages.append(record['stage'])
    require(stages == sorted(set(stages)))
    p = value['pending']
    if p is None: return
    require(isinstance(p,dict) and set(p) == {'id','stage','element','ids','prose','phase','basis'})
    require(isinstance(p['id'],str) and re.fullmatch('[a-f0-9]{32}',p['id']) is not None)
    require(type(p['stage']) is int and p['stage'] == st['stage']+1 and p['stage'] <= 4 and p['element']==st['element'])
    require(isinstance(p['ids'],list) and len(p['ids'])==len(set(p['ids']))==3 and p['ids'][0]=='keep')
    require(all(isinstance(r,str) and r in ROUTES and r != p['element'] for r in p['ids']))
    require(p['phase'] in ('reserved','ready') and isinstance(p['prose'],dict) and set(p['prose']) <= set(p['ids']))
    require(all(valid_prose(v) for v in p['prose'].values()))
    require(isinstance(p['basis'],dict) and set(p['basis']) <= journeys.ACTIONS|{'completed'})
    require(all(type(v) is int and 0 <= v <= 999999 for v in p['basis'].values()))


def progress(st):
    next_stage = st['stage']+1
    if next_stage > 4: return {'next_stage':None,'ready':False,'requirements':[],'blocked':False}
    counts = st.get('journey',{}).get('counts',{})
    values = {'level':st['level'],'care':sum(counts.get(k,0) for k in ('feed','snack','play','sleep')),
              'train':counts.get('train',0),'walk':counts.get('walk',0),'stories':st.get('journey',{}).get('completed',0)}
    requirements = [{'key':key,'current':values[key],'target':target,'complete':values[key]>=target}
                    for key,target in G['evolution_requirements'][str(next_stage)].items()]
    # Finish an already paid/selected encounter before changing elemental matchups.
    expedition=st.get('dungeons',{}).get('expedition',{})
    blocked = bool(st.get('_wild') or st.get('_walk_choice') or journeys.pending(st) or expedition.get('phase')=='choice')
    return {'next_stage':next_stage,'ready':all(r['complete'] for r in requirements),'requirements':requirements,'blocked':blocked}


def catalog(st):
    return [{'id':key,'element':st['element'] if key=='keep' else key,
             'title':{'en':data[0],'ko':data[1]},'appearance':{'en':data[2],'ko':data[3]}}
            for key,data in ROUTES.items() if key != st['element']]


def view(st):
    saved=st.get('evolution',empty()); p=saved['pending']
    pool=catalog(st)
    return {**progress(st),'pending':copy.deepcopy(p),'catalog':pool,
            'records':copy.deepcopy(saved['records']),'memory':saved['memory'],'features':saved['features']}


def default_ids(st):
    c=st.get('journey',{}).get('counts',{})
    score={
        'wind':c.get('train',0)+c.get('walk',0), 'nature':c.get('feed',0)+c.get('play',0)+c.get('snack',0),
        'fire':c.get('battle',0)*2+c.get('risk',0)*3+c.get('train',0),
        'water':c.get('sleep',0)*2+c.get('leave',0)+c.get('safe',0),
        'earth':c.get('feed',0)+c.get('safe',0)*2+c.get('train',0),
        'thunder':c.get('collect',0)*2+c.get('explore',0)+c.get('play',0),
        'light':c.get('play',0)+c.get('snack',0)+c.get('safe',0)*2,
        'dark':c.get('sleep',0)+c.get('leave',0)*2+c.get('walk',0)}
    return ['keep',*sorted((k for k in score if k != st['element']),key=lambda k:(-score[k],k))[:2]]


def request(st,command,raw):
    try: payload=json.loads(raw)
    except (ValueError,TypeError) as e: raise GameError('invalid_evolution','진화 정보를 확인해 주세요.') from e
    if not isinstance(payload,dict) or payload.get('pet_id')!=art.pet_identity(st):
        raise GameError('evolution_changed','친구가 바뀌었어요. 다시 확인해 주세요.')
    state=st.setdefault('evolution',empty())
    status=progress(st)
    if command=='evolution_prepare':
        if set(payload)!={'pet_id','stage'} or type(payload.get('stage')) is not int or payload['stage']!=st['stage']:
            raise GameError('evolution_changed','성장 단계가 바뀌었어요. 다시 확인해 주세요.')
        if not status['ready']: raise GameError('evolution_unready','아직 진화 조건을 모두 채우지 못했어요.')
        if status['blocked']: raise GameError('evolution_busy','진행 중인 산책이나 탐험 선택을 먼저 마쳐 주세요.')
        if state['pending']: return {'ok':True,'msg':'저장된 진화 방향을 불러왔어요.','evolution_reserved':False}
        state['features']=''
        state['pending']={'id':uuid.uuid4().hex,'stage':st['stage']+1,'element':st['element'],'ids':default_ids(st),'prose':{},'phase':'reserved',
                          'basis':{**st.get('journey',{}).get('counts',{}),'completed':st.get('journey',{}).get('completed',0)}}
        return {'ok':True,'msg':'세 가지 진화 방향을 준비했어요.','evolution_reserved':True}
    p=state['pending']
    if not p or payload.get('choice_id')!=p['id']:
        raise GameError('evolution_changed','이 진화 선택은 더 이상 유효하지 않아요.')
    if command=='evolution_options':
        if set(payload)!={'pet_id','choice_id','options','memory','features','language'} or p['phase']!='reserved':
            raise GameError('evolution_changed','진화 방향이 이미 저장되었어요.')
        options=payload['options']; ids=[o.get('route_id') if isinstance(o,dict) else None for o in options] if isinstance(options,list) else []
        allowed={r['id'] for r in catalog(st)}
        if (len(ids)!=3 or any(not isinstance(i,str) for i in ids) or len(set(ids))!=3 or ids[0]!='keep' or not set(ids)<=allowed
            or not text(payload['memory'],600,True) or not text(payload['features'],1200) or payload['language'] not in ('ko','en','ja','zh-Hans','zh-Hant')):
            raise GameError('invalid_evolution','세 가지 진화 방향을 확인해 주세요.')
        prose={}
        for o in options:
            if set(o)!={'route_id','title','reason','appearance'}: raise GameError('invalid_evolution','진화 설명을 확인해 주세요.')
            item={k:o[k] for k in ('title','reason','appearance')}; item['language']=payload['language']
            if not valid_prose(item): raise GameError('invalid_evolution','진화 설명을 확인해 주세요.')
            prose[o['route_id']]=item
        p.update(ids=ids,prose=prose,phase='ready'); state['memory']=payload['memory']; state['features']=payload['features']
        return {'ok':True,'msg':'함께한 기록을 진화 방향에 담았어요.'}
    if command!='evolve' or set(payload)!={'pet_id','choice_id','route_id'} or payload.get('route_id') not in p['ids']:
        raise GameError('invalid_evolution','화면에 표시된 진화 방향을 골라 주세요.')
    if not status['ready']: raise GameError('evolution_unready','아직 진화 조건을 모두 채우지 못했어요.')
    if status['blocked']: raise GameError('evolution_busy','진행 중인 산책이나 탐험 선택을 먼저 마쳐 주세요.')
    route=payload['route_id']; old_element=st['element']
    st['stage']=p['stage']; st['element']=old_element if route=='keep' else route
    # Legacy light/dark endings remain intact; new endings are the user's route.
    st['evolution_branch']=None
    record={'id':p['id'],'stage':st['stage'],'from_element':old_element,'element':st['element'],
            'route_id':route,'prose':p['prose'].get(route),'at':time.time()}
    state['records'].append(record); state['pending']=None
    st['history'].append({'event':'evolved','ts':record['at'],'stage':st['stage'],'level':st['level'],
                          'branch':None,'from_element':old_element,'element':st['element'],'route_id':route})
    return {'ok':True,'msg':'선택한 방향으로 진화했어요!','evolved':copy.deepcopy(record),'image':art.describe(st)}
