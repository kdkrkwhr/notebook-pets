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


// Model a completed reset elsewhere without invoking paid services or changing
// production saves. The old window still has its original companion cached.
async function replacePartner(p){
 await p.evaluate(()=>{
  const s=window.hostTest.state;s.save.pet_id='another-partner';s.save.status.name='New partner';s.save.status.xp=0;s.sequence++;
  s.kv['notebuddy/chat-v1']=[];s.kv['notebuddy/art-v1']={};
 });
}
test('pending chat retry cannot write the old conversation into a replacement companion',async t=>{
 const p=await setup(t);await start(p);await fault(p,{save:true});
 await p.locator('#chat-input').fill('Old private conversation');await p.locator('#chat-form button').click();await idle(p);
 await replacePartner(p);await fault(p,{save:false});await p.locator('#retry-chat').click();await idle(p);
 assert.equal(await p.locator('#name').innerText(),'New partner');
 assert.equal(await p.locator('#retry-chat').isVisible(),false);
 assert.match(await p.locator('#notice').innerText(),/companion changed/);
 assert.equal(await p.locator('#messages .user').count(),0);
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),[]);
 assert.equal((await calls(p,'llm')).length,1);
});
test('refresh discards pending chat when another window completed reset',async t=>{
 const p=await setup(t);await start(p);await fault(p,{save:true});
 await p.locator('#chat-input').fill('Previous partner');await p.locator('#chat-form button').click();await idle(p);
 await replacePartner(p);await fault(p,{save:false});await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('#retry-chat').isVisible(),false);
 assert.equal(await p.locator('#messages .user').count(),0);
 await p.locator('#chat-input').fill('New conversation');await p.locator('#chat-form button').click();await idle(p);
 const saved=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']);
 assert.equal(saved.length,2);assert.equal(saved[0].text,'New conversation');
});
test('portrait retry stops before upload when the companion was replaced',async t=>{
 const p=await setup(t);await start(p);await fault(p,{upload:true});
 await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.equal((await calls(p,'finalize')).length,1);
 await replacePartner(p);await p.locator('#draw').click();await idle(p);
 assert.equal(await p.locator('#name').innerText(),'New partner');
 assert.match(await p.locator('#notice').innerText(),/companion changed/);
 assert.equal((await calls(p,'finalize')).length,1);
 assert.doesNotMatch(await p.locator('#draw').innerText(),/Retry/);
 assert.equal((await calls(p,'image')).length,1);
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']),{});
});
test('a delayed AI reply is discarded after another window replaces the companion',async t=>{
 const p=await setup(t);await start(p);await fault(p,{llmDelay:700});
 await p.locator('#chat-input').fill('Old delayed message');await p.locator('#chat-form button').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(c=>c.method==='llm'));
 await replacePartner(p);await idle(p);
 assert.equal(await p.locator('#name').innerText(),'New partner');
 assert.equal(await p.locator('#chat-input').inputValue(),'');
 assert.equal(await p.locator('#messages .user').count(),0);
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),[]);
});


async function savePortrait(p){
 await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
}
test('temporary portrait URL and metadata failures preserve the same saved portrait and recover',async t=>{
 const p=await setup(t);await start(p);await savePortrait(p);
 const src=await p.locator('#pet-image').getAttribute('src');
 for(const extras of [false,true]){
  await fault(p,{download:true,extras});await p.locator('#refresh').click();await idle(p);
  assert.match(await p.locator('#notice').innerText(),/chat or album/);
  assert.equal(await p.locator('#pet-image').getAttribute('src'),src);
  assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
 }
 await fault(p,{download:false,extras:false});await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('#notice').isVisible(),false);
 assert.equal((await calls(p,'image')).length,1,'Refresh never regenerates a paid portrait');
});
test('failed lookup of a replacement portrait never restores the old saved file',async t=>{
 const p=await setup(t);await start(p);await savePortrait(p);
 await p.evaluate(()=>{window.hostTest.state.kv['notebuddy/art-v1']['isolated-fixture/stage-1']={path:'portraits/replacement.png'};});
 await fault(p,{download:true});await p.locator('#refresh').click();await idle(p);
 assert.match(await p.locator('#pet-image').getAttribute('src'),/assets\/starters-v1/);
 assert.match(await p.locator('#notice').innerText(),/chat or album/);
 await fault(p,{download:false});await p.locator('#refresh').click();await idle(p);
 assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
});
test('removed portrait references clear cached images even during a URL outage',async t=>{
 const p=await setup(t);await start(p);await savePortrait(p);
 await p.evaluate(()=>{window.hostTest.state.kv['notebuddy/art-v1']={};});
 await fault(p,{download:true});await p.locator('#refresh').click();await idle(p);
 assert.match(await p.locator('#pet-image').getAttribute('src'),/assets\/starters-v1/);
 assert.doesNotMatch(await p.locator('#image-caption').innerText(),/AI portrait/);
 assert.equal(await p.locator('#notice').isVisible(),false);
});


