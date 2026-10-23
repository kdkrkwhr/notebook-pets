import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../../android/app/build/generated/gameAssets/game/',import.meta.url));
const server=createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1),file=path.resolve(root,route||'index.html');if(!file.startsWith(root))throw Error();
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
 res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const page=await browser.newPage({viewport:{width:360,height:800},hasTouch:true,isMobile:true});page.setDefaultTimeout(30000);
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https:/.test(r.url()))external.push(r.url());});
 await page.addInitScript(()=>{
  window.testCalls=[];window.testBackup='';
  window.NoteBuddyNative={postMessage(raw){const r=JSON.parse(raw);window.testCalls.push(r);let result=true;
   if(r.action==='status')result={ready:true,hasLabPhoto:false,testMode:true};
   if(r.action==='complete'){
    const c=r.payload.messages.at(-1).content;
    const input=typeof c==='string'?c:Array.isArray(c)?c[0].text:c.text;
    let data;try{data=JSON.parse(input);}catch{}
    result=data?.candidates?JSON.stringify({candidate_id:data.candidates[0].id,reason:'꽃이 잘 보이는 자리예요.'}):r.payload.json?'invalid JSON fixture':'반가워! 오늘 같이 놀자.';
   }
   if(r.action==='exportBegin')window.testBackup='';
   if(r.action==='exportChunk')window.testBackup+=r.payload.text;
   queueMicrotask(()=>window.NoteBuddyNative.onmessage({data:JSON.stringify({id:r.id,result})}));
  }};
 });
 const idle=()=>page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 const snapshot=()=>page.evaluate(async()=>{const m=await import('./store.js');return m.snapshot(await m.openStore(window.NoteBuddyPlatform.databaseName));});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('공책이 준비'),{},{timeout:120000});await page.locator('#title-start').click();
 await page.locator('#birth button').click();await idle();assert.match(await page.locator('#notice').textContent(),/그림/);assert.equal((await snapshot()).player.state,null);
 await page.locator('#choose-art').click();
 const canvas=await page.locator('#art-canvas').boundingBox();await page.mouse.move(canvas.x+canvas.width*.2,canvas.y+canvas.height*.3);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.8,canvas.y+canvas.height*.7,{steps:15});await page.mouse.up();await page.locator('#art-use').click();assert.match(await page.locator('#birth-art-status').textContent(),/그림/);
 await page.locator('#choose-art').click();await page.locator('#art-input-mode').selectOption('file');
 await page.locator('#art-file').setInputFiles(fileURLToPath(new URL('../../assets/starters-v1/mammal_fire_stage1.png',import.meta.url)));
 await page.locator('#art-use').click();await page.locator('#name').fill('모바일 테스트');await page.locator('#birth button').click();await idle();
 assert.equal((await snapshot()).player.state.name,'모바일 테스트');assert.equal(Object.keys((await snapshot()).visuals.files).length,1);assert.equal(await page.evaluate(()=>testCalls.filter(r=>r.action==='complete').length),0);
 await page.locator('#care-ai-enabled').uncheck();await page.locator('[data-action="feed"]').click();await idle();assert((await snapshot()).player.state.xp>0);
 await page.locator('#message').fill('내 이름은 동기야');await page.locator('#chat button').click();await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);
 await page.locator('#message').fill('내 이름 기억해?');await page.locator('#chat button').click();await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);
 assert.equal((await snapshot()).visuals.chat.length,4);assert.equal(await page.evaluate(()=>testCalls.filter(r=>r.action==='complete').at(-1).payload.messages.length),3);
 await page.locator('#open-home').click();assert(await page.locator('#home-appearance-generate').isHidden());await page.locator('#home-appearance-default').click();await idle();assert.equal(await page.locator('#home-canvas').getAttribute('data-appearance'),'default');await page.locator('#home-close').click();
 // Fixture changes only this browser's isolated test notebook; no user/device data.
 await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(window.NoteBuddyPlatform.databaseName),s=await m.load(db);s.state.level=10;s.state.journey??={version:1,counts:{},recent:[],routes:[0,0],arc:null,chapter:0,last_arc:null,completed:0,endings:[],current:null};s.state.journey.counts={feed:30,train:10,walk:15};s.state.satiety=100;s.state.intimacy=100;await m.commit(db,s.revision,s.state);});
 await page.locator('#refresh').click();await idle();await page.locator('#open-evolution').click();
 if(await page.locator('#evolution-prepare').isEnabled()){
  await page.locator('#evolution-prepare').click();await idle();assert.equal(await page.locator('.evolution-route').count(),3);assert(await page.locator('#evolution-image-label').isHidden());await page.locator('.evolution-route').first().click();await page.locator('#evolution-confirm').click();await idle();assert.equal((await snapshot()).player.state.stage,2);
 }else throw Error('Evolution fixture needs actual counters');
 await page.locator('[data-evo-close]').click();
 // Walks and dungeon rewards still run through the same Python core.
 await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(window.NoteBuddyPlatform.databaseName),s=await m.load(db);s.state.walk_energy={charges:5,updated_at:Date.now()/1000};await m.commit(db,s.revision,s.state);
  const w=new Worker('./worker.js',{type:'module'});try{for(let seed=1;seed<=100;seed++){const r=await new Promise((resolve,reject)=>{w.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data.result);w.postMessage({id:seed,payload:{state:s.state,command:'walk_begin',arguments:[],requestId:crypto.randomUUID(),now:Date.now()/1000,seed,ids:Array.from({length:64},()=>crypto.randomUUID().replaceAll('-',''))}});});if(r.view.walk_outcome==='quiet'){const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>a instanceof Uint32Array&&a.length===1?(a[0]=seed,a):original(a);return;}}throw Error('No quiet walk');}finally{w.terminate();}});
 await page.locator('#refresh').click();await idle();await page.locator('[data-action="walk"]').click();await idle();await page.locator('#story-choices button').first().click();await page.waitForFunction(()=>!document.querySelector('#story-ending').hidden);await page.locator('#story-done').click();assert.equal((await snapshot()).player.state.journey.current.state,'done');
 await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(window.NoteBuddyPlatform.databaseName),s=await m.load(db);s.state.coins=100;s.state.dungeons={date:new Date(Date.now()+9*3600000).toISOString().slice(0,10),discovered:['hellgate'],expires_at:{hellgate:Date.now()/1000+86400},cleared:[],misses:0};await m.commit(db,s.revision,s.state);});
 await page.locator('#refresh').click();await idle();await page.locator('#open-home').click();await page.locator('#home-shop-toggle').click();await page.locator('[data-item="yard-tulips"] button').click();await page.locator('#home-purchase-confirm').click();await idle();await page.locator('#home-decorate').click();await idle();assert.equal((await snapshot()).player.state.home.reason,'꽃이 잘 보이는 자리예요.');await page.locator('#home-close').click();
 await page.locator('.dungeon-card').click();await page.locator('#dungeon-enter').click();await idle();await page.waitForFunction(()=>!document.querySelector('#dungeon-choice').hidden);await page.locator('#dungeon-safe').click();await idle();assert((await snapshot()).player.state.dungeons.last_run);await page.locator('#dungeon-close').click();
 await page.locator('#open-backup').click();await page.locator('#export').click();await idle();const backup=JSON.parse(await page.evaluate(()=>testBackup));assert.equal(backup.state.stage,2);assert.equal(backup.visuals.chat.length,4);assert(Object.keys(backup.visuals.files).length>0);await page.locator('[data-close="backup-dialog"]').click();
 const before=await snapshot();await page.reload();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='모바일 테스트',{},{timeout:120000});await page.locator('#title-start').click();assert.deepEqual((await snapshot()).player,before.player);
 const out=fileURLToPath(new URL('../../android/runtime/game-browser/',import.meta.url));await mkdir(out,{recursive:true});
 for(const width of [320,360,412,800]){await page.setViewportSize({width,height:800});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);await page.screenshot({path:path.join(out,`game-${width}.png`),fullPage:true});}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const report={drawing:true,photo:true,birth:true,missingImagePreservesState:true,feed:true,chatHistory:true,homeDefault:true,homeFurniture:true,walk:true,dungeon:true,evolutionFallback:true,backup:true,reload:true,widths:[320,360,412,800],externalRequests:external.length};
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
