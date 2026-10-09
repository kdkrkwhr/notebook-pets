import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

// Route every request locally. These tests exercise shipped UI, not Anna's
// installer, permission service, storage server or AI provider.
const bundle=new URL('../../bundle/',import.meta.url);
const mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
async function setup(t,faults={}){
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});
 t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1120,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='https://notebuddy.test')return route.abort();
  if(url.pathname.includes('/_sdk/'))return route.fulfill({contentType:'text/javascript',body:mock});
  if(url.pathname==='/fixture-upload')return route.fulfill({body:''});
  if(url.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"isolated-ui-test"}'});
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(file.includes('..'))return route.abort();
  try{await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(f=>{if(!sessionStorage.getItem('test-initialized')){sessionStorage.setItem('test-initialized','1');sessionStorage.setItem('test-faults',JSON.stringify(f));}},faults);
 await page.goto('https://notebuddy.test');await idle(page);
 t.after(()=>assert.deepEqual(errors,[],'No uncaught browser errors'));
 return page;
}
async function idle(p){await p.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);}
async function fault(p,value){await p.evaluate(v=>Object.assign(window.hostTest.faults,v),value);}
async function start(p){await p.locator('#pet-name').fill('Recovery buddy');await p.locator('#start-form button').click();await idle(p);}
async function calls(p,method){return p.evaluate(m=>window.hostTest.calls.filter(x=>x.args?.command===m||x.method===m),method);}

test('initial connection failure recovers using Refresh',async t=>{
 const p=await setup(t,{connect:true});assert.match(await p.locator('#connection').innerText(),/Check/);
 await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('#welcome').isVisible(),true);
 assert.equal((await calls(p,'connect')).length,2);
});
test('denied permission recovers after grant; no automatic creation',async t=>{
 const p=await setup(t,{permission:true});assert.match(await p.locator('#notice').innerText(),/permissions/);
 assert.equal((await calls(p,'start')).length,0);
 await fault(p,{permission:false});await p.locator('#refresh').click();await idle(p);await start(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
});
test('lost creation response has a visible same-request retry',async t=>{
 const p=await setup(t,{lost:true});await start(p);
 assert.equal(await p.locator('#retry-action').isVisible(),true);
 assert.equal(await p.locator('#start-form button').isDisabled(),true);
 await p.locator('#retry-action').click();await idle(p);
 const attempts=await calls(p,'start');assert.equal(attempts.length,2);assert.equal(attempts[0].args.request_id,attempts[1].args.request_id);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
});
test('lost care response retains original retry across refresh; double click spends once',async t=>{
 const p=await setup(t);await start(p);await fault(p,{lost:true,delay:150});
 await p.locator('[data-action="feed"]').evaluate(e=>{e.click();e.click();});await idle(p);
 assert.equal((await calls(p,'feed')).length,1);
 assert.equal(await p.locator('[data-action="play"]').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('[data-action="play"]').isDisabled(),true);
 await p.locator('#retry-action').click();await idle(p);
 const attempts=await calls(p,'feed');assert.equal(attempts[0].args.request_id,attempts[1].args.request_id);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 assert.match(await p.locator('#inventory').innerText(),/Food 2/);
 assert.equal(await p.locator('[data-action="play"]').isDisabled(),false);
});
test('status/storage outages preserve saved progress and recover on refresh',async t=>{
 const p=await setup(t);await start(p);await fault(p,{status:true});await p.locator('#refresh').click();await idle(p);
 assert.match(await p.locator('#connection').innerText(),/Check/);
 await fault(p,{status:false,extras:true});await p.locator('#refresh').click();await idle(p);assert.match(await p.locator('#notice').innerText(),/chat or album/);
 await fault(p,{extras:false});await p.locator('#refresh').click();await idle(p);assert.equal(await p.locator('#notice').isVisible(),false);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
});
test('chat failure restores draft, failed save warns, saved exchange survives reopen',async t=>{
 const p=await setup(t);await start(p);await fault(p,{llm:true});
 await p.locator('#chat-input').fill('Hello');await p.locator('#chat-form button').click();await idle(p);
 assert.equal(await p.locator('#chat-input').inputValue(),'Hello');assert.equal(await p.locator('#messages .user').count(),0);
 await fault(p,{llm:false,save:true});await p.locator('#chat-form button').click();await idle(p);assert.match(await p.locator('#notice').innerText(),/could not be saved/);
 assert.equal(await p.locator('#chat-form button').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);assert.match(await p.locator('#messages').innerText(),/happy to see/);
 await p.locator('#language').selectOption('ko');await idle(p);assert.equal(await p.locator('#retry-chat').isVisible(),true);
 await fault(p,{save:false,lostSave:true});await p.locator('#retry-chat').click();await idle(p);assert.equal(await p.locator('#retry-chat').isVisible(),true);
 await p.locator('#retry-chat').evaluate(e=>{e.click();e.click();});await idle(p);assert.equal(await p.locator('#retry-chat').isVisible(),false);
 assert.equal((await calls(p,'llm')).length,2,'Only initial failed AI call and successful AI reply; save retries never call AI');
 await p.reload();await idle(p);assert.equal(await p.locator('#messages .message').count(),2);assert.match(await p.locator('#messages').innerText(),/Hello/);
});
test('portrait upload retry does not generate twice and survives reopen',async t=>{
 const p=await setup(t);await start(p);await fault(p,{upload:true});await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.match(await p.locator('#draw').innerText(),/Retry saving/);assert.equal(await p.locator('#clean-portraits').isDisabled(),true);await p.locator('#draw').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);assert.match(await p.locator('#notice').innerText(),/safe in your album/);
 await p.reload();await idle(p);assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
 assert.equal(await p.locator('#pet-image').evaluate(e=>e.complete&&e.naturalWidth>0),true);
});
test('360px layout and language switch preserve partner and privacy controls',async t=>{
 const p=await setup(t);await start(p);await p.setViewportSize({width:360,height:740});
 await p.locator('#language').selectOption('ko');await idle(p);assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 await p.locator('#privacy').click();assert.match(await p.locator('#privacy-dialog').innerText(),/개인정보/);
 const size=await p.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width);
 await p.locator('#privacy-dialog button').first().click();await p.locator('#language').selectOption('en');await idle(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
});
test('unconfirmed removal blocks play until refresh verifies the game is active',async t=>{
 const p=await setup(t);await start(p);await p.locator('#privacy').click();await p.locator('#erase-data').click();await idle(p);
 await p.locator('#erase-quiescent').check();await p.locator('#erase-phrase').fill('DELETE NOTEBUDDY');await p.locator('#confirm-erase').click();await idle(p);
 assert.match(await p.locator('#notice').innerText(),/could not be confirmed/);
 assert.equal(await p.locator('[data-action="feed"]').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 assert.equal(await p.locator('[data-action="feed"]').isDisabled(),false);
});


test('pending chat is discarded when the game is removed before retry',async t=>{
 const p=await setup(t);await start(p);await fault(p,{save:true});await p.locator('#chat-input').fill('Temporary');await p.locator('#chat-form button').click();await idle(p);
 await fault(p,{save:false,erased:true});await p.locator('#retry-chat').click();await idle(p);
 assert.equal(await p.locator('#removed').isVisible(),true);assert.equal(await p.locator('#retry-chat').isVisible(),false);
 assert.equal(await p.locator('#messages').innerText(),'');assert.equal((await calls(p,'llm')).length,1);
 assert.equal(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),undefined);
});
test('portrait cleanup confirms intent, retries failures and preserves current and earlier stages',async t=>{
 const p=await setup(t);await start(p);
 await p.evaluate(()=>{
  const s=window.hostTest.state;s.kv['notebuddy/art-v1']={'isolated-fixture/stage-1':{path:'portraits/pet/baby.png'},'isolated-fixture/stage-2':{path:'portraits/pet/current.png'}};
  s.files={'portraits/pet/baby.png':'a','portraits/pet/current.png':'b','portraits/pet/old.png':'c'};
 });
 await p.locator('#clean-portraits').click();await p.locator('#confirm-clean-portraits').click();assert.match(await p.locator('#portraits-error').innerText(),/check the box/);assert.equal((await calls(p,'delete')).length,0);
 await p.locator('#portraits-dialog button').first().click();assert.equal((await calls(p,'delete')).length,0);
 await fault(p,{delete:true});await p.locator('#clean-portraits').click();await p.locator('#portraits-quiescent').check();await p.locator('#confirm-clean-portraits').click();await idle(p);assert.match(await p.locator('#notice').innerText(),/could not finish/);
 await fault(p,{delete:false});await p.locator('#clean-portraits').click();await p.locator('#portraits-quiescent').check();await p.locator('#confirm-clean-portraits').click();await idle(p);
 assert.match(await p.locator('#notice').innerText(),/Removed 1/);assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 assert.deepEqual((await calls(p,'delete')).map(c=>c.path),['portraits/pet/old.png']);assert.equal((await calls(p,'image')).length,0);
});

