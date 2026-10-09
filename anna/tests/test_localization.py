"""Exercise locale switching through the real engine and APS adapter."""
import copy
import json
import re
import unittest
from test_anna import MemoryAPS, GameClient, evaluate
from localization import localize

class LocalizationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.storage=MemoryAPS()
        self.service=GameClient(self.storage)

    async def start(self):
        return await self.service.invoke({'command':'start','name':'Mochi','request_id':'birth'})

    async def test_english_default_and_korean_read_preserve_save(self):
        en=await self.start()
        before=copy.deepcopy(self.storage.value)
        ko=await self.service.invoke({'command':'status','language':'ko'})
        en_status=await self.service.invoke({'command':'status'})
        self.assertEqual(en['language'],'en')
        self.assertEqual(en_status['status']['stage_label'],'Hatchling')
        self.assertEqual(ko['status']['stage_label'],'새싹기')
        self.assertEqual(ko['status']['name'],'Mochi')
        self.assertEqual(en_status['pet_id'],ko['pet_id'])
        self.assertEqual(self.storage.value,before)
        self.assertEqual(self.storage.writes,1)
        self.assertNotRegex(json.dumps(en_status,ensure_ascii=False),r'[가-힣]')

    async def test_action_retry_in_another_language_does_not_award_twice(self):
        await self.start()
        args={'command':'feed','request_id':'one-meal'}
        en=await self.service.invoke(args)
        before=copy.deepcopy(self.storage.value)
        ko=await self.service.invoke({**args,'language':'ko'})
        self.assertTrue(ko['ok'])
        self.assertNotEqual(en['msg'],ko['msg'])
        self.assertEqual(en['xp_result'],ko['xp_result'])
        self.assertEqual(self.storage.value,before)
        self.assertEqual(self.storage.value['xp'],10)
        self.assertEqual(self.storage.writes,2)

    async def test_invalid_language_rejected_before_storage(self):
        for language in ['fr',None,{},1]:
            with self.subTest(language=language),self.assertRaises(ValueError):
                await self.service.invoke({'command':'start','request_id':'bad','language':language})
        self.assertEqual(self.storage.writes,0)

    async def test_cooldown_daily_limit_food_and_quest_errors_are_localized(self):
        await self.start()
        await self.service.invoke({'command':'feed','request_id':'meal'})
        cooldown=await self.service.invoke({'command':'feed','request_id':'meal-again'})
        self.assertEqual(cooldown['code'],'cooldown')
        self.assertGreater(cooldown['retry_after_minutes'],0)
        self.assertNotRegex(cooldown['msg'],r'[가-힣]')
        for n in range(3):
            await self.service.invoke({'command':'snack','request_id':f'snack-{n}'})
        limit=await self.service.invoke({'command':'snack','request_id':'over-limit'})
        self.assertEqual(limit['code'],'daily_limit');self.assertEqual(limit['daily_limit'],3)
        self.storage.value['cooldowns']={};self.storage.value['inventory']['normal_feed']=0
        food=await self.service.invoke({'command':'feed','request_id':'no-food'})
        self.assertEqual(food['code'],'no_food');self.assertIn('daily gift',food['msg'])
        quest=await self.service.invoke({'command':'claimquest','request_id':'early-claim'})
        self.assertEqual(quest['code'],'quest_incomplete');self.assertNotRegex(json.dumps(quest,ensure_ascii=False),r'[가-힣]')

    async def test_nested_encounter_titles_album_and_old_receipts(self):
        await self.start()
        st=self.storage.value
        st.update(level=81,stage=4,evolution_branch='light',intimacy=95)
        st['record']['win']=50
        st['_wild']={'species_key':'ghost','element_key':'fire','species':'유령족','element':'불','level':80}
        before=copy.deepcopy(st)
        for command in ['status','album','titles','quests','help']:
            result=await self.service.invoke({'command':command})
            self.assertNotRegex(json.dumps(result,ensure_ascii=False),r'[가-힣]',command)
            if command=='help':self.assertNotIn('rank',result['commands'])
        self.assertEqual(self.storage.value,before)
        replay=await self.service.invoke({'command':'start','name':'Mochi','request_id':'birth','language':'ko'})
        self.assertTrue(replay['ok']);self.assertEqual(self.storage.value,before)

    async def test_user_names_are_never_translated(self):
        result=await self.service.invoke({'command':'start','name':'새싹기','request_id':'name'})
        self.assertEqual(result['status']['name'],'새싹기')
        self.assertEqual(result['album']['name'],'새싹기')
        self.assertEqual(result['status']['stage_label'],'Hatchling')

    def test_battle_outcomes_and_unknown_failure_never_leak_engine_text(self):
        for outcome in ['win','lose','draw']:
            raw={'ok':True,'msg':'원본 전투 문구','outcome':outcome}
            result=localize(raw,'battle')
            self.assertNotRegex(result['msg'],r'[가-힣]');self.assertEqual(result['outcome'],outcome)
            self.assertEqual(raw['msg'],'원본 전투 문구')
        result=localize({'ok':False,'msg':'unknown secret /private/path'},'feed')
        self.assertNotIn('secret',result['msg'])
