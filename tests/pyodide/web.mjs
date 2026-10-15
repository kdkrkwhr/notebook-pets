import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=path.resolve(fileURLToPath(new URL('../../web/dist/',import.meta.url)));
const server=createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/notebook-pets\//,'');
 const file=path.resolve(root,route||'index.html');if(!file.startsWith(root+path.sep))throw Error();
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
 const bytes=await readFile(file);res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(bytes);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 const base=process.env.WEB_URL??`http://127.0.0.1:${server.address().port}/notebook-pets/`;
 const shots=fileURLToPath(new URL('../../.local/web-ui/',import.meta.url));await mkdir(shots,{recursive:true});
 await page.goto(base);await page.waitForFunction(()=>/공책이 준비|시작 실패/.test(document.querySelector('#notice').textContent),{},{timeout:120000});assert.match(await page.locator('#notice').textContent(),/공책이 준비/);
 await page.evaluate(()=>document.fonts.load('16px Galmuri11'));assert(await page.evaluate(()=>document.fonts.check('16px Galmuri11')));
 await page.screenshot({path:path.join(shots,'title-desktop.png')});await page.locator('#title-start').click();
 await page.screenshot({path:path.join(shots,'welcome-desktop.png')});
 await page.locator('#name').fill('웹 테스트');await page.locator('#birth button').click();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='웹 테스트');
 await page.waitForFunction(()=>document.querySelector('#pet-image').naturalWidth>0);assert.equal(await page.locator('#album .album-item').count(),4);await page.waitForFunction(()=>document.querySelector('.brand img').naturalWidth>0);await page.screenshot({path:path.join(shots,'game-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'아이템 둘러보기',exact:true}).click();assert.equal(await page.locator('.item-card').count(),24);await page.locator('#close-items').click();
 await page.getByRole('button',{name:'밥 주기',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#details').textContent.includes('경험치 10'));
 const before=await page.evaluate(async()=>{const m=await import('./store.js');return m.load(await m.openStore());});
 const conflict=await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);const results=await Promise.allSettled([m.commit(db,s.revision,s.state),m.commit(db,s.revision,s.state)]);return results.map(r=>r.status).sort();});
 assert.deepEqual(conflict,['fulfilled','rejected']);
 await page.locator('#open-settings').click();await page.locator('#key').fill('FAKE-TEST-KEY');await page.locator('#settings-dialog .primary').click();await page.locator('#message').fill('안녕');
 await page.route('https://generativelanguage.googleapis.com/**',async route=>{
   assert.equal(route.request().headers()['x-goog-api-key'],'FAKE-TEST-KEY');
   await route.fulfill({json:{candidates:[{content:{parts:[{text:'<img src=x onerror=alert(1)> 안녕!'}]}}]}});
 });
 await page.locator('#chat button').click();await page.waitForFunction(()=>document.querySelector('#messages').textContent.includes('안녕!'));assert.equal(await page.locator('#messages .message img').count(),0);
 const after=await page.evaluate(async()=>{const m=await import('./store.js');return m.load(await m.openStore());});assert.deepEqual(before.state,after.state);
 await page.locator('#open-backup').click();const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;const backup=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(backup.state.name,'웹 테스트');assert(!JSON.stringify(backup).includes('FAKE-TEST-KEY'));
 page.once('dialog',dialog=>dialog.accept());await page.locator('#import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('バックアップ')||document.querySelector('#notice').textContent.includes('백업을 가져왔'));
 await page.reload();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='웹 테스트',{},{timeout:120000});assert.equal(await page.locator('#key').inputValue(),'');assert.deepEqual(errors,[]);
 await page.locator('#title-start').click();
 for(const width of [375,390,760,1280]){
  await page.setViewportSize({width,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${width}`);
  if(width===375){await page.screenshot({path:path.join(shots,'game-mobile.png'),fullPage:true});await page.locator('#open-settings').click();assert(await page.locator('#key').isVisible());await page.screenshot({path:path.join(shots,'settings-mobile.png')});await page.locator('#settings-dialog .primary').click();}
 }
 const fonts=await page.evaluate(()=>[...document.fonts].filter(f=>f.family==='Galmuri11').map(f=>f.status));assert(fonts.includes('loaded'));
 console.log(JSON.stringify({url:base,pyodideWorker:true,persistence:true,cas:true,backup:true,byokMock:true,noKeyPersistence:true,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
