// Physical WebView follow-up; connect only to the debug test notebook on the selected device.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {writeFile,mkdir} from 'node:fs/promises';
const port=Number(process.argv[2]);assert(port>0);
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let page;
for(const candidate of browser.contexts().flatMap(c=>c.pages()).reverse())if(candidate.url().includes('appassets.androidplatform.net/assets/game/index.html')&&await candidate.evaluate(()=>window.NoteBuddyPlatform?.databaseName)==='notebuddy-android-test'){page=candidate;break;}
assert(page);page.setDefaultTimeout(30000);
const out=new URL('../../android/runtime/game-device/',import.meta.url);await mkdir(out,{recursive:true});
try{
 await page.waitForFunction(()=>!!window.NoteBuddyPlatform);
 assert.equal(await page.evaluate(()=>window.NoteBuddyPlatform.databaseName),'notebuddy-android-test');
 if(await page.locator('#title-screen').isVisible())await page.locator('#title-start').click();
 const data=()=>page.evaluate(async()=>{const s=await import(new URL('./store.js',location.href).href);return s.snapshot(await s.openStore(window.NoteBuddyPlatform.databaseName));});
 const user=()=>page.evaluate(async()=>{const s=await import(new URL('./store.js',location.href).href);return JSON.stringify(await s.snapshot(await s.openStore('notebuddy-android')));});
 const original=await user();const idle=()=>page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 const began=Date.now();await page.locator('#message').fill('내 이름 기억해? 이름만 짧게 답해 줘.');await page.locator('#chat button').click();await page.waitForFunction(()=>!document.querySelector('#chat button').disabled,{},{timeout:180000});
 const chat=(await data()).visuals.chat;assert(chat.at(-1).text.includes('동기'),chat.at(-1).text);const recallMs=Date.now()-began;
 await page.evaluate(async()=>{const s=await import(new URL('./store.js',location.href).href),db=await s.openStore(window.NoteBuddyPlatform.databaseName),old=await s.load(db);old.state.coins=100;await s.commit(db,old.revision,old.state);});
 await page.locator('#refresh').click();await idle();await page.locator('#open-home').click();await idle();await page.locator('#home-shop-toggle').click();await page.locator('[data-item="yard-tulips"] button').click();await page.locator('#home-purchase-confirm').click();await idle();await page.locator('#home-decorate').click();await idle();
 const home=(await data()).player.state.home;assert(home.reason&&Object.keys(home.layout).length>1,JSON.stringify(home));
 await page.screenshot({path:new URL('home-test.png',out).pathname.replace(/^\/(?=[A-Z]:)/,'')});await page.locator('#home-close').click();
 const beforeReload=await data();await page.reload();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='기기 검증 친구',{},{timeout:120000});await page.locator('#title-start').click();assert.deepEqual((await data()).player,beforeReload.player);assert.equal((await data()).visuals.chat.length,beforeReload.visuals.chat.length);
 // Exercise native chunk assembly including a surrogate pair split across messages.
 const chunks=await page.evaluate(async()=>{const {call}=await import(new URL('./native.js',location.href).href);await call('exportBegin');await call('exportChunk',{text:'{"test":"\ud83d'});await call('exportChunk',{text:'\ude00"}'});await call('exportCancel');return true;});assert(chunks);
 assert.equal(await user(),original);
 const report={recallMs,recall:true,localFurnitureAI:true,nativeChunkExport:true,realWebViewReload:true,userGameUnchanged:true};await writeFile(new URL('device-followup.json',out),JSON.stringify(report,null,2));console.log(report);
 // Leave Android's real save picker open for UI verification of the app's full backup.
 await page.locator('#open-backup').click();await page.locator('#export').click();console.log('SAF_PICKER_OPEN');
}finally{await browser.close();}