test('first visit guides care reactions, optional chat and album; progress survives reopen',async t=>{
 const p=await setup(t);assert.match(await p.locator('.welcome-help').innerText(),/Random companions start with an included baby picture/);
 await start(p);assert.equal(await p.locator('#first-steps').isVisible(),true);
 await p.locator('#guide-care').click();assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'feed');
 assert.equal((await calls(p,'feed')).length,0);
 await p.keyboard.press('Enter');await idle(p);assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 await p.locator('#guide-chat').click();assert.match(await p.locator('#chat-input').inputValue(),/nice to meet/);
 assert.equal((await calls(p,'llm')).length,1);assert.equal((await calls(p,'image')).length,0);
 await p.locator('#chat-input').fill('My own hello');await p.locator('#guide-chat').click();assert.equal(await p.locator('#chat-input').inputValue(),'My own hello');
 await p.locator('#chat-form button').click();await idle(p);
 await p.locator('#guide-album').click();assert.equal(await p.evaluate(()=>document.activeElement.classList.contains('album-card')),true);
 assert.equal((await calls(p,'image')).length,0);
 await p.reload();await idle(p);assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');assert.match(await p.locator('#messages').innerText(),/My own hello/);
});
test('first-steps guide fits a narrow screen, translates, collapses and respects pending actions',async t=>{
 const p=await setup(t);await p.setViewportSize({width:360,height:740});await start(p);
 await p.locator('#language').selectOption('ko');await idle(p);
 assert.match(await p.locator('#first-steps summary').innerText(),/첫 몇 분/);
 await p.locator('#guide-chat').click();assert.match(await p.locator('#chat-input').inputValue(),/만나서 반가워/);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
 await p.locator('#first-steps summary').click();assert.equal(await p.locator('#guide-chat').isVisible(),false);
 await p.locator('#first-steps summary').click();await fault(p,{lost:true});await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal(await p.locator('#guide-chat').isDisabled(),true);
 await p.locator('#retry-action').click();await idle(p);assert.equal(await p.locator('#guide-chat').isDisabled(),false);
});


test('care-area retry explains uncertain results and reuses the receipt after refresh without double spending',async t=>{
 const p=await setup(t);await start(p);await fault(p,{lost:true,delay:150});
 await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal(await p.locator('#retry-care').isVisible(),true);
 assert.match(await p.locator('#action-result').innerText(),/may already be saved/);
 assert.equal(await p.locator('[data-action="play"]').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('#retry-care').isVisible(),true);
 await p.locator('#retry-care').evaluate(e=>{e.click();e.click();});await idle(p);
 const attempts=await calls(p,'feed');assert.equal(attempts.length,2);
 assert.equal(attempts[0].args.request_id,attempts[1].args.request_id);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 assert.match(await p.locator('#inventory').innerText(),/Food 2/);
 assert.equal(await p.locator('#retry-care').isVisible(),false);
 assert.equal(await p.locator('#retry-action').isVisible(),false);
});
test('initial creation retains its top-level retry and Korean care retry is localized',async t=>{
 const p=await setup(t,{lost:true});await start(p);
 assert.equal(await p.locator('#retry-action').isVisible(),true);
 assert.equal(await p.locator('#retry-care').isVisible(),false);
 await p.locator('#retry-action').click();await idle(p);
 await p.locator('#language').selectOption('ko');await idle(p);await fault(p,{lost:true});
 await p.locator('[data-action="feed"]').click();await idle(p);
 assert.match(await p.locator('#action-result').innerText(),/저장되었을 수/);
 assert.equal(await p.locator('#retry-care').innerText(),'같은 행동 다시 확인하기');
 await p.locator('#retry-care').click();await idle(p);
 assert.equal(await p.locator('#retry-care').isVisible(),false);
});

