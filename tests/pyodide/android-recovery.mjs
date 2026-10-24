// No model or network: exercise the actual Android bridge at failure boundaries.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const moduleURL=async file=>'data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../../android/game/'+file,import.meta.url))).toString('base64')+'#'+crypto.randomUUID();
async function bridge(post){
 const window=new EventTarget();window.NoteBuddyNative={postMessage:post};globalThis.window=window;
 return {window,...await import(await moduleURL('native.js'))};
}
test('failed native send cleans up; a subsequent request still completes',async()=>{
 const b=await bridge(()=>{throw Error('bridge closed');});
 const phases=[];b.window.addEventListener('native-ai',e=>phases.push(e.detail.phase));
 await assert.rejects(b.call('complete'),/전달하지/);
 b.window.NoteBuddyNative.postMessage=raw=>{const {id}=JSON.parse(raw);queueMicrotask(()=>b.window.NoteBuddyNative.onmessage({data:JSON.stringify({id,result:'okay'})}));};
 assert.equal(await b.call('complete'),'okay');assert.deepEqual(phases,['start','end','start','end']);
});
test('cancel remains settled when the native cancel send itself throws; late reply ignored',async()=>{
 let sent;const b=await bridge(raw=>{const r=JSON.parse(raw);if(r.action==='cancel')throw Error();sent=r;});
 const c=new AbortController(),p=b.call('complete',{},c.signal);c.abort();
 await assert.rejects(p,/멈췄/);
 b.window.NoteBuddyNative.onmessage({data:JSON.stringify({id:sent.id,result:'late'})});
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(b.call('complete',{},cancelled.signal),/취소/);
});
test('new documents do not accept the old document request id',async()=>{
 let oldId,newId;await (async()=>{const b=await bridge(raw=>oldId=JSON.parse(raw).id);const c=new AbortController(),p=b.call('complete',{},c.signal);c.abort();await p.catch(()=>{});})();
 const b=await bridge(raw=>newId=JSON.parse(raw).id),p=b.call('complete');let settled=false;p.then(()=>settled=true);
 b.window.NoteBuddyNative.onmessage({data:JSON.stringify({id:oldId,result:'wrong'})});await Promise.resolve();assert.equal(settled,false);
 assert.notEqual(oldId,newId);assert.match(newId,/^[A-Za-z0-9-]{1,64}$/);
 b.window.NoteBuddyNative.onmessage({data:JSON.stringify({id:newId,result:'right'})});assert.equal(await p,'right');
});
test('timeout cleans up and cancels the specific native request',async()=>{
 const realTimer=globalThis.setTimeout;let expire;const sent=[];
 const b=await bridge(raw=>sent.push(JSON.parse(raw)));
 try{globalThis.setTimeout=callback=>{expire=callback;return 0;};const p=b.call('complete');expire();await assert.rejects(p,/時間|시간/);assert.equal(sent[1].payload.target,sent[0].id);}
 finally{globalThis.setTimeout=realTimer;}
});
test('draft survives recreation, stays bounded and is invalidated on replacement',async()=>{
 const {createDrafts}=await import(await moduleURL('drafts.js'));
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 function mount(){const input=new EventTarget();input.value='';const document=new EventTarget();document.defaultView=new EventTarget();document.getElementById=()=>input;return {input,document,drafts:createDrafts(document,storage,'test-only')};}
 let m=mount();await m.drafts.session('pet',4);m.input.value='다음에 이어 쓸 이야기';await m.drafts.write();
 m=mount();await m.drafts.session('pet',4);assert.equal(m.input.value,'다음에 이어 쓸 이야기');
 m.input.value='x'.repeat(1000);await m.drafts.write();m=mount();await m.drafts.session('pet',4);assert.equal(m.input.value.length,500);
 await m.drafts.session('pet',5);assert.equal(m.input.value,'');assert.equal(data.size,0);
 m.input.value='another';await m.drafts.write();await m.drafts.session('other-pet',5);assert.equal(m.input.value,'');
 m.input.value='sent';await m.drafts.write();await m.drafts.clear();assert.equal(data.size,0);
});
test('unavailable or corrupt draft storage never prevents startup',async()=>{
 const {createDrafts}=await import(await moduleURL('drafts.js'));
 for(const storage of [null,{getItem:()=>'{broken',removeItem(){}},{getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}}]){
  const input=new EventTarget();input.value='';const document=new EventTarget();document.defaultView=new EventTarget();document.getElementById=()=>input;
  const d=createDrafts(document,storage,'test');await assert.doesNotReject(async()=>{await d.session('pet',1);input.value='draft';await d.write();await d.clear();});
 }
});
