import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWalkStories,storyPrompt} from '../bundle/walk-stories.mjs';
import {journeyStory,journeyInfluence} from '../bundle/journey-stories.mjs';
const j={choice_id:'a'.repeat(32),arc:'trail',chapter:0,prepared:true,basis:['feed','train','walk'],previous_choice:null,state:'pending',choice:null,coins:0,intimacy:0};
function fixture(){
 const f={view:{pet_id:'p',status:{journey:structuredClone(j)}},row:{},ai:0,resolves:0,rewards:0,failSave:false};
 const h={language:()=> 'en',active:async()=>structuredClone(f.view),locked:()=>false,render:s=>f.rendered=structuredClone(s),
  anna:()=>({storage:{get:async()=>structuredClone(f.row),set:async({value})=>{if(f.failSave)throw Error('offline');f.row={exists:true,etag:'1',value:structuredClone(value)};}},llm:{complete:async()=>{f.ai++;return {content:{text:JSON.stringify({title:'AI title',scene:'The trail awaits.',choices:[{label:'Invented reward',ending:'Incorrect'},{label:'Another invention',ending:'Incorrect'}]})}};}}}),
  resolve:async(event,index)=>{f.resolves++;if(f.view.status.journey.state!=='done'){Object.assign(f.view.status.journey,{state:'done',choice:index,intimacy:3});f.rewards++;}if(f.lost){f.lost=false;throw Error('response lost');}return structuredClone(f.view);}};
 f.h=h;f.flow=createWalkStories(h);f.event={id:j.choice_id,pet_id:'p',language:'en',name:'Buddy',journey:structuredClone(j),memories:{recent:['feed','train']}};return f;
}
test('all chapters and preparations have bilingual distinct complete branches',()=>{
 for(const arc of ['trail','garden','shelter'])for(let chapter=0;chapter<3;chapter++)for(const language of ['ko','en']){
  const story=journeyStory({...j,arc,chapter},language);assert.equal(story.choices.length,2);assert.notEqual(story.choices[0].ending,story.choices[1].ending);
  assert.notEqual(story.scene,journeyStory({...j,arc,chapter,prepared:false},language).scene);
 }
});
test('AI receives actual accumulated memory; cannot change offered choices or rewards',async()=>{
 const f=fixture();await f.flow.start(f.event);
 assert.match(storyPrompt(f.event),/feed/);assert.equal(f.rendered.current.story.title,'AI title');
 assert.deepEqual(f.rendered.current.story.choices,journeyStory(j,'en').choices);
 await f.flow.choose(0);await f.flow.choose(1);assert.equal(f.resolves,1);assert.equal(f.rewards,1);
});
test('lost game response is recoverable without duplicate rewards or extra AI',async()=>{
 const f=fixture();await f.flow.start(f.event);f.lost=true;await f.flow.choose(1);
 assert.equal(f.rendered.feedback,'storySaveFailed');await f.flow.choose(1);
 assert.equal(f.rewards,1);assert.equal(f.rendered.current.choice,1);assert.equal(f.ai,1);
});
test('failed prose storage cannot lose committed result; fresh load restores it',async()=>{
 const f=fixture();await f.flow.start(f.event);f.failSave=true;await f.flow.choose(1);
 assert.equal(f.rendered.current.state,'done');const next=createWalkStories(f.h);await next.load(f.view);
 assert.equal(f.rendered.current.state,'done');assert.equal(f.rendered.current.choice,1);assert.equal(f.rewards,1);
});
test('missing story record recovers pending game with no paid generation',async()=>{
 const f=fixture();await f.flow.load(f.view);assert.equal(f.rendered.current.state,'ready');
 await f.flow.choose(0);assert.equal(f.rewards,1);assert.equal(f.ai,0);
});
test('another window deciding first displays its canonical choice',async()=>{
 const f=fixture();await f.flow.start(f.event);Object.assign(f.view.status.journey,{state:'done',choice:1,intimacy:3});
 await f.flow.choose(0);assert.equal(f.rendered.current.choice,1);assert.equal(f.rewards,0);
});
test('existing pending legacy stories remain selectable without new game consequences',async()=>{
 const f=fixture();const event={...f.event,id:'legacy',journey:undefined};await f.flow.start(event);await f.flow.load(f.view);
 assert.equal(f.rendered.current.id,'legacy');await f.flow.choose(0);assert.equal(f.resolves,0);
});

test('a stale prose record cannot block the next authoritative chapter',async()=>{
 const f=fixture();await f.flow.start(f.event);f.failSave=true;await f.flow.choose(0);
 f.failSave=false;const next={...j,choice_id:'b'.repeat(32),chapter:1,previous_choice:0};
 f.view.status.journey=next;await f.flow.start({...f.event,id:next.choice_id,journey:next});
 assert.equal(f.rendered.current.id,next.choice_id);assert.equal(f.ai,2);
});

test('previous safe route changes the next available approach',()=>{
 const first=journeyStory({...j,chapter:1,previous_choice:0},'en');
 const second=journeyStory({...j,chapter:1,previous_choice:1},'en');
 assert.notEqual(first.choices[0].label,second.choices[0].label);
});

test('all six arcs and locations have distinct chapter endings and explain only actual evidence',()=>{
 const titles=new Set();
 for(const arc of ['trail','garden','shelter','river','workshop','market'])for(let chapter=0;chapter<3;chapter++)for(let variant=0;variant<3;variant++){
  const s=journeyStory({...j,arc,chapter,variant},'en');titles.add(s.title);assert.notEqual(s.choices[0].ending,s.choices[1].ending);
 }
 assert.equal(titles.size,54);
 const evidence={actions:['feed'],missing:['train'],support_used:true};
 const text=journeyInfluence({...j,chapter:1,previous_choice:1,evidence},'en');assert.match(text,/feeding/);assert.match(text,/earlier safe choice/);assert.doesNotMatch(text,/training/);
 assert.equal(journeyInfluence(j,'en'),'');
});
