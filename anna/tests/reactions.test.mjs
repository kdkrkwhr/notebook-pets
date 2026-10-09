import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReactions} from '../bundle/reactions.mjs';
import {mergeHistory} from '../bundle/model.mjs';
const view={ok:true,pet_id:'pet',status:{name:'Buddy',species:'Fairy',element:'Nature',mood:'happy',level:1},msg:'Food enjoyed',xp_result:{gained:10}};
function fixture(options={}){
 let history=[],stored=[],count=0,active=true,failSave=false;
 const r=createReactions({getHistory:()=>history,setHistory:x=>history=x,enabled:()=>options.enabled??true,
 isCurrent:()=>active,changed:()=>{},save:async(pet,entries)=>{if(failSave)throw Error('offline');stored=mergeHistory(stored,entries);return stored;},
 generate:async()=>{count++;if(options.generate)return options.generate();return {content:{text:'Yum!'}};}});
 return {r,get history(){return history;},get stored(){return stored;},get count(){return count;},failSave(v){failSave=v;},stop(){active=false;r.clear();history=[];}};
}
test('basic responses work without AI; failed actions have no history',async()=>{
 const f=fixture({enabled:false});await f.r.handle(view,'feed','a','en');
 assert.equal(f.count,0);assert.equal(f.stored.length,2);assert.equal(f.history[1].source,'basic');
 await f.r.handle({...view,ok:false},'play','b','en');assert.equal(f.history.length,2);
});
test('replayed receipt and duplicate callback never request another AI reply',async()=>{
 const f=fixture();await f.r.handle(view,'feed','a','en');await f.r.handle(view,'feed','a','en');
 assert.equal(f.count,1);assert.equal(f.history.length,2);
 const g=fixture();await g.r.handle({...view,replayed:true},'feed','a','en');assert.equal(g.count,0);
});
test('failed AI keeps saved basic response and does not regenerate on storage retry',async()=>{
 const f=fixture({generate:()=>{throw Error('quota');}});await f.r.handle(view,'feed','a','en');await f.r.retry();
 assert.equal(f.count,1);assert.equal(f.stored[1].source,'basic');
});
test('storage recovery retains the same AI reply across refresh and retry',async()=>{
 const f=fixture();f.failSave(true);await f.r.handle(view,'feed','a','en');
 assert.equal(f.r.pending,1);assert.equal(f.r.restore([])[1].source,'ai');
 f.failSave(false);await f.r.retry();await f.r.retry();
 assert.equal(f.r.pending,0);assert.equal(f.count,1);assert.equal(f.stored.length,2);assert.equal(f.stored[1].text,'Yum!');
});
test('rapid actions do not queue paid calls; cleared companion ignores late response',async()=>{
 let done,started;const begun=new Promise(r=>started=r);
 const f=fixture({generate:()=>{started();return new Promise(r=>done=r);}});
 const first=f.r.handle(view,'feed','a','en');await begun;
 await f.r.handle(view,'play','b','en');assert.equal(f.count,1);assert.equal(f.history.length,4);
 f.stop();done({content:{text:'late reply'}});await first;
 assert.equal(f.history.length,0);assert.equal(f.r.pending,0);assert.ok(!f.stored.some(x=>x.text==='late reply'));
});
