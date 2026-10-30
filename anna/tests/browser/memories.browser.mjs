import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const bundle=new URL('../../bundle/',import.meta.url),root=fileURLToPath(new URL('../../../',import.meta.url));
const mock=(await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8')).replace("if(faults.extras)throw", "if(faults.extras||faults.memoryRead&&key==='notebuddy/memories-v1')throw").replace('const reorder=v=>', 'if(!Object.hasOwn(state.kv,key))return {exists:false,value:null};const reorder=v=>').replace("set:async({key,value})=>{", "set:async({key,value})=>{if(key==='notebuddy/memories-v1'&&faults.memoryDelay)await new Promise(r=>setTimeout(r,faults.memoryDelay));");
const key='notebuddy/memories-v1',chat='notebuddy/chat-v1';
function worker(payload){const p=spawnSync(process.env.PYTHON??'python',['-B','-X','utf8','anna/executas/notebuddy/game_worker.py'],{cwd:root,input:JSON.stringify(payload),encoding:'utf8'});assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);}
const messages=[{id:'u',role:'user',text:'  Keep this <script>literal</script>\n우리 이야기  ',at:1700000000123},{role:'assistant',text:'An old message without an ID.',at:1700000001123},{id:'pending',role:'assistant',kind:'reaction',state:'pending',text:'',at:1700000002123},{id:'failed',role:'assistant',kind:'reaction',state:'failed',text:'',at:1700000003123}];
async function setup(t,faults={}){
 const birth=worker({command:'start',name:'Notebook buddy',request_id:'birth'}),state=birth.state;
 const result=worker({command:'status',state}),save={...result.result,...result.view,pet_id:state.pet_id,request_id_prefix:'nb2:0:'};
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();if(u.pathname.includes('/_sdk/'))return route.fulfill({body:mock,contentType:'text/javascript'});if(u.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"memories-test"}'});const file=u.pathname==='/'?'index.html':u.pathname.slice(1);if(file.includes('..'))return route.abort();try{const type=/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'text/html';await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:type});}catch{await route.fulfill({status:404,body:''});}});
 await page.addInitScript(({save,messages,faults})=>{if(!localStorage.getItem('test-host')){localStorage.setItem('test-host',JSON.stringify({sequence:0,save,kv:{'notebuddy/chat-v1':messages}}));sessionStorage.setItem('test-faults',JSON.stringify(faults));}},{save,messages,faults});
 await page.goto('https://notebuddy.test');await idle(page);await page.locator('#title-start').click();return {page,save};
}
const idle=page=>page.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);
const aiCalls=page=>page.evaluate(()=>hostTest.calls.filter(c=>/llm|image/.test(c.method)).length);
async function screenshot(page,name){const dir=new URL('../../../.local/memories/',import.meta.url);await mkdir(dir,{recursive:true});await page.screenshot({path:fileURLToPath(new URL(name,dir))});}
test('actual core milestones and a missing APS notebook save survive reload and rolling chat, with no AI',async t=>{
 const {page,save}=await setup(t);assert.equal(await page.locator('.memory-save').count(),2);assert(await page.locator('.memory-save').first().isEnabled());
 await page.locator('.memory-save').first().click();await page.waitForFunction(()=>hostTest.state.kv['notebuddy/memories-v1']?.entries.length===1);
 await page.locator('#open-memories').click();assert.equal(await page.locator('.memory-note-text').innerText(),messages[0].text);
 await screenshot(page,'en-desktop.png');
 assert.equal(await page.locator('#memory-milestones li').count(),save.memories.length);assert.equal(await page.locator('#memory-notes script').count(),0);
 await page.keyboard.press('Escape');assert(await page.locator('#open-memories').evaluate(e=>e===document.activeElement));
 await page.evaluate(()=>{hostTest.state.kv['notebuddy/chat-v1']=[];localStorage.setItem('test-host',JSON.stringify(hostTest.state));});await page.reload();await idle(page);await page.locator('#title-start').click();await page.locator('#open-memories').click();
 assert.equal(await page.locator('.memory-note-text').innerText(),messages[0].text);assert.equal(await aiCalls(page),0);
 await page.locator('.memory-remove').click();await page.waitForFunction(()=>hostTest.state.kv['notebuddy/memories-v1'].entries.length===0);assert.deepEqual(await page.evaluate(()=>hostTest.state.kv['notebuddy/chat-v1']),[]);
});
test('notebook storage read failure preserves chat and exposes an explicit retry',async t=>{
 const {page}=await setup(t,{memoryRead:true});assert.match(await page.locator('#messages').innerText(),/Keep this/);assert(await page.locator('.memory-save').first().isDisabled());
 await page.locator('#open-memories').click();assert(await page.locator('#memory-retry').isVisible());assert.match(await page.locator('#memory-status').innerText(),/load/i);
 await page.evaluate(()=>hostTest.faults.memoryRead=false);await page.locator('#memory-retry').click();await page.waitForFunction(()=>document.querySelector('#memory-retry').hidden);await page.locator('#memory-close').click();assert(await page.locator('.memory-save').first().isEnabled());assert.equal(await aiCalls(page),0);
});
test('save failure retries the exact message; pet change and reset cannot expose old keepsakes',async t=>{
 const {page}=await setup(t);await page.evaluate(()=>hostTest.faults.save=true);await page.locator('.memory-save').first().click();await page.locator('#open-memories').click();await page.waitForFunction(()=>!document.querySelector('#memory-retry').hidden);
 await page.evaluate(()=>hostTest.faults.save=false);await page.locator('#memory-retry').click();await page.waitForFunction(()=>hostTest.state.kv['notebuddy/memories-v1']?.entries.length===1);assert.equal(await page.locator('.memory-note-text').innerText(),messages[0].text);
 await page.locator('#memory-close').click();await page.evaluate(()=>hostTest.state.save.pet_id='different-pet');await page.locator('#refresh').click();await idle(page);await page.locator('#open-memories').click();assert.equal(await page.locator('.memory-note-text').count(),0);assert.match(await page.locator('#memory-status').innerText(),/companion/i);
 await page.locator('#memory-close').click();await page.locator('#reset-game').click();await page.locator('#reset-quiescent').check();await page.locator('#reset-phrase').fill('RESET NOTEBUDDY');await page.locator('#confirm-reset').click();await idle(page);
 assert.deepEqual(await page.evaluate(()=>hostTest.state.kv['notebuddy/memories-v1']),{});assert.equal(await aiCalls(page),0);
});
test('five locales fit 320 and 390px with 44px controls and truthful missing dates',async t=>{
 const {page}=await setup(t);await page.locator('.memory-save').nth(1).click();await page.waitForFunction(()=>hostTest.state.kv['notebuddy/memories-v1']?.entries.length===1);
 await page.evaluate(()=>hostTest.state.save.memories=[{id:'met',kind:'met',at:null},{id:'victory',kind:'dungeon',region:'hellgate',at:1700000000}]);
 for(const language of ['en','ko','ja','zh-Hans','zh-Hant']){await page.locator('#language').selectOption(language);await idle(page);await page.locator('#open-memories').click();
  assert.equal(await page.locator('#memory-milestones time').count(),1);assert.equal(await page.locator('.memory-note-text').innerText(),messages[1].text);
  if(language!=='en')assert.notEqual(await page.locator('#memory-heading').innerText(),'Our memory notebook');
  for(const width of [320,390]){await page.setViewportSize({width,height:812});assert(await page.locator('#memories-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await page.locator('#memories-dialog button:visible').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44&&e.getBoundingClientRect().width>=44)));if(language==='ko'&&width===320)await screenshot(page,'ko-320.png');}
  await page.locator('#memory-close').click();
 }assert.equal(await aiCalls(page),0);
});

test('refresh during a pending notebook save retains completion and dialog deletion keeps focus',async t=>{
 const {page}=await setup(t,{memoryDelay:800});await page.locator('.memory-save').first().click();await page.locator('#refresh').click();await idle(page);
 await page.waitForFunction(()=>hostTest.state.kv['notebuddy/memories-v1']?.entries.length===1);await page.locator('#open-memories').click();
 assert.equal(await page.locator('.memory-note-text').count(),1);assert(await page.locator('.memory-remove').isEnabled());
 await page.locator('.memory-remove').click();await page.waitForFunction(()=>hostTest.state.kv['notebuddy/memories-v1'].entries.length===0);
 assert(await page.locator('#memory-close').evaluate(e=>e===document.activeElement));assert.equal(await aiCalls(page),0);
});

test('a full notebook reports its limit without evicting saved words or unlocking saved controls',async t=>{
 const {page}=await setup(t);await page.evaluate(()=>{
  hostTest.state.kv['notebuddy/memories-v1']={version:1,pet_id:hostTest.state.save.pet_id,entries:Array.from({length:20},(_,i)=>({id:'msg-'+i.toString(16).padStart(16,'0'),role:'user',text:'Kept '+i,at:1700000000000+i}))};
 });await page.locator('#refresh').click();await idle(page);await page.locator('.memory-save').first().click();await page.locator('#open-memories').click();assert.match(await page.locator('#memory-status').innerText(),/20 messages/);assert.equal(await page.locator('.memory-note-text').count(),20);
 assert.equal(await page.evaluate(()=>hostTest.state.kv['notebuddy/memories-v1'].entries[0].text),'Kept 0');assert.equal(await aiCalls(page),0);
});
