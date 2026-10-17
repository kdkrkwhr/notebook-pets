import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

// Route every request locally. These tests exercise shipped UI, not Anna's
// installer, permission service, storage server or AI provider.
const bundle=new URL('../../bundle/',import.meta.url);
const mock=await readFile(new URL('./mock-sdk.mjs',import.meta.url),'utf8');
async function setup(t,faults={}){
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});
 t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1120,height:800}});
 page.setDefaultTimeout(15000);
 let failModule=!!faults.appLoad;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='https://notebuddy.test')return route.abort();
  if(url.pathname.includes('/_sdk/'))return route.fulfill({contentType:'text/javascript',body:mock});
  if(url.pathname==='/fixture-upload')return route.fulfill({body:''});
  if(url.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"isolated-ui-test"}'});
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(faults.dungeonArt&&file.includes('/dungeons-v2/'))return route.fulfill({status:404,body:''});
  if(file==='app.js'&&failModule){failModule=false;return route.fulfill({status:404,body:'Unavailable'});}
  if(file.includes('..'))return route.abort();
  try{await route.fulfill({body:await readFile(new URL(file,bundle)),contentType:file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html'});}catch{await route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(f=>{if(!sessionStorage.getItem('test-initialized')){sessionStorage.setItem('test-initialized','1');sessionStorage.setItem('test-faults',JSON.stringify(f));}},faults);
 // Keep incidental quiet walks story-free; quietStoryWalk explicitly selects an eligible receipt.
 await page.addInitScript(()=>{const original=crypto.randomUUID.bind(crypto);crypto.randomUUID=()=>{for(let i=0;i<100;i++){const id=original();let hash=0;for(const c of `nb2:${window.hostTest?.state.sequence||0}:${id}`)hash=(Math.imul(hash,31)+c.charCodeAt(0))|0;if(hash&1)return id;}return original();};});
 if(faults.clock)await page.clock.install();
 await page.goto('https://notebuddy.test');if(faults.appLoad)await page.waitForFunction(()=>!document.querySelector('#notice').hidden);else await idle(page);
 t.after(()=>assert.deepEqual(errors,[],'No uncaught browser errors'));
 return page;
}
async function idle(p){await p.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled&&document.querySelector('#messages').dataset.reactionBusy!=='true');await p.evaluate(()=>{if(document.querySelector('#title-screen').open)document.querySelector('#title-start').click();});}
async function fault(p,value){await p.evaluate(v=>Object.assign(window.hostTest.faults,v),value);}
async function start(p){await p.locator('#pet-name').fill('Recovery buddy');await p.locator('#start-form button').click();await idle(p);}
async function chooseHome(p,mode='generate'){
 await p.locator('#open-home').click();await p.locator('#home-appearance-'+mode).click();await idle(p);await p.locator('#home-close').click();
}
async function finishWalk(p){
 if(await p.locator('#walk-story').isVisible()){
  if(await p.locator('#story-usage').isVisible()){
   await p.waitForFunction(()=>document.querySelector('#story-choices button'));
   await p.locator('#story-choices button').first().click();await p.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
  }
  await p.locator('#story-close').click();
 }
}
async function calls(p,method){return p.evaluate(m=>window.hostTest.calls.filter(x=>x.args?.command===m||m==='walk'&&x.args?.command==='walk_begin'||x.method===m),method);}

test('first home visit offers a paid choice; free default persists and a new portrait asks again',async t=>{
 const p=await setup(t);await start(p);assert.equal((await calls(p,'home-image')).length,0);
 await p.locator('#open-home').click();assert.equal(await p.locator('#home-appearance-choice').isVisible(),true);
 await p.waitForFunction(()=>document.querySelector('#home-canvas').dataset.appearance==='default');
 await p.locator('#home-appearance-default').click();await idle(p);
 assert.equal(await p.locator('#home-appearance-choice').isVisible(),false);assert.equal((await calls(p,'home-image')).length,0);
 const entry=await p.evaluate(()=>hostTest.state.kv['notebuddy/art-v1']['isolated-fixture/home-sprite-stage-1']);assert.equal(entry.format,'home-default-v1');
 await p.locator('#home-inside').click();await p.locator('#home-yard').click();await p.locator('#home-close').click();
 await p.reload();await idle(p);await p.locator('#open-home').click();assert.equal(await p.locator('#home-appearance-choice').isVisible(),false);await p.waitForFunction(()=>document.querySelector('#home-canvas').dataset.appearance==='default');assert.equal((await calls(p,'home-image')).length,0);
 await p.locator('#home-close').click();await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);assert.equal((await calls(p,'image')).length,1);assert.equal((await calls(p,'home-image')).length,0);
 await p.locator('#open-home').click();assert.equal(await p.locator('#home-appearance-choice').isVisible(),true);
});

test('one explicit home generation is reused; failure sets a visible free default without another request',async t=>{
 const p=await setup(t,{homeImage:true});await start(p);await p.locator('#open-home').click();
 await p.locator('#home-appearance-generate').click();await idle(p);
 assert.equal((await calls(p,'home-image')).length,1);assert.match(await p.locator('#home-status').innerText(),/default image is set/);
 await p.waitForFunction(()=>document.querySelector('#home-canvas').dataset.appearance==='default');
 assert.equal(await p.locator('#home-appearance-choice').isVisible(),false);await p.locator('#home-close').click();
 await p.reload();await idle(p);await p.locator('#open-home').click();assert.equal(await p.locator('#home-appearance-choice').isVisible(),false);assert.equal((await calls(p,'home-image')).length,0);
});

test('an app removal marker blocks paid work even when the tool still returns an active companion',async t=>{
 const p=await setup(t);await start(p);
 for(const key of ['notebuddy/art-v1','notebuddy/chat-v1']){
  await p.evaluate(key=>{window.hostTest.state.kv[key]={_notebuddy_erased:1};},key);
  const before=await p.evaluate(()=>window.hostTest.calls.filter(c=>['image','home-image','llm'].includes(c.method)).length);
  await p.locator('#refresh').click();await idle(p);
  assert.equal(await p.locator('#restart-removed').isVisible(),true);
  assert.equal(await p.locator('#draw').isVisible(),false);
  assert.equal(await p.locator('#chat-input').isVisible(),false);
  assert.equal(await p.evaluate(()=>window.hostTest.calls.filter(c=>['image','home-image','llm'].includes(c.method)).length),before);
  await p.evaluate(key=>{delete window.hostTest.state.kv[key];},key);
 }
});

test('item book opens only after creating a pet, filters and details never call AI or mutate storage',async t=>{
 const p=await setup(t);
 assert.equal(await p.locator('#open-items').isVisible(),false);
 assert.equal(await p.locator('#title-screen .title-menu button').count(),2);
 await start(p);const before=await p.evaluate(()=>JSON.stringify(window.hostTest.state));
 const callsBefore=await p.evaluate(()=>window.hostTest.calls.length);
 assert.equal(await p.locator('#item-catalog').isVisible(),false);
 await p.locator('#open-items').click();assert.equal(await p.locator('[data-item]').count(),24);
 assert.match(await p.locator('#item-catalog-notice').innerText(),/one unowned regional item/);
 await p.locator('#item-region').selectOption('icekingdom');assert.equal(await p.locator('[data-item]').count(),4);
 await p.locator('#item-slot').selectOption('head');assert.equal(await p.locator('[data-item]').count(),1);
 await p.locator('[data-item="frost-crown"]').click();assert.equal(await p.locator('#item-detail-name').innerText(),'Frost Crown');
 assert.match(await p.locator('#item-detail-reward').innerText(),/three standard items/);
 assert.match(await p.locator('#item-detail-fit').innerText(),/never add/);
 assert.equal(await p.locator('#item-detail-image').evaluate(img=>img.decode().then(()=>img.naturalWidth>0)),true);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#item-detail').isVisible(),false);assert.equal(await p.locator('#item-catalog').isVisible(),true);
 await p.locator('#item-clear').click();await p.locator('#item-search').fill('no-such-item');assert.equal(await p.locator('#item-empty').isVisible(),true);
 await p.locator('#item-clear').click();assert.equal(await p.locator('[data-item]').count(),24);
 for(const [region,label] of [['sunkenpalace','Sunken Palace'],['clockworkcity','Forgotten Clockwork City']]){
  await p.locator('#item-region').selectOption(region);assert.equal(await p.locator('[data-item]').count(),4);
  assert.equal(await p.locator('#item-region option:checked').innerText(),label);
  for(const card of await p.locator('[data-item]').all()){
   await card.click();assert.match(await p.locator('#item-detail-reward').innerText(),/unowned standard|three standard items/);
   assert.equal(await p.locator('#item-detail-image').evaluate(img=>img.decode().then(()=>img.naturalWidth>0)),true);
   await p.locator('#close-item-detail').click();
  }
 }
 await p.locator('#close-items').click();assert.equal(await p.locator('#open-items').evaluate(e=>document.activeElement===e),true);
 assert.equal(await p.evaluate(()=>JSON.stringify(window.hostTest.state)),before);
 assert.equal(await p.evaluate(()=>window.hostTest.calls.length),callsBefore);
});

test('owned inventory refreshes, survives reopening and never spends AI or coins while browsing',async t=>{
 const p=await setup(t);await start(p);
 await p.evaluate(()=>{window.hostTest.state.save.status.collectibles={'ember-horns':1,'frost-crown':1};localStorage.setItem('test-host',JSON.stringify(window.hostTest.state));});
 await p.locator('#refresh').click();await idle(p);
 const before=await p.evaluate(()=>JSON.stringify(window.hostTest.state));
 const callsBefore=await p.evaluate(()=>window.hostTest.calls.length);
 await p.locator('#open-inventory').click();assert.equal(await p.locator('[data-item]').count(),2);
 await p.locator('[data-item="frost-crown"]').click();assert.equal(await p.locator('#item-detail-owned').innerText(),'Owned');
 await p.locator('#close-item-detail').click();await p.locator('#item-owned').selectOption('missing');assert.equal(await p.locator('[data-item]').count(),22);
 await p.locator('#close-items').click();
 assert.equal(await p.evaluate(()=>JSON.stringify(window.hostTest.state)),before);assert.equal(await p.evaluate(()=>window.hostTest.calls.length),callsBefore);
 await p.reload();await idle(p);await p.setViewportSize({width:360,height:740});await p.locator('#language').selectOption('ko');await idle(p);
 await p.locator('#open-inventory').click();assert.equal(await p.locator('[data-item]').count(),2);
 assert.match(await p.locator('#item-count').innerText(),/보유 2종/);assert.equal(await p.locator('#item-catalog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 if(process.env.ANNA_INVENTORY_CAPTURE)await p.screenshot({path:process.env.ANNA_INVENTORY_CAPTURE});
 await p.locator('#close-items').click();
 await p.evaluate(()=>{window.hostTest.state.save.status.collectibles={};localStorage.setItem('test-host',JSON.stringify(window.hostTest.state));});
 await p.locator('#refresh').click();await idle(p);await p.locator('#open-inventory').click();assert.equal(await p.locator('[data-item]').count(),0);assert.equal(await p.locator('#item-empty').isVisible(),true);
});

test('Korean item book fits a narrow screen and distinguishes body requirements from surrounding effects',async t=>{
 const p=await setup(t);await start(p);await p.setViewportSize({width:360,height:740});
 await p.locator('#language').selectOption('ko');await idle(p);await p.locator('#open-items').click();
 assert.equal(await p.locator('#item-catalog-heading').innerText(),'탐험가의 아이템 도감');
 await p.locator('#item-slot').selectOption('aura');assert.equal(await p.locator('[data-item]').count(),6);
 await p.locator('[data-item="firefly-orbit"]').click();assert.match(await p.locator('#item-detail-fit').innerText(),/손·발이나 고정할 부위가 필요 없/);
 assert.equal(await p.locator('#item-detail').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await p.locator('#close-item-detail').click();await p.locator('#item-clear').click();
 await p.locator('#item-search').fill('목도리');assert.equal(await p.locator('[data-item]').count(),2);
 await p.locator('#item-clear').click();await p.locator('#item-region').selectOption('clockworkcity');
 assert.equal(await p.locator('#item-region option:checked').innerText(),'잊혀진 태엽도시');
 await p.locator('[data-item="gear-orbit"]').click();assert.equal(await p.locator('#item-detail-name').innerText(),'작은 태엽 무리');
 assert.match(await p.locator('#item-detail-fit').innerText(),/손·발이나 고정할 부위가 필요 없/);
 await p.locator('#close-item-detail').click();
 assert.equal(await p.locator('#item-catalog').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await p.locator('.item-fit-explanation summary').click();assert.match(await p.locator('.item-fit-explanation').innerText(),/손이 없는 친구도 수집/);
 if(process.env.ANNA_ITEMS_CAPTURE){await p.locator('#item-clear').click();await p.locator('#item-catalog').evaluate(e=>e.scrollTo(0,0));await p.screenshot({path:process.env.ANNA_ITEMS_CAPTURE});}
 assert.equal((await calls(p,'image')).length,0);assert.equal((await calls(p,'llm')).length,0);
});

test('birth prepares only a free pixel preview; home waits for an explicit appearance choice',async t=>{
 const p=await setup(t);await start(p);
 await p.waitForFunction(()=>window.hostTest.state.kv['notebuddy/art-v1']?.['isolated-fixture/pixel-stage-1']);
 assert.equal((await calls(p,'image')).length,0);assert.equal((await calls(p,'llm')).length,0);
 assert.equal((await calls(p,'home-image')).length,0);
 assert.equal(await p.locator('#pixel-pet').isVisible(),true);
 const result=await p.evaluate(async()=>{
  const {pixelatePortrait}=await import('./pixel-pet.mjs');
  const response=await fetch(document.querySelector('#pet-image').src),blob=await pixelatePortrait(await response.blob()),bitmap=await createImageBitmap(blob);
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);const data=context.getImageData(0,0,64,64).data;
  return {width:bitmap.width,height:bitmap.height,type:blob.type,corner:data[3],opaque:Array.from(data).filter((v,i)=>i%4===3&&v===255).length};
 });
 assert.deepEqual([result.width,result.height,result.type,result.corner],[64,64,'image/png',0]);assert.ok(result.opaque>100);
 await p.reload();await idle(p);assert.equal(await p.locator('#pixel-pet').isVisible(),true);assert.equal((await calls(p,'finalize')).length,0);
});

test('movement follows new portraits and growth artwork, never visits or unchanged evolution artwork',async t=>{
 const p=await setup(t);await start(p);await chooseHome(p);
 assert.equal((await calls(p,'home-image')).length,1);
 assert.equal(await p.locator('#home-sprite').count(),0);
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'home-image')).length,1);
 await fault(p,{evolve:2});await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal((await calls(p,'home-image')).length,1,'a stage number alone does not request poses');
 await p.locator('#draw-evolved').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);assert.equal((await calls(p,'home-image')).length,1);await chooseHome(p);assert.equal((await calls(p,'home-image')).length,2);
 const art=await p.evaluate(()=>hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(art['isolated-fixture/home-sprite-stage-2'].source_path,art['isolated-fixture/stage-2'].path);
 assert.equal(art['isolated-fixture/home-sprite-stage-2'].stage,2);
 await p.reload();await idle(p);assert.equal((await calls(p,'home-image')).length,0);
 await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.equal((await calls(p,'home-image')).length,0);await chooseHome(p);
 assert.equal((await calls(p,'home-image')).length,1,'a replacement portrait gets its own poses');
});

