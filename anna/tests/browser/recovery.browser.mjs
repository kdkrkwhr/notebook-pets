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
 let failModule=!!faults.appLoad;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='https://notebuddy.test')return route.abort();
  if(url.pathname.includes('/_sdk/'))return route.fulfill({contentType:'text/javascript',body:mock});
  if(url.pathname==='/fixture-upload')return route.fulfill({body:''});
  if(url.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"isolated-ui-test"}'});
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(file==='app.js'&&failModule){failModule=false;return route.fulfill({status:404,body:'Unavailable'});}
  if(file.includes('..'))return route.abort();
  try{await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(f=>{if(!sessionStorage.getItem('test-initialized')){sessionStorage.setItem('test-initialized','1');sessionStorage.setItem('test-faults',JSON.stringify(f));}},faults);
 if(faults.clock)await page.clock.install();
 await page.goto('https://notebuddy.test');if(faults.appLoad)await page.waitForFunction(()=>!document.querySelector('#notice').hidden);else await idle(page);
 t.after(()=>assert.deepEqual(errors,[],'No uncaught browser errors'));
 return page;
}
async function idle(p){await p.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled&&document.querySelector('#messages').dataset.reactionBusy!=='true');}
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
 assert.equal((await calls(p,'image')).length,1);
 const generated=(await calls(p,'image'))[0].options;
 assert.match(generated.prompt,/plain white background/);
 assert.match(generated.prompt,/soft painted game character illustration/);
 assert.doesNotMatch(generated.prompt,/on a warm ivory notebook page|colored pencil/);
 assert.match(await p.locator('#notice').innerText(),/safe in your album/);
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

async function resetDialog(p){await p.locator('#reset-game').click();await idle(p);}
async function confirmReset(p){await p.locator('#reset-quiescent').check();await p.locator('#reset-phrase').fill('RESET NOTEBUDDY');await p.locator('#confirm-reset').click();await idle(p);}
test('new companion reset requires confirmation, preserves cancel, and resumes lost begin plus interrupted cleanup after reopen',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="feed"]').click();await idle(p);
 await resetDialog(p);await p.locator('#confirm-reset').click();assert.match(await p.locator('#reset-error').innerText(),/Check the box/);
 await p.locator('#reset-dialog button').first().click();assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 await p.evaluate(()=>{window.hostTest.state.files={'portraits/old/a.png':'1'};window.hostTest.state.kv['notebuddy/chat-v1']=[{id:'old',role:'user',text:'old chat'}];});
 await fault(p,{resetLost:true,delete:true});await resetDialog(p);await confirmReset(p);
 assert.equal(await p.locator('#resetting').isVisible(),true);assert.equal(await p.locator('#game').isVisible(),false);
 await p.locator('#resume-reset').click();await idle(p);assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.reload();await idle(p);assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.locator('#resume-reset').click();await idle(p);
 assert.equal(await p.locator('#welcome').isVisible(),true);assert.equal(await p.locator('#reset-name').count(),0);assert.equal(await p.evaluate(()=>window.hostTest.state.save),null);await start(p);assert.equal(await p.locator('#xp-label').innerText(),'0 / 100 XP');
 assert.equal(await p.locator('#messages .user').count(),0);assert.equal(await p.evaluate(()=>Object.keys(window.hostTest.state.files).length),0);
 assert.equal((await calls(p,'image')).length,0);assert.equal((await calls(p,'llm')).length,0);
});
test('lost finish response is recovered without clearing the new game again',async t=>{
 const p=await setup(t);await start(p);const fresh=await p.evaluate(()=>structuredClone(window.hostTest.state.save));fresh.pet_id='new';fresh.status.name='Fresh buddy';fresh.status.xp=20;await fault(p,{finishLost:true});await resetDialog(p);await confirmReset(p);
 assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.evaluate(fresh=>{window.hostTest.state.save=fresh;},fresh);
 await p.locator('#resume-reset').click();await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),'20 / 100 XP');assert.equal(await p.locator('#name').innerText(),'Fresh buddy');
});

