import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHAT,ART,TOMBSTONE,ErasedError,mergeSaved,removeAppData} from '../bundle/data.mjs';
function fixture(){
 const rows=new Map([[CHAT,{value:[{text:'private'}],etag:'1',exists:true}],[ART,{value:{portrait:'private'},etag:'1',exists:true}]]);
 const blobs=new Map([['portraits/a/old.png','1'],['portraits/a/new.png','2'],['unrelated/file','3']]);
 const storage={async get({key}){return structuredClone(rows.get(key)||{exists:false});},async set({key,value,if_match}){const row=rows.get(key);if(if_match&&row?.etag!==if_match)throw {code:-32023};rows.set(key,{value:structuredClone(value),etag:String(Number(row?.etag||0)+1),exists:true});}};
 const deleted=[];const files={async list(){return {items:[...blobs].filter(([p])=>p.startsWith('portraits/')).slice(0,1).map(([path,etag])=>({path,etag})),next_cursor:null};},async delete({path,if_match}){assert.equal(if_match,blobs.get(path));blobs.delete(path);deleted.push(path);}};
 return {rows,blobs,deleted,storage,files};
}
const removed=async()=>({ok:true,erased:true});
test('cleanup requires server removal, clears sensitive values and only deletes portrait prefix',async()=>{
 const f=fixture();await assert.rejects(removeAppData(f,async()=>({ok:true,erased:false})));
 assert.equal(f.rows.get(CHAT).value[0].text,'private');assert.equal(f.deleted.length,0);
 assert.deepEqual(await removeAppData(f,removed),{checked:true});
 assert.deepEqual(f.rows.get(CHAT).value,TOMBSTONE);assert.deepEqual(f.rows.get(ART).value,TOMBSTONE);
 assert.equal(f.deleted.length,2);assert.ok(f.blobs.has('unrelated/file'));
 await removeAppData(f,removed);assert.equal(f.deleted.length,2);
});
test('partial file failure propagates and a subsequent cleanup resumes',async()=>{
 const f=fixture(),del=f.files.delete;let fail=true;
 f.files.delete=async args=>{if(fail&&args.path.endsWith('new.png'))throw new Error('offline');return del(args);};
 await assert.rejects(removeAppData(f,removed),/offline/);assert.equal(f.blobs.size,2);
 fail=false;await removeAppData(f,removed);assert.deepEqual([...f.blobs.keys()],['unrelated/file']);
});
test('an existing in-flight chat write cannot overwrite a removal marker after CAS retry',async()=>{
 const f=fixture(),set=f.storage.set;let intercepted=false;
 f.storage.set=async args=>{if(!intercepted){intercepted=true;f.rows.set(CHAT,{exists:true,etag:'2',value:TOMBSTONE});}return set(args);};
 await assert.rejects(mergeSaved(f.storage,CHAT,old=>[...old,{text:'late response'}]),ErasedError);
 assert.deepEqual(f.rows.get(CHAT).value,TOMBSTONE);
});
test('malformed or out-of-scope file listing never causes broad deletion',async()=>{
 for(const entry of [{path:'unrelated/file',etag:'3'},{path:'portraits/no-etag.png'}]){
  const f=fixture();f.files.list=async()=>({items:[entry]});
  await assert.rejects(removeAppData(f,removed),/Invalid portrait/);assert.equal(f.deleted.length,0);
 }
});
test('missing ETags and final verification failures are not reported as checked',async()=>{
 const f=fixture();delete f.rows.get(CHAT).etag;await assert.rejects(removeAppData(f,removed),/Conditional/);
 const g=fixture();g.files.list=async()=>{g.rows.set(CHAT,{exists:true,value:['late old window'],etag:'3'});return {items:[],next_cursor:null};};
 await assert.rejects(removeAppData(g,removed),/Cleanup changed/);
});
test('continuous uploads have a bounded cleanup and require retry',async()=>{
 const f=fixture();let calls=0;
 f.files.list=async()=>({items:[{path:`portraits/late-${++calls}`,etag:'x'}]});f.files.delete=async()=>{};
 await assert.rejects(removeAppData(f,removed),/More portraits/);assert.equal(calls,20);
});
