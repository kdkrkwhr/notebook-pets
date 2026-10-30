import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const bundle=new URL('../../bundle/',import.meta.url),root=fileURLToPath(new URL('../../../',import.meta.url));
const mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
function worker(payload){const p=spawnSync(process.env.PYTHON??'python',['-B','-X','utf8','anna/executas/notebuddy/game_worker.py'],{cwd:root,input:JSON.stringify(payload),encoding:'utf8'});assert.equal(p.status,0,p.stderr);const result=JSON.parse(p.stdout);assert.notEqual(result.result.code,'invalid_state');return result;}
async function setup(t,sandbox=false,life=false){
 const birth=worker({command:'start',name:'Home buddy',request_id:'birth'});let state=birth.state;state.coins=100;
 if(life)state.home={version:1,revision:0,owned:['nest','bookshelf','plant'],layout:{nest:[7,0],bookshelf:[0,0],plant:[0,3]},previous:null,motion:[],reason:''};
 const initial=worker({command:'status',state});const save={...initial.result,...initial.view,pet_id:state.pet_id,request_id_prefix:'nb2:0:'};
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 if(life)await page.clock.install();
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();if(u.pathname.includes('/_sdk/'))return route.fulfill({body:mock,contentType:'text/javascript'});
  if(u.pathname==='/sandbox-host')return route.fulfill({contentType:'text/html',body:'<iframe src="/" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" style="position:fixed;inset:0;width:100vw;height:100vh;border:0"></iframe>'});
  if(u.pathname==='/fixture-upload')return route.fulfill({body:''});
  if(u.pathname==='/fixture-home'){const args=JSON.parse(route.request().postData()),computed=worker({...args,state});if(computed.changed)state=computed.state;return route.fulfill({json:{...computed.result,...computed.view,request_id_prefix:'nb2:0:'}});}
  if(u.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"home-test"}'});
  const file=u.pathname==='/'?'index.html':u.pathname.slice(1);if(file.includes('..'))return route.abort();try{const type=file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'text/html';await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:type});}catch{await route.fulfill({status:404,body:''});}});
 await page.addInitScript(save=>{localStorage.setItem('test-host',JSON.stringify({sequence:0,save,kv:{}}));sessionStorage.setItem('test-faults',JSON.stringify({home:true}));},save);
 await page.goto('https://notebuddy.test'+(sandbox?'/sandbox-host':''));
 const ui=sandbox?await (await page.locator('iframe').elementHandle()).contentFrame():page;
 await ui.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);await ui.locator('#title-start').click();await ui.locator('#open-home').click();await ui.waitForFunction(()=>document.querySelectorAll('.home-item').length===48);
 await ui.locator('#home-shop-toggle').click();
 return {page:ui,hostPage:page,state:()=>state};
}

