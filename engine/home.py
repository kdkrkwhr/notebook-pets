"""Portable home rules. LLM chooses a validated candidate, never money/coordinates."""
import copy
import hashlib
import json
from collections import deque

WIDTH, HEIGHT = 10, 8
DOOR = (4, 6)
def item(name,en,price,size,layer='floor',tags=()):
    return dict(name=name,en=en,price=price,size=list(size),layer=layer,tags=list(tags))
CATALOG = {
 'nest':item('휴식 둥지','Resting nest',0,(2,2),tags=('rest','warmth')),
 'bookshelf':item('작은 책장','Little bookcase',8,(2,1),tags=('curiosity',)),
 'desk':item('독서 책상','Reading desk',10,(2,1),tags=('curiosity','caution')),
 'lamp':item('독서등','Reading lamp',4,(1,1),'surface',('warmth',)),
 'side-table':item('동그란 탁자','Round table',5,(1,1),tags=('warmth',)),
 'rug':item('별빛 러그','Starlight rug',6,(4,3),'rug',('warmth',)),
 'cushion':item('포근한 쿠션','Soft cushion',3,(1,1),tags=('rest',)),
 'plant':item('초록 화분','Leafy plant',4,(1,1),tags=('curiosity',)),
 'wall-art':item('별자리 그림','Star chart',4,(1,1),'wall',('curiosity',)),
 'curtain':item('햇살 커튼','Sunlit curtains',5,(2,1),'wall',('warmth',)),
 'tea':item('작은 찻잔 세트','Little tea set',3,(1,1),'surface',('warmth',)),
 'basket':item('수납 바구니','Storage basket',3,(1,1),tags=('caution',))}
STYLES = [('reading','독서하기 좋은 방','A reading nook'),('cozy','아늑한 휴식 공간','A cozy retreat'),
          ('open','널찍한 산책 공간','An open living space'),('tidy','차분히 정돈된 방','A tidy room')]
SLOTS = [(0,0),(2,0),(7,3),(0,3),(2,3),(8,4),(0,5),(7,5),(2,5)]

def initial():
    return dict(version=1,revision=0,owned=['nest'],layout={'nest':[7,0]},previous=None,motion=[],reason='')

def state(st):
    return copy.deepcopy(st.get('home',initial()))

def cells(key,position):
    x,y=position;w,h=CATALOG[key]['size']
    return {(a,b) for a in range(x,x+w) for b in range(y,y+h)}

def occupied(layout):
    return set().union(*(cells(k,p) for k,p in layout.items() if CATALOG[k]['layer']=='floor')) if layout else set()

def path(layout,target):
    """2x2 body/carry footprint; a doorway remains an accessible staging point."""
    blocks=occupied(layout)
    def free(p):
        x,y=p
        return 0<=x<=WIDTH-2 and 0<=y<=HEIGHT-2 and not {(x,y),(x+1,y),(x,y+1),(x+1,y+1)}&blocks
    if not free(DOOR):return None
    queue=deque([DOOR]);previous={DOOR:None}
    while queue:
        p=queue.popleft();x,y=p
        # Stand adjacent to, never inside, the target furniture footprint.
        if any(abs(a-c)+abs(b-d)==1 for a,b in ((x,y),(x+1,y),(x,y+1),(x+1,y+1)) for c,d in target):
            result=[]
            while p is not None:result.append(list(p));p=previous[p]
            return result[::-1]
        for q in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if q not in previous and free(q):previous[q]=p;queue.append(q)
    return None

def valid_layout(layout,owned):
    if not isinstance(layout,dict) or not set(layout)<=set(owned) or layout.get('nest')!=[7,0]:return False
    floor=set();walls=set()
    for key,p in layout.items():
        if not isinstance(p,list) or len(p)!=2 or any(type(v) is not int for v in p):return False
        area=cells(key,p)
        if any(x<0 or y<0 or x>=WIDTH or y>=HEIGHT for x,y in area):return False
        layer=CATALOG[key]['layer']
        if layer=='floor':
            if floor&area or any(y>=6 for x,y in area):return False
            floor|=area
        elif layer=='wall':
            if p[1]!=0 or walls&area:return False
            walls|=area
        elif layer=='surface':
            if 'desk' not in layout:return False
            expected=[layout['desk'][0]+(1 if key=='tea' else 0),layout['desk'][1]]
            if p!=expected:return False
    for key,p in layout.items():
        if CATALOG[key]['layer']=='floor' and path(layout,cells(key,p)) is None:return False
    return True

def validate(st):
    if 'home' not in st:return
    h=st['home']
    if (not isinstance(h,dict) or set(h)!=set(initial()) or type(h['version']) is not int or h['version']!=1 or
        type(h['revision']) is not int or not 0<=h['revision']<2**53 or not isinstance(h['owned'],list) or
        any(not isinstance(k,str) or k not in CATALOG for k in h['owned']) or len(h['owned'])!=len(set(h['owned'])) or
        'nest' not in h['owned'] or not valid_layout(h['layout'],h['owned']) or
        (h['previous'] is not None and not valid_layout(h['previous'],h['owned'])) or
        not isinstance(h['reason'],str) or len(h['reason'])>180 or not isinstance(h['motion'],list) or len(h['motion'])>6):
        raise ValueError('Invalid home')
    for step in h['motion']:
        if not isinstance(step,dict) or set(step)!={'item','route','phase'} or step['item'] not in h['owned'] or step['phase'] not in ('store','place') or not isinstance(step['route'],list) or not 1<=len(step['route'])<=80:raise ValueError('Invalid home motion')
        for p in step['route']:
            if not isinstance(p,list) or len(p)!=2 or any(type(v) is not int for v in p) or not 0<=p[0]<=WIDTH-2 or not 0<=p[1]<=HEIGHT-2:raise ValueError('Invalid home route')

