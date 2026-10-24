// Run only against a debug Activity launched with --ez testNotebook true.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const serial=process.argv[3];assert(serial,'Pass the explicitly selected adb serial');
const adb=process.platform==='win32'?path.join(process.env.LOCALAPPDATA,'Android/Sdk/platform-tools/adb.exe'):'adb';
const back=()=>execFileSync(adb,['-s',serial,'shell','input','keyevent','KEYCODE_BACK']);
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${process.argv[2]}`,{noDefaults:true});
const out=fileURLToPath(new URL('../../android/runtime/ux-device/',import.meta.url));await mkdir(out,{recursive:true});
try{
 let page;
 for(const candidate of browser.contexts().flatMap(c=>c.pages()).reverse()){
  if(candidate.url().startsWith('https://appassets.androidplatform.net/assets/game/')&&await candidate.evaluate(()=>window.NoteBuddyPlatform?.databaseName==='notebuddy-android-test').catch(()=>false)){page=candidate;break;}
 }
 assert(page,'Refusing to touch a normal user notebook');page.setDefaultTimeout(30000);
 await page.waitForFunction(()=>document.body.classList.contains('mobile-ready'));
 const report={version:await page.locator('body').getAttribute('data-android-version')};
 for(const key of ['friend','chat','adventure','journal']){await page.locator('#tab-'+key).click();await page.screenshot({path:out+`/${key}.png`});}
 await page.locator('#tab-chat').click();await page.locator('#message').click();
 await page.waitForFunction(()=>document.body.classList.contains('keyboard-open'));
 report.keyboard=await page.locator('#chat').evaluate(el=>{const r=el.getBoundingClientRect();return {height:innerHeight,bottom:r.bottom,visible:r.bottom<=innerHeight&&r.top>=0,navHidden:getComputedStyle(document.querySelector('.mobile-tabs')).display==='none'};});
 assert(report.keyboard.visible&&report.keyboard.navHidden);await page.screenshot({path:out+'/keyboard.png'});
 await page.locator('#message').fill('안녕! 오늘도 같이 놀자. 짧게 인사해 줘.');
 const count=await page.locator('#messages > .message').count();
 await page.locator('#chat button').click();await page.waitForFunction(()=>!document.querySelector('#mobile-ai').hidden);
 assert(await page.locator('.pending-chat .user').isVisible());
 await page.screenshot({path:out+'/thinking.png'});
 await page.waitForFunction(()=>!document.querySelector('#chat button').disabled,{},{timeout:180000});
 assert.equal(await page.locator('#messages > .message').count(),count+2);assert(await page.locator('#mobile-ai').isHidden());report.realChat=true;
  await page.locator('#message').click();await page.waitForFunction(()=>document.body.classList.contains('keyboard-open'));
  back();await page.waitForFunction(()=>!document.body.classList.contains('keyboard-open'));
  assert.equal(await page.locator('body').getAttribute('data-screen'),'chat');
  back();await page.waitForFunction(()=>document.body.dataset.screen==='friend');report.nativeBack=true;
  await page.locator('#open-home').click();await page.locator('#home-shop-toggle').click();await page.screenshot({path:out+'/home-shop.png'});
  back();await page.waitForFunction(()=>document.querySelector('#home-shop-panel').hidden);assert(await page.locator('#home-dialog').isVisible());
  await page.screenshot({path:out+'/home.png'});back();await page.waitForFunction(()=>!document.querySelector('#home-dialog').open);report.shopBack=true;
  await page.locator('#open-evolution').click();await page.screenshot({path:out+'/evolution.png'});back();await page.waitForFunction(()=>!document.querySelector('#evolution-dialog').open);
  await page.locator('#tab-chat').click();const beforeCancel=await page.locator('#messages > .message').count();
  await page.locator('#message').fill('오늘 나와 함께할 모험 이야기를 세 문장으로 들려줘.');await page.locator('#chat button').click();
  await page.waitForFunction(()=>!document.querySelector('#mobile-ai').hidden);await page.locator('#mobile-ai-cancel').click();
  await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);assert.equal(await page.locator('#messages > .message').count(),beforeCancel);
  assert.match(await page.locator('#message').inputValue(),/모험/);report.realCancel=true;
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
