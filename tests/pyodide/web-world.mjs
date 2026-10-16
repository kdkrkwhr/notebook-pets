import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../../web/dist/',import.meta.url));
const server=createServer(async(req,res)=>{try{
  const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/notebook-pets\//,'');
  const file=path.resolve(root,route||'index.html');if(!file.startsWith(root))throw Error();
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
  res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
  browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(30000);
  const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const put=IDBObjectStore.prototype.put;let fail=!sessionStorage.getItem('test-quota-used');
    IDBObjectStore.prototype.put=function(value,key){
      if(fail&&key==='visuals'&&Object.keys(value.files??{}).some(p=>p.includes('/home-sprite-'))){fail=false;sessionStorage.setItem('test-quota-used','1');throw new DOMException('Test storage full','QuotaExceededError');}
      return put.apply(this,arguments);
    };
  });
  const base=process.env.WEB_URL??`http://127.0.0.1:${server.address().port}/notebook-pets/`;
  const sheet=await readFile(new URL('../../prototypes/pixel-home/assets/companion.png',import.meta.url));
  let imageReply=sheet.toString('base64'),held=null,holdImage=false,badDecision=false;
  await page.route('https://generativelanguage.googleapis.com/**',async route=>{
    const body=route.request().postDataJSON();assert.equal(route.request().headers()['x-goog-api-key'],'WORLD-TEST-KEY');assert(!route.request().url().includes('WORLD-TEST-KEY'));
    const kind=body.generationConfig.responseModalities?'image':'layout';calls.push({kind,body});
    if(kind==='image'){
      assert.equal(body.contents[0].parts.length,2);assert(body.contents[0].parts[1].inlineData.data);assert.match(body.contents[0].parts[0].text,/exactly FOUR/);
      if(holdImage){held=route;return;}
      return route.fulfill({json:{candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:imageReply}}]}}]}});
    }
    const candidates=JSON.parse(body.contents[0].parts[0].text).candidates;
    return route.fulfill({json:{candidates:[{content:{parts:[{text:JSON.stringify({candidate_id:badDecision?'invented':candidates[0].id,reason:'차분하게 쉴 수 있는 방이에요.'})}]}}]}});
  });
  const count=kind=>calls.filter(c=>c.kind===kind).length;
  const state=()=>page.evaluate(async()=>{const m=await import('./store.js');return m.snapshot(await m.openStore());});
  const idle=()=>page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  const refresh=async()=>{await page.locator('#refresh').click();await idle();};
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('공책이 준비'),{},{timeout:120000});
  await page.locator('#title-start').click();await page.locator('#open-settings').click();await page.locator('#key').fill('WORLD-TEST-KEY');await page.locator('#settings-dialog .primary').click();
  await page.locator('#name').fill('픽셀 친구');await page.locator('#birth button').click();await idle();
  let first=await state();assert(first.player.state);assert.equal(count('image'),1);assert.equal(count('layout'),0);
  const shots=fileURLToPath(new URL('../../.local/web-ui/',import.meta.url));await mkdir(shots,{recursive:true});
  await page.locator('#open-home').click();await page.waitForFunction(()=>!document.querySelector('#home-sprite-retry').hidden);await page.locator('#home-sprite-retry').click();await idle();
  first=await state();const firstSprite=Object.values(first.visuals.art).find(e=>e.format==='home-sprite-v1');assert(firstSprite,'save-only retry persisted the sheet');assert.equal(firstSprite.pet_id,first.player.state.pet_id);assert.equal(count('image'),1);
  await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready');
  assert.equal(await page.locator('#home-sprite').count(),0);assert.equal(await page.locator('.home-item').count(),12);
  await page.screenshot({path:path.join(shots,'home-web-desktop.png')});
  await page.locator('#home-inside').click();await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.place==='inside');await page.locator('#home-yard').click();
  await page.setViewportSize({width:375,height:812});assert(await page.locator('#home-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:path.join(shots,'home-web-mobile.png')});
  await page.locator('#home-close').click();await page.setViewportSize({width:1280,height:900});
  // Test-owned local fixture: coins and one discovered dungeon; no live user save.
  await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);s.state.coins=100;s.state.dungeons={date:new Date(Date.now()+9*3600000).toISOString().slice(0,10),discovered:['hellgate'],expires_at:{hellgate:Date.now()/1000+86400},cleared:[],misses:0};await m.commit(db,s.revision,s.state);});await refresh();
  await page.locator('#open-home').click();await page.locator('#home-shop-toggle').click();
  const purchaseBefore=await state();
  const desk=page.locator('.home-item').filter({hasText:'독서 책상'}).getByRole('button');
  await desk.click();assert(await page.locator('#home-purchase-dialog').isVisible());assert.deepEqual(await state(),purchaseBefore);
  await page.locator('#home-purchase-cancel').click();assert.deepEqual(await state(),purchaseBefore);
  await desk.click();await page.locator('#home-purchase-confirm').click();await page.waitForFunction(()=>document.querySelector('#home-status').textContent.includes('독서 책상')&&!document.querySelector('#refresh').disabled);await idle();assert.equal(count('layout'),0);assert.equal(count('image'),1);assert.equal((await state()).player.state.coins,90);
  await page.locator('#home-decorate').click();await idle();assert.equal(count('layout'),1);assert.equal((await state()).player.state.home.reason,'차분하게 쉴 수 있는 방이에요.');
  await page.locator('#home-undo').click();await idle();assert.equal(count('layout'),1);
  const beforeBad=(await state()).player.state;badDecision=true;await page.locator('#home-decorate').click();await idle();assert.deepEqual((await state()).player.state,beforeBad);badDecision=false;assert.equal(count('layout'),2);
  await page.locator('#home-close').click();await page.locator('.dungeon-card').click();await page.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.sprite==='home');
  await page.screenshot({path:path.join(shots,'dungeon-web-home-sprite.png')});assert.equal(count('image'),1);assert.equal(count('layout'),2);
  await page.locator('#dungeon-enter').click();await idle();await page.waitForFunction(()=>!document.querySelector('#dungeon-choice').hidden);
  await page.locator('#dungeon-safe').click();await idle();await page.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.sprite==='home');assert((await state()).player.state.dungeons.last_run);assert.equal(count('image'),1);
  await page.locator('#dungeon-close').click();
  // Reopen/reload must not issue generation calls or persist keys.
  await page.reload();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='픽셀 친구',{},{timeout:120000});await idle();await page.locator('#title-start').click();assert.equal(await page.locator('#key').inputValue(),'');
  await page.locator('#open-home').click();await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready');await page.locator('#home-close').click();assert.equal(count('image'),1);
  // Appearance save makes one request; saving identical pixels makes none.
  await page.locator('#open-settings').click();await page.locator('#key').fill('WORLD-TEST-KEY');await page.locator('#settings-dialog .primary').click();
  const portrait=await readFile(new URL('../../assets/starters-v1/dragon_nature_stage1.png',import.meta.url));
  const selectPortrait=async()=>{await page.locator('#open-appearance').click();await page.locator('#portrait-file').setInputFiles({name:'friend.png',mimeType:'image/png',buffer:portrait});await page.waitForFunction(()=>!document.querySelector('#save-portrait').disabled);await page.locator('#save-portrait').click();await idle();};
  await selectPortrait();assert.equal(count('image'),2);const changed=await state(),changedSprite=Object.values(changed.visuals.art).find(e=>e.format==='home-sprite-v1');assert.notEqual(changedSprite.source_path,firstSprite.source_path);assert.equal(changedSprite.source_path,changed.visuals.art[changed.player.state.pet_id+'/stage-1'].path);
  await selectPortrait();assert.equal(count('image'),2);
  // Portable backup includes art and survives restore without any AI invocation.
  const backup=await page.evaluate(async()=>{const m=await import('./store.js'),v=await import('./visuals.js');return v.exportNotebook(await m.openStore());});
  assert.equal(backup.version,2);assert(Object.keys(backup.visuals.files).length>=2);assert(!JSON.stringify(backup).includes('WORLD-TEST-KEY'));
  page.on('dialog',d=>d.accept()); // Backup replacement still uses a browser confirmation in the top-level web page.
  await page.locator('#open-backup').click();await page.locator('#import').setInputFiles({name:'world.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await idle();await page.waitForFunction(()=>document.querySelector('#backup-status').textContent.includes('가져왔'));
  await page.locator('#backup-dialog [data-close]').click();await page.locator('#open-home').click();await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready');await page.locator('#home-close').click();assert.equal(count('image'),2);
  // Advancing the stage alone never creates a new image or reuses stage-one poses.
  await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);s.state.level=10;s.state.stage=2;await m.commit(db,s.revision,s.state);});await refresh();
  await page.locator('#open-home').click();await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='missing');await page.locator('#home-close').click();assert.equal(count('image'),2);
  // A same-pet import invalidates an in-flight visual writer, even if source/stage match.
  const stale=await page.evaluate(async()=>{
    const m=await import('./store.js'),v=await import('./visuals.js'),db=await m.openStore(),s=await m.load(db),old=v.createVisuals(db,s.epoch,s.state.pet_id,{clear(){}});
    const a=await old.api.storage.get({key:'notebuddy/art-v1'});await m.commit(db,s.revision,s.state,undefined,true);
    try{await old.api.storage.set({key:'notebuddy/art-v1',value:a.value,if_match:a.etag});return false;}catch{return true;}
  });assert(stale);await refresh();
  // A late image response after an external reset must not resurrect the companion.
  await page.locator('#open-settings').click();await page.locator('#key').fill('WORLD-TEST-KEY');await page.locator('#settings-dialog .primary').click();holdImage=true;
  await page.locator('#open-appearance').click();await page.locator('#portrait-file').setInputFiles({name:'late.png',mimeType:'image/png',buffer:portrait});await page.waitForFunction(()=>!document.querySelector('#save-portrait').disabled);await page.locator('#save-portrait').click();
  for(let i=0;!held&&i<100;i++)await page.waitForTimeout(50);assert(held);
  await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);await m.commit(db,s.revision,null);});
  await held.fulfill({json:{candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:imageReply}}]}}]}});await idle();
  const reset=await state();assert.equal(reset.player.state,null);assert.deepEqual(reset.visuals.art,{});assert.deepEqual(reset.visuals.files,{});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url:base,home:true,sharedDungeonSprite:true,birthImageOnce:true,saveOnlyRetry:true,appearanceImageOnce:true,identicalImageNoAI:true,stageOnlyNoAI:true,noEntryAI:true,decorateValidated:true,artBackup:true,staleArtBlocked:true,lateResetBlocked:true,errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