test('furniture life shows five-language captions with a default portrait, freezes on pause and stays read only',async t=>{
 const {page,state}=await setup(t,false,true);
 await page.locator('#home-appearance-default').click();
 await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready'&&!document.querySelector('#home-close').disabled);
 await page.locator('#home-shop-close').click();await page.locator('#home-inside').click();
 assert.equal(await page.locator('#home-life').count(),1,'the home scene needs an accessible activity caption');
 const before=structuredClone(state()),savedExtras=await page.evaluate(()=>structuredClone(hostTest.state.kv));
 const seen=new Map();
 for(let i=0;i<120&&seen.size<3;i++){
  await page.clock.runFor(500);
  const current=await page.locator('#home-life').evaluate(e=>({activity:e.dataset.activity,text:e.textContent,visible:!e.hidden}));
  if(current.activity){assert(current.visible);seen.set(current.activity,current.text);}
 }
 assert.deepEqual([...seen.keys()].sort(),['plant','read','rest']);
 assert.match(seen.get('rest'),/Resting/);assert.match(seen.get('read'),/Reading/);assert.match(seen.get('plant'),/plant/);
 await page.locator('#home-tools').evaluate(e=>e.open=true);await page.locator('#home-pause').click();
 const held=await page.locator('#home-life').textContent();await page.clock.runFor(10000);assert.equal(await page.locator('#home-life').textContent(),held);
 assert.equal(await page.locator('#home-canvas').getAttribute('data-appearance'),'default');
 await page.locator('#home-yard').click();assert.equal(await page.locator('#home-life').isVisible(),false);
 await page.locator('#home-close').click();await page.emulateMedia({reducedMotion:'reduce'});
 const localized={ko:'쉬고 있어요',ja:'休んでいます','zh-Hans':'休息','zh-Hant':'休息'};
 for(const [language,fragment] of Object.entries(localized)){
  await page.locator('#language').selectOption(language);await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  await page.locator('#open-home').click();await page.locator('#home-inside').click();
  await page.clock.runFor(1000);assert.equal(await page.locator('#home-life').isVisible(),false,'reduced motion starts paused');
  await page.locator('#home-tools').evaluate(e=>e.open=true);assert.equal(await page.locator('#home-pause').getAttribute('aria-pressed'),'true');await page.locator('#home-pause').click();
  for(let i=0;i<30&&!await page.locator('#home-life').isVisible();i++)await page.clock.runFor(500);
  assert((await page.locator('#home-life').textContent()).includes(fragment),language);
  await page.setViewportSize({width:320,height:740});assert(await page.locator('#home-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  assert(await page.locator('#home-life').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await page.locator('#home-close').click();
 }
 assert.deepEqual(state(),before);assert.deepEqual(await page.evaluate(()=>hostTest.state.kv),savedExtras);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>['llm','image','home-image'].includes(c.method)).length),0);
});
test('real core home: buying and motion never invoke AI; one requested decorate, undo, lost reply retry, and mobile',async t=>{
 const {page,state}=await setup(t),llm=()=>page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length);
 assert.equal(await llm(),0);page.on('dialog',d=>d.accept());
 const buy=async name=>{await page.locator('.home-item').filter({hasText:name}).getByRole('button').click();await page.locator('#home-purchase-confirm').click();await page.waitForFunction(name=>document.querySelector('#home-status').textContent.startsWith(name+' is in storage.')&&!document.querySelector('#home-close').disabled,name);};
 await buy('Reading desk');await buy('Little bookcase');await buy('Leafy plant');assert.equal(await llm(),0);assert.equal(state().coins,78);
 await page.locator('#home-decorate').click();await page.waitForFunction(()=>document.querySelector('#home-reason').textContent.includes('reading corner'));assert.equal(await llm(),1);assert(Object.keys(state().home.layout).length>1);
 const after=structuredClone(state());await page.waitForTimeout(1000);await page.locator('.home-more').evaluate(e=>e.open=true);await page.locator('#home-skip').click();assert.equal(await llm(),1);assert.deepEqual(state(),after);
 const shots=new URL('../../../.local/home-implementation/',import.meta.url);await mkdir(shots,{recursive:true});await page.screenshot({path:fileURLToPath(new URL('desktop.png',shots))});
 await page.locator('.home-more').evaluate(e=>e.open=true);await page.locator('#home-undo').click();await page.waitForFunction(()=>document.querySelector('#home-reason').textContent==='');assert.equal(await llm(),1);assert.deepEqual(state().home.layout,{nest:[7,0]});assert.equal(state().coins,78);
 await page.evaluate(()=>hostTest.faults.homeLost=true);await page.locator('#home-decorate').click();await page.waitForFunction(()=>!document.querySelector('#home-retry').hidden);assert.equal(await llm(),2);const committed=structuredClone(state());await page.locator('#home-retry').click();await page.waitForFunction(()=>document.querySelector('#home-retry').hidden);assert.equal(await llm(),2);assert.deepEqual(state(),committed);
 await page.setViewportSize({width:375,height:812});assert(await page.locator('#home-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:fileURLToPath(new URL('mobile.png',shots))});
 await page.locator('#home-close').click();await page.locator('#open-home').click();assert.equal(await llm(),2);
});
test('garden catalog filters, buys without AI, places outdoors with one request and undoes safely',async t=>{
 const {page,state}=await setup(t);
 await page.locator('[data-area="yard"]').click();assert.equal(await page.locator('.home-item').count(),36);
 await page.waitForFunction(()=>[...document.querySelectorAll('.home-item img')].every(i=>i.complete&&i.naturalWidth>0));
 const images=await page.locator('.home-item img').evaluateAll(items=>items.map(i=>i.src));assert.equal(new Set(images).size,36,'each garden object has distinct local art');
 await page.locator('#home-shop-category').selectOption('flowers');assert.equal(await page.locator('.home-item').count(),6);
 await page.locator('[data-area="inside"]').click();assert.equal(await page.locator('.home-item').count(),12);assert.equal(await page.locator('#home-shop-category').isVisible(),false);
 await page.locator('[data-area="yard"]').click();
 for(const key of ['yard-tulips','yard-garden-bench','yard-pond']){
  await page.locator(`[data-item="${key}"] button`).click();await page.locator('#home-purchase-confirm').click();
  await page.waitForFunction(k=>hostTest.state.save.home.owned.includes(k)&&!document.querySelector('#home-close').disabled,key);
 }
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length),0);assert.deepEqual(state().home.layout,{nest:[7,0]});
 const coins=state().coins;await page.locator('#home-decorate').click();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled&&Object.keys(hostTest.state.save.home.layout).length===4);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length),1);
 const world=worker({command:'status',state:state()}).view.home.world;
 assert.equal(world.inside.objects.length,1);assert.equal(world.yard.objects.filter(o=>o.kind.startsWith('yard-')).length,3);
 await page.locator('#home-shop-close').click();await page.locator('#home-yard').click();await page.locator('#home-tools').evaluate(e=>e.open=true);await page.locator('#home-pause').click();
 const shots=new URL('../../../.local/home-garden/',import.meta.url);await mkdir(shots,{recursive:true});await page.screenshot({path:fileURLToPath(new URL('yard.png',shots))});
 await page.locator('#home-shop-toggle').click();await page.setViewportSize({width:360,height:812});
 assert(await page.locator('#home-shop-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:fileURLToPath(new URL('mobile-shop.png',shots))});
 await page.locator('#home-shop-close').click();await page.locator('.home-more').evaluate(e=>e.open=true);await page.locator('#home-undo').click();await page.waitForFunction(()=>Object.keys(hostTest.state.save.home.layout).length===1&&!document.querySelector('#home-close').disabled);
 assert.equal(state().coins,coins);assert.equal(state().home.owned.length,4);assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length),1);
});