test('local chat feedback survives unrelated care and translation; retry saves without AI',async t=>{
 const p=await setup(t);await start(p);await fault(p,{llm:true});
 await p.locator('#chat-input').fill('Keep my draft');await p.locator('#chat-form button').click();await idle(p);
 assert.match(await p.locator('#chat-status').innerText(),/back in the input/);
 await fault(p,{llm:false,save:true});await p.locator('#chat-form button').click();await idle(p);
 assert.match(await p.locator('#chat-status').innerText(),/without another AI call/);
 await p.locator('[data-action="feed"]').click();await idle(p);
 assert.match(await p.locator('#chat-status').innerText(),/could not be saved/);
 await p.locator('#language').selectOption('ko');await idle(p);
 assert.match(await p.locator('#chat-status').innerText(),/저장하지 못/);
 await fault(p,{save:false});await p.locator('#retry-chat').click();await idle(p);
 assert.match(await p.locator('#chat-status').innerText(),/저장했/);
 assert.equal((await calls(p,'llm')).length,2);
 await p.reload();await idle(p);assert.equal(await p.locator('#chat-status').isVisible(),false);
 assert.equal(await p.locator('#messages .message').count(),2);
});

test('portrait generation failure and save failure have distinct local recovery guidance',async t=>{
 const p=await setup(t);await start(p);await fault(p,{image:true});
 await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.match(await p.locator('#image-status').innerText(),/Could not finish/);
 assert.doesNotMatch(await p.locator('#draw').innerText(),/Retry saving/);
 await fault(p,{image:false,save:true});await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.match(await p.locator('#image-status').innerText(),/without generating another image/);
 await p.locator('#refresh').click();await idle(p);
 assert.match(await p.locator('#image-status').innerText(),/Keep this window open/);
 await p.locator('#language').selectOption('ko');await idle(p);
 assert.match(await p.locator('#image-status').innerText(),/저장만 다시/);
 await fault(p,{save:false,download:true});await p.locator('#draw').click();await idle(p);
 assert.match(await p.locator('#image-status').innerText(),/저장만 다시/);
 await fault(p,{download:false});await p.locator('#draw').evaluate(e=>{e.click();e.click();});await idle(p);
 assert.equal((await calls(p,'image')).length,2,'Only failed generation and successful generation; retries never regenerate');
 assert.equal((await calls(p,'finalize')).length,1,'Saved upload is reused');
 await p.reload();await idle(p);assert.equal(await p.locator('#image-status').isVisible(),false);
 assert.equal(await p.locator('#pet-image').evaluate(e=>e.complete&&e.naturalWidth>0),true);
});

test('isolated first-time permission recovery to care, chat, portrait and reopen',async t=>{
 const p=await setup(t,{permission:true});
 assert.equal((await calls(p,'start')).length,0);await fault(p,{permission:false});
 await p.evaluate(()=>sessionStorage.setItem('test-faults',JSON.stringify({permission:false}))); // Keep the simulated grant across reopen.
 await p.locator('#refresh').click();await idle(p);await start(p);
 await p.locator('[data-action="feed"]').click();await idle(p);
 await p.locator('#chat-input').fill('Our first day');await p.locator('#chat-form button').click();await idle(p);
 await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.match(await p.locator('#chat-status').innerText(),/Conversation saved/);
 assert.match(await p.locator('#image-status').innerText(),/safe in your album/);
 await p.reload();await idle(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 assert.equal(await p.locator('#messages .message').count(),3);
 assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
 assert.equal((await calls(p,'image')).length,0);assert.equal((await calls(p,'llm')).length,0);
});

test('evolution automatically references the baby and reveals the saved new stage once',async t=>{
 const p=await setup(t);await start(p);await fault(p,{evolve:2,imageDelay:process.env.EVOLUTION_SCREENSHOT?2500:650});
 await p.locator('[data-action="feed"]').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(c=>c.method==='image'));
 assert.equal(await p.locator('#evolution-effect').isVisible(),true);
 assert.match(await p.locator('#evolution-phase').innerText(),/Evolving/);
 if(process.env.EVOLUTION_SCREENSHOT)await p.locator('.pet-card').screenshot({path:process.env.EVOLUTION_SCREENSHOT});
 assert.equal(await p.locator('[data-action="play"]').isDisabled(),true);
 await idle(p);assert.equal(await p.locator('#evolution-effect').isVisible(),false);
 const generated=await calls(p,'image');assert.equal(generated.length,1);
 assert.equal(generated[0].options.reference_image_urls,undefined);assert.match(generated[0].options.prompt,/round face and gold ears/);
 assert.match(generated[0].options.prompt,/SAME individual/);
 assert.match(generated[0].options.prompt,/from growth stage 1 to 2/);
 const saved=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(saved['isolated-fixture/stage-1'].starter,true);
 assert.ok(saved['isolated-fixture/stage-2'].path);assert.equal(saved['isolated-fixture/stage-2'].state,undefined);
 await p.reload();await idle(p);assert.equal((await calls(p,'image')).length,0);
 assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
});