test('fresh companion and album load revised starter art without paid image calls',async t=>{
 const p=await setup(t);
 await p.locator('#welcome > img').evaluate(img=>img.decode());
 assert.match(await p.locator('#welcome > img').getAttribute('src'),/assets\/starters-v1\//);
 await start(p);
 await p.locator('#pet-image').evaluate(img=>img.decode());
 assert.match(await p.locator('#pet-image').getAttribute('src'),/assets\/starters-v1\/fairy_nature_stage1\.png$/);
 assert.ok(await p.locator('#pet-image').evaluate(img=>img.naturalWidth>=640));
 assert.equal((await calls(p,'image')).length,0);
});


test('care automatically reacts in chat and manual chat still works',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 assert.equal((await calls(p,'llm')).length,1);assert.equal(await p.locator('[data-reaction-state="done"]').count(),1);
 await p.locator('#chat-input').fill('Hello');await p.locator('#chat-form button').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,2);assert.match(await p.locator('#messages').innerText(),/happy to see/);
});
test('a missing startup module shows a recovery button instead of endless Connecting',async t=>{
 const p=await setup(t,{appLoad:true});assert.match(await p.locator('#notice').innerText(),/load/);
 assert.equal(await p.locator('#refresh').isDisabled(),false);
 await p.locator('#refresh').click();await idle(p);assert.equal(await p.locator('#welcome').isVisible(),true);
});
test('encounter art and 2D battle replay use one committed result; skip only changes presentation',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="walk"]').click();await idle(p);
 await p.waitForFunction(()=>document.querySelector('#encounter-enemy').naturalWidth>0);
 assert.match(await p.locator('#encounter-enemy').getAttribute('src'),/dragon_fire/);
 await p.locator('[data-action="battle"]').click();await idle(p);assert.equal(await p.locator('#battle-dialog').isVisible(),true);
 await p.locator('#battle-skip').click();
 assert.equal(await p.locator('#battle-enemy-hp').evaluate(e=>e.value),0);
 assert.equal(await p.locator('#battle-own-hp').evaluate(e=>e.value),6);
 await p.locator('#battle-skip').click();assert.equal(await p.locator('#battle-dialog').isVisible(),false);
 assert.equal((await calls(p,'battle')).length,1);assert.equal(await p.locator('#xp-label').innerText(),'20 / 100 XP');
 await p.reload();await idle(p);assert.equal(await p.locator('#battle-dialog').isVisible(),false);
});
test('battle supports 360px and reduced motion',async t=>{
 const p=await setup(t);await start(p);await p.setViewportSize({width:360,height:740});await p.emulateMedia({reducedMotion:'reduce'});
 await p.locator('[data-action="walk"]').click();await idle(p);await p.locator('[data-action="battle"]').click();await idle(p);
 assert.equal(await p.locator('#battle-enemy-hp').evaluate(e=>e.value),0);
 assert.equal(await p.locator('#battle-skip').innerText(),'Close');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
 if(process.env.NOTEBUDDY_SCREENSHOT)await p.screenshot({path:process.env.NOTEBUDDY_SCREENSHOT});
 await p.keyboard.press('Escape');assert.equal(await p.locator('#battle-dialog').isVisible(),false);
});

test('removed game explicitly restarts, resumes cleanup and reopens as a new partner',async t=>{
 const p=await setup(t,{erased:true});
 await p.evaluate(()=>{window.hostTest.state.kv={'notebuddy/chat-v1':{_notebuddy_erased:1},'notebuddy/art-v1':{_notebuddy_erased:1}};window.hostTest.state.files={'portraits/old/file.png':'etag'};});
 assert.equal(await p.locator('#removed').isVisible(),true);
 await p.locator('#restart-removed').click();assert.match(await p.locator('#reset-dialog').innerText(),/cannot be restored/);
 await p.locator('#reset-dialog button').first().click();assert.equal((await p.evaluate(()=>window.hostTest.calls.filter(c=>c.method==='reset'&&c.args.action==='begin'))).length,0);
 await p.locator('#restart-removed').click();await fault(p,{delete:true});await confirmReset(p);
 assert.equal(await p.locator('#resetting').isVisible(),true);assert.equal(await p.locator('#game').isVisible(),false);
 await fault(p,{delete:false});await p.locator('#resume-reset').click();await idle(p);
 assert.equal(await p.locator('#welcome').isVisible(),true);assert.equal(await p.locator('#removed').isVisible(),false);await start(p);
 await p.reload();await idle(p);assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),[]);
});

test('walk counter recovers locally without issuing actions and caps at five',async t=>{
 const p=await setup(t,{clock:true});await start(p);
 await p.evaluate(()=>{window.hostTest.state.save.status.walk_energy={charges:0,capacity:5,next_in_seconds:2,recharge_seconds:300};});
 await p.locator('#refresh').click();await idle(p);
 assert.match(await p.locator('#walk-energy').innerText(),/0\/5/);
 const before=(await calls(p,'walk')).length;
 await p.clock.fastForward(3000);
 assert.match(await p.locator('#walk-energy').innerText(),/1\/5/);
 await p.clock.fastForward(1800000);
 assert.match(await p.locator('#walk-energy').innerText(),/5\/5/);
 assert.equal((await calls(p,'walk')).length,before);
});

