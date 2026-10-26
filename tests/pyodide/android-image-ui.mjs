// Browser-only UI contract test. Generated pixels are a fixture, never real AI evidence.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../../android/app/build/generated/gameAssets/game/',import.meta.url));
const fixture=fileURLToPath(new URL('../../android/imageprobe/src/main/assets/green-creature.png',import.meta.url));
const server=createServer(async(req,res)=>{try{
  const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1),file=path.resolve(root,route||'index.html');if(!file.startsWith(root))throw Error();
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
  browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
  const page=await browser.newPage({viewport:{width:360,height:800},hasTouch:true,isMobile:true});page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('UI error:',e.message);});
  page.on('requestfailed',r=>console.error('Request failed:',r.url(),r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});
  await page.addInitScript(()=>{
    window.mockImage={calls:0,analyses:0,analysisMode:'fail',mode:'hold',deliver:null,actions:[]};
    window.NoteBuddyNative={postMessage(raw){const r=JSON.parse(raw);let result=true,error=null;
      window.mockImage.actions.push(r.action);
      if(r.action==='status')result={ready:true,hasLabPhoto:false,testMode:true,imageEnabled:true,localImageReady:true};
      if(r.action==='complete'){
        window.mockImage.analyses++;
        if(window.mockImage.analysisMode==='fail')error='합성 분석 실패';
        else result=JSON.stringify({decision:'allow',features:'A green oval body with two pointed ears, two white eyes, small feet and a red diamond on its right side.',species:'reptile',element:'nature',confidence:'uncertain'});
      }
      if(r.action==='generateImage'){
        window.mockImage.calls++;
        const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#ef9f38';ctx.fillRect(0,0,256,256);
        result={image:c.toDataURL('image/png'),totalWallMs:175000};
        const deliver=()=>window.NoteBuddyNative.onmessage({data:JSON.stringify({id:r.id,result,error})});
        if(window.mockImage.mode==='hold'){window.mockImage.deliver=deliver;return;}
      }
      setTimeout(()=>window.NoteBuddyNative.onmessage({data:JSON.stringify({id:r.id,result,error})}),20);
    }};
  });
  const snap=()=>page.evaluate(async()=>{const s=await import('./store.js');return s.snapshot(await s.openStore('notebuddy-android-test'));});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>document.body.classList.contains('mobile-ready'),{},{timeout:120000}).catch(async e=>{console.error(await page.locator('#native-startup').textContent(),errors);throw e;});
  await page.locator('#birth button').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  assert.equal((await snap()).player.state,null);
  await page.locator('#choose-art').click();await page.locator('#art-input-mode').selectOption('file');await page.locator('#art-file').setInputFiles(fixture);
  await page.locator('#art-use').click();await page.locator('#art-dialog').waitFor({state:'hidden'});
  const out=new URL('../../android/runtime/image-browser/',import.meta.url);await mkdir(out,{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('welcome.png',out))});
  await page.locator('#birth-generate').click();await page.waitForFunction(()=>document.querySelector('#birth-generation-status').textContent.includes('분석 실패'));
  assert.equal(await page.evaluate(()=>window.mockImage.calls),0);
  await page.evaluate(()=>window.mockImage.analysisMode='uncertain');await page.locator('#birth-generate').click();
  await page.locator('#birth-analysis-confirm').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.mockImage.calls),0);
  await page.screenshot({path:fileURLToPath(new URL('analysis-confirm.png',out))});
  const original=await page.locator('#birth-preview').getAttribute('src');
  await page.locator('#birth-analysis-confirm').click();await page.waitForFunction(()=>window.mockImage.calls===1);
  assert.equal(await page.locator('#birth-generate').isDisabled(),true);
  await page.locator('#birth-generation-cancel').click();await page.evaluate(()=>window.mockImage.deliver());
  await page.waitForFunction(()=>!document.querySelector('#birth-generate').disabled);
  assert.equal(await page.locator('#birth-generated-figure').isVisible(),false);assert.equal(await page.locator('#birth-preview').getAttribute('src'),original);assert.equal((await snap()).player.state,null);
  await page.evaluate(()=>window.mockImage.mode='success');await page.locator('#birth-generate').click();await page.locator('#birth-generated-figure').waitFor({state:'visible'});
  assert.equal((await snap()).player.state,null);assert.equal(await page.evaluate(()=>window.mockImage.calls),2);
  await page.reload();await page.waitForFunction(()=>document.body.classList.contains('mobile-ready')&&!document.querySelector('#birth-generated-figure').hidden);
  assert.equal(await page.evaluate(()=>window.mockImage.calls+window.mockImage.analyses),0);
  for(const width of [320,390,700]){
    await page.setViewportSize({width,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
    await page.screenshot({path:fileURLToPath(new URL(`preview-${width}.png`,out))});
  }
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;let once=true;IDBObjectStore.prototype.put=function(value,key){const r=put.call(this,value,key);if(key==='player'&&once){once=false;this.transaction.abort();}return r;};});
  await page.locator('#name').fill('UI fixture');await page.locator('#birth button').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  assert.equal((await snap()).player.state,null);assert.equal(await page.locator('#birth-generated-figure').isVisible(),true);
  await page.locator('#name').fill('UI fixture');await page.locator('#birth button').click();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='UI fixture'&&!document.querySelector('#refresh').disabled);
  const before=await snap(),art=Object.values(before.visuals.art);assert.equal(art.length,2);assert.notEqual(art[0].hash,art[1].hash);
  assert.equal(before.player.state.species,'reptile');assert.equal(before.player.state.element,'nature');
  assert.match(art.find(x=>x.assessment).features,/red diamond/);
  await page.reload();await page.waitForFunction(()=>document.body.classList.contains('mobile-ready')&&document.querySelector('#pet-name').textContent==='UI fixture');
  assert.deepEqual(await snap(),before);assert.equal(await page.evaluate(()=>window.mockImage.calls),0);assert.deepEqual(errors,[]);
  const report={mockOnly:true,realInference:false,analysisFailureBlocksImage:true,uncertaintyConfirmed:true,cancel:true,lateResultIgnored:true,noSaveBeforeConfirm:true,originalSeparate:true,previewRecoveredAfterReload:true,saveOnlyRetry:true,speciesElementApplied:true,saveAndReload:true,noInferenceOnReload:true};
  assert.equal(await page.evaluate(()=>window.mockImage.actions.includes('download')),false);
  await writeFile(new URL('report.json',out),JSON.stringify(report,null,2));console.log(report);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
