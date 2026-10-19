"""One stored fictional identity; gradual experience changes never grant stats."""
import copy
import json

AXES=('curiosity','warmth','energy','caution')
INFLUENCES={
 'curiosity':(('walk','train','collect','risk'),('leave',)),
 'warmth':(('feed','snack','play','safe'),('flee',)),
 'energy':(('play','train','walk'),('sleep','leave')),
 'caution':(('sleep','safe','leave'),('risk','battle'))}

def check_profile(p):
    def require(ok):
        if not ok: raise ValueError('Invalid personality profile')
    require(isinstance(p,dict) and set(p)=={'appearance','source','traits','summary','voice','habit'})
    require(p['source'] in ('reference','portrait','starter'))
    def text(v,limit):return isinstance(v,str) and 0<len(v.strip())<=limit and all(ord(c)>=32 for c in v)
    require(text(p['appearance'],1200))
    require(isinstance(p['traits'],dict) and set(p['traits'])==set(AXES))
    require(all(type(v) is int and v in (-1,0,1) for v in p['traits'].values()))
    for key in ('summary','voice','habit'):
        require(isinstance(p[key],dict) and {'en','ko'}<=set(p[key])<= {'en','ko','ja','zh-Hans','zh-Hant'} and all(text(v,220) for v in p[key].values()))
    require(len(json.dumps(p,ensure_ascii=False))<=4096)

def validate(st):
    p=st.get('personality')
    if p is None:return
    if not isinstance(p,dict) or set(p)!={'version','origin','since'} or type(p['version']) is not int or p['version']!=1:raise ValueError('Invalid personality')
    check_profile(p['origin'])
    if not isinstance(p['since'],dict) or any(not isinstance(k,str) or type(v) is not int or not 0<=v<=999999 for k,v in p['since'].items()):raise ValueError('Invalid personality baseline')

def establish(st,raw):
    if not isinstance(raw,str) or len(raw)>4096:raise ValueError('Invalid personality payload')
    profile=json.loads(raw);check_profile(profile)
    if st.get('personality') is None:
        st['personality']={'version':1,'origin':copy.deepcopy(profile),'since':copy.deepcopy(st.get('journey',{}).get('counts',{}))}
    return view(st)

def view(st):
    saved=st.get('personality')
    if not saved:return None
    profile=saved['origin'];counts=st.get('journey',{}).get('counts',{})
    actions={k:max(0,v-saved['since'].get(k,0)) for k,v in counts.items()}
    values={};changes={}
    for axis,(positive,negative) in INFLUENCES.items():
        net=sum(actions.get(k,0) for k in positive)-sum(actions.get(k,0) for k in negative)
        delta=max(-15,min(15,int(net/8)))
        values[axis]=50+10*profile['traits'][axis]+delta
        if delta:changes[axis]={'amount':delta,'actions':[k for k in (positive if delta>0 else negative) if actions.get(k,0)]}
    return {'origin':copy.deepcopy(profile),'values':values,'changes':changes}
