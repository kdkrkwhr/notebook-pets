import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const bundle=new URL('../../bundle/',import.meta.url),mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
async function setup(t){
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1120,height:900}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();
  if(u.pathname.includes('/_sdk/'))return route.fulfill({body:mock,contentType:'text/javascript'});
  if(u.pathname==='/fixture-upload')return route.fulfill({body:''});
  if(u.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"activity-test"}'});
  const name=u.pathname==='/'?'index.html':u.pathname.slice(1);if(name.includes('..'))return route.abort();
  try{return route.fulfill({body:await readFile(new URL(name,bundle)),contentType:/\.(js|mjs)$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html'});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(()=>localStorage.setItem('notebuddy/language-v1','en'));
 await page.goto('https://notebuddy.test');await idle(page);await page.locator('#title-start').click();return page;
}
const idle=p=>p.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);
const fault=(p,f)=>p.evaluate(f=>Object.assign(hostTest.faults,f),f);
async function start(p){await p.locator('#pet-name').fill('Patient buddy');await p.locator('#start-form button').click();await idle(p);}
async function screenshot(p,name){const dir=new URL('../../../.local/activity-ux/',import.meta.url);await mkdir(dir,{recursive:true});await p.screenshot({path:fileURLToPath(new URL(name+'.png',dir)),animations:'disabled'});}

test('slow home images show ongoing work and elapsed time, then clear after one request',async t=>{
 const p=await setup(t);await start(p);await p.clock.install();await fault(p,{imageDelay:120000});await p.locator('#open-home').click();await p.locator('#home-appearance-generate').click();
 await p.waitForFunction(()=>document.querySelector('#home-status').dataset.activity==='image');assert(await p.locator('#home-status-activity').isVisible());assert(await p.locator('#home-empty').isHidden());
 await p.keyboard.press('Escape');assert(await p.locator('#home-dialog').evaluate(d=>d.open));await p.clock.fastForward(31000);
 assert.match(await p.locator('#home-status-activity').innerText(),/longer than usual/);assert.match(await p.locator('#home-status-activity .activity-clock').innerText(),/0:3\d/);
 assert.equal(await p.evaluate(()=>hostTest.calls.filter(c=>c.method==='home-image').length),1);
 await screenshot(p,'home-waiting-desktop');await p.setViewportSize({width:375,height:812});await screenshot(p,'home-waiting-mobile');assert(await p.locator('#home-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
 assert(await p.locator('.home-footer').evaluate(d=>d.scrollHeight<=d.clientHeight+1),'Progress details must be visible without scrolling past disabled controls');
 await p.clock.fastForward(90000);await idle(p);await p.waitForFunction(()=>!document.querySelector('#home-status').dataset.activity);
 assert(await p.locator('#home-status-activity').isHidden());assert.match(await p.locator('#home-status').innerText(),/saved/);assert.equal(await p.evaluate(()=>hostTest.calls.filter(c=>c.method==='home-image').length),1);
});

test('home image failure ends the spinner and explains the free default',async t=>{
 const p=await setup(t);await start(p);await fault(p,{homeImage:true});await p.locator('#open-home').click();await p.locator('#home-appearance-generate').click();await idle(p);
 assert(await p.locator('#home-status-activity').isHidden());assert.match(await p.locator('#home-status').innerText(),/generation failed.*default image/);assert(await p.locator('#home-close').isEnabled());
});

test('received home image switches from generating to saving until upload completes',async t=>{
 const p=await setup(t);await start(p);let release,arrived;const held=new Promise(r=>release=r),uploading=new Promise(r=>arrived=r);
 await p.route('**/fixture-upload',async route=>{arrived();await held;await route.fulfill({body:''});});
 await p.locator('#open-home').click();await p.locator('#home-appearance-generate').click();await uploading;
 await p.waitForFunction(()=>document.querySelector('#home-status').dataset.activity==='save');assert.match(await p.locator('#home-status').innerText(),/Saving/);assert.doesNotMatch(await p.locator('#home-status-activity').innerText(),/generation/);
 release();await idle(p);assert(await p.locator('#home-status-activity').isHidden());assert.equal(await p.evaluate(()=>hostTest.calls.filter(c=>c.method==='home-image').length),1);
});

test('chat distinguishes waiting from save-only recovery without repeated AI',async t=>{
 const p=await setup(t);await start(p);await p.clock.install();await fault(p,{llmDelay:100000});await p.locator('#chat-input').fill('Are you there?');await p.locator('#chat-form button').click();
 await p.waitForFunction(()=>document.querySelector('#chat-status').dataset.activity==='chat');await p.clock.fastForward(31000);assert.match(await p.locator('#chat-status-activity').innerText(),/longer than usual/);await screenshot(p,'chat-waiting');
 await fault(p,{save:true});await p.clock.fastForward(70000);await idle(p);assert(await p.locator('#chat-status').isHidden());assert(await p.locator('#chat-status-activity').isHidden());assert(await p.locator('#retry-chat').isVisible());
 const calls=await p.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length);await fault(p,{save:false});await p.locator('#retry-chat').click();await idle(p);assert.equal(await p.evaluate(()=>hostTest.calls.filter(c=>c.method==='llm').length),calls);assert(await p.locator('#retry-chat').isHidden());
});

test('birth image generation stays visible through a long response and stops after saving',async t=>{
 const p=await setup(t);await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 const box=await p.locator('#art-canvas').boundingBox();await p.mouse.move(box.x+50,box.y+50);await p.mouse.down();await p.mouse.move(box.x+180,box.y+180,{steps:8});await p.mouse.up();await p.locator('#art-use').click();
 await p.waitForFunction(()=>!document.querySelector('#art-dialog').open&&!document.querySelector('#birth-art-choice .art-source-preview').hidden);
 await p.clock.install();await fault(p,{imageDelay:120000});await p.locator('#pet-name').fill('Patient artist');assert.equal(await p.locator('#pet-name').inputValue(),'Patient artist');await p.locator('#start-form button').click();
 try{await p.waitForFunction(()=>document.querySelector('#birth-recovery-status').dataset.activity==='image');}
 catch(error){
  await screenshot(p,'birth-waiting-failure');
  const diagnostic=await p.evaluate(()=>({status:document.querySelector('#birth-recovery-status').textContent,busy:document.querySelector('#refresh').disabled,editorOpen:document.querySelector('#art-dialog').open,nameLength:document.querySelector('#pet-name').value.length,calls:hostTest.calls.map(c=>c.method||c.args?.command)}));
  throw Error(error.message+' '+JSON.stringify(diagnostic));
 }
 assert(await p.locator('#birth-recovery').isVisible());await p.clock.fastForward(31000);assert.match(await p.locator('#birth-recovery-status-activity').innerText(),/longer than usual/);await screenshot(p,'birth-waiting');
 await p.clock.fastForward(90000);await idle(p);assert(await p.locator('#birth-recovery').isHidden());assert(await p.locator('#birth-recovery-status-activity').isHidden());assert.equal(await p.evaluate(()=>hostTest.calls.filter(c=>c.method==='image').length),1);
});

test('Korean waiting feedback respects reduced motion and failure clears the indicator',async t=>{
 const p=await setup(t);await start(p);await p.locator('#language').selectOption('ko');await idle(p);await p.emulateMedia({reducedMotion:'reduce'});await p.clock.install();await fault(p,{llmDelay:60000,llm:true});
 await p.locator('#chat-input').fill('잘 지내?');await p.locator('#chat-form button').click();await p.waitForFunction(()=>document.querySelector('#chat-status').dataset.activity==='chat');assert.match(await p.locator('#chat-status').innerText(),/답장/);
 assert.equal(await p.locator('#chat-status').evaluate(e=>getComputedStyle(e,'::before').animationName),'none');await p.clock.fastForward(31000);assert.match(await p.locator('#chat-status-activity').innerText(),/응답/);await screenshot(p,'chat-waiting-korean');
 await p.clock.fastForward(30000);await idle(p);assert(await p.locator('#chat-status-activity').isHidden());assert(await p.locator('#chat-input').isEnabled());assert.equal(await p.locator('#chat-input').inputValue(),'잘 지내?');
});
