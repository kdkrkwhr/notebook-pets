import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {themes,THEME_KEY} from '../../bundle/themes.mjs';

const bundle=new URL('../../bundle/',import.meta.url);
const mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
async function setup(t,mode='normal'){
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});
 t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1120,height:800},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!=='https://notebuddy.test')return route.abort();
  if(url.pathname.includes('/_sdk/'))return route.fulfill({contentType:'text/javascript',body:mock});
  if(url.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"isolated-ui-test"}'});
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(file.includes('..'))return route.abort();
  try{await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(({mode,key})=>{
  if(mode==='invalid')localStorage.setItem(key,'not-a-theme');
  if(mode==='unavailable'){
   const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
   Storage.prototype.getItem=function(k){if(k===key)throw Error('Restricted');return get.call(this,k);};
   Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Restricted');return set.call(this,k,v);};
  }
 },{mode,key:THEME_KEY});
 await page.goto('https://notebuddy.test');await idle(page);return page;
}
async function idle(page){await page.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled&&document.querySelector('#messages').dataset.reactionBusy!=='true');if(await page.locator('#title-screen').isVisible())await page.locator('#title-start').click();}
async function choose(page,id){await page.locator(`.theme-option[data-palette="${id}"]`).click();assert.equal(await page.locator('html').getAttribute('data-theme'),id);}
async function capture(page,name){if(process.env.ANNA_THEME_CAPTURE){await mkdir(process.env.ANNA_THEME_CAPTURE,{recursive:true});await page.screenshot({path:`${process.env.ANNA_THEME_CAPTURE}/${name}.png`});}}

test('all themes preview immediately, persist after reload and do not call the game or AI',async t=>{
 const page=await setup(t);
 await page.locator('#pet-name').fill('Theme buddy');await page.locator('#start-form button').click();await idle(page);
 const before=await page.evaluate(()=>({state:JSON.stringify(window.hostTest.state),calls:window.hostTest.calls.length}));
 await page.locator('#open-theme').click();assert.equal(await page.locator('input[name="main-theme"]').count(),7);
 await choose(page,'night');
 for(const theme of themes){
  await choose(page,theme.id);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),THEME_KEY),theme.id);
  assert.equal(await page.locator('input[name="main-theme"]:checked').inputValue(),theme.id);
 }
 assert.deepEqual(await page.evaluate(()=>({state:JSON.stringify(window.hostTest.state),calls:window.hostTest.calls.length})),before);
 await page.locator('#theme-done').click();assert.equal(await page.locator('#open-theme').evaluate(e=>e===document.activeElement),true);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#title-screen').open);
 assert.equal(await page.locator('html').getAttribute('data-theme'),'clockworkcity');await idle(page);
 await page.locator('#language').selectOption('ko');await page.locator('#open-theme').click();
 assert.equal(await page.locator('#theme-heading').innerText(),'내 공책의 분위기');
 assert.match(await page.locator('.theme-selected').last().innerText(),/선택 중/);
 await page.locator('#theme-dialog input:checked').press('ArrowLeft');assert.equal(await page.locator('html').getAttribute('data-theme'),'sunkenpalace');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#theme-dialog').isVisible(),false);
});

test('invalid or unavailable preferences fall back safely and themes work before a pet exists',async t=>{
 for(const mode of ['invalid','unavailable']){
  const page=await setup(t,mode);assert.equal(await page.locator('html').getAttribute('data-theme'),'notebook');
  await page.locator('#open-theme').click();await choose(page,'night');
  assert.equal(await page.locator('#theme-status').isVisible(),mode==='unavailable');
  await page.locator('#theme-done').click();assert.equal(await page.locator('#welcome').isVisible(),true);
 }
});

test('alternate themes keep readable surfaces and fit desktop and mobile including catalog and home controls',async t=>{
 const page=await setup(t);
 await page.locator('#pet-name').fill('Theme buddy');await page.locator('#start-form button').click();await idle(page);
 await page.locator('#language').selectOption('ko');
 for(const width of [1120,360]){
  await page.setViewportSize({width,height:800});
  for(const theme of themes){
   await page.locator('#open-theme').click();await choose(page,theme.id);
   assert.equal(await page.locator('#theme-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
   if(theme.id==='night')await capture(page,`picker-${width}`);
   await page.locator('#theme-done').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(theme.id!=='notebook'){
    const failures=await page.evaluate(()=>{
     function lum(rgb){const v=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return v[0]*.2126+v[1]*.7152+v[2]*.0722;}
     return ['.pet-card','.pet-card .muted','.message','#chat-input','#chat-form .primary','.actions small'].flatMap(selector=>{
      const e=document.querySelector(selector);if(!e)return [];
      const fg=getComputedStyle(e).color;let parent=e,bg;
      do{bg=getComputedStyle(parent).backgroundColor;parent=parent.parentElement;}while(bg==='rgba(0, 0, 0, 0)'&&parent);
      const a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      return ratio<4.5?[{selector,ratio,fg,bg}]:[];
     });
    });
    assert.deepEqual(failures,[],`${theme.id} contrast`);
    assert.equal(await page.locator('.portrait img').evaluate(e=>getComputedStyle(e).mixBlendMode),'normal');
   }
   if(['night','icekingdom','hellgate'].includes(theme.id))await capture(page,`${theme.id}-${width}`);
  }
 }
 await page.locator('#open-items').click();assert.equal(await page.locator('#item-catalog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);await capture(page,'catalog-mobile');await page.locator('#close-items').click();
 // This lightweight SDK fixture omits home state. Exercise its shared UI shell;
 // home.browser.mjs covers opening and running the actual home with Python rules.
 await page.evaluate(()=>document.querySelector('#home-dialog').showModal());await capture(page,'home-mobile');
 assert.equal(await page.locator('#home-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
});
