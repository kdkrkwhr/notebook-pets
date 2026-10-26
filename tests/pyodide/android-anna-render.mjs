// Compare real rendered pixels from hash-locked Anna source. Host/AI are fixtures.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {rasterMatches,rasterTolerance} from './android-render-pixels.mjs';
const root=fileURLToPath(new URL('../../android/app/build/generated/gameAssets/game/',import.meta.url));
const out=fileURLToPath(new URL('../../android/runtime/anna-render/',import.meta.url));await mkdir(out,{recursive:true});
let mock=await readFile(new URL('../../anna/tests/browser/mock-sdk.mjs',import.meta.url),'utf8');
mock=mock.replace('image:{generate:async options=>{','image:{generate:async options=>{await window.imageGate;');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const n=new URL(req.url,'http://localhost').pathname;if(n==='/fixture-upload'&&req.method==='PUT'){req.resume();res.end();return;}const file=path.resolve(root,'.'+(n==='/'?'/index.html':n));if(!file.startsWith(root))throw Error();res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
let browser;const report={kind:'PC render, identical deterministic fixture host/AI; no model or phone execution',reference:'246781d',rasterTolerance,deviceRatioSource:'existing evidence/connection.json physicalSize 1080x2640; represented as 360x880 CSS pixels',comparisons:[],errors:[]};
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 async function render(kind,viewport){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>report.errors.push({kind,error:e.message}));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();
   if(u.pathname==='/static/anna-apps/_sdk/latest/index.js')return route.fulfill({contentType:'text/javascript',body:(kind==='mobile'?"import '/local/platform.mjs';\n":'')+mock});
   return route.continue();
  });
  await page.addInitScript(()=>{localStorage.setItem('notebuddy/language-v1','ko');Object.defineProperty(performance,'now',{value:()=>1000});window.imageGate=new Promise(r=>window.finishImage=r);});
  const shots={},texts={};
  async function shot(state){await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'*{animation:none!important;transition:none!important}'});
   const name=`${viewport.width}-${kind}-${state}.png`;shots[state]=await page.screenshot({path:path.join(out,name),animations:'disabled',caret:'hide'});
   texts[state]=await page.locator('body').innerText();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${kind}/${viewport.width}/${state} horizontal overflow`);
  }
  await page.goto(origin);await page.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);await shot('initial');
  await page.locator('#title-start').click();await shot('welcome');
  await page.locator('#birth-mode').selectOption('art');await page.locator('#choose-art').click();await page.locator('#art-input-mode').selectOption('file');
  await page.locator('#art-file').setInputFiles(fileURLToPath(new URL('../../android/imageprobe/src/main/assets/green-creature.png',import.meta.url)));
  await page.locator('#art-use').click();await page.locator('#art-dialog').waitFor({state:'hidden'});await page.locator('#pet-name').fill('같은 합성 친구');await page.locator('#start-form button').click();
  await page.waitForFunction(()=>document.querySelector('#birth-recovery-status').dataset.activity==='image');await shot('generating');
  await page.evaluate(()=>window.finishImage());await page.waitForFunction(()=>!document.querySelector('#game').hidden&&!document.querySelector('#refresh').disabled);await shot('complete');
  await page.reload();await page.waitForFunction(()=>window.hostTest&&!document.querySelector('#refresh').disabled);await page.locator('#title-start').click();await shot('revisit');
  assert.equal(await page.evaluate(()=>window.hostTest.calls.filter(c=>['image','llm','personality-llm'].includes(c.method)).length),0);
  if(kind==='mobile'){
   await page.locator('#chat-input').focus();await page.setViewportSize({width:viewport.width,height:Math.round(viewport.height*.56)});
   await page.evaluate(()=>dispatchEvent(new CustomEvent('native-keyboard',{detail:true})));
   await page.locator('#chat-input').fill('보내지 않은 합성 입력');await shot('keyboard');
   const b=await page.locator('#chat-input').boundingBox();assert(b&&b.y>=-1&&b.y+b.height<=Math.round(viewport.height*.56)+1,'focused input remains visible');
   await page.setViewportSize({width:viewport.height,height:viewport.width});await page.evaluate(()=>dispatchEvent(new CustomEvent('native-keyboard',{detail:false})));await shot('landscape');
  }
  await context.close();return {shots,texts};
 }
 const diffPage=await browser.newPage();
 async function pixelDiff(a,b){return diffPage.evaluate(async([a,b])=>{
  const decode=async value=>{const blob=await(await fetch('data:image/png;base64,'+value)).blob(),img=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const c=canvas.getContext('2d');c.drawImage(img,0,0);return {w:img.width,h:img.height,data:c.getImageData(0,0,img.width,img.height).data};};
  const x=await decode(a),y=await decode(b);let pixels=0,maxChannelDelta=0;for(let i=0;i<x.data.length;i+=4){const delta=Math.max(...[0,1,2,3].map(k=>Math.abs(x.data[i+k]-y.data[i+k])));if(delta>0)pixels++;maxChannelDelta=Math.max(maxChannelDelta,delta);}return {width:x.w,height:x.h,sameDimensions:x.w===y.w&&x.h===y.h,differentPixels:pixels,maxChannelDelta,totalPixels:x.w*x.h};
 },[a.toString('base64'),b.toString('base64')]);}
 for(const viewport of [{width:320,height:780},{width:390,height:844},{width:360,height:880}]){
  const reference=await render('reference',viewport),unchanged=await render('unchanged',viewport),mobile=await render('mobile',viewport);
  for(const state of ['initial','welcome','generating','complete','revisit']){
   const exact=await pixelDiff(reference.shots[state],unchanged.shots[state]),responsive=await pixelDiff(reference.shots[state],mobile.shots[state]);
   assert(rasterMatches(exact),`Unstyled pinned source differs beyond bounded raster noise at ${viewport.width}/${state}: ${JSON.stringify(exact)}`);
   assert.equal(mobile.texts[state].replace(/\s+/g,' ').trim(),reference.texts[state].replace(/\s+/g,' ').trim(),`Presentation changed visible content at ${state}`);
   report.comparisons.push({viewport,state,unmodifiedPixels:exact,mobilePixels:responsive,contentAndFlowEqual:true,intendedChanges:'mobile.css layout/font/touch sizing; no DOM steps or wording changes'});
  }
 }
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify({comparisons:report.comparisons.length,referenceRasterPass:true,rasterTolerance,mobileContentFlowPass:true,errors:report.errors}));
}finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();}