test('movement failure preserves a new companion and portrait without automatic retries',async t=>{
 const p=await setup(t,{homeImage:true});await start(p);await chooseHome(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');assert.equal((await calls(p,'home-image')).length,1);
 assert.match(await p.locator('#home-movement-status').innerText(),/companion is saved/);
 assert.match(await p.locator('#home-movement-status').innerText(),/movement:generate/);
 assert.match(await p.locator('#pixel-status').innerText(),/Static pixel preview/);
 assert.doesNotMatch(await p.locator('#pixel-status').innerText(),/Ready for dungeon/);
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'home-image')).length,1);
 await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.equal((await calls(p,'home-image')).length,1);await chooseHome(p);
 assert.equal((await calls(p,'home-image')).length,2);assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
 await p.reload();await idle(p);assert.equal((await calls(p,'home-image')).length,0);
 assert.match(await p.locator('#home-movement-status').innerText(),/movement:generate/);
});

test('unreadable movement sheet is distinguished from service failure and survives reload',async t=>{
 const p=await setup(t,{homeSpriteSheet:'data:image/png;base64,YmFk'});await start(p);await chooseHome(p);
 assert.match(await p.locator('#home-movement-status').innerText(),/movement:validate/);
 assert.equal(await p.locator('#pixel-pet').isVisible(),true);
 assert.equal((await calls(p,'home-image')).length,1);
 const data=await p.evaluate(()=>hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(data['isolated-fixture/home-sprite-request-stage-1'].failure,'validate');
 assert.equal(data['isolated-fixture/home-sprite-stage-1'].format,'home-default-v1');
 assert.match(data['isolated-fixture/home-sprite-request-stage-1'].path,/home-sprite-/,'the unreadable paid result is retained privately');
 await p.reload();await idle(p);assert.match(await p.locator('#home-movement-status').innerText(),/movement:validate/);assert.equal((await calls(p,'home-image')).length,0);
 await p.locator('#language').selectOption('ko');await idle(p);assert.match(await p.locator('#pixel-status').innerText(),/정적인 픽셀 미리보기/);assert.match(await p.locator('#home-movement-status').innerText(),/4 × 4 동작 시트/);
});

test('pixel save failure preserves the companion and retries without paid generation',async t=>{
 const p=await setup(t,{pixelUpload:true});await start(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');assert.match(await p.locator('#pixel-status').innerText(),/unfinished/);
 await p.locator('#prepare-pixel').click();await idle(p);
 assert.equal(await p.locator('#pixel-pet').isVisible(),true);
 const uploads=(await calls(p,'finalize')).filter(x=>x.path.includes('/pixel-'));
 assert.equal(uploads.length,2);assert.equal(uploads[0].path,uploads[1].path);
 assert.equal((await calls(p,'image')).length,0);
});

test('discovery guidance stays visible without exposing undiscovered dungeon cards',async t=>{
 const p=await setup(t,{walkDiscovery:false});await start(p);
 const before=await p.evaluate(()=>({state:JSON.stringify(window.hostTest.state),calls:window.hostTest.calls.length}));
 assert.match(await p.locator('[data-i18n="battleRecordHelp"]').innerText(),/Dungeon results do not count/);
 await p.locator('#dungeon-section summary').click();
 assert.match(await p.locator('[data-i18n="dungeonRegionsHelp"]').innerText(),/Five regions/);
 assert.match(await p.locator('#dungeon-section [data-i18n="dungeonDate"]').innerText(),/without an automatic replacement/);
 assert.deepEqual(await p.evaluate(()=>({state:JSON.stringify(window.hostTest.state),calls:window.hostTest.calls.length})),before);
 await p.locator('#language').selectOption('ko');
 assert.match(await p.locator('[data-i18n="battleRecordHelp"]').innerText(),/일반 전투만/);
 assert.match(await p.locator('[data-i18n="dungeonRegionsHelp"]').innerText(),/다섯 지역/);
 await p.setViewportSize({width:360,height:800});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await p.locator('#language').selectOption('en');
 await p.setViewportSize({width:1120,height:800});
 assert.equal(await p.locator('#dungeon-section').isVisible(),true);
 assert.equal(await p.locator('[data-dungeon]').count(),0);
 assert.equal(await p.locator('#pixel-pet').isVisible(),true);
 await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal(await p.locator('#dungeon-section').isVisible(),true);
 await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 assert.equal(await p.locator('[data-dungeon]').count(),0);
 await p.reload();await idle(p);
 assert.equal(await p.locator('#dungeon-section').isVisible(),true);
 await p.locator('#story-resume').click();await p.locator('[data-action="flee"]').click();await idle(p);await finishWalk(p);
 await fault(p,{walkDiscovery:true});await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 assert.equal(await p.locator('#dungeon-section').isVisible(),true);
 assert.equal(await p.locator('[data-dungeon]').count(),1);
 assert.equal(await p.locator('[data-dungeon="icekingdom"]').count(),0);
 assert.match(await p.locator('#action-result').innerText(),/Discovered: Hellgate/);
 await p.reload();await idle(p);assert.equal(await p.locator('[data-dungeon]').count(),1);
});

test('dungeon completion saves results without adding a history panel',async t=>{
 const p=await setup(t,{walkOutcome:'quiet'});await start(p);await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.locator('[data-dungeon="hellgate"]').click();await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='ready');assert.equal(await p.locator('#dungeon-enter').isEnabled(),true);
 assert.match(await p.locator('[data-i18n="dungeonHealthHelp"]').innerText(),/starts at full HP/);
 assert.match(await p.locator('[data-i18n="dungeonHealthHelp"]').innerText(),/HP carries between stages/);
 const size=await p.evaluate(()=>{const d=document.querySelector('#dungeon-dialog').getBoundingClientRect(),m=document.querySelector('#dungeon-map').getBoundingClientRect();return {width:d.width,height:d.height,map:m.width,vw:innerWidth,vh:innerHeight};});
 assert.ok(size.width>=size.vw*.9&&size.height>=size.vh*.9);assert.ok(size.map>620,JSON.stringify(size));
 await p.locator('#dungeon-enter').click();await idle(p);
 assert.equal(await p.locator('#dungeon-dialog').isVisible(),true);
 const first=await p.locator('#dungeon-map').getAttribute('data-camera');
 await p.waitForFunction(before=>document.querySelector('#dungeon-map').dataset.camera!==before,first);
 await p.locator('#dungeon-skip').click();assert.match(await p.locator('#dungeon-result').innerText(),/10 coins/);
 await p.locator('#dungeon-skip').click();assert.equal((await calls(p,'explore_hellgate')).length,1);
 await p.reload();await idle(p);assert.match(await p.locator('#dungeon-coins').innerText(),/10/);
 assert.equal(await p.locator('#dungeon-replay').count(),0);assert.equal(await p.locator('#dungeon-section').isVisible(),true);
 assert.equal((await calls(p,'explore_hellgate')).length,0);
});

test('dungeon camera follows the route into combat and completes without another action',async t=>{
 const p=await setup(t,{walkOutcome:'quiet'});await start(p);await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.locator('[data-dungeon="hellgate"]').click();await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='ready');
 await p.locator('#dungeon-enter').click();await idle(p);
 if(process.env.ANNA_RPG_CAPTURE){
  await p.evaluate(async()=>{const {pixelatePortrait}=await import('./pixel-pet.mjs');const source=await fetch('assets/starters-v1/fairy_nature_stage1.png');document.querySelector('#dungeon-explorer').src=URL.createObjectURL(await pixelatePortrait(await source.blob()));});
  await p.locator('#dungeon-explorer').evaluate(e=>e.decode());
  await p.locator('#dungeon-dialog').screenshot({path:process.env.ANNA_RPG_CAPTURE+'-entry.png'});
 }
 const camera=await p.locator('#dungeon-map').getAttribute('data-camera');
 await p.locator('#dungeon-fast').click();
 await p.waitForFunction(before=>document.querySelector('#dungeon-map').dataset.camera!==before,camera);
 if(process.env.ANNA_RPG_CAPTURE)await p.locator('#dungeon-dialog').screenshot({path:process.env.ANNA_RPG_CAPTURE+'-travel.png'});
 await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.phase==='battle');
 if(process.env.ANNA_RPG_CAPTURE)await p.locator('#dungeon-dialog').screenshot({path:process.env.ANNA_RPG_CAPTURE+'-boss.png'});
 await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.phase==='finished');
 assert.match(await p.locator('#dungeon-result').innerText(),/10 coins/);
 assert.equal((await calls(p,'explore_hellgate')).length,1);assert.equal((await calls(p,'image')).length,0);
 assert.equal(await p.locator('#dungeon-boss-hp').evaluate(e=>e.value),0);
});

test('unavailable dungeon art blocks entry without spending a charge',async t=>{
 const p=await setup(t,{walkOutcome:'quiet',dungeonArt:true});await start(p);await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.locator('[data-dungeon="hellgate"]').click();await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='failed');
 assert.equal(await p.locator('#dungeon-enter').isDisabled(),true);
 assert.match(await p.locator('#dungeon-phase').innerText(),/load/i);
 assert.equal((await calls(p,'explore_hellgate')).length,0);
});

test('dungeon countdown expires and old saved results do not expose an expired entry',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.locator('#story-resume').click();await p.locator('[data-action="flee"]').click();await idle(p);await finishWalk(p);
 await p.evaluate(()=>{window.hostTest.state.save.status.dungeons.entries[0].expires_at=Date.now()/1000+4;});
 await p.locator('#refresh').click();await idle(p);
 await p.locator('[data-dungeon="hellgate"]').click();assert.match(await p.locator('#dungeon-countdown').innerText(),/Closes in 00:00:0/);
 await p.waitForFunction(()=>document.querySelector('#dungeon-countdown').textContent.includes('Time is up'));
 assert.equal(await p.locator('#dungeon-enter').isDisabled(),true);
 assert.match(await p.locator('#dungeon-countdown').innerText(),/Time is up/);
 assert.equal(await p.locator('[data-dungeon]').count(),0);
 assert.equal((await calls(p,'explore_hellgate')).length,0);
 await p.locator('#dungeon-close').click();
 await p.evaluate(()=>{window.hostTest.state.save.status.dungeons.entries[0].expires_at=Date.now()/1000+86400;});
 await p.locator('#refresh').click();await idle(p);
 await p.locator('[data-dungeon="hellgate"]').click();await p.locator('#dungeon-enter').click();await idle(p);
 await p.locator('#dungeon-close').click();
 await p.evaluate(()=>{window.hostTest.state.save.status.dungeons.entries[0].expires_at=Date.now()/1000-1;});
 await p.locator('#refresh').click();await idle(p);assert.equal(await p.locator('[data-dungeon]').count(),0);
 assert.equal(await p.locator('#dungeon-replay').count(),0);assert.equal(await p.locator('#dungeon-section').isVisible(),true);
 assert.equal((await calls(p,'explore_hellgate')).length,1);
});

