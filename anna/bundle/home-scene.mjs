import {createHomeWalk,roomPoint} from './home-walk.mjs';
import {readHomeSprite,drawHomeSprite} from './home-sprite.mjs';
export {routeAt} from './home-walk.mjs';
const indices={house:0,tree:1,bush:2,bench:3,bookshelf:4,desk:5,nest:6,plant:7,rug:8};
const extraIndices={lamp:0,'side-table':1,cushion:2,'wall-art':3,curtain:4,tea:5,basket:6,mailbox:7};
export function createHomeScene(canvas){
 const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const camera={x:320,y:240,zoom:innerWidth<500?1:2};
 let sheets,atlas,terrain,grassPattern,movement=null,s=null,home=null,pet=null,petSource='',ticket=0,active=false,frame=0,last=0,previousScene='',jobLayout=null;
 const load=name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Home artwork unavailable'));im.src=new URL(`./assets/home-v2/${name}.png`,import.meta.url).href;});
 const ready=Promise.all([load('objects'),load('extra'),fetch(new URL('./assets/home-v2/atlas.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Home atlas unavailable');return r.json();})]).then(([objects,extra,metadata])=>{
  sheets={objects,extra};atlas=metadata;terrain={yard:makeTerrain('yard'),inside:makeTerrain('inside')};
  const patch=document.createElement('canvas');patch.width=patch.height=64;grass(patch.getContext('2d'),64,64);grassPattern=ctx.createPattern(patch,'repeat');
 });ready.catch(()=>{});
