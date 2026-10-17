// Render the shipped UI with disposable real-engine views. No Anna account or AI calls.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {drawStoreReference} from './store_drawing.mjs';

const root=new URL('../',import.meta.url),bundle=new URL('bundle/',root),store=new URL('store/',root);
const referenceOnly=process.argv.includes('--draw-reference');
const demo=referenceOnly?null:JSON.parse(await readFile(new URL('demo/provenance.json',store),'utf8'));
if(demo&&(!demo.portrait||!demo.personality))throw Error('Complete the recorded Anna demo before capture');
if(demo&&createHash('sha256').update(await readFile(new URL('demo/portrait.png',store))).digest('hex')!==demo.portrait.sha256)throw Error('Recorded portrait does not match');
const fixture=JSON.parse(execFileSync(process.env.PYTHON||'python',['-B','-X','utf8',fileURLToPath(new URL('store_fixture.py',import.meta.url))],{encoding:'utf8'}));
const sdk=`
const clone=x=>structuredClone(x);
const scenario=new URL(location.href).searchParams.get('scene');
const saved=scenario==='welcome'?null:window.storeFixture[scenario==='dungeon'?'discovery':scenario==='garden'?'garden':'initial'];
const art=saved?{
 [saved.pet_id+'/stage-1']:{path:'portraits/store-demo/portrait.png',at:1},
 [saved.pet_id+'/birth-source']:{path:'portraits/store-demo/reference.png',features:window.storeDemo?.assessment.features,phase:'done',at:1},
 [saved.pet_id+'/pixel-stage-1']:{path:'portraits/store-demo/pixel.png',source_path:'portraits/store-demo/portrait.png',format:'pixel-v1',at:1}
}:{};
if(saved)art[saved.pet_id+'/home-sprite-stage-1']={path:'portraits/'+saved.pet_id+'/store-default.png',source_path:'portraits/store-demo/portrait.png',format:'home-default-v1',pet_id:saved.pet_id,stage:1,at:1};
window.storeCalls=[];
export const AnnaAppRuntime={connect:async()=>({
 tools:{invoke:async r=>{window.storeCalls.push(r.args.command);if(r.args.command!=='status')throw Error('Screenshot host is read-only');return saved?clone(saved):{ok:false,code:'not_started',request_id_prefix:'nb2:0:'};}},
 storage:{get:async({key})=>({value:key==='notebuddy/art-v1'?art:null}),set:async()=>{throw Error('Unexpected screenshot write');}},
 llm:{complete:async()=>{throw Error('No AI in screenshot host');}},image:{generate:async()=>{throw Error('No AI in screenshot host');}},
 files:{download_url:async({path})=>{if(path.endsWith('/store-default.png'))return {get_url:'/store-demo/pixel.png'};if(!['portrait','reference','pixel'].some(name=>path==='portraits/store-demo/'+name+'.png'))throw Error('Unexpected screenshot file');return {get_url:'/store-demo/'+path.split('/').pop()};}}
})};`;
const browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
try{
 const p=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(value=>{window.storeFixture=value.fixture;window.storeDemo=value.demo;},{fixture,demo});
 await p.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();
  if(u.pathname.includes('/_sdk/'))return route.fulfill({contentType:'text/javascript',body:sdk});
  if(u.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"offline-store-capture"}'});
  if(/^\/store-demo\/(portrait|reference|pixel)\.png$/.test(u.pathname))return route.fulfill({contentType:'image/png',body:await readFile(new URL('demo/'+u.pathname.split('/').pop(),store))});
  const name=u.pathname==='/'?'index.html':u.pathname.slice(1);if(name.includes('..'))return route.abort();
  const type=name.endsWith('.js')||name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.woff2')?'font/woff2':'text/html';
  try{return route.fulfill({contentType:type,body:await readFile(new URL(name,bundle))});}catch{return route.fulfill({status:404,body:''});}
 });
 // Lazy images outside the rendered view never load, so only visible ones are forced and awaited.
 const decoded=()=>p.evaluate(()=>Promise.all([...document.images].filter(i=>i.getAttribute('src')&&i.checkVisibility()).map(i=>{i.loading='eager';return i.decode().catch(()=>{});})));
 const open=async(scene,{title=false}={})=>{await p.goto('https://notebuddy.test/?scene='+scene);await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('Connected')&&!document.querySelector('#refresh').disabled);await p.waitForFunction(()=>document.fonts.check('16px Galmuri11')&&document.fonts.status==='loaded');if(!title)await p.evaluate(()=>{if(document.querySelector('#title-screen').open)document.querySelector('#title-start').click();});await decoded();};
 const shot=async name=>p.screenshot({path:fileURLToPath(new URL(name,store))});
 await open('welcome');await shot('01-first-meeting.png');
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 await drawStoreReference(p);await shot('04-draw-your-companion.png');
 const reference=Buffer.from((await p.locator('#art-canvas').evaluate(canvas=>canvas.toDataURL('image/png'))).split(',')[1],'base64');
 if(demo&&createHash('sha256').update(await readFile(new URL('demo/reference.png',store))).digest('hex')!==demo.referenceSha256)throw Error('Recorded reference does not match');
 // Pointer strokes can rasterize a few pixels differently with the editor's on-screen layout.
 const referenceDiff=demo?await p.locator('#art-canvas').evaluate(async canvas=>{
  const img=new Image();img.src='/store-demo/reference.png';await img.decode();
  const other=document.createElement('canvas');other.width=canvas.width;other.height=canvas.height;const o=other.getContext('2d');o.drawImage(img,0,0,canvas.width,canvas.height);
  const a=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,b=o.getImageData(0,0,canvas.width,canvas.height).data;
  let inked=0,differ=0;for(let i=0;i<a.length;i+=4){const ink=Math.min(a[i],a[i+1],a[i+2])<200||Math.min(b[i],b[i+1],b[i+2])<200;if(!ink)continue;inked++;if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>96)differ++;}
  return differ/inked;
 }):0;
 console.log('redrawn reference differs on',(referenceDiff*100).toFixed(1)+'% of inked pixels');
 if(referenceDiff>.02)throw Error('Drawing does not match the analyzed reference');
 if(referenceOnly){
   await mkdir(new URL('demo/',store),{recursive:true});
   await writeFile(new URL('demo/reference.png',store),reference);
   console.log('Saved the original reference from the real drawing editor; no Anna calls.');
 }else{
 const pixel=await p.evaluate(async()=>{const {pixelatePortrait}=await import('/pixel-pet.mjs');const blob=await pixelatePortrait(await(await fetch('/store-demo/portrait.png')).blob());return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});});
 await writeFile(new URL('demo/pixel.png',store),Buffer.from(pixel.split(',')[1],'base64'));
 await open('companion');
 if(!await p.locator('#pet-image').evaluate(img=>img.currentSrc.endsWith('/store-demo/portrait.png')&&img.naturalWidth>=512))throw Error('Generated portrait was replaced by a fallback');
 await shot('02-companion-and-care.png');
 await p.setViewportSize({width:1280,height:1100});await open('garden');await p.locator('#open-home').click();await p.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready');await p.locator('#home-pause').click();await shot('07-home-garden.png');
 await p.locator('#home-shop-toggle').click();await p.locator('[data-area="yard"]').click();await decoded();await shot('08-garden-shop.png');await p.locator('#home-close').click();
 await p.setViewportSize({width:1280,height:1000});await open('companion');
 await p.locator('#open-items').click();await p.locator('[data-item="frost-crown"]').waitFor();await decoded();await shot('06-item-book.png');await p.locator('#close-items').click();
 await p.setViewportSize({width:1280,height:850});await p.locator('#album').scrollIntoViewIfNeeded();await shot('03-care-and-album.png');
 await p.setViewportSize({width:1280,height:900});await open('companion',{title:true});
 if(!await p.locator('#title-screen').evaluate(d=>d.open))throw Error('Title screen did not open');await shot('00-title.png');
 await p.setViewportSize({width:1280,height:900});await open('dungeon');await p.locator('[data-dungeon]').first().click();
 await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='ready');await shot('05-pixel-dungeon.png');
 if(errors.length)throw Error(errors.join('\n'));
 const calls=await p.evaluate(()=>window.storeCalls);if(calls.some(c=>c!=='status'))throw Error('Unexpected gameplay call');
 await writeFile(new URL('capture.json',store),JSON.stringify({appVersion:JSON.parse(await readFile(new URL('app.json',root),'utf8')).version,source:'shipped bundle + disposable real Python engine views + recorded Anna drawing result',at:new Date().toISOString(),species:fixture.initial.species_key,element:fixture.initial.element_key,captureAiCalls:0,assetPreparationAiCalls:demo.aiCalls,productionStorageCalls:0,screenshots:9,gardenItems:36,catalogItems:48,fixtureCurrency:200,homeAppearance:'free default converted from the recorded portrait; no generated directional poses'},null,2)+'\n');
 console.log('Captured 9 actual UI screenshots; no new Anna or AI calls during capture.');
 }
}finally{await browser.close();}
