// Render the shipped UI with disposable real-engine views. No Anna account or AI calls.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root=new URL('../',import.meta.url),bundle=new URL('bundle/',root),store=new URL('store/',root);
const fixture=JSON.parse(execFileSync(process.env.PYTHON||'python',['-B','-X','utf8',fileURLToPath(new URL('store_fixture.py',import.meta.url))],{encoding:'utf8'}));
const sdk=`
const clone=x=>structuredClone(x);
const scenario=new URL(location.href).searchParams.get('scene');
const saved=scenario==='welcome'?null:window.storeFixture[scenario==='dungeon'?'discovery':'initial'];
window.storeCalls=[];
export const AnnaAppRuntime={connect:async()=>({
 tools:{invoke:async r=>{window.storeCalls.push(r.args.command);if(r.args.command!=='status')throw Error('Screenshot host is read-only');return saved?clone(saved):{ok:false,code:'not_started',request_id_prefix:'nb2:0:'};}},
 storage:{get:async()=>({value:null}),set:async()=>{throw Error('Unexpected screenshot write');}},
 llm:{complete:async()=>{throw Error('No AI in screenshot host');}},image:{generate:async()=>{throw Error('No AI in screenshot host');}},files:{}
})};`;
const browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
try{
 const p=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(value=>{window.storeFixture=value;},fixture);
 await p.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();
  if(u.pathname.includes('/_sdk/'))return route.fulfill({contentType:'text/javascript',body:sdk});
  if(u.pathname==='/anna-tool-ids.js')return route.fulfill({contentType:'text/javascript',body:'window.__ANNA_TOOL_IDS__={notebuddy:"offline-store-capture"}'});
  const name=u.pathname==='/'?'index.html':u.pathname.slice(1);if(name.includes('..'))return route.abort();
  const type=name.endsWith('.js')||name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html';
  try{return route.fulfill({contentType:type,body:await readFile(new URL(name,bundle))});}catch{return route.fulfill({status:404,body:''});}
 });
 const open=async scene=>{await p.goto('https://notebuddy.test/?scene='+scene);await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('Connected')&&!document.querySelector('#refresh').disabled);await p.evaluate(()=>Promise.all([...document.images].filter(i=>i.getAttribute('src')&&!i.hidden).map(i=>i.decode().catch(()=>{}))));};
 const shot=async name=>p.screenshot({path:fileURLToPath(new URL(name,store))});
 await open('welcome');await shot('01-first-meeting.png');
 await p.locator('#birth-mode').selectOption('art');await p.locator('#choose-art').click();
 const drawing=await p.locator('#art-canvas').boundingBox();
 const stroke=async points=>{await p.mouse.move(drawing.x+points[0][0]*drawing.width,drawing.y+points[0][1]*drawing.height);await p.mouse.down();for(const [x,y] of points.slice(1))await p.mouse.move(drawing.x+x*drawing.width,drawing.y+y*drawing.height,{steps:2});await p.mouse.up();};
 await stroke(Array.from({length:65},(_,i)=>[.5+.27*Math.cos(i*Math.PI/32),.49+.25*Math.sin(i*Math.PI/32)]));
 await stroke([[.38,.43],[.38,.47]]);await stroke([[.62,.43],[.62,.47]]);
 await stroke([[.43,.58],[.5,.62],[.57,.58]]);await shot('04-draw-your-companion.png');
 await open('companion');await shot('02-companion-and-care.png');
 await p.setViewportSize({width:1280,height:850});await p.locator('#album').scrollIntoViewIfNeeded();await shot('03-care-and-album.png');
 await p.setViewportSize({width:1280,height:900});await open('dungeon');await p.locator('[data-dungeon]').first().click();
 await p.waitForFunction(()=>document.querySelector('#dungeon-map').dataset.art==='ready');await shot('05-pixel-dungeon.png');
 if(errors.length)throw Error(errors.join('\n'));
 const calls=await p.evaluate(()=>window.storeCalls);if(calls.some(c=>c!=='status'))throw Error('Unexpected gameplay call');
 await writeFile(new URL('capture.json',store),JSON.stringify({appVersion:'0.8.1',source:'shipped bundle + disposable real Python engine views',at:new Date().toISOString(),species:fixture.initial.species_key,element:fixture.initial.element_key,paidAiCalls:0,productionStorageCalls:0,screenshots:5},null,2)+'\n');
 console.log('Captured 5 actual UI screenshots with disposable engine data; no Anna or AI calls.');
}finally{await browser.close();}