test('mature evolution references the saved juvenile portrait, never a fixed evolution preset',async t=>{
 const p=await setup(t);await start(p);await fault(p,{evolve:2});await p.locator('[data-action="feed"]').click();await idle(p);
 const path=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']['isolated-fixture/stage-2'].path);
 await fault(p,{evolve:3});await p.locator('[data-action="play"]').click();await idle(p);
 const generated=await calls(p,'image');assert.equal(generated.length,2);
 assert.match(generated[1].options.prompt,/from growth stage 2 to 3/);
 assert.ok((await calls(p,'download')).some(c=>c.path===path));
 assert.equal(await p.evaluate(()=>Object.keys(window.hostTest.state.kv['notebuddy/art-v1']).length),3);
});

test('failed automatic evolution remains retryable without spending again on refresh or reopen',async t=>{
 const p=await setup(t);await start(p);await fault(p,{evolve:2,image:true});
 await p.locator('[data-action="feed"]').click();await idle(p);
 assert.match(await p.locator('#image-status').innerText(),/previous appearance and progress are safe/);
 assert.equal(await p.locator('#level').innerText(),'Lv. 10');
 assert.equal(await p.locator('#evolution-effect').isVisible(),false);
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'image')).length,1);
 await p.reload();await idle(p);assert.equal((await calls(p,'image')).length,0);
 await p.locator('#draw-evolved').click();assert.equal(await p.locator('#draw-dialog').isVisible(),true);
 await p.locator('#confirm-draw').click();await idle(p);assert.equal((await calls(p,'image')).length,1);
 assert.equal(await p.locator('#evolution-note').isVisible(),false);
});

test('lost evolution action response generates only after receipt retry; upload retry never regenerates',async t=>{
 const p=await setup(t);await start(p);
 // Save a personal baby first so the injected upload failure applies to the new portrait.
 await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 await fault(p,{evolve:2,lost:true,upload:true});await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);
 await p.locator('#retry-care').click();await idle(p);assert.equal((await calls(p,'image')).length,2);
 assert.match(await p.locator('#draw').innerText(),/Retry saving/);
 await p.locator('#draw').click();await idle(p);assert.equal((await calls(p,'image')).length,2);
 assert.equal(await p.locator('#evolution-note').isVisible(),false);
});

test('unavailable prior reference prevents unanchored AI calls; reduced motion disables effects',async t=>{
 const p=await setup(t);await start(p);await p.emulateMedia({reducedMotion:'reduce'});
 await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 await fault(p,{evolve:2,download:true});await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);
 await fault(p,{download:false,imageDelay:700});await p.locator('#draw').click();await p.locator('#confirm-draw').click();
 await p.waitForFunction(()=>!document.querySelector('#evolution-effect').hidden);
 assert.equal(await p.locator('.evolution-ring').evaluate(e=>getComputedStyle(e).animationName),'none');
 await idle(p);assert.equal((await calls(p,'image')).length,2);
});

test('reset during evolution discards the old generated portrait before upload',async t=>{
 const p=await setup(t);await start(p);await fault(p,{evolve:2,imageDelay:700});
 await p.locator('[data-action="feed"]').click();await p.waitForFunction(()=>window.hostTest.calls.some(c=>c.method==='image'));
 await replacePartner(p);await idle(p);
 assert.equal(await p.locator('#name').innerText(),'New partner');
 assert.equal(await p.locator('#evolution-effect').isVisible(),false);
 assert.equal((await calls(p,'finalize')).length,1,'Only the baby reference uploaded before reset');
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']),{});
});

