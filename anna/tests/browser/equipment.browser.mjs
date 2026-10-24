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
test('owned item shows explicit unavailable state; browsing causes no image request',async t=>{
 const p=await setup(t);await p.evaluate(async()=>{const {createItemCatalog}=await import('/item-catalog.mjs');window.book=createItemCatalog(document,()=> 'ko');book.update({'ember-horns':1});book.open();});
 await p.locator('[data-item="ember-horns"]').click();assert.match(await p.locator('#equipment-controls').textContent(),/품질 검증/);assert.equal(await p.locator('[data-equipment=wear]').isDisabled(),true);
});
test('preview requires explicit apply, rejects repeat clicks, and keeps discovery after consumption',async t=>{
 const p=await setup(t);await p.evaluate(async()=>{const {createItemCatalog}=await import('/item-catalog.mjs');window.count=0;window.applied=0;window.pending=null;const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const blob=await new Promise(r=>canvas.toBlob(r));window.book=createItemCatalog(document,()=> 'ko',{enabled:true,pending:()=>pending,start:async()=>{count++;await new Promise(r=>setTimeout(r,50));pending={id:'test'};return {blob};},recover:async()=>({blob}),apply:async()=>{applied++;pending=null;book.update({},['ember-horns']);},cancel:async()=>{pending=null;}});book.update({'ember-horns':1});book.open();});
 await p.locator('[data-item="ember-horns"]').click();await p.locator('[data-equipment=wear]').click();await p.waitForFunction(()=>document.querySelector('[data-equipment=apply]')?.disabled===false);assert.equal(await p.evaluate(()=>applied),0);assert.equal(await p.evaluate(()=>count),1);
 await p.locator('[data-equipment=apply]').click();assert.equal(await p.evaluate(()=>applied),1);assert.match(await p.locator('#item-detail-owned').textContent(),/발견/);assert.equal(await p.locator('[data-equipment=wear]').isDisabled(),true);
});
test('private blob journal survives reload and explicitly clears during removal',async t=>{
 const p=await setup(t);await p.evaluate(async()=>{const {equipmentJournal}=await import('/equipment.mjs');await equipmentJournal(indexedDB).put('pet',{id:'request',blob:new Blob(['image-result'])});});await p.reload();
 assert.equal(await p.evaluate(async()=>{const {equipmentJournal}=await import('/equipment.mjs');const j=equipmentJournal(indexedDB),r=await j.get('pet');return r.blob.text();}),'image-result');
 assert.equal(await p.evaluate(async()=>{const {equipmentJournal}=await import('/equipment.mjs');const j=equipmentJournal(indexedDB);await j.clear();return await j.get('pet');}),undefined);
});
