import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

// Exercise the real renderer with colored test sprites and controlled responses.
async function setup(t){
 const browser=await chromium.launch(process.env.ANNA_BROWSER_CHANNEL?{channel:process.env.ANNA_BROWSER_CHANNEL}:process.platform==='win32'?{channel:'msedge'}:{});
 t.after(()=>browser.close());const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='https://notebuddy.test')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<canvas id="room"></canvas>'});
  const name=u.pathname.slice(1);if(name.includes('..'))return route.abort();
  try{return route.fulfill({contentType:name.endsWith('.mjs')?'text/javascript':name.endsWith('.json')?'application/json':'image/png',body:await readFile(new URL('../../bundle/'+name,import.meta.url))});}
  catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto('https://notebuddy.test/');
 await page.evaluate(async()=>{
  const {createHomeScene}=await import('/home-scene.mjs');
  window.scene=createHomeScene(document.querySelector('#room'));await scene.ready;
  const nativeFetch=window.fetch,draw=CanvasRenderingContext2D.prototype.drawImage;
  window.requests=[];window.loads=[];window.drawn=null;const pictures={};
  for(const [name,color] of Object.entries({red:'#ff0000',blue:'#0000ff',green:'#00ff00'})){
   const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=color;for(let y=0;y<4;y++)for(let x=0;x<4;x++)ctx.fillRect(x*64+16,y*64+16,24,32);
   pictures[name]=await new Promise(resolve=>c.toBlob(resolve));
  }
  window.fetch=(source,...args)=>String(source).startsWith('/sprite/')?new Promise(resolve=>requests.push({source,resolve})):nativeFetch(source,...args);
  CanvasRenderingContext2D.prototype.drawImage=function(source,...args){
   if(this.canvas.id==='room'&&source instanceof HTMLCanvasElement&&source.width===256)drawn=[...source.getContext('2d').getImageData(18,18,1,1).data];
   return draw.call(this,source,...args);
  };
  window.begin=(pet_id,source)=>{loads.push(scene.set({pet_id,layout:{},catalog:[],roam:[],world:{yard:{size:[640,480],start:[320,256],objects:[],tour:[{route:[[320,256]],pause:100}]}}},source));return loads.length-1;};
  window.finish=(index,color)=>requests[index].resolve(color?new Response(pictures[color]):new Response('',{status:503}));
  window.sprite=async()=>{drawn=null;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return drawn;};
 });
 return page;
}
const begin=(p,pet,source)=>p.evaluate(([pet,source])=>window.begin(pet,source),[pet,source]);
const finish=(p,request,color,load)=>p.evaluate(async({request,color,load})=>{window.finish(request,color);await window.loads[load];},{request,color,load});
const sprite=p=>p.evaluate(()=>window.sprite());

test('a directional sheet retains detached nearby tail tips without accepting extra characters or ambiguous fragments',async t=>{
 const p=await setup(t);
 const result=await p.evaluate(async()=>{
  const {readHomeSprite}=await import('/home-sprite.mjs');
  const inspect=async kind=>{
   const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#285d46';
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    if(kind==='missing'&&row===3&&col===3)continue;
    const dx=kind==='unevenTips'?[0,-3,2,-1][col]:0,dy=kind==='unevenTips'?[0,3,-2,1][row]:0;
    ctx.fillRect(col*64+16+dx,row*64+12+dy,28,38);
    if(kind==='tips'||kind==='unevenTips')ctx.fillRect(col*64+48+dx,row*64+32+dy,8,8);
   }
   if(kind==='extra')ctx.fillRect(48,4,28,38);
   if(kind==='remote')ctx.fillRect(2,2,8,8);
   if(kind==='between')ctx.fillRect(58,32,8,8);
   if(kind==='missing')ctx.fillRect(240,240,8,8);
   if(kind==='clipped')ctx.fillRect(0,20,17,16);
   if(kind==='large')ctx.fillRect(48,14,10,30);
   if(kind==='many')for(const x of [4,48])for(const y of [20,32,44])ctx.fillRect(x,y,8,8);
   const blob=await new Promise(resolve=>c.toBlob(resolve));
   try{const s=await readHomeSprite(blob);return {accepted:true,frames:s.frames};}catch(e){return {accepted:false,error:e.message};}
  };
  const results={};for(const kind of ['plain','tips','unevenTips','extra','remote','between','missing','clipped','large','many'])results[kind]=await inspect(kind);
  return results;
 });
 assert.equal(result.plain.accepted,true);
 assert.equal(result.tips.accepted,true,'separate tail tips belong to the adjacent body, not extra animation frames');
 assert.equal(result.tips.frames.length,16);
 assert.deepEqual(result.tips.frames[0],[16,12,40,38],'the frame must include the whole detached tip');
 assert.equal(result.unevenTips.accepted,true,'uneven generated gutters must not be cut at fixed quarter cells');
 for(const kind of ['extra','remote','between','missing','clipped','large','many'])assert.equal(result[kind].accepted,false,kind+' must not become a valid sheet');
});