def view(st):
    h=state(st)
    return {**h,'pet_id':st.get('pet_id'),'coins':st.get('coins',0),'catalog':[{'id':k,**copy.deepcopy(v)} for k,v in CATALOG.items()],
            'width':WIDTH,'height':HEIGHT,'door':list(DOOR),'roam':path(h['layout'],cells('nest',h['layout']['nest']))}

def motions(old,new):
    moved=[k for k in CATALOG if old.get(k)!=new.get(k)]
    # Surface props follow their supporting desk. They never acquire floor collision.
    steps=[];working=copy.deepcopy(old)
    for k in moved:
        if k in old:
            route=path(working,cells(k,old[k]))
            if route is None:return None
            steps.append(dict(item=k,route=route[::-1],phase='store'))
        working.pop(k,None)
    for k in moved:
        if k not in new:continue
        working[k]=new[k]
        route=path(working,cells(k,new[k]))
        if route is None:return None
        steps.append(dict(item=k,route=route,phase='place'))
    return steps if len(steps)<=6 else None

def candidates(st):
    h=state(st);choices=[];seen=set()
    traits=st.get('personality',{}).get('origin',{}).get('traits',{})
    for index,(style,ko,en) in enumerate(STYLES):
        layout=copy.deepcopy(h['layout']);changes=0
        slots=SLOTS[index:]+SLOTS[:index]
        missing=[k for k in CATALOG if k in h['owned'] and k not in layout]
        for k in missing:
            if changes>=3:break
            layer=CATALOG[k]['layer']
            positions=([[3,3]] if layer=='rug' else [[0,0] if k=='curtain' else [6,0]] if layer=='wall' else
                       [[layout['desk'][0]+(1 if k=='tea' else 0),layout['desk'][1]]] if layer=='surface' and 'desk' in layout else
                       [] if layer=='surface' else [list(p) for p in slots])
            for p in positions:
                proposed={**layout,k:p}
                if valid_layout(proposed,h['owned']):layout=proposed;changes+=1;break
        if not missing:
            # A requested refresh can move one floor object, keeping most of the room familiar.
            options=[k for k in layout if k!='nest' and CATALOG[k]['layer']=='floor' and not (k=='desk' and any(p in layout for p in ('lamp','tea')))]
            if options:
                k=options[index%len(options)]
                for p in slots:
                    if list(p)==layout[k]:continue
                    proposed={**layout,k:list(p)}
                    if valid_layout(proposed,h['owned']):layout=proposed;break
        signature=json.dumps(layout,sort_keys=True)
        if signature in seen or layout==h['layout']:continue
        steps=motions(h['layout'],layout)
        if steps is None:continue
        seen.add(signature)
        basis=json.dumps([st.get('pet_id'),h['revision'],h['owned'],traits,style,layout],sort_keys=True)
        choices.append(dict(id=hashlib.sha256(basis.encode()).hexdigest()[:20],style=style,name=ko,en=en,layout=layout,motion=steps,
                            moved=[k for k in CATALOG if layout.get(k)!=h['layout'].get(k)],stored=[k for k in h['owned'] if k not in layout]))
    return choices

def request(st,command,raw):
    from domain import GameError
    def fail(code,message):raise GameError(code,message)
    try:p=json.loads(raw)
    except (ValueError,TypeError):fail('invalid_arguments','홈 요청을 확인해 주세요.')
    allowed={'pet_id','revision','item_id'} if command=='home_buy' else {'pet_id','revision','candidate_id','reason'} if command=='home_apply' else {'pet_id','revision'}
    if not isinstance(p,dict) or set(p)!=allowed:fail('invalid_arguments','홈 요청을 확인해 주세요.')
    h=state(st)
    if p['pet_id']!=st.get('pet_id') or type(p['revision']) is not int or p['revision']!=h['revision']:fail('home_conflict','방이 바뀌었어요. 확인 후 다시 요청해 주세요.')
    if command=='home_buy':
        k=p['item_id']
        if not isinstance(k,str) or k not in CATALOG or k=='nest':fail('invalid_arguments','구매할 가구를 확인해 주세요.')
        if k in h['owned']:fail('home_owned','이미 가지고 있는 가구예요.')
        price=CATALOG[k]['price']
        if st.get('coins',0)<price:fail('home_coins','코인이 부족해요. 모험에서 코인을 모아 주세요.')
        st['coins']=st.get('coins',0)-price;h['owned'].append(k);h['motion']=[]
    elif command=='home_apply':
        if not isinstance(p['reason'],str) or not 1<=len(p['reason'])<=180 or any(ord(c)<32 for c in p['reason']):fail('invalid_arguments','짧은 꾸미기 설명이 필요해요.')
        chosen=next((c for c in candidates(st) if c['id']==p['candidate_id']),None)
        if chosen is None:fail('home_conflict','배치 후보가 바뀌었어요. 다시 확인해 주세요.')
        h['previous']=copy.deepcopy(h['layout']);h['layout']=chosen['layout'];h['motion']=chosen['motion'];h['reason']=p['reason']
    else:
        if h['previous'] is None:fail('home_no_previous','되돌릴 배치가 없어요.')
        h['layout']=h['previous'];h['previous']=None;h['motion']=[];h['reason']=''
    h['revision']+=1;st['home']=h;validate(st)
    return {'ok':True,'msg':'가구를 보관함에 넣었어요.' if command=='home_buy' else '친구가 고른 배치를 저장했어요.' if command=='home_apply' else '이전 배치로 돌아왔어요.'}
