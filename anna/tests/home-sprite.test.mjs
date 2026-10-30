import test from 'node:test';
import assert from 'node:assert/strict';
import {currentHomeSprite,homeSpriteKey,createHomeSprite,homeMovementStatus,movementFailureKey} from '../bundle/home-sprite.mjs';
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
  let active={pet_id:'a',stage:1,image_prompt:'small friendly dragon'},art={'a/stage-1':{path:'portraits/a/original.png'}},finish,started;
  const invoked=new Promise(r=>started=r);let images=0,writes=0,uploads=0,etag=1;
  const service=createHomeSprite({active:async()=>active,upload:async()=>uploads++,saved:()=>writes++,anna:()=>({
   storage:{get:async({key})=>{assert.equal(key,ART);return {exists:true,value:structuredClone(art),etag:String(etag)};},set:async({key,value,if_match})=>{assert.equal(key,ART);if(if_match!==String(etag))throw {code:-32023};art=structuredClone(value);etag++;writes++;}},
   files:{download_url:async()=>({get_url:'https://private.example/own-signed-reference'})},
   image:{generate:async options=>{images++;assert.equal(options.reference_image_urls,undefined);assert.match(options.prompt,/small friendly dragon/);started();return new Promise(r=>finish=r);}}
  })});
  const running=service.sync().then(()=>null,error=>error);
  await Promise.race([invoked,running.then(error=>{throw error||Error('Generation ended before the image request');})]);const reserved=writes;
  if(change==='pet')active={pet_id:'b',stage:1};else{art=TOMBSTONE;etag++;}
  finish({images:[{url:'https://generated.example/sheet.png'}]});assert((await running) instanceof Error);
  assert.equal(images,1);assert.equal(writes,reserved);assert.equal(uploads,0);assert.equal(service.hasPending(),false);
 }
});

test('one paid request per saved artwork, including failure, restart and concurrent windows',async()=>{
 let art={'a/stage-1':{path:'portraits/a/first.png'}},etag=1,images=0;
 const host={active:async()=>({pet_id:'a',stage:1,image_prompt:'small friendly dragon'}),saved:()=>{},upload:async()=>{},anna:()=>({
  storage:{get:async()=>({exists:true,value:structuredClone(art),etag:String(etag)}),set:async({value,if_match})=>{if(if_match!==String(etag))throw {code:-32023};art=structuredClone(value);etag++;}},
  files:{download_url:async()=>({get_url:'https://private.example/reference'})},
  image:{generate:async()=>{images++;throw Error('response lost');}}
 })};
 await Promise.allSettled([createHomeSprite(host).sync(),createHomeSprite(host).sync()]);
 assert.equal(images,1);
 const reopened=createHomeSprite(host);assert.equal(await reopened.sync(),false);assert.equal(await reopened.retry(),false);assert.equal(images,1);
 art['a/stage-1']={path:'portraits/a/equipped.png'};
 await assert.rejects(reopened.sync());assert.equal(images,2);
 assert.equal(await reopened.sync(),false);assert.equal(images,2);
});

test('an existing matching movement sheet never makes an AI request',async()=>{
 const v={pet_id:'a',stage:1},art={'a/stage-1':{path:'portraits/a/old.png'},[homeSpriteKey({pet_id:'a',stage:1})]:{path:'portraits/a/sheet.png',format:'home-sprite-v1',pet_id:'a',stage:1,source_path:'portraits/a/old.png'}};
 const service=createHomeSprite({active:async()=>v,anna:()=>({storage:{get:async()=>({exists:true,value:structuredClone(art),etag:'1'})}})});
 assert.equal(await service.sync(v),false);
});

test('movement failure saves only its stage code and survives reopening without generation',async()=>{
 let art={'a/stage-1':{path:'portraits/a/first.png'}},images=0,etag=1;
 const host={active:async()=>({pet_id:'a',stage:1,image_prompt:'small friendly dragon'}),upload:async()=>{},saved:()=>{},anna:()=>({
  storage:{get:async()=>({exists:true,value:structuredClone(art),etag:String(etag)}),set:async({value,if_match})=>{if(if_match!==String(etag))throw {code:-32023};art=structuredClone(value);etag++;}},
  files:{download_url:async()=>({get_url:'https://private.example/signed-secret'})},
  image:{generate:async()=>{images++;throw Error('private provider token and prompt');}}
 })};
 await assert.rejects(createHomeSprite(host).sync(),error=>movementFailureKey(error)==='homeMovementServiceFailed');
 assert.equal(art['a/home-sprite-request-stage-1'].failure,'generate');
 assert(!JSON.stringify(art).includes('private provider'));assert(!JSON.stringify(art).includes('signed-secret'));
 assert.equal(homeMovementStatus({pet_id:'a',stage:1},art),'homeMovementServiceFailed');
 await createHomeSprite(host).sync();assert.equal(images,1);
 assert.equal(homeMovementStatus({pet_id:'a',stage:2},art),'');
 assert.equal(homeMovementStatus({pet_id:'a',stage:1},{...art,'a/stage-1':{path:'portraits/a/new.png'}}),'');
});

test('legacy unfinished requests and old save failures never advertise a lost retry result',()=>{
 const v={pet_id:'a',stage:1};
 for(const failure of [undefined,'save','download','unknown']){
  const art={'a/stage-1':{path:'portraits/a/first.png'},'a/home-sprite-request-stage-1':{path:'portraits/a/first.png',source_path:'portraits/a/first.png',failure}};
  assert.equal(homeMovementStatus(v,art),'homeMovementInterrupted');
 }
 assert.equal(movementFailureKey({movementPhase:'validate'}),'homeMovementInvalid');
 assert.equal(movementFailureKey({movementPhase:'save'},true),'homeMovementPending');
});

test('old service failures offer a fresh explicit choice without spending AI on entry',async()=>{
 const {homeNeedsChoice,homeSpritePrompt}=await import('../bundle/home-sprite.mjs');
 const v={pet_id:'a',stage:1,image_prompt:'small blue fairy'},source='portraits/a/source.png';
 let art={'a/stage-1':{path:source},[homeSpriteKey(v)]:{path:'portraits/a/default.png',format:'home-default-v1',pet_id:'a',stage:1,source_path:source},'a/home-sprite-request-stage-1':{source_path:source,failure:'generate',trigger:'home-choice-v1'}};
 assert.equal(homeNeedsChoice(v,art),true);assert.match(homeSpritePrompt(v,art),/small blue fairy/);
 let calls=0,etag=1;const host={active:async()=>v,saved:()=>{},upload:async()=>{},anna:()=>({storage:{get:async()=>({exists:true,value:structuredClone(art),etag:String(etag)}),set:async({value,if_match})=>{if(if_match!==String(etag))throw {code:-32023};art=structuredClone(value);etag++;}},image:{generate:async()=>{calls++;throw Error('failed');}}})};
 await createHomeSprite(host).useDefault();assert.equal(homeNeedsChoice(v,art),false);assert.equal(calls,0);
 delete art['a/home-sprite-request-stage-1'].transport;art['a/home-sprite-request-stage-1'].failure='generate';etag++;
 const service=createHomeSprite(host);await assert.rejects(service.choose(v));assert.equal(calls,1);assert.equal(homeNeedsChoice(v,art),false);
 await service.choose(v);assert.equal(calls,1);
});