const noise=(x,y,seed=0)=>{let n=Math.imul(x+seed*73,374761393)+Math.imul(y+seed*19,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
function rect(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(c,color,x,y,w,h=1){rect(c,color,x,y,w,h);}
function ellipse(c,color,x,y,rx,ry){c.fillStyle=color;c.beginPath();c.ellipse(Math.round(x),Math.round(y),rx,ry,0,0,Math.PI*2);c.fill();}
function grass(c,width,height){
  rect(c,'#83aa42',0,0,width,height);
  for(let y=0;y<height;y+=16)for(let x=0;x<width;x+=16){
    const shade=['#83aa42','#80a53e','#86ac43','#88ad46'][Math.floor(noise(x,y)*4)];rect(c,shade,x,y,16,16);
    for(let i=0;i<14;i++){
      const px=x+Math.floor(noise(x+i,y,1)*16),py=y+Math.floor(noise(x,y+i,2)*16);
      rect(c,['#729a36','#9aba4f','#91b74a','#aed061'][i%4],px,py,i%3===0?2:1,1);
      if(i%4===0)rect(c,'#709737',px,py-1,1,1);
    }
  }
}
function makeTerrain(scene){
  const surface=document.createElement('canvas');[surface.width,surface.height]=(scene==='yard'?[640,480]:[448,352]);const c=surface.getContext('2d');
  c.imageSmoothingEnabled=false;
  if(scene==='yard'){
    // Repeated 16px ground cells with deterministic color clusters, no image filter.
    grass(c,640,480);
    // A broad front path and a narrower garden branch. Edges remain tile-aligned.
    const dirt=(x,y)=>(x>=296&&x<344&&y>=200)||(y>=280&&y<328&&x>=128&&x<528)||(x>=112&&x<144&&y>=224&&y<296);
    for(let y=0;y<480;y+=8)for(let x=0;x<640;x+=8)if(dirt(x,y)){
      rect(c,'#b69b4d',x,y,8,8);rect(c,'#dcba65',x+1,y+1,7,7);
      if(dirt(x-8,y))rect(c,'#dcba65',x,y+1,2,7);
      if(dirt(x,y-8))rect(c,'#dcba65',x+1,y,7,2);
      const n=noise(x,y,5);if(n>.5)rect(c,'#cba855',x+Math.floor(n*6),y+3,2,1);if(n<.3)rect(c,'#edcb7b',x+2,y+5,3,1);
    }
    for(let y=224;y<448;y+=32){rect(c,'#a58c5f',308,y,23,9);rect(c,'#c9bd8e',309,y-2,21,8);line(c,'#e4d7a5',310,y-2,17);}
    // Small wildflower clusters are ground details; tall plants are separate sprites.
    for(let i=0;i<70;i++){
      const x=Math.floor(noise(i,4,8)*560)+40,y=Math.floor(noise(i,9,9)*310)+120;
      if(dirt(x,y)||x>224&&x<416&&y<224)continue;
      rect(c,'#55772f',x,y,1,3);rect(c,i%3?'#f2dfa1':'#e5ac9a',x-1,y-1,3,2);rect(c,'#efd272',x,y-1,1,1);
    }
    for(let x=48;x<600;x+=16){fence(c,x,104);if(x<288||x>344)fence(c,x,448);}
    for(let y=120;y<448;y+=16){post(c,48,y);post(c,592,y);line(c,'#866235',50,y-4,2,16);line(c,'#866235',594,y-4,2,16);}
  }else{
    rect(c,'#322f29',0,0,448,352);
    rect(c,'#6e5237',24,48,400,288);rect(c,'#d4af73',32,56,384,272);
    for(let y=80;y<320;y+=16)for(let x=32;x<464;x+=48){
      const start=x+(y%32===0?0:-24),left=Math.max(32,start),right=Math.min(416,start+48);if(right<=left)continue;
      rect(c,['#c29961','#c8a16a','#cba570'][Math.floor(noise(x,y)*3)],left,y,right-left,16);
      line(c,'#a27d4f',left,y,right-left);line(c,'#a27d4f',left,y,1,16);
      line(c,'#ddbb83',left+1,y+1,right-left-2);
      if(noise(x,y)>.5&&right-left>24)line(c,'#b68c57',left+6,y+9,18);
    }
    // Orthographic back wall, skirting and windows are room geometry.
    rect(c,'#d1bd91',32,24,384,56);line(c,'#8d6a41',32,24,384,5);line(c,'#886c47',32,74,384,6);
    for(let x=40;x<416;x+=24)line(c,'#bdab81',x,30,1,42);
    for(const x of [160,280]){
      rect(c,'#806246',x,35,34,32);rect(c,'#bad1b2',x+3,38,28,26);rect(c,'#8aa982',x+3,53,28,11);line(c,'#e8d6a9',x+16,38,2,26);line(c,'#e8d6a9',x+3,50,28,2);line(c,'#a17b4c',x-2,66,38,3);
    }
    rect(c,'#a58960',24,80,8,240);rect(c,'#9b7a52',416,80,8,240);line(c,'#725638',24,320,176,8);line(c,'#725638',248,320,176,8);
    rect(c,'#685137',200,312,48,16);rect(c,'#e2c58e',204,315,40,4);rect(c,'#8e9870',208,288,32,16);
  }
  return surface;
}
function post(c,x,y){rect(c,'#64482e',x-2,y-10,7,18);rect(c,'#a77d45',x-1,y-10,5,16);line(c,'#d1a866',x,y-10,3,2);}
function fence(c,x,y){line(c,'#64482e',x,y-4,16,3);line(c,'#ab8247',x,y-5,16,2);line(c,'#75532f',x,y+2,16,3);post(c,x,y);}

 function source(kind){return kind in indices?[sheets.objects,atlas.objects[indices[kind]]]:[sheets.extra,atlas.extra[extraIndices[kind]]];}
 function objects(){
  if(s.scene!=='inside'||!jobLayout)return home.world[s.scene].objects;
  return Object.entries(jobLayout).map(([kind,p])=>{
   const item=home.catalog.find(i=>i.id===kind),[w,h]=item.size,original=home.world.inside.objects.find(o=>o.kind===kind);
   return {kind,x:64+(p[0]+w/2)*32,y:item.layer==='wall'?72:64+(p[1]+h)*32-(item.layer==='surface'?20:0),w:original?.w??(item.layer==='surface'?22:Math.max(28,w*32-2)),layer:item.layer};
  });
 }
 function drawObject(o){
  const [sheet,box]=source(o.kind);if(!box)return;const h=Math.round(o.w*box[3]/box[2]);
  if(o.kind==='tree')ellipse(ctx,'#334e313d',o.x+5,o.y-1,o.w*.34,9);
  if(o.kind==='house')rect(ctx,'#3e473b35',o.x-o.w/2+8,o.y-12,o.w,14);
  ctx.drawImage(sheet,...box,Math.round(o.x-o.w/2),Math.round(o.y-h),o.w,h);
 }
 function drawPet(){
  if(!pet)return;drawHomeSprite(ctx,pet,s.x,s.y,{direction:s.direction,frame:s.frame});
  const carry=movement.carried();if(carry){const [sheet,b]=source(carry),width=22,height=Math.round(width*b[3]/b[2]);ctx.drawImage(sheet,...b,Math.round(s.x+12),Math.round(s.y-height-10),width,height);}
 }
 function render(dt=0){
  if(!s||!terrain)return;const [mw,mh]=home.world[s.scene].size,hw=canvas.width/2,hh=canvas.height/2;
  const bound=(v,half,size)=>size<half*2?size/2:Math.max(half,Math.min(size-half,v));
  const targetX=bound(s.x,hw,mw),targetY=bound(s.y-64,hh,mh);
  if(previousScene!==s.scene){camera.x=targetX;camera.y=targetY;previousScene=s.scene;}
  else{camera.x+=(targetX-camera.x)*Math.min(1,dt*5);camera.y+=(targetY-camera.y)*Math.min(1,dt*5);}
  ctx.imageSmoothingEnabled=false;rect(ctx,s.scene==='yard'?'#83aa42':'#322f29',0,0,canvas.width,canvas.height);
  if(s.scene==='yard'){ctx.fillStyle=grassPattern;ctx.fillRect(0,0,canvas.width,canvas.height);}
  ctx.save();ctx.translate(Math.round(hw-camera.x),Math.round(hh-camera.y));ctx.drawImage(terrain[s.scene],0,0);
  const all=objects();for(const o of all)if(o.layer==='rug'||o.layer==='wall')drawObject(o);
  const ordered=all.filter(o=>o.layer!=='rug'&&o.layer!=='wall').map(o=>({y:o.y+(o.layer==='surface'?20:0),object:o}));ordered.push({y:s.y,pet:true});ordered.sort((a,b)=>a.y-b.y);
  for(const e of ordered)e.pet?drawPet():drawObject(e.object);ctx.restore();
  if(s.fade){ctx.fillStyle=`rgba(31,39,27,${Math.min(1,Math.abs(s.fade))})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
  canvas.dataset.place=s.scene;canvas.dataset.sprite=pet?'ready':'missing';
 }
 function resize(){canvas.width=Math.max(1,Math.round(canvas.clientWidth/camera.zoom));canvas.height=Math.max(1,Math.round(canvas.clientHeight/camera.zoom));previousScene='';render();}
 new ResizeObserver(resize).observe(canvas);
 function tick(now){if(!active)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(!document.hidden&&movement){if(pet)movement.advance(dt);render(s.paused?0:dt);}frame=requestAnimationFrame(tick);}
 reduced.addEventListener('change',e=>{if(e.matches&&s)s.paused=true;});
 return {ready,
  async set(value,source){
   const id=++ticket,cached=pet&&source&&source===petSource&&home?.pet_id===value?.pet_id;
   home=value;jobLayout=null;movement=value?.world?createHomeWalk(value.world):null;s=movement?.state;
   if(s)s.paused=reduced.matches;if(!cached){pet=null;petSource='';}
   if(!active){active=true;last=0;frame=requestAnimationFrame(tick);}resize();
   if(!source||cached)return !!pet;
   try{const r=await fetch(source,{cache:'no-store'});if(!r.ok)throw Error('Sprite unavailable');const decoded=await readHomeSprite(await r.blob());if(id===ticket){pet=decoded;petSource=source;}return id===ticket;}
   catch{if(id===ticket){pet=null;petSource='';}return false;}
  },
  play(value){
   if(!movement)return;home=value;movement.jump('inside');
   if(!pet||reduced.matches||!value.motion?.length){jobLayout=null;return;}
   const work=structuredClone(value.previous??value.layout),legs=[];jobLayout=work;
   for(const step of value.motion){const key=step.item,route=step.route.map(roomPoint);
    if(step.phase==='store'){legs.push({route:[...route].reverse(),finish:()=>{delete work[key];}});legs.push({route,carry:key});}
    else{legs.push({route,carry:key,finish:()=>{work[key]=value.layout[key];}});legs.push({route:[...route].reverse()});}}
   for(const [key,p] of Object.entries(value.layout))if(!value.motion.some(x=>x.item===key))work[key]=p;
   movement.play(legs,()=>{jobLayout=null;});
  },
  jump(place){jobLayout=null;movement?.jump(place);render();},paused:()=>!!s?.paused,pause(){if(s)s.paused=!s.paused;return !!s?.paused;},zoom(delta){camera.zoom=Math.max(1,Math.min(5,camera.zoom+delta));resize();return camera.zoom;},
  skip(){jobLayout=null;movement?.stopJob();},stop(){active=false;cancelAnimationFrame(frame);jobLayout=null;ticket++;},
  thumb(key){if(!sheets)return null;const [sheet,crop]=source(key),b=document.createElement('canvas');b.width=b.height=160;const c=b.getContext('2d'),scale=Math.min(144/crop[2],144/crop[3]);c.imageSmoothingEnabled=false;c.drawImage(sheet,...crop,(160-crop[2]*scale)/2,(160-crop[3]*scale)/2,crop[2]*scale,crop[3]*scale);return b.toDataURL('image/png');}
 };
}
