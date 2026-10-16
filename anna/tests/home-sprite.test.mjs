import test from 'node:test';
import assert from 'node:assert/strict';
import {currentHomeSprite,homeSpriteKey,createHomeSprite} from '../bundle/home-sprite.mjs';
import {ART,TOMBSTONE} from '../bundle/data.mjs';
test('home sprites belong to one companion, stage and exact source artwork',()=>{
 const v={pet_id:'a',stage:1},entry={path:'portraits/a/home-sprite.png',pet_id:'a',stage:1,format:'home-sprite-v1',source_path:'portraits/a/original.png'};
 const art={'a/stage-1':{path:entry.source_path},[homeSpriteKey(v)]:entry};
 assert.equal(currentHomeSprite(v,art),entry);
 for(const changed of [{...v,stage:2},{...v,pet_id:'b'}])assert.equal(currentHomeSprite(changed,art),null);
 assert.equal(currentHomeSprite(v,{...art,'a/stage-1':{path:'portraits/a/new.png'}}),null);
 for(const extra of [{pet_id:'b'},{stage:2},{path:'portraits/b/foreign.png'},{format:'pixel-v1'}])assert.equal(currentHomeSprite(v,{...art,[homeSpriteKey(v)]:{...entry,...extra}}),null);
});
test('late generation after a pet change or removal never uploads or saves',async()=>{
 for(const change of ['pet','erase']){
  let active={pet_id:'a',stage:1},art={'a/stage-1':{path:'portraits/a/original.png'}},finish,started;
  const invoked=new Promise(r=>started=r);let images=0,writes=0,uploads=0;
  const service=createHomeSprite({active:async()=>active,upload:async()=>uploads++,saved:()=>writes++,anna:()=>({
   storage:{get:async({key})=>{assert.equal(key,ART);return {value:art};},set:async()=>writes++},
   files:{download_url:async()=>({get_url:'https://private.example/own-signed-reference'})},
   image:{generate:async options=>{images++;assert.deepEqual(options.reference_image_urls,['https://private.example/own-signed-reference']);started();return new Promise(r=>finish=r);}}
  })});
  const running=service.generate();await invoked;
  if(change==='pet')active={pet_id:'b',stage:1};else art=TOMBSTONE;
  finish({images:[{url:'https://generated.example/sheet.png'}]});await assert.rejects(running);
  assert.equal(images,1);assert.equal(writes,0);assert.equal(uploads,0);assert.equal(service.hasPending(),false);
 }
});