test('care reactions show pending after committed care without blocking another action',async t=>{
 const p=await setup(t,{llmDelay:800});await start(p);
 await p.locator('[data-action="feed"]').click();await p.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 await p.waitForFunction(()=>document.querySelector('#messages').textContent.includes('is reacting'));
 assert.equal(await p.locator('[data-action="play"]').isEnabled(),true);await p.locator('[data-action="play"]').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,2);assert.equal(await p.locator('[data-reaction-state="done"]').count(),2);
 const prompts=await p.evaluate(()=>window.hostTest.calls.filter(x=>x.method==='llm').map(x=>x.prompt));
 assert.match(prompts[0],/"command":"feed"/);assert.match(prompts[1],/"command":"play"/);
});
test('failed care reaction preserves game result and never retries on refresh or reopen',async t=>{
 const p=await setup(t,{llm:true});await start(p);await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');assert.match(await p.locator('#reaction-status').innerText(),/Care is saved/);
 assert.equal(await p.locator('[data-reaction-state="failed"]').count(),1);
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'llm')).length,1);
 await p.reload();await idle(p);assert.equal((await calls(p,'llm')).length,0);
});
test('reaction save retry preserves received text and never calls AI or care again',async t=>{
 const p=await setup(t,{reactionSave:true});await start(p);await p.locator('[data-action="snack"]').click();await idle(p);
 assert.equal(await p.locator('#retry-reaction').isVisible(),true);assert.match(await p.locator('#messages').innerText(),/happy to see/);
 await fault(p,{reactionSave:false});await p.locator('#retry-reaction').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,1);assert.equal((await calls(p,'snack')).length,1);
 await p.reload();await idle(p);assert.equal(await p.locator('[data-reaction-state="done"]').count(),1);
});
test('lost care response produces one reaction only after the same action retry',async t=>{
 const p=await setup(t);await start(p);await fault(p,{lost:true});await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,0);await p.locator('#retry-action').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,1);assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'llm')).length,1);
});
test('reset during a delayed care reaction discards the old response',async t=>{
 const p=await setup(t,{llmDelay:600});await start(p);await p.locator('[data-action="feed"]').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='llm'));await resetDialog(p);await confirmReset(p);await idle(p);
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),[]);
 assert.equal(await p.locator('[data-reaction-state="done"]').count(),0);
});

test('manual chat remains visible while a care reaction saves concurrently',async t=>{
 const p=await setup(t,{llmDelay:400});await start(p);await p.locator('[data-action="feed"]').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='llm'));await fault(p,{llmDelay:1400});
 await p.locator('#chat-input').fill('Still here');await p.locator('#chat-form button').click();
 await p.waitForFunction(()=>document.querySelector('[data-reaction-state="done"]'));
 assert.match(await p.locator('#messages').innerText(),/Still here/);await idle(p);
 const stored=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']);assert.equal(stored.length,3);assert.equal(stored.filter(x=>x.kind==='reaction').length,1);
});

async function drawSketch(p){
 const box=await p.locator('#art-canvas').boundingBox();
 await p.mouse.move(box.x+box.width*.25,box.y+box.height*.25);await p.mouse.down();
 await p.mouse.move(box.x+box.width*.65,box.y+box.height*.65,{steps:8});await p.mouse.up();
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);
}
async function artwork(p){
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();await drawSketch(p);
}
async function artStart(p){await p.locator('#pet-name').fill('My artwork buddy');await p.locator('#start-form button').click();await idle(p);}

