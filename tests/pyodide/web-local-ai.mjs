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
  const sheet=await readFile(new URL('../../prototypes/pixel-home/assets/companion.png',import.meta.url));
  const graph={'6':{class_type:'CLIPTextEncode',inputs:{text:'private workflow prompt'}},'10':{class_type:'LoadImage',inputs:{image:'private-local-file.png'}},'8':{class_type:'SamplerFixture',inputs:{positive:['6',0],reference:['10',0]}},'9':{class_type:'SaveImage',inputs:{images:['8',0]}}};
  let cloudModel=false,failJob=false,badDecision=false;
  const realOllama=process.env.OLLAMA_URL;
  if(realOllama&&base.startsWith('https:'))await page.context().grantPermissions(['local-network-access'],{origin:new URL(base).origin});
  if(!realOllama)await page.route('http://localhost:11434/**',async route=>{
    const url=new URL(route.request().url()),body=route.request().postDataJSON();calls.push({kind:'ollama',path:url.pathname,body});
    assert(!route.request().headers()['x-goog-api-key']);
    if(url.pathname==='/api/tags')return route.fulfill({json:{models:[{name:'qwen3.5:4b'}]}});
    if(url.pathname==='/api/show')return route.fulfill({json:cloudModel?{remote_host:'https://ollama.com'}:{capabilities:['completion','thinking']}});
    assert.equal(url.pathname,'/api/chat');assert.equal(body.think,false);assert.equal(body.stream,false);
    if(body.format==='json'){
      const candidates=JSON.parse(body.messages.at(-1).content).candidates;
      return route.fulfill({json:{message:{content:JSON.stringify({candidate_id:badDecision?'invented':candidates[0].id,reason:'조용히 쉴 수 있는 방이에요.'})}}});
    }
    return route.fulfill({json:{message:{content:'오늘도 함께해서 좋아!'}}});
  });
  await page.route('http://127.0.0.1:8188/**',async route=>{
    const url=new URL(route.request().url());calls.push({kind:'comfy',path:url.pathname});assert(!route.request().headers()['x-goog-api-key']);
    if(url.pathname==='/system_stats')return route.fulfill({json:{system:{},devices:[]}});
    if(url.pathname==='/upload/image'){assert(route.request().headers()['content-type'].startsWith('multipart/form-data'));return route.fulfill({json:{name:'current-reference.png',subfolder:'',type:'input'}});}
    if(url.pathname==='/prompt'){
      const body=route.request().postDataJSON();assert.match(body.prompt['6'].inputs.text,/exactly FOUR/);assert.equal(body.prompt['10'].inputs.image,'current-reference.png');return route.fulfill({json:{prompt_id:'local-job',node_errors:{}}});
    }
    if(url.pathname==='/history/local-job')return route.fulfill({json:{'local-job':failJob?{status:{status_str:'error'}}:{status:{completed:true,status_str:'success'},outputs:{'9':{images:[{filename:'sheet.png',subfolder:'',type:'output'}]}}}}});
    if(url.pathname==='/view')return route.fulfill({contentType:'image/png',body:sheet});
    throw Error('Unexpected ComfyUI call');
  });
  let googleCalls=0;await page.route('https://generativelanguage.googleapis.com/**',async route=>{googleCalls++;await route.abort();});
  const count=path=>calls.filter(c=>c.path===path).length;
  const state=()=>page.evaluate(async()=>{const m=await import('./store.js');return m.snapshot(await m.openStore());});
  const idle=()=>page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  const configureWorkflow=async()=>{
    await page.locator('#comfy-prompt-node').fill('6');await page.locator('#comfy-prompt-field').fill('text');await page.locator('#comfy-reference-node').fill('10');await page.locator('#comfy-output-node').fill('9');
    await page.locator('#comfy-workflow').setInputFiles({name:'workflow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(graph))});await page.waitForFunction(()=>document.querySelector('#workflow-status').textContent.includes('연결을 확인'));
  };
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('공책이 준비'),{},{timeout:120000});await page.locator('#title-start').click();
  await page.locator('#open-settings').click();await page.locator('#text-provider').selectOption('ollama');await page.locator('#image-provider').selectOption('comfyui');assert.equal(await page.locator('#key').inputValue(),'');
  assert.equal(calls.length,0);assert(await page.locator('#gemini-key-settings').isHidden());
  if(realOllama)await page.locator('#ollama-url').fill(realOllama);
  await page.locator('#connect-ollama').click();await page.waitForFunction(()=>document.querySelector('#ollama-status').textContent.includes('설치된 모델'));
  if(realOllama)await page.locator('#ollama-model').selectOption(process.env.OLLAMA_MODEL??'qwen3.5:4b');
  await page.locator('#connect-comfy').click();await page.waitForFunction(()=>document.querySelector('#comfy-status').textContent.includes('연결했어요'));
  assert.equal(count('/api/chat'),0);assert.equal(count('/prompt'),0);await configureWorkflow();
  for(const width of [1120,360]){await page.setViewportSize({width,height:900});assert(await page.locator('#settings-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
  const shots=fileURLToPath(new URL('../../.local/web-ui/',import.meta.url));await mkdir(shots,{recursive:true});await page.screenshot({path:path.join(shots,'local-ai-settings-mobile.png')});await page.setViewportSize({width:1280,height:900});
  await page.locator('#settings-dialog .primary').click();await page.locator('#name').fill('로컬 친구');await page.locator('#birth button').click();await idle();
  assert.equal(count('/prompt'),1);assert(Object.values((await state()).visuals.art).some(e=>e.format==='home-sprite-v1'));
  const chatBefore=(await state()).player.state;await page.locator('#message').fill('오늘 기분 어때?');await page.locator('#chat button').click();await page.waitForFunction(()=>document.querySelectorAll('#messages .message').length===2,{},{timeout:120000});assert.deepEqual((await state()).player.state,chatBefore);
  const chatText=await page.locator('#messages .assistant').innerText();assert(chatText.trim());
  await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(),s=await m.load(db);s.state.coins=100;await m.commit(db,s.revision,s.state);});await page.locator('#refresh').click();await idle();
  await page.locator('#open-home').click();await page.waitForFunction(()=>document.querySelector('#home-canvas').dataset.sprite==='ready');await page.locator('#home-inside').click();await page.locator('#home-yard').click();await page.locator('#home-shop-toggle').click();
  await page.locator('.home-item').filter({hasText:'독서 책상'}).getByRole('button').click();await page.locator('#home-purchase-confirm').click();await idle();assert.equal((await state()).player.state.coins,90);assert.equal(count('/prompt'),1);
  const beforeDecorate=(await state()).player.revision;await page.locator('#home-decorate').click();await idle();assert((await state()).player.revision>beforeDecorate,'model candidate rejected: '+await page.locator('#home-status').innerText());assert((await state()).player.state.home.reason);
  await page.locator('#home-undo').click();await idle();
  if(!realOllama){const prior=(await state()).player.state;badDecision=true;await page.locator('#home-decorate').click();await idle();assert.deepEqual((await state()).player.state,prior);badDecision=false;}
  await page.locator('#home-close').click();assert.equal(count('/prompt'),1);
  if(!realOllama){cloudModel=true;const before=count('/api/chat');await page.locator('#message').fill('cloud forbidden');await page.locator('#chat button').click();await page.waitForFunction(()=>document.querySelector('#reply').textContent.includes('클라우드'));assert.equal(count('/api/chat'),before);cloudModel=false;}
  const portrait=await readFile(new URL('../../assets/starters-v1/dragon_nature_stage1.png',import.meta.url));
  const savePortrait=async()=>{await page.locator('#open-appearance').click();await page.locator('#portrait-file').setInputFiles({name:'friend.png',mimeType:'image/png',buffer:portrait});await page.waitForFunction(()=>!document.querySelector('#save-portrait').disabled);await page.locator('#save-portrait').click();await idle();};
  failJob=true;await savePortrait();assert.equal(count('/prompt'),2);assert.match(await page.locator('#notice').innerText(),/movement:generate/);await savePortrait();assert.equal(count('/prompt'),2);failJob=false;
  const backup=await page.evaluate(async()=>{const m=await import('./store.js'),v=await import('./visuals.js');return v.exportNotebook(await m.openStore());});assert(!JSON.stringify(backup).includes('private workflow prompt'));assert(!JSON.stringify(backup).includes('private-local-file'));
  const beforeReload=(await state()).player.state;await page.reload();await page.waitForFunction(()=>document.querySelector('#pet-name').textContent==='로컬 친구',{},{timeout:120000});await idle();await page.locator('#title-start').click();assert.deepEqual((await state()).player.state,beforeReload);
  await page.locator('#open-settings').click();assert.equal(await page.locator('#text-provider').inputValue(),'ollama');assert.equal(await page.locator('#image-provider').inputValue(),'comfyui');assert.equal(await page.locator('#key').inputValue(),'');assert.match(await page.locator('#workflow-status').innerText(),/파일을 선택/);assert.equal(count('/prompt'),2);assert.equal(googleCalls,0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url:base,realOllama:!!realOllama,chatText,localImagesMock:true,metadataOnlyConnect:true,birthImageOnce:true,chatNoGameMutation:true,decorateValidated:true,purchaseNoAI:true,noEntryAI:true,noCloudFallback:true,failedJobNotRetried:true,preferencesPersist:true,workflowNotPersisted:true,googleCalls,errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
