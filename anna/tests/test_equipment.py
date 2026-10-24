import copy
import json
import unittest
from unittest.mock import patch, AsyncMock
from test_anna import MemoryAPS, GameClient

class EquipmentStorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage=MemoryAPS();self.client=GameClient(self.storage)
        self.client.files=AsyncMock()
        self.born=await self.client.invoke({'command':'start','name':'Wearing buddy','request_id':'born'})
        value=self.storage.value;value['collectibles']={'ember-horns':1};self.storage.value=value
        self.gate=patch('notebuddy_plugin.EQUIPMENT_ENABLED',True);self.gate.start();self.addCleanup(self.gate.stop)
    def args(self,cmd,rid,revision=0,**extra):
        return dict(command=cmd,request_id=rid,equipment_payload=json.dumps(dict(pet_id=self.born['pet_id'],revision=revision,id='a'*32,**extra)))
    async def prepare(self):
        result=await self.client.invoke(self.args('equipment_prepare','prepare',item_id='ember-horns',stage=1,source_path='assets/starters-v1/ghost_fire_stage1.png'))
        if result.get('ok'):
            self.client.files.list.return_value={'items':[{'path':result['status']['equipment']['pending']['path'],'size_bytes':123}]}
        return result
    async def test_save_failure_conflict_reconnect_and_receipt(self):
        self.assertTrue((await self.prepare())['ok']);before=copy.deepcopy(self.storage.value)
        args=self.args('equipment_apply','apply',1);self.storage.fail=True
        with self.assertRaises(Exception):await self.client.invoke(args)
        self.assertEqual(before,self.storage.value)
        self.storage.fail=False;self.storage.conflict_once=True
        expired=await self.client.invoke(args);self.assertEqual(expired['code'],'request_expired')
        self.assertEqual(self.storage.value['collectibles'],{'ember-horns':1})
        # A fresh explicit Apply after recovery uses a new action ID, same reservation/result.
        args=self.args('equipment_apply','explicit-apply-after-conflict',1)
        first=await self.client.invoke(args);self.assertTrue(first['ok'],first)
        saved=copy.deepcopy(self.storage.value);again=await GameClient(self.storage).invoke(args)
        self.assertTrue(again['replayed']);self.assertEqual(saved,self.storage.value)
        self.assertEqual(saved['collectibles'],{});self.assertEqual(saved['collectible_discoveries'],['ember-horns'])
        self.assertEqual(again['status']['equipment']['portrait']['id'],'a'*32)
    async def test_production_gate_and_cancel(self):
        with patch('notebuddy_plugin.EQUIPMENT_ENABLED',False):
            r=await self.prepare();self.assertEqual(r['code'],'equipment_disabled')
        await self.prepare();await self.client.invoke(self.args('equipment_cancel','cancel',1))
        self.assertEqual(self.storage.value['collectibles'],{'ember-horns':1})
        self.assertFalse((await self.client.invoke(self.args('equipment_apply','late',2)))['ok'])

    async def test_missing_uploaded_image_cannot_consume(self):
        await self.prepare();before=copy.deepcopy(self.storage.value)
        self.client.files.list.return_value={'items':[]}
        with self.assertRaisesRegex(ValueError,'not been stored'):
            await self.client.invoke(self.args('equipment_apply','missing-file',1))
        self.assertEqual(before,self.storage.value)
