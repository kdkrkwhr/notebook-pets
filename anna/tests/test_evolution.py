import copy
import json
import unittest
from test_anna import MemoryAPS,GameClient
from receipts import byte_size,pack,MAX_SAVE_BYTES

class EvolutionStorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage=MemoryAPS();self.client=GameClient(self.storage)
        self.born=await self.client.invoke({'command':'start','name':'Growing','request_id':'born'})
        self.storage.value['level']=50
        self.storage.value.setdefault('journey',{'version':1,'counts':{},'recent':[],'routes':[0,0],'arc':None,'chapter':0,'last_arc':None,'completed':0,'endings':[],'current':None})
        self.storage.value['journey'].update(counts={'feed':60,'walk':30,'train':25},completed=3)

    def request(self,command,event,**extra):
        return dict(command=command,request_id=event,evolution_payload=json.dumps({'pet_id':self.born['pet_id'],**extra},ensure_ascii=False))

    async def test_three_stages_bounded_save_restart_replay_and_failed_commit(self):
        for stage in (1,2,3):
            p=await self.client.invoke(self.request('evolution_prepare',f'prepare-{stage}',stage=stage))
            token=p['status']['evolution']['pending']['id']
            options=[dict(route_id=r,title='따뜻한 친구'*10,reason='함께한 기록'*25,appearance='둥근 몸과 고유 무늬'*15) for r in ('keep','wind','nature') if r!=p['element_key']]
            if len(options)<3:options.append(dict(route_id='fire',title='불꽃',reason='훈련 기록',appearance='불꽃 무늬'))
            result=await self.client.invoke(self.request('evolution_options',f'options-{stage}',choice_id=token,options=options,features='둥근 얼굴과 작은 귀. '*80,memory='함께한 산책. '*70,language='ko'))
            self.assertTrue(result['ok'],result.get('code'))
            before=copy.deepcopy(self.storage.document);self.storage.fail=True
            request=self.request('evolve',f'choose-{stage}',choice_id=token,route_id='keep')
            with self.assertRaises(Exception):await self.client.invoke(request)
            self.assertEqual(self.storage.document,before);self.storage.fail=False
            evolved=await self.client.invoke(request);self.assertTrue(evolved['ok'],evolved.get('code'))
            saved=copy.deepcopy(self.storage.document)
            replay=await GameClient(self.storage).invoke(request);self.assertTrue(replay['replayed']);self.assertEqual(self.storage.document,saved)
            self.assertEqual(self.storage.value['stage'],stage+1)
            self.assertLessEqual(byte_size(pack(self.storage.value)),MAX_SAVE_BYTES)
        self.assertEqual(len(self.storage.value['evolution']['records']),3)