test('an open dungeon blocks new discoveries until a clear; closing or losing keeps it pending',async t=>{
 const p=await setup(t,{walkOutcome:'quiet'});await start(p);
 async function walk(){await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);}
 await walk();
 await p.locator('[data-dungeon="hellgate"]').click();await p.locator('#dungeon-close').click();
 await walk();
 assert.deepEqual(await p.locator('[data-dungeon]').evaluateAll(es=>es.map(e=>e.dataset.dungeon)),['hellgate']);
 assert.doesNotMatch(await p.locator('#action-result').innerText(),/Discovered:/);
 await fault(p,{dungeonLose:true});await p.locator('[data-dungeon="hellgate"]').click();await p.locator('#dungeon-enter').click();await idle(p);
 await p.locator('#dungeon-close').click();await walk();
 assert.deepEqual(await p.locator('[data-dungeon]').evaluateAll(es=>es.map(e=>e.dataset.dungeon)),['hellgate']);
 await fault(p,{dungeonLose:false});await p.locator('[data-dungeon="hellgate"]').click();await p.locator('#dungeon-enter').click();await idle(p);
 await p.locator('#dungeon-close').click();assert.equal(await p.locator('[data-dungeon]').count(),0);
 assert.equal(await p.locator('#dungeon-replay').count(),0);
 await walk();
 assert.deepEqual(await p.locator('[data-dungeon]').evaluateAll(es=>es.map(e=>e.dataset.dungeon)),['icekingdom']);
 await p.reload();await idle(p);assert.equal(await p.locator('[data-dungeon="hellgate"]').count(),0);
 assert.equal(await p.locator('[data-dungeon="icekingdom"]').count(),1);
});

test('lost dungeon response exposes same-request retry and a mobile reduced-motion replay',async t=>{
 const p=await setup(t,{walkOutcome:'quiet'});await start(p);await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.setViewportSize({width:360,height:780});await p.emulateMedia({reducedMotion:'reduce'});
 await p.locator('#language').selectOption('ko');await idle(p);await fault(p,{lost:true});
 await p.locator('[data-dungeon="hellgate"]').click();await p.locator('#dungeon-enter').click();await idle(p);
 await p.locator('#dungeon-close').click();await p.locator('#retry-action').click();await idle(p);
 const requests=await calls(p,'explore_hellgate');assert.equal(requests.length,2);assert.equal(requests[0].args.request_id,requests[1].args.request_id);
 assert.match(await p.locator('#dungeon-result').innerText(),/코인 10/);
 assert.equal(await p.locator('#dungeon-skip').innerText(),'닫기');
 const width=await p.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(width.scroll<=width.client);
 if(process.env.ANNA_DUNGEON_CAPTURE){
  await p.locator('#dungeon-dialog').screenshot({path:process.env.ANNA_DUNGEON_CAPTURE});
  await p.locator('#dungeon-close').click();
  await p.evaluate(()=>{for(const e of window.hostTest.state.save.status.dungeons.entries){e.discovered=true;e.expires_at=Date.now()/1000+86400;}});
  await p.locator('#refresh').click();await idle(p);
  for(const id of ['hellgate','icekingdom','dreamforest']){
   await p.locator(`[data-dungeon="${id}"]`).click();
   await p.evaluate(async()=>{
    const {pixelatePortrait}=await import('./pixel-pet.mjs');
    const source=await fetch('assets/starters-v1/fairy_nature_stage1.png');
    document.querySelector('#dungeon-explorer').src=URL.createObjectURL(await pixelatePortrait(await source.blob()));
   });
   await p.locator('#dungeon-explorer').evaluate(e=>e.decode());
   await p.locator('#dungeon-dialog').screenshot({path:process.env.ANNA_DUNGEON_CAPTURE.replace('.png',`-${id}.png`)});
   await p.locator('#dungeon-close').click();
  }
 }
});

test('initial connection failure recovers using Refresh',async t=>{
 const p=await setup(t,{connect:true});assert.match(await p.locator('#connection').innerText(),/Check/);
 await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('#welcome').isVisible(),true);
 assert.equal((await calls(p,'connect')).length,2);
});
test('denied permission recovers after grant; no automatic creation',async t=>{
 const p=await setup(t,{permission:true});assert.match(await p.locator('#notice').innerText(),/permissions/);
 assert.equal((await calls(p,'start')).length,0);
 await fault(p,{permission:false});await p.locator('#refresh').click();await idle(p);await start(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
});
test('lost creation response has a visible same-request retry',async t=>{
 const p=await setup(t,{lost:true});await start(p);
 assert.equal(await p.locator('#retry-action').isVisible(),true);
 assert.equal(await p.locator('#start-form button').isDisabled(),true);
 await p.locator('#retry-action').click();await idle(p);
 const attempts=await calls(p,'start');assert.equal(attempts.length,2);assert.equal(attempts[0].args.request_id,attempts[1].args.request_id);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
});
test('lost care response retains original retry across refresh; double click spends once',async t=>{
 const p=await setup(t);await start(p);await fault(p,{lost:true,delay:150});
 await p.locator('[data-action="feed"]').evaluate(e=>{e.click();e.click();});await idle(p);
 assert.equal((await calls(p,'feed')).length,1);
 assert.equal(await p.locator('[data-action="play"]').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('[data-action="play"]').isDisabled(),true);
 await p.locator('#retry-action').click();await idle(p);
 const attempts=await calls(p,'feed');assert.equal(attempts[0].args.request_id,attempts[1].args.request_id);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 assert.match(await p.locator('#inventory').innerText(),/Food 2/);
 assert.equal(await p.locator('[data-action="play"]').isDisabled(),false);
});
test('status/storage outages preserve saved progress and recover on refresh',async t=>{
 const p=await setup(t);await start(p);await fault(p,{status:true});await p.locator('#refresh').click();await idle(p);
 assert.match(await p.locator('#connection').innerText(),/Check/);
 await fault(p,{status:false,extras:true});await p.locator('#refresh').click();await idle(p);assert.match(await p.locator('#notice').innerText(),/chat or album/);
 await fault(p,{extras:false});await p.locator('#refresh').click();await idle(p);assert.equal(await p.locator('#notice').isVisible(),false);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
});
test('chat failure restores draft, failed save warns, saved exchange survives reopen',async t=>{
 const p=await setup(t);await start(p);await fault(p,{llm:true});
 await p.locator('#chat-input').fill('Hello');await p.locator('#chat-form button').click();await idle(p);
 assert.equal(await p.locator('#chat-input').inputValue(),'Hello');assert.equal(await p.locator('#messages .user').count(),0);
 await fault(p,{llm:false,save:true});await p.locator('#chat-form button').click();await idle(p);assert.match(await p.locator('#notice').innerText(),/could not be saved/);
 assert.equal(await p.locator('#chat-form button').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);assert.match(await p.locator('#messages').innerText(),/happy to see/);
 await p.locator('#language').selectOption('ko');await idle(p);assert.equal(await p.locator('#retry-chat').isVisible(),true);
 await fault(p,{save:false,lostSave:true});await p.locator('#retry-chat').click();await idle(p);assert.equal(await p.locator('#retry-chat').isVisible(),true);
 await p.locator('#retry-chat').evaluate(e=>{e.click();e.click();});await idle(p);assert.equal(await p.locator('#retry-chat').isVisible(),false);
 assert.equal((await calls(p,'llm')).length,2,'Only initial failed AI call and successful AI reply; save retries never call AI');
 await p.reload();await idle(p);assert.equal(await p.locator('#messages .message').count(),2);assert.match(await p.locator('#messages').innerText(),/Hello/);
});
test('portrait upload retry does not generate twice and survives reopen',async t=>{
 const p=await setup(t);await start(p);await fault(p,{upload:true});await p.locator('#draw').click();await p.locator('#confirm-draw').click();await idle(p);
 assert.match(await p.locator('#draw').innerText(),/Retry saving/);assert.equal(await p.locator('#clean-portraits').isDisabled(),true);await p.locator('#draw').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);
 const generated=(await calls(p,'image'))[0].options;
 assert.match(generated.prompt,/plain white background/);
 assert.match(generated.prompt,/soft painted game character illustration/);
 assert.doesNotMatch(generated.prompt,/on a warm ivory notebook page|colored pencil/);
 assert.match(await p.locator('#notice').innerText(),/safe in your album/);
 await p.reload();await idle(p);assert.match(await p.locator('#image-caption').innerText(),/AI portrait/);
 assert.equal(await p.locator('#pet-image').evaluate(e=>e.complete&&e.naturalWidth>0),true);
});
test('360px layout and language switch preserve partner and privacy controls',async t=>{
 const p=await setup(t);await start(p);await p.setViewportSize({width:360,height:740});
 await p.locator('#language').selectOption('ko');await idle(p);assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 await p.locator('#privacy').click();assert.match(await p.locator('#privacy-dialog').innerText(),/개인정보/);
 const size=await p.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width);
 await p.locator('#privacy-dialog button').first().click();await p.locator('#language').selectOption('en');await idle(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
});
test('unconfirmed removal blocks play until refresh verifies the game is active',async t=>{
 const p=await setup(t);await start(p);await p.locator('#privacy').click();await p.locator('#erase-data').click();await idle(p);
 await p.locator('#erase-quiescent').check();await p.locator('#erase-phrase').fill('DELETE NOTEBUDDY');await p.locator('#confirm-erase').click();await idle(p);
 assert.match(await p.locator('#notice').innerText(),/could not be confirmed/);
 assert.equal(await p.locator('[data-action="feed"]').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);
 assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 assert.equal(await p.locator('[data-action="feed"]').isDisabled(),false);
});


test('pending chat is discarded when the game is removed before retry',async t=>{
 const p=await setup(t);await start(p);await fault(p,{save:true});await p.locator('#chat-input').fill('Temporary');await p.locator('#chat-form button').click();await idle(p);
 await fault(p,{save:false,erased:true});await p.locator('#retry-chat').click();await idle(p);
 assert.equal(await p.locator('#removed').isVisible(),true);assert.equal(await p.locator('#retry-chat').isVisible(),false);
 assert.equal(await p.locator('#messages').innerText(),'');assert.equal((await calls(p,'llm')).length,1);
 assert.equal(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),undefined);
});
test('portrait cleanup confirms intent, retries failures and preserves current and earlier stages',async t=>{
 const p=await setup(t);await start(p);
 await p.evaluate(()=>{
  const s=window.hostTest.state;s.kv['notebuddy/art-v1']={'isolated-fixture/stage-1':{path:'portraits/pet/baby.png'},'isolated-fixture/stage-2':{path:'portraits/pet/current.png'}};
  s.files={'portraits/pet/baby.png':'a','portraits/pet/current.png':'b','portraits/pet/old.png':'c'};
 });
 await p.locator('#clean-portraits').click();await p.locator('#confirm-clean-portraits').click();assert.match(await p.locator('#portraits-error').innerText(),/check the box/);assert.equal((await calls(p,'delete')).length,0);
 await p.locator('#portraits-dialog button').first().click();assert.equal((await calls(p,'delete')).length,0);
 await fault(p,{delete:true});await p.locator('#clean-portraits').click();await p.locator('#portraits-quiescent').check();await p.locator('#confirm-clean-portraits').click();await idle(p);assert.match(await p.locator('#notice').innerText(),/could not finish/);
 await fault(p,{delete:false});await p.locator('#clean-portraits').click();await p.locator('#portraits-quiescent').check();await p.locator('#confirm-clean-portraits').click();await idle(p);
 assert.match(await p.locator('#notice').innerText(),/Removed 1/);assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 assert.deepEqual((await calls(p,'delete')).map(c=>c.path),['portraits/pet/old.png']);assert.equal((await calls(p,'image')).length,0);
});

