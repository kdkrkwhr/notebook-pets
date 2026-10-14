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
const saved=scenario==='welcome'?null:window.storeFixture[scenario==='dungeon'?'discovery':'initial'];
const art=saved?{
 [saved.pet_id+'/stage-1']:{path:'portraits/store-demo/portrait.png',at:1},
 [saved.pet_id+'/birth-source']:{path:'portraits/store-demo/reference.png',features:window.storeDemo?.assessment.features,phase:'done',at:1},
 [saved.pet_id+'/pixel-stage-1']:{path:'portraits/store-demo/pixel.png',source_path:'portraits/store-demo/portrait.png',format:'pixel-v1',at:1}
}:{};
window.storeCalls=[];
export const AnnaAppRuntime={connect:async()=>({
 tools:{invoke:async r=>{window.storeCalls.push(r.args.command);if(r.args.command!=='status')throw Error('Screenshot host is read-only');return saved?clone(saved):{ok:false,code:'not_started',request_id_prefix:'nb2:0:'};}},
 storage:{get:async({key})=>({value:key==='notebuddy/art-v1'?art:null}),set:async()=>{throw Error('Unexpected screenshot write');}},
 llm:{complete:async()=>{throw Error('No AI in screenshot host');}},image:{generate:async()=>{throw Error('No AI in screenshot host');}},
 files:{download_url:async({path})=>{if(!['portrait','reference','pixel'].some(name=>path==='portraits/store-demo/'+name+'.png'))throw Error('Unexpected screenshot file');return {get_url:'/store-demo/'+path.split('/').pop()};}}
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
  const type=name.endsWith('.js')||name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html';
  try{return route.fulfill({contentType:type,body:await readFile(new URL(name,bundle))});}catch{return route.fulfill({status:404,body:''});}
 });
 const open=async scene=>{await p.goto('https://notebuddy.test/?scene='+scene);await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('Connected')&&!document.querySelector('#refresh').disabled);await p.evaluate(()=>{if(document.querySelector('#title-screen').open)document.querySelector('#title-start').click();});await p.evaluate(()=>Promise.all([...document.images].filter(i=>i.getAttribute('src')&&!i.hidden).map(i=>i.decode().catch(()=>{}))));};
 const shot=async name=>p.screenshot({path:fileURLToPath(new URL(name,store))});
 await open('welcome');await shot('01-first-meeting.png');
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 await drawStoreReference(p);await shot('04-draw-your-companion.png');
 const reference=Buffer.from((await p.locator('#art-canvas').evaluate(canvas=>canvas.toDataURL('image/png'))).split(',')[1],'base64');
 if(demo&&createHash('sha256').update(reference).digest('hex')!==demo.referenceSha256)throw Error('Drawing does not match the analyzed reference');
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
 await p.setViewportSize({width:1280,height:850});await p.locator('#album').scrollIntoViewIfNeeded();await shot('03-care-and-album.png');
 await p.setViewportSize({width:1280,height:900});await open('dungeon');await p.locator('[data-dungeon]').first().click();
 await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='ready');await shot('05-pixel-dungeon.png');
 if(errors.length)throw Error(errors.join('\n'));
 const calls=await p.evaluate(()=>window.storeCalls);if(calls.some(c=>c!=='status'))throw Error('Unexpected gameplay call');
 await writeFile(new URL('capture.json',store),JSON.stringify({appVersion:'0.8.1',source:'shipped bundle + disposable real Python engine views + recorded Anna drawing result',at:new Date().toISOString(),species:fixture.initial.species_key,element:fixture.initial.element_key,captureAiCalls:0,assetPreparationAiCalls:demo.aiCalls,productionStorageCalls:0,screenshots:5},null,2)+'\n');
 console.log('Captured 5 actual UI screenshots with the recorded Anna portrait; no new Anna or AI calls during capture.');
 }
}finally{await browser.close();}
