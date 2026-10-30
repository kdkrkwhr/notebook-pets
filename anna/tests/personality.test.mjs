import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPersonality,parsePersonality,personalityPrompt} from '../bundle/personality.mjs';
import {TOMBSTONE} from '../bundle/data.mjs';
const raw={traits:{curiosity:1,warmth:0,energy:-1,caution:0},summary:{en:'Mochi is round and curious.',ko:'모찌는 둥글고 호기심이 많아요.'},voice:{en:'Gentle short sentences',ko:'짧고 다정한 말'},habit:{en:'Tilts their head',ko:'고개를 갸웃해요'}};
function fixture(){
 const f={view:{pet_id:'pet',status:{name:'Mochi',personality:null}},row:{exists:false},ai:0,features:0,commits:0,fail:false};
 const h={active:async()=>structuredClone(f.view),render:s=>f.display=s,saved:v=>f.view=v,
  anna:()=>({storage:{get:async()=>structuredClone(f.row),set:async({value})=>{if(f.failSave||f.failReady&&value.state==='ready')throw Error('offline');f.row={exists:true,value:structuredClone(value),etag:'1'};}},llm:{complete:async()=>{f.ai++;if(f.wait)await f.wait;if(f.fail)throw Error('AI failed');return {content:{text:JSON.stringify(raw)}};}}}),
  features:async()=>{f.features++;return {appearance:'round face',source:'reference'};},
  commit:async(view,profile)=>{f.commits++;f.view={...f.view,ok:true,status:{...f.view.status,personality:{origin:JSON.parse(profile)}}};if(f.lost){f.lost=false;throw Error('response lost');}return structuredClone(f.view);}};
 f.h=h;f.flow=createPersonality(h);return f;
}
test('both name and actual appearance are explicit inputs, untrusted fields are bounded',()=>{
 const prompt=personalityPrompt('Mochi','round face, no wings');assert.match(prompt,/Mochi/);assert.match(prompt,/round face, no wings/);
 const p=parsePersonality({content:{text:JSON.stringify(raw)}},'round face','reference');assert.equal(p.source,'reference');
 const multilingual=structuredClone(raw);for(const key of ['summary','voice','habit'])multilingual[key].ja='優しい友達';
 const native=parsePersonality({content:{text:JSON.stringify(multilingual)}},'round face','reference');assert.equal(native.summary.ja,'優しい友達');assert.equal(native.summary.en,raw.summary.en);assert.match(personalityPrompt('Feed','round','zh-Hant'),/zh-Hant/);
 assert.throws(()=>parsePersonality({content:{text:JSON.stringify({...raw,traits:{...raw.traits,energy:99}})}},'round','reference'));
 assert.throws(()=>parsePersonality({stopReason:'contentFilter'},'round','reference'));
});
test('initial character is saved once, existing personality never invokes AI again',async()=>{
 const f=fixture();await f.flow.run(true);await f.flow.run();assert.equal(f.ai,1);assert.equal(f.commits,1);assert.equal(f.features,1);
});
test('lost commit reply is recovered from game state without regenerating or committing twice',async()=>{
 const f=fixture();f.lost=true;await f.flow.run();assert.equal(f.display.feedback,'personalitySaveFailed');await f.flow.run();
 assert.equal(f.ai,1);assert.equal(f.commits,1);
});
test('interrupted automatic generation does not silently spend again; explicit retry does',async()=>{
 const f=fixture();f.fail=true;await f.flow.run(true);f.fail=false;await f.flow.run(true);assert.equal(f.ai,1);
 await f.flow.run();assert.equal(f.ai,2);assert.equal(f.commits,1);
});
test('ready draft retries only the commit and reset cancels in-flight work',async()=>{
 const f=fixture();f.row={exists:true,etag:'1',value:{pet_id:'pet',state:'ready',output:parsePersonality({content:{text:JSON.stringify(raw)}},'round face','reference')}};
 await f.flow.run();assert.equal(f.ai,0);assert.equal(f.commits,1);
 const g=fixture();let release;g.wait=new Promise(r=>release=r);const task=g.flow.run();while(!g.ai)await new Promise(r=>setTimeout(r,0));
 g.flow.clear();g.view.pet_id='new';release();await task;assert.equal(g.commits,0);
});
test('a removal marker is never replaced by a personality draft',async()=>{
 const f=fixture();f.row={exists:true,etag:'1',value:TOMBSTONE};await f.flow.run();assert.equal(f.ai,0);assert.equal(f.commits,0);assert.deepEqual(f.row.value,TOMBSTONE);
});

test('received personality retries failed draft storage without another AI or vision request',async()=>{
 const f=fixture();f.failReady=true;await f.flow.run();assert.equal(f.ai,1);assert.equal(f.commits,0);
 f.failReady=false;await f.flow.run();assert.equal(f.ai,1);assert.equal(f.features,1);assert.equal(f.commits,1);
});

test('reservation failure spends no AI and a reset discards an unsaved received draft',async()=>{
 const f=fixture();f.failSave=true;await f.flow.run();assert.equal(f.ai,0);assert.equal(f.features,0);
 f.failSave=false;f.failReady=true;await f.flow.run();assert.equal(f.ai,1);assert.equal(f.commits,0);
 f.flow.clear();f.view.pet_id='new';f.failReady=false;await f.flow.run();assert.equal(f.ai,2);assert.equal(f.commits,1);assert.equal(f.row.value.pet_id,'new');
});