async function resetDialog(p){await p.locator('#reset-game').click();await idle(p);}
async function confirmReset(p){await p.locator('#reset-quiescent').check();await p.locator('#reset-phrase').fill('RESET NOTEBUDDY');await p.locator('#confirm-reset').click();await idle(p);}
test('new companion reset requires confirmation, preserves cancel, and resumes lost begin plus interrupted cleanup after reopen',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="feed"]').click();await idle(p);
 await resetDialog(p);await p.locator('#confirm-reset').click();assert.match(await p.locator('#reset-error').innerText(),/Check the box/);
 await p.locator('#reset-dialog button').first().click();assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 await p.evaluate(()=>{window.hostTest.state.files={'portraits/old/a.png':'1'};window.hostTest.state.kv['notebuddy/chat-v1']=[{id:'old',role:'user',text:'old chat'}];});
 await fault(p,{resetLost:true,delete:true});await resetDialog(p);await confirmReset(p);
 assert.equal(await p.locator('#resetting').isVisible(),true);assert.equal(await p.locator('#game').isVisible(),false);
 await p.locator('#resume-reset').click();await idle(p);assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.reload();await idle(p);assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.locator('#resume-reset').click();await idle(p);
 assert.equal(await p.locator('#welcome').isVisible(),true);assert.equal(await p.locator('#reset-name').count(),0);assert.equal(await p.evaluate(()=>window.hostTest.state.save),null);await start(p);assert.equal(await p.locator('#xp-label').innerText(),'0 / 100 XP');
 assert.equal(await p.locator('#messages .user').count(),0);assert.equal(await p.evaluate(()=>Object.keys(window.hostTest.state.files).length),0);
 assert.equal((await calls(p,'image')).length,0);assert.equal((await calls(p,'llm')).length,0);
});
test('lost finish response is recovered without clearing the new game again',async t=>{
 const p=await setup(t);await start(p);const fresh=await p.evaluate(()=>structuredClone(window.hostTest.state.save));fresh.pet_id='new';fresh.status.name='Fresh buddy';fresh.status.xp=20;await fault(p,{finishLost:true});await resetDialog(p);await confirmReset(p);
 assert.equal(await p.locator('#resetting').isVisible(),true);
 await p.evaluate(fresh=>{window.hostTest.state.save=fresh;},fresh);
 await p.locator('#resume-reset').click();await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),'20 / 100 XP');assert.equal(await p.locator('#name').innerText(),'Fresh buddy');
});

test('fresh companion and album load revised starter art without paid image calls',async t=>{
 const p=await setup(t);
 await p.locator('#welcome > img').evaluate(img=>img.decode());
 assert.match(await p.locator('#welcome > img').getAttribute('src'),/assets\/starters-v1\//);
 await start(p);
 await p.locator('#pet-image').evaluate(img=>img.decode());
 assert.match(await p.locator('#pet-image').getAttribute('src'),/assets\/starters-v1\/fairy_nature_stage1\.png$/);
 assert.ok(await p.locator('#pet-image').evaluate(img=>img.naturalWidth>=640));
 assert.equal((await calls(p,'image')).length,0);
});


test('care automatically reacts in chat and manual chat still works',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 assert.equal((await calls(p,'llm')).length,1);assert.equal(await p.locator('[data-reaction-state="done"]').count(),1);
 await p.locator('#chat-input').fill('Hello');await p.locator('#chat-form button').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,2);assert.match(await p.locator('#messages').innerText(),/happy to see/);
});
test('a missing startup module shows a recovery button instead of endless Connecting',async t=>{
 const p=await setup(t,{appLoad:true});assert.match(await p.locator('#notice').innerText(),/load/);
 assert.equal(await p.locator('#refresh').isDisabled(),false);
 await p.locator('#refresh').click();await idle(p);assert.equal(await p.locator('#welcome').isVisible(),true);
});
test('encounter art and 2D battle replay use one committed result; skip only changes presentation',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="walk"]').click();await idle(p);
 await p.waitForFunction(()=>document.querySelector('#encounter-enemy').naturalWidth>0);
 assert.match(await p.locator('#encounter-enemy').getAttribute('src'),/dragon_fire/);
 await p.locator('[data-action="battle"]').click();await idle(p);assert.equal(await p.locator('#battle-dialog').isVisible(),true);
 await p.locator('#battle-skip').click();
 assert.equal(await p.locator('#battle-enemy-hp').evaluate(e=>e.value),0);
 assert.equal(await p.locator('#battle-own-hp').evaluate(e=>e.value),6);
 await p.locator('#battle-skip').click();assert.equal(await p.locator('#battle-dialog').isVisible(),false);
 assert.equal((await calls(p,'battle')).length,1);assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 await p.reload();await idle(p);assert.equal(await p.locator('#battle-dialog').isVisible(),false);
});
test('battle supports 360px and reduced motion',async t=>{
 const p=await setup(t);await start(p);await p.setViewportSize({width:360,height:740});await p.emulateMedia({reducedMotion:'reduce'});
 await p.locator('[data-action="walk"]').click();await idle(p);await p.locator('[data-action="battle"]').click();await idle(p);
 assert.equal(await p.locator('#battle-enemy-hp').evaluate(e=>e.value),0);
 assert.equal(await p.locator('#battle-skip').innerText(),'Close');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
 if(process.env.NOTEBUDDY_SCREENSHOT)await p.screenshot({path:process.env.NOTEBUDDY_SCREENSHOT});
 await p.keyboard.press('Escape');assert.equal(await p.locator('#battle-dialog').isVisible(),false);
});

test('removed game explicitly restarts, resumes cleanup and reopens as a new partner',async t=>{
 const p=await setup(t,{erased:true});
 await p.evaluate(()=>{window.hostTest.state.kv={'notebuddy/chat-v1':{_notebuddy_erased:1},'notebuddy/art-v1':{_notebuddy_erased:1}};window.hostTest.state.files={'portraits/old/file.png':'etag'};});
 assert.equal(await p.locator('#removed').isVisible(),true);
 await p.locator('#restart-removed').click();assert.match(await p.locator('#reset-dialog').innerText(),/cannot be restored/);
 await p.locator('#reset-dialog button').first().click();assert.equal((await p.evaluate(()=>window.hostTest.calls.filter(c=>c.method==='reset'&&c.args.action==='begin'))).length,0);
 await p.locator('#restart-removed').click();await fault(p,{delete:true});await confirmReset(p);
 assert.equal(await p.locator('#resetting').isVisible(),true);assert.equal(await p.locator('#game').isVisible(),false);
 await fault(p,{delete:false});await p.locator('#resume-reset').click();await idle(p);
 assert.equal(await p.locator('#welcome').isVisible(),true);assert.equal(await p.locator('#removed').isVisible(),false);await start(p);
 await p.reload();await idle(p);assert.equal(await p.locator('#name').innerText(),'Recovery buddy');
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),[]);
});

test('walk counter recovers locally without issuing actions and caps at five',async t=>{
 const p=await setup(t,{clock:true});await start(p);
 await p.evaluate(()=>{window.hostTest.state.save.status.walk_energy={charges:0,capacity:5,next_in_seconds:2,recharge_seconds:300};});
 await p.locator('#refresh').click();await idle(p);
 assert.match(await p.locator('#walk-energy').innerText(),/0\/5/);
 const before=(await calls(p,'walk')).length;
 await p.clock.fastForward(3000);
 assert.match(await p.locator('#walk-energy').innerText(),/1\/5/);
 await p.clock.fastForward(1800000);
 assert.match(await p.locator('#walk-energy').innerText(),/5\/5/);
 assert.equal((await calls(p,'walk')).length,before);
});

test('care reactions show pending after committed care without blocking another action',async t=>{
 const p=await setup(t,{llmDelay:800});await start(p);
 await p.locator('[data-action="feed"]').click();await p.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 await p.waitForFunction(()=>document.querySelector('#messages').textContent.includes('is reacting'));
 assert.equal(await p.locator('[data-action="play"]').isEnabled(),true);await p.locator('[data-action="play"]').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,2);assert.equal(await p.locator('[data-reaction-state="done"]').count(),2);
 const prompts=await p.evaluate(()=>window.hostTest.calls.filter(x=>x.method==='llm').map(x=>x.prompt));
 assert.match(prompts[0],/"command":"feed"/);assert.match(prompts[1],/"command":"play"/);
});
test('failed care reaction preserves game result and never retries on refresh or reopen',async t=>{
 const p=await setup(t,{llm:true});await start(p);await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');assert.match(await p.locator('#reaction-status').innerText(),/Care is saved/);
 assert.equal(await p.locator('[data-reaction-state="failed"]').count(),1);
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'llm')).length,1);
 await p.reload();await idle(p);assert.equal((await calls(p,'llm')).length,0);
});
test('reaction save retry preserves received text and never calls AI or care again',async t=>{
 const p=await setup(t,{reactionSave:true});await start(p);await p.locator('[data-action="snack"]').click();await idle(p);
 assert.equal(await p.locator('#retry-reaction').isVisible(),true);assert.match(await p.locator('#messages').innerText(),/happy to see/);
 await fault(p,{reactionSave:false});await p.locator('#retry-reaction').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,1);assert.equal((await calls(p,'snack')).length,1);
 await p.reload();await idle(p);assert.equal(await p.locator('[data-reaction-state="done"]').count(),1);
});
test('lost care response produces one reaction only after the same action retry',async t=>{
 const p=await setup(t);await start(p);await fault(p,{lost:true});await p.locator('[data-action="feed"]').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,0);await p.locator('#retry-action').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,1);assert.equal(await p.locator('#xp-label').innerText(),'10 / 100 XP');
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'llm')).length,1);
});
test('reset during a delayed care reaction discards the old response',async t=>{
 const p=await setup(t,{llmDelay:600});await start(p);await p.locator('[data-action="feed"]').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='llm'));await resetDialog(p);await confirmReset(p);await idle(p);
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']),[]);
 assert.equal(await p.locator('[data-reaction-state="done"]').count(),0);
});

test('manual chat remains visible while a care reaction saves concurrently',async t=>{
 const p=await setup(t,{llmDelay:400});await start(p);await p.locator('[data-action="feed"]').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='llm'));await fault(p,{llmDelay:1400});
 await p.locator('#chat-input').fill('Still here');await p.locator('#chat-form button').click();
 await p.waitForFunction(()=>document.querySelector('[data-reaction-state="done"]'));
 assert.match(await p.locator('#messages').innerText(),/Still here/);await idle(p);
 const stored=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/chat-v1']);assert.equal(stored.length,3);assert.equal(stored.filter(x=>x.kind==='reaction').length,1);
});

async function drawSketch(p){
 const box=await p.locator('#art-canvas').boundingBox();
 await p.mouse.move(box.x+box.width*.25,box.y+box.height*.25);await p.mouse.down();
 await p.mouse.move(box.x+box.width*.65,box.y+box.height*.65,{steps:8});await p.mouse.up();
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);
}
async function artwork(p){
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();await drawSketch(p);
}
async function artStart(p){await p.locator('#pet-name').fill('My artwork buddy');await p.locator('#start-form button').click();await idle(p);}

test('artwork first meeting validates source then saves a referenced baby; reopen never regenerates',async t=>{
 const p=await setup(t);await artwork(p);await artStart(p);
 assert.equal((await calls(p,'start')).length,1);assert.equal((await calls(p,'llm')).length,1);
 const generated=await calls(p,'image');assert.equal(generated.length,1);assert.equal(generated[0].options.reference_image_urls,undefined);assert.match(generated[0].options.prompt,/round face and gold ears/);
 assert.match(generated[0].options.prompt,/species fairy and element nature/);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
 const saved=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(saved['isolated-fixture/birth-source'].phase,'done');assert.ok(saved['isolated-fixture/stage-1'].path);
 assert.equal((await calls(p,'home-image')).length,0,'portrait birth never requests home movement');
 const reference='data:image/png;base64,cGVyc29uYWwtcG9ydHJhaXQtcmVmZXJlbmNl';
 await p.evaluate(({path,reference})=>{hostTest.faults.portraits={[path]:reference};},{path:saved['isolated-fixture/stage-1'].path,reference});
 await chooseHome(p);assert.equal((await calls(p,'home-image')).length,1);assert.equal((await calls(p,'home-image'))[0].options.reference_image_urls[0],reference);
 await fault(p,{portraits:{}});
 await p.reload();await idle(p);assert.equal((await calls(p,'image')).length,0);
 assert.match(await p.locator('#image-caption').innerText(),/portrait/i);
});
test('editor defaults to drawing and rejects blank input without AI',async t=>{
 const p=await setup(t);await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 assert.equal(await p.locator('#art-input-mode').inputValue(),'draw');assert.equal(await p.locator('#art-file').isVisible(),false);
 assert.equal(await p.locator('#art-canvas').isVisible(),true);
 await p.locator('#art-use').click();await p.waitForFunction(()=>document.querySelector('#art-editor-error').textContent.includes('clear shape'));
 assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'start')).length,0);
 await p.locator('#art-dialog form button').click();assert.equal((await calls(p,'image')).length,0);
});

