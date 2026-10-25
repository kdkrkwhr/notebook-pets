import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
async function setup(t){
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:{});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://equipment.test')return route.abort();const name=u.pathname==='/'?'index.html':u.pathname.slice(1);if(name.includes('..'))return route.abort();try{let body=await readFile(new URL('../../bundle/'+name,import.meta.url));if(name==='index.html')body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');return route.fulfill({body,contentType:name.endsWith('.html')?'text/html':/\.m?js$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':'image/png'});}catch{return route.fulfill({status:404,body:''});}});
 await page.goto('https://equipment.test/');return page;
}
test('an explicitly disabled host shows unavailable state without an image request',async t=>{
 const p=await setup(t);await p.evaluate(async()=>{const {createItemCatalog}=await import('/item-catalog.mjs');window.book=createItemCatalog(document,()=> 'ko',{enabled:false});book.update({'ember-horns':1});book.open();});
 await p.locator('[data-item="ember-horns"]').click();assert.match(await p.locator('#equipment-controls').textContent(),/품질 검증/);assert.equal(await p.locator('[data-equipment=wear]').isDisabled(),true);
});
test('preview requires explicit apply, rejects repeat clicks, and keeps discovery after consumption',async t=>{
 const p=await setup(t);await p.evaluate(async()=>{const {createItemCatalog}=await import('/item-catalog.mjs');window.count=0;window.applied=0;window.pending=null;const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const blob=await new Promise(r=>canvas.toBlob(r));window.book=createItemCatalog(document,()=> 'ko',{enabled:true,original:async()=>blob,pending:()=>pending,start:async()=>{count++;await new Promise(r=>setTimeout(r,50));pending={id:'test'};return {blob};},recover:async()=>({blob}),apply:async()=>{applied++;pending=null;book.update({},['ember-horns']);},cancel:async()=>{pending=null;}});book.update({'ember-horns':1});book.open();});
 await p.locator('[data-item="ember-horns"]').click();await p.locator('[data-equipment=wear]').click();await p.waitForFunction(()=>document.querySelector('[data-equipment=apply]')?.disabled===false);assert.equal(await p.evaluate(()=>applied),0);assert.equal(await p.evaluate(()=>count),1);
 await p.locator('[data-equipment=apply]').click();assert.equal(await p.evaluate(()=>applied),1);assert.match(await p.locator('#item-detail-owned').textContent(),/발견/);assert.equal(await p.locator('[data-equipment=wear]').isDisabled(),true);
});
test('private blob journal survives reload and explicitly clears during removal',async t=>{
 const p=await setup(t);await p.evaluate(async()=>{const {equipmentJournal}=await import('/equipment.mjs');await equipmentJournal(indexedDB).put('pet',{id:'request',blob:new Blob(['image-result'])});});await p.reload();
 assert.equal(await p.evaluate(async()=>{const {equipmentJournal}=await import('/equipment.mjs');const j=equipmentJournal(indexedDB),r=await j.get('pet');return r.blob.text();}),'image-result');
 assert.equal(await p.evaluate(async()=>{const {equipmentJournal}=await import('/equipment.mjs');const j=equipmentJournal(indexedDB);await j.clear();return await j.get('pet');}),undefined);
});

test('enabled fitting explains preview and consumption in CJK locales without calling AI',async t=>{
 const p=await setup(t);await p.evaluate(async()=>{const {createItemCatalog}=await import('/item-catalog.mjs');window.lang='ja';window.fittingCalls=0;window.book=createItemCatalog(document,()=>lang,{enabled:true,start:()=>{fittingCalls++;}});book.update({'ember-horns':1});book.open();});
 for(const lang of ['ja','zh-Hans','zh-Hant']){
  await p.evaluate(value=>{window.lang=value;book.render();},lang);
  if(!await p.locator('#item-detail').evaluate(e=>e.open))await p.locator('[data-item="ember-horns"]').click();
  assert.match(await p.locator('#equipment-status').textContent(),/[\u3040-\u30ff\u3400-\u9fff]/);
  assert.match(await p.locator('[data-equipment=wear]').textContent(),/[\u3040-\u30ff\u3400-\u9fff]/);
  assert.equal(await p.locator('[data-equipment=wear]').isDisabled(),false);
 }
 assert.equal(await p.evaluate(()=>fittingCalls),0);
});

test('closing a working view preserves progress, reopens it, compares both portraits and confirms consumption',async t=>{
 const p=await setup(t);await p.evaluate(async()=>{const {createItemCatalog}=await import('/item-catalog.mjs');const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const blob=await new Promise(r=>canvas.toBlob(r));window.calls=0;window.pending=null;window.applied=0;window.book=createItemCatalog(document,()=> 'en',{enabled:true,original:async()=>blob,pending:()=>pending,start:async()=>{calls++;pending={id:'saved-preview',item_id:'ember-horns'};await new Promise(r=>window.finishGeneration=r);return {blob,pending};},recover:async()=>({blob,pending}),apply:async()=>{applied++;pending=null;book.update({},['ember-horns']);return {ok:true};}});book.update({'ember-horns':1});book.open();});
 await p.locator('[data-item="ember-horns"]').click();await p.locator('[data-equipment=wear]').click();await p.waitForFunction(()=>document.querySelector('#equipment-controls').dataset.state==='working');
 await p.keyboard.press('Escape');assert.equal(await p.locator('#item-detail').evaluate(e=>e.open),false);await p.locator('#item-catalog #equipment-background-status').waitFor({state:'visible'});await p.waitForFunction(()=>{const r=document.querySelector('#equipment-background-status').getBoundingClientRect(),header=document.querySelector('.item-book-header').getBoundingClientRect();return r.top>=header.bottom&&r.bottom<=innerHeight;});
 await p.locator('#equipment-background-status button').click();assert.equal(await p.locator('#item-detail').evaluate(e=>e.open),true);assert.equal(await p.evaluate(()=>calls),1);
 await p.evaluate(()=>finishGeneration());await p.waitForFunction(()=>document.querySelector('[data-equipment=apply]')?.disabled===false);assert.equal(await p.locator('.equipment-compare figure').count(),2);assert.equal(await p.evaluate(()=>applied),0);
 await p.locator('[data-equipment-zoom=result]').click();assert.equal(await p.locator('#equipment-image-viewer').evaluate(e=>e.open),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#equipment-image-viewer').evaluate(e=>e.open),false);
 await p.locator('#close-item-detail').click();await p.locator('[data-item="ember-horns"]').click();assert.equal(await p.locator('[data-equipment=apply]').isDisabled(),false);assert.equal(await p.evaluate(()=>calls),1);
 await p.locator('[data-equipment=apply]').click();await p.waitForFunction(()=>document.querySelector('#equipment-controls').dataset.state==='applied');assert.match(await p.locator('#equipment-status').textContent(),/1 item used/);assert.equal(await p.evaluate(()=>applied),1);assert.equal(await p.locator('.equipment-compare figure').count(),2);
});
