import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const bundle=new URL('../../bundle/',import.meta.url),root=fileURLToPath(new URL('../../../',import.meta.url));
const mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
function worker(payload){const p=spawnSync(process.env.PYTHON??'python',['-B','-X','utf8','anna/executas/notebuddy/game_worker.py'],{cwd:root,input:JSON.stringify(payload),encoding:'utf8'});assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);}
async function setup(t,{newPet=false,width=320,height=568}={}){
 let state;
 if(!newPet){state=worker({command:'start',name:'Mobile buddy'}).state;state.level=10;state.coins=100;state.journey={version:1,counts:{feed:10,walk:3},recent:[],routes:[0,0],completed:0,endings:[],visits:{},arc:null,chapter:0,last_arc:null,current:null};}
 const save=state?{...worker({command:'status',state}).result,...worker({command:'status',state}).view,request_id_prefix:'nb2:0:'}:null;
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});page.setDefaultTimeout(20000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();
  if(u.pathname.includes('/_sdk/'))return route.fulfill({body:mock,contentType:'text/javascript'});
  if(u.pathname==='/anna-tool-ids.js')return route.fulfill({body:'window.__ANNA_TOOL_IDS__={notebuddy:"mobile-test"}',contentType:'text/javascript'});
  if(u.pathname==='/fixture-upload')return route.fulfill({body:''});
  if(['/fixture-home','/fixture-evolution'].includes(u.pathname)){
   const r=worker({...JSON.parse(route.request().postData()),state});if(r.changed)state=r.state;return route.fulfill({json:{...r.result,...r.view,request_id_prefix:'nb2:0:'}});
  }
  try{
   const f=u.pathname==='/'?'index.html':u.pathname.slice(1);let body=await readFile(new URL(f,bundle));
   // The production mobile shell injects viewport metadata. Emulate that here.
   if(f==='index.html')body=body.toString().replace('<head>','<head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
   return route.fulfill({body,contentType:/\.m?js$/.test(f)?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.woff2')?'font/woff2':'text/html'});
  }catch{return route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(save=>{
  localStorage.setItem('test-host',JSON.stringify({sequence:0,save,kv:{}}));sessionStorage.setItem('test-faults',JSON.stringify({home:true,evolutionCore:true}));
 },save);
 await page.goto('https://notebuddy.test/',{waitUntil:'domcontentloaded'});await idle(page);return page;
}
const idle=page=>page.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);
async function fits(page,selector='body'){
 const result=await page.locator(selector).evaluate(e=>{
  const r=e.getBoundingClientRect();return {scroll:e.scrollWidth,client:e.clientWidth,left:r.left,right:r.right,width:innerWidth};
 });
 assert(result.scroll<=result.client+1,`${selector} horizontal overflow: ${JSON.stringify(result)}`);
 assert(result.left>=-1&&result.right<=result.width+1,`${selector} outside viewport: ${JSON.stringify(result)}`);
}
async function targets(page,selector){
 const failures=await page.locator(selector).evaluateAll(elements=>elements.filter(e=>e.checkVisibility()&&!e.disabled).flatMap(e=>{const r=e.getBoundingClientRect();return r.width<43.5||r.height<43.5?[{id:e.id,text:e.textContent.slice(0,45),width:r.width,height:r.height}]:[];}));
 assert.deepEqual(failures,[],'touch targets must be at least 44×44');
}
async function shot(page,name){const dir=new URL('../../../.local/mobile-support/',import.meta.url);await mkdir(dir,{recursive:true});await page.screenshot({path:fileURLToPath(new URL(name+'.png',dir))});}

test('touch: five locales fit 320px, help opens on tap, menus and collections are usable without AI',async t=>{
 const page=await setup(t);await fits(page,'#title-screen');await page.locator('#title-start').tap();
 const snapshot=()=>page.evaluate(()=>{const s=hostTest.state.save;return {pet:s.pet_id,stage:s.stage,xp:s.xp,stats:s.stats,inventory:s.inventory,kv:JSON.stringify(hostTest.state.kv)};});
 const before=await snapshot();
 for(const lang of ['en','ko','ja','zh-Hans','zh-Hant']){
  await page.locator('#language').selectOption(lang);await idle(page);await fits(page);
  await targets(page,'.header-controls button,.header-controls select,.actions button,button.explanation-help,button.care-ai-help-button');
  await page.locator('#care-ai-help').tap();assert.equal(await page.locator('#care-ai-tooltip').isVisible(),true);await fits(page,'#care-ai-tooltip');await page.locator('#care-ai-help').tap();assert.equal(await page.locator('#care-ai-tooltip').isVisible(),false);
  const hint=page.locator('.album-card .explanation-help').first();await hint.tap();const id=await hint.getAttribute('aria-describedby');assert.equal(await page.locator('#'+id).isVisible(),true);await fits(page,'#'+id);await hint.tap();assert.equal(await page.locator('#'+id).isVisible(),false);
  await page.locator('#open-theme').tap();await fits(page,'#theme-dialog');await targets(page,'#theme-dialog button,.theme-option');await page.locator('#theme-done').tap();
  await page.locator('#open-items').tap();await fits(page,'#item-catalog');await targets(page,'#item-catalog button,#item-catalog select');await page.locator('.item-card').first().tap();await fits(page,'#item-detail');await page.locator('#close-item-detail').tap();await page.locator('#close-items').tap();
  if(lang==='ko'){await page.evaluate(()=>scrollTo(0,0));await shot(page,'main-ko-320');}
 }
 assert.deepEqual(await snapshot(),before);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>['llm','image','home-image','personality-llm'].includes(c.method)).length),0);
});

