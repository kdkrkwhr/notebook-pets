import {createMovement,OBJECTS,DIMENSIONS} from './movement.mjs';

const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d');
const movement=createMovement(),s=movement.state;
const indices={house:0,tree:1,bush:2,bench:3,bookshelf:4,desk:5,nest:6,plant:7,rug:8};
const directions={down:0,left:1,right:2,up:3};
const camera={x:320,y:240,zoom:innerWidth<500?1:2},reduced=matchMedia('(prefers-reduced-motion: reduce)');
let sheets,atlas,terrain={},grassPattern,guides=false,last=0,previousScene='',visible=true;
const $=id=>document.getElementById(id);
for(const control of document.querySelectorAll('button,input'))control.disabled=true;
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
  const surface=document.createElement('canvas');[surface.width,surface.height]=DIMENSIONS[scene];const c=surface.getContext('2d');
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
function drawObject(o){
  const box=atlas.objects[indices[o.kind]],h=o.w*box[3]/box[2];
  if(o.kind==='tree')ellipse(ctx,'#334e313d',o.x+5,o.y-1,o.w*.34,9);
  if(o.kind==='house')rect(ctx,'#3e473b35',o.x-o.w/2+8,o.y-12,o.w,14);
  ctx.drawImage(sheets.objects,...box,Math.round(o.x-o.w/2),Math.round(o.y-h),o.w,Math.round(h));
}
function drawPet(){
  const box=atlas.companion[directions[s.direction]*4+s.frame];
  const scale=26/222,w=Math.round(box[2]*scale),h=Math.round(box[3]*scale);
  const anchor=s.direction==='left'?.43:s.direction==='right'?.57:.5;
  ellipse(ctx,'#26392c55',s.x,s.y,7,2);
  // Only the source frame changes. No body rotation, scaling or whole-portrait bob.
  ctx.drawImage(sheets.companion,...box,Math.round(s.x-w*anchor),Math.round(s.y-h),w,h);
}
function render(dt=0){
  const [mw,mh]=DIMENSIONS[s.scene],hw=canvas.width/2,hh=canvas.height/2;
  const bound=(v,half,size)=>size<half*2?size/2:Math.max(half,Math.min(size-half,v));
  const targetX=bound(s.x,hw,mw),targetY=bound(s.y-64,hh,mh);
  if(previousScene!==s.scene){camera.x=targetX;camera.y=targetY;previousScene=s.scene;}
  else{camera.x+=(targetX-camera.x)*Math.min(1,dt*5);camera.y+=(targetY-camera.y)*Math.min(1,dt*5);}
  const ox=Math.round(hw-camera.x),oy=Math.round(hh-camera.y);
  ctx.imageSmoothingEnabled=false;rect(ctx,s.scene==='yard'?'#83aa42':'#322f29',0,0,canvas.width,canvas.height);
  if(s.scene==='yard'){ctx.fillStyle=grassPattern;ctx.fillRect(0,0,canvas.width,canvas.height);}
  ctx.save();ctx.translate(ox,oy);ctx.drawImage(terrain[s.scene],0,0);
  for(const o of OBJECTS[s.scene])if(o.kind==='rug')drawObject(o);
  const ordered=OBJECTS[s.scene].filter(o=>o.kind!=='rug').map(o=>({y:o.y,object:o}));
  ordered.push({y:s.y,pet:true});ordered.sort((a,b)=>a.y-b.y);
  for(const entry of ordered)entry.pet?drawPet():drawObject(entry.object);
  if(guides){
    ctx.strokeStyle='#ffeb8a';ctx.lineWidth=1;
    for(const o of OBJECTS[s.scene])if(o.block){ctx.strokeRect(...o.block);line(ctx,'#fff4a5',o.x-20,o.y,40);}
    ctx.strokeStyle='#b9f3e5';ctx.beginPath();ctx.moveTo(s.x,s.y);for(const p of s.path)ctx.lineTo(...p);ctx.stroke();
    rect(ctx,'#ffffff',s.x-1,s.y-1,3,3);
  }
  ctx.restore();
  if(s.fade){ctx.fillStyle=`rgba(31,39,27,${Math.min(1,Math.abs(s.fade))})`;ctx.fillRect(0,0,canvas.width,canvas.height);}
  $('place').textContent=s.scene==='yard'?'햇살 드는 마당':'포근한 우리 집';
  $('activity').textContent=s.paused?'잠깐 멈춰서 바라보기':s.label;
  $('detail').textContent=s.walking?'친구가 스스로 길을 따라 걷고 있어요':'집 안팎을 자동으로 오가요';
}
function resize(){
  canvas.width=Math.max(1,Math.round(canvas.clientWidth/camera.zoom));canvas.height=Math.max(1,Math.round(canvas.clientHeight/camera.zoom));
  $('zoom').value=`${camera.zoom}×`;$('zoom-out').disabled=camera.zoom<=1;$('zoom-in').disabled=camera.zoom>=5;
  previousScene='';if(sheets)render();
}
function setPause(value){s.paused=value;$('pause').textContent=value?'다시 걷기':'잠깐 멈추기';$('pause').setAttribute('aria-pressed',String(value));}
$('pause').onclick=()=>setPause(!s.paused);
for(const scene of ['yard','inside'])$(scene).onclick=()=>{movement.jump(scene);if(s.paused)render();};
$('guides').onchange=e=>{guides=e.target.checked;render();};
$('zoom-in').onclick=()=>{camera.zoom=Math.min(5,camera.zoom+1);resize();};
$('zoom-out').onclick=()=>{camera.zoom=Math.max(1,camera.zoom-1);resize();};
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=0;});
reduced.addEventListener('change',e=>{if(e.matches)setPause(true);});
new ResizeObserver(resize).observe(canvas);
function tick(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(visible){movement.advance(dt);render(s.paused?0:dt);}requestAnimationFrame(tick);}
try{
  const load=name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error(`${name} 자산을 불러오지 못했어요`));image.src=`assets/${name}.png`;});
  const [companion,objects,metadata]=await Promise.all([load('companion'),load('objects'),fetch('assets/atlas.json').then(r=>{if(!r.ok)throw Error('이미지 좌표를 불러오지 못했어요');return r.json();})]);
  sheets={companion,objects};atlas=metadata;terrain={yard:makeTerrain('yard'),inside:makeTerrain('inside')};
  const patch=document.createElement('canvas');patch.width=patch.height=64;grass(patch.getContext('2d'),64,64);grassPattern=ctx.createPattern(patch,'repeat');
  for(const control of document.querySelectorAll('button,input'))control.disabled=false;
  setPause(reduced.matches);resize();$('loading').hidden=true;requestAnimationFrame(tick);
  // Read-only diagnostics for the visual study's browser verification.
  window.homeStudy={snapshot:()=>({...structuredClone(s),zoom:camera.zoom,drawOrder:OBJECTS[s.scene].filter(o=>o.kind!=='rug').map(o=>[o.kind,o.y]).concat([['pet',s.y]]).sort((a,b)=>a[1]-b[1])})};
}catch(error){$('loading').textContent=`${error.message}. 이 페이지는 로컬 서버에서 열어 주세요.`;console.error(error);}
