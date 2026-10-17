import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const bundle=new URL('../../bundle/',import.meta.url),root=fileURLToPath(new URL('../../../',import.meta.url));
const mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
function worker(payload){const p=spawnSync(process.env.PYTHON??'python',['-B','-X','utf8','anna/executas/notebuddy/game_worker.py'],{cwd:root,input:JSON.stringify(payload),encoding:'utf8'});assert.equal(p.status,0,p.stderr);const result=JSON.parse(p.stdout);assert.notEqual(result.result.code,'invalid_state');return result;}
async function setup(t,sandbox=false){
 const birth=worker({command:'start',name:'Home buddy',request_id:'birth'});let state=birth.state;state.coins=100;
 const initial=worker({command:'status',state});const save={...initial.result,...initial.view,pet_id:state.pet_id,request_id_prefix:'nb2:0:'};
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();if(u.pathname.includes('/_sdk/'))return route.fulfill({body:mock,contentType:'text/javascript'});
  if(u.pathname==='/sandbox-host')return route.fulfill({contentType:'text/html',body:'<iframe src="/" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" style="position:fixed;inset:0;width:100vw;height:100vh;border:0"></iframe>'});
  if(u.pathname==='/fixture-upload')return route.fulfill({body:''});
  if(u.pathname==='/fixture-home'){const args=JSON.parse(route.request().postData()),computed=worker({...args,state});if(computed.changed)state=computed.state;return route.fulfill({json:{...computed.result,...computed.view,request_id_prefix:'nb2:0:'}});}
  if(u.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"home-test"}'});
  const file=u.pathname==='/'?'index.html':u.pathname.slice(1);if(file.includes('..'))return route.abort();try{const type=file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'text/html';await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:type});}catch{await route.fulfill({status:404,body:''});}});
 await page.addInitScript(save=>{localStorage.setItem('test-host',JSON.stringify({sequence:0,save,kv:{}}));sessionStorage.setItem('test-faults',JSON.stringify({home:true}));},save);
 await page.goto('https://notebuddy.test'+(sandbox?'/sandbox-host':''));
 const ui=sandbox?await (await page.locator('iframe').elementHandle()).contentFrame():page;
 await ui.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);await ui.locator('#title-start').click();await ui.locator('#open-home').click();await ui.waitForFunction(()=>document.querySelectorAll('.home-item').length===12);
 await ui.locator('#home-shop-toggle').click();
 return {page:ui,hostPage:page,state:()=>state};
}
test('real core home: buying and motion never invoke AI; one requested decorate, undo, lost reply retry, and mobile',async t=>{
 const {page,state}=await setup(t),llm=()=>page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length);
 assert.equal(await llm(),0);page.on('dialog',d=>d.accept());
 const buy=async name=>{await page.locator('.home-item').filter({hasText:name}).getByRole('button').click();await page.locator('#home-purchase-confirm').click();await page.waitForFunction(name=>document.querySelector('#home-status').textContent.startsWith(name+' is in storage.')&&!document.querySelector('#home-close').disabled,name);};
 await buy('Reading desk');await buy('Little bookcase');await buy('Leafy plant');assert.equal(await llm(),0);assert.equal(state().coins,78);
 await page.locator('#home-decorate').click();await page.waitForFunction(()=>document.querySelector('#home-reason').textContent.includes('reading corner'));assert.equal(await llm(),1);assert(Object.keys(state().home.layout).length>1);
 const after=structuredClone(state());await page.waitForTimeout(1000);await page.locator('#home-skip').click();assert.equal(await llm(),1);assert.deepEqual(state(),after);
 const shots=new URL('../../../.local/home-implementation/',import.meta.url);await mkdir(shots,{recursive:true});await page.screenshot({path:fileURLToPath(new URL('desktop.png',shots))});
 await page.locator('#home-undo').click();await page.waitForFunction(()=>document.querySelector('#home-reason').textContent==='');assert.equal(await llm(),1);assert.deepEqual(state().home.layout,{nest:[7,0]});assert.equal(state().coins,78);
 await page.evaluate(()=>hostTest.faults.homeLost=true);await page.locator('#home-decorate').click();await page.waitForFunction(()=>!document.querySelector('#home-retry').hidden);assert.equal(await llm(),2);const committed=structuredClone(state());await page.locator('#home-retry').click();await page.waitForFunction(()=>document.querySelector('#home-retry').hidden);assert.equal(await llm(),2);assert.deepEqual(state(),committed);
 await page.setViewportSize({width:375,height:812});assert(await page.locator('#home-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:fileURLToPath(new URL('mobile.png',shots))});
 await page.locator('#home-close').click();await page.locator('#open-home').click();assert.equal(await llm(),2);
});
test('malformed AI output preserves room and ownership; no automatic retries',async t=>{
 const {page,state}=await setup(t);page.on('dialog',d=>d.accept());await page.locator('.home-item').filter({hasText:'Reading desk'}).getByRole('button').click();await page.locator('#home-purchase-confirm').click();await page.waitForFunction(()=>document.querySelector('#home-status').textContent.startsWith('Reading desk is in storage.')&&!document.querySelector('#home-close').disabled);
 const before=structuredClone(state());await page.evaluate(()=>hostTest.faults.homeMalformed=true);await page.locator('#home-decorate').click();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);assert.deepEqual(state(),before);assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length),1);
});