// Fixtures contain only synthetic colored shapes, never personal photos.
async function imageFile(p,{mime='image/png',width=1600,height=800,blank=false}={}){
 const data=await p.evaluate(({mime,width,height,blank})=>{
  const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  if(!blank){ctx.fillStyle='#526e51';ctx.fillRect(width/4,height/4,width/2,height/2);}
  return c.toDataURL(mime).split(',')[1];
 },{mime,width,height,blank});
 return {name:'private-reference.'+mime.split('/')[1],mimeType:mime,buffer:Buffer.from(data,'base64')};
}
async function photoEditor(p){
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();await p.locator('#art-input-mode').selectOption('file');
}
async function choosePhoto(p,file){
 await p.locator('#art-file').setInputFiles(file);
 await p.waitForFunction(()=>!document.querySelector('#art-use').disabled);
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);
}
for(const mime of ['image/png','image/jpeg','image/webp'])test(`${mime} reference stays local until Meet and is normalized before one analysis and generation`,async t=>{
 const p=await setup(t,{artSpecies:'mammal',artElement:'random',artFeatures:'a human with black hair and a grey hoodie, cropped torso'});
 await photoEditor(p);assert.equal(await p.locator('#art-use').isDisabled(),true);
 await p.locator('#art-file').setInputFiles(await imageFile(p,{mime}));
 await p.waitForFunction(()=>document.querySelector('#art-file-preview').naturalWidth===1024);
 assert.deepEqual(await p.locator('#art-file-preview').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1024,512]);
 assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'finalize')).length,0);assert.equal((await calls(p,'start')).length,0);
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);
 assert.equal((await calls(p,'llm')).length,0);await artStart(p);
 const checks=await calls(p,'llm');assert.equal(checks.length,1);
 const source=checks[0].messages[0].content.find(x=>x.type==='image');assert.equal(source.mimeType,'image/png');
 assert.deepEqual([...Buffer.from(source.data.split(',')[1],'base64').subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const generated=await calls(p,'image');assert.equal(generated.length,1);
 assert.match(generated[0].options.prompt,/human with black hair/);assert.match(generated[0].options.prompt,/Human references stay human/);
 assert.equal(generated[0].options.reference_image_urls,undefined);assert.equal((await calls(p,'start')).length,1);
 const saved=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(saved['isolated-fixture/birth-source'].phase,'done');assert.match(saved['isolated-fixture/birth-source'].features,/grey hoodie/);
 assert.doesNotMatch(JSON.stringify(saved),/private-reference/);
 await p.reload();await idle(p);assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'image')).length,0);
 assert.equal(await p.locator('#name').innerText(),'My artwork buddy');
});
test('invalid file types, corrupt data, dimensions and blank files fail locally and keep the previous selection',async t=>{
 const p=await setup(t);await artwork(p);const before=await p.locator('#birth-art-choice .art-source-preview').getAttribute('src');
 await p.locator('#choose-art').click();await p.locator('#art-input-mode').selectOption('file');
 const cases=[
  [{name:'spoof.png',mimeType:'image/png',buffer:Buffer.from('<svg/>')},/PNG, JPEG or WebP/],
  [{name:'corrupt.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])},/could not read/],
  [{name:'large.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(12*1024*1024+1)},/12 MiB/],
  [await imageFile(p,{width:31,height:100}),/32 × 32/],
  [await imageFile(p,{width:4001,height:4000}),/16 megapixels/],
  [await imageFile(p,{blank:true,width:64,height:64}),/clear shape/]
 ];
 for(const [file,error] of cases){
  await p.locator('#art-file').setInputFiles(file);
  await p.waitForFunction(()=>document.querySelector('#art-editor-error').textContent.length>0);
  assert.match(await p.locator('#art-editor-error').innerText(),error);assert.equal(await p.locator('#art-use').isDisabled(),true);
  assert.equal(await p.locator('#art-file-preview').isVisible(),false);
 }
 assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'start')).length,0);
 await p.locator('#art-dialog form button').click();
 assert.equal(await p.locator('#birth-art-choice .art-source-preview').getAttribute('src'),before);
 await artStart(p);assert.equal((await calls(p,'image')).length,1);
});
for(const action of ['cancel','change mode'])test(`late image decoding cannot restore an upload after ${action}`,async t=>{
 const p=await setup(t);const file=await imageFile(p);await photoEditor(p);
 await p.evaluate(()=>{
  const decode=window.createImageBitmap;window.createImageBitmap=async(...args)=>{
   await new Promise(resolve=>{window.releaseDecode=resolve;});
   const bitmap=await decode(...args);window.decodeFinished=true;return bitmap;
  };
  const encode=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){
   return encode.call(this,blob=>{callback(blob);window.encodeFinished=true;},...args);
  };
 });
 await p.locator('#art-file').setInputFiles(file);await p.waitForFunction(()=>window.releaseDecode);
 assert.equal(await p.locator('#art-use').isDisabled(),true);
 if(action==='cancel')await p.locator('#art-dialog form button').click();else await p.locator('#art-input-mode').selectOption('draw');
 await p.evaluate(()=>window.releaseDecode());await p.waitForFunction(()=>window.decodeFinished&&window.encodeFinished);
 if(action==='cancel')await p.locator('#choose-art').click();else await p.locator('#art-input-mode').selectOption('file');
 assert.equal(await p.locator('#art-file-preview').isVisible(),false);assert.equal(await p.locator('#art-use').isDisabled(),true);
 assert.equal(await p.locator('#birth-art-choice .art-source-preview').isVisible(),false);
 assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'start')).length,0);
});
test('a replacement photo is reanalyzed after cancelling uncertain traits',async t=>{
 const p=await setup(t,{artConfidence:'uncertain'});await photoEditor(p);await choosePhoto(p,await imageFile(p));
 await p.locator('#pet-name').fill('Photo buddy');await p.locator('#start-form button').click();
 await p.waitForFunction(()=>document.querySelector('#art-traits-dialog').open);await p.locator('#art-traits-dialog button[value=cancel]').click();await idle(p);
 assert.equal((await calls(p,'start')).length,0);
 await fault(p,{artConfidence:'clear',artSpecies:'bird',artFeatures:'a blue bird'});
 await p.locator('#choose-art').click();await choosePhoto(p,await imageFile(p,{width:100,height:200}));await artStart(p);
 assert.equal((await calls(p,'llm')).length,2);assert.equal((await calls(p,'image')).length,1);
 assert.match((await calls(p,'image'))[0].options.prompt,/blue bird/);
 assert.equal((await calls(p,'start'))[0].args.birth_species,'bird');
});
test('photo portrait save failure retries received output without another analysis or generation',async t=>{
 const p=await setup(t,{birthUpload:true});await photoEditor(p);await choosePhoto(p,await imageFile(p));await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/saving is unfinished/);
 await p.locator('#retry-birth').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,1);assert.equal((await calls(p,'image')).length,1);assert.equal((await calls(p,'start')).length,1);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
});
test('photo picker and preview fit the narrow Korean interface',async t=>{
 const p=await setup(t);await p.setViewportSize({width:360,height:640});await p.locator('#language').selectOption('ko');await idle(p);await photoEditor(p);
 await p.locator('#art-file').setInputFiles(await imageFile(p,{width:800,height:1600}));
 await p.waitForFunction(()=>document.querySelector('#art-file-preview').naturalHeight===1024);
 assert.match(await p.locator('#art-file-help').innerText(),/사진|이미지/);
 assert.equal(await p.evaluate(()=>{const d=document.querySelector('#art-dialog');return d.scrollWidth<=d.clientWidth&&d.getBoundingClientRect().height<=window.innerHeight;}),true);
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);await artStart(p);
 assert.equal((await calls(p,'image')).length,1);
});
test('drawing with undo produces a source and works in a narrow Korean UI',async t=>{
 const p=await setup(t);await p.setViewportSize({width:360,height:800});await p.locator('#language').selectOption('ko');await idle(p);
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 const box=await p.locator('#art-canvas').boundingBox();await p.mouse.move(box.x+30,box.y+30);await p.mouse.down();await p.mouse.move(box.x+100,box.y+100);await p.mouse.up();
 await p.locator('#art-undo').click();await p.locator('#art-use').click();await p.waitForFunction(()=>document.querySelector('#art-editor-error').textContent.includes('참고할 형태'));assert.match(await p.locator('#art-editor-error').innerText(),/참고할 형태/);
 await p.mouse.move(box.x+40,box.y+50);await p.mouse.down();await p.mouse.move(box.x+130,box.y+130);await p.mouse.up();
 assert.equal(await p.evaluate(()=>document.querySelector('#art-dialog').scrollWidth<=document.querySelector('#art-dialog').clientWidth),true);
 await p.locator('#art-use').click();await p.waitForFunction(()=>!document.querySelector('#art-dialog').open);await artStart(p);
 assert.equal((await calls(p,'image')).length,1);
});
test('AI refusal and unclear artwork do not create a pet or send a generation request',async t=>{
 const p=await setup(t,{artDecision:'reject'});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-status').innerText(),/could not use this image/i);assert.equal((await calls(p,'start')).length,0);assert.equal((await calls(p,'image')).length,0);
 await fault(p,{artDecision:'unclear'});await artStart(p);assert.match(await p.locator('#birth-status').innerText(),/clear shape/);assert.equal((await calls(p,'start')).length,0);
});
test('vision outage and malformed assessment do not blame the artwork or silently allow it',async t=>{
 const p=await setup(t,{llm:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-status').innerText(),/not a rejection/);assert.equal((await calls(p,'start')).length,0);
 await fault(p,{llm:false,artMalformed:true});await artStart(p);assert.match(await p.locator('#birth-status').innerText(),/not a rejection/);assert.equal((await calls(p,'start')).length,0);
});
test('generation outage keeps species and source; refresh never retries and explicit retry does not reroll',async t=>{
 const p=await setup(t,{image:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/not finish generating/);
 const before=await p.evaluate(()=>({pet:window.hostTest.state.save.pet_id,species:window.hostTest.state.save.species_key,element:window.hostTest.state.save.element_key}));
 assert.equal((await calls(p,'start')).length,1);assert.equal((await calls(p,'image')).length,1);
 await p.locator('#refresh').click();await idle(p);assert.equal((await calls(p,'image')).length,1);
 await fault(p,{image:false});await p.locator('#retry-birth').click();await idle(p);
 assert.equal((await calls(p,'image')).length,2);assert.equal((await calls(p,'start')).length,1);assert.equal((await calls(p,'llm')).length,1);
 assert.deepEqual(await p.evaluate(()=>({pet:window.hostTest.state.save.pet_id,species:window.hostTest.state.save.species_key,element:window.hostTest.state.save.element_key})),before);
});
test('generation refusal asks for another source; retry does not resend refused artwork',async t=>{
 const p=await setup(t,{imageRefusal:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/could not use this image/i);
 await p.locator('#retry-birth').click();await idle(p);assert.equal((await calls(p,'image')).length,1);
 await p.locator('#default-birth').click();await idle(p);assert.equal(await p.locator('#birth-recovery').isVisible(),false);assert.equal((await calls(p,'start')).length,1);
});
test('received birth portrait retries only saving after upload failure',async t=>{
 const p=await setup(t,{birthUpload:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/saving is unfinished/);
 assert.match(await p.locator('#retry-birth').innerText(),/saving/);
 await p.locator('#retry-birth').click();await idle(p);assert.equal((await calls(p,'image')).length,1);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
});
test('failed source upload recovers without rechecking or creating another pet',async t=>{
 const p=await setup(t,{upload:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/reference/);assert.equal((await calls(p,'image')).length,0);
 await p.locator('#retry-birth').click();await idle(p);assert.equal((await calls(p,'image')).length,1);assert.equal((await calls(p,'llm')).length,1);assert.equal((await calls(p,'start')).length,1);
});
test('lost birth action reply keeps the same action and artwork until explicit retry',async t=>{
 const p=await setup(t,{lost:true});await artwork(p);await artStart(p);
 assert.equal((await calls(p,'image')).length,0);await p.locator('#retry-action').click();await idle(p);
 const starts=await calls(p,'start');assert.equal(starts.length,2);assert.equal(starts[0].args.request_id,starts[1].args.request_id);assert.equal((await calls(p,'image')).length,1);
});

test('unfinished artwork resumes after reopen without automatically spending allowance',async t=>{
 const p=await setup(t,{image:true});await artwork(p);await artStart(p);await p.reload();await idle(p);
 assert.equal(await p.locator('#birth-recovery').isVisible(),true);assert.equal((await calls(p,'image')).length,0);
 assert.equal(await p.locator('[data-action="feed"]').isDisabled(),true);
 await fault(p,{image:false});await p.locator('#retry-birth').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);assert.equal((await calls(p,'start')).length,0);
 assert.equal(await p.locator('[data-action="feed"]').isEnabled(),true);
});
test('birth metadata save failure before source upload can be recovered after reopen',async t=>{
 const p=await setup(t,{save:true});await artwork(p);await artStart(p);
 assert.equal((await calls(p,'image')).length,0);await p.reload();await idle(p);await fault(p,{save:false});
 await p.locator('#setup-birth').click();await drawSketch(p);
 await p.locator('#retry-birth').click();await idle(p);assert.equal((await calls(p,'start')).length,0);assert.equal((await calls(p,'image')).length,1);
});
test('replacement during birth generation never applies the old artwork to the new pet',async t=>{
 const p=await setup(t,{imageDelay:400});await artwork(p);
 await p.locator('#pet-name').fill('Original');await p.locator('#start-form button').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='image'));
 await p.evaluate(()=>{window.hostTest.state.save.pet_id='replacement';});await idle(p);
 const saved=await p.evaluate(()=>window.hostTest.state.kv['notebuddy/art-v1']);
 assert.equal(saved?.['replacement/stage-1'],undefined);assert.equal(saved?.['isolated-fixture/stage-1'],undefined);
 assert.match(await p.locator('#notice').innerText(),/changed/);
});

test('lost birth index acknowledgement retains a save-only retry even after refresh',async t=>{
 const p=await setup(t,{lostBirthSave:true});await artwork(p);await artStart(p);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/saving is unfinished/);
 assert.equal(await p.locator('#clean-portraits').isDisabled(),true);
 await p.locator('#refresh').click();await idle(p);assert.equal(await p.locator('#retry-birth').isVisible(),true);
 await p.locator('#retry-birth').click();await idle(p);
 assert.equal((await calls(p,'image')).length,1);assert.equal(await p.locator('#birth-recovery').isVisible(),false);
});


test('reset returns to empty welcome and drawing can be chosen before a new birth',async t=>{
 const p=await setup(t);await start(p);await resetDialog(p);
 assert.equal(await p.locator('#reset-name').count(),0);await confirmReset(p);
 assert.equal(await p.locator('#welcome').isVisible(),true);
 assert.equal(await p.locator('#pet-name').inputValue(),'');
 assert.equal(await p.evaluate(()=>window.hostTest.state.save),null);
 await p.reload();await idle(p);assert.equal(await p.locator('#welcome').isVisible(),true);
 await artwork(p);await artStart(p);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
 assert.equal((await calls(p,'image')).length,1);
});


test('drawing birth hides all game portraits while generating, then reveals the saved portrait',async t=>{
 const p=await setup(t,{imageDelay:1200});await artwork(p);
 await p.locator('#pet-name').fill('Waiting buddy');await p.locator('#start-form button').click();
 await p.waitForFunction(()=>window.hostTest.calls.some(x=>x.method==='image'));
 assert.equal(await p.locator('#birth-recovery').isVisible(),true);
 assert.equal(await p.locator('#game').isVisible(),false);
 assert.equal(await p.locator('#welcome').isVisible(),false);
 assert.equal(await p.locator('#pet-image').isVisible(),false);
 assert.equal(await p.locator('#birth-recovery .birth-buttons').isVisible(),false);
 assert.match(await p.locator('#birth-recovery-status').innerText(),/Bringing/);
 await idle(p);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
 assert.equal(await p.locator('#pet-image').isVisible(),true);
 assert.equal((await calls(p,'image')).length,1);
});

test('failed drawing stays unrevealed after reload until an explicit default choice',async t=>{
 const p=await setup(t,{image:true});await artwork(p);await artStart(p);
 assert.equal(await p.locator('#game').isVisible(),false);
 await p.reload();await idle(p);
 assert.equal(await p.locator('#game').isVisible(),false);
 assert.equal(await p.locator('#birth-recovery').isVisible(),true);
 assert.equal((await calls(p,'image')).length,0);
 await p.locator('#default-birth').click();await idle(p);
 assert.equal(await p.locator('#game').isVisible(),true);
 assert.equal(await p.locator('#birth-recovery').isVisible(),false);
 assert.equal((await calls(p,'image')).length,0);
});


async function quietStoryWalk(p){
 await fault(p,{walkOutcome:'quiet'});
 await p.evaluate(()=>{let id='';for(let i=0;i<20;i++){id='story'+i;let hash=0;for(const c of `nb2:${window.hostTest.state.sequence}:${id}`)hash=(Math.imul(hash,31)+c.charCodeAt(0))|0;if(!(hash&1))break;}crypto.randomUUID=()=>id;});
 await p.locator('[data-action="walk"]').click();
 await p.waitForFunction(()=>document.querySelector('#story-choices button'));
}
test('AI walk dialog saves its ending and completed stories stay off the home screen',async t=>{
 const p=await setup(t);await start(p);await quietStoryWalk(p);
 assert.equal(await p.locator('#story-choices button').count(),2);
 assert.equal(await p.locator('[data-action="walk"]').isDisabled(),false);
 const xp=await p.locator('#xp-label').innerText();
 await p.locator('#story-choices button').first().click();await p.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
 assert.equal(await p.locator('#xp-label').innerText(),xp);assert.equal((await calls(p,'walk')).length,1);assert.equal((await calls(p,'llm')).length,1);
 await p.locator('#story-done').click();await p.reload();await idle(p);assert.equal(await p.locator('#walk-story').isVisible(),false);assert.equal(await p.locator('#story-resume').isVisible(),false);assert.equal((await calls(p,'llm')).length,0);
});
test('walk story AI failure has a playable fallback; reset clears it',async t=>{
 const p=await setup(t,{llm:true});await start(p);await quietStoryWalk(p);
 assert.match(await p.locator('#story-status').innerText(),/prepared story/);
 await p.locator('#story-choices button').last().click();await p.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
 await p.locator('#story-done').click();await resetDialog(p);await confirmReset(p);
 assert.deepEqual(await p.evaluate(()=>window.hostTest.state.kv['notebuddy/walk-story-v1']),{});
 assert.equal(await p.locator('#walk-story').isVisible(),false);
});


test('snake drawing determines traits and preserves the legless body in its prompt',async t=>{
 const p=await setup(t,{artSpecies:'reptile',artElement:'fire',artFeatures:'long green snake, no legs, blue eyes'});await artwork(p);await artStart(p);
 const born=(await calls(p,'start'))[0].args;assert.equal(born.birth_species,'reptile');assert.equal(born.birth_element,'fire');
 assert.equal(await p.evaluate(()=>window.hostTest.state.save.species_key),'reptile');
 const prompt=(await calls(p,'image'))[0].options.prompt;assert.match(prompt,/long green snake, no legs/);assert.match(prompt,/snake stays legless/);
});
test('ambiguous classification waits for confirmation; cancel never creates a pet',async t=>{
 const p=await setup(t,{artConfidence:'uncertain',artSpecies:'monster',artElement:'random'});await artwork(p);await p.locator('#pet-name').fill('Sketch');await p.locator('#start-form button').click();
 await p.waitForFunction(()=>document.querySelector('#art-traits-dialog').open);
 assert.equal((await calls(p,'start')).length,0);
 await p.locator('#art-traits-dialog button[value=cancel]').click();await idle(p);assert.equal(await p.locator('#welcome').isVisible(),true);assert.equal((await calls(p,'image')).length,0);
 await p.locator('#start-form button').click();await p.waitForFunction(()=>document.querySelector('#art-traits-dialog').open);
 await p.locator('#art-traits-dialog button[value=accept]').click();await idle(p);
 assert.equal((await calls(p,'llm')).length,1);assert.equal((await calls(p,'start')).length,1);assert.equal((await calls(p,'start'))[0].args.birth_species,'monster');
});


test('legacy six-room result visits distinct rooms and pauses without spending again',async t=>{
 const p=await setup(t,{walkOutcome:'quiet',multiRooms:true});await start(p);
 await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.locator('[data-dungeon="hellgate"]').click();await p.locator('#dungeon-enter').click();await idle(p);
 await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='ready');
 await p.locator('#dungeon-pause').click();
 const paused=await p.locator('#dungeon-map').getAttribute('data-camera');
 await p.waitForFunction(()=>document.querySelector('#dungeon-phase').textContent.includes('paused'));
 assert.equal(await p.locator('#dungeon-map').getAttribute('data-camera'),paused);
 await p.locator('#dungeon-pause').click();await p.locator('#dungeon-fast').click();
 for(let room=2;room<=6;room++){
   await p.waitForFunction(n=>document.querySelector('#dungeon-map').dataset.room===String(n),room,{timeout:15000});
   assert.match(await p.locator('#dungeon-room').innerText(),new RegExp('Room '+room+' / 6'));
 }
 await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.phase==='finished');
 assert.match(await p.locator('#dungeon-result').innerText(),/10 coins/);
 assert.equal((await calls(p,'explore_hellgate')).length,1);
 await p.locator('#dungeon-close').click();await p.reload();await idle(p);
 assert.equal(await p.locator('#dungeon-section').isVisible(),true);assert.equal(await p.locator('#dungeon-replay').count(),0);
 assert.equal((await calls(p,'explore_hellgate')).length,0);
 assert.equal((await calls(p,'image')).length,0);
});