test('touch: birth drawing, file selection and small-screen text entry remain usable',async t=>{
 const page=await setup(t,{newPet:true});await page.locator('#title-start').tap();await fits(page,'#welcome');
 await page.locator('#language').selectOption('ko');await page.locator('#birth-mode').selectOption('art');await page.locator('#choose-art').tap();await fits(page,'#art-dialog');await targets(page,'#art-dialog button,#art-dialog select');
 const box=await page.locator('#art-canvas').boundingBox();assert(box.width<=296);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
 await page.locator('#art-input-mode').selectOption('file');await fits(page,'#art-dialog');await page.locator('#art-dialog [data-i18n="artCancel"]').tap();
 await page.locator('#birth-mode').selectOption('random');await page.locator('#pet-name').fill('Mobile friend');await page.locator('#start-form button').tap();await idle(page);assert.equal(await page.locator('#name').innerText(),'Mobile friend');
 // Reduced-height viewport represents the space left above an on-screen keyboard.
 await page.setViewportSize({width:320,height:300});await page.locator('#chat-input').tap();await page.locator('#chat-input').fill('Hello');
 await fits(page);await targets(page,'#chat-form button');await page.locator('#chat-form button').tap();await idle(page);assert.equal(await page.locator('#chat-input').inputValue(),'');
});

test('touch: safe areas, home shop, purchases, evolution and rotation fit the mobile container',async t=>{
 const page=await setup(t);await page.locator('#title-start').tap();await page.locator('#language').selectOption('ko');
 await page.evaluate(()=>{for(const [edge,value]of Object.entries({top:24,bottom:20,left:10,right:10}))document.documentElement.style.setProperty('--anna-safe-area-'+edge,value+'px');});
 await page.locator('#open-home').tap();await page.waitForFunction(()=>document.querySelectorAll('.home-item').length===48);
 await page.locator('#home-appearance-default').tap();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);await fits(page,'#home-dialog');
 const r=await page.locator('#home-dialog').boundingBox();assert(r.x>=10&&r.y>=24&&r.y+r.height<=548);
 await targets(page,'#home-dialog button:not([hidden]),#home-dialog summary');
 await page.locator('#home-shop-toggle').tap();await fits(page,'#home-shop-panel');await targets(page,'#home-shop-panel button,#home-shop-panel select');
 await page.locator('[data-area="yard"]').tap();await page.locator('[data-item="yard-tulips"] button').tap();await fits(page,'#home-purchase-dialog');await targets(page,'#home-purchase-dialog button');await page.locator('#home-purchase-cancel').tap();
 await shot(page,'home-shop-ko-320');await page.locator('#home-shop-close').tap();await page.locator('#home-close').tap();
 await page.locator('#open-evolution').tap();await fits(page,'#evolution-dialog');await page.locator('#evolution-prepare').tap();await idle(page);await fits(page,'#evolution-dialog');await targets(page,'#evolution-dialog button');
 await page.locator('.evolution-route').nth(1).tap();await shot(page,'evolution-ko-320');
 const close=await page.locator('[data-evo-close]').boundingBox();assert(close.y>=24&&close.y+close.height<=548,'evolution close stays visible while scrolling');
 await page.setViewportSize({width:568,height:320});await fits(page,'#evolution-dialog');await page.locator('[data-evo-close]').tap();
 await page.locator('#open-home').tap();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);await fits(page,'#home-dialog');await page.locator('#home-shop-toggle').tap();await fits(page,'#home-shop-panel');
 const footer=await page.locator('.home-footer').boundingBox();assert(footer.y+footer.height<=300,'landscape footer stays above the bottom safe area');await page.locator('#home-shop-close').tap();await page.locator('#home-close').tap();
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>['image','home-image'].includes(c.method)).length),0);
});

test('touch: walk decisions and dungeon controls remain reachable in portrait and landscape',async t=>{
 const page=await setup(t);await page.locator('#title-start').tap();
 await page.evaluate(()=>{Object.assign(hostTest.faults,{walkOutcome:'xp'});delete hostTest.state.save.status.dungeons;document.querySelector('#care-ai-enabled').click();});
 await page.locator('[data-action="walk"]').tap();await idle(page);await fits(page,'#walk-story');await targets(page,'#walk-story button');
 await page.locator('#story-choices button').last().tap();await idle(page);await page.locator('#walk-dungeon').tap();
 await page.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='ready');await fits(page,'#dungeon-dialog');await targets(page,'#dungeon-dialog button,#dungeon-dialog summary');
 await shot(page,'dungeon-en-320');
 await page.setViewportSize({width:568,height:320});await page.evaluate(()=>{for(const [edge,value]of Object.entries({left:24,right:24,top:10,bottom:16}))document.documentElement.style.setProperty('--anna-safe-area-'+edge,value+'px');});
 await fits(page,'#dungeon-dialog');const safe=await page.locator('#dungeon-dialog').boundingBox();assert(safe.x>=24&&safe.y>=10&&safe.x+safe.width<=544&&safe.y+safe.height<=304,'dungeon fits landscape safe area');
 await page.locator('#dungeon-enter').tap();await idle(page);await shot(page,'dungeon-landscape-result');
 assert.equal(await page.locator('#dungeon-close').isVisible(),true,await page.locator('#dungeon-dialog').evaluate(e=>JSON.stringify({open:e.open,rect:e.getBoundingClientRect().toJSON(),display:getComputedStyle(e).display,scroll:e.scrollTop})));
 await page.locator('#dungeon-skip').tap();assert.equal(await page.locator('#dungeon-dialog').isVisible(),false);
 assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>['llm','image','home-image'].includes(c.method)).length),0);
});