test('artwork first meeting validates source then saves a referenced baby; reopen never regenerates',async t=>{
 const p=await setup(t);await artwork(p);await artStart(p);
 assert.equal((await calls(p,'start')).length,1);assert.equal((await calls(p,'llm')).length,1);
 const generated=await calls(p,'image');assert.equal(generated.length,1);assert.equal(generated[0].options.reference_image_urls,undefined);assert.match(generated[0].options.prompt,/round face and gold ears/);
 assert.match(generated[0].options.prompt,/species fairy and element nature/);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
 const saved=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(saved['isolated-fixture/birth-source'].phase,'done');assert.ok(saved['isolated-fixture/stage-1'].path);
 await p.reload();await idle(p);assert.equal((await calls(p,'image')).length,0);
 assert.match(await p.locator('#image-caption').innerText(),/portrait/i);
});
test('drawing-only editor rejects blank input locally and exposes no upload controls',async t=>{
 const p=await setup(t);await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 assert.equal(await p.locator('input[type=file]').count(),0);assert.equal(await p.locator('#art-input-kind').count(),0);
 assert.equal(await p.locator('#art-canvas').isVisible(),true);
 await p.locator('#art-use').click();await p.waitForFunction(()=>document.querySelector('#art-editor-error').textContent.includes('clear shape'));
 assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'start')).length,0);
 await p.locator('#art-dialog form button').click();assert.equal((await calls(p,'image')).length,0);
});
test('drawing with undo produces a source and works in a narrow Korean UI',async t=>{
 const p=await setup(t);await p.setViewportSize({width:360,height:800});await p.locator('#language').selectOption('ko');await idle(p);
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 const box=await p.locator('#art-canvas').boundingBox();await p.mouse.move(box.x+30,box.y+30);await p.mouse.down();await p.mouse.move(box.x+100,box.y+100);await p.mouse.up();
 await p.locator('#art-undo').click();await p.locator('#art-use').click();await p.waitForFunction(()=>document.querySelector('#art-editor-error').textContent.includes('참고할 형태'));assert.match(await p.locator('#art-editor-error').innerText(),/참고할 형태/);
 await p.mouse.move(box.x+40,box.y+50);await p.mouse.down();await p.mouse.move(box.x+130,box.y+130);await p.mouse.up();
 assert.equal(await p.evaluate(()=>document.querySelector('#art-dialog').scrollWidth<=document.querySelector('#art-dialog').clientWidth),true);
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);await artStart(p);
 assert.equal((await calls(p,'image')).length,1);
});
test('AI refusal and unclear artwork do not create a pet or send a generation request',async t=>{
 const p=await setup(t,{artDecision:'reject'});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-status').innerText(),/could not use this image/i);assert.equal((await calls(p,'start')).length,0);assert.equal((await calls(p,'image')).length,0);
 await fault(p,{artDecision:'unclear'});await artStart(p);assert.match(await p.locator('#birth-status').innerText(),/clear shape/);assert.equal((await calls(p,'start')).length,0);
});
test('vision outage and malformed assessment do not blame the artwork or silently allow it',async t=>{
 const p=await setup(t,{llm:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-status').innerText(),/not a rejection/);assert.equal((await calls(p,'start')).length,0);
 await fault(p,{llm:false,artMalformed:true});await artStart(p);assert.match(await p.locator('#birth-status').innerText(),/not a rejection/);assert.equal((await calls(p,'start')).length,0);
});
test('generation outage keeps species and source; refresh never retries and explicit retry does not reroll',async t=>{
 const p=await setup(t,{image:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/not finish generating/);
 const before=await p.evaluate(()=>({pet:window.hostTest.state.save.pet_id,species:window.hostTest.state.save.species_key,element:window.hostTest.state.save.element_key}));
 assert.equal((await calls(p,'start')).length,1);assert.equal((await calls(p,'image')).length,1);
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'image')).length,1);
 await fault(p,{image:false});await p.locator('#retry-birth').click();await idle(p);
 assert.equal((await calls(p,'image')).length,2);assert.equal((await calls(p,'start')).length,1);assert.equal((await calls(p,'llm')).length,1);
 assert.deepEqual(await p.evaluate(()=>({pet:window.hostTest.state.save.pet_id,species:window.hostTest.state.save.species_key,element:window.hostTest.state.save.element_key})),before);
});
test('generation refusal asks for another source; retry does not resend refused artwork',async t=>{
 const p=await setup(t,{imageRefusal:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/could not use this image/i);
 await p.locator('#retry-birth').click();await idle(p);assert.equal((await calls(p,'image')).length,1);
 await p.locator('#default-birth').click();await idle(p);assert.equal(await p.locator('#birth-recovery').isVisible(),false);assert.equal((await calls(p,'start')).length,1);
});
test('received birth portrait retries only saving after upload failure',async t=>{
 const p=await setup(t,{birthUpload:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/saving is unfinished/);
 assert.match(await p.locator('#retry-birth').innerText(),/saving/);
 await p.locator('#retry-birth').click();await idle(p);assert.equal((await calls(p,'image')).length,1);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
});
test('failed source upload recovers without rechecking or creating another pet',async t=>{
 const p=await setup(t,{upload:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/reference/);assert.equal((await calls(p,'image')).length,0);
 await p.locator('#retry-birth').click();await idle(p);assert.equal((await calls(p,'image')).length,1);assert.equal((await calls(p,'llm')).length,1);assert.equal((await calls(p,'start')).length,1);
});
test('lost birth action reply keeps the same action and artwork until explicit retry',async t=>{
 const p=await setup(t,{lost:true});await artwork(p);await artStart(p);
 assert.equal((await calls(p,'image')).length,0);await p.locator('#retry-action').click();await idle(p);
 const starts=await calls(p,'start');assert.equal(starts.length,2);assert.equal(starts[0].args.request_id,starts[1].args.request_id);assert.equal((await calls(p,'image')).length,1);
});

test('unfinished artwork resumes after reopen without automatically spending allowance',async t=>{
 const p=await setup(t,{image:true});await artwork(p);await artStart(p);await p.reload();await idle(p);
 assert.equal(await p.locator('#birth-recovery').isVisible(),true);assert.equal((await calls(p,'image')).length,0);
 assert.equal(await p.locator('[data-action="feed"]').isDisabled(),true);
 await fault(p,{image:false});await p.locator('#retry-birth').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);assert.equal((await calls(p,'start')).length,0);
 assert.equal(await p.locator('[data-action="feed"]').isEnabled(),true);
});
test('birth metadata save failure before source upload can be recovered after reopen',async t=>{
 const p=await setup(t,{save:true});await artwork(p);await artStart(p);
 assert.equal((await calls(p,'image')).length,0);await p.reload();await idle(p);await fault(p,{save:false});
 await p.locator('#setup-birth').click();await drawSketch(p);
 await p.locator('#retry-birth').click();await idle(p);assert.equal((await calls(p,'start')).length,0);assert.equal((await calls(p,'image')).length,1);
});
test('replacement during birth generation never applies the old artwork to the new pet',async t=>{
 const p=await setup(t,{imageDelay:400});await artwork(p);
 await p.locator('#pet-name').fill('Original');await p.locator('#start-form button').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='image'));
 await p.evaluate(()=>{window.hostTest.state.save.pet_id='replacement';});await idle(p);
 const saved=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(saved?.['replacement/stage-1'],undefined);assert.equal(saved?.['isolated-fixture/stage-1'],undefined);
 assert.match(await p.locator('#notice').innerText(),/changed/);
});

