// Opens or verifies the native SAF flow against the debug test notebook only.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${Number(process.argv[2])}`);
try{
 let page;for(const p of browser.contexts().flatMap(c=>c.pages()).reverse())if(p.url().includes('appassets.androidplatform.net/assets/game/index.html')&&await p.evaluate(()=>window.NoteBuddyPlatform?.databaseName)==='notebuddy-android-test'){page=p;break;}
 assert(page);page.setDefaultTimeout(30000);
 if(process.argv[3]==='open'){
  assert.match(await page.locator('#backup-status').textContent(),/저장했어요/);
  await page.locator('#import').click();console.log('NATIVE_IMPORT_PICKER_OPEN');
 }else{
  await page.waitForFunction(()=>document.querySelector('#backup-status').textContent.includes('가져왔'));
  const saved=await page.evaluate(async()=>{const s=await import(new URL('./store.js',location.href).href);return s.snapshot(await s.openStore(window.NoteBuddyPlatform.databaseName));});
  assert.equal(saved.player.state.name,'기기 검증 친구');assert.equal(saved.visuals.chat.length,4);assert.equal(Object.keys(saved.visuals.files).length,2);
  console.log({nativeExportImport:true,chat:4,pictures:2});
 }
}finally{await browser.close();}