test('dungeon uses the saved home sheet with identical directional frames and no extra AI',async t=>{
 const p=await setup(t,{walkOutcome:'quiet'});await start(p);await chooseHome(p);
 await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.locator('[data-dungeon="hellgate"]').click();await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.sprite==='home');
 const used=await calls(p,'home-image');assert.equal(used.length,1);
 const result=await p.evaluate(async()=>{
  const {readHomeSprite,drawHomeSprite}=await import('./home-sprite.mjs'),{drawAvatar}=await import('./dungeon-avatar.mjs');
  const sheet=document.createElement('canvas');sheet.width=sheet.height=256;const a=sheet.getContext('2d');
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){a.fillStyle=`rgb(${40+row*55},${40+col*55},90)`;a.fillRect(col*64+18,row*64+16,24,32);}
  const parsed=await readHomeSprite(await new Promise(r=>sheet.toBlob(r))),canvas=document.createElement('canvas');canvas.width=canvas.height=96;const c=canvas.getContext('2d');const checks=[],poses=new Set();
  for(const direction of ['down','left','right','up'])for(const frame of [0,1,2,3]){
   c.clearRect(0,0,96,96);drawHomeSprite(c,parsed,48,90,{direction,frame:[0,1,2,1][frame]});const home=canvas.toDataURL();poses.add(home);
   c.clearRect(0,0,96,96);drawAvatar(c,48,90,{sprite:parsed,direction,frame,walking:true,scale:1});checks.push(home===canvas.toDataURL());
  }
  return {checks,poses:poses.size};
 });
 assert(result.checks.every(Boolean));assert.equal(result.poses,12);
 await p.locator('#dungeon-close').click();await p.locator('[data-dungeon="hellgate"]').click();await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.sprite==='home');
 assert.equal((await calls(p,'home-image')).length,1);assert.equal((await calls(p,'explore_hellgate')).length,0);
});

test('legacy dungeon portrait fallback preserves distinct silhouettes and animates without AI',async t=>{
 const p=await setup(t);await start(p);
 const result=await p.evaluate(async()=>{
  const {drawAvatar}=await import('./dungeon-avatar.mjs');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const c=canvas.getContext('2d');
  const portrait=document.createElement('canvas');portrait.width=portrait.height=64;const a=portrait.getContext('2d');
  a.fillStyle='#af4e80';a.fillRect(8,8,24,48);a.fillStyle='#ffe7a0';a.fillRect(9,12,4,4);
  const draw=(direction,frame)=>{c.clearRect(0,0,96,96);drawAvatar(c,48,90,{portrait,direction,frame});return canvas.toDataURL();};
  const first=draw('down',0),step=draw('down',1),left=draw('left',0),right=draw('right',0);
  const opaque=turn=>{c.clearRect(0,0,96,96);drawAvatar(c,48,90,{portrait,direction:'right',turn});const d=c.getImageData(0,0,96,70).data;let min=96,max=-1;for(let i=3;i<d.length;i+=4)if(d[i]>200){const x=(i>>2)%96;min=Math.min(min,x);max=Math.max(max,x);}return max-min+1;};
  const full=opaque(1),edge=opaque(.25);
  const shade=dir=>{c.clearRect(0,0,96,96);drawAvatar(c,48,90,{portrait,direction:dir});const d=c.getImageData(0,0,96,96).data;const at=(x,y)=>d[(y*96+x)*4];const xs=[];for(let x=0;x<96;x++)if(d[(60*96+x)*4+3]>200)xs.push(x);return [at(xs[0],60),at(xs.at(-1),60)];};
  const [lightLeft,darkRight]=shade('right'),[mirroredLeft,mirroredRight]=shade('left');
  a.clearRect(0,0,64,64);a.fillStyle='#af4e80';a.fillRect(8,32,48,24);a.fillStyle='#ffe7a0';a.fillRect(9,36,4,4);
  return {first,second:draw('down',0),step,left,right,full,edge,lightLeft,darkRight,mirroredLeft,mirroredRight};
 });
 assert.notEqual(result.first,result.second);assert.notEqual(result.first,result.step);assert.notEqual(result.left,result.right);
 assert.ok(result.edge<result.full*.5,`mid-turn ${result.edge}px vs ${result.full}px`);
 assert.ok(result.lightLeft>result.darkRight&&result.mirroredLeft>result.mirroredRight,'light stays on the world left when mirrored');
 assert.equal((await calls(p,'image')).length,0);
});

