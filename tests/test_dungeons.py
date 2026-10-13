"""Dungeon economy, daily boundaries, old saves and durable result replay."""
import copy
import random
import unittest
from datetime import datetime
from unittest.mock import patch
import test_p0
import engine
import dungeons


class DungeonTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed
    parallel = test_p0.RuntimeTests.parallel

    def opened(self, **changes):
        return self.seed(dungeons={'date': engine.today(), 'discovered': list(dungeons.CATALOG),
                                  'cleared': [], 'misses': 0, 'last_run': None}, **changes)

    def test_old_saves_read_without_mutation_and_walk_discovery_replays_once(self):
        self.seed()
        before = (self.state/'123.json').read_bytes()
        state = engine.execute('123', 'status')['dungeons']
        self.assertEqual(state['coins'], 0)
        self.assertEqual(state['entries'], [])
        self.assertEqual((self.state/'123.json').read_bytes(), before)
        with patch.object(engine.random, 'random', return_value=.9):
            missed = engine.execute('123', 'walk', request_id='miss')
        self.assertIsNone(missed['dungeon_discovered'])
        self.assertEqual(engine.execute('123', 'status')['dungeons']['entries'], [])
        with patch.object(engine.random, 'random', side_effect=[.9, .2499]):
            first = engine.execute('123', 'walk', request_id='discover')
        self.assertIn(first['dungeon_discovered'], dungeons.CATALOG)
        entries = engine.execute('123', 'status')['dungeons']['entries']
        self.assertEqual([e['id'] for e in entries], [first['dungeon_discovered']])
        saved = copy.deepcopy(engine.load_state('123'))
        with patch.object(engine.random, 'random', side_effect=AssertionError('Discovery rerolled')):
            self.assertEqual(engine.execute('123', 'walk', request_id='discover'), first)
        self.assertEqual(engine.load_state('123'), saved)

    def test_discovery_has_no_guarantee_even_for_legacy_miss_counter(self):
        st = self.seed()
        st['dungeons'] = {'date':engine.today(),'discovered':[],'cleared':[], 'misses':2,'last_run':None}
        with patch.object(engine.random, 'random', return_value=.25):
            discoveries = [dungeons.discover(st, engine.today(), engine.random) for _ in range(8)]
        self.assertEqual(discoveries, [None]*8)
        dungeons.validate(st)

    def test_clear_each_discovery_before_finding_next_without_repeating_daily_rewards(self):
        st = self.seed()
        found = []
        with patch.object(engine.random, 'random', return_value=.2499):
            for _ in range(3):
                key = dungeons.discover(st, engine.today(), engine.random)
                found.append(key)
                st['dungeons']['cleared'].append(key)
            found.append(dungeons.discover(st, engine.today(), engine.random))
        self.assertEqual(set(found[:3]), set(dungeons.CATALOG))
        self.assertIsNone(found[3])
        dungeons.validate(st)

    def test_pending_discovery_blocks_rolls_across_midnight_until_exact_expiry(self):
        start = datetime(2026,10,13,23,30,tzinfo=dungeons.KST).timestamp()
        st = self.seed()
        with patch.object(engine.time, 'time', return_value=start), patch.object(engine.random, 'random', return_value=0):
            key = dungeons.discover(st, '2026-10-13', engine.random)
        for elapsed in (1, 3600, 86399):
            with patch.object(engine.time, 'time', return_value=start+elapsed), patch.object(engine.random, 'random', side_effect=AssertionError('Rolled while dungeon open')):
                day = datetime.fromtimestamp(start+elapsed, dungeons.KST).date().isoformat()
                self.assertIsNone(dungeons.discover(st, day, engine.random))
            self.assertEqual(st['dungeons']['discovered'], [key])
            self.assertEqual(st['dungeons']['expires_at'], {key:start+86400})
        with patch.object(engine.time, 'time', return_value=start+86400), patch.object(engine.random, 'random', return_value=0):
            next_key = dungeons.discover(st, '2026-10-14', engine.random)
        self.assertEqual(st['dungeons']['discovered'], [next_key])
        self.assertEqual(st['dungeons']['expires_at'][next_key], start+172800)


    def test_legacy_completed_discovery_does_not_reopen_and_pending_ones_are_preserved(self):
        start = datetime(2026,10,13,23,30,tzinfo=dungeons.KST).timestamp()
        st = self.seed(dungeons={'date':'2026-10-13','discovered':['hellgate','icekingdom'],
                               'cleared':['hellgate'],'misses':0,'last_run':None,
                               'expires_at':{'hellgate':start+86400,'icekingdom':start+86400}})
        with patch.object(engine.time, 'time', return_value=start+3600):
            state = dungeons.daily(st, '2026-10-14')
            self.assertEqual(state['discovered'], ['icekingdom'])
            self.assertEqual(state['cleared'], [])
            with patch.object(engine.random,'random',side_effect=AssertionError('Pending legacy dungeon')):
                self.assertIsNone(dungeons.discover(st, '2026-10-14', engine.random))
        # Multiple uncompleted pre-update discoveries are kept, never arbitrarily deleted.
        st = self.opened()
        with patch.object(engine.random,'random',side_effect=AssertionError('Pending legacy dungeons')):
            self.assertIsNone(dungeons.discover(st,engine.today(),engine.random))
        self.assertEqual(st['dungeons']['discovered'], list(dungeons.CATALOG))

    def test_entry_guards_never_spend_a_charge(self):
        self.seed()
        self.assertEqual(engine.execute('123', 'explore_hellgate')['code'], 'dungeon_locked')
        self.opened(walk_energy={'charges': 0, 'updated_at': engine.time.time()})
        before = (self.state/'123.json').read_bytes()
        self.assertEqual(engine.execute('123', 'explore_hellgate')['code'], 'walk_recharging')
        self.assertEqual((self.state/'123.json').read_bytes(), before)
        self.opened(_wild={'species_key':'bird','element_key':'fire','species':'bird','element':'fire','level':1})
        before = (self.state/'123.json').read_bytes()
        self.assertEqual(engine.execute('123', 'explore_hellgate')['code'], 'encounter_pending')
        self.assertEqual((self.state/'123.json').read_bytes(), before)





    def test_expired_discovery_can_be_found_again_but_daily_rewards_cannot_repeat(self):
        now = engine.time.time()
        st = self.opened()
        st['dungeons']['expires_at'] = {key:now-1 for key in dungeons.CATALOG}
        st['dungeons']['cleared'] = ['hellgate']
        with patch.object(engine.random, 'random', return_value=0):
            found = []
            for _ in range(3):
                key = dungeons.discover(st,engine.today(),engine.random)
                found.append(key)
                if key:
                    st['dungeons']['cleared'].append(key)
        self.assertEqual(set(found), {'icekingdom','dreamforest',None})
        self.assertEqual(set(st['dungeons']['cleared']), set(dungeons.CATALOG))
        dungeons.validate(st)



    def test_bad_economy_or_unbounded_state_is_rejected(self):
        for value in (-1, True, '10'):
            with self.assertRaises(engine.GameError): self.seed(coins=value)
        for state in [None, {}, {'date':engine.today(),'discovered':['other'],'cleared':[],'misses':0}]:
            with self.assertRaises(engine.GameError): self.seed(dungeons=state)
        for expiry in (True, -1, float('inf'), 'soon', 253402214400):
            with self.assertRaises(engine.GameError):
                self.seed(dungeons={'date':engine.today(),'discovered':['hellgate'],'cleared':[],'misses':0,'expires_at':{'hellgate':expiry}})


    def test_room_plans_are_stable_and_cover_three_to_six_rooms(self):
        from datetime import timedelta, date
        counts = set()
        for offset in range(40):
            day = (date(2026, 10, 1) + timedelta(days=offset)).isoformat()
            plan = dungeons.room_plan('hellgate', day)
            self.assertEqual(plan, dungeons.room_plan('hellgate', day))
            counts.add(len(plan))
            self.assertEqual(plan[-1]['kind'], 'boss')
            self.assertEqual(sum(p['kind']=='rest' for p in plan), int(len(plan)>=4))
        self.assertEqual(counts, {3,4,5,6})




    def enter(self, key='hellgate', request='enter'):
        result = engine.execute('123','explore_'+key,request_id=request)
        self.assertTrue(result['ok'],result)
        return result['dungeon_visit']

    def choose(self, ex, choice='safe', request='choose'):
        result = engine.execute('123','dungeon_'+choice,[ex['choice_id']],request_id=request)
        self.assertTrue(result['ok'],result)
        return result['dungeon_run']

    def test_paid_checkpoint_does_not_fight_and_resumes_without_cost(self):
        before=self.opened()
        with patch.object(engine,'simulate_battle',side_effect=AssertionError('premature combat')):
            ex=self.enter()
            self.assertEqual(self.enter(request='resume'),ex)
            self.assertEqual(self.enter(request='enter'),ex)
        saved=engine.load_state('123')
        self.assertEqual(saved['walk_energy']['charges'],4)
        self.assertEqual(saved.get('coins',0),0)
        self.assertIsNone(saved['dungeons']['last_run'])
        self.assertEqual(engine.execute('123','status')['dungeons']['expedition'],ex)
        for field in ('xp','level','record','inventory','training_bonus'):
            self.assertEqual(saved.get(field),before.get(field))

    def test_every_stage_costs_one_and_only_final_clear_awards_ten(self):
        self.opened(training_bonus={'atk':100,'def':100,'hp':100})
        hp=None
        for i in range(6):
            st=engine.load_state('123');st['walk_energy']={'charges':5,'updated_at':engine.time.time()};engine.save_state(st)
            ex=self.enter(request=f'entry-{i}')
            self.assertEqual(ex['index'],i)
            if hp is not None:self.assertEqual(ex['hp'],hp)
            run=self.choose(ex,request=f'choice-{i}')
            self.assertEqual(len(run['rooms']),1)
            self.assertEqual(engine.load_state('123')['walk_energy']['charges'],4)
            self.assertEqual(run['coins_awarded'],10 if run['complete'] else 0)
            hp=run['hp_me']
            saved=copy.deepcopy(engine.load_state('123'))
            self.assertEqual(self.choose(ex,request=f'choice-{i}'),run)
            self.assertEqual(engine.load_state('123'),saved)
            dungeons.validate(saved)
            if run['complete']:break
        self.assertTrue(run['complete'])
        self.assertEqual(engine.load_state('123')['coins'],10)
        self.assertEqual(engine.execute('123','explore_hellgate')['code'],'dungeon_cleared')

    def test_risk_can_damage_or_pay_and_safe_never_rolls_a_trap(self):
        for roll,damage,coins in [(0,True,0),(.9,False,2)]:
            self.opened(training_bonus={'atk':100,'def':100,'hp':100})
            ex=self.enter()
            with patch.object(engine.random,'random',return_value=roll):run=self.choose(ex,'risk')
            self.assertEqual(run['trap_damage']>0,damage)
            self.assertEqual(run['route_coins'],coins)
            self.assertEqual(run['rooms'][0]['start_hp'],round(ex['hp']-run['trap_damage'],2))
        self.opened(training_bonus={'atk':100,'def':100})
        ex=self.enter();run=self.choose(ex)
        self.assertEqual((run['trap_damage'],run['route_coins']),(0,0))

    def test_stale_choice_cannot_resolve_a_later_stage_or_spend(self):
        self.opened(training_bonus={'atk':100,'def':100})
        ex=self.enter();self.choose(ex);new=self.enter(request='next')
        before=copy.deepcopy(engine.load_state('123'))
        result=engine.execute('123','dungeon_risk',[ex['choice_id']],request_id='stale')
        self.assertEqual(result['code'],'dungeon_choice_stale')
        self.assertEqual(engine.load_state('123'),before)
        self.assertNotEqual(ex['choice_id'],new['choice_id'])

    def test_paid_stage_survives_expiry_but_next_entry_is_locked(self):
        self.opened(training_bonus={'atk':100,'def':100})
        ex=self.enter()
        with patch.object(engine.time,'time',return_value=engine.time.time()+86401):
            self.assertEqual(self.enter(request='expired-resume'),ex)
            self.assertEqual(engine.execute('123','status')['dungeons']['entries'],[])
            run=self.choose(ex)
            self.assertEqual(run['outcome'],'win')
            self.assertEqual(engine.execute('123','explore_hellgate')['code'],'dungeon_locked')

    def test_parallel_entries_and_choices_charge_and_resolve_once(self):
        self.opened(walk_energy={'charges':1,'updated_at':engine.time.time()},training_bonus={'atk':100,'def':100})
        results=self.parallel([['engine/engine.py','123','explore_hellgate'] for _ in range(4)])
        self.assertTrue(all(r['ok'] for r in results),results)
        self.assertEqual(len({r['dungeon_visit']['choice_id'] for r in results}),1)
        ex=results[0]['dungeon_visit']
        results=self.parallel([['engine/engine.py','123','dungeon_safe',ex['choice_id']] for _ in range(4)])
        self.assertEqual(sum(r['ok'] for r in results),1)
        self.assertEqual(engine.load_state('123')['walk_energy']['charges'],0)

    def test_loss_ends_expedition_and_retry_starts_at_first_stage(self):
        self.opened()
        ex=self.enter();original=engine.simulate_battle
        def lose(*args):
            result=original(*args,rng=random.Random(42));result['outcome']='lose';return result
        with patch.object(engine,'simulate_battle',side_effect=lose):run=self.choose(ex)
        self.assertEqual(run['coins_awarded'],0)
        self.assertEqual(self.enter(request='retry')['index'],0)
        self.assertEqual(engine.load_state('123')['walk_energy']['charges'],3)

    def test_sanctuary_choice_changes_healing_and_coins(self):
        for choice,heal,coins in [('safe',.5,0),('risk',.2,2)]:
            self.opened(training_bonus={'atk':100,'def':100,'hp':100})
            ex=self.enter();st=engine.load_state('123')
            # Select a discovery with a sanctuary, preserving its deterministic plan.
            day=next('2026-10-'+str(d).zfill(2) for d in range(1,29) if len(dungeons.room_plan('hellgate','2026-10-'+str(d).zfill(2)))>=4)
            ex.update(boss_date=day,room_count=len(dungeons.room_plan('hellgate',day)))
            ex.update(index=ex['room_count']-3,event='sanctuary',hp=10)
            st['dungeons']['expedition']=ex;engine.save_state(st)
            run=self.choose(ex,choice)
            self.assertEqual(run['hp_me'],round(min(ex['max_hp'],10+ex['max_hp']*heal),2))
            self.assertEqual(run['route_coins'],coins)
            dungeons.validate(engine.load_state('123'))

    def test_legacy_replay_and_corrupt_new_stage_validation(self):
        self.opened(training_bonus={'atk':100,'def':100})
        ex=self.enter();self.choose(ex)
        st=engine.load_state('123');bad=copy.deepcopy(st)
        bad['dungeons']['last_run']['rooms'][0]['index']=7
        with self.assertRaises(ValueError):dungeons.validate(bad)
        old=st['dungeons']['last_run'];old.pop('format');old.pop('rooms');old.pop('room_count');old['coins_awarded']=10
        dungeons.validate(st)

    def test_trap_at_one_hp_does_not_pay_for_a_failed_shortcut(self):
        self.opened();ex=self.enter();st=engine.load_state('123')
        st['dungeons']['expedition']['hp']=1;engine.save_state(st)
        with patch.object(engine.random,'random',return_value=0):run=self.choose(ex,'risk')
        self.assertEqual(run['route_coins'],0)
        self.assertEqual(run['rooms'][0]['start_hp'],1)
