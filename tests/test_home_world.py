import copy
import json
import unittest
import test_home
import home
from home_world import yard_free, point

class HomeWorldTests(unittest.TestCase):
    setUp=test_home.HomeTests.setUp
    def furnished(self):
        self.state['home']=home.initial()
        self.state['home']['owned']+=['bookshelf','plant']
        self.state['home']['layout'].update(bookshelf=[0,0],plant=[0,3])

    def test_furniture_visits_are_continuous_reachable_and_face_each_placed_item(self):
        self.furnished();before=copy.deepcopy(self.state)
        inside=home.view(self.state)['world']['inside'];previous=inside['start']
        visits=[leg for leg in inside['tour'] if leg.get('activity')]
        self.assertEqual({leg['activity'] for leg in visits},{'rest','read','plant'})
        self.assertEqual({leg['item'] for leg in visits},{'nest','bookshelf','plant'})
        self.assertLessEqual(len(inside['tour']),4)
        blocked=home.occupied(self.state['home']['layout'])
        for leg in inside['tour']:
            self.assertEqual(leg['route'][0],previous)
            for x,y in leg['route']:
                a,b=(x-96)//32,(y-96)//32
                self.assertTrue(0<=a<=8 and 0<=b<=6)
                self.assertFalse({(a,b),(a+1,b),(a,b+1),(a+1,b+1)}&blocked)
            for a,b in zip(leg['route'],leg['route'][1:]):
                self.assertEqual(abs(a[0]-b[0])+abs(a[1]-b[1]),32)
            previous=leg['route'][-1]
            if leg.get('item'):
                x,y=previous;a,b=(x-96)//32,(y-96)//32
                target=home.cells(leg['item'],self.state['home']['layout'][leg['item']])
                self.assertEqual(min(abs(c-e)+abs(d-f) for c,d in target for e,f in ((a,b),(a+1,b),(a,b+1),(a+1,b+1))),1)
                tx,ty=self.state['home']['layout'][leg['item']];w,h=home.CATALOG[leg['item']]['size']
                dx,dy=tx+w/2-(a+1),ty+h/2-(b+1)
                expected=('right' if dx>0 else 'left') if abs(dx)>abs(dy) else ('down' if dy>0 else 'up')
                self.assertEqual(leg['face'],expected)
        self.assertEqual(previous,inside['start']);self.assertEqual(inside['tour'][-1]['next'],'yard')
        self.assertEqual(self.state,before)

    def test_current_personality_changes_visit_order_and_pause_without_changing_state(self):
        import personality
        from test_personality import profile
        self.furnished();p=profile()
        p['traits'].update(curiosity=-1,warmth=1,energy=-1,caution=1)
        personality.establish(self.state,json.dumps(p))
        before=copy.deepcopy(self.state);calm=home.view(self.state)['world']['inside']['tour']
        self.assertEqual(self.state,before)
        self.assertEqual(calm[0].get('activity'),'rest')
        self.state['personality']['origin']['traits'].update(curiosity=1,warmth=0,energy=1,caution=1)
        curious=home.view(self.state)['world']['inside']['tour']
        self.assertEqual(curious[0].get('activity'),'read')
        self.assertGreater(calm[0]['pause'],next(leg['pause'] for leg in curious if leg.get('activity')=='rest'))
        self.state['personality']['origin']['traits'].update(curiosity=0,warmth=0,energy=0,caution=0)
        neutral=home.view(self.state)['world']['inside']['tour']
        import journeys
        for _ in range(80):journeys.record(self.state,'play')
        active=home.view(self.state)['world']['inside']['tour']
        self.assertEqual(neutral[0].get('activity'),'rest')
        self.assertEqual(active[0].get('activity'),'plant','learned personality values must affect home life')

    def test_stored_and_unreachable_furniture_never_receive_an_activity(self):
        self.furnished();self.state['home']['layout'].pop('bookshelf')
        tour=home.view(self.state)['world']['inside']['tour']
        self.assertNotIn('read',[leg.get('activity') for leg in tour])
        # A blocked legacy/invalid placement must not produce an invented route.
        self.state['home']['layout']['plant']=[7,0]
        self.state['home']['layout']['desk']=[5,0]
        self.state['home']['layout']['bookshelf']=[7,2]
        self.state['home']['owned'].append('desk')
        tour=home.view(self.state)['world']['inside']['tour']
        self.assertNotIn('plant',[leg.get('activity') for leg in tour])
        self.state['home']['layout']={'nest':[7,0],'desk':[4,6]}
        tour=home.view(self.state)['world']['inside']['tour']
        self.assertEqual(tour,[{'route':[point(home.DOOR)],'pause':.4,'face':'down','next':'yard'}])
    def test_world_is_derived_and_every_yard_segment_clears_objects(self):
        before=copy.deepcopy(self.state);world=home.view(self.state)['world']
        self.assertEqual(self.state,before)
        previous=world['yard']['start']
        for leg in world['yard']['tour']:
            self.assertEqual(leg['route'][0],previous)
            for a,b in zip(leg['route'],leg['route'][1:]):
                self.assertEqual(abs(a[0]-b[0])+abs(a[1]-b[1]),8)
                for i in range(9):self.assertTrue(yard_free(a[0]+(b[0]-a[0])*i/8,a[1]+(b[1]-a[1])*i/8))
            previous=leg['route'][-1]
        self.assertEqual(previous,world['yard']['start'])
        self.assertEqual(world['inside']['tour'][0]['route'],[point(p) for p in home.view(self.state)['roam']])
        world['yard']['objects'].clear()
        self.assertTrue(home.view(self.state)['world']['yard']['objects'],'cached geometry cannot be mutated by callers')

    def test_all_candidate_furniture_uses_the_same_owned_layout(self):
        self.state['home']=home.initial();self.state['home']['owned']=list(home.CATALOG)
        for _ in range(5):
            candidates=home.candidates(self.state)
            if not candidates:break
            self.state['home']['layout']=candidates[0]['layout']
            value=home.view(self.state)
            inside={k for k in value['layout'] if home.CATALOG[k].get('area')!='yard'}
            outside=set(value['layout'])-inside
            self.assertEqual({o['kind'] for o in value['world']['inside']['objects']},inside)
            self.assertEqual({o['kind'] for o in value['world']['yard']['objects'] if o['kind'].startswith('yard-')},outside)
            for leg in value['world']['yard']['tour']:
                for a,b in zip(leg['route'],leg['route'][1:]):
                    for i in range(9):self.assertTrue(yard_free(a[0]+(b[0]-a[0])*i/8,a[1]+(b[1]-a[1])*i/8,value['world']['yard']['objects']))
            self.assertEqual(value['world']['inside']['tour'][0]['route'][0],value['world']['inside']['start'])