test('dungeon scene discards late, failed and cleared portrait loads instead of reusing the last companion',async t=>{
 const p=await setup(t);
 const result=await p.evaluate(async()=>{
  const {createDungeonScene}=await import('./dungeon-scene.mjs');
  const c=document.createElement('canvas');c.style.width='800px';c.style.height='500px';document.body.append(c);
  const img=new Image(),scene=createDungeonScene(c,img),art=document.createElement('canvas');art.width=art.height=64;
  const a=art.getContext('2d');a.fillStyle='#bb4080';a.fillRect(8,8,24,48);const first=art.toDataURL();
  a.clearRect(0,0,64,64);a.fillStyle='#bb4080';a.fillRect(8,32,48,24);const second=art.toDataURL();
  img.src=second;await scene.load('hellgate');scene.draw();const expected=c.toDataURL();
  const original=window.fetch,caches=[];let release,entered;const waiting=new Promise(r=>entered=r);
  window.fetch=async(url,options)=>{caches.push(options?.cache);if(url===first){entered();await new Promise(r=>release=r);}return original(url,options);};
  try{
   img.src=first;const older=scene.load('hellgate');await waiting;
   const blank=()=>!c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v);
   scene.draw();const blankDuringLoad=blank();
   img.src=second;await scene.load('hellgate');scene.draw();release();const ignored=await older;scene.draw();const afterLate=c.toDataURL();
   img.src='data:image/png;base64,invalid';const fallback=await scene.load('hellgate',{fallback:second});scene.draw();const afterFallback=c.toDataURL();
   const failed=await scene.load('hellgate');scene.draw();const blankAfterFailure=blank();
   img.src=first;const pending=scene.load('hellgate');await Promise.resolve();scene.clear();release();const cleared=await pending;scene.draw();
   return {expected,afterLate,afterFallback,ignored,fallback,failed,cleared,blankDuringLoad,blankAfterFailure,blankAfterClear:blank(),bypassesCache:caches.length>0&&caches.every(v=>v==='no-store')};
  }finally{window.fetch=original;c.remove();}
 });
 assert.equal(result.bypassesCache,true);
 assert.equal(result.afterLate,result.expected);assert.equal(result.afterFallback,result.expected);
 assert.equal(result.fallback,true);assert.equal(result.ignored,false);assert.equal(result.failed,false);assert.equal(result.cleared,false);
 assert.ok(result.blankDuringLoad&&result.blankAfterFailure&&result.blankAfterClear);
});

test('changing companion or portrait refreshes the dungeon silhouette without gameplay or AI calls',async t=>{
 const p=await setup(t,{walkOutcome:'quiet'});await start(p);await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.emulateMedia({reducedMotion:'reduce'});
 const assignPortrait=async(changed,wide)=>p.evaluate(({changed,wide})=>{
  const h=window.hostTest;if(changed){h.state.save.pet_id='replacement';h.state.save.status.name='New companion';}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='#b1478c';c.fillRect(8,wide?32:8,wide?48:24,wide?24:48);
  const owner=h.state.save.pet_id,source=`portraits/${owner}/${wide?'wide':'tall'}.png`,pixel=`portraits/${owner}/pixel-${wide?'wide':'tall'}.png`;
  h.faults.portraits={...h.faults.portraits,[source]:canvas.toDataURL(),[pixel]:canvas.toDataURL()};
  h.state.kv['notebuddy/art-v1']={...h.state.kv['notebuddy/art-v1'],[`${owner}/stage-1`]:{path:source},[`${owner}/pixel-stage-1`]:{path:pixel,format:'pixel-v1',source_path:source}};
 },{changed,wide});
 const preview=async()=>{await p.locator('#refresh').click();await idle(p);await p.locator('[data-dungeon="hellgate"]').click();await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='ready');return p.locator('#dungeon-map').evaluate(c=>c.toDataURL());};
 await assignPortrait(false,false);const first=await preview();await p.locator('#dungeon-close').click();
 const before=(await calls(p,'image')).length;
 await assignPortrait(true,true);const second=await preview();assert.notEqual(first,second);
 assert.equal(await p.locator('#dungeon-explorer').getAttribute('alt'),'New companion');await p.locator('#dungeon-close').click();
 await assignPortrait(false,false);const replaced=await preview();assert.equal(replaced,first);
 assert.equal((await calls(p,'explore_hellgate')).length,0);assert.equal((await calls(p,'image')).length,before);
});


test('paid checkpoint stops, resumes after reload and accepts an explicit route before next paid stage',async t=>{
 const p=await setup(t,{walkOutcome:'quiet',stageChoices:true,collectionReward:'ember-horns'});await start(p);await p.locator('[data-action="walk"]').click();await idle(p);await finishWalk(p);
 await p.locator('[data-dungeon="hellgate"]').click();await p.locator('#dungeon-enter').click();await idle(p);
 await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.phase==='choice',null,{timeout:20000});
 const camera=await p.locator('#dungeon-map').getAttribute('data-camera');
 assert.equal(await p.locator('#dungeon-choice').isVisible(),true);assert.equal((await calls(p,'dungeon_safe')).length,0);
 await p.waitForTimeout(300);assert.equal(await p.locator('#dungeon-map').getAttribute('data-camera'),camera);
 if(process.env.ANNA_STAGE_CAPTURE)await p.locator('#dungeon-dialog').screenshot({path:process.env.ANNA_STAGE_CAPTURE});
 await p.reload();await idle(p);await p.emulateMedia({reducedMotion:'reduce'});
 await p.locator('[data-dungeon="hellgate"]').click();assert.equal(await p.locator('#dungeon-choice').isVisible(),true);
 assert.equal((await calls(p,'explore_hellgate')).length,0);
 await p.locator('#dungeon-safe').click();await idle(p);
 assert.equal((await calls(p,'dungeon_safe')).length,1);assert.match(await p.locator('#dungeon-enter').innerText(),/Next stage/);
 assert.equal((await calls(p,'explore_hellgate')).length,0);
 await p.locator('#dungeon-enter').click();await idle(p);assert.equal(await p.locator('#dungeon-choice').isVisible(),true);
 assert.match(await p.locator('#dungeon-choice-title').innerText(),/trapped/);
 await p.setViewportSize({width:360,height:780});
 const bounds=await p.locator('#dungeon-choice').boundingBox();assert.ok(bounds.width<=360);
 assert.equal(await p.locator('#dungeon-risk').isVisible(),true);
 if(process.env.ANNA_STAGE_CAPTURE)await p.locator('#dungeon-dialog').screenshot({path:process.env.ANNA_STAGE_CAPTURE.replace('.png','-mobile.png')});
 await p.locator('#dungeon-risk').click();await idle(p);assert.equal((await calls(p,'dungeon_risk')).length,1);
 await p.locator('#dungeon-enter').click();await idle(p);await p.locator('#dungeon-safe').click();await idle(p);
 assert.match(await p.locator('#dungeon-result').innerText(),/Collected: Ember Horns/);
 await p.locator('#dungeon-close').click();await p.locator('#open-inventory').click();assert.equal(await p.locator('[data-item="ember-horns"][data-owned="true"]').count(),1);
});

test('expansion art loads distinct previews and transparent three-pose bosses without game or AI requests',async t=>{
 const p=await setup(t);await start(p);
 const before=await p.evaluate(()=>({state:JSON.stringify(window.hostTest.state),calls:window.hostTest.calls.length}));
 const result=await p.evaluate(async()=>{
  const {paintDungeon,createDungeonScene,WALK_MS,ROUND_MS}=await import('./dungeon-scene.mjs');
  const {BOSS_ART}=await import('./dungeon-enemies.mjs');
  const c=document.createElement('canvas');c.style.cssText='width:900px;height:540px';document.body.append(c);
  const source=document.createElement('canvas');source.width=source.height=64;source.getContext('2d').fillRect(16,16,32,32);
  const explorer=new Image();explorer.src=source.toDataURL();const scene=createDungeonScene(c,explorer),rows=[];
  const run={outcome:'win',max_hp_me:20,max_hp_enemy:20,hp_me:10,hp_enemy:0,turns:[{hp_me:18,hp_enemy:12}]};
  try{for(const region of ['sunkenpalace','clockworkcity']){
   await paintDungeon(c,region);const preview=c.toDataURL(),previewReady=c.dataset.art;
   const ready=await scene.load(region),frames=[.1,.5,.8].map(beat=>{scene.draw({run,elapsed:WALK_MS+ROUND_MS*beat});return c.toDataURL();});
   const spec=BOSS_ART[region],img=new Image();img.src=new URL(`./assets/dungeons-v2/${spec.file}.png`,location.href);await img.decode();
   const atlas=document.createElement('canvas');atlas.width=img.width;atlas.height=img.height;const ctx=atlas.getContext('2d');ctx.drawImage(img,0,0);
   const w=img.width/3,h=img.height/2,cells=[];
   for(let column=0;column<3;column++){
    const data=ctx.getImageData(column*w,spec.row*h,w,h).data;let solid=0,gutter=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=data[(y*w+x)*4+3];if(a>200)solid++;if((x<12||x>=w-12||y<12||y>=h-12)&&a>32)gutter++;}
    cells.push({solid,gutter});
   }
   rows.push({region,previewReady,preview,ready,frames,cells});
  }}finally{c.remove();}
  return rows;
 });
 assert.notEqual(result[0].preview,result[1].preview);
 for(const r of result){assert.equal(r.previewReady,'ready');assert.equal(r.ready,true);assert.equal(new Set(r.frames).size,3);for(const cell of r.cells){assert.ok(cell.solid>1000);assert.equal(cell.gutter,0,'Boss stays inside its transparent cell');}}
 assert.deepEqual(await p.evaluate(()=>({state:JSON.stringify(window.hostTest.state),calls:window.hostTest.calls.length})),before);
});

test('enemy silhouettes are distinct in monochrome and animate independently of the pet rig',async t=>{
 const p=await setup(t);
 const result=await p.evaluate(async()=>{
  const {drawEnemy,ENEMY_KINDS}=await import('./dungeon-enemies.mjs');
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=150;const c=canvas.getContext('2d');
  return ENEMY_KINDS.map(kind=>{
   const frames=[0,150].map(elapsed=>{c.clearRect(0,0,160,150);drawEnemy(c,80,130,{kind,elapsed});const data=c.getImageData(0,0,160,150).data;return Array.from(data).filter((v,i)=>i%4===3).map(v=>v?1:0).join('');});
   return {kind,frames};
  });
 });
 assert.equal(new Set(result.map(r=>r.frames[0])).size,result.length);assert.equal(result.length,4);
 for(const r of result)assert.notEqual(r.frames[0],r.frames[1],r.kind+' animates');
});

test('walk modal closes with Escape, resumes without AI or XP, and restores a pending choice after reload',async t=>{
 const p=await setup(t);await start(p);await quietStoryWalk(p);
 assert.equal(await p.locator('#walk-story').evaluate(e=>e.tagName),'DIALOG');
 assert.equal(await p.locator('#walk-story').isVisible(),true);
 const xp=await p.locator('#xp-label').innerText();
 await p.keyboard.press('Escape');assert.equal(await p.locator('#walk-story').isVisible(),false);
 assert.equal(await p.locator('#story-resume').isVisible(),true);
 await p.locator('#story-resume').click();assert.equal(await p.locator('#walk-story').isVisible(),true);
 assert.equal((await calls(p,'llm')).length,1);assert.equal((await calls(p,'walk')).length,1);
 await p.reload();await idle(p);assert.equal(await p.locator('#walk-story').isVisible(),false);await p.locator('[data-action="walk"]').click();assert.equal(await p.locator('#walk-story').isVisible(),true);
 assert.equal((await calls(p,'llm')).length,0);assert.equal((await calls(p,'walk')).length,0);
 await p.setViewportSize({width:360,height:780});
 const size=await p.locator('#walk-story').boundingBox();assert.ok(size.width<=360&&size.height<=780);
 await p.locator('#story-choices button').first().click();await p.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
 assert.equal(await p.locator('#xp-label').innerText(),xp);
 await p.locator('#story-done').click();assert.equal(await p.locator('#story-resume').isVisible(),false);
});

