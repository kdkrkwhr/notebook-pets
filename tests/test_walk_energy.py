"""Recharge boundaries, exclusive outcomes and durable replay guarantees."""
import unittest
from unittest.mock import patch
import test_p0
import engine

class WalkEnergyTests(unittest.TestCase):
    setUp = test_p0.RuntimeTests.setUp
    seed = test_p0.RuntimeTests.seed
    parallel = test_p0.RuntimeTests.parallel

    def test_old_save_gets_full_capacity_without_read_write(self):
        self.seed()
        before = (self.state/'123.json').read_bytes()
        self.assertEqual(engine.execute('123','status')['walk_energy']['charges'],5)
        self.assertEqual((self.state/'123.json').read_bytes(),before)

    def test_capacity_and_exact_recharge_boundary(self):
        self.seed()
        with patch.object(engine.time,'time',return_value=1000), patch.object(engine.random,'random',return_value=.9):
            for i in range(5): self.assertTrue(engine.execute('123','walk',request_id=f'w{i}')['ok'])
            self.assertEqual(engine.execute('123','walk')['code'],'walk_recharging')
        st=engine.load_state('123')
        self.assertEqual(engine.walk_energy(st,1299)['charges'],0)
        self.assertEqual(engine.walk_energy(st,1300)['charges'],1)
        self.assertEqual(engine.walk_energy(st,1600)['charges'],2)
        self.assertEqual(engine.walk_energy(st,100000)['charges'],5)
        self.assertEqual(engine.walk_energy(st,900)['charges'],0)

    def test_partial_refill_keeps_remainder_and_full_discards_bank(self):
        self.seed(walk_energy={'charges':0,'updated_at':1000})
        with patch.object(engine.time,'time',return_value=1350), patch.object(engine.random,'random',return_value=.9):
            self.assertTrue(engine.execute('123','walk')['ok'])
        st=engine.load_state('123')
        self.assertEqual(st['walk_energy'],{'charges':0,'updated_at':1300})
        self.assertEqual(engine.walk_energy(st,1600)['charges'],1)
        with patch.object(engine.time,'time',return_value=10000), patch.object(engine.random,'random',return_value=.9):
            engine.execute('123','walk')
        self.assertEqual(engine.walk_energy(engine.load_state('123'),10001)['charges'],4)

    def test_roll_boundaries_are_exclusive(self):
        for roll,outcome in [(0,'encounter'),(.199999,'encounter'),(.2,'xp'),(.499999,'xp'),(.5,'quiet'),(.9999,'quiet')]:
            self.seed()
            with patch.object(engine.random,'random',return_value=roll):
                result=engine.execute('123','walk')
            self.assertEqual(result['walk_outcome'],outcome)
            self.assertEqual(result['encounter'],outcome=='encounter')
            self.assertEqual(result['walk_energy']['charges'],4)
            if outcome=='xp': self.assertIn(result['xp_result']['gained'],[10,20,30])
            else: self.assertEqual(result['xp_result']['gained'],0)

    def test_all_xp_rewards_and_receipt_replay(self):
        for amount in [10,20,30]:
            self.seed()
            with patch.object(engine.random,'random',return_value=.3), patch.object(engine.random,'choice',return_value=amount):
                result=engine.execute('123','walk',request_id='walk-retry')
            self.assertEqual(result['xp_result']['gained'],amount)
            before=(self.state/'123.json').read_bytes()
            with patch.object(engine.random,'random',side_effect=AssertionError('rerolled')):
                self.assertEqual(engine.execute('123','walk',request_id='walk-retry'),result)
            self.assertEqual((self.state/'123.json').read_bytes(),before)

    def test_midnight_does_not_reset_energy(self):
        st=self.seed(walk_energy={'charges':0,'updated_at':1000})
        st['daily']['date']='2020-01-01'
        engine.fresh_daily(st)
        self.assertEqual(engine.walk_energy(st,1299)['charges'],0)

    def test_pending_encounter_does_not_consume_charge(self):
        self.seed()
        with patch.object(engine.random,'random',return_value=0): engine.execute('123','walk')
        before=(self.state/'123.json').read_bytes()
        self.assertEqual(engine.execute('123','walk')['code'],'encounter_pending')
        self.assertEqual((self.state/'123.json').read_bytes(),before)

    def test_concurrent_requests_cannot_spend_more_than_capacity(self):
        self.seed(walk_energy={'charges':1,'updated_at':__import__('time').time()})
        results=self.parallel([['engine/engine.py','123','walk'] for _ in range(8)])
        self.assertEqual(sum(result['ok'] for result in results),1)

    def test_invalid_energy_is_rejected(self):
        for energy in [{'charges':6,'updated_at':1},{'charges':True,'updated_at':1},{'charges':1,'updated_at':float('nan')}]:
            with self.assertRaises(engine.GameError): self.seed(walk_energy=energy)
