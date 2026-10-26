// Real pinned Anna UI + real Pyodide GameService/storage. Only native AI is a fixture.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../../android/app/build/generated/gameAssets/game/',import.meta.url));
const out=fileURLToPath(new URL('../../android/runtime/anna-parity/',import.meta.url));await mkdir(out,{recursive:true});
const sourceMap=JSON.parse(await readFile(path.join(root,'anna-source-map.json')));
for(const [name,record] of Object.entries(sourceMap))assert.equal(createHash('sha256').update(await readFile(path.join(root,name))).digest('hex'),record.sha256,`Unchanged pinned source: ${name}`);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(route==='/static/anna-apps/_sdk/latest/index.js'){res.setHeader('content-type','text/javascript');res.end("export {AnnaAppRuntime} from '/local/runtime.mjs';");return;}
 const file=path.resolve(root,'.'+(route==='/'?'/index.html':route));if(!file.startsWith(root))throw Error();
 res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={kind:'PC browser contract, fixture AI only; no inference or phone',sourceFiles:Object.keys(sourceMap).length,checks:[],errors:[]};
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(45000);
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 page.on('pageerror',e=>{report.errors.push(e.message);console.error(e.message);});
 page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});
 const installNativeFixture=()=>{
  localStorage.setItem('notebuddy/language-v1','ko');
  window.nativeFixture={calls:[],mode:'success'};
  window.NoteBuddyNative={postMessage(raw){const r=JSON.parse(raw);window.nativeFixture.calls.push(r);let result=true,error;
   if(r.action==='status')result={ready:!['missing-model','verify-fail'].includes(window.nativeFixture.mode),testMode:true,imageEnabled:true,localImageReady:true,textModelPresent:window.nativeFixture.mode!=='missing-model',textImageReady:window.nativeFixture.mode!=='unsupported',textImageBlockedReason:'Fixture unsupported 1024px text2img'};
   else if(r.action==='complete'){
    result=r.payload.systemPrompt.includes('fictional lifelong virtual pet personality')?JSON.stringify({traits:{curiosity:1,warmth:0,energy:0,caution:1},summary:{en:'Curious',ko:'호기심 많은 친구'},voice:{en:'Gentle',ko:'다정한 말투'},habit:{en:'Tilts head',ko:'고개를 기울여요'}}):JSON.stringify({decision:'allow',features:'A green oval, two pointed ears, two white eyes and a red diamond.',species:'reptile',element:'nature',confidence:'clear'});
   }else if(r.action==='generateTextImage'){
    const c=document.createElement('canvas');c.width=c.height=1024;c.getContext('2d').fillRect(200,200,600,600);result={image:c.toDataURL('image/png')};
    if(window.nativeFixture.mode==='hold'){window.nativeFixture.held={id:r.id,result};return;}
    if(window.nativeFixture.mode==='fail')error='Fixture generation failed';
   }else if(r.action==='cancel'){}else if(r.action==='verifyModel')error='Fixture offline hash mismatch';else error='Unexpected native action '+r.action;
   setTimeout(()=>window.NoteBuddyNative.onmessage({data:JSON.stringify({id:r.id,result,error})}),5);
  }};
 };
 await page.addInitScript(installNativeFixture);
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.waitForFunction(()=>!document.querySelector('#refresh').disabled&&document.querySelector('#welcome').hidden===false,null,{timeout:120000});
 await page.screenshot({path:path.join(out,'first.png'),animations:'disabled'});
 await page.locator('#title-start').click();await page.screenshot({path:path.join(out,'welcome.png'),animations:'disabled'});
 assert.equal(await page.locator('#birth-mode').inputValue(),'random');assert.equal(await page.locator('#pet-name').inputValue(),'');
 assert.equal(await page.locator('#birth-generate,#birth-generated-figure,#native-startup,.mobile-nav').count(),0);
 report.checks.push('original title/default-random/empty-name; no added preparation/preview/save shell');
 await page.locator('#birth-mode').selectOption('art');await page.locator('#choose-art').click();
 await page.locator('#art-input-mode').selectOption('file');
 await page.locator('#art-file').setInputFiles(fileURLToPath(new URL('../../android/imageprobe/src/main/assets/green-creature.png',import.meta.url)));
 await page.locator('#art-use').click();await page.locator('#art-dialog').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>window.nativeFixture.calls.filter(c=>c.action==='complete'||c.action==='generateTextImage').length),0);
 await page.locator('#pet-name').fill('합성 친구');await page.locator('#start-form button').click();
 await page.waitForFunction(()=>!document.querySelector('#game').hidden&&!document.querySelector('#refresh').disabled,null,{timeout:120000});
 const nativeCalls=await page.evaluate(()=>window.nativeFixture.calls);
 const images=nativeCalls.filter(c=>c.action==='generateTextImage');assert.equal(images.length,1);
 assert.equal(images[0].payload.size,'1024x1024');assert.equal(images[0].payload.n,1);assert.equal('image' in images[0].payload,false);
 assert(images[0].payload.prompt.includes('This is a new baby, not an evolution.'));
 assert.equal(nativeCalls.find(c=>c.action==='complete').payload.temperature,0);
 assert(!nativeCalls.some(c=>['download','generateImage','labPhoto'].includes(c.action)));
 report.checks.push('one Meet triggers original analysis -> real Python start -> text2img -> auto-save/personality; no img2img/download');
 await page.screenshot({path:path.join(out,'created.png'),animations:'disabled'});
 const inspect=()=>page.evaluate(async()=>{const s=await import('./local/store.mjs'),db=await s.openStore('notebuddy-android-test');const game=await s.get(db,s.GAME),art=await s.get(db,'notebuddy/art-v1');db.close();return {game,art};});
 const saved=await inspect();assert(saved.game.value);assert(Object.values(saved.art.value).some(v=>v.phase==='done'));
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled,null,{timeout:120000});await page.locator('#title-start').click();
 await page.locator('#game').waitFor({state:'visible'});assert.deepEqual(await inspect(),saved);
 assert.equal(await page.evaluate(()=>window.nativeFixture.calls.filter(c=>['complete','generateTextImage'].includes(c.action)).length),0);
 report.checks.push('saved game/art persist on reload; no automatic AI rerun');
 const persistence=await page.evaluate(async()=>{
  const s=await import('./local/store.mjs'),{AnnaAppRuntime}=await import('./local/runtime.mjs');
  const api=await AnnaAppRuntime.connect(),before=await api.tools.invoke({method:'game',args:{command:'status',language:'ko'}});
  const action={method:'game',args:{command:'feed',request_id:before.request_id_prefix+'fixture-once',language:'ko'}};
  const first=await api.tools.invoke(action),row=await api.storage.get({key:s.GAME}),replay=await api.tools.invoke(action),after=await api.storage.get({key:s.GAME});
  const db=await s.openStore('notebuddy-android-test'),chat=await s.get(db,'notebuddy/chat-v1');
  await s.set(db,'notebuddy/chat-v1',[],chat.etag);let conflict;
  try{await s.set(db,'notebuddy/chat-v1',[{role:'user',text:'stale'}],chat.etag);}catch(e){conflict=e.code;}
  const path='portraits/fixture/keep.png',blob=new Blob(['synthetic'],{type:'image/png'}),file=await s.fileWrite(db,path,blob);let fileConflict;
  try{await s.fileDelete(db,path,'stale');}catch(e){fileConflict=e.code;}
  const retained=(await s.fileRead(db,path)).etag===file.etag;db.close();
  return {first:first.ok,replay:replay.replayed,unchanged:JSON.stringify(row)===JSON.stringify(after),conflict,fileConflict,retained};
 });
 assert.deepEqual(persistence,{first:true,replay:true,unchanged:true,conflict:-32023,fileConflict:-32023,retained:true});
 report.checks.push('real GameService replay does not double-apply; stale KV/file writes preserve stored content');
 const migration=await page.evaluate(async saved=>{
  const s=await import('./local/store.mjs'),name='migration-synthetic';
  const old=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const state=saved.game.value.game,original=new Blob(['synthetic source'],{type:'image/png'}),result=new Blob(['synthetic result'],{type:'image/png'});
  await s.transaction(old,['saves'],'readwrite',(tx)=>{const o=tx.objectStore('saves');o.put({revision:7,epoch:1,state},'player');o.put({revision:2,art:{key:{path:'portraits/fixture/old.png'}},files:{'portraits/fixture/old.png':original},chat:[{role:'user',text:'fixture'}]},'visuals');o.put({format:1,original,result,confirmed:false,phase:'preview'},'birth-draft');});old.close();
  const db=await s.openStore(name),row=await s.get(db,s.GAME),file=await s.fileRead(db,'portraits/fixture/old.png');
  const retained=await s.transaction(db,['saves','anna-meta'],'readonly',(tx,done)=>{const p=tx.objectStore('saves').get('player'),d=tx.objectStore('saves').get('birth-draft'),m=tx.objectStore('anna-meta').get('migration-6066cad');m.onsuccess=()=>done({player:p.result,draftBytes:d.result.result.size,confirmed:d.result.confirmed,marker:m.result});});db.close();
  return {sameGame:JSON.stringify(row.value)===JSON.stringify(state),sourceBytes:file.blob.size,revision:retained.player.revision,draftBytes:retained.draftBytes,confirmed:retained.confirmed,retainedDraft:retained.marker.retainedDraft};
 },saved);
 assert.deepEqual(migration,{sameGame:true,sourceBytes:16,revision:7,draftBytes:16,confirmed:false,retainedDraft:true});
 report.checks.push('synthetic old schema migrated atomically; source, previous records and unconfirmed preview preserved');
 for(const mode of ['unsupported','fail','cancel','save-fault','missing-model','verify-fail']){
  const f=await browser.newPage({viewport:{width:390,height:844}});f.setDefaultTimeout(45000);
  f.on('pageerror',e=>report.errors.push(`${mode}: ${e.message}`));await f.addInitScript(installNativeFixture);
  await f.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await f.goto(`http://127.0.0.1:${server.address().port}/`);await f.waitForFunction(()=>!document.querySelector('#refresh').disabled&&!document.querySelector('#welcome').hidden,null,{timeout:120000});
  await f.locator('#title-start').click();await f.locator('#birth-mode').selectOption('art');await f.locator('#choose-art').click();await f.locator('#art-input-mode').selectOption('file');
  await f.locator('#art-file').setInputFiles(fileURLToPath(new URL('../../android/imageprobe/src/main/assets/green-creature.png',import.meta.url)));await f.locator('#art-use').click();await f.locator('#art-dialog').waitFor({state:'hidden'});
  await f.evaluate(mode=>{
   window.nativeFixture.mode=mode==='cancel'?'hold':mode==='save-fault'?'success':mode;
   if(mode==='save-fault'){const put=IDBObjectStore.prototype.put;let once=true;IDBObjectStore.prototype.put=function(value,key){const r=put.call(this,value,key);if(once&&key==='notebuddy/art-v1'&&Object.values(value.value||{}).some(v=>v?.phase==='done')){once=false;this.transaction.abort();}return r;};}
  },mode);
  await f.locator('#pet-name').fill('복구 합성 친구');await f.locator('#start-form button').click();
  if(['missing-model','verify-fail'].includes(mode)){
   await f.waitForFunction(()=>!document.querySelector('#welcome').hidden&&!document.querySelector('#refresh').disabled&&!document.querySelector('#birth-status').hidden);
   const calls=await f.evaluate(()=>window.nativeFixture.calls);
   assert.equal(calls.filter(c=>c.action==='verifyModel').length,mode==='verify-fail'?1:0);
   assert(!calls.some(c=>['download','complete','generateTextImage','generateImage'].includes(c.action)));
   report.checks.push(`${mode}: original analysis failure; no start/generation/download or fallback`);await f.close();continue;
  }
  if(mode==='cancel'){
   await f.waitForFunction(()=>!!window.nativeFixture.held);await f.evaluate(()=>window.NoteBuddyBack());
   await f.evaluate(()=>{const r=window.nativeFixture.held;window.NoteBuddyNative.onmessage({data:JSON.stringify(r)});});
  }
  await f.waitForFunction(()=>!document.querySelector('#birth-recovery').hidden&&!document.querySelector('#retry-birth').disabled,null,{timeout:120000});
  const stateBefore=await f.evaluate(async()=>{const {AnnaAppRuntime}=await import('./local/runtime.mjs'),a=await AnnaAppRuntime.connect();return {view:await a.tools.invoke({method:'game',args:{command:'status'}}),art:await a.storage.get({key:'notebuddy/art-v1'})};});
  assert(stateBefore.view.pet_id);assert(!Object.values(stateBefore.art.value).some(v=>v.phase==='done'));
  const beforeCount=await f.evaluate(()=>window.nativeFixture.calls.filter(c=>c.action==='generateTextImage').length);assert.equal(beforeCount,mode==='unsupported'?0:1);
  await f.screenshot({path:path.join(out,`recovery-${mode}.png`),animations:'disabled'});
  await f.evaluate(()=>window.nativeFixture.mode='success');await f.locator('#retry-birth').click();
  await f.waitForFunction(()=>!document.querySelector('#game').hidden&&!document.querySelector('#refresh').disabled,null,{timeout:120000});
  const stateAfter=await f.evaluate(async()=>{const {AnnaAppRuntime}=await import('./local/runtime.mjs'),a=await AnnaAppRuntime.connect();return {view:await a.tools.invoke({method:'game',args:{command:'status'}}),art:await a.storage.get({key:'notebuddy/art-v1'}),count:window.nativeFixture.calls.filter(c=>c.action==='generateTextImage').length};});
  assert.equal(stateAfter.view.pet_id,stateBefore.view.pet_id);assert(Object.values(stateAfter.art.value).some(v=>v.phase==='done'));
  assert.equal(stateAfter.count,beforeCount+(mode==='save-fault'?0:1));
  report.checks.push(`${mode}: original recovery preserves pet/source; explicit retry only${mode==='save-fault'?'; save-only retry makes no new image request':''}`);
  await f.close();
 }
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report));
}finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
