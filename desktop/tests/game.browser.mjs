import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('desktop drawing birth, chat, care, first-home default, save and five locales',{timeout:120000},async t=>{
 const host=spawn(process.env.PYTHON||'python',['-u','desktop/tests/browser_host.py'],{cwd:root,stdio:['pipe','pipe','pipe']});
 let stderr='';host.stderr.on('data',chunk=>stderr+=chunk);t.after(()=>host.stdin.end());
 const origin=await new Promise((resolve,reject)=>{host.stdout.once('data',chunk=>resolve(String(chunk).trim()));host.once('exit',code=>reject(Error(`Host exited ${code}: ${stderr}`)));});
 const browser=await chromium.launch(process.env.CI?{}:process.platform==='win32'?{channel:'msedge'}:{});
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(20000);
 await page.addInitScript(()=>{
   window.petTest={active:false,fail:false,identity:null};
   window.pywebview={api:{
     async pet_status(){return {active:window.petTest.active};},
     async pet_recall(){window.petTest.active=false;return {active:false};},
     async pet_summon(payload){
       if(window.petTest.fail)throw Error('Native surface unavailable');
       if(payload.frames.length!==16||payload.frames.some(frame=>!frame.startsWith('data:image/png;base64,')))throw Error('Invalid frames');
       window.petTest.identity=payload.identity;window.petTest.frames=payload.frames;
       window.petTest.active=true;return {active:true};
     }
   }};
 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 t.after(async()=>{await mkdir(new URL('../runtime/screenshots/',import.meta.url),{recursive:true});await page.screenshot({path:fileURLToPath(new URL('../runtime/screenshots/last.png',import.meta.url))});if(errors.length)console.error(errors);await browser.close();});
 const rpc=(method,args={})=>page.evaluate(async({method,args})=>(await import('/desktop-runtime.mjs')).rpc(method,args),{method,args});
 await page.goto(origin);await page.waitForFunction(()=>document.body.dataset.desktopReady==='true'&&!document.querySelector('#refresh').disabled);await page.evaluate(()=>document.fonts.ready);
 await page.locator('#title-start').click();await page.locator('#birth-mode').selectOption('art');await page.locator('#choose-art').click();
 const canvas=await page.locator('#art-canvas').boundingBox();
 await page.mouse.move(canvas.x+120,canvas.y+120);await page.mouse.down();await page.mouse.move(canvas.x+200,canvas.y+100,{steps:12});await page.mouse.move(canvas.x+250,canvas.y+200,{steps:12});await page.mouse.move(canvas.x+120,canvas.y+220,{steps:12});await page.mouse.move(canvas.x+120,canvas.y+120,{steps:12});await page.mouse.up();
 await page.locator('#art-use').click();await page.waitForFunction(()=>!document.querySelector('#art-dialog').open&&document.querySelector('#birth-art-choice img').naturalWidth>0);await page.locator('#pet-name').fill('Desktop Sprout');await page.locator('#start-form button').click();
 await page.waitForFunction(()=>!document.querySelector('#refresh').disabled&&document.body.textContent.includes('Desktop Sprout')).catch(async e=>{console.error(await page.evaluate(()=>({body:document.body.innerText,name:document.querySelector('#pet-name').value,mode:document.querySelector('#birth-mode').value,preview:document.querySelector('#birth-art-choice img').hidden,valid:document.querySelector('#start-form').checkValidity()})));console.error(await rpc('desktop.info'));throw e;});
 const status=await rpc('tools.invoke',{method:'game',args:{command:'status'}});assert.equal(status.status.name,'Desktop Sprout');assert.equal(status.species_key,'plant');
 const art=(await rpc('storage.get',{key:'notebuddy/art-v1'})).value;
 assert(Object.values(art).some(x=>x.phase==='done'));assert.equal((await rpc('desktop.info')).calls.filter(x=>x==='image').length,1);
 await page.locator('#care-ai-enabled').uncheck();await page.locator('#chat-input').fill('Hello, little friend!');await page.locator('#chat-form button').click();
 await page.waitForFunction(()=>document.querySelector('#messages').textContent.includes('I am happy to see you!'));
 await page.locator('[data-action="feed"]').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 const before=(await rpc('desktop.info')).calls.length;await page.locator('#open-home').click();
 const choices=page.locator('[data-home-appearance="default"]');
 // The shared home UI names its free first-visit action explicitly.
 if(await choices.count())await choices.click();else await page.getByRole('button',{name:/default|기본/i}).last().click();
 await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);
 assert.equal((await rpc('desktop.info')).calls.length,before,'free home appearance must not use AI');
 await mkdir(new URL('../runtime/screenshots/',import.meta.url),{recursive:true});
 await page.screenshot({path:fileURLToPath(new URL('../runtime/screenshots/home.png',import.meta.url))});await page.locator('#home-close').click();
 const portrait=await page.locator('#pet-image').getAttribute('src');
 const aiBeforePet=(await rpc('desktop.info')).calls.length;
 await page.locator('#desktop-pet').click();await page.waitForFunction(()=>document.body.classList.contains('desktop-pet-outside'));
 assert.equal(await page.locator('#pet-image').evaluate(e=>getComputedStyle(e).visibility),'hidden');
 assert.equal(await page.locator('.portrait').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
 assert.equal((await page.evaluate(()=>window.petTest.identity))[0],status.pet_id);
 await page.screenshot({path:fileURLToPath(new URL('../runtime/screenshots/desktop-pet-outside.png',import.meta.url))});
 await page.locator('#desktop-pet').click();await page.waitForFunction(()=>!document.body.classList.contains('desktop-pet-outside'));
 assert.equal(await page.locator('#pet-image').getAttribute('src'),portrait);
 await page.locator('#desktop-pet').click();await page.waitForFunction(()=>document.body.classList.contains('desktop-pet-outside'));
 await page.evaluate(()=>window.petTest.active=false);await page.waitForFunction(()=>!document.body.classList.contains('desktop-pet-outside'));
 // A saved personal sheet must export all 16 distinct poses, not the portrait.
 await page.evaluate(async({owner,stage})=>{
   const {rpc}=await import('/desktop-runtime.mjs');
   const {pixelSource}=await import('/pixel-pet.mjs');
   const view=await rpc('tools.invoke',{method:'game',args:{command:'status'}});
   const saved=await rpc('storage.get',{key:'notebuddy/art-v1'});
   const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){c.fillStyle=`rgb(${30+row*45},${60+col*40},110)`;c.fillRect(col*128+45,row*128+35,38,65);}
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const path=`portraits/${owner}/test-sheet.png`;
   const upload=await rpc('files.upload_init',{path,size:blob.size});
   await fetch(upload.put_url,{method:'PUT',body:blob});await rpc('files.upload_finalize',{path,size:blob.size});
   saved.value[`${owner}/home-sprite-stage-${stage}`]={pet_id:owner,stage,source_path:pixelSource(view,saved.value),format:'home-sprite-v1',path};
   await rpc('storage.set',{key:'notebuddy/art-v1',value:saved.value,if_match:saved.etag});
 },{owner:status.pet_id,stage:status.stage});
 await page.locator('#desktop-pet').click();await page.waitForFunction(()=>document.body.classList.contains('desktop-pet-outside'));
 assert.equal(await page.evaluate(()=>new Set(window.petTest.frames).size),16);
 await page.locator('#desktop-pet').click();await page.waitForFunction(()=>!document.body.classList.contains('desktop-pet-outside'));
 await page.evaluate(()=>window.petTest.fail=true);await page.locator('#desktop-pet').click();
 await page.waitForFunction(()=>document.querySelector('#desktop-pet-status').textContent==='Native surface unavailable');
 assert.equal(await page.locator('#pet-image').evaluate(e=>getComputedStyle(e).visibility),'visible');
 await page.evaluate(()=>window.petTest.fail=false);
 assert.equal((await rpc('desktop.info')).calls.length,aiBeforePet,'desktop pet must not call AI');
 for(const locale of ['en','ko','ja','zh-Hans','zh-Hant']){await page.locator('#language').selectOption(locale);await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);await page.locator('#desktop-settings').click();assert(await page.locator('#desktop-dialog h2').textContent());await page.locator('#desktop-close').click();}
 await page.locator('#language').selectOption('ko');await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);await page.screenshot({path:fileURLToPath(new URL('../runtime/screenshots/main.png',import.meta.url))});
 await page.reload();await page.waitForFunction(()=>document.body.dataset.desktopReady==='true'&&!document.querySelector('#refresh').disabled);await page.locator('#title-start').click();
 assert.equal((await rpc('tools.invoke',{method:'game',args:{command:'status'}})).pet_id,status.pet_id);assert.equal(await page.locator('#language').inputValue(),'ko');
 assert.equal((await rpc('desktop.info')).calls.filter(x=>x==='image').length,1);assert.deepEqual(errors,[]);
});
