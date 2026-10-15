// Local visual-study checks. Requires `npm ci` in anna/ and a loopback HTTP server.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../anna/node_modules/playwright-core/index.mjs';
import {createMovement,walkable} from './movement.mjs';

const m=createMovement(),directions=new Set(),frames=new Set();
for(let i=0;i<24000;i++){
  m.advance(1/60);const s=m.state;
  assert(walkable(s.scene,s.x,s.y),`Body overlaps an obstacle: ${JSON.stringify(s)}`);
  directions.add(s.direction);if(s.walking)frames.add(s.frame);
}
assert.equal(directions.size,4);assert(frames.size>=3);assert(m.state.visits>=4);
m.state.paused=true;const paused=structuredClone(m.state);m.advance(1);assert.deepEqual(m.state,paused);

const root=new URL('../../.local/pixel-home-study/',import.meta.url);await mkdir(root,{recursive:true});
const browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],outside=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.HOME_STUDY_URL??'http://127.0.0.1:5194/prototypes/pixel-home/';
  await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(base).origin){outside.push(route.request().url());return route.abort();}return route.continue();});
  await page.goto(base);await page.waitForFunction(()=>!!window.homeStudy);await page.locator('#pause').click();
  const shot=name=>page.screenshot({path:fileURLToPath(new URL(`${name}.png`,root))});
  await shot('yard');
  const before=await page.evaluate(()=>homeStudy.snapshot());await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>homeStudy.snapshot()),before);
  await page.locator('#pause').click();await page.waitForFunction(()=>{const s=homeStudy.snapshot();return s.stage===1&&s.hold>0;},{},{timeout:15000});await page.locator('#pause').click();await shot('behind-tree');
  const occlusion=await page.evaluate(()=>{const s=homeStudy.snapshot();return s.drawOrder.findIndex(o=>o[0]==='pet')<s.drawOrder.findIndex(o=>o[0]==='tree'&&o[1]===216);});assert(occlusion);
  await page.locator('#inside').click();assert.equal(await page.evaluate(()=>homeStudy.snapshot().scene),'inside');await shot('inside');
  await page.locator('#yard').click();await page.locator('#zoom-in').click();assert.equal(await page.evaluate(()=>homeStudy.snapshot().zoom),3);
  await page.locator('#guides').check();await shot('foot-and-depth-guides');
  await page.setViewportSize({width:375,height:812});await page.locator('#guides').uncheck();await page.locator('#zoom-out').click();await page.locator('#zoom-out').click();await shot('mobile');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1));
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>!!window.homeStudy);assert.equal(await page.evaluate(()=>homeStudy.snapshot().paused),true);
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
  console.log('PASS: 400 seconds of routes, four directions, gait frames, collision, transitions, pause, depth order, mobile, reduced motion, zero external requests.');
  console.log(`Screenshots: ${fileURLToPath(root)}`);
}finally{await browser.close();}
