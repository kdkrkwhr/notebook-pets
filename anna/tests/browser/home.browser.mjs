import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const bundle=new URL('../../bundle/',import.meta.url),root=fileURLToPath(new URL('../../../',import.meta.url));
const mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
function worker(payload){const p=spawnSync(process.env.PYTHON??'python',['-B','-X','utf8','anna/executas/notebuddy/game_worker.py'],{cwd:root,input:JSON.stringify(payload),encoding:'utf8'});assert.equal(p.status,0,p.stderr);const result=JSON.parse(p.stdout);assert.notEqual(result.result.code,'invalid_state');return result;}
async function setup(t){
 const birth=worker({command:'start',name:'Home buddy',request_id:'birth'});let state=birth.state;state.coins=100;
 const initial=worker({command:'status',state});const save={...initial.result,...initial.view,pet_id:state.pet_id,request_id_prefix:'nb2:0:'};
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();if(u.pathname.includes('/_sdk/'))return route.fulfill({body:mock,contentType:'text/javascript'});
  if(u.pathname==='/fixture-home'){const args=JSON.parse(route.request().postData()),computed=worker({...args,state});if(computed.changed)state=computed.state;return route.fulfill({json:{...computed.result,...computed.view,request_id_prefix:'nb2:0:'}});}
  if(u.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"home-test"}'});
  const file=u.pathname==='/'?'index.html':u.pathname.slice(1);if(file.includes('..'))return route.abort();try{const type=file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'text/html';await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:type});}catch{await route.fulfill({status:404,body:''});}});
 await page.addInitScript(save=>{localStorage.setItem('test-host',JSON.stringify({sequence:0,save,kv:{}}));sessionStorage.setItem('test-faults',JSON.stringify({home:true}));},save);
 await page.goto('https://notebuddy.test');await page.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);await page.locator('#title-start').click();await page.locator('#open-home').click();await page.waitForFunction(()=>document.querySelectorAll('.home-item').length===12);
 return {page,state:()=>state};
}
test('real core home: buying and motion never invoke AI; one requested decorate, undo, lost reply retry, and mobile',async t=>{
 const {page,state}=await setup(t),llm=()=>page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length);
 assert.equal(await llm(),0);page.on('dialog',d=>d.accept());
 const buy=async name=>{await page.locator('.home-item').filter({hasText:name}).getByRole('button').click();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);};
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
 const {page,state}=await setup(t);page.on('dialog',d=>d.accept());await page.locator('.home-item').filter({hasText:'Reading desk'}).getByRole('button').click();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);
 const before=structuredClone(state());await page.evaluate(()=>hostTest.faults.homeMalformed=true);await page.locator('#home-decorate').click();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);assert.deepEqual(state(),before);assert.equal(await page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length),1);
});
