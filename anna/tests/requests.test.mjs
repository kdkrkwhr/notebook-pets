import test from 'node:test';
import assert from 'node:assert/strict';
import {newAction,errorText} from '../bundle/model.mjs';

test('new actions use the latest prefix while an uncertain retry keeps its entire ID',()=>{
  const pending=newAction({request_id_prefix:'nb2:18:'},'feed',{},()=> 'fixed-id');
  const refreshed={request_id_prefix:'nb2:19:'};
  assert.equal(pending.request_id,'nb2:18:fixed-id');
  assert.equal(newAction(refreshed,'play',{},()=> 'next').request_id,'nb2:19:next');
  assert.equal(pending.request_id,'nb2:18:fixed-id');
});

test('old runtime responses cannot silently issue an unsequenced mutation',()=>{
  for(const view of [null,{}, {request_id_prefix:'bad:'}, {request_id_prefix:'nb2:01:'}])
    assert.throws(()=>newAction(view,'feed',{},()=> 'id'),/Refresh/);
});

test('APS size and storage quota errors are not presented as AI credit failures',()=>{
  for(const code of [-32024,-32025]) {
    assert.match(errorText({code},'en'),/storage/);
    assert.match(errorText({details:{jsonrpc_code:code}},'ko'),/저장/);
    assert.doesNotMatch(errorText({code},'en'),/AI allowance/);
  }
});
