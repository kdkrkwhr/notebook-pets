import copy
import unittest
import test_home
import home
from home_world import yard_free, point

class HomeWorldTests(unittest.TestCase):
    setUp=test_home.HomeTests.setUp
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
