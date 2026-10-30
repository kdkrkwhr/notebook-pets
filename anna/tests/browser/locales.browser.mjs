import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {t} from '../../bundle/i18n.mjs';
const bundle=new URL('../../bundle/',import.meta.url),mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
test('CJK locales cover menus, persist, preserve the pet and never call AI when switching',async test=>{
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});test.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1120,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));test.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();if(u.pathname.includes('/_sdk/'))return route.fulfill({body:mock,contentType:'text/javascript'});if(u.pathname==='/anna-tool-ids.js')return route.fulfill({body:'window.__ANNA_TOOL_IDS__={notebuddy:"locale-test"}',contentType:'text/javascript'});try{const f=u.pathname==='/'?'index.html':u.pathname.slice(1);return route.fulfill({body:await readFile(new URL(f,bundle)),contentType:/\.m?js$/.test(f)?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.woff2')?'font/woff2':'text/html'});}catch{return route.fulfill({status:404,body:''});}});
 const idle=()=>page.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);
 await page.goto('https://notebuddy.test/');await idle();await page.locator('#title-start').click();await page.locator('#pet-name').fill('Feed');await page.locator('#start-form button').click();await idle();
 const before=await page.evaluate(()=>({pet:hostTest.state.save.pet_id,ai:hostTest.calls.filter(c=>['llm','image','home-image'].includes(c.method)).length}));
 for(const lang of ['ja','zh-Hans','zh-Hant']){
  await page.locator('#language').selectOption(lang);await idle();assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('#name').innerText(),'Feed');
  assert.equal(await page.locator('[data-i18n="albumHeading"]').innerText(),t(lang,'albumHeading'));
  await page.locator('#open-theme').click();assert.ok(/[\u3040-\u30ff\u3400-\u9fff]/.test(await page.locator('#theme-heading').innerText()));await page.locator('#theme-done').click();
  await page.locator('#open-home').click();await page.waitForFunction(()=>!document.querySelector('#home-close').disabled);assert.ok(/[\u3040-\u30ff\u3400-\u9fff]/.test(await page.locator('#home-appearance-title').innerText()));await page.locator('#home-close').click();
  await page.setViewportSize({width:360,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#open-theme').click();assert.equal(await page.locator('#theme-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);await page.locator('#theme-done').click();
  const shots=new URL('../../../.local/locales/',import.meta.url);await mkdir(shots,{recursive:true});await page.screenshot({path:new URL(lang+'.png',shots).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
  await page.reload();await idle();await page.locator('#title-start').click();assert.equal(await page.locator('#language').inputValue(),lang);await page.setViewportSize({width:1120,height:900});
 }
 const after=await page.evaluate(()=>({pet:hostTest.state.save.pet_id,ai:hostTest.calls.filter(c=>['llm','image','home-image'].includes(c.method)).length}));assert.deepEqual(after,before);
});
