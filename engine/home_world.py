"""Derived pixel-home geometry and routes. No save migration or platform I/O."""
from collections import deque
from functools import lru_cache
import copy

YARD_OBJECTS = [
    dict(kind='house', x=320, y=208, w=160, block=[240,134,160,58]),
]

def yard_free(x,y,objects=YARD_OBJECTS):
    return (40<=x<=600 and 104<=y<=448 and all(
        x+10<=b[0] or x-10>=b[0]+b[2] or y+4<=b[1] or y-4>=b[1]+b[3]
        for o in objects if (b:=o.get('block'))))

def yard_route(start,end,objects=YARD_OBJECTS):
    start,end=tuple(start),tuple(end)
    if not yard_free(*start,objects) or not yard_free(*end,objects):raise ValueError('Blocked yard route')
    queue=deque([start]);previous={start:None}
    while queue:
        p=queue.popleft()
        if p==end:
            result=[]
            while p is not None:result.append(list(p));p=previous[p]
            return result[::-1]
        x,y=p
        for q in [(x+8,y),(x-8,y),(x,y+8),(x,y-8)]:
            if q not in previous and yard_free(*q,objects):previous[q]=p;queue.append(q)
    raise ValueError('Unreachable yard route')

def garden_object(key,p):
    x,y=64+p[0]*32,128+p[1]*32
    return dict(kind=key,x=x,y=y,w=48,block=[x-12,y-12,24,12])

@lru_cache(maxsize=256)
def garden(signature=()):
    objects=YARD_OBJECTS+[garden_object(key,p) for key,p in signature]
    tour=[];start=[320,208]
    for end,pause,face in [([184,176],.1,'left'),([136,192],.6,'left'),
            ([96,192],.1,'down'),([96,240],.1,'right'),([168,240],1,'down'),
            ([208,320],2.5,'up'),([320,256],.1,'up'),([320,208],.4,'up')]:
        tour.append(dict(route=yard_route(start,end,objects),pause=pause,face=face));start=end
    tour[-1]['next']='inside'
    return dict(size=[640,480],start=[320,208],objects=objects,tour=tour)

def yard():
    return garden()

def valid_garden(layout):
    installed=[]
    for key,p in layout.items():
        if not 0<=p[0]<=15 or not 0<=p[1]<=9:return False
        obj=garden_object(key,p);a=obj['block']
        # Keep objects out of the cottage facade as well as the solid bases.
        obstacles=[*YARD_OBJECTS,*installed,dict(block=[232,104,176,112])]
        for other in obstacles:
            b=other['block']
            if a[0]<b[0]+b[2] and a[0]+a[2]>b[0] and a[1]<b[1]+b[3] and a[1]+a[3]>b[1]:return False
        installed.append(obj)
    try: garden(tuple(sorted((k,tuple(p)) for k,p in layout.items())))
    except ValueError:return False
    return True

def point(p):
    return [64+(p[0]+1)*32,64+(p[1]+1)*32]

def world(home,catalog,roam):
    objects=[]
    widths={'nest':62,'bookshelf':62,'desk':62,'lamp':20,'side-table':30,
            'rug':124,'cushion':30,'plant':30,'wall-art':30,'curtain':62,'tea':24,'basket':30}
    for key,p in home['layout'].items():
        item=catalog[key];w,h=item['size'];layer=item['layer']
        if item.get('area')=='yard':continue
        x=64+(p[0]+w/2)*32;y=64+(p[1]+h)*32
        if layer=='wall':y=72
        if layer=='surface':y-=20
        objects.append(dict(kind=key,x=x,y=y,w=widths[key],layer=layer))
    route=[point(p) for p in roam]
    inside=dict(size=[448,352],start=point([4,6]),objects=objects,tour=[
        dict(route=route,pause=3,face='up'),
        dict(route=route[::-1],pause=.4,face='down',next='yard')])
    signature=tuple(sorted((k,tuple(p)) for k,p in home['layout'].items() if catalog[k].get('area')=='yard'))
    return dict(yard=copy.deepcopy(garden(signature)),inside=inside)
