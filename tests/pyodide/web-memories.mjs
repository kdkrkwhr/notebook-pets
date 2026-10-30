import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';

const root=path.resolve(fileURLToPath(new URL('../../web/dist/',import.meta.url)));
const server=createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/notebook-pets\//,'');
 if(route==='test-shell.html'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Storage contract</title>');return;}
 const file=path.resolve(root,route||'index.html');if(!file.startsWith(root+path.sep))throw Error();
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
 res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const base=process.env.WEB_URL??`http://127.0.0.1:${server.address().port}/notebook-pets/`;
 const storagePage=await browser.newPage();await storagePage.goto(base+'test-shell.html');
 const storage=await storagePage.evaluate(async()=>{
  const s=await import('./store.js'),v=await import('./visuals.js'),m=await import('./memories.mjs'),d=await import('./data.mjs');
  const db=await s.openStore(),pet='a'.repeat(32),state={pet_id:pet};await s.commit(db,0,state);
  const visual=v.createVisuals(db,1,pet,{clear(){}}),active=async()=>({status:{name:'Local'},pet_id:pet});
  const before=await s.snapshot(db),one=m.keepsake({id:'one',role:'user',text:'Keep these words',at:1000}),two=m.keepsake({id:'two',role:'assistant',text:'Keep the reply',at:1001});
  const empty=await visual.api.storage.get({key:d.MEMORIES});
  if(empty.value!==undefined)throw Error('Absent notebook must remain absent');
  await Promise.all([m.writeMemory(visual.api.storage,active,pet,{add:one}),m.writeMemory(visual.api.storage,active,pet,{add:two})]);
  await m.writeMemory(visual.api.storage,active,pet,{add:one});
  const saved=await s.snapshot(db),backup=await v.exportNotebook(db),restored=await v.importVisuals(backup);
  const bad=structuredClone(backup);bad.visuals.memories.pet_id='b'.repeat(32);let invalid=false;try{await v.importVisuals(bad);}catch{invalid=true;}
  const legacy=structuredClone(backup);delete legacy.visuals.memories;const legacyRestored=await v.importVisuals(legacy);
  await m.writeMemory(visual.api.storage,active,pet,{remove:one.id});const removed=await s.snapshot(db);
  // Replacing with the same pet increments the epoch and fences delayed writers.
  await s.commit(db,saved.player.revision,state,restored,true);let staleImport=false;try{await m.writeMemory(visual.api.storage,active,pet,{add:one});}catch{staleImport=true;}
  const imported=await s.snapshot(db),fresh=v.createVisuals(db,imported.player.epoch,pet,{clear(){}});
  await s.commit(db,imported.player.revision,null);let staleReset=false;try{await m.writeMemory(fresh.api.storage,active,pet,{add:one});}catch{staleReset=true;}
  const reset=await s.snapshot(db);
  return {before,saved,restored,removed,invalid,legacyRestored,staleImport,staleReset,reset};
 });
 assert.deepEqual(storage.saved.player,storage.before.player,'Saving words cannot write gameplay');
 assert.equal(storage.saved.visuals.memories.entries.length,2,'Concurrent saves merge without duplicates');
 assert.deepEqual(storage.restored.memories,storage.saved.visuals.memories,'Backup includes saved words');
 assert.equal(storage.removed.visuals.memories.entries.length,1);assert.equal(storage.invalid,true);
 assert.equal(storage.legacyRestored.memories.entries.length,0);assert.equal(storage.staleImport,true);assert.equal(storage.staleReset,true);
 assert.equal(storage.reset.player.state,null);assert.equal(storage.reset.visuals.memories,undefined);
 await storagePage.close();

 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});let aiCalls=0;
 await page.route('https://generativelanguage.googleapis.com/**',async route=>{aiCalls++;await route.fulfill({json:{candidates:[{content:{parts:[{text:'A completed remembered reply'}]}}]}});});
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('공책이 준비'),{},{timeout:120000});await page.locator('#title-start').click();
 await page.locator('#name').fill('추억 친구');await page.locator('#birth button').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 await page.locator('#open-memories').click();assert.match(await page.locator('#memory-milestones').innerText(),/첫 만남/);await page.locator('#memory-close').click();assert.equal(aiCalls,0);
 await page.locator('#open-settings').click();await page.locator('#key').fill('LOCAL-MEMORY-TEST');await page.locator('#settings-dialog .primary').click();
 await page.locator('#message').fill('A completed remembered message');await page.locator('#chat button').click();await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);
 assert.equal(aiCalls,1);await page.locator('.message.user .memory-save').click();await page.waitForFunction(()=>document.querySelector('.message.user .memory-save').disabled);
 await page.locator('#open-memories').click();assert.match(await page.locator('#memory-notes').innerText(),/A completed remembered message/);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await page.locator('#memory-close').isVisible());}
 await page.locator('#memory-close').click();await page.reload();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='추억 친구',{},{timeout:120000});await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);await page.locator('#title-start').click();
 assert(await page.locator('.message.user .memory-save').isDisabled(),'Reload keeps message identity');await page.locator('#open-memories').click();assert.equal(await page.locator('#memory-notes li').count(),1);
 await page.locator('.memory-remove').click();await page.waitForFunction(()=>document.querySelectorAll('#memory-notes li').length===0);await page.locator('#memory-close').click();assert.equal(await page.locator('.message.user').count(),1);assert.equal(aiCalls,1);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({memoryStorage:true,cas:true,backup:true,legacyImport:true,epochFencing:true,notebook:true,reload:true,layouts:[320,390,1280],extraAI:0,errors}));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
