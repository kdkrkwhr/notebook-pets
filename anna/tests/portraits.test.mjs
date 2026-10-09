import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ART,TOMBSTONE,ErasedError} from '../bundle/data.mjs';
import {cleanUnusedPortraits} from '../bundle/portraits.mjs';
function fixture(){
 const f={row:{etag:'index1',value:{'pet/stage-1':{path:'portraits/pet/baby.png'},'pet/stage-2':{path:'portraits/pet/current.png'}}},deleted:[],activeCalls:0};
 f.blobs=new Map(['baby','current','old','orphan'].map(name=>[`portraits/pet/${name}.png`,'v1']));
 f.storage={get:async({key})=>{assert.equal(key,ART);return structuredClone(f.row);}};
 f.files={list:async({prefix,cursor,limit})=>{assert.equal(prefix,'portraits/');assert.equal(limit,100);const all=[...f.blobs].map(([path,etag])=>({path,etag}));const n=Number(cursor||0);return {items:all.slice(n,n+2),next_cursor:n+2<all.length?String(n+2):null};},delete:async({path,if_match})=>{assert.equal(if_match,f.blobs.get(path));f.blobs.delete(path);f.deleted.push(path);}};
 f.active=async()=>{f.activeCalls++;};return f;
}
test('unused cleanup preserves every saved stage, handles pagination and never writes the index',async()=>{
 const f=fixture(),original=structuredClone(f.row);assert.deepEqual(await cleanUnusedPortraits(f,f.active),{deleted:2});
 assert.deepEqual([...f.blobs.keys()],['portraits/pet/baby.png','portraits/pet/current.png']);assert.deepEqual(f.row,original);
 assert.deepEqual(await cleanUnusedPortraits(f,f.active),{deleted:0});
});
test('missing, erased or malformed index refuses deletion',async()=>{
 for(const row of [{},{etag:'1',value:null},{etag:'1',value:TOMBSTONE},{etag:'1',value:[]},{etag:'1',value:{a:{path:'elsewhere/a'}}},{etag:'1',value:{a:{path:'portraits/../other'}}}]){
  const f=fixture();f.row=row;await assert.rejects(cleanUnusedPortraits(f,f.active));assert.equal(f.deleted.length,0);
 }
});
test('listing failures and malformed later pages cause no partial deletion',async()=>{
 for(const entry of [{path:'outside/file',etag:'x'},{path:'portraits/../escape',etag:'x'},{path:'portraits/%2e%2e/escape',etag:'x'},{path:'portraits/pet/old.png'}]){
  const f=fixture();f.files.list=async({cursor})=>cursor?{items:[entry]}:{items:[{path:'portraits/pet/old.png',etag:'v1'}],next_cursor:'next'};
  await assert.rejects(cleanUnusedPortraits(f,f.active));assert.equal(f.deleted.length,0);
 }
});
test('changed album or removal marker stops before deleting a newly referenced file',async()=>{
 for(const erased of [false,true]){
  const f=fixture();f.active=async()=>{if(++f.activeCalls===2)f.row=erased?{etag:'index2',value:TOMBSTONE}:{etag:'index2',value:{...f.row.value,new:{path:'portraits/pet/old.png'}}};};
  await assert.rejects(cleanUnusedPortraits(f,f.active),erased?ErasedError:/changed/);assert.equal(f.deleted.length,0);
 }
});
test('changed file ETag is refused and interrupted cleanup can be resumed',async()=>{
 const f=fixture(),del=f.files.delete;let failed=false;
 f.files.delete=async args=>{if(args.path.endsWith('orphan.png')&&!failed){failed=true;throw {code:-32023};}return del(args);};
 await assert.rejects(cleanUnusedPortraits(f,f.active));assert.equal(f.deleted.length,1);
 assert.deepEqual(await cleanUnusedPortraits(f,f.active),{deleted:1});assert.equal(f.blobs.size,2);
});
test('unbounded or repeated pagination does not delete anything',async()=>{
 for(const loop of [true,false]){
  const f=fixture();let pages=0;f.files.list=async()=>({items:[],next_cursor:loop?'same':String(++pages)});
  await assert.rejects(cleanUnusedPortraits(f,f.active));assert.equal(f.deleted.length,0);
 }
});
test('missing file is tolerated but lost delete response is not falsely reported successful',async()=>{
 const f=fixture(),del=f.files.delete;let first=true;
 f.files.delete=async args=>{await del(args);if(first){first=false;throw Error('lost reply');}};
 await assert.rejects(cleanUnusedPortraits(f,f.active),/lost/);assert.equal(f.deleted.length,1);
 f.files.delete=async args=>{await del(args);throw {code:'not_found'};};
 assert.deepEqual(await cleanUnusedPortraits(f,f.active),{deleted:0});assert.equal(f.blobs.size,2);
});
