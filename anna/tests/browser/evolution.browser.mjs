import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const bundle=new URL('../../bundle/',import.meta.url),root=fileURLToPath(new URL('../../../',import.meta.url));
const mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
function worker(payload){const p=spawnSync(process.env.PYTHON??'python',['-B','-X','utf8','anna/executas/notebuddy/game_worker.py'],{cwd:root,input:JSON.stringify(payload),encoding:'utf8'});assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);}
async function setup(t){
 let state=worker({command:'start',name:'Growing buddy'}).state;
 state.level=10;state.journey={version:1,counts:{feed:10,walk:3},recent:[],routes:[0,0],completed:0,endings:[],visits:{},arc:null,chapter:0,last_arc:null,current:null};
 const initial=worker({command:'status',state});assert.equal(initial.result.ok,true,JSON.stringify(initial));
 const save={...initial.result,...initial.view,request_id_prefix:'nb2:0:'};
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1280,height:1000}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();
  if(u.pathname.includes('/_sdk/'))return route.fulfill({body:mock,contentType:'text/javascript'});
  if(u.pathname==='/fixture-upload')return route.fulfill({body:''});
  if(u.pathname==='/fixture-evolution'){const a=JSON.parse(route.request().postData()),r=worker({...a,state});if(r.changed)state=r.state;return route.fulfill({json:{...r.result,...r.view,request_id_prefix:'nb2:0:'}});}
  if(u.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"evolution-test"}'});
  const file=u.pathname==='/'?'index.html':u.pathname.slice(1);if(file.includes('..'))return route.abort();try{await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.json')?'application/json':'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(save=>{if(!localStorage.getItem('test-host'))localStorage.setItem('test-host',JSON.stringify({sequence:0,save,kv:{'notebuddy/chat-v1':[{id:'chat',role:'user',text:'I like quiet walks.',at:1}]}}));sessionStorage.setItem('test-faults',JSON.stringify({evolutionCore:true}));},save);
 await page.goto('https://notebuddy.test');await page.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);await page.locator('#title-start').click();await page.locator('#open-evolution').click();
 return {page,state:()=>state};
}
const calls=page=>page.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm'||c.method==='image'||c.method==='home-image'));
const idle=page=>page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
test('real core: one personalized vision call, three stable routes, one text-only image, mobile and no home auto-generation',async t=>{
 const {page,state}=await setup(t),id=state().pet_id;
 assert.equal((await calls(page)).length,0);await page.locator('#evolution-prepare').click();await idle(page);
 assert.equal(await page.locator('.evolution-route').count(),3);assert.equal((await calls(page)).length,1);
 const textCall=(await calls(page))[0];assert(textCall.messages[0].content.some(x=>x.type==='image'));assert(textCall.messages[0].content[0].text.includes('I like quiet walks.'));
 await page.locator('[data-evo-close]').click();await page.locator('#open-evolution').click();assert.equal((await calls(page)).length,1);
 await page.locator('.evolution-route').nth(1).click();
 const shots=new URL('../../../.local/evolution/',import.meta.url);await mkdir(shots,{recursive:true});await page.screenshot({path:fileURLToPath(new URL('desktop.png',shots))});
 await page.setViewportSize({width:375,height:812});assert(await page.locator('#evolution-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:fileURLToPath(new URL('mobile.png',shots))});
 await page.locator('#evolution-confirm').click();await idle(page);
 assert.equal(state().stage,2);assert.equal(state().pet_id,id);assert.equal(state().evolution.records.length,1);
 const image=(await calls(page)).filter(c=>c.method==='image');assert.equal(image.length,1);assert.equal(image[0].options.n,1);assert.equal(image[0].options.reference_image_urls,undefined);assert(image[0].options.prompt.includes('Round gold face'));assert(image[0].options.prompt.includes('Gold markings'));
 assert.equal((await calls(page)).filter(c=>c.method==='home-image').length,0);
 assert.match(await page.locator('#pet-image').getAttribute('src'),/^data:/);
 assert(await page.evaluate(id=>!!hostTest.state.kv['notebuddy/art-v1'][`${id}/stage-2`],id));
});
test('failed route AI falls back once; selecting without portrait never calls image AI',async t=>{
 const {page,state}=await setup(t);await page.evaluate(()=>{
  hostTest.faults.evolutionMalformed=true;
  const v=hostTest.state.save,source=`assets/starters-v1/${v.species_key}_${v.element_key}_stage1.png`;
  hostTest.state.kv['notebuddy/art-v1']={[`${v.pet_id}/home-sprite-stage-1`]:{pet_id:v.pet_id,stage:1,path:`portraits/${v.pet_id}/home-default.png`,source_path:source,format:'home-default-v1'}};
 });
 await page.locator('#evolution-prepare').click();await idle(page);assert.equal((await calls(page)).length,1);
 await page.locator('[data-evo-close]').click();await page.locator('#open-evolution').click();assert.equal((await calls(page)).length,1);
 await page.locator('.evolution-route').first().click();await page.locator('#evolution-image').uncheck();await page.locator('#evolution-confirm').click();await idle(page);
 assert.equal(state().stage,2);assert.equal((await calls(page)).length,1);
 assert(await page.evaluate(id=>hostTest.state.kv['notebuddy/art-v1'][`${id}/home-sprite-stage-2`]?.format==='home-default-v1',state().pet_id));
});
test('lost evolution reply and failed portrait save recover without double evolution or paid retry',async t=>{
 const {page,state}=await setup(t);await page.locator('#evolution-prepare').click();await idle(page);
 await page.evaluate(()=>{hostTest.faults.evolutionLost='evolve';hostTest.faults.evolutionSave=true;});
 await page.locator('.evolution-route').first().click();await page.locator('#evolution-confirm').click();await idle(page);
 assert.equal(state().stage,2);assert(await page.locator('#evolution-retry').isVisible());
 await page.locator('#evolution-retry').click();await idle(page);assert.equal(state().evolution.records.length,1);assert.equal((await calls(page)).filter(c=>c.method==='image').length,1);
 await page.evaluate(()=>{hostTest.faults.save=false;hostTest.faults.evolutionSave=false;});
 await page.locator('#evolution-retry').click();await idle(page);assert.equal((await calls(page)).filter(c=>c.method==='image').length,1);assert(await page.locator('#evolution-retry').isHidden());
});
test('a portrait replaced after suggestions cannot reuse stale visual observations',async t=>{
 const {page,state}=await setup(t);await page.locator('#evolution-prepare').click();await idle(page);
 await page.evaluate(()=>{const id=hostTest.state.save.pet_id;hostTest.state.kv['notebuddy/art-v1'][`${id}/stage-1`]={path:`portraits/${id}/replacement.png`};});
 await page.locator('.evolution-route').first().click();await page.locator('#evolution-confirm').click();await idle(page);
 assert.equal(state().stage,2);assert.equal((await calls(page)).filter(c=>c.method==='image').length,0);
 assert(await page.evaluate(id=>hostTest.state.kv['notebuddy/art-v1'][`${id}/stage-1`].path.endsWith('replacement.png'),state().pet_id));
});

test('evolution image wait stays visible and Escape cannot hide an active request',async t=>{
 const {page}=await setup(t);await page.locator('#evolution-prepare').click();await idle(page);
 await page.clock.install();await page.evaluate(()=>{hostTest.faults.imageDelay=100000;});await page.locator('.evolution-route').first().click();await page.locator('#evolution-confirm').click();
 await page.waitForFunction(()=>document.querySelector('#evolution-status').dataset.activity==='image');await page.keyboard.press('Escape');assert(await page.locator('#evolution-dialog').evaluate(d=>d.open));
 await page.clock.fastForward(31000);assert.match(await page.locator('#evolution-status-activity').innerText(),/longer than usual/);assert.equal((await calls(page)).filter(c=>c.method==='image').length,1);
 await page.clock.fastForward(70000);await idle(page);assert(await page.locator('#evolution-status-activity').isHidden());assert.match(await page.locator('#evolution-status').innerText(),/new portrait is saved/);
});