test('battle evolution waits for replay close, then automatically reveals the new portrait',async t=>{
 const p=await setup(t);await start(p);await p.emulateMedia({reducedMotion:'reduce'});
 await p.locator('[data-action="walk"]').click();await idle(p);await fault(p,{evolve:2,imageDelay:400});
 await p.locator('[data-action="battle"]').click();await idle(p);
 assert.equal(await p.locator('#battle-dialog').isVisible(),true);assert.equal((await calls(p,'image')).length,0);
 await p.locator('#battle-skip').click();await p.waitForFunction(()=>window.hostTest.calls.some(c=>c.method==='image'));
 await idle(p);assert.equal((await calls(p,'image')).length,1);
 assert.equal(await p.locator('#evolution-effect').isVisible(),false);
 await fault(p,{evolve:3});await p.locator('[data-action="play"]').click();await idle(p);
 await fault(p,{evolve:4});await p.locator('[data-action="train"]').click();await idle(p);
 assert.equal((await calls(p,'image')).length,3);
 assert.match((await calls(p,'image'))[2].options.prompt,/from growth stage 3 to 4/);
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

async function artwork(p){
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 await p.locator('#art-file').setInputFiles({name:'my-picture.png',mimeType:'image/png',buffer:await readFile(new URL('../../bundle/assets/starters-v1/fairy_nature_stage1.png',import.meta.url))});
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);
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
test('empty drawing and unsupported file stop locally before AI or game creation',async t=>{
 const p=await setup(t);await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 await p.locator('#art-input-kind').selectOption('draw');await p.locator('#art-use').click();
 await p.waitForFunction(()=>document.querySelector('#art-editor-error').textContent.includes('clear shape'));assert.match(await p.locator('#art-editor-error').innerText(),/clear shape/);
 await p.locator('#art-input-kind').selectOption('upload');await p.locator('#art-file').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await p.locator('#art-use').click();
 await p.waitForFunction(()=>document.querySelector('#art-editor-error').textContent.includes('format'));assert.match(await p.locator('#art-editor-error').innerText(),/format/);
 assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'start')).length,0);
});
test('drawing with undo produces a source and works in a narrow Korean UI',async t=>{
 const p=await setup(t);await p.setViewportSize({width:360,height:800});await p.locator('#language').selectOption('ko');await idle(p);
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();await p.locator('#art-input-kind').selectOption('draw');
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
 await p.locator('#setup-birth').click();await p.locator('#art-file').setInputFiles({name:'again.png',mimeType:'image/png',buffer:await readFile(new URL('../../bundle/assets/starters-v1/fairy_nature_stage1.png',import.meta.url))});
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);
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
 assert.equal((await calls(p,'llm')).length,0);await p.locator('#retry-care').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,1);assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'llm')).length,1);
});
test('reset during a delayed care reaction discards the old response',async t=>{
 const p=await setup(t,{llmDelay:600});await start(p);await p.locator('[data-action="feed"]').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='llm'));await replacePartner(p);await idle(p);
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

test('failed evolution analysis prevents generation and requires manual retry',async t=>{
 const p=await setup(t);await start(p);await fault(p,{evolve:2,artMalformed:true});
 await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal((await calls(p,'image')).length,0);
 assert.match(await p.locator('#image-status').innerText(),/previous appearance and progress are safe/);
 await p.reload();await idle(p);assert.equal((await calls(p,'llm')).length,0);
 await fault(p,{artMalformed:false});await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);
});
test('evolution caches analysis across generation failure and keeps original identity at later stages',async t=>{
 const p=await setup(t);await start(p);await fault(p,{evolve:2,image:true});
 await p.locator('[data-action="feed"]').click();await idle(p);
 const before=(await calls(p,'llm')).length;
 await fault(p,{image:false,artMalformed:true});await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,before,'Retry reuses saved analysis');
 const a=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(a['isolated-fixture/stage-1'].features,'round face and gold ears');
 assert.equal(a['isolated-fixture/stage-2'].identity,'round face and gold ears');
 await fault(p,{artMalformed:false,evolve:3});await p.locator('[data-action="play"]').click();await idle(p);
 const last=(await calls(p,'image')).at(-1).options;
 assert.equal(last.reference_image_urls,undefined);
 assert.match(last.prompt,/Fixed identity.*round face and gold ears/);
 assert.match(last.prompt,/from growth stage 2 to 3/);
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
 assert.equal(await p.locator('#name').innerText(),'Fresh buddy');assert.equal(await p.locator('#removed').isVisible(),false);
 await p.reload();await idle(p);assert.equal(await p.locator('#name').innerText(),'Fresh buddy');
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),[]);
});
