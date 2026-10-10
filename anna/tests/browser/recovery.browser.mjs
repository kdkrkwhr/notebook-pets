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
 await page.goto('https://notebuddy.test');if(faults.appLoad)await page.waitForFunction(()=>!document.querySelector('#notice').hidden);else await idle(page);
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


test('care succeeds without reaction modules or automatic AI and manual chat still works',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 assert.equal((await calls(p,'llm')).length,0);assert.equal(await p.locator('#action-reactions').count(),0);
 await p.locator('#chat-input').fill('Hello');await p.locator('#chat-form button').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,1);assert.match(await p.locator('#messages').innerText(),/happy to see/);
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


test('first visit guides care, optional chat and album without automatic AI calls; progress survives reopen',async t=>{
 const p=await setup(t);assert.match(await p.locator('.welcome-help').innerText(),/does not generate an AI image/);
 await start(p);assert.equal(await p.locator('#first-steps').isVisible(),true);
 await p.locator('#guide-care').click();assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'feed');
 assert.equal((await calls(p,'feed')).length,0);
 await p.keyboard.press('Enter');await idle(p);assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 await p.locator('#guide-chat').click();assert.match(await p.locator('#chat-input').inputValue(),/nice to meet/);
 assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'image')).length,0);
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
 assert.equal(await p.locator('#messages .message').count(),2);
 assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
 assert.equal((await calls(p,'image')).length,0);assert.equal((await calls(p,'llm')).length,0);
});