async function resetDialog(p){await p.locator('#privacy').click();await p.locator('#reset-game').click();await idle(p);}
async function confirmReset(p){await p.locator('#reset-name').fill('Fresh buddy');await p.locator('#reset-quiescent').check();await p.locator('#reset-phrase').fill('RESET NOTEBUDDY');await p.locator('#confirm-reset').click();await idle(p);}
test('new companion reset requires confirmation, preserves cancel, and resumes lost begin plus interrupted cleanup after reopen',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="feed"]').click();await idle(p);
 await resetDialog(p);await p.locator('#confirm-reset').click();assert.match(await p.locator('#reset-error').innerText(),/Enter a new name/);
 await p.locator('#reset-dialog button').first().click();assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 await p.evaluate(()=>{window.hostTest.state.files={'portraits/old/a.png':'1'};window.hostTest.state.kv['notebuddy/chat-v1']=[{id:'old',role:'user',text:'old chat'}];});
 await fault(p,{resetLost:true,delete:true});await resetDialog(p);await confirmReset(p);
 assert.equal(await p.locator('#resetting').isVisible(),true);assert.equal(await p.locator('#game').isVisible(),false);
 await p.locator('#resume-reset').click();await idle(p);assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.reload();await idle(p);assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.locator('#resume-reset').click();await idle(p);
 assert.equal(await p.locator('#name').innerText(),'Fresh buddy');assert.equal(await p.locator('#xp-label').innerText(),'0 / 100 XP');
 assert.equal(await p.locator('#messages .user').count(),0);assert.equal(await p.evaluate(()=>Object.keys(window.hostTest.state.files).length),0);
 assert.equal((await calls(p,'image')).length,0);assert.equal((await calls(p,'llm')).length,0);
});
test('lost finish response is recovered without clearing the new game again',async t=>{
 const p=await setup(t);await start(p);await fault(p,{finishLost:true});await resetDialog(p);await confirmReset(p);
 assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.evaluate(()=>{window.hostTest.state.save.status.xp=20;});
 await p.locator('#resume-reset').click();await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),'20 / 100 XP');assert.equal(await p.locator('#name').innerText(),'Fresh buddy');
});