test('mobile puts care before chat and keeps completed adventure history off the home screen',async t=>{
 const p=await setup(t);await start(p);await p.setViewportSize({width:360,height:780});
 const order=await p.evaluate(()=>['.pet-card','.care-card','.chat-card'].map(s=>document.querySelector(s).getBoundingClientRect().top));
 assert.ok(order[0]<order[1]&&order[1]<order[2]);assert.equal(await p.locator('#dungeon-replay').count(),0);
 assert.equal(await p.locator('#dungeon-section').isVisible(),true);assert.equal(await p.locator('#walk-story').isVisible(),false);
 const width=await p.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(width.scroll<=width.client);
});

test('XP walk waits for a choice, stays closed on reload and collects once in the modal',async t=>{
 const p=await setup(t,{walkOutcome:'xp',walkDiscovery:false,delay:100});await start(p);
 const before=await p.locator('#xp-label').innerText();await p.locator('[data-action="walk"]').click();
 assert.equal(await p.locator('#walk-story').isVisible(),true);await idle(p);
 assert.equal(await p.locator('#xp-label').innerText(),before);assert.equal(await p.locator('#story-choices button').count(),2);
 await p.reload();await idle(p);assert.equal(await p.locator('#walk-story').isVisible(),false);
 await p.locator('[data-action="walk"]').click();assert.equal((await calls(p,'walk')).length,0);
 await p.locator('#story-choices button').first().click();await idle(p);assert.equal(await p.locator('#xp-label').innerText(),'20 / 100 XP');
 assert.equal((await calls(p,'walk_collect')).length,1);await p.locator('#story-done').click();
});
test('XP can be declined and dungeon discovery offers a modal preview without entering',async t=>{
 const p=await setup(t,{walkOutcome:'xp'});await start(p);await p.locator('[data-action="walk"]').click();await idle(p);
 await p.locator('#story-choices button').last().click();await idle(p);assert.equal(await p.locator('#xp-label').innerText(),'0 / 100 XP');
 assert.equal(await p.locator('#walk-discovery').isVisible(),true);await p.locator('#walk-dungeon').click();
 assert.equal(await p.locator('#walk-story').isVisible(),false);assert.equal(await p.locator('#dungeon-dialog').isVisible(),true);
 assert.equal((await calls(p,'explore_hellgate')).length,0);
});
test('encounters never open on login, resume without another walk and battle in the same modal',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="walk"]').click();await idle(p);
 await p.reload();await idle(p);assert.equal(await p.locator('#walk-story').isVisible(),false);
 await p.locator('[data-action="walk"]').click();assert.equal((await calls(p,'walk')).length,0);
 assert.equal(await p.locator('#walk-story #encounter').isVisible(),true);
 await p.locator('[data-action="battle"]').click();await idle(p);
 assert.equal(await p.locator('dialog[open]').count(),1);assert.equal(await p.locator('#walk-story #battle-dialog').isVisible(),true);
});
test('lost walk and choice responses retry inside the modal with the same request ID',async t=>{
 const p=await setup(t,{walkOutcome:'xp'});await start(p);await fault(p,{lost:true});
 await p.locator('[data-action="walk"]').click();await idle(p);assert.equal(await p.locator('#walk-retry').isVisible(),true);
 await p.locator('#walk-retry').click();await idle(p);
 const walks=await calls(p,'walk');assert.equal(walks.length,2);assert.equal(walks[0].args.request_id,walks[1].args.request_id);
 await fault(p,{lost:true});await p.locator('#story-choices button').first().click();await idle(p);
 await p.locator('#walk-retry').click();await idle(p);assert.equal(await p.locator('#xp-label').innerText(),'20 / 100 XP');
 const choices=await calls(p,'walk_collect');assert.equal(choices.length,2);assert.equal(choices[0].args.request_id,choices[1].args.request_id);
});

test('closing while battle is pending does not reopen and a later walk hides old combat',async t=>{
 const p=await setup(t);await start(p);await p.locator('[data-action="walk"]').click();await idle(p);
 await fault(p,{delay:300});await p.locator('[data-action="battle"]').click();await p.keyboard.press('Escape');await idle(p);
 assert.equal(await p.locator('#walk-story').isVisible(),false);
 await fault(p,{walkOutcome:'xp',delay:0});await p.locator('[data-action="walk"]').click();await idle(p);
 assert.equal(await p.locator('#battle-dialog').isVisible(),false);assert.equal(await p.locator('#story-choices button').count(),2);
});

test('realistic APS key order lets a generated walk choice reach its ending without reload',async t=>{
 const p=await setup(t,{reorderStorage:true});await start(p);await quietStoryWalk(p);
 await p.locator('#story-choices button').first().click();await p.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
 assert.equal(await p.locator('#story-choices button').count(),0);
 assert.doesNotMatch(await p.locator('#story-status').innerText(),/save|refresh/i);
 assert.equal((await calls(p,'walk')).length,1);assert.equal((await calls(p,'llm')).length,1);
 await p.locator('#story-done').click();await p.reload();await idle(p);
 assert.equal(await p.locator('#walk-story').isVisible(),false);assert.equal(await p.locator('#story-resume').isVisible(),false);
});

test('cumulative walk choices commit to game state, recover on reload and never auto-open',async t=>{
 const p=await setup(t,{walkOutcome:'quiet',journey:true});await start(p);
 await p.locator('[data-action="walk"]').click();
 await p.waitForFunction(()=>document.querySelectorAll('#story-choices button').length===2);
 assert.match(await p.locator('#story-choices').innerText(),/preparations/i);
 await p.locator('#story-choices button').first().click();
 await p.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
 assert.match(await p.locator('#story-ending').innerText(),/Closeness \+3/);
 assert.equal((await calls(p,'walk_collect')).length,1);
 const intimacy=await p.evaluate(()=>window.hostTest.state.save.status.intimacy);
 await p.reload();await idle(p);assert.equal(await p.locator('dialog[open]').count(),0);
 assert.equal(await p.locator('#story-resume').isVisible(),false);
 assert.equal(await p.evaluate(()=>window.hostTest.state.save.status.intimacy),intimacy);
});
test('missing cached prose resumes authoritative pending chapter without another walk',async t=>{
 const p=await setup(t,{walkOutcome:'quiet',journey:true});await start(p);
 await p.locator('[data-action="walk"]').click();await p.waitForFunction(()=>document.querySelectorAll('#story-choices button').length===2);
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('test-host'));delete s.kv['notebuddy/walk-story-v1'];localStorage.setItem('test-host',JSON.stringify(s));});
 await p.reload();await idle(p);assert.equal(await p.locator('dialog[open]').count(),0);
 await p.locator('#story-resume').click();await p.locator('#story-choices button').last().click();
 await p.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
 assert.equal((await calls(p,'walk_begin')).length,0);assert.equal((await calls(p,'walk_leave')).length,1);
});

test('name and appearance initialize a personality once and all conversation uses it',async t=>{
 const p=await setup(t);await start(p);
 await p.waitForFunction(()=>window.hostTest.state.save.status.personality);
 assert.equal((await calls(p,'personality')).length,1);assert.equal((await calls(p,'personality-llm')).length,1);
 await p.locator('#personality-details summary').click();
 assert.match(await p.locator('#personality-summary').innerText(),/name and round face/);
 assert.equal(await p.locator('#personality-traits .badge').count(),4);
 await p.locator('[data-action="feed"]').click();await idle(p);
 const prompts=await p.evaluate(()=>window.hostTest.calls.filter(c=>c.method==='llm').map(c=>c.prompt));assert.match(prompts.at(-1),/Short gentle sentences/);
 await p.reload();await idle(p);assert.equal((await calls(p,'personality-llm')).length,0);assert.equal((await calls(p,'personality')).length,0);
 await p.locator('#language').selectOption('ko');await idle(p);await p.locator('#personality-details summary').click();assert.match(await p.locator('#personality-summary').innerText(),/둥근 얼굴/);
});
test('personality generation failure leaves game playable and only explicit retry spends again',async t=>{
 const p=await setup(t,{personalityMalformed:true});await start(p);
 await p.waitForFunction(()=>document.querySelector('#personality-status').textContent.includes('Could not finish'));
 assert.equal(await p.locator('[data-action="feed"]').isEnabled(),true);
 await p.reload();await idle(p);assert.equal((await calls(p,'personality-llm')).length,0);
 await fault(p,{personalityMalformed:false});await p.locator('#personality-details summary').click();await p.locator('#meet-personality').click();await idle(p);
 await p.waitForFunction(()=>window.hostTest.state.save.status.personality);assert.equal((await calls(p,'personality-llm')).length,1);
});
test('received personality survives draft save failure and retries without paid generation',async t=>{
 const p=await setup(t,{personalityDraftSave:true});await start(p);
 await p.waitForFunction(()=>document.querySelector('#personality-status').textContent.includes('saving is unfinished'));
 assert.equal((await calls(p,'personality-llm')).length,1);assert.equal((await calls(p,'personality')).length,0);
 assert.equal(await p.locator('[data-action="feed"]').isEnabled(),true);
 await fault(p,{personalityDraftSave:false});await p.locator('#personality-details summary').click();await p.locator('#meet-personality').click();await idle(p);
 await p.waitForFunction(()=>window.hostTest.state.save.status.personality);
 assert.equal((await calls(p,'personality-llm')).length,1);assert.equal((await calls(p,'personality')).length,1);
 await p.reload();await idle(p);assert.equal((await calls(p,'personality-llm')).length,0);
});

test('walk influence remains visible independently of AI scene and survives reload',async t=>{
 const p=await setup(t,{walkOutcome:'quiet',journey:true});await start(p);await p.locator('[data-action="walk"]').click();
 await p.waitForFunction(()=>document.querySelectorAll('#story-choices button').length===2);
 assert.match(await p.locator('#story-influence').innerText(),/feeding.*earlier safe choice/);
 assert.doesNotMatch(await p.locator('#story-influence').innerText(),/training/);
 await p.reload();await idle(p);assert.equal(await p.locator('dialog[open]').count(),0);
 await p.locator('#story-resume').click();assert.equal(await p.locator('#story-influence').isVisible(),true);
 await p.locator('#story-choices button').last().click();await p.waitForFunction(()=>!document.querySelector('#story-ending').hidden);
 assert.match(await p.locator('#story-influence').innerText(),/regardless of preparation/);
});

test('title screen opens on every load, never blocks connection and leads to the collection',async t=>{
 const p=await setup(t);await start(p);
 await p.reload();await p.waitForFunction(()=>document.querySelector('#title-screen').open);
 assert.equal(await p.locator('#title-start').evaluate(e=>document.activeElement===e),true);
 await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('Connected'));
 assert.equal(await p.locator('#title-start').isDisabled(),false);
 await p.keyboard.press('ArrowDown');assert.equal(await p.locator('#title-privacy').evaluate(e=>document.activeElement===e),true);
 await p.keyboard.press('x');assert.equal(await p.locator('#title-screen').isVisible(),false);
 await p.reload();await p.waitForFunction(()=>document.querySelector('#title-screen').open);
 const callsBefore=await p.evaluate(()=>window.hostTest.calls.filter(c=>c.args?.command!=='status').length);
 await p.locator('#title-start').click();await idle(p);await p.locator('#open-items').click();assert.equal(await p.locator('#item-catalog').isVisible(),true);
 assert.equal(await p.locator('#collection-tab-items').getAttribute('aria-selected'),'true');
 await p.locator('#collection-tab-album').click();assert.equal(await p.locator('#collection-album-panel').isVisible(),true);
 assert.equal(await p.locator('#collection-album .album-item').count(),await p.locator('#album .album-item').count());
 assert.equal(await p.locator('#collection-album-empty').isVisible(),false);
 await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('#item-book-panel').isVisible(),true);
 assert.equal(await p.evaluate(()=>window.hostTest.calls.filter(c=>c.args?.command!=='status').length),callsBefore);
});

test('welcome steps follow the start form and the art choice keeps its preview beside the button',async t=>{
 const p=await setup(t);
 assert.equal(await p.locator('#birth-steps [aria-current=step]').getAttribute('data-step'),'name');
 await p.locator('#pet-name').fill('Mori');assert.equal(await p.locator('#birth-steps [aria-current=step]').getAttribute('data-step'),'meet');
 await p.locator('#birth-mode').selectOption('art');assert.equal(await p.locator('#birth-steps [aria-current=step]').getAttribute('data-step'),'mode');
 const layout=await p.evaluate(()=>{const preview=document.querySelector('#birth-art-choice .art-source-preview');preview.src='assets/starters-v1/plant_nature_stage1.png';preview.hidden=false;
  const b=document.querySelector('#choose-art').getBoundingClientRect(),i=preview.getBoundingClientRect(),n=document.querySelector('#birth-art-choice p').getBoundingClientRect();
  return {overlap:!(b.right<=i.left||i.right<=b.left||b.bottom<=i.top||i.bottom<=b.top),centered:Math.abs((b.top+b.bottom)/2-(i.top+i.bottom)/2)<2,noteBelow:n.top>=Math.max(b.bottom,i.bottom)};});
 assert.deepEqual(layout,{overlap:false,centered:true,noteBelow:true});
});