test('lost birth index acknowledgement retains a save-only retry even after refresh',async t=>{
 const p=await setup(t,{lostBirthSave:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/saving is unfinished/);
 assert.equal(await p.locator('#clean-portraits').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);assert.equal(await p.locator('#retry-birth').isVisible(),true);
 await p.locator('#retry-birth').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);assert.equal(await p.locator('#birth-recovery').isVisible(),false);
});


test('reset returns to empty welcome and drawing can be chosen before a new birth',async t=>{
 const p=await setup(t);await start(p);await resetDialog(p);
 assert.equal(await p.locator('#reset-name').count(),0);await confirmReset(p);
 assert.equal(await p.locator('#welcome').isVisible(),true);
 assert.equal(await p.locator('#pet-name').inputValue(),'');
 assert.equal(await p.evaluate(()=>window.hostTest.state.save),null);
 await p.reload();await idle(p);assert.equal(await p.locator('#welcome').isVisible(),true);
 await artwork(p);await artStart(p);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
 assert.equal((await calls(p,'image')).length,1);
});


test('drawing birth hides all game portraits while generating, then reveals the saved portrait',async t=>{
 const p=await setup(t,{imageDelay:1200});await artwork(p);
 await p.locator('#pet-name').fill('Waiting buddy');await p.locator('#start-form button').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='image'));
 assert.equal(await p.locator('#birth-recovery').isVisible(),true);
 assert.equal(await p.locator('#game').isVisible(),false);
 assert.equal(await p.locator('#welcome').isVisible(),false);
 assert.equal(await p.locator('#pet-image').isVisible(),false);
 assert.equal(await p.locator('#birth-recovery .birth-buttons').isVisible(),false);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/Bringing/);
 await idle(p);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
 assert.equal(await p.locator('#pet-image').isVisible(),true);
 assert.equal((await calls(p,'image')).length,1);
});

test('failed drawing stays unrevealed after reload until an explicit default choice',async t=>{
 const p=await setup(t,{image:true});await artwork(p);await artStart(p);
 assert.equal(await p.locator('#game').isVisible(),false);
 await p.reload();await idle(p);
 assert.equal(await p.locator('#game').isVisible(),false);
 assert.equal(await p.locator('#birth-recovery').isVisible(),true);
 assert.equal((await calls(p,'image')).length,0);
 await p.locator('#default-birth').click();await idle(p);
 assert.equal(await p.locator('#game').isVisible(),true);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
 assert.equal((await calls(p,'image')).length,0);
});
