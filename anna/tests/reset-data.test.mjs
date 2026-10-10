import {test} from 'node:test';
import assert from 'node:assert/strict';
import {finishReset} from '../bundle/reset-data.mjs';
import {CHAT,ART} from '../bundle/data.mjs';
function fixture(){
 const rows=new Map([[CHAT,{value:['old chat'],etag:'1'}],[ART,{value:{old:'portrait'},etag:'1'}]]);
 const blobs=new Map([['portraits/old/a.png','a'],['portraits/old/b.png','b']]);
 const f={rows,blobs,pending:true,finished:0};
 f.storage={get:async({key})=>structuredClone(rows.get(key)),set:async({key,value,if_match})=>{const row=rows.get(key);if(row.etag!==if_match)throw Error('conflict');rows.set(key,{value,etag:String(+row.etag+1)});}};
 f.files={list:async()=>({items:[...blobs].map(([path,etag])=>({path,etag}))}),delete:async({path,if_match})=>{assert.equal(if_match,blobs.get(path));blobs.delete(path);}};
 f.call=async args=>{if(args.action==='inspect')return {ok:true,reset_pending:f.pending,reset_id:'id'};f.finished++;f.pending=false;return {ok:true,reset_complete:true};};
 return f;
}
test('reset clears old app records and portraits before finishing, without permanent removal markers',async()=>{
 const f=fixture();await finishReset(f,f.call,'id');assert.equal(f.finished,1);assert.equal(f.blobs.size,0);
 assert.deepEqual(f.rows.get(CHAT).value,[]);assert.deepEqual(f.rows.get(ART).value,{});
});
test('reset cleanup interruption remains pending and can resume',async()=>{
 const f=fixture(),del=f.files.delete;let first=true;f.files.delete=async args=>{if(first){first=false;throw Error('offline');}return del(args);};
 await assert.rejects(finishReset(f,f.call,'id'));assert.equal(f.finished,0);await finishReset(f,f.call,'id');assert.equal(f.finished,1);
});
test('stale reset cannot clear a new conversation or delete another scope',async()=>{
 const f=fixture();f.pending=false;await assert.rejects(finishReset(f,f.call,'id'));assert.deepEqual(f.rows.get(CHAT).value,['old chat']);assert.equal(f.blobs.size,2);
 const g=fixture();g.files.list=async()=>({items:[{path:'outside/a',etag:'a'}]});await assert.rejects(finishReset(g,g.call,'id'));assert.equal(g.finished,0);assert.equal(g.blobs.size,2);
});

test('only an explicitly pending removed-game restart can replace app tombstones',async()=>{
 const f=fixture();for(const row of f.rows.values())row.value={_notebuddy_erased:1};
 await assert.rejects(finishReset(f,f.call,'id'));assert.equal(f.finished,0);
 const call=f.call;f.call=async args=>({...await call(args),...(args.action==='inspect'?{reset_from_erasure:true}:{})});
 await finishReset(f,f.call,'id');assert.deepEqual(f.rows.get(CHAT).value,[]);assert.deepEqual(f.rows.get(ART).value,{});assert.equal(f.finished,1);
 const g=fixture();g.rows.get(CHAT).value={_notebuddy_erased:1};g.rows.get(CHAT).etag=undefined;
 const inspect=g.call;g.call=async args=>({...await inspect(args),reset_from_erasure:true});
 await assert.rejects(finishReset(g,g.call,'id'),/Conditional writes/);assert.equal(g.finished,0);
});