test('home and dungeon preserve direction, gait and grounded body proportions',async t=>{
 const p=await setup(t);
 const result=await p.evaluate(async()=>{
  const {drawHomeSprite}=await import('/home-sprite.mjs');
  const {drawAvatar}=await import('/dungeon-avatar.mjs');
  const directions=['down','left','right','up'],checks=[];
  for(const [name,w,h] of [['wide-legless',90,32],['tall',30,88],['winged',96,50],['round',60,60]]){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
   const frames=[],source=canvas.getContext('2d');
   for(let row=0;row<4;row++)for(let frame=0;frame<4;frame++){
    const x=frame*128+10,y=row*128+10;frames.push([x,y,w,h]);
    source.fillStyle=`rgb(${40+row*50},${40+frame*50},80)`;source.fillRect(x,y,w,h);
    // An asymmetric marker catches accidental horizontal flipping.
    source.fillStyle='#fff';source.fillRect(x,y,Math.ceil(w/4),h);
   }
   const sheet={canvas,frames,maxHeight:h};
   for(const [row,direction] of directions.entries())for(let gait=0;gait<4;gait++){
    const target=document.createElement('canvas');target.width=320;target.height=240;
    const ctx=target.getContext('2d'),draw=ctx.drawImage.bind(ctx);let box;
    ctx.drawImage=(...args)=>{box=args.slice(5);draw(...args);};
    const verify=(expectedFrame)=>{
     const [x,y,width,height]=box;
     if(y+height!==160||Math.abs(x+width/2-160)>.5||x<0||x+width>320)throw Error('Body anchor or clipping: '+name);
     const pixel=[...ctx.getImageData(Math.floor(x+width*.6),Math.floor(y+height/2),1,1).data];
     if(pixel[0]!==40+row*50||pixel[1]!==40+expectedFrame*50)throw Error('Wrong direction or gait: '+name);
     const marker=[...ctx.getImageData(Math.ceil(x+1),Math.floor(y+height/2),1,1).data];
     if(marker[0]!==255)throw Error('Unexpected mirror: '+name);
     ctx.clearRect(0,0,320,240);
    };
    drawHomeSprite(ctx,sheet,160,160,{direction,frame:gait});verify(gait);
    drawAvatar(ctx,160,160,{sprite:sheet,direction,frame:gait,walking:true,scale:2});verify([0,1,2,1][gait]);
    drawAvatar(ctx,160,160,{sprite:sheet,direction,frame:gait,walking:false,scale:2});verify(1);
   }
   checks.push(name);
  }
  return checks;
 });
 assert.deepEqual(result,['wide-legless','tall','winged','round']);
});

test('home reopens an interrupted replacement sprite and caches only the completed image',async t=>{
 const p=await setup(t);
 const first=await begin(p,'pet-a','/sprite/red');await finish(p,0,'red',first);
 assert.deepEqual(await sprite(p),[255,0,0,255]);
 const pending=await begin(p,'pet-b','/sprite/blue');
 assert.equal(await sprite(p),null,'the previous companion must disappear while loading');
 await p.evaluate(()=>scene.stop());await finish(p,1,'blue',pending);
 const reopened=await begin(p,'pet-b','/sprite/blue');
 assert.equal(await p.evaluate(()=>requests.length),3,'reopening retries the interrupted image');
 await finish(p,2,'blue',reopened);assert.deepEqual(await sprite(p),[0,0,255,255]);
 await p.evaluate(()=>scene.stop());const cached=await begin(p,'pet-b','/sprite/blue');
 await p.evaluate(index=>loads[index],cached);
 assert.equal(await p.evaluate(()=>requests.length),3,'a completed matching sprite can be reused');
 assert.deepEqual(await sprite(p),[0,0,255,255]);
});

test('home clears missing or failed sprites and rejects late responses across companion changes',async t=>{
 const p=await setup(t);
 const first=await begin(p,'pet-a','/sprite/red');await finish(p,0,'red',first);
 const obsolete=await begin(p,'pet-a','/sprite/blue');
 const cleared=await begin(p,'pet-a','');await p.evaluate(index=>loads[index],cleared);
 await finish(p,1,'blue',obsolete);assert.equal(await sprite(p),null,'clearing invalidates an older response');
 const slow=await begin(p,'pet-a','/sprite/green'),latest=await begin(p,'pet-b','/sprite/red');
 await finish(p,3,'red',latest);await finish(p,2,'green',slow);
 assert.deepEqual(await sprite(p),[255,0,0,255],'late old sprite cannot replace the current one');
 const failed=await begin(p,'pet-b','/sprite/blue');await finish(p,4,null,failed);
 assert.equal(await sprite(p),null,'failure must not revive a previous sprite');
 const retry=await begin(p,'pet-b','/sprite/blue');await finish(p,5,'blue',retry);
 assert.deepEqual(await sprite(p),[0,0,255,255]);
 const otherPet=await begin(p,'pet-c','/sprite/blue');
 assert.equal(await sprite(p),null,'the same URL does not authorize another companion’s cached pixels');
 assert.equal(await p.evaluate(()=>requests.length),7);
 await finish(p,6,'green',otherPet);assert.deepEqual(await sprite(p),[0,255,0,255]);
});
