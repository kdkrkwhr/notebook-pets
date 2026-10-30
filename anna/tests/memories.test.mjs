import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMemories,keepsake,changeMemory,writeMemory,MemoryError} from '../bundle/memories.mjs';
import {MEMORIES,TOMBSTONE,removeAppData,ErasedError} from '../bundle/data.mjs';
import {finishReset} from '../bundle/reset-data.mjs';
const message=(id='one',text='  original\n말  ')=>( {id,role:'assistant',text,at:1700000000123});
function fixture(value){
 let row=value===undefined?{exists:false}:{exists:true,value,etag:'1'},writes=0;
 const f={get row(){return row;},set row(v){row=v;},get writes(){return writes;}};
 f.storage={get:async()=>structuredClone(row),set:async({key,value,if_match})=>{assert.equal(key,MEMORIES);if(if_match&&if_match!==row.etag)throw {code:-32023};row={exists:true,value:structuredClone(value),etag:String(++writes+1)};}};
 f.active=async()=>({pet_id:'pet',status:{}});return f;
}
test('keepsakes preserve exact text and stable identity, including legacy messages',()=>{
 const a=keepsake(message());assert.equal(a.text,'  original\n말  ');assert.equal(a.at,1700000000123);
 assert.deepEqual(keepsake(message()),a);assert.notEqual(keepsake(message('two')).id,a.id);
 const old={role:'user',text:'Legacy',at:1700000000000};assert.deepEqual(keepsake(old),keepsake({...old}));
 assert.notEqual(keepsake({...old,text:'Other'}).id,keepsake(old).id);
 const undated=keepsake({role:'user',text:'Older words without a date'});assert.equal(undated.at,null);
});
test('pending, failed and malformed messages cannot become keepsakes',()=>{
 for(const m of [{...message(),kind:'reaction',state:'pending'},{...message(),kind:'reaction',state:'failed'},{...message(),state:'pending'},{...message(),role:'system'},{...message(),at:NaN},{...message(),text:''}])assert.throws(()=>keepsake(m),MemoryError);
 assert.equal(keepsake({...message(),kind:'reaction',state:'done'}).text,message().text);
});
test('normalization rejects other pets, tombstones and malformed rows without dropping data',()=>{
 assert.deepEqual(normalizeMemories(undefined,'pet'),{version:1,pet_id:'pet',entries:[]});
 assert.deepEqual(normalizeMemories({},'pet').entries,[]);
 for(const row of [null,{version:1,pet_id:'other',entries:[]},{version:2,pet_id:'pet',entries:[]},{version:1,pet_id:'pet',entries:[{id:'bad'}]},{version:1,pet_id:'pet',entries:[keepsake(message()),keepsake(message())]},{version:1,pet_id:'pet',entries:[],extra:'unexpected'}])assert.throws(()=>normalizeMemories(row,'pet'),MemoryError);
 assert.throws(()=>normalizeMemories(TOMBSTONE,'pet'),ErasedError);
});
test('duplicate saves do not duplicate entries and deletion removes only requested keepsake',()=>{
 const a=keepsake(message()),b=keepsake(message('two'));
 const row=changeMemory(changeMemory(undefined,'pet',{add:a}),'pet',{add:b});
 assert.deepEqual(changeMemory(row,'pet',{add:a}),row);
 assert.deepEqual(changeMemory(row,'pet',{remove:a.id}).entries,[b]);assert.equal(row.entries.length,2);
});
test('limits reject new content without silently evicting or truncating saved notes',()=>{
 let row;for(let i=0;i<20;i++)row=changeMemory(row,'pet',{add:keepsake(message(String(i)))});
 assert.throws(()=>changeMemory(row,'pet',{add:keepsake(message('extra'))}),e=>e.code==='full');assert.equal(row.entries.length,20);
 assert.throws(()=>keepsake(message('large','a'.repeat(3001))),e=>e.code==='long');
 assert.equal(keepsake(message('edge','a'.repeat(3000))).text.length,3000);
 let big;for(let i=0;i<4;i++)big=changeMemory(big,'pet',{add:keepsake(message(String(i),'한'.repeat(3000)))});
 assert.throws(()=>changeMemory(big,'pet',{add:keepsake(message('byte-limit','한'.repeat(3000)))}),e=>e.code==='bytes');assert.equal(big.entries.length,4);
});
test('conditional conflicts merge concurrent notes and retrying a lost reply deduplicates',async()=>{
 const f=fixture(),set=f.storage.set,a=keepsake(message()),b=keepsake(message('two'));let first=true;
 f.storage.set=async args=>{if(first){first=false;f.row={exists:true,etag:'concurrent',value:changeMemory(undefined,'pet',{add:b})};throw {code:-32023};}return set(args);};
 await writeMemory(f.storage,f.active,'pet',{add:a});assert.deepEqual(f.row.value.entries.map(x=>x.text),[b.text,a.text]);
 f.storage.set=async args=>{await set(args);throw Error('reply lost');};await assert.rejects(writeMemory(f.storage,f.active,'pet',{add:a}),/reply lost/);
 f.storage.set=set;await writeMemory(f.storage,f.active,'pet',{add:a});assert.equal(f.row.value.entries.length,2);
});
test('save failures keep the same operation retryable and missing ETag never writes',async()=>{
 const f=fixture(),set=f.storage.set,operation={add:keepsake(message())};f.storage.set=async()=>{throw Error('offline');};
 await assert.rejects(writeMemory(f.storage,f.active,'pet',operation),/offline/);f.storage.set=set;
 await writeMemory(f.storage,f.active,'pet',operation);assert.equal(f.row.value.entries.length,1);
 delete f.row.etag;await assert.rejects(writeMemory(f.storage,f.active,'pet',operation),/Conditional/);assert.equal(f.writes,1);
 delete f.row.exists;await assert.rejects(writeMemory(f.storage,f.active,'pet',operation),/Conditional/);assert.equal(f.writes,1);
});
test('each attempt reads the row before checking active pet and fences reset after conflict',async()=>{
 const f=fixture(changeMemory(undefined,'pet',{add:keepsake(message())})),order=[],get=f.storage.get;let calls=0;
 f.storage.get=async args=>{order.push('read');return get(args);};
 f.active=async()=>{order.push('active');return {pet_id:++calls===1?'pet':'new',status:{}};};
 f.storage.set=async()=>{order.push('write');f.row={exists:true,etag:'reset',value:{}};throw {code:-32023};};
 await assert.rejects(writeMemory(f.storage,f.active,'pet',{add:keepsake(message('late'))}),e=>e.code==='changed');
 assert.deepEqual(order,['read','active','write','read','active']);assert.deepEqual(f.row.value,{});
});
test('inactive, resetting, erased and cross-pet rows reject delayed saves',async()=>{
 for(const state of [{pet_id:'other',status:{}},{pet_id:'pet',reset_pending:true,status:{}},{pet_id:'pet',erased:true},{pet_id:'pet'}]){
  const f=fixture();await assert.rejects(writeMemory(f.storage,async()=>state,'pet',{add:keepsake(message())}));assert.equal(f.writes,0);
 }
 for(const value of [TOMBSTONE,{version:1,pet_id:'other',entries:[]}]){const f=fixture(value);await assert.rejects(writeMemory(f.storage,f.active,'pet',{add:keepsake(message())}));assert.equal(f.writes,0);}
});
test('reset and erasure include independent memories storage',async()=>{
 const rows=new Map([[MEMORIES,{exists:true,etag:'1',value:changeMemory(undefined,'pet',{add:keepsake(message())})}]]);
 const storage={get:async({key})=>rows.get(key)||{exists:false},set:async({key,value})=>rows.set(key,{exists:true,value,etag:'2'})};
 const files={list:async()=>({items:[]})};
 await finishReset({storage,files},async a=>a.action==='inspect'?{ok:true,reset_pending:true,reset_id:'r'}:{ok:true,reset_complete:true},'r');assert.deepEqual(rows.get(MEMORIES).value,{});
 await removeAppData({storage,files},async()=>({ok:true,erased:true}));assert.deepEqual(rows.get(MEMORIES).value,TOMBSTONE);
});
