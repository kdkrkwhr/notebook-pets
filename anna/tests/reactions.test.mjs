import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reactionEvent,reactionPrompt,createReactions} from '../bundle/reactions.mjs';
test('reactions require a successful authoritative care result and stable receipt',()=>{
 const result={ok:true,pet_id:'one',status:{name:'Mochi',level:1},msg:'Quiet walk',walk_outcome:'quiet',xp_result:{gained:0}};
 for(const command of ['status','start','reset'])assert.equal(reactionEvent(command,'id',result,'en'),null);
 assert.equal(reactionEvent('feed','id',{...result,ok:false},'en'),null);
 const first=reactionEvent('walk','id',result,'ko'),retry=reactionEvent('walk','id',result,'ko');
 assert.equal(first.id,retry.id);assert.match(reactionPrompt(first),/Reply in Korean/);assert.match(reactionPrompt(first),/"xp":0/);assert.match(reactionPrompt(first),/"walk_outcome":"quiet"/);
 result.status.level=99;assert.equal(first.status.level,1);
});

async function settled(controller){for(let i=0;i<100&&controller.isWorking();i++)await new Promise(r=>setTimeout(r,1));assert.equal(controller.isWorking(),false);}
test('one page and existing storage reservations suppress repeated paid calls',async()=>{
 let value=[],calls=0;
 const storage={get:async()=>({value,exists:true,etag:'e'}),set:async args=>{value=args.value;}};
 const hooks={anna:()=>({storage,llm:{complete:async()=>{calls++;return {content:{text:'Yum!'}};}}}),active:async()=>({pet_id:'one'}),saved:()=>{},render:()=>{},feedback:()=>{}};
 const event=()=>reactionEvent('feed','receipt',{ok:true,pet_id:'one',status:{name:'Mochi'}},'en');
 const first=createReactions(hooks);first.enqueue(event());first.enqueue(event());await settled(first);assert.equal(calls,1);assert.equal(value.length,1);assert.equal(value[0].state,'done');
 const reopened=createReactions(hooks);reopened.enqueue(event());await settled(reopened);assert.equal(calls,1);
});
test('unavailable reservation storage prevents the AI request',async()=>{
 let calls=0;
 const controller=createReactions({anna:()=>({storage:{get:async()=>{throw Error('offline');}},llm:{complete:async()=>{calls++;}}}),active:async()=>({pet_id:'one'}),saved:()=>{},render:()=>{},feedback:()=>{}});
 controller.enqueue(reactionEvent('feed','receipt',{ok:true,pet_id:'one',status:{name:'Mochi'}},'en'));await settled(controller);assert.equal(calls,0);
});
