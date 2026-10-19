import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../../web/dist/',import.meta.url));
const server=createServer(async(req,res)=>{try{
  const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/notebook-pets\//,'');
  const file=path.resolve(root,route||'index.html');if(!file.startsWith(root))throw Error();
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
  res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
  browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(30000);
  const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.WEB_URL??`http://127.0.0.1:${server.address().port}/notebook-pets/`;
  let imageCalls=0,replyGate=null,releaseReply=null,failReply=false;
  await page.route('https://generativelanguage.googleapis.com/**',async route=>{
    const body=route.request().postDataJSON();
    if(body.generationConfig.responseModalities){imageCalls++;throw Error('Unexpected paid image');}
    calls.push(body);const input=body.contents[0].parts[0].text;
    if(replyGate)await replyGate;
    if(failReply)return route.fulfill({status:503,json:{error:{message:'Temporary test outage'}}});
    const candidates=(()=>{try{return JSON.parse(input).candidates;}catch{return null;}})();
    const reply=candidates?JSON.stringify({candidate_id:candidates[0].id,reason:'꽃이 잘 보이는 자리예요.'}):input==='Create the walk vignette.'?JSON.stringify({title:'함께 걷는 정원',scene:'친구가 길가의 꽃을 바라보며 웃어요.',choices:[{label:'AI가 임의로 만든 선택',ending:'코인 999개 획득'},{label:'다른 선택',ending:'경험치 999개 획득'}]}):'함께 놀아서 기분이 좋아!';
    await route.fulfill({json:{candidates:[{content:{parts:[{text:reply}]}}]}});
  });
  const idle=()=>page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  const state=()=>page.evaluate(async()=>{const m=await import('./store.js');return m.snapshot(await m.openStore());});
  // Find a deterministic quiet walk using the real core, then use that seed
  // for the UI action. This never commits any of the search results.
  const quietWalk=()=>page.evaluate(async()=>{
    const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);
    s.state.walk_energy={charges:5,updated_at:Date.now()/1000};await m.commit(db,s.revision,s.state);
    const worker=new Worker('./worker.js',{type:'module'});
    try{for(let seed=1;seed<=100;seed++){
      const result=await new Promise((resolve,reject)=>{worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data.result);worker.postMessage({id:seed,payload:{state:s.state,command:'walk_begin',arguments:[],requestId:crypto.randomUUID(),now:Date.now()/1000,seed,ids:Array.from({length:64},()=>crypto.randomUUID().replaceAll('-',''))}});});
      if(result.view.walk_outcome==='quiet'){const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>array instanceof Uint32Array&&array.length===1?(array[0]=seed,array):original(array);return;}
    }throw Error('No quiet seed found');}finally{worker.terminate();}
  });
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('공책이 준비'),{},{timeout:120000});await page.locator('#title-start').click();
  await page.locator('#name').fill('정원 친구');await page.locator('#birth button').click();await idle();
  await page.locator('#open-home').click();await page.locator('#home-appearance-default').click();await idle();
  assert.equal(await page.locator('#home-canvas').getAttribute('data-appearance'),'default');assert(await page.locator('#home-appearance-choice').isHidden());assert.equal(imageCalls,0);
  assert(Object.values((await state()).visuals.art).some(e=>e.format==='home-default-v1'));
  const core=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker('./worker.js',{type:'module'});worker.onmessage=({data})=>{worker.terminate();data.error?reject(Error(data.error)):resolve(data.result);};import('./store.js').then(async m=>{const saved=await m.load(await m.openStore());worker.postMessage({id:1,payload:{state:saved.state,command:'status',arguments:[],requestId:null,now:Date.now()/1000,seed:1,ids:Array.from({length:64},()=>crypto.randomUUID().replaceAll('-',''))}});});}));
  assert.deepEqual(core.view.home.world.yard.objects.map(o=>o.kind),['house']);assert.equal(core.view.home.catalog.length,48);
  await page.locator('#home-close').click();await page.locator('#care-ai-enabled').uncheck();
  await page.locator('#open-settings').click();await page.locator('#key').fill('CURRENT-TEST-KEY');await page.locator('#settings-dialog .primary').click();
  await page.locator('[data-action="feed"]').click();await idle();assert.equal(calls.length,0);assert((await state()).player.state.xp>0);
  replyGate=new Promise(resolve=>{releaseReply=resolve;});
  await page.locator('#care-ai-enabled').check();await page.locator('[data-action="play"]').click();
  await page.waitForFunction(()=>document.querySelector('#notice').dataset.activity==='ai');assert(await page.locator('#notice-activity').isVisible());
  releaseReply();replyGate=null;await idle();assert(await page.locator('#notice-activity').isHidden());assert.equal(calls.length,1);assert.match(await page.locator('#messages').textContent(),/함께 놀아서/);
  replyGate=new Promise(resolve=>{releaseReply=resolve;});
  await page.locator('#care-ai-enabled').uncheck();await page.locator('#message').fill('안녕');await page.locator('#chat button').click();
  await page.waitForFunction(()=>document.querySelector('#reply').dataset.activity==='chat');assert(await page.locator('#reply-activity').isVisible());
  releaseReply();replyGate=null;await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);assert(await page.locator('#reply-activity').isHidden());assert.equal(calls.length,2);
  await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);s.state.coins=100;await m.commit(db,s.revision,s.state);});await page.locator('#refresh').click();await idle();
  await page.locator('#open-home').click();await page.locator('#home-shop-toggle').click();await page.locator('[data-area="yard"]').click();assert.equal(await page.locator('.home-item').count(),36);
  for(const item of ['yard-tulips','yard-garden-bench','yard-pond']){await page.locator(`[data-item="${item}"] button`).click();await page.locator('#home-purchase-confirm').click();await idle();}
  assert.equal(calls.length,2);await page.locator('[data-mode="storage"]').click();assert.equal(await page.locator('.home-item').count(),3);
  assert.match(await page.locator('#home-storage-summary').textContent(),/3개/);
  await page.locator('#home-decorate').click();await idle();assert.equal(calls.length,3);assert.equal(Object.keys((await state()).player.state.home.layout).length,4);
  const shots=fileURLToPath(new URL('../../.local/web-ui/',import.meta.url));await mkdir(shots,{recursive:true});await page.screenshot({path:path.join(shots,'current-garden-desktop.png')});
  await page.setViewportSize({width:360,height:812});const world=await page.locator('.home-world').boundingBox(),shop=await page.locator('#home-shop-panel').boundingBox();assert(world.y+world.height<=shop.y+1);assert(world.height>=140);
  await page.screenshot({path:path.join(shots,'current-garden-mobile.png')});await page.locator('#home-close').click();await page.setViewportSize({width:1280,height:900});
  // Complete genuine core walk choices while AI is off. Newly discovered cards
  // must remain hidden behind the walk result until it is acknowledged.
  {
    await quietWalk();
    await page.locator('#refresh').click();await idle();await page.locator('[data-action="walk"]').click();await idle();
    await page.waitForFunction(()=>document.querySelector('#walk-story').open);
    assert.notEqual(await page.locator('#story-heading').textContent(),'산책');
      const before=(await state()).player.state;
      await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);s.state.dungeons={date:new Date(Date.now()+9*3600000).toISOString().slice(0,10),discovered:['hellgate'],expires_at:{hellgate:Date.now()/1000+86400},cleared:[],misses:0};await m.commit(db,s.revision,s.state);});
      await page.locator('#story-close').click();await page.locator('#refresh').click();await idle();assert.equal(await page.locator('[data-dungeon="hellgate"]').count(),0);
      await page.locator('#story-resume').click();await page.locator('#story-choices button').first().click();await page.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
      assert.equal(await page.locator('[data-dungeon="hellgate"]').count(),0);await page.locator('#story-done').click();assert.equal(await page.locator('[data-dungeon="hellgate"]').count(),1);
      assert.equal((await state()).player.state.journey.current.state,'done');assert(before.journey);
  }
  assert.equal(calls.length,3);assert.equal(imageCalls,0);
  // Enabled AI enriches one new scene; game-owned choices and rewards survive.
  await page.locator('#care-ai-enabled').check();await quietWalk();await page.locator('#refresh').click();await idle();
  await page.locator('[data-action="walk"]').click();await idle();assert.equal(calls.length,4);
  assert.equal(await page.locator('#story-heading').textContent(),'함께 걷는 정원');assert.doesNotMatch(await page.locator('#story-choices').textContent(),/AI가 임의/);
  await page.locator('#story-close').click();await page.locator('#story-resume').click();assert.equal(calls.length,4);
  await page.locator('#story-choices button').first().click();await page.waitForFunction(()=>!document.querySelector('#story-ending').hidden);assert.doesNotMatch(await page.locator('#story-ending').textContent(),/999/);await page.locator('#story-done').click();
  assert.equal(calls.length,4);await page.locator('#care-ai-enabled').uncheck();
  const before=await state();await page.reload();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='정원 친구',{},{timeout:120000});await idle();await page.locator('#title-start').click();
  assert.equal(await page.locator('#care-ai-enabled').isChecked(),false);assert.equal((await state()).player.revision,before.player.revision);assert.deepEqual((await state()).visuals,before.visuals);
  // A failed blob decode must be visible, and reopening retries the saved image
  // without generating another appearance or changing the notebook.
  await page.evaluate(()=>{const original=window.fetch;let fail=true;window.fetch=function(url,...args){if(fail&&typeof url==='string'&&url.startsWith('blob:')){fail=false;return Promise.resolve(new Response('',{status:503}));}return original.call(this,url,...args);};});
  await page.locator('#open-home').click();await idle();assert(await page.locator('#home-appearance-choice').isHidden());assert(await page.locator('#home-empty').isVisible());await page.locator('#home-close').click();
  await page.locator('#open-home').click();await idle();await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready');assert(await page.locator('#home-empty').isHidden());await page.locator('#home-close').click();
  const backup=await page.evaluate(async()=>{const m=await import('./store.js'),v=await import('./visuals.js');return v.exportNotebook(await m.openStore());});
  assert.equal(backup.visuals.story.current.fallback,false);assert.equal(backup.visuals.story.current.story.title,'함께 걷는 정원');
  const bad=structuredClone(backup);bad.visuals.story.current.choice=999;
  assert(await page.evaluate(async backup=>{try{await (await import('./visuals.js')).importVisuals(backup);return false;}catch{return true;}},bad));
  page.on('dialog',dialog=>dialog.accept());await page.locator('#open-backup').click();await page.locator('#import').setInputFiles({name:'garden-story.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await idle();await page.waitForFunction(()=>document.querySelector('#backup-status').textContent.includes('가져왔'));
  assert.deepEqual((await state()).visuals.story,backup.visuals.story);assert.deepEqual((await state()).visuals.art,backup.visuals.art);assert.equal(calls.length,4);assert.equal(imageCalls,0);assert.deepEqual(errors,[]);
  await page.locator('#backup-dialog [data-close]').click();
  await page.locator('#open-settings').click();await page.locator('#key').fill('CURRENT-TEST-KEY');await page.locator('#settings-dialog .primary').click();
  const beforeFailure=await state();failReply=true;
  await page.locator('#message').fill('연결 실패 테스트');await page.locator('#chat button').click();await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);
  assert(await page.locator('#reply-activity').isHidden());assert(await page.locator('#reply').innerText());assert.equal(calls.length,5);assert.deepEqual(await state(),beforeFailure);
  // Both albums contain images within their padded frames at desktop/mobile sizes.
  for(const width of [360,620,1280]){
    await page.setViewportSize({width,height:900});
    for(const collection of [false,true]){
      if(collection)await page.locator('#open-album').click();
      const selector=collection?'#collection-album':'#album';
      assert(await page.locator(selector).evaluate(el=>[...el.querySelectorAll('.album-image img')].every(img=>{
        const a=img.getBoundingClientRect(),b=img.parentElement.getBoundingClientRect();return img.complete&&img.naturalWidth>0&&a.x>=b.x+4&&a.y>=b.y+4&&a.right<=b.right-4&&a.bottom<=b.bottom-4&&getComputedStyle(img).objectFit==='contain';
      })));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(collection)await page.locator('#item-catalog').evaluate(d=>d.close());
    }
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url:base,version:await page.locator('body').getAttribute('data-web-version'),freeAppearance:true,emptyYard:true,gardenCatalog:36,collection:true,careToggle:true,walkNoAI:true,walkAIOnce:true,coreChoices:true,discoveryOrder:true,reloadPreserves:true,storyBackup:true,activityCleanup:true,homeImageRecovery:true,albumContainment:true,errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
