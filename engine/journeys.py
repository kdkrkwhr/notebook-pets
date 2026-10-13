"""Bounded, authoritative memories and continuing walk consequences.

AI writes prose only. Decisions, prerequisites and rewards survive without AI.
Old saves begin with empty memories; no history is invented or backfilled.
"""
import copy
import re
import uuid

ACTIONS = frozenset(('feed','snack','play','sleep','train','walk','battle','flee',
                     'collect','leave','safe','risk','explore'))
ARCS = ('trail','garden','shelter')

def empty():
    return {'version':1,'counts':{},'recent':[],'routes':[0,0],
            'arc':None,'chapter':0,'last_arc':None,'completed':0,'endings':[], 'current':None}

def memory(st):
    return st.setdefault('journey', empty())

def record(st, action):
    if action not in ACTIONS: return
    m=memory(st)
    m['counts'][action]=min(999999,m['counts'].get(action,0)+1)
    m['recent']=(m['recent']+[action])[-32:]

def context(st):
    m=st.get('journey',empty())
    return copy.deepcopy({k:m[k] for k in ('counts','recent','routes','arc','chapter','completed','endings')})

def validate(st):
    if 'journey' not in st: return
    m=st['journey']
    def require(ok):
        if not ok: raise ValueError('Invalid journey memory')
    require(isinstance(m,dict) and set(m)==set(empty()) and m['version']==1)
    require(isinstance(m['counts'],dict) and set(m['counts'])<=ACTIONS)
    require(all(type(x) is int and 0<=x<=999999 for x in m['counts'].values()))
    require(isinstance(m['recent'],list) and len(m['recent'])<=32 and all(x in ACTIONS for x in m['recent']))
    require(isinstance(m['routes'],list) and len(m['routes'])==2 and all(type(x) is int and 0<=x<=100 for x in m['routes']))
    require(m['arc'] in (None,*ARCS) and m['last_arc'] in (None,*ARCS))
    require(type(m['chapter']) is int and 0<=m['chapter']<=2)
    require(type(m['completed']) is int and 0<=m['completed']<=999999)
    require(isinstance(m['endings'],list) and len(m['endings'])<=6)
    for e in m['endings']:
        require(set(e)=={'arc','choice','prepared'} and e['arc'] in ARCS and type(e['choice']) is int and e['choice'] in (0,1) and type(e['prepared']) is bool)
    c=m['current']
    if c is None: return
    require(isinstance(c,dict) and set(c)=={'choice_id','arc','chapter','prepared','basis','previous_choice','state','choice','coins','intimacy'})
    require(isinstance(c['choice_id'],str) and re.fullmatch('[a-f0-9]{32}',c['choice_id']) is not None)
    require(c['arc'] in ARCS and type(c['chapter']) is int and 0<=c['chapter']<=2)
    require(type(c['prepared']) is bool and isinstance(c['basis'],list) and len(c['basis'])<=32 and all(x in ACTIONS for x in c['basis']))
    require(c['previous_choice'] is None or type(c['previous_choice']) is int and c['previous_choice'] in (0,1))
    require(c['state'] in ('pending','done'))
    require(c['choice'] is None if c['state']=='pending' else type(c['choice']) is int and c['choice'] in (0,1))
    require(type(c['coins']) is int and c['coins'] in (0,2,4,6))
    require(type(c['intimacy']) is int and 0<=c['intimacy']<=3)
    if c['state']=='pending': require(c['coins']==0 and c['intimacy']==0)

def pending(st):
    c=st.get('journey',{}).get('current')
    return c is not None and c['state']=='pending'

def begin(st):
    m=memory(st)
    recent=m['recent']
    if m['arc'] is None:
        scores={'trail':recent.count('train')*2+recent.count('battle')+recent.count('risk')+recent.count('collect')+m['routes'][0],
                'garden':recent.count('feed')+recent.count('snack')+recent.count('play')+m['routes'][1],
                'shelter':recent.count('sleep')*2+recent.count('flee')+recent.count('leave')}
        # A completed chain gives way to another one, without erasing tendencies.
        candidates=[a for a in ARCS if a!=m['last_arc']]
        m['arc']=max(candidates,key=lambda a:scores[a])
    arc=m['arc']; previous=m['current']
    required={'trail':('train','feed'),'garden':('play','snack'),'shelter':('sleep','feed')}[arc]
    supported=bool(m['chapter'] and previous and previous['arc']==arc and previous['choice']==1)
    prepared=all(a in recent for a in required) or supported and any(a in recent for a in required)
    m['current']={'choice_id':uuid.uuid4().hex,'arc':arc,'chapter':m['chapter'],
        'prepared':prepared,'basis':recent[-12:],'previous_choice':previous['choice'] if previous and previous['arc']==arc and m['chapter'] else None,
        'state':'pending','choice':None,'coins':0,'intimacy':0}
    return copy.deepcopy(m['current'])

def resolve(st, token, index):
    m=memory(st); c=m['current']
    if not c or c['choice_id']!=token: return None
    if c['state']=='done': return copy.deepcopy(c)
    # The offered outcome is fixed when the event starts, not when clicked.
    c['state']='done'; c['choice']=index
    gain=3 if index==1 or c['prepared'] else 1
    c['intimacy']=min(100,st['intimacy']+gain)-st['intimacy']
    st['intimacy']+=c['intimacy']
    if c['chapter']==2:
        c['coins']=6 if index==0 and c['prepared'] else 4 if index==1 else 2
        st['coins']=st.get('coins',0)+c['coins']
        m['completed']=min(999999,m['completed']+1)
        m['endings']=(m['endings']+[{'arc':c['arc'],'choice':index,'prepared':c['prepared']}])[-6:]
        m['last_arc']=m['arc']; m['arc']=None; m['chapter']=0
    else: m['chapter']+=1
    m['routes'][index]=min(100,m['routes'][index]+1)
    record(st,'risk' if index==0 else 'safe')
    return copy.deepcopy(c)
