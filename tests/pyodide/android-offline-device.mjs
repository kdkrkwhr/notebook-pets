// Real Android WebView, keyboard, configuration changes and process death; no model needed.
// Run only on a disposable emulator, never on the user's phone or normal notebook.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright-core';
const serial=process.argv[2],port=Number(process.argv[3]||9347),pkg='io.github.kdkrkwhr.notebuddy.lab';
assert(/^emulator-\d+$/.test(serial||''),'Only a disposable emulator is permitted');
assert(port>=1024&&port<=65535);
const adb=process.platform==='win32'?path.join(process.env.LOCALAPPDATA,'Android/Sdk/platform-tools/adb.exe'):'adb';
const device=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:30000}).trim();
const out=fileURLToPath(new URL('../../android/runtime/offline-device/',import.meta.url));await mkdir(out,{recursive:true});
let browser,page;
const report={serial,paidCalls:0,modelDownload:false},oldFont=device('shell','settings','get','system','font_scale');
const oldSize=device('shell','wm','size').match(/Override size:\s*(\d+x\d+)/)?.[1];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(){
 await browser?.close().catch(()=>{});
 for(let attempt=0;attempt<60;attempt++){
  let attached=false;
  try{
   const pid=device('shell','pidof',pkg).split(/\s+/)[0];assert(/^\d+$/.test(pid));
   device('forward',`tcp:${port}`,`localabstract:webview_devtools_remote_${pid}`);
   browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:5000,noDefaults:true});
   page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://appassets.androidplatform.net/assets/game/'));
   if(!page)throw Error('Game page not ready');
   attached=true;
   page.setDefaultTimeout(30000);
   await page.waitForFunction(()=>document.body.classList.contains('mobile-ready')&&!document.querySelector('#refresh').disabled||document.querySelector('#native-startup-heading')?.textContent.includes('열지 못'),{},{timeout:120000});
   assert(await page.locator('body').evaluate(el=>el.classList.contains('mobile-ready')),'Android startup failed');
   assert.equal(await page.evaluate(()=>window.NoteBuddyPlatform.databaseName),'notebuddy-android-test','Refusing to mutate the default notebook');
   return;
  }catch(e){await browser?.close().catch(()=>{});if(attached||attempt===59)throw e;await delay(500);}
 }
}
const snapshot=()=>page.evaluate(async()=>{const s=await import('./store.js');return s.snapshot(await s.openStore(window.NoteBuddyPlatform.databaseName));});
const fits=selector=>page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;});
try{
 device('shell','am','start','-n',pkg+'/.GameActivity','--ez','testNotebook','true');await connect();
 report.version=await page.locator('body').getAttribute('data-android-version');assert.equal(report.version,'0.2.2-alpha');
 assert((await snapshot()).player.state,'Run GameSmokeTest in the isolated notebook first');
 assert.equal(await page.evaluate(async()=>{const n=await import('./native.js');return (await n.status()).ready;}),false,'This harness must not use a model');
 for(const key of ['friend','chat','adventure','journal']){await page.locator('#tab-'+key).click();assert(await fits('.mobile-tabs'));await page.screenshot({path:path.join(out,`${key}.png`)});}
 await page.locator('#tab-chat').click();await page.locator('#message').click();await page.waitForFunction(()=>document.body.classList.contains('keyboard-open'));
 assert(await fits('#chat'));assert(await page.locator('.mobile-tabs').isHidden());await page.screenshot({path:path.join(out,'keyboard.png')});report.nativeKeyboard=true;
 await page.locator('#message').fill('준비 파일 없이도 입력은 남아야 해요');await page.locator('#chat button').click();
 await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);
 assert.match(await page.locator('#reply').textContent(),/설정/);assert.equal(await page.locator('#message').inputValue(),'준비 파일 없이도 입력은 남아야 해요');report.noModelGuidance=true;
 await page.locator('#message').click();await page.waitForFunction(()=>document.body.classList.contains('keyboard-open'));
 device('shell','input','keyevent','KEYCODE_BACK');await page.waitForFunction(()=>!document.body.classList.contains('keyboard-open'));
 assert.equal(await page.locator('body').getAttribute('data-screen'),'chat');device('shell','input','keyevent','KEYCODE_BACK');await page.waitForFunction(()=>document.body.dataset.screen==='friend');report.nativeBack=true;
 await page.locator('#open-home').click();await page.locator('#home-shop-toggle').click();device('shell','input','keyevent','KEYCODE_BACK');await page.waitForFunction(()=>document.querySelector('#home-shop-panel').hidden);assert(await page.locator('#home-dialog').isVisible());device('shell','input','keyevent','KEYCODE_BACK');await page.waitForFunction(()=>!document.querySelector('#home-dialog').open);report.shopBack=true;
 await page.locator('#tab-chat').click();await page.locator('#message').fill('프로세스 종료 뒤 이어 쓸 초안');await page.waitForFunction(()=>document.querySelector('#message').dataset.draftState==='saved');const before=await snapshot();
 device('shell','am','force-stop',pkg);device('shell','am','start','-n',pkg+'/.GameActivity','--ez','testNotebook','true');await connect();
 assert.equal(await page.locator('#message').inputValue(),'프로세스 종료 뒤 이어 쓸 초안');assert.deepEqual((await snapshot()).player,before.player);report.processDeathRestored=true;
 device('shell','settings','put','system','font_scale','2.0');await delay(1500);await connect();
 for(const key of ['friend','chat','adventure','journal']){
  await page.locator('#tab-'+key).click();assert(await fits('.mobile-tabs'),`large-font navigation: ${key}`);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(key==='chat')assert(await fits('#chat'));
  await page.screenshot({path:path.join(out,`font200-${key}.png`)});
 }
 report.systemFont200=true;
 device('shell','wm','size','840x1680');await delay(1200);await connect();
 for(const key of ['friend','chat','adventure','journal']){
  await page.locator('#tab-'+key).click();assert(await fits('.mobile-tabs'),`320px large-font navigation: ${key}`);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(key==='chat')assert(await fits('#chat'));
  if(key==='friend')assert(await page.locator('#pet-name').evaluate(el=>el.getBoundingClientRect().width>=Math.min(160,el.closest('.pet-heading').clientWidth*.75)),'pet name must retain readable width at large font size');
  await page.screenshot({path:path.join(out,`font200-small-${key}.png`)});
 }
 report.smallScreenFont200=true;
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{
 device('shell','settings','put','system','font_scale',oldFont==='null'?'1.0':oldFont);
 device('shell','wm','size',oldSize||'reset');
 device('forward','--remove',`tcp:${port}`);await browser?.close().catch(()=>{});
}
