import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWalkStories,storyEvent,basicStory,parseStory} from '../bundle/walk-stories.mjs';
import {TOMBSTONE} from '../bundle/data.mjs';
const event={id:'walk-1',pet_id:'pet',name:'Buddy',species:'Fairy',element:'Nature',language:'en'};
function fixture(){
 const f={row:{exists:false},pet:'pet',ai:0,failAI:false,failSave:false,states:[]};
 const storage={get:async()=>structuredClone(f.row),set:async({value,if_match})=>{
  if(f.failSave)throw Error('offline');
  if(if_match!==f.row.etag)throw {code:-32023};
  f.row={exists:true,etag:String(Number(f.row.etag||0)+1),value:structuredClone(value)};
 }};
 f.host={anna:()=>({storage,llm:{complete:async()=>{f.ai++;if(f.aiWait)await f.aiWait;if(f.failAI)throw Error('offline');return {content:{text:JSON.stringify({...basicStory('en'),title:'AI story'})}};}}}),active:async()=>({status:{},pet_id:f.pet}),locked:()=>false,render:s=>f.states.push(structuredClone(s))};
 f.flow=createWalkStories(f.host);return f;
}
test('only a stable subset of successful quiet walks qualify',()=>{
 const result={ok:true,pet_id:'pet',status:{name:'Buddy'}};
 assert.equal(storyEvent('walk','x',{...result,walk_outcome:'xp'},'en'),null);
 assert.equal(storyEvent('walk','x',{...result,ok:false,walk_outcome:'quiet'},'en'),null);
 const events=Array.from({length:100},(_,i)=>storyEvent('walk','walk'+i,{...result,walk_outcome:'quiet'},'en'));
 assert.equal(events.filter(Boolean).length,50);
 assert.deepEqual(storyEvent('walk','walk0',{...result,walk_outcome:'quiet'},'en'),events[0]);
});
test('untrusted output requires exactly two bounded complete branches',()=>{
 assert.equal(parseStory(JSON.stringify(basicStory('ko'))).choices.length,2);
 for(const value of ['bad','{}',JSON.stringify({...basicStory('en'),scene:'x'.repeat(701)}),JSON.stringify({...basicStory('en'),choices:[]})])assert.throws(()=>parseStory(value));
});
test('one AI request, persisted choice, reopen and duplicate start never regenerate',async()=>{
 const f=fixture();await f.flow.start(event);assert.equal(f.ai,1);
 await f.flow.choose(1);assert.equal(f.row.value.current.choice,1);
 await f.flow.choose(0);assert.equal(f.row.value.current.choice,1);
 const reopened=createWalkStories(f.host);await reopened.load({status:{},pet_id:'pet'});await reopened.start(event);
 assert.equal(f.ai,1);assert.equal(f.row.value.current.state,'done');
});
test('AI failure falls back and choice never invokes game mutations or AI',async()=>{
 const f=fixture();f.failAI=true;await f.flow.start(event);
 assert.equal(f.row.value.current.fallback,true);await f.flow.choose(0);assert.equal(f.ai,1);assert.equal(f.row.value.current.state,'done');
});
test('failed reservation spends no AI; failed choice is retryable',async()=>{
 const f=fixture();f.failSave=true;await f.flow.start(event);assert.equal(f.ai,0);
 f.failSave=false;await f.flow.start(event);f.failSave=true;await f.flow.choose(0);assert.equal(f.row.value.current.state,'ready');
 f.failSave=false;await f.flow.choose(0);assert.equal(f.row.value.current.state,'done');assert.equal(f.ai,1);
});
test('reopening interrupted generation offers basic ending and late AI cannot replace it',async()=>{
 const f=fixture();let release;f.aiWait=new Promise(r=>release=r);const work=f.flow.start(event);
 while(!f.ai)await new Promise(r=>setTimeout(r,0));
 const reopened=createWalkStories(f.host);await reopened.load({status:{},pet_id:'pet'});await reopened.choose(1);
 release();await work;assert.equal(f.row.value.current.choice,1);assert.equal(f.row.value.current.story.title,basicStory('en').title);assert.equal(f.ai,1);
});
test('two windows choosing differently preserve the first committed choice',async()=>{
 const f=fixture();await f.flow.start(event);const second=createWalkStories(f.host);await second.load({status:{},pet_id:'pet'});
 await Promise.all([f.flow.choose(0),second.choose(1)]);assert.equal(f.row.value.current.choice,0);assert.equal(f.ai,1);
});
test('reset or removal during generation cannot write the old pet story',async()=>{
 for(const remove of [false,true]){
  const f=fixture();let release;f.aiWait=new Promise(r=>release=r);const work=f.flow.start(event);while(!f.ai)await new Promise(r=>setTimeout(r,0));
  if(remove)f.row={exists:true,etag:'9',value:TOMBSTONE};else{f.pet='new';f.flow.clear();f.row={exists:true,etag:'9',value:{}};}
  release();await work;assert.deepEqual(f.row.value,remove?TOMBSTONE:{});
 }
});
