"""Derived pixel-home geometry and routes. No save migration or platform I/O."""
from collections import deque
from functools import lru_cache
import copy

YARD_OBJECTS = [
    dict(kind='house', x=320, y=208, w=160, block=[240,134,160,58]),
    *[dict(kind='tree', x=x, y=y, w=76, block=[x-7,y-13,14,13])
      for x,y in [(72,128),(136,216),(528,160),(568,328),(88,392),(448,424)]],
    dict(kind='bench', x=208, y=304, w=56, block=[180,288,56,16]),
    *[dict(kind='bush', x=x, y=y, w=40, block=[x-15,y-9,30,9])
      for x,y in [(200,200),(440,200),(80,304),(464,320),(200,432),(360,432)]],
    *[dict(kind='plant', x=x, y=216, w=24, block=[x-7,206,14,10]) for x in [256,384]],
]

def yard_free(x,y):
    return (40<=x<=600 and 104<=y<=448 and all(
        x+10<=b[0] or x-10>=b[0]+b[2] or y+4<=b[1] or y-4>=b[1]+b[3]
        for o in YARD_OBJECTS if (b:=o.get('block'))))

def yard_route(start,end):
    start,end=tuple(start),tuple(end)
    if not yard_free(*start) or not yard_free(*end):raise ValueError('Blocked yard route')
    queue=deque([start]);previous={start:None}
    while queue:
        p=queue.popleft()
        if p==end:
            result=[]
            while p is not None:result.append(list(p));p=previous[p]
            return result[::-1]
        x,y=p
        for q in [(x+8,y),(x-8,y),(x,y+8),(x,y-8)]:
            if q not in previous and yard_free(*q):previous[q]=p;queue.append(q)
    raise ValueError('Unreachable yard route')

@lru_cache(maxsize=1)
def yard():
    tour=[];start=[320,208]
    for end,pause,face in [([184,176],.1,'left'),([136,192],.6,'left'),
            ([96,192],.1,'down'),([96,240],.1,'right'),([168,240],1,'down'),
            ([208,320],2.5,'up'),([320,256],.1,'up'),([320,208],.4,'up')]:
        tour.append(dict(route=yard_route(start,end),pause=pause,face=face));start=end
    tour[-1]['next']='inside'
    return dict(size=[640,480],start=[320,208],objects=YARD_OBJECTS,tour=tour)

def point(p):
    return [64+(p[0]+1)*32,64+(p[1]+1)*32]

def world(home,catalog,roam):
    objects=[]
    widths={'nest':62,'bookshelf':62,'desk':62,'lamp':20,'side-table':30,
            'rug':124,'cushion':30,'plant':30,'wall-art':30,'curtain':62,'tea':24,'basket':30}
    for key,p in home['layout'].items():
        item=catalog[key];w,h=item['size'];layer=item['layer']
        x=64+(p[0]+w/2)*32;y=64+(p[1]+h)*32
        if layer=='wall':y=72
        if layer=='surface':y-=20
        objects.append(dict(kind=key,x=x,y=y,w=widths[key],layer=layer))
    route=[point(p) for p in roam]
    inside=dict(size=[448,352],start=point([4,6]),objects=objects,tour=[
        dict(route=route,pause=3,face='up'),
        dict(route=route[::-1],pause=.4,face='down',next='yard')])
    return dict(yard=copy.deepcopy(yard()),inside=inside)