test('home browsing preserves the world, collection filters and secondary controls use no AI',async t=>{
 const {page}=await setup(t);
 const world=await page.locator('.home-world').boundingBox(),panel=await page.locator('#home-shop-panel').boundingBox();
 assert(world.x+world.width<=panel.x+1,'desktop shop must not cover the world');
 assert.equal(await page.locator('#home-undo').isVisible(),false);
 assert.equal(await page.locator('#home-pause').isVisible(),false);
 await page.locator('[data-mode="storage"]').click();assert.equal(await page.locator('.home-item').count(),1);
 await page.locator('[data-area="yard"]').click();assert.equal(await page.locator('.home-item').count(),0);assert(await page.locator('.home-shop-empty').isVisible());
 await page.locator('[data-mode="shop"]').click();assert.equal(await page.locator('.home-item').count(),36);
 await page.setViewportSize({width:360,height:812});
 const smallWorld=await page.locator('.home-world').boundingBox(),smallPanel=await page.locator('#home-shop-panel').boundingBox();
 assert(smallWorld.height>=140);assert(smallWorld.y+smallWorld.height<=smallPanel.y+1);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#home-shop-panel').isVisible(),false);assert(await page.locator('#home-dialog').isVisible());
 await page.locator('#home-tools summary').click();assert(await page.locator('#home-pause').isVisible());
 await page.locator('#home-shop-toggle').click();assert.equal(await page.locator('#home-pause').isVisible(),false);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm'||c.method==='image').length),0);
});

test('home renews expired image links on entry and reports an actual image load failure',async t=>{
 const {page}=await setup(t);
 await page.locator('#home-appearance-default').click();
 await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready'&&!document.querySelector('#home-close').disabled);
 await page.locator('#home-close').click();
 await page.evaluate(()=>{
  const entry=Object.values(hostTest.state.kv['notebuddy/art-v1']).find(e=>e.format==='home-default-v1');
  hostTest.faults.portraits={[entry.path]:'/expired-home-image'};
 });
 await page.route('**/expired-home-image',route=>route.fulfill({status:403,body:''}));
 await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 // The app retains the old signed link, while the next signing request returns a fresh one.
 await page.evaluate(()=>{hostTest.faults.portraits={};});
 await page.locator('#open-home').click();
 await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);
 assert.equal(await page.locator('#home-canvas').getAttribute('data-sprite'),'ready');
 assert.equal(await page.locator('#home-empty').isVisible(),false);
 await page.locator('#home-close').click();
 await page.evaluate(()=>{const e=Object.values(hostTest.state.kv['notebuddy/art-v1']).find(e=>e.format==='home-default-v1');hostTest.faults.portraits={[e.path]:'/expired-home-image'};});
 await page.locator('#open-home').click();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);
 assert.equal(await page.locator('#home-canvas').getAttribute('data-sprite'),'missing');
 assert.equal(await page.locator('#home-empty').isVisible(),true);
 assert.equal(await page.locator('#home-appearance-choice').isVisible(),false);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>['llm','image','home-image'].includes(c.method)).length),0);
 await page.locator('#home-close').click();await page.evaluate(()=>{hostTest.faults.portraits={};});
 await page.locator('#open-home').click();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);
 assert.equal(await page.locator('#home-canvas').getAttribute('data-sprite'),'ready');
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
 await page.locator('#home-shop-close').click();await page.locator('#home-inside').click();await page.locator('#home-tools').evaluate(e=>e.open=true);await page.locator('#home-pause').click();await page.locator('#home-close').click();await page.locator('#open-home').click();
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