test('new artwork waits for home choice; one explicit generation and save-only recovery',async t=>{
 const {page,state}=await setup(t),before=structuredClone(state());page.on('dialog',d=>d.accept());
 await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  // Most poses have a detached tail tip: saving/recovery must retain it without
  // mistaking it for another frame or requesting a replacement image.
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){ctx.fillStyle=['#ca682b','#864a30','#7c9957','#467c92'][y];ctx.fillRect(x*128+40,y*128+38,42+x*2,58);ctx.fillRect(x*128+88,y*128+60,14,14);}
  hostTest.faults.homeSpriteSheet=c.toDataURL();hostTest.faults.homeSpriteSave=true;
 });
 assert.equal(await page.locator('#home-sprite').count(),0);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='home-image').length),0);
 await page.locator('#home-close').click();assert.equal(await page.locator('#draw,#draw-dialog').count(),0);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='home-image').length),0);
 await page.locator('#open-home').click();await page.locator('#home-appearance-generate').click();await page.waitForFunction(()=>!document.querySelector('#home-sprite-retry').hidden);
 const first=await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='home-image'));
 assert.equal(first.length,1);assert.equal(first[0].options.reference_image_urls,undefined);assert.match(first[0].options.prompt,/saved visual observations/);
 await page.evaluate(()=>hostTest.faults.save=false);await page.locator('#home-sprite-retry').click();await page.waitForFunction(()=>document.querySelector('#home-sprite-retry').hidden);
 const saved=await page.evaluate(()=>hostTest.state.kv['notebuddy/art-v1']);const entry=Object.values(saved).find(e=>e.format==='home-sprite-v1');assert(entry);assert(entry.path.startsWith(`portraits/${state().pet_id}/`));assert.equal(entry.pet_id,state().pet_id);
 await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready');
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='home-image').length),1);assert.deepEqual(state(),before);
 await page.locator('#home-shop-close').click();await page.locator('#home-inside').click();await page.locator('#home-pause').click();await page.locator('#home-close').click();await page.locator('#open-home').click();
 assert.equal(await page.locator('#home-sprite').count(),0);assert.equal(await page.locator('#home-sprite-retry').isVisible(),false);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='home-image').length),1);
});

test('furniture purchase works inside the Anna sandbox without native modal permission',async t=>{
 const {page,hostPage,state}=await setup(t,true);
 const before=structuredClone(state());
 await page.locator('.home-item').filter({hasText:'Reading desk'}).getByRole('button').click();
 await page.waitForFunction(()=>document.querySelector('#home-purchase-dialog')?.open,{},{timeout:2000});
 assert.deepEqual(state(),before);
 await page.locator('#home-purchase-cancel').click();assert.deepEqual(state(),before);
 await page.locator('.home-item').filter({hasText:'Reading desk'}).getByRole('button').click();
 await page.locator('#home-purchase-confirm').click();
 await page.waitForFunction(()=>document.querySelector('#home-status').textContent.startsWith('Reading desk is in storage.')&&!document.querySelector('#home-close').disabled);
 assert.equal(state().coins,90);assert(state().home.owned.includes('desk'));assert.deepEqual(state().home.layout,before.home?.layout??{nest:[7,0]});
 const bought=structuredClone(state());
 await page.locator('.home-item').filter({hasText:'Little bookcase'}).getByRole('button').click();await page.locator('#home-purchase-cancel').press('Escape');assert.deepEqual(state(),bought);
 await page.locator('#home-close').click();await page.locator('#language').selectOption('ko');await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);await page.locator('#open-home').click();
 await hostPage.setViewportSize({width:360,height:812});
 const available=page.locator('.home-item').filter({has:page.getByRole('button',{name:'구매',exact:true})}).first();await available.getByRole('button',{name:'구매',exact:true}).click();
 assert.match(await page.locator('#home-purchase-help').innerText(),/보관함/);assert.match(await page.locator('#home-purchase-help').innerText(),/꾸며 줘/);
 assert(await page.locator('#home-purchase-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 await page.locator('#home-purchase-cancel').click();assert.deepEqual(state(),bought);
 await page.evaluate(()=>hostTest.faults.homeBuyLost=true);
 await page.locator('.home-item').filter({hasText:'작은 책장'}).getByRole('button').click();await page.locator('#home-purchase-confirm').click();
 await page.waitForFunction(()=>!document.querySelector('#home-retry').hidden);const saved=structuredClone(state());assert.equal(saved.coins,82);
 await page.locator('#home-retry').click();await page.waitForFunction(()=>document.querySelector('#home-retry').hidden);assert.deepEqual(state(),saved);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>['llm','image','home-image'].includes(c.method)).length),0);
});
