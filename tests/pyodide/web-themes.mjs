import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../../web/dist/',import.meta.url));
const server=createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/notebook-pets\//,'');
 const file=path.resolve(root,route||'index.html');if(!file.startsWith(path.resolve(root)+path.sep))throw Error();
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
 const bytes=await readFile(file);res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(bytes);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const page=await browser.newPage({viewport:{width:1120,height:900},reducedMotion:'reduce'}),errors=[],ai=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://generativelanguage.googleapis.com/**',r=>{ai.push(r.request().url());return r.abort();});
 const base=process.env.WEB_URL??`http://127.0.0.1:${server.address().port}/notebook-pets/`;
 const shots=fileURLToPath(new URL('../../.local/web-ui/',import.meta.url));await mkdir(shots,{recursive:true});
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#title-screen').open);await page.locator('#title-start').click();
 await page.locator('#open-theme').click();assert.equal(await page.locator('input[name="main-theme"]').count(),7);
 await page.locator('[data-palette="night"]').click();await page.locator('#theme-done').click();
 await page.waitForFunction(()=>!document.querySelector('#refresh').disabled,{},{timeout:120000});
 await page.locator('#name').fill('테마 친구');await page.locator('#birth button').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled&&document.querySelector('#pet-name').textContent==='테마 친구');
 const snapshot=()=>page.evaluate(async()=>{const m=await import('./store.js');return JSON.stringify(await m.snapshot(await m.openStore()));});
 const before=await snapshot();
 for(const width of [1120,360]){
  await page.setViewportSize({width,height:900});
  for(const theme of ['notebook','night','hellgate','icekingdom','dreamforest','sunkenpalace','clockworkcity']){
   await page.locator('#open-theme').click();await page.locator(`[data-palette="${theme}"]`).click();
   assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   assert.equal(await page.locator('#theme-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
   if(theme==='night')await page.screenshot({path:path.join(shots,`themes-picker-${width}.png`)});
   await page.locator('#theme-done').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(theme==='night')await page.screenshot({path:path.join(shots,`themes-game-${width}.png`)});
  }
 }
 assert.equal(await snapshot(),before);assert.deepEqual(ai,[]);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#title-screen').open);
 assert.equal(await page.locator('html').getAttribute('data-theme'),'clockworkcity');await page.locator('#title-start').click();
 await page.waitForFunction(()=>!document.querySelector('#refresh').disabled,{},{timeout:120000});
 assert.equal(await page.locator('#pet-name').innerText(),'테마 친구');
 await page.locator('#open-home').click();await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.place==='yard');
 await page.screenshot({path:path.join(shots,'themes-home.png')});await page.locator('#home-close').click();
 await page.locator('#open-items').click();assert.equal(await page.locator('.item-card').count(),24);await page.screenshot({path:path.join(shots,'themes-catalog.png')});await page.locator('#close-items').click();
 await page.locator('#open-settings').click();await page.screenshot({path:path.join(shots,'themes-settings.png')});
 assert.equal(await snapshot(),before);assert.deepEqual(ai,[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({url:base,version:await page.locator('body').getAttribute('data-web-version'),themes:7,viewports:[1120,360],persisted:true,savedDataUnchanged:true,aiCalls:0,errors}));
}finally{await browser?.close();server.close();}
