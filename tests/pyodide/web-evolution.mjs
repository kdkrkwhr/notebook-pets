import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../../web/dist/',import.meta.url));
const server=createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/notebook-pets\//,''),file=path.resolve(root,route||'index.html');if(!file.startsWith(root))throw Error();
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
 res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const page=await browser.newPage({viewport:{width:1100,height:900}});page.setDefaultTimeout(30000);
 const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.WEB_URL??`http://127.0.0.1:${server.address().port}/notebook-pets/`;
 const png=await readFile(new URL('../../assets/starters-v1/mammal_fire_stage1.png',import.meta.url));
 function options(context){return JSON.stringify({features:'Round gold face, four paws, two ears and a striped tail.',memory:'We enjoy quiet walks.',options:['keep',...context.routes.filter(r=>r.id!=='keep').slice(0,2).map(r=>r.id)].map(route_id=>({route_id,title:'함께 자라는 '+route_id,reason:'함께한 산책을 떠올려요.',appearance:'고유한 줄무늬와 따뜻한 광채가 어우러져요.'}))});}
 await page.route('https://generativelanguage.googleapis.com/**',async route=>{
  const body=route.request().postDataJSON();calls.push({kind:body.generationConfig.responseModalities?'image':'text',body});
  if(body.generationConfig.responseModalities){assert(body.contents[0].parts.every(p=>!p.inlineData));return route.fulfill({json:{candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:png.toString('base64')}}]}}]}});}
  const evolution=body.systemInstruction.parts[0].text.includes('THREE evolution paths');
  if(evolution)assert(body.contents[0].parts.some(p=>p.inlineData));
  return route.fulfill({json:{candidates:[{content:{parts:[{text:evolution?options(JSON.parse(body.contents[0].parts[0].text)):'함께 걸어서 좋아요!'}]}}]}});
 });
 await page.route('http://localhost:11434/**',async route=>{
  const u=new URL(route.request().url()),body=route.request().postDataJSON();calls.push({kind:'ollama',path:u.pathname,body});
  if(u.pathname==='/api/tags')return route.fulfill({json:{models:[{name:'vision-fixture'}]}});
  if(u.pathname==='/api/show')return route.fulfill({json:{capabilities:['completion','vision']}});
  assert(body.messages.at(-1).images.length===1);return route.fulfill({json:{message:{content:options(JSON.parse(body.messages.at(-1).content))}}});
 });
 await page.route('http://127.0.0.1:8188/**',async route=>{
  const u=new URL(route.request().url()),body=route.request().postDataJSON();calls.push({kind:'comfy',path:u.pathname,body});
  if(u.pathname==='/prompt'){assert(!Object.values(body.prompt).some(n=>n.class_type==='LoadImage'));return route.fulfill({json:{prompt_id:'one-evolution'}});}
  if(u.pathname==='/history/one-evolution')return route.fulfill({json:{'one-evolution':{outputs:{9:{images:[{filename:'evolved.png',subfolder:'',type:'output'}]}}}}});
  if(u.pathname==='/view')return route.fulfill({body:png,contentType:'image/png'});
  throw Error('Unexpected local call '+u.pathname);
 });
 const idle=()=>page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 const state=()=>page.evaluate(async()=>{const m=await import('./store.js');return m.snapshot(await m.openStore());});
 async function ready(stage){await page.evaluate(async stage=>{const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);s.state.level=stage===1?10:30;s.state.journey??={version:1,counts:{},recent:[],routes:[0,0],arc:null,chapter:0,last_arc:null,completed:0,endings:[],current:null};s.state.journey.counts={feed:30,train:10,walk:15};await m.commit(db,s.revision,s.state);},stage);await page.locator('#refresh').click();await idle();}
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('공책이 준비'),{},{timeout:120000});await page.locator('#title-start').click();await page.locator('#name').fill('진화 친구');await page.locator('#birth button').click();await idle();
 await page.locator('#open-settings').click();await page.locator('#key').fill('MOCK-KEY');await page.locator('#settings-dialog .primary').click();
 await page.locator('#message').fill('조용한 산책이 좋아.');await page.locator('#chat button').click();await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);
 assert.equal((await state()).visuals.chat.length,2);await ready(1);const id=(await state()).player.state.pet_id;
 await page.locator('#open-evolution').click();assert.equal(calls.length,1);await page.locator('#evolution-prepare').click();await idle();assert.equal(await page.locator('.evolution-route').count(),3);
 assert(calls[1].body.contents[0].parts[0].text.includes('조용한 산책이 좋아.'));
 await page.locator('[data-evo-close]').click();await page.locator('#open-evolution').click();assert.equal(calls.length,2);
 await page.locator('.evolution-route').nth(1).click();await page.locator('#evolution-confirm').click();await idle();
 assert.equal(calls.filter(c=>c.kind==='image').length,1);assert.equal((await state()).player.state.stage,2);assert.equal((await state()).player.state.pet_id,id);assert((await state()).visuals.art[`${id}/stage-2`]);
 assert.equal(Object.values((await state()).visuals.art).filter(e=>e.format==='home-sprite-v1').length,0);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('공책이 준비'),{},{timeout:120000});await page.locator('#title-start').click();assert.match(await page.locator('#messages').textContent(),/조용한 산책/);assert.equal(calls.length,3);
 await ready(2);await page.locator('#open-settings').click();await page.locator('#text-provider').selectOption('ollama');await page.locator('#connect-ollama').click();await page.waitForFunction(()=>document.querySelector('#ollama-model').value==='vision-fixture');await page.locator('#image-provider').selectOption('comfyui');
 const graph={'6':{class_type:'CLIPTextEncode',inputs:{text:'prompt'}},'8':{class_type:'SamplerFixture',inputs:{positive:['6',0]}},'9':{class_type:'SaveImage',inputs:{images:['8',0]}}};
 await page.locator('#comfy-prompt-node').fill('6');await page.locator('#comfy-reference-node').fill('');await page.locator('#comfy-output-node').fill('9');await page.locator('#comfy-workflow').setInputFiles({name:'text-to-image.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(graph))});await page.waitForFunction(()=>document.querySelector('#workflow-status').textContent.includes('연결을 확인'));await page.locator('#settings-dialog .primary').click();
 await page.locator('#open-evolution').click();await page.locator('#evolution-prepare').click();await idle();await page.locator('.evolution-route').first().click();await page.locator('#evolution-confirm').click();await idle();
 assert.equal((await state()).player.state.stage,3);assert.equal(calls.filter(c=>c.path==='/api/chat').length,1);assert.equal(calls.filter(c=>c.path==='/prompt').length,1,JSON.stringify({calls:calls.map(c=>c.path||c.kind),status:await page.locator('#evolution-status').textContent(),workflow:await page.locator('#workflow-status').textContent()}));assert.equal(calls.filter(c=>c.path==='/upload/image').length,0);assert((await state()).visuals.art[`${id}/stage-3`]);
 const backup=await page.evaluate(async()=>{const s=await import('./store.js'),v=await import('./visuals.js');const data=await v.exportNotebook(await s.openStore());const restored=await v.importVisuals(data);return {chat:restored.chat.length,art:Object.keys(restored.art).length,hasKey:JSON.stringify(data).includes('MOCK-KEY')};});assert.equal(backup.chat,2);assert.equal(backup.hasKey,false);assert(backup.art>=4);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({manualStages:2,geminiVision:1,geminiTextOnlyImage:1,ollamaVision:1,comfyTextOnlyJob:1,homeImages:0,chatRestored:true,backup:true}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
